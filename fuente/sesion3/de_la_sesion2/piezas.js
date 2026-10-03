// Piezas del antiguo bloque 4 de la sesión 2 (módulos 14 a 17), retiradas el 2026-10-03 al pasar
// la sesión 2 a 4 horas. Son para la sesión 3; NO se cargan en ninguna página.
// Dependen de DATOS_SIM.formatos (ver celdas_bd.py) y de las cifras que allí se listan.

// ====================================================================
// Módulo 17 · ¿Cuántos bytes lee tu consulta? (tamaños reales de Parquet)
// ====================================================================
SIMULADORES['formatos'] = function (raiz) {
  const F = DATOS_SIM.formatos;
  const meses = [...new Set(F.parquet.map(r => r.mes))].sort();
  const columnas = F.columnas;
  const bytes = {};
  F.parquet.forEach(r => { bytes[`${r.columna}|${r.mes}`] = r.bytes; });
  const CONSULTAS = {
    junio: { texto: 'Total por ciudad en junio', columnas: ['ciudad', 'total'], meses: ['2025-06'] },
    canal: { texto: 'Total por canal, todo el semestre', columnas: ['canal', 'total'], meses },
    clientes: { texto: 'Clientes distintos por mes', columnas: ['id_cliente'], meses },
    todo: { texto: 'Toda la tabla (SELECT *)', columnas, meses }
  };
  const elegidas = { columnas: new Set(CONSULTAS.junio.columnas), meses: new Set(CONSULTAS.junio.meses) };
  const params = { consulta: 'junio' };
  const controles = raiz.querySelector('.simulador-controles');

  const selector = crearSelector(controles, {
    clave: 'consulta', etiqueta: 'Consulta de ejemplo',
    opciones: [...Object.entries(CONSULTAS).map(([v, c]) => ({ valor: v, texto: c.texto })), { valor: 'propia', texto: 'Personalizada' }]
  }, params, () => {
    const c = CONSULTAS[params.consulta];
    if (c) { elegidas.columnas = new Set(c.columnas); elegidas.meses = new Set(c.meses); }
    sincronizar();
    pintar();
  });

  const opciones = document.createElement('div');
  opciones.className = 'pq-opciones';
  const casillas = (nombre, lista, clase) => `<fieldset><legend>${nombre}</legend><div class="pq-casillas">` +
    lista.map(v => `<label><input type="checkbox" data-${clase}="${v}">${v}</label>`).join('') + '</div></fieldset>';
  opciones.innerHTML = casillas('Columnas que usa la consulta', columnas, 'columna') + casillas('Meses que filtra', meses, 'mes');
  controles.appendChild(opciones);

  function sincronizar() {
    opciones.querySelectorAll('input[data-columna]').forEach(i => { i.checked = elegidas.columnas.has(i.dataset.columna); });
    opciones.querySelectorAll('input[data-mes]').forEach(i => { i.checked = elegidas.meses.has(i.dataset.mes); });
  }
  opciones.addEventListener('change', evento => {
    const i = evento.target;
    const conjunto = i.dataset.columna ? elegidas.columnas : elegidas.meses;
    const valor = i.dataset.columna || i.dataset.mes;
    if (i.checked) conjunto.add(valor); else conjunto.delete(valor);
    params.consulta = 'propia';
    selector.value = 'propia';
    pintar();
  });

  function pintar() {
    let leidos = 0;
    const filas = columnas.map(col => `<tr><th scope="row">${col}</th>` + meses.map(mes => {
      const b = bytes[`${col}|${mes}`] || 0;
      const leida = elegidas.columnas.has(col) && elegidas.meses.has(mes);
      if (leida) leidos += b;
      return `<td class="${leida ? 'leida' : ''}">${numeroCO(b)}${leida ? '<span class="sr-only"> (se lee)</span>' : ''}</td>`;
    }).join('') + '</tr>').join('');
    raiz.querySelector('.pq-rejilla').innerHTML =
      `<table><caption class="sr-only">Bytes de cada columna en cada partición mensual; en color, las que lee la consulta</caption>` +
      `<thead><tr><th scope="col">columna</th>${meses.map(m => `<th scope="col">${m}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>`;
    const totalParquet = F.parquet.reduce((a, r) => a + r.bytes, 0);
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'CSV original (siempre completo):', valor: `${numeroCO(F.csv_bytes)} bytes` },
      { etiqueta: 'Parquet de la tabla limpia:', valor: `${numeroCO(totalParquet)} bytes` },
      { etiqueta: 'Esta consulta en Parquet:', valor: leidos ? `${numeroCO(leidos)} bytes` : '0 bytes (sin columnas o sin meses no lee datos)' },
      { etiqueta: 'Frente al CSV:', valor: `${numeroCO(100 * leidos / F.csv_bytes, 1)} %` }
    ]);
  }
  sincronizar();
  pintar();
  return [];
};

// Gráfico de la pregunta 8 del cierre: bytes por columna en Parquet (todo el semestre)
function graficoBytesPorColumna(canvas) {
  const porColumna = {};
  DATOS_SIM.formatos.parquet.forEach(r => { porColumna[r.columna] = (porColumna[r.columna] || 0) + r.bytes; });
  const orden = Object.entries(porColumna).sort((a, b) => b[1] - a[1]);
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: orden.map(o => o[0]),
      datasets: [{ data: orden.map(o => o[1]), backgroundColor: orden.map(o => o[0] === 'id_venta' || o[0] === 'canal' ? COLORES_GRAFICO.secundario : COLORES_GRAFICO.primario), borderWidth: 0 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: 'Bytes en Parquet (seis meses)' }, ticks: { font: { family: 'Fira Code', size: 10 } } },
        y: { ticks: { font: { family: 'Fira Code', size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// Preguntas del cierre de la sesión 2 sobre los módulos 14 a 17
const PREGUNTAS_BASE_DE_DATOS = [
  {
    tipo: 'opcion', modulo: 14,
    pregunta: '<code>ventas_bronce</code> se creó con <code>CREATE TABLE … USING csv OPTIONS (path …)</code>, apuntando a <code>datos/ventas.csv</code>. ¿Qué pasa con ese archivo si se ejecuta <code>DROP TABLE ventas_bronce</code>?',
    pista: '¿Quién maneja los archivos de esta tabla: Spark, dentro de su carpeta, o alguien más?',
    opciones: [
      { texto: 'Nada: se borra la definición del catálogo y el archivo queda intacto.', correcta: true, retro: 'Al indicar path, la tabla es externa: Spark solo apuntaba al archivo. Por eso las tablas externas son la opción natural para datos de origen.' },
      { texto: 'Se borra el archivo junto con la definición de la tabla en el catálogo.', correcta: false, retro: 'Eso pasaría con una tabla administrada, cuyos archivos maneja Spark dentro de su carpeta.' },
      { texto: 'Se mueve a la papelera de HDFS y se puede recuperar durante unos días.', correcta: false, retro: 'La papelera es de HDFS y actúa con hdfs dfs -rm; con una tabla externa, Spark ni siquiera toca los archivos.' },
      { texto: 'Nada, porque Spark no permite borrar tablas externas con DROP TABLE.', correcta: false, retro: 'Sí lo permite: DROP TABLE borra la definición del catálogo; lo que no toca son los archivos.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 15,
    pregunta: 'Cada noche, la carga de <code>guadua.ventas</code> escribe el semestre completo actualizado, y a veces se relanza tras un fallo. ¿Qué modo de escritura deja cada noche la tabla con los datos nuevos y sin duplicados, aunque la carga se ejecute dos veces?',
    pista: '¿Qué le hace cada modo a una tabla que ya tiene datos?',
    opciones: [
      { texto: '<code>mode("overwrite")</code>', correcta: true, retro: 'Reemplaza el contenido en cada ejecución: correrla una o diez veces deja la misma tabla, con los datos de esa noche. Es una carga idempotente.' },
      { texto: '<code>mode("append")</code>', correcta: false, retro: 'append agrega sin comparar con lo que ya hay: en el módulo 15, dos cargas seguidas de productos dejaron cada producto repetido.' },
      { texto: '<code>mode("errorifexists")</code>', correcta: false, retro: 'Es el modo por defecto y falla si la tabla ya existe: después de la primera noche, todas las cargas terminarían en error.' },
      { texto: '<code>mode("ignore")</code>', correcta: false, retro: 'Si la tabla existe no hace nada: se quedaría para siempre con los datos de la primera noche, sin ningún aviso.' }
    ]
  },
  {
    tipo: 'grafico', modulo: 17, alto: 280,
    descripcionGrafico: 'Bytes que ocupa cada columna de la tabla de ventas en Parquet, de mayor a menor',
    pregunta: 'El gráfico muestra cuánto ocupa cada columna de <code>guadua.ventas</code> en Parquet. Compara las dos barras resaltadas, <code>id_venta</code> y <code>canal</code>: las dos son texto y tienen un valor por venta. ¿Qué explica la diferencia?',
    pista: '¿Cuántos valores distintos tiene cada columna?',
    dibujar: graficoBytesPorColumna,
    opciones: [
      { texto: 'id_venta cambia en cada fila; canal repite tres valores, que Parquet guarda como códigos cortos.', correcta: true, retro: 'Parquet guarda los valores repetidos de una columna como un diccionario de códigos cortos. Una columna con un valor distinto por fila no se puede comprimir así.' },
      { texto: 'id_venta tiene más vacíos, y Parquet reserva espacio fijo para cada valor que falta.', correcta: false, retro: 'Ninguna de las dos tiene vacíos en la tabla limpia.' },
      { texto: 'Parquet comprime solo las columnas cortas y guarda los textos largos tal como vienen.', correcta: false, retro: 'Comprime todas las columnas; lo que cambia es cuánto se repiten los valores.' },
      { texto: 'id_venta es la llave de la tabla, y Parquet guarda las llaves dos veces para poder buscarlas rápido.', correcta: false, retro: 'Parquet no sabe qué es una llave primaria; guarda cada columna una sola vez.' }
    ]
  },
  {
    tipo: 'multiple', modulo: 17,
    pregunta: 'Sobre la columna <code>cliente</code> de <code>ventas_analitica</code> (hash con sal de <code>id_cliente</code>), marca lo correcto.',
    pista: '¿Quién puede deshacer la relación entre el código y el cliente?',
    opciones: [
      { texto: 'Permite contar clientes distintos igual que con el identificador original.', correcta: true, retro: 'Cada cliente tiene un único código, así que los conteos y los seguimientos se conservan.' },
      { texto: 'Sigue siendo un dato personal bajo la Ley 1581, porque quien tenga la sal puede volver a vincularlo.', correcta: true, retro: 'Seudonimizar reduce el riesgo, pero no anonimiza.' },
      { texto: 'La sal debe guardarse fuera del código y de los datos.', correcta: true, retro: 'Si la sal se filtra junto con los datos, el seudónimo deja de proteger.' },
      { texto: 'Con el código se puede recuperar el id_cliente sin la sal.', correcta: false, retro: 'Un hash no se invierte, y la sal impide recalcularlo desde identificadores conocidos.' },
      { texto: 'Bastaría el hash sin sal: SHA-256 tampoco se puede invertir.', correcta: false, retro: 'Sin sal, cualquiera puede calcular el hash de C0001, C0002… y armar la tabla de equivalencias: los identificadores posibles son pocos y conocidos. La sal es lo que lo impide.' }
    ],
    retroFallo: 'Son correctas tres: conserva los conteos, sigue siendo un dato personal y la sal se guarda aparte. Un hash con sal no se puede invertir, y sin sal no protegería: los identificadores posibles se pueden probar uno por uno.'
  },
  {
    tipo: 'opcion', modulo: 17,
    pregunta: 'La correlación entre el número del mes y la participación de la app en las ventas es {{CIFRA:corr_app}}. ¿Qué se puede concluir?',
    pista: 'Fíjate en cuántos puntos hay y en qué mide la correlación.',
    opciones: [
      { texto: 'Que la participación de la app tendió a subir mes a mes, sin que eso explique por qué.', correcta: true, retro: 'La correlación describe la asociación (con un bajón en marzo: no es una línea perfecta). Las causas —precios, domicilios, experiencia de uso— exigen otra evidencia.' },
      { texto: 'Que el paso del tiempo es la causa de que la app gane participación.', correcta: false, retro: 'Correlación no es causalidad: el mes no hace nada por sí mismo.' },
      { texto: 'Que en diciembre la app ya tendrá más de la mitad de todas las ventas de la cadena Guadua.', correcta: false, retro: 'Extrapolar seis puntos a seis meses más es arriesgado: nada garantiza que la tendencia siga igual.' },
      { texto: 'Que la correlación no sirve, porque solo un valor de 1 indica relación.', correcta: false, retro: 'Un valor cercano a 1 indica una relación lineal muy fuerte; nunca será exactamente 1 con datos reales.' }
    ]
  }
];

// La rúbrica ORIGINAL del Taller 2 (con base de datos y controles); la de la sesión 2 se rehízo
// ====================================================================
// Rúbrica del Taller 2
// ====================================================================
const RUBRICA_TALLER_2_ORIGINAL = {
  titulo: 'Rúbrica del Taller 2',
  total: 100,
  intro: 'Cada criterio se puntúa por separado. Pulsa un criterio para ver qué mide y qué distingue cada nivel.',
  nota: 'Puntos sobre 100. La equivalencia con la escala de calificación institucional la define el docente. La misma rúbrica se usa en la coevaluación entre grupos.',
  anulan: [
    'El notebook no se puede ejecutar de principio a fin por errores del propio código (no cuentan las caídas del servidor de descarga de Hadoop).',
    'Cifras del informe que no salen del notebook entregado.',
    'Uso de datos personales reales en lugar de los datos del caso.',
    'Una contraseña o clave de acceso real, de una cuenta o servicio, escrita en el notebook o en el informe.'
  ],
  criterios: [
    {
      clave: 'A · CR3', nombre: 'Hadoop y verificación', puntos: 20,
      foco: 'Mide si el job de Streaming funciona sobre HDFS, si los contadores se <strong>leen e interpretan</strong> y si el resultado se verifica contra otro camino.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Job correcto sin y con combiner; tabla de contadores con la explicación del ahorro en el shuffle; verificación contra pandas en el código.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Job correcto sin y con combiner y tabla de contadores, pero la explicación es superficial o la verificación se hace a ojo.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'El job corre, pero falta la tabla de contadores o falta la verificación.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'No hay job de Hadoop o su resultado es incorrecto.' }
      ]
    },
    {
      clave: 'B · CR3', nombre: 'Limpieza en Spark y conciliación', puntos: 20,
      foco: 'Mide si la capa plata en PySpark aplica las reglas de calidad y si se <strong>demuestra</strong> que coincide con pandas fila por fila.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Mismas filas, mismos identificadores y mismos totales que pandas, comprobado en el código; cuarentena con motivo.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Limpieza correcta; la conciliación compara solo conteos o totales.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Limpieza incompleta o sin conciliar.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'No hay limpieza en Spark.' }
      ]
    },
    {
      clave: 'C · CR3', nombre: 'Base de datos y consultas', puntos: 20,
      foco: 'Mide el diseño de las tablas (hechos, dimensiones, capas), la carga idempotente y si las consultas responden preguntas de negocio con SQL correcto.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Tablas bien diseñadas y particionadas, carga repetible, cuatro consultas correctas (con JOIN y ventana) y un EXPLAIN interpretado.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Tablas y consultas correctas; falta el EXPLAIN o alguna consulta es trivial.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Tablas sin diseño o consultas con errores.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'No hay base de datos.' }
      ]
    },
    {
      clave: 'D · CR1 · CR3', nombre: 'Controles de seguridad, eficiencia, coherencia y correlación', puntos: 25,
      foco: 'Mide si hay un control <strong>ejecutable</strong> de cada tipo, con su resultado y su interpretación, si el de seguridad respeta la Ley 1581 de 2012 y si el esquema muestra qué protege el dato en cada fase.',
      niveles: [
        { nombre: 'Excelente', rango: '23–25', observa: 'Los cuatro controles, ejecutables y con resultado; seudónimo con sal leída fuera del notebook; esquema de seguridad por fase; correlación interpretada con sus límites.' },
        { nombre: 'Aceptable', rango: '17–22', observa: 'Los cuatro controles con resultado, pero alguno sin interpretación, el esquema incompleto o la sal escrita en el notebook.' },
        { nombre: 'Insuficiente', rango: '9–16', observa: 'Faltan uno o dos tipos de control, o alguno solo se describe sin ejecutarse.' },
        { nombre: 'No logrado', rango: '0–8', observa: 'Hay uno o ningún tipo de control, o la tabla para analistas permite identificar al cliente.' }
      ]
    },
    {
      clave: 'E · CR2', nombre: 'Integración y comunicación', puntos: 15,
      foco: 'Mide si el informe <strong>integra</strong> eventos web y ventas en una conclusión útil, declara lo que los datos no permiten concluir y se entiende sin leer el código.',
      niveles: [
        { nombre: 'Excelente', rango: '14–15', observa: 'Conclusión que combina ambas fuentes, con sus límites; informe claro, con cifras y unidades.' },
        { nombre: 'Aceptable', rango: '10–13', observa: 'Ambas fuentes presentes, conexión débil; informe comprensible.' },
        { nombre: 'Insuficiente', rango: '5–9', observa: 'Fuentes analizadas por separado; informe confuso.' },
        { nombre: 'No logrado', rango: '0–4', observa: 'Falta la integración o el informe.' }
      ]
    }
  ]
};
