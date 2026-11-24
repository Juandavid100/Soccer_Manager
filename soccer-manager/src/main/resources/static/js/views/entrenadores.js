// Entrenadores y sus permisos (HU-04: autorizar convocatorias y cambios de actividades).
import { h, limpiar, encabezado, boton, tarjeta, tabla, acciones, botonIcono, formularioModal, confirmar, ejecutar, buscador, persona } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona } from '../sesion.js';
import { CAMPOS_PERSONA } from './acudientes.js';

const permiso = (activo, texto) => h('span', { class: `estado ${activo ? 'ok' : 'neutro'}` }, texto);

export async function mostrar(contenedor) {
  let filtro = '';
  const cuerpo = h('div', {});

  async function refrescar() {
    const { entrenadores, grupos } = await catalogos('entrenadores', 'grupos');
    const lista = entrenadores
      .filter((e) => !filtro || `${nombrePersona(e)} ${e.documento}`.toLowerCase().includes(filtro))
      .sort((a, b) => nombrePersona(a).localeCompare(nombrePersona(b)));
    limpiar(cuerpo, tabla({
      filas: lista,
      vacio: 'No hay entrenadores registrados.',
      columnas: [
        { titulo: 'Entrenador', valor: (e) => persona(nombrePersona(e), e.documento) },
        { titulo: 'Contacto', valor: (e) => h('div', {}, h('div', {}, e.telefono || '—'), h('div', { class: 'mutado pequeno' }, e.correo || '')) },
        { titulo: 'Grupos', valor: (e) => grupos.filter((g) => (g.entrenadorIds || []).includes(e.id)).map((g) => h('span', { class: 'chip' }, g.codigo)) },
        { titulo: 'Permisos', valor: (e) => h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          permiso(e.puedeConvocar, 'Convocar'), permiso(e.puedeModificarActividades, 'Modificar actividades')) },
        { titulo: '', clase: 'derecha', valor: (e) => acciones(
          h('button', { class: 'btn chico', onclick: () => permisos(e) }, 'Permisos'),
          botonIcono('editar', 'Editar', () => editar(e)),
          botonIcono('borrar', 'Eliminar', () => eliminar(e), 'peligro')) },
      ],
    }));
  }

  function editar(e) {
    formularioModal({
      titulo: e ? 'Editar entrenador' : 'Nuevo entrenador',
      campos: CAMPOS_PERSONA,
      valores: e || {},
      alGuardar: async (d) => {
        if (e) await api.put(`${R.entrenadores}/${e.id}`, { ...e, ...d }); else await api.post(R.entrenadores, d);
        await ejecutar(async () => {}, e ? 'Entrenador actualizado' : 'Entrenador registrado', refrescar);
      },
    });
  }

  function permisos(e) {
    formularioModal({
      titulo: `Permisos de ${nombrePersona(e)}`,
      campos: [
        { nombre: 'puedeConvocar', etiqueta: 'Puede convocar estudiantes a partidos', tipo: 'casilla', ancho: true },
        { nombre: 'puedeModificarActividades', etiqueta: 'Puede reprogramar o cancelar actividades', tipo: 'casilla', ancho: true },
      ],
      valores: e,
      alGuardar: async (d) => {
        await api.patch(`${R.entrenadores}/${e.id}/permisos`, d);
        await ejecutar(async () => {}, 'Permisos actualizados', refrescar);
      },
    });
  }

  async function eliminar(e) {
    if (await confirmar(`¿Eliminar a ${nombrePersona(e)}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.entrenadores}/${e.id}`), 'Entrenador eliminado', refrescar);
  }

  limpiar(contenedor,
    encabezado('Entrenadores', 'Cuerpo técnico, grupos a cargo y permisos que les otorga la gerencia.',
      boton('Nuevo entrenador', () => editar(null), { clase: 'primario', icono: 'mas' })),
    tarjeta(null, h('div', {}, h('div', { class: 'filtros' }, buscador('Buscar por nombre o documento', (t) => { filtro = t; refrescar(); })), cuerpo)));
  await refrescar();
}
