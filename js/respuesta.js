// ============================================================
// MÓDULO RESPUESTA — plantillas dentro del ticket
// ============================================================
// Arma la respuesta desde la Base de conocimiento y la deja como
// BORRADOR en el mismo hilo de Gmail (vía Apps Script). La app nunca
// envía correos: la persona revisa el borrador y lo envía desde Gmail.
// ============================================================

const FIRMA_RESPUESTA = 'Equipo 13Go';

// Despedidas con nombre de equipo que ya traen las plantillas ("Soporte 13GO", etc.)
const REGEX_FIRMA_EXISTENTE = /^(soporte\s+)?(equipo\s+)?13\s*go\.?$/i;

// Datos que se deben completar antes de crear el borrador
const REGEX_DATOS_PENDIENTES = /\((nombre del usuario|nombre|correo|fecha|hora|día|mes)\)/gi;

/** Primer nombre del remitente, o '' si no hay un nombre confiable (p. ej. solo un correo). */
function primerNombreDe(remitente) {
  let nombre = (remitente?.nombre || '').trim();
  if (!nombre || nombre.includes('@')) return '';
  if (nombre.includes(',')) nombre = nombre.split(',')[1].trim(); // "Pérez, Ana"
  const primero = nombre.split(/\s+/)[0] || '';
  if (!/^\p{L}{2,}/u.test(primero)) return '';
  const uniforme = primero === primero.toLowerCase() || primero === primero.toUpperCase();
  return uniforme ? primero[0].toUpperCase() + primero.slice(1).toLowerCase() : primero;
}

/** Reemplaza (Nombre) y deja una sola firma al final. */
function prepararTextoRespuesta(plantilla, remitente) {
  let texto = (plantilla || '').trim();
  if (!texto) return '';

  const nombre = primerNombreDe(remitente);
  if (nombre) texto = texto.replace(/\(Nombre\)/g, nombre);

  const lineas = texto.split('\n');
  if (REGEX_FIRMA_EXISTENTE.test(lineas[lineas.length - 1].trim())) lineas.pop();
  const cuerpo = lineas.join('\n').trimEnd();

  // "Saludos cordiales," + firma van juntas; en otro caso, línea en blanco antes
  return cuerpo + (cuerpo.endsWith(',') ? '\n' : '\n\n') + FIRMA_RESPUESTA;
}

function datosPendientes(texto) {
  return [...new Set((texto || '').match(REGEX_DATOS_PENDIENTES) || [])];
}

// ============================================================
// UI DENTRO DEL DETALLE DEL TICKET
// ============================================================

/** <option>s de plantillas: primero las de la categoría, luego el resto. */
function opcionesPlantillasRespuesta(categoria) {
  const base = obtenerBaseConocimiento();
  const propias = base.filter(e => e.categoria === categoria);
  const otras = base.filter(e => e.categoria !== categoria);
  const sugerida = (typeof PLANTILLA_POR_CATEGORIA !== 'undefined') ? PLANTILLA_POR_CATEGORIA[categoria] : null;
  const elegida = propias.find(e => e.origenPlantilla === sugerida) || propias[0] || null;

  const opcion = e => `<option value="${escaparHtml(e.id)}" ${e === elegida ? 'selected' : ''}>${escaparHtml(e.titulo)}</option>`;

  return `<option value="">(Escribir sin plantilla)</option>` +
    (propias.length ? `<optgroup label="De esta categoría">${propias.map(opcion).join('')}</optgroup>` : '') +
    (otras.length ? `<optgroup label="Otras categorías">${otras.map(opcion).join('')}</optgroup>` : '');
}

function puedeCrearBorrador(ticket) {
  return !!ticket.messageId && usarScriptGmail();
}

function htmlBloqueRespuesta(ticket) {
  const conBorrador = puedeCrearBorrador(ticket);
  const ayuda = conBorrador
    ? 'El borrador queda en la misma conversación de Gmail. Revísalo y envíalo desde ahí.'
    : (ticket.messageId
      ? 'Para crear borradores, conecta Gmail vía Apps Script en Configuración.'
      : 'Este caso no viene de un correo: copia la respuesta y pégala en el canal original.');

  return `
    <h4>Responder</h4>
    <div class="form-grupo">
      <label for="respuesta-plantilla">Plantilla</label>
      <select id="respuesta-plantilla">${opcionesPlantillasRespuesta(ticket.categoria)}</select>
      <textarea id="respuesta-texto" rows="10" placeholder="Escribe la respuesta..."></textarea>
      <p id="respuesta-pendientes" class="texto-peligro texto-pequeno oculto"></p>
      <div class="detalle-acciones">
        ${conBorrador ? '<button class="btn btn-primario" id="btn-crear-borrador"><i class="ti ti-mail-edit"></i> Crear borrador en Gmail</button>' : ''}
        <button class="btn btn-secundario" id="btn-copiar-respuesta"><i class="ti ti-clipboard"></i> Copiar</button>
      </div>
      <p id="respuesta-estado" class="texto-secundario texto-pequeno">${ayuda}</p>
    </div>
  `;
}

function inicializarBloqueRespuesta(ticketId) {
  const select = document.getElementById('respuesta-plantilla');
  const area = document.getElementById('respuesta-texto');
  const aviso = document.getElementById('respuesta-pendientes');
  const btnBorrador = document.getElementById('btn-crear-borrador');
  if (!select || !area) return;

  const revisar = () => {
    const faltan = datosPendientes(area.value);
    aviso.textContent = faltan.length ? `Falta completar: ${faltan.join(', ')}` : '';
    aviso.classList.toggle('oculto', faltan.length === 0);
    if (btnBorrador) btnBorrador.disabled = false; // al cambiar el texto se puede crear otro
  };

  const cargarPlantilla = () => {
    const entrada = obtenerBaseConocimiento().find(e => e.id === select.value);
    const ticket = obtenerTicketPorId(ticketId); // remitente puede haberse editado
    area.value = entrada ? prepararTextoRespuesta(entrada.solucion, ticket?.remitente) : '';
    revisar();
  };

  select.addEventListener('change', cargarPlantilla);
  area.addEventListener('input', revisar);
  document.getElementById('detalle-select-categoria')?.addEventListener('change', e => {
    select.innerHTML = opcionesPlantillasRespuesta(e.target.value);
    cargarPlantilla();
  });

  document.getElementById('btn-copiar-respuesta').addEventListener('click', () => {
    if (!area.value.trim()) return;
    navigator.clipboard?.writeText(area.value);
    const faltan = datosPendientes(area.value);
    mostrarToast(faltan.length ? `Copiado, pero falta completar: ${faltan.join(', ')}` : 'Respuesta copiada',
      faltan.length ? 'aviso' : 'exito');
  });

  btnBorrador?.addEventListener('click', () => crearBorradorRespuesta(ticketId, area, btnBorrador));

  cargarPlantilla();
}

async function crearBorradorRespuesta(ticketId, area, boton) {
  const texto = area.value.trim();
  if (!texto) {
    mostrarToast('La respuesta está vacía', 'aviso');
    return;
  }
  const faltan = datosPendientes(texto);
  if (faltan.length) {
    mostrarToast(`Completa antes: ${faltan.join(', ')}`, 'error');
    return;
  }
  const ticket = obtenerTicketPorId(ticketId);
  if (!ticket) return;

  boton.disabled = true; // evita borradores duplicados por doble clic
  try {
    const r = await llamarScript('borrador', {
      messageId: ticket.messageId,
      correoCliente: ticket.remitente?.email || '',
      texto
    });

    const tickets = obtenerTickets();
    const actual = tickets.find(t => t.id === ticketId);
    if (actual) {
      actual.notas.push({
        texto: `Borrador de respuesta creado en Gmail (para ${r.para}):\n${texto}`,
        fecha: new Date().toISOString()
      });
      guardarTickets(tickets);
    }

    const estado = document.getElementById('respuesta-estado');
    if (estado) {
      const url = `https://mail.google.com/mail/?authuser=${encodeURIComponent(obtenerEmailConectado())}#drafts`;
      estado.innerHTML = `Borrador creado para <strong>${escaparHtml(r.para)}</strong>. Revisa el destinatario y envíalo desde
        <a href="${url}" target="_blank" rel="noopener">Borradores de Gmail</a>. Cuando lo envíes, marca el ticket como resuelto.`;
    }
    mostrarToast('Borrador creado en Gmail', 'exito');
  } catch (err) {
    boton.disabled = false;
    console.error('No se pudo crear el borrador', err);
    mostrarToast(err.message === 'Acción desconocida'
      ? 'Actualiza el script: pega el nuevo Code.gs y publica una Nueva versión'
      : `No se pudo crear el borrador: ${err.message}`, 'error');
  }
}
