// Cuentas de acceso, roles y suspensión.
import { h, limpiar, encabezado, boton, tarjeta, tabla, estado, formularioModal, ejecutar, confirmar, aviso, enumOpciones, acciones, botonIcono, persona, buscador } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos, nombrePersona } from '../sesion.js';

const ROLES = ['GERENTE', 'ENTRENADOR', 'ACUDIENTE', 'ESTUDIANTE'];

export async function mostrar(contenedor, ctx) {
  let filtro = '';
  const cuerpo = h('div', {});
  let cat;

  async function refrescar() {
    cat = await catalogos('usuarios', 'estudiantes', 'acudientes', 'entrenadores');
    pintar();
  }
  const personaDe = (id) => cat.estudiantesPorId[id] || cat.acudientesPorId[id] || cat.entrenadoresPorId[id];

  function pintar() {
    const lista = cat.usuarios
      .filter((u) => !filtro || `${u.correo} ${nombrePersona(personaDe(u.personaId))}`.toLowerCase().includes(filtro))
      .sort((a, b) => a.correo.localeCompare(b.correo));
    limpiar(cuerpo, tabla({
      filas: lista, vacio: 'No hay usuarios.',
      columnas: [
        { titulo: 'Cuenta', valor: (u) => persona(u.correo, u.personaId ? nombrePersona(personaDe(u.personaId)) : 'Sin persona asociada') },
        { titulo: 'Roles', valor: (u) => (u.roles || []).map((r) => h('span', { class: 'chip' }, r.charAt(0) + r.slice(1).toLowerCase())) },
        { titulo: 'Estado', valor: (u) => estado(u.estado) },
        { titulo: '', clase: 'derecha', valor: (u) => acciones(
          h('button', { class: 'btn chico', onclick: () => roles(u) }, 'Roles'),
          u.id !== ctx.usuario.id ? h('button', { class: `btn chico ${u.estado === 'ACTIVA' ? 'peligro' : ''}`, onclick: () => cambiarEstado(u) }, u.estado === 'ACTIVA' ? 'Suspender' : 'Activar') : null,
          u.id !== ctx.usuario.id ? botonIcono('borrar', 'Eliminar', () => eliminar(u), 'peligro') : null) },
      ],
    }));
  }

  function personasOpciones() {
    return [
      ...cat.acudientes.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} · acudiente` })),
      ...cat.entrenadores.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} · entrenador` })),
      ...cat.estudiantes.map((p) => ({ valor: p.id, texto: `${nombrePersona(p)} · estudiante` })),
    ].sort((a, b) => a.texto.localeCompare(b.texto));
  }

  function nuevo() {
    formularioModal({
      titulo: 'Nueva cuenta', boton: 'Crear cuenta',
      nota: 'Las cuentas de entrenador, acudiente o estudiante deben asociarse a la persona registrada.',
      campos: [
        { nombre: 'correo', etiqueta: 'Correo', tipo: 'correo', requerido: true, ancho: true },
        { nombre: 'clave', etiqueta: 'Contraseña', tipo: 'clave', requerido: true, ayuda: 'Mínimo 8 caracteres.' },
        { nombre: 'roles', etiqueta: 'Roles', tipo: 'multiple', requerido: true, opciones: enumOpciones(ROLES) },
        { nombre: 'personaId', etiqueta: 'Persona', tipo: 'select', ancho: true, opciones: personasOpciones(), placeholder: 'Ninguna (solo para gerentes)' },
      ],
      alGuardar: async (d) => { await api.post(R.usuarios, d); aviso('Cuenta creada'); await refrescar(); },
    });
  }
  function roles(u) {
    formularioModal({
      titulo: `Roles de ${u.correo}`,
      campos: [{ nombre: 'roles', etiqueta: 'Roles', tipo: 'multiple', requerido: true, ancho: true, opciones: enumOpciones(ROLES) }],
      valores: u,
      alGuardar: async (d) => { await api.patch(`${R.usuarios}/${u.id}/roles`, d); aviso('Roles actualizados'); await refrescar(); },
    });
  }
  async function cambiarEstado(u) {
    const nuevoEstado = u.estado === 'ACTIVA' ? 'SUSPENDIDA' : 'ACTIVA';
    if (await confirmar(nuevoEstado === 'SUSPENDIDA' ? `${u.correo} no podrá iniciar sesión. ¿Suspender?` : `¿Reactivar la cuenta ${u.correo}?`, { boton: nuevoEstado === 'SUSPENDIDA' ? 'Suspender' : 'Activar', peligro: nuevoEstado === 'SUSPENDIDA' }))
      ejecutar(() => api.patch(`${R.usuarios}/${u.id}/estado`, { estado: nuevoEstado }), 'Estado de la cuenta actualizado', refrescar);
  }
  async function eliminar(u) {
    if (await confirmar(`¿Eliminar la cuenta ${u.correo}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.usuarios}/${u.id}`), 'Cuenta eliminada', refrescar);
  }

  await refrescar();
  limpiar(contenedor,
    encabezado('Usuarios', 'Cuentas de acceso a la plataforma y sus roles.', boton('Nueva cuenta', nuevo, { clase: 'primario', icono: 'mas' })),
    tarjeta(null, h('div', {}, h('div', { class: 'filtros' }, buscador('Buscar por correo o nombre', (t) => { filtro = t; pintar(); })), cuerpo)));
}
