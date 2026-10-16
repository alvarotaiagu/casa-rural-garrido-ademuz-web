"""Calco vectorial del rótulo de la Casa Rural Garrido (Ademuz) desde la foto de Booking.

Uso:  python -I marca/scripts/calco.py
Deja: marca/rotulo.svg, marca/seis.svg, marca/rotulo-solido.svg, marca/colores.json
      y marca/scripts/_tmp/segmentacion.npz (las máscaras y campos que usa render.py).

Método (ver marca/LEEME.md):
  * Cartela: canal b* de CIELAB (amarillo). La madera clara de la cartela es mucho más amarilla
    que la tabla y que las molduras grises que la tocan por los lados. Silueta = b* > 160;
    campo interior = b* < 168 dentro de la silueta (el marco es el más amarillo).
  * Letras y «6»: canal L* (claridad). Cara de la letra = L* > 140 (letras) / 175 (el 6). Ese
    umbral deja fuera las paredes del relieve (L* 90-130) y las sombras arrojadas (L* 50-70).
  * Medallón: es un disco torneado. Búsqueda radial del borde (máximo de gradiente) y ajuste
    robusto de Fourier hasta el 2.º armónico (= elipse con centro libre).
  * Contorno subpíxel al nivel 0,5 de un campo continuo, suavizado por tramos entre esquinas
    (las esquinas no se redondean) y Bézier cúbicas (Schneider), como el calco de La Garita.
"""
import json
import os
import sys

import cv2
import numpy as np
from scipy import ndimage as ndi
from scipy.ndimage import gaussian_filter1d, map_coordinates

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from curvas import ajustar_cerrada, contornos_subpixel, esquinas  # noqa: E402

MARCA = os.path.dirname(AQUI)
ORIGEN = os.path.join(MARCA, "rotulo-original.jpg")
TMP = os.path.join(AQUI, "_tmp")
os.makedirs(TMP, exist_ok=True)

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# umbrales (ver LEEME)
T_SILUETA = 160.0   # b*: cartela frente a tabla y molduras
T_CAMPO = 168.0     # b*: marco frente a campo interior
T_LETRA = 140.0     # L*: cara de la letra
T_SEIS = 175.0      # L*: cara del 6
ORDEN = "CASARURALGARRIDO"


# ------------------------------------------------------------------ utilidades
def campo_de(valor, umbral, escala, mascara=None):
    """Campo continuo 0..1 con el nivel 0,5 en `umbral`. Si hay máscara limpia, se fuerza
    el campo a su lado donde la limpieza cambió el resultado del umbral."""
    c = np.clip((valor - umbral) / escala + 0.5, 0.0, 1.0)
    if mascara is not None:
        c = c.copy()
        c[mascara & (c <= 0.5)] = 0.75
        c[~mascara & (c > 0.5)] = 0.25
    return c


def mayor(m):
    n, lab = cv2.connectedComponents(m.astype(np.uint8))
    if n <= 1:
        return m & False
    k = np.argmax(np.bincount(lab.ravel())[1:]) + 1
    return lab == k


def llenar_pequenos(m, area_max):
    """Rellena los huecos de menos de `area_max` px (texturas, poros), deja los contrapunzones."""
    huecos = ndi.binary_fill_holes(m) & ~m
    n, lab, st, _ = cv2.connectedComponentsWithStats(huecos.astype(np.uint8), connectivity=4)
    out = m.copy()
    for i in range(1, n):
        if st[i, 4] < area_max:
            out[lab == i] = True
    return out


def suavizar_por_tramos(p, cortes, sigma):
    """Suavizado gaussiano de una curva cerrada sin tocar las esquinas: cada tramo entre dos
    esquinas se suaviza aparte con los extremos fijos."""
    if sigma <= 0:
        return p
    n = len(p)
    if not cortes:
        return gaussian_filter1d(p, sigma, axis=0, mode="wrap")
    c = sorted(cortes)
    q = p.copy()
    for a, b in zip(c, c[1:] + [c[0] + n]):
        idx = np.arange(a, b + 1) % n
        if len(idx) < 5:
            continue
        seg = p[idx]
        # reflejo impar respecto de los extremos: mantiene los extremos y su tangente
        pad = int(3 * sigma) + 1
        pad = min(pad, len(seg) - 1)
        izq = 2 * seg[0] - seg[1:pad + 1][::-1]
        der = 2 * seg[-1] - seg[-pad - 1:-1][::-1]
        ext = np.vstack([izq, seg, der])
        s = gaussian_filter1d(ext, sigma, axis=0, mode="nearest")[pad:pad + len(seg)]
        s[0], s[-1] = seg[0], seg[-1]
        q[idx[1:-1]] = s[1:-1]
    return q


def trazar_contorno(p, P):
    """Contorno (Nx2) → curva cerrada de Bézier con esquinas."""
    # las esquinas se buscan en una copia suavizada (el ruido de la madera no las dispara)
    cortes, _ = esquinas(gaussian_filter1d(p, P["sigma"], axis=0, mode="wrap"), P["ventana"], P["umbral"])
    p = suavizar_por_tramos(p, cortes, P["sigma"])
    return ajustar_cerrada(p, P["tol"], cortes)


def a_la_arista(p, Lf, rango=1.5, campo=None):
    """Lleva cada punto del contorno al máximo de |dL*/dn| a lo largo de su normal, dentro de
    ±rango px (afinado parabólico). Así el borde de la letra es la arista más marcada de la foto
    (el paso cara → pared/fondo) y no depende del umbral elegido. El rango corto impide saltar a
    la otra arista de la pared del relieve (está a 5-8 px)."""
    ps = gaussian_filter1d(p, 2, axis=0, mode="wrap")
    t = np.roll(ps, -1, 0) - np.roll(ps, 1, 0)
    t /= np.maximum(np.hypot(t[:, 0], t[:, 1]), 1e-9)[:, None]
    n = np.c_[t[:, 1], -t[:, 0]]
    ts = np.linspace(-rango, rango, int(rango * 20) + 1)
    q = p[:, None, :] + ts[None, :, None] * n[:, None, :]
    v = map_coordinates(Lf, [q[..., 1].ravel() - 0.5, q[..., 0].ravel() - 0.5], order=1).reshape(q.shape[:2])
    g = np.abs(np.gradient(v, ts, axis=1))
    k = np.clip(np.argmax(g, axis=1), 1, len(ts) - 2)
    a, b_, c = (g[np.arange(len(p)), k + d] for d in (-1, 0, 1))
    den = a - 2 * b_ + c
    with np.errstate(divide="ignore", invalid="ignore"):
        fr = np.where(np.abs(den) > 1e-9, 0.5 * (a - c) / den, 0.0)
    off = ts[k] + np.clip(fr, -1, 1) * (ts[1] - ts[0])
    off = ndi.median_filter(off, size=7, mode="wrap")     # descarta saltos sueltos (poros, brillos)
    return p + off[:, None] * n, off


def trazar_mascara(mascara, campo, P, Lf=None):
    ys, xs = np.nonzero(mascara)
    x0, y0 = max(0, xs.min() - 3), max(0, ys.min() - 3)
    sub = mascara[y0:ys.max() + 4, x0:xs.max() + 4]
    cs = contornos_subpixel(sub, campo, x0, y0, suavizado=0, paso=P["paso"])
    if Lf is not None:
        cs = [a_la_arista(c, Lf)[0] for c in cs]
    return [trazar_contorno(c, P) for c in cs], cs


def puntos_bezier(curva, n=24):
    ini, segs = curva
    pts = [ini]
    cur = ini
    t = np.linspace(0, 1, n)[1:, None]
    for s in segs:
        if s[0] == "L":
            pts.append(s[1]); cur = s[1]
        else:
            c1, c2, p = s[1], s[2], s[3]
            pts.extend(((1 - t) ** 3) * cur + 3 * ((1 - t) ** 2) * t * c1 + 3 * (1 - t) * t * t * c2 + t ** 3 * p)
            cur = p
    return np.vstack(pts)


def caja(curvas):
    q = np.vstack([puntos_bezier(c) for c in curvas])
    return q[:, 0].min(), q[:, 1].min(), q[:, 0].max(), q[:, 1].max()


def num(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def path_d(curvas, dx, dy):
    out = []
    for ini, segs in curvas:
        parts = [f"M{num(ini[0] - dx)} {num(ini[1] - dy)}"]
        for s in segs:
            if s[0] == "L":
                parts.append(f"L{num(s[1][0] - dx)} {num(s[1][1] - dy)}")
            else:
                parts.append("C" + " ".join(f"{num(q[0] - dx)} {num(q[1] - dy)}" for q in s[1:]))
        out.append("".join(parts) + "Z")
    return "".join(out)


def n_nodos(curvas):
    return sum(len(s) for _, s in curvas)


def lum(rgb):
    def lin(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(float(v)) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def hexa(rgb):
    return "#" + "".join(f"{int(round(v)):02X}" for v in rgb)


# ------------------------------------------------------------------ segmentación
def segmentar():
    bgr = cv2.imread(ORIGEN)
    H, W = bgr.shape[:2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    Lr, br = lab[..., 0], lab[..., 2]
    L = cv2.GaussianBlur(Lr, (0, 0), 0.8)
    b = cv2.GaussianBlur(br, (0, 0), 1.5)

    # --- cartela: silueta
    roi = np.zeros((H, W), bool)
    roi[100:520, 250:900] = True
    sil = mayor((b > T_SILUETA) & roi)
    sil = ndi.binary_fill_holes(sil)
    sil = ndi.binary_opening(sil, iterations=2)
    # cierre de radio 8 px: tapa la mella del clavo del borde inferior (no es dibujo); los arcos
    # cóncavos de la cartela tienen radios de ~100 px y no se tocan
    disco8 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    sil = cv2.morphologyEx(sil.astype(np.uint8), cv2.MORPH_CLOSE, disco8) > 0
    sil = mayor(ndi.binary_fill_holes(sil))
    campo_sil = campo_de(b, T_SILUETA, 10.0, sil)

    # --- cartela: campo interior. Primera aproximación por b* (el marco es lo más amarillo) y
    # después cuenca (watershed) sobre el gradiente de L*: el borde del campo cae en la arista
    # real marco/campo, también en la esquina superior derecha, donde el marco está en sombra y
    # su b* se confunde con el del campo.
    interior = sil & ndi.binary_erosion(sil, iterations=6) & ~(b > T_CAMPO)
    fondo_b = ndi.binary_fill_holes(mayor(interior))
    Lg = cv2.GaussianBlur(Lr, (0, 0), 1.5)
    g = np.hypot(cv2.Sobel(Lg, cv2.CV_32F, 1, 0), cv2.Sobel(Lg, cv2.CV_32F, 0, 1))
    g8 = np.clip(g / g.max() * 255 * 3, 0, 255).astype(np.uint8)
    marcas = np.zeros((H, W), np.int32)
    marcas[~ndi.binary_dilation(sil, iterations=3)] = 1
    marcas[ndi.binary_erosion(sil, iterations=3) & ~ndi.binary_erosion(sil, iterations=10)] = 2  # marco seguro
    marcas[ndi.binary_erosion(fondo_b, iterations=12)] = 3                                      # campo seguro
    ws = cv2.watershed(cv2.merge([g8, g8, g8]), marcas)
    fondo = mayor(ndi.binary_fill_holes(ws == 3))
    fondo = ndi.binary_opening(fondo, iterations=2)
    fondo = mayor(ndi.binary_fill_holes(fondo))
    campo_fondo = cv2.GaussianBlur(fondo.astype(np.float32), (0, 0), 1.0)

    # --- letras
    zona = ndi.binary_erosion(fondo, iterations=2)
    m = (L > T_LETRA) & zona
    n, lab_, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    grandes, punto = [], None
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if y > 405:              # brillos del campo junto al marco de abajo
            continue
        if a >= 500:
            grandes.append(i)
        elif 100 <= a < 500 and 0.7 < w / h < 1.4:
            punto = i            # el punto de la i
    assert len(grandes) == 16 and punto is not None, (len(grandes), punto)
    cy = np.array([cen[i][1] for i in grandes])
    filas = np.digitize(cy, [240, 325])
    orden = sorted(grandes, key=lambda i: (filas[grandes.index(i)], cen[i][0]))
    # el punto va con la letra de la 3.ª fila que más se solapa en x (la i)
    px0, px1 = st[punto, 0], st[punto, 0] + st[punto, 2]
    fila3 = [i for i in orden if filas[grandes.index(i)] == 2]
    sol = [max(0, min(px1, st[i, 0] + st[i, 2]) - max(px0, st[i, 0])) for i in fila3]
    con_punto = fila3[int(np.argmax(sol))]
    letras = []
    for i in orden:
        mk = lab_ == i
        if i == con_punto:
            mk = mk | (lab_ == punto)
        letras.append(llenar_pequenos(mk, 60))
    mletras = np.zeros((H, W), bool)
    for mk in letras:
        mletras |= mk
    campo_letras = campo_de(L, T_LETRA, 30.0, mletras)

    # --- medallón (búsqueda radial alrededor de un centro que se refina)
    Lm = cv2.GaussianBlur(Lr, (0, 0), 1.2)
    cx, cy0 = 593.0, 748.0
    th = np.linspace(0, 2 * np.pi, 720, endpoint=False)
    r = np.arange(50, 115, 0.25)
    for _ in range(3):
        X = cx + np.cos(th)[:, None] * r[None]
        Y = cy0 + np.sin(th)[:, None] * r[None]
        D = np.gradient(map_coordinates(Lm, [Y, X], order=1), axis=1) / 0.25

        def busca(lo, hi, signo):
            k = (r >= lo) & (r <= hi)
            return r[k][np.argmax(signo * D[:, k], axis=1)]

        ro = ajuste_radial(th, busca(82, 102, -1))
        ri = ajuste_radial(th, busca(64, 86, 1))
        # recentrar con el primer armónico del borde exterior
        dx = 2 * np.mean(ro * np.cos(th)); dy = 2 * np.mean(ro * np.sin(th))
        cx += dx; cy0 += dy
    med_ext = np.c_[cx + np.cos(th) * ro, cy0 + np.sin(th) * ro]
    med_int = np.c_[cx + np.cos(th) * ri, cy0 + np.sin(th) * ri]

    def disco(poli):
        mk = np.zeros((H, W), np.uint8)
        cv2.fillPoly(mk, [np.round((poli - 0.5) * 16).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=4)
        return mk.astype(bool)

    med_sil = disco(med_ext)
    med_fondo = disco(med_int)

    # --- el 6
    dentro6 = ndi.binary_erosion(med_fondo, iterations=3)   # dentro del campo del medallón (la punta del gancho llega cerca del aro)
    seis = llenar_pequenos(mayor((L > T_SEIS) & dentro6), 40)
    campo_seis = campo_de(L, T_SEIS, 30.0, seis)

    return dict(bgr=bgr, L=L, b=b, sil=sil, campo_sil=campo_sil, fondo=fondo, campo_fondo=campo_fondo,
                letras=letras, campo_letras=campo_letras, med_ext=med_ext, med_int=med_int,
                med_sil=med_sil, med_fondo=med_fondo, seis=seis, campo_seis=campo_seis,
                centro=(cx, cy0), ro=ro, ri=ri)


def ajuste_radial(th, v, armonicos=2, iters=6):
    """r(θ) robusto: mínimos cuadrados con pesos de Tukey sobre 1, cos kθ, sin kθ (k ≤ armonicos)."""
    A = [np.ones_like(th)]
    for k in range(1, armonicos + 1):
        A += [np.cos(k * th), np.sin(k * th)]
    A = np.stack(A, 1)
    w = np.ones_like(v)
    for _ in range(iters):
        coef = np.linalg.lstsq(A * w[:, None], v * w, rcond=None)[0]
        res = v - A @ coef
        s = 1.4826 * np.median(np.abs(res)) + 1e-6
        u = res / (4.685 * s)
        w = np.where(np.abs(u) < 1, (1 - u ** 2) ** 2, 0.0)
    return A @ coef


# ------------------------------------------------------------------ vectorizar
P_MARCO = dict(paso=1.0, sigma=6.0, ventana=10, umbral=35, tol=0.35)
P_SEIS = dict(paso=0.5, sigma=3.0, ventana=8, umbral=40, tol=0.2)   # el 6 es de trazo liso, más suavizado
P_LETRA = dict(paso=0.5, sigma=1.5, ventana=6, umbral=42, tol=0.2)


def curva_de_poligono(poli, tol=0.15):
    return ajustar_cerrada(poli, tol, ())


def svg(vb, cuerpo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(vb[0])} {num(vb[1])}">\n'
            f"{cuerpo}</svg>\n")


def main():
    S = segmentar()
    bgr = S["bgr"]
    rgb = bgr[..., ::-1]
    info = {}

    # cartela
    c_ext, _ = trazar_mascara(S["sil"], S["campo_sil"], P_MARCO)
    c_ext = [c_ext[0]]                       # sólo el contorno exterior
    c_int, _ = trazar_mascara(S["fondo"], S["campo_fondo"], P_MARCO)
    c_int = [c_int[0]]
    letras, poligonos = [], []
    for mk in S["letras"]:
        cs, polis = trazar_mascara(mk, S["campo_letras"], P_LETRA, S["L"])
        letras.append(cs)
        poligonos.append([np.round(q, 3).tolist() for q in polis])
    x0, y0, x1, y1 = caja(c_ext)
    dx, dy = x0, y0
    vb = (x1 - x0, y1 - y0)
    cuerpo = (f'  <path class="cartela-borde" fill-rule="evenodd" d="{path_d(c_ext + c_int, dx, dy)}"/>\n'
              f'  <path class="cartela-fondo" d="{path_d(c_int, dx, dy)}"/>\n')
    for i, cs in enumerate(letras):
        cuerpo += f'  <path class="letra" data-i="{i}" fill-rule="evenodd" d="{path_d(cs, dx, dy)}"/>\n'
    open(os.path.join(MARCA, "rotulo.svg"), "w", encoding="utf-8", newline="\n").write(svg(vb, cuerpo))
    open(os.path.join(MARCA, "rotulo-solido.svg"), "w", encoding="utf-8", newline="\n").write(
        svg(vb, f'  <path class="cartela-silueta" d="{path_d(c_ext, dx, dy)}"/>\n'))
    info["rotulo"] = dict(viewBox=f"0 0 {num(vb[0])} {num(vb[1])}", origen_en_foto=[round(dx, 2), round(dy, 2)],
                          nodos=dict(borde=n_nodos(c_ext + c_int), letras=[n_nodos(c) for c in letras]))

    # medallón
    m_ext = [curva_de_poligono(S["med_ext"])]
    m_int = [curva_de_poligono(S["med_int"])]
    seis, polis6 = trazar_mascara(S["seis"], S["campo_seis"], P_SEIS, S["L"])
    mx0, my0, mx1, my1 = caja(m_ext)
    vbm = (mx1 - mx0, my1 - my0)
    cuerpo = (f'  <path class="medallon-borde" fill-rule="evenodd" d="{path_d(m_ext + m_int, mx0, my0)}"/>\n'
              f'  <path class="medallon-fondo" d="{path_d(m_int, mx0, my0)}"/>\n'
              f'  <path class="seis" fill-rule="evenodd" d="{path_d(seis, mx0, my0)}"/>\n')
    open(os.path.join(MARCA, "seis.svg"), "w", encoding="utf-8", newline="\n").write(svg(vbm, cuerpo))
    info["seis"] = dict(viewBox=f"0 0 {num(vbm[0])} {num(vbm[1])}", origen_en_foto=[round(mx0, 2), round(my0, 2)],
                        centro=[round(v, 2) for v in S["centro"]],
                        radio_exterior=[round(float(S["ro"].min()), 2), round(float(S["ro"].max()), 2)],
                        radio_interior=[round(float(S["ri"].min()), 2), round(float(S["ri"].max()), 2)])

    # colores (mediana de cada zona, sobre la foto sin suavizar)
    H, W = S["L"].shape
    mletras = np.zeros((H, W), bool)
    for mk in S["letras"]:
        mletras |= mk
    borde = S["sil"] & ~S["fondo"]
    zonas = {
        "oro_letras": ndi.binary_erosion(mletras, iterations=2),
        "borde_cartela": ndi.binary_erosion(borde, iterations=3),
        "fondo_cartela": ndi.binary_erosion(S["fondo"], iterations=4) & ~ndi.binary_dilation(mletras, iterations=6),
        "seis": ndi.binary_erosion(S["seis"], iterations=2),
        "medallon_borde": ndi.binary_erosion(S["med_sil"] & ~S["med_fondo"], iterations=2),
        "medallon_fondo": ndi.binary_erosion(S["med_fondo"], iterations=3) & ~ndi.binary_dilation(S["seis"], iterations=6),
    }
    tabla = np.zeros((H, W), bool)
    tabla[300:600, 20:1180] = True
    tabla &= ~ndi.binary_dilation(S["sil"], iterations=20)
    tabla[360:540, 950:1060] = False        # nudo y clavo de la derecha
    zonas["madera_tabla"] = tabla
    tabla2 = np.zeros((H, W), bool)
    tabla2[640:840, 20:1180] = True
    tabla2 &= ~ndi.binary_dilation(S["med_sil"], iterations=15)
    zonas["madera_tabla_inferior"] = tabla2
    col = {}
    for k, mk in zonas.items():
        med = np.median(rgb[mk], axis=0)
        col[k] = dict(hex=hexa(med), rgb=[int(round(v)) for v in med], luminancia=round(lum(med), 4),
                      pixeles=int(mk.sum()))
    col["contraste"] = {
        "oro_letras_sobre_madera_tabla": round(contraste(col["oro_letras"]["rgb"], col["madera_tabla"]["rgb"]), 2),
        "oro_letras_sobre_fondo_cartela": round(contraste(col["oro_letras"]["rgb"], col["fondo_cartela"]["rgb"]), 2),
        "borde_cartela_sobre_madera_tabla": round(contraste(col["borde_cartela"]["rgb"], col["madera_tabla"]["rgb"]), 2),
        "seis_sobre_medallon_fondo": round(contraste(col["seis"]["rgb"], col["medallon_fondo"]["rgb"]), 2),
    }
    col["metodo"] = ("Mediana por canal de los píxeles de la foto (sin suavizar) de cada zona, con las máscaras "
                     "del calco erosionadas 2-4 px para no tocar bordes, paredes del relieve ni sombras. "
                     "Contraste WCAG 2 (luminancia relativa sRGB).")
    json.dump(col, open(os.path.join(MARCA, "colores.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)

    np.savez_compressed(os.path.join(TMP, "segmentacion.npz"),
                        campo_sil=S["campo_sil"], campo_fondo=S["campo_fondo"], campo_letras=S["campo_letras"],
                        campo_seis=S["campo_seis"], sil=S["sil"], fondo=S["fondo"],
                        letras=np.stack(S["letras"]), seis=S["seis"], med_sil=S["med_sil"], med_fondo=S["med_fondo"],
                        med_ext=S["med_ext"], med_int=S["med_int"])
    json.dump(dict(letras=poligonos, seis=[np.round(q, 3).tolist() for q in polis6]),
              open(os.path.join(TMP, "poligonos.json"), "w", encoding="utf-8"))
    json.dump(info, open(os.path.join(TMP, "geometria.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(json.dumps(info, ensure_ascii=False))
    for k in ("oro_letras", "borde_cartela", "fondo_cartela", "madera_tabla", "seis"):
        print(k, col[k]["hex"])
    print(col["contraste"])


if __name__ == "__main__":
    main()
