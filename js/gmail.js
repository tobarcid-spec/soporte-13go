// ============================================================
// MÓDULO GMAIL — sincronización, filtros de descarte y etiquetas
// ============================================================
// NOTA: LABEL_MAP y PLANTILLAS se definen en data/plantillas.js
// (archivo provisto, no se modifica su estructura).
// ============================================================

// Valores por defecto de los filtros de descarte automático.
// El usuario puede editarlos desde Configuración (se guardan en localStorage).
const IGNORAR_REMITENTES_DEFAULT = [
  'mailer-daemon@googlemail.com', // rebotes de campaña de cancelados
  '@brevo.com',                   // plataforma de envío masivo
  '@m.brevo.com'                  // dominio alternativo de Brevo
];

const IGNORAR_ETIQUETAS_GMAIL_DEFAULT = [
  'Flow' // liquidaciones del operador Flow — se archivan en su carpeta
];

/** Lee los filtros de descarte actuales (editados por el usuario o por defecto). */
function obtenerFiltrosDescarte() {
  const guardado = leerLS('filtros_descarte', null);
  if (guardado) return guardado;
  return {
    remitentes: [...IGNORAR_REMITENTES_DEFAULT],
    etiquetas: [...IGNORAR_ETIQUETAS_GMAIL_DEFAULT]
  };
}

function guardarFiltrosDescarte(filtros) {
  guardarLS('filtros_descarte', filtros);
}

/** Determina si un correo debe descartarse automáticamente (no genera ticket). */
function debeIgnorar(correo) {
  const filtros = obtenerFiltrosDescarte();
  const remitente = (correo.from || '').toLowerCase();
  const esRemitenteIgnorado = filtros.remitentes
    .some(patron => remitente.includes(patron.toLowerCase()));
  const tieneEtiquetaIgnorada = (correo.labels || [])
    .some(etiqueta => filtros.etiquetas.includes(etiqueta));
  return esRemitenteIgnorado || tieneEtiquetaIgnorada;
}

// ============================================================
// IDs reales de las etiquetas de Gmail (necesarios para modificar etiquetas)
// ============================================================

/** Carga desde la API los IDs reales de las etiquetas y los guarda en localStorage. */
async function cargarIdsEtiquetas() {
  if (!gmailConectado()) return;
  try {
    const res = await gapi.client.gmail.users.labels.list({ userId: 'me' });
    const ids = {};
    (res.result.labels || []).forEach(l => { ids[l.name] = l.id; });
    guardarLS('gmail_label_ids', ids);
  } catch (err) {
    console.error('No se pudieron cargar las etiquetas de Gmail', err);
  }
}

/** Mapa inverso id → nombre, para traducir los labelIds que vienen en cada mensaje. */
function obtenerMapaIdANombreEtiqueta() {
  const ids = leerLS('gmail_label_ids', {});
  const inverso = {};
  Object.entries(ids).forEach(([nombre, id]) => { inverso[id] = nombre; });
  return inverso;
}

/**
 * Actualiza la etiqueta de un correo en Gmail según el nuevo estado del ticket.
 * Solo se debe llamar si el ticket tiene messageId (viene de Gmail).
 */
async function actualizarEtiquetaGmail(messageId, nuevoEstado) {
  if (!gmailConectado()) return;
  const ids = leerLS('gmail_label_ids', {});

  const mapa = {
    'abierto':  ids['Pendiente'],
    'resuelto': ids['Resuelto'],
    'escalado': ids['Reactivación']
  };

  const agregar = mapa[nuevoEstado];
  const quitar = Object.values(mapa).filter(id => id && id !== agregar);

  try {
    await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: agregar ? [agregar] : [],
        removeLabelIds: quitar
      }
    });
  } catch (err) {
    console.error('No se pudo actualizar la etiqueta en Gmail', err);
    mostrarToast('No se pudo actualizar la etiqueta en Gmail, pero el ticket sí se actualizó', 'aviso');
  }
}

// ============================================================
// LECTURA Y CLASIFICACIÓN DE CORREOS
// ============================================================

/** Asigna categoría/prioridad interna según la etiqueta de Gmail (LABEL_MAP). */
function clasificarPorEtiquetas(nombresEtiquetas) {
  for (const nombre of nombresEtiquetas) {
    if (LABEL_MAP[nombre]) {
      return { etiquetaGmail: nombre, ...LABEL_MAP[nombre] };
    }
  }
  return { etiquetaGmail: null, categoria: 'sin_clasificar', prioridad: 'P3-Normal' };
}

/** Extrae remitente {nombre, email} desde el header "From". */
function parsearRemitente(headerFrom) {
  const match = /^(.*?)\s*<(.+)>$/.exec(headerFrom || '');
  if (match) {
    return { nombre: match[1].replace(/"/g, '').trim() || match[2], email: match[2].trim() };
  }
  return { nombre: headerFrom || '', email: headerFrom || '' };
}

/** Obtiene los últimos `maxResults` correos sin leer del inbox, ya parseados. */
async function obtenerCorreosCrudos(maxResults = 50) {
  const lista = await gapi.client.gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    q: 'is:unread',
    maxResults
  });

  const mensajes = lista.result.messages || [];
  const mapaEtiquetas = obtenerMapaIdANombreEtiqueta();
  const correos = [];

  for (const m of mensajes) {
    const detalle = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date']
    });

    const headers = detalle.result.payload.headers || [];
    const from = (headers.find(h => h.name === 'From') || {}).value || '';
    const subject = (headers.find(h => h.name === 'Subject') || {}).value || '(sin asunto)';
    const nombresEtiquetas = (detalle.result.labelIds || [])
      .map(id => mapaEtiquetas[id])
      .filter(Boolean);

    correos.push({
      messageId: m.id,
      fecha: new Date(parseInt(detalle.result.internalDate, 10)).toISOString(),
      from,
      remitente: parsearRemitente(from),
      asunto: subject,
      snippet: (detalle.result.snippet || '').slice(0, 200),
      labels: nombresEtiquetas
    });
  }

  return correos;
}

/**
 * Filtra los correos crudos: descarta los que matchean los filtros automáticos
 * (registrándolos en el log), los que ya tienen ticket y los ya descartados.
 * Devuelve solo los correos "pendientes" de acción.
 */
function filtrarCorreosPendientes(correos) {
  const pendientes = [];

  correos.forEach(correo => {
    if (yaExisteTicketGmail(correo.messageId)) return;
    if (yaDescartado(correo.messageId)) return;

    if (debeIgnorar(correo)) {
      registrarDescartadoAutomatico(correo);
      return;
    }

    pendientes.push(correo);
  });

  return pendientes;
}

function yaExisteTicketGmail(messageId) {
  return obtenerTickets().some(t => t.messageId === messageId);
}

function yaDescartado(messageId) {
  return leerLS('correos_descartados', []).some(c => c.messageId === messageId);
}

function registrarDescartadoAutomatico(correo) {
  if (yaDescartado(correo.messageId)) return;
  const lista = leerLS('correos_descartados', []);
  lista.push({
    messageId: correo.messageId,
    remitente: correo.remitente.nombre || correo.remitente.email,
    asunto: correo.asunto,
    fechaDescarte: new Date().toISOString(),
    motivo: 'Automático'
  });
  guardarLS('correos_descartados', lista);
}

/** Descarte manual de un correo desde la lista de "Nuevo caso" → Gmail. */
function descartarCorreo(messageId, remitente, asunto) {
  mostrarConfirmacion({
    titulo: 'Descartar correo',
    mensaje: `¿Descartar el correo de "${remitente}" — "${asunto}"? No se generará ticket.`,
    textoConfirmar: 'Descartar',
    peligro: true,
    onConfirmar: () => {
      const lista = leerLS('correos_descartados', []);
      lista.push({
        messageId,
        remitente,
        asunto,
        fechaDescarte: new Date().toISOString(),
        motivo: 'Manual'
      });
      guardarLS('correos_descartados', lista);
      mostrarToast('Correo descartado — no se generará ticket', 'aviso');
      cargarCorreosPendientes();
      renderizarLogDescartados();
    }
  });
}

/** Restaura un correo descartado para que vuelva a aparecer como pendiente. */
function restaurarCorreoDescartado(messageId) {
  const lista = leerLS('correos_descartados', []).filter(c => c.messageId !== messageId);
  guardarLS('correos_descartados', lista);
  mostrarToast('Correo restaurado a la lista de pendientes', 'exito');
  cargarCorreosPendientes();
  renderizarLogDescartados();
}

// ============================================================
// TAB "DESDE GMAIL" en Nuevo Caso
// ============================================================

let correosPendientesCache = [];

/** Carga y renderiza la lista de correos pendientes de convertir en ticket. */
async function cargarCorreosPendientes() {
  const contenedor = document.getElementById('lista-correos-gmail');
  const avisoNoConectado = document.getElementById('gmail-no-conectado');
  if (!contenedor) return;

  if (!gmailConectado()) {
    avisoNoConectado.classList.remove('oculto');
    contenedor.innerHTML = '';
    return;
  }
  avisoNoConectado.classList.add('oculto');

  try {
    const crudos = await obtenerCorreosCrudos(50);
    correosPendientesCache = filtrarCorreosPendientes(crudos);
    renderizarListaCorreosGmail();
    renderizarLogDescartados();
  } catch (err) {
    console.error(err);
    mostrarToast('Error al cargar correos de Gmail', 'error');
  }
}

function renderizarListaCorreosGmail() {
  const contenedor = document.getElementById('lista-correos-gmail');
  if (!contenedor) return;

  if (correosPendientesCache.length === 0) {
    contenedor.innerHTML = '<p class="lista-vacia">No hay correos pendientes por convertir en ticket.</p>';
    return;
  }

  contenedor.innerHTML = correosPendientesCache.map(correo => {
    const clasificacion = clasificarPorEtiquetas(correo.labels);
    return `
      <div class="correo-card" data-message-id="${correo.messageId}">
        <div class="correo-card-info">
          <div class="correo-remitente">${escaparHtml(correo.remitente.nombre)} &lt;${escaparHtml(correo.remitente.email)}&gt;</div>
          <div class="correo-asunto">${escaparHtml(correo.asunto)}</div>
          <div class="correo-snippet">${escaparHtml(correo.snippet)}</div>
          <div class="correo-meta">
            <span class="badge badge-origen-gmail">${clasificacion.etiquetaGmail || 'Sin etiqueta'}</span>
            <span class="badge badge-prioridad-${clasificacion.prioridad}">${formatearCategoria(clasificacion.categoria)}</span>
          </div>
        </div>
        <div class="correo-card-acciones">
          <button class="btn btn-primario btn-crear-ticket-gmail" data-message-id="${correo.messageId}">Crear ticket</button>
          <button class="btn btn-secundario btn-descartar-correo" data-message-id="${correo.messageId}">Descartar</button>
        </div>
      </div>
    `;
  }).join('');

  contenedor.querySelectorAll('.btn-crear-ticket-gmail').forEach(btn => {
    btn.addEventListener('click', () => abrirModalCrearTicketDesdeCorreo(btn.dataset.messageId));
  });
  contenedor.querySelectorAll('.btn-descartar-correo').forEach(btn => {
    btn.addEventListener('click', () => {
      const correo = correosPendientesCache.find(c => c.messageId === btn.dataset.messageId);
      if (correo) descartarCorreo(correo.messageId, correo.remitente.nombre, correo.asunto);
    });
  });
}

/** Abre un modal para revisar categoría/prioridad antes de crear el ticket. */
function abrirModalCrearTicketDesdeCorreo(messageId) {
  const correo = correosPendientesCache.find(c => c.messageId === messageId);
  if (!correo) return;
  const clasificacion = clasificarPorEtiquetas(correo.labels);

  const html = `
    <h3>Crear ticket desde correo</h3>
    <p><strong>${escaparHtml(correo.remitente.nombre)}</strong> — ${escaparHtml(correo.asunto)}</p>
    <p class="texto-secundario">${escaparHtml(correo.snippet)}</p>
    <div class="form-grupo">
      <label for="modal-correo-categoria">Categoría</label>
      <select id="modal-correo-categoria">${opcionesCategorias(clasificacion.categoria)}</select>
    </div>
    <div class="form-grupo">
      <label for="modal-correo-prioridad">Prioridad</label>
      <select id="modal-correo-prioridad">${opcionesPrioridad(clasificacion.prioridad)}</select>
    </div>
    <div class="modal-acciones">
      <button class="btn btn-secundario" id="modal-correo-cancelar">Cancelar</button>
      <button class="btn btn-primario" id="modal-correo-confirmar">Crear ticket</button>
    </div>
  `;
  abrirModalDetalle(html);

  document.getElementById('modal-correo-cancelar').addEventListener('click', cerrarModalDetalle);
  document.getElementById('modal-correo-confirmar').addEventListener('click', () => {
    const categoria = document.getElementById('modal-correo-categoria').value;
    const prioridad = document.getElementById('modal-correo-prioridad').value;
    crearTicketDesdeGmail(correo, categoria, prioridad);
    cerrarModalDetalle();
    cargarCorreosPendientes();
  });
}

// ============================================================
// SINCRONIZACIÓN MASIVA (botón "Sincronizar Gmail" del header)
// ============================================================

async function syncGmail() {
  if (!gmailConectado()) {
    mostrarToast('Conecta tu cuenta de Gmail primero', 'aviso');
    return;
  }

  mostrarSpinner('Sincronizando con Gmail...');
  try {
    const crudos = await obtenerCorreosCrudos(50);
    const pendientes = filtrarCorreosPendientes(crudos);

    let importados = 0;
    pendientes.forEach(correo => {
      const clasificacion = clasificarPorEtiquetas(correo.labels);
      crearTicketDesdeGmail(correo, clasificacion.categoria, clasificacion.prioridad, true);
      importados++;
    });

    guardarLS('sync_log', {
      ultimaSync: new Date().toISOString(),
      totalImportados: importados
    });

    mostrarToast(`Sincronización completa: ${importados} ticket(s) nuevo(s) importado(s)`, 'exito');
    actualizarHeaderSync();
    cargarCorreosPendientes();
    renderizarTablaTickets();
    actualizarBadgesSidebar();
  } catch (err) {
    console.error(err);
    mostrarToast('Error al sincronizar con Gmail', 'error');
  } finally {
    ocultarSpinner();
  }
}

function actualizarHeaderSync() {
  const el = document.getElementById('header-ultima-sync');
  if (!el) return;
  const log = leerLS('sync_log', null);
  el.textContent = log ? `Última sync: ${formatearFecha(log.ultimaSync)}` : '';
}
