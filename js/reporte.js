// ============================================================
// MÓDULO REPORTE SEMANAL — métricas, gráficos CSS y exportaciones
// ============================================================
// La semana siempre se calcula de LUNES a DOMINGO (ISO 8601).
// ============================================================

// ============================================================
// CÁLCULO DE SEMANAS (ISO 8601: la semana empieza el lunes)
// ============================================================

/** Devuelve el lunes (00:00) y el domingo (23:59:59) de una semana "YYYY-Www". */
function obtenerRangoSemana(valorSemana) {
  const [anioStr, semanaStr] = valorSemana.split('-W');
  const anio = parseInt(anioStr, 10);
  const semana = parseInt(semanaStr, 10);

  const simple = new Date(anio, 0, 1 + (semana - 1) * 7);
  const diaSemana = simple.getDay() || 7; // domingo (0) → 7
  const lunes = new Date(simple);
  if (diaSemana <= 4) {
    lunes.setDate(simple.getDate() - diaSemana + 1);
  } else {
    lunes.setDate(simple.getDate() + 8 - diaSemana);
  }
  lunes.setHours(0, 0, 0, 0);

  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  return { lunes, domingo };
}

/** Devuelve el valor "YYYY-Www" correspondiente a la semana ISO de una fecha dada. */
function obtenerValorSemanaDeFecha(fecha) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil((((d - inicioAnio) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(numeroSemana).padStart(2, '0')}`;
}

/** Resta 7 días al valor de semana actual para obtener la semana anterior. */
function obtenerValorSemanaAnterior(valorSemana) {
  const { lunes } = obtenerRangoSemana(valorSemana);
  const lunesAnterior = new Date(lunes);
  lunesAnterior.setDate(lunes.getDate() - 7);
  return obtenerValorSemanaDeFecha(lunesAnterior);
}

function formatearFechaCorta(date) {
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ============================================================
// CÁLCULO DE MÉTRICAS
// ============================================================

function ticketsEnRango(lunes, domingo) {
  return obtenerTickets().filter(t => {
    const fecha = new Date(t.fechaIngreso);
    return fecha >= lunes && fecha <= domingo;
  });
}

function calcularMetricasGenerales(tickets) {
  const total = tickets.length;
  const resueltos = tickets.filter(t => t.estado === 'resuelto').length;
  const autoRespondidos = tickets.filter(t => t.estado === 'auto_respondido').length;
  const escalados = tickets.filter(t => t.estado === 'escalado').length;
  const pendientes = tickets.filter(t => t.estado === 'abierto').length;
  const totalResueltosTipo = resueltos + autoRespondidos;

  const conTiempo = tickets.filter(t => t.fechaResolucion);
  const tiempoPromedio = conTiempo.length === 0 ? 0 :
    conTiempo.reduce((acc, t) => acc + (new Date(t.fechaResolucion) - new Date(t.fechaIngreso)), 0)
    / conTiempo.length / 3600000;

  return {
    total, resueltos, autoRespondidos, escalados, pendientes,
    tasaResolucion: total === 0 ? 0 : (totalResueltosTipo / total) * 100,
    tiempoPromedioResolucion: tiempoPromedio
  };
}

function distribucionPorOrigen(tickets) {
  const canales = ['gmail', 'instagram', 'twitter', 'facebook', 'whatsapp', 'otro'];
  const total = tickets.length || 1;
  return canales.map(canal => {
    const cantidad = tickets.filter(t => t.origen === canal).length;
    return { canal, cantidad, porcentaje: (cantidad / total) * 100 };
  });
}

function distribucionPorCategoria(tickets) {
  const conteo = {};
  tickets.forEach(t => { conteo[t.categoria] = (conteo[t.categoria] || 0) + 1; });
  return Object.entries(conteo)
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

function escalamientosDeLaSemana(lunes, domingo) {
  return obtenerBugsLog().filter(b => {
    const fecha = new Date(b.fechaEscalamiento);
    return fecha >= lunes && fecha <= domingo;
  });
}

function bugsResueltosEnRango(lunes, domingo) {
  return obtenerBugsLog().filter(b => {
    if (!b.fechaResolucionTI) return false;
    const fecha = new Date(b.fechaResolucionTI);
    return fecha >= lunes && fecha <= domingo;
  });
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

function renderizarReporte() {
  const valorSemana = document.getElementById('reporte-semana').value;
  if (!valorSemana) return;

  const { lunes, domingo } = obtenerRangoSemana(valorSemana);
  const ticketsSemana = ticketsEnRango(lunes, domingo);
  const metricas = calcularMetricasGenerales(ticketsSemana);

  const valorSemanaAnterior = obtenerValorSemanaAnterior(valorSemana);
  const { lunes: lunesAnt, domingo: domingoAnt } = obtenerRangoSemana(valorSemanaAnterior);
  const ticketsSemanaAnterior = ticketsEnRango(lunesAnt, domingoAnt);
  const metricasAnteriores = calcularMetricasGenerales(ticketsSemanaAnterior);

  renderizarBloqueMetricas(metricas, metricasAnteriores);
  renderizarBloqueOrigen(ticketsSemana);
  renderizarBloqueCategoria(ticketsSemana);
  renderizarBloqueEscalamientos(lunes, domingo, ticketsSemana);
  renderizarBloqueBugs(lunes, domingo);
  renderizarBloqueTendencia(ticketsSemana, ticketsSemanaAnterior);

  // Restaurar observaciones guardadas para esta semana (si las hay)
  document.getElementById('reporte-observaciones').value = leerLS(`obs_semana_${valorSemana}`, '');
}

function renderizarBloqueMetricas(actual, anterior) {
  const contenedor = document.getElementById('reporte-metricas-grid');

  function tarjeta(etiqueta, valor, valorAnterior, esPorcentaje = false, esHoras = false) {
    let comparacionHtml = '';
    if (typeof valorAnterior === 'number') {
      const diferencia = valor - valorAnterior;
      const sube = diferencia > 0;
      const claseDireccion = sube ? 'comparacion-sube' : (diferencia < 0 ? 'comparacion-baja' : '');
      const flecha = diferencia === 0 ? '→' : (sube ? '↑' : '↓');
      comparacionHtml = `<div class="comparacion ${claseDireccion}">${flecha} ${Math.abs(diferencia).toFixed(esPorcentaje || esHoras ? 1 : 0)} vs. semana anterior</div>`;
    }
    const valorFormateado = esPorcentaje ? `${valor.toFixed(1)}%` : (esHoras ? `${valor.toFixed(1)}h` : valor);
    return `<div class="metrica-card"><div class="valor">${valorFormateado}</div><div class="etiqueta">${etiqueta}</div>${comparacionHtml}</div>`;
  }

  contenedor.innerHTML = [
    tarjeta('Total recibidos', actual.total, anterior.total),
    tarjeta('Resueltos', actual.resueltos, anterior.resueltos),
    tarjeta('Pendientes', actual.pendientes, anterior.pendientes),
    tarjeta('Escalados', actual.escalados, anterior.escalados),
    tarjeta('Auto-respondidos', actual.autoRespondidos, anterior.autoRespondidos),
    tarjeta('Tasa de resolución', actual.tasaResolucion, anterior.tasaResolucion, true),
    tarjeta('Tiempo prom. resolución', actual.tiempoPromedioResolucion, anterior.tiempoPromedioResolucion, false, true)
  ].join('');
}

function renderizarBloqueOrigen(tickets) {
  const contenedor = document.getElementById('reporte-grafico-origen');
  const datos = distribucionPorOrigen(tickets);
  const maximo = Math.max(1, ...datos.map(d => d.cantidad));

  contenedor.innerHTML = datos.map(d => `
    <div class="barra-fila">
      <div class="barra-etiqueta">${etiquetaOrigen(d.canal)}</div>
      <div class="barra-pista"><div class="barra-relleno" style="width:${(d.cantidad / maximo) * 100}%"></div></div>
      <div class="barra-valor">${d.cantidad} (${d.porcentaje.toFixed(0)}%)</div>
    </div>
  `).join('');
}

function renderizarBloqueCategoria(tickets) {
  const grafico = document.getElementById('reporte-grafico-categoria');
  const tabla = document.getElementById('reporte-tabla-categoria');
  const datos = distribucionPorCategoria(tickets);

  if (datos.length === 0) {
    grafico.innerHTML = '<p class="texto-secundario">Sin datos para esta semana.</p>';
    tabla.innerHTML = '';
    return;
  }

  const maximo = datos[0].cantidad;
  grafico.innerHTML = datos.map((d, i) => `
    <div class="barra-fila ${i === 0 ? 'barra-categoria-destacada' : ''}">
      <div class="barra-etiqueta">${formatearCategoria(d.categoria)}</div>
      <div class="barra-pista"><div class="barra-relleno" style="width:${(d.cantidad / maximo) * 100}%"></div></div>
      <div class="barra-valor">${d.cantidad}</div>
    </div>
  `).join('');

  tabla.innerHTML = `
    <thead><tr><th>Categoría</th><th>Cantidad</th></tr></thead>
    <tbody>
      ${datos.map((d, i) => `<tr ${i === 0 ? 'class="barra-categoria-destacada"' : ''}><td>${formatearCategoria(d.categoria)}</td><td>${d.cantidad}</td></tr>`).join('')}
    </tbody>
  `;
}

function renderizarBloqueEscalamientos(lunes, domingo, ticketsSemana) {
  const contenedor = document.getElementById('reporte-escalamientos');
  const escaladosSemana = ticketsSemana.filter(t => t.estado === 'escalado');
  const escalamientosSemana = escalamientosDeLaSemana(lunes, domingo);
  const activos = obtenerEscalamientosActivos();

  const motivos = {};
  escalamientosSemana.forEach(e => { motivos[e.motivo] = (motivos[e.motivo] || 0) + 1; });

  const masAntiguo = activos.slice().sort((a, b) => new Date(a.fechaEscalamiento) - new Date(b.fechaEscalamiento))[0];

  contenedor.innerHTML = `
    <div class="metricas-grid" style="margin-bottom:14px;">
      <div class="metrica-card"><div class="valor">${escaladosSemana.length}</div><div class="etiqueta">Escalados esta semana</div></div>
      <div class="metrica-card"><div class="valor">${activos.length}</div><div class="etiqueta">Activos acumulados</div></div>
      <div class="metrica-card"><div class="valor">${masAntiguo ? diasAbiertoEscalamiento(masAntiguo) : 0}</div><div class="etiqueta">Días — más antiguo sin resolver</div></div>
    </div>
    <div class="grafico-barras">
      ${Object.entries(motivos).map(([motivo, cantidad]) => `
        <div class="barra-fila">
          <div class="barra-etiqueta">${escaparHtml(motivo)}</div>
          <div class="barra-pista"><div class="barra-relleno" style="width:${(cantidad / Math.max(1, escalamientosSemana.length)) * 100}%"></div></div>
          <div class="barra-valor">${cantidad}</div>
        </div>
      `).join('') || '<p class="texto-secundario">Sin escalamientos esta semana.</p>'}
    </div>
  `;
}

function renderizarBloqueBugs(lunes, domingo) {
  const contenedor = document.getElementById('reporte-bugs');
  const nuevos = escalamientosDeLaSemana(lunes, domingo).length;
  const resueltos = bugsResueltosEnRango(lunes, domingo).length;
  const activos = obtenerEscalamientosActivos().length;

  contenedor.innerHTML = `
    <div class="metricas-grid">
      <div class="metrica-card"><div class="valor">${nuevos}</div><div class="etiqueta">Nuevos esta semana</div></div>
      <div class="metrica-card"><div class="valor">${resueltos}</div><div class="etiqueta">Resueltos esta semana</div></div>
      <div class="metrica-card"><div class="valor">${activos}</div><div class="etiqueta">Activos acumulados</div></div>
    </div>
  `;
}

function renderizarBloqueTendencia(ticketsSemana, ticketsSemanaAnterior) {
  const contenedor = document.getElementById('reporte-tendencia');
  const actual = distribucionPorCategoria(ticketsSemana);
  const anterior = distribucionPorCategoria(ticketsSemanaAnterior);

  const categorias = new Set([...actual.map(d => d.categoria), ...anterior.map(d => d.categoria)]);
  const filas = Array.from(categorias).map(categoria => {
    const cantActual = actual.find(d => d.categoria === categoria)?.cantidad || 0;
    const cantAnterior = anterior.find(d => d.categoria === categoria)?.cantidad || 0;
    const diferencia = cantActual - cantAnterior;
    return { categoria, cantActual, cantAnterior, diferencia };
  }).sort((a, b) => b.cantActual - a.cantActual);

  const totalActual = ticketsSemana.length;
  const totalAnterior = ticketsSemanaAnterior.length;
  const aumentoTotal = totalAnterior === 0 ? (totalActual > 0 ? 100 : 0) : ((totalActual - totalAnterior) / totalAnterior) * 100;

  let html = '';
  if (aumentoTotal > 20) {
    html += `<div class="alerta-tendencia"><i class="ti ti-trending-up"></i> Aumento de ${aumentoTotal.toFixed(0)}% en el total de casos respecto a la semana anterior.</div>`;
  }

  html += `
    <table class="tabla-reporte">
      <thead><tr><th>Categoría</th><th>Semana actual</th><th>Semana anterior</th><th>Diferencia</th></tr></thead>
      <tbody>
        ${filas.map(f => `
          <tr>
            <td>${formatearCategoria(f.categoria)}</td>
            <td>${f.cantActual}</td>
            <td>${f.cantAnterior}</td>
            <td class="${f.diferencia > 0 ? 'comparacion-sube' : (f.diferencia < 0 ? 'comparacion-baja' : '')}">
              ${f.diferencia > 0 ? '↑' : (f.diferencia < 0 ? '↓' : '→')} ${Math.abs(f.diferencia)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  contenedor.innerHTML = html;
}

// ============================================================
// EXPORTACIONES
// ============================================================

function obtenerDatosReporteActual() {
  const valorSemana = document.getElementById('reporte-semana').value;
  const { lunes, domingo } = obtenerRangoSemana(valorSemana);
  const ticketsSemana = ticketsEnRango(lunes, domingo);
  const metricas = calcularMetricasGenerales(ticketsSemana);
  const origen = distribucionPorOrigen(ticketsSemana);
  const categoria = distribucionPorCategoria(ticketsSemana);
  const activos = obtenerEscalamientosActivos();
  const observaciones = document.getElementById('reporte-observaciones').value;

  // Guardar observaciones para esta semana
  guardarLS(`obs_semana_${valorSemana}`, observaciones);

  return { valorSemana, lunes, domingo, ticketsSemana, metricas, origen, categoria, activos, observaciones };
}

function generarNumeroSemana(valorSemana) {
  return valorSemana.split('-W')[1];
}

function generarResumenTexto() {
  const d = obtenerDatosReporteActual();
  const config = obtenerConfig();

  let texto = '';
  texto += '╔══════════════════════════════════════════╗\n';
  texto += `   REPORTE SOPORTE 13GO — SEMANA ${generarNumeroSemana(d.valorSemana)}\n`;
  texto += `   ${formatearFechaCorta(d.lunes)} al ${formatearFechaCorta(d.domingo)}\n`;
  texto += '╚══════════════════════════════════════════╝\n\n';

  texto += 'RESUMEN GENERAL\n';
  texto += `• Total casos recibidos : ${d.metricas.total}\n`;
  texto += `• Resueltos             : ${d.metricas.resueltos} (${d.metricas.tasaResolucion.toFixed(0)}%)\n`;
  texto += `• Auto-respondidos      : ${d.metricas.autoRespondidos}\n`;
  texto += `• Escalados a TI        : ${d.metricas.escalados}\n`;
  texto += `• Pendientes            : ${d.metricas.pendientes}\n`;
  texto += `• Tiempo prom. resolución: ${d.metricas.tiempoPromedioResolucion.toFixed(1)}h\n\n`;

  texto += 'ORIGEN DE CASOS\n';
  d.origen.forEach(o => {
    texto += `• ${etiquetaOrigen(o.canal).padEnd(12, ' ')}: ${o.cantidad} casos (${o.porcentaje.toFixed(0)}%)\n`;
  });
  texto += '\n';

  texto += 'DISTRIBUCIÓN POR CATEGORÍA\n';
  d.categoria.forEach(c => {
    texto += `• ${formatearCategoria(c.categoria)} : ${c.cantidad} casos\n`;
  });
  texto += '\n';

  texto += 'ESCALAMIENTOS ACTIVOS (acumulado)\n';
  d.activos.forEach(a => {
    texto += `• [${a.ticketId}] — ${a.motivo} — ${diasAbiertoEscalamiento(a)} días sin resolver\n`;
  });
  texto += '\n';

  texto += 'OBSERVACIONES\n';
  texto += `${d.observaciones || '(sin observaciones)'}\n\n`;

  texto += `Generado: ${formatearFecha(new Date().toISOString())}\n`;
  texto += 'Sistema Soporte 13GO';

  return texto;
}

function copiarResumenTexto() {
  const texto = generarResumenTexto();
  navigator.clipboard?.writeText(texto);
  mostrarToast('Resumen copiado al portapapeles', 'exito');
}

function descargarArchivo(nombre, contenido, tipoMime) {
  const blob = new Blob([contenido], { type: tipoMime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportarReporteJSON() {
  const d = obtenerDatosReporteActual();
  descargarArchivo(`tickets-semana-${d.valorSemana}.json`, JSON.stringify(d.ticketsSemana, null, 2), 'application/json');
  mostrarToast('JSON exportado', 'exito');
}

function exportarReporteHTML() {
  const d = obtenerDatosReporteActual();
  const config = obtenerConfig();
  const logo = typeof obtenerLogoEmpresa === 'function' ? obtenerLogoEmpresa() : '';

  const filasTabla = d.ticketsSemana.map(t => `
    <tr>
      <td>${t.id}</td><td>${etiquetaOrigen(t.origen)}</td><td>${escaparHtml(t.remitente?.nombre || '')}</td>
      <td>${formatearCategoria(t.categoria)}</td><td>${t.prioridad}</td><td>${etiquetaEstado(t.estado)}</td>
      <td>${formatearFecha(t.fechaIngreso)}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Soporte 13GO — Semana ${generarNumeroSemana(d.valorSemana)}</title>
<style>
  body { font-family: Arial, sans-serif; color: #1A1A1A; padding: 30px; max-width: 900px; margin: auto; }
  h1 { color: #185FA5; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
  th, td { border: 1px solid #E0E0E0; padding: 8px; text-align: left; font-size: 13px; }
  th { background: #F5F5F5; }
  .metrica { display: inline-block; background: #F5F5F5; border-radius: 6px; padding: 10px 16px; margin: 4px; }
  .alerta { background: #FBEAEA; color: #A32D2D; padding: 10px; border-radius: 6px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  ${logo ? `<img src="${logo}" alt="Logo" style="max-height:60px;max-width:220px;display:block;margin-bottom:10px;">` : ''}
  <h1>Reporte Soporte 13GO — Semana ${generarNumeroSemana(d.valorSemana)}</h1>
  <p>${formatearFechaCorta(d.lunes)} al ${formatearFechaCorta(d.domingo)}</p>
  <p><strong>${escaparHtml(config.nombreArea || '')}</strong> — Responsable: ${escaparHtml(config.responsable || '')}</p>

  <h2>Resumen general</h2>
  <div class="metrica">Total: ${d.metricas.total}</div>
  <div class="metrica">Resueltos: ${d.metricas.resueltos} (${d.metricas.tasaResolucion.toFixed(0)}%)</div>
  <div class="metrica">Auto-respondidos: ${d.metricas.autoRespondidos}</div>
  <div class="metrica">Escalados: ${d.metricas.escalados}</div>
  <div class="metrica">Pendientes: ${d.metricas.pendientes}</div>
  <div class="metrica">Tiempo prom. resolución: ${d.metricas.tiempoPromedioResolucion.toFixed(1)}h</div>

  <h2>Origen de casos</h2>
  <table><thead><tr><th>Canal</th><th>Cantidad</th><th>%</th></tr></thead>
  <tbody>${d.origen.map(o => `<tr><td>${etiquetaOrigen(o.canal)}</td><td>${o.cantidad}</td><td>${o.porcentaje.toFixed(0)}%</td></tr>`).join('')}</tbody></table>

  <h2>Distribución por categoría</h2>
  <table><thead><tr><th>Categoría</th><th>Cantidad</th></tr></thead>
  <tbody>${d.categoria.map(c => `<tr><td>${formatearCategoria(c.categoria)}</td><td>${c.cantidad}</td></tr>`).join('')}</tbody></table>

  <h2>Escalamientos activos (acumulado)</h2>
  <table><thead><tr><th>Ticket</th><th>Motivo</th><th>Días sin resolver</th></tr></thead>
  <tbody>${d.activos.map(a => `<tr><td>${a.ticketId}</td><td>${escaparHtml(a.motivo)}</td><td>${diasAbiertoEscalamiento(a)}</td></tr>`).join('') || '<tr><td colspan="3">Sin escalamientos activos</td></tr>'}</tbody></table>

  <h2>Observaciones</h2>
  <p>${escaparHtml(d.observaciones || '(sin observaciones)')}</p>

  <h2>Detalle de tickets de la semana</h2>
  <table>
    <thead><tr><th>ID</th><th>Origen</th><th>Remitente</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead>
    <tbody>${filasTabla || '<tr><td colspan="7">Sin tickets esta semana</td></tr>'}</tbody>
  </table>

  <p><em>Generado: ${formatearFecha(new Date().toISOString())} — Sistema Soporte 13GO</em></p>
</body>
</html>
  `;

  descargarArchivo(`reporte-semana-${d.valorSemana}.html`, html, 'text/html');
  mostrarToast('Reporte HTML exportado', 'exito');
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

function inicializarModuloReporte() {
  const inputSemana = document.getElementById('reporte-semana');
  inputSemana.value = obtenerValorSemanaDeFecha(new Date());

  inputSemana.addEventListener('change', renderizarReporte);
  document.getElementById('btn-copiar-resumen').addEventListener('click', copiarResumenTexto);
  document.getElementById('btn-exportar-html').addEventListener('click', exportarReporteHTML);
  document.getElementById('btn-exportar-json').addEventListener('click', exportarReporteJSON);

  renderizarReporte();
}
