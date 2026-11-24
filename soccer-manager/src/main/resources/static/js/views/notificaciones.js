// Notificaciones a estudiantes, acudientes y entrenadores (HU-14).
import { h, limpiar, encabezado, boton, tarjeta, estado, formato, formularioModal, ejecutar, confirmar, aviso, opciones, enumOpciones, selector, icono } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona, esGerente } from '../sesion.js';

const TIPOS = ['RECORDATORIO', 'CAMBIO_ACTIVIDAD', 'CONVOCATORIA', 'PAGO', 'CAMBIO_CATEGORIA', 'GENERAL'];
const ICONOS = { RECORDATORIO: 'reloj', CAMBIO_ACTIVIDAD: 'calendario', CONVOCATORIA: 'trofeo', PAGO: 'dinero', CAMBIO_CATEGORIA: 'categoria', GENERAL: 'campana' };

function listaNotificaciones(lista, { anular } = {}) {
  if (!lista.length) return h('div', { class: 'vacio' }, icono('campana'), 'No hay notificaciones.');
  return h('ul', { class: 'lista-simple', style: { padding: '0 20px' } },
    lista.sort((a, b) => String(b.fechaEnvio).localeCompare(String(a.fechaEnvio))).map((n) => h('li', { style: { opacity: n.anulada ? .55 : 1 } },
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start' } },
        h('div', { class: 'kpi', style: { padding: 0 } }, h('div', { class: 'ico verde', style: { width: '38px', height: '38px' } }, icono(ICONOS[n.tipo] || 'campana'))),
        h('div', {},
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('b', {}, formato.enum(n.tipo)), h('span', { class: 'mutado pequeno' }, formato.fechaHora(n.fechaEnvio)), n.anulada ? h('span', { class: 'estado mal' }, 'Anulada') : null),
          h('div', { style: n.anulada ? { textDecoration: 'line-through' } : null }, n.mensaje))),
      anular && !n.anulada ? h('button', { class: 'btn chico peligro', onclick: () => anular(n) }, 'Anular') : null)));
}

export async function mostrar(contenedor, ctx) {
  if (!esGerente(ctx.usuario)) {
    const lista = ctx.usuario.personaId ? await api.get(R.notificaciones, { personaId: ctx.usuario.personaId }) : [];
    limpiar(contenedor,
      encabezado('Notificaciones', 'Avisos de la escuela: actividades, convocatorias, pagos y cambios.'),
      tarjeta(null, listaNotificaciones(lista.filter((n) => !n.anulada))));
    return;
  }

  const cat = await catalogos('estudiantes', 'acudientes', 'entrenadores', 'grupos');
  const personas = [
    ...cat.acudientes.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} (acudiente)` })),
    ...cat.estudiantes.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} (estudiante)` })),
    ...cat.entrenadores.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} (entrenador)` })),
  ].sort((a, b) => a.texto.localeCompare(b.texto));
  let personaId = personas[0]?.valor || '';
  const cuerpo = h('div', {});

  async function refrescar() {
    if (!personaId) { limpiar(cuerpo, h('div', { class: 'vacio' }, 'Registre personas para ver sus notificaciones.')); return; }
    const lista = await api.get(R.notificaciones, { personaId });
    limpiar(cuerpo, listaNotificaciones(lista, { anular }));
  }
  async function anular(n) {
    if (await confirmar('¿Anular esta notificación?', { boton: 'Anular', peligro: true }))
      ejecutar(() => api.patch(`${R.notificaciones}/${n.id}/anulacion`), 'Notificación anulada', refrescar);
  }
  function enviar() {
    formularioModal({
      titulo: 'Enviar notificación', boton: 'Enviar',
      nota: 'Elija una persona o un grupo completo. Al elegir un grupo se notifica a sus estudiantes activos y a sus acudientes.',
      campos: [
        { nombre: 'destino', etiqueta: 'Destinatario', tipo: 'select', ancho: true, opciones: [
          ...cat.grupos.map((g) => ({ valor: 'grupo:' + g.id, texto: `Grupo ${g.codigo} (estudiantes y acudientes)` })), ...personas] },
        { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: enumOpciones(TIPOS), ancho: true },
        { nombre: 'mensaje', etiqueta: 'Mensaje', tipo: 'area', requerido: true, ancho: true },
      ],
      valores: { tipo: 'GENERAL', destino: personaId },
      alGuardar: async (d) => {
        if (!d.destino) throw new Error('Elija un destinatario');
        let ids = [d.destino];
        if (d.destino.startsWith('grupo:')) {
          const gid = d.destino.slice(6);
          const est = cat.estudiantes.filter((e) => e.grupoId === gid && e.estado === 'ACTIVO');
          ids = [...new Set([...est.map((e) => e.id), ...est.flatMap((e) => e.acudienteIds || [])])];
          if (!ids.length) throw new Error('El grupo no tiene estudiantes activos');
        }
        for (const id of ids) await api.post(R.notificaciones, { personaId: id, tipo: d.tipo, mensaje: d.mensaje });
        aviso(`Notificación enviada a ${ids.length} persona(s)`);
        await refrescar();
      },
    });
  }

  limpiar(contenedor,
    encabezado('Notificaciones', 'Consulte lo que ha recibido cada persona y envíe avisos individuales o por grupo.',
      boton('Enviar notificación', enviar, { clase: 'primario', icono: 'enviar' })),
    tarjeta(null, h('div', {},
      h('div', { class: 'filtros' }, h('span', { class: 'fuerte' }, 'Persona:'), selector(personas, (v) => { personaId = v; refrescar(); }, { todos: null, valor: personaId })),
      cuerpo)));
  await refrescar();
}
