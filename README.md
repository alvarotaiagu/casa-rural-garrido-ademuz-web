# Casa Rural Garrido · Ademuz · «Solano, 6»

Web nueva para la Casa Rural Garrido (C/ Solano, 6 · 46140 Ademuz). Su web `casaruralgarrido.com` da 404 en todas las páginas. Esta versión está **en local**, con `noindex` en todas las páginas, **sin publicar y sin repo git**.

- **Datos y fuentes:** `../casa-rural-garrido-ademuz-bocetos/DATOS-GARRIDO.md` (su web antigua del Wayback Machine, Booking, rincondeademuz.info, la ficha de Google). Tablero de direcciones: https://claude.ai/artifact/8wHVkpkmq7qqxiNLZ9SAFY
- **Decisión (2026-10-16, «sigo tus recomendaciones»):** dirección A «Solano, 6», con el balcón y el Rincón en minutos de B, y como opcionales «A la lumbre» (de D) y «Cómo empezó» (de C). Solo castellano. Fotos de Booking y de su web antigua, **ninguna regenerada con IA**. Motor de reservas de demostración (petición de Álvaro, 2026-10-16: toda web lleva simulador).

## Concepto

Su logo ya existía: es el **rótulo de madera tallada** que tienen sobre el portón, con «CASA RURAL GARRIDO» en letras doradas y el **6** de la calle en un medallón. La web se construye con él:

1. **Cortina:** tabla de nogal. Las 16 letras del rótulo se tallan una a una (pasan de madera oscura a un brillo y quedan doradas), aparece el medallón del 6 y desde su centro se abre un círculo que destapa la portada (máscara SVG; la capa pasa a fondo transparente).
2. **Portada:** el rótulo, «La casa del número 6» y **el umbral**: un arco de medio punto con el portón de noche y el salón con la chimenea. Se arrastra el 6 para cruzar de la calle al salón (ratón, dedo de lado, flechas del teclado). Con `touch-action: pan-y`, el dedo de arriba abajo sigue haciendo scroll.
3. **La casa:** texto, cuatro fotos con arco y «Cómo empezó» (opcional): de la casa del siglo XVIII a Ademuz Aventura, la reforma de la Nochevieja de 1999 y el libro de visitas de 2002.
4. **Seis puertas:** una puerta de madera claveteada con su placa por habitación. Al pulsarla se abre y enseña su ficha (planta, camas, baño, balcón). «Consultar esta» la deja elegida en el formulario.
5. **El balcón:** dos contraventanas que se abren con el scroll sobre los tejados y el valle, con **el amanecer y la puesta de sol de hoy en Ademuz** calculados (NOAA, 40,0603 N, 1,2860 O, hora de Madrid).
6. **El Rincón en minutos:** plano de anillos con cada pueblo en su rumbo real y a la distancia de sus minutos en coche (OSRM, 16-10-2026). La lista y el plano se señalan entre sí.
7. **A la lumbre (opcional):** la chimenea a oscuras; la luz sigue al puntero (al scroll en el móvil). Tres bodegones: sala, desayuno, catas.
8. **Opiniones:** Booking 9,2 (536, premio 2026), Google 4,6 (399), Tripadvisor 4,5 (83), tres frases literales de Booking sin nombre.
9. **Reserva (motor de DEMOSTRACIÓN, `js/reserva.js`)**: calendario de 12 meses con los días completos tachados, «quedan pocas» y temporada alta; filtro por habitación; personas; lista de las seis con su precio para esas noches (las ocupadas, apagadas) y propuesta automática de habitaciones donde quepa el grupo; desglose y total; pasos «Sus datos» → «Pago» (tarjeta o Bizum) → confirmación con localizador `GRD-…`. **No envía, guarda ni cobra nada** y lo dice arriba y en cada paso final. «Ver fechas de El Molino» en cada ficha abre el motor filtrado por ella. Al conectar un motor real solo cambian la ocupación y la confirmación. Queda la línea «¿Prefiere hablar?» con teléfono/WhatsApp y Booking. **Cómo llegar** con los tiempos calculados y el mapa de Google solo al pedirlo.
10. **Pie:** el rótulo entero y el medallón; las letras se doran al llegar. El 6 de la cabecera se dora a medida que se baja (indicador de lectura) y en el pie queda completo.

### Nivel §5 bis

| Obligatoria | Cómo se cumple |
|---|---|
| Romper la fórmula | **Fuera:** cursor propio, imanes, marquesinas, pila sticky, inclinación de tarjetas. **Propias:** talla del rótulo, umbral, seis puertas, contraventanas, plano de anillos. |
| Gesto táctil del hero | Arrastrar el 6 de lado para cruzar el umbral (probado con toques reales por CDP). |
| El objeto se completa en el pie | El 6 de la cabecera se dora con la lectura; en el pie el rótulo se termina de tallar. |
| Foco con la forma del motivo | Arco de medio punto: `border-radius: 20px 20px 4px 4px` (26/6 en botones y campos). |
| Rendimiento medido | Ver abajo. |

**Menú opcional elegido: dato en vivo** (el sol de hoy en Ademuz). Solo guarda en el navegador la marca del aviso de cookies.

### Paleta y letras

| Token | Color | De dónde sale |
|---|---|---|
| `--nogal` | `#2a1810` | la tabla del rótulo |
| `--oro` | `#dc9a39` | el oro de las letras del rótulo, **medido** (`marca/colores.json`); solo sobre oscuro |
| `--cal` | `#f4ece0` | la cal de las paredes (fondos claros) |
| `--teja` | `#a3442a` | acentos sobre claro |
| `--cielo` | `#e4e6e2` | la sección del balcón |
| `--noche` | `#140d08` | «A la lumbre» |

`verificar.mjs` mide 17 parejas de contraste; todas pasan 4,5:1.

**Letras:** `Grenze` (romana) en los titulares; `Grenze Gotisch` **solo** en el nombre de la cabecera y en las placas de las puertas, que es donde hace de rótulo (en titulares largos la gótica parecía de mesón). `Literata` para leer. Respaldos con `size-adjust`.

## Logo

**Calco** del rótulo de la foto de Booking (`marca/rotulo-original.jpg`, 1200×900), no un redibujo: IoU ≥ 0,974 en todas las piezas, letras 0,978–0,986. Método, límites y colores en `marca/LEEME.md`. Cada letra es un `path.letra` con `data-i` (0–15) para la talla. El borde de la cartela sale más ancho abajo porque la foto está tomada desde abajo: es calco; si se quiere un marco regular habría que interpretarlo. `node scripts/marca.mjs` saca favicons y `img/og.jpg`.

## Cómo se trabaja

- **Edita siempre los `*.src.html`.** `node construir.mjs` genera los `.html`: `<img data-foto>` → `<picture>` (AVIF, WebP, JPG), `<!--svg:…-->` → SVG en línea y `?v=<huella>` a CSS y JS.
- **Legales y 404:** `node scripts/legales.mjs` y después `node construir.mjs`.
- **Fotos:** `scripts/fotos-lista.json` + `node scripts/fotos.mjs`. Nunca amplía.
- **`node verificar.mjs [--capturas]`** (puerto 8767): archivos, cortina (fotogramas a medias), sin CDN / CDN lento / sin JS / movimiento reducido, umbral (ratón, teclado, toque real de lado y de arriba abajo), sol, cada puerta con su ficha y su foto por nombre, contraventanas, plano (etiquetas sin pisarse), lumbre, motor de reservas (precio, filtro, grupo, pasos, móvil), cookies en 4 pasos, cabecera e indicador, pie, móvil a 360/375/390/768, barra del navegador (0 `refresh`), densidades, foco, fotos no ampliadas y contraste. **129/129** el 2026-10-16.
- **`node scripts/rendimiento.mjs`** (puerto 8768) y `node scripts/_capturas.mjs` (puerto 8769, capturas sueltas en `pruebas/`).

### Quitar las secciones opcionales

Borra el bloque entre `<!-- OPCIONAL «A la lumbre»` y `<!-- fin OPCIONAL «A la lumbre» -->` (y su enlace en `#menu-movil`), o el de «Cómo empezó». No hay que tocar nada más: el JS comprueba que existan.

## Mando de densidades (solo con `?revision`)

- **«Solano, 6»:** fotos y puertas con arco, vetas de nogal entre secciones, clavos en las puertas.
- **«Sobria»:** fotos rectas, separadores de línea. **Añade** la tabla «Las seis, de un vistazo» y seis fotos más de habitaciones.

### Receta de borrado del mando

1. En `index.src.html`: el bloque `<!-- MANDO DE MAQUETA` … `<!-- fin del MANDO DE MAQUETA -->` y, en el script del `<head>`, el `try { … }` de `// MANDO DE MAQUETA`.
2. En `js/main.js`: el bloque `17. MANDO DE MAQUETA` hasta `fin del MANDO DE MAQUETA`.
3. Opcional: `.mando` en `css/estilos.css`.
4. `node construir.mjs`.

## Rendimiento (2026-10-16)

Pixel 7 emulado, 4G lento (1,6 Mbps, 150 ms), CPU ×4, 3 pasadas: **LCP 1,18–1,49 s** (la foto del portón, precargada), 13 peticiones, **644 KB**, tareas largas de 90–312 ms en el arranque. En esa red la cortina se salta (si `main.js` llega después de 2,5 s, la portada sale sin animar).

## Fotos

De Booking (`ref/fotos-booking`, 82, máx. 1280 px; se bajan con Playwright porque curl recibe un 202, y las URL necesitan su `?k=`) y de su web antigua (`ref/fotos-web`, Wayback, 719 px). Las de 2024–25 son de móvil con HDR fuerte: van con menos saturación.

**Asignación foto ↔ habitación:**
- **Seguras:** El Ciervo (la máquina de coser, Booking `32598648`) y El Castillo (diván de forja y armario de pino, `32598590`).
- **Con su nombre en la web antigua:** El Escudo y El Barco.
- **Por confirmar:** El Molino (`546761013` y el baño `32599484`) y El Águila (`546757206`, azul con balcón, la de la opinión).

## Pendientes para la casa

- [ ] **Habitaciones y plazas:** su web antigua y Tripadvisor dicen seis (las de la web); rincondeademuz dice 5 habitaciones y 14 plazas (2 dobles, 2 triples, 1 cuádruple). **Confirmar antes de publicar.** Las camas de cada ficha son las de la web antigua (2014–2019).
- [ ] **Fotos por habitación** (ver arriba) y **originales** a más de 1280 px.
- [ ] **Comidas:** ¿siguen dando comidas y cenas o solo desayuno? «A la lumbre» dice «Pregunte si hay comidas en sus fechas».
- [ ] **Teléfono y WhatsApp:** se usa el 677 50 74 67 (Google). rincondeademuz añade 644 96 07 93 y `se_cassa@hotmail.com`; la web antigua daba 630 924 149 / 147 y `pregunta@casaruralgarrido.com`. ¿El 677 tiene WhatsApp?
- [ ] **Titular y NIF** para el aviso legal y la privacidad (van como PENDIENTE visible), y un correo para los derechos de datos.
- [ ] **Albergue Fuente Bellido** (Casas Altas, 24 plazas): aparecía en su web. ¿Sigue siendo suyo?
- [ ] Balcón: Booking dice «balcón Julieta en todas» y «la mayoría con vistas al valle»; la web antigua dice que El Escudo tiene ventana a la calle. Confirmar cuáles miran al valle.
- [ ] **Supuestos del motor de demostración** (todos en `js/reserva.js`): precios por habitación y noche **inventados** a partir del «desde 90 €» de Google (Castillo, Águila, Barco 90 €; Escudo 95 €; Ciervo 105 €; Molino 125 €), **+15 €** en temporada alta (Semana Santa, agosto, puente de diciembre y Navidad), sin mínimo de noches, plazas por habitación según las camas de la web antigua (16 en total) y noches ocupadas generadas. Pago por tarjeta o Bizum, de ejemplo. Preguntar sus tarifas, temporadas, mínimos, si incluye desayuno y cómo cobran.
- [ ] Notas leídas el 16-10-2026; las tres frases son de Booking, sin nombre. Pedir permiso si se quieren con nombre.
- [ ] Dominio (el actual da 404) y declaración de accesibilidad tras la revisión previa a publicar.

## Para publicar

`noindex` en todas las páginas mientras no venda. `?v=<huella>` ya lo pone `construir.mjs`; avisar de Ctrl+F5. No subir `ref/` (datos de terceros) ni `marca/scripts/_tmp`.
