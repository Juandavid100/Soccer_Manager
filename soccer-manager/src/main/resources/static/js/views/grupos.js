// Grupos: cupos, horario, lugar de entrenamiento y entrenadores asignados (HU-07 para el entrenador).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formato, persona, formularioModal, ejecutar, confirmar, aviso, opciones, enumOpciones, barraProgreso, botonIcono, datos, icono, selector } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona, esGerente } from '../sesion.js';

export async function mostrar(contenedor, ctx) {
  if (ctx.params[0]) return detalle(contenedor, ctx, ctx.params[0]);
  return listado(contenedor, ctx);
}

function camposGrupo(categorias, edicion) {
  return [
    { nombre: 'codigo', etiqueta: 'Código', requerido: true, placeholder: 'S10-A' },
    { nombre: 'categoriaId', etiqueta: 'Categoría', tipo: 'select', requerido: true, opciones: opciones(categorias, (c) => `${c.nombre} · ${c.temporada}`) },
    { nombre: 'cupoMaximo', etiqueta: 'Cupo máximo', tipo: 'numero', requerido: true, min: 1 },
    edicion ? { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: enumOpciones(['EN_PREPARACION', 'ACTIVO', 'CERRADO']) } : null,
    { nombre: 'horario', etiqueta: 'Horario', placeholder: 'Lunes, miércoles y viernes 4:00 p. m.', ancho: !edicion },
    { tipo: 'subtitulo', nombre: '_', etiqueta: 'Lugar de entrenamiento' },
    { nombre: 'ubicacion.nombre', etiqueta: 'Nombre del lugar', placeholder: 'Cancha sintética 1' },
    { nombre: 'ubicacion.direccion', etiqueta: 'Dirección', placeholder: 'Cra 27 # 10-20, Pasto' },
    { nombre: 'ubicacion.indicaciones', etiqueta: 'Indicaciones' },
    { nombre: 'ubicacion.enlaceMapa', etiqueta: 'Enlace del mapa', placeholder: 'https://maps.google.com/…' },
  ].filter(Boolean);
}

async function listado(contenedor, ctx) {
  const gerente = esGerente(ctx.usuario);
  const cuerpo = h('div', { class: 'rejilla k3' });

  async function refrescar() {
    const cat = await catalogos('grupos', 'categorias', 'estudiantes', 'entrenadores');
    let grupos = cat.grupos;
    if (!gerente) grupos = grupos.filter((g) => (g.entrenadorIds || []).includes(ctx.usuario.personaId));
    if (!grupos.length) {
      limpiar(cuerpo, tarjeta(null, h('div', { class: 'vacio' }, icono('grupo'), gerente ? 'No hay grupos. Cree categorías y luego el primer grupo.' : 'Todavía no tiene grupos asignados.')));
      return;
    }
    limpiar(cuerpo, grupos.sort((a, b) => a.codigo.localeCompare(b.codigo)).map((g) => {
      const activos = cat.estudiantes.filter((e) => e.grupoId === g.id && e.estado === 'ACTIVO').length;
      const p = g.cupoMaximo ? (activos / g.cupoMaximo) * 100 : 0;
      return h('article', { class: 'tarjeta tarjeta-estudiante', onclick: () => ctx.navegar(`grupos/${g.id}`) },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' } },
          h('div', {}, h('h2', { style: { fontSize: '26px' } }, g.codigo), h('div', { class: 'mutado pequeno' }, cat.categoriasPorId[g.categoriaId]?.nombre || 'Sin categoría')),
          estado(g.estado)),
        h('div', { class: 'linea-icono' }, icono('reloj'), g.horario || 'Horario sin definir'),
        h('div', { class: 'linea-icono mutado' }, icono('pin'), g.ubicacion?.nombre || 'Sin lugar'),
        h('div', {},
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' } }, h('span', {}, 'Cupos ocupados'), h('b', {}, `${activos} / ${g.cupoMaximo}`)),
          barraProgreso(p, p >= 100 ? 'roja' : p >= 80 ? 'amarilla' : '')),
        h('div', {}, (g.entrenadorIds || []).map((id) => cat.entrenadoresPorId[id]).filter(Boolean).map((e) => h('span', { class: 'chip' }, nombrePersona(e))),
          !(g.entrenadorIds || []).length ? h('span', { class: 'mutado pequeno' }, 'Sin entrenador asignado') : null));
    }));
  }

  const nuevo = async () => {
    const categorias = await api.get(R.categorias);
    if (!categorias.length) { aviso('Primero cree una categoría', 'error'); return; }
    formularioModal({
      titulo: 'Nuevo grupo', grande: true, campos: camposGrupo(categorias, false), valores: { cupoMaximo: 20 },
      alGuardar: async (d) => { await api.post(R.grupos, d); aviso('Grupo creado'); await refrescar(); },
    });
  };

  limpiar(contenedor,
    encabezado(gerente ? 'Grupos' : 'Mis grupos', gerente ? 'Organice a los estudiantes por categoría, horario y cupo.' : 'Grupos que tiene a cargo, con sus estudiantes y horario.',
      gerente ? boton('Nuevo grupo', nuevo, { clase: 'primario', icono: 'mas' }) : null),
    cuerpo);
  await refrescar();
}

async function detalle(contenedor, ctx, id) {
  const gerente = esGerente(ctx.usuario);
  const [g, estudiantes, cat] = await Promise.all([
    api.get(`${R.grupos}/${id}`), api.get(`${R.grupos}/${id}/estudiantes`), catalogos('categorias', 'entrenadores'),
  ]);
  const entrenamientos = await api.get(R.entrenamientos, { grupoId: id });
  const recargar = () => detalle(contenedor, ctx, id);
  const categoria = cat.categoriasPorId[g.categoriaId];
  const activos = estudiantes.filter((e) => e.estado === 'ACTIVO');

  const editar = () => formularioModal({
    titulo: `Editar grupo ${g.codigo}`, grande: true, campos: camposGrupo(cat.categorias, true), valores: g,
    alGuardar: async (d) => { await api.put(`${R.grupos}/${id}`, d); aviso('Grupo actualizado'); await recargar(); },
  });
  const asignarEntrenador = () => formularioModal({
    titulo: 'Asignar entrenador', boton: 'Asignar',
    campos: [{ nombre: 'entrenadorId', etiqueta: 'Entrenador', tipo: 'select', requerido: true, ancho: true,
      opciones: opciones(cat.entrenadores.filter((e) => !(g.entrenadorIds || []).includes(e.id)), (e) => nombrePersona(e)) }],
    alGuardar: async (d) => { await api.patch(`${R.grupos}/${id}/entrenadores/${d.entrenadorId}`); aviso('Entrenador asignado'); await recargar(); },
  });
  const quitar = async (e) => {
    if (await confirmar(`¿Quitar a ${nombrePersona(e)} de este grupo?`, { boton: 'Quitar', peligro: true }))
      ejecutar(() => api.delete(`${R.grupos}/${id}/entrenadores/${e.id}`), 'Entrenador retirado del grupo', recargar);
  };
  const eliminar = async () => {
    if (await confirmar(`¿Eliminar el grupo ${g.codigo}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(async () => { await api.delete(`${R.grupos}/${id}`); ctx.navegar('grupos'); }, 'Grupo eliminado');
  };

  const proximos = entrenamientos.filter((e) => e.estado !== 'CANCELADO').sort((a, b) => String(b.fechaInicio).localeCompare(String(a.fechaInicio))).slice(0, 6);

  limpiar(contenedor,
    h('a', { href: '#/grupos', class: 'btn fantasma chico', style: { marginBottom: '12px' } }, '← Volver a grupos'),
    encabezado(`Grupo ${g.codigo}`, `${categoria ? categoria.nombre + ' · ' : ''}${g.horario || 'Horario sin definir'}`,
      gerente ? boton('Editar', editar, { icono: 'editar' }) : null,
      gerente ? boton('Eliminar', eliminar, { clase: 'peligro', icono: 'borrar' }) : null),
    h('div', { class: 'rejilla k21' },
      tarjeta(`Estudiantes (${activos.length} de ${g.cupoMaximo} cupos)`, tabla({
        filas: estudiantes, vacio: 'Sin estudiantes en este grupo.',
        alClic: gerente ? (e) => ctx.navegar(`estudiantes/${e.id}`) : null,
        columnas: [
          { titulo: 'Estudiante', valor: (e) => persona(nombrePersona(e), `Doc. ${e.documento}`) },
          { titulo: 'Edad', valor: (e) => `${formato.edad(e.fechaNacimiento)} años` },
          { titulo: 'Estado', valor: (e) => estado(e.estado) },
        ],
      })),
      h('div', { class: 'rejilla' },
        tarjeta('Información', h('div', { class: 'cuerpo' }, datos([
          ['Estado', estado(g.estado)],
          ['Cupo máximo', g.cupoMaximo],
          ['Lugar', g.ubicacion?.nombre],
          ['Dirección', g.ubicacion?.direccion],
          ['Indicaciones', g.ubicacion?.indicaciones],
          ['Mapa', g.ubicacion?.enlaceMapa ? h('a', { href: g.ubicacion.enlaceMapa, target: '_blank', rel: 'noopener' }, 'Abrir mapa') : '—'],
        ]))),
        tarjeta('Entrenadores', h('div', { class: 'cuerpo' },
          (g.entrenadorIds || []).length
            ? h('ul', { class: 'lista-simple' }, g.entrenadorIds.map((eid) => cat.entrenadoresPorId[eid]).filter(Boolean).map((e) => h('li', {},
              persona(nombrePersona(e), e.telefono), gerente ? botonIcono('cerrar', 'Quitar del grupo', () => quitar(e), 'peligro') : null)))
            : h('p', { class: 'mutado', style: { margin: 0 } }, 'Sin entrenador asignado.')),
          gerente ? boton('Asignar', asignarEntrenador, { clase: 'chico', icono: 'mas' }) : null),
        tarjeta('Entrenamientos recientes', h('div', { class: 'cuerpo' },
          proximos.length ? h('ul', { class: 'lista-simple' }, proximos.map((e) => h('li', {},
            h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
              h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(e.fechaInicio)), h('span', {}, formato.mes(e.fechaInicio))),
              h('div', {}, h('b', {}, formato.hora(e.fechaInicio)), h('div', { class: 'mutado pequeno' }, e.instrucciones || 'Entrenamiento'))),
            h('a', { href: `#/entrenamientos/${e.id}`, class: 'btn chico' }, 'Asistencia'))))
            : h('p', { class: 'mutado', style: { margin: 0 } }, 'No hay entrenamientos programados.')),
          h('a', { href: '#/entrenamientos', class: 'btn chico' }, 'Ver todos')))));
}
