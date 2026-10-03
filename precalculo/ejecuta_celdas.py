"""Ejecuta las celdas de una sesión y guarda sus salidas reales.

    python precalculo/ejecuta_celdas.py        # sesión 1 (Python local)
    python precalculo/ejecuta_celdas.py 2      # sesión 2 (se relanza en Docker: Java, Hadoop, Spark)

1. Regenera los datos del caso en la carpeta de trabajo.
2. Ejecuta TODAS las celdas de celdas_sesionN.py, en orden y en un mismo espacio
   de nombres, como lo haría un estudiante en Colab: las líneas «!» y las celdas
   %%bash van a la terminal y «%%writefile» escribe el archivo. Cualquier
   excepción detiene todo.
3. Sesión 1: precalcula el tablero de calidad (las 2^6 combinaciones de pasos de
   limpieza) y comprueba que los seis pasos reproduzcan exactamente el `df`
   limpio de las celdas; copia los datos en datos/.
   Sesión 2: comprueba que los datos generados en la réplica de Colab sean
   idénticos, byte a byte, a los de datos/; guarda los datos de los simuladores.
4. Escribe precalculo/salidas_sesionN.json, del que leen construye.py y audita.py.
"""

import ast
import contextlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

import pandas as pd

from sesiones import (AQUI, RAIZ, en_docker, relanzar_en_docker, sesion_de_argumentos,
                      trabajo_por_defecto)

CABECERA = re.compile(r"^# %% (.+)$")


# ---------------------------------------------------------------------------
# Lectura de celdas (compartida con genera_notebook.py y construye_sesion1.py)
# ---------------------------------------------------------------------------
def leer_celdas(ruta):
    celdas, actual = [], None
    for linea in Path(ruta).read_text(encoding="utf-8").splitlines():
        m = CABECERA.match(linea)
        if m:
            if actual:
                celdas.append(actual)
            partes = m.group(1).split()
            if partes[0] == "[markdown]":
                actual = {"tipo": "markdown", "id": None, "banderas": [], "lineas": []}
            else:
                actual = {"tipo": "codigo", "id": partes[0], "banderas": partes[1:], "lineas": []}
            continue
        if actual is None:
            continue                       # comentarios de cabecera del archivo
        if actual["tipo"] == "markdown":
            actual["lineas"].append(re.sub(r"^# ?", "", linea))
        else:
            actual["lineas"].append(linea)
    if actual:
        celdas.append(actual)
    for c in celdas:
        while c["lineas"] and not c["lineas"][-1].strip():
            c["lineas"].pop()
        c["fuente"] = "\n".join(c["lineas"])
        del c["lineas"]
    ids = [c["id"] for c in celdas if c["id"]]
    assert len(ids) == len(set(ids)), "Hay identificadores de celda repetidos"
    return celdas


# ---------------------------------------------------------------------------
# Ejecución
# ---------------------------------------------------------------------------
def _trozos(fuente):
    """Parte una celda en bloques de Python y líneas de terminal («!»)."""
    trozos, python = [], []
    for linea in fuente.splitlines():
        if linea.lstrip().startswith("!"):
            if python:
                trozos.append(("python", "\n".join(python)))
                python = []
            trozos.append(("terminal", linea.strip()[1:].strip()))
        else:
            python.append(linea)
    if python and "\n".join(python).strip():
        trozos.append(("python", "\n".join(python)))
    return trozos


def _representar(valor):
    if valor is None:
        return None
    if isinstance(valor, pd.DataFrame):
        return {"tipo": "tabla", "html": valor.to_html(border=0, classes="tabla-salida")}
    return {"tipo": "texto", "texto": repr(valor)}


def _terminal(codigo, id_celda):
    """Como Colab: la salida de error se muestra junto con la normal."""
    r = subprocess.run(codigo, shell=True, executable="/bin/bash", stdout=subprocess.PIPE,
                       stderr=subprocess.STDOUT, text=True,
                       env={**os.environ, "LC_ALL": "C.UTF-8", "LANG": "C.UTF-8"})
    if r.returncode != 0:
        raise RuntimeError(f"[{id_celda}] falló:\n{codigo}\n---\n{r.stdout}")
    return r.stdout


def ejecutar_celda(celda, ns):
    fuente = celda["fuente"]
    if fuente.startswith("%%writefile"):
        primera, _, cuerpo = fuente.partition("\n")
        nombre = primera.split(maxsplit=1)[1].strip()
        Path(nombre).write_text(cuerpo + "\n", encoding="utf-8")
        return {"texto": f"Writing {nombre}\n", "salida": None}
    if fuente.startswith("%%bash"):
        return {"texto": _terminal(fuente.partition("\n")[2], celda["id"]), "salida": None}

    textos, salida = [], None
    for tipo, codigo in _trozos(fuente):
        salida = None
        if tipo == "terminal":
            # En Colab «python» es el intérprete del notebook; aquí, el que ejecuta esto
            comando = re.sub(r"(?<![\w/.-])python(?=\s)", f'"{sys.executable}"', codigo)
            textos.append(_terminal(comando, celda["id"]))
            continue
        arbol = ast.parse(codigo)
        ultimo = arbol.body.pop() if arbol.body and isinstance(arbol.body[-1], ast.Expr) else None
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(compile(arbol, celda["id"], "exec"), ns)
            if ultimo is not None:
                expr = ast.Expression(body=ultimo.value)
                ast.fix_missing_locations(expr)
                salida = _representar(eval(compile(expr, celda["id"], "eval"), ns))
        textos.append(buf.getvalue())
    return {"texto": "".join(textos), "salida": salida}


# ---------------------------------------------------------------------------
# Tablero de calidad: mismos pasos que las celdas, en el mismo orden
# ---------------------------------------------------------------------------
PASOS = [
    {"clave": "duplicados", "etiqueta": "Quitar duplicados", "dimension": "Unicidad"},
    {"clave": "texto", "etiqueta": "Estandarizar texto", "dimension": "Consistencia"},
    {"clave": "precios", "etiqueta": "Convertir precios", "dimension": "Validez"},
    {"clave": "fechas", "etiqueta": "Interpretar fechas", "dimension": "Validez"},
    {"clave": "reglas", "etiqueta": "Apartar cantidades imposibles", "dimension": "Exactitud"},
    {"clave": "completitud", "etiqueta": "Tratar vacíos", "dimension": "Completitud"},
]


def aplicar_pasos(ventas, activos, ns):
    d = ventas.copy()
    if "duplicados" in activos:
        d = d.drop_duplicates()
    if "texto" in activos:
        d["ciudad"] = ns["normalizar"](d["ciudad"]).map(ns["CIUDAD_CANONICA"]).fillna("Sin dato")
        d["canal"] = d["canal"].str.strip().str.capitalize()
    if "precios" in activos:
        d["precio_unitario"] = pd.to_numeric(
            d["precio_unitario"].astype(str).str.replace(r"[$.\s]", "", regex=True), errors="coerce")
    if "fechas" in activos:
        iso = pd.to_datetime(d["fecha"], format="%Y-%m-%d", errors="coerce")
        dma = pd.to_datetime(d["fecha"], format="%d/%m/%Y", errors="coerce")
        d["fecha"] = iso.fillna(dma)
    if "reglas" in activos:
        d = d[d["cantidad"].between(1, 50)].copy()
    if "completitud" in activos:
        d["descuento"] = d["descuento"].fillna(0)
        d["id_cliente"] = d["id_cliente"].fillna("ANONIMO")
        d["metodo_pago"] = d["metodo_pago"].fillna("Sin dato")
    return d


def indicadores(d):
    precio = pd.to_numeric(d["precio_unitario"], errors="coerce")
    if pd.api.types.is_datetime64_any_dtype(d["fecha"]):
        fechas_malas = int(d["fecha"].isna().sum())
    else:
        fechas_malas = int(pd.to_datetime(d["fecha"], format="%Y-%m-%d", errors="coerce").isna().sum())
    total = d["cantidad"] * precio * (1 - d["descuento"])
    por_grafia = total.groupby(d["ciudad"].fillna("(vacío)")).sum().sort_values(ascending=False) / 1e6
    principales = por_grafia.head(10)
    resto = por_grafia.iloc[10:]
    barras = [[str(k), round(float(v), 2)] for k, v in principales.items()]
    if len(resto):
        n_grafias = int((resto.index != "(vacío)").sum())
        etiqueta = f"otras {n_grafias} grafías" + (" y vacíos" if "(vacío)" in resto.index else "")
        barras.append([etiqueta, round(float(resto.sum()), 2)])
    return {
        "filas": int(len(d)),
        "duplicadas": int(d.duplicated().sum()),
        "vacias": int(d.isna().sum().sum()),
        "grafias_ciudad": int(d["ciudad"].nunique()),
        "grafias_canal": int(d["canal"].nunique()),
        "precios_malos": int(precio.isna().sum()),
        "fechas_malas": fechas_malas,
        "fuera_rango": int((~d["cantidad"].between(1, 50)).sum()),
        "filas_con_total": int(total.notna().sum()),
        "total_millones": round(float(total.sum()) / 1e6, 2),
        "barras": barras,
    }


def tablero_calidad(ns, df_limpio):
    ventas = ns["ventas"]
    combinaciones = {}
    for mascara in range(2 ** len(PASOS)):
        activos = {p["clave"] for i, p in enumerate(PASOS) if mascara >> i & 1}
        combinaciones[str(mascara)] = indicadores(aplicar_pasos(ventas, activos, ns))
    # Control: los seis pasos juntos deben reproducir EXACTAMENTE el df de las celdas
    todo = aplicar_pasos(ventas, {p["clave"] for p in PASOS}, ns)
    assert todo.reset_index(drop=True).equals(df_limpio.reset_index(drop=True)), \
        "El tablero de calidad no reproduce el df limpio de las celdas"
    return {"pasos": PASOS, "combinaciones": combinaciones}


# ---------------------------------------------------------------------------
def _versiones(numero):
    versiones = {"python": sys.version.split()[0], "pandas": pd.__version__}
    if numero >= 2:
        import pyspark
        versiones["pyspark"] = pyspark.__version__
        java = subprocess.run(["java", "-version"], capture_output=True, text=True).stderr
        versiones["java"] = java.splitlines()[0]
    return versiones


def main():
    numero, sesion = sesion_de_argumentos()
    if sesion["docker"] and not en_docker():
        relanzar_en_docker("ejecuta_celdas.py", numero)

    celdas = leer_celdas(AQUI / sesion["celdas"])
    trabajo = trabajo_por_defecto()
    if trabajo == AQUI / "_trabajo" and trabajo.exists():
        shutil.rmtree(trabajo)
    trabajo.mkdir(parents=True, exist_ok=True)
    # En la réplica de Colab, el tarball de Hadoop ya descargado al construir la imagen
    cache = Path("/opt/cache")
    if cache.is_dir():
        for f in cache.iterdir():
            shutil.copy2(f, trabajo / f.name)
    os.chdir(trabajo)
    sys.path.insert(0, str(AQUI))
    import genera_datos

    pd.set_option("display.max_columns", 20)
    pd.set_option("display.width", 100)
    ns = {"__name__": "__main__", "crear_datos": genera_datos.crear_datos}

    resultados, df_limpio = {}, None
    for c in celdas:
        if c["tipo"] != "codigo":
            continue
        resultados[c["id"]] = {**ejecutar_celda(c, ns), "banderas": c["banderas"]}
        if numero == 1 and c["id"] == "completitud":
            df_limpio = ns["df"].copy()
        print(f"  ok  {c['id']}", flush=True)

    salida = {
        "sesion": numero,
        "generado": date.today().isoformat(),
        "versiones": _versiones(numero),
        "celdas": resultados,
        "cifras": {k: (v if isinstance(v, str) else str(v)) for k, v in ns["CIFRAS"].items()},
    }
    destino = RAIZ / "datos"
    if numero == 1:
        salida["calidad"] = tablero_calidad(ns, df_limpio)
        # Los datos del proyecto son los mismos que acaba de usar la ejecución
        destino.mkdir(exist_ok=True)
        for f in (trabajo / "datos").iterdir():
            shutil.copy2(f, destino / f.name)
    else:
        for f in (trabajo / "datos").iterdir():
            assert f.read_bytes() == (destino / f.name).read_bytes(), \
                f"{f.name} generado en Docker difiere del de datos/: el generador no es determinista"
        print("  ok  datos idénticos a los de datos/ (byte a byte)")
        salida["simuladores"] = ns["SIMULADORES"]

    archivo = AQUI / sesion["salidas"]
    archivo.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(resultados)} celdas ejecutadas sin errores → {archivo.name}")


if __name__ == "__main__":
    main()
