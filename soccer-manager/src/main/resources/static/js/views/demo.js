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
  // Próxima (o anterior) fecha de un día de la semana: 0 = domingo … 6 = sábado
  const proximoDia = (diaSemana, hora, min = 0, semanas = 0) => {
    const d = new Date(); d.setHours(hora, min, 0, 0);
    let suma = (diaSemana - d.getDay() + 7) % 7;
    if (suma === 0 && d <= new Date()) suma = 7;
    d.setDate(d.getDate() + suma + semanas * 7);
    return d;
  };
  const anteriorDia = (diaSemana, hora, min = 0) => {
    const d = new Date(); d.setHours(hora, min, 0, 0);
    let resta = (d.getDay() - diaSemana + 7) % 7;
    if (resta === 0 && d >= new Date()) resta = 7;
    d.setDate(d.getDate() - resta);
    return d;
  };
  const sumarMinutos = (d, m) => new Date(d.getTime() + m * 60000);
  const ubicacion = (nombre, direccion, indicaciones) => ({ nombre, direccion, indicaciones, enlaceMapa: `https://maps.google.com/?q=${encodeURIComponent(direccion)}` });

  // Categorías por año de nacimiento, como las maneja el club (temporada actual, corte 31 de diciembre)
  const existentes = await api.get(R.categorias);
  const categoria = async (nombre, min, max) => {
    const ya = existentes.find((c) => c.nombre === nombre && c.temporada === anio);
    if (ya) return ya;
    paso(`Categoría ${nombre}`);
    return api.post(R.categorias, { nombre, edadMinima: min, edadMaxima: max, temporada: anio, fechaCorte: `${anio}-12-31` });
  };
  const rango = (desde, hasta) => (desde === hasta ? `${desde}` : `${desde}-${hasta}`);
  const cat = async (desde, hasta) => categoria(rango(desde, hasta), anio - hasta, anio - desde);
  const c1921 = await cat(anio - 7, anio - 5);
  const c18 = await cat(anio - 8, anio - 8);
  const c1617 = await cat(anio - 10, anio - 9);
  const c1415 = await cat(anio - 12, anio - 11);
  const c1213 = await cat(anio - 14, anio - 13);
  await cat(anio - 17, anio - 15);

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

  // Grupos: todos entrenan en la cancha del Colegio INEM de Pasto.
  // Lunes 2:30 p. m. y viernes 4:00 p. m. son los horarios que publica el club; los demás son de ejemplo.
  const codigos = new Set((await api.get(R.grupos)).map((g) => g.codigo));
  const inem = ubicacion('Cancha del Colegio INEM', 'Colegio INEM, Pasto, Nariño', 'Ingreso por la portería del colegio');
  const grupo = async (codigo, categoriaG, cupo, horario, entrenadores, sesiones) => {
    const final = codigos.has(codigo) ? `${codigo}-${sufijo}` : codigo;
    paso(`Grupo ${final}`);
    const g = await api.post(R.grupos, { codigo: final, categoriaId: categoriaG.id, cupoMaximo: cupo, horario, ubicacion: inem });
    for (const e of entrenadores) await api.patch(`${R.grupos}/${g.id}/entrenadores/${e.id}`);
    return { ...g, sesiones, entrenador: entrenadores[0] };
  };
  const g1921 = await grupo('2019-2021 A', c1921, 16, 'Sábados 9:00 a. m.', [laura], [[6, 9, 0]]);
  const g18 = await grupo('2018 A', c18, 16, 'Martes y jueves 3:00 p. m.', [laura], [[2, 15, 0], [4, 15, 0]]);
  const g1617 = await grupo('2016-2017 A', c1617, 18, 'Lunes 2:30 p. m. y viernes 4:00 p. m.', [carlos], [[1, 14, 30], [5, 16, 0]]);
  const g1415 = await grupo('2014-2015 A', c1415, 18, 'Lunes 4:00 p. m. y miércoles 4:00 p. m.', [carlos, laura], [[1, 16, 0], [3, 16, 0]]);
  const g1213 = await grupo('2012-2013 A', c1213, 20, 'Miércoles 5:30 p. m. y viernes 5:30 p. m.', [carlos], [[3, 17, 30], [5, 17, 30]]);

  // Estudiantes (la edad debe coincidir con la categoría a la fecha de corte)
  const estudiante = async (nombres, apellidos, edad, acudientes, g, n) => {
    paso(`Estudiante ${nombres} ${apellidos}`);
    const e = await api.post(R.estudiantes, { documento: `10${n}${sufijo}`, nombres, apellidos, fechaNacimiento: `${anio - edad}-0${(n % 8) + 1}-15`, acudienteIds: acudientes.map((a) => a.id) });
    if (g) return api.patch(`${R.estudiantes}/${e.id}/grupo`, { grupoId: g.id });
    return e;
  };
  const est = [
    await estudiante('Tomás', 'Pérez', 8, [ana], g18, 1),
    await estudiante('Valentina', 'Gómez', 8, [jorge], g18, 2),
    await estudiante('Juan', 'Pérez', 10, [ana], g1617, 3),
    await estudiante('Samuel', 'López', 9, [sandra], g1617, 4),
    await estudiante('Mariana', 'Rosero', 10, [diego], g1617, 5),
    await estudiante('Isabella', 'Gómez', 12, [jorge], g1415, 6),
    await estudiante('Mateo', 'López', 11, [sandra], g1415, 7),
    await estudiante('Sofía', 'Rosero', 14, [diego], g1213, 8),
    await estudiante('Martín', 'Pérez', 12, [ana], g1415, 9),
    await estudiante('Lucas', 'Rosero', 6, [diego], g1921, 10),
    await estudiante('Emilio', 'Gómez', 13, [jorge], null, 11),
  ];
  const deGrupo = (g) => est.filter((e) => e.grupoId === g.id);

  // Entrenamientos: la sesión anterior (con asistencia) y las dos próximas semanas de cada grupo
  const estados = ['PRESENTE', 'PRESENTE', 'TARDE', 'PRESENTE', 'AUSENTE'];
  const temas = ['Conducción y pase corto', 'Control orientado y visión de juego', 'Definición y remate a portería', 'Juego reducido 4 contra 4'];
  for (const g of [g1921, g18, g1617, g1415, g1213]) {
    paso(`Entrenamientos del grupo ${g.codigo}`);
    const [dS, hS, mS] = g.sesiones[0];
    const inicioAnterior = anteriorDia(dS, hS, mS);
    const anterior = await api.post(R.entrenamientos, { grupoId: g.id, fechaInicio: fechaHoraLocal(inicioAnterior), fechaFin: fechaHoraLocal(sumarMinutos(inicioAnterior, 90)), instrucciones: temas[0] });
    let t = 1;
    for (let semana = 0; semana < 2; semana++) {
      for (const [d, hh, mm] of g.sesiones) {
        const inicio = proximoDia(d, hh, mm, semana);
        await api.post(R.entrenamientos, { grupoId: g.id, fechaInicio: fechaHoraLocal(inicio), fechaFin: fechaHoraLocal(sumarMinutos(inicio, 90)), instrucciones: `${temas[t++ % temas.length]}. Traer canilleras e hidratación` });
      }
    }
    for (const [i, e] of deGrupo(g).entries())
      await api.post(R.asistencias, { actividadId: anterior.id, estudianteId: e.id, estado: estados[i % estados.length], registradoPor: g.entrenador.id });
  }

  // Campeonatos del club en la temporada
  paso('Torneo de Iniciación Club All Boys (en curso)');
  const iniciacion = await api.post(R.campeonatos, { nombre: `Torneo de Iniciación Club All Boys Pasto ${anio}`, categoriaId: c1617.id, fechaInicio: fechaLocal(dia(-23)), fechaFin: fechaLocal(dia(30)), entrenadorId: carlos.id });
  await api.put(`${R.campeonatos}/${iniciacion.id}`, { ...iniciacion, estado: 'EN_CURSO' });
  const jugado = await api.post(R.partidos, { campeonatoId: iniciacion.id, rival: 'Fútbol Real', fechaInicio: fechaHoraLocal(dia(-2, 9)), fechaFin: fechaHoraLocal(dia(-2, 10, 30)), ubicacion: inem });
  await api.patch(`${R.partidos}/${jugado.id}/resultado`, { resultado: '3-1' });
  const proximo = await api.post(R.partidos, { campeonatoId: iniciacion.id, rival: 'Academia Sport Center', fechaInicio: fechaHoraLocal(proximoDia(6, 10)), fechaFin: fechaHoraLocal(proximoDia(6, 11, 30)), ubicacion: inem });
  paso('Convocatorias al próximo partido');
  const convocados = deGrupo(g1617);
  const convocatorias = [];
  for (const e of convocados) convocatorias.push(await api.post(R.convocatorias, { partidoId: proximo.id, estudianteId: e.id, convocadoPor: carlos.id }));
  if (convocatorias[0]) await api.patch(`${R.convocatorias}/${convocatorias[0].id}/respuesta`, { estado: 'CONFIRMADO' });
  if (convocatorias[1]) await api.patch(`${R.convocatorias}/${convocatorias[1].id}/respuesta`, { estado: 'NO_ASISTIRA', motivo: 'Viaje familiar ese fin de semana' });

  paso('Baby Soccer Cup El Pedregal (campeones)');
  const pedregal = ubicacion('Cancha de El Pedregal', 'El Pedregal, Nariño', 'Escenario del torneo');
  const baby = await api.post(R.campeonatos, { nombre: `Baby Soccer Cup ${anio} · El Pedregal`, categoriaId: c1415.id, fechaInicio: fechaLocal(dia(-30)), fechaFin: fechaLocal(dia(-22)), entrenadorId: carlos.id });
  await api.put(`${R.campeonatos}/${baby.id}`, { ...baby, estado: 'EN_CURSO' });
  const semifinal = await api.post(R.partidos, { campeonatoId: baby.id, rival: 'Escuela Los Andes', fechaInicio: fechaHoraLocal(dia(-23, 10)), fechaFin: fechaHoraLocal(dia(-23, 11, 30)), ubicacion: pedregal });
  await api.patch(`${R.partidos}/${semifinal.id}/resultado`, { resultado: '2-0' });
  const final = await api.post(R.partidos, { campeonatoId: baby.id, rival: 'Club Deportivo Ipiales', fechaInicio: fechaHoraLocal(dia(-22, 15)), fechaFin: fechaHoraLocal(dia(-22, 16, 30)), ubicacion: pedregal });
  await api.patch(`${R.partidos}/${final.id}/resultado`, { resultado: '3-2' });
  await api.put(`${R.campeonatos}/${baby.id}`, { ...baby, estado: 'FINALIZADO' });

  paso('Torneo Rebelión (subcampeones)');
  const rebelion = await api.post(R.campeonatos, { nombre: `Torneo Rebelión ${anio}`, categoriaId: c18.id, fechaInicio: fechaLocal(dia(-40)), fechaFin: fechaLocal(dia(-15)), entrenadorId: laura.id });
  await api.put(`${R.campeonatos}/${rebelion.id}`, { ...rebelion, estado: 'EN_CURSO' });
  const finalRebelion = await api.post(R.partidos, { campeonatoId: rebelion.id, rival: 'Fútbol Real', fechaInicio: fechaHoraLocal(dia(-15, 9)), fechaFin: fechaHoraLocal(dia(-15, 10, 30)), ubicacion: inem });
  await api.patch(`${R.partidos}/${finalRebelion.id}/resultado`, { resultado: '1-2' });
  await api.put(`${R.campeonatos}/${rebelion.id}`, { ...rebelion, estado: 'FINALIZADO' });

  // Evaluaciones
  paso('Evaluaciones del periodo');
  const notas = [[4, 3, 5, 4], [5, 4, 4, 5], [3, 3, 4, 4], [4, 4, 3, 5]];
  for (const [i, e] of [...deGrupo(g1617), ...deGrupo(g1415)].entries()) {
    const [tecnico, tactico, fisico, actitudinal] = notas[i % notas.length];
    const ev = await api.post(R.evaluaciones, { estudianteId: e.id, entrenadorId: carlos.id, periodo: `${anio}-2`, tecnico, tactico, fisico, actitudinal, observaciones: 'Buen control de balón y compromiso en los entrenamientos', meta: 'Mejorar el pase largo y la lectura de juego' });
    if (i < 4) await api.patch(`${R.evaluaciones}/${ev.id}/publicacion`);
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
