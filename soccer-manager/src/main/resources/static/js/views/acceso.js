// Pantalla de inicio de sesión. Si la base no tiene usuarios, permite crear la primera cuenta de gerente.
import { h, icono, limpiar } from '../ui.js';
import { api, R } from '../api.js';

export async function mostrarAcceso(raiz, alEntrar) {
  const caja = h('div', { class: 'caja' }, h('p', { class: 'mutado' }, 'Conectando con el servidor…'));
  limpiar(raiz, h('div', { class: 'acceso' },
    h('section', { class: 'portada' },
      h('div', { class: 'marca', style: { padding: 0 } },
        h('div', { class: 'logo' }, icono('balon')),
        h('div', {}, h('b', {}, 'Soccer Manager'), h('small', {}, 'Escuela de fútbol'))),
      h('div', {},
        h('h1', {}, 'Toda la escuela, en una sola cancha.'),
        h('p', {}, 'Matrículas, grupos, entrenamientos, partidos, evaluaciones y mensualidades organizados para gerentes, entrenadores y familias.'),
        h('div', { class: 'puntos' },
          h('div', {}, icono('check'), 'Matrícula con acudientes y control de cupos por grupo'),
          h('div', {}, icono('check'), 'Asistencia, convocatorias y evaluaciones del progreso'),
          h('div', {}, icono('check'), 'Mensualidades con descuentos, abonos y saldo al día'))),
      h('small', { style: { opacity: .7, position: 'relative', zIndex: 1 } }, 'Diseño de Software · Universidad Cooperativa de Colombia, Pasto')),
    h('section', { class: 'formulario-acceso' }, caja)));

  let usuarios = [];
  try {
    usuarios = await api.get(R.usuarios);
  } catch (e) {
    limpiar(caja, h('h2', {}, 'Sin conexión'), h('div', { class: 'alerta error separar' }, icono('alerta'), h('div', {}, e.message)),
      h('button', { class: 'btn primario separar', onclick: () => location.reload() }, 'Reintentar'));
    return;
  }
  if (!usuarios.length) primeraCuenta(caja, alEntrar);
  else formularioIngreso(caja, alEntrar);
}

function campo(etiqueta, atributos) {
  const input = h('input', atributos);
  return { input, nodo: h('div', { class: 'campo' }, h('label', { for: atributos.id }, etiqueta), input) };
}

function formularioIngreso(caja, alEntrar) {
  const correo = campo('Correo', { id: 'correo', type: 'email', autocomplete: 'username', required: true, placeholder: 'nombre@escuela.com' });
  const clave = campo('Contraseña', { id: 'clave', type: 'password', autocomplete: 'current-password', required: true });
  const error = h('div', { class: 'alerta error oculto', role: 'alert' });
  const boton = h('button', { class: 'btn primario', type: 'submit', style: { padding: '11px' } }, 'Ingresar');
  const form = h('form', {}, error, correo.nodo, clave.nodo, boton);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.add('oculto');
    boton.disabled = true;
    try {
      const usuario = await api.post(`${R.usuarios}/login`, { correo: correo.input.value.trim(), clave: clave.input.value });
      alEntrar(usuario);
    } catch (err) {
      limpiar(error, icono('alerta'), h('div', {}, err.message));
      error.classList.remove('oculto');
    } finally {
      boton.disabled = false;
    }
  });
  limpiar(caja, h('h2', {}, 'Iniciar sesión'), h('p', { class: 'mutado', style: { margin: '6px 0 0' } }, 'Ingrese con la cuenta que le entregó la escuela.'), form);
  correo.input.focus();
}

function primeraCuenta(caja, alEntrar) {
  const correo = campo('Correo del gerente', { id: 'correo', type: 'email', required: true, placeholder: 'gerente@escuela.com' });
  const clave = campo('Contraseña (mínimo 8 caracteres)', { id: 'clave', type: 'password', autocomplete: 'new-password', required: true });
  const repetir = campo('Repetir contraseña', { id: 'repetir', type: 'password', autocomplete: 'new-password', required: true });
  const error = h('div', { class: 'alerta error oculto', role: 'alert' });
  const boton = h('button', { class: 'btn primario', type: 'submit', style: { padding: '11px' } }, 'Crear cuenta y entrar');
  const form = h('form', {}, error, correo.nodo, clave.nodo, repetir.nodo, boton);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.add('oculto');
    if (clave.input.value !== repetir.input.value) {
      limpiar(error, icono('alerta'), h('div', {}, 'Las contraseñas no coinciden'));
      error.classList.remove('oculto');
      return;
    }
    boton.disabled = true;
    try {
      const datos = { correo: correo.input.value.trim(), clave: clave.input.value, roles: ['GERENTE'] };
      await api.post(R.usuarios, datos);
      alEntrar(await api.post(`${R.usuarios}/login`, { correo: datos.correo, clave: datos.clave }));
    } catch (err) {
      limpiar(error, icono('alerta'), h('div', {}, err.message));
      error.classList.remove('oculto');
    } finally {
      boton.disabled = false;
    }
  });
  limpiar(caja,
    h('h2', {}, 'Configuración inicial'),
    h('div', { class: 'alerta info separar' }, icono('info'), h('div', {}, 'Todavía no hay usuarios. Cree la cuenta del gerente para administrar la escuela.')),
    form);
  correo.input.focus();
}
