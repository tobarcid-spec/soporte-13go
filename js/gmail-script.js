// ============================================================
// MÓDULO GMAIL VÍA APPS SCRIPT — alternativa sin Google Cloud
// ============================================================
// Un Google Apps Script (apps-script/Code.gs) corre con la cuenta de
// soporte y expone los correos por una URL protegida con un token.
// Sirve cuando no se pueden crear credenciales OAuth (cuentas
// corporativas sin permiso de administrador).
//
// Limitaciones frente a la API directa: no hay sincronización con
// Google Sheets (los datos se sincronizan por Firebase igual que antes).
// ============================================================

const CLAVE_GMAIL_SCRIPT = 'gmail_script';

// Solo se envía el token a URLs de Apps Script (evita filtrarlo a un host cualquiera).
const REGEX_URL_APPS_SCRIPT = /^https:\/\/script\.google\.com\/(macros|a\/macros\/[^/]+)\/s\/[\w-]+\/exec$/;

/** Se guarda aparte de "config": es un secreto y no debe viajar a la nube. */
function obtenerConfigScript() {
  return leerLS(CLAVE_GMAIL_SCRIPT, { url: '', token: '', email: '' });
}

function modoScriptActivo() {
  const c = obtenerConfigScript();
  return !!(c.url && c.token);
}

/** true si los correos deben leerse por Apps Script (no hay sesión OAuth vigente). */
function usarScriptGmail() {
  return modoScriptActivo() && !tokenValido();
}

async function llamarScript(accion, datos = {}) {
  const c = obtenerConfigScript();
  let res;
  try {
    res = await fetch(c.url, {
      method: 'POST',
      // text/plain evita el preflight CORS, que Apps Script no soporta
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: c.token, accion, ...datos }),
      redirect: 'follow'
    });
  } catch {
    throw new Error('No se pudo contactar al script. Revisa la URL y que el acceso sea «Cualquier usuario».');
  }
  if (!res.ok) throw new Error(`El script respondió HTTP ${res.status}`);

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('El script no devolvió datos válidos. Revisa que la implementación sea «Aplicación web» con acceso «Cualquier usuario».');
  }
  if (!json.ok) throw new Error(json.error || 'Error desconocido en el script');
  return json;
}

/** Guarda URL + token, prueba la conexión y, si falla, deja todo como estaba. */
async function conectarGmailScript(url, token) {
  url = (url || '').trim();
  token = (token || '').trim();
  if (!REGEX_URL_APPS_SCRIPT.test(url)) {
    mostrarToast('La URL debe ser la de la implementación (termina en /exec)', 'error');
    return false;
  }
  if (!token) {
    mostrarToast('Falta el token', 'error');
    return false;
  }

  const anterior = obtenerConfigScript();
  guardarLS(CLAVE_GMAIL_SCRIPT, { url, token, email: '' });
  mostrarSpinner('Probando conexión con el script...');
  try {
    const r = await llamarScript('ping');
    guardarLS(CLAVE_GMAIL_SCRIPT, { url, token, email: r.email || '' });
    mostrarToast('Gmail conectado vía Apps Script: ' + (r.email || ''), 'exito');
    if (typeof onGmailConectado === 'function') onGmailConectado(r.email || '');
    return true;
  } catch (err) {
    guardarLS(CLAVE_GMAIL_SCRIPT, anterior);
    mostrarToast(err.message, 'error');
    return false;
  } finally {
    ocultarSpinner();
  }
}

function desconectarGmailScript() {
  localStorage.removeItem(CLAVE_GMAIL_SCRIPT);
  mostrarToast('Gmail (Apps Script) desconectado', 'aviso');
  if (typeof onGmailDesconectado === 'function') onGmailDesconectado();
}
