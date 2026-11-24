// Cliente HTTP de la API REST. El frontend se sirve desde el mismo Spring Boot,
// por eso las rutas son relativas (/api/...) y no hace falta configurar CORS.

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.estado = estado;
  }
}

async function pedir(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: { Accept: 'application/json' } };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let respuesta;
  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new ErrorApi('No hay conexión con el servidor. Verifique que la API esté encendida.', 0);
  }
  if (respuesta.status === 204) return null;
  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  if (!respuesta.ok) {
    const mensaje = (datos && datos.error) || `La solicitud falló (código ${respuesta.status})`;
    throw new ErrorApi(mensaje, respuesta.status);
  }
  return datos;
}

const consulta = (params) => {
  const limpios = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return limpios.length ? '?' + new URLSearchParams(limpios).toString() : '';
};

export const api = {
  get: (ruta, params) => pedir('GET', ruta + consulta(params)),
  post: (ruta, cuerpo = {}) => pedir('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => pedir('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => pedir('PATCH', ruta, cuerpo),
  delete: (ruta) => pedir('DELETE', ruta),
};

// Recursos de la API, uno por controlador.
export const R = {
  categorias: '/api/categorias',
  acudientes: '/api/acudientes',
  estudiantes: '/api/estudiantes',
  grupos: '/api/grupos',
  entrenadores: '/api/entrenadores',
  campeonatos: '/api/campeonatos',
  partidos: '/api/partidos',
  convocatorias: '/api/convocatorias',
  entrenamientos: '/api/entrenamientos',
  asistencias: '/api/asistencias',
  evaluaciones: '/api/evaluaciones',
  mensualidades: '/api/mensualidades',
  usuarios: '/api/usuarios',
  notificaciones: '/api/notificaciones',
};
