// Punto de entrada: arma el diseño general, el menú según el rol y el enrutador por hash (#/ruta).
import { h, icono, limpiar, iniciales, cargando, aviso, escudo, selectorTema } from './ui.js';
import { sesion, rolPrincipal, cargarPersona, nombrePersona } from './sesion.js';
import { mostrarAcceso } from './views/acceso.js';

const MENUS = {
  GERENTE: [
    { seccion: 'General' },
    { ruta: '', texto: 'Panel', icono: 'panel' },
    { seccion: 'Personas' },
    { ruta: 'estudiantes', texto: 'Estudiantes', icono: 'estudiante' },
    { ruta: 'acudientes', texto: 'Acudientes', icono: 'acudiente' },
    { ruta: 'entrenadores', texto: 'Entrenadores', icono: 'entrenador' },
    { seccion: 'Deportivo' },
    { ruta: 'categorias', texto: 'Categorías', icono: 'categoria' },
    { ruta: 'grupos', texto: 'Grupos', icono: 'grupo' },
    { ruta: 'entrenamientos', texto: 'Entrenamientos', icono: 'entrenamiento' },
    { ruta: 'campeonatos', texto: 'Campeonatos', icono: 'trofeo' },
    { ruta: 'evaluaciones', texto: 'Evaluaciones', icono: 'evaluacion' },
    { seccion: 'Administración' },
    { ruta: 'mensualidades', texto: 'Mensualidades', icono: 'dinero' },
    { ruta: 'notificaciones', texto: 'Notificaciones', icono: 'campana' },
    { ruta: 'usuarios', texto: 'Usuarios', icono: 'usuario' },
  ],
  ENTRENADOR: [
    { ruta: '', texto: 'Mi panel', icono: 'panel' },
    { ruta: 'grupos', texto: 'Mis grupos', icono: 'grupo' },
    { ruta: 'entrenamientos', texto: 'Entrenamientos', icono: 'entrenamiento' },
    { ruta: 'campeonatos', texto: 'Campeonatos', icono: 'trofeo' },
    { ruta: 'evaluaciones', texto: 'Evaluaciones', icono: 'evaluacion' },
    { ruta: 'notificaciones', texto: 'Notificaciones', icono: 'campana' },
  ],
  ACUDIENTE: [
    { ruta: '', texto: 'Mis estudiantes', icono: 'estudiante' },
    { ruta: 'notificaciones', texto: 'Notificaciones', icono: 'campana' },
  ],
  ESTUDIANTE: [
    { ruta: '', texto: 'Mi perfil', icono: 'estudiante' },
    { ruta: 'notificaciones', texto: 'Notificaciones', icono: 'campana' },
  ],
};

const TITULOS = {
  '': 'Inicio', estudiantes: 'Estudiantes', acudientes: 'Acudientes', entrenadores: 'Entrenadores', categorias: 'Categorías',
  grupos: 'Grupos', entrenamientos: 'Entrenamientos', campeonatos: 'Campeonatos', partidos: 'Partidos', evaluaciones: 'Evaluaciones',
  mensualidades: 'Mensualidades', notificaciones: 'Notificaciones', usuarios: 'Usuarios', demo: 'Datos de demostración',
};

// Cada ruta carga su módulo solo cuando se visita.
const VISTAS = {
  estudiantes: () => import('./views/estudiantes.js'),
  acudientes: () => import('./views/acudientes.js'),
  entrenadores: () => import('./views/entrenadores.js'),
  categorias: () => import('./views/categorias.js'),
  grupos: () => import('./views/grupos.js'),
  entrenamientos: () => import('./views/entrenamientos.js'),
  campeonatos: () => import('./views/campeonatos.js'),
  partidos: () => import('./views/campeonatos.js'),
  evaluaciones: () => import('./views/evaluaciones.js'),
  mensualidades: () => import('./views/mensualidades.js'),
  notificaciones: () => import('./views/notificaciones.js'),
  usuarios: () => import('./views/usuarios.js'),
  demo: () => import('./views/demo.js'),
};
const INICIOS = {
  GERENTE: () => import('./views/panel.js'),
  ENTRENADOR: () => import('./views/panel-entrenador.js'),
  ACUDIENTE: () => import('./views/portal.js'),
  ESTUDIANTE: () => import('./views/portal.js'),
};

const raiz = document.getElementById('raiz');
let contenido, miga, lateral;

export function navegar(ruta) { location.hash = '#/' + ruta; }

function rutaActual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { seccion: partes[0] || '', params: partes.slice(1) };
}

async function iniciar() {
  const usuario = sesion.actual();
  if (!usuario) { mostrarAcceso(raiz, entrar); return; }
  if (!usuario.nombre && usuario.personaId) {
    const p = await cargarPersona(usuario);
    if (p) { usuario.nombre = nombrePersona(p); sesion.guardar(usuario); }
  }
  armarDiseno(usuario);
  window.addEventListener('hashchange', enrutar);
  enrutar();
}

function entrar(usuario) {
  sesion.guardar(usuario);
  location.hash = '#/';
  location.reload();
}

function salir() {
  sesion.cerrar();
  location.hash = '';
  location.reload();
}

function armarDiseno(usuario) {
  const rol = rolPrincipal(usuario);
  const menu = h('nav', { class: 'menu', 'aria-label': 'Menú principal' },
    MENUS[rol].map((item) => item.seccion
      ? h('div', { class: 'seccion' }, item.seccion)
      : h('a', { href: '#/' + item.ruta, 'data-ruta': item.ruta, onclick: () => lateral.classList.remove('abierto') }, icono(item.icono), item.texto)));
  const nombre = usuario.nombre || usuario.correo;
  lateral = h('aside', { class: 'lateral' },
    h('div', { class: 'marca-logo' }, escudo('emblema-lateral'), h('b', {}, 'Soccer ', h('span', {}, 'Manager'))),
    menu,
    h('div', { class: 'usuario-lateral' },
      h('div', { class: 'avatar' }, iniciales(nombre)),
      h('div', { class: 'datos' }, h('b', {}, nombre), h('span', {}, rol.charAt(0) + rol.slice(1).toLowerCase())),
      h('button', { title: 'Cerrar sesión', 'aria-label': 'Cerrar sesión', onclick: salir }, icono('salir'))));
  miga = h('div', { class: 'miga' });
  contenido = h('main', { class: 'contenido', id: 'contenido' });
  limpiar(raiz, h('div', { class: 'app' }, lateral,
    h('div', { class: 'principal' },
      h('header', { class: 'barra-superior' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          h('button', { class: 'btn fantasma icono boton-menu', 'aria-label': 'Abrir menú', onclick: () => lateral.classList.toggle('abierto') }, icono('menu')),
          miga),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px' } },
          h('span', { class: 'mutado pequeno fecha-barra' }, new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
          selectorTema())),
      contenido)));
}

async function enrutar() {
  const usuario = sesion.actual();
  const rol = rolPrincipal(usuario);
  const { seccion, params } = rutaActual();
  const permitidas = MENUS[rol].filter((m) => m.ruta !== undefined).map((m) => m.ruta);
  const extra = rol === 'GERENTE' ? ['partidos', 'demo'] : rol === 'ENTRENADOR' ? ['partidos', 'estudiantes'] : [];
  if (!permitidas.includes(seccion) && !extra.includes(seccion)) { navegar(''); return; }

  lateral.querySelectorAll('.menu a').forEach((a) => {
    const r = a.dataset.ruta;
    a.classList.toggle('activo', r === seccion || (seccion === 'partidos' && r === 'campeonatos'));
  });
  limpiar(miga, 'Soccer Manager / ', h('b', {}, TITULOS[seccion] || ''));
  limpiar(contenido, cargando());
  window.scrollTo(0, 0);
  try {
    const modulo = await (seccion === '' ? INICIOS[rol]() : VISTAS[seccion]());
    const contexto = { usuario, rol, params, seccion, navegar, recargar: enrutar };
    await modulo.mostrar(contenido, contexto);
  } catch (e) {
    console.error(e);
    limpiar(contenido, h('div', { class: 'alerta error' }, icono('alerta'), h('div', {}, e.message || 'No se pudo cargar la página')));
    if (e.estado === 0) aviso(e.message, 'error');
  }
}

iniciar();
