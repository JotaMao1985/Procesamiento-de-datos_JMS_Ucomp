"""Arma el notebook de una sesión para Google Colab a partir de celdas_sesionN.py.

    python precalculo/genera_notebook.py [N]

- Las celdas «solucion» y «privada» no van al notebook.
- La celda «generador» lleva dentro el código de genera_datos.py como formulario
  oculto de Colab (#@title): el estudiante la ejecuta sin tener que leerla y los
  datos se crean en /content/datos, sin subir ningún archivo. Las celdas
  «formulario» traen su propio #@title y también van plegadas.
- Cada celda de código lleva «# [id]», el mismo identificador del bloque de
  código en el material HTML, para seguir la clase celda a celda (en las celdas
  %%bash y en los formularios, en la segunda línea; las %%writefile no lo
  llevan porque esa línea iría a parar al archivo).

Se escribe el JSON de nbformat 4.5 directamente: no hace falta instalar nada.
"""

import json
from pathlib import Path

from ejecuta_celdas import leer_celdas
from sesiones import AQUI, RAIZ, sesion_de_argumentos


def _fuente_generador():
    codigo = (AQUI / "genera_datos.py").read_text(encoding="utf-8")
    codigo = codigo.split('\nif __name__ == "__main__":')[0].rstrip()
    titulo = '#@title ▶ Crea los datos del caso (ejecútala sin modificar) { display-mode: "form" }'
    return titulo + "\n" + codigo + "\n\n"


def _lineas(texto):
    lineas = texto.split("\n")
    return [l + "\n" for l in lineas[:-1]] + [lineas[-1]]


def _con_id(fuente, ident):
    primera, _, resto = fuente.partition("\n")
    if fuente.startswith("%%writefile"):
        return fuente
    if fuente.startswith(("%%", "#@title")):
        return f"{primera}\n# [{ident}]\n{resto}"
    return f"# [{ident}]\n{fuente}"


def main():
    numero, sesion = sesion_de_argumentos()
    destino = RAIZ / "notebooks" / sesion["notebook"]
    celdas_nb = []
    for i, c in enumerate(leer_celdas(AQUI / sesion["celdas"])):
        ident = f"c{i:03d}"
        if c["tipo"] == "markdown":
            celdas_nb.append({"cell_type": "markdown", "id": ident, "metadata": {},
                              "source": _lineas(c["fuente"])})
            continue
        if {"solucion", "privada"} & set(c["banderas"]):
            continue
        fuente = c["fuente"]
        metadata = {}
        if "generador" in c["banderas"]:
            fuente = _fuente_generador() + fuente
            metadata["cellView"] = "form"
        else:
            fuente = _con_id(fuente, c["id"])
            if "formulario" in c["banderas"]:
                metadata["cellView"] = "form"
        celdas_nb.append({"cell_type": "code", "execution_count": None, "id": ident,
                          "metadata": metadata, "outputs": [], "source": _lineas(fuente)})

    notebook = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "colab": {"provenance": [], "toc_visible": True},
            "kernelspec": {"name": "python3", "display_name": "Python 3"},
            "language_info": {"name": "python"},
        },
        "cells": celdas_nb,
    }
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n_codigo = sum(c["cell_type"] == "code" for c in celdas_nb)
    print(f"{destino.relative_to(RAIZ)}: {len(celdas_nb)} celdas ({n_codigo} de código)")


if __name__ == "__main__":
    main()
