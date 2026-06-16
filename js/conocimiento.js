// ============================================================
// MÓDULO BASE DE CONOCIMIENTO — CRUD de plantillas y soluciones
// ============================================================

function obtenerBaseConocimiento() {
  return leerLS('knowledge_base', []);
}

function guardarBaseConocimiento(lista) {
  guardarLS('knowledge_base', lista);
}

function generarIdConocimiento() {
  return 'K-' + Date.now().toString(36);
}

/**
 * Al iniciar la app por primera vez, se carga la base de conocimiento
 * con las plantillas predefinidas de data/plantillas.js, para que el
 * equipo de soporte ya tenga contenido documentado de referencia.
 */
function inicializarBaseConocimiento() {
  if (obtenerBaseConocimiento().length > 0) return;
  if (typeof PLANTILLAS === 'undefined') return;

  const entradas = Object.entries(PLANTILLAS).map(([clave, plantilla]) => ({
    id: generarIdConocimiento(),
    titulo: plantilla.titulo,
    categoria: plantilla.categoria,
    problema: `Plantilla de respuesta sugerida para la categoría "${formatearCategoria(plantilla.categoria)}".`,
    solucion: plantilla.texto,
    fechaCreacion: new Date().toISOString(),
    origenPlantilla: clave
  }));

  guardarBaseConocimiento(entradas);
}

// ============================================================
// RENDER — LISTADO
// ============================================================

function renderizarListaConocimiento() {
  const contenedor = document.getElementById('lista-conocimiento');
  if (!contenedor) return;

  const busqueda = (document.getElementById('conocimiento-busqueda')?.value || '').toLowerCase();
  let entradas = obtenerBaseConocimiento();

  if (busqueda) {
    entradas = entradas.filter(e => {
      const texto = `${e.titulo} ${e.problema} ${e.solucion} ${formatearCategoria(e.categoria)}`.toLowerCase();
      return texto.includes(busqueda);
    });
  }

  entradas = entradas.slice().sort((a, b) => a.titulo.localeCompare(b.titulo));

  if (entradas.length === 0) {
    contenedor.innerHTML = '<p class="lista-vacia">No se encontraron entradas en la base de conocimiento.</p>';
    return;
  }

  contenedor.innerHTML = entradas.map(e => `
    <div class="conocimiento-card" data-id="${e.id}">
      <span class="badge badge-prioridad-P3-Normal">${formatearCategoria(e.categoria)}</span>
      <h4>${escaparHtml(e.titulo)}</h4>
      <p><strong>Problema:</strong> ${escaparHtml(e.problema)}</p>
      <pre>${escaparHtml(e.solucion)}</pre>
      <p class="texto-secundario texto-pequeno">Creado: ${formatearFecha(e.fechaCreacion)}</p>
      <div class="acciones">
        <button class="btn btn-secundario btn-editar-conocimiento" data-id="${e.id}">Editar</button>
        <button class="btn btn-peligro btn-eliminar-conocimiento" data-id="${e.id}">Eliminar</button>
      </div>
    </div>
  `).join('');

  contenedor.querySelectorAll('.btn-editar-conocimiento').forEach(btn => {
    btn.addEventListener('click', () => abrirModalConocimiento(btn.dataset.id));
  });
  contenedor.querySelectorAll('.btn-eliminar-conocimiento').forEach(btn => {
    btn.addEventListener('click', () => eliminarEntradaConocimiento(btn.dataset.id));
  });
}

// ============================================================
// MODAL — CREAR / EDITAR
// ============================================================

function abrirModalConocimiento(id = null) {
  const entrada = id ? obtenerBaseConocimiento().find(e => e.id === id) : null;

  document.getElementById('modal-conocimiento-titulo').textContent = entrada ? 'Editar entrada' : 'Nueva entrada';
  document.getElementById('conocimiento-id').value = entrada ? entrada.id : '';
  document.getElementById('conocimiento-categoria-input').innerHTML = opcionesCategorias(entrada ? entrada.categoria : 'sin_clasificar', true);
  document.getElementById('conocimiento-titulo-input').value = entrada ? entrada.titulo : '';
  document.getElementById('conocimiento-problema-input').value = entrada ? entrada.problema : '';
  document.getElementById('conocimiento-solucion-input').value = entrada ? entrada.solucion : '';

  document.getElementById('modal-conocimiento').classList.remove('oculto');
}

function cerrarModalConocimiento() {
  document.getElementById('modal-conocimiento').classList.add('oculto');
}

function guardarEntradaConocimiento(datos) {
  const lista = obtenerBaseConocimiento();

  if (datos.id) {
    const entrada = lista.find(e => e.id === datos.id);
    if (entrada) {
      entrada.titulo = datos.titulo;
      entrada.categoria = datos.categoria;
      entrada.problema = datos.problema;
      entrada.solucion = datos.solucion;
    }
  } else {
    lista.push({
      id: generarIdConocimiento(),
      titulo: datos.titulo,
      categoria: datos.categoria,
      problema: datos.problema,
      solucion: datos.solucion,
      fechaCreacion: new Date().toISOString()
    });
  }

  guardarBaseConocimiento(lista);
  mostrarToast('Entrada guardada en la base de conocimiento', 'exito');
  renderizarListaConocimiento();
}

function eliminarEntradaConocimiento(id) {
  mostrarConfirmacion({
    titulo: 'Eliminar entrada',
    mensaje: '¿Eliminar esta entrada de la base de conocimiento?',
    textoConfirmar: 'Eliminar',
    peligro: true,
    onConfirmar: () => {
      const lista = obtenerBaseConocimiento().filter(e => e.id !== id);
      guardarBaseConocimiento(lista);
      mostrarToast('Entrada eliminada', 'aviso');
      renderizarListaConocimiento();
    }
  });
}

// ============================================================
// INICIALIZACIÓN DE LISTENERS
// ============================================================

function inicializarModuloConocimiento() {
  inicializarBaseConocimiento();

  document.getElementById('btn-nueva-entrada-conocimiento').addEventListener('click', () => abrirModalConocimiento());
  document.getElementById('cerrar-modal-conocimiento').addEventListener('click', cerrarModalConocimiento);
  document.getElementById('conocimiento-busqueda').addEventListener('input', renderizarListaConocimiento);

  document.getElementById('form-conocimiento').addEventListener('submit', e => {
    e.preventDefault();
    guardarEntradaConocimiento({
      id: document.getElementById('conocimiento-id').value || null,
      titulo: document.getElementById('conocimiento-titulo-input').value,
      categoria: document.getElementById('conocimiento-categoria-input').value,
      problema: document.getElementById('conocimiento-problema-input').value,
      solucion: document.getElementById('conocimiento-solucion-input').value
    });
    cerrarModalConocimiento();
  });

  renderizarListaConocimiento();
}
