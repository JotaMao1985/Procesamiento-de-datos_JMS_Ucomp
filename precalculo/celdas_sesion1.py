# Fuente ÚNICA del código de la Sesión 1. De aquí salen:
#   - los bloques de código del HTML        (construye_sesion1.py)
#   - el notebook para Colab                (genera_notebook.py)
#   - las salidas y cifras del material     (ejecuta_celdas.py)
#
# No es un script ejecutable: contiene «magias» de Jupyter (%%writefile, !).
# Formato de las cabeceras:
#   # %% [markdown]            celda de texto del notebook (líneas con «# »)
#   # %% <id> [banderas]       celda de código
# Banderas:
#   generador   en el notebook se antepone el código de genera_datos.py (celda oculta)
#   variable    la salida depende del entorno (versiones): el HTML lo advierte
#   solucion    solución de un ejercicio: va al HTML, NO al notebook
#   privada     solo para el precálculo: no va al HTML ni al notebook

# %% [markdown]
# # Sesión 1 · Del dato al MapReduce
# **Profundización I: Procesamiento de Datos — Especialización en Big Data (UCompensar)**
#
# Este notebook acompaña el material HTML de la sesión. Cada celda lleva el mismo
# identificador que el bloque de código del material, así que puedes seguir la clase
# celda a celda.
#
# 1. **Archivo → Guardar una copia en Drive** para que tus cambios no se pierdan.
# 2. Ejecuta las celdas **en orden** (Mayúsculas + Enter). Varias usan resultados de las anteriores.
# 3. Si Colab se reinicia (por ejemplo, tras un break) o una celda falla al repetirla, ve a la celda
#    en la que ibas y usa **Entorno de ejecución → Ejecutar anteriores**.
# 4. La primera celda crea los datos del caso *Tiendas Guadua S.A.S.*, una empresa **ficticia**.

# %% datos generador
# Crea la carpeta datos/ con los cuatro archivos del caso
rutas = crear_datos("datos")

# %% [markdown]
# ## Bloque 1 · Módulo 5 — Primer contacto con el entorno

# %% entorno variable
import sys
import pandas as pd

print("Python:", sys.version.split()[0])
print("pandas:", pd.__version__)

# %% crudo
# Las primeras líneas del archivo, tal como están en el disco
!head -n 4 datos/ventas.csv

# %% [markdown]
# ## Bloque 3 · Módulo 10 — Python para datos en 10 minutos

# %% py_basico
# Listas: colecciones ordenadas
ciudades = ["Bogotá", "Medellín", "Cali"]
montos = [120_000, 85_500, 64_200]
print(len(ciudades), ciudades[0], sum(montos))

# Diccionarios: pares clave → valor
venta = {"id_venta": "V00001", "ciudad": "Bogotá", "total": 45_900}
print(venta["ciudad"])

# Funciones: lógica reutilizable con nombre
def con_iva(valor, tasa=0.19):
    return round(valor * (1 + tasa))

print(con_iva(10_000))

# lambda (función anónima) y comprensión de listas
en_miles = lambda x: x / 1000
print([en_miles(m) for m in montos])
print([c.upper() for c in ciudades if c != "Cali"])

# %% py_pandas
import pandas as pd

# Un DataFrame es una tabla: columnas con nombre, todas del mismo largo
mini = pd.DataFrame({"ciudad": ciudades, "monto": montos})
print(mini)
print("Promedio:", mini["monto"].mean())

# Filtrar: la condición da True/False por fila (una «máscara») y se quedan las True
print(mini[mini["monto"] > 80_000])

# %% [markdown]
# ## Bloque 3 · Módulo 11 — Cargar e inspeccionar

# %% cargar
ventas = pd.read_csv("datos/ventas.csv")
productos = pd.read_csv("datos/productos.csv")
print("ventas:", ventas.shape, "· productos:", productos.shape)
ventas.head()

# %% info
ventas.info()

# %% describe
ventas.describe()

# %% conteos
ventas["ciudad"].value_counts()

# %% nulos
ventas.isna().sum()

# %% sol_clientes solucion
# ¿Cuántos clientes distintos hay y qué porcentaje de ventas no tiene cliente?
print("Clientes distintos:", ventas["id_cliente"].nunique())
print("Ventas sin cliente (%):", round(100 * ventas["id_cliente"].isna().mean(), 1))

# %% [markdown]
# **Ejercicio (módulo 11).** ¿Cuántos clientes distintos hay en el archivo y qué porcentaje de las
# ventas no tiene cliente? Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 3 · Módulo 12 — Limpieza y calidad del dato
# Cada paso de limpieza responde a una **dimensión de calidad**. Trabajamos sobre una
# copia (`df`) para poder comparar el antes y el después.

# %% duplicados
# UNICIDAD — la misma venta cargada dos veces
df = ventas.copy()            # el original no se toca
print("Filas iniciales:", len(df))
print("Filas duplicadas:", df.duplicated().sum())
df = df.drop_duplicates()
print("Filas tras quitar duplicados:", len(df))

# %% texto
# CONSISTENCIA — una misma ciudad escrita de muchas formas
def normalizar(serie):
    """Minúsculas, sin espacios sobrantes y sin tildes."""
    return (serie.str.strip()
                 .str.lower()
                 .str.normalize("NFKD")
                 .str.encode("ascii", errors="ignore")
                 .str.decode("ascii"))

CIUDAD_CANONICA = {
    "bogota": "Bogotá", "bogota d.c.": "Bogotá",
    "medellin": "Medellín",
    "cali": "Cali",
    "barranquilla": "Barranquilla", "b/quilla": "Barranquilla",
    "bucaramanga": "Bucaramanga", "b/manga": "Bucaramanga",
    "cartagena": "Cartagena", "cartagena de indias": "Cartagena",
}

ciudad_norm = normalizar(df["ciudad"])
sin_regla = ciudad_norm[ciudad_norm.notna() & ~ciudad_norm.isin(CIUDAD_CANONICA)]
print("Grafías sin regla:", sin_regla.unique())        # debe salir vacío

df["ciudad"] = ciudad_norm.map(CIUDAD_CANONICA).fillna("Sin dato")
df["canal"] = df["canal"].str.strip().str.capitalize()
print(df["ciudad"].value_counts().to_dict())
print(df["canal"].value_counts().to_dict())

# %% precios
# VALIDEZ — precios guardados como texto con «$» y separador de miles
precio_txt = df["precio_unitario"].astype(str)
con_signo = precio_txt.str.contains("$", regex=False)
print("Precios con «$» y punto de miles:", con_signo.sum())
print(precio_txt[con_signo].head(3).tolist())

# Los precios en pesos son enteros: se quitan «$», puntos y espacios
df["precio_unitario"] = pd.to_numeric(
    precio_txt.str.replace(r"[$.\s]", "", regex=True), errors="coerce")
print("Precios sin convertir:", df["precio_unitario"].isna().sum())
print("Tipo final:", df["precio_unitario"].dtype)

# %% fechas
# VALIDEZ — fechas en dos formatos: se interpreta cada formato de forma EXPLÍCITA
iso = pd.to_datetime(df["fecha"], format="%Y-%m-%d", errors="coerce")
dma = pd.to_datetime(df["fecha"], format="%d/%m/%Y", errors="coerce")
print("Fechas en formato dd/mm/aaaa:", (iso.isna() & dma.notna()).sum())

df["fecha"] = iso.fillna(dma)
print("Fechas sin interpretar:", df["fecha"].isna().sum())
print("Rango:", df["fecha"].min().date(), "a", df["fecha"].max().date())

# %% reglas
# EXACTITUD — cantidades imposibles (negativas, cero o errores de digitación)
fuera_de_rango = ~df["cantidad"].between(1, 50)
print("Cantidades fuera de [1, 50]:", fuera_de_rango.sum())
print(df.loc[fuera_de_rango, "cantidad"].value_counts().sort_index().to_dict())

cuarentena = df[fuera_de_rango].copy()  # no se borran sin dejar rastro: se apartan
df = df[~fuera_de_rango].copy()
print("Filas válidas:", len(df), "· en cuarentena:", len(cuarentena))

# %% completitud
# COMPLETITUD — cada vacío se trata con una regla de negocio DOCUMENTADA
df["descuento"] = df["descuento"].fillna(0)               # sin registro = sin descuento
df["id_cliente"] = df["id_cliente"].fillna("ANONIMO")     # compra en tienda sin registro
df["metodo_pago"] = df["metodo_pago"].fillna("Sin dato")  # no se inventa un medio de pago
df.isna().sum()

# %% reporte
# Los mismos indicadores sobre el original (antes) y sobre la tabla limpia (después)
def reporte_calidad(d):
    """Indicadores de calidad de una tabla de ventas."""
    precio = pd.to_numeric(d["precio_unitario"], errors="coerce")
    fecha = pd.to_datetime(d["fecha"], format="%Y-%m-%d", errors="coerce")
    return pd.Series({
        "filas": len(d),
        "filas duplicadas": d.duplicated().sum(),
        "celdas vacías": d.isna().sum().sum(),
        "grafías de ciudad": d["ciudad"].nunique(),
        "grafías de canal": d["canal"].nunique(),
        "precios no numéricos": precio.isna().sum(),
        "fechas sin interpretar": fecha.isna().sum(),
        "cantidades fuera de rango": (~d["cantidad"].between(1, 50)).sum(),
    })

pd.DataFrame({"antes": reporte_calidad(ventas), "después": reporte_calidad(df)})

# %% sol_nulos_canal solucion
# ¿En qué canal están los id_cliente vacíos?
canal_limpio = ventas["canal"].str.strip().str.capitalize()
ventas["id_cliente"].isna().groupby(canal_limpio).sum()

# %% [markdown]
# **Ejercicio (módulo 12).** Los vacíos de `id_cliente`, ¿son un error de calidad? Averígualo contando
# cuántos hay en cada canal de `ventas`. Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 3 · Módulo 13 — Transformar y resumir

# %% derivadas
# Columnas derivadas: el total de cada venta y dos llaves de tiempo
df["total"] = df["cantidad"] * df["precio_unitario"] * (1 - df["descuento"])
df["mes"] = df["fecha"].dt.strftime("%Y-%m")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
df["dia_semana"] = df["fecha"].dt.dayofweek.map(dict(enumerate(DIAS)))
df[["id_venta", "cantidad", "precio_unitario", "descuento", "total", "mes", "dia_semana"]].head()

# %% union
# Unir con el catálogo para traer el nombre y la categoría de cada producto
df = (df.drop(columns=["nombre", "categoria"], errors="ignore")   # repetible sin duplicar columnas
        .merge(productos[["id_producto", "nombre", "categoria"]],
               on="id_producto", how="left", validate="many_to_one"))
print("Ventas sin producto en el catálogo:", df["categoria"].isna().sum())
df[["id_venta", "nombre", "categoria", "total"]].head(3)

# %% por_ciudad
# Dividir – aplicar – combinar: un resumen por ciudad
por_ciudad = (df.groupby("ciudad")
                .agg(ventas=("id_venta", "count"),
                     total_millones=("total", lambda s: s.sum() / 1e6),
                     ticket_promedio=("total", "mean"))
                .sort_values("total_millones", ascending=False)
                .round({"total_millones": 1, "ticket_promedio": 0}))
por_ciudad

# %% pivote
# Tabla dinámica: ventas (millones de pesos) por categoría y canal
tabla = pd.pivot_table(df, index="categoria", columns="canal", values="total",
                       aggfunc="sum", margins=True, margins_name="Total") / 1e6
tabla.round(1)

# %% app_mes
# ¿Qué porcentaje de las ventas de cada mes entra por cada canal?
participacion = pd.crosstab(df["mes"], df["canal"], values=df["total"],
                            aggfunc="sum", normalize="index") * 100
participacion.round(1)

# %% sol_dia solucion
# ¿Qué día de la semana tiene el mayor ticket promedio?
df.groupby("dia_semana")["total"].mean().sort_values(ascending=False).round(0)

# %% sol_app_categoria solucion
# ¿Qué categoría vende más por la app?
app = df[df["canal"] == "App"]
(app.groupby("categoria")["total"].sum()
    .sort_values(ascending=False)
    .div(1e6).round(1))

# %% [markdown]
# **Ejercicios (módulo 13).**
# 1. ¿Qué día de la semana tiene el mayor ticket promedio (total promedio por venta)?
# 2. ¿Qué categoría vende más por la app, en millones de pesos?
#
# Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 4 · Módulo 14 — Pensar en map, filter y reduce

# %% bucle_for
# Forma 1 · bucle for: dice CÓMO, paso a paso
precios = [12_900, 4_500, 23_800, 8_700]

con_impuesto = []
for p in precios:
    con_impuesto.append(round(p * 1.19))
print(con_impuesto)

# %% con_map
# Forma 2 · map + lambda: dice QUÉ aplicar a cada elemento
precios = [12_900, 4_500, 23_800, 8_700]

con_impuesto = list(map(lambda p: round(p * 1.19), precios))
print(con_impuesto)

# %% comprension
# Forma 3 · comprensión de listas: lo mismo, en la forma más común en Python
precios = [12_900, 4_500, 23_800, 8_700]

con_impuesto = [round(p * 1.19) for p in precios]
print(con_impuesto)

# %% filter_reduce
from functools import reduce

caros = list(filter(lambda p: p > 10_000, precios))     # se quedan los que cumplen
suma = reduce(lambda acumulado, p: acumulado + p, precios, 0)
print(caros)
print(suma, "==", sum(precios))

# %% [markdown]
# ## Bloque 4 · Módulo 15 — MapReduce a mano: conteo de palabras

# %% wc_textos
resenas = pd.read_csv("datos/resenas.csv")
textos = resenas["texto"].tolist()
print(len(textos), "reseñas")
print(textos[0])

# %% wc_map
import re

def mapper(texto):
    """Fase MAP: de un texto a una lista de pares (palabra, 1)."""
    palabras = re.findall(r"[a-záéíóúüñ]+", texto.lower())
    return [(palabra, 1) for palabra in palabras]

print(mapper(textos[0]))
pares = [par for texto in textos for par in mapper(texto)]
print("Pares emitidos:", len(pares))

# %% wc_shuffle
from collections import defaultdict

# Fase SHUFFLE: agrupar los valores de cada clave; sorted imita el orden por clave que garantiza Hadoop
grupos = defaultdict(list)
for palabra, uno in sorted(pares):
    grupos[palabra].append(uno)
print("Palabras distintas:", len(grupos))
print("entrega →", grupos["entrega"])

# %% wc_reduce
def reducer(palabra, unos):
    """Fase REDUCE: combinar todos los valores de una misma clave."""
    return palabra, sum(unos)

conteo = [reducer(p, v) for p, v in grupos.items()]
conteo.sort(key=lambda par: par[1], reverse=True)
conteo[:10]

# %% wc_vacias
# Las palabras vacías (artículos, preposiciones…) no dicen nada del negocio
VACIAS = {"el", "la", "los", "las", "un", "una", "y", "o", "de", "del", "a", "al",
          "en", "con", "por", "para", "que", "es", "muy", "se", "me", "mi", "no",
          "lo", "le", "pero", "más", "fue", "su", "sin", "todo", "siempre"}
[(p, n) for p, n in conteo if p not in VACIAS][:10]

# %% wc_counter
from collections import Counter

# La biblioteca estándar ya trae este conteo: debe coincidir con el nuestro
dict(Counter(p for p, _ in pares)) == dict(conteo)

# %% sol_negativas solucion
# Palabras más frecuentes en las reseñas con calificación ≤ 2
negativas = resenas.loc[resenas["calificacion"] <= 2, "texto"]
pares_neg = [par for t in negativas for par in mapper(t)]
conteo_neg = Counter(p for p, _ in pares_neg if p not in VACIAS)
conteo_neg.most_common(10)

# %% [markdown]
# **Ejercicio (módulo 15).** Reutiliza `mapper` para contar las palabras (sin vacías) de las reseñas con
# calificación de 2 o menos. ¿De qué se quejan los clientes? Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% [markdown]
# ## Bloque 4 · Módulo 16 — MapReduce sobre las ventas y estilo Hadoop Streaming

# %% mr_ventas
# 1) Partir los datos en 4 bloques, como HDFS parte un archivo grande
tam = -(-len(df) // 4)                          # división hacia arriba
bloques = [df.iloc[i:i + tam] for i in range(0, len(df), tam)]
print("Filas por bloque:", [len(b) for b in bloques])

# 2) MAP + COMBINER: cada bloque emite (ciudad, total) y suma localmente
def map_y_combinar(bloque):
    parcial = defaultdict(float)
    for ciudad, total in zip(bloque["ciudad"], bloque["total"]):
        parcial[ciudad] += total
    return parcial

parciales = [map_y_combinar(b) for b in bloques]   # en un clúster: en paralelo

# 3) SHUFFLE + REDUCE: sumar los parciales de cada ciudad
resultado = defaultdict(float)
for parcial in parciales:
    for ciudad, subtotal in parcial.items():
        resultado[ciudad] += subtotal

mr = pd.Series(resultado).sort_values(ascending=False) / 1e6
mr.round(1)

# %% mr_verifica
# Control de coherencia: MapReduce y groupby deben dar lo mismo
con_groupby = df.groupby("ciudad")["total"].sum() / 1e6
diferencia = (mr - con_groupby).abs().max()
print("Máxima diferencia:", diferencia)
print("¿Coinciden?", diferencia < 1e-9)

# %% sol_pago solucion
# MapReduce: número de ventas por método de pago, verificado contra value_counts
def contar_bloque(bloque):                     # MAP + COMBINER: (medio, 1) sumados en el bloque
    parcial = defaultdict(int)
    for medio in bloque["metodo_pago"]:
        parcial[medio] += 1
    return parcial

por_pago = defaultdict(int)                    # SHUFFLE + REDUCE: sumar los parciales
for parcial in [contar_bloque(b) for b in bloques]:
    for medio, n in parcial.items():
        por_pago[medio] += n
por_pago = pd.Series(por_pago).sort_values(ascending=False)
print(por_pago.to_dict())
print("¿Coincide?", por_pago.sort_index().equals(df["metodo_pago"].value_counts().sort_index()))

# %% [markdown]
# **Ejercicio (módulo 16).** Con los mismos cuatro `bloques`, cuenta con MapReduce cuántas ventas hubo
# por método de pago y verifícalo contra `value_counts()`. Resuélvelo en una celda nueva (**+ Código**); la pista y la solución están en el material HTML.

# %% exporta
# Hadoop Streaming lee y escribe TEXTO: exportamos solo lo que necesita el job
df[["ciudad", "total"]].to_csv("ventas_limpias.csv", index=False)
!head -n 3 ventas_limpias.csv

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

# %% streaming
# mapper → sort (el «shuffle» de Hadoop) → reducer, con tuberías de Unix
!cat ventas_limpias.csv | python3 mapper.py | sort | python3 reducer.py

# %% [markdown]
# ## Para el taller
# El enunciado completo y la rúbrica están en el módulo 17 del material HTML.
# Sigue trabajando en este mismo notebook: ya tienes `df` limpio, las funciones `normalizar`,
# `reporte_calidad`, `mapper` y `reducer` (conteo de palabras) y los archivos `mapper.py` y
# `reducer.py` de Streaming.

# %% cifras privada
# Cifras que el texto del material cita. Se calculan aquí para que NINGUNA se
# escriba de memoria; construye_sesion1.py las inserta con {{CIFRA:clave}}.
def _es(n, dec=0):
    """Formato es-CO: punto de miles y coma decimal."""
    s = f"{n:,.{dec}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".").replace("-", "−")

_v = ventas
_vd = ventas.drop_duplicates()
_canal_crudo = _v["canal"]
_texto_precio = _vd["precio_unitario"].astype(str)
_iso0 = pd.to_datetime(_vd["fecha"], format="%Y-%m-%d", errors="coerce")
_part = participacion
_total = df["total"].sum()
_neg = [(p, n) for p, n in conteo if p not in VACIAS]
CIFRAS = {
    "filas_crudas": _es(len(_v)),
    "columnas": _es(_v.shape[1]),
    "productos": _es(len(productos)),
    "duplicados": _es(_v.duplicated().sum()),
    "grafias_ciudad": _es(_v["ciudad"].nunique()),
    "grafias_canal": _es(_canal_crudo.nunique()),
    "precios_texto": _es(_texto_precio.str.contains("$", regex=False).sum()),
    "fechas_dma": _es(_iso0.isna().sum()),
    "fechas_dma_crudas": _es(pd.to_datetime(_v["fecha"], format="%Y-%m-%d", errors="coerce").isna().sum()),
    "fuera_rango": _es((~_vd["cantidad"].between(1, 50)).sum()),
    "cantidad_min": _es(_v["cantidad"].min()),
    "cantidad_max": _es(_v["cantidad"].max()),
    "nulos_cliente": _es(_v["id_cliente"].isna().sum()),
    "pct_nulos_cliente": _es(100 * _v["id_cliente"].isna().mean(), 1),
    "nulos_descuento": _es(_v["descuento"].isna().sum()),
    "nulos_ciudad": _es(_v["ciudad"].isna().sum()),
    "nulos_pago": _es(_v["metodo_pago"].isna().sum()),
    "clientes_distintos": _es(_v["id_cliente"].nunique()),
    "pct_anonimo_tienda": _es(100 * _v["id_cliente"].isna().sum()
                              / (_v["canal"].str.strip().str.capitalize() == "Tienda").sum(), 1),
    "filas_limpias": _es(len(df)),
    "pct_filas_conservadas": _es(100 * len(df) / len(_v), 1),
    "total_millones": _es(_total / 1e6, 1),
    "ciudad_top": por_ciudad.index[0],
    "ciudad_top_millones": _es(por_ciudad["total_millones"].iloc[0], 1),
    "ciudad_top_pct": _es(100 * df.groupby("ciudad")["total"].sum().max() / _total, 1),
    "ticket_promedio": _es(df["total"].mean()),
    "app_ene": _es(_part.loc["2025-01", "App"], 1),
    "app_jun": _es(_part.loc["2025-06", "App"], 1),
    "resenas": _es(len(resenas)),
    "pares_emitidos": _es(len(pares)),
    "palabras_distintas": _es(len(grupos)),
    "palabra_top": conteo[0][0],
    "palabra_top_n": _es(conteo[0][1]),
    "palabra_util_top": _neg[0][0],
    "palabra_util_top_n": _es(_neg[0][1]),
    "filas_bloque": _es(tam),
}
