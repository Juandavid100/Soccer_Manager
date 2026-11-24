// Panel de la gerencia: estado general de la escuela (HU-06).
import { h, limpiar, encabezado, tarjeta, formato, estado, icono, barraProgreso, persona, fechaHoraLocal } from '../ui.js';
import { catalogos, nombrePersona } from '../sesion.js';

function kpi(ico, tono, valor, etiqueta, ruta) {
  return h('a', { class: 'tarjeta kpi', href: ruta ? '#/' + ruta : null, style: { textDecoration: 'none', color: 'inherit' } },
    h('div', { class: `ico ${tono}` }, icono(ico)),
    h('div', {}, h('div', { class: 'valor' }, valor), h('div', { class: 'etiqueta' }, etiqueta)));
}

export async function mostrar(contenedor, ctx) {
  const cat = await catalogos('estudiantes', 'grupos', 'categorias', 'mensualidades', 'entrenamientos', 'partidos', 'campeonatos', 'entrenadores');
  const ahora = fechaHoraLocal(new Date());
  const activos = cat.estudiantes.filter((e) => e.estado === 'ACTIVO');
  const pendientes = cat.estudiantes.filter((e) => e.estado === 'PENDIENTE');
  const porCobrar = cat.mensualidades.reduce((s, m) => s + m.saldo, 0);
  const vencidas = cat.mensualidades.filter((m) => m.estado === 'VENCIDO');
  const proximas = [
    ...cat.entrenamientos.map((e) => ({ ...e, tipo: 'entrenamiento', titulo: `Entrenamiento · ${cat.gruposPorId[e.grupoId]?.codigo || ''}`, ruta: `entrenamientos/${e.id}` })),
    ...cat.partidos.map((p) => ({ ...p, tipo: 'partido', titulo: `Partido vs ${p.rival}`, ruta: `partidos/${p.id}`, sub: cat.campeonatos.find((c) => c.id === p.campeonatoId)?.nombre })),
  ].filter((a) => a.estado !== 'CANCELADO' && String(a.fechaFin) >= ahora).sort((a, b) => String(a.fechaInicio).localeCompare(String(b.fechaInicio))).slice(0, 6);

  const vacia = !cat.categorias.length && !cat.estudiantes.length;
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  limpiar(contenedor,
    encabezado(`${saludo}${ctx.usuario.nombre ? ', ' + ctx.usuario.nombre.split(' ')[0] : ''}`, 'Así va la escuela hoy.',
      h('a', { href: '#/estudiantes', class: 'btn primario' }, icono('mas'), 'Matricular'),
      h('a', { href: '#/mensualidades', class: 'btn' }, icono('dinero'), 'Mensualidades')),
    vacia ? h('div', { class: 'alerta info', style: { marginBottom: '16px', alignItems: 'center' } }, icono('datos'),
      h('div', { style: { flex: 1 } }, h('b', {}, 'La escuela todavía no tiene datos. '), 'Puede empezar creando categorías y grupos, o cargar datos de ejemplo para conocer la plataforma.'),
      h('a', { href: '#/demo', class: 'btn acento chico' }, 'Cargar datos de ejemplo')) : null,
    h('div', { class: 'rejilla k4' },
      kpi('estudiante', 'verde', activos.length, 'Estudiantes activos', 'estudiantes'),
      kpi('grupo', 'azul', cat.grupos.filter((g) => g.estado === 'ACTIVO').length, 'Grupos activos', 'grupos'),
      kpi('dinero', 'amarillo', formato.dinero(porCobrar), 'Saldo por cobrar', 'mensualidades'),
      kpi('alerta', 'rojo', vencidas.length, 'Mensualidades vencidas', 'mensualidades')),
    h('div', { class: 'rejilla k21 separar' },
      tarjeta('Próximas actividades', h('div', { class: 'cuerpo' },
        proximas.length ? h('ul', { class: 'lista-simple' }, proximas.map((a) => h('li', {},
          h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
            h('div', { class: 'evento-fecha' }, h('b', {}, formato.dia(a.fechaInicio)), h('span', {}, formato.mes(a.fechaInicio))),
            h('div', {}, h('b', {}, a.titulo), h('div', { class: 'mutado pequeno' }, `${formato.hora(a.fechaInicio)} · ${a.ubicacion?.nombre || 'Lugar por definir'}${a.sub ? ' · ' + a.sub : ''}`))),
          h('a', { href: '#/' + a.ruta, class: 'btn chico' }, 'Ver'))))
          : h('p', { class: 'mutado', style: { margin: 0 } }, 'No hay actividades programadas.')),
        h('a', { href: '#/entrenamientos', class: 'btn chico' }, 'Entrenamientos')),
      tarjeta('Ocupación de grupos', h('div', { class: 'cuerpo' },
        cat.grupos.length ? h('ul', { class: 'lista-simple' }, cat.grupos.filter((g) => g.estado === 'ACTIVO').map((g) => {
          const n = activos.filter((e) => e.grupoId === g.id).length;
          const p = (n / g.cupoMaximo) * 100;
          return h('li', { style: { display: 'block' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' } }, h('a', { href: `#/grupos/${g.id}` }, h('b', {}, g.codigo)), h('span', { class: 'pequeno' }, `${n}/${g.cupoMaximo}`)),
            barraProgreso(p, p >= 100 ? 'roja' : p >= 80 ? 'amarilla' : ''));
        })) : h('p', { class: 'mutado', style: { margin: 0 } }, 'Sin grupos.')))),
    h('div', { class: 'rejilla k2 separar' },
      tarjeta('Pendientes de asignar grupo', h('div', { class: 'cuerpo' },
        pendientes.length ? h('ul', { class: 'lista-simple' }, pendientes.slice(0, 6).map((e) => h('li', {},
          persona(nombrePersona(e), `${formato.edad(e.fechaNacimiento)} años · matrícula pendiente`),
          h('a', { href: `#/estudiantes/${e.id}`, class: 'btn chico primario' }, 'Asignar'))))
          : h('p', { class: 'mutado', style: { margin: 0 } }, 'Todas las matrículas tienen grupo.'))),
      tarjeta('Cobros por atender', h('div', { class: 'cuerpo' },
        cat.mensualidades.filter((m) => m.saldo > 0).length
          ? h('ul', { class: 'lista-simple' }, cat.mensualidades.filter((m) => m.saldo > 0)
            .sort((a, b) => String(a.fechaVencimiento).localeCompare(String(b.fechaVencimiento))).slice(0, 6).map((m) => h('li', {},
              persona(nombrePersona(cat.estudiantesPorId[m.estudianteId]), `${formato.periodo(m.periodo)} · vence ${formato.fecha(m.fechaVencimiento)}`),
              h('div', { class: 'derecha' }, h('b', {}, formato.dinero(m.saldo)), h('div', {}, estado(m.estado))))))
          : h('p', { class: 'mutado', style: { margin: 0 } }, 'No hay saldos pendientes.')),
        h('a', { href: '#/mensualidades', class: 'btn chico' }, 'Ver todas'))));
}
