# Plan vivo — Profundización I: Procesamiento de Datos (UCompensar)

Especialización en Big Data · cód. 65020 · virtual · 2 créditos · 3 sesiones sincrónicas
(6 h + 6 h + 4 h). Este archivo es la memoria del proyecto entre sesiones de trabajo:
decisiones tomadas, cómo se construye el material y qué sigue.

## Decisiones acordadas (no re-decidir)

| Tema | Decisión |
|---|---|
| Reparto | **S1** temas 1, 2, 3 y 4.1 · **S2** 4.2, 5, 6 · **S3** 7, 8 y transferencia |
| Lenguaje | Python (pandas en S1; Hadoop Streaming y PySpark en S2; NLP en S3) |
| Nivel del grupo | Heterogéneo/básico: repaso de Python incluido, código muy comentado |
| Caso ABP | *Tiendas Guadua S.A.S.*, **ficticia**, con aviso explícito; mismo caso en las 3 sesiones |
| Entorno | Google Colab + notebook `.ipynb` con las mismas celdas que el HTML |
| Hadoop en S2 | **Local dentro de Colab**, modo pseudodistribuido (NameNode + DataNode en la máquina de Colab); MapReduce con el ejecutor local, sin YARN |
| Talleres | Taller 1 se entrega **antes de la sesión 2**; Taller 2, antes de la sesión 3 (este segundo plazo es una suposición razonable: confirmar con el docente). El material dice «la fecha que fije el docente, con margen para la coevaluación». El peso en la nota no se ha definido |
| Formato | Un HTML autocontenido por sesión, formato «material de curso interactivo» con paleta UCompensar |
| Breaks | Sesiones de 6 h: 4 bloques de 75 min con breaks de 15 / 30 / 15. Sesión de 4 h: 2 bloques de 105 min con break de 30 |

**Paleta** (portada del syllabus): morado `#691E7A`, naranja `#F46201`, ámbar `#FAA012`,
pizarra `#566B7F`. Texto naranja siempre con `--uc-naranja-texto` `#B84A00` (5,2:1); el naranja
de marca y el ámbar solo en gráficos, bordes o sobre morado. Tipografía Roboto + Fira Code.

## Cómo se construye

```
precalculo/genera_datos.py       datos del caso (stdlib + semilla 2026 → idénticos en Colab)
precalculo/sesiones.py           qué produce cada sesión y dónde se ejecuta (local o Docker)
precalculo/celdas_sesionN.py     FUENTE ÚNICA del código de cada sesión (celdas con id)
precalculo/ejecuta_celdas.py N   ejecuta todo y guarda las salidas reales (salidas_sesionN.json)
precalculo/genera_notebook.py N  → notebooks/sesion-N-….ipynb
precalculo/construye.py N        fuente/ + salidas → Htmls/sesion-N-….html y Htmls/index.html
precalculo/audita.py N           auditoría (determinismo, notebook ejecutable, agenda, contraste…)
precalculo/docker/Dockerfile     réplica de Colab (x86_64): Python 3.13, Java 21, PySpark 4.0.4,
                                 pandas 2.2.3 y el tarball de Hadoop 3.5.0 (2 núcleos, como Colab)
fuente/comun/                    estilos.css, libreria.js, logo (compartidos por las 3 sesiones)
fuente/sesionN/                  sesionN.html (esqueleto), mXX.html (módulos), sesionN.js
```

Las dos sesiones se ejecutan en la réplica de Colab: los scripts se relanzan solos dentro de la
imagen Docker `procesamiento-colab:amd64`, construida para x86_64 como Colab (en un Mac con Apple
Silicon corre emulada con Rosetta; la S2 tarda unos 4 minutos). Así las salidas muestran lo mismo
que verá el estudiante: Python 3.13, pandas 2.2.3, `hadoop-3.5.0.tar.gz`, `java-21-openjdk-amd64`.
Hay que construirla una vez (descarga ~1,2 GB y ocupa ~3,2 GB; para borrarla:
`docker rmi procesamiento-colab:amd64`):

```bash
docker build --platform linux/amd64 -t procesamiento-colab:amd64 precalculo/docker
```

Para regenerar una sesión después de cualquier cambio (N = 1 o 2):

```bash
cd "Procesamiento de datos"
python3 precalculo/ejecuta_celdas.py N && python3 precalculo/genera_notebook.py N && python3 precalculo/construye.py N && python3 precalculo/audita.py N
```

Si solo cambió texto, estilos o JavaScript de `fuente/`, basta `construye.py N`. Como
`fuente/comun/` es compartido, después de tocarlo hay que reconstruir las dos sesiones.

Reglas: el HTML **nunca** se edita en `Htmls/` (se sobrescribe); ninguna cifra se escribe a mano
(van como `{{CIFRA:clave}}` calculadas en la celda privada `cifras`); el código de los bloques sale
de `celdas_sesionN.py` con `{{CELDA:id}}`. En las autoevaluaciones la opción correcta puede
escribirse en cualquier lugar: la librería reordena las opciones con semilla fija y reparte la
correcta entre las letras. Por eso ninguna retroalimentación debe citar posiciones («las dos
primeras»).

**Publicación** (desde el 2026-10-03). El repositorio público es
<https://github.com/JotaMao1985/Procesamiento-de-datos_JMS_Ucomp>, en la rama `main`. El sitio
<https://jotamao1985.github.io/Procesamiento-de-datos_JMS_Ucomp/> sirve la carpeta `Htmls/` como
raíz. Al hacer `git push` de cambios en `Htmls/`, el flujo `.github/workflows/pages.yml` lo
publica de nuevo. El syllabus en PDF no se sube: lo excluye `.gitignore`.

## Revisión de contenido del 2026-10-02 (8 revisores en paralelo)

El docente pidió revisar redacción, coherencia, gráficos, simulaciones, preguntas, barajado,
bibliografía y ejemplos de S1 y S2. Se aplicó casi todo lo propuesto. Lo más importante:

- **Exactitud.** La tendencia de la app pasa de «conocimiento» a «información» en la pirámide (la
  serie cae en marzo); fórmula T(1) sin costo de coordinación; Sqoop, Flume y Oozie presentados como
  retirados; Colab como caso de frontera SaaS/PaaS; transmisión frente a transferencia internacional
  (Decreto 1074, art. 2.2.2.25.5.2); partición de Spark ≠ bloque de HDFS (se demuestra: 4 bloques, 1
  partición); `local[*]` = un ejecutor con un hilo por núcleo; YARN no se arranca y se dice; `try_cast`
  en vez de `cast` bajo ANSI; seudonimización: sal larga y secreta, la del notebook es pública;
  conciliación «por cuatro caminos» matizada; correlación vistas–unidades solo con ventas web y app de
  junio (−0,06); 39 pagos sin cliente señalados como problema de calidad.
- **Datos.** Las reseñas ahora son coherentes con su ciudad y canal (la ciudad o el canal que nombra el
  texto mandan; ventas y logs no cambian, verificado byte a byte).
- **Simuladores.** Lectura con 1 nodo; modelo iterativo corregido (1 pasada ≈ 1,2×); Gantt con eje fijo;
  el DAG cuenta 3 etapas en un join; embudo con escala fija y aviso de muestras pequeñas; HDFS muestra
  bloques sub-replicados; tablero de calidad con leyenda de colores; los gráficos esperan las fuentes.
- **Evaluación.** Reparto de letras por bloques de cuatro con semilla por sesión (total a8 b6 c5 d7); la
  correcta ya casi nunca es la opción más larga (3 de 26); se muestra la retro del primer intento fallido;
  «Reiniciar» conserva el orden; ítems nuevos para conocimiento (DIKW), palabras vacías (m15), JSON (m13) y
  cargas idempotentes (m15); rúbricas sin contradicciones (anulación frente a criterio E, niveles sin huecos).
- **Narrativa.** Encargo de la gerencia al inicio de la S2; tabla de respuestas a la gerencia al cierre de
  la S1; cierres de bloque 3; «Si algo falla en Colab»; guía para leer celdas `%%bash`; enunciados de los
  ejercicios dentro de los notebooks; anuncio de la sustentación final.
- **Bibliografía y glosarios.** Autorías del syllabus corregidas (traductores no son autores); enlaces a
  la documentación de Hadoop 3.5.0 y Spark 4.0.4 (no «stable»/«latest»); lecturas guía y para profundizar,
  con capítulos, idioma y acceso; glosarios ampliados (34 y 39 términos) con equivalentes en inglés.
- **Tiempos.** Se rebalancearon minutos dentro de cada bloque (siguen sumando 75) y se marcaron ejercicios
  «para el trabajo independiente si no alcanza el tiempo». El revisor estimó que, aun así, la S1 pide
  ~360 min de contenido y la S2 ~400 min para 300 de clase: **decisión pendiente del docente** (recortar o
  mover más contenido a trabajo independiente).

Pendiente de verificar (no se pudo en la web): que *Calidad de datos* (Ra-Ma, 2018) esté en la biblioteca
de UCompensar; el año de Lipschutz (1982 o 1985); el registro de Valentín López (2015).

## Sesión 1 — Del dato al MapReduce · [x] terminada (el docente pasó a la S2 sin pedir cambios)

- [x] Datos del caso deterministas (ventas sucias a propósito: 29 duplicados, 24 grafías de ciudad,
      precios como texto, fechas en dos formatos, cantidades de −3 a 580, vacíos con causa)
- [x] 45 celdas ejecutadas sin error en la réplica de Colab; 44 en el HTML con su salida real
- [x] Notebook para Colab; la auditoría lo ejecuta completo en una carpeta limpia y sus salidas
      coinciden con las del HTML
- [x] 17 módulos en 4 bloques; 6 simuladores; 3 autoevaluaciones; Taller 1 con rúbrica (CR1–CR3)
- [x] Agenda con hora real, reloj de sesión y modo presentación (tecla P, flechas ← →)

## Sesión 2 — De Hadoop a Spark · [x] terminada, pendiente de revisión del docente

- [x] 77 celdas ejecutadas en la réplica de Colab (≈ 4 min emulada); 76 en el HTML con su salida real
- [x] Hadoop 3.5.0 pseudodistribuido con Java 21: HDFS (bloques de 64 KB para ver el reparto,
      `fsck`, permisos), Streaming con el `mapper.py`/`reducer.py` de la S1 sin cambios,
      4 mappers y 2 reducers, contadores reales con y sin combiner (55.709 → 582 bytes de shuffle)
- [x] PySpark 4.0.4: RDD y conteo de palabras (mismas 209 palabras que la S1), linaje y etapas,
      DataFrames y SQL, lectura desde HDFS, esquema explícito y modos de lectura, la limpieza de la
      S1 en Spark (modo ANSI, `try_to_timestamp`), uniones de difusión, ventanas, JSON anidado
- [x] Base de datos `guadua`: DDL, tablas administradas y externa, Parquet particionado por mes,
      cargas idempotentes, Spark SQL con JOIN, CTE y ventanas, `EXPLAIN` con poda de particiones
- [x] Controles CR3: seudonimización con sal, batería de reglas que dan cero, conciliación por cuatro
      caminos (pandas, Hadoop, Spark DataFrame, Spark SQL), tres correlaciones, bytes por columna
- [x] 18 módulos en 4 bloques; 7 simuladores (contadores reales del combiner, MapReduce frente a
      Spark iterativo, piezas de Spark, particiones y oleadas, DAG por etapas, eventos web reales,
      bytes leídos en Parquet reales); 3 autoevaluaciones (retorno, control del bloque 2, cierre)
- [x] Taller 2 con rúbrica de 100 puntos (CR1–CR3)
- [x] Auditoría: el notebook corre completo en la réplica de Colab y sus 60 salidas comparables
      coinciden con las del HTML; los datos generados en Docker son idénticos byte a byte
- [x] Revisado en navegador: 18 módulos sin errores de consola, sin scroll horizontal a 375 px
- [ ] **Checkpoint: revisión del docente antes de producir la S3**

Desviaciones y decisiones técnicas, con su porqué:
- YARN no se arranca en Colab: MapReduce usa el ejecutor local leyendo de HDFS. YARN se explica en
  la S1 y en el módulo 6; arrancarlo en Colab añade fragilidad sin cambiar lo que se aprende.
- Spark usa el catálogo en memoria (sin Hive Metastore): las tablas viven en `spark-warehouse/`,
  pero si Colab se reinicia hay que volver a crearlas. El módulo 14 lo explica.
- Hadoop 3.5 declara Java 17 para los servicios y 17/21 para el cliente; Colab trae Java 21. Con
  Java 21 NameNode, DataNode y Streaming funcionaron sin problemas en la réplica.
- Las celdas de arranque de HDFS y de carga son repetibles (no reformatean, `-put -f`).
- La celda de descarga intenta `dlcdn.apache.org` y, si falla, `archive.apache.org` (cuando salga
  Hadoop 3.5.1, la 3.5.0 se mudará al archivo histórico, que es más lento).

## Sesión 3 — Datos no estructurados (4 h) · esbozo

1. **B1 · Tipos, extracción y carga (7):** texto, imagen, audio; extracción de reseñas y su
   preparación (normalización, tokenización, palabras vacías, bigramas).
2. **B2 · NLP y análisis de sentimientos (8) + transferencia:** léxicos en español y un modelo
   preentrenado; integrar sentimiento con ventas del caso (CR2); sustentación del caso.
   Ampliar `RESENAS` en `genera_datos.py` (40 → ~300) antes de producirla, **sin alterar** los
   archivos de las sesiones 1 y 2 (generar las reseñas nuevas con otra semilla, en otro archivo), y
   contarlo en la historia («la gerencia exportó todas las reseñas del semestre»).
3. **Promesas que la S3 debe cumplir:** medir si las palabras se dicen «con gusto o con enojo» (por eso
   «no» no puede ser palabra vacía en la S3); bigramas (reto del taller 1); explicar con las reseñas por qué
   crece la app (S2 m17); la lectura de Borda et al. (2017); integrar reseñas con ventas (CR2); la
   **sustentación final del caso**, calificable, anunciada en S1 m17 y S2 m18. Diseñarla con un 15–20 % de
   holgura de tiempo.

## Riesgos y notas

- Colab cambia versiones. A octubre de 2026 trae Python 3.13, pandas 2.2.3, PySpark 4.0.4 y
  OpenJDK 21 (fuente: github.com/googlecolab/backend-info). Si cambian, actualizar el Dockerfile y
  regenerar. Las celdas de versiones van marcadas como salida variable.
- El HTML carga Tailwind, KaTeX, Chart.js, Prism y Font Awesome desde CDN: requiere internet.
- `localStorage` guarda solo la hora de inicio de la agenda (comodidad del docente).
- En Colab, Spark puede mostrar avisos de Java al arrancar; las celdas que fallan a propósito
  (modos de lectura, modo ANSI) silencian el registro de Java mientras se ejecutan.
