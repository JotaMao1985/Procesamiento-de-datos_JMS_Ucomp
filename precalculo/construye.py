"""Construye el HTML de una sesión (y la portada Htmls/index.html) a partir de fuente/.

    python precalculo/construye.py [N]

Lee fuente/sesionN/sesionN.html y resuelve sus marcadores:

    {{INCLUIR:ruta}}     inserta otro archivo de fuente/ (recursivo)
    {{CELDA:id}}         bloque de código de la celda + su salida real
    {{CODIGO:id}}        solo el bloque de código
    {{CIFRA:clave}}      cifra calculada en la celda privada «cifras» (CIFRAS)
    {{JSON:nombre}}      datos para los simuladores (ver datos_json)
    {{MUESTRA:archivo|n}} primeras n líneas de un archivo de datos/, escapadas
    {{LOGO}}             logo institucional como data URI
    {{COLAB}}            enlace que abre en Colab el notebook de la sesión publicado en GitHub

El código sale de celdas_sesionN.py y las salidas de salidas_sesionN.json
(ejecuta_celdas.py): el HTML nunca lleva una cifra escrita a mano. Si queda un
marcador sin resolver, se detiene con error.
"""

import base64
import csv
import html
import json
import re
from pathlib import Path

from ejecuta_celdas import leer_celdas
from sesiones import AQUI, RAIZ, enlace_colab, sesion_de_argumentos

FUENTE = RAIZ / "fuente"
MARCADOR = re.compile(r"\{\{([A-Z]+):([^}]+)\}\}|\{\{LOGO\}\}|\{\{COLAB\}\}")


def _codigo_html(celda):
    fuente = celda["fuente"]
    if "generador" in celda["banderas"]:
        fuente = "# En el notebook, esta celda trae el generador completo (oculto).\n" + fuente
    if "formulario" in celda["banderas"]:
        fuente = fuente.partition("\n")[2]          # sin la línea #@title de Colab
        fuente = "# En el notebook, esta celda va plegada: ejecútala sin abrirla.\n" + fuente
    lenguaje = "bash" if fuente.startswith("%%bash") else "python"
    return f'<pre><code class="language-{lenguaje}">{html.escape(fuente)}</code></pre>'


def _salida_html(id_celda, salida, banderas):
    partes = []
    texto = salida["texto"]
    if texto.strip():
        partes.append(f"<pre>{html.escape(texto.rstrip())}</pre>")
    s = salida["salida"]
    if s and s["tipo"] == "tabla":
        partes.append(f'<div class="salida-tabla">{s["html"]}</div>')
    elif s and s["tipo"] == "texto":
        partes.append(f"<pre>{html.escape(s['texto'])}</pre>")
    if not partes:
        return ""
    nota = ""
    if "variable" in banderas:
        nota = ('<p class="salida-nota">Salida de referencia: en Colab puede variar en versiones, '
                'rutas, tiempos o identificadores.</p>')
    return (f'<div class="salida" aria-label="Salida de la celda {id_celda}">'
            f'<div class="salida-rotulo"><i class="fas fa-terminal" aria-hidden="true"></i>Salida</div>'
            f'{"".join(partes)}{nota}</div>')


def _csv_como_texto(ruta):
    return Path(ruta).read_text(encoding="utf-8")


def _archivo(nombre, ruta, tipo=None):
    datos = {"nombre": nombre, "contenido": _csv_como_texto(ruta)}
    if tipo:
        datos["tipo"] = tipo
    return datos


def datos_json(numero, sesion, salidas):
    datos = RAIZ / "datos"
    notebook = _archivo(sesion["notebook"], RAIZ / "notebooks" / sesion["notebook"],
                        "application/x-ipynb+json;charset=utf-8")
    if numero == 1:
        with open(datos / "resenas.csv", encoding="utf-8") as f:
            resenas = [{"calificacion": int(r["calificacion"]), "texto": r["texto"]} for r in csv.DictReader(f)]
        return {
            "calidad": salidas["calidad"],
            "resenas": resenas,
            "archivos": {
                "ventas": _archivo("ventas.csv", datos / "ventas.csv"),
                "productos": _archivo("productos.csv", datos / "productos.csv"),
                "resenas": _archivo("resenas.csv", datos / "resenas.csv"),
                "notebook": notebook,
            },
        }
    return {
        "simuladores": salidas["simuladores"],
        "archivos": {
            "logs": _archivo("logs_web.jsonl", datos / "logs_web.jsonl", "application/x-ndjson;charset=utf-8"),
            "notebook": notebook,
        },
    }


def construir():
    numero, sesion = sesion_de_argumentos()
    destino = RAIZ / "Htmls" / sesion["html"]
    salidas = json.loads((AQUI / sesion["salidas"]).read_text(encoding="utf-8"))
    celdas = {c["id"]: c for c in leer_celdas(AQUI / sesion["celdas"]) if c["tipo"] == "codigo"}
    cifras = salidas["cifras"]
    datos = datos_json(numero, sesion, salidas)
    logo = base64.b64encode((FUENTE / "comun" / "logo-ucompensar.png").read_bytes()).decode()
    usadas = set()

    def resolver(texto, profundidad=0):
        assert profundidad < 5, "INCLUIR demasiado anidado"

        def sustituir(m):
            if m.group(0) == "{{LOGO}}":
                return f"data:image/png;base64,{logo}"
            if m.group(0) == "{{COLAB}}":
                return html.escape(enlace_colab(sesion))
            tipo, arg = m.group(1), m.group(2).strip()
            if tipo == "INCLUIR":
                return resolver((FUENTE / arg).read_text(encoding="utf-8"), profundidad + 1)
            if tipo in ("CELDA", "CODIGO"):
                c = celdas[arg]
                usadas.add(arg)
                bloque = _codigo_html(c)
                if tipo == "CELDA":
                    bloque += _salida_html(arg, salidas["celdas"][arg], c["banderas"])
                return f'<div class="celda" data-celda="{arg}">{bloque}</div>'
            if tipo == "MUESTRA":
                archivo, n = arg.split("|")
                lineas = (RAIZ / "datos" / archivo).read_text(encoding="utf-8").splitlines()[:int(n)]
                return html.escape("\n".join(lineas))
            if tipo == "CIFRA":
                return html.escape(cifras[arg])
            if tipo == "JSON":
                # </script> dentro de un string JSON cerraría la etiqueta antes de tiempo
                return json.dumps(datos[arg], ensure_ascii=False).replace("</", "<\\/")
            raise KeyError(f"Marcador desconocido: {m.group(0)}")

        return MARCADOR.sub(sustituir, texto)

    pagina = resolver((FUENTE / sesion["fuente"]).read_text(encoding="utf-8"))
    restos = re.findall(r"\{\{[^}]*\}\}", pagina)
    assert not restos, f"Marcadores sin resolver: {restos[:5]}"

    sin_usar = [i for i, c in celdas.items()
                if i not in usadas and "privada" not in c["banderas"]]
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(pagina, encoding="utf-8")
    kb = destino.stat().st_size / 1024
    print(f"{destino.relative_to(RAIZ)}: {kb:,.0f} KB · {len(usadas)} celdas")

    # Portada del curso: misma hoja de estilos y mismo logo
    portada = resolver((FUENTE / "index.html").read_text(encoding="utf-8"))
    assert not re.findall(r"\{\{[^}]*\}\}", portada), "Marcadores sin resolver en la portada"
    (destino.parent / "index.html").write_text(portada, encoding="utf-8")
    print(f"{(destino.parent / 'index.html').relative_to(RAIZ)}: portada del curso")
    if sin_usar:
        print("AVISO: celdas que no aparecen en el HTML:", ", ".join(sin_usar))


if __name__ == "__main__":
    construir()
