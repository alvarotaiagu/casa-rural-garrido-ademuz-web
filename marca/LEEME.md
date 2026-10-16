# Marca de Casa Rural Garrido: calco vectorial del rótulo

El rótulo del cliente no se redibuja ni se mejora: es un **calco fiel de la foto**. No hay ninguna tipografía: cada letra es el contorno de su cara tallada tal como sale en la foto. Todo se regenera con:

```
python -I marca/scripts/calco.py    # rotulo.svg, seis.svg, rotulo-solido.svg, colores.json
python -I marca/scripts/render.py   # Chromium pinta los SVG: iou.json y comparacion-*.png
```

(desde la raíz de `casa-rural-garrido-ademuz-web`; necesita OpenCV, PIL, SciPy y Playwright para Python con Chromium. `scripts/curvas.py` es el ajuste de Bézier del calco de La Garita, copiado sin cambios. `scripts/_tmp/` son intermedios y no se suben.)

Origen: `rotulo-original.jpg`, **1200 x 900 px**, foto de Booking, frontal. La cartela ocupa unos 590 x 370 px de la foto. Las letras miden unos 65-80 px de alto con trazos de 8-14 px, y el medallón unos 184 px de diámetro.

## Ficheros

| Fichero | Contenido |
|---|---|
| `rotulo.svg` (44 KB, 18 KB gzip) | Cartela con letras. `viewBox="0 0 592.57 370.56"`, 1 unidad = 1 px de la foto. Sin ids, sin `fill` ni `style`: el color lo pone la web por CSS con el SVG en línea. Piezas por orden: `path.cartela-borde` (marco: contorno exterior e interior, `fill-rule="evenodd"`), `path.cartela-fondo` (el campo interior) y **16 `path.letra`** con `data-i="0"`…`"15"` en orden de lectura: C A S A / R U R A L / G A R R I D O. Todas las letras llevan `fill-rule="evenodd"`; los huecos (A, R, D, O y el ojo de la G) son subtrazados. La **i** de GARRIDO es una i minúscula con punto: el punto va como subtrazado de la misma letra (`data-i="13"`). |
| `seis.svg` (2,4 KB) | Medallón del número. `viewBox="0 0 183.91 176.85"`. `path.medallon-borde` (aro, evenodd), `path.medallon-fondo` (disco interior) y `path.seis` (el 6, con su hueco triangular como subtrazado, evenodd). |
| `rotulo-solido.svg` (2,6 KB) | Opcional, derivada: la silueta exterior de la cartela, **un solo contorno** (1 `M`), `path.cartela-silueta`. Mismo `viewBox` que `rotulo.svg`, así que se superpone sin transformar (para máscara). |
| `colores.json` | Colores medidos por mediana y contrastes. |
| `iou.json` | Comprobación con Chromium: IoU por pieza, por letra y sensibilidad al umbral. |
| `comparacion-rotulo.png` | Arriba, la foto a x3 con el contorno del SVG en rojo (marco y letras); abajo, mapa de diferencias: gris = coincide, rojo = sólo SVG, azul = sólo referencia. |
| `comparacion-seis.png` | Lo mismo para el medallón y el 6. |
| `comparacion-solido.png` | La silueta sólida frente a la silueta segmentada. |

Posición de cada SVG en la foto (por si se quiere volver a montar el conjunto): `rotulo.svg` empieza en (277,46; 125,05) y `seis.svg` en (501,59; 657,22). Es decir, en el sistema de la foto el medallón está en `translate(224.13 532.17)` respecto de la cartela.

Uso en la web: los SVG van **en línea** (en un `<img>` las clases no llegan al CSS). Ejemplo:

```css
.cartela-borde { fill: #B47932; }  .cartela-fondo { fill: #6F410F; }
.letra { fill: #DC9A39; }          /* y .letra[data-i="3"] para tallarlas una a una */
```

## Colores (colores.json)

Mediana por canal de los píxeles de la foto (sin suavizar) de cada zona, con las máscaras del calco erosionadas 2-4 px para no coger bordes, paredes del relieve ni sombras. Son colores **de una foto con luz cálida**, no pintura plana: sirven de punto de partida.

| Zona | Hex | Luminancia |
|---|---|---|
| Oro de las letras (cara) | `#DC9A39` | 0,386 |
| Borde de la cartela | `#B47932` | 0,236 |
| Fondo de la cartela | `#6F410F` | 0,072 |
| Madera de la tabla (la de la cartela) | `#482F1F` | 0,035 |
| El 6 (cara) | `#FDD597` | 0,707 |
| Aro del medallón | `#AE825E` | 0,258 |
| Fondo del medallón | `#957056` | 0,187 |
| Tabla inferior (la del medallón, más rojiza) | `#815748` | 0,120 |

Contraste WCAG 2: **oro de las letras sobre madera de la tabla 5,13:1**; oro sobre fondo de la cartela 3,58:1; borde de la cartela sobre la tabla 3,36:1; el 6 sobre el fondo del medallón 3,2:1.

## Método

1. **Sin enderezar.** No se aplica homografía: la foto es frontal. Los lados de la cartela son simétricos respecto de x ≈ 573-575 con menos de 3 px de diferencia entre y = 280 y 400. Los bordes de arriba y de abajo se desvían 4-7 px, pero en sentidos opuestos, así que es irregularidad de la talla y no una inclinación. El medallón sale casi redondo (radio exterior 88,4-92,0 px).
2. **Cartela, silueta.** Canal b* de CIELAB (amarillo), suavizado σ 1,5. La madera clara de la cartela es mucho más amarilla (b* 165-180) que la tabla oscura y que las molduras grises que la tocan por los dos lados (b* 140-150). Silueta = b* > 160, la mayor componente, con huecos rellenos y un cierre de radio 8 px que tapa la mella del clavo del borde inferior. Los arcos cóncavos tienen radios de unos 100 px y no se tocan.
3. **Cartela, campo.** Primera aproximación con b* < 168. Después, cuenca (watershed) sobre el gradiente de L*, con semillas en una franja de 3-10 px por dentro del borde exterior (marco seguro) y en el campo erosionado 12 px. Así el límite cae en la arista real entre marco y campo, también en la esquina superior derecha. Ahí el marco está en sombra y su b* se confunde con el del campo: con el umbral solo salía una muesca de 10 px.
4. **Letras.** Canal L* suavizado σ 0,8, cara de la letra = L* > 140 dentro del campo. Ese umbral deja fuera las paredes del relieve (L* 90-130, visibles debajo y a la derecha de cada letra) y las sombras arrojadas (L* 50-70). Salen exactamente 16 componentes y el punto de la i, que se une a la letra con la que más se solapa en horizontal. Se rellenan los poros de menos de 60 px; los contrapunzones, que son mayores, se quedan. Después, **ajuste a la arista**: cada punto del contorno se mueve, a lo largo de su normal y dentro de ±1,5 px, al máximo de |dL*/dn|, con afinado parabólico y mediana de 7 muestras. Así el borde es la arista más marcada de la foto (cara → pared o fondo) y no depende del umbral. El rango corto impide saltar a la otra arista de la pared, que está a 5-8 px.
5. **El 6.** Igual que las letras, con L* > 175 (la cara del 6 está más iluminada) dentro del disco interior del medallón.
6. **Medallón.** Es un disco torneado. Para cada uno de 720 ángulos se busca el borde exterior (caída de L*, r = 82-102 px) y el interior (subida de L*, r = 64-86 px). Se ajusta r(θ) con Fourier hasta el 2.º armónico (una elipse con centro libre) por mínimos cuadrados robustos con pesos de Tukey. El centro se refina tres veces.
7. **Contorno y Bézier.** Contorno subpíxel al nivel 0,5 del campo (como en La Garita). Después se suaviza **por tramos entre esquinas**, que no se redondean: σ 0,75 px en las letras, 1,5 px en el 6 y 6 px en el marco, cuya arista exterior tiene el ruido de la veta. El ajuste es de cúbicas (Schneider) con error máximo de 0,2 px (letras y 6) y 0,35 px (marco). Coordenadas con 2 decimales.
8. **Silueta sólida.** Es el contorno exterior del marco sin el interior, así que coincide con la silueta del calco.

## Resultado (Chromium, IoU a x3)

`render.py` pinta cada pieza (y cada letra por separado, con su `data-i`) con Chromium a x3, en negro, y corta al 50 %. Se compara con la referencia rasterizada a x3 por área. Para letras y 6, la referencia es el contorno trazado en la foto antes de suavizarlo y pasarlo a Bézier. Para la cartela es el campo segmentado, y para el medallón el polígono del ajuste radial. Además comprueba la estructura: clases, `data-i` 0-15, sin id/fill/style, viewBox con origen 0,0 y silueta de un solo contorno.

| Pieza | IoU a x3 |
|---|---|
| `cartela-borde` | 0,9743 |
| `cartela-fondo` | 0,9971 |
| letras (las 16 juntas) | **0,9819** |
| `medallon-borde` | 0,9914 |
| `medallon-fondo` | 0,9983 |
| `seis` | 0,9861 |
| `rotulo-solido` frente a la silueta | 0,9960 |

Por letra: mínimo 0,978 (I), mediana 0,9815, máximo 0,9857 (D). Las peores son I 0,978, C 0,979 y L 0,980. Todas pasan de 0,95. El marco baja a 0,974 porque se suaviza a propósito con σ 6 px: con σ 3 px daba 0,983, pero el arco izquierdo salía con bultos de la veta.

## Límites y letras dudosas

- **Lo que mide el IoU.** Mide la fidelidad del vector a lo trazado en la foto, no la de lo trazado a la talla real. Esa segunda fidelidad se ve en `comparacion-rotulo.png` y `comparacion-seis.png`: el contorno rojo va por la arista de la cara de cada letra, revisado a x6.
- **Incertidumbre del borde en la foto.** En una foto de un relieve, el borde de la cara no es un salto limpio: pasa de cara a pared a sombra en 1-2 px. `iou.json` → `letras_sensibilidad` compara el SVG con la cara cortada a L* 130, 140 y 150. Da IoU medio de 0,92, 0,89 y 0,81. El ajuste a la arista deja las letras unos 0,6 px más gruesas que el corte a L* 140, la mediana medida de dónde está la arista más marcada. Con trazos de 8-14 px, ±0,5 px de borde son ±8 % de área. Es el límite real de esta foto.
- **Paredes del relieve fuera.** Las letras y el 6 son la cara de arriba, sin la pared lateral que se ve por la perspectiva (abajo y a la derecha). El marco, en cambio, es la pieza de madera visible entera: incluye su bisel interior (se ve abajo y a la derecha) y el canto inferior, porque son de la misma madera amarilla y no se pueden separar con fiabilidad de la cara. Por eso el marco es **mucho más ancho abajo (34-39 px) que arriba (12-15 px)**; por los lados mide 20-24 px. Es lo que da la foto, tomada desde abajo. Si la web quiere un marco «frontal» más regular, hay que decidirlo: sería ya una interpretación, no un calco. El canto inferior (unos 10 px, L* ≈ 90) se podría quitar con un corte de L* en la mitad de abajo.
- **Resolución.** Las letras tienen 65-80 px de alto en la foto. El borde tiene la ondulación de la talla a mano y de la veta. Se respeta, con un suavizado mínimo de 0,75 px: a tamaño de cabecera no se nota; a más de x4 se ve el borde «hecho a mano».
- **Letras dudosas.** La **A** de CASA (`data-i="1"`) tiene el remate superior irregular (veta y un brillo); la **C** (`data-i="0"`) tiene un pequeño gancho arriba a la izquierda que en la foto parece una astilla de la talla: se ha calcado tal cual. La **i** de GARRIDO es minúscula con punto, y así está calcada. Las R de RURAL y GARRIDO son R góticas con forma de K: es su forma, no un error. El 6 tiene un hueco triangular con una cola hacia abajo, que es la ranura en V de la talla.
- **Medallón.** El aro es elíptico por construcción (2.º armónico). El interior queda algo descentrado hacia arriba a la derecha porque abajo a la izquierda se ve el bisel interior del aro, igual que en el marco.
- **Mella del clavo.** El borde inferior de la cartela tiene una mella de un clavo hacia x = 410 de la foto. Se tapa con el cierre de 8 px: es un daño, no dibujo. Si se cuela una veta en el borde exterior, sube `P_MARCO["sigma"]` en `calco.py`.
- Otros ficheros de `marca/` (favicon, apple-touch-icon) no son de este calco.
