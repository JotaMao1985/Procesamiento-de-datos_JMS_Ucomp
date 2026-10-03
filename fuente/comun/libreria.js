// ====================================================================
// Librería común del material — Procesamiento de Datos (UCompensar)
//
// Derivada de la plantilla de capítulo del formato «material de curso
// interactivo» (SPA de módulos en <template>, simuladores, autoevaluación,
// ejercicios guiados, ciclos y rúbricas), re-vestida con la paleta
// institucional y ampliada con: navegación por bloques y breaks, agenda
// con hora real, modo presentación y descarga de archivos del caso.
//
// Cada sesión define después, en su propio script:
//   courseData = { title, bloques: [...], modules: [...] }
//   SIMULADORES['id'], AUTOEVALUACIONES['id'], RUBRICAS['id']
// ====================================================================

// ================================================================
// Estado y elementos del DOM
// ================================================================
let currentModuleId = 1;
let completedModules = new Set();

const mainContent = document.getElementById('content-area');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const moduleNav = document.getElementById('module-nav');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');

document.addEventListener('DOMContentLoaded', () => {
  horaInicio = leerHoraInicio();
  restaurarPresentacion();
  renderNavigation();
  loadModule(moduloDelHash());
  setupEventListeners();
  setInterval(actualizarAgendaYReloj, 30000);
});

// ================================================================
// Navegación de módulos, agrupada por los bloques de la sesión
//
//   courseData.bloques = [{ id, titulo, corto, minutos, breakDespues, detalle }]
//   courseData.modules = [{ id, title, duration, bloque }]
//
// `breakDespues` son los minutos de descanso al cerrar el bloque (0 si no
// hay). Los breaks se dibujan como separadores NO pulsables: son parte de
// la agenda, no contenido.
// ================================================================
function renderNavigation() {
  const tramos = calcularTramos();
  let html = '';
  (courseData.bloques || []).forEach(b => {
    const tramo = tramos.find(t => t.tipo === 'bloque' && t.bloque === b.id);
    html += `<div class="nav-bloque"><span>Bloque ${b.id} · ${b.corto || b.titulo}</span>` +
      `<span class="nav-bloque-hora">${tramo ? textoTramo(tramo) : ''}</span></div>`;
    courseData.modules.filter(m => m.bloque === b.id).forEach(m => { html += botonNavegacion(m); });
    if (b.breakDespues) {
      html += `<div class="nav-break"><span><i class="fas fa-mug-hot" aria-hidden="true"></i> Break ${b.breakDespues} min</span></div>`;
    }
  });
  courseData.modules.filter(m => !m.bloque).forEach(m => { html += botonNavegacion(m); });
  moduleNav.innerHTML = html;
}

function botonNavegacion(modulo) {
  const activo = modulo.id === currentModuleId;
  const visto = completedModules.has(modulo.id) && !activo;
  return `<button type="button" class="nav-item ${activo ? 'active' : ''}" onclick="loadModule(${modulo.id})"` +
    `${activo ? ' aria-current="page"' : ''}>` +
    `<span class="nav-titulo">${modulo.title}</span>` +
    `<span class="nav-duracion">${modulo.duration || ''}</span>` +
    `${visto ? '<span class="sr-only">(visitado)</span>' : ''}</button>`;
}

// ================================================================
// Enlaces directos a un módulo:  archivo.html#modulo-6
//
// Sin esto, un enlace con ancla abre la sesión por el módulo 1 y el
// lector tiene que buscar a mano: la autoevaluación y el taller remiten
// a módulos concretos.
// ================================================================
function moduloDelHash() {
  const m = /^#modulo-(\d+)$/.exec(window.location.hash || '');
  if (!m) return 1;
  const id = parseInt(m[1], 10);
  return (id >= 1 && id <= courseData.modules.length) ? id : 1;
}

function fijarHashDelModulo(id) {
  // `replaceState` y no `location.hash` para no llenar el historial con
  // una entrada por módulo visitado. Sobre file:// puede lanzar, y que
  // falle no es grave: lo que importa es LEER el ancla al entrar.
  try {
    window.history.replaceState(null, '', `#modulo-${id}`);
  } catch (e) { /* file:// sin permisos de historial */ }
}

window.addEventListener('hashchange', () => {
  const id = moduloDelHash();
  if (id !== currentModuleId) loadModule(id);
});

function loadModule(id) {
  currentModuleId = id;
  fijarHashDelModulo(id);

  if (!completedModules.has(id)) {
    completedModules.add(id);
  }

  renderNavigation();

  const template = document.getElementById(`module-${id}`);
  if (template) {
    destruirSimuladores();
    mainContent.innerHTML = '';
    mainContent.appendChild(template.content.cloneNode(true));

    wrapCodeBlocks();
    initCodeTabs();
    iniciarSimuladores();
    iniciarAutoevaluaciones();
    iniciarEjerciciosGuiados();
    iniciarDerivaciones();
    iniciarCiclos();
    iniciarRubricas();
    iniciarAgendas();
    katexEn(mainContent);

    addNavigationButtons();
  }

  actualizarAgendaYReloj();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function addNavigationButtons() {
  const navContainer = document.createElement('div');
  navContainer.className = 'flex justify-between mt-8 pt-6 border-t border-gray-100';

  const prevBtn = document.createElement('button');
  if (currentModuleId > 1) {
    prevBtn.className = 'uc-button bg-gray-500 hover:bg-gray-600';
    prevBtn.innerHTML = '<i class="fas fa-arrow-left mr-2" aria-hidden="true"></i> Anterior';
    prevBtn.onclick = () => loadModule(currentModuleId - 1);
  } else {
    prevBtn.style.visibility = 'hidden';
  }

  const nextBtn = document.createElement('button');
  if (currentModuleId < courseData.modules.length) {
    nextBtn.className = 'uc-button';
    nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right ml-2" aria-hidden="true"></i>';
    nextBtn.onclick = () => loadModule(currentModuleId + 1);
  } else {
    nextBtn.className = 'uc-button';
    nextBtn.innerHTML = 'Volver al inicio <i class="fas fa-rotate-left ml-2" aria-hidden="true"></i>';
    nextBtn.onclick = () => loadModule(1);
  }

  navContainer.appendChild(prevBtn);
  navContainer.appendChild(nextBtn);
  mainContent.appendChild(navContainer);
}

function setupEventListeners() {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-collapsed');
    const icon = sidebarToggle.querySelector('i');
    if (sidebar.classList.contains('sidebar-collapsed')) {
      icon.classList.remove('fa-chevron-left');
      icon.classList.add('fa-chevron-right');
      sidebarToggle.setAttribute('aria-expanded', 'false');
    } else {
      icon.classList.remove('fa-chevron-right');
      icon.classList.add('fa-chevron-left');
      sidebarToggle.setAttribute('aria-expanded', 'true');
    }
  });

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  });

  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const botonPresentacion = document.getElementById('botonPresentacion');
  if (botonPresentacion) botonPresentacion.addEventListener('click', () => alternarPresentacion());

  // Atajos: P alterna el modo presentación; en él, ← y → cambian de módulo.
  // Se ignoran mientras se escribe o se mueve un control, y cuando otro
  // componente ya usó la tecla (las flechas recorren un .ciclo).
  document.addEventListener('keydown', evento => {
    if (evento.defaultPrevented || evento.altKey || evento.ctrlKey || evento.metaKey) return;
    if (evento.target.closest && evento.target.closest('input, textarea, select, [contenteditable="true"], [role="tab"]')) return;
    if (evento.key === 'p' || evento.key === 'P') {
      alternarPresentacion();
    } else if (document.documentElement.classList.contains('modo-presentacion')) {
      if (evento.key === 'ArrowRight' && currentModuleId < courseData.modules.length) loadModule(currentModuleId + 1);
      if (evento.key === 'ArrowLeft' && currentModuleId > 1) loadModule(currentModuleId - 1);
    }
  });

  // Botones de descarga de los archivos del caso: <button data-descargar="clave">
  document.addEventListener('click', evento => {
    const boton = evento.target.closest('[data-descargar]');
    if (!boton) return;
    const archivo = (typeof ARCHIVOS_CASO !== 'undefined') ? ARCHIVOS_CASO[boton.dataset.descargar] : null;
    if (archivo) descargarArchivo(archivo.nombre, archivo.contenido, archivo.tipo);
  });
}

// ================================================================
// Agenda de la sesión: bloques y breaks con la hora real
//
// La hora de inicio la fija el docente en el componente <div data-agenda>.
// Se guarda en localStorage solo como comodidad (si el navegador lo
// bloquea, todo funciona igual contando desde 0:00).
// ================================================================
let horaInicio = '';

function claveHoraInicio() {
  return `uc-pd-hora-inicio-${courseData.sesion || 'x'}`;
}

function leerHoraInicio() {
  try {
    const v = localStorage.getItem(claveHoraInicio()) || '';
    return /^\d{2}:\d{2}$/.test(v) ? v : '';
  } catch (e) { return ''; }
}

function guardarHoraInicio(valor) {
  try { localStorage.setItem(claveHoraInicio(), valor); } catch (e) { /* sin almacenamiento */ }
}

function calcularTramos() {
  let t = 0;
  const tramos = [];
  (courseData.bloques || []).forEach(b => {
    tramos.push({ tipo: 'bloque', bloque: b.id, titulo: b.titulo, detalle: b.detalle, inicio: t, fin: t + b.minutos });
    t += b.minutos;
    if (b.breakDespues) {
      tramos.push({ tipo: 'break', inicio: t, fin: t + b.breakDespues });
      t += b.breakDespues;
    }
  });
  return tramos;
}

// Sin hora de inicio, el reloj cuenta desde 0:00 (duración transcurrida)
function minutosAHora(minutos) {
  let total = minutos;
  if (horaInicio) {
    const [hh, mm] = horaInicio.split(':').map(Number);
    total += hh * 60 + mm;
  }
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function textoTramo(tramo) {
  return `${minutosAHora(tramo.inicio)}–${minutosAHora(tramo.fin)}`;
}

function iniciarAgendas() {
  mainContent.querySelectorAll('[data-agenda]').forEach(pintarAgenda);
}

function pintarAgenda(raiz) {
  const tramos = calcularTramos();
  const total = tramos.length ? tramos[tramos.length - 1].fin : 0;
  const idInput = `hora-inicio-${Math.floor(Math.random() * 1e9)}`;
  raiz.innerHTML = `
    <div class="agenda-cabecera">
      <span class="agenda-titulo-general"><i class="fas fa-clock mr-2" aria-hidden="true"></i>Agenda de hoy · ${Math.floor(total / 60)} h${total % 60 ? ' ' + (total % 60) + ' min' : ''}</span>
      <label for="${idInput}">Hora de inicio <input type="time" id="${idInput}" value="${horaInicio}"></label>
    </div>
    <ol class="agenda-lista">
      ${tramos.map(t => `
        <li class="agenda-fila${t.tipo === 'break' ? ' es-break' : ''}" data-inicio="${t.inicio}" data-fin="${t.fin}">
          <span class="agenda-hora">${textoTramo(t)}</span>
          <span class="agenda-nombre">${t.tipo === 'break'
            ? '<i class="fas fa-mug-hot mr-1" aria-hidden="true"></i> Break'
            : `Bloque ${t.bloque} · ${t.titulo}`}</span>
          <span class="agenda-duracion">${t.fin - t.inicio} min</span>
          ${t.detalle ? `<span class="agenda-detalle">${t.detalle}</span>` : ''}
        </li>`).join('')}
    </ol>
    <p class="agenda-pie">${horaInicio
      ? 'Horas calculadas a partir de la hora de inicio; la fila resaltada es el tramo en curso.'
      : 'Sin hora de inicio, los tiempos se cuentan desde 0:00. Escribe la hora para ver el horario real.'}
      La hora se guarda solo en este navegador.</p>`;
  raiz.querySelector('input').addEventListener('change', evento => {
    horaInicio = evento.target.value || '';
    guardarHoraInicio(horaInicio);
    renderNavigation();
    pintarAgenda(raiz);
    actualizarAgendaYReloj();
  });
}

function estadoSesion() {
  if (!horaInicio) return null;
  const ahora = new Date();
  const [hh, mm] = horaInicio.split(':').map(Number);
  const transcurrido = ahora.getHours() * 60 + ahora.getMinutes() - (hh * 60 + mm);
  const tramos = calcularTramos();
  const actual = tramos.find(t => transcurrido >= t.inicio && transcurrido < t.fin) || null;
  return { transcurrido, actual, tramos };
}

function actualizarAgendaYReloj() {
  const estado = estadoSesion();
  const reloj = document.getElementById('relojSesion');
  if (reloj) {
    let texto;
    let enBreak = false;
    if (!estado) {
      texto = 'Fija la hora de inicio en el módulo 1';
    } else if (estado.transcurrido < 0) {
      texto = `La sesión empieza a las ${horaInicio}`;
    } else if (!estado.actual) {
      texto = 'Sesión terminada';
    } else if (estado.actual.tipo === 'break') {
      enBreak = true;
      texto = `Break · regresamos en ${estado.actual.fin - estado.transcurrido} min`;
    } else {
      const resta = estado.actual.fin - estado.transcurrido;
      const ultimo = estado.tramos.indexOf(estado.actual) === estado.tramos.length - 1;
      texto = `Bloque ${estado.actual.bloque} · ${resta} min ${ultimo ? 'para terminar' : 'para el break'}`;
    }
    reloj.querySelector('.reloj-texto').textContent = texto;
    reloj.classList.toggle('break', enBreak);
  }
  document.querySelectorAll('.agenda-fila[data-inicio]').forEach(fila => {
    const dentro = !!estado && estado.transcurrido >= +fila.dataset.inicio && estado.transcurrido < +fila.dataset.fin;
    fila.classList.toggle('actual', dentro);
  });
}

// ================================================================
// Modo presentación: para proyectar en clase
// ================================================================
function alternarPresentacion(forzar) {
  const raiz = document.documentElement;
  const activo = typeof forzar === 'boolean' ? forzar : !raiz.classList.contains('modo-presentacion');
  raiz.classList.toggle('modo-presentacion', activo);
  const boton = document.getElementById('botonPresentacion');
  if (boton) boton.setAttribute('aria-pressed', String(activo));
  try { sessionStorage.setItem('uc-pd-presentacion', activo ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
  actualizarAgendaYReloj();
  // Los gráficos de Chart.js se redimensionan solos con el contenedor
}

function restaurarPresentacion() {
  let activo = false;
  try { activo = sessionStorage.getItem('uc-pd-presentacion') === '1'; } catch (e) { /* sin almacenamiento */ }
  if (activo) alternarPresentacion(true);
}

// ================================================================
// Descarga de archivos generados en el navegador (datos del caso)
// ================================================================
function descargarArchivo(nombre, contenido, tipo) {
  // El BOM inicial hace que Excel lea bien las tildes; pandas lo ignora.
  const esCsv = /\.csv$/i.test(nombre);
  const blob = new Blob([esCsv ? '\ufeff' + contenido : contenido],
    { type: tipo || (esCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8') });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ================================================================
// Bloques de código: envoltorio con copiar / expandir
// ================================================================
const NOMBRES_LENGUAJE = { 'language-python': 'Python', 'language-bash': 'Terminal', 'language-sql': 'SQL', 'language-json': 'JSON', 'language-r': 'R' };

function wrapCodeBlocks() {
  const pres = mainContent.querySelectorAll('pre');
  pres.forEach(pre => {
    if (pre.closest('.salida, .tipo-dato')) return;
    if (!pre.parentElement.classList.contains('code-block-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      // El curso es en Python: si el bloque no declara lenguaje, se asume Python
      const code = pre.querySelector('code');
      let claseLenguaje = 'language-python';
      if (code) {
        const declarada = Array.from(code.classList).find(c => c.startsWith('language-'));
        if (declarada) {
          claseLenguaje = declarada;
        } else {
          code.classList.add(claseLenguaje);
        }
      }
      const celda = pre.closest('.celda');
      const titulo = (NOMBRES_LENGUAJE[claseLenguaje] || 'Código') +
        (celda && celda.dataset.celda ? `<span class="celda-id">[${celda.dataset.celda}]</span>` : '');

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span class="code-block-title">${titulo}</span>
        <div class="code-actions">
          <button type="button" class="code-copy-btn" onclick="copyCode(this)" title="Copiar código">
            <i class="fas fa-copy" aria-hidden="true"></i>
            <span>Copiar</span>
          </button>
          <button type="button" class="code-toggle-btn" onclick="toggleCode(this)">
            <span>Mostrar/Ocultar</span>
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
          </button>
        </div>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
      // Se proyecta en clase: los bloques cortos se ven enteros de entrada y
      // solo los largos arrancan plegados.
      const lineas = (pre.textContent.match(/\n/g) || []).length + 1;
      if (lineas <= 14) {
        pre.classList.add('expanded');
        header.querySelector('.code-toggle-btn').classList.add('expanded');
      } else {
        pre.classList.add('collapsed');
      }
    }
  });
  if (typeof Prism !== 'undefined') {
    Prism.highlightAllUnder(mainContent);
  }
}

function toggleCode(button) {
  const pre = button.closest('.code-block-wrapper').querySelector('pre');

  if (pre.classList.contains('collapsed')) {
    pre.classList.remove('collapsed');
    pre.classList.add('expanded');
    button.classList.add('expanded');
  } else {
    pre.classList.add('collapsed');
    pre.classList.remove('expanded');
    button.classList.remove('expanded');
  }
}

function copyCode(button) {
  const pre = button.closest('.code-block-wrapper').querySelector('pre');
  const code = pre.querySelector('code');
  const codeText = code.textContent;

  navigator.clipboard.writeText(codeText).then(() => {
    const originalText = button.innerHTML;
    button.classList.add('copied');
    button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span>Copiado</span>';

    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Error al copiar: ', err);
    const textarea = document.createElement('textarea');
    textarea.value = codeText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    button.classList.add('copied');
    button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span>Copiado</span>';
    setTimeout(() => {
      button.classList.remove('copied');
      button.innerHTML = '<i class="fas fa-copy" aria-hidden="true"></i><span>Copiar</span>';
    }, 2000);
  });
}

// ================================================================
// Pestañas de código R / Python
// ================================================================
function initCodeTabs() {
  mainContent.querySelectorAll('.code-tabs').forEach(tabs => {
    const botones = tabs.querySelectorAll('.code-tab-btn');
    const paneles = tabs.querySelectorAll('.code-tab-panel');
    botones.forEach(boton => {
      boton.addEventListener('click', () => {
        const lang = boton.dataset.lang;
        botones.forEach(b => {
          const activo = b === boton;
          b.classList.toggle('active', activo);
          b.setAttribute('aria-selected', activo ? 'true' : 'false');
        });
        paneles.forEach(p => {
          p.hidden = p.dataset.lang !== lang;
        });
      });
    });
  });
}

// ================================================================
// Fábrica de simuladores
//
// Uso: SIMULADORES['mi-id'] = function (raiz) { ...; return [chart]; }
// El contenedor lleva data-simulador="mi-id", un .simulador-controles
// vacío y un <canvas>. La función devuelve los Chart creados para
// destruirlos al cambiar de módulo.
// ================================================================
const SIMULADORES = {};
let graficosActivos = [];

function iniciarSimuladores() {
  const montar = () => mainContent.querySelectorAll('[data-simulador]:not([data-montado])').forEach(raiz => {
    raiz.dataset.montado = '1';
    const init = SIMULADORES[raiz.dataset.simulador];
    if (init) {
      const graficos = init(raiz) || [];
      graficosActivos.push(...graficos);
    } else {
      console.warn(`Simulador no registrado: ${raiz.dataset.simulador}`);
    }
  });
  // Chart.js mide el texto una sola vez: si Roboto y Fira Code aún no cargan, los
  // rótulos salen en otra fuente y se recortan. Se espera a que estén listas.
  if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(montar);
  else montar();
}

function destruirSimuladores() {
  graficosActivos.forEach(g => g.destroy());
  graficosActivos = [];
}

// Crea deslizadores dentro de un contenedor y devuelve los <input>.
// defs: [{clave, etiqueta, min, max, paso, decimales, formato}]
// `formato` (opcional) es una función valor → texto para la lectura del
// deslizador: «1 TB» en vez de «3.0», «64 nodos» en vez de «6».
// params: objeto mutable con el valor actual de cada clave.
// alCambiar: callback invocado en cada movimiento.
function crearControles(contenedor, defs, params, alCambiar) {
  const inputs = {};
  defs.forEach(def => {
    const decimales = def.decimales !== undefined ? def.decimales
      : (String(def.paso).includes('.') ? String(def.paso).split('.')[1].length : 0);
    const idControl = `ctl-${def.clave}-${Math.floor(Math.random() * 1e9)}`;

    const div = document.createElement('div');
    div.className = 'control-slider';

    const label = document.createElement('label');
    label.setAttribute('for', idControl);
    label.append(def.etiqueta);

    const output = document.createElement('output');
    const mostrar = v => (def.formato ? def.formato(v) : Number(v).toFixed(decimales));
    output.textContent = mostrar(params[def.clave]);
    label.appendChild(output);

    const input = document.createElement('input');
    input.type = 'range';
    input.id = idControl;
    input.min = def.min;
    input.max = def.max;
    input.step = def.paso;
    input.value = params[def.clave];

    input.addEventListener('input', () => {
      params[def.clave] = parseFloat(input.value);
      output.textContent = mostrar(params[def.clave]);
      alCambiar();
    });

    div.appendChild(label);
    div.appendChild(input);
    contenedor.appendChild(div);
    inputs[def.clave] = input;
  });
  return inputs;
}

// Paleta y defaults de la casa para gráficos de líneas.
// Números de los gráficos con el formato de Colombia: 10.000 y 2,5
if (typeof Chart !== 'undefined') {
  Chart.defaults.locale = 'es-CO';
}

const COLORES_GRAFICO = {
  primario: '#691E7A',
  secundario: '#F46201',
  terciario: '#566B7F',
  acento: '#FAA012',
  gris: '#94a3b8'
};

function crearGraficoLinea(canvas, etiquetas, datasets, opciones = {}) {
  return new Chart(canvas, {
    type: 'line',
    data: { labels: etiquetas, datasets: datasets },
    options: Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { font: { family: 'Roboto', size: 12 }, boxWidth: 24 }
        },
        tooltip: {
          backgroundColor: '#3A0F47',
          titleFont: { family: 'Roboto' },
          bodyFont: { family: 'Fira Code' }
        }
      },
      scales: {
        x: {
          ticks: {
            font: { family: 'Roboto', size: 11 },
            maxTicksLimit: 12,
            maxRotation: 0
          },
          grid: { display: false }
        },
        y: {
          ticks: { font: { family: 'Fira Code', size: 11 } },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        }
      }
    }, opciones)
  });
}

// Generador congruencial mulberry32 + Box-Muller: ruido N(0,1)
// reproducible (misma semilla => mismo ruido en cada carga).
function generarRuidoNormal(n, semilla) {
  let estado = semilla >>> 0;
  function uniforme() {
    estado |= 0;
    estado = (estado + 0x6D2B79F5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ruido = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(uniforme(), 1e-12);
    const u2 = uniforme();
    ruido.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
  }
  return ruido;
}

// ================================================================
// Ayudantes añadidos en el Capítulo 2
// ================================================================

// Menú desplegable para elegir una serie dentro de un simulador.
// def: {clave, etiqueta, opciones:[{valor, texto}]}
function crearSelector(contenedor, def, params, alCambiar) {
  const idControl = `sel-${def.clave}-${Math.floor(Math.random() * 1e9)}`;
  const div = document.createElement('div');
  div.className = 'control-selector';

  const label = document.createElement('label');
  label.setAttribute('for', idControl);
  label.textContent = def.etiqueta;

  const select = document.createElement('select');
  select.id = idControl;
  def.opciones.forEach(op => {
    const o = document.createElement('option');
    o.value = op.valor;
    o.textContent = op.texto;
    if (op.valor === params[def.clave]) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener('change', () => {
    params[def.clave] = select.value;
    alCambiar();
  });

  div.appendChild(label);
  div.appendChild(select);
  contenedor.appendChild(div);
  return select;
}

// Interruptores (casillas) para activar transformaciones.
// defs: [{clave, etiqueta}]
function crearInterruptores(contenedor, defs, params, alCambiar) {
  const fila = document.createElement('div');
  fila.className = 'control-interruptores';
  defs.forEach(def => {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'control-interruptor' + (params[def.clave] ? ' activo' : '');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!params[def.clave];
    input.addEventListener('change', () => {
      params[def.clave] = input.checked;
      etiqueta.classList.toggle('activo', input.checked);
      alCambiar();
    });

    etiqueta.appendChild(input);
    etiqueta.append(def.etiqueta);
    fila.appendChild(etiqueta);
  });
  contenedor.appendChild(fila);
}

// Gráfico de barras para correlogramas. `opciones.lineas` dibuja rectas de
// referencia horizontales (la banda ±1.96/√T, el nivel nominal de una
// prueba, etc.) como conjuntos de datos de línea sobre las barras.
function crearGraficoBarras(canvas, etiquetas, valores, opciones = {}) {
  const n = etiquetas.length;
  const datasets = [{
    type: 'bar',
    label: opciones.etiqueta || 'ACF',
    data: valores,
    backgroundColor: opciones.color || COLORES_GRAFICO.primario,
    borderWidth: 0,
    barPercentage: 0.4,
    categoryPercentage: 0.9,
    order: 2
  }];
  // Barras adicionales sobre el mismo eje (p. ej. la ACF muestral junto a
  // la teórica). Van antes que las rectas de referencia para que el orden
  // de los datasets sea estable: 0 = principal, 1..k = extra, luego líneas.
  (opciones.barrasExtra || []).forEach(extra => {
    datasets.push({
      type: 'bar',
      label: extra.etiqueta || '',
      data: extra.valores,
      backgroundColor: extra.color || COLORES_GRAFICO.secundario,
      borderWidth: 0,
      barPercentage: 0.4,
      categoryPercentage: 0.9,
      order: 2
    });
  });
  (opciones.lineas || []).forEach(linea => {
    datasets.push({
      type: 'line',
      label: linea.etiqueta || '',
      data: Array(n).fill(linea.valor),
      borderColor: linea.color || COLORES_GRAFICO.secundario,
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      order: 1
    });
  });

  return new Chart(canvas, {
    type: 'bar',
    data: { labels: etiquetas, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          // Las rectas de referencia sin etiqueta no ensucian la leyenda
          labels: {
            font: { family: 'Roboto', size: 12 },
            boxWidth: 24,
            filter: item => item.text !== ''
          }
        },
        tooltip: {
          backgroundColor: '#3A0F47',
          titleFont: { family: 'Roboto' },
          bodyFont: { family: 'Fira Code' },
          filter: item => item.dataset.label !== ''
        }
      },
      scales: {
        x: {
          title: {
            display: !!opciones.tituloX,
            text: opciones.tituloX,
            font: { family: 'Roboto', size: 11 }
          },
          ticks: { font: { family: 'Fira Code', size: 10 }, maxRotation: 0 },
          grid: { display: false }
        },
        y: {
          suggestedMin: opciones.min !== undefined ? opciones.min : -1,
          suggestedMax: opciones.max !== undefined ? opciones.max : 1,
          ticks: { font: { family: 'Fira Code', size: 11 } },
          grid: { color: 'rgba(148, 163, 184, 0.2)' }
        }
      }
    }
  });
}

function varianzaMuestral(y) {
  const n = y.length;
  if (n < 2) return NaN;
  const media = y.reduce((a, b) => a + b, 0) / n;
  return y.reduce((a, b) => a + (b - media) * (b - media), 0) / (n - 1);
}

// Escribe una lectura numérica bajo un simulador
function actualizarLectura(elemento, campos) {
  elemento.innerHTML = campos
    .map(c => `<span><b>${c.etiqueta}</b> ${c.valor}</span>`)
    .join('');
}

// ================================================================
// Autoevaluación (v2)
//
// AUTOEVALUACIONES['id'] = [pregunta, ...] sobre un contenedor
// data-quiz="id". Cada pregunta declara su `tipo`:
//
//   'opcion'   (por defecto) una sola respuesta correcta
//   'multiple' varias correctas; se corrige al pulsar "Comprobar"
//   'numerica' campo de entrada; se acepta |respuesta - dada| <= tolerancia
//   'grafico'  como 'opcion', pero dibuja un Chart.js sobre el enunciado
//
// Campos comunes: {pregunta, pista, modulo}. `pista` se muestra tras el
// PRIMER fallo y se deja reintentar; al segundo fallo se revela la
// respuesta. `modulo` alimenta el resumen final de "qué repasar".
//
// TODA opción lleva su propio `retro`, también las incorrectas: explicar
// dónde falla el razonamiento vale más que decir "incorrecto". En 'opcion' y
// 'grafico' se muestra el `retro` de la opción elegida; en 'multiple', el
// desglose de cada opción que el estudiante juzgó mal (ver
// `desgloseMultiple`). `retroAcierto`/`retroFallo` son el comentario general
// que lo encabeza, no un sustituto del `retro` por opción.
// ================================================================
const AUTOEVALUACIONES = {};
const LETRAS = ['a', 'b', 'c', 'd', 'e'];
const NOMBRE_TIPO = {
  opcion: 'Opción múltiple',
  multiple: 'Varias respuestas',
  numerica: 'Respuesta numérica',
  grafico: 'Lectura de gráfico'
};

function iniciarAutoevaluaciones() {
  mainContent.querySelectorAll('[data-quiz]').forEach(raiz => {
    const preguntas = AUTOEVALUACIONES[raiz.dataset.quiz];
    if (!preguntas) {
      console.warn(`Autoevaluación no registrada: ${raiz.dataset.quiz}`);
      return;
    }
    renderAutoevaluacion(raiz, preguntas);
  });
}

// Los gráficos de las preguntas viven en `graficosActivos` como los de los
// simuladores, para que se destruyan al cambiar de módulo. Además se
// guardan por quiz para poder limpiarlos al reiniciar sin tocar los demás.
function registrarGraficoQuiz(raiz, chart) {
  (raiz._graficos = raiz._graficos || []).push(chart);
  graficosActivos.push(chart);
}

function limpiarGraficosQuiz(raiz) {
  (raiz._graficos || []).forEach(g => {
    const i = graficosActivos.indexOf(g);
    if (i >= 0) graficosActivos.splice(i, 1);
    g.destroy();
  });
  raiz._graficos = [];
}

function katexEn(elemento) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(elemento, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true }
      ],
      ignoredClasses: ['salida', 'tipo-dato']
    });
  }
}

// Las preguntas se escriben con la opción correcta donde sea más cómodo; al
// pintarlas se reordenan con semillas FIJAS: el orden es el mismo en cada
// carga (en clase se puede seguir diciendo «la opción c») y, en las de una
// sola respuesta, la correcta se reparte por igual entre las letras en lugar
// de caer casi siempre en la «a» o la «b».
function barajarFijo(lista, semilla) {
  let h = 2166136261;                                  // FNV-1a del texto semilla
  for (const c of semilla) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  let estado = h >>> 0;
  const azar = () => {                                 // mulberry32
    estado = (estado + 0x6D2B79F5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function ordenarOpciones(preguntas, idQuiz) {
  const unicas = preguntas.filter(p => p.opciones && p.opciones.filter(o => o.correcta).length === 1);
  // Letras objetivo: a, b, c, d… repetidas y luego mezcladas, una por pregunta
  // En bloques de cuatro (a, b, c, d mezcladas), con semilla propia de cada sesión: así ninguna
  // letra queda relegada y dos cuestionarios con el mismo nombre no repiten el patrón.
  const sesion = typeof courseData !== 'undefined' ? courseData.sesion : 0;
  const letras = [];
  for (let b = 0; letras.length < unicas.length; b++)
    letras.push(...barajarFijo([0, 1, 2, 3], `s${sesion}-${idQuiz}-letras-${b}`));
  let k = 0;
  return preguntas.map((p, i) => {
    if (!p.opciones) return p;
    const semilla = `${idQuiz}-${i}`;
    if (!unicas.includes(p)) return { ...p, opciones: barajarFijo(p.opciones, semilla) };
    const correcta = p.opciones.find(o => o.correcta);
    const resto = barajarFijo(p.opciones.filter(o => !o.correcta), semilla);
    resto.splice(letras[k++] % p.opciones.length, 0, correcta);
    return { ...p, opciones: resto };
  });
}

function renderAutoevaluacion(raiz, preguntasOriginales) {
  limpiarGraficosQuiz(raiz);
  const preguntas = ordenarOpciones(preguntasOriginales, raiz.dataset.quiz);

  const contenedor = raiz.querySelector('.quiz-preguntas');
  const marcador = raiz.querySelector('.quiz-conteo');
  const barra = raiz.querySelector('.quiz-progreso-barra');
  const resumen = raiz.querySelector('.quiz-resumen');

  const estado = preguntas.map(() => ({ resuelta: false, intentos: 0, acierto: false }));

  function actualizarMarcador() {
    const resueltas = estado.filter(e => e.resuelta).length;
    const alPrimero = estado.filter(e => e.acierto && e.intentos === 1).length;
    const alSegundo = estado.filter(e => e.acierto && e.intentos > 1).length;
    marcador.textContent =
      `Respondidas ${resueltas} de ${preguntas.length} · ` +
      `${alPrimero} al primer intento, ${alSegundo} al segundo`;
    if (barra) barra.style.width = `${(resueltas / preguntas.length) * 100}%`;

    if (resueltas === preguntas.length && resumen) {
      const fallidas = preguntas.filter((_, i) => !estado[i].acierto);
      const repasar = [...new Set(
        preguntas.filter((_, i) => estado[i].intentos > 1 || !estado[i].acierto)
          .map(p => p.modulo).filter(Boolean)
      )].sort((a, b) => a - b);
      resumen.innerHTML =
        `<h5>Resultado: ${alPrimero + alSegundo} de ${preguntas.length}` +
        `${fallidas.length ? '' : ' · impecable'}</h5>` +
        (repasar.length
          ? `<p style="margin:0;">Te costaron preguntas de estos módulos; vale la pena detenerte en ellos:</p>
             <ul>${repasar.map(m => `<li>Módulo ${m}: <strong>${(courseData.modules[m - 1] || {}).title || ''}</strong></li>`).join('')}</ul>`
          : `<p style="margin:0;">Acertaste todo al primer intento. Puedes pasar al siguiente módulo.</p>`);
      resumen.hidden = false;
      katexEn(resumen);
    }
  }

  function cerrar(i, bloque, acierto, textoRetro) {
    estado[i].resuelta = true;
    estado[i].acierto = acierto;
    const retro = bloque.querySelector('.quiz-retro');
    retro.className = `quiz-retro ${acierto ? 'bien' : 'mal'}`;
    const encabezado = acierto
      ? (estado[i].intentos === 1 ? '<strong>Correcto.</strong> ' : '<strong>Correcto, en el segundo intento.</strong> ')
      : '<strong>No es esa.</strong> ';
    // Defensivo: las preguntas de seleccion multiple no declaran
    // `retroAcierto`, y sin esta guarda el estudiante veia la palabra
    // "undefined" detras de "Correcto". (Bug encontrado auditando el cap. 6.)
    retro.innerHTML = encabezado + (textoRetro || '');
    retro.hidden = false;
    katexEn(retro);
    actualizarMarcador();
  }

  // Desglose por opción de una pregunta de selección múltiple: explica CADA
  // opción que el estudiante juzgó mal —la que marcó de más y la que se
  // dejó—, usando el `retro` de esa opción.
  //
  // Antes solo se mostraba el `retro` de las opciones CORRECTAS, y solo como
  // respaldo cuando no había `retroAcierto`: quien fallaba una `multiple`
  // veía un comentario general y nunca sabía en qué opción concreta se
  // equivocó. Contradecía la regla del formato («cada opción lleva su propia
  // retroalimentación, también las incorrectas»). Corregido el 2026-07-30.
  function desgloseMultiple(p, marcadas, correctas) {
    const filas = p.opciones.map((op, j) => {
      const marcada = marcadas.has(j);
      const esCorrecta = correctas.has(j);
      if (marcada === esCorrecta) return null;   // esa opción la juzgó bien
      const etiqueta = marcada ? 'La marcaste y no va' : 'Te faltó marcarla';
      // El texto de la opción ya trae su punto final, así que la retro se
      // concatena con un espacio: con dos puntos saldría «... JSON.: El ...».
      return `<li><strong>${etiqueta}:</strong> ${op.texto}` +
        `${op.retro ? ` ${op.retro}` : ''}</li>`;
    }).filter(Boolean);
    return filas.length ? `<ul>${filas.join('')}</ul>` : '';
  }

  function mostrarPista(i, bloque) {
    const pista = bloque.querySelector('.quiz-pista');
    if (pista && preguntas[i].pista) {
      pista.innerHTML = `<strong>Casi. Una pista:</strong> ${preguntas[i].pista}`;
      pista.hidden = false;
      katexEn(pista);
    }
  }

  contenedor.innerHTML = '';
  if (resumen) { resumen.hidden = true; resumen.innerHTML = ''; }

  preguntas.forEach((p, i) => {
    const tipo = p.tipo || 'opcion';
    const bloque = document.createElement('div');
    bloque.className = 'quiz-pregunta';

    const enunciado = document.createElement('p');
    enunciado.className = 'quiz-enunciado';
    enunciado.innerHTML = `<span class="quiz-numero">${i + 1}.</span>${p.pregunta}` +
      `<span class="quiz-tipo">${NOMBRE_TIPO[tipo]}</span>`;
    bloque.appendChild(enunciado);

    // Gráfico del enunciado, si lo hay
    if (tipo === 'grafico' && typeof p.dibujar === 'function') {
      const caja = document.createElement('div');
      caja.className = 'quiz-grafico';
      if (p.alto) caja.style.height = `${p.alto}px`;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', p.descripcionGrafico || 'Gráfico de la pregunta');
      caja.appendChild(canvas);
      bloque.appendChild(caja);
      const chart = p.dibujar(canvas);
      if (chart) registrarGraficoQuiz(raiz, chart);
    }

    const pista = document.createElement('div');
    pista.className = 'quiz-pista';
    pista.hidden = true;

    const retro = document.createElement('div');
    retro.className = 'quiz-retro';
    retro.setAttribute('role', 'status');
    retro.hidden = true;

    if (tipo === 'numerica') {
      // ---- Respuesta numérica -----------------------------------
      const fila = document.createElement('div');
      fila.className = 'quiz-numerica';
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.placeholder = 'Tu respuesta';
      input.setAttribute('aria-label', `Respuesta de la pregunta ${i + 1}`);
      const unidad = document.createElement('span');
      unidad.className = 'quiz-unidad';
      unidad.textContent = p.unidad || '';
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'quiz-comprobar';
      boton.textContent = 'Comprobar';

      function comprobarNumerica() {
        if (estado[i].resuelta) return;
        // Se acepta coma o punto como separador decimal
        const dada = parseFloat(String(input.value).trim().replace(',', '.'));
        if (!isFinite(dada)) {
          pista.innerHTML = '<strong>Escribe un número</strong> antes de comprobar.';
          pista.hidden = false;
          return;
        }
        estado[i].intentos++;
        const acierto = Math.abs(dada - p.respuesta) <= p.tolerancia;
        if (acierto) {
          input.disabled = true; boton.disabled = true;
          cerrar(i, bloque, true, p.retroAcierto);
        } else if (estado[i].intentos === 1) {
          mostrarPista(i, bloque);
        } else {
          input.disabled = true; boton.disabled = true;
          cerrar(i, bloque, false,
            `La respuesta es <strong>${p.respuesta}${p.unidad ? ' ' + p.unidad : ''}</strong>. ${p.retroFallo}`);
        }
      }
      boton.addEventListener('click', comprobarNumerica);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') comprobarNumerica(); });

      fila.appendChild(input);
      if (p.unidad) fila.appendChild(unidad);
      fila.appendChild(boton);
      bloque.appendChild(fila);

    } else if (tipo === 'multiple') {
      // ---- Varias respuestas correctas --------------------------
      const lista = document.createElement('div');
      lista.className = 'quiz-opciones';
      lista.setAttribute('role', 'group');
      lista.setAttribute('aria-label', `Opciones de la pregunta ${i + 1}`);
      const marcadas = new Set();

      const botones = p.opciones.map((op, j) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-opcion';
        b.setAttribute('aria-pressed', 'false');
        b.innerHTML = `<span class="quiz-casilla" aria-hidden="true"></span><span>${op.texto}</span>`;
        b.addEventListener('click', () => {
          if (estado[i].resuelta) return;
          const activa = marcadas.has(j);
          if (activa) marcadas.delete(j); else marcadas.add(j);
          b.classList.toggle('marcada', !activa);
          b.setAttribute('aria-pressed', String(!activa));
        });
        lista.appendChild(b);
        return b;
      });

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'quiz-comprobar';
      boton.style.marginTop = '0.6rem';
      boton.textContent = 'Comprobar';
      boton.addEventListener('click', () => {
        if (estado[i].resuelta) return;
        if (marcadas.size === 0) {
          pista.innerHTML = '<strong>Marca al menos una opción</strong> antes de comprobar.';
          pista.hidden = false;
          return;
        }
        estado[i].intentos++;
        const correctas = new Set(p.opciones.map((o, j) => o.correcta ? j : -1).filter(j => j >= 0));
        const exacto = marcadas.size === correctas.size &&
          [...marcadas].every(j => correctas.has(j));
        if (exacto) {
          // Se quita 'marcada' antes de pintar el estado final: las dos clases
          // empatan en especificidad y si no, ganaría la de "marcada".
          botones.forEach((b, j) => {
            b.disabled = true;
            b.classList.remove('marcada');
            if (correctas.has(j)) b.classList.add('correcta');
          });
          boton.disabled = true;
          // Respaldo para las preguntas de seleccion multiple, que no
          // declaran `retroAcierto`: se junta la retroalimentacion de las
          // opciones correctas, que ya estaba escrita y no se mostraba.
          cerrar(i, bloque, true, p.retroAcierto || p.opciones
            .filter(o => o.correcta).map(o => o.retro).filter(Boolean).join(' '));
          // No hay desglose: acertar aquí significa haber juzgado bien
          // TODAS las opciones, así que no queda nada que explicar.
        } else if (estado[i].intentos === 1) {
          const bien = [...marcadas].filter(j => correctas.has(j)).length;
          pista.innerHTML = `<strong>Casi.</strong> De las ${marcadas.size} que marcaste, ` +
            `${bien} ${bien === 1 ? 'está' : 'están'} en la respuesta, y te ` +
            `${correctas.size - bien === 1 ? 'falta' : 'faltan'} ${correctas.size - bien}. ` +
            (p.pista || '');
          pista.hidden = false;
          katexEn(pista);
        } else {
          botones.forEach((b, j) => {
            b.disabled = true;
            b.classList.remove('marcada');
            if (correctas.has(j)) b.classList.add(marcadas.has(j) ? 'correcta' : 'faltaba');
            else if (marcadas.has(j)) b.classList.add('incorrecta');
          });
          boton.disabled = true;
          cerrar(i, bloque, false,
            (p.retroFallo || '') + desgloseMultiple(p, marcadas, correctas));
        }
      });

      bloque.appendChild(lista);
      bloque.appendChild(boton);

    } else {
      // ---- Una sola respuesta ('opcion' y 'grafico') ------------
      const lista = document.createElement('div');
      lista.className = 'quiz-opciones';
      lista.setAttribute('role', 'group');
      lista.setAttribute('aria-label', `Opciones de la pregunta ${i + 1}`);

      const botones = p.opciones.map((op, j) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-opcion';
        b.innerHTML = `<span class="quiz-letra">${LETRAS[j]})</span><span>${op.texto}</span>`;
        b.addEventListener('click', () => {
          if (estado[i].resuelta) return;
          estado[i].intentos++;
          // La explicación de la primera opción fallida se guarda y se muestra al cerrar,
          // para no regalar el segundo intento
          const primera = estado[i].primerFallo
            ? `<br><em>Sobre la primera opción que elegiste:</em> ${estado[i].primerFallo}` : '';
          if (op.correcta) {
            botones.forEach((x, k) => { x.disabled = true; if (p.opciones[k].correcta) x.classList.add('correcta'); });
            cerrar(i, bloque, true, op.retro + primera);
          } else if (estado[i].intentos === 1) {
            // Primer fallo: se descarta esa opción, se da la pista y se reintenta
            b.disabled = true;
            b.classList.add('incorrecta');
            estado[i].primerFallo = op.retro;
            mostrarPista(i, bloque);
          } else {
            botones.forEach((x, k) => { x.disabled = true; if (p.opciones[k].correcta) x.classList.add('correcta'); });
            b.classList.add('incorrecta');
            cerrar(i, bloque, false, op.retro + primera);
          }
        });
        lista.appendChild(b);
        return b;
      });
      bloque.appendChild(lista);
    }

    bloque.appendChild(pista);
    bloque.appendChild(retro);
    contenedor.appendChild(bloque);
  });

  katexEn(contenedor);
  actualizarMarcador();

  const reiniciar = raiz.querySelector('.quiz-reiniciar');
  if (reiniciar) reiniciar.onclick = () => renderAutoevaluacion(raiz, preguntasOriginales);
}

// ================================================================
// Ejercicios guiados: desplegables de pista y solución
// ================================================================
function iniciarEjerciciosGuiados() {
  // wrapCodeBlocks() colapsa todos los <pre> del módulo. Dentro de una
  // solución eso obligaría a un segundo clic para ver el código que el
  // estudiante acaba de pedir, así que ahí se dejan desplegados.
  mainContent.querySelectorAll('.ejercicio-panel pre.collapsed').forEach(pre => {
    pre.classList.remove('collapsed');
    pre.classList.add('expanded');
    const boton = pre.closest('.code-block-wrapper')?.querySelector('.code-toggle-btn');
    if (boton) boton.classList.add('expanded');
  });

  mainContent.querySelectorAll('.ejercicio-boton').forEach(boton => {
    const panel = document.getElementById(boton.getAttribute('aria-controls'));
    if (!panel) return;
    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      panel.hidden = abierto;
      if (!abierto) {
        if (typeof Prism !== 'undefined') Prism.highlightAllUnder(panel);
        katexEn(panel);
      }
    });
  });
}

// ================================================================
// Derivaciones plegables
//
// Uso: un <div class="derivacion"> con un .derivacion-boton
// (aria-controls apuntando al id del .derivacion-panel, que arranca
// con el atributo hidden). El desarrollo va en un <ol class="derivacion-pasos">.
//
// loadModule() ya pasa KaTeX por TODO el módulo, incluidos los paneles
// ocultos, así que las fórmulas están renderizadas antes del primer clic;
// katexEn(panel) aquí es la red de seguridad para contenido inyectado
// después (una derivación dentro de una solución, por ejemplo).
// ================================================================
// ================================================================
// Componente .ciclo — diagrama de etapas recorrible
// ================================================================
// Cada `<div class="ciclo">` lleva una lista `role="tablist"` de
// botones `.ciclo-boton` con aria-controls apuntando a su panel. Se
// muestra una etapa a la vez; las flechas del teclado recorren el
// ciclo (y dan la vuelta al llegar al final, que es justo lo que hace
// el procedimiento que representa).
function iniciarCiclos() {
  mainContent.querySelectorAll('.ciclo').forEach(raiz => {
    const botones = Array.from(raiz.querySelectorAll('.ciclo-boton'));
    const paneles = botones.map(b => document.getElementById(b.getAttribute('aria-controls')));
    if (!botones.length || paneles.some(p => !p)) return;

    function seleccionar(i, moverFoco) {
      botones.forEach((boton, j) => {
        const activo = j === i;
        boton.setAttribute('aria-selected', String(activo));
        boton.tabIndex = activo ? 0 : -1;
        paneles[j].hidden = !activo;
      });
      katexEn(paneles[i]);
      if (moverFoco) botones[i].focus();
    }

    botones.forEach((boton, i) => {
      boton.addEventListener('click', () => seleccionar(i, false));
      boton.addEventListener('keydown', evento => {
        const paso = (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') ? 1
          : (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') ? -1 : 0;
        if (paso === 0) return;
        evento.preventDefault();
        seleccionar((i + paso + botones.length) % botones.length, true);
      });
    });

    const inicial = botones.findIndex(b => b.getAttribute('aria-selected') === 'true');
    seleccionar(inicial >= 0 ? inicial : 0, false);
  });
}

function iniciarDerivaciones() {
  mainContent.querySelectorAll('.derivacion-boton').forEach(boton => {
    const panel = document.getElementById(boton.getAttribute('aria-controls'));
    if (!panel) return;
    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abierto));
      panel.hidden = abierto;
      const texto = boton.querySelector('.derivacion-texto');
      if (texto) texto.textContent = abierto ? 'Ver el desarrollo paso a paso' : 'Ocultar el desarrollo';
      if (!abierto) katexEn(panel);
    });
  });
}
// ================================================================
// Componente .rubrica — criterios de calificación recorribles
//
// RUBRICAS['id'] = {titulo, intro, total, criterios, anulan, nota}
// sobre un contenedor con data-rubrica="id". Cada criterio es
//
//   { clave, nombre, puntos, foco, niveles: [{nombre, rango, observa}] }
//
// Los niveles se declaran de mayor a menor desempeño; el índice
// decide el color de la banda lateral, así que el orden importa.
//
// Si se declara `total` y los criterios no lo suman, avisa por consola
// en vez de callarse: una rúbrica sobre 95 es la clase de cuenta que
// nadie rehace. El texto admite LaTeX entre $…$ y marcado HTML, y al
// cambiar de criterio se vuelve a pasar KaTeX por el panel.
// ================================================================
const RUBRICAS = {};


function iniciarRubricas() {
  mainContent.querySelectorAll('[data-rubrica]').forEach(raiz => {
    const spec = RUBRICAS[raiz.dataset.rubrica];
    if (!spec) {
      console.warn(`Rúbrica no registrada: ${raiz.dataset.rubrica}`);
      return;
    }
    pintarRubrica(raiz, spec);
  });
}

function pintarRubrica(raiz, spec) {
  const suma = spec.criterios.reduce((a, c) => a + (c.puntos || 0), 0);
  const total = spec.total || suma;
  if (spec.total && spec.total !== suma) {
    console.warn(`Rúbrica ${raiz.dataset.rubrica}: los criterios suman ${suma} y el total declarado es ${spec.total}`);
  }

  raiz.innerHTML = `
    <p class="rubrica-titulo"><i class="fas fa-list-check" aria-hidden="true"></i>${spec.titulo}
      <span class="rubrica-puntos-total">${total} pts</span></p>
    ${spec.intro ? `<p class="rubrica-intro">${spec.intro}</p>` : ''}
    <div class="rubrica-criterios" role="group" aria-label="${spec.titulo}"></div>
    <div class="rubrica-detalle" role="status" aria-live="polite"></div>
    ${(spec.anulan || []).length ? `<div class="rubrica-anula">
      <span class="rotulo">${spec.rotuloAnula || 'Condiciones que anulan el trabajo'}</span>
      <ul>${spec.anulan.map(a => `<li>${a}</li>`).join('')}</ul>
    </div>` : ''}
    ${spec.nota ? `<p class="rubrica-nota">${spec.nota}</p>` : ''}`;

  const lista = raiz.querySelector('.rubrica-criterios');
  const detalle = raiz.querySelector('.rubrica-detalle');

  spec.criterios.forEach((crit, i) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'rubrica-criterio';
    boton.dataset.criterio = String(i);
    boton.setAttribute('aria-pressed', 'false');
    boton.innerHTML = `
      <span class="rubrica-criterio-clave">${crit.clave}</span>
      <span class="rubrica-criterio-nombre">${crit.nombre}</span>
      <span class="rubrica-criterio-puntos">${crit.puntos} pts · ${Math.round(100 * crit.puntos / total)} % de la nota</span>`;
    boton.addEventListener('click', () => seleccionar(i));
    lista.appendChild(boton);
  });

  function seleccionar(i) {
    const crit = spec.criterios[i];
    lista.querySelectorAll('.rubrica-criterio').forEach(b => {
      const activo = b.dataset.criterio === String(i);
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-pressed', String(activo));
    });

    detalle.innerHTML =
      (crit.foco ? `<p class="rubrica-foco"><strong>${crit.clave} · ${crit.nombre} (${crit.puntos} pts).</strong> ${crit.foco}</p>` : '') +
      `<div class="rubrica-niveles">${crit.niveles.map((n, g) => `
        <div class="rubrica-nivel" data-grado="${g}">
          <span class="rubrica-nivel-marca">
            <span class="rubrica-nivel-nombre">${n.nombre}</span>
            <span class="rubrica-nivel-rango">${n.rango} pts</span>
          </span>
          <p class="rubrica-nivel-observa">${n.observa}</p>
        </div>`).join('')}</div>`;

    if (typeof katexEn === 'function') katexEn(detalle);
  }

  const anula = raiz.querySelector('.rubrica-anula');
  if (anula && typeof katexEn === 'function') katexEn(anula);
  seleccionar(0);
}
