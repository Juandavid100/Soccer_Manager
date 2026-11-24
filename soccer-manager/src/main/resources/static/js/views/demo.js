// Carga datos de ejemplo usando la misma API REST, para mostrar la plataforma con información realista.
import { h, limpiar, encabezado, tarjeta, icono, fechaLocal, fechaHoraLocal } from '../ui.js';
import { api, R } from '../api.js';

const CLAVE_DEMO = 'demo12345';
const sinTildes = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export async function mostrar(contenedor) {
  const registro = h('ol', { class: 'pequeno', style: { margin: 0, paddingLeft: '20px', maxHeight: '340px', overflowY: 'auto' } });
  const resultado = h('div', {});
  const iniciar = h('button', { class: 'btn primario' }, icono('datos'), 'Cargar datos de ejemplo');
  iniciar.addEventListener('click', async () => {
    iniciar.disabled = true;
    limpiar(registro); limpiar(resultado);
    const paso = (t) => { registro.appendChild(h('li', {}, t)); registro.scrollTop = registro.scrollHeight; };
    try {
      const cuentas = await cargar(paso);
      limpiar(resultado, h('div', { class: 'alerta ok separar' }, icono('check'), h('div', {},
        h('b', {}, 'Datos cargados. '), 'Puede recorrer los módulos o cerrar sesión y entrar con estas cuentas de ejemplo (contraseña ', h('b', {}, CLAVE_DEMO), '):',
        h('ul', { style: { margin: '6px 0 0' } }, cuentas.map((c) => h('li', {}, h('b', {}, c.correo), ` · ${c.rol}`))))),
        h('a', { href: '#/', class: 'btn primario separar' }, 'Ir al panel'));
    } catch (e) {
      limpiar(resultado, h('div', { class: 'alerta error separar' }, icono('alerta'), h('div', {}, e.message)));
    } finally {
      iniciar.disabled = false;
    }
  });
  limpiar(contenedor,
    encabezado('Datos de ejemplo', 'Crea una escuela de muestra a través de la API: categorías, grupos, estudiantes, actividades, evaluaciones y pagos.'),
    tarjeta(null, h('div', { class: 'cuerpo' },
      h('div', { class: 'alerta info', style: { marginBottom: '16px' } }, icono('info'), h('div', {},
        'Se crean 3 categorías, 2 entrenadores, 4 acudientes, 3 grupos, 10 estudiantes, entrenamientos con asistencia, un campeonato con partidos y convocatorias, evaluaciones y mensualidades con pagos. ',
        'Cada registro pasa por las mismas validaciones de la API. Si ya existen datos con el mismo nombre, se reutilizan.')),
      iniciar, h('div', { class: 'separar' }, registro), resultado)));
}

async function cargar(paso) {
  const anio = new Date().getFullYear();
  const sufijo = String(Date.now()).slice(-5);
  const dia = (n, hora = 0, min = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(hora, min, 0, 0); return d; };
  const ubicacion = (nombre, direccion) => ({ nombre, direccion, indicaciones: 'Ingreso por la portería principal', enlaceMapa: `https://maps.google.com/?q=${encodeURIComponent(direccion + ', Pasto')}` });

  // Categorías (se reutilizan si ya existen)
  const existentes = await api.get(R.categorias);
  const categoria = async (nombre, min, max) => {
    const ya = existentes.find((c) => c.nombre === nombre && c.temporada === anio);
    if (ya) return ya;
    paso(`Categoría ${nombre}`);
    return api.post(R.categorias, { nombre, edadMinima: min, edadMaxima: max, temporada: anio, fechaCorte: `${anio}-12-31` });
  };
  const sub8 = await categoria('Sub-8', 6, 8);
  const sub10 = await categoria('Sub-10', 9, 10);
  const sub12 = await categoria('Sub-12', 11, 12);

  // Entrenadores con permisos
  const entrenador = async (nombres, apellidos, n) => {
    paso(`Entrenador ${nombres} ${apellidos}`);
    const e = await api.post(R.entrenadores, { documento: `8${n}${sufijo}`, nombres, apellidos, telefono: `31${n}5550000`, correo: `${sinTildes(nombres)}.${sufijo}@escuela.com` });
    await api.patch(`${R.entrenadores}/${e.id}/permisos`, { puedeConvocar: true, puedeModificarActividades: true });
    return e;
  };
  const carlos = await entrenador('Carlos', 'Ruiz', 1);
  const laura = await entrenador('Laura', 'Martínez', 2);

  // Acudientes
  const acudiente = (nombres, apellidos, parentesco, n) => {
    paso(`Acudiente ${nombres} ${apellidos}`);
    return api.post(R.acudientes, { documento: `5${n}${sufijo}`, nombres, apellidos, parentesco, telefono: `30${n}1112233`, correo: `${sinTildes(nombres)}.${sinTildes(apellidos)}.${sufijo}@correo.com` });
  };
  const ana = await acudiente('Ana', 'Pérez', 'Madre', 1);
  const jorge = await acudiente('Jorge', 'Gómez', 'Padre', 2);
  const sandra = await acudiente('Sandra', 'López', 'Madre', 3);
  const diego = await acudiente('Diego', 'Rosero', 'Padre', 4);

  // Grupos
  const codigos = new Set((await api.get(R.grupos)).map((g) => g.codigo));
  const grupo = async (codigo, cat, cupo, horario, lugar, entrenadores) => {
    const final = codigos.has(codigo) ? `${codigo}-${sufijo}` : codigo;
    paso(`Grupo ${final}`);
    const g = await api.post(R.grupos, { codigo: final, categoriaId: cat.id, cupoMaximo: cupo, horario, ubicacion: lugar });
    for (const e of entrenadores) await api.patch(`${R.grupos}/${g.id}/entrenadores/${e.id}`);
    return g;
  };
  const cancha1 = ubicacion('Cancha sintética Champagnat', 'Cra 27 # 10-20');
  const cancha2 = ubicacion('Estadio Libertad · cancha auxiliar', 'Av. Panamericana # 18-50');
  const g8 = await grupo('S8-A', sub8, 12, 'Martes y jueves 3:00 p. m.', cancha1, [laura]);
  const g10 = await grupo('S10-A', sub10, 15, 'Lunes, miércoles y viernes 4:00 p. m.', cancha1, [carlos]);
  const g12 = await grupo('S12-A', sub12, 15, 'Martes y jueves 5:00 p. m.', cancha2, [carlos, laura]);

  // Estudiantes (la edad debe coincidir con la categoría a la fecha de corte)
  const estudiante = async (nombres, apellidos, edad, acudientes, g, n) => {
    paso(`Estudiante ${nombres} ${apellidos}`);
    const e = await api.post(R.estudiantes, { documento: `10${n}${sufijo}`, nombres, apellidos, fechaNacimiento: `${anio - edad}-0${(n % 8) + 1}-15`, acudienteIds: acudientes.map((a) => a.id) });
    if (g) return api.patch(`${R.estudiantes}/${e.id}/grupo`, { grupoId: g.id });
    return e;
  };
  const est = [
    await estudiante('Tomás', 'Pérez', 7, [ana], g8, 1),
    await estudiante('Valentina', 'Gómez', 8, [jorge], g8, 2),
    await estudiante('Juan', 'Pérez', 9, [ana], g10, 3),
    await estudiante('Samuel', 'López', 10, [sandra], g10, 4),
    await estudiante('Mariana', 'Rosero', 9, [diego], g10, 5),
    await estudiante('Isabella', 'Gómez', 10, [jorge], g10, 6),
    await estudiante('Mateo', 'López', 11, [sandra], g12, 7),
    await estudiante('Sofía', 'Rosero', 12, [diego], g12, 8),
    await estudiante('Martín', 'Pérez', 11, [ana], g12, 9),
    await estudiante('Emilio', 'Gómez', 9, [jorge], null, 10),
  ];
  const sub10Est = est.filter((e) => e.grupoId === g10.id);

  // Entrenamientos: uno de ayer (con asistencia) y dos próximos por grupo
  const estados = ['PRESENTE', 'PRESENTE', 'TARDE', 'PRESENTE', 'AUSENTE'];
  for (const [g, hora] of [[g8, 15], [g10, 16], [g12, 17]]) {
    paso(`Entrenamientos del grupo ${g.codigo}`);
    const ayer = await api.post(R.entrenamientos, { grupoId: g.id, fechaInicio: fechaHoraLocal(dia(-1, hora)), fechaFin: fechaHoraLocal(dia(-1, hora + 1, 30)), instrucciones: 'Trabajo de conducción y pase corto' });
    await api.post(R.entrenamientos, { grupoId: g.id, fechaInicio: fechaHoraLocal(dia(2, hora)), fechaFin: fechaHoraLocal(dia(2, hora + 1, 30)), instrucciones: 'Traer canilleras e hidratación' });
    await api.post(R.entrenamientos, { grupoId: g.id, fechaInicio: fechaHoraLocal(dia(5, hora)), fechaFin: fechaHoraLocal(dia(5, hora + 1, 30)), instrucciones: 'Definición y remate a portería' });
    const delGrupo = est.filter((e) => e.grupoId === g.id);
    for (const [i, e] of delGrupo.entries())
      await api.post(R.asistencias, { actividadId: ayer.id, estudianteId: e.id, estado: estados[i % estados.length], registradoPor: (g === g8 ? laura : carlos).id });
  }

  // Campeonato con partidos y convocatorias
  paso('Campeonato Copa Pasto con partidos');
  const copa = await api.post(R.campeonatos, { nombre: `Copa Pasto ${anio}`, categoriaId: sub10.id, fechaInicio: fechaLocal(dia(-10)), fechaFin: fechaLocal(dia(40)), entrenadorId: carlos.id });
  await api.put(`${R.campeonatos}/${copa.id}`, { ...copa, estado: 'EN_CURSO' });
  const jugado = await api.post(R.partidos, { campeonatoId: copa.id, rival: 'Deportivo Sur', fechaInicio: fechaHoraLocal(dia(-1, 9)), fechaFin: fechaHoraLocal(dia(-1, 10, 30)), ubicacion: cancha2 });
  await api.patch(`${R.partidos}/${jugado.id}/resultado`, { resultado: '3-1' });
  const proximo = await api.post(R.partidos, { campeonatoId: copa.id, rival: 'Academia Galeras', fechaInicio: fechaHoraLocal(dia(6, 9)), fechaFin: fechaHoraLocal(dia(6, 10, 30)), ubicacion: cancha2 });
  paso('Convocatorias al próximo partido');
  const convocatorias = [];
  for (const e of sub10Est) convocatorias.push(await api.post(R.convocatorias, { partidoId: proximo.id, estudianteId: e.id, convocadoPor: carlos.id }));
  if (convocatorias[0]) await api.patch(`${R.convocatorias}/${convocatorias[0].id}/respuesta`, { estado: 'CONFIRMADO' });
  if (convocatorias[1]) await api.patch(`${R.convocatorias}/${convocatorias[1].id}/respuesta`, { estado: 'NO_ASISTIRA', motivo: 'Viaje familiar ese fin de semana' });

  // Evaluaciones
  paso('Evaluaciones del periodo');
  const notas = [[4, 3, 5, 4], [5, 4, 4, 5], [3, 3, 4, 4], [4, 4, 3, 5]];
  for (const [i, e] of sub10Est.entries()) {
    const [tecnico, tactico, fisico, actitudinal] = notas[i % notas.length];
    const ev = await api.post(R.evaluaciones, { estudianteId: e.id, entrenadorId: carlos.id, periodo: `${anio}-2`, tecnico, tactico, fisico, actitudinal, observaciones: 'Buen control de balón y compromiso en los entrenamientos', meta: 'Mejorar el pase largo y la lectura de juego' });
    if (i < 3) await api.patch(`${R.evaluaciones}/${ev.id}/publicacion`);
  }

  // Mensualidades: mes anterior (una vencida) y mes actual (con abonos)
  paso('Mensualidades y pagos');
  const hoy = new Date();
  const periodo = (d) => fechaLocal(d).slice(0, 7);
  const anterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const activos = est.filter((e) => e.estado === 'ACTIVO');
  for (const [i, e] of activos.entries()) {
    const descuento = e.nombres === 'Martín' ? 10 : 0;
    const mAnt = await api.post(R.mensualidades, { estudianteId: e.id, periodo: periodo(anterior), valor: 120000, porcentajeDescuento: descuento, fechaVencimiento: fechaLocal(new Date(anterior.getFullYear(), anterior.getMonth(), 10)) });
    if (i !== 2) await api.post(`${R.mensualidades}/${mAnt.id}/pagos`, { valor: mAnt.saldo, metodo: i % 2 ? 'TRANSFERENCIA' : 'EFECTIVO', comprobante: i % 2 ? `TRF-${sufijo}${i}` : null });
    const mAct = await api.post(R.mensualidades, { estudianteId: e.id, periodo: periodo(hoy), valor: 120000, porcentajeDescuento: descuento, fechaVencimiento: fechaLocal(dia(10)) });
    if (i % 3 === 0) await api.post(`${R.mensualidades}/${mAct.id}/pagos`, { valor: mAct.saldo, metodo: 'PASARELA' });
    else if (i % 3 === 1) await api.post(`${R.mensualidades}/${mAct.id}/pagos`, { valor: 50000, metodo: 'EFECTIVO' });
  }

  // Cuentas de ejemplo para cada rol
  paso('Cuentas de acceso de ejemplo');
  const cuentas = [
    { correo: 'acudiente@demo.com', roles: ['ACUDIENTE'], personaId: ana.id, rol: `Acudiente (${ana.nombres} ${ana.apellidos})` },
    { correo: 'entrenador@demo.com', roles: ['ENTRENADOR'], personaId: carlos.id, rol: `Entrenador (${carlos.nombres} ${carlos.apellidos})` },
    { correo: 'estudiante@demo.com', roles: ['ESTUDIANTE'], personaId: est[2].id, rol: `Estudiante (${est[2].nombres} ${est[2].apellidos})` },
  ];
  const usuarios = await api.get(R.usuarios);
  for (const c of cuentas) {
    const ya = usuarios.find((u) => u.correo === c.correo);
    if (ya) await api.delete(`${R.usuarios}/${ya.id}`);
    await api.post(R.usuarios, { correo: c.correo, clave: CLAVE_DEMO, roles: c.roles, personaId: c.personaId });
  }
  paso('¡Listo!');
  return cuentas;
}
