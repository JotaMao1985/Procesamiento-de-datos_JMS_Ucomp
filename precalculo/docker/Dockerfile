# Réplica del entorno de Google Colab para ejecutar y verificar las celdas de la Sesión 2.
#
# Colab (octubre de 2026, según github.com/googlecolab/backend-info): Ubuntu 24.04,
# Python 3.13, OpenJDK 21, pandas 2.2.3, PySpark 4.0.4 preinstalado. Aquí se usa la imagen
# oficial de Python 3.13 sobre Debian 13, que trae OpenJDK 21 en sus repositorios.
#
#   docker build -t procesamiento-colab precalculo/docker
#
# El tarball de Hadoop se descarga UNA vez, al construir la imagen, y queda en /opt/cache:
# la celda de instalación del notebook lo encuentra y no lo vuelve a descargar.

FROM python:3.13-slim-trixie

RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-21-jdk-headless procps wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir pandas==2.2.3 numpy==2.1.3 pyspark==4.0.4 pyarrow==23.0.1

ARG HADOOP=3.5.0
RUN mkdir -p /opt/cache && cd /opt/cache \
 && sufijo=$([ "$(uname -m)" = "aarch64" ] && echo "-aarch64" || echo "") \
 && wget -q "https://dlcdn.apache.org/hadoop/common/hadoop-${HADOOP}/hadoop-${HADOOP}${sufijo}.tar.gz" \
 && wget -q "https://dlcdn.apache.org/hadoop/common/hadoop-${HADOOP}/hadoop-${HADOOP}${sufijo}.tar.gz.sha512"

WORKDIR /content
