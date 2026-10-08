# Bases de datos con Spark: material que pasa de la sesión 2 a la sesión 3

El 2026-10-03 la sesión 2 pasó de 6 a 4 horas y la sesión 3, de 4 a 6. El tema 6 del syllabus
(bases de datos con Spark: creación, carga, exploración y consulta) y los controles del criterio CR3
salieron del bloque 4 de la sesión 2 (cuatro módulos de 10 · 15 · 15 · 25 = 65 min; el cierre, m18, se
quedó en la sesión 2) y serán el primer bloque de la sesión 3, de 75 min, junto con la bienvenida y la
recreación del estado.

**Tiempo.** Así como están no caben: 65 min de contenido más 10 de bienvenida y estado llenan el bloque
sin holgura, y el bloque ya era denso. La propuesta del 2026-10-08 (en el PLAN, sección de la sesión 3)
los reparte en cinco módulos de 10 · 10 · 15 · 15 · 15 y saca de la clase el detalle de los modos de
escritura, los ejercicios 1 y 2 de las consultas, la tercera correlación y la exploración del simulador
de bytes.

Aquí está ese material tal como estaba publicado. **No se construye ni se publica**: ninguna página lo
incluye y ningún script lo ejecuta.

| Archivo | Qué es |
|---|---|
| `m14.html` … `m17.html` | Los módulos «Crear la base de datos», «Cargar la información», «Explorar y consultar con Spark SQL» y «Controles (CR3)» |
| `celdas_bd.py` | Sus celdas (`bd_*`, `sql_*`, `sol_sql_*`, `ctl_*`) y, al final, las cifras y los datos de simulador que calculaba para ellos la celda `cifras` |
| `piezas.js` | El simulador «¿Cuántos bytes lee tu consulta?», el gráfico de bytes por columna, las cinco preguntas del cierre sobre estos módulos y la rúbrica original del Taller 2 |
| `piezas_cierre.html` | Lo que el cierre de la sesión 2 decía de estos módulos: dos de las seis ideas, los puntos 3 y 4 del taller, quince términos del glosario y cinco lecturas |

Al producir la sesión 3 hay que renumerar los módulos, recrear en las primeras celdas el estado que
dejaba la sesión 2 (sesión de Spark, tabla plata, ventas unidas al catálogo, eventos web) y decidir si la
conciliación conserva la vía de Hadoop Streaming. El detalle está en la cabecera de `celdas_bd.py`.
