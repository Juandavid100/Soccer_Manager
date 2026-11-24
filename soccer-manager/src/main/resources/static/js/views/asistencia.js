// Registro y corrección de asistencia de una actividad (entrenamiento o partido) — HU-08 y HU-16.
import { h, limpiar, tabla, estado, persona, formularioModal, aviso, enumOpciones, icono } from '../ui.js';
import { api, R } from '../api.js';
import { nombrePersona, nombreUsuario } from '../sesion.js';

const ESTADOS = ['PRESENTE', 'AUSENTE', 'TARDE', 'JUSTIFICADO'];

export async function panelAsistencia({ actividad, estudiantes, usuario, registradoPor }) {
  const contenedor = h('div', {});
  const yaEmpezo = new Date(actividad.fechaInicio) <= new Date();
  const cancelada = actividad.estado === 'CANCELADO';

  async function pintar() {
    const registros = await api.get(R.asistencias, { actividadId: actividad.id });
    const porEstudiante = Object.fromEntries(registros.map((r) => [r.estudianteId, r]));
    const pendientes = estudiantes.filter((e) => !porEstudiante[e.id]);
    const selecciones = {};

    const selectorEstado = (e) => {
      const s = h('select', { style: { width: 'auto' }, 'aria-label': `Asistencia de ${nombrePersona(e)}` },
        ESTADOS.map((v) => h('option', { value: v }, v.charAt(0) + v.slice(1).toLowerCase())));
      selecciones[e.id] = s;
      return s;
    };

    const guardarTodo = async () => {
      let ok = 0; const errores = [];
      for (const e of pendientes) {
        try {
          await api.post(R.asistencias, { actividadId: actividad.id, estudianteId: e.id, estado: selecciones[e.id].value, registradoPor });
          ok++;
        } catch (err) { errores.push(`${nombrePersona(e)}: ${err.message}`); }
      }
      if (ok) aviso(`Asistencia registrada para ${ok} estudiante(s)`);
      if (errores.length) aviso(errores.join(' · '), 'error');
      await pintar();
    };

    const corregir = (e, r) => formularioModal({
      titulo: `Corregir asistencia de ${nombrePersona(e)}`, boton: 'Guardar corrección',
      nota: `Estado actual: ${r.estado.toLowerCase()}. La corrección queda registrada con su motivo.`,
      campos: [
        { nombre: 'estado', etiqueta: 'Nuevo estado', tipo: 'select', requerido: true, opciones: enumOpciones(ESTADOS.filter((x) => x !== r.estado)) },
        { nombre: 'motivo', etiqueta: 'Motivo', tipo: 'area', requerido: true, ancho: true },
      ],
      alGuardar: async (d) => {
        await api.patch(`${R.asistencias}/${r.id}/correccion`, { ...d, usuario: nombreUsuario(usuario) });
        aviso('Asistencia corregida');
        await pintar();
      },
    });

    const presentes = registros.filter((r) => r.estado === 'PRESENTE' || r.estado === 'TARDE').length;
    let aviso1 = null;
    if (cancelada) aviso1 = h('div', { class: 'alerta error' }, icono('alerta'), h('div', {}, 'La actividad está cancelada: no se registra asistencia.'));
    else if (!yaEmpezo) aviso1 = h('div', { class: 'alerta info' }, icono('info'), h('div', {}, 'La asistencia se puede registrar cuando la actividad haya empezado.'));

    limpiar(contenedor,
      aviso1 ? h('div', { style: { padding: '14px 20px 0' } }, aviso1) : null,
      h('div', { class: 'filtros', style: { justifyContent: 'space-between' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
          h('span', { class: 'estado ok' }, `${presentes} asistieron`),
          h('span', { class: 'estado neutro' }, `${registros.length} de ${estudiantes.length} registrados`)),
        pendientes.length && yaEmpezo && !cancelada ? h('button', { class: 'btn primario', onclick: guardarTodo }, icono('check'), `Guardar asistencia (${pendientes.length})`) : null),
      tabla({
        filas: estudiantes,
        vacio: 'No hay estudiantes para esta actividad.',
        columnas: [
          { titulo: 'Estudiante', valor: (e) => persona(nombrePersona(e), `Doc. ${e.documento}`) },
          { titulo: 'Asistencia', valor: (e) => {
            const r = porEstudiante[e.id];
            if (r) return h('div', {}, estado(r.estado), r.correcciones?.length ? h('div', { class: 'mutado pequeno' }, `${r.correcciones.length} corrección(es)`) : null);
            return yaEmpezo && !cancelada ? selectorEstado(e) : h('span', { class: 'mutado' }, 'Sin registrar');
          } },
          { titulo: '', clase: 'derecha', valor: (e) => porEstudiante[e.id] && !cancelada ? h('button', { class: 'btn chico', onclick: () => corregir(e, porEstudiante[e.id]) }, 'Corregir') : null },
        ],
      }));
  }

  await pintar();
  return contenedor;
}
