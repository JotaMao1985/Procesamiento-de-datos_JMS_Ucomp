# Profundización I: Procesamiento de Datos

Material de clase del curso *Profundización I: Procesamiento de Datos* (Especialización en Big Data,
UCompensar). Son tres sesiones sincrónicas (6 h + 6 h + 4 h) que siguen un mismo caso:
**Tiendas Guadua S.A.S.**, una empresa **ficticia**. Sus datos se generan con una semilla fija y no
corresponden a personas ni a empresas reales.

**Material en línea:** <https://jotamao1985.github.io/Procesamiento-de-datos_JMS_Ucomp/>

| Sesión | Tema | Notebook |
|---|---|---|
| 1 | Del dato al MapReduce: ciclo de procesamiento, nube, Hadoop, pandas y MapReduce en Python | [Abrir en Colab](https://colab.research.google.com/github/JotaMao1985/Procesamiento-de-datos_JMS_Ucomp/blob/main/notebooks/sesion-1-procesamiento.ipynb) |
| 2 | De Hadoop a Spark: HDFS, Hadoop Streaming, PySpark, Spark SQL y base de datos del caso | [Abrir en Colab](https://colab.research.google.com/github/JotaMao1985/Procesamiento-de-datos_JMS_Ucomp/blob/main/notebooks/sesion-2-hadoop-spark.ipynb) |
| 3 | Datos no estructurados | Próximamente |

Cada sesión tiene:

- **una página HTML** para proyectar en clase y repasar después. Incluye explicaciones,
  simuladores, autoevaluaciones y el taller con su rúbrica;
- **diapositivas de clase** para la exposición, enlazadas desde la portada (por ahora, las de la sesión 1);
- **un notebook de Google Colab** con las mismas celdas. Se abre con el botón «Abrir en Colab» de la
  página o del cuadro de arriba; después hay que guardar una copia en Drive para conservar los
  cambios. La primera celda crea los datos del caso, así que no hay que subir nada más.

## Estructura del repositorio

```
Htmls/        páginas publicadas en GitHub Pages (generadas, no se editan a mano)
notebooks/    notebooks para Colab, uno por sesión
datos/        datos del caso (los mismos que genera la primera celda de cada notebook)
fuente/       fuente de las páginas: módulos, estilos y lógica de simuladores y cuestionarios;
              en fuente/diapositivas/, la fuente Markdown de las diapositivas
precalculo/   scripts que generan los datos, ejecutan las celdas y construyen y auditan cada sesión
```

## Cómo se construye una sesión

Las cifras y salidas que muestran las páginas salen de ejecutar el código, nunca se escriben a mano.
Para regenerar la sesión `N`:

```bash
python3 precalculo/ejecuta_celdas.py N && python3 precalculo/genera_notebook.py N && python3 precalculo/construye.py N && python3 precalculo/audita.py N
```

Las celdas se ejecutan en una réplica de Colab con Docker (x86_64, Python 3.13, Java 21,
PySpark 4.0.4, Hadoop 3.5.0). Antes, construye la imagen una vez:

```bash
docker build --platform linux/amd64 -t procesamiento-colab:amd64 precalculo/docker
```

Al subir cambios en `Htmls/` a la rama `main`, el flujo `.github/workflows/pages.yml` publica de
nuevo el sitio.
