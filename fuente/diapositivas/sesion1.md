---
modulo: ../../Htmls/sesion-1-del-dato-al-mapreduce.html
salida: ../../Htmls/diapositivas/sesion-1-del-dato-al-mapreduce.html
agenda: si
etiqueta: Sesión 1 · 6 horas
subtitulo: Etapas del procesamiento, nube y Hadoop, limpieza con pandas y MapReduce en Python
objetivo: Llevar el consolidado de ventas de Tiendas Guadua del dato crudo a información confiable, y comprobar que la misma lógica sirve en un portátil y en un clúster.
temas: Seis etapas, Nube y Hadoop, Calidad con pandas, MapReduce en Python
---

<!--
  Sesión 1 (6 h = 4 bloques de 75 min con breaks de 15, 30 y 15).
  Las diapositivas acompañan la exposición y el trabajo en Colab: en los
  bloques 3 y 4 cada diapositiva de código corresponde a una celda del
  notebook (mismo identificador entre corchetes en el material).
  Fuera de la presentación quedan los cuestionarios completos, los
  simuladores (se abren en vivo desde el enlace de cada divisor), el
  glosario y las lecturas.
-->

# Hoja de ruta {seccion=modulo-1}

> Una empresa no decide con datos: decide con información confiable que alguien obtuvo a partir de datos.

???
Abrir con la frase y con la pregunta: ¿qué pasa entre el registro que deja una caja registradora y el gráfico que mira la gerencia? Ese trabajo silencioso —recopilar, limpiar, transformar, verificar, guardar— es el curso.

## Hoy, la lógica; en las sesiones 2 y 3, la escala y el texto

::: tarjetas
### Sesión 1 · hoy · 6 h
**Del dato al MapReduce.** Etapas del procesamiento, nube y Hadoop, limpieza con pandas, MapReduce en Python.
### Sesión 2 · 6 h
**De Hadoop a Spark.** HDFS y Hadoop Streaming en Colab, PySpark, datos semiestructurados y Spark SQL.
### Sesión 3 · 4 h
**Datos no estructurados.** Extracción y carga, lenguaje natural, análisis de sentimientos y cierre del caso.
:::

???
El mapa completo está en el módulo 1 del material. Insistir en que el caso es el mismo en las tres sesiones: lo que hoy limpiamos con pandas, en la sesión 2 lo procesamos con Spark.

## Seis horas en cuatro bloques de 75 minutos

::: flujo
1. **Reconocimiento** — del dato a la decisión, el caso y las seis etapas
2. **Nube y Hadoop** — por qué un computador no alcanza, HDFS y MapReduce
3. **pandas** — cargar, limpiar con reglas y resumir
4. **MapReduce en Python** — conteo de palabras, Streaming y cierre
:::

Breaks de **15**, **30** y **15** minutos entre bloques. Desde el bloque 3 trabajamos en Colab.

???
Pedir que escriban la hora de inicio en la agenda del material: la agenda y la barra lateral se ajustan a la hora real. Los bloques 3 y 4 son de manos en el teclado: el entorno tiene que quedar listo al final del bloque 1.

## Tres criterios valoran el curso, y hoy tocamos los tres

| Criterio | Qué pide | Dónde aparece hoy |
|---|---|---|
| **CR1** | Seguridad en la transformación del dato | Un control por etapa; datos personales en la nube |
| **CR2** | Integrar lo cuantitativo y lo cualitativo | Ventas (números) y reseñas (texto) del mismo caso |
| **CR3** | Controles de calidad y coherencia | Reporte antes y después; verificación por dos caminos |

Evaluación formativa: **autoevaluación** (los cuestionarios), **coevaluación** y **heteroevaluación** del taller.

???
CR3 habla de bases de datos: hoy hacemos los controles todavía sin base de datos y en la sesión 2 los llevamos a Spark SQL. La rúbrica del taller está en el módulo 17; los criterios se acuerdan con el grupo.

# Del dato a la decisión {seccion=modulo-2}

> `V00002, 2025-01-01, Barranquilla, Tienda, C0182, P011, 3, 16900`. ¿Qué hay que hacerle a esta fila para que sirva para decidir?

???
Dejar la fila en pantalla unos segundos. Son datos: concretos pero mudos.

## Cada escalón se construye procesando el anterior

![La pirámide del caso: de una venta suelta a «invertir en la app y en sus domicilios»](recursos/s1/m2-1.svg){alto=470}

El procesamiento de datos es, sobre todo, el paso del primer escalón al segundo.

???
En la literatura es la pirámide DIKW, con la sabiduría (*wisdom*) en la cima; el material la cambia por la decisión, que es donde esa sabiduría se vuelve acción. Antes de seguir, lanzar el diagnóstico del módulo 2 (cinco preguntas, sin calificación) y pedir que compartan en el chat cuántas acertaron al primer intento.

## ¿Dato, información o conocimiento? {.pregunta}

1. El **3** de la columna `cantidad` en la venta `V00002`.
2. «En junio, el **35,9 %** de las ventas entró por la app».
3. «Cuando llueve, las ventas de la tienda física bajan y las de la app suben, porque los clientes prefieren el domicilio; así ocurrió en cada temporada de lluvias de los últimos tres años».

::: respuesta
**1, dato**: un registro suelto. **2, información**: responde *cuánto*, pero no *por qué*. **3, conocimiento**: explica la causa y permite anticipar la próxima temporada.
:::

???
Son las preguntas 1 a 3 del diagnóstico. Si ya lo hicieron, comentar dónde fallaron más. La pista que mejor funciona para la 2: ¿la frase explica por qué ocurre, o solo dice cuánto?

## Basura entra, basura sale {.idea}

Si en el paso de datos a información se cuela una venta duplicada o una ciudad mal escrita, el gráfico y la decisión heredan el error, y con más autoridad, porque ya «viene de los datos».

???
Por eso la mitad del curso trata de calidad. Dejar sembrada la pregunta que responderemos en el bloque 3: ¿qué le pasa a un promedio si una venta se cargó dos veces?

# El caso Guadua {seccion=modulo-3}

> Por primera vez, la gerencia consolidó las ventas del semestre en un solo archivo. Los totales por ciudad no cuadran.

???
Tiendas Guadua S.A.S. es ficticia, y sus datos también: decirlo explícitamente. Seis ciudades, tienda web y app con domicilios; cada canal con su propio sistema.

## Cinco preguntas de la gerencia guían toda la sesión

1. ¿Podemos **confiar** en el consolidado? ¿Qué está mal y cuánto pesa?
2. ¿Cuánto vendimos por **ciudad**, **canal** y **categoría**?
3. ¿Es cierto que la **app** está ganando terreno?
4. ¿Qué dicen los **clientes** cuando escriben una reseña?
5. Si mañana los datos fueran **mil veces más**, ¿el mismo proceso seguiría funcionando?

???
Volveremos a esta lista en el cierre, con una respuesta para cada pregunta. La quinta es la que abre el bloque 2.

## Los tipos de dato se distinguen por cuánta estructura traen, no por el formato

::: tarjetas
### Estructurado
`ventas.csv`: 3.029 filas × 10 columnas. Todas las filas cumplen el mismo esquema.
### Semiestructurado
`logs_web.jsonl`: cada evento nombra sus campos, pero no todos tienen los mismos y algunos van anidados.
### No estructurado
`resenas.csv`: 40 reseñas en lenguaje natural. Para sacar algo de ahí hay que procesar el texto.
:::

3.029 filas caben en cualquier portátil, y está bien: lo que hoy hacemos con pandas es lo que Hadoop y Spark reparten entre muchas máquinas.

???
Las muestras de cada archivo y el diccionario de datos de `ventas.csv` están en el módulo 3. Los logs los trabajaremos en la sesión 2; las reseñas, hoy (conteo de palabras) y en la sesión 3 (sentimientos).

## ¿Cuáles son datos no estructurados? {.pregunta}

1. Las reseñas escritas por los clientes.
2. Las grabaciones de llamadas al servicio al cliente.
3. Las fotos de las facturas de los proveedores.
4. El archivo `ventas.csv`.
5. El archivo `logs_web.jsonl`.

::: respuesta
**1, 2 y 3**: texto libre, audio e imágenes no traen campos que leer. `ventas.csv` es estructurado y `logs_web.jsonl`, semiestructurado.
:::

???
Pregunta 4 del diagnóstico. La pista: no estructurado significa que no hay campos que leer; hay que procesar el contenido (transcribir el audio, reconocer el texto de la foto) para extraer algo.

# Seis etapas del procesamiento {seccion=modulo-4}

> Desde una hoja de cálculo hasta un clúster de mil máquinas: cambian las herramientas, no la lógica.

## Todo procesamiento de datos recorre seis etapas, y es un ciclo

::: tarjetas {columnas=3}
### 1 · Recopilación
Capturar de las fuentes
### 2 · Preparación
Limpiar y validar
### 3 · Introducción
Cargar al sistema
### 4 · Procesamiento
Transformar y analizar
### 5 · Interpretación
Comunicar resultados
### 6 · Almacenamiento
Guardar y gobernar
:::

Lo almacenado es la entrada del siguiente ciclo de recopilación.

???
El componente de ciclo del módulo 4 tiene, para cada etapa, qué ocurre, el caso, el riesgo de calidad, el control de seguridad, las herramientas y qué nos devuelve a una etapa anterior: recorrerlo en vivo si hay tiempo. La preparación es la etapa que más tiempo consume en un proyecto real.

## Cada etapa tiene su riesgo y su control de seguridad

| Etapa | En el caso Guadua | Un control de seguridad |
|---|---|---|
| Recopilación | Tres exportes que se juntan en `ventas.csv` | Minimización; autorización del titular |
| Preparación | 29 ventas repetidas, 24 grafías de ciudad | Reglas documentadas; cuarentena |
| Introducción | Leer el CSV con los tipos correctos | Control de acceso; cifrado en tránsito |
| Procesamiento | Total por ciudad y canal | Verificar por dos caminos; seudónimos |
| Interpretación | La app pasó del 23,0 % al 35,9 % | Publicar solo agregados |
| Almacenamiento | Tabla limpia, cuarentena y reporte | Respaldo, cifrado y retención |

???
Los riesgos de calidad de cada etapa están en el componente del módulo 4: fuentes con formatos distintos, borrar registros válidos al limpiar, tipos mal inferidos, doble conteo en una unión, confundir correlación con causa, versiones contradictorias del mismo archivo.

## ETL transforma antes de guardar; ELT guarda el crudo y transforma adentro

| | ETL | ELT |
|---|---|---|
| **Orden** | Extraer → transformar → cargar | Extraer → cargar → transformar |
| **Qué se guarda** | Solo el dato limpio | El crudo y sus versiones transformadas |
| **Cuándo conviene** | Volúmenes moderados, esquemas estables | Grandes volúmenes y fuentes variadas |
| **Datos personales** | Se seudonimizan antes de llegar | El crudo los conserva: más acceso controlado y cifrado |

???
En ELT se transforma dentro de la plataforma de destino: un lago de datos procesado con Spark o una bodega de datos en la nube. Ojo con el orden en la práctica: para limpiar con pandas primero hay que leer el archivo, así que preparación e introducción se entrelazan.

## La calidad del dato también es una obligación legal {columnas=3:2}

**Ley Estatutaria 1581 de 2012** (*habeas data*). De sus ocho principios, al procesar datos pesan sobre todo:

- **Finalidad** y **libertad**: solo para lo autorizado, con autorización previa
- **Veracidad o calidad**: veraz, completa, exacta y actualizada
- **Acceso y circulación restringida**, **seguridad** y **confidencialidad**

|||

::: warn Seudónimo no es anónimo
En el caso, el cliente es `C0182` y no su nombre. Pero sigue siendo **dato personal** mientras exista la tabla que liga `C0182` con la persona: esa tabla se guarda aparte y con acceso restringido.
:::

???
Los otros dos principios son legalidad y transparencia. La reglamentación está compilada en el Decreto 1074 de 2015. Seudonimizar desde la recopilación protege todas las etapas siguientes, no solo la publicación.

## Cada actividad, a su etapa {.pregunta etiqueta="Ejercicio en parejas · 5 min"}

1. Se calcula el total vendido por ciudad y canal.
2. La gerente pide a cada tienda exportar las ventas desde su caja.
3. Se guardan la tabla limpia y el reporte de calidad con respaldo.
4. «Bogotá D.C.», «bogota» y « Bogotá» resultan ser la misma ciudad.
5. Se presenta a la junta la participación de la app por mes.
6. Se lee el consolidado indicando que el precio es un número.

::: respuesta
**2** recopilación · **4** preparación · **6** introducción · **1** procesamiento · **5** interpretación · **3** almacenamiento.
:::

???
Pedir además un control de seguridad para cada una. Pista: hay exactamente una actividad por etapa; para separar preparación de introducción, preguntarse si la acción cambia el contenido del dato o solo lo pone en el sistema con el tipo correcto. La tabla de controles posibles está en la solución del módulo 5. (En el material las actividades llevan letras a–f, en este mismo orden.)

## Deja listo Colab antes del bloque 3

::: flujo
1. **Abrir en Colab** — el botón del módulo 5 abre el notebook de la sesión
2. **Guardar una copia en Drive** — el enlace no conserva cambios; tu copia sí
3. **Crea los datos del caso** — la primera celda genera los cuatro archivos
4. **Comparar** — las dos celdas siguientes, contra las salidas del material
:::

::: warn Cada sesión de Colab es temporal
Si al volver de un break los archivos ya no están: **Entorno de ejecución → Ejecutar anteriores**. Los datos se generan idénticos.
:::

???
Si Colab advierte que el notebook no lo creó Google, elegir «Ejecutar de todos modos». Si el enlace no abre: descargar el notebook y subirlo (Archivo → Subir notebook). Quien no alcance, lo termina en el break.

## Break de 15 minutos {.idea etiqueta="Break" icono=fa-mug-hot}

Al volver: ¿por qué un solo computador no alcanza, y qué hacen la nube y Hadoop al respecto?

???
Quien no dejó listo Colab, lo hace ahora.

# Un computador no alcanza {seccion=modulo-6}

> La quinta pregunta de la gerencia: si mañana los datos fueran mil veces más, ¿el mismo proceso seguiría funcionando?

## Big Data es el punto en que los datos dejan de caber en la herramienta

- **Volumen** — cuánto dato hay: millones de líneas de venta al día en una cadena real
- **Velocidad** — con qué ritmo llega y cuán rápido hay que responder
- **Variedad** — la tabla de ventas, el JSON de la web, el texto de las reseñas
- **Veracidad** — cuánto se puede confiar: ya vimos 29 ventas repetidas
- **Valor** — sin una decisión al final, el resto de las V es solo costo

???
«Big Data» no es un número de filas: es el punto en que los datos dejan de caber en la memoria, en el disco o en el tiempo disponible de la herramienta con la que se venían procesando.

## Crecer hacia arriba tiene techo; crecer hacia los lados exige coordinar

| | Escalado vertical (*scale up*) | Escalado horizontal (*scale out*) |
|---|---|---|
| **Idea** | Una máquina más grande | Más máquinas comunes: un **clúster** |
| **Límite** | La máquina más grande que se pueda comprar | Mucho más alto, con costo de coordinación |
| **Si falla** | Todo se detiene | Los demás nodos siguen, si hay réplicas |
| **Lo difícil** | Nada nuevo que programar | Repartir y coordinar: Hadoop y Spark |

???
El costo del escalado vertical crece más rápido que la capacidad; el del horizontal, casi en proporción. La fila «Si falla» se retoma con HDFS en el módulo 8.

## El clúster compensa solo si \(T(n) < T(1)\)

$$T(1) = \frac{D}{v} \qquad\qquad T(n) = \frac{D}{n \cdot v} + c \quad \text{si } n > 1$$

- \(D\): el tamaño de los datos; \(v\): lo que entrega un disco por segundo
- \(n\) discos leyendo **a la vez** dividen el tiempo entre \(n\)…
- …pero coordinarlos cuesta un tiempo fijo \(c\) que una sola máquina no paga

???
Es pura aritmética. Preguntar antes de pasar a la gráfica: ¿qué pasa con \(T(n)\) cuando \(n\) crece muchísimo?

## Un disco tarda casi tres horas en leer 1 TB. ¿Y cien discos en paralelo? {.pregunta}

Un disco entrega del orden de **100 MB/s**. Sin contar la coordinación, ¿cuánto tardan cien discos que leen a la vez?

::: respuesta
Menos de **dos minutos**: 1.000.000 MB / 100 MB/s son 10.000 s con un disco, y 100 s con cien. De este ejemplo, con el que White (2015) abre su libro, nació Hadoop.
:::

???
La idea central del ecosistema sale de aquí: como mover terabytes por la red también toma tiempo, se lleva el cómputo a donde están los datos, y no al revés.

## Más nodos no siempre compensan: el tiempo nunca baja de \(c\)

![Tiempo de lectura según el número de nodos, en escala logarítmica (simulador del módulo 6)](recursos/s1/m6-1.png){alto=330}

Con datos pequeños, \(c\) domina desde el principio y el clúster es **más lento** que un portátil.

???
Abrir el simulador del módulo 6 en vivo: bajar el tamaño de los datos y subir el costo de coordinación hasta que el clúster pierda contra un nodo. En la realidad es peor, porque \(c\) crece con \(n\). Las 3.029 ventas del caso se procesan en milisegundos con pandas: montar Hadoop para ellas sería como contratar un camión de mudanzas para llevar una carta.

# La nube {seccion=modulo-7}

> Levantar un clúster de cien nodos para un trabajo de una hora, y pagar solo esa hora.

## La nube alquila recursos por uso, y cinco características la definen {columnas=1:1}

::: definicion Definición (NIST SP 800-145)
Acceso por red, ubicuo, conveniente y bajo demanda, a un conjunto compartido de recursos de cómputo configurables que se aprovisionan y liberan con rapidez, con un mínimo esfuerzo de gestión (Mell y Grance, 2011).
:::

|||

- **Autoservicio** bajo demanda
- **Amplio acceso** por red
- **Recursos compartidos**
- **Elasticidad** rápida
- **Servicio medido**

???
Un ejemplo por característica: pedir el clúster desde una consola sin hablar con nadie; usar Colab desde el navegador; el proveedor atiende a muchos clientes con la misma infraestructura; diez nodos para el cierre de mes y dos el resto del tiempo; se cobra por hora de máquina, gigabyte guardado o consulta.

## IaaS, PaaS y SaaS se distinguen por quién administra cada capa

| Modelo | Capas que administra Guadua (de 9) | Cómo procesaría sus datos |
|---|---|---|
| En casa | 9: todas | Compra servidores e instala Linux, Java, Hadoop y Spark |
| **IaaS** | 5: de los datos al sistema operativo | Alquila máquinas virtuales e instala Hadoop y Spark |
| **PaaS** | 2: datos y aplicación | Clúster gestionado: EMR, Dataproc, HDInsight, Databricks |
| **SaaS** | 1: sus datos | Una herramienta de BI terminada, como Looker Studio |

???
Abrir el simulador «La pila de responsabilidad» del módulo 7 y cambiar de modelo: se ve moverse la frontera. Colab queda en la frontera entre SaaS y PaaS: como producto es un notebook listo, pero el código lo escribimos nosotros. El patrón más común para Big Data es el clúster gestionado y efímero: se crea, procesa y se apaga.

## Spark sin servidores propios y pagando por hora: ¿qué modelo es? {.pregunta}

Guadua quiere procesar sus ventas con Spark sin instalar ni mantener servidores, y pagando solo las horas de uso. Un clúster gestionado como **Amazon EMR** o **Google Cloud Dataproc** es…

::: respuesta PaaS
El proveedor entrega la plataforma, con Hadoop y Spark instalados y mantenidos; Guadua aporta datos y código. En IaaS tendría que instalarlos y repararlos ella misma.
:::

???
Es la primera pregunta del control del bloque 2: pedir que la respondan en el material antes de revelar. Pista: ¿hasta qué capa de la pila llega lo que administra Guadua? ¿Instala Spark o solo lo usa?

## Los datos siguen siendo tuyos… y tu responsabilidad

En todos los modelos, la capa de **datos** es del cliente.

- El proveedor procesa datos personales **por cuenta** de tu empresa: es su *encargado*, y eso es una **transmisión** internacional, con contrato de transmisión (Decreto 1074 de 2015)
- Si el proveedor los usara **para sus propios fines**, sería una **transferencia**: la Ley 1581 (art. 26) solo la permite hacia países con nivel adecuado de protección, salvo excepciones

Elegir la región del centro de datos y revisar el contrato también son decisiones legales.

???
El artículo de la transmisión es el 2.2.2.25.5.2 del Decreto 1074. Los modelos de despliegue (pública, privada, comunitaria, híbrida) están en la tabla del módulo 7; la híbrida es la típica para datos sensibles en casa y picos de cómputo en la nube.

# Ecosistema Hadoop {seccion=modulo-8}

> Dos ideas: repartir los datos entre muchas máquinas y llevar el cómputo hasta los datos.

## El núcleo de Hadoop son tres piezas

::: tarjetas
### HDFS
Guarda los archivos partidos en **bloques** replicados entre los nodos.
### YARN
Reparte CPU y memoria entre los trabajos, y procura lanzar cada tarea donde está su bloque.
### MapReduce
El modelo de programación para procesar en paralelo los datos de HDFS.
:::

Hadoop nació a mediados de los 2000 de dos artículos de Google: el sistema de archivos GFS (2003) y MapReduce (2004).

???
Alrededor del núcleo creció un ecosistema (Hive, Spark, Kafka…): el simulador «Piezas del ecosistema» del módulo 8 dice qué hace cada una y dónde aparecería en el caso. YARN: el ResourceManager conoce los recursos libres; un NodeManager en cada nodo lanza los contenedores.

## HDFS parte cada archivo en bloques y guarda cada bloque varias veces

$$\text{bloques} = \left\lceil \frac{\text{tamaño del archivo}}{\text{tamaño de bloque}} \right\rceil \qquad \text{espacio} = \text{tamaño} \times \text{réplicas}$$

- Bloques de **128 MB** y **3 réplicas** por defecto
- El **NameNode** lleva el índice: qué bloques forman cada archivo y dónde está cada copia
- Los **DataNodes** guardan los bloques

???
Abrir el simulador «Un archivo en HDFS» y apagar nodos: con replicación 1 basta una caída para perder el archivo; con 3, ni dos caídas lo rompen. El simulador pone las copias en nodos consecutivos para que se vea el patrón; HDFS real las reparte entre nodos y racks distintos.

## 1.000 MB con bloques de 128 MB y replicación 3: ¿cuántas réplicas guarda el clúster? {.pregunta}

Contando todas las copias de cada bloque.

::: respuesta 24 réplicas
\(\lceil 1.000 / 128 \rceil = 8\) bloques, porque el sobrante también necesita su bloque, y cada uno con 3 copias: \(8 \times 3 = 24\).
:::

???
Segunda pregunta del control del bloque 2. El error típico es dar 7,8 bloques o multiplicar por 4 (las copias «más el original»): el factor de replicación ya cuenta todas las copias.

## HDFS asume que las máquinas fallan, y replica {.idea icono=fa-clone}

En un clúster de mil máquinas comunes, que alguna falle es la rutina de cada semana. Cuando un DataNode deja de reportarse, el NameNode copia sus bloques desde las réplicas. El precio: con replicación 3, guardar 1 TB ocupa 3 TB.

???
La excepción es el propio NameNode: si cae, nadie sabe dónde está cada bloque. Por eso en producción se configura un segundo NameNode en espera (alta disponibilidad).

# MapReduce {seccion=modulo-9}

> Quien programa escribe solo dos funciones; el sistema se encarga de todo lo difícil.

## `map` emite pares clave–valor; `reduce` resume los valores de cada clave

$$\text{map}: (k_1, v_1) \rightarrow \text{lista}(k_2, v_2) \qquad \text{reduce}: \big(k_2, \text{lista}(v_2)\big) \rightarrow \text{lista}(v_2)$$

- `map` toma un registro y emite pares *clave–valor*
- El sistema **agrupa** todos los valores que comparten clave
- `reduce` recibe una clave con su lista de valores y la resume

Lo difícil lo hace el sistema: partir los datos, repartir el trabajo, reintentar lo que falle y juntar los resultados.

???
La propuesta de Dean y Ghemawat (2004). El ejemplo canónico es contar palabras: lo haremos con nuestras manos en el bloque 4.

## En el shuffle, cada par viaja por la red al reducer de su partición

![Conteo de palabras con tres fragmentos de reseñas: entrada, map, shuffle y orden, reduce y salida](recursos/s1/m9-1.svg){alto=330}

Cada mapper ve solo su bloque; cada reducer recibe **todas** las apariciones de sus claves: `hash(clave) mod R`.

???
En el dibujo, morado va al reducer 1 y naranja al 2. Las seis fases completas están en el módulo 9; la que falta aquí es el *combine*, un «mini reduce» opcional dentro de cada mapper para que viajen menos pares por la red.

## ¿En qué fase viajan necesariamente por la red los pares que emiten los mappers? {.pregunta}

En el map · en el shuffle · en el reduce · en la lectura de la entrada.

::: respuesta En el shuffle
Los pares salen del nodo que los produjo y viajan al reducer de su partición. Cada tarea map, en cambio, lee en lo posible el bloque de su propio nodo: es la localidad de datos.
:::

???
Tercera pregunta del control del bloque 2. Por eso el combiner, que reduce lo que viaja, ahorra tanto.

## Un sistema de Big Data es una tubería de tres tramos

::: flujo
1. **Ingesta: que el dato entre** — por lotes, como copiar cada noche las cajas al clúster; o en flujo continuo, como los eventos de la app con Kafka
2. **Procesamiento: que se transforme** — limpieza, uniones y agregaciones con MapReduce, Spark o Hive
3. **Explotación: que se use** — SQL con Hive o Impala, tableros de BI, modelos
:::

No confundir el *streaming* (datos que llegan sin parar) con **Hadoop Streaming** (módulo 16), que es procesamiento por lotes.

???
Sqoop, la herramienta clásica de ingesta por lotes, se retiró en 2021: hoy se usa Spark o los servicios de la nube.

## Break de 30 minutos {.idea etiqueta="Break" icono=fa-mug-hot}

Al volver, Colab: cargar el consolidado, mirar antes de limpiar y limpiar con reglas.

???
Lo más probable es que Colab haya reiniciado la sesión durante el break: ve a la celda en la que ibas y usa Entorno de ejecución → Ejecutar anteriores.

# Python y pandas {seccion=modulo-10}

> No hace falta ser programador para procesar datos con Python, pero sí leer con calma unas pocas piezas.

## Un DataFrame es una tabla; una máscara de `True`/`False` la filtra {columnas=3:2}

```python [py_pandas] {resaltar=6-7}
import pandas as pd

mini = pd.DataFrame({"ciudad": ciudades, "monto": montos})
print("Promedio:", mini["monto"].mean())

# La condición da True/False por fila: se quedan las True
print(mini[mini["monto"] > 80_000])
#> Promedio: 89900.0
#>      ciudad   monto
#> 0    Bogotá  120000
#> 1  Medellín   85500
```

|||

- **Series**: una columna con su índice
- **DataFrame**: columnas con nombre, todas del mismo largo
- Para combinar condiciones: `&` «y», `|` «o», `~` «no»

???
Recortado: el bloque del material también imprime la tabla completa. Para quien nunca programó, el módulo 10 trae la tabla de las cinco piezas (lista, diccionario, función, lambda, comprensión) y cinco reglas para leer cualquier bloque: `=` es asignación, los paréntesis ejecutan, el punto pide algo a un objeto, la sangría es parte del código y `#` es un comentario.

## Antes de limpiar, mirar: cinco instrucciones levantan el inventario

| Instrucción | Qué revela en `ventas.csv` |
|---|---|
| `pd.read_csv(…)` y `.shape` | 3.029 filas y 10 columnas |
| `.info()` | `precio_unitario` leído como texto (`object`) |
| `.describe()` | `cantidad` va de **−3** a **580** |
| `["ciudad"].value_counts()` | **24** grafías para 6 ciudades |
| `.isna().sum()` | Vacíos: 557 en cliente, 72 en descuento, 29 en pago, 11 en ciudad |

???
Ejecutarlas en orden en el notebook (módulo 11). Sobre `info()`: basta un solo valor que no se pueda leer como número para que pandas lea toda la columna como texto. Nadie compra −3 unidades, y 580 de un producto en una tienda de barrio huele a error de digitación.

## Seis ciudades, 24 grafías: algunas diferencias ni se ven {.pregunta columnas=1:1}

```python [conteos]
ventas["ciudad"].value_counts()
#> Bogotá                 969
#> Medellín               547
#> …
#> Bogotá D.C.             19
#> bogota                  18
#> MEDELLIN                17
#> …
#> Barranquilla             8
#> B/quilla                 7
```

|||

En la lista completa, «Barranquilla» aparece **dos veces**. ¿Por qué?

::: respuesta
Una de las dos lleva un **espacio al final**. Por eso la limpieza de ciudades empieza por `strip()`.
:::

???
Salida recortada: la lista completa tiene 24 líneas y está en el módulo 11. Otras grafías para comentar: «B/manga», «Cartagena de Indias», « Bogotá» con espacio al principio.

## Siete hallazgos, cada uno con su dimensión de calidad

| Hallazgo | Cuánto | Dimensión |
|---|---|---|
| Filas repetidas | 29 | Unicidad |
| Ciudades escritas de varias formas | 24 grafías para 6 ciudades | Consistencia |
| Canales escritos de varias formas | 9 grafías para 3 canales | Consistencia |
| Precios guardados como texto | 74 con «$» y punto de miles | Validez |
| Fechas en dos formatos | 107 en dd/mm/aaaa | Validez |
| Cantidades imposibles | de −3 a 580 | Exactitud |
| Vacíos en cliente, descuento, ciudad y pago | 557, 72, 11 y 29 | Completitud |

???
Algunas cifras de este inventario —filas repetidas, grafías del canal, precios con «$» y fechas dd/mm/aaaa— no salen de las cinco instrucciones: las mide el módulo 12, paso a paso. Ejercicio rápido del módulo 11: 1.016 clientes distintos y 18,4 % de ventas sin cliente (con `nunique()` e `isna().mean()`).

# Limpiar con reglas {seccion=modulo-12}

> Limpiar no es «arreglar lo que se vea raro»: es aplicar reglas explícitas, cada una justificada, documentada y medible.

## Cada regla de limpieza responde a una dimensión de calidad

| Dimensión | Pregunta que responde | En el caso Guadua |
|---|---|---|
| **Unicidad** | ¿Cada hecho está una sola vez? | Ventas cargadas dos veces |
| **Consistencia** | ¿Lo mismo se escribe igual? | «Bogotá», «bogota», «Bogotá D.C.» |
| **Validez** | ¿Cumple el tipo y el formato? | Precios como texto; dos formatos de fecha |
| **Exactitud** | ¿Corresponde a la realidad? | Cantidades de −3 o de 580 |
| **Completitud** | ¿Están todos los datos? | Vacíos en cliente, descuento, ciudad y pago |
| **Oportunidad** | ¿Llega a tiempo para decidir? | Un consolidado de enero a junio que llega en agosto |

???
Son las seis dimensiones primarias de DAMA UK (2013); la ISO/IEC 25012 usa quince características. Una cantidad de −3 puede llamarse problema de validez (regla de negocio) o de exactitud (¿pudo ocurrir así?): cualquiera de las dos etiquetas es defendible si se declara en la bitácora.

## Primero los duplicados, para no limpiar dos veces la misma venta {.codigo-grande}

```python [duplicados]
df = ventas.copy()            # el original no se toca
print("Filas iniciales:", len(df))
print("Filas duplicadas:", df.duplicated().sum())
df = df.drop_duplicates()
print("Filas tras quitar duplicados:", len(df))
#> Filas iniciales: 3029
#> Filas duplicadas: 29
#> Filas tras quitar duplicados: 3000
```

Se limpia una **copia**, `df`, para comparar al final contra el original `ventas`.

???
`duplicated()` marca cada fila idéntica a otra anterior en todas las columnas, incluido el `id_venta`; `drop_duplicates()` conserva la primera aparición. Eran una doble carga del exporte.

## Normalizar y llevar cada grafía a su forma canónica, sin perder ninguna en silencio

```python [texto] {resaltar=10-12}
def normalizar(serie):
    """Minúsculas, sin espacios sobrantes y sin tildes."""
    return (serie.str.strip()
                 .str.lower()
                 .str.normalize("NFKD")
                 .str.encode("ascii", errors="ignore")
                 .str.decode("ascii"))

ciudad_norm = normalizar(df["ciudad"])
sin_regla = ciudad_norm[ciudad_norm.notna()
                        & ~ciudad_norm.isin(CIUDAD_CANONICA)]
print("Grafías sin regla:", sin_regla.unique())   # debe salir vacío
df["ciudad"] = ciudad_norm.map(CIUDAD_CANONICA).fillna("Sin dato")
#> Grafías sin regla: []
```

???
Recortado: falta el diccionario `CIUDAD_CANONICA` (de cada forma a la canónica) y la línea del canal; están en el módulo 12. Lo importante es el control resaltado: si mañana llega «Barranqui», sale en pantalla; sin él, `map` la volvería vacío y `fillna` la escondería como «Sin dato». El truco de las tildes: NFKD separa la letra de su tilde y el paso a ASCII la descarta.

## Precios que sean números: 74 venían como `$3.100`

```python [precios]
precio_txt = df["precio_unitario"].astype(str)
df["precio_unitario"] = pd.to_numeric(
    precio_txt.str.replace(r"[$.\s]", "", regex=True), errors="coerce")
print("Precios sin convertir:", df["precio_unitario"].isna().sum())
#> Precios sin convertir: 0
```

::: warn Cuidado con el punto
Quitar los puntos funciona porque los precios en pesos son enteros. Con decimales (`12.5` dólares), el mismo código daría `125`, sin ningún aviso.
:::

???
`[$.\s]` se lee «cualquiera de estos caracteres: signo pesos, punto o espacio». `errors="coerce"` deja vacío lo que no pueda convertir, y el conteo lo delata. Toda regla de limpieza depende de conocer el negocio.

## Cada formato de fecha se interpreta de forma explícita {.codigo-grande}

```python [fechas]
iso = pd.to_datetime(df["fecha"], format="%Y-%m-%d", errors="coerce")
dma = pd.to_datetime(df["fecha"], format="%d/%m/%Y", errors="coerce")
print("Fechas en formato dd/mm/aaaa:", (iso.isna() & dma.notna()).sum())
df["fecha"] = iso.fillna(dma)
print("Fechas sin interpretar:", df["fecha"].isna().sum())
#> Fechas en formato dd/mm/aaaa: 105
#> Fechas sin interpretar: 0
```

Lo que no cumple ningún formato declarado queda vacío y **se cuenta**.

???
105 y no 107 como en el inventario: aquí ya se quitaron los duplicados, y dos de ellos traían la fecha dd/mm/aaaa. `format="mixed"` con `dayfirst=True` da el mismo resultado, pero decide fila por fila y puede leer `12/31/2025` como mes/día sin avisar. Ninguna de las dos formas resuelve `03/04/2025`: eso lo decide quien conoce la fuente.

## Lo imposible se aparta en cuarentena: limpiar no es decidir por el negocio

```python [reglas] {resaltar=4}
fuera_de_rango = ~df["cantidad"].between(1, 50)
print(df.loc[fuera_de_rango, "cantidad"].value_counts()
        .sort_index().to_dict())
cuarentena = df[fuera_de_rango].copy()  # se apartan, no se borran
df = df[~fuera_de_rango].copy()
print("Filas válidas:", len(df), "· en cuarentena:", len(cuarentena))
#> {-3: 6, -2: 7, -1: 8, 0: 7, 120: 1, 330: 1, 580: 1}
#> Filas válidas: 2969 · en cuarentena: 31
```

¿Al 580 le sobra un cero? ¿Las negativas son devoluciones mal registradas? Lo decide alguien del negocio.

???
Recortado: falta la línea que imprime cuántas cantidades quedan fuera de [1, 50] (31). La regla de negocio dice que una línea de venta tiene entre 1 y 50 unidades.

## Los 557 vacíos de `id_cliente`, ¿son un error de calidad? {.pregunta}

```python [sol_nulos_canal]
canal_limpio = ventas["canal"].str.strip().str.capitalize()
ventas["id_cliente"].isna().groupby(canal_limpio).sum()
#> canal
#> App         0
#> Tienda    557
#> Web         0
```

::: respuesta No: el vacío significa algo
Todos están en la tienda física, donde se puede comprar sin registrarse. Se rellenan con `ANONIMO`; borrarlos quitaría el 18,4 % de las ventas.
:::

???
Es el ejercicio del final del módulo 12: pedir que lo intenten en el notebook antes de revelar. El resto de los vacíos: descuento sin registro se toma como 0 y medio de pago desconocido queda «Sin dato». Antes de tratar un vacío, preguntar por qué falta.

## El reporte de calidad: los indicadores de problema quedan en cero {columnas=3:2}

| Indicador | Antes | Después |
|---|---|---|
| filas | 3029 | 2969 |
| filas duplicadas | 29 | 0 |
| celdas vacías | 669 | 0 |
| grafías de ciudad | 24 | 7 |
| grafías de canal | 9 | 3 |
| precios no numéricos | 74 | 0 |
| fechas sin interpretar | 107 | 0 |
| cantidades fuera de rango | 31 | 0 |

|||

Conservamos **2.969** de 3.029 filas: el **98,0 %**.

Este cuadro responde la primera pregunta de la gerencia y es un control de coherencia del criterio **CR3**.

???
Siete valores de ciudad y no seis: las seis ciudades más «Sin dato», la etiqueta de las 11 ventas sin ciudad. La función `reporte_calidad` calcula los mismos indicadores sobre el original y sobre la tabla limpia (módulo 12).

## Este gráfico pone a Barranquilla de segunda. ¿Le creemos? {.pregunta columnas=3:2}

![Total vendido por cada grafía de ciudad, en millones de pesos, sin ningún paso de limpieza](recursos/s1/m12-1.png){alto=400}

|||

::: respuesta No
Bogotá se reparte en varias barras, y no se han quitado duplicados ni cantidades imposibles. Con los datos limpios, Barranquilla queda **cuarta**, con 5,9 millones.
:::

???
Es el tablero de calidad del módulo 12 con todos los pasos apagados. Abrirlo en vivo: activar solo «Apartar cantidades imposibles» y mirar qué le pasa a Barranquilla; luego ir encendiendo los demás pasos.

# Transformar y resumir {seccion=modulo-13}

> Con la tabla limpia, el procesamiento son tres movimientos: derivar, unir y resumir.

## Derivar el total de cada venta y unir con el catálogo, con un control

```python [derivadas] y [union] {resaltar=6}
df["total"] = (df["cantidad"] * df["precio_unitario"]
               * (1 - df["descuento"]))
df["mes"] = df["fecha"].dt.strftime("%Y-%m")
df = (df.drop(columns=["nombre", "categoria"], errors="ignore")
        .merge(productos[["id_producto", "nombre", "categoria"]],
               on="id_producto", how="left", validate="many_to_one"))
print("Ventas sin producto en el catálogo:", df["categoria"].isna().sum())
#> Ventas sin producto en el catálogo: 0
```

`validate="many_to_one"` detiene todo si el catálogo repite un producto, que **multiplicaría las ventas** en silencio.

???
En el material son dos celdas, `[derivadas]` y `[union]`, y la primera también crea `dia_semana`. `merge` es el JOIN de SQL; `how="left"` conserva todas las ventas aunque un producto no esté en el catálogo, y el conteo de vacíos lo delataría.

## `groupby` es un MapReduce en una sola máquina

![Dividir por ciudad, aplicar sum() a cada grupo y combinar en una tabla](recursos/s1/m13-1.svg){alto=390}

Dividir por clave es lo que hacen el *map* y el *shuffle*; aplicar a cada grupo es el *reduce*.

???
El patrón *split–apply–combine* de Hadley Wickham (2011). Es el puente con el bloque 4: allí escribiremos este mismo resumen por ciudad como mapper y reducer.

## Bogotá aporta 14,6 de los 44,0 millones del semestre: el 33,3 %

| Ciudad | Ventas | Millones de pesos | Ticket promedio |
|---|---|---|---|
| Bogotá | 1019 | 14.6 | 14347 |
| Medellín | 570 | 8.4 | 14814 |
| Cali | 436 | 7.0 | 16086 |
| Barranquilla | 381 | 5.9 | 15390 |
| Bucaramanga | 297 | 4.3 | 14585 |
| Cartagena | 255 | 3.6 | 13988 |
| Sin dato | 11 | 0.1 | 10492 |

???
Es la salida de `[por_ciudad]`: `groupby("ciudad").agg(...)` con tres resúmenes con nombre. La tabla dinámica por categoría y canal (`pivot_table`, `[pivote]`) completa la segunda pregunta de la gerencia: Despensa es la categoría que más vende, en todos los canales.

## La app pasó del 23,0 % de las ventas en enero al 35,9 % en junio {columnas=1:1}

```python [app_mes]
participacion = pd.crosstab(
    df["mes"], df["canal"], values=df["total"],
    aggfunc="sum", normalize="index") * 100
participacion.round(1)
```

`normalize="index"`: cada fila suma 100.

|||

| Mes | App | Tienda | Web |
|---|---|---|---|
| 2025-01 | 23.0 | 52.8 | 24.3 |
| 2025-02 | 29.1 | 48.6 | 22.3 |
| 2025-03 | 24.8 | 49.8 | 25.4 |
| 2025-04 | 33.1 | 39.4 | 27.4 |
| 2025-05 | 35.1 | 41.6 | 23.3 |
| 2025-06 | 35.9 | 37.9 | 26.3 |

::: revelar
::: warn Información no es causa
Que la app crezca no dice *por qué* crece. Para pasar al conocimiento hacen falta más datos y más preguntas.
:::
:::

???
Tercera pregunta de la gerencia: sí, y sobre todo a costa de la tienda física. Ojo: en marzo la app baja. Puede ser una campaña, un cambio de hábitos o que las tiendas abrieron menos horas; con frecuencia, la respuesta está en las palabras de los clientes.

## Break de 15 minutos {.idea etiqueta="Break" icono=fa-mug-hot}

Ya respondimos tres preguntas de la gerencia. Al volver: el `groupby` que usamos es, por dentro, un MapReduce.

???
Resumen del bloque 3: las 3.029 filas crudas son 2.969 ventas limpias y trazables; el consolidado es confiable después de limpiarlo, Bogotá aporta el 33,3 % y la app pasó del 23,0 % al 35,9 %.

# Del bucle al map {seccion=modulo-14}

> Los nombres *map* y *reduce* no los inventó Google: vienen de la programación funcional, y Python los trae de serie.

## El bucle dice cómo; `map` dice qué, y deja libre el cómo

```python Forma 1 · bucle for
precios = [12_900, 4_500, 23_800, 8_700]

con_impuesto = []
for p in precios:
    con_impuesto.append(round(p * 1.19))
print(con_impuesto)
```

```python Forma 2 · map + lambda
precios = [12_900, 4_500, 23_800, 8_700]

con_impuesto = list(map(lambda p: round(p * 1.19), precios))
print(con_impuesto)
```

Si solo se dice **qué**, el sistema decide **cómo**: en qué orden, en cuántos núcleos, en cuántas máquinas.

???
La forma 3, la comprensión de listas, dice lo mismo que `map` y es la más común en Python. La tabla del módulo 14 conecta `map`, `filter` y `reduce` con sus equivalentes en MapReduce y Spark.

## Solo se combina por partes lo que es asociativo y conmutativo {.idea icono=fa-puzzle-piece}

La suma sí: sumar parciales da la suma total. El promedio no: un bloque de 10 ventas pesaría lo mismo que uno de 1.000. Se reducen la suma y el conteo, y se divide al final.

???
Por qué esto permite distribuir: una función sin efectos secundarios da el mismo resultado en cualquier máquina, momento u orden; y si el reduce es asociativo y conmutativo, los parciales se combinan en cualquier orden. Eso hace posible el combiner.

# Conteo de palabras {seccion=modulo-15}

> El «hola mundo» de MapReduce, con las 40 reseñas de Tiendas Guadua: nuestro primer dato no estructurado.

## Map: cada reseña se vuelve una lista de pares (palabra, 1)

```python [wc_map] {resaltar=3-4}
def mapper(texto):
    """Fase MAP: de un texto a una lista de pares (palabra, 1)."""
    palabras = re.findall(r"[a-záéíóúüñ]+", texto.lower())
    return [(palabra, 1) for palabra in palabras]

print(mapper(textos[0]))
pares = [par for texto in textos for par in mapper(texto)]
print("Pares emitidos:", len(pares))
#> [('excelente', 1), ('servicio', 1), ('y', 1), ('excelente', 1),
#>  ('calidad', 1), ('seguiré', 1), ('comprando', 1), ('en', 1),
#>  ('cartagena', 1)]
#> Pares emitidos: 468
```

Cada palabra sale con un 1: «la vi una vez».

???
Quité `import re` y partí la salida en tres líneas para que quepa. La expresión regular extrae secuencias de letras, con tildes y eñes, y deja fuera números y signos. Es la misma forma del índice invertido con que Google indexaba la web: allí se emite (palabra, documento).

## Shuffle agrupa los unos por palabra; reduce los suma

```python [wc_shuffle] y [wc_reduce] {resaltar=2,6}
grupos = defaultdict(list)
for palabra, uno in sorted(pares):   # sorted imita el orden de Hadoop
    grupos[palabra].append(uno)

def reducer(palabra, unos):
    return palabra, sum(unos)

conteo = [reducer(p, v) for p, v in grupos.items()]
conteo.sort(key=lambda par: par[1], reverse=True)
conteo[:10]
#> [('el', 32), ('y', 23), ('la', 21), ('en', 20), ('de', 12),
#>  ('muy', 9), ('llegó', 8), ('app', 7), ('es', 7), ('a', 6)]
```

De 468 pares quedan **209** palabras distintas.

???
Junté dos celdas del material (`[wc_shuffle]` y `[wc_reduce]`) y quité el docstring y los print intermedios. Ojo con `defaultdict`: también crea la lista si solo se consulta una clave que no existe; para curiosear, `grupos.get("envio")`. La verificación con `Counter` del material da `True`: comparar contra una implementación de referencia es un control de coherencia.

## La palabra más frecuente es «el», con 32 apariciones. ¿Qué le llevamos a la gerencia? {.pregunta}

Correcto… y completamente inútil.

::: respuesta Quitar las palabras vacías
Sin artículos, preposiciones ni conectores aparece lo que dicen los clientes: **llegó** (8), **app** (7), **excelente** (6), **pedido** (6), **calidad**, **domicilio**, **precio** (5).
:::

???
La lista de palabras vacías es una decisión, no una verdad: hoy quitamos «no» porque solo contamos temas, pero en la sesión 3, cuando midamos si se habla con gusto o con enojo, «no» será imprescindible («no vuelvo a pedir»).

## ¿De qué se quejan los clientes de 1 y 2 estrellas? {.pregunta}

```python [sol_negativas]
negativas = resenas.loc[resenas["calificacion"] <= 2, "texto"]
pares_neg = [par for t in negativas for par in mapper(t)]
conteo_neg = Counter(p for p, _ in pares_neg if p not in VACIAS)
conteo_neg.most_common(10)
#> [('llegó', 4), ('pedido', 3), ('dos', 3), ('veces', 3),
#>  ('domicilio', 2), ('nadie', 2), ('chat', 2), ('precio', 2),
#>  ('app', 2), ('producto', 2)]
```

::: respuesta De la entrega y de la atención
«llegó», «pedido», «domicilio»; «nadie», «chat». Pero el conteo engaña: «dos» y «veces» salen de tres quejas distintas. Para saber de qué se queja cada cliente hay que **volver al texto**.
:::

???
Es el ejercicio «integrar lo cualitativo» del módulo 15: pedir que lo intenten antes de revelar. Las tres quejas de «dos veces»: un cobro doble, una llamada repetida y un carrito perdido en la web. Ese ir y venir entre la cifra y la reseña es el criterio CR2.

## El combiner reduce lo que viaja por la red, el recurso más lento del clúster {.idea icono=fa-network-wired}

Sin combiner, cada «la» viaja por separado; con él, cada mapper envía un solo `(la, n)`. Y una palabra muy frecuente cae siempre en el mismo reducer: es el **sesgo de datos** (*data skew*).

???
Abrir el simulador «MapReduce paso a paso» del módulo 15: cambiar el número de mappers y reducers, encender el combiner y escribir frases propias. El color de cada par indica a qué reducer lo envía la partición hash(palabra) mod R.

# Del portátil al clúster {seccion=modulo-16}

> El total por ciudad, como lo haría un clúster: en bloques, cada bloque por separado, y juntando al final.

## Cuatro bloques, map con combiner y un reduce que suma subtotales

```python [mr_ventas] {resaltar=5-9}
tam = -(-len(df) // 4)                     # división hacia arriba
bloques = [df.iloc[i:i + tam] for i in range(0, len(df), tam)]
print("Filas por bloque:", [len(b) for b in bloques])

def map_y_combinar(bloque):                # MAP + COMBINER
    parcial = defaultdict(float)
    for ciudad, total in zip(bloque["ciudad"], bloque["total"]):
        parcial[ciudad] += total
    return parcial

parciales = [map_y_combinar(b) for b in bloques]   # en paralelo
resultado = defaultdict(float)             # SHUFFLE + REDUCE
for parcial in parciales:
    for ciudad, subtotal in parcial.items():
        resultado[ciudad] += subtotal
#> Filas por bloque: [743, 743, 743, 740]
```

???
Recortado: falta la conversión final a millones (`mr`); la salida da los mismos totales del `groupby`. Lo que «viaja» al reduce son a lo sumo siete subtotales por bloque, no 743 pares. HDFS corta por tamaño y no por filas, pero la idea es la misma.

## Dos caminos independientes, el mismo resultado: eso es un control de coherencia {.codigo-grande}

```python [mr_verifica]
con_groupby = df.groupby("ciudad")["total"].sum() / 1e6
diferencia = (mr - con_groupby).abs().max()
print("Máxima diferencia:", diferencia)
print("¿Coinciden?", diferencia < 1e-9)
#> Máxima diferencia: 0.0
#> ¿Coinciden? True
```

Cuando el procesamiento corra en un clúster que no podemos inspeccionar a mano, compararlo por otra vía es la mejor garantía (**CR3**).

???
`mr` es el resultado del MapReduce en millones. Ejercicio del módulo 16: contar con MapReduce las ventas por método de pago y verificarlas contra `value_counts()`; comparar con `sort_index()`, porque dos medios con el mismo número de ventas pueden salir en distinto orden.

## Hadoop Streaming: mapper y reducer como programas que hablan por texto {columnas=1:1}

```python mapper.py
import sys

for linea in sys.stdin:
    ciudad, total = linea.strip().split(",")
    if ciudad == "ciudad":  # salta el encabezado
        continue
    print(f"{ciudad}\t{total}")
```

|||

```python reducer.py {resaltar=6-9}
import sys

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
```

???
En el notebook cada programa se guarda con `%%writefile`; quité esa línea y los comentarios. El reducer aprovecha una garantía de Hadoop: recibe las líneas ordenadas por clave. Por eso no necesita un diccionario: acumula mientras la clave no cambie, y procesa millones de líneas con memoria constante.

## `sort` hace de shuffle, y la tubería da los mismos totales

```shell [streaming]
!cat ventas_limpias.csv | python3 mapper.py | sort | python3 reducer.py
#> Barranquilla    5863470
#> Bogotá          14619650
#> Bucaramanga     4331705
#> Cali            7013590
#> Cartagena       3566865
#> Medellín        8443795
#> Sin dato        115415
```

`sort` ordena las líneas completas y, como cada una empieza por su clave, las de una misma ciudad quedan juntas.

???
Antes, la celda `[exporta]` guarda solo `ciudad,total` en `ventas_limpias.csv`. En la salida real el separador es un tabulador; aquí va alineado con espacios. Por ahora la comparación con pandas es a ojo; en la sesión 2 la haremos con código.

## En la sesión 2, estos mismos dos archivos corren en Hadoop

| En la tubería de hoy | En Hadoop |
|---|---|
| `cat ventas_limpias.csv` | El archivo en HDFS, partido en bloques |
| `python3 mapper.py`, un proceso | Una tarea map por bloque, en paralelo, donde están los datos |
| `sort` | Shuffle y orden: los pares viajan al reducer de su partición |
| `python3 reducer.py`, un proceso | R tareas reduce en paralelo |
| La pantalla | Archivos `part-00000`, `part-00001`… en HDFS |

Cambiar de escala ya no cambia la lógica: solo el lugar donde se ejecuta.

???
La orden de Hadoop Streaming está al final del módulo 16 (no ejecutarla hoy). El mismo resultado por tres caminos: `groupby`, MapReduce en memoria y programas encadenados.

# Cierre {seccion=modulo-17}

> Del archivo que no cuadraba a cinco respuestas para la gerencia.

## Lo que ya podemos responder a la gerencia

| Pregunta | Respuesta de hoy |
|---|---|
| ¿Podemos confiar en el consolidado? | Sí, una vez limpio: 2.969 de 3.029 filas (98,0 %); 31 en cuarentena |
| ¿Cuánto vendimos por ciudad, canal y categoría? | 44,0 millones; Bogotá, 14,6 (33,3 %) |
| ¿La app gana terreno? | Sí: del 23,0 % en enero al 35,9 % en junio |
| ¿Qué dicen los clientes? | Sobre todo, la entrega: «llegó», «pedido», «domicilio» |
| ¿Y si los datos fueran mil veces más? | La misma lógica, como mapper y reducer, en Hadoop (sesión 2) |

???
Volver a la lista de la apertura. En las reseñas de 1 o 2 estrellas aparecen además la atención por chat, fallas de la app y la web, y cobros.

## Lo que nos llevamos hoy {.cierre}

- Procesar es convertir datos en información **confiable**: sin calidad, todo hereda el error
- Seis etapas, con un **control de seguridad** en cada una
- Cuando el dato no cabe, se reparte: HDFS **replica** y la nube alquila por horas
- Limpiar con **reglas medibles** y verificar cada resultado por un segundo camino
- `groupby` = MapReduce: la misma lógica en una máquina o en mil

???
Son las seis ideas del módulo 17, con la segunda y la tercera de la nube y HDFS juntas.

## Autoevaluación de cierre: cinco preguntas ahora, cinco en casa {.pregunta etiqueta="Autoevaluación"}

Diez preguntas de los cuatro bloques, en el módulo 17 del material. Al terminar, el material dice qué módulos conviene repasar.

???
Resolver en clase las cinco primeras (etapas y seguridad, Ley 1581, tiempo de lectura con coordinación, elasticidad, HDFS con dos nodos caídos); las otras cinco, antes de empezar el taller.

## Taller 1: informe de calidad y primer procesamiento del caso {columnas=3:2}

1. **Etapas y seguridad**: un control por etapa, frente a la Ley 1581
2. **Bitácora de limpieza**: cada regla, su dimensión y cuántas filas afectó
3. **Tres preguntas de negocio** con pandas
4. **MapReduce verificado**: total por categoría, en Python y en Streaming
5. **Lo que dicen los clientes**, integrado con las cifras de ventas

|||

::: info Entrega
Grupos de hasta tres: el **notebook ejecutado** y un **informe de dos páginas** para la gerencia, con anexo técnico. Plazo: el que fije el docente, con margen para la **coevaluación**.
:::

???
El enunciado completo y la rúbrica están en el módulo 17. Revisar la rúbrica en clase y acordar ajustes con el grupo; informar cuánto pesan la coevaluación y la heteroevaluación en la nota.

## En la sesión 2, Guadua sube a HDFS y pasa a Spark

- El `mapper.py` y el `reducer.py` de hoy, en **Hadoop Streaming**
- **Spark**: el mismo procesamiento, en memoria y con DataFrames
- La limpieza de hoy, repetida en Spark; los logs JSON de la web
- Una base de datos consultable con **Spark SQL**

No hace falta guardar nada de hoy: el notebook de la sesión 2 repite la limpieza en sus primeras celdas.

???
El taller se entrega antes de la sesión 2, y el curso cierra en la sesión 3 con la sustentación del caso.
