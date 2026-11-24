// Evaluaciones del progreso deportivo (HU-12) y su publicación a la familia (HU-20).
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formularioModal, ejecutar, confirmar, aviso, opciones, selector, acciones, botonIcono, persona, buscador } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona, esGerente } from '../sesion.js';

const NOTAS = [['tecnico', 'Técnico'], ['tactico', 'Táctico'], ['fisico', 'Físico'], ['actitudinal', 'Actitudinal']];

export async function mostrar(contenedor, ctx) {
  const gerente = esGerente(ctx.usuario);
  let filtro = '', filtroVisible = '';
  const cuerpo = h('div', {});
  let cat;

  async function refrescar() {
    cat = await catalogos('evaluaciones', 'estudiantes', 'entrenadores', 'grupos');
    pintar();
  }
  function misEstudiantes() {
    if (gerente) return cat.estudiantes;
    const grupos = new Set(cat.grupos.filter((g) => (g.entrenadorIds || []).includes(ctx.usuario.personaId)).map((g) => g.id));
    return cat.estudiantes.filter((e) => grupos.has(e.grupoId));
  }
  function pintar() {
    const ids = new Set(misEstudiantes().map((e) => e.id));
    const lista = cat.evaluaciones
      .filter((e) => gerente || ids.has(e.estudianteId) || e.entrenadorId === ctx.usuario.personaId)
      .filter((e) => !filtro || nombrePersona(cat.estudiantesPorId[e.estudianteId]).toLowerCase().includes(filtro) || e.periodo.includes(filtro))
      .filter((e) => filtroVisible === '' || String(e.visibleFamilia) === filtroVisible)
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
    limpiar(cuerpo, tabla({
      filas: lista, vacio: 'No hay evaluaciones registradas.',
      columnas: [
        { titulo: 'Estudiante', valor: (e) => persona(nombrePersona(cat.estudiantesPorId[e.estudianteId]), `Periodo ${e.periodo}`) },
        ...NOTAS.map(([k, t]) => ({ titulo: t, clase: 'derecha', valor: (e) => h('b', {}, e[k]) })),
        { titulo: 'Promedio', clase: 'derecha', valor: (e) => h('span', { class: 'chip' }, Number(e.promedio).toFixed(1)) },
        { titulo: 'Entrenador', valor: (e) => nombrePersona(cat.entrenadoresPorId[e.entrenadorId]) },
        { titulo: 'Familia', valor: (e) => h('span', { class: `estado ${e.visibleFamilia ? 'ok' : 'neutro'}` }, e.visibleFamilia ? 'Publicada' : 'Borrador') },
        { titulo: '', clase: 'derecha', valor: (e) => acciones(
          !e.visibleFamilia ? h('button', { class: 'btn chico primario', onclick: () => publicar(e) }, 'Publicar') : null,
          botonIcono('editar', 'Editar', () => editar(e)),
          gerente ? botonIcono('borrar', 'Eliminar', () => eliminar(e), 'peligro') : null) },
      ],
    }));
  }

  function campos(edicion) {
    return [
      { nombre: 'estudianteId', etiqueta: 'Estudiante', tipo: 'select', requerido: true, soloLectura: edicion, opciones: opciones(misEstudiantes().filter((e) => e.estado === 'ACTIVO' || edicion), (e) => nombrePersona(e)) },
      gerente ? { nombre: 'entrenadorId', etiqueta: 'Entrenador', tipo: 'select', requerido: true, soloLectura: edicion, opciones: opciones(cat.entrenadores, (e) => nombrePersona(e)) } : null,
      { nombre: 'periodo', etiqueta: 'Periodo', requerido: true, placeholder: '2026-2', soloLectura: edicion },
      { tipo: 'subtitulo', nombre: '_', etiqueta: 'Calificaciones de 1 a 5' },
      ...NOTAS.map(([k, t]) => ({ nombre: k, etiqueta: t, tipo: 'numero', requerido: true, min: 1, max: 5 })),
      { nombre: 'observaciones', etiqueta: 'Observaciones', tipo: 'area', ancho: true },
      { nombre: 'meta', etiqueta: 'Meta para el siguiente periodo', ancho: true },
    ].filter(Boolean);
  }

  function editar(e) {
    const anio = new Date().getFullYear();
    formularioModal({
      titulo: e ? 'Editar evaluación' : 'Nueva evaluación', grande: true, campos: campos(!!e),
      valores: e || { periodo: `${anio}-${new Date().getMonth() < 6 ? 1 : 2}`, tecnico: 3, tactico: 3, fisico: 3, actitudinal: 3 },
      alGuardar: async (d) => {
        if (e) await api.put(`${R.evaluaciones}/${e.id}`, { ...e, ...d });
        else await api.post(R.evaluaciones, { ...d, entrenadorId: gerente ? d.entrenadorId : ctx.usuario.personaId });
        aviso(e ? 'Evaluación actualizada' : 'Evaluación registrada como borrador');
        await refrescar();
      },
    });
  }
  async function publicar(e) {
    if (await confirmar('La familia podrá ver esta evaluación en su portal. ¿Publicar?', { boton: 'Publicar' }))
      ejecutar(() => api.patch(`${R.evaluaciones}/${e.id}/publicacion`), 'Evaluación publicada para la familia', refrescar);
  }
  async function eliminar(e) {
    if (await confirmar('¿Eliminar esta evaluación?', { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.evaluaciones}/${e.id}`), 'Evaluación eliminada', refrescar);
  }

  await refrescar();
  limpiar(contenedor,
    encabezado('Evaluaciones', 'Califique el progreso técnico, táctico, físico y actitudinal, y publíquelo a la familia.',
      boton('Nueva evaluación', () => editar(null), { clase: 'primario', icono: 'mas' })),
    tarjeta(null, h('div', {},
      h('div', { class: 'filtros' },
        buscador('Buscar por estudiante o periodo', (t) => { filtro = t; pintar(); }),
        selector([{ valor: 'true', texto: 'Publicadas' }, { valor: 'false', texto: 'Borradores' }], (v) => { filtroVisible = v; pintar(); }, { todos: 'Todas' })),
      cuerpo)));
}
