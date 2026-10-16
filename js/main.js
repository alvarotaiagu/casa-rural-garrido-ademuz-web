/* ------------------------------------------------------------------
   Casa Rural Garrido · Ademuz · «Solano, 6»
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  const raiz = document.documentElement;
  const hayGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fino = matchMedia('(pointer: fine)').matches;
  // «con-movimiento» SOLO con GSAP y sin movimiento reducido: si no, los
  // titulares partidos y las entradas se quedarían escondidos.
  const motion = hayGSAP && !quieto;
  if (motion) raiz.classList.add('con-movimiento');
  if (hayGSAP) {
    gsap.registerPlugin(ScrollTrigger);
    // el resize lo gestionamos nosotros (la barra del móvil no rehace nada)
    ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load', ignoreMobileResize: true });
  }

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const f = (n) => Math.round(n * 100) / 100;
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // el resize de la barra del móvil (mismo ancho, poca altura) no rehace NADA
  let anchoVista = innerWidth, altoVista = innerHeight;
  const esBarra = () => !fino && innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160;

  /* ============ 1. titulares partidos en palabras ============ */
  function partir(h) {
    if (h.classList.contains('es-partido')) return;
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let n = 0;
    const envolver = (nodo) => {
      if (nodo.nodeType === 3) {
        const frag = document.createDocumentFragment();
        // solo espacios normales: el espacio duro (&nbsp;) mantiene unidas las palabras que deben ir juntas
        nodo.textContent.split(/([ \t\r\n]+)/).forEach((t) => {
          if (!t.trim()) { frag.appendChild(document.createTextNode(t)); return; }
          const pal = document.createElement('span');
          pal.className = 'pal';
          pal.setAttribute('aria-hidden', 'true');
          const i = document.createElement('i');
          i.textContent = t;
          i.style.setProperty('--n', n++);
          pal.appendChild(i);
          frag.appendChild(pal);
        });
        nodo.replaceWith(frag);
      } else if (nodo.nodeType === 1) {
        Array.from(nodo.childNodes).forEach(envolver);
      }
    };
    Array.from(h.childNodes).forEach(envolver);
    h.classList.add('es-partido');
  }
  const vistos = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('es-visto'); vistos.unobserve(e.target); }
  }), { rootMargin: '0px 0px -10% 0px' });
  if (motion) {
    $$('[data-partir]').forEach((h) => {
      if (h.closest('.hero')) { partir(h); return; }     // el del hero, al abrirse la cortina
      partir(h);
      vistos.observe(h);
    });
    $$('[data-revela]').forEach((el, i) => {
      el.style.setProperty('--d', i % 3);
      vistos.observe(el);
    });
  }

  /* ============ 2. Lenis ============ */
  let lenis = null;
  if (typeof Lenis !== 'undefined' && !quieto) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, lerp: 0.12 });
    if (hayGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
    } else {
      const bucle = (t) => { lenis.raf(t); requestAnimationFrame(bucle); };
      requestAnimationFrame(bucle);
    }
  }
  const irA = (sel) => {
    const el = typeof sel === 'string' ? $(sel) : sel;
    if (!el) return;
    const y = el.getBoundingClientRect().top + scrollY - 70;
    if (lenis) lenis.scrollTo(y, { duration: 1.1 });
    else scrollTo({ top: y, behavior: quieto ? 'auto' : 'smooth' });
  };
  window.GRD = { irA };      // el motor de reservas lo usa para no perderse al cambiar de paso

  /* ============ 3. vetas de nogal (dibujadas, no imágenes) ============ */
  (function vetas() {
    const NS = 'http://www.w3.org/2000/svg';
    const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    $$('.veta-dibujo').forEach((svg, k) => {
      const fina = svg.closest('.veta');
      const W = 1400, H = fina ? 26 : 900, lineas = fina ? 5 : 46;
      const r = rng(k * 131 + 7);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('preserveAspectRatio', 'none');
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('fill', 'none');
      g.setAttribute('stroke', 'currentColor');
      for (let i = 0; i < lineas; i++) {
        const y0 = (i + 0.5) * (H / lineas) + (r() - 0.5) * (H / lineas) * 0.6;
        const amp = (fina ? 1.6 : 6) * (0.4 + r());
        const per = 260 + r() * 520, fase = r() * 6.28;
        // un nudo de vez en cuando: la línea se abomba alrededor de un punto
        const nudo = !fina && r() < 0.12 ? { x: r() * W, a: 8 + r() * 14 } : null;
        let d = '';
        for (let x = -20; x <= W + 20; x += 20) {
          let y = y0 + Math.sin(x / per * 6.28 + fase) * amp;
          if (nudo) y += nudo.a * Math.exp(-((x - nudo.x) ** 2) / 9000);
          d += (d ? 'L' : 'M') + x + ',' + f(y);
        }
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('stroke-width', f(fina ? 0.8 + r() : 0.7 + r() * 1.6));
        p.setAttribute('stroke-opacity', f(0.25 + r() * 0.6));
        p.setAttribute('vector-effect', 'non-scaling-stroke');
        g.appendChild(p);
      }
      svg.appendChild(g);
    });
  })();

  /* ============ 4. el sol de hoy en Ademuz (calculado, no inventado) ============
     Ecuación del amanecer (NOAA simplificada) para 40,0603 N, 1,2860 O. */
  (function sol() {
    const sale = $('#sol-sale'), pone = $('#sol-pone');
    if (!sale) return;
    const lat = 40.0603, lon = -1.2860, rad = Math.PI / 180;
    const J = Date.now() / 864e5 + 2440587.5;
    const n = Math.ceil(J - 2451545 + 0.0008);
    const Js = n - lon / 360;
    const M = (357.5291 + 0.98560028 * Js) % 360;
    const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    const L = (M + C + 180 + 102.9372) % 360;
    const Jt = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    const sd = Math.sin(L * rad) * Math.sin(23.4397 * rad), cd = Math.cos(Math.asin(sd));
    const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * sd) / (Math.cos(lat * rad) * cd)) / rad;
    const aFecha = (j) => new Date((j - 2440587.5) * 864e5);
    const hora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
    sale.textContent = hora.format(aFecha(Jt - w / 360));
    pone.textContent = 'y el sol se pone a las ' + hora.format(aFecha(Jt + w / 360));
  })();

  /* ============ 5. el umbral: arrastrar el 6 de la calle al salón ============ */
  const umbral = (function () {
    const el = $('#umbral'), asa = $('#umbral-asa');
    if (!el) return null;
    const estado = { u: 0.42 };
    let objetivo = 0.42, tocado = false;
    const pintar = () => {
      const u = estado.u;
      el.style.setProperty('--u', f(u * 1000) / 1000);
      el.dataset.lado = u < 0.5 ? 'fuera' : 'dentro';
      asa.setAttribute('aria-valuenow', Math.round(u * 100));
      asa.setAttribute('aria-valuetext', u < 0.35 ? 'Más calle que salón' : u > 0.65 ? 'Ya dentro, en el salón' : 'En el umbral');
    };
    const ir = (u, suave) => {
      u = limitar(u, 0.04, 0.96);
      objetivo = u;
      if (suave && motion) gsap.to(estado, { u, duration: 0.6, ease: 'expo.out', onUpdate: pintar, overwrite: true });
      else { if (hayGSAP) gsap.killTweensOf(estado); estado.u = u; pintar(); }
    };
    const desdeX = (x) => { const r = el.getBoundingClientRect(); return (x - r.left) / r.width; };
    let arrastre = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      tocado = true;
      arrastre = { id: e.pointerId, x0: e.clientX, y0: e.clientY, decidido: e.pointerType === 'mouse' };
      if (arrastre.decidido) { el.setPointerCapture(e.pointerId); ir(desdeX(e.clientX), true); }
    });
    el.addEventListener('pointermove', (e) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      if (!arrastre.decidido) {
        // en táctil: si el dedo va de lado, es nuestro; si va de arriba abajo, es scroll
        const dx = Math.abs(e.clientX - arrastre.x0), dy = Math.abs(e.clientY - arrastre.y0);
        if (dx < 6 && dy < 6) return;
        if (dy > dx) { arrastre = null; return; }
        arrastre.decidido = true;
        el.setPointerCapture(e.pointerId);
      }
      ir(desdeX(e.clientX), false);
    });
    const soltar = (e) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      if (!arrastre.decidido && e.type === 'pointerup') ir(desdeX(e.clientX), true);   // un toque: va hasta ahí
      arrastre = null;
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    asa.addEventListener('keydown', (e) => {
      const paso = { ArrowRight: 0.06, ArrowUp: 0.06, ArrowLeft: -0.06, ArrowDown: -0.06 }[e.key];
      if (paso) { e.preventDefault(); tocado = true; ir(objetivo + paso, true); }
      if (e.key === 'Home') { e.preventDefault(); ir(0, true); }
      if (e.key === 'End') { e.preventDefault(); ir(1, true); }
    });
    asa.addEventListener('click', (e) => e.preventDefault());
    pintar();
    return {
      // una pista al abrirse la cortina: el umbral se entreabre y vuelve
      pista() {
        if (!motion || tocado) return;
        gsap.timeline({ delay: 0.9 })
          .to(estado, { u: 0.66, duration: 1.1, ease: 'sine.inOut', onUpdate: pintar })
          .to(estado, { u: 0.42, duration: 1.1, ease: 'sine.inOut', onUpdate: pintar });
      },
    };
  })();

  /* ============ 6. seis puertas ============ */
  (function puertas() {
    const botones = $$('.puerta');
    const fichas = $$('.ficha-hab');
    botones.forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.hab;
      botones.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      fichas.forEach((fi) => {
        const activa = fi.dataset.hab === id;
        fi.classList.toggle('es-activa', activa);
        if (activa && motion) { fi.classList.remove('es-cambio'); void fi.offsetWidth; fi.classList.add('es-cambio'); }
      });
      const ficha = $('#hab-' + id);
      const r = ficha.getBoundingClientRect();
      if (r.top > innerHeight * 0.78) irA(ficha);
    }));
    // «Ver fechas de El Ciervo» deja el calendario del motor filtrado por ella
    $$('[data-reservar]').forEach((a) => a.addEventListener('click', () => { if (window.GRDmotor) window.GRDmotor.elegirHabitacion(a.dataset.reservar); }));
  })();

  /* ============ 7. el balcón: las contraventanas se abren al llegar ============ */
  if (motion) {
    const marco = $('#balcon-marco');
    gsap.fromTo(marco, { '--a': 0 }, {
      '--a': 84, ease: 'none',
      scrollTrigger: { trigger: marco, start: 'top 82%', end: 'top 22%', scrub: 0.6 },
    });
  }

  /* ============ 8. el Rincón en minutos (rumbo real, radio = minutos OSRM) ============ */
  (function rincon() {
    const svg = $('#rincon-plano'), lista = $('#rincon-lista');
    if (!svg) return;
    const casa = [40.0603, -1.2860];
    // minutos en coche (OSRM, 16-10-2026) desde la calle Solano
    const SITIOS = [
      ['Vallanca', 40.0630, -1.3389, 12, 'El río Bohilgues y sus senderos'],
      ['Castielfabib', 40.1304, -1.3041, 15, 'Pueblo en lo alto, con su iglesia-fortaleza'],
      ['Moya', 39.9479, -1.3662, 29, 'Las ruinas de la villa amurallada, ya en Cuenca'],
      ['Teruel', 40.3440, -1.1069, 37, 'El mudéjar, Patrimonio de la Humanidad'],
      ['Albarracín', 40.4079, -1.4440, 70, 'Murallas y casco medieval de color rodeno'],
      ['Cuenca', 40.0704, -2.1374, 87, 'Las Casas Colgadas, sobre la hoz del Huécar'],
      ['Valencia', 39.4699, -0.3763, 112, 'La ciudad y el mar'],
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const cx = 280, cy = 280, R = 232, k = (m) => Math.sqrt(m / 120) * R;
    const el = (t, a, padre, txt) => { const e = document.createElementNS(NS, t); for (const x in a) e.setAttribute(x, a[x]); if (txt) e.textContent = txt; (padre || svg).appendChild(e); return e; };
    [15, 30, 60, 120].forEach((m) => {
      el('circle', { class: 'anillo', cx, cy, r: f(k(m)) });
      el('text', { class: 'anillo-eti', x: cx + 6, y: f(cy + k(m) + 15) }, null, m < 60 ? m + ' min' : m / 60 + ' h');
    });
    const tiempo = (m) => (m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min');
    const grupos = [];
    SITIOS.forEach(([nom, la, lo, min, que], i) => {
      const dy = la - casa[0], dx = (lo - casa[1]) * Math.cos(casa[0] * Math.PI / 180);
      const ang = Math.atan2(dy, dx), r = k(min);
      const x = cx + r * Math.cos(ang), y = cy - r * Math.sin(ang);
      const g = el('g', { 'data-i': i });
      el('line', { class: 'rumbo', x1: cx, y1: cy, x2: f(x), y2: f(y) }, g);
      el('circle', { class: 'punto', cx: f(x), cy: f(y), r: 5.5 }, g);
      const izq = x < cx - 30;
      el('text', { class: 'nombre', x: f(izq ? x - 11 : x + 11), y: f(y + 5), 'text-anchor': izq ? 'end' : 'start' }, g, nom);
      grupos.push(g);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<b></b><span class="min"></span><span class="que"></span>';
      b.children[0].textContent = nom;
      b.children[1].textContent = tiempo(min);
      b.children[2].textContent = que;
      const activar = (si) => {
        grupos.forEach((o, j) => o.classList.toggle('es-activo', si && j === i));
        $$('button', lista).forEach((o) => o.setAttribute('aria-pressed', String(si && o === b)));
      };
      b.addEventListener('click', () => activar(fino || b.getAttribute('aria-pressed') !== 'true'));
      if (fino) { b.addEventListener('pointerenter', () => activar(true)); b.addEventListener('pointerleave', () => activar(false)); }
      li.appendChild(b);
      lista.appendChild(li);
    });
    el('circle', { class: 'casa-punto', cx, cy, r: 10 });
    el('text', { class: 'casa-eti', x: cx, y: cy + 32, 'text-anchor': 'middle' }, null, 'Casa Garrido');
  })();

  /* ============ 9. a la lumbre: la luz sigue al puntero (o al scroll en el móvil) ============ */
  (function brasa() {
    const el = $('#brasa');
    if (!el || !motion) return;
    let tx = 46, ty = 56, x = 46, y = 56, raf = 0, visible = false;
    const paso = () => {
      x += (tx - x) * 0.09; y += (ty - y) * 0.09;
      el.style.setProperty('--x', f(x) + '%'); el.style.setProperty('--y', f(y) + '%');
      raf = visible && Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(paso) : 0;
    };
    const mover = () => { if (!raf && visible) raf = requestAnimationFrame(paso); };
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; mover(); }).observe(el);
    if (fino) {
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width * 100; ty = (e.clientY - r.top) / r.height * 100; mover(); });
      el.addEventListener('pointerleave', () => { tx = 46; ty = 56; mover(); });
    } else {
      ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: (s) => { tx = 30 + s.progress * 40; ty = 75 - s.progress * 40; mover(); } });
    }
  })();

  /* ============ 10. cortina: el rótulo se talla y el 6 se abre ============ */
  const cortina = $('#cortina');
  const alAbrirse = [];
  function retirarCortina() {
    clearTimeout(window.__redCortina);
    if (cortina) cortina.hidden = true;
    raiz.classList.remove('cortina-activa');
    raiz.classList.add('cortina-fuera');
    if (lenis) lenis.start();
    if (hayGSAP) ScrollTrigger.refresh();
    mostrarCookies();
  }
  function abrirHero() {
    const h = $('.hero [data-partir]');
    if (h && motion) h.classList.add('es-visto');
    if (umbral) umbral.pista();
  }
  alAbrirse.push(abrirHero);

  function lanzarCortina() {
    // sin GSAP, con movimiento reducido o si el CDN tardó (> 2,5 s): fuera sin animar
    if (!cortina || !motion || performance.now() > 2500) { retirarCortina(); abrirHero(); return; }
    raiz.classList.add('cortina-activa');
    if (lenis) lenis.stop();
    const rect = $('#cortina-m-rect'), madera = $('#cortina-madera'), hueco = $('#cortina-m-hueco');
    const medir = () => {
      [rect, madera].forEach((r) => { r.setAttribute('width', innerWidth); r.setAttribute('height', innerHeight); });
    };
    medir();
    cortina.classList.add('es-lista');                 // a partir de aquí la madera la pinta el SVG
    const contenido = $('#cortina-contenido');
    const rotulo = $('.cortina__rotulo', cortina), seis = $('.cortina__seis', cortina);
    const letras = $$('.letra', rotulo).sort((a, b) => (+a.dataset.i || 0) - (+b.dataset.i || 0));
    const letrasListas = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1300))]);
    const tl = gsap.timeline();
    tl.from(rotulo, { scale: 0.94, opacity: 0, duration: 0.7, ease: 'expo.out', transformOrigin: '50% 50%' })
      .to(letras, { keyframes: { fill: ['#4d2c0a', '#ffe7b8', '#dc9a39'] }, duration: 0.55, stagger: 0.05, ease: 'power1.out' }, 0.25)
      .fromTo(letras, { y: 3 }, { y: 0, duration: 0.45, stagger: 0.05, ease: 'power2.out' }, 0.25)
      .fromTo(seis, { opacity: 0, scale: 0.55, rotate: -28 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.7)', transformOrigin: '50% 50%' }, '>-0.2')
      .add(() => {
        tl.pause();
        letrasListas.then(() => {
          // el círculo se abre desde el centro del 6
          const r = seis.getBoundingClientRect();
          const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
          hueco.setAttribute('cx', f(ox)); hueco.setAttribute('cy', f(oy));
          const radio = Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)) + 20;
          alAbrirse.forEach((fn) => fn());
          gsap.timeline({ onComplete: retirarCortina })
            .fromTo(hueco, { attr: { r: 0 } }, { attr: { r: radio }, duration: 1.15, ease: 'expo.inOut', autoRound: false })
            .to(contenido, { yPercent: -16, opacity: 0, duration: 0.85, ease: 'expo.in' }, 0)
            .to($('.cortina__veta', cortina), { opacity: 0, duration: 0.6 }, 0.3);
        });
      }, '+=0.15');
  }

  /* ============ 12. cabecera, menú y anclas ============ */
  const cab = $('#cab');
  const oscuras = $$('.hero, .oscura, .mesa, .pie');
  let pendienteCab = 0;
  const alScroll = () => {
    pendienteCab = 0;
    cab.classList.toggle('sc', scrollY > 24);
    // el 6 de la cabecera se dora al bajar: es el indicador de lectura
    const total = document.documentElement.scrollHeight - innerHeight;
    cab.style.setProperty('--p', total > 0 ? f(limitar(scrollY / total, 0, 1)) : 0);
    const y = cab.offsetHeight / 2;
    cab.classList.toggle('es-oscura', oscuras.some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; }));
  };
  addEventListener('scroll', () => { if (!pendienteCab) pendienteCab = requestAnimationFrame(alScroll); }, { passive: true });
  alScroll();

  const btnMenu = $('#menu-btn'), menu = $('#menu-movil');
  const cerrarMenu = () => {
    document.body.classList.remove('menu');
    btnMenu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  };
  btnMenu.addEventListener('click', () => {
    const abierto = document.body.classList.toggle('menu');
    btnMenu.setAttribute('aria-expanded', String(abierto));
    menu.setAttribute('aria-hidden', String(!abierto));
    if (lenis) abierto ? lenis.stop() : lenis.start();
  });
  $$('a[href^="#"]').forEach((a) => {
    const destino = a.getAttribute('href');
    if (destino.length < 2) return;
    a.addEventListener('click', (e) => {
      if (!$(destino)) return;
      e.preventDefault();
      cerrarMenu();
      irA(destino);
      // el foco viaja con el scroll: el siguiente Tab sigue desde allí
      setTimeout(() => {
        const t = $(destino);
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
        t.focus({ preventScroll: true });
      }, 900);
    });
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu')) { cerrarMenu(); btnMenu.focus(); }
  });

  /* ============ 13. cookies (y el mando se aparta mientras están) ============ */
  const ck = $('#cookies');
  const LLAVE = 'garrido-cookies';
  const leer = () => { try { return localStorage.getItem(LLAVE); } catch (e) { return null; } };
  const guardar = (v) => { try { localStorage.setItem(LLAVE, v); } catch (e) {} };
  const mando = $('#mando');
  const verMando = () => { if (mando && raiz.classList.contains('revision')) mando.hidden = !ck.hidden; };
  let cookiesPendientes = !leer();
  function mostrarCookies() {
    if (!cookiesPendientes) { verMando(); return; }
    cookiesPendientes = false;
    ck.hidden = false;
    verMando();
  }
  const cerrarCk = (v) => { guardar(v); ck.hidden = true; verMando(); };
  $('#ck-si').addEventListener('click', () => cerrarCk('si'));
  $('#ck-no').addEventListener('click', () => cerrarCk('no'));
  $('#abrir-cookies').addEventListener('click', () => { ck.hidden = false; verMando(); $('#ck-si').focus(); });
  if (!cortina || cortina.hidden || raiz.classList.contains('cortina-fuera')) mostrarCookies();
  // si la red de seguridad retira la cortina, el aviso sale igual
  setTimeout(() => { if (raiz.classList.contains('cortina-fuera')) mostrarCookies(); }, 6600);

  /* ============ 14. barra fija en el móvil ============
     Solo con observadores: ningún resize (ni el de la barra del navegador) la toca. */
  (function barraMovil() {
    const barra = $('#barra');
    if (!barra) return;
    const movil = matchMedia('(max-width: 999px)');
    const dentro = { hero: true, consulta: false, pie: false };
    const pintar = () => {
      const ver = movil.matches && !dentro.hero && !dentro.consulta && !dentro.pie
        && !document.body.classList.contains('menu') && ck.hidden;
      barra.classList.toggle('es-visible', ver);
      barra.setAttribute('aria-hidden', String(!ver));
      $$('a', barra).forEach((a) => a.tabIndex = ver ? 0 : -1);
      raiz.classList.toggle('con-barra', ver);
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => { dentro[e.target.dataset.barra] = e.isIntersecting; }); pintar(); });
    [['hero', '.hero'], ['consulta', '#reserva'], ['pie', '#pie']].forEach(([k, s]) => { const el = $(s); if (el) { el.dataset.barra = k; io.observe(el); } });
    const mo = new MutationObserver(pintar);
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mo.observe(ck, { attributes: true, attributeFilter: ['hidden'] });
    movil.addEventListener('change', pintar);
    pintar();
  })();

  /* ============ 15. mapa de Google solo al pedirlo ============ */
  $('#mapa-btn').addEventListener('click', () => {
    const marco = document.createElement('iframe');
    marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent('40.06033,-1.28604 (Casa Rural Garrido)') + '&z=16&output=embed';
    marco.loading = 'lazy';
    marco.title = 'Mapa con la Casa Rural Garrido en Ademuz';
    marco.referrerPolicy = 'no-referrer-when-downgrade';
    $('#mapa').appendChild(marco);
    $('#mapa-consent').remove();
  });

  /* ============ 16. pie: el rótulo se termina de tallar ============ */
  (function pie() {
    const p = $('#pie');
    $$('.pie__rotulo .letra').forEach((l, i) => l.style.setProperty('--i', +l.dataset.i || i));
    if (!motion) { p.classList.add('es-tallado'); return; }
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { p.classList.add('es-tallado'); o.disconnect(); } }, { threshold: 0.35 }).observe($('.pie__marca'));
  })();

  /* ============ 17. MANDO DE MAQUETA (no viaja al cliente) ============ */
  if (mando && raiz.classList.contains('revision')) {
    const botones = $$('button[data-densidad]', mando);
    const pintarMando = () => botones.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === raiz.classList.contains('densidad-sobria'))));
    botones.forEach((b) => b.addEventListener('click', () => {
      raiz.classList.toggle('densidad-sobria', b.dataset.densidad === 'sobria');
      const u = new URL(location.href);
      if (b.dataset.densidad === 'sobria') u.searchParams.set('densidad', 'sobria'); else u.searchParams.delete('densidad');
      history.replaceState(null, '', u);
      pintarMando();
      if (hayGSAP) ScrollTrigger.refresh();
    }));
    pintarMando();
    verMando();
  }
  /* fin del MANDO DE MAQUETA */

  // la cortina arranca al final: cuando se retira usa las cookies, la barra y la cabecera
  lanzarCortina();

  /* ============ 18. resize de verdad (no el de la barra del móvil) ============ */
  let tRes = 0;
  addEventListener('resize', () => {
    if (esBarra()) return;
    clearTimeout(tRes);
    tRes = setTimeout(() => {
      anchoVista = innerWidth; altoVista = innerHeight;
      if (hayGSAP) ScrollTrigger.refresh();
    }, 200);
  });
  addEventListener('load', () => { if (hayGSAP) ScrollTrigger.refresh(); });
})();
