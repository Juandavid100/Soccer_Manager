// Categorías por edad y temporada (HU-02).
import { h, limpiar, encabezado, boton, tarjeta, tabla, acciones, botonIcono, formularioModal, confirmar, ejecutar, formato, buscador } from '../ui.js';
import { api, R } from '../api.js';
import { catalogos } from '../sesion.js';

const CAMPOS = [
  { nombre: 'nombre', etiqueta: 'Nombre', requerido: true, placeholder: 'Sub-10', ancho: true },
  { nombre: 'edadMinima', etiqueta: 'Edad mínima', tipo: 'numero', requerido: true, min: 0 },
  { nombre: 'edadMaxima', etiqueta: 'Edad máxima', tipo: 'numero', requerido: true, min: 0 },
  { nombre: 'temporada', etiqueta: 'Temporada', tipo: 'numero', requerido: true, min: 2000 },
  { nombre: 'fechaCorte', etiqueta: 'Fecha de corte', tipo: 'fecha', requerido: true, ayuda: 'La edad del estudiante se calcula a esta fecha.' },
];

export async function mostrar(contenedor) {
  let filtro = '';
  const cuerpo = h('div', {});

  async function refrescar() {
    const { categorias, grupos } = await catalogos('categorias', 'grupos');
    const lista = categorias
      .filter((c) => !filtro || c.nombre.toLowerCase().includes(filtro) || String(c.temporada).includes(filtro))
      .sort((a, b) => b.temporada - a.temporada || a.edadMinima - b.edadMinima);
    limpiar(cuerpo, tabla({
      filas: lista,
      vacio: 'No hay categorías. Cree la primera para poder organizar los grupos.',
      columnas: [
        { titulo: 'Categoría', valor: (c) => h('b', {}, c.nombre) },
        { titulo: 'Edades', valor: (c) => `${c.edadMinima} a ${c.edadMaxima} años` },
        { titulo: 'Temporada', valor: (c) => c.temporada },
        { titulo: 'Fecha de corte', valor: (c) => formato.fecha(c.fechaCorte) },
        { titulo: 'Grupos', valor: (c) => grupos.filter((g) => g.categoriaId === c.id).length },
        { titulo: '', clase: 'derecha', valor: (c) => acciones(
          botonIcono('editar', 'Editar', () => editar(c)),
          botonIcono('borrar', 'Eliminar', () => eliminar(c), 'peligro')) },
      ],
    }));
  }

  function editar(c) {
    formularioModal({
      titulo: c ? `Editar ${c.nombre}` : 'Nueva categoría',
      campos: CAMPOS,
      valores: c || { temporada: new Date().getFullYear(), fechaCorte: `${new Date().getFullYear()}-12-31` },
      alGuardar: async (d) => {
        if (c) await api.put(`${R.categorias}/${c.id}`, d); else await api.post(R.categorias, d);
        await ejecutar(async () => {}, c ? 'Categoría actualizada' : 'Categoría creada', refrescar);
      },
    });
  }

  async function eliminar(c) {
    if (await confirmar(`¿Eliminar la categoría ${c.nombre}?`, { boton: 'Eliminar', peligro: true }))
      ejecutar(() => api.delete(`${R.categorias}/${c.id}`), 'Categoría eliminada', refrescar);
  }

  limpiar(contenedor,
    encabezado('Categorías', 'Rangos de edad por temporada. Cada grupo y campeonato pertenece a una categoría.',
      boton('Nueva categoría', () => editar(null), { clase: 'primario', icono: 'mas' })),
    tarjeta(null, h('div', {}, h('div', { class: 'filtros' }, buscador('Buscar por nombre o temporada', (t) => { filtro = t; refrescar(); })), cuerpo)));
  await refrescar();
}
