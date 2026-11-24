// Estudiantes: matrícula, asignación a grupo, retiro y ficha completa (HU-01).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formato, buscador, selector, persona, formularioModal, ejecutar, pedirMotivo, aviso, opciones, enumOpciones, icono } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona, nombreUsuario, esGerente } from '../sesion.js';
import { CAMPOS_PERSONA } from './acudientes.js';
import { fichaEstudiante } from './ficha-estudiante.js';

const ESTADOS = ['PENDIENTE', 'ACTIVO', 'SUSPENDIDO', 'RETIRADO', 'EGRESADO'];

export async function mostrar(contenedor, ctx) {
  if (ctx.params[0]) return detalle(contenedor, ctx, ctx.params[0]);
  return listado(contenedor, ctx);
}

async function listado(contenedor, { navegar }) {
  let filtro = '', filtroEstado = '', filtroGrupo = '';
  const cuerpo = h('div', {});
  let cat = await catalogos('estudiantes', 'grupos', 'categorias', 'acudientes');

  function pintar() {
    const lista = cat.estudiantes
      .filter((e) => !filtro || `${nombrePersona(e)} ${e.documento}`.toLowerCase().includes(filtro))
      .filter((e) => !filtroEstado || e.estado === filtroEstado)
      .filter((e) => !filtroGrupo || (filtroGrupo === 'SIN' ? !e.grupoId : e.grupoId === filtroGrupo))
      .sort((a, b) => nombrePersona(a).localeCompare(nombrePersona(b)));
    limpiar(cuerpo, tabla({
      filas: lista,
      vacio: cat.estudiantes.length ? 'Ningún estudiante coincide con el filtro.' : 'Aún no hay estudiantes matriculados.',
      alClic: (e) => navegar(`estudiantes/${e.id}`),
      columnas: [
        { titulo: 'Estudiante', valor: (e) => persona(nombrePersona(e), `Doc. ${e.documento}`) },
        { titulo: 'Edad', valor: (e) => { const x = formato.edad(e.fechaNacimiento); return x === null ? '—' : `${x} años`; } },
        { titulo: 'Categoría', valor: (e) => cat.categoriasPorId[e.categoriaId]?.nombre || h('span', { class: 'mutado' }, '—') },
        { titulo: 'Grupo', valor: (e) => cat.gruposPorId[e.grupoId]?.codigo ? h('span', { class: 'chip' }, cat.gruposPorId[e.grupoId].codigo) : h('span', { class: 'mutado' }, 'Sin grupo') },
        { titulo: 'Acudientes', valor: (e) => (e.acudienteIds || []).map((id) => cat.acudientesPorId[id]).filter(Boolean).map((a) => a.nombres).join(', ') || '—' },
        { titulo: 'Estado', valor: (e) => estado(e.estado) },
      ],
    }));
  }

  async function refrescar() { cat = await catalogos('estudiantes', 'grupos', 'categorias', 'acudientes'); pintar(); }

  const resumen = (texto, n, tono) => h('span', { class: `estado ${tono}` }, `${n} ${texto}`);
  const contar = (est) => cat.estudiantes.filter((e) => e.estado === est).length;

  limpiar(contenedor,
    encabezado('Estudiantes', 'Matrícula, grupo, acudientes y estado de cada deportista.',
      boton('Matricular estudiante', () => matricular(cat, refrescar), { clase: 'primario', icono: 'mas' })),
    h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' } },
      resumen('activos', contar('ACTIVO'), 'ok'), resumen('pendientes de grupo', contar('PENDIENTE'), 'aviso'), resumen('retirados', contar('RETIRADO'), 'neutro')),
    tarjeta(null, h('div', {},
      h('div', { class: 'filtros' },
        buscador('Buscar por nombre o documento', (t) => { filtro = t; pintar(); }),
        selector(enumOpciones(ESTADOS), (v) => { filtroEstado = v; pintar(); }, { todos: 'Todos los estados' }),
        selector([{ valor: 'SIN', texto: 'Sin grupo' }, ...opciones(cat.grupos, 'codigo')], (v) => { filtroGrupo = v; pintar(); }, { todos: 'Todos los grupos' })),
      cuerpo)));
  pintar();
}

function camposEstudiante(cat) {
  return [
    ...CAMPOS_PERSONA,
    { nombre: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', requerido: true },
    { nombre: 'categoriaId', etiqueta: 'Categoría', tipo: 'select', opciones: opciones(cat.categorias, (c) => `${c.nombre} · ${c.temporada} (${c.edadMinima}–${c.edadMaxima} años)`), placeholder: 'Se asigna con el grupo', ayuda: 'Opcional: se asigna automáticamente al ubicarlo en un grupo.' },
    { nombre: 'acudienteIds', etiqueta: 'Acudientes', tipo: 'multiple', ancho: true, opciones: opciones(cat.acudientes, (a) => `${nombrePersona(a)} · ${a.documento}`), ayuda: 'Obligatorio si es menor de edad. Use Ctrl + clic para elegir varios.' },
  ];
}

function matricular(cat, refrescar) {
  formularioModal({
    titulo: 'Matricular estudiante', grande: true, boton: 'Matricular',
    nota: cat.acudientes.length ? null : 'Primero registre al acudiente en el módulo Acudientes si el estudiante es menor de edad.',
    campos: camposEstudiante(cat),
    alGuardar: async (d) => {
      await api.post(R.estudiantes, d);
      aviso('Estudiante matriculado. Asígnele un grupo para activarlo.');
      await refrescar();
    },
  });
}

async function detalle(contenedor, ctx, id) {
  const gerente = esGerente(ctx.usuario);
  const ficha = await fichaEstudiante(id, { modo: 'gerencia' });
  const e = ficha.estudiante;
  const recargar = () => detalle(contenedor, ctx, id);

  const asignar = async () => {
    const [grupos, categorias, estudiantes] = await Promise.all([api.get(R.grupos), api.get(R.categorias), api.get(R.estudiantes)]);
    const activos = (g) => estudiantes.filter((x) => x.grupoId === g.id && x.estado === 'ACTIVO').length;
    formularioModal({
      titulo: 'Asignar grupo', boton: 'Asignar',
      nota: 'El grupo debe estar activo, tener cupo y corresponder a la edad del estudiante.',
      campos: [{ nombre: 'grupoId', etiqueta: 'Grupo', tipo: 'select', requerido: true, ancho: true,
        opciones: grupos.filter((g) => g.estado === 'ACTIVO').map((g) => ({ valor: g.id, texto: `${g.codigo} · ${categorias.find((c) => c.id === g.categoriaId)?.nombre || ''} · ${activos(g)}/${g.cupoMaximo} cupos` })) }],
      valores: { grupoId: e.grupoId },
      alGuardar: async (d) => { await api.patch(`${R.estudiantes}/${id}/grupo`, d); aviso('Grupo asignado'); await recargar(); },
    });
  };

  const editar = async () => {
    const cat = await catalogos('categorias', 'acudientes');
    formularioModal({
      titulo: 'Editar estudiante', grande: true, campos: camposEstudiante(cat), valores: e,
      alGuardar: async (d) => { await api.put(`${R.estudiantes}/${id}`, { ...e, ...d }); aviso('Datos actualizados'); await recargar(); },
    });
  };

  const retirar = async () => {
    const motivo = await pedirMotivo(`Retirar a ${nombrePersona(e)}`, { boton: 'Retirar', nota: 'El estudiante no se elimina: queda retirado y se conserva su historial.' });
    if (motivo) ejecutar(() => api.patch(`${R.estudiantes}/${id}/retiro`, { motivo, usuario: nombreUsuario(ctx.usuario) }), 'Estudiante retirado', recargar);
  };

  const mensualidad = () => formularioModal({
    titulo: 'Generar mensualidad', boton: 'Generar',
    campos: [
      { nombre: 'periodo', etiqueta: 'Periodo (año-mes)', requerido: true, placeholder: '2026-12' },
      { nombre: 'fechaVencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha', requerido: true },
      { nombre: 'valor', etiqueta: 'Valor', tipo: 'numero', requerido: true, min: 1 },
      { nombre: 'porcentajeDescuento', etiqueta: 'Descuento (%)', tipo: 'numero', min: 0, max: 100 },
    ],
    valores: { periodo: new Date().toISOString().slice(0, 7), valor: 100000, porcentajeDescuento: 0 },
    alGuardar: async (d) => { await api.post(R.mensualidades, { ...d, estudianteId: id, porcentajeDescuento: d.porcentajeDescuento || 0 }); aviso('Mensualidad generada'); await recargar(); },
  });

  const retirado = e.estado === 'RETIRADO';
  limpiar(contenedor,
    h('a', { href: '#/estudiantes', class: 'btn fantasma chico', style: { marginBottom: '12px' } }, '← Volver a estudiantes'),
    tarjeta(null, h('div', { class: 'cuerpo' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' } },
        ficha.cabeza,
        gerente ? h('div', { class: 'acciones' },
          !retirado ? boton(e.grupoId ? 'Cambiar grupo' : 'Asignar grupo', asignar, { clase: 'primario', icono: 'grupo' }) : null,
          !retirado ? boton('Mensualidad', mensualidad, { icono: 'dinero' }) : null,
          boton('Editar', editar, { icono: 'editar' }),
          !retirado ? boton('Retirar', retirar, { clase: 'peligro', icono: 'retirar' }) : null) : null),
      e.estado === 'PENDIENTE' ? h('div', { class: 'alerta aviso separar' }, icono('info'), h('div', {}, 'Matrícula pendiente: el estudiante queda activo cuando se le asigna un grupo.')) : null,
      ficha.cuerpo)));
}
