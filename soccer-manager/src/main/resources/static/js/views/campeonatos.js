// Campeonatos, partidos y convocatorias (HU-03, HU-09, HU-17).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formato, formularioModal, ejecutar, confirmar, pedirMotivo, aviso, opciones, enumOpciones, botonIcono, datos, persona, fechaHoraLocal, icono } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona, nombreUsuario, esGerente, cargarPersona } from '../sesion.js';
import { panelAsistencia } from './asistencia.js';

export async function mostrar(contenedor, ctx) {
  if (ctx.seccion === 'partidos' && ctx.params[0]) return partido(contenedor, ctx, ctx.params[0]);
  if (ctx.params[0]) return campeonato(contenedor, ctx, ctx.params[0]);
  return listado(contenedor, ctx);
}

const ESTADOS_EDITABLES = ['PLANIFICADO', 'INSCRIPCION_ABIERTA', 'CONFIRMADO', 'EN_CURSO', 'FINALIZADO'];

function camposCampeonato(cat, edicion) {
  return [
    { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, ancho: true, placeholder: 'Copa Pasto' },
    { nombre: 'categoriaId', etiqueta: 'Categoría', tipo: 'select', requerido: true, opciones: opciones(cat.categorias, (c) => `${c.nombre} · ${c.temporada}`) },
    { nombre: 'entrenadorId', etiqueta: 'Entrenador responsable', tipo: 'select', requerido: true, opciones: opciones(cat.entrenadores, (e) => nombrePersona(e)) },
    { nombre: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'fecha', requerido: true },
    { nombre: 'fechaFin', etiqueta: 'Fecha de fin', tipo: 'fecha', requerido: true },
    edicion ? { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: enumOpciones(ESTADOS_EDITABLES), ancho: true } : null,
  ].filter(Boolean);
}

async function listado(contenedor, ctx) {
  const gerente = esGerente(ctx.usuario);
  const cuerpo = h('div', {});
  let cat;

  async function refrescar() {
    cat = await catalogos('campeonatos', 'categorias', 'entrenadores', 'partidos');
    let lista = cat.campeonatos;
    if (!gerente) lista = lista.filter((c) => c.entrenadorId === ctx.usuario.personaId);
    limpiar(cuerpo, tabla({
      filas: lista.sort((a, b) => String(b.fechaInicio).localeCompare(String(a.fechaInicio))),
      vacio: gerente ? 'No hay campeonatos registrados.' : 'No tiene campeonatos a su cargo.',
      alClic: (c) => ctx.navegar(`campeonatos/${c.id}`),
      columnas: [
        { titulo: 'Campeonato', valor: (c) => h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, h('div', { class: 'kpi', style: { padding: 0 } }, h('div', { class: 'ico amarillo', style: { width: '38px', height: '38px' } }, icono('trofeo'))), h('b', {}, c.nombre)) },
        { titulo: 'Categoría', valor: (c) => h('span', { class: 'chip' }, cat.categoriasPorId[c.categoriaId]?.nombre || '—') },
        { titulo: 'Fechas', valor: (c) => `${formato.fecha(c.fechaInicio)} – ${formato.fecha(c.fechaFin)}` },
        { titulo: 'Entrenador', valor: (c) => nombrePersona(cat.entrenadoresPorId[c.entrenadorId]) },
        { titulo: 'Partidos', valor: (c) => cat.partidos.filter((p) => p.campeonatoId === c.id).length },
        { titulo: 'Estado', valor: (c) => estado(c.estado) },
      ],
    }));
  }

  const nuevo = async () => {
    const c = await catalogos('categorias', 'entrenadores');
    if (!c.categorias.length || !c.entrenadores.length) { aviso('Necesita al menos una categoría y un entrenador', 'error'); return; }
    formularioModal({
      titulo: 'Nuevo campeonato', campos: camposCampeonato(c, false),
      alGuardar: async (d) => { await api.post(R.campeonatos, d); aviso('Campeonato creado'); await refrescar(); },
    });
  };

  limpiar(contenedor,
    encabezado('Campeonatos', 'Torneos por categoría, sus partidos y las convocatorias de los estudiantes.',
      gerente ? boton('Nuevo campeonato', nuevo, { clase: 'primario', icono: 'mas' }) : null),
    tarjeta(null, cuerpo));
  await refrescar();
}

async function campeonato(contenedor, ctx, id) {
  const gerente = esGerente(ctx.usuario);
  const [c, partidos, cat] = await Promise.all([api.get(`${R.campeonatos}/${id}`), api.get(R.partidos, { campeonatoId: id }), catalogos('categorias', 'entrenadores')]);
  const recargar = () => campeonato(contenedor, ctx, id);
  const cerrado = c.estado === 'CANCELADO' || c.estado === 'FINALIZADO';
  const usuario = nombreUsuario(ctx.usuario);

  const editar = () => formularioModal({
    titulo: 'Editar campeonato', campos: camposCampeonato(cat, true), valores: c,
    alGuardar: async (d) => { await api.put(`${R.campeonatos}/${id}`, d); aviso('Campeonato actualizado'); await recargar(); },
  });
  const cancelar = async () => {
    const motivo = await pedirMotivo(`Cancelar ${c.nombre}`, { boton: 'Cancelar campeonato', nota: 'También se cancelan sus partidos pendientes.' });
    if (motivo) ejecutar(() => api.patch(`${R.campeonatos}/${id}/cancelacion`, { motivo, usuario }), 'Campeonato cancelado', recargar);
  };
  const eliminar = async () => {
    if (await confirmar(`¿Eliminar el campeonato ${c.nombre} y sus partidos?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(async () => { await api.delete(`${R.campeonatos}/${id}`); ctx.navegar('campeonatos'); }, 'Campeonato eliminado');
  };
  const nuevoPartido = () => {
    const inicio = new Date(Math.max(Date.now(), new Date(c.fechaInicio + 'T00:00').getTime()));
    inicio.setDate(inicio.getDate() + 1); inicio.setHours(9, 0, 0, 0);
    const fin = new Date(inicio); fin.setHours(10, 30);
    formularioModal({
      titulo: 'Programar partido', boton: 'Programar',
      nota: `Debe estar entre el ${formato.fecha(c.fechaInicio)} y el ${formato.fecha(c.fechaFin)}.`,
      campos: [
        { nombre: 'rival', etiqueta: 'Rival', requerido: true, ancho: true },
        { nombre: 'fechaInicio', etiqueta: 'Inicio', tipo: 'fechahora', requerido: true },
        { nombre: 'fechaFin', etiqueta: 'Fin', tipo: 'fechahora', requerido: true },
        { tipo: 'subtitulo', nombre: '_', etiqueta: 'Escenario' },
        { nombre: 'ubicacion.nombre', etiqueta: 'Nombre del escenario' },
        { nombre: 'ubicacion.direccion', etiqueta: 'Dirección' },
        { nombre: 'ubicacion.enlaceMapa', etiqueta: 'Enlace del mapa', ancho: true },
      ],
      valores: { fechaInicio: fechaHoraLocal(inicio), fechaFin: fechaHoraLocal(fin) },
      alGuardar: async (d) => {
        if (!d.ubicacion?.nombre) delete d.ubicacion;
        await api.post(R.partidos, { ...d, campeonatoId: id });
        aviso('Partido programado');
        await recargar();
      },
    });
  };

  limpiar(contenedor,
    h('a', { href: '#/campeonatos', class: 'btn fantasma chico', style: { marginBottom: '12px' } }, '← Volver a campeonatos'),
    encabezado(c.nombre, `${cat.categoriasPorId[c.categoriaId]?.nombre || ''} · ${formato.fecha(c.fechaInicio)} – ${formato.fecha(c.fechaFin)}`,
      gerente && !cerrado ? boton('Editar', editar, { icono: 'editar' }) : null,
      gerente && c.estado !== 'CANCELADO' ? boton('Cancelar', cancelar, { clase: 'peligro', icono: 'retirar' }) : null,
      gerente ? boton('Eliminar', eliminar, { clase: 'peligro', icono: 'borrar' }) : null),
    h('div', { class: 'rejilla k21' },
      tarjeta('Partidos', tabla({
        filas: partidos.sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio))),
        vacio: 'Aún no hay partidos programados.',
        alClic: (p) => ctx.navegar(`partidos/${p.id}`),
        columnas: [
          { titulo: 'Fecha', valor: (p) => h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
            h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(p.fechaInicio)), h('span', {}, formato.mes(p.fechaInicio))),
            h('b', {}, formato.hora(p.fechaInicio))) },
          { titulo: 'Rival', valor: (p) => h('b', {}, p.rival) },
          { titulo: 'Escenario', valor: (p) => p.ubicacion?.nombre || '—' },
          { titulo: 'Resultado', valor: (p) => p.resultado ? h('span', { class: 'chip', style: { fontSize: '15px' } }, p.resultado) : '—' },
          { titulo: 'Estado', valor: (p) => estado(p.estado) },
        ],
      }), !cerrado ? boton('Programar partido', nuevoPartido, { clase: 'primario chico', icono: 'mas' }) : null),
      tarjeta('Información', h('div', { class: 'cuerpo' }, datos([
        ['Estado', estado(c.estado)],
        ['Categoría', cat.categoriasPorId[c.categoriaId]?.nombre],
        ['Entrenador', nombrePersona(cat.entrenadoresPorId[c.entrenadorId])],
        ['Partidos jugados', partidos.filter((p) => p.estado === 'REALIZADO').length],
      ])))));
}

async function partido(contenedor, ctx, id) {
  const gerente = esGerente(ctx.usuario);
  const p = await api.get(`${R.partidos}/${id}`);
  const [c, convocatorias, estudiantes, entrenadores] = await Promise.all([
    api.get(`${R.campeonatos}/${p.campeonatoId}`), api.get(R.convocatorias, { partidoId: id }), api.get(R.estudiantes), api.get(R.entrenadores),
  ]);
  const recargar = () => partido(contenedor, ctx, id);
  const usuario = nombreUsuario(ctx.usuario);
  const yo = gerente ? null : await cargarPersona(ctx.usuario);
  const modificar = gerente || yo?.puedeModificarActividades;
  const activa = p.estado !== 'CANCELADO';
  const porId = Object.fromEntries(estudiantes.map((e) => [e.id, e]));

  const convocar = () => {
    const ya = new Set(convocatorias.filter((x) => x.estado !== 'RETIRADO').map((x) => x.estudianteId));
    const disponibles = estudiantes.filter((e) => e.estado === 'ACTIVO' && e.categoriaId === c.categoriaId && !ya.has(e.id));
    if (!disponibles.length) { aviso('No hay estudiantes activos de la categoría por convocar', 'error'); return; }
    const conPermiso = entrenadores.filter((e) => e.puedeConvocar);
    formularioModal({
      titulo: `Convocar para el partido vs ${p.rival}`, boton: 'Convocar', grande: true,
      nota: 'Solo aparecen estudiantes activos de la categoría del campeonato. El entrenador debe tener permiso para convocar.',
      campos: [
        gerente ? { nombre: 'convocadoPor', etiqueta: 'Convoca', tipo: 'select', requerido: true, ancho: true,
          opciones: opciones(entrenadores, (e) => nombrePersona(e) + (e.puedeConvocar ? '' : ' (sin permiso)')) } : null,
        { nombre: 'estudianteIds', etiqueta: 'Estudiantes', tipo: 'multiple', requerido: true, ancho: true, opciones: opciones(disponibles, (e) => `${nombrePersona(e)} · ${e.documento}`), ayuda: 'Ctrl + clic para seleccionar varios.' },
      ].filter(Boolean),
      valores: { convocadoPor: conPermiso.find((e) => e.id === c.entrenadorId)?.id || conPermiso[0]?.id || c.entrenadorId },
      alGuardar: async (d) => {
        const quien = gerente ? d.convocadoPor : ctx.usuario.personaId;
        let ok = 0;
        for (const estudianteId of d.estudianteIds) {
          await api.post(R.convocatorias, { partidoId: id, estudianteId, convocadoPor: quien });
          ok++;
        }
        aviso(`${ok} estudiante(s) convocado(s). Sus acudientes fueron notificados.`);
        await recargar();
      },
    });
  };
  const retirarConv = async (cv) => {
    const motivo = await pedirMotivo('Retirar convocatoria', { boton: 'Retirar' });
    if (motivo) ejecutar(() => api.patch(`${R.convocatorias}/${cv.id}/retiro`, { motivo, usuario }), 'Convocatoria retirada', recargar);
  };
  const resultado = () => formularioModal({
    titulo: 'Registrar resultado', boton: 'Guardar',
    campos: [{ nombre: 'resultado', etiqueta: 'Marcador (nosotros - rival)', requerido: true, placeholder: '3-1', ancho: true }],
    valores: p,
    alGuardar: async (d) => { await api.patch(`${R.partidos}/${id}/resultado`, d); aviso('Resultado registrado'); await recargar(); },
  });
  const reprogramar = () => formularioModal({
    titulo: 'Reprogramar partido', boton: 'Reprogramar',
    campos: [
      { nombre: 'fechaInicio', etiqueta: 'Nuevo inicio', tipo: 'fechahora', requerido: true },
      { nombre: 'fechaFin', etiqueta: 'Nuevo fin', tipo: 'fechahora', requerido: true },
    ],
    valores: p,
    alGuardar: async (d) => { await api.patch(`${R.partidos}/${id}/reprogramacion`, { ...d, usuario }); aviso('Partido reprogramado'); await recargar(); },
  });
  const cancelar = async () => {
    const motivo = await pedirMotivo('Cancelar partido', { boton: 'Cancelar partido' });
    if (motivo) ejecutar(() => api.patch(`${R.partidos}/${id}/cancelacion`, { motivo, usuario }), 'Partido cancelado', recargar);
  };

  const convocados = convocatorias.filter((x) => x.estado !== 'RETIRADO' && x.estado !== 'NO_ASISTIRA').map((x) => porId[x.estudianteId]).filter(Boolean);
  const cuenta = (e) => convocatorias.filter((x) => x.estado === e).length;

  limpiar(contenedor,
    h('a', { href: `#/campeonatos/${c.id}`, class: 'btn fantasma chico', style: { marginBottom: '12px' } }, `← Volver a ${c.nombre}`),
    encabezado(`Partido vs ${p.rival}`, `${formato.fecha(p.fechaInicio)}, ${formato.hora(p.fechaInicio)} · ${p.ubicacion?.nombre || 'Escenario por definir'}`,
      activa ? boton(p.resultado ? 'Editar resultado' : 'Registrar resultado', resultado, { clase: 'primario', icono: 'trofeo' }) : null,
      activa && modificar && p.estado !== 'REALIZADO' ? boton('Reprogramar', reprogramar, { icono: 'calendario' }) : null,
      activa && modificar && p.estado !== 'REALIZADO' ? boton('Cancelar', cancelar, { clase: 'peligro', icono: 'retirar' }) : null),
    h('div', { class: 'rejilla k21' },
      h('div', { class: 'rejilla' },
        tarjeta('Convocatoria', h('div', {},
          h('div', { class: 'filtros' },
            h('span', { class: 'estado ok' }, `${cuenta('CONFIRMADO')} confirmados`),
            h('span', { class: 'estado aviso' }, `${cuenta('SIN_RESPUESTA')} sin respuesta`),
            h('span', { class: 'estado mal' }, `${cuenta('NO_ASISTIRA')} no asistirán`)),
          tabla({
            filas: convocatorias, vacio: 'Aún no hay estudiantes convocados.',
            columnas: [
              { titulo: 'Estudiante', valor: (cv) => persona(nombrePersona(porId[cv.estudianteId]), porId[cv.estudianteId]?.documento) },
              { titulo: 'Respuesta', valor: (cv) => h('div', {}, estado(cv.estado), cv.motivo ? h('div', { class: 'mutado pequeno' }, cv.motivo) : null) },
              { titulo: '', clase: 'derecha', valor: (cv) => cv.estado !== 'RETIRADO' && activa ? botonIcono('retirar', 'Retirar convocatoria', () => retirarConv(cv), 'peligro') : null },
            ],
          })),
          activa && p.estado !== 'REALIZADO' ? boton('Convocar', convocar, { clase: 'primario chico', icono: 'mas' }) : null),
        tarjeta('Asistencia al partido', await panelAsistencia({ actividad: p, estudiantes: convocados, usuario: ctx.usuario, registradoPor: ctx.usuario.personaId || usuario }))),
      tarjeta('Información', h('div', { class: 'cuerpo' }, datos([
        ['Estado', estado(p.estado)],
        ['Resultado', p.resultado ? h('b', { style: { fontSize: '22px' } }, p.resultado) : 'Pendiente'],
        ['Campeonato', c.nombre],
        ['Escenario', p.ubicacion?.nombre],
        ['Dirección', p.ubicacion?.direccion],
        ['Mapa', p.ubicacion?.enlaceMapa ? h('a', { href: p.ubicacion.enlaceMapa, target: '_blank', rel: 'noopener' }, 'Abrir mapa') : '—'],
      ]), p.cambios?.length ? h('ul', { class: 'linea-tiempo separar' }, p.cambios.map((x) => h('li', { class: 'pequeno' }, x))) : null))));
}
