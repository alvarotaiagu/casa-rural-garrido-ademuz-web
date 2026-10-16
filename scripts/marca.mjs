/* Iconos y la imagen para compartir a partir del calco del rótulo (marca/*.svg).
   Uso: node scripts/marca.mjs  → marca/favicon.svg, favicon-32.png, apple-touch-icon.png y img/og.jpg */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// colores medidos en la foto del rótulo (marca/colores.json)
const COL = { 'cartela-borde': '#B47932', 'cartela-fondo': '#6F410F', letra: '#DC9A39', 'medallon-borde': '#B47932', 'medallon-fondo': '#3a2416', seis: '#DC9A39' };
const pintar = (svg) => svg.replace(/class="([a-z-]+)"/g, (m, c) => (COL[c] ? `${m} fill="${COL[c]}"` : m));
const NOGAL = '#2a1810';

// favicon: el medallón del 6 sobre nogal
const seis = pintar(leer('marca/seis.svg'));
const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(seis);
const sw = +vb[1], sh = +vb[2];
const interior = seis.replace(/<svg[^>]*>/, '').replace('</svg>', '');
function icono(lado, margen, rx) {
  const s = (lado * (1 - 2 * margen)) / Math.max(sw, sh);
  const x = (lado - sw * s) / 2, y = (lado - sh * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}"><rect width="${lado}" height="${lado}" rx="${rx}" fill="${NOGAL}"/><g transform="translate(${x} ${y}) scale(${s})">${interior}</g></svg>`;
}
fs.writeFileSync(path.join(RAIZ, 'marca/favicon.svg'), icono(64, 0.06, 14));
await sharp(Buffer.from(icono(256, 0.06, 56))).resize(32, 32).png().toFile(path.join(RAIZ, 'marca/favicon-32.png'));
await sharp(Buffer.from(icono(512, 0.14, 0))).resize(180, 180).png().toFile(path.join(RAIZ, 'marca/apple-touch-icon.png'));

// imagen para compartir: el portón de noche a la derecha, el rótulo sobre nogal a la izquierda
const rot = pintar(leer('marca/rotulo.svg'));
const rotUri = 'data:image/svg+xml;base64,' + Buffer.from(rot).toString('base64');
const rvb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(rot);
const W = 1200, H = 630, rw = 470, rh = rw * (+rvb[2] / +rvb[1]);
const foto = await sharp(path.join(RAIZ, 'img/fotos/porton-noche-1201.jpg')).resize(W, H, { fit: 'cover', position: 'right' }).toBuffer();
const velo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${NOGAL}" stop-opacity=".97"/><stop offset=".5" stop-color="${NOGAL}" stop-opacity=".8"/><stop offset=".78" stop-color="${NOGAL}" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><image href="${rotUri}" x="70" y="${(H - rh) / 2 - 40}" width="${rw}" height="${rh}"/><text x="74" y="${(H + rh) / 2 + 30}" font-family="Georgia, serif" font-size="26" letter-spacing="4" fill="#DC9A39">CALLE SOLANO, 6 · ADEMUZ</text></svg>`);
await sharp(foto).composite([{ input: velo }]).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(RAIZ, 'img/og.jpg'));
console.log('marca lista');
