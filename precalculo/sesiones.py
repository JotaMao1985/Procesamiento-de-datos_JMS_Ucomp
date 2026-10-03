"""Qué archivos produce cada sesión y dónde se ejecuta su código.

Lo comparten ejecuta_celdas.py, genera_notebook.py, construye.py y audita.py:

    python precalculo/<script>.py 2        (sin número: sesión 1)

- docker=False: el código se ejecuta con el Python local (solo pandas y biblioteca estándar).
- docker=True: se ejecuta en la imagen «procesamiento-colab:amd64» (precalculo/docker/Dockerfile),
  una réplica del entorno de Google Colab: x86_64, Python 3.13, pandas 2.2.3, Java 21, PySpark y el
  tarball de Hadoop, con 2 núcleos como la versión gratuita. Así las salidas muestran las mismas
  versiones, rutas y nombres de archivo que verá el estudiante. En un Mac con Apple Silicon corre
  emulada (Rosetta). Los scripts se relanzan solos dentro del contenedor.
"""

import os
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
IMAGEN = "procesamiento-colab:amd64"
PLATAFORMA = "linux/amd64"            # la arquitectura de Colab
REPOSITORIO = "JotaMao1985/Procesamiento-de-datos_JMS_Ucomp"   # GitHub: de aquí abre Colab los notebooks
RAMA = "main"

SESIONES = {
    1: {
        "titulo": "Del dato al MapReduce",
        "celdas": "celdas_sesion1.py",
        "salidas": "salidas_sesion1.json",
        "fuente": "sesion1/sesion1.html",
        "html": "sesion-1-del-dato-al-mapreduce.html",
        "notebook": "sesion-1-procesamiento.ipynb",
        "modulos": 17,
        "breaks": [15, 30, 15, 0],
        "minutos": 360,
        "docker": True,
    },
    2: {
        "titulo": "De Hadoop a Spark",
        "celdas": "celdas_sesion2.py",
        "salidas": "salidas_sesion2.json",
        "fuente": "sesion2/sesion2.html",
        "html": "sesion-2-de-hadoop-a-spark.html",
        "notebook": "sesion-2-hadoop-spark.ipynb",
        "modulos": 14,
        "breaks": [30, 0],
        "minutos": 240,
        "docker": True,
    },
}


def enlace_colab(sesion):
    """Abre en Colab el notebook de la sesión publicado en GitHub (rama RAMA)."""
    return (f"https://colab.research.google.com/github/{REPOSITORIO}/blob/{RAMA}/"
            f"notebooks/{sesion['notebook']}")


def sesion_de_argumentos():
    numero = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    if numero not in SESIONES:
        sys.exit(f"Sesión desconocida: {numero}. Disponibles: {sorted(SESIONES)}")
    return numero, SESIONES[numero]


def en_docker():
    return Path("/.dockerenv").exists()


def relanzar_en_docker(script, numero):
    """Ejecuta `script` dentro de la réplica de Colab y termina con su código de salida."""
    orden = ["docker", "run", "--rm", "--init", "--platform", PLATAFORMA, "--cpus", "2", "--memory", "12g",
             "-e", "LANG=C.UTF-8", "-e", "LC_ALL=C.UTF-8", "-e", "TRABAJO_DIR=/content",
             "-v", f"{RAIZ}:/proyecto", "-w", "/proyecto", IMAGEN,
             "python3", f"precalculo/{script}", str(numero)]
    print("→ en Docker (réplica de Colab):", IMAGEN)
    sys.exit(subprocess.run(orden).returncode)


def trabajo_por_defecto():
    return Path(os.environ.get("TRABAJO_DIR", AQUI / "_trabajo"))
