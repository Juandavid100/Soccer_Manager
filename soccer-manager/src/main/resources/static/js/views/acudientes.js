// Acudientes: responsables de los estudiantes menores de edad.
import { h, limpiar, encabezado, boton, tarjeta, tabla, acciones, botonIcono, formularioModal, confirmar, ejecutar, buscador, persona, modal, estado } from '../ui.js';
import { api, R } from '../api.js';
import { nombrePersona } from '../sesion.js';

export const CAMPOS_PERSONA = [
  { nombre: 'nombres', etiqueta: 'Nombres', requerido: true },
  { nombre: 'apellidos', etiqueta: 'Apellidos', requerido: true },
  { nombre: 'documento', etiqueta: 'Documento', requerido: true },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'telefono' },
  { nombre: 'correo', etiqueta: 'Correo', tipo: 'correo', ancho: true },
];

export async function mostrar(contenedor, { navegar }) {
  let filtro = '';
  const cuerpo = h('div', {});

  async function refrescar() {
    const [acudientes, estudiantes] = await Promise.all([api.get(R.acudientes), api.get(R.estudiantes)]);
    const lista = acudientes
      .filter((a) => !filtro || `${nombrePersona(a)} ${a.documento} ${a.correo || ''}`.toLowerCase().includes(filtro))
      .sort((a, b) => nombrePersona(a).localeCompare(nombrePersona(b)));
    limpiar(cuerpo, tabla({
      filas: lista,
      vacio: 'No hay acudientes registrados.',
      columnas: [
        { titulo: 'Acudiente', valor: (a) => persona(nombrePersona(a), a.parentesco) },
        { titulo: 'Documento', valor: (a) => a.documento },
        { titulo: 'Contacto', valor: (a) => h('div', {}, h('div', {}, a.telefono || '—'), h('div', { class: 'mutado pequeno' }, a.correo || '')) },
        { titulo: 'Estudiantes a cargo', valor: (a) => estudiantes.filter((e) => (e.acudienteIds || []).includes(a.id)).map((e) => h('span', { class: 'chip' }, e.nombres)) },
        { titulo: '', clase: 'derecha', valor: (a) => acciones(
          botonIcono('ojo', 'Ver estudiantes', () => verEstudiantes(a)),
          botonIcono('editar', 'Editar', () => editar(a)),
          botonIcono('borrar', 'Eliminar', () => eliminar(a), 'peligro')) },
      ],
    }));
  }

  function editar(a) {
    formularioModal({
      titulo: a ? 'Editar acudiente' : 'Nuevo acudiente',
      campos: [...CAMPOS_PERSONA, { nombre: 'parentesco', etiqueta: 'Parentesco', placeholder: 'Madre, padre, tío…', ancho: true }],
      valores: a || {},
      alGuardar: async (d) => {
        if (a) await api.put(`${R.acudientes}/${a.id}`, d); else await api.post(R.acudientes, d);
        await ejecutar(async () => {}, a ? 'Acudiente actualizado' : 'Acudiente registrado', refrescar);
      },
    });
  }

  async function verEstudiantes(a) {
    const lista = await api.get(`${R.acudientes}/${a.id}/estudiantes`);
    const m = modal({
      titulo: `Estudiantes de ${nombrePersona(a)}`,
      cuerpo: tabla({
        filas: lista, vacio: 'No tiene estudiantes a cargo.',
        alClic: (e) => { m.cerrar(); navegar(`estudiantes/${e.id}`); },
        columnas: [
          { titulo: 'Estudiante', valor: (e) => persona(nombrePersona(e), e.documento) },
          { titulo: 'Estado', valor: (e) => estado(e.estado) },
        ],
      }),
    });
  }

  async function eliminar(a) {
    if (await confirmar(`¿Eliminar a ${nombrePersona(a)}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.acudientes}/${a.id}`), 'Acudiente eliminado', refrescar);
  }

  limpiar(contenedor,
    encabezado('Acudientes', 'Madres, padres y responsables que reciben las notificaciones y pagan las mensualidades.',
      boton('Nuevo acudiente', () => editar(null), { clase: 'primario', icono: 'mas' })),
    tarjeta(null, h('div', {}, h('div', { class: 'filtros' }, buscador('Buscar por nombre, documento o correo', (t) => { filtro = t; refrescar(); })), cuerpo)));
  await refrescar();
}
