/* ------------------------------------------------------------------
   Casa Rural Garrido · reserva.js
   Motor de reservas de DEMOSTRACIÓN, por habitaciones.
   Las noches ocupadas de cada habitación se generan (siempre las mismas
   para cada año) a partir de hoy; no hay servidor, no se envía ni se
   cobra nada. Al conectar el motor real, solo cambian ocupadas() y
   confirmar().
   SUPUESTOS (van a los pendientes de la casa): precios por habitación y
   noche (Google marca «desde 90 €»), temporada alta, plazas de cada
   habitación según las camas de su web antigua.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  const raiz = document.getElementById('motor');
  if (!raiz) return;

  /* ---------- fechas ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const clave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const deClave = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const mas = (k, n) => { const d = deClave(k); d.setDate(d.getDate() + n); return clave(d); };
  const entre = (a, b) => Math.round((deClave(b) - deClave(a)) / 864e5);
  const hoy = clave(new Date());
  const fCorta = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fEur = new Intl.NumberFormat('es-ES');
  const corta = (k) => fCorta.format(deClave(k));
  const larga = (k) => fLarga.format(deClave(k));
  const eur = (n) => fEur.format(n) + ' €';

  // Domingo de Pascua (algoritmo anónimo gregoriano)
  function pascua(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return clave(new Date(y, mes - 1, dia));
  }

  /* ---------- habitaciones (camas de su web antigua) y precios SUPUESTOS ---------- */
  const HABS = [
    { id: 'ciervo', nombre: 'El Ciervo', plazas: 3, camas: '150 + 90', precio: 105 },
    { id: 'molino', nombre: 'El Molino', plazas: 4, camas: '150 + 90 + 90 · hidromasaje', precio: 125 },
    { id: 'escudo', nombre: 'El Escudo', plazas: 3, camas: '135 + nido', precio: 95 },
    { id: 'castillo', nombre: 'El Castillo', plazas: 2, camas: '150 · balcón', precio: 90 },
    { id: 'aguila', nombre: 'El Águila', plazas: 2, camas: '150 · balcón', precio: 90 },
    { id: 'barco', nombre: 'El Barco', plazas: 2, camas: '150 · balcón', precio: 90 },
  ];
  const SUPL_ALTA = 15;              // € por habitación y noche en temporada alta
  const MAX_PERS = HABS.reduce((s, h) => s + h.plazas, 0), VENTANA = 12;
  // Temporada alta SUPUESTA: Semana Santa, agosto, puente de diciembre y Navidad
  const cacheAlta = new Map();
  function esAlta(k) {
    if (cacheAlta.has(k)) return cacheAlta.get(k);
    const y = +k.slice(0, 4), md = k.slice(5);
    const p = pascua(y);
    const v = (k >= mas(p, -4) && k <= p) || (md >= '08-01' && md <= '08-31') || (md >= '12-05' && md <= '12-08') || md >= '12-23' || md <= '01-06';
    cacheAlta.set(k, v);
    return v;
  }
  const precioNoche = (h, k) => h.precio + (esAlta(k) ? SUPL_ALTA : 0);

  /* ---------- noches ocupadas de ejemplo, por habitación ---------- */
  function azar(s) { return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const OCUP = new Map(HABS.map((h) => [h.id, new Set()]));
  (function generar() {
    const anios = new Set();
    for (let k = mas(hoy, -40); k <= mas(hoy, 400); k = mas(k, 1)) anios.add(+k.slice(0, 4));
    HABS.forEach((h, i) => {
      const set = OCUP.get(h.id);
      const tomar = (a, n) => { for (let j = 0; j < n; j++) set.add(mas(a, j)); };
      anios.forEach((y) => {
        const r = azar(y * 7919 + i * 104729);
        for (let k = `${y}-01-01`; k <= `${y}-12-31`; k = mas(k, 1)) {
          const dsem = deClave(k).getDay();
          if (dsem === 5 && r() < 0.5) tomar(k, 2);                 // fines de semana
          else if (dsem >= 1 && dsem <= 4 && r() < 0.07) tomar(k, 1 + Math.floor(r() * 2));   // entre semana, poco
        }
        if (r() < 0.9) tomar(mas(pascua(y), -3), 3);                 // Semana Santa
        let k = `${y}-08-01`;                                       // agosto, casi lleno
        while (k < `${y}-09-01`) { const n = 2 + Math.floor(r() * 4); if (r() < 0.78) tomar(k, n); k = mas(k, n + (r() < 0.35 ? 1 : 0)); }
        [[`${y}-10-10`, 3], [`${y}-10-31`, 2], [`${y}-12-05`, 3], [`${y}-12-30`, 3]].forEach(([a, n]) => { if (r() < 0.7) tomar(a, n); });
      });
    });
  })();
  const ocupadaHab = (id, k) => OCUP.get(id).has(k);
  const libreHab = (id, a, b) => { for (let k = a; k < b; k = mas(k, 1)) if (ocupadaHab(id, k)) return false; return true; };

  /* ---------- estado ---------- */
  const b0 = deClave(hoy);
  const st = { y: b0.getFullYear(), m: b0.getMonth(), ini: null, fin: null, pers: 2, filtro: '', sel: [], paso: 'fechas', msg: '', datos: {}, metodo: 'tarjeta', loc: '' };
  const minMes = st.y * 12 + st.m, maxMes = minMes + VENTANA - 1;
  const limite = clave(new Date(b0.getFullYear(), b0.getMonth() + VENTANA, 0));
  // habitaciones que cuentan en el calendario: la del filtro o todas
  const enJuego = () => (st.filtro ? HABS.filter((h) => h.id === st.filtro) : HABS);
  const libresNoche = (k) => enJuego().filter((h) => !ocupadaHab(h.id, k)).length;
  // un rango vale si alguna habitación (de las que cuentan) está libre todas las noches
  const rangoPosible = (a, b) => enJuego().some((h) => libreHab(h.id, a, b));
  const noches = () => (st.ini && st.fin ? entre(st.ini, st.fin) : 0);
  const totalHab = (h) => { let t = 0; for (let k = st.ini; k < st.fin; k = mas(k, 1)) t += precioNoche(h, k); return t; };
  const elegidas = () => HABS.filter((h) => st.sel.includes(h.id));
  const plazasSel = () => elegidas().reduce((s, h) => s + h.plazas, 0);
  const cuenta = () => {
    const n = noches(), hs = elegidas();
    let alta = 0;
    for (let k = st.ini; n && k < st.fin; k = mas(k, 1)) if (esAlta(k)) alta++;
    return { n, alta, filas: hs.map((h) => ({ h, total: totalHab(h) })), total: n ? hs.reduce((s, h) => s + totalHab(h), 0) : 0 };
  };
  const listo = () => noches() >= 1 && st.sel.length && plazasSel() >= st.pers && elegidas().every((h) => libreHab(h.id, st.ini, st.fin));

  // propone habitaciones para el grupo: la del filtro, o las libres más ajustadas
  function proponer() {
    if (!noches()) { st.sel = []; return; }
    const libres = HABS.filter((h) => libreHab(h.id, st.ini, st.fin));
    if (st.filtro && libres.some((h) => h.id === st.filtro)) {
      st.sel = [st.filtro];
      if (plazasSel() >= st.pers) return;
    } else st.sel = [];
    // primero la más pequeña en la que caben todos; si no, de mayor a menor hasta que quepan
    const resto = libres.filter((h) => !st.sel.includes(h.id));
    const falta = st.pers - plazasSel();
    const una = resto.filter((h) => h.plazas >= falta).sort((a, b) => a.plazas - b.plazas || a.precio - b.precio)[0];
    if (una) { st.sel.push(una.id); return; }
    resto.sort((a, b) => b.plazas - a.plazas).forEach((h) => { if (plazasSel() < st.pers) st.sel.push(h.id); });
  }

  /* ---------- pintar ---------- */
  const DSEM = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const PASOS = [['fechas', 'Fechas y habitación'], ['datos', 'Sus datos'], ['pago', 'Pago'], ['hecho', 'Confirmación']];
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function mesHTML(y, m) {
    const primero = new Date(y, m, 1), dias = new Date(y, m + 1, 0).getDate();
    const off = (primero.getDay() + 6) % 7;
    const nombre = primero.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    let h = `<div class="mes"><h4 class="mes__tit">${nombre[0].toUpperCase() + nombre.slice(1)}</h4><div class="dias" role="group" aria-label="${nombre}">`;
    h += DSEM.map((d) => `<span class="dsem" aria-hidden="true">${d}</span>`).join('');
    for (let i = 0; i < off; i++) h += '<span class="vacio"></span>';
    for (let d = 1; d <= dias; d++) {
      const k = `${y}-${pad(m + 1)}-${pad(d)}`;
      const c = ['dia'];
      let dis = false, et = larga(k);
      const libres = libresNoche(k);
      if (k < hoy || k > limite) { c.push('pasado'); dis = true; }
      else if (!libres) {
        if (st.ini && !st.fin && k > st.ini && rangoPosible(st.ini, k)) { c.push('solo-salida'); et += ', libre para salir'; }
        else { c.push('ocupado'); dis = true; et += st.filtro ? ', ocupada' : ', completo'; }
      } else {
        et += st.filtro ? ', libre' : `, ${libres} ${libres === 1 ? 'habitación libre' : 'habitaciones libres'}`;
        if (!st.filtro && libres <= 2) c.push('pocas');
      }
      if (esAlta(k) && !dis) { c.push('alta'); et += ', temporada alta'; }
      if (st.ini && k === st.ini) { c.push('ini'); if (!st.fin) c.push('sola'); et += ', llegada'; }
      if (st.fin && k === st.fin) { c.push('fin'); et += ', salida'; }
      if (st.ini && st.fin && k > st.ini && k < st.fin) c.push('rango');
      h += `<button type="button" class="${c.join(' ')}" data-k="${k}" aria-label="${et}"${dis ? ' aria-disabled="true" tabindex="-1"' : ''}${(k === st.ini || k === st.fin) ? ' aria-pressed="true"' : ''}>${d}</button>`;
    }
    return h + '</div></div>';
  }

  function filtroHTML() {
    return '<div class="motor__filtro" role="group" aria-label="Ver la disponibilidad de">'
      + `<button type="button" data-filtro="" aria-pressed="${!st.filtro}">Todas</button>`
      + HABS.map((h) => `<button type="button" data-filtro="${h.id}" aria-pressed="${st.filtro === h.id}">${h.nombre}</button>`).join('') + '</div>';
  }

  function resumenFechas() {
    return `<div class="fechas"><div><small>Llegada</small><b>${st.ini ? corta(st.ini) : '—'}</b></div><div><small>Salida</small><b>${st.fin ? corta(st.fin) : '—'}</b></div></div>`;
  }

  function habsHTML() {
    if (!noches()) return '';
    const n = noches();
    return '<div class="motor__habs" role="group" aria-label="Habitaciones para estas fechas">' + HABS.map((h) => {
      const libre = libreHab(h.id, st.ini, st.fin), on = st.sel.includes(h.id);
      const precio = libre ? `${eur(totalHab(h))}<small>${n} ${n === 1 ? 'noche' : 'noches'}</small>` : '<small>Ocupada</small>';
      return `<button type="button" class="hab${on ? ' on' : ''}" data-hab="${h.id}" aria-pressed="${on}"${libre ? '' : ' aria-disabled="true"'}>
        <span class="hab__n"><b>${h.nombre}</b><small>Hasta ${h.plazas} · ${h.camas}</small></span><span class="hab__p">${precio}</span></button>`;
    }).join('') + '</div>';
  }

  function panelFechas() {
    const c = cuenta(), ok = listo();
    let d = '<div class="desglose">';
    if (!c.n) d += `<div class="nada">${st.ini ? 'Ahora, el día de salida.' : 'Elija el día de llegada en el calendario.'}</div>`;
    else if (!c.filas.length) d += '<div class="nada">Elija una o varias habitaciones.</div>';
    else {
      c.filas.forEach(({ h, total }) => { d += `<div><span>${h.nombre} · ${c.n} ${c.n === 1 ? 'noche' : 'noches'}</span><span>${eur(total)}</span></div>`; });
      if (c.alta) d += `<div class="alta-nota"><span>Incluye ${c.alta} ${c.alta === 1 ? 'noche' : 'noches'} de temporada alta</span><span></span></div>`;
      d += `<div class="tot"><span>Total</span><span>${eur(c.total)}</span></div>`;
    }
    d += '</div>';
    const plazas = plazasSel();
    const aviso = c.n && st.sel.length && plazas < st.pers ? `<p class="motor__msg">Con estas habitaciones caben ${plazas}: añada otra para ${st.pers}.</p>` : '';
    return `<h3 id="motor-tit-paso" tabindex="-1">Su estancia</h3>
      ${resumenFechas()}
      <div class="pers"><div><small>Personas</small><b aria-live="polite">${st.pers}</b></div>
        <button type="button" data-acc="menos" aria-label="Una persona menos"${st.pers <= 1 ? ' disabled' : ''}>−</button>
        <button type="button" data-acc="mas" aria-label="Una persona más"${st.pers >= MAX_PERS ? ' disabled' : ''}>+</button></div>
      ${habsHTML()}
      ${aviso}
      ${d}
      <button type="button" class="btn btn--oro" data-acc="seguir" aria-disabled="${!ok}">Reservar</button>
      <p class="motor__fino">Precio por habitación y noche. En temporada alta, ${SUPL_ALTA} € más por noche.</p>`;
  }

  function panelDatos() {
    const c = cuenta(), v = st.datos;
    return `<h3 id="motor-tit-paso" tabindex="-1">Sus datos</h3>
      <p class="motor__fino">${corta(st.ini)} → ${corta(st.fin)} · ${c.n} ${c.n === 1 ? 'noche' : 'noches'} · ${elegidas().map((h) => h.nombre).join(', ')} · ${st.pers} ${st.pers === 1 ? 'persona' : 'personas'} · <b>${eur(c.total)}</b></p>
      <form class="motor__form" id="motor-form" novalidate>
        <label for="m-nombre">Nombre y apellidos<input type="text" id="m-nombre" autocomplete="name" required value="${esc(v.nombre)}"></label>
        <label for="m-correo">Correo<input type="email" id="m-correo" autocomplete="email" required value="${esc(v.correo)}"></label>
        <label for="m-tel">Teléfono<input type="tel" id="m-tel" autocomplete="tel" required value="${esc(v.tel)}"></label>
        <label for="m-nota">¿Algo que debamos saber? <span>(opcional)</span><textarea id="m-nota" rows="2">${esc(v.nota)}</textarea></label>
        <label class="check" for="m-ok"><input type="checkbox" id="m-ok" required${v.ok ? ' checked' : ''}><span>He leído la <a class="enlace" href="privacidad.html">política de privacidad</a> y acepto las condiciones de la reserva.</span></label>
        <p class="motor__msg" id="m-error" aria-live="assertive"></p>
        <button type="submit" class="btn btn--oro">Seguir al pago</button>
        <button type="button" class="btn btn--linea" data-acc="volver">Cambiar fechas</button>
      </form>`;
  }

  function panelPago() {
    const c = cuenta();
    return `<h3 id="motor-tit-paso" tabindex="-1">Pago</h3>
      ${resumenFechas()}
      <div class="desglose"><div class="tot"><span>A pagar ahora</span><span>${eur(c.total)}</span></div></div>
      <fieldset class="metodos"><legend>Cómo quiere pagar</legend>
        <label class="metodo" for="m-tarjeta"><input type="radio" name="metodo" id="m-tarjeta" value="tarjeta"${st.metodo === 'tarjeta' ? ' checked' : ''}><span>Tarjeta<small>En la pasarela segura del banco</small></span></label>
        <label class="metodo" for="m-bizum"><input type="radio" name="metodo" id="m-bizum" value="bizum"${st.metodo === 'bizum' ? ' checked' : ''}><span>Bizum<small>Con su móvil</small></span></label>
      </fieldset>
      <button type="button" class="btn btn--oro" data-acc="pagar">Pagar ${eur(c.total)} y reservar</button>
      <button type="button" class="btn btn--linea" data-acc="volver-datos">Volver a los datos</button>
      <p class="motor__fino">Demostración: aquí se abriría la pasarela de pago. No se cobra nada.</p>`;
  }

  function panelHecho() {
    const c = cuenta();
    return `<div class="confirmacion">
      <h3 id="motor-tit-paso" tabindex="-1">Reserva hecha</h3>
      <p class="confirmacion__loc">${st.loc}</p>
      <p>${larga(st.ini)} → ${larga(st.fin)}<br>${elegidas().map((h) => h.nombre).join(', ')} · ${c.n} ${c.n === 1 ? 'noche' : 'noches'} · ${st.pers} ${st.pers === 1 ? 'persona' : 'personas'} · ${eur(c.total)} · ${st.metodo === 'bizum' ? 'Bizum' : 'tarjeta'}</p>
      <p>Le esperamos en la calle Solano, 6.</p>
      <p class="motor__fino">Demostración: no se ha enviado ni cobrado nada. En la web real le llegaría la confirmación por correo.</p>
      <button type="button" class="btn btn--linea" data-acc="otra">Hacer otra reserva</button>
    </div>`;
  }

  function pintar(foco) {
    const y2 = st.m === 11 ? st.y + 1 : st.y, m2 = (st.m + 1) % 12, actual = st.y * 12 + st.m;
    const iPaso = PASOS.findIndex((p) => p[0] === st.paso);
    const pasos = '<ol class="motor__pasos">' + PASOS.map(([k, t], i) => `<li${i === iPaso ? ' aria-current="step"' : ''}${i < iPaso ? ' class="hecho"' : ''}>${t}</li>`).join('') + '</ol>';
    const panel = { fechas: panelFechas, datos: panelDatos, pago: panelPago, hecho: panelHecho }[st.paso]();
    raiz.innerHTML = pasos + `<div class="motor__in">
      <div class="motor__cal"${st.paso !== 'fechas' ? ' inert' : ''}>
        <div class="motor__top"><h3>Disponibilidad</h3>
          <button type="button" class="motor__nav" data-acc="prev" aria-label="Mes anterior"${actual <= minMes ? ' disabled' : ''}>‹</button>
          <button type="button" class="motor__nav" data-acc="next" aria-label="Mes siguiente"${actual + 1 >= maxMes ? ' disabled' : ''}>›</button></div>
        ${filtroHTML()}
        <div class="motor__meses">${mesHTML(st.y, st.m)}${mesHTML(y2, m2)}</div>
        <div class="motor__ley"><span><i class="l-est"></i>Su estancia</span><span><i class="l-ocu"></i>${st.filtro ? 'Ocupada' : 'Completo'}</span>${st.filtro ? '' : '<span><i class="l-pocas"></i>Quedan pocas</span>'}<span><i class="l-alta"></i>Temporada alta</span></div>
        <p class="motor__msg" aria-live="polite">${st.msg}</p>
      </div>
      <div class="motor__res">${panel}</div></div>`;
    if (foco) {
      const el = typeof foco === 'string' ? raiz.querySelector(foco) : null;
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* ---------- acciones ---------- */
  raiz.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !raiz.contains(b)) return;
    if (b.dataset.k) {
      if (b.getAttribute('aria-disabled') === 'true' || st.paso !== 'fechas') return;
      const k = b.dataset.k;
      st.msg = '';
      if (!st.ini || st.fin || k <= st.ini) {
        if (!libresNoche(k)) return;
        st.ini = k; st.fin = null; st.sel = [];
      } else if (!rangoPosible(st.ini, k)) {
        st.msg = st.filtro ? 'Esa habitación está ocupada alguna noche entre medias: elija otra salida u otra habitación.' : 'No hay ninguna habitación libre todas esas noches: elija otra salida.';
        if (libresNoche(k)) { st.ini = k; st.fin = null; st.sel = []; }
      } else { st.fin = k; proponer(); }
      pintar(`[data-k="${k}"]`);
      return;
    }
    if (b.dataset.filtro !== undefined) {
      st.filtro = b.dataset.filtro;
      // las fechas no se pierden: si la habitación no está libre, se avisa y se puede cambiar
      if (st.ini && st.fin && !rangoPosible(st.ini, st.fin)) { st.sel = []; st.msg = `${HABS.find((h) => h.id === st.filtro).nombre} no está libre todas esas noches: elija otras fechas u otra habitación.`; }
      else { st.msg = ''; if (st.fin) proponer(); }
      pintar(`[data-filtro="${st.filtro}"]`);
      return;
    }
    if (b.dataset.hab) {
      if (b.getAttribute('aria-disabled') === 'true') return;
      const id = b.dataset.hab;
      st.sel = st.sel.includes(id) ? st.sel.filter((x) => x !== id) : st.sel.concat(id);
      pintar(`[data-hab="${id}"]`);
      return;
    }
    const a = b.dataset.acc;
    if (!a) return;
    let foco = `[data-acc="${a}"]:not(:disabled)`;
    if (a === 'prev') { if (st.m === 0) { st.m = 11; st.y--; } else st.m--; }
    else if (a === 'next') { if (st.m === 11) { st.m = 0; st.y++; } else st.m++; }
    else if (a === 'menos') { st.pers = Math.max(1, st.pers - 1); }
    else if (a === 'mas') { st.pers = Math.min(MAX_PERS, st.pers + 1); if (plazasSel() < st.pers) proponer(); }
    else if (a === 'seguir') {
      if (!listo()) st.msg = !st.ini ? 'Elija primero el día de llegada.' : !st.fin ? 'Falta el día de salida.' : !st.sel.length ? 'Elija una habitación.' : `Las habitaciones elegidas son para ${plazasSel()}: añada otra.`;
      else { st.paso = 'datos'; st.msg = ''; foco = '#motor-tit-paso'; }
    }
    else if (a === 'volver') { guardarDatos(); st.paso = 'fechas'; foco = '#motor-tit-paso'; }
    else if (a === 'volver-datos') { st.paso = 'datos'; foco = '#motor-tit-paso'; }
    else if (a === 'pagar') {
      const r = raiz.querySelector('input[name="metodo"]:checked');
      st.metodo = r ? r.value : 'tarjeta';
      st.loc = 'GRD-' + st.ini.slice(2).replace(/-/g, '') + '-' + String((entre(st.ini, st.fin) * 37 + st.pers * 11 + st.sel.length * 101 + (st.datos.nombre || '').length * 7) % 1000).padStart(3, '0');
      st.paso = 'hecho'; foco = '#motor-tit-paso';
    }
    else if (a === 'otra') { st.paso = 'fechas'; st.ini = st.fin = null; st.sel = []; st.datos = {}; foco = '#motor-tit-paso'; }
    else return;
    pintar(foco);
    if (['seguir', 'volver', 'volver-datos', 'pagar', 'otra'].includes(a) && st.msg === '' && window.GRD) {
      const r = raiz.getBoundingClientRect();
      if (r.top < 0 || r.top > innerHeight * 0.5) window.GRD.irA(raiz);
    }
  });

  function guardarDatos() {
    const v = (id) => { const el = raiz.querySelector('#' + id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    if (!raiz.querySelector('#m-nombre')) return;
    st.datos = { nombre: v('m-nombre'), correo: v('m-correo'), tel: v('m-tel'), nota: v('m-nota'), ok: v('m-ok') };
  }

  raiz.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, err = f.querySelector('#m-error');
    guardarDatos();
    const campos = ['m-nombre', 'm-correo', 'm-tel'].map((id) => f.querySelector('#' + id));
    campos.forEach((c) => c.removeAttribute('aria-invalid'));
    const falta = [];
    if (!st.datos.nombre.trim()) falta.push([campos[0], 'el nombre']);
    if (!/^\S+@\S+\.\S{2,}$/.test(st.datos.correo.trim())) falta.push([campos[1], 'un correo válido']);
    if (st.datos.tel.replace(/\D/g, '').length < 9) falta.push([campos[2], 'un teléfono de al menos 9 cifras']);
    if (falta.length) {
      falta.forEach(([c]) => c.setAttribute('aria-invalid', 'true'));
      err.textContent = 'Falta ' + falta.map((x) => x[1]).join(', ') + '.';
      falta[0][0].focus();
      return;
    }
    if (!st.datos.ok) { err.textContent = 'Falta aceptar la política de privacidad.'; f.querySelector('#m-ok').focus(); return; }
    st.paso = 'pago';
    pintar('#motor-tit-paso');
  });

  /* ---------- «Consultar El Molino» desde su ficha: filtra el calendario por ella ---------- */
  function elegirHabitacion(id) {
    if (st.paso !== 'fechas') { st.paso = 'fechas'; }
    st.filtro = id;
    st.msg = '';
    if (st.ini && st.fin && libreHab(id, st.ini, st.fin)) proponer();
    else {
      // la próxima noche de viernes a domingo en que esté libre
      st.ini = st.fin = null; st.sel = [];
      for (let k = mas(hoy, 1), i = 0; i < 200; k = mas(k, 1), i++) {
        if (deClave(k).getDay() === 5 && libreHab(id, k, mas(k, 2))) { st.ini = k; st.fin = mas(k, 2); break; }
      }
      if (st.ini) { const d = deClave(st.ini); st.y = d.getFullYear(); st.m = d.getMonth(); proponer(); }
    }
    pintar();
  }

  // estado inicial de ejemplo: el próximo fin de semana con alguna habitación libre, para 2
  for (let k = mas(hoy, 1), i = 0; i < 120; k = mas(k, 1), i++) {
    if (deClave(k).getDay() === 5 && rangoPosible(k, mas(k, 2))) {
      st.ini = k; st.fin = mas(k, 2);
      const d = deClave(k); st.y = d.getFullYear(); st.m = d.getMonth();
      if (st.y * 12 + st.m + 1 > maxMes) { st.y = b0.getFullYear(); st.m = b0.getMonth(); }
      proponer();
      break;
    }
  }
  pintar();

  window.GRDmotor = { elegirHabitacion };
  // para las pruebas
  window.__motor = { st, HABS, ocupadaHab, libreHab, esAlta, cuenta, pascua, precioNoche };
})();
