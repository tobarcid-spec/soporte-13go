// ============================================================
// MÓDULO DASHBOARD — casos por período, por categoría, tendencia
// y hallazgos automáticos.
// ============================================================
// Granularidad: semana (lunes–domingo, igual que el reporte) o mes.
// El período en curso es parcial: se dibuja atenuado y se EXCLUYE
// del cálculo de tendencia y de los hallazgos comparativos, para no
// confundir "aún no termina" con "bajó".
// ============================================================

const DASH_PERIODOS = 12;
const DASH_MIN_CASOS_HALLAZGO = 5; // evita alarmas con muestras muy chicas
const DASH_DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

let dashGranularidad = 'semana';

// ============================================================
// CONSTRUCCIÓN DE PERÍODOS
// ============================================================

function dashLunesDe(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Devuelve los últimos N períodos (el último es el actual, parcial). */
function dashConstruirPeriodos(granularidad, cantidad) {
  const hoy = new Date();
  const periodos = [];

  for (let i = cantidad - 1; i >= 0; i--) {
    let inicio, fin, etiqueta;
    if (granularidad === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
      etiqueta = inicio.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }).replace('.', '');
    } else {
      inicio = dashLunesDe(hoy);
      inicio.setDate(inicio.getDate() - 7 * i);
      fin = new Date(inicio);
      fin.setDate(fin.getDate() + 7);
      etiqueta = inicio.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
    }
    periodos.push({ inicio, fin, etiqueta, parcial: i === 0, total: 0, porCategoria: {}, tickets: [] });
  }
  return periodos;
}

/** Reparte los tickets en los períodos. Devuelve cuántos tenían fecha inválida. */
function dashAsignarTickets(periodos, tickets) {
  let fechasInvalidas = 0;
  tickets.forEach(t => {
    const f = new Date(t.fechaIngreso);
    if (isNaN(f)) { fechasInvalidas++; return; }
    const p = periodos.find(per => f >= per.inicio && f < per.fin);
    if (!p) return;
    p.total++;
    p.tickets.push(t);
    p.porCategoria[t.categoria] = (p.porCategoria[t.categoria] || 0) + 1;
  });
  return fechasInvalidas;
}

// ============================================================
// ESTADÍSTICA SIMPLE
// ============================================================

function dashMedia(valores) {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
}

function dashDesviacion(valores) {
  if (valores.length < 2) return 0;
  const m = dashMedia(valores);
  return Math.sqrt(valores.reduce((a, v) => a + (v - m) ** 2, 0) / valores.length);
}

/** Regresión lineal simple: devuelve pendiente e intercepto (x = 0..n-1). */
function dashRegresion(valores) {
  const n = valores.length;
  if (n < 2) return { pendiente: 0, intercepto: valores[0] || 0 };
  const mx = (n - 1) / 2;
  const my = dashMedia(valores);
  let num = 0, den = 0;
  valores.forEach((y, x) => { num += (x - mx) * (y - my); den += (x - mx) ** 2; });
  const pendiente = den === 0 ? 0 : num / den;
  return { pendiente, intercepto: my - pendiente * mx };
}

function dashVariacionPct(actual, anterior) {
  if (anterior === 0) return actual > 0 ? null : 0; // null = "nuevo", no hay base
  return ((actual - anterior) / anterior) * 100;
}

function dashNombrePeriodo(periodo, granularidad) {
  if (granularidad === 'mes') {
    return `el mes de ${periodo.inicio.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`;
  }
  return `la semana del ${periodo.inicio.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}`;
}

// ============================================================
// GRÁFICOS SVG
// ============================================================

function dashMaximoRedondo(max) {
  if (max <= 5) return 5;
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / paso) * paso;
}

function dashSvgBarras(periodos, regresion, unidad) {
  const W = 720, H = 250, mI = 34, mD = 10, mS = 22, mInf = 34;
  const anchoUtil = W - mI - mD;
  const altoUtil = H - mS - mInf;
  const maximo = dashMaximoRedondo(Math.max(...periodos.map(p => p.total), 1));
  const paso = anchoUtil / periodos.length;
  const anchoBarra = paso * 0.6;
  const y = v => mS + altoUtil - (v / maximo) * altoUtil;

  let svg = `<svg class="dash-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Casos por ${unidad}">`;

  // Líneas guía
  for (let i = 0; i <= 4; i++) {
    const v = (maximo / 4) * i;
    svg += `<line class="dash-guia" x1="${mI}" x2="${W - mD}" y1="${y(v)}" y2="${y(v)}"/>`;
    svg += `<text class="dash-texto" x="${mI - 6}" y="${y(v) + 4}" text-anchor="end">${Number.isInteger(v) ? v : v.toFixed(1)}</text>`;
  }

  periodos.forEach((p, i) => {
    const x = mI + paso * i + (paso - anchoBarra) / 2;
    const alto = (p.total / maximo) * altoUtil;
    const titulo = `${dashNombrePeriodo(p, dashGranularidad)}: ${p.total} casos${p.parcial ? ' (en curso)' : ''}`;
    svg += `<g><title>${escaparHtml(titulo)}</title>
      <rect class="dash-barra ${p.parcial ? 'dash-barra-parcial' : ''}" x="${x}" y="${y(p.total)}" width="${anchoBarra}" height="${alto}" rx="3"/>
      <text class="dash-valor" x="${x + anchoBarra / 2}" y="${y(p.total) - 5}" text-anchor="middle">${p.total}</text>
      <text class="dash-texto" x="${x + anchoBarra / 2}" y="${H - mInf + 16}" text-anchor="middle">${escaparHtml(p.etiqueta)}${p.parcial ? '*' : ''}</text></g>`;
  });

  // Línea de tendencia sobre los períodos completos
  const completos = periodos.filter(p => !p.parcial).length;
  if (completos >= 3) {
    const xC = i => mI + paso * i + paso / 2;
    const yT = i => Math.max(mS, Math.min(mS + altoUtil, y(regresion.intercepto + regresion.pendiente * i)));
    svg += `<line class="dash-tendencia" x1="${xC(0)}" y1="${yT(0)}" x2="${xC(completos - 1)}" y2="${yT(completos - 1)}"/>`;
  }

  svg += '</svg>';
  return svg;
}

function dashSvgSparkline(valores) {
  const W = 110, H = 26, pad = 3;
  if (valores.length < 2) return '';
  const max = Math.max(...valores, 1);
  const paso = (W - pad * 2) / (valores.length - 1);
  const pts = valores.map((v, i) => `${(pad + paso * i).toFixed(1)},${(H - pad - (v / max) * (H - pad * 2)).toFixed(1)}`);
  const ultimo = pts[pts.length - 1].split(',');
  return `<svg class="dash-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <polyline points="${pts.join(' ')}"/><circle cx="${ultimo[0]}" cy="${ultimo[1]}" r="2.5"/></svg>`;
}

// ============================================================
// HALLAZGOS
// ============================================================

/** Cada hallazgo: { nivel: 'alerta' | 'aviso' | 'info', icono, titulo, detalle }. */
function dashCalcularHallazgos(periodos, todosLosTickets, fechasInvalidas) {
  const hallazgos = [];
  const completos = periodos.filter(p => !p.parcial);
  const totales = completos.map(p => p.total);
  const nombre = p => dashNombrePeriodo(p, dashGranularidad);
  const unidad = dashGranularidad === 'mes' ? 'mes' : 'semana';
  const ticketsRango = periodos.flatMap(p => p.tickets);
  const agregar = (nivel, icono, titulo, detalle) => hallazgos.push({ nivel, icono, titulo, detalle });

  // 1. Picos de volumen
  if (completos.length >= 4) {
    const media = dashMedia(totales);
    const desv = dashDesviacion(totales);
    completos.forEach(p => {
      if (p.total >= DASH_MIN_CASOS_HALLAZGO && p.total > media + 2 * desv && desv > 0) {
        const top = Object.entries(p.porCategoria).sort((a, b) => b[1] - a[1])[0];
        agregar('alerta', 'ti-trending-up', `Pico de volumen en ${nombre(p)}`,
          `${p.total} casos vs. un promedio de ${media.toFixed(1)} por ${unidad}.` +
          (top ? ` Lo explica sobre todo «${formatearCategoria(top[0])}» (${top[1]} casos).` : ''));
      }
    });
  }

  // 2. Último período completo vs. el anterior
  if (completos.length >= 2) {
    const ult = completos[completos.length - 1];
    const ant = completos[completos.length - 2];
    const pct = dashVariacionPct(ult.total, ant.total);
    if (pct !== null && Math.max(ult.total, ant.total) >= DASH_MIN_CASOS_HALLAZGO && Math.abs(pct) >= 30) {
      const sube = pct > 0;
      agregar(sube ? 'aviso' : 'info', sube ? 'ti-arrow-up-right' : 'ti-arrow-down-right',
        `${sube ? 'Subida' : 'Bajada'} de ${Math.abs(pct).toFixed(0)}% en ${unidad === 'mes' ? 'el último mes cerrado' : 'la última semana cerrada'}`,
        `${ult.total} casos en ${nombre(ult)} frente a ${ant.total} en ${nombre(ant)}.`);
    }
  }

  // 3. Tendencia sostenida (pendiente + 3 períodos consecutivos en la misma dirección)
  if (completos.length >= 4) {
    const u = totales.slice(-4);
    const crece = u[0] < u[1] && u[1] < u[2] && u[2] < u[3];
    const decrece = u[0] > u[1] && u[1] > u[2] && u[2] > u[3];
    if (crece || decrece) {
      agregar(crece ? 'aviso' : 'info', crece ? 'ti-chart-line' : 'ti-chart-line',
        `${crece ? 'Alza' : 'Baja'} sostenida durante 3 ${unidad === 'mes' ? 'meses' : 'semanas'} seguidos`,
        `Últimos 4 ${unidad === 'mes' ? 'meses' : 'semanas'} cerrados: ${u.join(' → ')} casos.`);
    }
  }

  // 4. Categorías en alza / nuevas (último período completo vs. promedio de los 3 anteriores)
  if (completos.length >= 4) {
    const ult = completos[completos.length - 1];
    const previos = completos.slice(-4, -1);
    const categorias = new Set(completos.flatMap(p => Object.keys(p.porCategoria)));
    categorias.forEach(cat => {
      const actual = ult.porCategoria[cat] || 0;
      const base = dashMedia(previos.map(p => p.porCategoria[cat] || 0));
      if (base === 0 && actual >= 3) {
        agregar('aviso', 'ti-sparkles', `«${formatearCategoria(cat)}» aparece de la nada`,
          `${actual} casos en ${nombre(ult)} y ninguno en los 3 ${unidad === 'mes' ? 'meses' : 'semanas'} previos.`);
      } else if (base > 0 && actual >= base * 1.5 && actual - base >= 3) {
        agregar('aviso', 'ti-flame', `«${formatearCategoria(cat)}» va en alza`,
          `${actual} casos en ${nombre(ult)}; el promedio de los 3 ${unidad === 'mes' ? 'meses' : 'semanas'} previos era ${base.toFixed(1)}.`);
      }
    });
  }

  if (ticketsRango.length >= 10) {
    // 5. Concentración en una categoría
    const conteoCat = {};
    ticketsRango.forEach(t => { conteoCat[t.categoria] = (conteoCat[t.categoria] || 0) + 1; });
    const [catTop, cantTop] = Object.entries(conteoCat).sort((a, b) => b[1] - a[1])[0];
    const share = (cantTop / ticketsRango.length) * 100;
    if (share >= 35) {
      agregar('info', 'ti-target', `«${formatearCategoria(catTop)}» concentra el ${share.toFixed(0)}% de los casos`,
        `${cantTop} de ${ticketsRango.length} casos del período. Atacar su causa raíz (FAQ, plantilla o fix en la app) es la palanca más grande.`);
    }

    // 6. Sin clasificar
    const sinClasificar = conteoCat.sin_clasificar || 0;
    if ((sinClasificar / ticketsRango.length) * 100 >= 10) {
      agregar('aviso', 'ti-help-circle', `${((sinClasificar / ticketsRango.length) * 100).toFixed(0)}% de los casos están «Sin clasificar»`,
        `${sinClasificar} casos. Distorsionan este análisis; conviene revisar las etiquetas/filtros de Gmail que no están atrapando esos correos.`);
    }

    // 7. Canal dominante
    const conteoOrigen = {};
    ticketsRango.forEach(t => { conteoOrigen[t.origen] = (conteoOrigen[t.origen] || 0) + 1; });
    const [origenTop, cantOrigen] = Object.entries(conteoOrigen).sort((a, b) => b[1] - a[1])[0];
    const shareOrigen = (cantOrigen / ticketsRango.length) * 100;
    if (shareOrigen >= 60 && Object.keys(conteoOrigen).length > 1) {
      agregar('info', 'ti-antenna', `${shareOrigen.toFixed(0)}% de los casos llegan por ${etiquetaOrigen(origenTop)}`,
        'Alta dependencia de un solo canal: si falla o cambia, casi todo el flujo se ve afectado.');
    }

    // 8. Día de la semana pico
    const porDia = new Array(7).fill(0);
    ticketsRango.forEach(t => { porDia[new Date(t.fechaIngreso).getDay()]++; });
    const maxDia = Math.max(...porDia);
    const diaPico = porDia.indexOf(maxDia);
    if (ticketsRango.length >= 14 && (maxDia / ticketsRango.length) * 100 >= 25) {
      agregar('info', 'ti-calendar-event', `El ${DASH_DIAS_SEMANA[diaPico]} es el día más cargado`,
        `${((maxDia / ticketsRango.length) * 100).toFixed(0)}% de los casos ingresan ese día (${maxDia} de ${ticketsRango.length}). Útil para planificar cobertura.`);
    }

    // 9. Categoría con tiempo de resolución muy superior al promedio
    const resueltos = ticketsRango.filter(t => t.fechaResolucion && !isNaN(new Date(t.fechaResolucion)));
    const horas = t => (new Date(t.fechaResolucion) - new Date(t.fechaIngreso)) / 3600000;
    if (resueltos.length >= 6) {
      const promGlobal = dashMedia(resueltos.map(horas));
      const porCat = {};
      resueltos.forEach(t => { (porCat[t.categoria] = porCat[t.categoria] || []).push(horas(t)); });
      Object.entries(porCat)
        .filter(([, h]) => h.length >= 3 && dashMedia(h) > promGlobal * 2 && dashMedia(h) - promGlobal >= 4)
        .sort((a, b) => dashMedia(b[1]) - dashMedia(a[1]))
        .slice(0, 1)
        .forEach(([cat, h]) => {
          agregar('aviso', 'ti-clock-exclamation', `«${formatearCategoria(cat)}» tarda el doble en resolverse`,
            `${dashMedia(h).toFixed(1)}h promedio vs. ${promGlobal.toFixed(1)}h del resto (${h.length} casos).`);
        });
    }

    // 10. Tasa de escalamiento
    const escalados = ticketsRango.filter(t => t.estado === 'escalado' || t.escalamiento).length;
    const pctEsc = (escalados / ticketsRango.length) * 100;
    if (pctEsc >= 20) {
      agregar('aviso', 'ti-arrow-up-circle', `${pctEsc.toFixed(0)}% de los casos terminan escalados a TI`,
        `${escalados} de ${ticketsRango.length}. Revisa si hay respuestas que soporte podría resolver sin TI.`);
    }
  }

  // 11. Backlog antiguo (no depende del rango del gráfico: mira todo el stock)
  const ahora = Date.now();
  const abiertosViejos = todosLosTickets.filter(t =>
    t.estado === 'abierto' && (ahora - new Date(t.fechaIngreso)) / 86400000 > 7);
  if (abiertosViejos.length > 0) {
    agregar('alerta', 'ti-hourglass', `${abiertosViejos.length} caso${abiertosViejos.length > 1 ? 's' : ''} abierto${abiertosViejos.length > 1 ? 's' : ''} hace más de 7 días`,
      `Ejemplos: ${abiertosViejos.slice(0, 4).map(t => t.id).join(', ')}${abiertosViejos.length > 4 ? '…' : ''}.`);
  }

  // 12. Escalamientos a TI sin resolver hace > 5 días (mismo umbral que el módulo de Bugs)
  const escViejos = obtenerEscalamientosActivos().filter(b => diasAbiertoEscalamiento(b) > 5);
  if (escViejos.length > 0) {
    const mayor = Math.max(...escViejos.map(diasAbiertoEscalamiento));
    agregar('alerta', 'ti-bug', `${escViejos.length} escalamiento${escViejos.length > 1 ? 's' : ''} a TI sin resolver hace más de 5 días`,
      `El más antiguo lleva ${mayor} días. ${escViejos.slice(0, 4).map(b => b.ticketId).join(', ')}${escViejos.length > 4 ? '…' : ''}.`);
  }

  // 13. Casos críticos/altos abiertos
  const urgentes = todosLosTickets.filter(t => t.estado === 'abierto' && (t.prioridad === 'P1-Critico' || t.prioridad === 'P2-Alto'));
  if (urgentes.length > 0) {
    agregar('aviso', 'ti-alert-triangle', `${urgentes.length} caso${urgentes.length > 1 ? 's' : ''} P1/P2 ${urgentes.length > 1 ? 'siguen abiertos' : 'sigue abierto'}`,
      urgentes.slice(0, 4).map(t => t.id).join(', ') + (urgentes.length > 4 ? '…' : '') + '.');
  }

  // 14. Calidad de datos
  const ids = {};
  todosLosTickets.forEach(t => { ids[t.id] = (ids[t.id] || 0) + 1; });
  const duplicados = Object.entries(ids).filter(([, n]) => n > 1).map(([id]) => id);
  if (duplicados.length > 0) {
    agregar('alerta', 'ti-copy', `Hay ${duplicados.length} ID${duplicados.length > 1 ? 's' : ''} de ticket duplicado${duplicados.length > 1 ? 's' : ''}`,
      `${duplicados.slice(0, 4).join(', ')}. Ocurre cuando se borra un ticket y se crea otro (el ID se genera con la cantidad de tickets + 1); al actualizar uno puede modificarse el equivocado.`);
  }
  if (fechasInvalidas > 0) {
    agregar('aviso', 'ti-calendar-off', `${fechasInvalidas} ticket${fechasInvalidas > 1 ? 's' : ''} con fecha de ingreso inválida`,
      'No se pueden ubicar en ningún período, así que no aparecen en los gráficos.');
  }
  const futuros = todosLosTickets.filter(t => new Date(t.fechaIngreso) > new Date(Date.now() + 86400000));
  if (futuros.length > 0) {
    agregar('aviso', 'ti-calendar-time', `${futuros.length} ticket${futuros.length > 1 ? 's' : ''} con fecha futura`,
      `Revisa ${futuros.slice(0, 4).map(t => t.id).join(', ')}: probablemente un error de tipeo en la fecha manual.`);
  }

  const orden = { alerta: 0, aviso: 1, info: 2 };
  return hallazgos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

// ============================================================
// RENDER
// ============================================================

function renderizarDashboard() {
  const contenedor = document.getElementById('dashboard-contenido');
  if (!contenedor) return;

  const unidad = dashGranularidad === 'mes' ? 'mes' : 'semana';
  const unidadPlural = dashGranularidad === 'mes' ? 'meses' : 'semanas';
  const todos = obtenerTickets();
  const periodos = dashConstruirPeriodos(dashGranularidad, DASH_PERIODOS);
  const fechasInvalidas = dashAsignarTickets(periodos, todos);
  const completos = periodos.filter(p => !p.parcial);
  const totalRango = periodos.reduce((a, p) => a + p.total, 0);

  if (todos.length === 0) {
    contenedor.innerHTML = '<div class="bloque-reporte"><p class="texto-secundario">Aún no hay tickets. El dashboard se llena en cuanto ingreses o sincronices casos.</p></div>';
    return;
  }

  const regresion = dashRegresion(completos.map(p => p.total));
  const media = dashMedia(completos.map(p => p.total));
  const ult = completos[completos.length - 1];
  const ant = completos[completos.length - 2];
  const parcial = periodos[periodos.length - 1];

  // ---- KPIs
  const pctUlt = dashVariacionPct(ult.total, ant.total);
  const textoVar = pctUlt === null ? 'sin base previa'
    : `${pctUlt > 0 ? '↑' : (pctUlt < 0 ? '↓' : '→')} ${Math.abs(pctUlt).toFixed(0)}% vs. ${unidad} previo`;
  const claseVar = pctUlt > 0 ? 'comparacion-sube' : (pctUlt < 0 ? 'comparacion-baja' : '');

  const relativa = media > 0 ? (regresion.pendiente / media) * 100 : 0;
  let textoTend, claseTend;
  if (completos.length < 3 || Math.abs(relativa) < 5) { textoTend = 'Estable'; claseTend = ''; }
  else if (regresion.pendiente > 0) { textoTend = `↑ +${regresion.pendiente.toFixed(1)}/${unidad}`; claseTend = 'comparacion-sube'; }
  else { textoTend = `↓ ${regresion.pendiente.toFixed(1)}/${unidad}`; claseTend = 'comparacion-baja'; }

  const conteoCat = {};
  periodos.forEach(p => Object.entries(p.porCategoria).forEach(([c, n]) => { conteoCat[c] = (conteoCat[c] || 0) + n; }));
  const categoriasOrdenadas = Object.entries(conteoCat).sort((a, b) => b[1] - a[1]);
  const lider = categoriasOrdenadas[0];

  const kpis = `
    <div class="metricas-grid">
      <div class="metrica-card"><div class="valor">${totalRango}</div><div class="etiqueta">Casos en ${DASH_PERIODOS} ${unidadPlural}</div></div>
      <div class="metrica-card"><div class="valor">${media.toFixed(1)}</div><div class="etiqueta">Promedio por ${unidad}</div></div>
      <div class="metrica-card"><div class="valor">${ult.total}</div><div class="etiqueta">${unidad === 'mes' ? 'Último mes cerrado' : 'Última semana cerrada'}</div><div class="comparacion ${claseVar}">${textoVar}</div></div>
      <div class="metrica-card"><div class="valor">${textoTend}</div><div class="etiqueta">Tendencia</div><div class="comparacion ${claseTend}">${completos.length < 3 ? 'faltan datos' : 'regresión lineal'}</div></div>
    </div>`;

  // ---- Hallazgos
  const hallazgos = dashCalcularHallazgos(periodos, todos, fechasInvalidas);
  const htmlHallazgos = hallazgos.length === 0
    ? '<p class="texto-secundario">Sin hallazgos relevantes: no hay picos, alzas anormales ni casos atascados.</p>'
    : hallazgos.map(h => `
        <div class="hallazgo hallazgo-${h.nivel}">
          <i class="ti ${h.icono}"></i>
          <div><div class="hallazgo-titulo">${escaparHtml(h.titulo)}</div><div class="hallazgo-detalle">${escaparHtml(h.detalle)}</div></div>
        </div>`).join('');

  // ---- Tabla por categoría con sparklines
  const filasCat = categoriasOrdenadas.map(([cat, total]) => {
    const serie = completos.map(p => p.porCategoria[cat] || 0);
    const actual = serie[serie.length - 1];
    const previo = serie[serie.length - 2];
    const delta = actual - previo;
    const claseDelta = delta > 0 ? 'comparacion-sube' : (delta < 0 ? 'comparacion-baja' : '');
    const flecha = delta > 0 ? '↑' : (delta < 0 ? '↓' : '→');
    return `<tr>
      <td>${escaparHtml(formatearCategoria(cat))}</td>
      <td class="dash-celda-barra"><div class="barra-pista"><div class="barra-relleno" style="width:${(total / lider[1]) * 100}%"></div></div></td>
      <td><strong>${total}</strong> <span class="texto-secundario">(${((total / totalRango) * 100).toFixed(0)}%)</span></td>
      <td>${dashSvgSparkline(serie)}</td>
      <td>${actual}</td>
      <td class="${claseDelta}">${flecha} ${Math.abs(delta)}</td>
    </tr>`;
  }).join('');

  contenedor.innerHTML = `
    <div class="bloque-reporte">${kpis}</div>

    <div class="bloque-reporte">
      <h3>Casos por ${unidad}</h3>
      ${dashSvgBarras(periodos, regresion, unidad)}
      <p class="texto-secundario texto-pequeno">La línea punteada es la tendencia (regresión lineal sobre los ${unidadPlural} cerrados).
        * ${unidad === 'mes' ? 'Mes' : 'Semana'} en curso (${parcial.total} casos hasta ahora): no se usa en la tendencia ni en los hallazgos.</p>
    </div>

    <div class="bloque-reporte">
      <h3><i class="ti ti-bulb"></i> Hallazgos <span class="texto-secundario texto-pequeno">(${hallazgos.length})</span></h3>
      ${htmlHallazgos}
    </div>

    <div class="bloque-reporte">
      <h3>Casos por categoría</h3>
      <table class="tabla-reporte">
        <thead><tr><th>Categoría</th><th></th><th>Total (${DASH_PERIODOS} ${unidadPlural})</th><th>Evolución</th><th>Último ${unidad}</th><th>Δ vs. previo</th></tr></thead>
        <tbody>${filasCat || '<tr><td colspan="6">Sin datos en el rango.</td></tr>'}</tbody>
      </table>
    </div>`;
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

function inicializarModuloDashboard() {
  const select = document.getElementById('dashboard-granularidad');
  if (!select) return;
  select.value = dashGranularidad;
  select.addEventListener('change', () => {
    dashGranularidad = select.value === 'mes' ? 'mes' : 'semana';
    renderizarDashboard();
  });
}
