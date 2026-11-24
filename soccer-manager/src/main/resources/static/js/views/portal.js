// Portal de familias (acudiente) y del estudiante: perfil, actividades, progreso, convocatorias y pagos (HU-11, 13, 15, 17-20).
import { h, limpiar, encabezado, tarjeta, formato, estado, icono, iniciales, fechaHoraLocal } from '../ui.js';
import { api, R } from '../api.js';
import { cargarPersona, nombrePersona, rolPrincipal } from '../sesion.js';
import { fichaEstudiante } from './ficha-estudiante.js';

export async function mostrar(contenedor, ctx) {
  const rol = rolPrincipal(ctx.usuario);
  if (!ctx.usuario.personaId) {
    limpiar(contenedor, h('div', { class: 'alerta aviso' }, icono('alerta'), h('div', {}, 'Su cuenta no está asociada a una persona. Comuníquese con la escuela.')));
    return;
  }
  if (rol === 'ESTUDIANTE') return ficha(contenedor, ctx, ctx.usuario.personaId, 'estudiante', null);
  return inicioAcudiente(contenedor, ctx);
}

async function proximasActividades(estudiantes) {
  const [entrenamientos, partidos, convocatorias] = await Promise.all([api.get(R.entrenamientos), api.get(R.partidos), api.get(R.convocatorias)]);
  const ahora = fechaHoraLocal(new Date());
  const lista = [];
  for (const e of estudiantes) {
    entrenamientos.filter((x) => x.grupoId && x.grupoId === e.grupoId).forEach((x) => lista.push({ ...x, quien: e.nombres, titulo: 'Entrenamiento' }));
    convocatorias.filter((c) => c.estudianteId === e.id && c.estado !== 'RETIRADO').forEach((c) => {
      const p = partidos.find((x) => x.id === c.partidoId);
      if (p) lista.push({ ...p, quien: e.nombres, titulo: `Partido vs ${p.rival}`, convocatoria: c });
    });
  }
  return lista.filter((a) => a.estado !== 'CANCELADO' && String(a.fechaFin) >= ahora).sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio))).slice(0, 6);
}

function listaActividades(lista) {
  if (!lista.length) return h('p', { class: 'mutado', style: { margin: 0 } }, 'No hay actividades próximas.');
  return h('ul', { class: 'lista-simple' }, lista.map((a) => h('li', {},
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
      h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(a.fechaInicio)), h('span', {}, formato.mes(a.fechaInicio))),
      h('div', {}, h('b', {}, `${a.titulo} · ${a.quien}`),
        h('div', { class: 'mutado pequeno' }, `${formato.hora(a.fechaInicio)} – ${formato.hora(a.fechaFin)} · ${a.ubicacion?.nombre || 'Lugar por definir'}`),
        a.instrucciones ? h('div', { class: 'pequeno' }, a.instrucciones) : null)),
    h('div', { class: 'derecha' },
      a.convocatoria ? estado(a.convocatoria.estado) : estado(a.estado),
      a.ubicacion?.enlaceMapa ? h('div', {}, h('a', { href: a.ubicacion.enlaceMapa, target: '_blank', rel: 'noopener', class: 'pequeno' }, 'Ver mapa')) : null))));
}

async function inicioAcudiente(contenedor, ctx) {
  const yo = await cargarPersona(ctx.usuario);
  const [estudiantes, grupos, mensualidades, notificaciones] = await Promise.all([
    api.get(`${R.acudientes}/${ctx.usuario.personaId}/estudiantes`), api.get(R.grupos), api.get(R.mensualidades),
    api.get(R.notificaciones, { personaId: ctx.usuario.personaId }),
  ]);
  const actividades = await proximasActividades(estudiantes.filter((e) => e.estado === 'ACTIVO'));
  const saldoDe = (id) => mensualidades.filter((m) => m.estudianteId === id).reduce((s, m) => s + m.saldo, 0);
  const saldoTotal = estudiantes.reduce((s, e) => s + saldoDe(e.id), 0);
  const recientes = notificaciones.filter((n) => !n.anulada).sort((a, b) => String(b.fechaEnvio).localeCompare(String(a.fechaEnvio))).slice(0, 4);

  limpiar(contenedor,
    encabezado(`Hola${yo ? ', ' + yo.nombres : ''}`, 'Consulte las actividades, el progreso y los pagos de sus estudiantes.'),
    saldoTotal > 0 ? h('div', { class: 'alerta aviso', style: { marginBottom: '16px' } }, icono('dinero'), h('div', {}, 'Tiene un saldo pendiente de ', h('b', {}, formato.dinero(saldoTotal)), '. Abra la ficha del estudiante para pagar en línea.')) : null,
    h('div', { class: 'rejilla k3' }, estudiantes.length ? estudiantes.map((e) => {
      const g = grupos.find((x) => x.id === e.grupoId);
      const saldo = saldoDe(e.id);
      return h('article', { class: 'tarjeta tarjeta-estudiante', onclick: () => ficha(contenedor, ctx, e.id, 'familia', () => inicioAcudiente(contenedor, ctx)) },
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
          h('div', { class: 'avatar', style: { width: '48px', height: '48px', fontSize: '18px' } }, iniciales(nombrePersona(e))),
          h('div', {}, h('h2', { style: { fontSize: '22px' } }, nombrePersona(e)), estado(e.estado))),
        h('div', { class: 'linea-icono' }, icono('grupo'), g ? `Grupo ${g.codigo}` : 'Sin grupo asignado'),
        h('div', { class: 'linea-icono' }, icono('reloj'), g?.horario || '—'),
        h('div', { class: 'linea-icono' }, icono('dinero'), saldo > 0 ? h('b', { style: { color: 'var(--roja)' } }, `Saldo ${formato.dinero(saldo)}`) : 'Al día con los pagos'),
        h('span', { class: 'btn chico primario', style: { alignSelf: 'flex-start' } }, 'Ver ficha completa'));
    }) : tarjeta(null, h('div', { class: 'vacio' }, 'No tiene estudiantes a cargo registrados.'))),
    h('div', { class: 'rejilla k21 separar' },
      tarjeta('Próximas actividades', h('div', { class: 'cuerpo' }, listaActividades(actividades))),
      tarjeta('Últimas notificaciones', h('div', { class: 'cuerpo' },
        recientes.length ? h('ul', { class: 'lista-simple' }, recientes.map((n) => h('li', { style: { display: 'block' } },
          h('div', { class: 'pequeno mutado' }, `${formato.enum(n.tipo)} · ${formato.fechaHora(n.fechaEnvio)}`), h('div', {}, n.mensaje))))
          : h('p', { class: 'mutado', style: { margin: 0 } }, 'Sin notificaciones.')),
        h('a', { href: '#/notificaciones', class: 'btn chico' }, 'Ver todas'))));
}

async function ficha(contenedor, ctx, id, modo, volver) {
  const f = await fichaEstudiante(id, { modo, alCambiar: null });
  const actividades = modo === 'estudiante' ? await proximasActividades([f.estudiante]) : null;
  limpiar(contenedor,
    volver ? h('button', { class: 'btn fantasma chico', style: { marginBottom: '12px' }, onclick: volver }, '← Volver a mis estudiantes') : null,
    modo === 'estudiante' ? encabezado('Mi perfil', 'Sus datos, actividades, asistencia y progreso.') : null,
    modo === 'estudiante' ? h('div', { style: { marginBottom: '16px' } }, tarjeta('Próximas actividades', h('div', { class: 'cuerpo' }, listaActividades(actividades)))) : null,
    tarjeta(null, h('div', { class: 'cuerpo' }, f.cabeza, f.cuerpo)));
}
