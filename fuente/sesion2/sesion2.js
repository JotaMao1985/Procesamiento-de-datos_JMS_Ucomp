// ====================================================================
// Sesión 2 · De Hadoop a Spark
// Configuración, datos incrustados, simuladores, autoevaluaciones y rúbrica.
// Las cifras (marcadores CIFRA) y los datos (marcadores JSON) los inserta
// precalculo/construye.py desde la ejecución real del código en la réplica
// de Colab (precalculo/docker).
// ====================================================================
const courseData = {
  title: "Procesamiento de Datos",
  sesion: 2,
  bloques: [
    { id: 1, titulo: "MapReduce para Hadoop", corto: "Hadoop", minutos: 75, breakDespues: 15,
      detalle: "HDFS en Colab · Hadoop Streaming · combiner · límites de MapReduce" },
    { id: 2, titulo: "Ecosistema Spark", corto: "Spark", minutos: 75, breakDespues: 30,
      detalle: "Arquitectura · RDD · ejecución perezosa · DataFrames y SQL" },
    { id: 3, titulo: "Datos tabulares y semiestructurados con Spark", corto: "Datos con Spark", minutos: 75, breakDespues: 15,
      detalle: "Esquemas · limpieza · uniones y ventanas · JSON anidado" },
    { id: 4, titulo: "Bases de datos con Spark", corto: "Bases de datos", minutos: 75, breakDespues: 0,
      detalle: "Crear · cargar · consultar · controles CR3 · taller" }
  ],
  modules: [
    { id: 1, bloque: 1, title: "Bienvenida y retorno al caso", duration: "10 min" },
    { id: 2, bloque: 1, title: "Hadoop en Colab", duration: "10 min" },
    { id: 3, bloque: 1, title: "HDFS en la práctica", duration: "20 min" },
    { id: 4, bloque: 1, title: "Hadoop Streaming", duration: "25 min" },
    { id: 5, bloque: 1, title: "Lo que Hadoop resolvió y lo que no", duration: "10 min" },
    { id: 6, bloque: 2, title: "Spark: el ecosistema", duration: "15 min" },
    { id: 7, bloque: 2, title: "Arquitectura y RDD", duration: "20 min" },
    { id: 8, bloque: 2, title: "Transformaciones y DAG", duration: "20 min" },
    { id: 9, bloque: 2, title: "DataFrames y Spark SQL", duration: "20 min" },
    { id: 10, bloque: 3, title: "Leer con esquema", duration: "15 min" },
    { id: 11, bloque: 3, title: "Limpieza en Spark", duration: "25 min" },
    { id: 12, bloque: 3, title: "Agregar, unir y ventanas", duration: "15 min" },
    { id: 13, bloque: 3, title: "Eventos web en JSON", duration: "20 min" },
    { id: 14, bloque: 4, title: "Crear la base de datos", duration: "10 min" },
    { id: 15, bloque: 4, title: "Cargar la información", duration: "15 min" },
    { id: 16, bloque: 4, title: "Consultar con Spark SQL", duration: "15 min" },
    { id: 17, bloque: 4, title: "Controles (CR3)", duration: "25 min" },
    { id: 18, bloque: 4, title: "Cierre y taller", duration: "10 min" }
  ]
};

// ---- Datos incrustados (generados; no editar a mano) ----------------
const DATOS_SIM = {{JSON:simuladores}};
const ARCHIVOS_CASO = {{JSON:archivos}};

// ---- Ayudantes de formato -------------------------------------------
const numeroCO = (n, dec = 0) => Number(n).toLocaleString('es-CO', {
  minimumFractionDigits: dec, maximumFractionDigits: dec
});

function duracionLegible(segundos) {
  if (segundos < 10) return `${numeroCO(segundos, 1)} s`;
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  if (s < 3600) {
    const m = Math.floor(s / 60), r = s % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  }
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

function tamanoLegible(gigabytes) {
  if (gigabytes >= 1000) return `${numeroCO(gigabytes / 1000, gigabytes % 1000 ? 1 : 0)} TB`;
  return `${numeroCO(gigabytes, 0)} GB`;
}

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const OPCIONES_TOOLTIP = { backgroundColor: '#3A0F47', titleFont: { family: 'Roboto' }, bodyFont: { family: 'Fira Code' } };

// ====================================================================
// Módulo 4 · Contadores reales del shuffle, sin y con combiner
// ====================================================================
SIMULADORES['contadores'] = function (raiz) {
  const sin = DATOS_SIM.combiner.sin_combiner, con = DATOS_SIM.combiner.con_combiner;
  const medidas = {
    registros: { etiqueta: 'Registros que llegan a los reducers', clave: 'reduce_input', formato: v => numeroCO(v) },
    bytes: { etiqueta: 'Bytes que viajan en el shuffle', clave: 'shuffle_bytes', formato: v => `${numeroCO(v)} bytes` }
  };
  const params = { medida: 'bytes' };
  crearSelector(raiz.querySelector('.simulador-controles'), {
    clave: 'medida', etiqueta: 'Medida',
    opciones: [{ valor: 'bytes', texto: 'Bytes del shuffle' }, { valor: 'registros', texto: 'Registros que recibe el reduce' }]
  }, params, pintar);

  const grafico = new Chart(raiz.querySelector('canvas'), {
    type: 'bar',
    data: { labels: ['Sin combiner', 'Con combiner'], datasets: [{ data: [], backgroundColor: [COLORES_GRAFICO.terciario, COLORES_GRAFICO.primario], borderWidth: 0, barPercentage: 0.55 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      plugins: { legend: { display: false }, tooltip: { ...OPCIONES_TOOLTIP, callbacks: { label: item => ` ${medidas[params.medida].formato(item.raw)}` } } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: '', font: { family: 'Roboto', size: 11 } }, ticks: { font: { family: 'Fira Code', size: 11 } }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
        y: { ticks: { font: { family: 'Roboto', size: 12 } }, grid: { display: false } }
      }
    }
  });

  function pintar() {
    const m = medidas[params.medida];
    const a = sin[m.clave], b = con[m.clave];
    grafico.options.scales.x.title.text = m.etiqueta;
    grafico.data.datasets[0].data = [a, b];
    grafico.update();
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Medida:', valor: m.etiqueta.toLowerCase() },
      { etiqueta: 'Sin combiner:', valor: m.formato(a) },
      { etiqueta: 'Con combiner:', valor: m.formato(b) },
      { etiqueta: 'Reducción:', valor: `${numeroCO(100 * (1 - b / a), 1)} %` },
      { etiqueta: 'Mismo resultado:', valor: 'sí (lo comprueba la última línea de la celda)' }
    ]);
  }
  pintar();
  return [grafico];
};

// ====================================================================
// Módulo 5 · Un análisis iterativo: MapReduce frente a Spark (modelo)
// ====================================================================
SIMULADORES['iterativo'] = function (raiz) {
  const TAMANOS = [10, 50, 100, 200, 500, 1000, 2000];          // GB
  const LECTURA = 2, ESCRITURA = 2, MEMORIA = 20;                 // GB/s del clúster completo
  const ARRANQUE_JOB = 20, ARRANQUE_ETAPA = 1;                    // s
  const params = { datos: 3, memoria: 4, pasadas: 10 };

  crearControles(raiz.querySelector('.simulador-controles'), [
    { clave: 'datos', etiqueta: 'Datos', min: 0, max: TAMANOS.length - 1, paso: 1, formato: i => tamanoLegible(TAMANOS[i]) },
    { clave: 'memoria', etiqueta: 'Memoria del clúster', min: 0, max: TAMANOS.length - 1, paso: 1, formato: i => tamanoLegible(TAMANOS[i]) },
    { clave: 'pasadas', etiqueta: 'Pasadas sobre los datos', min: 1, max: 30, paso: 1 }
  ], params, actualizar);

  const D = () => TAMANOS[params.datos], M = () => TAMANOS[params.memoria];
  // MapReduce: cada pasada es un job que lee de disco y paga su arranque; entre una pasada y la
  // siguiente escribe el resultado intermedio en HDFS con 3 réplicas.
  const mapreduce = k => k * (D() / LECTURA + ARRANQUE_JOB) + (k - 1) * 3 * D() / ESCRITURA;
  // Spark: la 1.ª pasada lee de disco y deja en memoria lo que cabe; las demás leen de memoria
  // lo que cupo y de disco el resto.
  const spark = k => {
    const enMemoria = Math.min(D(), M()), fuera = D() - enMemoria;
    return D() / LECTURA + ARRANQUE_ETAPA + (k - 1) * (enMemoria / MEMORIA + fuera / LECTURA + ARRANQUE_ETAPA);
  };
  const ejeX = Array.from({ length: 30 }, (_, i) => i + 1);

  const grafico = crearGraficoLinea(raiz.querySelector('canvas'), ejeX.map(String), [
    { label: 'MapReduce', data: [], borderColor: COLORES_GRAFICO.terciario, backgroundColor: COLORES_GRAFICO.terciario, borderWidth: 2.5, borderDash: [6, 4], pointRadius: 0, tension: 0 },
    { label: 'Spark', data: [], borderColor: COLORES_GRAFICO.primario, backgroundColor: COLORES_GRAFICO.primario, borderWidth: 2.5, pointRadius: 0, tension: 0 },
    { label: 'Spark con tus pasadas', data: [], borderColor: COLORES_GRAFICO.secundario, backgroundColor: COLORES_GRAFICO.secundario, pointRadius: 7, showLine: false }
  ], {
    plugins: {
      legend: { labels: { font: { family: 'Roboto', size: 12 }, boxWidth: 18 } },
      tooltip: { ...OPCIONES_TOOLTIP, callbacks: { title: items => `${items[0].label} pasada${items[0].label === '1' ? '' : 's'}`, label: item => item.raw === null ? '' : ` ${item.dataset.label}: ${duracionLegible(item.raw * 60)}` } }
    },
    scales: {
      x: { title: { display: true, text: 'Pasadas', font: { family: 'Roboto', size: 11 } }, ticks: { font: { family: 'Fira Code', size: 11 }, maxTicksLimit: 10 }, grid: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Minutos', font: { family: 'Roboto', size: 11 } }, ticks: { font: { family: 'Fira Code', size: 10 } }, grid: { color: 'rgba(148, 163, 184, 0.2)' } }
    }
  });

  function actualizar() {
    grafico.data.datasets[0].data = ejeX.map(k => mapreduce(k) / 60);
    grafico.data.datasets[1].data = ejeX.map(k => spark(k) / 60);
    grafico.data.datasets[2].data = ejeX.map(k => (k === params.pasadas ? spark(k) / 60 : null));
    grafico.update();
    const k = params.pasadas, tm = mapreduce(k), ts = spark(k);
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'MapReduce:', valor: duracionLegible(tm) },
      { etiqueta: 'Spark:', valor: duracionLegible(ts) },
      { etiqueta: 'Spark es:', valor: tm >= ts ? `${numeroCO(tm / ts, 1)} veces más rápido` : `${numeroCO(ts / tm, 1)} veces más lento` },
      { etiqueta: 'Datos en memoria:', valor: D() <= M() ? 'todos' : `${numeroCO(100 * M() / D())} %` }
    ]);
  }
  actualizar();
  return [grafico];
};

// ====================================================================
// Módulo 6 · Las piezas de Spark
// ====================================================================
SIMULADORES['ecosistema-spark'] = function (raiz) {
  const ecosistema = [
    { capa: 'Bibliotecas', piezas: [
      { nombre: 'Spark SQL y DataFrames', hoy: true, desc: 'Tablas distribuidas con esquema, consultables con SQL o con funciones de Python. Su optimizador, Catalyst, reescribe cada consulta antes de ejecutarla.', caso: 'Toda la limpieza del bloque 3 y la base de datos del bloque 4.' },
      { nombre: 'Structured Streaming', desc: 'Procesa flujos de datos que no terminan, como si fueran una tabla que crece, con la misma API de los DataFrames.', caso: 'Actualizar cada minuto un tablero con los pagos rechazados en la app.' },
      { nombre: 'MLlib', desc: 'Aprendizaje automático distribuido: regresión, clasificación, agrupamiento, recomendación, sobre DataFrames.', caso: 'Pronosticar las ventas de la semana por tienda.' },
      { nombre: 'GraphX / GraphFrames', desc: 'Análisis de grafos: relaciones entre entidades, caminos, comunidades.', caso: 'Descubrir qué productos se compran juntos.' }
    ] },
    { capa: 'Núcleo', piezas: [
      { nombre: 'Spark Core y RDD', hoy: true, desc: 'El motor: reparte el trabajo en tareas, gestiona la memoria y recupera particiones perdidas a partir del linaje. Los RDD son su estructura básica.', caso: 'El conteo de palabras del módulo 7.' },
      { nombre: 'Spark Connect', desc: 'Separa el cliente del motor: un programa liviano envía planes a un clúster de Spark remoto. Llegó en la versión 3.4.', caso: 'Que un analista consulte el clúster desde su portátil sin instalar Spark completo.' }
    ] },
    { capa: 'Lenguajes', piezas: [
      { nombre: 'Python (PySpark)', hoy: true, desc: 'La interfaz más usada. El código de Python arma el plan; el trabajo pesado corre en la máquina virtual de Java.', caso: 'Todo el notebook de hoy.' },
      { nombre: 'SQL', hoy: true, desc: 'Consultas SQL sobre DataFrames y tablas del catálogo, con el mismo motor y el mismo optimizador.', caso: 'Las consultas del módulo 16.' },
      { nombre: 'Scala y Java', desc: 'Spark está escrito en Scala; estas interfaces son las más cercanas al motor.', caso: 'Un equipo de ingeniería que escribe procesos de alto rendimiento.' },
      { nombre: 'R', desc: 'Existe la interfaz SparkR, marcada como obsoleta desde Spark 4.0; en R se usa más el paquete sparklyr.', caso: 'Un equipo de estadística que ya trabaja en R.' }
    ] },
    { capa: 'Gestores de clúster', piezas: [
      { nombre: 'local', hoy: true, desc: 'Todo en un computador, con un hilo de trabajo por núcleo. Ideal para aprender y probar.', caso: 'Colab, hoy.' },
      { nombre: 'Standalone', desc: 'El gestor sencillo que trae el propio Spark, para clústeres dedicados.', caso: 'Un clúster pequeño solo para analítica.' },
      { nombre: 'YARN', desc: 'El gestor de recursos de Hadoop: Spark comparte el clúster con otros trabajos de Hadoop.', caso: 'Aprovechar el clúster de Hadoop que Guadua ya tuviera.' },
      { nombre: 'Kubernetes', desc: 'Orquestador de contenedores, cada vez más usado en la nube para ejecutar Spark.', caso: 'Lanzar el proceso nocturno en contenedores que se apagan al terminar.' }
    ] },
    { capa: 'Almacenamiento y formatos', piezas: [
      { nombre: 'HDFS', hoy: true, desc: 'El sistema de archivos distribuido de Hadoop. Spark lo lee y lo escribe directamente.', caso: 'El ventas.csv del bloque 1, leído por Spark en el módulo 9.' },
      { nombre: 'S3 · GCS · ADLS', desc: 'Almacenamiento de objetos de la nube (Amazon, Google, Microsoft): barato, casi ilimitado y separado del cómputo.', caso: 'Guardar años de ventas sin mantener un clúster encendido.' },
      { nombre: 'Parquet', hoy: true, desc: 'Formato de archivo columnar y comprimido: cada consulta lee solo las columnas que necesita.', caso: 'Las tablas de la base de datos guadua.' },
      { nombre: 'Delta Lake · Iceberg', desc: 'Formatos de tabla sobre Parquet que agregan transacciones, historial de versiones y cambios de esquema controlados.', caso: 'Corregir una venta sin reescribir todo el mes, y poder ver cómo estaba la tabla ayer.' }
    ] }
  ];

  const contenedor = raiz.querySelector('.ecosistema');
  const detalle = raiz.querySelector('.eco-detalle');
  contenedor.innerHTML = ecosistema.map((capa, i) => `
    <div class="eco-capa">
      <span class="eco-capa-nombre">${capa.capa}</span>
      <div class="eco-piezas">${capa.piezas.map((p, j) =>
        `<button type="button" class="eco-pieza${p.hoy ? ' nucleo' : ''}" aria-pressed="false" data-pieza="${i}-${j}">${p.nombre}${p.hoy ? '<span class="sr-only"> (la usamos hoy)</span>' : ''}</button>`
      ).join('')}</div>
    </div>`).join('');
  detalle.innerHTML = 'Pulsa una pieza para ver qué hace y dónde la usaría Tiendas Guadua.';

  contenedor.querySelectorAll('.eco-pieza').forEach(boton => {
    boton.addEventListener('click', () => {
      contenedor.querySelectorAll('.eco-pieza').forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
      const [i, j] = boton.dataset.pieza.split('-').map(Number);
      const p = ecosistema[i].piezas[j];
      detalle.innerHTML = `<strong>${p.nombre}</strong> · ${ecosistema[i].capa}${p.hoy ? ' · la usamos hoy' : ''}<br>` +
        `${p.desc}<br><em>En el caso Guadua:</em> ${p.caso}`;
    });
  });
  return [];
};

// ====================================================================
// Módulo 7 · Particiones, núcleos y oleadas de tareas
// ====================================================================
SIMULADORES['particiones'] = function (raiz) {
  const VELOCIDAD = 50;                              // MB/s que procesa un núcleo
  const params = { datos: 1024, particiones: 6, nucleos: 4, arranque: 0.1 };

  crearControles(raiz.querySelector('.simulador-controles'), [
    { clave: 'datos', etiqueta: 'Datos', min: 128, max: 4096, paso: 128, formato: v => `${numeroCO(v)} MB` },
    { clave: 'particiones', etiqueta: 'Particiones', min: 1, max: 48, paso: 1 },
    { clave: 'nucleos', etiqueta: 'Núcleos', min: 1, max: 8, paso: 1 },
    { clave: 'arranque', etiqueta: 'Costo fijo de cada tarea', min: 0, max: 1, paso: 0.05, formato: v => `${numeroCO(v, 2)} s` }
  ], params, pintar);

  function pintar() {
    const p = params.particiones, c = params.nucleos;
    const trabajo = params.datos / p / VELOCIDAD;            // s por tarea
    const tarea = params.arranque + trabajo;
    const oleadas = Math.ceil(p / c);
    const total = oleadas * tarea;
    const secuencial = params.datos / VELOCIDAD + params.arranque;   // todo en una sola tarea
    const escala = Math.max(total, secuencial);                       // eje fijo: se ve cuándo se gana tiempo
    const filas = Array.from({ length: c }, (_, n) => {
      const tareas = [];
      for (let t = n; t < p; t += c) tareas.push(Math.floor(t / c));
      const bloques = tareas.map(o => {
        const izq = 100 * o * tarea / escala, ancho = 100 * tarea / escala;
        const arr = 100 * params.arranque / tarea;
        return `<span class="gantt-tarea${o % 2 ? ' oleada-par' : ''}" style="left:${izq}%;width:${ancho}%">` +
          `<span class="gantt-arranque" style="width:${arr}%"></span><span class="gantt-trabajo"></span></span>`;
      }).join('');
      return `<div class="gantt-fila"><span class="gantt-nucleo">Núcleo ${n + 1}</span>` +
        `<div class="gantt-carril" role="img" aria-label="Núcleo ${n + 1}: ${tareas.length} tarea${tareas.length === 1 ? '' : 's'}">${bloques}</div></div>`;
    }).join('');
    raiz.querySelector('.gantt').innerHTML = filas +
      `<div class="gantt-eje" aria-hidden="true"><span></span><div><span>0 s</span><span>${duracionLegible(escala)}${escala === secuencial ? ' (lo que tardaría una sola tarea)' : ''}</span></div></div>` +
      '<div class="gantt-leyenda"><span class="l-trabajo">procesando</span><span class="l-trabajo-par">procesando (oleada siguiente)</span><span class="l-arranque">costo fijo de la tarea</span><span class="l-ocioso">núcleo ocioso</span></div>';

    const util = 100 * p * trabajo / (c * total);
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Tareas:', valor: `${p} de ${numeroCO(params.datos / p, 0)} MB` },
      { etiqueta: 'Oleadas:', valor: `${oleadas}` },
      { etiqueta: 'Tiempo total:', valor: duracionLegible(total) },
      { etiqueta: 'Frente a una sola tarea:', valor: total <= secuencial ? `${numeroCO(secuencial / total, 1)} veces más rápido` : `${numeroCO(total / secuencial, 1)} veces más lento` },
      { etiqueta: 'Trabajo útil:', valor: `${numeroCO(util)} % de la capacidad de los núcleos` },
      { etiqueta: 'En costos fijos:', valor: `${numeroCO(100 * params.arranque / tarea)} % del tiempo de cada tarea` }
    ]);
  }
  pintar();
  return [];
};

// ====================================================================
// Módulo 8 · Arma un trabajo y mira sus etapas
// ====================================================================
SIMULADORES['dag'] = function (raiz) {
  const OPERACIONES = {
    map: { tipo: 'angosta', texto: 'map', nota: 'transforma cada elemento' },
    filter: { tipo: 'angosta', texto: 'filter', nota: 'se queda con algunos' },
    flatMap: { tipo: 'angosta', texto: 'flatMap', nota: 'de un elemento, varios' },
    withColumn: { tipo: 'angosta', texto: 'withColumn', nota: 'agrega una columna' },
    reduceByKey: { tipo: 'ancha', texto: 'reduceByKey', shuffle: 'shuffle por clave · combina antes de enviar: viaja poco' },
    groupByKey: { tipo: 'ancha', texto: 'groupByKey', shuffle: 'shuffle por clave · envía cada par tal cual: viaja todo' },
    join: { tipo: 'ancha', texto: 'join(productos)', otraEntrada: 'leer productos', shuffle: 'shuffle de las dos tablas por la llave (con una tabla tan pequeña, Spark SQL la difundiría y se ahorraría este shuffle)' },
    distinct: { tipo: 'ancha', texto: 'distinct', shuffle: 'shuffle para juntar los repetidos' },
    orderBy: { tipo: 'ancha', texto: 'orderBy', shuffle: 'shuffle por rangos para ordenar' },
    count: { tipo: 'accion', texto: 'count()' },
    collect: { tipo: 'accion', texto: 'collect()' },
    write: { tipo: 'accion', texto: 'write.parquet()' }
  };
  const GRUPOS = [
    { nombre: 'Angostas', claves: ['map', 'filter', 'flatMap', 'withColumn'] },
    { nombre: 'Anchas', claves: ['reduceByKey', 'groupByKey', 'join', 'distinct', 'orderBy'] },
    { nombre: 'Acciones', claves: ['count', 'collect', 'write'] }
  ];
  const INICIAL = ['flatMap', 'map', 'reduceByKey'];
  let cadena = [...INICIAL];
  const params = { particiones: 4 };

  crearControles(raiz.querySelector('.simulador-controles'), [
    { clave: 'particiones', etiqueta: 'Particiones', min: 1, max: 8, paso: 1 }
  ], params, pintar);

  const botones = raiz.querySelector('.dag-botones');
  botones.innerHTML = GRUPOS.map(g => `<div class="dag-grupo"><span class="dag-grupo-nombre">${g.nombre}</span>` +
    g.claves.map(k => `<button type="button" class="dag-op ${OPERACIONES[k].tipo}" data-op="${k}">${OPERACIONES[k].texto}</button>`).join('') +
    '</div>').join('') +
    `<div class="dag-grupo"><span class="dag-grupo-nombre">Cadena</span>
      <button type="button" class="dag-op control" data-control="deshacer"><i class="fas fa-rotate-left" aria-hidden="true"></i> Deshacer</button>
      <button type="button" class="dag-op control" data-control="reiniciar"><i class="fas fa-eraser" aria-hidden="true"></i> Empezar de nuevo</button></div>`;

  botones.addEventListener('click', evento => {
    const boton = evento.target.closest('button');
    if (!boton || boton.disabled) return;
    if (boton.dataset.op) cadena.push(boton.dataset.op);
    else if (boton.dataset.control === 'deshacer') cadena.pop();
    else cadena = [];
    pintar();
  });

  function pintar() {
    const terminada = cadena.length && OPERACIONES[cadena[cadena.length - 1]].tipo === 'accion';
    botones.querySelectorAll('[data-op]').forEach(b => { b.disabled = terminada; });
    botones.querySelector('[data-control="deshacer"]').disabled = cadena.length === 0;

    // Agrupar en etapas: cada operación ancha cierra la etapa y abre otra
    const etapas = [{ pasos: [{ texto: 'leer reseñas', accion: false }], entrada: null }];
    cadena.forEach(k => {
      const op = OPERACIONES[k];
      const paso = { texto: op.texto, accion: op.tipo === 'accion' };
      // un join lee además la otra tabla, en su propia etapa, en paralelo
      if (op.otraEntrada) etapas.push({ pasos: [{ texto: op.otraEntrada, accion: false }], entrada: null, lateral: true });
      if (op.tipo === 'ancha') etapas.push({ pasos: [paso], entrada: op.shuffle });
      else etapas[etapas.length - 1].pasos.push(paso);
    });

    const p = params.particiones;
    const html = etapas.map((e, i) => {
      const caja = `<div class="dag-etapa"><div class="dag-etapa-titulo"><span>Etapa ${i + 1}${e.lateral ? ' · en paralelo con la anterior' : ''}</span><span>${p} tarea${p === 1 ? '' : 's'}</span></div>` +
        '<div class="dag-pasos">' +
        e.pasos.map(paso => `<span class="dag-paso${paso.accion ? ' accion' : ''}">${escaparHTML(paso.texto)}</span>`)
          .join('<span class="dag-flecha" aria-hidden="true">→</span>') +
        '</div></div>';
      return (e.entrada ? `<div class="dag-shuffle"><i class="fas fa-arrow-down" aria-hidden="true"></i> ${e.entrada}</div>` : '') + caja;
    }).join('');

    const shuffles = etapas.filter(e => e.entrada).length;
    const tareas = etapas.length * p;
    const aviso = terminada
      ? `<div class="dag-aviso ejecutado"><strong>La acción dispara el trabajo:</strong> Spark ejecuta ${etapas.length} etapa${etapas.length === 1 ? '' : 's'} y ${tareas} tarea${tareas === 1 ? '' : 's'}${shuffles ? `, con ${shuffles} shuffle${shuffles === 1 ? '' : 's'} entre ellas` : ', sin mover datos entre nodos'}.</div>`
      : '<div class="dag-aviso"><strong>Nada se ha ejecutado todavía.</strong> Las transformaciones solo están anotadas en el plan: falta una acción.</div>';
    raiz.querySelector('.dag-etapas').innerHTML = aviso + html;

    const conReduce = cadena.includes('reduceByKey'), conGroup = cadena.includes('groupByKey');
    const combinacion = conReduce && conGroup ? 'reduceByKey sí; groupByKey no'
      : conReduce ? 'sí (reduceByKey)' : conGroup ? 'no: groupByKey envía todo' : '—';
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Operaciones:', valor: `${cadena.length}` },
      { etiqueta: 'Etapas:', valor: `${etapas.length}` },
      { etiqueta: 'Shuffles:', valor: `${shuffles}` },
      { etiqueta: 'Tareas:', valor: terminada ? `${tareas}` : '0 (sin acción)' },
      { etiqueta: 'Combinación local:', valor: combinacion }
    ]);
  }
  pintar();
  return [];
};

// ====================================================================
// Módulo 13 · Los eventos de la web y la app, por tipo (eventos reales)
// ====================================================================
SIMULADORES['embudo'] = function (raiz) {
  const EVENTOS = ['buscar', 'ver_producto', 'agregar_carrito', 'pagar'];
  const NOMBRES = { buscar: 'Búsquedas', ver_producto: 'Vistas de producto', agregar_carrito: 'Agregados al carrito', pagar: 'Intentos de pago' };
  const SO_POR_TIPO = { movil: ['android', 'ios'], escritorio: ['linux', 'macos', 'windows'] };
  const NOMBRE_SO = { android: 'Android', ios: 'iOS', linux: 'Linux', macos: 'macOS', windows: 'Windows' };
  const params = { tipo: 'todos', so: 'todos' };
  const controles = raiz.querySelector('.simulador-controles');

  crearSelector(controles, {
    clave: 'tipo', etiqueta: 'Dispositivo',
    opciones: [{ valor: 'todos', texto: 'Todos' }, { valor: 'movil', texto: 'Móvil' }, { valor: 'escritorio', texto: 'Escritorio' }]
  }, params, () => { params.so = 'todos'; pintarSelectorSO(); pintar(); });
  const zonaSO = document.createElement('div');
  zonaSO.style.display = 'contents';
  controles.appendChild(zonaSO);

  function pintarSelectorSO() {
    zonaSO.innerHTML = '';
    const lista = params.tipo === 'todos' ? [...SO_POR_TIPO.movil, ...SO_POR_TIPO.escritorio] : SO_POR_TIPO[params.tipo];
    crearSelector(zonaSO, {
      clave: 'so', etiqueta: 'Sistema operativo',
      opciones: [{ valor: 'todos', texto: 'Todos' }, ...lista.map(s => ({ valor: s, texto: NOMBRE_SO[s] || s }))]
    }, params, pintar);
  }

  const cumple = r => (params.tipo === 'todos' || r.tipo === params.tipo) && (params.so === 'todos' || r.so === params.so);
  const conteoDe = filtro => EVENTOS.map(e => DATOS_SIM.embudo.filter(r => r.evento === e && filtro(r)).reduce((a, r) => a + r.n, 0));
  const MAX_X = Math.ceil(Math.max(...conteoDe(() => true)) / 100) * 100;   // la escala de «Todos», fija

  const grafico = new Chart(raiz.querySelector('canvas'), {
    type: 'bar',
    data: { labels: EVENTOS.map(e => NOMBRES[e]), datasets: [{ data: [], backgroundColor: COLORES_GRAFICO.primario, borderWidth: 0, barPercentage: 0.6 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      plugins: { legend: { display: false }, tooltip: { ...OPCIONES_TOOLTIP, callbacks: { label: item => ` ${numeroCO(item.raw)} eventos` } } },
      scales: {
        x: { beginAtZero: true, max: MAX_X, title: { display: true, text: 'Eventos (escala fija: la de todos los dispositivos)', font: { family: 'Roboto', size: 11 } }, ticks: { font: { family: 'Fira Code', size: 11 } }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
        y: { ticks: { font: { family: 'Roboto', size: 12 } }, grid: { display: false } }
      }
    }
  });

  function pintar() {
    const conteo = conteoDe(cumple);
    grafico.data.datasets[0].data = conteo;
    grafico.update();
    const pagos = DATOS_SIM.pagos.filter(cumple);
    const intentos = pagos.reduce((a, r) => a + r.n, 0);
    const aprobados = pagos.filter(r => r.aprobado).reduce((a, r) => a + r.n, 0);
    const total = conteo.reduce((a, b) => a + b, 0);
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Eventos:', valor: numeroCO(total) },
      { etiqueta: 'Intentos de pago por cada 100 vistas:', valor: conteo[1] ? numeroCO(100 * conteo[3] / conteo[1], 1) : '—' },
      { etiqueta: 'Pagos aprobados:', valor: intentos ? `${numeroCO(aprobados)} de ${numeroCO(intentos)} (${numeroCO(100 * aprobados / intentos, intentos < 30 ? 0 : 1)} %)${intentos < 30 ? ' · pocos casos: no saques conclusiones de este porcentaje' : ''}` : '—' }
    ]);
  }
  pintarSelectorSO();
  pintar();
  return [grafico];
};

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

// ====================================================================
// Autoevaluaciones
// ====================================================================
AUTOEVALUACIONES['retorno'] = [
  {
    tipo: 'opcion', modulo: 4,
    pregunta: 'En MapReduce, ¿qué hace el <em>combiner</em>?',
    pista: 'Piensa en lo que viaja por la red entre el map y el reduce.',
    opciones: [
      { texto: 'Un reduce local en cada mapper, para que viajen menos pares por la red.', correcta: true, retro: 'Exacto. El resultado final no cambia; cambia cuánto se mueve por la red.' },
      { texto: 'Une dos conjuntos de datos que comparten una llave, como un JOIN.', correcta: false, retro: 'Eso sería una unión de tablas; el combiner resume los pares de un mismo mapper.' },
      { texto: 'Junta en un solo archivo las salidas de todos los reducers.', correcta: false, retro: 'Cada reducer escribe su propio archivo; el combiner actúa antes, en el lado del map.' },
      { texto: 'Decide a qué reducer va cada clave, según el hash de la clave y el número de reducers.', correcta: false, retro: 'Eso lo hace el particionador, con hash(clave) mod R.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 4,
    pregunta: 'El <code>reducer.py</code> de la sesión 1 imprime el total de una ciudad cuando ve aparecer la siguiente. ¿Qué garantía necesita para funcionar?',
    pista: 'En la tubería local, ¿qué hacía <code>sort</code>?',
    opciones: [
      { texto: 'Recibir las líneas ordenadas por clave.', correcta: true, retro: 'Así todas las líneas de una ciudad llegan seguidas. Hadoop lo garantiza en el shuffle.' },
      { texto: 'Que el archivo tenga encabezado.', correcta: false, retro: 'El encabezado lo descarta el mapper; el reducer ni lo ve.' },
      { texto: 'Que haya un solo mapper.', correcta: false, retro: 'Puede haber muchos: el shuffle junta y ordena lo que emitieron todos.' },
      { texto: 'Que los totales sean enteros.', correcta: false, retro: 'Suma números con decimales sin problema; lo crítico es el orden.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 11,
    pregunta: 'Quitar las ventas cargadas dos veces atiende la dimensión de calidad de…',
    pista: '¿El problema es un dato que falta, uno mal escrito, uno falso o uno que sobra?',
    opciones: [
      { texto: 'Unicidad.', correcta: true, retro: 'Un registro, una sola vez. Hoy lo haremos con <code>dropDuplicates()</code> de Spark.' },
      { texto: 'Consistencia.', correcta: false, retro: 'La consistencia trata de escribir lo mismo siempre igual, como las grafías de una ciudad.' },
      { texto: 'Completitud.', correcta: false, retro: 'La completitud trata de valores que faltan, no de registros que sobran.' },
      { texto: 'Exactitud.', correcta: false, retro: 'Las copias son exactas; el problema es que se cuentan dos veces.' }
    ]
  },
  {
    tipo: 'numerica', modulo: 3,
    pregunta: 'Un archivo de 300 MB se guarda en HDFS con bloques de 128 MB. ¿En cuántos bloques queda?',
    pista: 'El sobrante también necesita su propio bloque.',
    respuesta: 3, tolerancia: 0, unidad: 'bloques',
    retroAcierto: 'Dos bloques llenos de 128 MB y un tercero con los 44 MB restantes. Hoy lo veremos con un archivo real en el módulo 3.',
    retroFallo: '300 / 128 = 2,34: dos bloques llenos y un tercero con los 44 MB que sobran. Son 3.'
  }
];

AUTOEVALUACIONES['control-b2'] = [
  {
    tipo: 'opcion', modulo: 8,
    pregunta: '¿Cuál de estas operaciones de Spark es una <strong>acción</strong>?',
    pista: 'Una acción necesita entregar un resultado concreto.',
    opciones: [
      { texto: '<code>take(5)</code>', correcta: true, retro: 'Devuelve elementos concretos al driver, así que obliga a ejecutar el plan; igual que <code>count()</code> o <code>collect()</code>.' },
      { texto: '<code>filter(...)</code>', correcta: false, retro: 'Devuelve otro RDD o DataFrame: es una transformación y solo se anota.' },
      { texto: '<code>reduceByKey(...)</code>', correcta: false, retro: 'Es una transformación ancha: abre una etapa nueva, pero tampoco ejecuta nada por sí sola.' },
      { texto: '<code>withColumn(...)</code>', correcta: false, retro: 'Agrega una columna al plan; no calcula nada hasta que llegue una acción.' }
    ]
  },
  {
    tipo: 'multiple', modulo: 8,
    pregunta: '¿Cuáles de estas transformaciones provocan un <strong>shuffle</strong> y abren una etapa nueva? Marca todas.',
    pista: '¿Necesita la operación ver filas que están en otras particiones?',
    opciones: [
      { texto: '<code>reduceByKey</code>', correcta: true, retro: 'Debe reunir todas las apariciones de cada clave, que están repartidas.' },
      { texto: '<code>groupBy("ciudad").agg(...)</code>', correcta: true, retro: 'Igual que reduceByKey: junta cada ciudad en una partición.' },
      { texto: '<code>join</code> entre dos tablas grandes', correcta: true, retro: 'Hay que llevar las filas con la misma llave al mismo lugar. Con una tabla pequeña, el join de difusión lo evita.' },
      { texto: '<code>filter</code>', correcta: false, retro: 'Decide fila por fila, dentro de cada partición.' },
      { texto: '<code>map</code>', correcta: false, retro: 'Transforma cada elemento donde está: es angosta.' }
    ],
    retroFallo: 'Abren etapa reduceByKey, groupBy().agg() y el join entre tablas grandes; filter y map son angostas.'
  },
  {
    tipo: 'opcion', modulo: 9,
    pregunta: 'Desde Python, ¿por qué un DataFrame suele ser mucho más rápido que un RDD para la misma tarea?',
    pista: 'Piensa en quién sabe qué hay dentro de los datos y dónde se ejecuta el trabajo.',
    opciones: [
      { texto: 'Porque Spark conoce sus columnas, optimiza el plan y no pasa cada fila por Python.', correcta: true, retro: 'Con el esquema, Catalyst reescribe el plan y el trabajo corre dentro de Java. Con un RDD, Spark le entrega cada objeto a una función de Python que no puede analizar ni optimizar.' },
      { texto: 'Porque los DataFrames siempre caben en memoria, mientras que los RDD se leen una y otra vez de disco.', correcta: false, retro: 'Ninguno de los dos tiene que caber completo en memoria; ambos se reparten en particiones y ambos pueden guardarse en caché.' },
      { texto: 'Porque los DataFrames no usan particiones y se procesan en una sola tarea.', correcta: false, retro: 'Sí las usan: un DataFrame también se reparte en particiones y se procesa en tareas.' },
      { texto: 'Porque los RDD solo funcionan con texto y hay que convertir cada valor.', correcta: false, retro: 'Un RDD puede contener cualquier objeto de Python; el problema es que Spark no puede ver dentro.' }
    ]
  },
  {
    tipo: 'numerica', modulo: 7,
    pregunta: 'Un RDD tiene 8 particiones y el clúster tiene 2 núcleos. Si cada tarea tarda 10 segundos, ¿cuántos segundos toma la etapa completa?',
    pista: 'Cada núcleo ejecuta una tarea a la vez: ¿cuántas oleadas hacen falta?',
    respuesta: 40, tolerancia: 0, unidad: 's',
    retroAcierto: '8 tareas / 2 núcleos = 4 oleadas de 10 segundos: 40 s.',
    retroFallo: 'Son 4 oleadas (8 tareas, 2 a la vez) de 10 segundos cada una: 40 s. Con 8 núcleos sería una sola oleada, 10 s.'
  }
];

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

AUTOEVALUACIONES['cierre'] = [
  {
    tipo: 'opcion', modulo: 2,
    pregunta: 'Comparar la huella SHA-512 del archivo descargado con la que publica Apache garantiza…',
    pista: 'La huella cambia si cambia un solo byte. ¿Qué no puede garantizar si alguien cambia también la huella publicada?',
    opciones: [
      { texto: 'La integridad: el archivo llegó sin alteraciones.', correcta: true, retro: 'Para la autenticidad —que lo publicó Apache— hace falta además verificar la firma digital (.asc).' },
      { texto: 'La confidencialidad: nadie más pudo leer el archivo.', correcta: false, retro: 'El software es público; la huella no oculta nada.' },
      { texto: 'La calidad: el programa no tiene errores.', correcta: false, retro: 'Solo garantiza que es el mismo archivo que se publicó, con sus virtudes y sus errores.' },
      { texto: 'La autenticidad: el archivo lo publicó Apache.', correcta: false, retro: 'Si alguien controla el sitio de descarga puede cambiar el archivo y también la huella, y la comparación pasaría. La autenticidad la da la firma digital (.asc), verificada con la clave pública de Apache.' }
    ]
  },
  {
    tipo: 'numerica', modulo: 4,
    pregunta: 'Un job de Streaming lee 4 archivos (4 mappers) y cada mapper ve ventas de las 7 «ciudades» (incluida «Sin dato»). Si el combiner suma por ciudad una vez en cada mapper, ¿cuántos registros llegan a los reducers?',
    pista: '¿Cuántos subtotales distintos puede producir cada mapper después de combinar?',
    respuesta: 28, tolerancia: 0, unidad: 'registros',
    retroAcierto: '4 mappers × 7 ciudades = {{CIFRA:combine_output}} subtotales, contra {{CIFRA:map_output}} pares sin combiner: es lo que mostraron los contadores reales. Ojo: Hadoop no garantiza cuántas veces ejecuta el combiner (cero, una o varias), y por eso la operación debe dar el mismo resultado en cualquier caso.',
    retroFallo: 'Cada mapper resume sus ventas en un subtotal por ciudad: 4 × 7 = 28. Sin combiner llegarían los {{CIFRA:map_output}} pares.'
  },
  {
    tipo: 'opcion', modulo: 10,
    pregunta: 'Al leer las ventas con <code>mode="DROPMALFORMED"</code> quedaron {{CIFRA:dropmalformed}} filas en lugar de {{CIFRA:filas_crudas}}. ¿Cuál es el riesgo?',
    pista: '¿Qué tenían de malo esas filas? Compáralo con lo que viste en la columna <code>_corrupt_record</code>.',
    opciones: [
      { texto: 'Que se pierdan sin aviso ventas válidas con el precio escrito como «$3.100», y el total quede corto.', correcta: true, retro: 'Las {{CIFRA:corruptos}} filas descartadas eran ventas reales con el precio escrito como texto. Por eso conviene una capa bronce sin pérdidas y reglas explícitas en la plata.' },
      { texto: 'Ninguno: las filas descartadas eran las ventas cargadas dos veces, que de todos modos había que quitar.', correcta: false, retro: 'Los duplicados no violan el esquema, y eran {{CIFRA:duplicados}}, no {{CIFRA:corruptos}}. Lo que se descartó fueron precios escritos como «$3.100».' },
      { texto: 'Que Spark se detenga a mitad de la lectura y no entregue ningún resultado.', correcta: false, retro: 'Ese es el comportamiento de FAILFAST, no de DROPMALFORMED.' },
      { texto: 'Que las filas que quedan mantengan el precio como texto y no se puedan sumar.', correcta: false, retro: 'Con el esquema declarado, las filas que quedan tienen el precio como número entero; las de precio con «$» son justamente las descartadas.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 11,
    pregunta: 'En Spark 4, <code>F.to_date("fecha", "yyyy-MM-dd")</code> sobre el valor <code>18/04/2025</code>…',
    pista: 'Recuerda qué pasó en el módulo 11 al intentar convertir las dos fechas de ejemplo.',
    opciones: [
      { texto: 'lanza un error; para obtener un nulo a propósito se usa <code>try_to_timestamp</code>.', correcta: true, retro: 'Spark 4 trabaja en modo ANSI: prefiere detenerse a inventar un nulo. Las funciones try_ hacen explícito que el nulo es intencional.' },
      { texto: 'devuelve nulo en silencio, como <code>errors="coerce"</code> en pandas.', correcta: false, retro: 'Ese era el comportamiento de Spark 3 sin modo ANSI. En Spark 4, el nulo hay que pedirlo con una función try_.' },
      { texto: 'devuelve 2025-04-18, porque Spark reconoce por su cuenta el formato día/mes/año.', correcta: false, retro: 'El formato declarado es yyyy-MM-dd; Spark no adivina otro.' },
      { texto: 'descarta la fila, como al leer con <code>mode="DROPMALFORMED"</code>.', correcta: false, retro: 'Los modos de lectura actúan al leer el archivo; to_date es una función sobre una columna ya leída, y en modo ANSI no descarta: falla.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 13,
    pregunta: 'En <code>logs_web.jsonl</code>, el campo <code>consulta</code> está vacío en la mayoría de los {{CIFRA:eventos}} eventos, e <code>id_cliente</code> solo aparece en el {{CIFRA:pct_eventos_cliente}} %. ¿Cómo se interpretan esos vacíos?',
    pista: '¿Qué eventos deberían traer una consulta? ¿Y en qué eventos es normal no saber quién es el cliente?',
    opciones: [
      { texto: '<code>consulta</code> solo aplica a las búsquedas; un <code>id_cliente</code> vacío es normal al navegar, no en un pago.', correcta: true, retro: 'En un dato semiestructurado, un campo puede faltar porque no aplica a ese tipo de evento. Medir la completitud exige saber qué campos debe traer cada evento: los {{CIFRA:pagos_sin_cliente}} pagos sin cliente sí son un problema de calidad.' },
      { texto: 'Los dos son errores de captura de la tienda web, así que hay que descartar los eventos que no los traen.', correcta: false, retro: 'Se perderían casi todas las vistas, los carritos y los pagos. consulta no aplica a esos eventos: no es un error.' },
      { texto: 'No hay vacíos: Spark solo crea en cada evento las columnas que ese evento declara.', correcta: false, retro: 'Spark arma un esquema que cubre todos los campos y pone nulo donde un evento no trae el suyo; por eso el conteo de cada columna da cifras distintas.' },
      { texto: 'Hay que rellenarlos con el valor más frecuente de cada campo para completar la tabla.', correcta: false, retro: 'Inventaría búsquedas y clientes que no existen. Un vacío se trata según su causa, como los clientes anónimos de la tienda en la sesión 1.' }
    ]
  },
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

// ====================================================================
// Rúbrica del Taller 2
// ====================================================================
RUBRICAS['taller-2'] = {
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
