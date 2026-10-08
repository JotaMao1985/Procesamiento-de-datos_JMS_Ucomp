"""Auditoría de una sesión. Correr DESPUÉS de ejecuta_celdas, genera_notebook y construye.

    python precalculo/audita.py [N]        (la sesión 2 se relanza sola en Docker)

Comprueba, y termina con error si algo falla:
  1. Los datos son deterministas: regenerarlos da archivos idénticos a datos/.
  2. El notebook es nbformat 4.5 válido, sin soluciones ni celdas privadas.
  3. El NOTEBOOK MISMO corre de principio a fin en una carpeta limpia (lo que
     hará el estudiante en Colab) y sus salidas coinciden con las del HTML.
  4. El HTML no tiene marcadores sin resolver, trae todos sus módulos, los
     aria-controls apuntan a ids existentes y no hay ids repetidos.
  5. La agenda cuadra: los módulos de cada bloque suman sus minutos y la
     sesión, con breaks, suma lo que debe.
  6. Controles propios de cada sesión (tablero de calidad en la 1; en la 2,
     que la sesión parta del mismo total que dejó la 1 y que Spark concilie con pandas).
  7. Contraste WCAG de los pares texto/fondo de la paleta.
"""

import contextlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path

from ejecuta_celdas import ejecutar_celda
from sesiones import (AQUI, RAIZ, SESIONES, en_docker, enlace_colab, relanzar_en_docker,
                      sesion_de_argumentos)

fallos = []


def comprobar(condicion, mensaje):
    print(("  ok   " if condicion else "  FALLA ") + mensaje)
    if not condicion:
        fallos.append(mensaje)


# ---------------------------------------------------------------- 1
def datos_deterministas():
    print("1. Datos deterministas")
    sys.path.insert(0, str(AQUI))
    import genera_datos
    with tempfile.TemporaryDirectory() as tmp:
        with contextlib.redirect_stdout(io.StringIO()):
            genera_datos.crear_datos(tmp)
        for nombre in ["productos.csv", "ventas.csv", "resenas.csv", "logs_web.jsonl"]:
            igual = (Path(tmp) / nombre).read_bytes() == (RAIZ / "datos" / nombre).read_bytes()
            comprobar(igual, f"{nombre} se regenera idéntico")


# ---------------------------------------------------------------- 2 y 3
def _id_de_celda(fuente, i):
    for linea in fuente.split("\n")[:2]:
        m = re.fullmatch(r"# \[(\w+)\]", linea)
        if m:
            return m.group(1)
    if i == 0:
        return "datos"
    if fuente.startswith("%%writefile"):
        return {"mapper.py": "mapper_py", "reducer.py": "reducer_py"}[fuente.split()[1]]
    return None


def notebook(sesion):
    print("2. Notebook válido")
    nb = json.loads((RAIZ / "notebooks" / sesion["notebook"]).read_text(encoding="utf-8"))
    comprobar(nb.get("nbformat") == 4 and nb.get("nbformat_minor") == 5, "nbformat 4.5")
    ids = [c.get("id") for c in nb["cells"]]
    comprobar(all(ids) and len(ids) == len(set(ids)), "cada celda tiene id único")
    codigo = [c for c in nb["cells"] if c["cell_type"] == "code"]
    comprobar(all(c["outputs"] == [] and c["execution_count"] is None for c in codigo), "celdas sin salidas guardadas")
    comprobar(codigo[0]["metadata"].get("cellView") == "form", "la celda de datos es un formulario oculto de Colab")
    formularios = [c for c in codigo[1:] if "".join(c["source"]).startswith("#@title")]
    comprobar(all(c["metadata"].get("cellView") == "form" for c in formularios),
              f"{len(formularios)} celda(s) #@title adicionales van plegadas")
    texto = "".join("".join(c["source"]) for c in codigo)
    comprobar("[sol_" not in texto and "CIFRAS" not in texto, "sin soluciones ni celdas privadas")

    print("3. El notebook corre de principio a fin en una carpeta limpia")
    salidas = json.loads((AQUI / sesion["salidas"]).read_text(encoding="utf-8"))["celdas"]
    previo = os.getcwd()
    # En la réplica de Colab se trabaja en /content, como en Colab (las rutas salen en las salidas)
    tmp = "/content" if en_docker() else tempfile.mkdtemp()
    os.makedirs(tmp, exist_ok=True)
    cache = Path("/opt/cache")                 # el tarball de Hadoop de la réplica de Colab
    if cache.is_dir():
        for f in cache.iterdir():
            shutil.copy2(f, Path(tmp) / f.name)
    os.chdir(tmp)
    ns = {"__name__": "__main__"}
    try:
        comparadas, distintas = 0, []
        for i, c in enumerate(codigo):
            fuente = "".join(c["source"])
            ident = _id_de_celda(fuente, i) or f"celda{i}"
            try:
                res = ejecutar_celda({"id": ident, "fuente": fuente}, ns)
            except Exception as e:                       # noqa: BLE001
                comprobar(False, f"celda {ident} del notebook lanza {type(e).__name__}: {str(e)[:300]}")
                return
            if ident in salidas and "variable" not in salidas[ident]["banderas"]:
                esperado = salidas[ident]
                if not (res["texto"] == esperado["texto"] and res["salida"] == esperado["salida"]):
                    distintas.append(ident)
                comparadas += 1
        for ident in distintas:
            comprobar(False, f"la salida de [{ident}] en el notebook difiere de la del HTML")
        comprobar(True, f"{len(codigo)} celdas ejecutadas; {comparadas - len(distintas)} de {comparadas} "
                        "salidas idénticas a las del HTML")
    finally:
        os.chdir(previo)
        shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------- 4
def html(sesion):
    print("4. HTML")
    h = (RAIZ / "Htmls" / sesion["html"]).read_text(encoding="utf-8")
    comprobar(not re.search(r"\{\{[A-Z]+:[^}]*\}\}|\{\{LOGO\}\}|\{\{COLAB\}\}", h), "sin marcadores sin resolver")
    comprobar(f'href="{enlace_colab(sesion)}"' in h, f"enlace «Abrir en Colab» a notebooks/{sesion['notebook']}")
    plantillas = re.findall(r'<template id="module-(\d+)">', h)
    n = sesion["modulos"]
    comprobar(sorted(map(int, plantillas)) == list(range(1, n + 1)), f"{n} módulos, del 1 al {n}")
    cuerpo = h.split("<!-- ============================ MÓDULOS ============================ -->")[1]
    for bloque in re.findall(r'<template id="module-\d+">(.*?)</template>', cuerpo, flags=re.S):
        ids = re.findall(r'\sid="([^"]+)"', bloque)
        if len(ids) != len(set(ids)):
            comprobar(False, f"ids repetidos dentro de un módulo: {sorted({i for i in ids if ids.count(i) > 1})}")
        faltan = [a for a in re.findall(r'aria-controls="([^"]+)"', bloque) if a not in ids]
        if faltan:
            comprobar(False, f"aria-controls sin destino: {faltan}")
    comprobar(True, f"ids y aria-controls revisados en los {n} módulos")
    plantillas_html = "".join(re.findall(r'<template id="module-\d+">(.*?)</template>', cuerpo, flags=re.S))
    usados = set(re.findall(r'data-simulador="([^"]+)"', plantillas_html))
    definidos = set(re.findall(r"SIMULADORES\['([^']+)'\]\s*=", h))
    comprobar(usados <= definidos, f"{len(usados)} simuladores con su código ({', '.join(sorted(usados))})")
    quizzes = set(re.findall(r'data-quiz="([^"]+)"', plantillas_html))
    comprobar(quizzes <= set(re.findall(r"AUTOEVALUACIONES\['([^']+)'\]\s*=", h)), f"autoevaluaciones: {sorted(quizzes)}")
    kb = (RAIZ / "Htmls" / sesion["html"]).stat().st_size / 1024
    comprobar(kb < 2048, f"peso del HTML: {kb:,.0f} KB")


# ---------------------------------------------------------------- 5
def agenda(numero, sesion):
    print("5. Agenda")
    js = (RAIZ / "fuente" / f"sesion{numero}" / f"sesion{numero}.js").read_text(encoding="utf-8")
    bloques = {int(b): (int(m), int(p)) for b, m, p in
               re.findall(r"\{ id: (\d), titulo: .*?minutos: (\d+), breakDespues: (\d+)", js)}
    modulos = re.findall(r"\{ id: (\d+), bloque: (\d), title: .*?duration: \"(\d+) min\"", js)
    comprobar(len(modulos) == sesion["modulos"], f"{sesion['modulos']} módulos en courseData")
    for b, (minutos, _) in bloques.items():
        suma = sum(int(d) for _, bl, d in modulos if int(bl) == b)
        comprobar(suma == minutos, f"bloque {b}: módulos suman {suma} de {minutos} min")
    # La cabecera de cada módulo (bloque y chip de minutos) debe decir lo mismo que courseData
    distintos = []
    for m, bl, d in modulos:
        cabecera = (RAIZ / "fuente" / f"sesion{numero}" / f"m{int(m):02d}.html").read_text(encoding="utf-8")[:1500]
        meta = re.search(r"Módulo (\d+) · Bloque (\d)", cabecera)
        chip = re.search(r"</i> (\d+) min</span>", cabecera)
        if not (meta and chip and meta.groups() == (m, bl) and chip.group(1) == d):
            distintos.append(m)
    comprobar(not distintos, "cabeceras de los módulos (bloque y minutos) iguales a courseData"
                             + (f"; distintas: {', '.join(distintos)}" if distintos else ""))
    total = sum(m + p for m, p in bloques.values())
    comprobar(total == sesion["minutos"], f"sesión completa con breaks: {total} min")
    comprobar([p for _, (_, p) in sorted(bloques.items())] == sesion["breaks"], f"breaks: {sesion['breaks']}")


# ---------------------------------------------------------------- 6
def propios(numero, sesion):
    print("6. Controles propios de la sesión")
    s = json.loads((AQUI / sesion["salidas"]).read_text(encoding="utf-8"))
    if numero == 1:
        total = s["calidad"]["combinaciones"]["63"]["total_millones"]
        texto = float(s["cifras"]["total_millones"].replace(".", "").replace(",", "."))
        comprobar(abs(round(total, 1) - texto) < 1e-9, f"tablero: total con todos los pasos {total} ≈ cifra del texto {texto}")
        comprobar(s["calidad"]["combinaciones"]["63"]["filas"] ==
                  int(s["cifras"]["filas_limpias"].replace(".", "")), "tablero: filas finales = filas limpias del texto")
        return
    s1 = json.loads((AQUI / SESIONES[1]["salidas"]).read_text(encoding="utf-8"))
    for clave in ["filas_crudas", "filas_limpias", "total_millones", "app_ene", "app_jun"]:
        comprobar(s["cifras"][clave] == s1["cifras"][clave],
                  f"{clave}: la sesión 2 parte de lo que dejó la 1 ({s['cifras'][clave]})")
    comprobar(s["cifras"]["palabras_distintas"] == s1["cifras"]["palabras_distintas"],
              "el conteo de palabras en Spark da las mismas palabras que el de la sesión 1")
    c = s["simuladores"]["combiner"]
    comprobar(c["sin_combiner"]["map_output"] == c["con_combiner"]["map_output"]
              and c["con_combiner"]["reduce_input"] < c["sin_combiner"]["reduce_input"],
              "contadores de Hadoop: mismo map, menos registros al reduce con combiner")
    texto = s["celdas"]["sp_coherencia"]["texto"]
    filas = re.search(r"Filas · Spark: (\d+) · pandas: (\d+)", texto)
    comprobar(filas and filas.group(1) == filas.group(2) and "¿Las mismas ventas? True" in texto
              and re.search(r"Mayor diferencia por ciudad \(pesos\): 0\.0\n", texto),
              "conciliación: Spark y pandas llegan a las mismas ventas y a los mismos totales por ciudad")


# ---------------------------------------------------------------- 7
def _luminancia(hexa):
    r, g, b = (int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def _razon(a, b):
    la, lb = sorted((_luminancia(a), _luminancia(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def contraste():
    print("7. Contraste (WCAG 2.1: 4,5 texto normal · 3 texto grande y elementos gráficos)")
    pares = [
        ("#691E7A", "#FFFFFF", 4.5, "morado sobre blanco (títulos, enlaces)"),
        ("#FFFFFF", "#691E7A", 4.5, "blanco sobre morado (botón activo, tablas, celdas leídas)"),
        ("#FFFFFF", "#3A0F47", 4.5, "blanco sobre morado profundo (cabecera)"),
        ("#B84A00", "#FFFFFF", 4.5, "naranja de texto sobre blanco"),
        ("#B84A00", "#FFF7ED", 4.5, "naranja de texto sobre caja de nota"),
        ("#FFFFFF", "#B84A00", 4.5, "blanco sobre naranja de texto (botón)"),
        ("#FAA012", "#5C1A6C", 4.5, "ámbar sobre morado (pie y cabecera)"),
        ("#3A0F47", "#FAA012", 4.5, "morado profundo sobre ámbar (botón presentación activo)"),
        ("#566B7F", "#FFFFFF", 4.5, "pizarra sobre blanco (texto secundario)"),
        ("#3D5163", "#F1F4F7", 4.5, "pizarra oscura sobre caja de ejercicio"),
        ("#374151", "#FFFFFF", 4.5, "cuerpo de texto"),
        ("#64748B", "#FFFFFF", 4.5, "texto gris de apoyo"),
        ("#6B7280", "#FFFFFF", 4.5, "subtítulo en inglés de cada módulo"),
        ("#FFFFFF", "#8A2E9E", 4.5, "blanco sobre morado claro (pirámide)"),
        ("#FFFFFF", "#566B7F", 4.5, "blanco sobre pizarra (pirámide, bloques HDFS)"),
        ("#FFFFFF", "#0F766E", 4.5, "blanco sobre verde azulado (bloque HDFS)"),
        ("#FFFFFF", "#4D7C0F", 4.5, "blanco sobre verde oliva (bloque HDFS)"),
        ("#7C2D12", "#FFF1E6", 4.5, "café sobre naranja claro (operaciones anchas del DAG)"),
        ("#7C2D12", "#FFF7ED", 4.5, "café sobre crema (aviso de shuffle)"),
        ("#3A0F47", "#F3E9F5", 4.5, "morado profundo sobre lila (operaciones angostas, piezas)"),
        ("#475569", "#F1F4F7", 4.5, "pizarra sobre gris (celdas no leídas de Parquet)"),
        ("#F46201", "#FFFFFF", 3.0, "naranja de marca como elemento gráfico (barras, bordes)"),
    ]
    for texto, fondo, minimo, uso in pares:
        r = _razon(texto, fondo)
        comprobar(r >= minimo, f"{r:4.1f}:1  {uso}")
    r = _razon("#F46201", "#FFFFFF")
    print(f"  nota  el naranja de marca sobre blanco da {r:.1f}:1: por eso nunca se usa para texto normal")


if __name__ == "__main__":
    numero, sesion = sesion_de_argumentos()
    if sesion["docker"] and not en_docker():
        relanzar_en_docker("audita.py", numero)
    print(f"Auditoría de la sesión {numero} · {sesion['titulo']}\n")
    datos_deterministas()
    notebook(sesion)
    html(sesion)
    agenda(numero, sesion)
    propios(numero, sesion)
    contraste()
    print()
    if fallos:
        print(f"{len(fallos)} comprobación(es) fallaron.")
        sys.exit(1)
    print("Auditoría superada: todas las comprobaciones pasan.")
