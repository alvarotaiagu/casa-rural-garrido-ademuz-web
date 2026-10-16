/* Verificación de la web de la Casa Rural Garrido (Playwright, bajando con la rueda).
   Uso: node verificar.mjs [--capturas]   → capturas en ./pruebas/ */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8767;                 // puerto propio de esta web
const CAPTURAS = process.argv.includes('--capturas');
const DIR_CAP = path.join(RAIZ, 'pruebas');
if (CAPTURAS) fs.mkdirSync(DIR_CAP, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.avif': 'image/avif' };
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado (¿otra sesión?): ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;
console.log('sirviendo en ' + BASE);

const fallos = [];
let nOk = 0;
const mal = (m) => { fallos.push(m); console.log('  FALLO  ' + m); };
const ok = (m) => { nOk++; console.log('  ok     ' + m); };
const comprobar = (cond, m, detalle) => (cond ? ok(m) : mal(m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle) : '')));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const cap = async (page, nombre, op) => { if (CAPTURAS) await page.screenshot({ path: path.join(DIR_CAP, nombre + '.png'), ...(op || {}) }); };
const sinCookies = () => { try { localStorage.setItem('garrido-cookies', 'si'); } catch (e) {} };
const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

const browser = await chromium.launch({ headless: true });

/* GSAP y Lenis desde una copia local: así la cortina no depende del CDN ese día */
const CDN = {
  'gsap.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
  'ScrollTrigger.min.js': 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
  'lenis.min.js': 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
};
const CACHE = path.join(os.tmpdir(), 'neixon-cdn');   // la misma copia que usan las otras webs
fs.mkdirSync(CACHE, { recursive: true });
for (const [n, u] of Object.entries(CDN)) {
  const f = path.join(CACHE, n);
  if (!fs.existsSync(f)) fs.writeFileSync(f, Buffer.from(await (await fetch(u)).arrayBuffer()));
}
const RE_CDN = /(gsap\.min|ScrollTrigger\.min|lenis\.min)\.js$/;
const local = (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(CACHE, r.request().url().split('/').pop())) });

async function nueva(op = {}, { cdn = 'local', script } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...op });
  if (cdn === 'local') await ctx.route(RE_CDN, local);
  if (cdn === 'caido') await ctx.route(RE_CDN, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route(/wa\.me|google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>fuera</p>' }));
  if (script) await ctx.addInitScript(script);
  const page = await ctx.newPage();
  page._errores = [];
  page.on('pageerror', (e) => page._errores.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page._errores.push('consola: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) page._errores.push(r.status() + ' ' + r.url()); });
  return { ctx, page };
}
async function bajarA(page, sel, margen = 0) {
  const top = () => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, sel);
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    for (let i = 0; i < 200; i++) {
      const t = await top();
      if (Math.abs(t - margen) < 30) break;
      await page.mouse.wheel(0, Math.max(-450, Math.min(450, t - margen)));
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(800);
    if (Math.abs((await top()) - margen) < 40) break;
  }
  await page.waitForTimeout(300);
}
async function bajarTodo(page) {
  for (let i = 0; i < 300; i++) {
    await page.mouse.wheel(0, 420);
    await page.waitForTimeout(50);
    if (await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 4)) break;
  }
  await page.waitForTimeout(1200);
}
const esperarCortina = async (page, extra = 500) => {
  await page.waitForFunction(() => { const c = document.getElementById('cortina'); return !c || getComputedStyle(c).display === 'none'; }, null, { timeout: 12000 });
  await page.waitForTimeout(extra);
};

/* ================= 0. archivos ================= */
console.log('\n0. Archivos');
for (const f of fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html'))) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">/.test(s), `${f}: el charset es lo primero del head`);
  comprobar(/<meta name="robots" content="noindex/.test(s), `${f}: noindex`);
  comprobar(!/<!--svg:/.test(s), `${f}: sin marcadores de construir.mjs sin expandir`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)].slice(0, 8));
}
comprobar(['.nojekyll', '404.html', 'manifest.json', 'img/og.jpg', 'marca/favicon.svg', 'marca/favicon-32.png', 'marca/apple-touch-icon.png'].every((f) => fs.existsSync(path.join(RAIZ, f))), '.nojekyll, 404, manifest, og:image y favicons');
{
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const rutas = new Set();
  for (const m of html.matchAll(/(src|srcset|href|imagesrcset)="([^"]+)"/g)) for (const parte of (/srcset/.test(m[1]) ? m[2].split(',') : [m[2]])) {
    const r = parte.trim().split(/\s+/)[0].split('?')[0];
    if (r && !/^(https?:|mailto:|tel:|#|data:)/.test(r)) rutas.add(r);
  }
  const faltan = [...rutas].filter((r) => !fs.existsSync(path.join(RAIZ, r)));
  comprobar(faltan.length === 0, `index.html: existen los ${rutas.size} archivos que enlaza`, faltan);
  comprobar(/rel="preload" as="image"[^>]*porton-noche-800\.avif/.test(html.replace(/\n\s*/g, ' ')), 'la foto del umbral va precargada');
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  comprobar(!/\b(1|una)( sola| única)? reseña/i.test(texto), 'sin «una reseña»');
  comprobar(!/clientes satisfechos|cientos de|miles de/i.test(texto), 'sin prueba social inventada');
  comprobar(!/sin permanencia|sin cuotas|sin comisiones/i.test(texto), 'sin condiciones comerciales');
  comprobar([...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt="/.test(m[0])), 'todas las imágenes llevan alt');
  comprobar(/CV-ARU000077-V/.test(texto), 'el número de registro de turismo va en la página');
}
const css = fs.readFileSync(path.join(RAIZ, 'css/estilos.css'), 'utf8');
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{\s*display:\s*flex/.test(css) && !/\.cookies\s*\{[^}]*display:\s*flex/.test(css), 'cookies: display:flex solo en :not([hidden])');
comprobar(/\.cortina\[hidden\]/.test(css), 'cortina: regla [hidden] propia (es display:grid)');
comprobar(!/scroll-behavior:\s*smooth/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'sin scroll-behavior:smooth (pelearía con Lenis)');
comprobar(/height:\s*100dvh/.test(css.match(/\.menu-movil \{[^}]*\}/)?.[0] || ''), 'menú móvil con altura explícita 100dvh');
comprobar(!/cursor:\s*none/.test(css), 'sin cursor propio (no hay dos cursores)');
{
  const src = fs.readFileSync(path.join(RAIZ, 'index.src.html'), 'utf8');
  const js = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
  comprobar(/<!-- MANDO DE MAQUETA/.test(src) && /fin del MANDO DE MAQUETA/.test(src) && /17\. MANDO DE MAQUETA/.test(js) && /fin del MANDO DE MAQUETA/.test(js), 'receta de borrado del mando: marcas en index.src.html y main.js');
  comprobar(/OPCIONAL «Cómo empezó»/.test(src) && /OPCIONAL «A la lumbre»/.test(src), 'las secciones opcionales llevan sus marcas para quitarlas');
  comprobar(/cdn\.jsdelivr\.net\/npm\/@studio-freight\/lenis@1\.0\.42/.test(src), 'Lenis desde jsDelivr con versión fija');
}
{
  // fotos: ninguna se pinta por encima de su ancho original (se mide en el navegador más abajo)
  const fotos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
  comprobar(fotos.every((f) => f.ancho <= f.ancho_origen), 'fotos: ningún tamaño generado por encima del original');
}

/* ================= 1. la cortina ================= */
console.log('\n1. Cortina');
{
  // fotogramas a medias: se registran en la propia página (Playwright llega tarde)
  const { ctx, page } = await nueva({}, { script: () => {
    window.__muestras = [];
    const t0 = performance.now();
    const tick = () => {
      const c = document.getElementById('cortina');
      if (c) {
        const h = document.getElementById('cortina-m-hueco');
        const l = c.querySelectorAll('.letra');
        const seis = c.querySelector('.cortina__seis');
        window.__muestras.push({ t: performance.now() - t0, vis: getComputedStyle(c).display !== 'none',
          r: h ? +h.getAttribute('r') : 0, lista: c.classList.contains('es-lista'), fondo: getComputedStyle(c).backgroundColor,
          l0: l.length ? getComputedStyle(l[0]).fill : '', lUlt: l.length ? getComputedStyle(l[l.length - 1]).fill : '',
          seis: seis ? +getComputedStyle(seis).opacity : 0,
          cont: +getComputedStyle(document.getElementById('cortina-contenido')).opacity });
        if (getComputedStyle(c).display !== 'none') requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  } });
  await page.goto(BASE);
  await esperarCortina(page);
  const m = await page.evaluate(() => window.__muestras);
  comprobar(m.length > 20 && m[0].vis, 'la cortina tapa al cargar', m.length);
  comprobar(await page.evaluate(() => document.querySelectorAll('#cortina .letra').length === 16), 'el rótulo tiene 16 letras para tallar');
  const primera = m.find((x) => x.lista);
  comprobar(primera && primera.l0 !== primera.lUlt || m.some((x) => x.l0 !== x.lUlt), 'las letras se tallan de una en una (en algún fotograma la primera ya está dorada y la última no)');
  const conSeis = m.findIndex((x) => x.seis > 0.9);
  const conHueco = m.findIndex((x) => x.r > 5);
  comprobar(conSeis > 0 && conHueco > conSeis, 'primero aparece el 6 y después se abre el círculo', [conSeis, conHueco]);
  comprobar(m.slice(0, Math.max(1, conSeis - 5)).every((x) => x.seis < 0.95), 'el 6 no está pintado antes de su paso');
  comprobar(m.filter((x) => x.r > 5).every((x) => x.fondo === 'rgba(0, 0, 0, 0)'), 'con el círculo abierto, la capa no tiene fondo opaco propio');
  const rMax = Math.max(...m.map((x) => x.r));
  comprobar(rMax > 900, 'el círculo crece hasta cubrir la pantalla', rMax);
  comprobar(m.some((x) => x.cont > 0.9) && m.some((x) => x.cont < 0.1), 'el rótulo se ve y se va');
  const dur = m[m.length - 1].t;
  comprobar(dur > 2000 && dur < 6200, 'la cortina dura entre 2 y 6,2 s', Math.round(dur));
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.documentElement.classList.contains('cortina-fuera')), 'la cortina desaparece de verdad (display:none)');
  comprobar(await page.evaluate(() => !document.getElementById('cookies').hidden), 'el aviso de cookies sale al irse la cortina');
  await page.waitForTimeout(1600);
  comprobar(await page.evaluate(() => document.querySelector('.hero__tit').classList.contains('es-visto')), 'el titular del hero entra al abrirse la cortina');
  await cap(page, '01-hero-1440');
  comprobar(page._errores.length === 0, 'sin errores de consola ni 404 (escritorio)', page._errores);
  await ctx.close();
}
{
  const { ctx, page } = await nueva({ reducedMotion: 'reduce' }, { script: sinCookies });
  await page.goto(BASE);
  await page.waitForTimeout(300);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'), 'movimiento reducido: la cortina no se ve ni un fotograma');
  comprobar(await page.evaluate(() => !document.documentElement.classList.contains('con-movimiento')), 'movimiento reducido: sin «con-movimiento»');
  await bajarA(page, '#balcon');
  comprobar(await page.evaluate(() => +getComputedStyle(document.querySelector('#balcon-tit')).opacity === 1 && getComputedStyle(document.querySelector('.contra')).display === 'none'), 'movimiento reducido: titular visible y contraventanas fuera (el valle se ve entero)');
  await bajarTodo(page);
  comprobar(await page.evaluate(() => document.getElementById('pie').classList.contains('es-tallado')), 'movimiento reducido: el rótulo del pie, dorado entero');
  await ctx.close();
}
{
  const { ctx, page } = await nueva({}, { cdn: 'caido' });
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'), 'sin CDN: la cortina se retira');
  comprobar(await page.evaluate(() => Array.from(document.querySelectorAll('[data-partir]')).every((h) => !h.classList.contains('es-partido'))), 'sin CDN: ningún titular partido (se quedarían ocultos)');
  comprobar(await page.evaluate(() => Array.from(document.querySelectorAll('[data-revela]')).every((e) => +getComputedStyle(e).opacity === 1)), 'sin CDN: ninguna foto ni tarjeta escondida');
  comprobar(await page.evaluate(() => !document.getElementById('cookies').hidden), 'sin CDN: el aviso de cookies sale');
  await ctx.close();
}
{
  // CDN lento (3 s): la cortina no se queda puesta ni se anima tarde
  const { ctx, page } = await nueva({}, { cdn: 'nada', script: sinCookies });
  await ctx.route(RE_CDN, async (r) => { await espera(3000); await local(r); });
  await page.goto(BASE);
  await page.waitForTimeout(4200);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'), 'CDN lento: la cortina no se queda puesta');
  await ctx.close();
}
{
  const { ctx, page } = await nueva({ javaScriptEnabled: false });
  await page.goto(BASE);
  await page.waitForTimeout(400);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none'), 'sin JS: no hay cortina');
  comprobar(await page.evaluate(() => document.querySelectorAll('.ficha-hab').length === 6 && Array.from(document.querySelectorAll('.ficha-hab')).every((f) => getComputedStyle(f).display !== 'none')), 'sin JS: se leen las seis fichas de habitación');
  await ctx.close();
}

/* ================= 2. el umbral y el sol ================= */
console.log('\n2. Umbral y sol de hoy');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 3200);    // deja pasar la pista
  const u = () => page.evaluate(() => +getComputedStyle(document.getElementById('umbral')).getPropertyValue('--u'));
  const u0 = await u();
  comprobar(Math.abs(u0 - 0.42) < 0.02, 'el umbral empieza entreabierto (0,42) tras la pista', u0);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('umbral')).touchAction === 'pan-y'), 'touch-action: pan-y en el umbral');
  const r = await page.evaluate(() => { const b = document.getElementById('umbral').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.mouse.move(r.x + r.w * 0.42, r.y + r.h * 0.3);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(r.x + r.w * (0.42 + i * 0.04), r.y + r.h * 0.3); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(700);
  const u1 = await u();
  comprobar(u1 > 0.75, 'arrastrar con el ratón hacia la derecha entra en el salón', u1);
  comprobar(await page.evaluate(() => document.getElementById('umbral').dataset.lado === 'dentro'), 'el umbral sabe que está dentro');
  await page.focus('#umbral-asa');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(800);
  const u2 = await u();
  comprobar(u2 < u1 - 0.08, 'teclado (←) en el asa vuelve hacia la calle', [u1, u2]);
  comprobar(await page.evaluate(() => +document.getElementById('umbral-asa').getAttribute('aria-valuenow')) === Math.round(u2 * 100), 'aria-valuenow sigue al umbral');
  const sol = await page.evaluate(() => [document.getElementById('sol-sale').textContent, document.getElementById('sol-pone').textContent]);
  const mins = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
  comprobar(/^\d\d:\d\d$/.test(sol[0]) && mins(sol[0]) > 6 * 60 + 30 && mins(sol[0]) < 8 * 60 + 45, 'dato en vivo: el amanecer de hoy en Ademuz es una hora creíble', sol);
  comprobar(/se pone a las \d\d:\d\d$/.test(sol[1]) && mins(sol[1].slice(-5)) > 17 * 60 + 20 && mins(sol[1].slice(-5)) < 21 * 60 + 50, 'dato en vivo: la puesta de hoy también', sol);
  await ctx.close();
}
{
  // toque real (CDP) en el móvil: de lado mueve el umbral, de arriba abajo hace scroll
  const { ctx, page } = await nueva(MOVIL, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 3200);
  await bajarA(page, '#umbral', 120);
  const cdp = await ctx.newCDPSession(page);
  const toque = (t, x, y) => cdp.send('Input.dispatchTouchEvent', { type: t, touchPoints: t === 'touchEnd' ? [] : [{ x, y }] });
  const r = await page.evaluate(() => { const b = document.getElementById('umbral').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const u = () => page.evaluate(() => +getComputedStyle(document.getElementById('umbral')).getPropertyValue('--u'));
  const u0 = await u();
  await toque('touchStart', r.x + r.w * 0.5, r.y + r.h * 0.3);
  for (let i = 1; i <= 10; i++) { await toque('touchMove', r.x + r.w * (0.5 + i * 0.04), r.y + r.h * 0.3); await page.waitForTimeout(16); }
  await toque('touchEnd', 0, 0);
  await page.waitForTimeout(600);
  const u1 = await u();
  comprobar(u1 > u0 + 0.2, 'móvil: el dedo de lado mueve el umbral', [u0, u1]);
  const y0 = await page.evaluate(() => scrollY);
  await toque('touchStart', r.x + r.w * 0.3, r.y + r.h * 0.7);
  for (let i = 1; i <= 10; i++) { await toque('touchMove', r.x + r.w * 0.3, r.y + r.h * 0.7 - i * 22); await page.waitForTimeout(16); }
  await toque('touchEnd', 0, 0);
  await page.waitForTimeout(900);
  comprobar(await page.evaluate(() => scrollY) > y0 + 60 && Math.abs((await u()) - u1) < 0.02, 'móvil: el dedo de arriba abajo hace scroll y no toca el umbral');
  await ctx.close();
}

/* ================= 3. seis puertas ================= */
console.log('\n3. Habitaciones');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#habitaciones');
  const ids = await page.evaluate(() => Array.from(document.querySelectorAll('.puerta')).map((b) => b.dataset.hab));
  comprobar(ids.length === 6, 'seis puertas', ids);
  let todas = true;
  for (const id of ids) {
    await page.click(`.puerta[data-hab="${id}"]`);
    await page.waitForTimeout(250);
    const e = await page.evaluate((id) => ({
      pulsadas: Array.from(document.querySelectorAll('.puerta[aria-pressed="true"]')).map((b) => b.dataset.hab),
      visibles: Array.from(document.querySelectorAll('.ficha-hab')).filter((f) => getComputedStyle(f).display !== 'none').map((f) => f.dataset.hab),
      // la foto de la puerta y la grande de la ficha son la misma (por NOMBRE)
      fotoPuerta: document.querySelector(`.puerta[data-hab="${id}"] picture`).dataset.foto,
      fotoFicha: document.querySelector(`#hab-${id} .f1 picture`).dataset.foto,
    }), id);
    if (!(e.pulsadas.join() === id && e.visibles.join() === id && e.fotoPuerta === e.fotoFicha)) { todas = false; mal('puerta ' + id + ' → ' + JSON.stringify(e)); }
  }
  comprobar(todas, 'cada puerta abre su ficha (y solo la suya) con su misma foto');
  await ctx.close();
}

/* ================= 4. balcón, Rincón y lumbre ================= */
console.log('\n4. Balcón, Rincón y lumbre');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  const a = () => page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('balcon-marco')).getPropertyValue('--a')) || 0);
  await bajarA(page, '#balcon', 0);
  const a0 = await a();
  await bajarA(page, '#balcon-marco', 120);
  await page.waitForTimeout(900);
  const a1 = await a();
  comprobar(a1 > 70 && a1 > a0, 'las contraventanas se abren al bajar', [a0, a1]);
  await cap(page, '02-balcon');
  await bajarA(page, '#rincon', 0);
  const r = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('#rincon-plano text.nombre, #rincon-plano text.casa-eti')).map((e) => e.getBBox());
    let choques = 0;
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
      const A = t[i], B = t[j];
      if (A.x < B.x + B.width && B.x < A.x + A.width && A.y < B.y + B.height && B.y < A.y + A.height) choques++;
    }
    const fuera = t.filter((b) => b.x < -60 || b.x + b.width > 620 || b.y < -20 || b.y + b.height > 580).length;
    return { n: document.querySelectorAll('#rincon-lista li').length, puntos: document.querySelectorAll('#rincon-plano .punto').length, choques, fuera };
  });
  comprobar(r.n === 7 && r.puntos === 7, 'el Rincón: siete destinos en la lista y en el plano', r);
  comprobar(r.choques === 0, 'las etiquetas del plano no se pisan', r);
  comprobar(r.fuera === 0, 'las etiquetas caben en el plano', r);
  await page.click('#rincon-lista li:nth-child(4) button');
  comprobar(await page.evaluate(() => document.querySelector('#rincon-plano g[data-i="3"]').classList.contains('es-activo')), 'tocar Teruel en la lista lo marca en el plano');
  await cap(page, '03-rincon');
  await bajarA(page, '#brasa', 80);
  const b = await page.evaluate(() => { const e = document.getElementById('brasa').getBoundingClientRect(); return { x: e.left, y: e.top, w: e.width, h: e.height }; });
  const x0 = await page.evaluate(() => getComputedStyle(document.getElementById('brasa')).getPropertyValue('--x'));
  await page.mouse.move(b.x + b.w * 0.85, b.y + b.h * 0.3, { steps: 8 });
  await page.waitForTimeout(900);
  const x1 = await page.evaluate(() => getComputedStyle(document.getElementById('brasa')).getPropertyValue('--x'));
  comprobar(parseFloat(x1) > parseFloat(x0) + 15, 'la luz de la lumbre sigue al puntero', [x0, x1]);
  await cap(page, '04-lumbre');
  await ctx.close();
}

/* ================= 5. motor de reservas (demostración) ================= */
console.log('\n5. Motor de reservas');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#reserva', 0);
  comprobar(await page.evaluate(() => /Demostración/.test(document.querySelector('#reserva .demo').textContent)), 'el motor está marcado como demostración');
  const ini = await page.evaluate(() => { const s = window.__motor.st; return { ini: s.ini, fin: s.fin, sel: s.sel.slice(), dias: document.querySelectorAll('#motor .dia').length }; });
  comprobar(ini.ini && ini.fin && ini.sel.length === 1 && ini.dias >= 56, 'abre con un ejemplo: el próximo fin de semana libre y una habitación propuesta', ini);
  comprobar(await page.evaluate(() => { const m = window.__motor; let n = 0; for (let i = 0; i < 90; i++) { const d = new Date(Date.now() + i * 864e5); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); m.HABS.forEach((h) => { if (m.ocupadaHab(h.id, k)) n++; }); } return n > 20; }), 'hay noches ocupadas de ejemplo en los próximos tres meses');
  // precio: suma noche a noche (temporada alta incluida)
  const c = await page.evaluate(() => {
    const m = window.__motor, s = m.st; let t = 0;
    const sig = (k) => { const d = new Date(k + 'T12:00'); d.setDate(d.getDate() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    m.HABS.filter((h) => s.sel.includes(h.id)).forEach((h) => { for (let k = s.ini; k < s.fin; k = sig(k)) t += m.precioNoche(h, k); });
    return { t, total: m.cuenta().total, txt: document.querySelector('#motor .desglose .tot').textContent };
  });
  comprobar(c.t === c.total && c.txt.replace(/\s/g, ' ').includes(new Intl.NumberFormat('es-ES').format(c.total)), 'el total es la suma noche a noche y es el que se ve', c);
  const completo = await page.$('#motor .dia.ocupado');
  if (completo) {
    const k = await completo.getAttribute('data-k');
    await completo.click({ force: true });
    comprobar(await page.evaluate((k) => window.__motor.st.ini !== k, k), 'un día completo no se puede elegir como llegada');
  }
  // filtro por habitación: el calendario pasa a esa habitación
  await page.click('#motor [data-filtro="molino"]');
  comprobar(await page.evaluate(() => { const m = window.__motor; return Array.from(document.querySelectorAll('#motor .dia:not(.pasado)')).every((b) => b.classList.contains('solo-salida') || b.classList.contains('ocupado') === m.ocupadaHab('molino', b.dataset.k)); }), 'con El Molino elegido, el calendario es el de El Molino');
  await page.click('#motor [data-filtro=""]');
  // 7 personas: se proponen habitaciones donde quepan
  for (let i = 0; i < 5; i++) await page.click('#motor [data-acc="mas"]');
  const g = await page.evaluate(() => { const m = window.__motor, s = m.st; return { pers: s.pers, plazas: m.HABS.filter((h) => s.sel.includes(h.id)).reduce((a, h) => a + h.plazas, 0), n: s.sel.length }; });
  comprobar(g.pers === 7 && g.plazas >= 7, 'para 7 personas propone habitaciones en las que caben', g);
  // pasos: datos, validación, pago y confirmación
  await page.click('#motor [data-acc="seguir"]');
  comprobar(await page.evaluate(() => window.__motor.st.paso === 'datos' && document.activeElement.id === 'motor-tit-paso'), 'Reservar lleva a «Sus datos» con el foco en el título');
  await page.click('#motor-form button[type="submit"]');
  comprobar(await page.evaluate(() => document.getElementById('m-nombre').getAttribute('aria-invalid') === 'true' && /Falta/.test(document.getElementById('m-error').textContent)), 'datos vacíos: avisa y marca los campos');
  await page.fill('#m-nombre', 'Prueba Garrido');
  await page.fill('#m-correo', 'prueba@ejemplo.es');
  await page.fill('#m-tel', '600000000');
  await page.check('#m-ok');
  await page.click('#motor-form button[type="submit"]');
  await page.click('#motor [data-acc="pagar"]');
  const h = await page.evaluate(() => ({ paso: window.__motor.st.paso, loc: document.querySelector('.confirmacion__loc').textContent, txt: document.querySelector('.confirmacion').textContent }));
  comprobar(h.paso === 'hecho' && /^GRD-\d{6}-\d{3}$/.test(h.loc) && /no se ha enviado ni cobrado nada/.test(h.txt), 'confirmación con localizador y aviso de demostración', h);
  await page.click('#motor [data-acc="otra"]');
  // «Ver fechas de El Águila» desde su ficha
  await bajarA(page, '#habitaciones', -200);
  await page.click('.puerta[data-hab="aguila"]');
  await page.waitForTimeout(400);
  await page.click('#hab-aguila [data-reservar]');
  await page.waitForTimeout(1800);
  const ag = await page.evaluate(() => { const s = window.__motor.st; return { filtro: s.filtro, sel: s.sel.slice(), top: Math.round(document.getElementById('reserva').getBoundingClientRect().top) }; });
  comprobar(ag.filtro === 'aguila' && ag.sel[0] === 'aguila' && Math.abs(ag.top - 70) < 80, '«Ver fechas de El Águila» lleva al motor con El Águila elegida', ag);
  await bajarA(page, '#motor', 80);
  await cap(page, '12-motor');
  comprobar(page._errores.length === 0, 'motor: sin errores', page._errores);
  await ctx.close();
}
{
  const { ctx, page } = await nueva(MOVIL, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#motor', 80);
  const m = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth, vw: innerWidth, meses: Array.from(document.querySelectorAll('#motor .mes')).filter((e) => getComputedStyle(e).display !== 'none').length, dia: Math.round(document.querySelector('#motor .dia').getBoundingClientRect().width) }));
  comprobar(m.ancho <= m.vw && m.meses === 1 && m.dia >= 36, 'móvil: el motor cabe, enseña un mes y los días se pueden tocar (≥ 36 px)', m);
  await cap(page, '13-motor-390');
  await ctx.close();
}

/* ================= 6. cookies, cabecera y pie ================= */
console.log('\n6. Cookies, cabecera y pie');
{
  const { ctx, page } = await nueva();
  await page.goto(BASE);
  await esperarCortina(page);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'flex'), 'cookies: se ven en la primera visita');
  await page.click('#ck-si');
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'none' && localStorage.getItem('garrido-cookies') === 'si'), 'cookies: «Entendido» las cierra y lo recuerda');
  await page.reload();
  await esperarCortina(page);
  comprobar(await page.evaluate(() => document.getElementById('cookies').hidden), 'cookies: al recargar no vuelven');
  await page.evaluate(() => localStorage.removeItem('garrido-cookies'));
  await page.reload();
  await esperarCortina(page);
  comprobar(await page.evaluate(() => !document.getElementById('cookies').hidden), 'cookies: borrando la marca vuelven a salir');
  await page.click('#ck-no');
  const p0 = await page.evaluate(() => +getComputedStyle(document.getElementById('cab')).getPropertyValue('--p') || 0);
  await bajarA(page, '#habitaciones', -200);
  const est = await page.evaluate(() => ({ p: +getComputedStyle(document.getElementById('cab')).getPropertyValue('--p'), osc: document.getElementById('cab').classList.contains('es-oscura') }));
  comprobar(est.p > p0 && est.p > 0.05, 'el 6 de la cabecera se dora al bajar (indicador de lectura)', [p0, est.p]);
  comprobar(est.osc, 'la cabecera pasa a oscura sobre las habitaciones');
  await bajarTodo(page);
  comprobar(await page.evaluate(() => document.getElementById('pie').classList.contains('es-tallado') && +getComputedStyle(document.getElementById('cab')).getPropertyValue('--p') > 0.97), 'al llegar al pie, el rótulo queda tallado y el 6 dorado entero');
  await cap(page, '05-pie');
  await page.click('#abrir-cookies');
  comprobar(await page.evaluate(() => !document.getElementById('cookies').hidden), '«Preferencias de cookies» vuelve a abrir el aviso');
  await ctx.close();
}

/* ================= 7. móvil ================= */
console.log('\n7. Móvil');
for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
  const { ctx, page } = await nueva({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 1200);
  const g = await page.evaluate(() => {
    const t = document.querySelector('.hero__txt').getBoundingClientRect();
    const u = document.getElementById('umbral').getBoundingClientRect();
    const cab = document.getElementById('cab').getBoundingClientRect();
    const rot = document.querySelector('.hero__rotulo').getBoundingClientRect();
    return { ancho: document.documentElement.scrollWidth, vw: innerWidth, solapa: u.top < t.bottom - 1, bajoCab: rot.top >= cab.bottom - 2 };
  });
  comprobar(g.ancho <= g.vw, `${w}×${h}: sin scroll horizontal`, g);
  comprobar(!g.solapa && g.bajoCab, `${w}×${h}: el texto del hero y el umbral no se pisan, y el rótulo queda bajo la cabecera`, g);
  if (w === 390) {
    await cap(page, '06-hero-390');
    await bajarA(page, '#casa', 0);
    await page.waitForTimeout(700);
    comprobar(await page.evaluate(() => document.getElementById('barra').classList.contains('es-visible')), 'la barra fija del móvil sale al dejar el hero');
    await page.click('#menu-btn');
    await page.waitForTimeout(500);
    const mm = await page.evaluate(() => { const r = document.getElementById('menu-movil').getBoundingClientRect(); return { h: r.height, vh: innerHeight, vis: getComputedStyle(document.getElementById('menu-movil')).visibility }; });
    comprobar(mm.vis === 'visible' && Math.abs(mm.h - mm.vh) < 2, 'el menú móvil abre a pantalla completa con la cabecera ya fija', mm);
    await page.click('#menu-movil a[href="#rincon"]');
    await page.waitForTimeout(1600);
    comprobar(await page.evaluate(() => !document.body.classList.contains('menu') && Math.abs(document.getElementById('rincon').getBoundingClientRect().top - 70) < 60), 'un enlace del menú cierra el menú y lleva a su sección');
    await bajarTodo(page);
    await cap(page, '07-pie-390');
  }
  comprobar(page._errores.length === 0, `${w}×${h}: sin errores`, page._errores);
  await ctx.close();
}
{
  // la barra del navegador del móvil sube y baja: nada se rehace ni salta
  const { ctx, page } = await nueva(MOVIL, { script: () => { try { localStorage.setItem('garrido-cookies', 'si'); } catch (e) {} window.__refrescos = 0; addEventListener('DOMContentLoaded', () => { const t = setInterval(() => { if (window.ScrollTrigger) { ScrollTrigger.addEventListener('refresh', () => window.__refrescos++); clearInterval(t); } }, 20); }); } });
  await page.goto(BASE);
  await esperarCortina(page, 1500);
  await bajarA(page, '#balcon', 0);
  const n0 = await page.evaluate(() => window.__refrescos);
  const top0 = await page.evaluate(() => document.getElementById('rincon').getBoundingClientRect().top + scrollY);
  for (let i = 0; i < 6; i++) { await page.setViewportSize({ width: 390, height: i % 2 ? 844 : 788 }); await page.waitForTimeout(260); }
  await page.waitForTimeout(500);
  const n1 = await page.evaluate(() => window.__refrescos);
  const top1 = await page.evaluate(() => document.getElementById('rincon').getBoundingClientRect().top + scrollY);
  comprobar(n1 === n0, 'barra del móvil: 0 refresh de ScrollTrigger en 6 cambios', [n0, n1]);
  comprobar(Math.abs(top1 - top0) < 1, 'barra del móvil: nada se mueve de sitio', [top0, top1]);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(700);
  comprobar(await page.evaluate(() => window.__refrescos) > n1, 'al girar el móvil sí se rehace');
  await ctx.close();
}

/* ================= 8. densidades, foco, fotos y contraste ================= */
console.log('\n8. Densidades, foco, fotos y contraste');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  comprobar(await page.evaluate(() => document.getElementById('mando').hidden && getComputedStyle(document.getElementById('mando')).display === 'none'), 'sin ?revision el mando no se ve');
  await page.goto(BASE + '?revision');
  await esperarCortina(page);
  comprobar(await page.evaluate(() => !document.getElementById('mando').hidden), 'con ?revision el mando se ve');
  await page.click('#mando [data-densidad="sobria"]');
  const s = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('densidad-sobria'), url: location.search, tabla: getComputedStyle(document.querySelector('.de-un-vistazo')).display, gal: getComputedStyle(document.querySelector('.galeria')).display, radio: getComputedStyle(document.querySelector('.casa__f1 .arco')).borderTopLeftRadius }));
  comprobar(s.cls && /densidad=sobria/.test(s.url) && s.tabla === 'block' && s.gal === 'block' && s.radio === '6px', 'la sobria: fotos rectas y además la tabla de las seis y más fotos', s);
  await page.click('#mando [data-densidad="cargada"]');
  comprobar(await page.evaluate(() => !document.documentElement.classList.contains('densidad-sobria') && getComputedStyle(document.querySelector('.de-un-vistazo')).display === 'none'), '«Solano, 6» vuelve a la cargada');
  // foco con forma de arco
  await page.goto(BASE);
  await esperarCortina(page);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => { const e = document.activeElement; const c = getComputedStyle(e); return { tag: e.tagName, o: c.outlineStyle, r: c.borderTopLeftRadius, rb: c.borderBottomLeftRadius }; });
  comprobar(foco.o === 'solid' && parseFloat(foco.r) > parseFloat(foco.rb), 'el foco del teclado tiene forma de arco (arriba redondo, abajo casi recto)', foco);
  // fotos: ninguna pintada por encima de su ancho original
  await bajarTodo(page);
  const fotos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
  const orig = Object.fromEntries(fotos.map((f) => [f.nombre, f.ancho_origen]));
  const grandes = await page.evaluate((orig) => Array.from(document.querySelectorAll('picture[data-foto] img')).map((i) => ({ n: i.parentElement.dataset.foto, w: Math.round(i.getBoundingClientRect().width), vis: i.getBoundingClientRect().width > 0 })).filter((x) => x.vis && x.w > orig[x.n] * 1.05), orig);
  comprobar(grandes.length === 0, 'ninguna foto se pinta más ancha que su original (1440 px)', grandes);
  // contraste (WCAG 2) de las parejas que se usan
  const lum = (h) => { const c = h.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const tok = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const parejas = [['tinta', 'cal', 4.5], ['tinta-2', 'cal', 4.5], ['teja', 'cal', 4.5], ['tinta-2', 'cal-2', 4.5], ['teja', 'cal-2', 4.5], ['cal', 'nogal', 4.5], ['cal-3', 'nogal', 4.5], ['cal-4', 'nogal', 4.5], ['oro', 'nogal', 4.5], ['cal-3', 'nogal-2', 4.5], ['cal-4', 'nogal-2', 4.5], ['nogal', 'oro', 4.5], ['cal-3', 'noche', 4.5], ['oro', 'noche', 4.5], ['tinta', 'cielo', 4.5], ['tinta-2', 'cielo', 4.5], ['teja', 'cielo', 4.5], ['cal-3', 'nogal-3', 4.5], ['oro', 'nogal-2', 4.5]];
  const malas = parejas.map(([a, b, min]) => [a, b, Math.round(cr(tok[a], tok[b]) * 100) / 100, min]).filter((p) => !(p[2] >= p[3]));
  comprobar(malas.length === 0, `contraste: las ${parejas.length} parejas de texto pasan 4,5:1`, malas);
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

await browser.close();
servidor.close();
console.log(`\n${nOk} bien, ${fallos.length} mal`);
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exit(1); }
