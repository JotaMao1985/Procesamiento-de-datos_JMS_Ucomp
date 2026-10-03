# Fuente ÚNICA del código de la Sesión 2. De aquí salen:
#   - los bloques de código del HTML        (construye.py 2)
#   - el notebook para Colab                (genera_notebook.py 2)
#   - las salidas y cifras del material     (ejecuta_celdas.py 2, dentro de Docker)
#
# No es un script ejecutable: contiene «magias» de Jupyter (%%writefile, %%bash, !).
# Formato de las cabeceras:
#   # %% [markdown]            celda de texto del notebook (líneas con «# »)
#   # %% <id> [banderas]       celda de código
# Banderas:
#   generador   en el notebook se antepone el código de genera_datos.py (celda oculta)
#   formulario  en el notebook va como formulario plegado de Colab (#@title en la 1.ª línea)
#   variable    la salida depende del entorno (versiones, rutas, tiempos): el HTML lo advierte
#   solucion    solución de un ejercicio: va al HTML, NO al notebook
#   privada     solo para el precálculo: no va al HTML ni al notebook

# %% [markdown]
# # Sesión 2 · De Hadoop a Spark
# **Profundización I: Procesamiento de Datos — Especialización en Big Data (UCompensar)**
#
# Este notebook acompaña el material HTML de la sesión. Cada celda lleva el mismo
# identificador que el bloque de código del material, así que puedes seguir la clase
# celda a celda.
#
# 1. **Archivo → Guardar una copia en Drive** para que tus cambios no se pierdan.
# 2. Ejecuta las celdas **en orden**. Hadoop y Spark guardan estado entre celdas.
# 3. Si Colab se reinicia (por ejemplo, tras un rato sin uso), usa
#    **Entorno de ejecución → Ejecutar anteriores** desde la celda en la que ibas.
# 4. Los datos son de *Tiendas Guadua S.A.S.*, una empresa **ficticia**.

# %% datos generador
# Crea la carpeta datos/ con los cuatro archivos del caso (los mismos de la sesión 1)
rutas = crear_datos("datos")

# %% sesion1 formulario
#@title ▶ Trae los resultados de la sesión 1 (ejecútala sin modificar) { display-mode: "form" }
# Repite la limpieza de la sesión 1 y deja listos:
#   df                  las ventas limpias en pandas, con total, mes y categoría
#   ventas_limpias.csv  ciudad,total: la entrada del job de Hadoop
import pandas as pd

ventas = pd.read_csv("datos/ventas.csv")
productos = pd.read_csv("datos/productos.csv")

CIUDAD_CANONICA = {
    "bogota": "Bogotá", "bogota d.c.": "Bogotá",
    "medellin": "Medellín",
    "cali": "Cali",
    "barranquilla": "Barranquilla", "b/quilla": "Barranquilla",
    "bucaramanga": "Bucaramanga", "b/manga": "Bucaramanga",
    "cartagena": "Cartagena", "cartagena de indias": "Cartagena",
}


def limpiar_ventas(v):
    """Los seis pasos de limpieza de la sesión 1, en el mismo orden."""
    d = v.drop_duplicates().copy()                                      # unicidad
    norma = (d["ciudad"].str.strip().str.lower().str.normalize("NFKD")
             .str.encode("ascii", errors="ignore").str.decode("ascii"))
    d["ciudad"] = norma.map(CIUDAD_CANONICA).fillna("Sin dato")        # consistencia
    d["canal"] = d["canal"].str.strip().str.capitalize()
    d["precio_unitario"] = pd.to_numeric(                               # validez
        d["precio_unitario"].astype(str).str.replace(r"[$.\s]", "", regex=True), errors="coerce")
    iso = pd.to_datetime(d["fecha"], format="%Y-%m-%d", errors="coerce")
    d["fecha"] = iso.fillna(pd.to_datetime(d["fecha"], format="%d/%m/%Y", errors="coerce"))
    d = d[d["cantidad"].between(1, 50)].copy()                          # exactitud
    d["descuento"] = d["descuento"].fillna(0)                           # completitud
    d["id_cliente"] = d["id_cliente"].fillna("ANONIMO")
    d["metodo_pago"] = d["metodo_pago"].fillna("Sin dato")
    d["total"] = d["cantidad"] * d["precio_unitario"] * (1 - d["descuento"])
    d["mes"] = d["fecha"].dt.strftime("%Y-%m")
    return d.merge(productos[["id_producto", "nombre", "categoria"]],
                   on="id_producto", how="left", validate="many_to_one")


df = limpiar_ventas(ventas)
df[["ciudad", "total"]].to_csv("ventas_limpias.csv", index=False)
print(f"df: {len(df)} ventas limpias · total {df['total'].sum() / 1e6:.1f} millones de pesos")
print("ventas_limpias.csv listo para Hadoop")

# %% [markdown]
# ## Bloque 1 · Módulo 1 — El entorno de hoy

# %% entorno variable
import sys
import pyspark

print("Python :", sys.version.split()[0])
print("pandas :", pd.__version__)
print("PySpark:", pyspark.__version__)
!java -version 2>&1 | head -n 1

# %% [markdown]
# ## Bloque 1 · Módulo 2 — Hadoop en Colab

# %% hadoop_descarga variable
import os
import platform
import urllib.request

VERSION = "3.5.0"
# Colab corre en procesadores x86_64; para equipos ARM (aarch64) Apache publica otro archivo
sufijo = "-aarch64" if platform.machine() == "aarch64" else ""
ARCHIVO = f"hadoop-{VERSION}{sufijo}.tar.gz"
ESPEJOS = [f"https://dlcdn.apache.org/hadoop/common/hadoop-{VERSION}/",
           f"https://archive.apache.org/dist/hadoop/common/hadoop-{VERSION}/"]


def descargar(nombre):
    """Intenta el espejo principal de Apache y, si falla, su archivo histórico.
    Baja a un archivo «.parcial» y solo al final le pone su nombre: una descarga
    cortada no se confunde con una completa."""
    for base in ESPEJOS:
        try:
            urllib.request.urlretrieve(base + nombre, nombre + ".parcial")
            os.replace(nombre + ".parcial", nombre)
            return
        except OSError as error:
            print("Sin respuesta de", base, "·", error)
    raise RuntimeError(f"No se pudo descargar {nombre}")


for nombre in [ARCHIVO, ARCHIVO + ".sha512"]:
    if not os.path.exists(nombre):
        print("Descargando", nombre, "…")
        descargar(nombre)
print(f"{ARCHIVO}: {os.path.getsize(ARCHIVO) / 1e6:,.0f} MB")

# %% hadoop_integridad variable
import hashlib

# CONTROL DE SEGURIDAD: ¿el archivo es exactamente el que publicó Apache?
publicado = open(ARCHIVO + ".sha512").read().split("=")[-1].strip()
huella = hashlib.sha512()
with open(ARCHIVO, "rb") as f:
    for trozo in iter(lambda: f.read(1 << 20), b""):      # de a 1 MB
        huella.update(trozo)
print("SHA-512 publicado:", publicado[:32], "…")
print("SHA-512 calculado:", huella.hexdigest()[:32], "…")
print("¿Íntegro?", huella.hexdigest() == publicado)

# %% hadoop_instala variable
import shutil
import subprocess

if not os.path.isdir(f"hadoop-{VERSION}"):
    subprocess.run(["tar", "-xzf", ARCHIVO], check=True)    # descomprimir: unos 30 s

# Variables de entorno que Hadoop necesita; las órdenes «!» y %%bash las heredan
os.environ["JAVA_HOME"] = os.path.dirname(os.path.dirname(os.path.realpath(shutil.which("java"))))
os.environ["HADOOP_HOME"] = os.path.abspath(f"hadoop-{VERSION}")
os.environ["PATH"] = os.environ["HADOOP_HOME"] + "/bin:" + os.environ["PATH"]
# Colab trabaja como root: Hadoop exige declararlo para arrancar sus servicios
os.environ["HDFS_NAMENODE_USER"] = "root"
os.environ["HDFS_DATANODE_USER"] = "root"

print("JAVA_HOME   =", os.environ["JAVA_HOME"])
print("HADOOP_HOME =", os.environ["HADOOP_HOME"])
!hadoop version | head -n 1

# %% [markdown]
# ## Bloque 1 · Módulo 3 — HDFS en la práctica

# %% hdfs_config
# Modo PSEUDODISTRIBUIDO: NameNode y DataNode como servicios separados, en esta máquina
CONF = os.path.join(os.environ["HADOOP_HOME"], "etc", "hadoop")
BASE = os.path.abspath("hdfs")       # carpeta local donde HDFS guarda lo suyo


def escribir_xml(archivo, propiedades):
    """Hadoop se configura con archivos XML de pares nombre → valor."""
    filas = "\n".join(f"  <property><name>{k}</name><value>{v}</value></property>"
                      for k, v in propiedades.items())
    with open(os.path.join(CONF, archivo), "w") as f:
        f.write(f"<configuration>\n{filas}\n</configuration>\n")


escribir_xml("core-site.xml", {"fs.defaultFS": "hdfs://localhost:9000"})
escribir_xml("hdfs-site.xml", {
    "dfs.replication": 1,                             # un solo DataNode → una sola copia
    "dfs.namenode.name.dir": f"file://{BASE}/nombres",
    "dfs.datanode.data.dir": f"file://{BASE}/bloques",
    "dfs.namenode.fs-limits.min-block-size": 65536,   # permite bloques pequeños, solo para aprender
})
!cat $HADOOP_HOME/etc/hadoop/hdfs-site.xml

# %% hdfs_arranque variable
%%bash
# 1) Formatear: crea un sistema de archivos HDFS vacío (solo la primera vez)
if [ ! -d hdfs/nombres/current ]; then
  hdfs namenode -format -force -nonInteractive > formato.log 2>&1 && echo "NameNode formateado"
fi
# 2) Arrancar los dos servicios en segundo plano (si no están ya en marcha)
jps | grep -q " NameNode" || hdfs --daemon start namenode
jps | grep -q " DataNode" || hdfs --daemon start datanode
# 3) Esperar a que el DataNode se reporte ante el NameNode
for intento in $(seq 30); do
  hdfs dfsadmin -report 2>/dev/null | grep -q "Live datanodes (1)" && break
  sleep 2
done
hdfs dfsadmin -report 2>/dev/null | grep -E "^(Live datanodes|Name:)"
jps          # procesos de Java en marcha: NameNode y DataNode

# %% hdfs_subir
%%bash
# Las órdenes de HDFS se parecen a las de Linux: hdfs dfs -mkdir, -put, -ls, -cat…
hdfs dfs -mkdir -p /guadua/crudo /guadua/limpio
hdfs dfs -put -f datos/productos.csv datos/logs_web.jsonl /guadua/crudo/
# ventas.csv con bloques de 64 KB (en un clúster real: 128 MB) para ver cómo se parte
hdfs dfs -D dfs.blocksize=65536 -put -f datos/ventas.csv /guadua/crudo/
hdfs dfs -put -f ventas_limpias.csv /guadua/limpio/
hdfs dfs -du -h /guadua/crudo /guadua/limpio

# %% hdfs_bloques
%%bash
# Tamaño, tamaño de bloque y factor de replicación que HDFS registró para cada archivo
hdfs dfs -stat "%n | %b bytes | bloque de %o bytes | replicas: %r" \
  /guadua/crudo/ventas.csv /guadua/crudo/productos.csv /guadua/crudo/logs_web.jsonl

# %% hdfs_fsck variable
%%bash
# fsck: el NameNode informa dónde está cada bloque del archivo
hdfs fsck /guadua/crudo/ventas.csv -files -blocks -locations 2>/dev/null \
  | grep -E "blk_|Total blocks|Status" | sed -E 's/BP-[^:]+://; s/,DS-[^,]+//'

# %% hdfs_permisos
%%bash
# CONTROL DE SEGURIDAD: permisos al estilo Linux. Lo crudo solo para el dueño y su grupo
hdfs dfs -chmod -R 750 /guadua/crudo
hdfs dfs -stat "%A  %u:%g  %n" /guadua/crudo /guadua/limpio

# %% hdfs_leer
%%bash
# Leer de HDFS sin descargar: las primeras líneas y un resumen de la carpeta
hdfs dfs -head /guadua/crudo/ventas.csv | head -n 3
hdfs dfs -count -v -h /guadua


# %% [markdown]
# **Ejercicio (módulo 3).** Si Guadua tuviera un clúster de verdad, con bloques de 128 MB y replicación 3,
# ¿en cuántos bloques quedaría `ventas.csv` y cuántos bytes ocuparía en total en los discos del clúster?
# La pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 1 · Módulo 4 — Hadoop Streaming: el mapper y el reducer de la sesión 1

# %% mapper_py
%%writefile mapper.py
import sys

# MAPPER: lee líneas de la entrada estándar y emite «clave<TAB>valor»
for linea in sys.stdin:
    ciudad, total = linea.strip().split(",")
    if ciudad == "ciudad":        # salta el encabezado
        continue
    print(f"{ciudad}\t{total}")

# %% reducer_py
%%writefile reducer.py
import sys

# REDUCER: recibe las líneas ORDENADAS por clave y acumula mientras la clave no cambie
actual, suma = None, 0.0
for linea in sys.stdin:
    clave, valor = linea.rstrip("\n").split("\t")
    if clave != actual:
        if actual is not None:
            print(f"{actual}\t{suma:.0f}")
        actual, suma = clave, 0.0
    suma += float(valor)
if actual is not None:
    print(f"{actual}\t{suma:.0f}")

# %% streaming_job
%%bash
# El job de la sesión 1, ahora en Hadoop. La carpeta de salida no debe existir:
# se borra antes para poder repetir la celda sin error (y sin duplicar resultados)
hdfs dfs -rm -r -f -skipTrash /guadua/resultados/por_ciudad > /dev/null
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
  -files mapper.py,reducer.py \
  -mapper "python3 mapper.py" \
  -reducer "python3 reducer.py" \
  -input /guadua/limpio/ventas_limpias.csv \
  -output /guadua/resultados/por_ciudad 2> job.log || tail -n 20 job.log
# El registro del job es largo (job.log): miremos solo sus contadores principales
sed -n '/mapreduce.Job: Counters/,$p' job.log | grep -E "Map input records|Map output records|Reduce input groups|Reduce output records"
hdfs dfs -ls -C /guadua/resultados/por_ciudad
hdfs dfs -cat /guadua/resultados/por_ciudad/part-00000

# %% streaming_verifica
import io

# CONTROL DE COHERENCIA: el resultado de Hadoop contra el de pandas
salida = subprocess.run(["hdfs", "dfs", "-cat", "/guadua/resultados/por_ciudad/part-00000"],
                        capture_output=True, text=True, check=True).stdout
hadoop_ciudad = pd.read_csv(io.StringIO(salida), sep="\t", names=["ciudad", "total"],
                            index_col="ciudad")["total"]
comparacion = pd.DataFrame({"Hadoop": hadoop_ciudad,
                            "pandas": df.groupby("ciudad")["total"].sum().round().astype(int)})
comparacion["diferencia"] = comparacion["Hadoop"] - comparacion["pandas"]
comparacion

# %% streaming_partes
# Cuatro archivos de entrada, como los cuatro bloques de la sesión 1: Hadoop lanza un mapper por cada uno
os.makedirs("partes", exist_ok=True)
tam = -(-len(df) // 4)                                   # división hacia arriba
for i in range(4):
    df[["ciudad", "total"]].iloc[i * tam:(i + 1) * tam].to_csv(f"partes/parte-{i + 1}.csv", index=False)
!hdfs dfs -put -f partes /guadua/limpio/
!hdfs dfs -ls -C /guadua/limpio/partes

# %% streaming_combiner
%%bash
# El mismo job dos veces, sobre las cuatro partes y con dos reducers: sin combiner y con combiner
ejecutar () {        # $1: nombre del job; lo demás: opciones adicionales de Streaming
  nombre=$1; shift
  hdfs dfs -rm -r -f -skipTrash /guadua/resultados/$nombre > /dev/null
  hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
    -D mapreduce.job.reduces=2 \
    -files mapper.py,reducer.py \
    -mapper "python3 mapper.py" "$@" -reducer "python3 reducer.py" \
    -input /guadua/limpio/partes \
    -output /guadua/resultados/$nombre 2> job_$nombre.log || tail -n 20 job_$nombre.log
  echo "== $nombre"
  grep -o "number of splits:[0-9]*" job_$nombre.log
  sed -n '/mapreduce.Job: Counters/,$p' job_$nombre.log \
    | grep -E "Map output records|Combine output records|Reduce input records|Reduce shuffle bytes"
}
ejecutar sin_combiner
ejecutar con_combiner -combiner "python3 reducer.py"

# ¿Dieron lo mismo? Se juntan las partes de cada job, se ordenan y se comparan
if diff <(hdfs dfs -cat /guadua/resultados/sin_combiner/part-* | sort) \
        <(hdfs dfs -cat /guadua/resultados/con_combiner/part-* | sort) > /dev/null
then echo "== mismo resultado con y sin combiner"
else echo "== los resultados difieren"
fi

# %% streaming_reducers
%%bash
# Con dos reducers hay dos archivos de salida: cada ciudad cae en uno según el hash de su nombre
for parte in part-00000 part-00001; do
  echo "== $parte"
  hdfs dfs -cat /guadua/resultados/con_combiner/$parte
done

# %% sol_mapper_conteo solucion
%%writefile mapper_conteo.py
import sys

# Número de ventas por ciudad: cada línea emite «ciudad<TAB>1»
for linea in sys.stdin:
    ciudad, _ = linea.strip().split(",")
    if ciudad != "ciudad":
        print(f"{ciudad}\t1")

# %% sol_conteo_ciudad solucion
%%bash
# El reducer de siempre suma los unos; como sumar es asociativo, también sirve de combiner
hdfs dfs -rm -r -f -skipTrash /guadua/resultados/conteo > /dev/null
hadoop jar $HADOOP_HOME/share/hadoop/tools/lib/hadoop-streaming-*.jar \
  -files mapper_conteo.py,reducer.py \
  -mapper "python3 mapper_conteo.py" -combiner "python3 reducer.py" -reducer "python3 reducer.py" \
  -input /guadua/limpio/partes -output /guadua/resultados/conteo 2> job_conteo.log || tail -n 20 job_conteo.log
hdfs dfs -cat /guadua/resultados/conteo/part-00000


# %% [markdown]
# **Ejercicio (módulo 4).** Cuenta con Hadoop Streaming **cuántas ventas** hubo en cada ciudad, sobre las
# cuatro partes. ¿Puedes reutilizar `reducer.py`? Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 1 · Módulo 6 — Spark: el ecosistema

# %% spark_sesion variable
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

# La SparkSession es la puerta de entrada a Spark. «local[*]»: driver y ejecutor en este proceso, con un hilo de trabajo por núcleo
spark = (SparkSession.builder
         .appName("tiendas-guadua")
         .master("local[*]")
         .config("spark.sql.session.timeZone", "America/Bogota")
         .getOrCreate())
sc = spark.sparkContext
sc.setLogLevel("ERROR")      # el registro interno de Java solo mostrará errores
print("Spark", spark.version, "· núcleos disponibles:", sc.defaultParallelism)

# %% [markdown]
# ## Bloque 1 · Módulo 7 — Arquitectura y RDD

# %% rdd_particiones
# Un RDD es una colección repartida en PARTICIONES; cada partición la procesa una tarea
numeros = sc.parallelize(range(1, 11), 4)
print("Particiones:", numeros.getNumPartitions())
print(numeros.glom().collect())          # glom: muestra el contenido de cada partición

# %% rdd_conteo
import re

# El conteo de palabras de la sesión 1 en Spark: map → shuffle → reduce
textos = pd.read_csv("datos/resenas.csv")["texto"].tolist()
lineas = sc.parallelize(textos, 4)
conteo = (lineas.flatMap(lambda t: re.findall(r"[a-záéíóúüñ]+", t.lower()))   # map: palabras
                .map(lambda palabra: (palabra, 1))                            # pares (clave, 1)
                .reduceByKey(lambda a, b: a + b))                             # shuffle + reduce
print("Palabras distintas:", conteo.count())
conteo.takeOrdered(8, key=lambda par: (-par[1], par[0]))

# %% rdd_verifica
from collections import Counter

# CONTROL: el resultado de Spark contra un conteo en Python puro
en_python = Counter(p for t in textos for p in re.findall(r"[a-záéíóúüñ]+", t.lower()))
dict(conteo.collect()) == dict(en_python)

# %% [markdown]
# ## Bloque 2 · Módulo 8 — Transformaciones, acciones y el DAG

# %% perezosa
# Las TRANSFORMACIONES solo anotan qué hacer: esta línea no lee ni calcula nada
largas = lineas.filter(lambda t: len(t) > 60).map(lambda t: t.upper())
print(type(largas).__name__, "· aún sin ejecutar")

# Las ACCIONES (count, take, collect, save…) disparan el trabajo
print("Reseñas de más de 60 caracteres:", largas.count())
print(largas.take(1))

# %% linaje variable
# El linaje: la receta que Spark guarda para (re)calcular el resultado.
# Cada «+-» marca un shuffle, es decir, el límite entre dos ETAPAS
print(conteo.toDebugString().decode())

# %% [markdown]
# ## Bloque 2 · Módulo 9 — DataFrames y Spark SQL

# %% df_crudo
# Un DataFrame: datos con ESQUEMA (columnas con nombre y tipo). Spark adivina los tipos…
crudo = spark.read.csv("datos/ventas.csv", header=True, inferSchema=True)
crudo.printSchema()

# %% df_mostrar
crudo.show(5)

# %% df_canal
# …y la suciedad sigue ahí: Spark no limpia por nosotros
crudo.groupBy("canal").count().orderBy(F.desc("count"), "canal").show()

# %% df_sql
# Otra pregunta, ahora en SQL: filas por ciudad, sobre una vista temporal del DataFrame
crudo.createOrReplaceTempView("ventas_crudas")
spark.sql("""
    SELECT ciudad, COUNT(*) AS filas
    FROM ventas_crudas
    GROUP BY ciudad
    ORDER BY filas DESC, ciudad
    LIMIT 8
""").show()

# %% df_hdfs
# Spark lee directamente de HDFS: el almacenamiento de Hadoop, el procesamiento de Spark
desde_hdfs = spark.read.csv("hdfs://localhost:9000/guadua/crudo/ventas.csv", header=True)
print("Filas leídas desde HDFS:", desde_hdfs.count())
print("Particiones en Spark:", desde_hdfs.rdd.getNumPartitions())

# %% [markdown]
# ## Bloque 2 · Módulo 10 — Leer con esquema
# Declaramos el esquema que deben cumplir las ventas (un contrato) y vemos qué filas no lo cumplen.
# Comparamos los tres modos de lectura: `PERMISSIVE` conserva la fila con nulos, `DROPMALFORMED` la
# descarta sin avisar y `FAILFAST` detiene todo (el error de la celda `modos` es intencional).
# Al final, la capa **bronce**: todo como texto, sin perder ninguna fila.

# %% esquema_estricto
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType

# El esquema que DEBERÍAN cumplir los datos (la fecha va como texto: llega en dos formatos)
ESQUEMA = StructType([
    StructField("id_venta", StringType()),
    StructField("fecha", StringType()),
    StructField("ciudad", StringType()),
    StructField("canal", StringType()),
    StructField("id_cliente", StringType()),
    StructField("id_producto", StringType()),
    StructField("cantidad", IntegerType()),
    StructField("precio_unitario", IntegerType()),
    StructField("descuento", DoubleType()),
    StructField("metodo_pago", StringType()),
])
# Una columna extra recoge, tal cual, cada fila que no cumple el esquema.
# cache() obliga a interpretar todas las columnas (lo explica la advertencia «Una trampa» del módulo)
con_registro = StructType(ESQUEMA.fields + [StructField("_corrupt_record", StringType())])
estricto = spark.read.csv("datos/ventas.csv", header=True, schema=con_registro).cache()
malas = estricto.filter(F.col("_corrupt_record").isNotNull())
print("Filas que no cumplen el esquema:", malas.count())
malas.select("id_venta", "precio_unitario", "_corrupt_record").show(3, truncate=False)

# %% modos
def resumen_error(error):
    """La línea útil de un error de Spark: [CLASE_DE_ERROR] mensaje."""
    clases = re.findall(r"\[[A-Z_.]+\][^\n]*?(?=\s*SQLSTATE|: |\n|$)", str(error))
    return clases[-1].strip() if clases else str(error).splitlines()[0]


# Tres políticas ante una fila que no cumple el esquema
sc.setLogLevel("OFF")        # FAILFAST fallará a propósito: callamos el registro interno de Java
for modo in ["PERMISSIVE", "DROPMALFORMED", "FAILFAST"]:
    lectura = spark.read.csv("datos/ventas.csv", header=True, schema=ESQUEMA, mode=modo)
    try:
        filas = lectura.cache().count()      # cache() obliga a interpretar TODAS las columnas
        nulos = lectura.filter(F.col("precio_unitario").isNull()).count()
        print(f"{modo:<13} → {filas} filas · {nulos} precios nulos")
    except Exception as error:
        print(f"{modo:<13} → ERROR {resumen_error(error)}")
    lectura.unpersist()
sc.setLogLevel("ERROR")

# La trampa: sin cache(), count() no interpreta las columnas y no ve las filas malas
sin_cache = spark.read.csv("datos/ventas.csv", header=True, schema=ESQUEMA, mode="DROPMALFORMED")
print(f"{'DROPMALFORMED':<13} → {sin_cache.count()} filas, sin cache()")

# %% bronce
# Capa BRONCE: todo como texto, tal como llegó. Ninguna fila se pierde ni se altera
TEXTO = StructType([StructField(campo.name, StringType()) for campo in ESQUEMA.fields])
bronce = spark.read.csv("datos/ventas.csv", header=True, schema=TEXTO)
print("Filas en bronce:", bronce.count())
bronce.printSchema()

# %% [markdown]
# ## Bloque 2 · Módulo 11 — La limpieza de la sesión 1, en Spark
# Las seis reglas de la sesión 1, ahora en PySpark. Spark 4 trabaja en **modo ANSI**: una conversión
# imposible es un error, no un nulo (el error de `sp_ansi` es intencional); cuando el nulo es lo que se
# quiere, se pide con las funciones `try_`. La última celda comprueba que Spark y pandas llegan a la misma tabla.

# %% sp_duplicados
# UNICIDAD
v = bronce.dropDuplicates()
print("Filas:", bronce.count(), "→", v.count(), "· duplicadas:", bronce.count() - v.count())

# %% sp_texto
# CONSISTENCIA: el mismo diccionario de la sesión 1, convertido en un mapa de Spark.
# create_map pide clave1, valor1, clave2, valor2…: aplanamos el diccionario en esa lista
mapa_ciudades = F.create_map(*[F.lit(x) for par in CIUDAD_CANONICA.items() for x in par])
# Normalizar como en la sesión 1: sin espacios, en minúsculas y sin tildes
norma = F.translate(F.lower(F.trim("ciudad")), "áéíóúü", "aeiouu")
sin_regla = v.filter(F.col("ciudad").isNotNull() & mapa_ciudades[norma].isNull())
print("Grafías sin regla:", sin_regla.select(norma).distinct().count())

v = (v.withColumn("ciudad", F.coalesce(mapa_ciudades[norma], F.lit("Sin dato")))
      .withColumn("canal", F.initcap(F.trim("canal"))))
v.groupBy("canal").count().orderBy("canal").show()

# %% sp_ansi
# Spark 4 trabaja en modo ANSI: un dato que no encaja con la regla es un ERROR, no un nulo
dos_formatos = spark.createDataFrame([("2025-04-18",), ("18/04/2025",)], ["fecha"])
sc.setLogLevel("OFF")        # el error es intencional: callamos el registro interno de Java
try:
    dos_formatos.select(F.to_date("fecha", "yyyy-MM-dd")).show()
except Exception as error:
    print(resumen_error(error))
sc.setLogLevel("ERROR")

# %% sp_precios
# VALIDEZ: la misma expresión regular de la sesión 1, y luego a número entero.
# try_cast es el errors="coerce" de Spark: lo que no se pueda convertir queda nulo y se cuenta
v = v.withColumn("precio_unitario",
                 F.regexp_replace("precio_unitario", r"[$.\s]", "").try_cast("int"))
print("Precios sin convertir:", v.filter(F.col("precio_unitario").isNull()).count())

# %% sp_fechas
# VALIDEZ: cada formato de forma explícita; try_to_timestamp devuelve nulo si no encaja
iso = F.try_to_timestamp("fecha", F.lit("yyyy-MM-dd"))
dma = F.try_to_timestamp("fecha", F.lit("dd/MM/yyyy"))
v = v.withColumn("fecha", F.coalesce(iso, dma).cast("date"))
print("Fechas sin interpretar:", v.filter(F.col("fecha").isNull()).count())
v.agg(F.min("fecha").alias("desde"), F.max("fecha").alias("hasta")).show()

# %% sp_reglas
# EXACTITUD: las cantidades imposibles van a cuarentena, no a la basura
v = v.withColumn("cantidad", F.col("cantidad").cast("int"))
# En Spark, comparar un nulo no da ni verdadero ni falso: sin isNull(), una cantidad vacía
# no quedaría ni en v ni en la cuarentena
fuera = F.col("cantidad").isNull() | ~F.col("cantidad").between(1, 50)
cuarentena_sp = v.filter(fuera)
v = v.filter(~fuera)
print("Filas válidas:", v.count(), "· en cuarentena:", cuarentena_sp.count())

# %% sp_completitud
# COMPLETITUD: las mismas reglas de negocio documentadas en la sesión 1
v = (v.withColumn("descuento", F.col("descuento").cast("double"))
      .fillna({"descuento": 0.0, "id_cliente": "ANONIMO", "metodo_pago": "Sin dato"})
      .withColumn("total", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento"))))
# Vacíos que quedan, por columna
v.select([F.sum(F.col(c).isNull().cast("int")).alias(c) for c in v.columns]).show()

# %% sp_coherencia
# CONTROL DE COHERENCIA: Spark y pandas deben llegar a la MISMA tabla limpia
spark_ciudad = (v.groupBy("ciudad").agg(F.sum("total").alias("total"))
                 .toPandas().set_index("ciudad")["total"])
mismas = sorted(fila.id_venta for fila in v.select("id_venta").collect()) == sorted(df["id_venta"])
print("Filas · Spark:", v.count(), "· pandas:", len(df))
print("¿Las mismas ventas?", mismas)
print("Mayor diferencia por ciudad (pesos):",
      round((spark_ciudad - df.groupby("ciudad")["total"].sum()).abs().max(), 6))

# %% [markdown]
# ## Bloque 2 · Módulo 12 — Agregar, unir y ventanas

# %% sp_union
# Unir con el catálogo. broadcast: la tabla pequeña se copia a cada ejecutor y se evita un shuffle
# Catálogo pequeño y sin errores conocidos: aquí inferir los tipos es aceptable (ver módulo 10)
productos_sp = spark.read.csv("datos/productos.csv", header=True, inferSchema=True)
ventas_sp = (v.join(F.broadcast(productos_sp.select("id_producto", "nombre", "categoria")),
                    on="id_producto", how="left")
              .withColumn("mes", F.date_format("fecha", "yyyy-MM")))
print("Ventas sin categoría:", ventas_sp.filter(F.col("categoria").isNull()).count())
ventas_sp.select("id_venta", "fecha", "ciudad", "categoria", "total").orderBy("id_venta").show(4)

# %% sp_ciudad
# Dividir – aplicar – combinar, ahora en Spark
(ventas_sp.groupBy("ciudad")
          .agg(F.count("*").alias("ventas"),
               F.round(F.sum("total") / 1e6, 1).alias("millones"),
               F.round(F.avg("total")).cast("int").alias("ticket_promedio"))
          .orderBy(F.desc("millones"))
          .show())

# %% sp_ventana
from pyspark.sql import Window

# Funciones de VENTANA: un cálculo por grupo sin colapsar las filas.
# Aquí, los dos productos más vendidos (en unidades) de cada categoría
unidades = ventas_sp.groupBy("categoria", "nombre").agg(F.sum("cantidad").alias("unidades"))
puesto = F.row_number().over(Window.partitionBy("categoria").orderBy(F.desc("unidades"), "nombre"))
(unidades.withColumn("puesto", puesto)
         .filter("puesto <= 2")
         .orderBy("categoria", "puesto")
         .show(truncate=False))

# %% sp_pivote
# Tabla dinámica: millones de pesos por categoría y canal
(ventas_sp.groupBy("categoria")
          .pivot("canal", ["Tienda", "Web", "App"])
          .agg(F.round(F.sum("total") / 1e6, 1))
          .orderBy("categoria")
          .show())

# %% sol_ticket solucion
# Ticket promedio por canal y mes
(ventas_sp.groupBy("mes")
          .pivot("canal", ["Tienda", "Web", "App"])
          .agg(F.round(F.avg("total")).cast("int"))
          .orderBy("mes")
          .show())


# %% [markdown]
# **Ejercicio (módulo 12).** Construye una tabla con el ticket promedio (valor medio de una venta) por mes
# y canal. ¿Hay algún canal que tenga siempre el ticket más alto? Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 2 · Módulo 13 — Datos semiestructurados: los eventos de la web
# JSON con campos opcionales y anidados: un nulo puede ser «no aplica» o un error de calidad.
# Los eventos no siguen a una persona de la búsqueda al pago: comparan volúmenes, no son un embudo.

# %% logs_esquema
# JSON por línea: Spark recorre los registros y DEDUCE un esquema que los cubra a todos
logs = spark.read.json("datos/logs_web.jsonl")
print("Eventos:", logs.count())
logs.printSchema()

# %% logs_campos
# No todos los eventos traen todos los campos: count() cuenta solo los valores NO nulos
logs.select([F.count(c).alias(c) for c in logs.columns]).show()

# %% logs_anidados
# Los campos anidados se leen con un punto: dispositivo.tipo, pago.medio, pago.aprobado
(logs.groupBy(F.col("dispositivo.tipo").alias("dispositivo"))
     .pivot("evento", ["buscar", "ver_producto", "agregar_carrito", "pagar"])
     .count()
     .orderBy("dispositivo")
     .show())

# %% logs_pagos
pagos = logs.filter(F.col("evento") == "pagar")
(pagos.groupBy(F.col("pago.medio").alias("medio"))
      .agg(F.count("*").alias("intentos"),
           F.round(100 * F.avg(F.col("pago.aprobado").cast("int")), 1).alias("pct_aprobados"))
      .orderBy(F.desc("intentos"), "medio")
      .show())

# %% logs_aplanar
# Aplanar: de JSON anidado a una tabla con columnas simples, lista para guardarla en una base de datos (sesión 3)
eventos = logs.select(
    F.to_timestamp("ts").alias("momento"),
    "sesion", "evento", "ciudad", "id_cliente", "id_producto", "consulta",
    F.col("dispositivo.tipo").alias("dispositivo"),
    F.col("dispositivo.so").alias("sistema_operativo"),
    F.col("pago.medio").alias("medio_pago"),
    F.col("pago.aprobado").alias("pago_aprobado"),
    "duracion_ms",
)
eventos.orderBy("momento", "sesion").show(3)

# %% sol_consultas solucion
# Las cinco búsquedas más frecuentes y su reparto por dispositivo
(logs.filter(F.col("evento") == "buscar")
     .groupBy("consulta")
     .pivot("dispositivo.tipo", ["movil", "escritorio"])
     .count()
     .withColumn("total", F.col("movil") + F.col("escritorio"))
     .orderBy(F.desc("total"), "consulta")
     .show(5))


# %% [markdown]
# **Ejercicio (módulo 13).** ¿Qué buscan más los clientes en la web y la app? Muestra las cinco búsquedas
# más frecuentes, con su reparto entre móvil y escritorio. Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% cifras privada
# Cifras que el texto del material cita. Se calculan aquí para que NINGUNA se escriba
# de memoria; construye.py las inserta con {{CIFRA:clave}}.
def _es(n, dec=0):
    """Formato es-CO: punto de miles y coma decimal."""
    s = f"{n:,.{dec}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".").replace("-", "−")


def _contador(log, nombre):
    texto = open(log, encoding="utf-8").read()
    bloque = texto.split("mapreduce.Job: Counters")[1]
    return int(re.search(rf"{nombre}=(\d+)", bloque).group(1))


def _splits(log):
    return int(re.search(r"number of splits:(\d+)", open(log, encoding="utf-8").read()).group(1))


_bloques_ventas = -(-os.path.getsize("datos/ventas.csv") // 65536)
_shuffle_no = _contador("job_sin_combiner.log", "Reduce shuffle bytes")
_shuffle_si = _contador("job_con_combiner.log", "Reduce shuffle bytes")
_l = spark.read.csv("datos/ventas.csv", header=True, schema=ESQUEMA, mode="DROPMALFORMED")
_dropmalformed = _l.cache().count()
_l.unpersist()
_pagos = logs.filter(F.col("evento") == "pagar")
_cuenta_logs = {c: logs.filter(F.col(c).isNotNull()).count() for c in logs.columns}
_aprobacion = (_pagos.groupBy(F.col("pago.medio").alias("medio"))
                     .agg(F.avg(F.col("pago.aprobado").cast("int")).alias("tasa")).toPandas())


def _pct_app(mes):
    """Participación de la app en las ventas del mes (la cifra que la sesión 1 calculó con pandas)."""
    fila = (ventas_sp.filter(F.col("mes") == mes)
                     .agg(F.sum(F.when(F.col("canal") == "App", F.col("total"))).alias("app"),
                          F.sum("total").alias("todo")).first())
    return 100 * fila["app"] / fila["todo"]


CIFRAS = {
    "filas_crudas": _es(len(ventas)),
    "filas_limpias": _es(len(df)),
    "total_millones": _es(df["total"].sum() / 1e6, 1),
    "duplicados": _es(len(ventas) - len(ventas.drop_duplicates())),
    "cuarentena": _es(cuarentena_sp.count()),
    "bytes_ventas": _es(os.path.getsize("datos/ventas.csv")),
    "bytes_ventas_x3": _es(3 * os.path.getsize("datos/ventas.csv")),
    "version_hadoop": VERSION,
    "kb_ventas": _es(os.path.getsize("datos/ventas.csv") / 1024, 1),
    "bloques_ventas": _es(_bloques_ventas),
    "ultimo_bloque": _es(os.path.getsize("datos/ventas.csv") - 65536 * (_bloques_ventas - 1)),
    "map_input": _es(_contador("job.log", "Map input records")),
    "map_output": _es(_contador("job.log", "Map output records")),
    "reduce_grupos": _es(_contador("job.log", "Reduce input groups")),
    "splits_partes": _es(_splits("job_con_combiner.log")),
    "combine_output": _es(_contador("job_con_combiner.log", "Combine output records")),
    "shuffle_sin": _es(_shuffle_no),
    "shuffle_con": _es(_shuffle_si),
    "shuffle_ahorro_pct": _es(100 * (1 - _shuffle_si / _shuffle_no), 1),
    "palabras_distintas": _es(conteo.count()),
    "corruptos": _es(malas.count()),
    "dropmalformed": _es(_dropmalformed),
    "eventos": _es(logs.count()),
    "eventos_con_cliente": _es(_cuenta_logs["id_cliente"]),
    "pct_eventos_cliente": _es(100 * _cuenta_logs["id_cliente"] / logs.count(), 1),
    "eventos_pago": _es(_pagos.count()),
    "medio_mas_rechazo": _aprobacion.sort_values("tasa")["medio"].iloc[0].lower(),
    "pct_pagos_aprobados": _es(100 * _pagos.filter(F.col("pago.aprobado")).count() / _pagos.count(), 1),
    "app_ene": _es(_pct_app("2025-01"), 1),
    "app_jun": _es(_pct_app("2025-06"), 1),
    "nucleos": _es(sc.defaultParallelism),
    "particiones_hdfs": _es(desde_hdfs.rdd.getNumPartitions()),
    "pagos_sin_cliente": _es(_pagos.filter(F.col("id_cliente").isNull()).count()),
    "productos": _es(productos_sp.count()),
}

# Datos para los simuladores del HTML, calculados con los mismos datos
_embudo = (logs.groupBy(F.col("dispositivo.tipo").alias("tipo"), F.col("dispositivo.so").alias("so"), "evento")
               .count().toPandas())
SIMULADORES = {
    "embudo": [{"tipo": r.tipo, "so": r.so, "evento": r.evento, "n": int(r["count"])}
               for _, r in _embudo.sort_values(["tipo", "so", "evento"]).iterrows()],
    "pagos": [{"tipo": r["tipo"], "so": r["so"], "aprobado": bool(r["aprobado"]), "n": int(r["n"])}
              for _, r in (_pagos.groupBy(F.col("dispositivo.tipo").alias("tipo"),
                                          F.col("dispositivo.so").alias("so"),
                                          F.col("pago.aprobado").alias("aprobado"))
                                 .agg(F.count("*").alias("n")).toPandas()
                                 .sort_values(["tipo", "so", "aprobado"]).iterrows())],
    "combiner": {
        estado: {"map_output": _contador(f"job_{estado}.log", "Map output records"),
                 "combine_output": _contador(f"job_{estado}.log", "Combine output records"),
                 "reduce_input": _contador(f"job_{estado}.log", "Reduce input records"),
                 "shuffle_bytes": _contador(f"job_{estado}.log", "Reduce shuffle bytes")}
        for estado in ["sin_combiner", "con_combiner"]
    },
}

# %% [markdown]
# ## Para el taller
# El enunciado completo y la rúbrica están en el módulo 14 del material HTML.
# Sigue trabajando en este mismo notebook: ya tienes HDFS en marcha, la sesión de Spark,
# la tabla plata `v` y los eventos web `logs`.
#
# Al terminar, puedes apagar los servicios con la celda siguiente. No la ejecutes antes de acabar:
# `spark.stop()` borra de la memoria los DataFrames y las vistas, y habría que volver a ejecutar el notebook.

# %% apagar
# Apagar Spark y los servicios de HDFS (Colab también los apaga al cerrar el entorno)
spark.stop()
!hdfs --daemon stop datanode
!hdfs --daemon stop namenode
print("Servicios detenidos")
