// ============================================================
// SOPORTE 13GO — Puente de Gmail (Google Apps Script)
// ============================================================
// Alternativa a la API de Gmail con credenciales de Google Cloud.
// Se ejecuta con TU cuenta (la del correo de soporte): no necesita
// que un administrador cree credenciales.
//
// INSTALACIÓN (≈5 minutos)
// 1. Entra a https://script.google.com con la cuenta de soporte → "Nuevo proyecto".
// 2. Borra el contenido y pega TODO este archivo.
// 3. Cambia TOKEN (abajo) por una clave larga y aleatoria (mín. 24 caracteres).
// 4. Implementar → Nueva implementación → tipo "Aplicación web":
//      - Ejecutar como: Yo
//      - Quién tiene acceso: Cualquier usuario
//    Google pedirá permiso para leer/etiquetar tu Gmail: acéptalo
//    ("Configuración avanzada" → "Ir a … (no seguro)": es tu propio script).
// 5. Copia la URL que termina en /exec y pégala en la app, en
//    Configuración → "Gmail vía Apps Script", junto con el TOKEN.
//
// SEGURIDAD
// - La URL sola no sirve: toda petición debe traer el TOKEN.
// - El script LEE correos sin leer de la bandeja de entrada, APLICA
//   etiquetas de estado y CREA BORRADORES de respuesta.
//   No envía, no borra, no archiva.
// - Si el TOKEN se filtra, cámbialo aquí y vuelve a implementar.
// ============================================================

const TOKEN = 'CAMBIA-ESTE-TEXTO-POR-UNA-CLAVE-LARGA';
const MAX_CORREOS = 50;

// Estado del ticket → etiqueta de Gmail (misma lógica que usa la app con la API).
const ETIQUETAS_ESTADO = {
  abierto: 'Pendiente',
  resuelto: 'Resuelto',
  escalado: 'Reactivación'
};

function doGet() {
  return salida({ ok: true, mensaje: 'Puente Soporte 13GO activo' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return salida({ ok: false, error: 'Petición inválida' });
  }

  if (!TOKEN || TOKEN.indexOf('CAMBIA-ESTE') === 0) {
    return salida({ ok: false, error: 'Falta configurar el TOKEN dentro del script' });
  }
  if (req.token !== TOKEN) {
    return salida({ ok: false, error: 'Token inválido' });
  }

  try {
    switch (req.accion) {
      case 'ping':
        return salida({ ok: true, email: Session.getEffectiveUser().getEmail() });
      case 'correos':
        return salida({ ok: true, correos: listarCorreos(req.max) });
      case 'etiquetar':
        etiquetar(req.messageId, req.estado);
        return salida({ ok: true });
      case 'borrador':
        return salida({ ok: true, para: crearBorrador(req.messageId, req.texto, req.correoCliente) });
      default:
        return salida({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return salida({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** Correos sin leer de la bandeja de entrada, del más nuevo al más antiguo. */
function listarCorreos(max) {
  const limite = Math.max(1, Math.min(Number(max) || MAX_CORREOS, 100));
  const hilos = GmailApp.search('in:inbox is:unread', 0, limite);
  const correos = [];

  hilos.forEach(function (hilo) {
    const etiquetas = hilo.getLabels().map(function (l) { return l.getName(); });
    hilo.getMessages().forEach(function (m) {
      if (!m.isUnread()) return;
      correos.push({
        messageId: m.getId(),
        threadId: hilo.getId(),
        fecha: m.getDate().toISOString(),
        from: m.getFrom(),
        asunto: m.getSubject() || '(sin asunto)',
        snippet: m.getPlainBody().replace(/\s+/g, ' ').trim().slice(0, 200),
        labels: etiquetas
      });
    });
  });

  correos.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
  return correos.slice(0, limite);
}

/** Deja en el correo solo la etiqueta del estado indicado (crea la etiqueta si no existe). */
function etiquetar(messageId, estado) {
  const nombre = ETIQUETAS_ESTADO[estado];
  if (!messageId || !nombre) throw new Error('Estado o mensaje inválido');

  const hilo = GmailApp.getMessageById(messageId).getThread();
  Object.keys(ETIQUETAS_ESTADO).forEach(function (clave) {
    const otro = ETIQUETAS_ESTADO[clave];
    if (otro === nombre) return;
    const etiqueta = GmailApp.getUserLabelByName(otro);
    if (etiqueta) hilo.removeLabel(etiqueta);
  });
  hilo.addLabel(GmailApp.getUserLabelByName(nombre) || GmailApp.createLabel(nombre));
}

/**
 * Crea (sin enviar) un borrador de respuesta dentro del mismo hilo. Responde al
 * último mensaje del cliente; si no lo encuentra, al correo original del ticket.
 * Devuelve el destinatario del borrador para que la app lo muestre.
 */
function crearBorrador(messageId, texto, correoCliente) {
  if (!messageId || !String(texto || '').trim()) throw new Error('Falta el correo o el texto');

  const original = GmailApp.getMessageById(messageId);
  const buscado = String(correoCliente || '').trim().toLowerCase();
  let responderA = original;

  if (buscado) {
    original.getThread().getMessages().forEach(function (m) {
      const de = m.getFrom();
      const coincide = de.match(/<([^>]+)>/);
      const direccion = (coincide ? coincide[1] : de).trim().toLowerCase();
      if (!m.isDraft() && direccion === buscado) responderA = m;
    });
  }

  return responderA.createDraftReply(String(texto)).getMessage().getTo();
}

function salida(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
