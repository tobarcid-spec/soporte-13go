// ============================================================
// APP — Inicialización, utilidades compartidas y navegación
// Este archivo se carga último porque orquesta todos los demás.
// ============================================================

// ============================================================
// CATEGORÍAS — etiquetas legibles (deben cubrir todo LABEL_MAP
// más las categorías de uso exclusivo en ingreso manual)
// ============================================================
const CATEGORIA_LABELS = {
  caida_firebase: 'Caída de Firebase',
  clave_y_acceso: 'Clave y acceso',
  contenidos: 'Contenidos',
  cuentas_corporativas: 'Cuentas corporativas',
  dar_de_baja: 'Dar de baja',
  flow: 'Flow',
  gift_card: 'Gift card',
  problema_de_facturacion: 'Problema de facturación',
  reactivacion: 'Reactivación',
  reembolso: 'Reembolso',
  samsung_lg: 'Samsung/LG',
  starlink: 'Starlink',
  suscripcion_general: 'Suscripción general',
  sin_clasificar: 'Sin clasificar'
};

/** Tabla de palabras clave sugeridas para crear filtros en Gmail (Wizard + Configuración). */
const FILTROS_GMAIL_SUGERIDOS = [
  { etiqueta: 'Dar de baja', palabras: 'cancelar, finalizar suscripción, dar de baja, terminar plan' },
  { etiqueta: 'Clave y acceso', palabras: 'contraseña, no puedo entrar, cambiar correo, login, acceso' },
  { etiqueta: 'Contenidos', palabras: 'no carga, error, capítulo, reproduce, video, contenido' },
  { etiqueta: 'Cuentas corporativas', palabras: 'empresa, corporativo, RUT, factura' },
  { etiqueta: 'Gift card', palabras: 'gift card, giftcard, código, tarjeta regalo, canjear' },
  { etiqueta: 'Problema de facturación', palabras: 'cobro, cargo, facturación, pago, tarjeta, rechazada' },
  { etiqueta: 'Reactivación', palabras: 'reactivar, volver a activar, reactivación' },
  { etiqueta: 'Reembolso', palabras: 'reembolso, devolución, devolver dinero, reintegro' },
  { etiqueta: 'Samsung/LG', palabras: 'samsung, LG, televisor, smart tv' },
  { etiqueta: 'Starlink', palabras: 'starlink, satelital' },
  { etiqueta: 'Caida de Firebase', palabras: 'no puedo entrar, caída, todos los usuarios, servicio caído' }
];

// ============================================================
// PERSISTENCIA GENÉRICA (localStorage + JSON)
// ============================================================

function leerLS(clave, valorPorDefecto) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo === null ? valorPorDefecto : JSON.parse(crudo);
  } catch {
    return valorPorDefecto;
  }
}

function guardarLS(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
  // Sheets sync (legacy — requiere GCP)
  if (typeof CLAVES_SINCRONIZADAS !== 'undefined' && CLAVES_SINCRONIZADAS.includes(clave)
    && typeof programarSubidaASheet === 'function') {
    programarSubidaASheet(clave);
  }
  // Firebase sync (activo cuando hay sesión)
  if (typeof CLAVES_FIRESTORE !== 'undefined' && CLAVES_FIRESTORE.includes(clave)
    && typeof programarSubidaFirestore === 'function'
    && typeof firebaseConectado === 'function' && firebaseConectado()) {
    programarSubidaFirestore(clave);
  }
}

function obtenerConfig() {
  return leerLS('config', { nombreArea: '', responsable: '', clientId: '', apiKey: '' });
}

function guardarConfig(cambios) {
  const actual = obtenerConfig();
  guardarLS('config', { ...actual, ...cambios });
}

// ============================================================
// LOGO DE LA EMPRESA
// ============================================================
// Se guarda aparte de "config" (no en CLAVES_SINCRONIZADAS) a propósito:
// Google Sheets limita cada celda a 50.000 caracteres, y una imagen en
// base64 puede superar eso fácilmente. El logo queda solo en este
// navegador/equipo, pero viaja en el backup/restauración de JSON.
const LOGO_MAX_BYTES = 500 * 1024; // 500 KB

function obtenerLogoEmpresa() {
  return leerLS('logo_empresa', '');
}

function guardarLogoEmpresa(dataUrl) {
  guardarLS('logo_empresa', dataUrl);
}

/** Refleja el logo configurado (o el ícono por defecto) en el sidebar. */
function actualizarLogoSidebar() {
  const logo = obtenerLogoEmpresa();
  const img = document.getElementById('sidebar-logo-empresa');
  const iconoDefecto = document.getElementById('sidebar-icono-defecto');
  if (!img || !iconoDefecto) return;

  if (logo) {
    img.src = logo;
    img.classList.remove('oculto');
    iconoDefecto.classList.add('oculto');
  } else {
    img.classList.add('oculto');
    iconoDefecto.classList.remove('oculto');
  }
}

// ============================================================
// HELPERS DE FORMATO
// ============================================================

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return fecha.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatearCategoria(categoria) {
  return CATEGORIA_LABELS[categoria] || categoria;
}

function opcionesCategorias(seleccionada, incluirVacia = false) {
  let html = incluirVacia ? '' : '';
  html += Object.entries(CATEGORIA_LABELS)
    .map(([clave, etiqueta]) => `<option value="${clave}" ${clave === seleccionada ? 'selected' : ''}>${etiqueta}</option>`)
    .join('');
  return html;
}

function opcionesPrioridad(seleccionada) {
  const prioridades = ['P1-Critico', 'P2-Alto', 'P3-Normal', 'P4-Menor'];
  const etiquetas = { 'P1-Critico': 'P1 Crítico', 'P2-Alto': 'P2 Alto', 'P3-Normal': 'P3 Normal', 'P4-Menor': 'P4 Menor' };
  return prioridades.map(p => `<option value="${p}" ${p === seleccionada ? 'selected' : ''}>${etiquetas[p]}</option>`).join('');
}

// ============================================================
// TOASTS
// ============================================================

function mostrarToast(mensaje, tipo = '') {
  const contenedor = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (tipo ? ` toast-${tipo}` : '');
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// SPINNER GLOBAL
// ============================================================

function mostrarSpinner(texto) {
  document.getElementById('spinner-texto').textContent = texto || 'Cargando...';
  document.getElementById('spinner-overlay').classList.remove('oculto');
}

function ocultarSpinner() {
  document.getElementById('spinner-overlay').classList.add('oculto');
}

// ============================================================
// MODAL DE CONFIRMACIÓN GENÉRICO
// ============================================================

function mostrarConfirmacion(opciones) {
  const modal = document.getElementById('modal-confirmar');
  const btnAceptar = document.getElementById('modal-confirmar-aceptar');
  const btnCancelar = document.getElementById('modal-confirmar-cancelar');
  const extra = document.getElementById('modal-confirmar-extra');

  document.getElementById('modal-confirmar-titulo').textContent = opciones.titulo || '¿Estás seguro?';
  document.getElementById('modal-confirmar-mensaje').textContent = opciones.mensaje || '';
  btnAceptar.textContent = opciones.textoConfirmar || 'Confirmar';
  btnAceptar.className = 'btn ' + (opciones.peligro ? 'btn-peligro' : 'btn-primario');

  extra.innerHTML = opciones.requierePalabra
    ? `<div class="form-grupo"><label>Escribe "${opciones.requierePalabra}" para confirmar</label><input type="text" id="modal-confirmar-input-palabra"></div>`
    : '';

  modal.classList.remove('oculto');

  function limpiarYcerrar() {
    modal.classList.add('oculto');
    btnAceptar.removeEventListener('click', manejarAceptar);
    btnCancelar.removeEventListener('click', manejarCancelar);
  }
  function manejarAceptar() {
    if (opciones.requierePalabra) {
      const valor = document.getElementById('modal-confirmar-input-palabra').value;
      if (valor !== opciones.requierePalabra) {
        mostrarToast(`Debes escribir exactamente "${opciones.requierePalabra}"`, 'error');
        return;
      }
    }
    limpiarYcerrar();
    opciones.onConfirmar?.();
  }
  function manejarCancelar() { limpiarYcerrar(); }

  btnAceptar.addEventListener('click', manejarAceptar);
  btnCancelar.addEventListener('click', manejarCancelar);
}

// ============================================================
// MODAL GENÉRICO DE DETALLE (ticket, escalamiento, correo Gmail)
// ============================================================

function abrirModalDetalle(html) {
  document.getElementById('detalle-ticket-contenido').innerHTML = html;
  document.getElementById('modal-detalle-ticket').classList.remove('oculto');
}

function cerrarModalDetalle() {
  document.getElementById('modal-detalle-ticket').classList.add('oculto');
}

// ============================================================
// BADGES DE CONTEO EN SIDEBAR
// ============================================================

function actualizarBadgesSidebar() {
  const casosActivos = obtenerTickets().filter(t => t.estado === 'abierto').length;
  const escalamientos = obtenerEscalamientosActivos().length;
  document.getElementById('badge-casos-activos').textContent = casosActivos;
  document.getElementById('badge-escalamientos').textContent = escalamientos;
}

// ============================================================
// NAVEGACIÓN ENTRE MÓDULOS
// ============================================================

const TITULOS_MODULO = {
  'nuevo-caso': 'Nuevo caso',
  'casos-activos': 'Casos activos',
  'bugs': 'Bugs y escalamientos',
  'conocimiento': 'Base de conocimiento',
  'reporte': 'Reporte semanal',
  'configuracion': 'Configuración'
};

function cambiarModulo(nombre) {
  document.querySelectorAll('.modulo').forEach(m => m.classList.add('oculto'));
  document.getElementById('modulo-' + nombre)?.classList.remove('oculto');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('activo', n.dataset.modulo === nombre));
  document.getElementById('header-modulo-titulo').textContent = TITULOS_MODULO[nombre] || '';

  if (nombre === 'nuevo-caso') {
    cargarCorreosPendientes();
    actualizarPlantillasManual(); // refresca por si se agregaron entradas en Base de Conocimiento
  }
  if (nombre === 'casos-activos') renderizarTablaTickets();
  if (nombre === 'bugs') renderizarModuloBugs();
  if (nombre === 'conocimiento') renderizarListaConocimiento();
  if (nombre === 'reporte') renderizarReporte();
  if (nombre === 'configuracion') renderizarConfiguracion();

  actualizarBadgesSidebar();
}

function inicializarNavegacionSidebar() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => cambiarModulo(btn.dataset.modulo));
  });
}

function inicializarTabsNuevoCaso() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      document.querySelectorAll('.tab-contenido').forEach(c => c.classList.remove('activo'));
      document.getElementById(btn.dataset.tab).classList.add('activo');
      if (btn.dataset.tab === 'tab-gmail') cargarCorreosPendientes();
    });
  });
}

// ============================================================
// CALLBACKS DE AUTENTICACIÓN (invocados desde js/auth.js)
// ============================================================

function onGmailConectado(email) {
  renderizarConfiguracion();
  cargarCorreosPendientes();
  if (typeof actualizarHeaderSync === 'function') actualizarHeaderSync();
}

function onGmailDesconectado() {
  renderizarConfiguracion();
  cargarCorreosPendientes();
}

function onGmailTokenExpirado() {
  mostrarToast('Tu sesión de Gmail expiró. Reconéctate desde Configuración.', 'aviso');
  renderizarConfiguracion();
}

// ============================================================
// CALLBACKS DE FIREBASE (invocados desde js/firebase.js)
// ============================================================

function mostrarPantallaLogin() {
  document.getElementById('pantalla-login').classList.remove('oculto');
  document.getElementById('app').classList.add('oculto');
  document.getElementById('wizard').classList.add('oculto');
}

function ocultarPantallaLogin() {
  document.getElementById('pantalla-login').classList.add('oculto');
}

function onFirebaseConectado(email) {
  ocultarPantallaLogin();

  // Header
  document.getElementById('header-cuenta-gmail').classList.remove('oculto');
  document.getElementById('header-cuenta-gmail-email').textContent = email;

  // Botón sidebar
  const btnSidebar = document.getElementById('btn-conectar-gmail-sidebar');
  btnSidebar.innerHTML = '<i class="ti ti-logout"></i> Cerrar sesión';
  btnSidebar.classList.replace('btn-secundario', 'btn-peligro');
  btnSidebar.disabled = false;

  // Mostrar app (wizard si es primera vez, app normal si ya está configurado)
  mostrarWizardSiNecesario();

  renderizarConfiguracion();
  actualizarBadgesSidebar();
  actualizarLogoSidebar();
  renderizarTablaTickets();
  renderizarModuloBugs();
  renderizarListaConocimiento();
}

function onFirebaseDesconectado() {
  mostrarPantallaLogin();

  // Header
  document.getElementById('header-cuenta-gmail').classList.add('oculto');

  // Botón sidebar
  const btnSidebar = document.getElementById('btn-conectar-gmail-sidebar');
  btnSidebar.innerHTML = '<i class="ti ti-brand-google"></i> Iniciar sesión';
  btnSidebar.classList.replace('btn-peligro', 'btn-secundario');
  btnSidebar.disabled = false;
}

// ============================================================
// MÓDULO 6 — CONFIGURACIÓN
// ============================================================

function renderizarConfiguracion() {
  const config = obtenerConfig();

  document.getElementById('config-nombre-area').value = config.nombreArea || '';
  document.getElementById('config-responsable').value = config.responsable || '';
  document.getElementById('config-client-id').value = config.clientId || '';
  document.getElementById('config-api-key').value = config.apiKey || '';

  const logo = obtenerLogoEmpresa();
  const logoPreview = document.getElementById('config-logo-preview');
  const btnQuitarLogo = document.getElementById('btn-quitar-logo');
  logoPreview.src = logo || '';
  logoPreview.classList.toggle('oculto', !logo);
  btnQuitarLogo.classList.toggle('oculto', !logo);

  // Estado de Firebase (cuenta principal)
  const estadoFirebase = document.getElementById('config-firebase-estado');
  if (estadoFirebase) {
    const fbConectado = typeof firebaseConectado === 'function' && firebaseConectado();
    estadoFirebase.className = 'aviso-caja ' + (fbConectado ? 'aviso-ok' : 'aviso-alerta');
    estadoFirebase.innerHTML = fbConectado
      ? `<i class="ti ti-cloud-check"></i><p>Conectado como <strong>${escaparHtml(obtenerEmailFirebase())}</strong>. Datos sincronizados en la nube.</p>`
      : `<i class="ti ti-cloud-off"></i><p>Sin sesión. Inicia sesión con Google para sincronizar datos entre navegadores.</p>`;
    document.getElementById('btn-login-firebase-config')?.classList.toggle('oculto', fbConectado);
    document.getElementById('btn-logout-firebase-config')?.classList.toggle('oculto', !fbConectado);
    document.getElementById('btn-forzar-sync-firebase')?.classList.toggle('oculto', !fbConectado);
  }

  // Estado de Gmail API (opcional, requiere GCP)
  const estadoDiv = document.getElementById('config-gmail-estado');
  const conectado = gmailConectado();
  estadoDiv.className = 'aviso-caja ' + (conectado ? 'aviso-ok' : 'aviso-alerta');
  estadoDiv.innerHTML = conectado
    ? `<i class="ti ti-mail-check"></i><p>Gmail API conectado como <strong>${escaparHtml(obtenerEmailConectado())}</strong></p>`
    : `<i class="ti ti-mail-off"></i><p>Gmail API no conectado. Requiere credenciales de Google Cloud Console.</p>`;

  document.getElementById('btn-conectar-gmail-config').classList.toggle('oculto', conectado);
  document.getElementById('btn-desconectar-gmail').classList.toggle('oculto', !conectado);

  // Estado de sincronización con Google Sheets (almacén central de datos)
  const estadoSheets = document.getElementById('config-sheets-estado');
  if (estadoSheets) {
    const sincronizado = typeof sheetsConectado === 'function' && sheetsConectado();
    estadoSheets.className = 'aviso-caja ' + (sincronizado ? 'aviso-ok' : 'aviso-alerta');
    estadoSheets.innerHTML = sincronizado
      ? `<i class="ti ti-cloud-check"></i><p>Datos sincronizados con <a href="${urlHojaDatos()}" target="_blank">Google Sheets</a>. Disponibles desde cualquier navegador conectado a esta cuenta.</p>`
      : `<i class="ti ti-cloud-off"></i><p>Sin sincronizar. Conecta Gmail/Google para guardar los datos también en una planilla y verlos desde cualquier navegador.</p>`;
  }
  document.getElementById('btn-forzar-sync-sheets')?.classList.toggle('oculto', !conectado);

  // Tabla de filtros sugeridos
  const tablaFiltros = document.getElementById('config-tabla-filtros');
  tablaFiltros.innerHTML = `
    <thead><tr><th>Etiqueta</th><th>Palabras clave sugeridas</th></tr></thead>
    <tbody>${FILTROS_GMAIL_SUGERIDOS.map(f => `<tr><td>${f.etiqueta}</td><td>${f.palabras}</td></tr>`).join('')}</tbody>
  `;

  // Filtros de descarte editables
  const filtros = obtenerFiltrosDescarte();
  renderizarListaEditable(document.getElementById('lista-remitentes-ignorados'), filtros.remitentes, indice => {
    filtros.remitentes.splice(indice, 1);
    guardarFiltrosDescarte(filtros);
    renderizarConfiguracion();
  });
  renderizarListaEditable(document.getElementById('lista-etiquetas-ignoradas'), filtros.etiquetas, indice => {
    filtros.etiquetas.splice(indice, 1);
    guardarFiltrosDescarte(filtros);
    renderizarConfiguracion();
  });

  renderizarLogDescartados();
}

function renderizarListaEditable(ul, items, onEliminar) {
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="texto-secundario">Sin elementos.</li>';
    return;
  }
  ul.innerHTML = items.map((item, i) => `<li>${escaparHtml(item)}<button data-index="${i}" title="Quitar">&times;</button></li>`).join('');
  ul.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', () => onEliminar(parseInt(btn.dataset.index, 10)));
  });
}

function renderizarLogDescartados() {
  const tbody = document.getElementById('tabla-descartados-body');
  if (!tbody) return;

  const lista = leerLS('correos_descartados', []).slice().sort((a, b) => new Date(b.fechaDescarte) - new Date(a.fechaDescarte));

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="lista-vacia">Sin correos descartados.</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td>${formatearFecha(c.fechaDescarte)}</td>
      <td>${escaparHtml(c.remitente)}</td>
      <td>${escaparHtml(c.asunto)}</td>
      <td>${c.motivo}</td>
      <td><button class="btn btn-secundario btn-restaurar-descartado" data-message-id="${c.messageId}">Restaurar</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-restaurar-descartado').forEach(btn => {
    btn.addEventListener('click', () => restaurarCorreoDescartado(btn.dataset.messageId));
  });
}

function inicializarModuloConfiguracion() {
  document.getElementById('btn-guardar-identidad').addEventListener('click', () => {
    guardarConfig({
      nombreArea: document.getElementById('config-nombre-area').value,
      responsable: document.getElementById('config-responsable').value
    });
    mostrarToast('Identidad guardada', 'exito');
  });

  document.getElementById('config-logo-input').addEventListener('change', evento => {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    if (archivo.size > LOGO_MAX_BYTES) {
      mostrarToast('El logo es muy pesado (máx. 500 KB). Usa una imagen más liviana.', 'error');
      evento.target.value = '';
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      guardarLogoEmpresa(lector.result);
      mostrarToast('Logo guardado', 'exito');
      renderizarConfiguracion();
      actualizarLogoSidebar();
    };
    lector.readAsDataURL(archivo);
  });

  document.getElementById('btn-quitar-logo').addEventListener('click', () => {
    guardarLogoEmpresa('');
    document.getElementById('config-logo-input').value = '';
    mostrarToast('Logo eliminado', 'aviso');
    renderizarConfiguracion();
    actualizarLogoSidebar();
  });

  document.getElementById('btn-guardar-credenciales').addEventListener('click', () => {
    guardarConfig({
      clientId: document.getElementById('config-client-id').value.trim(),
      apiKey: document.getElementById('config-api-key').value.trim()
    });
    initAuth();
    mostrarToast('Credenciales guardadas', 'exito');
  });

  // Firebase Auth
  document.getElementById('btn-login-firebase-config')?.addEventListener('click', loginConGoogle);
  document.getElementById('btn-logout-firebase-config')?.addEventListener('click', logoutFirebase);
  document.getElementById('btn-forzar-sync-firebase')?.addEventListener('click', forzarSyncFirestore);

  // Gmail API (requiere GCP)
  document.getElementById('btn-conectar-gmail-config').addEventListener('click', conectarGmail);
  document.getElementById('btn-desconectar-gmail').addEventListener('click', desconectarGmail);

  document.getElementById('btn-forzar-sync-sheets')?.addEventListener('click', async () => {
    mostrarSpinner('Sincronizando con Google Sheets...');
    await inicializarSincronizacionSheets();
    ocultarSpinner();
    mostrarToast('Sincronización con Sheets completada', 'exito');
    renderizarTablaTickets();
    renderizarModuloBugs();
    renderizarListaConocimiento();
    actualizarBadgesSidebar();
  });

  document.getElementById('btn-agregar-remitente').addEventListener('click', () => {
    const input = document.getElementById('input-nuevo-remitente');
    const valor = input.value.trim().toLowerCase();
    if (!valor) return;
    const filtros = obtenerFiltrosDescarte();
    if (!filtros.remitentes.includes(valor)) filtros.remitentes.push(valor);
    guardarFiltrosDescarte(filtros);
    input.value = '';
    renderizarConfiguracion();
  });

  document.getElementById('btn-agregar-etiqueta-ignorada').addEventListener('click', () => {
    const input = document.getElementById('input-nueva-etiqueta-ignorada');
    const valor = input.value.trim();
    if (!valor) return;
    const filtros = obtenerFiltrosDescarte();
    if (!filtros.etiquetas.includes(valor)) filtros.etiquetas.push(valor);
    guardarFiltrosDescarte(filtros);
    input.value = '';
    renderizarConfiguracion();
  });

  document.getElementById('btn-limpiar-descartados').addEventListener('click', () => {
    mostrarConfirmacion({
      titulo: 'Limpiar log de descartados',
      mensaje: '¿Eliminar todos los correos del log de descartados? Esta acción no se puede deshacer.',
      textoConfirmar: 'Limpiar',
      peligro: true,
      onConfirmar: () => {
        guardarLS('correos_descartados', []);
        mostrarToast('Log de descartados limpiado', 'aviso');
        renderizarConfiguracion();
      }
    });
  });

  document.getElementById('btn-exportar-backup').addEventListener('click', exportarBackupCompleto);
  document.getElementById('input-importar-backup').addEventListener('change', importarBackupCompleto);

  document.getElementById('btn-limpiar-todo').addEventListener('click', () => {
    mostrarConfirmacion({
      titulo: 'Limpiar todos los datos',
      mensaje: '¿Estás seguro? Esto eliminará TODOS los tickets, escalamientos, conocimiento y configuración.',
      textoConfirmar: 'Sí, continuar',
      peligro: true,
      onConfirmar: () => {
        mostrarConfirmacion({
          titulo: 'Confirmación final',
          mensaje: 'Esta acción es irreversible.',
          textoConfirmar: 'Eliminar todo',
          peligro: true,
          requierePalabra: 'CONFIRMAR',
          onConfirmar: () => {
            localStorage.clear();
            mostrarToast('Todos los datos fueron eliminados', 'aviso');
            setTimeout(() => location.reload(), 800);
          }
        });
      }
    });
  });
}

const CLAVES_BACKUP = [
  'tickets', 'correos_descartados', 'bugs_log', 'knowledge_base',
  'config', 'gmail_label_ids', 'sync_log', 'filtros_descarte', 'sheet_id',
  'logo_empresa'
];

function exportarBackupCompleto() {
  const datos = {};
  CLAVES_BACKUP.forEach(clave => { datos[clave] = leerLS(clave, null); });
  const fecha = new Date().toISOString().slice(0, 10);
  descargarArchivo(`backup-soporte-13go-${fecha}.json`, JSON.stringify(datos, null, 2), 'application/json');
  mostrarToast('Backup exportado', 'exito');
}

function importarBackupCompleto(evento) {
  const archivo = evento.target.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      CLAVES_BACKUP.forEach(clave => {
        if (datos[clave] !== undefined && datos[clave] !== null) guardarLS(clave, datos[clave]);
      });
      mostrarToast('Datos importados correctamente. Recargando...', 'exito');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      console.error(err);
      mostrarToast('El archivo no es un backup válido', 'error');
    }
  };
  lector.readAsText(archivo);
  evento.target.value = '';
}

// ============================================================
// PANTALLA DE BIENVENIDA — WIZARD DE 3 PASOS
// ============================================================

function mostrarWizardSiNecesario() {
  const config = obtenerConfig();
  const yaConfigurado = !!(config.nombreArea && config.responsable);

  if (yaConfigurado) {
    document.getElementById('wizard').classList.add('oculto');
    document.getElementById('app').classList.remove('oculto');
  } else {
    document.getElementById('wizard').classList.remove('oculto');
    document.getElementById('app').classList.add('oculto');
    inicializarWizard();
  }
}

function inicializarWizard() {
  // Poblar tabla de filtros del paso 3
  document.querySelector('#wizard-tabla-filtros tbody').innerHTML =
    FILTROS_GMAIL_SUGERIDOS.map(f => `<tr><td>${f.etiqueta}</td><td>${f.palabras}</td></tr>`).join('');

  function irAPaso(numero) {
    document.querySelectorAll('.wizard-paso').forEach(p => p.classList.add('oculto'));
    document.getElementById('wizard-paso-' + numero).classList.remove('oculto');
    document.querySelectorAll('.wizard-paso-indicador').forEach(ind => {
      ind.classList.toggle('activo', parseInt(ind.dataset.paso, 10) === numero);
    });
  }

  document.getElementById('wizard-siguiente-1').addEventListener('click', () => {
    const nombreArea = document.getElementById('wizard-nombre-area').value.trim();
    const responsable = document.getElementById('wizard-responsable').value.trim();
    if (!nombreArea || !responsable) {
      mostrarToast('Completa el nombre del área y del responsable', 'aviso');
      return;
    }
    guardarConfig({ nombreArea, responsable });
    irAPaso(2);
  });

  document.getElementById('wizard-conectar-gmail').addEventListener('click', () => {
    const clientId = document.getElementById('wizard-client-id').value.trim();
    const apiKey = document.getElementById('wizard-api-key').value.trim();
    if (!clientId || !apiKey) {
      mostrarToast('Ingresa CLIENT_ID y API_KEY, o salta este paso', 'aviso');
      return;
    }
    guardarConfig({ clientId, apiKey });
    initAuth();
    setTimeout(conectarGmail, 300); // pequeño margen para que gapi/GIS terminen de inicializar
    irAPaso(3);
  });

  document.getElementById('wizard-saltar-gmail').addEventListener('click', e => {
    e.preventDefault();
    irAPaso(3);
  });

  document.getElementById('wizard-finalizar').addEventListener('click', () => {
    document.getElementById('wizard').classList.add('oculto');
    document.getElementById('app').classList.remove('oculto');
    cambiarModulo('casos-activos');
  });
}

// ============================================================
// BOTONES GLOBALES (header, sidebar)
// ============================================================

function inicializarBotonesGlobales() {
  document.getElementById('btn-sincronizar-gmail').addEventListener('click', syncGmail);
  document.getElementById('btn-conectar-gmail-sidebar').addEventListener('click', () => {
    if (typeof firebaseConectado === 'function' && firebaseConectado()) {
      logoutFirebase();
    } else {
      loginConGoogle();
    }
  });
  document.getElementById('cerrar-detalle-ticket').addEventListener('click', cerrarModalDetalle);
}

// ============================================================
// INICIALIZACIÓN GENERAL DE LA APP
// ============================================================

function inicializarApp() {
  // Mostrar pantalla de login mientras Firebase verifica la sesión
  mostrarPantallaLogin();
  document.getElementById('btn-login-google').addEventListener('click', loginConGoogle);

  inicializarFirebase(); // Firebase Auth + Firestore (primario)
  initAuth();            // Gmail OAuth (secundario — requiere GCP)
  // No llamar mostrarWizardSiNecesario() aquí — lo hace onFirebaseConectado

  // Se siembra antes que el formulario manual, que depende de estos datos
  // para poblar el combo de "Plantilla sugerida" por categoría.
  inicializarBaseConocimiento();

  inicializarNavegacionSidebar();
  inicializarTabsNuevoCaso();
  inicializarFormularioManual();
  inicializarFiltrosCasosActivos();
  inicializarModuloConocimiento();
  inicializarModuloReporte();
  inicializarModuloConfiguracion();
  inicializarBotonesGlobales();

  actualizarBadgesSidebar();
  actualizarHeaderSync();
  actualizarLogoSidebar();
  cambiarModulo('nuevo-caso');
}

document.addEventListener('DOMContentLoaded', inicializarApp);
