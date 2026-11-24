// Entrenamientos: programación, reprogramación, cancelación y asistencia (HU-08, HU-10).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formato, formularioModal, ejecutar, confirmar, pedirMotivo, aviso, opciones, selector, acciones, botonIcono, datos, fechaHoraLocal } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombreUsuario, esGerente, cargarPersona } from '../sesion.js';
import { panelAsistencia } from './asistencia.js';

export async function mostrar(contenedor, ctx) {
  if (ctx.params[0]) return detalle(contenedor, ctx, ctx.params[0]);
  return listado(contenedor, ctx);
}

// Permisos: la gerencia puede todo; el entrenador necesita el permiso "modificar actividades".
async function permisos(ctx) {
  if (esGerente(ctx.usuario)) return { modificar: true, crear: true };
  const ent = await cargarPersona(ctx.usuario);
  return { modificar: !!ent?.puedeModificarActividades, crear: true, entrenador: ent };
}

function acciones_(ctx, puede, e, refrescar) {
  const usuario = nombreUsuario(ctx.usuario);
  const activa = e.estado !== 'CANCELADO' && e.estado !== 'REALIZADO';
  return {
    reprogramar: puede.modificar && activa ? () => formularioModal({
      titulo: 'Reprogramar entrenamiento', boton: 'Reprogramar',
      nota: 'El grupo recibirá una notificación con el nuevo horario.',
      campos: [
        { nombre: 'fechaInicio', etiqueta: 'Nuevo inicio', tipo: 'fechahora', requerido: true },
        { nombre: 'fechaFin', etiqueta: 'Nuevo fin', tipo: 'fechahora', requerido: true },
      ],
      valores: e,
      alGuardar: async (d) => { await api.patch(`${R.entrenamientos}/${e.id}/reprogramacion`, { ...d, usuario }); aviso('Entrenamiento reprogramado'); await refrescar(); },
    }) : null,
    cancelar: puede.modificar && activa ? async () => {
      const motivo = await pedirMotivo('Cancelar entrenamiento', { boton: 'Cancelar entrenamiento', nota: 'Se notificará al grupo.' });
      if (motivo) ejecutar(() => api.patch(`${R.entrenamientos}/${e.id}/cancelacion`, { motivo, usuario }), 'Entrenamiento cancelado', refrescar);
    } : null,
    editar: () => formularioModal({
      titulo: 'Instrucciones del entrenamiento',
      campos: [{ nombre: 'instrucciones', etiqueta: 'Instrucciones', tipo: 'area', ancho: true }],
      valores: e,
      alGuardar: async (d) => { await api.put(`${R.entrenamientos}/${e.id}`, { ...e, ...d }); aviso('Instrucciones actualizadas'); await refrescar(); },
    }),
    eliminar: esGerente(ctx.usuario) ? async () => {
      if (await confirmar('¿Eliminar este entrenamiento? Si ya tiene asistencia, cancélelo en su lugar.', { boton: 'Eliminar', peligro: true }))
        ejecutar(() => api.delete(`${R.entrenamientos}/${e.id}`), 'Entrenamiento eliminado', refrescar);
    } : null,
  };
}

async function listado(contenedor, ctx) {
  const puede = await permisos(ctx);
  let filtroGrupo = '', vista = 'proximos';
  const cuerpo = h('div', {});
  let cat;

  async function refrescar() {
    cat = await catalogos('entrenamientos', 'grupos');
    pintar();
  }
  function misGrupos() {
    return esGerente(ctx.usuario) ? cat.grupos : cat.grupos.filter((g) => (g.entrenadorIds || []).includes(ctx.usuario.personaId));
  }
  function pintar() {
    const ids = new Set(misGrupos().map((g) => g.id));
    const ahora = fechaHoraLocal(new Date());
    const lista = cat.entrenamientos
      .filter((e) => ids.has(e.grupoId))
      .filter((e) => !filtroGrupo || e.grupoId === filtroGrupo)
      .filter((e) => vista === 'todos' || (vista === 'proximos' ? String(e.fechaFin) >= ahora : String(e.fechaFin) < ahora))
      .sort((a, b) => vista === 'proximos' ? String(a.fechaInicio).localeCompare(String(b.fechaInicio)) : String(b.fechaInicio).localeCompare(String(a.fechaInicio)));
    limpiar(cuerpo, tabla({
      filas: lista,
      vacio: 'No hay entrenamientos en esta vista.',
      alClic: (e) => ctx.navegar(`entrenamientos/${e.id}`),
      columnas: [
        { titulo: 'Fecha', valor: (e) => h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
          h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(e.fechaInicio)), h('span', {}, formato.mes(e.fechaInicio))),
          h('div', {}, h('b', {}, `${formato.hora(e.fechaInicio)} – ${formato.hora(e.fechaFin)}`), h('div', { class: 'mutado pequeno' }, formato.fecha(e.fechaInicio)))) },
        { titulo: 'Grupo', valor: (e) => h('span', { class: 'chip' }, cat.gruposPorId[e.grupoId]?.codigo || '—') },
        { titulo: 'Lugar', valor: (e) => e.ubicacion?.nombre || '—' },
        { titulo: 'Instrucciones', valor: (e) => h('span', { class: 'pequeno' }, e.instrucciones || '—') },
        { titulo: 'Estado', valor: (e) => estado(e.estado) },
        { titulo: '', clase: 'derecha', valor: (e) => { const a = acciones_(ctx, puede, e, refrescar); return acciones(
          a.reprogramar ? botonIcono('calendario', 'Reprogramar', a.reprogramar) : null,
          a.cancelar ? botonIcono('retirar', 'Cancelar', a.cancelar, 'peligro') : null,
          a.eliminar ? botonIcono('borrar', 'Eliminar', a.eliminar, 'peligro') : null); } },
      ],
    }));
  }

  const nuevo = () => {
    const grupos = misGrupos().filter((g) => g.estado === 'ACTIVO');
    if (!grupos.length) { aviso('No hay grupos activos para programar', 'error'); return; }
    const inicio = new Date(); inicio.setDate(inicio.getDate() + 1); inicio.setHours(16, 0, 0, 0);
    const fin = new Date(inicio); fin.setHours(17, 30);
    formularioModal({
      titulo: 'Programar entrenamiento', boton: 'Programar',
      nota: 'Se usará el lugar del grupo y se notificará a estudiantes y acudientes.',
      campos: [
        { nombre: 'grupoId', etiqueta: 'Grupo', tipo: 'select', requerido: true, ancho: true, opciones: opciones(grupos, 'codigo') },
        { nombre: 'fechaInicio', etiqueta: 'Inicio', tipo: 'fechahora', requerido: true },
        { nombre: 'fechaFin', etiqueta: 'Fin', tipo: 'fechahora', requerido: true },
        { nombre: 'instrucciones', etiqueta: 'Instrucciones', tipo: 'area', ancho: true, placeholder: 'Traer canilleras e hidratación' },
      ],
      valores: { fechaInicio: fechaHoraLocal(inicio), fechaFin: fechaHoraLocal(fin), grupoId: filtroGrupo },
      alGuardar: async (d) => { await api.post(R.entrenamientos, d); aviso('Entrenamiento programado'); await refrescar(); },
    });
  };

  await refrescar();
  const pestaña = (valor, texto) => h('button', { class: vista === valor ? 'activa' : '', onclick: (ev) => { vista = valor; ev.target.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('activa', b === ev.target)); pintar(); } }, texto);
  limpiar(contenedor,
    encabezado('Entrenamientos', 'Programe sesiones, ajuste horarios y registre la asistencia.',
      puede.crear ? boton('Programar entrenamiento', nuevo, { clase: 'primario', icono: 'mas' }) : null),
    tarjeta(null, h('div', {},
      h('div', { class: 'filtros', style: { justifyContent: 'space-between' } },
        h('div', { class: 'pestanas', style: { margin: 0, border: 0 } }, pestaña('proximos', 'Próximos'), pestaña('pasados', 'Realizados'), pestaña('todos', 'Todos')),
        selector(opciones(misGrupos(), 'codigo'), (v) => { filtroGrupo = v; pintar(); }, { todos: 'Todos los grupos' })),
      cuerpo)));
}

async function detalle(contenedor, ctx, id) {
  const puede = await permisos(ctx);
  const e = await api.get(`${R.entrenamientos}/${id}`);
  const [grupo, estudiantes] = await Promise.all([api.get(`${R.grupos}/${e.grupoId}`), api.get(`${R.grupos}/${e.grupoId}/estudiantes`)]);
  const recargar = () => detalle(contenedor, ctx, id);
  const a = acciones_(ctx, puede, e, recargar);
  const registradoPor = ctx.usuario.personaId || nombreUsuario(ctx.usuario);

  limpiar(contenedor,
    h('a', { href: '#/entrenamientos', class: 'btn fantasma chico', style: { marginBottom: '12px' } }, '← Volver a entrenamientos'),
    encabezado(`Entrenamiento · Grupo ${grupo.codigo}`, `${formato.fecha(e.fechaInicio)}, ${formato.hora(e.fechaInicio)} – ${formato.hora(e.fechaFin)}`,
      boton('Instrucciones', a.editar, { icono: 'editar' }),
      a.reprogramar ? boton('Reprogramar', a.reprogramar, { icono: 'calendario' }) : null,
      a.cancelar ? boton('Cancelar', a.cancelar, { clase: 'peligro', icono: 'retirar' }) : null),
    h('div', { class: 'rejilla k21' },
      tarjeta('Asistencia', await panelAsistencia({ actividad: e, estudiantes: estudiantes.filter((x) => x.estado === 'ACTIVO'), usuario: ctx.usuario, registradoPor })),
      h('div', { class: 'rejilla' },
        tarjeta('Detalles', h('div', { class: 'cuerpo' }, datos([
          ['Estado', estado(e.estado)],
          ['Grupo', grupo.codigo],
          ['Lugar', e.ubicacion?.nombre],
          ['Dirección', e.ubicacion?.direccion],
          ['Instrucciones', e.instrucciones],
        ]))),
        e.cambios?.length ? tarjeta('Cambios', h('div', { class: 'cuerpo' }, h('ul', { class: 'linea-tiempo' }, e.cambios.map((c) => h('li', { class: 'pequeno' }, c))))) : null)));
}
