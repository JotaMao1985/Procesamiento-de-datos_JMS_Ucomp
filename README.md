# Profundización I: Procesamiento de Datos

Material de clase del curso *Profundización I: Procesamiento de Datos* (Especialización en Big Data,
UCompensar). Son tres sesiones sincrónicas (6 h + 6 h + 4 h) que siguen un mismo caso:
**Tiendas Guadua S.A.S.**, una empresa **ficticia**. Sus datos se generan con una semilla fija y no
corresponden a personas ni a empresas reales.

**Material en línea:** <https://jotamao1985.github.io/Procesamiento-de-datos_JMS_Ucomp/>

| Sesión | Tema | Estado |
|---|---|---|
| 1 | Del dato al MapReduce: ciclo de procesamiento, nube, Hadoop, pandas y MapReduce en Python | Disponible |
| 2 | De Hadoop a Spark: HDFS, Hadoop Streaming, PySpark, Spark SQL y base de datos del caso | Disponible |
| 3 | Datos no estructurados | Próximamente |

Cada sesión tiene:

- **una página HTML** para proyectar en clase y repasar después. Incluye explicaciones,
  simuladores, autoevaluaciones y el taller con su rúbrica;
- **un notebook de Google Colab** con las mismas celdas. Se descarga desde la propia página o desde
  la carpeta `notebooks/`, y la primera celda crea los datos del caso, así que no hay que subir
  nada más.

## Estructura del repositorio

```
Htmls/        páginas publicadas en GitHub Pages (generadas, no se editan a mano)
notebooks/    notebooks para Colab, uno por sesión
datos/        datos del caso (los mismos que genera la primera celda de cada notebook)
fuente/       fuente de las páginas: módulos, estilos y lógica de simuladores y cuestionarios
precalculo/   scripts que generan los datos, ejecutan las celdas y construyen y auditan cada sesión
PLAN_Procesamiento_de_Datos.md   plan del curso: decisiones, cómo se construye y estado
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
