// ============================================================
// MÓDULO BUGS — Log de escalamientos a TI
// ============================================================
// Cada entrada referencia un ticket escalado (por ticketId).
// El detalle completo del escalamiento también vive en
// ticket.escalamiento; aquí se mantiene un log liviano para
// el módulo de Bugs y Escalamientos y para el reporte semanal.
// ============================================================

function obtenerBugsLog() {
  return leerLS('bugs_log', []);
}

function guardarBugsLog(lista) {
  guardarLS('bugs_log', lista);
}

/** Crea o actualiza la entrada del log a partir del escalamiento del ticket. */
function registrarEscalamiento(ticket) {
  if (!ticket.escalamiento) return;
  const lista = obtenerBugsLog();
  let entrada = lista.find(b => b.ticketId === ticket.id);

  if (!entrada) {
    entrada = {
      ticketId: ticket.id,
      motivo: ticket.escalamiento.motivo,
      fechaEscalamiento: ticket.escalamiento.fechaEscalamiento,
      estadoTI: ticket.escalamiento.estadoTI,
      comentarios: [],
      fechaResolucionTI: null
    };
    lista.push(entrada);
  } else {
    entrada.motivo = ticket.escalamiento.motivo;
    entrada.estadoTI = ticket.escalamiento.estadoTI;
  }

  guardarBugsLog(lista);
}

/** Actualiza el estado TI (pendiente / en_revision / resuelto_ti) de un escalamiento. */
function actualizarEstadoTI(ticketId, nuevoEstado) {
  const lista = obtenerBugsLog();
  const entrada = lista.find(b => b.ticketId === ticketId);
  if (!entrada) return;

  entrada.estadoTI = nuevoEstado;
  entrada.fechaResolucionTI = nuevoEstado === 'resuelto_ti' ? new Date().toISOString() : null;
  guardarBugsLog(lista);

  // Mantener sincronizado el campo dentro del ticket
  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  if (ticket && ticket.escalamiento) {
    ticket.escalamiento.estadoTI = nuevoEstado;
    guardarTickets(tickets);
  }

  mostrarToast('Estado TI actualizado', 'exito');
  renderizarModuloBugs();
}

/** Agrega un comentario de resolución (con fecha) a un escalamiento. */
function agregarComentarioTI(ticketId, texto) {
  if (!texto || !texto.trim()) return;
  const lista = obtenerBugsLog();
  const entrada = lista.find(b => b.ticketId === ticketId);
  if (!entrada) return;

  const comentario = { texto: texto.trim(), fecha: new Date().toISOString() };
  entrada.comentarios.push(comentario);
  guardarBugsLog(lista);

  const tickets = obtenerTickets();
  const ticket = tickets.find(t => t.id === ticketId);
  if (ticket && ticket.escalamiento) {
    ticket.escalamiento.comentarios = ticket.escalamiento.comentarios || [];
    ticket.escalamiento.comentarios.push(comentario);
    guardarTickets(tickets);
  }

  mostrarToast('Comentario agregado', 'exito');
  abrirDetalleEscalamiento(ticketId);
}

/** Días que lleva abierto un escalamiento (hasta hoy, o hasta que TI lo resolvió). */
function diasAbiertoEscalamiento(entrada) {
  const inicio = new Date(entrada.fechaEscalamiento).getTime();
  const fin = entrada.fechaResolucionTI ? new Date(entrada.fechaResolucionTI).getTime() : Date.now();
  return Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
}

/** Escalamientos activos: aquellos que TI todavía no marcó como resuelto. */
function obtenerEscalamientosActivos() {
  return obtenerBugsLog().filter(b => b.estadoTI !== 'resuelto_ti');
}

// ============================================================
// RENDER — MÓDULO 3
// ============================================================

const ETIQUETAS_ESTADO_TI = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  resuelto_ti: 'Resuelto por TI'
};

function renderizarModuloBugs() {
  renderizarResumenBugs();
  renderizarTablaBugs();
}

function renderizarResumenBugs() {
  const contenedor = document.getElementById('bugs-resumen');
  if (!contenedor) return;

  const lista = obtenerBugsLog();
  const activos = obtenerEscalamientosActivos();

  // Frecuencia por motivo
  const frecuencia = {};
  lista.forEach(b => { frecuencia[b.motivo] = (frecuencia[b.motivo] || 0) + 1; });

  const sinRespuesta = activos.filter(b => diasAbiertoEscalamiento(b) > 5);

  contenedor.innerHTML = `
    <div class="metricas-grid" style="margin-bottom:16px;">
      <div class="metrica-card"><div class="valor">${lista.length}</div><div class="etiqueta">Total escalamientos</div></div>
      <div class="metrica-card"><div class="valor">${activos.length}</div><div class="etiqueta">Activos</div></div>
      <div class="metrica-card"><div class="valor">${lista.length - activos.length}</div><div class="etiqueta">Resueltos por TI</div></div>
      <div class="metrica-card"><div class="valor">${sinRespuesta.length}</div><div class="etiqueta">+5 días sin respuesta</div></div>
    </div>
    ${sinRespuesta.length > 0 ? `
      <div class="aviso-caja aviso-peligro">
        <i class="ti ti-alert-triangle"></i>
        <p>${sinRespuesta.length} escalamiento(s) llevan más de 5 días sin respuesta de TI: ${sinRespuesta.map(b => b.ticketId).join(', ')}</p>
      </div>
    ` : ''}
    <div class="grafico-barras" style="margin-bottom:16px;">
      ${Object.entries(frecuencia).sort((a, b) => b[1] - a[1]).map(([motivo, cantidad]) => `
        <div class="barra-fila">
          <div class="barra-etiqueta">${escaparHtml(motivo)}</div>
          <div class="barra-pista"><div class="barra-relleno" style="width:${Math.min(100, cantidad / lista.length * 100)}%"></div></div>
          <div class="barra-valor">${cantidad}</div>
        </div>
      `).join('') || '<p class="texto-secundario">Sin escalamientos registrados.</p>'}
    </div>
  `;
}

function renderizarTablaBugs() {
  const tbody = document.getElementById('tabla-bugs-body');
  if (!tbody) return;

  const lista = obtenerBugsLog().slice().sort((a, b) => new Date(b.fechaEscalamiento) - new Date(a.fechaEscalamiento));

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="lista-vacia">No hay escalamientos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(b => {
    const ticket = obtenerTicketPorId(b.ticketId);
    const dias = diasAbiertoEscalamiento(b);
    const alerta = b.estadoTI !== 'resuelto_ti' && dias > 5;
    return `
      <tr data-ticket-id="${b.ticketId}" class="${alerta ? 'fila-alerta' : ''}">
        <td>${b.ticketId}</td>
        <td>${escaparHtml(b.motivo)}</td>
        <td>${ticket ? formatearCategoria(ticket.categoria) : '—'}</td>
        <td>${alerta ? '<span class="texto-peligro">' : ''}${dias} día(s)${alerta ? '</span>' : ''}</td>
        <td><span class="badge badge-estado-${b.estadoTI === 'resuelto_ti' ? 'resuelto' : 'escalado'}">${ETIQUETAS_ESTADO_TI[b.estadoTI]}</span></td>
        <td><button class="btn btn-secundario btn-ver-escalamiento" data-ticket-id="${b.ticketId}">Ver / actualizar</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-ver-escalamiento').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      abrirDetalleEscalamiento(btn.dataset.ticketId);
    });
  });
}

function abrirDetalleEscalamiento(ticketId) {
  const lista = obtenerBugsLog();
  const entrada = lista.find(b => b.ticketId === ticketId);
  if (!entrada) return;
  const ticket = obtenerTicketPorId(ticketId);
  const dias = diasAbiertoEscalamiento(entrada);

  const html = `
    <h3>Escalamiento — ${ticketId}</h3>
    <p><strong>Motivo:</strong> ${escaparHtml(entrada.motivo)}</p>
    <p><strong>Días abierto:</strong> ${dias}</p>
    ${ticket?.escalamiento?.notaTI ? `<p><strong>Nota original para TI:</strong> ${escaparHtml(ticket.escalamiento.notaTI)}</p>` : ''}

    <div class="form-grupo">
      <label for="modal-estado-ti">Estado TI</label>
      <select id="modal-estado-ti">
        <option value="pendiente" ${entrada.estadoTI === 'pendiente' ? 'selected' : ''}>Pendiente</option>
        <option value="en_revision" ${entrada.estadoTI === 'en_revision' ? 'selected' : ''}>En revisión</option>
        <option value="resuelto_ti" ${entrada.estadoTI === 'resuelto_ti' ? 'selected' : ''}>Resuelto por TI</option>
      </select>
    </div>

    <h4>Comentarios de resolución</h4>
    <div class="detalle-notas">
      ${entrada.comentarios.length === 0
        ? '<p class="texto-secundario">Sin comentarios.</p>'
        : entrada.comentarios.slice().reverse().map(c => `
            <div class="detalle-nota">
              <div class="detalle-nota-fecha">${formatearFecha(c.fecha)}</div>
              <div>${escaparHtml(c.texto)}</div>
            </div>
          `).join('')
      }
    </div>
    <div class="form-grupo">
      <textarea id="modal-nuevo-comentario-ti" rows="2" placeholder="Agregar comentario de resolución..."></textarea>
      <button class="btn btn-secundario" id="btn-agregar-comentario-ti">Agregar comentario</button>
    </div>
  `;

  abrirModalDetalle(html);

  document.getElementById('modal-estado-ti').addEventListener('change', e => {
    actualizarEstadoTI(ticketId, e.target.value);
  });
  document.getElementById('btn-agregar-comentario-ti').addEventListener('click', () => {
    const texto = document.getElementById('modal-nuevo-comentario-ti').value;
    agregarComentarioTI(ticketId, texto);
  });
}
