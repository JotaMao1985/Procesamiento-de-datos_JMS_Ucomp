// ====================================================================
// Sesión 1 · Del dato al MapReduce
// Configuración, datos incrustados, simuladores, autoevaluaciones y rúbrica.
// Las cifras (marcadores CIFRA) y los datos (marcadores JSON) los inserta
// precalculo/construye_sesion1.py desde la ejecución real del código.
// ====================================================================
const courseData = {
  title: "Procesamiento de Datos",
  sesion: 1,
  bloques: [
    { id: 1, titulo: "Reconocimiento: del dato al ciclo de procesamiento", corto: "Reconocimiento", minutos: 75, breakDespues: 15,
      detalle: "Dato e información · el caso · las seis etapas · primera celda en Colab" },
    { id: 2, titulo: "Cloud computing y ecosistema Hadoop", corto: "Nube y Hadoop", minutos: 75, breakDespues: 30,
      detalle: "Escalar hacia los lados · la nube · HDFS y YARN · modelo MapReduce" },
    { id: 3, titulo: "Procesamiento de datos tabulares con pandas", corto: "Datos tabulares", minutos: 75, breakDespues: 15,
      detalle: "Repaso de Python · inspección · limpieza y calidad · resúmenes" },
    { id: 4, titulo: "MapReduce simple en Python y cierre", corto: "MapReduce", minutos: 75, breakDespues: 0,
      detalle: "map, filter y reduce · conteo de palabras · Streaming · taller" }
  ],
  modules: [
    { id: 1, bloque: 1, title: "Bienvenida y hoja de ruta", duration: "10 min" },
    { id: 2, bloque: 1, title: "Dato, información y conocimiento", duration: "15 min" },
    { id: 3, bloque: 1, title: "El caso y sus datos", duration: "10 min" },
    { id: 4, bloque: 1, title: "Las seis etapas", duration: "20 min" },
    { id: 5, bloque: 1, title: "El caso por etapas y Colab", duration: "20 min" },
    { id: 6, bloque: 2, title: "¿Por qué un computador no alcanza?", duration: "15 min" },
    { id: 7, bloque: 2, title: "Computación en la nube", duration: "20 min" },
    { id: 8, bloque: 2, title: "Ecosistema Hadoop", duration: "20 min" },
    { id: 9, bloque: 2, title: "MapReduce, ingesta y explotación", duration: "20 min" },
    { id: 10, bloque: 3, title: "Python para datos", duration: "10 min" },
    { id: 11, bloque: 3, title: "Cargar e inspeccionar", duration: "15 min" },
    { id: 12, bloque: 3, title: "Limpieza y calidad", duration: "30 min" },
    { id: 13, bloque: 3, title: "Transformar y resumir", duration: "20 min" },
    { id: 14, bloque: 4, title: "map, filter y reduce", duration: "10 min" },
    { id: 15, bloque: 4, title: "Conteo de palabras", duration: "20 min" },
    { id: 16, bloque: 4, title: "MapReduce y Streaming", duration: "25 min" },
    { id: 17, bloque: 4, title: "Cierre y taller", duration: "20 min" }
  ]
};

// ---- Datos incrustados (generados; no editar a mano) ----------------
const DATOS_CALIDAD = {{JSON:calidad}};
const RESENAS_CASO = {{JSON:resenas}};
const ARCHIVOS_CASO = {{JSON:archivos}};

// ---- Ayudantes de formato -------------------------------------------
const numeroCO = (n, dec = 0) => Number(n).toLocaleString('es-CO', {
  minimumFractionDigits: dec, maximumFractionDigits: dec
});

function duracionLegible(segundos) {
  if (segundos < 1) return `${numeroCO(segundos * 1000)} ms`;
  if (segundos < 10) return `${numeroCO(segundos, 1)} s`;
  const s = Math.round(segundos);
  if (s < 60) return `${s} s`;
  if (s < 3600) {
    const m = Math.floor(s / 60), r = s % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  }
  if (s < 86400 * 2) {
    const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${numeroCO(s / 86400, 1)} días`;
}

function tamanoLegible(gigabytes) {
  if (gigabytes >= 1000) return `${numeroCO(gigabytes / 1000, gigabytes >= 10000 || gigabytes % 1000 === 0 ? 0 : 1)} TB`;
  return `${numeroCO(gigabytes, 0)} GB`;
}

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ====================================================================
// Módulo 6 · Tiempo de lectura frente a número de nodos
// ====================================================================
SIMULADORES['tiempo-lectura'] = function (raiz) {
  const params = { exp: 3, k: 6, v: 100, c: 30 };
  const potencias = Array.from({ length: 11 }, (_, i) => 2 ** i);   // 1 … 1024 nodos

  crearControles(raiz.querySelector('.simulador-controles'), [
    { clave: 'exp', etiqueta: 'Tamaño de los datos', min: 0, max: 5, paso: 0.5, formato: x => tamanoLegible(10 ** x) },
    { clave: 'k', etiqueta: 'Nodos del clúster', min: 0, max: 10, paso: 1, formato: k => numeroCO(2 ** k) },
    { clave: 'v', etiqueta: 'Lectura por disco', min: 50, max: 500, paso: 10, formato: v => `${v} MB/s` },
    { clave: 'c', etiqueta: 'Costo fijo de coordinación', min: 0, max: 300, paso: 10, formato: c => `${c} s` }
  ], params, actualizar);

  const tiempo = n => (10 ** params.exp) * 1000 / (n * params.v) + (n > 1 ? params.c : 0);

  const grafico = crearGraficoLinea(raiz.querySelector('canvas'), potencias.map(String), [
    { label: 'Tiempo de lectura', data: [], borderColor: COLORES_GRAFICO.primario, backgroundColor: COLORES_GRAFICO.primario,
      borderWidth: 2.5, pointRadius: 3, tension: 0.25 },
    { label: 'Tu configuración', data: [], borderColor: COLORES_GRAFICO.secundario, backgroundColor: COLORES_GRAFICO.secundario,
      pointRadius: 8, pointHoverRadius: 9, showLine: false }
  ], {
    plugins: {
      legend: { labels: { font: { family: 'Roboto', size: 12 }, boxWidth: 18 } },
      tooltip: {
        backgroundColor: '#3A0F47',
        callbacks: {
          title: items => `${items[0].label} nodo${items[0].label === '1' ? '' : 's'}`,
          label: item => ` ${item.dataset.label}: ${duracionLegible(item.raw * 60)}`
        }
      }
    },
    scales: {
      x: { title: { display: true, text: 'Nodos (escala logarítmica)', font: { family: 'Roboto', size: 11 } },
        ticks: { font: { family: 'Fira Code', size: 11 } }, grid: { display: false } },
      y: { type: 'logarithmic', title: { display: true, text: 'Minutos (escala logarítmica)', font: { family: 'Roboto', size: 11 } },
        ticks: { font: { family: 'Fira Code', size: 10 }, callback: v => {
          const log = Math.log10(v);
          if (Math.abs(log - Math.round(log)) > 1e-9) return '';
          return v >= 1 ? numeroCO(v) : numeroCO(v, -Math.round(log));
        } },
        grid: { color: 'rgba(148, 163, 184, 0.2)' } }
    }
  });

  function actualizar() {
    const n = 2 ** params.k;
    grafico.data.datasets[0].data = potencias.map(p => tiempo(p) / 60);
    grafico.data.datasets[1].data = potencias.map(p => (p === n ? tiempo(p) / 60 : null));
    grafico.update();
    const t1 = tiempo(1), tn = tiempo(n);
    const campos = [
      { etiqueta: 'Datos:', valor: tamanoLegible(10 ** params.exp) },
      { etiqueta: '1 nodo:', valor: duracionLegible(t1) }
    ];
    if (n === 1) {
      campos.push({ etiqueta: 'Veredicto:', valor: 'un solo equipo, sin costo de coordinación; sube los nodos para comparar' });
    } else {
      campos.push(
        { etiqueta: `${numeroCO(n)} nodos:`, valor: duracionLegible(tn) },
        { etiqueta: 'Aceleración:', valor: tn < t1 ? `${numeroCO(t1 / tn, 1)} veces más rápido` : `${numeroCO(tn / t1, 1)} veces más lento` },
        { etiqueta: 'Veredicto:', valor: tn < t1 ? 'el clúster compensa' : 'más lento que un solo equipo' });
    }
    actualizarLectura(raiz.querySelector('.simulador-lectura'), campos);
  }
  actualizar();
  return [grafico];
};

// ====================================================================
// Módulo 7 · Pila de responsabilidad por modelo de servicio
// ====================================================================
SIMULADORES['responsabilidad-nube'] = function (raiz) {
  const capas = ['Datos', 'Aplicación', 'Entorno de ejecución (Python, Spark)', 'Middleware', 'Sistema operativo',
    'Virtualización', 'Servidores', 'Almacenamiento', 'Red y centro de datos'];
  const modelos = {
    onprem: { tuyas: 9, texto: '<strong>En casa:</strong> Guadua compra los servidores, los instala, pone Linux, Java, Hadoop y Spark, y paga energía, refrigeración y al administrador aunque el clúster pase medio mes apagado.' },
    iaas: { tuyas: 5, texto: '<strong>IaaS:</strong> Guadua alquila máquinas virtuales (por ejemplo, Amazon EC2 o Google Compute Engine) e instala y configura Hadoop y Spark por su cuenta. Paga por hora de máquina, pero sigue actualizando el sistema operativo y reparando el clúster.' },
    paas: { tuyas: 2, texto: '<strong>PaaS:</strong> Guadua crea un clúster gestionado (Amazon EMR, Google Cloud Dataproc, Azure HDInsight o Databricks), sube los datos y su código. El proveedor instala, escala y repara. Es el modelo más usado para Big Data.' },
    saas: { tuyas: 1, texto: '<strong>SaaS:</strong> Guadua usa un software terminado: una herramienta de BI en la nube, como Looker Studio o Power BI, para los tableros de la gerencia. Solo aporta sus datos y su configuración. (Google Colab queda en la frontera: como producto es un notebook listo para usar, pero el código lo escribe Guadua, como en un PaaS.)' }
  };
  const params = { modelo: 'iaas' };
  crearSelector(raiz.querySelector('.simulador-controles'), {
    clave: 'modelo', etiqueta: 'Modelo',
    opciones: [
      { valor: 'onprem', texto: 'En casa (on-premise)' },
      { valor: 'iaas', texto: 'IaaS · infraestructura como servicio' },
      { valor: 'paas', texto: 'PaaS · plataforma como servicio' },
      { valor: 'saas', texto: 'SaaS · software como servicio' }
    ]
  }, params, pintar);

  function pintar() {
    const m = modelos[params.modelo];
    raiz.querySelector('.pila').innerHTML = capas.map((capa, i) => {
      const tuya = i < m.tuyas;
      return `<div class="pila-capa ${tuya ? 'tu' : 'proveedor'}"><span>${capa}</span>` +
        `<span class="pila-quien">${tuya ? 'Tú' : 'Proveedor'}</span></div>`;
    }).join('');
    raiz.querySelector('.pila-ejemplo').innerHTML =
      `${m.texto} <br><span style="color:#64748b;">Administras ${m.tuyas} de ${capas.length} capas.</span>`;
  }
  pintar();
  return [];
};

// ====================================================================
// Módulo 8 · Piezas del ecosistema Hadoop
// ====================================================================
SIMULADORES['ecosistema'] = function (raiz) {
  const ecosistema = [
    { capa: 'Ingesta', piezas: [
      { nombre: 'Sqoop', desc: 'Transfiere tablas entre bases de datos relacionales y HDFS, por lotes. El proyecto se retiró en 2021 y hoy se reemplaza con Spark o con servicios de la nube, pero sigue en muchos sistemas existentes.', caso: 'Copiar cada noche las ventas de la base de datos de las cajas a HDFS.' },
      { nombre: 'Flume', desc: 'Recoge y mueve grandes volúmenes de registros (logs) desde muchos servidores hacia HDFS. Desde 2024 no tiene mantenimiento activo: hoy esa tarea la hacen Kafka u otros recolectores de logs, aunque sigue en muchos sistemas existentes.', caso: 'Reunir los logs de los servidores de la tienda web.' },
      { nombre: 'Kafka', desc: 'Plataforma distribuida de mensajería para flujos de eventos en tiempo real: unos sistemas publican eventos y otros los consumen.', caso: 'Recibir al instante cada evento de la app: búsquedas, carritos, pagos.' }
    ] },
    { capa: 'Almacenamiento', piezas: [
      { nombre: 'HDFS', nucleo: true, desc: 'Sistema de archivos distribuido: parte los archivos en bloques y replica cada bloque en varios nodos.', caso: 'Guardar años de ventas y de logs en un solo «disco» lógico repartido en el clúster.' },
      { nombre: 'HBase', desc: 'Base de datos NoSQL orientada a columnas sobre HDFS, para lecturas y escrituras rápidas por clave.', caso: 'Consultar en milisegundos el historial de compras de un cliente.' }
    ] },
    { capa: 'Recursos y coordinación', piezas: [
      { nombre: 'YARN', nucleo: true, desc: 'Reparte la CPU y la memoria del clúster entre las aplicaciones y lanza sus tareas en contenedores.', caso: 'Que el resumen nocturno de ventas y la consulta de un analista corran a la vez sin estorbarse.' },
      { nombre: 'ZooKeeper', desc: 'Servicio de coordinación: configuración compartida, elección de líder y sincronización entre nodos.', caso: 'Mantener de acuerdo a los servidores de Kafka y de HBase sobre quién hace qué.' }
    ] },
    { capa: 'Procesamiento', piezas: [
      { nombre: 'MapReduce', nucleo: true, desc: 'Modelo de procesamiento por lotes en dos fases, map y reduce, que escribe a disco entre una etapa y la siguiente.', caso: 'El total de ventas por ciudad del módulo 16, a escala de clúster.' },
      { nombre: 'Spark', desc: 'Motor de procesamiento en memoria, mucho más rápido que MapReduce para análisis de varias etapas, con interfaces para Python (PySpark), SQL, streaming y aprendizaje automático.', caso: 'Todo el procesamiento de la sesión 2.' },
      { nombre: 'Tez', desc: 'Motor que ejecuta una cadena de tareas como un grafo, sin escribir resultados intermedios a disco; Hive lo usa por debajo.', caso: 'Acelerar las consultas de Hive del equipo de analítica.' }
    ] },
    { capa: 'Consulta y análisis', piezas: [
      { nombre: 'Hive', desc: 'Permite consultar los datos de HDFS con un lenguaje parecido a SQL (HiveQL), que traduce a trabajos distribuidos.', caso: 'Que un analista que sabe SQL consulte las ventas sin escribir MapReduce.' },
      { nombre: 'Pig', desc: 'Lenguaje de scripts (Pig Latin) para flujos de transformación de datos; hoy en desuso frente a Spark.', caso: 'Scripts heredados de limpieza en un sistema antiguo.' },
      { nombre: 'Impala / Presto', desc: 'Motores de SQL interactivo sobre los datos del clúster, pensados para responder en segundos.', caso: 'Alimentar el tablero de ventas de la gerencia.' }
    ] },
    { capa: 'Orquestación', piezas: [
      { nombre: 'Oozie', desc: 'Programa y encadena trabajos de Hadoop en flujos: primero uno, después otro. El proyecto se retiró en 2025; hoy esa tarea la hace Apache Airflow.', caso: 'Cada noche: copiar ventas → limpiar → resumir → actualizar el tablero.' }
    ] }
  ];

  const contenedor = raiz.querySelector('.ecosistema');
  const detalle = raiz.querySelector('.eco-detalle');
  contenedor.innerHTML = ecosistema.map((capa, i) => `
    <div class="eco-capa">
      <span class="eco-capa-nombre">${capa.capa}</span>
      <div class="eco-piezas">${capa.piezas.map((p, j) =>
        `<button type="button" class="eco-pieza${p.nucleo ? ' nucleo' : ''}" aria-pressed="false" data-pieza="${i}-${j}">${p.nombre}${p.nucleo ? '<span class="sr-only"> (núcleo de Hadoop)</span>' : ''}</button>`
      ).join('')}</div>
    </div>`).join('');
  detalle.innerHTML = 'Pulsa una pieza para ver qué hace y dónde la usaría Tiendas Guadua.';

  contenedor.querySelectorAll('.eco-pieza').forEach(boton => {
    boton.addEventListener('click', () => {
      contenedor.querySelectorAll('.eco-pieza').forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
      const [i, j] = boton.dataset.pieza.split('-').map(Number);
      const p = ecosistema[i].piezas[j];
      detalle.innerHTML = `<strong>${p.nombre}</strong> · ${ecosistema[i].capa}${p.nucleo ? ' · núcleo de Hadoop' : ''}<br>` +
        `${p.desc}<br><em>En el caso Guadua:</em> ${p.caso}`;
    });
  });
  return [];
};

// ====================================================================
// Módulo 8 · Un archivo en HDFS: bloques, réplicas y nodos caídos
// ====================================================================
SIMULADORES['hdfs'] = function (raiz) {
  const COLORES_BLOQUE = ['#691E7A', '#B84A00', '#566B7F', '#0F766E', '#1D4ED8', '#9D174D', '#4D7C0F', '#7C2D12'];
  const params = { tam: 1000, bloque: '128', rep: 3, nodos: 5 };
  const caidos = new Set();
  const controles = raiz.querySelector('.simulador-controles');

  crearControles(controles, [
    { clave: 'tam', etiqueta: 'Tamaño del archivo', min: 100, max: 2000, paso: 50, formato: v => `${numeroCO(v)} MB` },
    { clave: 'rep', etiqueta: 'Factor de replicación', min: 1, max: 3, paso: 1 },
    { clave: 'nodos', etiqueta: 'DataNodes', min: 3, max: 8, paso: 1 }
  ], params, pintar);
  crearSelector(controles, {
    clave: 'bloque', etiqueta: 'Tamaño de bloque',
    opciones: [{ valor: '64', texto: '64 MB' }, { valor: '128', texto: '128 MB (por defecto)' }, { valor: '256', texto: '256 MB' }]
  }, params, pintar);

  function pintar() {
    const N = params.nodos, R = params.rep, B = parseInt(params.bloque, 10);
    [...caidos].forEach(n => { if (n >= N) caidos.delete(n); });
    const nBloques = Math.ceil(params.tam / B);
    const porNodo = Array.from({ length: N }, () => []);
    const copiasVivas = new Array(nBloques).fill(0);
    for (let b = 0; b < nBloques; b++) {
      for (let r = 0; r < R; r++) {
        const nodo = (b + r) % N;          // réplicas siempre en nodos distintos
        porNodo[nodo].push(b);
        if (!caidos.has(nodo)) copiasVivas[b]++;
      }
    }
    const perdidos = copiasVivas.filter(c => c === 0).length;
    const cortos = copiasVivas.filter(c => c > 0 && c < R).length;
    const vivas = copiasVivas.reduce((a, b) => a + b, 0);

    const rejilla = raiz.querySelector('.hdfs-nodos');
    rejilla.innerHTML = porNodo.map((bloques, n) => {
      const caido = caidos.has(n);
      return `<button type="button" class="hdfs-nodo${caido ? ' caido' : ''}" data-nodo="${n}"
          aria-label="DataNode ${n + 1}, ${caido ? 'apagado' : 'encendido'}, ${bloques.length} copias. Pulsa para ${caido ? 'encenderlo' : 'apagarlo'}.">
        <span class="hdfs-nodo-nombre">DataNode ${n + 1}<span class="hdfs-nodo-estado">${caido ? 'caído' : 'activo'}</span></span>
        <span class="hdfs-bloques" aria-hidden="true">${bloques.map(b =>
          `<span class="hdfs-bloque" style="background:${COLORES_BLOQUE[b % COLORES_BLOQUE.length]}">B${b + 1}</span>`).join('')}</span>
      </button>`;
    }).join('');
    rejilla.querySelectorAll('.hdfs-nodo').forEach(boton => {
      boton.addEventListener('click', () => {
        const n = Number(boton.dataset.nodo);
        if (caidos.has(n)) caidos.delete(n); else caidos.add(n);
        pintar();
        const nuevo = raiz.querySelector(`.hdfs-nodo[data-nodo="${n}"]`);
        if (nuevo) nuevo.focus();
      });
    });

    const ultimo = params.tam - (nBloques - 1) * B;
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Bloques:', valor: `${nBloques}${ultimo < B ? ` (el último de ${numeroCO(ultimo)} MB)` : ''}` },
      { etiqueta: 'Copias guardadas:', valor: `${nBloques * R}` },
      { etiqueta: 'Copias disponibles:', valor: `${vivas} de ${nBloques * R}` },
      { etiqueta: 'Espacio usado:', valor: `${numeroCO(params.tam * R)} MB` },
      { etiqueta: 'Nodos caídos:', valor: `${caidos.size} de ${N}` },
      { etiqueta: 'Archivo:', valor: perdidos
          ? `<span class="hdfs-perdidos">dañado: ${perdidos} bloque${perdidos === 1 ? '' : 's'} sin ninguna copia</span>`
          : cortos ? `completo, pero ${cortos} bloque${cortos === 1 ? '' : 's'} con menos de ${R} copias: el NameNode ordenaría copiarlo${cortos === 1 ? '' : 's'} de nuevo`
          : 'completo ✓' }
    ]);
  }
  pintar();
  return [];
};

// ====================================================================
// Módulo 12 · Tablero de calidad (64 combinaciones precalculadas)
// ====================================================================
SIMULADORES['calidad'] = function (raiz) {
  const pasos = DATOS_CALIDAD.pasos;
  const params = {};
  pasos.forEach(p => { params[p.clave] = false; });

  crearInterruptores(raiz.querySelector('.simulador-controles'),
    pasos.map(p => ({ clave: p.clave, etiqueta: `${p.etiqueta} · ${p.dimension}` })), params, pintar);

  const CANONICAS = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena'];
  const colorBarra = etiqueta => CANONICAS.includes(etiqueta) ? COLORES_GRAFICO.primario
    : (etiqueta === 'Sin dato' || etiqueta === '(vacío)' || etiqueta.startsWith('otras')) ? '#94a3b8'
      : COLORES_GRAFICO.secundario;

  const grafico = new Chart(raiz.querySelector('canvas'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Millones de pesos', data: [], backgroundColor: [], borderWidth: 0, barPercentage: 0.75 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#3A0F47', callbacks: { label: item => ` ${numeroCO(item.raw, 2)} millones` } }
      },
      scales: {
        x: { beginAtZero: true, ticks: { font: { family: 'Fira Code', size: 11 } }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
        y: { ticks: { font: { family: 'Roboto', size: 12 } }, grid: { display: false } }
      }
    }
  });

  const indicadores = [
    { clave: 'filas', etiqueta: 'filas', tipo: 'neutro' },
    { clave: 'duplicadas', etiqueta: 'filas duplicadas', tipo: 'cero' },
    { clave: 'vacias', etiqueta: 'celdas vacías', tipo: 'cero' },
    { clave: 'grafias_ciudad', etiqueta: 'grafías de ciudad (meta: 7)', tipo: 'max', max: 7 },
    { clave: 'grafias_canal', etiqueta: 'grafías de canal (meta: 3)', tipo: 'max', max: 3 },
    { clave: 'precios_malos', etiqueta: 'precios no numéricos', tipo: 'cero' },
    { clave: 'fechas_malas', etiqueta: 'fechas sin interpretar', tipo: 'cero' },
    { clave: 'fuera_rango', etiqueta: 'cantidades fuera de rango', tipo: 'cero' }
  ];

  function pintar() {
    const mascara = pasos.reduce((m, p, i) => m + (params[p.clave] ? 2 ** i : 0), 0);
    const d = DATOS_CALIDAD.combinaciones[String(mascara)];
    raiz.querySelector('.indicadores').innerHTML = indicadores.map(ind => {
      const v = d[ind.clave];
      const mal = (ind.tipo === 'cero' && v > 0) || (ind.tipo === 'max' && v > ind.max);
      const bien = (ind.tipo === 'cero' && v === 0) || (ind.tipo === 'max' && v <= ind.max);
      const estado = mal ? '<span class="sr-only"> (problema)</span> ⚠' : bien ? '<span class="sr-only"> (en la meta)</span> ✓' : '';
      return `<div class="indicador${mal ? ' alerta' : bien ? ' ok' : ''}">
        <span class="indicador-valor">${numeroCO(v)}${estado}</span><span class="indicador-etiqueta">${ind.etiqueta}</span></div>`;
    }).join('');

    grafico.data.labels = d.barras.map(b => b[0]);
    grafico.data.datasets[0].data = d.barras.map(b => b[1]);
    grafico.data.datasets[0].backgroundColor = d.barras.map(b => colorBarra(b[0]));
    grafico.update();

    const activos = pasos.filter(p => params[p.clave]).length;
    const barra = (dd, c) => (dd.barras.find(b => b[0] === c) || [0, 0])[1];
    const conTexto = DATOS_CALIDAD.combinaciones[String(mascara | 2)];   // el mismo estado + «Estandarizar texto»
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Pasos activos:', valor: `${activos} de ${pasos.length}` },
      { etiqueta: 'Bogotá fuera de su barra:', valor: params.texto ? '0 (texto estandarizado)' : `${numeroCO(barra(conTexto, 'Bogotá') - barra(d, 'Bogotá'), 2)} millones en otras grafías` },
      { etiqueta: 'Total vendido:', valor: `${numeroCO(d.total_millones, 2)} millones` },
      { etiqueta: 'Filas que aportan al total:', valor: `${numeroCO(d.filas_con_total)} de ${numeroCO(d.filas)}` }
    ]);
  }
  pintar();
  return [grafico];
};

// ====================================================================
// Módulo 15 · MapReduce paso a paso
// ====================================================================
SIMULADORES['mapreduce'] = function (raiz) {
  const TEXTO_INICIAL = [
    'la entrega fue rápida y el pedido llegó completo',
    'el pedido llegó tarde y la app se demora',
    'la app es fácil y la entrega llega a tiempo',
    'buen precio y entrega rápida'
  ].join('\n');
  const MAX_FICHAS = 80;
  const params = { mappers: 2, reducers: 2, combiner: false };
  const area = raiz.querySelector('textarea');
  area.value = TEXTO_INICIAL;

  const controles = raiz.querySelector('.simulador-controles');
  crearControles(controles, [
    { clave: 'mappers', etiqueta: 'Mappers', min: 1, max: 4, paso: 1 },
    { clave: 'reducers', etiqueta: 'Reducers', min: 1, max: 3, paso: 1 }
  ], params, pintar);
  crearInterruptores(controles, [{ clave: 'combiner', etiqueta: 'Usar combiner' }], params, pintar);
  area.addEventListener('input', pintar);

  // Hash determinista de un texto (el mismo en cada carga)
  const hash = palabra => [...palabra].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
  const particion = palabra => hash(palabra) % params.reducers;
  const ficha = (clave, valor) => `<span class="mr-par r${particion(clave)}">(${escaparHTML(clave)}, ${valor})</span>`;
  const recortar = (fichas) => fichas.length > MAX_FICHAS
    ? fichas.slice(0, MAX_FICHAS).join('') + `<span class="mr-par">+${fichas.length - MAX_FICHAS} más</span>`
    : fichas.join('');

  const grafico = crearGraficoBarras(raiz.querySelector('canvas'), [], [], { etiqueta: 'Pares recibidos', min: 0, max: 1 });
  grafico.options.plugins.legend.display = false;

  function pintar() {
    const lineas = area.value.split('\n').map(l => l.trim()).filter(Boolean);
    const M = params.mappers, R = params.reducers;
    const asignadas = Array.from({ length: M }, () => []);
    lineas.forEach((l, i) => asignadas[i % M].push(l));

    // MAP (+ COMBINER opcional)
    let emitidos = 0;
    const salidaMap = asignadas.map(ls => {
      const pares = [];
      ls.forEach(l => (l.toLowerCase().match(/[a-záéíóúüñ]+/g) || []).forEach(p => pares.push([p, 1])));
      emitidos += pares.length;
      if (!params.combiner) return pares;
      const local = new Map();
      pares.forEach(([p]) => local.set(p, (local.get(p) || 0) + 1));
      return [...local.entries()];
    });

    // SHUFFLE: cada par va al reducer de su partición; allí se agrupa y ordena
    const recibidos = new Array(R).fill(0);
    const grupos = Array.from({ length: R }, () => new Map());
    salidaMap.forEach(pares => pares.forEach(([p, v]) => {
      const r = particion(p);
      recibidos[r]++;
      if (!grupos[r].has(p)) grupos[r].set(p, []);
      grupos[r].get(p).push(v);
    }));
    const ordenados = grupos.map(g => [...g.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')));

    const columna = (titulo, extra, cajas) =>
      `<div class="mr-fase"><div class="mr-fase-titulo"><span>${titulo}</span><span>${extra}</span></div>${cajas}</div>`;
    const caja = (titulo, contenido) => `<div class="mr-caja"><div class="mr-caja-titulo">${titulo}</div>${contenido}</div>`;

    const entrada = asignadas.map((ls, m) => caja(`Mapper ${m + 1}`,
      ls.length ? ls.map(l => `<p class="mr-texto">${escaparHTML(l)}</p>`).join('') : '<p class="mr-texto">(sin líneas)</p>')).join('');
    const mapa = salidaMap.map((pares, m) => caja(`Mapper ${m + 1} · ${pares.length} pares`,
      `<div class="mr-pares">${recortar(pares.map(([p, v]) => ficha(p, v)))}</div>`)).join('');
    const barajado = ordenados.map((grupo, r) => caja(`Reducer ${r + 1} recibe`,
      `<div class="mr-pares">${recortar(grupo.map(([p, vs]) =>
        `<span class="mr-par r${r}">${escaparHTML(p)} → [${vs.join(', ')}]</span>`))}</div>`)).join('');
    const reduccion = ordenados.map((grupo, r) => caja(`Reducer ${r + 1} emite`,
      `<div class="mr-pares">${recortar(grupo.map(([p, vs]) =>
        `<span class="mr-par r${r}">${escaparHTML(p)}: ${vs.reduce((a, b) => a + b, 0)}</span>`))}</div>`)).join('');

    raiz.querySelector('.mr-flujo').innerHTML =
      columna('1 · Entrada', `${lineas.length} línea${lineas.length === 1 ? '' : 's'}`, entrada) +
      columna('2 · Map', params.combiner ? 'con combiner' : 'sin combiner', mapa) +
      columna('3 · Shuffle y orden', `hash mod ${R}`, barajado) +
      columna('4 · Reduce', `${grupos.reduce((a, g) => a + g.size, 0)} claves`, reduccion);

    const viajan = recibidos.reduce((a, b) => a + b, 0);
    const maxR = recibidos.indexOf(Math.max(...recibidos));
    actualizarLectura(raiz.querySelector('.simulador-lectura'), [
      { etiqueta: 'Palabras leídas:', valor: `${emitidos}` },
      { etiqueta: 'Pares que viajan por la red:', valor: `${viajan}${params.combiner && emitidos ? ` (${numeroCO(100 * (1 - viajan / emitidos))} % menos)` : ''}` },
      { etiqueta: 'Palabras distintas:', valor: `${grupos.reduce((a, g) => a + g.size, 0)}` },
      { etiqueta: 'Reducer más cargado:', valor: viajan ? `R${maxR + 1} (${recibidos[maxR]} par${recibidos[maxR] === 1 ? '' : 'es'})` : '—' }
    ]);

    grafico.data.labels = recibidos.map((_, r) => `Reducer ${r + 1}`);
    grafico.data.datasets[0].data = recibidos;
    grafico.data.datasets[0].backgroundColor = recibidos.map((_, r) => ['#691E7A', '#F46201', '#566B7F'][r]);
    grafico.update();
  }
  pintar();
  return [grafico];
};

// ====================================================================
// Autoevaluaciones
// ====================================================================
AUTOEVALUACIONES['diagnostico'] = [
  {
    tipo: 'opcion', modulo: 2,
    pregunta: 'En la fila <code>V00002</code> de <code>ventas.csv</code>, el valor <code>3</code> de la columna <code>cantidad</code> es…',
    pista: 'Pregúntate si ese 3, solo, responde alguna pregunta de negocio.',
    opciones: [
      { texto: 'Un dato.', correcta: true, retro: 'Es un hecho registrado sin interpretación: tres unidades en una venta. Solo dice algo cuando se pone en contexto con otros datos.' },
      { texto: 'Información.', correcta: false, retro: 'Sería información si respondiera una pregunta en contexto, como el promedio de unidades por venta en Barranquilla. Un valor aislado todavía es un dato.' },
      { texto: 'Conocimiento.', correcta: false, retro: 'El conocimiento explica o anticipa: por qué pasa algo o qué pasará. Un número suelto no explica nada.' },
      { texto: 'Una decisión.', correcta: false, retro: 'Una decisión es una acción tomada con base en el conocimiento; aquí solo hay un registro.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 2,
    pregunta: '«En junio, el {{CIFRA:app_jun}} % de las ventas entró por la app». Esta frase es…',
    pista: '¿La frase explica por qué ocurre, o solo dice cuánto?',
    opciones: [
      { texto: 'Información.', correcta: true, retro: 'Son datos agregados y puestos en contexto que responden «cuánto». No explican por qué ocurre ni qué pasará después.' },
      { texto: 'Un dato.', correcta: false, retro: 'Ya no es un registro suelto: resume miles de ventas de un mes. Para llegar ahí hubo que procesar.' },
      { texto: 'Conocimiento.', correcta: false, retro: 'Para ser conocimiento tendría que explicar o anticipar, por ejemplo «la app crece porque los domicilios llegan más rápido», con evidencia que lo respalde.' },
      { texto: 'Una opinión.', correcta: false, retro: 'Es una cifra verificable que sale de los datos, no una opinión.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 2,
    pregunta: 'Un analista afirma: «Cuando llueve, las ventas de la tienda física bajan y las de la app suben, porque los clientes prefieren el domicilio; así ocurrió en cada temporada de lluvias de los últimos tres años». Esta frase es…',
    pista: '¿La frase solo dice qué o cuánto pasó, o también explica por qué y permite anticipar?',
    opciones: [
      { texto: 'Conocimiento.', correcta: true, retro: 'Explica por qué ocurre (los clientes prefieren el domicilio) y permite anticipar la próxima temporada de lluvias, con evidencia de varios años. Con ella se puede decidir, por ejemplo, reforzar los domicilios antes de que llueva.' },
      { texto: 'Información.', correcta: false, retro: 'La información dice qué o cuánto pasó; esta frase va más allá: explica la causa y permite anticipar lo que viene.' },
      { texto: 'Un dato.', correcta: false, retro: 'Un dato es un registro suelto, como una venta; esta frase resume y explica muchos registros de varios años.' },
      { texto: 'Una decisión.', correcta: false, retro: 'Una decisión es una acción, como reforzar los domicilios antes de las lluvias; la frase da el fundamento para tomarla, pero no la toma.' }
    ]
  },
  {
    tipo: 'multiple', modulo: 3,
    pregunta: '¿Cuáles de estas fuentes son datos <strong>no estructurados</strong>? Marca todas.',
    pista: 'No estructurado significa que no hay campos que leer: hay que procesar el contenido para extraer algo.',
    opciones: [
      { texto: 'Las reseñas escritas por los clientes.', correcta: true, retro: 'Texto libre: no hay columnas dentro del texto, hay que interpretarlo.' },
      { texto: 'Las grabaciones de llamadas al servicio al cliente.', correcta: true, retro: 'Audio: para analizarlo primero hay que transcribirlo.' },
      { texto: 'Las fotos de las facturas de los proveedores.', correcta: true, retro: 'Imágenes: los valores están «dibujados» y hay que extraerlos, por ejemplo con reconocimiento de texto.' },
      { texto: 'El archivo <code>ventas.csv</code>.', correcta: false, retro: 'Es estructurado: todas las filas tienen las mismas columnas con el mismo significado.' },
      { texto: 'El archivo <code>logs_web.jsonl</code>.', correcta: false, retro: 'Es semiestructurado: cada evento nombra sus campos, aunque no todos tengan los mismos.' }
    ],
    retroFallo: 'Son no estructuradas las reseñas, las grabaciones y las fotos de facturas; el CSV es estructurado y el JSON, semiestructurado.'
  },
  {
    tipo: 'opcion', modulo: 2,
    pregunta: 'En procesamiento de datos, «basura entra, basura sale» quiere decir que…',
    pista: 'Piensa en qué le pasa a un promedio si una venta se cargó dos veces.',
    opciones: [
      { texto: 'si la entrada tiene errores, los resultados los heredan aunque el cálculo esté bien.', correcta: true, retro: 'Exacto: un procesamiento impecable sobre datos con errores produce resultados con errores, y con apariencia de verdad.' },
      { texto: 'hay que borrar los datos antiguos antes de procesar, porque ya no sirven.', correcta: false, retro: 'La antigüedad de un dato no lo convierte en basura; el problema es la calidad, no la edad.' },
      { texto: 'los algoritmos complejos detectan y corrigen solos los errores de los datos.', correcta: false, retro: 'Es justo al revés: ningún algoritmo sabe que «bogota» y «Bogotá D.C.» son la misma ciudad si nadie se lo dice.' },
      { texto: 'la salida siempre tiene más errores que la entrada, porque el cálculo los multiplica.', correcta: false, retro: 'No necesariamente más: tiene los mismos, pero ahora escondidos dentro de un total o de un gráfico.' }
    ]
  }
];

AUTOEVALUACIONES['control-b2'] = [
  {
    tipo: 'opcion', modulo: 7,
    pregunta: 'Guadua quiere procesar sus ventas con Spark sin instalar ni mantener servidores, y pagando solo las horas de uso. Un clúster gestionado como Amazon EMR o Google Cloud Dataproc es un servicio…',
    pista: 'Fíjate en hasta qué capa de la pila llega lo que administra Guadua: ¿instala Spark o solo lo usa?',
    opciones: [
      { texto: 'PaaS.', correcta: true, retro: 'El proveedor entrega la plataforma (Hadoop y Spark instalados y mantenidos); Guadua aporta datos y código.' },
      { texto: 'IaaS.', correcta: false, retro: 'En IaaS Guadua alquilaría máquinas virtuales y tendría que instalar y reparar Hadoop y Spark por su cuenta.' },
      { texto: 'SaaS.', correcta: false, retro: 'SaaS es una aplicación terminada para el usuario final, como una herramienta de BI en la nube. Aquí Guadua todavía programa su procesamiento.' },
      { texto: 'On-premise.', correcta: false, retro: 'On-premise significa servidores propios en las instalaciones de la empresa: lo contrario de lo que pide Guadua.' }
    ]
  },
  {
    tipo: 'numerica', modulo: 8,
    pregunta: 'Un archivo de 1.000 MB se guarda en HDFS con bloques de 128 MB y factor de replicación 3. ¿Cuántas réplicas de bloque guarda el clúster en total, contando todas las copias de cada bloque?',
    pista: 'Primero los bloques: 1.000 / 128 no es exacto y el sobrante también necesita su bloque. Después, recuerda que el factor de replicación ya cuenta todas las copias.',
    respuesta: 24, tolerancia: 0, unidad: 'réplicas',
    retroAcierto: '⌈1.000 / 128⌉ = 8 bloques (el último, de 104 MB, no ocupa los 128) y 3 réplicas de cada uno: 24.',
    retroFallo: 'Son ⌈1.000 / 128⌉ = 8 bloques y 3 réplicas de cada uno: 24. Errores frecuentes: 21 (redondear hacia abajo a 7 bloques; los 104 MB que sobran también necesitan su bloque), 16 (contar solo 2 copias «además del original»: el factor 3 ya las incluye todas) y 8 (olvidar la replicación).'
  },
  {
    tipo: 'opcion', modulo: 9,
    pregunta: 'En MapReduce, ¿en qué fase viajan necesariamente por la red los pares clave–valor que emiten los mappers?',
    pista: 'Los mappers trabajan sobre el bloque que tienen en su propio nodo. ¿Cuándo se juntan las claves que vienen de distintos nodos?',
    opciones: [
      { texto: 'En el shuffle.', correcta: true, retro: 'Es la fase en que los pares intermedios salen del nodo que los produjo y viajan al reducer de su partición. Por eso el combiner, que reduce lo que viaja, ahorra tanto.' },
      { texto: 'En el map.', correcta: false, retro: 'Cada tarea map lee, en lo posible, el bloque que está en su propio nodo: es la localidad de datos.' },
      { texto: 'En el reduce.', correcta: false, retro: 'El reduce trabaja con lo que ya le llegó; el viaje ocurrió antes.' },
      { texto: 'En la lectura de la entrada.', correcta: false, retro: 'YARN intenta ejecutar cada tarea map donde HDFS tiene el bloque, justamente para no mover la entrada.' }
    ]
  }
];

// Gráfico de la pregunta 8 del cierre: el total por grafía SIN limpiar
function graficoGrafiasSinLimpiar(canvas) {
  const barras = DATOS_CALIDAD.combinaciones['0'].barras;
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: barras.map(b => b[0]),
      datasets: [{ data: barras.map(b => b[1]), backgroundColor: COLORES_GRAFICO.primario, borderWidth: 0 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: 'Millones de pesos' }, ticks: { font: { family: 'Fira Code', size: 10 } } },
        y: { ticks: { font: { family: 'Roboto', size: 11 } }, grid: { display: false } }
      }
    }
  });
}

AUTOEVALUACIONES['cierre'] = [
  {
    tipo: 'opcion', modulo: 4,
    pregunta: 'Las {{CIFRA:fuera_rango}} ventas con cantidades imposibles (de {{CIFRA:cantidad_min}} a {{CIFRA:cantidad_max}} unidades) no se borran: se apartan en una tabla de cuarentena para que el negocio las revise. ¿En qué etapa del ciclo ocurre y qué control de seguridad aplica?',
    pista: '¿La acción cambia qué registros se consideran válidos, o solo los carga, los calcula o los guarda? ¿Y para qué sirve conservar lo apartado?',
    opciones: [
      { texto: 'Preparación; trazabilidad de cada decisión de limpieza.', correcta: true, retro: 'Se está validando qué filas sirven (preparación), y apartar en lugar de borrar deja rastro de cada decisión: cualquiera puede auditar qué se excluyó y por qué.' },
      { texto: 'Introducción; control de acceso a quien carga los datos.', correcta: false, retro: 'El control de acceso protege la carga al sistema, pero aquí no se está cargando: se está decidiendo qué registros son válidos, y eso es preparar.' },
      { texto: 'Almacenamiento; copia de respaldo de los datos originales.', correcta: false, retro: 'La cuarentena se guarda, pero no es un respaldo del archivo: su propósito es que se pueda auditar la limpieza.' },
      { texto: 'Procesamiento; verificación cruzada de los resultados.', correcta: false, retro: 'La verificación cruzada compara un resultado calculado por dos caminos; aquí todavía no se ha calculado nada, se están validando filas.' }
    ]
  },
  {
    tipo: 'multiple', modulo: 4,
    pregunta: '¿Cuáles de estos son principios de la Ley 1581 de 2012 para el tratamiento de datos personales? Marca todos.',
    pista: 'Piensa en lo que la ley le exige a quien trata los datos de los clientes de Guadua, no en lo que le convendría a la empresa.',
    opciones: [
      { texto: 'Finalidad: los datos se usan solo para lo que se le informó al titular.', correcta: true, retro: 'Es un principio de la ley: Guadua no puede usar los datos de un cliente para un fin distinto del que le informó.' },
      { texto: 'Veracidad o calidad: la información debe ser veraz, completa, exacta y actualizada.', correcta: true, retro: 'Es un principio de la ley: la calidad del dato también es un deber legal, no solo técnico.' },
      { texto: 'Acceso y circulación restringida: solo acceden las personas autorizadas.', correcta: true, retro: 'Es un principio de la ley: los datos no se publican ni se comparten con quien no está autorizado.' },
      { texto: 'Libre circulación: una vez recogidos, los datos pueden compartirse con aliados comerciales.', correcta: false, retro: 'Es lo contrario de la ley: compartirlos exige autorización del titular para esa finalidad (principios de libertad, finalidad y circulación restringida).' },
      { texto: 'Autorización tácita: si el cliente compra, se entiende que acepta cualquier uso de sus datos.', correcta: false, retro: 'La ley exige que el titular autorice de forma previa e informada, y para una finalidad concreta (principios de libertad y finalidad): comprar no autoriza cualquier uso.' }
    ],
    retroFallo: 'Son principios de la ley la finalidad, la veracidad o calidad y el acceso y circulación restringida. La «libre circulación» y la «autorización tácita» contradicen los principios de libertad y de circulación restringida.'
  },
  {
    tipo: 'numerica', modulo: 6,
    pregunta: 'Leer 1 TB (1.000.000 MB) a 100 MB/s con un solo disco toma 10.000 segundos. Con 100 nodos leyendo en paralelo y un costo fijo de coordinación de 30 segundos, ¿cuántos segundos toma?',
    pista: 'Usa $$T(n) = \\frac{D}{n \\cdot v} + c$$',
    respuesta: 130, tolerancia: 0, unidad: 's',
    retroAcierto: '10.000 / 100 = 100 segundos de lectura, más 30 de coordinación: 130 s. De casi tres horas a poco más de dos minutos.',
    retroFallo: 'Es 1.000.000 / (100 × 100) + 30 = 100 + 30 = 130 s. El costo de coordinación se suma una vez, no por nodo.'
  },
  {
    tipo: 'opcion', modulo: 7,
    pregunta: '¿Qué característica esencial de la nube permite crear un clúster de 50 nodos para el cierre de mes y apagarlo al terminar?',
    pista: 'Pagar solo lo que se usa y poder cambiar de tamaño son dos características distintas: ¿cuál de las dos describe la pregunta?',
    opciones: [
      { texto: 'Elasticidad rápida.', correcta: true, retro: 'Los recursos se aprovisionan y liberan en minutos según la demanda.' },
      { texto: 'Servicio medido.', correcta: false, retro: 'Explica que solo pagues lo que usaste, pero no la capacidad de crecer y decrecer: van de la mano, pero son distintas.' },
      { texto: 'Amplio acceso por red.', correcta: false, retro: 'Se refiere a poder usar el servicio desde cualquier dispositivo conectado.' },
      { texto: 'Recursos compartidos.', correcta: false, retro: 'Describe cómo el proveedor atiende a muchos clientes con la misma infraestructura.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 8,
    pregunta: 'Con factor de replicación 3, se apagan dos DataNodes a la vez. ¿Qué le pasa a un archivo guardado en el clúster?',
    pista: '¿Cuántos nodos tendrían que caer a la vez para que un bloque se quede sin ninguna copia?',
    opciones: [
      { texto: 'Sigue completo: de cada bloque queda al menos una copia.', correcta: true, retro: 'Las tres copias están en nodos distintos, así que dos caídas dejan al menos una viva; HDFS vuelve a replicar hasta recuperar las tres.' },
      { texto: 'Se pierden los bloques que estaban en esos dos nodos.', correcta: false, retro: 'Esos bloques tienen una tercera copia en otro nodo: no se pierden.' },
      { texto: 'Se pierde todo el archivo.', correcta: false, retro: 'Para perder un bloque tendrían que caer los tres nodos que guardan sus copias. Pruébalo en el simulador del módulo 8.' },
      { texto: 'Depende del tamaño del archivo.', correcta: false, retro: 'El tamaño cambia cuántos bloques hay, no cuántas copias tiene cada uno.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 11,
    pregunta: 'Al ejecutar <code>ventas.info()</code>, la columna <code>precio_unitario</code> aparece como <code>object</code> (en pandas 3, <code>str</code>), aunque debería ser numérica. ¿Qué indica?',
    pista: 'pandas elige un solo tipo para toda la columna.',
    opciones: [
      { texto: 'Que al menos un valor no se pudo leer como número, y toda la columna quedó como texto.', correcta: true, retro: 'Basta un <code>$3.100</code> para que toda la columna quede como texto. Por eso hay que convertirla explícitamente.' },
      { texto: 'Que los precios tienen decimales y pandas no sabe qué separador usar.', correcta: false, retro: 'Los decimales con punto se leen sin problema como <code>float64</code>; el problema es algún valor que no es un número.' },
      { texto: 'Que la columna tiene vacíos, y pandas guarda como texto cualquier columna que esté incompleta.', correcta: false, retro: 'Los vacíos en una columna numérica dan <code>float64</code> con <code>NaN</code>, no texto.' },
      { texto: 'Que pandas no reconoce la moneda colombiana y guarda los pesos como texto.', correcta: false, retro: 'pandas no sabe de monedas; el problema es el formato del texto (signo y puntos), no el país.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 15,
    pregunta: 'Al contar las palabras de las {{CIFRA:resenas}} reseñas, la más frecuente es «{{CIFRA:palabra_top}}», con {{CIFRA:palabra_top_n}} apariciones. ¿Qué conviene hacer antes de llevarle el conteo a la gerencia?',
    pista: '¿Qué tipo de palabra es «{{CIFRA:palabra_top}}»? ¿Le dice algo a la gerencia sobre sus tiendas?',
    opciones: [
      { texto: 'Quitar las palabras vacías, como artículos y preposiciones, que abundan en cualquier texto.', correcta: true, retro: 'Sin ellas aparece lo que sí dicen los clientes: «{{CIFRA:palabra_util_top}}» encabeza la lista con {{CIFRA:palabra_util_top_n}} apariciones, seguida de la app, el pedido y el domicilio. Es el primer paso para cruzar lo que dicen los clientes con lo que muestran las ventas.' },
      { texto: 'Nada: la palabra más frecuente es, por definición, el tema principal del que hablan las reseñas.', correcta: false, retro: '«{{CIFRA:palabra_top}}» es un artículo: aparece en casi cualquier frase en español. Frecuencia no es relevancia.' },
      { texto: 'Quitar las reseñas más cortas, porque tienen pocas palabras y distorsionan el conteo.', correcta: false, retro: 'Una reseña corta también es una opinión; borrarla pierde información. El ruido está en las palabras sin contenido, no en la longitud del texto.' },
      { texto: 'Contar solo las reseñas con calificación 5, que son las más confiables del archivo.', correcta: false, retro: 'La calificación no mide confiabilidad, y descartar las negativas ocultaría justo las quejas que más le interesan a la gerencia.' }
    ]
  },
  {
    tipo: 'grafico', modulo: 12, alto: 260,
    descripcionGrafico: 'Total vendido por cada forma en que aparece escrita la ciudad, sin limpiar',
    pregunta: 'Este gráfico muestra el total vendido por ciudad tal como viene en el archivo, sin limpiar. ¿Por qué es engañoso?',
    pista: 'Lee las etiquetas del eje vertical con atención.',
    dibujar: graficoGrafiasSinLimpiar,
    opciones: [
      { texto: 'Una misma ciudad aparece en varias barras (Bogotá, Bogota, bogota…), así que ninguna muestra su total real.', correcta: true, retro: 'Mientras no se unifiquen las grafías, cada ciudad se reparte en varias barras. Y no es lo único: este gráfico tampoco quitó duplicados ni cantidades imposibles; por eso Barranquilla aparece segunda, cuando con los datos limpios queda cuarta. Compruébalo en el tablero del módulo 12.' },
      { texto: 'Faltan ciudades: solo aparecen las que más venden, y las demás se perdieron al leer el archivo.', correcta: false, retro: 'Están todas; lo que sobran son grafías. Lee las etiquetas: varias barras son la misma ciudad.' },
      { texto: 'Las barras van de mayor a menor, cuando deberían ir en orden alfabético para poder comparar las ciudades.', correcta: false, retro: 'El orden de mayor a menor es el adecuado para comparar; el problema está en las etiquetas.' },
      { texto: 'Los totales están en millones de pesos y no en pesos, así que las diferencias entre ciudades se ven más pequeñas.', correcta: false, retro: 'La unidad no cambia las proporciones entre las barras; el problema está en las etiquetas, no en la escala.' }
    ]
  },
  {
    tipo: 'opcion', modulo: 14,
    pregunta: '¿Por qué el promedio del ticket no se puede calcular en MapReduce promediando los promedios de cada bloque?',
    pista: 'Imagina un bloque con 10 ventas y otro con 1.000.',
    opciones: [
      { texto: 'Porque los bloques tienen distinto número de ventas: se reducen suma y conteo, y se divide al final.', correcta: true, retro: 'La suma y el conteo se pueden combinar por partes; el promedio no, porque un bloque de 10 ventas pesaría lo mismo que uno de 1.000. Por eso solo las operaciones asociativas, como la suma, sirven para combinar resultados parciales.' },
      { texto: 'Porque cada promedio parcial se redondea, y esos pequeños errores de redondeo se acumulan al combinarlos.', correcta: false, retro: 'Aunque no se redondeara nada, el promedio de promedios seguiría mal: el problema es que los bloques tienen distinto número de ventas.' },
      { texto: 'Porque el promedio exige ordenar todas las ventas, y cada bloque llega desordenado.', correcta: false, retro: 'Ordenar hace falta para la mediana, no para el promedio.' },
      { texto: 'Porque MapReduce solo sabe sumar enteros, y un promedio casi siempre tiene decimales.', correcta: false, retro: 'Un reducer puede ejecutar cualquier cálculo; el límite es de matemática, no de la herramienta.' }
    ]
  },
  {
    tipo: 'multiple', modulo: 16,
    pregunta: 'Sobre la tubería <code>cat ventas_limpias.csv | python mapper.py | sort | python reducer.py</code>, marca lo correcto.',
    pista: 'Piensa en qué garantiza <code>sort</code> y en cómo decide el reducer que terminó una clave.',
    opciones: [
      { texto: '<code>sort</code> hace el papel del shuffle: deja juntas las líneas de la misma clave.', correcta: true, retro: 'Sin ese orden, las líneas de una misma ciudad llegarían separadas.' },
      { texto: 'El reducer solo funciona si recibe las líneas ordenadas por clave.', correcta: true, retro: 'Imprime el total de una clave cuando ve aparecer la siguiente: si la clave volviera a aparecer más adelante, imprimiría dos totales parciales para la misma ciudad.' },
      { texto: 'El mapper tiene que leer todo el archivo antes de emitir algo.', correcta: false, retro: 'Emite línea por línea; por eso puede procesar archivos más grandes que la memoria.' },
      { texto: 'Sin combiner el resultado sería distinto.', correcta: false, retro: 'El combiner solo reduce el tráfico; el resultado final es el mismo con o sin él.' }
    ],
    retroFallo: 'Son correctas dos: sort hace de shuffle, y el reducer necesita las líneas ordenadas por clave.'
  }
];

// ====================================================================
// Rúbrica del Taller 1
// ====================================================================
RUBRICAS['taller-1'] = {
  titulo: 'Rúbrica del Taller 1',
  total: 100,
  intro: 'Cada criterio se puntúa por separado. Pulsa un criterio para ver qué mide y qué distingue cada nivel.',
  nota: 'Puntos sobre 100. La equivalencia con la escala de calificación institucional la define el docente. La misma rúbrica se usa en la coevaluación entre grupos.',
  anulan: [
    'El notebook no corre completo con «Entorno de ejecución → Reiniciar sesión y ejecutar todo».',
    'Cifras del informe que no salen del notebook entregado.',
    'Uso de datos personales reales en lugar de los datos del caso.'
  ],
  criterios: [
    {
      clave: 'A · CR1', nombre: 'Etapas y seguridad', puntos: 20,
      foco: 'Mide si el esquema del ciclo se apoya en el caso y si cada control de seguridad protege el dato <strong>en esa etapa</strong>, con fundamento en la Ley 1581 de 2012.',
      niveles: [
        { nombre: 'Excelente', rango: '18–20', observa: 'Las seis etapas con ejemplos del caso y un control pertinente en cada una, justificado con un principio de la ley.' },
        { nombre: 'Aceptable', rango: '13–17', observa: 'Etapas correctas; algún control genérico o sin justificación legal.' },
        { nombre: 'Insuficiente', rango: '7–12', observa: 'Etapas genéricas, sin el caso, o controles que no corresponden a su etapa.' },
        { nombre: 'No logrado', rango: '0–6', observa: 'Falta el esquema o confunde las etapas.' }
      ]
    },
    {
      clave: 'B · CR3', nombre: 'Limpieza trazable y calidad', puntos: 30,
      foco: 'Mide si cada regla está documentada, ligada a una dimensión de calidad y cuantificada, y si el reporte antes/después <strong>demuestra</strong> el efecto de la limpieza.',
      niveles: [
        { nombre: 'Excelente', rango: '27–30', observa: 'Bitácora completa (regla, dimensión, filas afectadas, decisión) y reporte de calidad que la respalda; los vacíos se tratan según su causa.' },
        { nombre: 'Aceptable', rango: '20–26', observa: 'Reglas correctas y reporte presente, pero alguna decisión sin justificar o sin cuantificar.' },
        { nombre: 'Insuficiente', rango: '11–19', observa: 'Limpieza aplicada sin bitácora, o con borrados que no se explican.' },
        { nombre: 'No logrado', rango: '0–10', observa: 'Datos sin limpiar o limpieza que destruye información válida.' }
      ]
    },
    {
      clave: 'C · CR3', nombre: 'Procesamiento y verificación', puntos: 25,
      foco: 'Mide si las preguntas de negocio se responden con código correcto y si el resultado de MapReduce se <strong>verifica</strong> contra pandas por dos caminos.',
      niveles: [
        { nombre: 'Excelente', rango: '23–25', observa: 'Las tres preguntas bien resueltas, y MapReduce (con combiner) y Streaming coinciden con groupby, comprobado en el código.' },
        { nombre: 'Aceptable', rango: '17–22', observa: 'Las tres preguntas bien resueltas y MapReduce funcional, pero la coincidencia se comprueba a ojo o falta uno de los dos caminos.' },
        { nombre: 'Insuficiente', rango: '9–16', observa: 'Una de las tres preguntas mal resuelta, o MapReduce implementado pero sin ninguna verificación.' },
        { nombre: 'No logrado', rango: '0–8', observa: 'Dos o más preguntas mal resueltas, o no hay implementación de MapReduce.' }
      ]
    },
    {
      clave: 'D · CR2', nombre: 'Integración cuantitativa y cualitativa', puntos: 15,
      foco: 'Mide si el informe <strong>conecta</strong> lo que dicen las reseñas con lo que muestran las cifras de ventas, sin confundir coincidencia con causa.',
      niveles: [
        { nombre: 'Excelente', rango: '14–15', observa: 'Una conclusión que combina ambos tipos de evidencia y declara sus límites.' },
        { nombre: 'Aceptable', rango: '10–13', observa: 'Presenta ambos análisis, pero la conexión entre ellos es débil.' },
        { nombre: 'Insuficiente', rango: '5–9', observa: 'Los análisis van por separado, sin integrarse.' },
        { nombre: 'No logrado', rango: '0–4', observa: 'Falta el análisis de las reseñas.' }
      ]
    },
    {
      clave: 'E', nombre: 'Legibilidad y comunicación', puntos: 10,
      foco: 'Mide si el notebook se puede seguir (títulos, comentarios, celdas en orden y sin pruebas sobrantes) y si el informe se entiende <strong>sin leer el código</strong>. Que el notebook corra completo no se puntúa aquí: es condición, y si no se cumple el trabajo se anula.',
      niveles: [
        { nombre: 'Excelente', rango: '9–10', observa: 'Notebook ordenado, con un título por cada punto del taller; informe claro, con tablas o gráficos legibles y cifras con unidades.' },
        { nombre: 'Aceptable', rango: '7–8', observa: 'Notebook comprensible, con alguna celda de prueba sobrante o sin explicar; informe comprensible.' },
        { nombre: 'Insuficiente', rango: '4–6', observa: 'Cuesta encontrar en el notebook de dónde sale cada cifra del informe; informe confuso.' },
        { nombre: 'No logrado', rango: '0–3', observa: 'Informe ilegible o sin conclusiones.' }
      ]
    }
  ]
};
