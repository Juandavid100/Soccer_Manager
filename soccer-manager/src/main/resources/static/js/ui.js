// Utilidades de interfaz: creación de elementos, íconos, formatos, tablas, formularios, modales y avisos.

// ---------- Elementos ----------
export function h(etiqueta, atributos, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'class') el.className = valor;
    else if (clave === 'html') el.innerHTML = valor;
    else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor);
    else if (clave === 'style' && typeof valor === 'object') Object.assign(el.style, valor);
    else if (valor === true) el.setAttribute(clave, '');
    else el.setAttribute(clave, valor);
  }
  agregar(el, hijos);
  return el;
}

function agregar(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.appendChild(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
}

export function limpiar(el, ...hijos) {
  el.replaceChildren();
  agregar(el, hijos);
  return el;
}

// ---------- Íconos (trazos SVG propios, sin dependencias) ----------
const TRAZOS = {
  panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  estudiante: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  acudiente: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5M15 14.2c3.4-.6 6.5 1.9 6.5 5.8"/>',
  entrenador: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="M15.5 13.5 12 17l-3.5-3.5"/>',
  categoria: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z"/><circle cx="16.5" cy="16.5" r="3.5"/>',
  grupo: '<circle cx="7" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><circle cx="12" cy="6" r="3"/><path d="M2 20c0-3 2.2-5 5-5 1 0 2 .3 2.8.8M22 20c0-3-2.2-5-5-5-1 0-2 .3-2.8.8M7 20c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5"/>',
  entrenamiento: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trofeo: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  evaluacion: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  dinero: '<rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="3"/><path d="M6 10v.01M18 15v.01"/>',
  campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  usuario: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  editar: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  borrar: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  balon: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5l2.5 4M9.5 14.5 7 18.5M8 10 3.5 8.5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  enviar: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  retirar: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  datos: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  lista: '<path d="M9 6h12M9 12h12M9 18h12M4 6v.01M4 12v.01M4 18v.01"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z"/>',
};

export function icono(nombre, clase) {
  const span = document.createElement('span');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${clase ? ` class="${clase}"` : ''}>${TRAZOS[nombre] || ''}</svg>`;
  return span.firstChild;
}

// ---------- Formatos ----------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const formato = {
  dinero: (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v) || 0),
  fecha(v) {
    if (!v) return '—';
    const [a, m, d] = String(v).slice(0, 10).split('-');
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
  },
  fechaHora(v) {
    if (!v) return '—';
    const t = String(v);
    return `${formato.fecha(t)}, ${formato.hora(t)}`;
  },
  hora(v) {
    if (!v || String(v).length < 16) return '';
    let [hh, mm] = String(v).slice(11, 16).split(':').map(Number);
    const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
    hh = hh % 12 || 12;
    return `${hh}:${String(mm).padStart(2, '0')} ${sufijo}`;
  },
  periodo(v) {
    if (!v || !/^\d{4}-\d{1,2}$/.test(v)) return v || '—';
    const [a, m] = v.split('-');
    return `${MESES_LARGOS[Number(m) - 1]} ${a}`;
  },
  dia: (v) => String(v || '').slice(8, 10),
  mes: (v) => MESES[Number(String(v || '').slice(5, 7)) - 1] || '',
  edad(fechaNacimiento) {
    if (!fechaNacimiento) return null;
    const n = new Date(fechaNacimiento + 'T00:00:00');
    const hoy = new Date();
    let edad = hoy.getFullYear() - n.getFullYear();
    const m = hoy.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
    return edad;
  },
  texto: (v) => (v === null || v === undefined || v === '' ? '—' : v),
  enum: (v) => (v ? String(v).replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : '—'),
};

export const hoy = () => fechaLocal(new Date());
export function fechaLocal(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function fechaHoraLocal(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${fechaLocal(d)}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function iniciales(texto) {
  return String(texto || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

// ---------- Estados ----------
const TONOS = {
  ACTIVO: 'ok', PAGADO: 'ok', CONFIRMADO: 'ok', PRESENTE: 'ok', REALIZADO: 'ok', ACTIVA: 'ok', EN_CURSO: 'ok', FINALIZADO: 'neutro', EGRESADO: 'neutro',
  PENDIENTE: 'aviso', PARCIAL: 'aviso', SIN_RESPUESTA: 'aviso', TARDE: 'aviso', REPROGRAMADO: 'aviso', EN_PREPARACION: 'aviso', INSCRIPCION_ABIERTA: 'info',
  PROGRAMADO: 'info', PLANIFICADO: 'info', JUSTIFICADO: 'info',
  VENCIDO: 'mal', AUSENTE: 'mal', CANCELADO: 'mal', RETIRADO: 'mal', SUSPENDIDO: 'mal', SUSPENDIDA: 'mal', NO_ASISTIRA: 'mal', CERRADO: 'neutro',
};
export function estado(valor) {
  return h('span', { class: `estado ${TONOS[valor] || 'neutro'}` }, formato.enum(valor));
}

// ---------- Avisos flotantes ----------
export function aviso(mensaje, tipo = 'ok') {
  const caja = document.getElementById('avisos');
  const el = h('div', { class: `toast ${tipo}`, role: 'status' }, icono(tipo === 'error' ? 'alerta' : 'check'), h('div', {}, mensaje));
  caja.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'error' ? 6500 : 3800);
}

// ---------- Modales ----------
export function modal({ titulo, cuerpo, pie, grande, alCerrar }) {
  const anterior = document.activeElement;
  const velo = h('div', { class: 'velo' });
  const cerrar = () => {
    velo.remove();
    document.removeEventListener('keydown', teclas);
    if (anterior && anterior.focus) anterior.focus();
    if (alCerrar) alCerrar();
  };
  const teclas = (e) => { if (e.key === 'Escape') cerrar(); };
  const caja = h('div', { class: `modal${grande ? ' grande' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
    h('div', { class: 'cabeza' }, h('h2', {}, titulo), h('button', { class: 'btn fantasma icono', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))),
    h('div', { class: 'cuerpo' }, cuerpo),
    pie ? h('div', { class: 'pie' }, pie) : null,
  );
  velo.appendChild(caja);
  velo.addEventListener('mousedown', (e) => { if (e.target === velo) cerrar(); });
  document.addEventListener('keydown', teclas);
  document.body.appendChild(velo);
  setTimeout(() => { const foco = caja.querySelector('input, select, textarea'); if (foco) foco.focus(); }, 30);
  return { cerrar, caja };
}

export function confirmar(mensaje, { titulo = 'Confirmar', boton = 'Confirmar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let decidido = false;
    const m = modal({
      titulo,
      cuerpo: h('p', { style: { margin: 0 } }, mensaje),
      pie: [
        h('button', { class: 'btn', onclick: () => m.cerrar() }, 'Cancelar'),
        h('button', { class: `btn ${peligro ? 'peligro-lleno' : 'primario'}`, onclick: () => { decidido = true; m.cerrar(); } }, boton),
      ],
      alCerrar: () => resolver(decidido),
    });
  });
}

// ---------- Formularios ----------
// campos: [{ nombre, etiqueta, tipo, opciones, requerido, ancho, ayuda, min, max, paso, placeholder }]
// tipo: texto | correo | numero | fecha | fechahora | select | multiple | area | casilla | clave | subtitulo
export function construirFormulario(campos, valores = {}) {
  const form = h('form', { class: 'formulario', novalidate: true });
  for (const c of campos) {
    if (c.tipo === 'subtitulo') { form.appendChild(h('div', { class: 'grupo-subtitulo' }, c.etiqueta)); continue; }
    const id = 'f-' + c.nombre.replaceAll('.', '-');
    const valor = obtener(valores, c.nombre);
    let control;
    if (c.tipo === 'select' || c.tipo === 'multiple') {
      control = h('select', { id, name: c.nombre, multiple: c.tipo === 'multiple' },
        c.tipo === 'select' ? h('option', { value: '' }, c.placeholder || 'Seleccione…') : null,
        (c.opciones || []).map((o) => {
          const seleccionado = c.tipo === 'multiple' ? (valor || []).includes(o.valor) : String(valor ?? '') === String(o.valor);
          return h('option', { value: o.valor, selected: seleccionado }, o.texto);
        }));
    } else if (c.tipo === 'area') {
      control = h('textarea', { id, name: c.nombre, placeholder: c.placeholder });
      control.value = valor ?? '';
    } else if (c.tipo === 'casilla') {
      control = h('input', { id, name: c.nombre, type: 'checkbox', checked: !!valor });
      form.appendChild(h('div', { class: `campo${c.ancho ? ' ancho' : ''}` }, h('label', { class: 'casilla', for: id }, control, c.etiqueta), c.ayuda ? h('span', { class: 'ayuda' }, c.ayuda) : null));
      continue;
    } else {
      const tipos = { texto: 'text', correo: 'email', numero: 'number', fecha: 'date', fechahora: 'datetime-local', clave: 'password', telefono: 'tel' };
      control = h('input', { id, name: c.nombre, type: tipos[c.tipo] || 'text', min: c.min, max: c.max, step: c.paso, placeholder: c.placeholder, autocomplete: c.tipo === 'clave' ? 'new-password' : 'off' });
      let v = valor ?? '';
      if (c.tipo === 'fechahora' && v) v = String(v).slice(0, 16);
      control.value = v;
    }
    if (c.requerido) control.required = true;
    if (c.soloLectura) control.disabled = true;
    form.appendChild(h('div', { class: `campo${c.ancho ? ' ancho' : ''}` },
      h('label', { for: id }, c.etiqueta, c.requerido ? h('span', { class: 'req' }, ' *') : null),
      control,
      c.ayuda ? h('span', { class: 'ayuda' }, c.ayuda) : null));
  }
  return form;
}

export function leerFormulario(form, campos) {
  const datos = {};
  for (const c of campos) {
    if (c.tipo === 'subtitulo' || c.soloLectura) continue;
    const el = form.elements[c.nombre];
    if (!el) continue;
    let v;
    if (c.tipo === 'casilla') v = el.checked;
    else if (c.tipo === 'multiple') v = [...el.selectedOptions].map((o) => o.value);
    else if (c.tipo === 'numero') v = el.value === '' ? null : Number(el.value);
    else v = el.value.trim() === '' ? null : el.value.trim();
    poner(datos, c.nombre, v);
  }
  return datos;
}

function validar(form, campos) {
  for (const c of campos) {
    if (!c.requerido || c.tipo === 'subtitulo') continue;
    const el = form.elements[c.nombre];
    const vacio = c.tipo === 'multiple' ? el.selectedOptions.length === 0 : !String(el.value).trim();
    if (vacio) { el.focus(); return `El campo «${c.etiqueta}» es obligatorio`; }
  }
  return null;
}

function obtener(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function poner(obj, ruta, valor) {
  const partes = ruta.split('.');
  let o = obj;
  partes.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; });
  o[partes.at(-1)] = valor;
}

// Abre un formulario en un modal. alGuardar(datos) puede lanzar ErrorApi: el mensaje se muestra dentro del modal.
export function formularioModal({ titulo, campos, valores, boton = 'Guardar', alGuardar, grande, nota, alCerrar }) {
  const form = construirFormulario(campos, valores);
  const error = h('div', { class: 'alerta error oculto', role: 'alert' });
  const guardar = h('button', { class: 'btn primario', type: 'submit' }, icono('check'), boton);
  form.appendChild(h('button', { type: 'submit', class: 'oculto' }));
  const cuerpo = h('div', {}, nota ? h('div', { class: 'alerta info', style: { marginBottom: '14px' } }, icono('info'), h('div', {}, nota)) : null, error, form);
  const m = modal({ titulo, cuerpo, grande, alCerrar, pie: [h('button', { class: 'btn', type: 'button', onclick: () => m.cerrar() }, 'Cancelar'), guardar] });
  const enviar = async (e) => {
    e.preventDefault();
    const falta = validar(form, campos);
    if (falta) { mostrarError(error, falta); return; }
    guardar.disabled = true;
    try {
      await alGuardar(leerFormulario(form, campos), form);
      m.cerrar();
    } catch (err) {
      mostrarError(error, err.message || 'No se pudo guardar');
    } finally {
      guardar.disabled = false;
    }
  };
  form.addEventListener('submit', enviar);
  guardar.addEventListener('click', enviar);
  return m;
}

function mostrarError(caja, mensaje) {
  limpiar(caja, icono('alerta'), h('div', {}, mensaje));
  caja.classList.remove('oculto');
  caja.style.marginBottom = '14px';
}

export function pedirMotivo(titulo, { etiqueta = 'Motivo', boton = 'Confirmar', nota } = {}) {
  return new Promise((resolver) => {
    let resultado = null;
    formularioModal({
      titulo, boton, nota,
      campos: [{ nombre: 'motivo', etiqueta, tipo: 'area', requerido: true, ancho: true }],
      alGuardar: async (d) => { resultado = d.motivo; },
      alCerrar: () => resolver(resultado),
    });
  });
}

// ---------- Tablas ----------
export function tabla({ columnas, filas, vacio = 'No hay registros todavía', alClic }) {
  if (!filas.length) return h('div', { class: 'vacio' }, icono('lista'), vacio);
  return h('div', { class: 'tabla-envoltura' },
    h('table', { class: 'tabla' },
      h('thead', {}, h('tr', {}, columnas.map((c) => h('th', { class: c.clase }, c.titulo)))),
      h('tbody', {}, filas.map((f) => h('tr', { class: alClic ? 'clic' : null, onclick: alClic ? (e) => { if (!e.target.closest('button, a')) alClic(f); } : null },
        columnas.map((c) => h('td', { class: c.clase }, c.valor(f))))))));
}

export function acciones(...botones) {
  return h('div', { class: 'acciones-fila' }, botones.filter(Boolean));
}

export function botonIcono(nombre, titulo, alClic, clase = '') {
  return h('button', { class: `btn fantasma icono chico ${clase}`, title: titulo, 'aria-label': titulo, onclick: alClic }, icono(nombre));
}

// ---------- Piezas de página ----------
export function encabezado(titulo, descripcion, ...botones) {
  return h('div', { class: 'encabezado' },
    h('div', {}, h('h1', {}, titulo), descripcion ? h('p', {}, descripcion) : null),
    h('div', { class: 'acciones' }, botones.filter(Boolean)));
}

export function boton(texto, alClic, { clase = '', icono: ico } = {}) {
  return h('button', { class: `btn ${clase}`, onclick: alClic }, ico ? icono(ico) : null, texto);
}

export function tarjeta(titulo, contenido, ...extra) {
  return h('section', { class: 'tarjeta' },
    titulo ? h('div', { class: 'cabeza' }, h('h2', {}, titulo), h('div', { class: 'acciones' }, extra.filter(Boolean))) : null,
    contenido);
}

export function cargando() {
  return h('div', { class: 'vacio' }, 'Cargando…');
}

export function buscador(placeholder, alEscribir) {
  const input = h('input', { type: 'search', placeholder, 'aria-label': placeholder });
  input.addEventListener('input', () => alEscribir(input.value.trim().toLowerCase()));
  return h('div', { class: 'buscador' }, icono('buscar'), input);
}

export function selector(opciones, alCambiar, { todos = 'Todos', valor = '' } = {}) {
  const s = h('select', { style: { width: 'auto', minWidth: '170px' } },
    todos ? h('option', { value: '' }, todos) : null,
    opciones.map((o) => h('option', { value: o.valor, selected: String(o.valor) === String(valor) }, o.texto)));
  s.addEventListener('change', () => alCambiar(s.value));
  return s;
}

// Color estable para cada nombre, para que los avatares no se vean todos iguales.
export function tonoAvatar(texto) {
  let n = 0;
  for (const c of String(texto || '')) n = (n * 31 + c.charCodeAt(0)) % 997;
  return `c${n % 6}`;
}

export function persona(nombre, detalle) {
  return h('div', { class: 'persona' }, h('div', { class: `avatar ${tonoAvatar(nombre)}` }, iniciales(nombre)), h('div', {}, h('b', {}, nombre), detalle ? h('span', {}, detalle) : null));
}

// Encabezado grande de las pantallas de inicio, con el dibujo de una cancha.
export function banner(titulo, descripcion, ...botones) {
  const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoy = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return h('section', { class: 'banner' },
    h('div', { class: 'banner-texto' },
      h('span', { class: 'banner-fecha' }, icono('reloj'), hoy),
      h('h1', {}, titulo),
      descripcion ? h('p', {}, descripcion) : null),
    h('div', { class: 'acciones' }, botones.filter(Boolean)));
}

// Reemplaza las fechas en formato ISO dentro de un texto por una fecha legible.
export function textoLegible(texto) {
  return String(texto || '').replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?/g, (iso) => formato.fechaHora(iso));
}

// Gráfico de dona: segmentos [{ valor, color, etiqueta }].
export function dona(segmentos, centro, subtitulo) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const radio = 52, perimetro = 2 * Math.PI * radio;
  let avance = 0;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 140 140');
  svg.setAttribute('class', 'dona-svg');
  const fondo = document.createElementNS(ns, 'circle');
  Object.entries({ cx: 70, cy: 70, r: radio, fill: 'none', stroke: '#EDF2EF', 'stroke-width': 16 }).forEach(([k, v]) => fondo.setAttribute(k, v));
  svg.appendChild(fondo);
  if (total > 0) {
    segmentos.filter((x) => x.valor > 0).forEach((x) => {
      const largo = (x.valor / total) * perimetro;
      const arco = document.createElementNS(ns, 'circle');
      Object.entries({ cx: 70, cy: 70, r: radio, fill: 'none', stroke: x.color, 'stroke-width': 16,
        'stroke-dasharray': `${Math.max(largo - 2, 0)} ${perimetro}`, 'stroke-dashoffset': -avance, transform: 'rotate(-90 70 70)' })
        .forEach(([k, v]) => arco.setAttribute(k, v));
      svg.appendChild(arco);
      avance += largo;
    });
  }
  return h('div', { class: 'dona' },
    h('div', { class: 'dona-grafico' }, svg, h('div', { class: 'dona-centro' }, h('b', {}, centro ?? total), h('span', {}, subtitulo || 'total'))),
    h('ul', { class: 'dona-leyenda' }, segmentos.map((x) => h('li', {},
      h('i', { style: { background: x.color } }), h('span', {}, x.etiqueta), h('b', {}, x.valor)))));
}

export function datos(pares) {
  return h('dl', { class: 'datos-lista' }, pares.filter(Boolean).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v instanceof Node ? v : formato.texto(v)))));
}

export function pestanas(definicion) {
  const contenedor = h('div', {});
  const barra = h('div', { class: 'pestanas', role: 'tablist' });
  const mostrar = (i) => {
    [...barra.children].forEach((b, j) => b.classList.toggle('activa', i === j));
    limpiar(contenedor, cargando());
    Promise.resolve(definicion[i].contenido()).then((c) => limpiar(contenedor, c)).catch((e) => limpiar(contenedor, h('div', { class: 'alerta error' }, e.message)));
  };
  definicion.forEach((p, i) => barra.appendChild(h('button', { role: 'tab', onclick: () => mostrar(i) }, p.titulo)));
  mostrar(0);
  return h('div', {}, barra, contenedor);
}

export function barraProgreso(porcentaje, tono = '') {
  const p = Math.max(0, Math.min(100, Number(porcentaje) || 0));
  return h('div', { class: `barra ${tono}`, title: `${p.toFixed(0)} %` }, h('span', { style: { width: p + '%' } }));
}

// Ejecuta una acción, muestra aviso de éxito o de error y luego refresca.
export async function ejecutar(accion, exito, refrescar) {
  try {
    await accion();
    if (exito) aviso(exito);
    if (refrescar) await refrescar();
  } catch (e) {
    aviso(e.message, 'error');
  }
}

export const opciones = (lista, texto, valor = 'id') => lista.map((x) => ({ valor: x[valor], texto: typeof texto === 'function' ? texto(x) : x[texto] }));
export const enumOpciones = (valores) => valores.map((v) => ({ valor: v, texto: formato.enum(v) }));
