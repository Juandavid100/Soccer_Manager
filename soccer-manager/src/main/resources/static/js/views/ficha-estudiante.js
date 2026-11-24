// Ficha completa de un estudiante. La usan la gerencia (con acciones de edición) y el portal de familias (solo consulta y pagos).
import { h, limpiar, tabla, estado, formato, datos, pestanas, barraProgreso, iniciales, formularioModal, ejecutar, aviso, enumOpciones } from '../ui.js';
import { api, R } from '../api.js';
import { nombrePersona } from '../sesion.js';

// modo: 'gerencia' | 'familia' | 'estudiante'
export async function fichaEstudiante(id, { modo = 'gerencia', alCambiar } = {}) {
  const [est, categorias, grupos, acudientes] = await Promise.all([
    api.get(`${R.estudiantes}/${id}`), api.get(R.categorias), api.get(R.grupos), api.get(R.acudientes),
  ]);
  const categoria = categorias.find((c) => c.id === est.categoriaId);
  const grupo = grupos.find((g) => g.id === est.grupoId);
  const susAcudientes = acudientes.filter((a) => (est.acudienteIds || []).includes(a.id));
  const edad = formato.edad(est.fechaNacimiento);
  const familia = modo !== 'gerencia';

  const cabeza = h('div', { class: 'ficha-detalle' },
    h('div', { class: 'avatar' }, iniciales(nombrePersona(est))),
    h('div', {},
      h('h2', {}, nombrePersona(est)),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' } },
        estado(est.estado),
        categoria ? h('span', { class: 'chip' }, categoria.nombre) : null,
        grupo ? h('span', { class: 'chip' }, 'Grupo ' + grupo.codigo) : h('span', { class: 'mutado pequeno' }, 'Sin grupo asignado'),
        edad !== null ? h('span', { class: 'mutado pequeno' }, `${edad} años`) : null)));

  const secciones = [
    { titulo: 'Datos generales', contenido: () => h('div', {},
      datos([
        ['Documento', est.documento],
        ['Fecha de nacimiento', formato.fecha(est.fechaNacimiento)],
        ['Teléfono', est.telefono],
        ['Correo', est.correo],
        ['Categoría', categoria ? `${categoria.nombre} (${categoria.edadMinima}–${categoria.edadMaxima} años)` : '—'],
        ['Grupo', grupo ? `${grupo.codigo} · ${grupo.horario || ''}` : '—'],
        grupo?.ubicacion ? ['Lugar de entrenamiento', h('span', {}, grupo.ubicacion.nombre, grupo.ubicacion.enlaceMapa ? [' · ', h('a', { href: grupo.ubicacion.enlaceMapa, target: '_blank', rel: 'noopener' }, 'Ver mapa')] : null)] : null,
      ]),
      h('h3', { class: 'separar', style: { fontSize: '19px', marginBottom: '8px' } }, 'Acudientes'),
      susAcudientes.length
        ? h('ul', { class: 'lista-simple' }, susAcudientes.map((a) => h('li', {}, h('div', {}, h('b', {}, nombrePersona(a)), h('div', { class: 'mutado pequeno' }, a.parentesco || 'Acudiente')), h('div', { class: 'derecha pequeno' }, a.telefono || '', h('br'), a.correo || ''))))
        : h('p', { class: 'mutado' }, 'Sin acudientes registrados.')) },
    { titulo: 'Mensualidades', contenido: () => mensualidades(est, modo, alCambiar) },
    { titulo: 'Asistencia', contenido: () => asistencia(est) },
    { titulo: 'Evaluaciones', contenido: () => evaluaciones(est, familia) },
    { titulo: 'Convocatorias', contenido: () => convocatorias(est, modo) },
  ];
  if (!familia) secciones.push({ titulo: 'Historial', contenido: () => est.historial?.length
    ? h('ul', { class: 'linea-tiempo' }, [...est.historial].reverse().map((e) => h('li', {}, e)))
    : h('p', { class: 'mutado' }, 'Sin eventos.') });

  return { estudiante: est, cabeza, cuerpo: pestanas(secciones) };
}

async function mensualidades(est, modo, alCambiar) {
  const lista = (await api.get(R.mensualidades, { estudianteId: est.id })).sort((a, b) => b.periodo.localeCompare(a.periodo));
  const saldo = lista.reduce((s, m) => s + m.saldo, 0);
  const contenedor = h('div', {});
  const pagar = (m) => formularioModal({
    titulo: `Pagar ${formato.periodo(m.periodo)}`,
    nota: `Saldo pendiente: ${formato.dinero(m.saldo)}. El pago por pasarela se registra de inmediato.`,
    campos: [
      { nombre: 'valor', etiqueta: 'Valor a pagar', tipo: 'numero', requerido: true, min: 1 },
      { nombre: 'metodo', etiqueta: 'Método', tipo: 'select', requerido: true, opciones: enumOpciones(modo === 'gerencia' ? ['EFECTIVO', 'TRANSFERENCIA', 'PASARELA'] : ['PASARELA', 'TRANSFERENCIA']) },
      { nombre: 'comprobante', etiqueta: 'Número de comprobante', ayuda: 'Obligatorio para transferencias.' },
    ],
    valores: { valor: m.saldo, metodo: modo === 'gerencia' ? 'EFECTIVO' : 'PASARELA' },
    boton: 'Registrar pago',
    alGuardar: async (d) => {
      await api.post(`${R.mensualidades}/${m.id}/pagos`, d);
      aviso('Pago registrado');
      limpiar(contenedor, await mensualidades(est, modo, alCambiar));
      if (alCambiar) alCambiar();
    },
  });
  limpiar(contenedor,
    h('div', { class: 'alerta ' + (saldo > 0 ? 'aviso' : 'ok'), style: { marginBottom: '14px' } },
      h('div', {}, saldo > 0 ? ['Saldo pendiente total: ', h('b', {}, formato.dinero(saldo))] : 'Está al día con las mensualidades.')),
    tabla({
      filas: lista, vacio: 'No hay mensualidades generadas.',
      columnas: [
        { titulo: 'Periodo', valor: (m) => h('b', {}, formato.periodo(m.periodo)) },
        { titulo: 'Vence', valor: (m) => formato.fecha(m.fechaVencimiento) },
        { titulo: 'Valor', valor: (m) => h('div', {}, formato.dinero(m.valorAPagar), m.porcentajeDescuento ? h('div', { class: 'mutado pequeno' }, `${m.porcentajeDescuento}% de descuento`) : null) },
        { titulo: 'Pagado', valor: (m) => formato.dinero(m.totalPagado) },
        { titulo: 'Saldo', valor: (m) => h('b', {}, formato.dinero(m.saldo)) },
        { titulo: 'Estado', valor: (m) => estado(m.estado) },
        modo !== 'estudiante' ? { titulo: '', clase: 'derecha', valor: (m) => m.saldo > 0 ? h('button', { class: 'btn chico primario', onclick: () => pagar(m) }, 'Pagar') : null } : null,
      ].filter(Boolean),
    }));
  return contenedor;
}

async function asistencia(est) {
  const [resumen, registros, entrenamientos, partidos] = await Promise.all([
    api.get(`${R.asistencias}/resumen/${est.id}`), api.get(R.asistencias, { estudianteId: est.id }), api.get(R.entrenamientos), api.get(R.partidos),
  ]);
  const actividades = Object.fromEntries([...entrenamientos.map((e) => [e.id, { ...e, tipo: 'Entrenamiento' }]), ...partidos.map((p) => [p.id, { ...p, tipo: 'Partido vs ' + p.rival }])]);
  const p = resumen.porcentaje || 0;
  return h('div', {},
    h('div', { class: 'rejilla k3', style: { marginBottom: '16px' } },
      h('div', { class: 'nota' }, h('b', {}, resumen.totalActividades), h('span', {}, 'Actividades registradas')),
      h('div', { class: 'nota' }, h('b', {}, resumen.asistidas), h('span', {}, 'Asistidas')),
      h('div', { class: 'nota' }, h('b', {}, `${p.toFixed(0)} %`), h('span', {}, 'Asistencia'), h('div', { style: { marginTop: '6px' } }, barraProgreso(p, p < 70 ? 'roja' : p < 85 ? 'amarilla' : '')))),
    tabla({
      filas: registros.sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro))), vacio: 'Todavía no hay asistencia registrada.',
      columnas: [
        { titulo: 'Actividad', valor: (r) => actividades[r.actividadId]?.tipo || 'Actividad' },
        { titulo: 'Fecha', valor: (r) => formato.fechaHora(actividades[r.actividadId]?.fechaInicio || r.fechaRegistro) },
        { titulo: 'Estado', valor: (r) => estado(r.estado) },
        { titulo: 'Observación', valor: (r) => r.correcciones?.length ? h('span', { class: 'pequeno mutado' }, r.correcciones.at(-1)) : formato.texto(r.observacion) },
      ],
    }));
}

async function evaluaciones(est, soloVisibles) {
  const [lista, entrenadores] = await Promise.all([api.get(R.evaluaciones, { estudianteId: est.id, soloVisibles }), api.get(R.entrenadores)]);
  if (!lista.length) return h('p', { class: 'mutado' }, soloVisibles ? 'Aún no hay evaluaciones publicadas por los entrenadores.' : 'Aún no tiene evaluaciones.');
  return h('div', { class: 'rejilla' }, lista.sort((a, b) => b.periodo.localeCompare(a.periodo)).map((e) => {
    const ent = entrenadores.find((x) => x.id === e.entrenadorId);
    return h('div', { class: 'tarjeta', style: { padding: '16px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' } },
        h('div', {}, h('b', {}, 'Periodo ' + e.periodo), h('div', { class: 'mutado pequeno' }, `${ent ? nombrePersona(ent) : 'Entrenador'} · ${formato.fecha(e.fecha)}`)),
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          !soloVisibles ? h('span', { class: `estado ${e.visibleFamilia ? 'ok' : 'neutro'}` }, e.visibleFamilia ? 'Publicada' : 'Borrador') : null,
          h('span', { class: 'chip', style: { fontSize: '15px' } }, `Promedio ${Number(e.promedio).toFixed(1)}`))),
      h('div', { class: 'notas' },
        [['Técnico', e.tecnico], ['Táctico', e.tactico], ['Físico', e.fisico], ['Actitudinal', e.actitudinal]].map(([k, v]) => h('div', { class: 'nota' }, h('b', {}, v), h('span', {}, k)))),
      e.observaciones || e.meta ? h('div', { class: 'separar' }, e.observaciones ? h('p', { style: { margin: '0 0 4px' } }, h('b', {}, 'Observaciones: '), e.observaciones) : null, e.meta ? h('p', { style: { margin: 0 } }, h('b', {}, 'Meta: '), e.meta) : null) : null);
  }));
}

async function convocatorias(est, modo) {
  const [lista, partidos] = await Promise.all([api.get(R.convocatorias, { estudianteId: est.id }), api.get(R.partidos)]);
  const contenedor = h('div', {});
  const responder = (c, respuesta) => {
    if (respuesta === 'CONFIRMADO') {
      ejecutar(() => api.patch(`${R.convocatorias}/${c.id}/respuesta`, { estado: 'CONFIRMADO' }), 'Asistencia confirmada', recargar);
      return;
    }
    formularioModal({
      titulo: 'No asistirá al partido', boton: 'Enviar respuesta',
      campos: [{ nombre: 'motivo', etiqueta: 'Motivo', tipo: 'area', requerido: true, ancho: true }],
      alGuardar: async (d) => { await api.patch(`${R.convocatorias}/${c.id}/respuesta`, { estado: 'NO_ASISTIRA', motivo: d.motivo }); aviso('Respuesta enviada'); await recargar(); },
    });
  };
  async function recargar() { limpiar(contenedor, await convocatorias(est, modo)); }
  limpiar(contenedor, tabla({
    filas: lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))), vacio: 'No tiene convocatorias.',
    columnas: [
      { titulo: 'Partido', valor: (c) => { const p = partidos.find((x) => x.id === c.partidoId); return p ? h('div', {}, h('b', {}, 'vs ' + p.rival), h('div', { class: 'mutado pequeno' }, formato.fechaHora(p.fechaInicio))) : '—'; } },
      { titulo: 'Lugar', valor: (c) => partidos.find((x) => x.id === c.partidoId)?.ubicacion?.nombre || '—' },
      { titulo: 'Respuesta', valor: (c) => h('div', {}, estado(c.estado), c.motivo ? h('div', { class: 'mutado pequeno' }, c.motivo) : null) },
      modo === 'familia' ? { titulo: '', clase: 'derecha', valor: (c) => c.estado === 'SIN_RESPUESTA' || c.estado === 'CONFIRMADO' || c.estado === 'NO_ASISTIRA'
        ? h('div', { class: 'acciones-fila' },
          c.estado !== 'CONFIRMADO' ? h('button', { class: 'btn chico primario', onclick: () => responder(c, 'CONFIRMADO') }, 'Confirmar') : null,
          c.estado !== 'NO_ASISTIRA' ? h('button', { class: 'btn chico', onclick: () => responder(c, 'NO_ASISTIRA') }, 'No asistirá') : null)
        : null } : null,
    ].filter(Boolean),
  }));
  return contenedor;
}
