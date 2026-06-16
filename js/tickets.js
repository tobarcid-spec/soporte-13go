// ============================================================
// MÓDULO TICKETS — CRUD de tickets y actualización de etiquetas Gmail
// ============================================================

const MOTIVOS_ESCALAMIENTO = [
  'Reactivación de suscripción',
  'Error técnico en la app',
  'Error en contenido',
  'Solicitud de reembolso / devolución',
  'Sin respuesta — derivar a TI'
];

/** Categorías que sugieren escalar a TI automáticamente (alerta en el formulario). */
const CATEGORIAS_ESCALAR_TI_LOCAL = (typeof CATEGORIAS_ESCALAR_TI !== 'undefined')
  ? CATEGORIAS_ESCALAR_TI
  : ['reactivacion', 'caida_firebase', 'reembolso'];

// ============================================================
// PERSISTENCIA
// ============================================================

function obtenerTickets() {
  return leerLS('tickets', []);
}

function guardarTickets(tickets) {
  guardarLS('tickets', tickets);
}

function obtenerTicketPorId(id) {
  return obtenerTickets().find(t => t.id === id);
}

function generarIdTicket() {
  const tickets = obtenerTickets();
  const numero = tickets.length + 1;
  return 'T-' + String(numero).padStart(3, '0');
}

// ============================================================
// CREACIÓN DE TICKETS
// ============================================================

/** Crea un ticket a partir de un correo de Gmail (sync o creación manual desde Tab A). */
function crearTicketDesdeGmail(correo, categoria, prioridad, silencioso = false) {
  const clasificacion = clasificarPorEtiquetas(correo.labels);
  const ticket = {
    id: generarIdTicket(),
    origen: 'gmail',
    messageId: correo.messageId,
    fechaIngreso: correo.fecha,
    remitente: correo.remitente,
    asunto: correo.asunto,
    snippet: correo.snippet,
    descripcion: correo.snippet,
    etiquetaGmail: clasificacion.etiquetaGmail,
    categoria,
    prioridad,
    estado: 'abierto',
    requiereRevision: true,
    tipoResolucion: null,
    respuestaTexto: null,
    notas: [],
    escalamiento: null,
    fechaResolucion: null
  };

  const tickets = obtenerTickets();
  tickets.push(ticket);
  guardarTickets(tickets);

  if (!silencioso) {
    mostrarToast(`Ticket ${ticket.id} creado desde correo`, 'exito');
    renderizarTablaTickets();
    actualizarBadgesSidebar();
  }
  return ticket;
}

/** Crea un ticket desde el formulario de ingreso manual. */
function crearTicketManual(datos) {
  const ahora = new Date();
  const horaActual = ahora.toTimeString().slice(0, 8);
  const fechaIngreso = new Date(`${datos.fecha}T${horaActual}`).toISOString();

  const ticket = {
    id: generarIdTicket(),
    origen: datos.canal,
    messageId: null,
    fechaIngreso,
    remitente: { nombre: datos.nombre },
    asunto: null,
    snippet: null,
    descripcion: datos.descripcion,
    etiquetaGmail: null,
    categoria: datos.categoria,
    prioridad: datos.prioridad,
    estado: 'abierto',
    requiereRevision: false,
    tipoResolucion: datos.tipoResolucion,
    respuestaTexto: null,
    notas: [],
    escalamiento: null,
    fechaResolucion: null
  };

  if (datos.tipoResolucion === 'automatica') {
    ticket.estado = 'auto_respondido';
    ticket.respuestaTexto = datos.plantillaTexto || '';
    ticket.fechaResolucion = ahora.toISOString();
  } else if (datos.tipoResolucion === 'manual') {
    ticket.estado = 'resuelto';
    ticket.respuestaTexto = datos.respuestaManual || '';
    ticket.fechaResolucion = ahora.toISOString();
  } else if (datos.tipoResolucion === 'escalar') {
    ticket.estado = 'escalado';
    ticket.escalamiento = {
      motivo: datos.motivoEscalamiento,
      notaTI: datos.notaTI || '',
      estadoTI: 'pendiente',
      comentarios: [],
      fechaEscalamiento: ahora.toISOString()
    };
  }

  const tickets = obtenerTickets();
  tickets.push(ticket);
  guardarTickets(tickets);

  if (ticket.estado === 'escalado') {
    registrarEscalamiento(ticket);
  }

  mostrarToast(`Caso ${ticket.id} guardado correctamente`, 'exito');
  return ticket;
}

// ============================================================
// ACCIONES SOBRE TICKETS EXISTENTES
// ============================================================

async function marcarResuelto(id) {
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;

  ticket.estado = 'resuelto';
  ticket.fechaResolucion = new Date().toISOString();
  ticket.requiereRevision = false;
  guardarTickets(tickets);

  if (ticket.messageId) {
    await actualizarEtiquetaGmail(ticket.messageId, 'resuelto');
  }

  mostrarToast(`Ticket ${id} marcado como resuelto`, 'exito');
  renderizarTablaTickets();
  actualizarBadgesSidebar();
  abrirDetalleTicket(id);
}

async function escalarTicketATI(id, motivo, notaTI) {
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;

  ticket.estado = 'escalado';
  ticket.requiereRevision = false;
  ticket.escalamiento = {
    motivo,
    notaTI: notaTI || '',
    estadoTI: 'pendiente',
    comentarios: [],
    fechaEscalamiento: new Date().toISOString()
  };
  guardarTickets(tickets);
  registrarEscalamiento(ticket);

  if (ticket.messageId) {
    await actualizarEtiquetaGmail(ticket.messageId, 'escalado');
  }

  mostrarToast(`Ticket ${id} escalado a TI`, 'exito');
  renderizarTablaTickets();
  actualizarBadgesSidebar();
  abrirDetalleTicket(id);
}

function agregarNotaTicket(id, texto) {
  if (!texto || !texto.trim()) return;
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;

  ticket.notas.push({ texto: texto.trim(), fecha: new Date().toISOString() });
  guardarTickets(tickets);
  abrirDetalleTicket(id);
}

function cambiarPrioridadTicket(id, prioridad) {
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;
  ticket.prioridad = prioridad;
  guardarTickets(tickets);
  renderizarTablaTickets();
  mostrarToast('Prioridad actualizada', 'exito');
}

function cambiarCategoriaTicket(id, categoria) {
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;
  ticket.categoria = categoria;
  ticket.requiereRevision = false;
  guardarTickets(tickets);
  renderizarTablaTickets();
  mostrarToast('Categoría actualizada', 'exito');
}

function marcarTicketRevisado(id) {
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) return;
  ticket.requiereRevision = false;
  guardarTickets(tickets);
}

// ============================================================
// SLA
// ============================================================

const ESTADOS_RESUELTOS = ['resuelto', 'auto_respondido'];

function calcularSLA(ticket) {
  if (ESTADOS_RESUELTOS.includes(ticket.estado)) {
    return { color: 'ninguno', horas: null };
  }
  const horas = (Date.now() - new Date(ticket.fechaIngreso).getTime()) / 3600000;
  let color = 'verde';
  if (horas >= 48) color = 'rojo';
  else if (horas >= 24) color = 'amarillo';
  return { color, horas };
}

// ============================================================
// RENDER — TABLA DE CASOS ACTIVOS
// ============================================================

function obtenerTicketsFiltrados() {
  const busqueda = (document.getElementById('filtro-busqueda')?.value || '').toLowerCase();
  const estado = document.getElementById('filtro-estado')?.value || '';
  const canal = document.getElementById('filtro-canal')?.value || '';
  const categoria = document.getElementById('filtro-categoria')?.value || '';
  const prioridad = document.getElementById('filtro-prioridad')?.value || '';
  const desde = document.getElementById('filtro-fecha-desde')?.value || '';
  const hasta = document.getElementById('filtro-fecha-hasta')?.value || '';

  return obtenerTickets().filter(t => {
    if (estado && t.estado !== estado) return false;
    if (canal && t.origen !== canal) return false;
    if (categoria && t.categoria !== categoria) return false;
    if (prioridad && t.prioridad !== prioridad) return false;
    if (desde && t.fechaIngreso.slice(0, 10) < desde) return false;
    if (hasta && t.fechaIngreso.slice(0, 10) > hasta) return false;
    if (busqueda) {
      const texto = `${t.remitente?.nombre || ''} ${t.remitente?.email || ''} ${t.asunto || ''} ${t.descripcion || ''}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.fechaIngreso) - new Date(a.fechaIngreso));
}

function renderizarTablaTickets() {
  const tbody = document.getElementById('tabla-tickets-body');
  if (!tbody) return;

  const tickets = obtenerTicketsFiltrados();

  if (tickets.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="lista-vacia">No hay casos que coincidan con los filtros.</td></tr>';
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const sla = calcularSLA(t);
    const slaHtml = sla.color === 'ninguno'
      ? '<span class="sla-ninguno"></span>'
      : `<span class="sla-barra sla-${sla.color}" title="${Math.round(sla.horas)}h sin resolver"></span>`;

    return `
      <tr data-id="${t.id}">
        <td>${t.requiereRevision ? '<span class="badge-sin-revisar" title="Sin revisar"></span>' : ''}${t.id}</td>
        <td><span class="badge badge-origen-${t.origen}">${etiquetaOrigen(t.origen)}</span></td>
        <td>${escaparHtml(t.remitente?.nombre || '')}</td>
        <td>${formatearCategoria(t.categoria)}</td>
        <td><span class="badge badge-prioridad-${t.prioridad}">${t.prioridad}</span></td>
        <td><span class="badge badge-estado-${t.estado}">${etiquetaEstado(t.estado)}</span></td>
        <td>${formatearFecha(t.fechaIngreso)}</td>
        <td>${slaHtml}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalleTicket(tr.dataset.id));
  });
}

function etiquetaOrigen(origen) {
  const mapa = {
    gmail: 'Gmail', instagram: 'Instagram', twitter: 'Twitter/X',
    facebook: 'Facebook', whatsapp: 'WhatsApp', otro: 'Otro'
  };
  return mapa[origen] || origen;
}

function etiquetaEstado(estado) {
  const mapa = {
    abierto: 'Abierto', resuelto: 'Resuelto',
    escalado: 'Escalado a TI', auto_respondido: 'Auto-respondido'
  };
  return mapa[estado] || estado;
}

// ============================================================
// RENDER — DETALLE DE TICKET (modal)
// ============================================================

function abrirDetalleTicket(id) {
  const ticket = obtenerTicketPorId(id);
  if (!ticket) return;
  marcarTicketRevisado(id);

  const sla = calcularSLA(ticket);
  const slaTexto = sla.color === 'ninguno' ? 'Resuelto' : `${Math.round(sla.horas)}h sin resolver (${sla.color})`;

  const html = `
    <h3>${ticket.id} — ${etiquetaEstado(ticket.estado)}</h3>
    <div class="detalle-grid">
      <div class="detalle-campo"><div class="etiqueta">Origen</div><div class="valor">${etiquetaOrigen(ticket.origen)}</div></div>
      <div class="detalle-campo"><div class="etiqueta">Remitente</div><div class="valor">${escaparHtml(ticket.remitente?.nombre || '')}</div></div>
      <div class="detalle-campo"><div class="etiqueta">Fecha de ingreso</div><div class="valor">${formatearFecha(ticket.fechaIngreso)}</div></div>
      <div class="detalle-campo"><div class="etiqueta">SLA</div><div class="valor">${slaTexto}</div></div>
      <div class="detalle-campo">
        <div class="etiqueta">Categoría</div>
        <select id="detalle-select-categoria">${opcionesCategorias(ticket.categoria)}</select>
      </div>
      <div class="detalle-campo">
        <div class="etiqueta">Prioridad</div>
        <select id="detalle-select-prioridad">${opcionesPrioridad(ticket.prioridad)}</select>
      </div>
    </div>

    ${ticket.origen === 'gmail' ? `
      <div class="detalle-campo" style="margin-bottom:14px;">
        <div class="etiqueta">Asunto del correo</div>
        <div class="valor">${escaparHtml(ticket.asunto || '')}</div>
        <p class="texto-secundario">${escaparHtml(ticket.snippet || '')}</p>
      </div>
    ` : `
      <div class="detalle-campo" style="margin-bottom:14px;">
        <div class="etiqueta">Descripción</div>
        <p>${escaparHtml(ticket.descripcion || '')}</p>
      </div>
    `}

    ${ticket.respuestaTexto ? `
      <div class="detalle-campo" style="margin-bottom:14px;">
        <div class="etiqueta">Respuesta enviada</div>
        <p>${escaparHtml(ticket.respuestaTexto)}</p>
      </div>
    ` : ''}

    ${ticket.escalamiento ? `
      <div class="aviso-caja aviso-peligro">
        <i class="ti ti-bug"></i>
        <p><strong>Escalado a TI:</strong> ${escaparHtml(ticket.escalamiento.motivo)}
        — Estado TI: ${ticket.escalamiento.estadoTI}</p>
      </div>
    ` : ''}

    <div class="detalle-acciones">
      ${ticket.estado !== 'resuelto' ? `<button class="btn btn-primario" id="btn-detalle-resolver">Marcar resuelto</button>` : ''}
      ${ticket.estado !== 'escalado' ? `<button class="btn btn-peligro" id="btn-detalle-escalar">Escalar a TI</button>` : ''}
    </div>

    <div id="detalle-bloque-escalar" class="oculto form-grupo form-grupo-ancho">
      <label for="detalle-motivo-escalar">Motivo de escalamiento</label>
      <select id="detalle-motivo-escalar">${MOTIVOS_ESCALAMIENTO.map(m => `<option value="${m}">${m}</option>`).join('')}</select>
      <label for="detalle-nota-ti">Nota para TI</label>
      <textarea id="detalle-nota-ti" rows="3"></textarea>
      <button class="btn btn-peligro" id="btn-detalle-confirmar-escalar">Confirmar escalamiento</button>
    </div>

    <h4>Notas de seguimiento</h4>
    <div class="detalle-notas">
      ${ticket.notas.length === 0
        ? '<p class="texto-secundario">Sin notas registradas.</p>'
        : ticket.notas.slice().reverse().map(n => `
            <div class="detalle-nota">
              <div class="detalle-nota-fecha">${formatearFecha(n.fecha)}</div>
              <div>${escaparHtml(n.texto)}</div>
            </div>
          `).join('')
      }
    </div>
    <div class="form-grupo">
      <textarea id="detalle-nueva-nota" rows="2" placeholder="Agregar nota de seguimiento..."></textarea>
      <button class="btn btn-secundario" id="btn-detalle-agregar-nota">Agregar nota</button>
    </div>
  `;

  abrirModalDetalle(html);

  document.getElementById('detalle-select-categoria')?.addEventListener('change', e => cambiarCategoriaTicket(id, e.target.value));
  document.getElementById('detalle-select-prioridad')?.addEventListener('change', e => cambiarPrioridadTicket(id, e.target.value));
  document.getElementById('btn-detalle-resolver')?.addEventListener('click', () => marcarResuelto(id));
  document.getElementById('btn-detalle-escalar')?.addEventListener('click', () => {
    document.getElementById('detalle-bloque-escalar').classList.remove('oculto');
  });
  document.getElementById('btn-detalle-confirmar-escalar')?.addEventListener('click', () => {
    const motivo = document.getElementById('detalle-motivo-escalar').value;
    const nota = document.getElementById('detalle-nota-ti').value;
    escalarTicketATI(id, motivo, nota);
  });
  document.getElementById('btn-detalle-agregar-nota')?.addEventListener('click', () => {
    const texto = document.getElementById('detalle-nueva-nota').value;
    agregarNotaTicket(id, texto);
  });
}

// ============================================================
// FORMULARIO MANUAL (Tab B de Nuevo Caso)
// ============================================================

function inicializarFormularioManual() {
  const form = document.getElementById('form-nuevo-caso-manual');
  if (!form) return;

  // Fecha por defecto: hoy
  document.getElementById('manual-fecha').value = new Date().toISOString().slice(0, 10);

  // Poblar categorías
  document.getElementById('manual-categoria').innerHTML = opcionesCategorias('sin_clasificar');

  // Poblar plantillas según categoría
  actualizarPlantillasManual();

  document.getElementById('manual-categoria').addEventListener('change', () => {
    actualizarAlertaEscalarManual();
    actualizarPlantillasManual();
  });

  // Cambiar bloque visible según tipo de resolución
  form.querySelectorAll('input[name="manual-tipo-resolucion"]').forEach(radio => {
    radio.addEventListener('change', actualizarBloqueResolucionManual);
  });

  document.getElementById('manual-plantilla-select').addEventListener('change', () => {
    const texto = obtenerTextoPlantillaSeleccionada();
    document.getElementById('manual-plantilla-texto').value = texto;
  });

  document.getElementById('btn-copiar-plantilla').addEventListener('click', () => {
    const texto = document.getElementById('manual-plantilla-texto').value;
    navigator.clipboard?.writeText(texto);
    mostrarToast('Plantilla copiada al portapapeles', 'exito');
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const tipoResolucion = form.querySelector('input[name="manual-tipo-resolucion"]:checked').value;

    const datos = {
      canal: document.getElementById('manual-canal').value,
      fecha: document.getElementById('manual-fecha').value,
      nombre: document.getElementById('manual-nombre').value,
      descripcion: document.getElementById('manual-descripcion').value,
      prioridad: document.getElementById('manual-prioridad').value,
      categoria: document.getElementById('manual-categoria').value,
      tipoResolucion,
      plantillaTexto: document.getElementById('manual-plantilla-texto').value,
      respuestaManual: document.getElementById('manual-respuesta-texto').value,
      motivoEscalamiento: document.getElementById('manual-motivo-escalar').value,
      notaTI: document.getElementById('manual-nota-ti').value
    };

    crearTicketManual(datos);
    form.reset();
    document.getElementById('manual-fecha').value = new Date().toISOString().slice(0, 10);
    actualizarBloqueResolucionManual();
    actualizarAlertaEscalarManual();
    renderizarTablaTickets();
    actualizarBadgesSidebar();
  });

  actualizarAlertaEscalarManual();
  actualizarBloqueResolucionManual();
}

function actualizarAlertaEscalarManual() {
  const categoria = document.getElementById('manual-categoria').value;
  const aviso = document.getElementById('manual-alerta-escalar');
  aviso.classList.toggle('oculto', !CATEGORIAS_ESCALAR_TI_LOCAL.includes(categoria));
}

function actualizarBloqueResolucionManual() {
  const tipo = document.querySelector('input[name="manual-tipo-resolucion"]:checked')?.value;
  document.getElementById('manual-bloque-automatica').classList.toggle('oculto', tipo !== 'automatica');
  document.getElementById('manual-bloque-manual').classList.toggle('oculto', tipo !== 'manual');
  document.getElementById('manual-bloque-escalar').classList.toggle('oculto', tipo !== 'escalar');
}

/**
 * El combo de plantilla sugerida se llena desde la Base de Conocimiento
 * (no desde el archivo estático de plantillas): así, cada entrada que
 * se agregue ahí para una categoría aparece automáticamente como opción
 * aquí, sin límite de cantidad por categoría.
 */
function actualizarPlantillasManual() {
  const categoria = document.getElementById('manual-categoria').value;
  const select = document.getElementById('manual-plantilla-select');
  const entradas = obtenerBaseConocimiento().filter(e => e.categoria === categoria);

  if (entradas.length === 0) {
    select.innerHTML = '<option value="">(Sin plantilla para esta categoría)</option>';
    document.getElementById('manual-plantilla-texto').value = '';
    return;
  }

  const sugerida = (typeof PLANTILLA_POR_CATEGORIA !== 'undefined') ? PLANTILLA_POR_CATEGORIA[categoria] : null;
  select.innerHTML = entradas.map(e => `<option value="${e.id}" ${e.origenPlantilla === sugerida ? 'selected' : ''}>${escaparHtml(e.titulo)}</option>`).join('');
  document.getElementById('manual-plantilla-texto').value = obtenerTextoPlantillaSeleccionada();
}

function obtenerTextoPlantillaSeleccionada() {
  const id = document.getElementById('manual-plantilla-select').value;
  const entrada = obtenerBaseConocimiento().find(e => e.id === id);
  return entrada ? entrada.solucion : '';
}

// ============================================================
// FILTROS — inicialización de listeners y selects dinámicos
// ============================================================

function inicializarFiltrosCasosActivos() {
  document.getElementById('filtro-categoria').innerHTML =
    '<option value="">Todas las categorías</option>' + opcionesCategorias('', true);

  ['filtro-busqueda', 'filtro-estado', 'filtro-canal', 'filtro-categoria', 'filtro-prioridad', 'filtro-fecha-desde', 'filtro-fecha-hasta']
    .forEach(idCampo => {
      const el = document.getElementById(idCampo);
      el?.addEventListener('input', renderizarTablaTickets);
      el?.addEventListener('change', renderizarTablaTickets);
    });
}
