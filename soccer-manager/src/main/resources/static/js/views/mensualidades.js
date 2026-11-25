// Mensualidades, descuentos, abonos y anulación de pagos (HU-05, HU-11, HU-15).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formato, formularioModal, ejecutar, confirmar, pedirMotivo, aviso, opciones, enumOpciones, selector, acciones, botonIcono, persona, buscador, modal, icono, fechaLocal } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona } from '../sesion.js';

export async function mostrar(contenedor) {
  let filtro = '', filtroEstado = '', filtroPeriodo = '', filtroCategoria = '';
  const kpis = h('div', { class: 'rejilla k4', style: { marginBottom: '16px' } });
  const cuerpo = h('div', {});
  const filtroPeriodos = h('span', {});
  const filtroCategorias = h('span', {});
  let cat;

  async function refrescar() {
    cat = await catalogos('mensualidades', 'estudiantes', 'categorias');
    pintar();
  }

  function kpi(ico, tono, valor, etiqueta) {
    return h('div', { class: 'tarjeta kpi' }, h('div', { class: `ico ${tono}` }, icono(ico)), h('div', {}, h('div', { class: 'valor' }, valor), h('div', { class: 'etiqueta' }, etiqueta)));
  }

  function pintar() {
    const todas = cat.mensualidades;
    const porCobrar = todas.reduce((s, m) => s + m.saldo, 0);
    const recaudado = todas.reduce((s, m) => s + m.totalPagado, 0);
    limpiar(kpis,
      kpi('dinero', 'amarillo', formato.dinero(porCobrar), 'Saldo por cobrar'),
      kpi('check', 'verde', formato.dinero(recaudado), 'Total recaudado'),
      kpi('alerta', 'rojo', todas.filter((m) => m.estado === 'VENCIDO').length, 'Mensualidades vencidas'),
      kpi('reloj', 'azul', todas.filter((m) => m.estado === 'PENDIENTE' || m.estado === 'PARCIAL').length, 'Pendientes o parciales'));
    const periodos = [...new Set(todas.map((m) => m.periodo))].sort().reverse();
    limpiar(filtroPeriodos, selector(periodos.map((p) => ({ valor: p, texto: formato.periodo(p) })), (v) => { filtroPeriodo = v; pintar(); }, { todos: 'Todos los periodos', valor: filtroPeriodo }));
    limpiar(filtroCategorias, selector([...cat.categorias].sort((a, b) => b.nombre.localeCompare(a.nombre)).map((c) => ({ valor: c.id, texto: `Categoría ${c.nombre}` })), (v) => { filtroCategoria = v; pintar(); }, { todos: 'Todas las categorías', valor: filtroCategoria }));
    // Cuántas mensualidades vencidas tiene cada estudiante
    const vencidasPorEstudiante = {};
    todas.filter((m) => m.estado === 'VENCIDO').forEach((m) => { vencidasPorEstudiante[m.estudianteId] = (vencidasPorEstudiante[m.estudianteId] || 0) + 1; });
    const mesesVencidos = (m) => {
      const n = vencidasPorEstudiante[m.estudianteId] || 0;
      return n ? h('span', { class: 'estado mal' }, `${n} ${n === 1 ? 'mes vencido' : 'meses vencidos'}`) : h('span', { class: 'estado ok' }, 'Al día');
    };
    const lista = todas
      .filter((m) => { const e = cat.estudiantesPorId[m.estudianteId]; return !filtro || nombrePersona(e).toLowerCase().includes(filtro) || String(e?.documento || '').includes(filtro); })
      .filter((m) => !filtroCategoria || cat.estudiantesPorId[m.estudianteId]?.categoriaId === filtroCategoria)
      .filter((m) => !filtroEstado || m.estado === filtroEstado)
      .filter((m) => !filtroPeriodo || m.periodo === filtroPeriodo)
      .sort((a, b) => b.periodo.localeCompare(a.periodo) || nombrePersona(cat.estudiantesPorId[a.estudianteId]).localeCompare(nombrePersona(cat.estudiantesPorId[b.estudianteId])));
    limpiar(cuerpo, tabla({
      filas: lista, vacio: 'No hay mensualidades con estos filtros.',
      alClic: verPagos,
      columnas: [
        { titulo: 'Estudiante', clase: 'nowrap', valor: (m) => persona(nombrePersona(cat.estudiantesPorId[m.estudianteId]), formato.periodo(m.periodo)) },
        { titulo: 'Vence', clase: 'nowrap', valor: (m) => formato.fecha(m.fechaVencimiento) },
        { titulo: 'Valor', clase: 'derecha', valor: (m) => h('div', {}, formato.dinero(m.valorAPagar), m.porcentajeDescuento ? h('div', { class: 'mutado pequeno' }, `−${m.porcentajeDescuento}% de ${formato.dinero(m.valor)}`) : null) },
        { titulo: 'Pagado', clase: 'derecha', valor: (m) => formato.dinero(m.totalPagado) },
        { titulo: 'Saldo', clase: 'derecha', valor: (m) => h('b', {}, formato.dinero(m.saldo)) },
        { titulo: 'Estado', valor: (m) => estado(m.estado) },
        { titulo: 'Meses vencidos', clase: 'nowrap', valor: mesesVencidos },
        { titulo: '', clase: 'derecha', valor: (m) => acciones(
          m.saldo > 0 ? h('button', { class: 'btn chico primario', onclick: () => pagar(m) }, 'Registrar pago') : null,
          !m.pagos?.some((p) => !p.anulado) ? botonIcono('borrar', 'Eliminar', () => eliminar(m), 'peligro') : null) },
      ],
    }));
  }

  function pagar(m) {
    formularioModal({
      titulo: `Pago de ${nombrePersona(cat.estudiantesPorId[m.estudianteId])}`, boton: 'Registrar pago',
      nota: `${formato.periodo(m.periodo)} · saldo pendiente ${formato.dinero(m.saldo)}. Se permiten abonos parciales.`,
      campos: [
        { nombre: 'valor', etiqueta: 'Valor', tipo: 'numero', requerido: true, min: 1 },
        { nombre: 'metodo', etiqueta: 'Método', tipo: 'select', requerido: true, opciones: enumOpciones(['EFECTIVO', 'TRANSFERENCIA', 'PASARELA']) },
        { nombre: 'comprobante', etiqueta: 'Comprobante', ayuda: 'Obligatorio para transferencias.', ancho: true },
      ],
      valores: { valor: m.saldo, metodo: 'EFECTIVO' },
      alGuardar: async (d) => { await api.post(`${R.mensualidades}/${m.id}/pagos`, d); aviso('Pago registrado. Se notificó al acudiente.'); await refrescar(); },
    });
  }

  function verPagos(m) {
    const est = cat.estudiantesPorId[m.estudianteId];
    const ventana = modal({
      titulo: `${nombrePersona(est)} · ${formato.periodo(m.periodo)}`, grande: true,
      cuerpo: h('div', {},
        h('div', { class: 'notas', style: { marginBottom: '16px' } },
          h('div', { class: 'nota' }, h('b', {}, formato.dinero(m.valorAPagar)), h('span', {}, 'A pagar')),
          h('div', { class: 'nota' }, h('b', {}, formato.dinero(m.totalPagado)), h('span', {}, 'Pagado')),
          h('div', { class: 'nota' }, h('b', {}, formato.dinero(m.saldo)), h('span', {}, 'Saldo')),
          h('div', { class: 'nota' }, h('div', { style: { marginTop: '6px' } }, estado(m.estado)), h('span', {}, 'Estado'))),
        tabla({
          filas: (m.pagos || []).map((p, i) => ({ ...p, indice: i })), vacio: 'Todavía no hay pagos.',
          columnas: [
            { titulo: 'Fecha', valor: (p) => formato.fechaHora(p.fecha) },
            { titulo: 'Método', valor: (p) => formato.enum(p.metodo) },
            { titulo: 'Comprobante', valor: (p) => formato.texto(p.comprobante) },
            { titulo: 'Valor', clase: 'derecha', valor: (p) => p.anulado ? h('s', { class: 'mutado' }, formato.dinero(p.valor)) : h('b', {}, formato.dinero(p.valor)) },
            { titulo: '', clase: 'derecha', valor: (p) => p.anulado
              ? h('span', { class: 'estado mal', title: p.motivoAnulacion }, 'Anulado')
              : h('button', { class: 'btn chico peligro', onclick: async () => {
                const motivo = await pedirMotivo('Anular pago', { boton: 'Anular', nota: `Pago de ${formato.dinero(p.valor)} del ${formato.fecha(p.fecha)}.` });
                if (motivo) { ventana.cerrar(); ejecutar(() => api.patch(`${R.mensualidades}/${m.id}/pagos/${p.indice}/anulacion`, { motivo }), 'Pago anulado', refrescar); }
              } }, 'Anular') },
          ],
        })),
      pie: m.saldo > 0 ? [h('button', { class: 'btn primario', onclick: () => { ventana.cerrar(); pagar(m); } }, icono('dinero'), 'Registrar pago')] : null,
    });
  }

  async function generar() {
    const activos = cat.estudiantes.filter((e) => e.estado === 'ACTIVO');
    if (!activos.length) { aviso('No hay estudiantes activos', 'error'); return; }
    const ahora = new Date();
    const venc = new Date(ahora.getFullYear(), ahora.getMonth(), 10);
    if (venc < ahora) venc.setMonth(venc.getMonth() + 1);
    formularioModal({
      titulo: 'Generar mensualidades', boton: 'Generar', grande: true,
      nota: 'Deje "Estudiantes" vacío para generar la mensualidad a todos los estudiantes activos. Las que ya existan para el periodo se omiten.',
      campos: [
        { nombre: 'periodo', etiqueta: 'Periodo (año-mes)', requerido: true, placeholder: '2026-12' },
        { nombre: 'fechaVencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha', requerido: true },
        { nombre: 'valor', etiqueta: 'Valor mensual', tipo: 'numero', requerido: true, min: 1 },
        { nombre: 'porcentajeDescuento', etiqueta: 'Descuento (%)', tipo: 'numero', min: 0, max: 100, ayuda: 'Por ejemplo, 10 para hermanos o becas.' },
        { nombre: 'estudianteIds', etiqueta: 'Estudiantes', tipo: 'multiple', ancho: true, opciones: opciones(activos, (e) => nombrePersona(e)) },
      ],
      valores: { periodo: fechaLocal(ahora).slice(0, 7), fechaVencimiento: fechaLocal(venc), valor: 100000, porcentajeDescuento: 0 },
      alGuardar: async (d) => {
        const destino = d.estudianteIds.length ? d.estudianteIds : activos.map((e) => e.id);
        let creadas = 0, omitidas = 0;
        for (const estudianteId of destino) {
          try {
            await api.post(R.mensualidades, { estudianteId, periodo: d.periodo, valor: d.valor, porcentajeDescuento: d.porcentajeDescuento || 0, fechaVencimiento: d.fechaVencimiento });
            creadas++;
          } catch (e) {
            if (e.estado === 409) omitidas++; else throw e;
          }
        }
        aviso(`${creadas} mensualidad(es) generada(s)${omitidas ? `, ${omitidas} ya existían` : ''}`);
        await refrescar();
      },
    });
  }

  async function eliminar(m) {
    if (await confirmar(`¿Eliminar la mensualidad de ${formato.periodo(m.periodo)}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.mensualidades}/${m.id}`), 'Mensualidad eliminada', refrescar);
  }

  await refrescar();
  limpiar(contenedor,
    encabezado('Mensualidades', 'Cobros por periodo con descuentos, abonos parciales y control de saldo.',
      boton('Generar mensualidades', generar, { clase: 'primario', icono: 'mas' })),
    kpis,
    tarjeta(null, h('div', {},
      h('div', { class: 'filtros' },
        buscador('Buscar estudiante o documento', (t) => { filtro = t; pintar(); }),
        selector(enumOpciones(['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO']), (v) => { filtroEstado = v; pintar(); }, { todos: 'Todos los estados' }),
        filtroCategorias,
        filtroPeriodos),
      cuerpo)));
}
