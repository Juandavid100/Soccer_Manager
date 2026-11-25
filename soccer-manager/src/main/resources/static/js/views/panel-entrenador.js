// Inicio del entrenador: sus grupos, próximas sesiones y permisos (HU-07).
import { h, banner, limpiar, encabezado, tarjeta, formato, icono, estado, fechaHoraLocal, barraProgreso } from '../ui.js';
import { catalogos, cargarPersona } from '../sesion.js';

export async function mostrar(contenedor, ctx) {
  const [yo, cat] = await Promise.all([cargarPersona(ctx.usuario), catalogos('grupos', 'estudiantes', 'entrenamientos', 'campeonatos', 'partidos', 'evaluaciones')]);
  const misGrupos = cat.grupos.filter((g) => (g.entrenadorIds || []).includes(ctx.usuario.personaId));
  const ids = new Set(misGrupos.map((g) => g.id));
  const misEstudiantes = cat.estudiantes.filter((e) => ids.has(e.grupoId) && e.estado === 'ACTIVO');
  const misCampeonatos = cat.campeonatos.filter((c) => c.entrenadorId === ctx.usuario.personaId);
  const ahora = fechaHoraLocal(new Date());
  const proximas = [
    ...cat.entrenamientos.filter((e) => ids.has(e.grupoId)).map((e) => ({ ...e, titulo: `Entrenamiento · ${cat.gruposPorId[e.grupoId]?.codigo}`, ruta: `entrenamientos/${e.id}` })),
    ...cat.partidos.filter((p) => misCampeonatos.some((c) => c.id === p.campeonatoId)).map((p) => ({ ...p, titulo: `Partido vs ${p.rival}`, ruta: `partidos/${p.id}` })),
  ].filter((a) => a.estado !== 'CANCELADO' && String(a.fechaFin) >= ahora).sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio))).slice(0, 6);
  const sinEvaluar = misEstudiantes.filter((e) => !cat.evaluaciones.some((ev) => ev.estudianteId === e.id)).length;

  const kpi = (ico, tono, valor, texto) => h('div', { class: 'tarjeta kpi' }, h('div', { class: `ico ${tono}` }, icono(ico)), h('div', {}, h('div', { class: 'valor' }, valor), h('div', { class: 'etiqueta' }, texto)));
  const permiso = (ok, texto) => h('span', { class: `estado ${ok ? 'ok' : 'neutro'}` }, texto);

  limpiar(contenedor,
    banner(`Hola${yo ? ', ' + yo.nombres : ''}`, 'Sus grupos, sus próximas sesiones y lo que tiene pendiente.',
      h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, permiso(yo?.puedeConvocar, 'Puede convocar'), permiso(yo?.puedeModificarActividades, 'Puede modificar actividades'))),
    h('div', { class: 'rejilla k4' },
      kpi('grupo', 'azul', misGrupos.length, 'Grupos a cargo'),
      kpi('estudiante', 'verde', misEstudiantes.length, 'Estudiantes activos'),
      kpi('calendario', 'amarillo', proximas.length, 'Próximas actividades'),
      kpi('evaluacion', 'rojo', sinEvaluar, 'Estudiantes sin evaluar')),
    h('div', { class: 'rejilla k21 separar' },
      tarjeta('Próximas actividades', h('div', { class: 'cuerpo' },
        proximas.length ? h('ul', { class: 'lista-simple' }, proximas.map((a) => h('li', {},
          h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
            h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(a.fechaInicio)), h('span', {}, formato.mes(a.fechaInicio))),
            h('div', {}, h('b', {}, a.titulo), h('div', { class: 'mutado pequeno' }, `${formato.hora(a.fechaInicio)} · ${a.ubicacion?.nombre || ''}`))),
          h('a', { href: '#/' + a.ruta, class: 'btn chico' }, 'Abrir'))))
          : h('p', { class: 'mutado', style: { margin: 0 } }, 'No tiene actividades programadas.'))),
      tarjeta('Mis grupos', h('div', { class: 'cuerpo' },
        misGrupos.length ? h('ul', { class: 'lista-simple' }, misGrupos.map((g) => {
          const n = misEstudiantes.filter((e) => e.grupoId === g.id).length;
          return h('li', { style: { display: 'block' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } }, h('a', { href: `#/grupos/${g.id}` }, h('b', {}, g.codigo)), estado(g.estado)),
            h('div', { class: 'mutado pequeno', style: { marginBottom: '6px' } }, g.horario || ''),
            barraProgreso((n / g.cupoMaximo) * 100));
        })) : h('p', { class: 'mutado', style: { margin: 0 } }, 'La gerencia aún no le asigna grupos.')))));
}
