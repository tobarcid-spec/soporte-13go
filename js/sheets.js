// ============================================================
// MÓDULO SHEETS — sincronización de datos con Google Sheets
// ============================================================
// La app usa localStorage como caché rápida y local, y una planilla
// de Google Sheets (en el Drive de la cuenta conectada) como almacén
// central. Así, cualquier navegador/equipo que conecte la misma
// cuenta de Google ve siempre los mismos datos.
//
// Cada registro (ticket, bug, entrada de conocimiento) se guarda como
// una fila [id, JSON.stringify(registro)] en la pestaña de su clave.
// La planilla no está pensada para editarse a mano: es el "backend"
// de la app, igual de simple que localStorage pero centralizado.
// ============================================================

const NOMBRE_HOJA_DATOS = 'Soporte 13GO - Datos';

// Mismo set que CLAVES_BACKUP (app.js) menos lo que no tiene sentido
// sincronizar entre equipos (tokens, ids de etiquetas, logs de Gmail).
const CLAVES_SINCRONIZADAS = ['tickets', 'bugs_log', 'knowledge_base', 'config'];

// Debounce por clave para juntar varias escrituras seguidas en una sola subida.
const temporizadoresSubida = {};

/** true si hay sesión de Google vigente y ya se identificó la planilla a usar. */
function sheetsConectado() {
  return gmailConectado() && !!obtenerSheetId();
}

function obtenerSheetId() {
  return leerLS('sheet_id', null);
}

function guardarSheetId(id) {
  guardarLS('sheet_id', id);
}

/** URL para abrir la planilla directamente desde Configuración. */
function urlHojaDatos() {
  const id = obtenerSheetId();
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : '';
}

// ============================================================
// ORQUESTADOR — buscar/crear la planilla y sincronizar
// ============================================================

/**
 * Punto de entrada: se llama al conectar Google o al restaurar sesión.
 * Busca la planilla de datos en el Drive de la cuenta; si no existe,
 * la crea y la siembra con lo que haya localmente. Si ya existe,
 * descarga su contenido y sobrescribe la caché local.
 */
async function inicializarSincronizacionSheets() {
  if (!gmailConectado()) return;

  try {
    let id = obtenerSheetId();
    let esNueva = false;

    if (id) {
      // Confirmar que el archivo guardado sigue existiendo y accesible
      const existe = await archivoExiste(id);
      if (!existe) id = null;
    }

    if (!id) {
      id = await buscarHojaExistente();
      if (!id) {
        id = await crearHojaDatos();
        esNueva = true;
      }
      guardarSheetId(id);
    }

    if (esNueva) {
      await subirTodosLosDatos();
    } else {
      await descargarDatosDesdeSheet();
    }

    if (typeof renderizarConfiguracion === 'function') renderizarConfiguracion();
  } catch (err) {
    console.error('No se pudo sincronizar con Google Sheets', err);
    mostrarToast('No se pudo sincronizar con Google Sheets. La app sigue funcionando en modo local.', 'aviso');
  }
}

async function archivoExiste(id) {
  try {
    await gapi.client.drive.files.get({ fileId: id, fields: 'id,trashed' });
    return true;
  } catch {
    return false;
  }
}

async function buscarHojaExistente() {
  const res = await gapi.client.drive.files.list({
    q: `name='${NOMBRE_HOJA_DATOS}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id,name)',
    spaces: 'drive'
  });
  const archivos = res.result.files || [];
  return archivos.length > 0 ? archivos[0].id : null;
}

async function crearHojaDatos() {
  const res = await gapi.client.sheets.spreadsheets.create({
    resource: {
      properties: { title: NOMBRE_HOJA_DATOS },
      sheets: CLAVES_SINCRONIZADAS.map(clave => ({ properties: { title: clave } }))
    }
  });
  return res.result.spreadsheetId;
}

// ============================================================
// DESCARGA (pull) — Sheet → localStorage
// ============================================================

async function descargarDatosDesdeSheet() {
  const id = obtenerSheetId();
  if (!id) return;

  for (const clave of CLAVES_SINCRONIZADAS) {
    try {
      const res = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: `${clave}!A:B`
      });
      const filas = res.result.values || [];
      const valor = filasAValor(clave, filas);
      // Se escribe directo en localStorage (sin pasar por guardarLS)
      // para no disparar una subida inmediatamente después de bajar.
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (err) {
      console.error(`No se pudo descargar la pestaña "${clave}" de Sheets`, err);
    }
  }
}

/** Reconstruye el valor (array u objeto) a partir de las filas [id, json] de la pestaña. */
function filasAValor(clave, filas) {
  if (clave === 'config') {
    const fila = filas[0];
    if (!fila || !fila[1]) return obtenerConfig();
    try { return JSON.parse(fila[1]); } catch { return obtenerConfig(); }
  }

  return filas
    .map(fila => {
      try { return JSON.parse(fila[1]); } catch { return null; }
    })
    .filter(Boolean);
}

// ============================================================
// SUBIDA (push) — localStorage → Sheet
// ============================================================

/** Junta varias escrituras seguidas de una misma clave en una sola subida. */
function programarSubidaASheet(clave) {
  if (!sheetsConectado()) return;
  clearTimeout(temporizadoresSubida[clave]);
  temporizadoresSubida[clave] = setTimeout(() => {
    subirDatosASheet(clave).catch(err => {
      console.error(`No se pudo subir "${clave}" a Sheets`, err);
      mostrarToast('No se pudo sincronizar con Sheets, pero el dato sí se guardó localmente', 'aviso');
    });
  }, 800);
}

async function subirDatosASheet(clave) {
  const id = obtenerSheetId();
  if (!id) return;

  const filas = valorAFilas(clave, leerLS(clave, clave === 'config' ? {} : []));

  // Se limpia toda la pestaña y se reescribe completa: más simple y
  // robusto que calcular diffs fila por fila.
  await gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId: id,
    range: `${clave}!A:B`
  });

  if (filas.length > 0) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${clave}!A1`,
      valueInputOption: 'RAW',
      resource: { values: filas }
    });
  }
}

/** Convierte el valor local (array u objeto) en filas [id, json] para subir. */
function valorAFilas(clave, valor) {
  if (clave === 'config') {
    return [['config', JSON.stringify(valor)]];
  }
  return (valor || []).map(registro => [
    registro.id || registro.ticketId || registro.messageId || '',
    JSON.stringify(registro)
  ]);
}

/** Sube de una vez todas las claves sincronizadas (siembra inicial de una planilla nueva). */
async function subirTodosLosDatos() {
  for (const clave of CLAVES_SINCRONIZADAS) {
    await subirDatosASheet(clave);
  }
}
