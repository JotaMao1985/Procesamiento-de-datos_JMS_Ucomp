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
    { id: 1, titulo: "De MapReduce en Hadoop a Spark", corto: "Hadoop y Spark", minutos: 105, breakDespues: 30,
      detalle: "HDFS en Colab · Hadoop Streaming · combiner · límites de MapReduce · arquitectura de Spark y RDD" },
    { id: 2, titulo: "Datos tabulares y semiestructurados con Spark", corto: "Datos con Spark", minutos: 105, breakDespues: 0,
      detalle: "DAG · DataFrames y SQL · esquemas · limpieza · uniones y ventanas · JSON anidado · taller" }
  ],
  modules: [
    { id: 1, bloque: 1, title: "Bienvenida y retorno al caso", duration: "10 min" },
    { id: 2, bloque: 1, title: "Hadoop en Colab", duration: "10 min" },
    { id: 3, bloque: 1, title: "HDFS en la práctica", duration: "15 min" },
    { id: 4, bloque: 1, title: "Hadoop Streaming", duration: "25 min" },
    { id: 5, bloque: 1, title: "Lo que Hadoop resolvió y lo que no", duration: "10 min" },
    { id: 6, bloque: 1, title: "Spark: el ecosistema", duration: "15 min" },
    { id: 7, bloque: 1, title: "Arquitectura y RDD", duration: "20 min" },
    { id: 8, bloque: 2, title: "Transformaciones y DAG", duration: "15 min" },
    { id: 9, bloque: 2, title: "DataFrames y Spark SQL", duration: "15 min" },
    { id: 10, bloque: 2, title: "Leer con esquema", duration: "15 min" },
    { id: 11, bloque: 2, title: "Limpieza en Spark", duration: "20 min" },
    { id: 12, bloque: 2, title: "Agregar, unir y ventanas", duration: "10 min" },
    { id: 13, bloque: 2, title: "Eventos web en JSON", duration: "20 min" },
    { id: 14, bloque: 2, title: "Cierre y taller", duration: "10 min" }
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
      { nombre: 'Spark SQL y DataFrames', hoy: true, desc: 'Tablas distribuidas con esquema, consultables con SQL o con funciones de Python. Su optimizador, Catalyst, reescribe cada consulta antes de ejecutarla.', caso: 'La limpieza, las uniones y las ventanas de los módulos 10 a 12; en la sesión 3, la base de datos del caso.' },
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
      { nombre: 'SQL', hoy: true, desc: 'Consultas SQL sobre DataFrames y tablas del catálogo, con el mismo motor y el mismo optimizador.', caso: 'La consulta sobre la vista ventas_crudas del módulo 9; en la sesión 3, las de la base de datos.' },
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
      { nombre: 'Parquet', desc: 'Formato de archivo columnar y comprimido: cada consulta lee solo las columnas que necesita.', caso: 'Las tablas de la base de datos guadua, en la sesión 3.' },
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
    tipo: 'opcion', modulo: 3,
    pregunta: 'La carpeta <code>/guadua/crudo</code> quedó con permisos <code>750</code>. En un clúster con la configuración por defecto de HDFS, ¿qué tan protegidos quedan los datos crudos de los clientes?',
    pista: '¿Cómo sabe HDFS quién está pidiendo el archivo?',
    opciones: [
      { texto: 'Poco: con autenticación simple, HDFS cree el usuario que declara quien pide.', correcta: true, retro: 'Los permisos se aplican, pero confían en el nombre declarado: cualquiera con acceso a la red podría decir «soy root». Un clúster con datos personales necesita Kerberos para autenticar, además de autorización por tabla, cifrado y auditoría.' },
      { texto: 'Del todo: solo el dueño y su grupo pueden leerlos, y HDFS verifica quién es cada uno.', correcta: false, retro: 'Con autenticación simple, HDFS no verifica nada: cree el nombre que declara el cliente. Verificarlo es el trabajo de Kerberos.' },
      { texto: 'Del todo, porque además HDFS guarda cifrado cada bloque con una clave del dueño.', correcta: false, retro: 'HDFS no cifra por defecto: el cifrado en disco exige configurar zonas cifradas, y el de la red, TLS.' },
      { texto: 'Nada: en HDFS los permisos son solo informativos y ningún usuario se detiene por ellos.', correcta: false, retro: 'Detienen a cualquier usuario que no sea superusuario. En Colab no se nota porque root arrancó el NameNode y por eso es el superusuario de HDFS.' }
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
    tipo: 'opcion', modulo: 5,
    pregunta: 'Un modelo de aprendizaje automático recorre las mismas ventas veinte veces hasta converger, y los datos caben en la memoria del clúster. ¿Por qué Spark le saca tanta ventaja a MapReduce?',
    pista: '¿Dónde quedan los datos entre una pasada y la siguiente?',
    opciones: [
      { texto: 'Spark lee una vez y repite las pasadas en memoria; MapReduce vuelve al disco en cada una.', correcta: true, retro: 'Cada job de MapReduce lee su entrada de HDFS y escribe su salida con réplicas: veinte pasadas son veinte viajes al disco. Si los datos no cupieran en memoria, Spark perdería buena parte de su ventaja.' },
      { texto: 'Spark reparte cada pasada entre más núcleos que MapReduce, aunque el clúster sea el mismo.', correcta: false, retro: 'Los dos reparten el trabajo en tareas, una por núcleo a la vez. La diferencia está en dónde quedan los datos entre pasadas.' },
      { texto: 'Spark procesa todo en una sola partición y así se ahorra el shuffle de cada pasada.', correcta: false, retro: 'Spark también reparte en particiones y también hace shuffle cuando la operación lo exige; lo que evita es volver al disco.' },
      { texto: 'Spark comprime los resultados de cada pasada y MapReduce los guarda tal como salen.', correcta: false, retro: 'La compresión no es la diferencia: MapReduce escribe en HDFS, con tres réplicas, el resultado intermedio de cada pasada.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 8,
    pregunta: 'En medio de un conteo de palabras se cae el ejecutor que tenía dos de las cuatro particiones de un RDD. ¿Qué hace Spark?',
    pista: '¿Qué guarda Spark de cada RDD, además de sus datos?',
    opciones: [
      { texto: 'Recalcula solo esas dos particiones a partir del linaje.', correcta: true, retro: 'El linaje es la receta de cada partición: Spark repite los pasos que la produjeron y solo para lo que se perdió. Así tolera fallos sin replicar todo, como hace HDFS.' },
      { texto: 'Las recupera de las réplicas que guardó en otros ejecutores, como HDFS con sus bloques.', correcta: false, retro: 'Spark no replica las particiones en memoria: guarda la receta (el linaje) y recalcula lo perdido. Las réplicas son la estrategia de HDFS.' },
      { texto: 'Repite el trabajo completo desde el principio, con las cuatro particiones.', correcta: false, retro: 'No hace falta: el linaje le dice qué pasos produjeron cada partición, y recalcula solo las que se perdieron.' },
      { texto: 'Detiene el trabajo con un error, porque lo que estaba en memoria ya no se puede recuperar.', correcta: false, retro: 'Para eso guarda el linaje: los datos en memoria se pierden, pero la receta permite volver a calcularlos.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 9,
    pregunta: 'En HDFS, <code>ventas.csv</code> quedó en {{CIFRA:bloques_ventas}} bloques de 64 KB, pero Spark lo leyó en {{CIFRA:particiones_hdfs}} partición. ¿Qué explica la diferencia?',
    pista: '¿El bloque y la partición los decide el mismo sistema?',
    opciones: [
      { texto: 'Spark arma sus particiones por tamaño, y el archivo es demasiado pequeño para partirlo.', correcta: true, retro: 'Con {{CIFRA:bytes_ventas}} bytes no vale la pena repartir el trabajo. El bloque es cómo HDFS guarda el archivo; la partición, cómo Spark reparte el trabajo. Con un archivo grande habría muchas particiones.' },
      { texto: 'HDFS juntó sus bloques en uno solo al entregarle el archivo completo a Spark.', correcta: false, retro: 'Los bloques siguen igual en HDFS; lo que cambia es cómo Spark agrupa lo que lee en tareas.' },
      { texto: 'Spark solo puede usar una partición cuando lee un archivo guardado en HDFS.', correcta: false, retro: 'Con un archivo grande, Spark lo reparte en muchas particiones aunque venga de HDFS; este pesa menos de 200 KB.' },
      { texto: 'Es un error de configuración: Spark debería crear siempre una partición por cada bloque.', correcta: false, retro: 'No existe esa regla. Partición y bloque son cosas distintas, y no hace falta que coincidan.' }
    ]
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
    tipo: 'opcion', modulo: 12,
    pregunta: 'Para unir las {{CIFRA:filas_limpias}} ventas con el catálogo de {{CIFRA:productos}} productos, el código usa <code>F.broadcast</code> sobre el catálogo. ¿Qué se gana?',
    pista: '¿Cuál de las dos tablas tendría que viajar por la red en una unión normal?',
    opciones: [
      { texto: 'Copia el catálogo a cada ejecutor y une ahí, sin hacer shuffle de las ventas.', correcta: true, retro: 'Una unión normal reúne por llave las filas de las dos tablas, con un shuffle. Si una tabla es pequeña, es más barato copiarla completa a cada ejecutor y no mover la grande.' },
      { texto: 'Ordena las ventas por id_producto antes de unir, para que la unión sea más rápida.', correcta: false, retro: 'Ordenar exigiría mover las ventas entre particiones; la difusión justamente lo evita copiando la tabla pequeña.' },
      { texto: 'Guarda el catálogo en el disco para que no ocupe memoria en los ejecutores.', correcta: false, retro: 'Es al revés: el catálogo se copia en la memoria de cada ejecutor. Por eso solo conviene con tablas pequeñas.' },
      { texto: 'Une solo los productos que se vendieron y descarta del resultado los demás.', correcta: false, retro: 'Eso lo decide el tipo de unión (aquí, <code>how="left"</code> conserva todas las ventas). La difusión cambia cómo se une, no qué se une.' }
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
      clave: 'C · Tema 5.2', nombre: 'Preguntas de la gerencia con Spark', puntos: 20,
      foco: 'Mide si las agregaciones, uniones y ventanas en Spark responden preguntas de negocio y si cada resultado se <strong>lee</strong> en el informe.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Tabla mensual por ciudad y categoría correcta; cuatro preguntas respondidas, al menos una con unión y una con ventana, cada una con su lectura.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Tabla y preguntas correctas, pero falta la unión o la ventana, o alguna lectura es superficial.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Agregaciones con errores, o preguntas planteadas sin responder.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'No hay agregaciones en Spark.' }
      ]
    },
    {
      clave: 'D · CR1', nombre: 'Seguridad en las fases del dato', puntos: 20,
      foco: 'Mide si los controles de seguridad de la sesión se <strong>ejecutan</strong> y si el esquema muestra qué protege el dato en cada fase y por qué, de acuerdo con la Ley 1581 de 2012.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Huella del software verificada y permisos de HDFS aplicados en el notebook; esquema por fase completo, con el porqué de cada control y lo que le falta a la configuración de Colab para datos personales.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Los dos controles ejecutados, pero el esquema está incompleto o no explica el porqué.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Un solo control ejecutado, o un esquema sin controles que lo respalden.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'No hay controles de seguridad.' }
      ]
    },
    {
      clave: 'E · CR2', nombre: 'Integración y comunicación', puntos: 20,
      foco: 'Mide si el informe <strong>integra</strong> eventos web y ventas en una conclusión útil, declara lo que los datos no permiten concluir y se entiende sin leer el código.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Conclusión que combina ambas fuentes, con sus límites; informe claro, con cifras y unidades.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Ambas fuentes presentes, conexión débil; informe comprensible.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Fuentes analizadas por separado; informe confuso.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'Falta la integración o el informe.' }
      ]
    }
  ]
};
