// Sesión del usuario y catálogos que varias pantallas necesitan (nombres de estudiantes, grupos, etc.).
import { api, R } from './api.js';

const CLAVE = 'soccermanager.sesion';

export const sesion = {
  actual() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; }
  },
  guardar(datos) { sessionStorage.setItem(CLAVE, JSON.stringify(datos)); },
  cerrar() { sessionStorage.removeItem(CLAVE); },
};

// El rol principal decide qué menú y qué pantalla de inicio ve el usuario.
const PRIORIDAD = ['GERENTE', 'ENTRENADOR', 'ACUDIENTE', 'ESTUDIANTE'];
export function rolPrincipal(usuario) {
  const roles = usuario?.roles || [];
  return PRIORIDAD.find((r) => roles.includes(r)) || 'GERENTE';
}
export const esGerente = (u) => rolPrincipal(u) === 'GERENTE';

// Nombre que se usa en los campos "usuario" / "registradoPor" de la API.
export function nombreUsuario(u) {
  return u?.nombre || u?.correo || 'Gerente';
}

// Busca la persona (estudiante, acudiente o entrenador) asociada a la cuenta.
export async function cargarPersona(usuario) {
  if (!usuario?.personaId) return null;
  const rol = rolPrincipal(usuario);
  const ruta = rol === 'ENTRENADOR' ? R.entrenadores : rol === 'ACUDIENTE' ? R.acudientes : R.estudiantes;
  try { return await api.get(`${ruta}/${usuario.personaId}`); } catch { return null; }
}

// Carga varias listas en paralelo y devuelve también diccionarios por id.
export async function catalogos(...nombres) {
  const listas = await Promise.all(nombres.map((n) => api.get(R[n])));
  const resultado = {};
  nombres.forEach((n, i) => {
    resultado[n] = listas[i] || [];
    resultado[n + 'PorId'] = Object.fromEntries((listas[i] || []).map((x) => [x.id, x]));
  });
  return resultado;
}

export const nombrePersona = (p) => (p ? p.nombreCompleto || `${p.nombres || ''} ${p.apellidos || ''}`.trim() : '—');
