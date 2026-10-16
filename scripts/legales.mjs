/* Genera los *.src.html de las páginas legales y el 404 con una plantilla común.
   Uso: node scripts/legales.mjs  (después, node construir.mjs)
   El titular y el NIF no aparecen en ninguna fuente: van como PENDIENTE visible. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TITULAR = `<p class="aviso">PENDIENTE: nombre o razón social del titular y NIF/CIF (no aparecen en su web antigua ni en Booking).</p>
<dl>
  <dt>Nombre comercial</dt><dd>Casa Rural Garrido</dd>
  <dt>Domicilio</dt><dd>Calle Solano, 6 · 46140 Ademuz (Valencia)</dd>
  <dt>Teléfono</dt><dd><a href="tel:+34677507467">677 50 74 67</a></dd>
</dl>`;

const paginas = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    cuerpo: `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos del titular de esta web:</p>
${TITULAR}
<p>Alojamiento de turismo rural inscrito en el Registro de Turismo de la Comunitat Valenciana con el número <b class="nw">CV-ARU000077-V</b>.</p>
<h2>Uso de la web</h2>
<p>Esta web informa sobre la Casa Rural Garrido y enseña cómo será la reserva directa de habitaciones. Quien la usa se compromete a hacerlo de buena fe y conforme a la ley.</p>
<p>Por ahora, el motor de reservas de esta web es una demostración: las fechas ocupadas y los precios son de ejemplo, y no envía, guarda ni cobra nada.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos, el logotipo y las fotografías son del titular o se usan con su permiso. No se pueden reproducir sin autorización.</p>
<p>Los tiempos en coche del Rincón se han calculado con datos de <a href="https://www.openstreetmap.org/copyright">© colaboradores de OpenStreetMap</a> (licencia ODbL) y el servicio OSRM.</p>
<h2>Responsabilidad</h2>
<p>Las distancias y los tiempos de viaje son aproximados. Los enlaces a otras webs (Google Maps, WhatsApp, Booking.com) llevan a servicios de terceros con sus propias condiciones.</p>
<h2>Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Para cualquier reclamación, puede contactar en el teléfono indicado arriba: buscaremos siempre una solución amistosa.</p>`,
  },
  privacidad: {
    titulo: 'Política de privacidad',
    cuerpo: `
<h2>Responsable</h2>
${TITULAR}
<h2>Qué datos tratamos y para qué</h2>
<p>Solo los que usted nos manda al hacer una consulta (por WhatsApp o por teléfono): nombre, fechas, número de personas y lo que quiera contarnos. Los usamos para contestarle y, si reserva, para gestionar su estancia.</p>
<p>El motor de reservas de esta web es, por ahora, una demostración: lo que escriba en él no sale de su navegador ni se guarda.</p>
<h2>Base legal y plazos</h2>
<p>La base es su consentimiento al escribirnos y, si reserva, la ejecución del contrato de alojamiento. Conservamos los datos el tiempo necesario para atender la consulta y, en las reservas, los plazos que exige la ley (incluido el registro de viajeros).</p>
<h2>Con quién se comparten</h2>
<p>Con nadie, salvo obligación legal. Si nos escribe por WhatsApp, ese servicio trata el mensaje según sus propias políticas.</p>
<h2>Sus derechos</h2>
<p>Puede pedir el acceso, la rectificación, la supresión, la oposición, la limitación o la portabilidad de sus datos en el teléfono <a href="tel:+34677507467">677 50 74 67</a> (PENDIENTE: un correo para estas solicitudes). Si cree que no se han respetado, puede reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</p>
<h2>Lo que guarda esta web en su navegador</h2>
<p>Una sola cosa: <code>garrido-cookies</code> en el almacenamiento local, para recordar que ya ha visto el aviso de cookies. Más detalles en <a href="cookies.html">cookies</a>.</p>`,
  },
  cookies: {
    titulo: 'Política de cookies',
    cuerpo: `
<p>Esta web no usa cookies propias de análisis ni de publicidad.</p>
<h2>Lo que se guarda en su navegador</h2>
<ul>
  <li><b>garrido-cookies</b> (almacenamiento local): recuerda que ha visto el aviso, para no enseñárselo en cada visita. Es técnica y no caduca sola; puede borrarla desde su navegador.</li>
</ul>
<h2>Servicios de terceros</h2>
<ul>
  <li><b>Google Fonts</b>: las letras de la web se cargan desde los servidores de Google, que reciben su dirección IP.</li>
  <li><b>Google Maps</b>: el mapa del apartado «Cómo llegar» solo se carga si pulsa «Ver el mapa». A partir de ese momento, Google puede instalar sus cookies.</li>
  <li><b>Librerías de animación</b> (GSAP y Lenis): se descargan de cdnjs y jsDelivr, que reciben su dirección IP. No instalan cookies.</li>
</ul>
<p>Puede volver a ver el aviso desde «Preferencias de cookies», en el pie de la portada.</p>`,
  },
  accesibilidad: {
    titulo: 'Declaración de accesibilidad',
    cuerpo: `
<p>El titular se compromete a que esta web sea accesible conforme al Real Decreto 1112/2018, de 7 de septiembre, sobre accesibilidad de los sitios web y aplicaciones para dispositivos móviles, y a la norma UNE-EN 301 549 (nivel AA de las WCAG 2.1).</p>
<h2>Situación de cumplimiento</h2>
<p class="aviso">PENDIENTE: completar tras la revisión de accesibilidad previa a la publicación.</p>
<p>La web se ha construido para poder usarse entera con el teclado y con lector de pantalla: contrastes de al menos 4,5:1, foco visible, textos alternativos en las fotos, formularios con etiquetas y animaciones que se desactivan si su sistema pide reducir el movimiento. El umbral de la portada (de la calle al salón) se mueve también con las flechas del teclado.</p>
<h2>Contacto</h2>
<p>Si encuentra una barrera, llame al <a href="tel:+34677507467">677 50 74 67</a>. Le responderemos y le daremos la información en un formato accesible.</p>`,
  },
};

for (const [nombre, p] of Object.entries(paginas)) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${p.titulo} · Casa Rural Garrido</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grenze:wght@700&family=Grenze+Gotisch:wght@700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<link rel="stylesheet" href="css/legal.css">
<link rel="icon" href="marca/favicon.svg" type="image/svg+xml">
</head>
<body>
<header class="legal-cab">
  <div class="env">
    <a href="index.html" aria-label="Casa Rural Garrido, a la portada"><!--svg:marca/seis.svg aria-hidden="true" focusable="false"--><span class="cab__nombre">Casa Rural Garrido</span></a>
    <a class="volver" href="index.html">Volver a la portada</a>
  </div>
</header>
<main class="legal">
  <div class="env">
    <h1>${p.titulo}</h1>
${p.cuerpo}
  </div>
</main>
<footer class="legal-pie">
  <div class="env">
    <a href="aviso-legal.html">Aviso legal</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="accesibilidad.html">Accesibilidad</a>
  </div>
</footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, `${nombre}.src.html`), html);
  console.log(`${nombre}.src.html`);
}

fs.writeFileSync(path.join(RAIZ, '404.src.html'), `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Página no encontrada · Casa Rural Garrido</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grenze:wght@700&family=Grenze+Gotisch:wght@700&family=Literata:opsz,wght@7..72,400&display=swap">
<link rel="stylesheet" href="css/estilos.css">
<link rel="icon" href="marca/favicon.svg" type="image/svg+xml">
<style>
  body { background: var(--nogal); color: var(--cal); min-height: 100svh; display: grid; place-items: center; text-align: center; padding: 24px; }
  .no { display: grid; gap: 22px; justify-items: center; max-width: 30em; }
  .no svg { width: min(80vw, 360px); height: auto; }
  .no h1 { font-family: var(--letra-tit); font-weight: 400; font-size: clamp(2.4rem, 7vw, 3.6rem); line-height: 1; }
</style>
</head>
<body>
  <main class="no">
    <!--svg:marca/rotulo.svg aria-hidden="true" focusable="false"-->
    <h1>Esta puerta no lleva a ninguna parte.</h1>
    <p>La página que busca no existe o ha cambiado de sitio.</p>
    <a class="btn btn--oro" href="./">Volver a la portada</a>
  </main>
</body>
</html>
`);
console.log('404.src.html');
