// ============================================================
// MÓDULO AUTH — Autenticación OAuth 2.0 con Google (Gmail API)
// ============================================================
// Usa Google Identity Services (GIS) para obtener el token de acceso
// y gapi.client para llamar a la API de Gmail con ese token.
//
// Scope utilizado: gmail.modify
// Permite leer correos, leer etiquetas y modificar etiquetas
// (agregar / quitar). NO permite enviar correos. Es el mínimo necesario.
// ============================================================

const CLIENT_ID = ''; // Google Cloud Console → Credenciales → OAuth 2.0
const API_KEY   = ''; // Google Cloud Console → Credenciales → API Key

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';
const GMAIL_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Cliente de token de Google Identity Services (se crea al iniciar)
let tokenClient = null;

// Bandera: true cuando gapi.client ya cargó el discovery doc de Gmail
let gapiClientListo = false;

/**
 * Obtiene las credenciales a usar: primero las guardadas por el usuario
 * en Configuración (localStorage), y si no existen, las constantes de arriba.
 */
function obtenerCredenciales() {
  const config = obtenerConfig();
  return {
    clientId: config.clientId || CLIENT_ID,
    apiKey: config.apiKey || API_KEY
  };
}

/**
 * Inicializa gapi.client (para llamar a la API de Gmail) y el token
 * client de Google Identity Services (para el flujo OAuth).
 * Se debe llamar una sola vez al cargar la app.
 */
function initAuth() {
  const { clientId, apiKey } = obtenerCredenciales();
  if (!clientId || !apiKey) {
    // Sin credenciales configuradas: no se puede inicializar Gmail todavía
    return;
  }

  // 1. Cargar el cliente de la API de Gmail
  if (typeof gapi !== 'undefined') {
    gapi.load('client', async () => {
      await gapi.client.init({ apiKey });
      await gapi.client.load(GMAIL_DISCOVERY_DOC);
      gapiClientListo = true;
      // Si ya había un token válido guardado, lo aplicamos
      restaurarSesion();
    });
  }

  // 2. Inicializar el cliente de tokens OAuth (Google Identity Services)
  if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: manejarTokenRecibido
    });
  }
}

/**
 * Dispara el flujo de login de Google (abre el popup de consentimiento).
 */
function conectarGmail() {
  const { clientId, apiKey } = obtenerCredenciales();
  if (!clientId || !apiKey) {
    mostrarToast('Primero configura CLIENT_ID y API_KEY en Configuración', 'aviso');
    return;
  }
  if (!tokenClient) {
    initAuth();
  }
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    mostrarToast('No se pudo iniciar el cliente de Google. Revisa tus credenciales.', 'error');
  }
}

/**
 * Callback que recibe el token cuando el usuario autoriza el acceso.
 */
async function manejarTokenRecibido(respuesta) {
  if (respuesta.error) {
    mostrarToast('No se pudo conectar con Gmail: ' + respuesta.error, 'error');
    return;
  }

  const expiraEn = parseInt(respuesta.expires_in, 10) || 3600;
  const expiraEnMs = Date.now() + expiraEn * 1000;

  // Aplicar el token al cliente de gapi para poder llamar a la API
  gapi.client.setToken({ access_token: respuesta.access_token });

  // Obtener el email de la cuenta conectada usando la propia API de Gmail
  let email = '';
  try {
    const perfil = await gapi.client.gmail.users.getProfile({ userId: 'me' });
    email = perfil.result.emailAddress;
  } catch (err) {
    console.error('No se pudo obtener el perfil de Gmail', err);
  }

  const tokenGuardado = {
    access_token: respuesta.access_token,
    expires_at: expiraEnMs,
    email
  };
  localStorage.setItem('gmail_token', JSON.stringify(tokenGuardado));

  // Cargar los IDs reales de las etiquetas de Gmail (necesario para gmail.js)
  if (typeof cargarIdsEtiquetas === 'function') {
    await cargarIdsEtiquetas();
  }

  mostrarToast('Gmail conectado: ' + email, 'exito');

  if (typeof onGmailConectado === 'function') {
    onGmailConectado(email);
  }
}

/**
 * Intenta restaurar la sesión guardada en localStorage al iniciar la app.
 * Si el token sigue vigente, lo aplica a gapi.client automáticamente.
 */
function restaurarSesion() {
  const token = obtenerTokenGuardado();
  if (!token) return;

  if (tokenValido(token)) {
    if (typeof gapi !== 'undefined' && gapi.client) {
      gapi.client.setToken({ access_token: token.access_token });
    }
    if (typeof onGmailConectado === 'function') {
      onGmailConectado(token.email);
    }
  } else {
    // Token vencido: se avisa para que el usuario reconecte
    if (typeof onGmailTokenExpirado === 'function') {
      onGmailTokenExpirado();
    }
  }
}

/**
 * Cierra la sesión de Gmail: revoca el token y limpia localStorage.
 */
function desconectarGmail() {
  const token = obtenerTokenGuardado();
  if (token && typeof google !== 'undefined' && google.accounts) {
    google.accounts.oauth2.revoke(token.access_token, () => {});
  }
  if (typeof gapi !== 'undefined' && gapi.client) {
    gapi.client.setToken(null);
  }
  localStorage.removeItem('gmail_token');
  localStorage.removeItem('gmail_label_ids');
  mostrarToast('Gmail desconectado', 'aviso');

  if (typeof onGmailDesconectado === 'function') {
    onGmailDesconectado();
  }
}

/** Devuelve el token guardado en localStorage, o null si no existe. */
function obtenerTokenGuardado() {
  try {
    return JSON.parse(localStorage.getItem('gmail_token'));
  } catch {
    return null;
  }
}

/** true si hay un token guardado y no está vencido. */
function tokenValido(token) {
  token = token || obtenerTokenGuardado();
  return !!(token && token.expires_at && token.expires_at > Date.now());
}

/** true si actualmente hay una sesión de Gmail activa y vigente. */
function gmailConectado() {
  return tokenValido();
}

/** Devuelve el email de la cuenta conectada, o '' si no hay sesión. */
function obtenerEmailConectado() {
  const token = obtenerTokenGuardado();
  return token ? (token.email || '') : '';
}
