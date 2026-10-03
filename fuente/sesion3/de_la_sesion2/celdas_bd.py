# Celdas del antiguo bloque 4 de la sesión 2 (tema 6: bases de datos con Spark y controles CR3).
#
# Salieron de precalculo/celdas_sesion2.py el 2026-10-03, cuando la sesión 2 pasó de 6 a 4 horas y
# el tema 6 se movió al inicio de la sesión 3. Están tal como estaban: NO se ejecutan ni se publican.
# Al producir la sesión 3 hay que:
#   - recrear antes el estado que dejaban los bloques 1 a 3 de la sesión 2: datos/, la sesión de
#     Spark (`spark`, `F`, `ESQUEMA`), la plata `v`, `cuarentena_sp`, `ventas_sp`, `productos_sp`,
#     `logs`, `eventos` y el `df` de pandas de la sesión 1 (ctl_conciliacion usa además los
#     resultados de Hadoop Streaming: decidir si esa vía se conserva);
#   - recuperar las cifras y los datos de simulador que calculaba la celda `cifras` de la sesión 2
#     (están al final de este archivo, comentados).
# El formato de las cabeceras es el de celdas_sesion2.py.

# %% [markdown]
# ## Bloque 4 · Módulo 14 — Crear la base de datos
# Un modelo en estrella en miniatura: la tabla de hechos `ventas` y la dimensión `productos`, más la capa
# bronce (`ventas_bronce`), la cuarentena y los eventos web. El catálogo vive en memoria: si reinicias la
# sesión, vuelve a ejecutar desde `spark_sesion` (la primera celda de este módulo limpia los restos).

# %% bd_crear
import shutil

# El catálogo vive en memoria: tras reiniciar la sesión, las tablas ya no existen pero sus carpetas
# sí, y Spark no deja crear una tabla administrada sobre una carpeta con datos. Limpiamos esos restos.
if not spark.catalog.databaseExists("guadua"):
    shutil.rmtree("spark-warehouse/guadua.db", ignore_errors=True)

# Una base de datos (o «esquema») agrupa tablas en el catálogo de Spark
spark.sql("CREATE DATABASE IF NOT EXISTS guadua COMMENT 'Caso Tiendas Guadua (ficticio)'")
spark.sql("USE guadua")
spark.sql("SHOW DATABASES").show()

# %% bd_ddl
# DDL: la tabla se DEFINE antes de cargarla, con tipos y comentarios
spark.sql("""
    CREATE TABLE IF NOT EXISTS productos (
        id_producto  STRING  COMMENT 'Llave del producto',
        nombre       STRING,
        categoria    STRING,
        precio_lista INT     COMMENT 'Pesos colombianos'
    )
    USING parquet
    COMMENT 'Catálogo de productos'
""")
spark.sql("DESCRIBE TABLE productos").show(truncate=False)

# %% bd_externa
# Tabla EXTERNA: el catálogo solo apunta al archivo; los datos se quedan donde están
ruta_csv = os.path.abspath("datos/ventas.csv")
spark.sql(f"""
    CREATE TABLE IF NOT EXISTS ventas_bronce
    USING csv
    OPTIONS (path '{ruta_csv}', header 'true')
""")
spark.sql("SELECT COUNT(*) AS filas FROM ventas_bronce").show()

# %% [markdown]
# ## Bloque 4 · Módulo 15 — Cargar la información

# %% bd_insertar
# Cargar con SQL: INSERT OVERWRITE reemplaza el contenido (se puede repetir sin duplicar)
productos_sp.createOrReplaceTempView("productos_csv")
spark.sql("""
    INSERT OVERWRITE TABLE productos
    SELECT id_producto, nombre, categoria, precio_lista FROM productos_csv
""")
spark.sql("""
    SELECT categoria, COUNT(*) AS productos, MIN(precio_lista) AS minimo, MAX(precio_lista) AS maximo
    FROM productos GROUP BY categoria ORDER BY categoria
""").show()

# %% bd_ventas
# Cargar con la API: tabla ADMINISTRADA en Parquet, particionada por mes (capa PLATA).
# La tabla de hechos guarda la llave del producto; nombre y categoría viven en «productos»
(ventas_sp.drop("nombre", "categoria")
          .write
          .mode("overwrite")
          .format("parquet")
          .partitionBy("mes")
          .saveAsTable("guadua.ventas"))
spark.sql("SELECT mes, COUNT(*) AS ventas FROM ventas GROUP BY mes ORDER BY mes").show()

# %% bd_archivos variable
# Cada partición es una carpeta; dentro, archivos Parquet (columnares y comprimidos)
!ls spark-warehouse/guadua.db/ventas
!du -sh datos/ventas.csv spark-warehouse/guadua.db/ventas

# %% bd_resto
# Las demás tablas: eventos web aplanados y la cuarentena, con el motivo de cada fila
eventos.write.mode("overwrite").format("parquet").saveAsTable("guadua.eventos_web")
(cuarentena_sp.withColumn("motivo", F.lit("cantidad fuera de [1, 50]"))
              .write.mode("overwrite").format("parquet").saveAsTable("guadua.cuarentena"))
tablas = [t for t in spark.catalog.listTables("guadua") if not t.isTemporary]
for tabla in sorted(tablas, key=lambda t: t.name):
    filas = spark.table(f"guadua.{tabla.name}").count()
    print(f"{tabla.name:<14} {tabla.tableType:<9} {filas:>5} filas")

# %% bd_idempotencia
# ¿Y si la carga se ejecuta dos veces? Con «append», los datos se DUPLICAN sin aviso
spark.table("productos").write.mode("overwrite").saveAsTable("prueba_carga")
spark.table("productos").write.mode("append").saveAsTable("prueba_carga")
print("dos cargas con append    →", spark.table("prueba_carga").count(), "filas")
spark.table("productos").write.mode("overwrite").saveAsTable("prueba_carga")
filas = spark.table("prueba_carga").count()
spark.sql("DROP TABLE prueba_carga")              # la tabla era solo para la prueba
print("una carga con overwrite  →", filas, "filas")

# %% [markdown]
# ## Bloque 4 · Módulo 16 — Explorar y consultar con Spark SQL

# %% sql_ciudad
spark.sql("""
    SELECT ciudad,
           COUNT(*)                         AS ventas,
           ROUND(SUM(total) / 1e6, 1)       AS millones,
           CAST(ROUND(AVG(total)) AS INT)   AS ticket_promedio
    FROM ventas
    GROUP BY ciudad
    ORDER BY SUM(total) DESC          -- la suma exacta: el redondeo no deja empates
""").show()

# %% sql_categoria
# JOIN con la dimensión: la categoría está en «productos», no en «ventas»
spark.sql("""
    SELECT p.categoria,
           ROUND(SUM(v.total) / 1e6, 1)                            AS millones,
           ROUND(100 * SUM(v.total) / SUM(SUM(v.total)) OVER (), 1) AS pct
    FROM ventas v
    JOIN productos p ON v.id_producto = p.id_producto
    GROUP BY p.categoria
    ORDER BY millones DESC, p.categoria   -- el nombre desempata: Frescos y Aseo redondean igual
""").show()

# %% sql_app
# ¿Está ganando terreno la app? Participación mensual, con CASE WHEN
spark.sql("""
    SELECT mes,
           ROUND(100 * SUM(CASE WHEN canal = 'App' THEN total END) / SUM(total), 1) AS pct_app
    FROM ventas
    GROUP BY mes
    ORDER BY mes
""").show()

# %% sql_acumulado
# Una CTE (WITH) y una ventana: ventas mensuales y acumuladas de cada canal
spark.sql("""
    WITH mensual AS (
        SELECT canal, mes, SUM(total) / 1e6 AS millones
        FROM ventas
        GROUP BY canal, mes
    )
    SELECT canal, mes,
           ROUND(millones, 2)                                          AS millones,
           ROUND(SUM(millones) OVER (PARTITION BY canal ORDER BY mes), 2) AS acumulado
    FROM mensual
    ORDER BY canal, mes
""").show(18)

# %% sql_explain
# EFICIENCIA: con un filtro sobre la columna de partición, Spark solo abre la carpeta de junio
plan = spark.sql("""
    EXPLAIN SELECT ciudad, SUM(total) FROM ventas WHERE mes = '2025-06' GROUP BY ciudad
""").first()[0]
# El plan es un texto largo: tomamos la línea que lee los archivos (FileScan), le quitamos los
# números internos que Spark pone a cada columna (#12) y mostramos tres de sus campos.
# Para ver el plan completo: print(plan)
escaneo = re.sub(r"#\d+", "", next(l for l in plan.splitlines() if "FileScan" in l))
for campo in ["Location", "PartitionFilters", "ReadSchema"]:
    print(re.search(campo + r": .*?(?=, [A-Z]\w+: |$)", escaneo).group(0))

# %% sol_sql_pago solucion
# Ticket promedio y número de ventas por método de pago en la app
spark.sql("""
    SELECT metodo_pago, COUNT(*) AS ventas, CAST(ROUND(AVG(total)) AS INT) AS ticket_promedio
    FROM ventas
    WHERE canal = 'App'
    GROUP BY metodo_pago
    ORDER BY ventas DESC
""").show()

# %% sol_sql_eventos solucion
# Tasa de aprobación de pagos por sistema operativo, desde la tabla de eventos
spark.sql("""
    SELECT sistema_operativo,
           COUNT(*)                                          AS pagos,
           ROUND(100 * AVG(CAST(pago_aprobado AS INT)), 1)   AS pct_aprobados
    FROM eventos_web
    WHERE evento = 'pagar'
    GROUP BY sistema_operativo
    ORDER BY pagos DESC, sistema_operativo
""").show()


# %% [markdown]
# **Ejercicios (módulo 16).**
# 1. En la app, ¿cuántas ventas y qué ticket promedio tiene cada método de pago?
# 2. Con la tabla `eventos_web`, calcula la tasa de aprobación de los pagos por sistema operativo.
#
# Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 4 · Módulo 17 — Controles: seguridad, eficiencia, coherencia y correlación
# Los cuatro controles del criterio CR3 sobre `guadua`. La sal de `ctl_seguridad` es un ejemplo
# público: en tu trabajo, guárdala en el panel **Secretos** de Colab (icono de llave) y léela con
# `google.colab.userdata`. Si Hadoop no arrancó, borra la línea «Hadoop Streaming» de `ctl_conciliacion`.

# %% ctl_seguridad
# SEGURIDAD: una tabla para analistas SIN el identificador del cliente.
# El seudónimo es un hash con «sal» secreta: permite contar y seguir clientes, no identificarlos
# En producción la sal es un secreto largo y aleatorio que nunca va en el código (en Colab:
# panel Secretos y google.colab.userdata). Aquí, si no existe la variable SAL_GUADUA, se usa un
# valor de ejemplo PÚBLICO: estos seudónimos no protegen nada (los datos son ficticios).
SAL = os.environ.get("SAL_GUADUA", "sal-de-ejemplo")
seudonimo = F.when(F.col("id_cliente") == "ANONIMO", F.lit("ANONIMO")).otherwise(
    F.substring(F.sha2(F.concat(F.lit(SAL), F.col("id_cliente")), 256), 1, 16))
(spark.table("ventas")
      .withColumn("cliente", seudonimo)
      .drop("id_cliente")
      .write.mode("overwrite").format("parquet").saveAsTable("guadua.ventas_analitica"))

spark.sql("SELECT id_venta, mes, ciudad, cliente, total FROM ventas_analitica ORDER BY id_venta").show(4)
# ¿Se puede seguir contando clientes? («ANONIMO» agrupa las compras sin registro: no se cuenta)
spark.sql("""
    SELECT (SELECT COUNT(DISTINCT id_cliente) FROM ventas
            WHERE id_cliente <> 'ANONIMO')                   AS clientes_originales,
           (SELECT COUNT(DISTINCT cliente) FROM ventas_analitica
            WHERE cliente <> 'ANONIMO')                      AS clientes_seudonimizados
""").show()

# %% ctl_coherencia
# COHERENCIA: controles que deben dar CERO antes de publicar cualquier cifra
controles = {
    "id_venta repetido": "SELECT COUNT(*) - COUNT(DISTINCT id_venta) FROM ventas",
    "venta sin producto en el catálogo":
        "SELECT COUNT(*) FROM ventas v LEFT ANTI JOIN productos p ON v.id_producto = p.id_producto",
    "cantidad fuera de [1, 50]": "SELECT COUNT(*) FROM ventas WHERE cantidad NOT BETWEEN 1 AND 50",
    "canal desconocido": "SELECT COUNT(*) FROM ventas WHERE canal NOT IN ('Tienda', 'Web', 'App')",
    "vacíos en columnas clave":
        "SELECT COUNT(*) FROM ventas WHERE fecha IS NULL OR ciudad IS NULL OR total IS NULL",
    "filas sin destino (distintas en bronce − plata − cuarentena)": """
        SELECT (SELECT COUNT(*) FROM (SELECT DISTINCT * FROM ventas_bronce))
             - (SELECT COUNT(*) FROM ventas)
             - (SELECT COUNT(*) FROM cuarentena)""",
}
for nombre, consulta in controles.items():
    fallas = spark.sql(consulta).first()[0]
    print(f"{'✔' if fallas == 0 else '✘'} {nombre}: {fallas}")

# %% ctl_conciliacion
# Cuatro caminos, un mismo resultado: total por ciudad, en millones de pesos
por_sql = spark.sql("SELECT ciudad, SUM(total) AS total FROM ventas GROUP BY ciudad").toPandas()
conciliacion = pd.DataFrame({
    "pandas (sesión 1)": df.groupby("ciudad")["total"].sum(),
    "Hadoop Streaming": hadoop_ciudad,
    "Spark DataFrame": spark_ciudad,
    "Spark SQL": por_sql.set_index("ciudad")["total"],
}).div(1e6).round(3)
conciliacion

# %% ctl_correlacion
# CORRELACIÓN: ¿qué variables se mueven juntas? (−1 inversa, 0 ninguna, +1 directa)
print("precio unitario vs. cantidad:",
      round(spark.table("ventas").stat.corr("precio_unitario", "cantidad"), 2))

app_mensual = spark.sql("""
    SELECT MONTH(fecha) AS numero_mes,
           100 * SUM(CASE WHEN canal = 'App' THEN total END) / SUM(total) AS pct_app
    FROM ventas GROUP BY MONTH(fecha)
""")
print("mes vs. participación de la app:", round(app_mensual.stat.corr("numero_mes", "pct_app"), 2))

# Integrar dos fuentes por su llave: vistas vs. unidades vendidas por producto. Los eventos solo
# cubren junio, y en la tienda física nadie pasa por la web: se comparan las ventas web y app de junio
vistas_vs_unidades = spark.sql("""
    SELECT p.id_producto,
           COALESCE(w.vistas, 0)   AS vistas,
           COALESCE(u.unidades, 0) AS unidades
    FROM productos p
    LEFT JOIN (SELECT id_producto, COUNT(*) AS vistas FROM eventos_web
               WHERE evento = 'ver_producto' GROUP BY id_producto) w ON p.id_producto = w.id_producto
    LEFT JOIN (SELECT id_producto, SUM(cantidad) AS unidades FROM ventas
               WHERE mes = '2025-06' AND canal IN ('Web', 'App')
               GROUP BY id_producto) u ON p.id_producto = u.id_producto
""")
print("vistas vs. unidades vendidas en web y app (junio):",
      round(vistas_vs_unidades.stat.corr("vistas", "unidades"), 2))

# %% ctl_formatos variable
import glob
import pyarrow.parquet as pq

# EFICIENCIA: Parquet guarda cada columna por separado; ¿cuántos bytes ocupa cada una?
# Cada archivo Parquet guarda al final sus metadatos, con los bytes de cada columna
filas = []
for archivo in glob.glob("spark-warehouse/guadua.db/ventas/mes=*/*.parquet"):
    mes = archivo.split("mes=")[1].split("/")[0]
    meta = pq.ParquetFile(archivo).metadata
    for g in range(meta.num_row_groups):
        for c in range(meta.num_columns):
            columna = meta.row_group(g).column(c)
            filas.append((mes, columna.path_in_schema, columna.total_compressed_size))
bytes_parquet = pd.DataFrame(filas, columns=["mes", "columna", "bytes"])
por_columna = bytes_parquet.groupby("columna")["bytes"].sum().sort_values(ascending=False)
junio = bytes_parquet.query("mes == '2025-06' and columna in ['ciudad', 'total']")["bytes"].sum()
print(f"CSV, todo el archivo              : {os.path.getsize('datos/ventas.csv'):>7} bytes")
print(f"Parquet, las {len(por_columna)} columnas          : {por_columna.sum():>7} bytes")
print(f"Parquet, ciudad y total de junio  : {junio:>7} bytes")
por_columna.to_frame("bytes en Parquet")


# ---- Lo que la celda `cifras` de la sesión 2 calculaba para estos módulos -------------------
# _corr_precio = spark.table("ventas").stat.corr("precio_unitario", "cantidad")
# _corr_app = app_mensual.stat.corr("numero_mes", "pct_app")
# _corr_vistas = vistas_vs_unidades.stat.corr("vistas", "unidades")
# _csv = os.path.getsize("datos/ventas.csv")
# _parquet = int(bytes_parquet["bytes"].sum())
# "corr_precio": _es(_corr_precio, 2),
# "corr_app": _es(_corr_app, 2),
# "corr_vistas": _es(_corr_vistas, 2),
# "bytes_csv": _es(_csv),
# "bytes_parquet": _es(_parquet),
# "pct_parquet": _es(100 * _parquet / _csv, 1),
# "bytes_junio_2col": _es(int(junio)),
# "pct_junio_2col": _es(100 * junio / _csv, 1),
# "columnas_parquet": _es(len(por_columna)),
# "app_ene" y "app_jun" (los usa sql_app) se calculan ahora en la sesión 2 sin la tabla ventas.
# SIMULADORES["formatos"] = {
#     "csv_bytes": _csv,
#     "parquet": [{"mes": r.mes, "columna": r.columna, "bytes": int(r.bytes)}
#                 for r in bytes_parquet.groupby(["mes", "columna"], as_index=False)["bytes"].sum()
#                                       .itertuples()],
#     "columnas": list(ESQUEMA.fieldNames()) + ["total"],
# }
