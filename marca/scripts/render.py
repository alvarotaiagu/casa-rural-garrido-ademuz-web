"""Comprobación independiente del calco: Chromium pinta los SVG de marca/ y se comparan con la
segmentación de la foto. Mide el IoU a x3 por pieza y por letra y deja las comparaciones.

Uso:  python -I marca/scripts/render.py      (después de calco.py)
Deja: marca/iou.json, marca/comparacion-rotulo.png, marca/comparacion-seis.png,
      marca/comparacion-solido.png

IoU a x3: el SVG se pinta a x3 (tinta negra sobre blanco, antialias de Chromium, corte al 50 %) y
se compara con la referencia rasterizada a x3 por área: para letras y 6, el contorno trazado en la
foto (umbral + ajuste a la arista) antes de suavizarlo y pasarlo a Bézier; para la cartela, el
campo de la segmentación ampliado en bicúbico; para el medallón, el polígono del ajuste radial.
Mide lo fiel que es el vector a lo trazado; lo fiel que es el trazado a la foto se ve en las
comparaciones (contorno rojo sobre la foto) y en la sensibilidad al umbral (iou.json).
"""
import io
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

import cv2
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
from scipy import ndimage as ndi

AQUI = os.path.dirname(os.path.abspath(__file__))
MARCA = os.path.dirname(AQUI)
TMP = os.path.join(AQUI, "_tmp")
S = 3
SVGNS = "{http://www.w3.org/2000/svg}"
ORDEN = "CASARURALGARRIDO"

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def leer(nombre):
    t = open(os.path.join(MARCA, nombre), encoding="utf-8").read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', t).group(1).split()]
    inner = re.search(r"<svg[^>]*>(.*)</svg>", t, re.S).group(1)
    return vb, inner


def pintar(pg, nombre, origen, caja, selector):
    """Pinta en negro sólo los paths que casan con `selector`, colocados en la foto, en la caja
    entera (x0, y0, x1, y1) de la foto, a xS. Devuelve cobertura 0..1."""
    vb, inner = leer(nombre)
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    estilo = f"<style>path{{fill:transparent}} {selector}{{fill:#000}}</style>"
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * S}" height="{h * S}" viewBox="{x0} {y0} {w} {h}">'
           f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="#fff"/>{estilo}'
           f'<svg x="{origen[0]}" y="{origen[1]}" width="{vb[2]}" height="{vb[3]}" '
           f'viewBox="{vb[0]} {vb[1]} {vb[2]} {vb[3]}" overflow="visible">{inner}</svg></svg>')
    pg.set_viewport_size({"width": w * S, "height": h * S})
    pg.set_content(f"<html><body style='margin:0;background:#fff'>{svg}</body></html>")
    png = pg.screenshot(clip={"x": 0, "y": 0, "width": w * S, "height": h * S})
    g = np.array(Image.open(io.BytesIO(png)).convert("L")).astype(np.float32)
    return 1.0 - g / 255.0


def ampliar(campo, caja):
    x0, y0, x1, y1 = caja
    c = campo[y0:y1, x0:x1].astype(np.float32)
    # el píxel i ocupa [i, i+1]: resize de OpenCV con centros alineados
    return cv2.resize(c, ((x1 - x0) * S, (y1 - y0) * S), interpolation=cv2.INTER_CUBIC) > 0.5


def ampliar_mask(m, caja):
    x0, y0, x1, y1 = caja
    return cv2.resize(m[y0:y1, x0:x1].astype(np.uint8), ((x1 - x0) * S, (y1 - y0) * S),
                      interpolation=cv2.INTER_NEAREST) > 0


def poligono_x3(polis, caja, sobre=8):
    """Rasteriza el polígono a xS por cobertura de área (supermuestreo x8 y corte al 50 %);
    fillPoly a secas marca todo píxel que toca el borde y engorda la figura medio píxel."""
    x0, y0, x1, y1 = caja
    w, h = (x1 - x0) * S, (y1 - y0) * S
    m = np.zeros((h * sobre, w * sobre), np.uint8)
    qs = [np.round(((p - np.array([x0, y0])) * S * sobre - 0.5) * 16).astype(np.int32) for p in polis]
    cv2.fillPoly(m, qs, 255, lineType=cv2.LINE_8, shift=4)   # varios contornos: par-impar (huecos)
    return cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA) > 127


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def contorno(m):
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8)) > 0


def comparacion(foto_rgb, caja, refs_svgs, ruta):
    """Izquierda: foto x3 con el contorno del SVG en rojo. Derecha: diferencias
    (gris = coinciden, rojo = sólo SVG, azul = sólo segmentación)."""
    x0, y0, x1, y1 = caja
    base = cv2.resize(foto_rgb[y0:y1, x0:x1], ((x1 - x0) * S, (y1 - y0) * S), interpolation=cv2.INTER_CUBIC)
    a = base.copy()
    d = np.full(base.shape, 255, np.uint8)
    for r, s in refs_svgs:
        a[contorno(s)] = (255, 0, 0)
        d[r & s] = (200, 200, 200)
        d[s & ~r] = (230, 40, 40)
        d[r & ~s] = (40, 80, 230)
    sep = np.full((8, a.shape[1], 3), 90, np.uint8)
    # paleta de 256 colores: la comparación es para mirarla, no para medir (pesa ~3 veces menos)
    Image.fromarray(np.concatenate([a, sep, d], 0)).quantize(256, method=Image.Quantize.MEDIANCUT,
                                                             dither=Image.Dither.NONE).save(ruta, optimize=True)


def comprobar_estructura():
    err = []
    r = ET.parse(os.path.join(MARCA, "rotulo.svg")).getroot()
    ps = [e for e in r.iter() if e.tag == SVGNS + "path"]
    if [p.get("class") for p in ps[:2]] != ["cartela-borde", "cartela-fondo"]:
        err.append("rotulo.svg: piezas de la cartela")
    ls = [p for p in ps if p.get("class") == "letra"]
    if [p.get("data-i") for p in ls] != [str(i) for i in range(16)]:
        err.append("rotulo.svg: letras/data-i")
    for nombre in ("rotulo.svg", "seis.svg", "rotulo-solido.svg"):
        root = ET.parse(os.path.join(MARCA, nombre)).getroot()
        if not root.get("viewBox", "").startswith("0 0 "):
            err.append(nombre + ": viewBox sin origen 0,0")
        for e in root.iter():
            if e.get("id") is not None or e.get("fill") is not None or e.get("style") is not None:
                err.append(nombre + ": id/fill/style en " + e.tag)
    s = ET.parse(os.path.join(MARCA, "seis.svg")).getroot()
    if [p.get("class") for p in s.iter() if p.tag == SVGNS + "path"] != ["medallon-borde", "medallon-fondo", "seis"]:
        err.append("seis.svg: clases")
    so = ET.parse(os.path.join(MARCA, "rotulo-solido.svg")).getroot()
    sp = [p for p in so.iter() if p.tag == SVGNS + "path"]
    if len(sp) != 1 or sp[0].get("d").count("M") != 1:
        err.append("rotulo-solido.svg: no es un solo contorno")
    return err


def main():
    err = comprobar_estructura()
    print("estructura:", "OK" if not err else err)
    Z = np.load(os.path.join(TMP, "segmentacion.npz"))
    geo = json.load(open(os.path.join(TMP, "geometria.json"), encoding="utf-8"))
    foto = np.array(Image.open(os.path.join(MARCA, "rotulo-original.jpg")).convert("RGB"))
    H, W = foto.shape[:2]
    o_r = geo["rotulo"]["origen_en_foto"]
    o_s = geo["seis"]["origen_en_foto"]
    vb_r = [float(v) for v in geo["rotulo"]["viewBox"].split()]
    vb_s = [float(v) for v in geo["seis"]["viewBox"].split()]
    caja_r = (int(o_r[0]) - 6, int(o_r[1]) - 6, int(o_r[0] + vb_r[2]) + 7, int(o_r[1] + vb_r[3]) + 7)
    caja_s = (int(o_s[0]) - 6, int(o_s[1]) - 6, int(o_s[0] + vb_s[2]) + 7, int(o_s[1] + vb_s[3]) + 7)

    # referencias a x3
    sil = ampliar(Z["campo_sil"], caja_r) & ampliar_mask(ndi.binary_dilation(Z["sil"], iterations=3), caja_r)
    fondo = ampliar(Z["campo_fondo"], caja_r) & ampliar_mask(ndi.binary_dilation(Z["fondo"], iterations=3), caja_r)
    # letras y 6: la referencia es el contorno trazado en la foto (umbral + ajuste a la arista),
    # antes de suavizar y pasar a Bézier, rasterizado por área (evenodd)
    POL = json.load(open(os.path.join(TMP, "poligonos.json"), encoding="utf-8"))
    letras_ref = [poligono_x3([np.array(q) for q in cs], caja_r) for cs in POL["letras"]]
    zonas = [ndi.binary_dilation(r, iterations=9) for r in letras_ref]
    letras_all = np.zeros_like(letras_ref[0])
    for r in letras_ref:
        letras_all |= r
    seis_ref = poligono_x3([np.array(q) for q in POL["seis"]], caja_s)
    msil = poligono_x3([Z["med_ext"]], caja_s)          # polígonos del ajuste radial (720 vértices)
    mfon = poligono_x3([Z["med_int"]], caja_s)

    res = {"estructura_ok": not err, "errores": err, "metodo": __doc__.strip().split("\n\n")[2]}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        R = lambda sel: pintar(pg, "rotulo.svg", o_r, caja_r, sel) > 0.5
        M = lambda sel: pintar(pg, "seis.svg", o_s, caja_s, sel) > 0.5

        s_borde = R("path.cartela-borde")
        s_fondo = R("path.cartela-fondo")
        s_letras = R("path.letra")
        res["cartela-borde"] = round(iou(sil & ~fondo, s_borde), 4)
        res["cartela-fondo"] = round(iou(fondo, s_fondo), 4)
        res["letras (todas)"] = round(iou(letras_all, s_letras), 4)
        # sensibilidad: el mismo SVG frente a la cara de la letra cortada a L* 130 y 150 (±10)
        bgr = cv2.imread(os.path.join(MARCA, "rotulo-original.jpg"))
        Lf = cv2.GaussianBlur(cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32), (0, 0), 0.8)
        alt = {t: ampliar(np.clip((Lf - t) / 30 + 0.5, 0, 1), caja_r) for t in (130, 140, 150)}
        por_letra = []
        for i in range(16):
            s_i = R(f'path[data-i="{i}"]')
            d = dict(i=i, letra=ORDEN[i], iou=round(iou(letras_ref[i], s_i & zonas[i]), 4))
            for t, a in alt.items():
                d[f"iou_si_umbral_{t}"] = round(iou(a & zonas[i], s_i & zonas[i]), 4)
            por_letra.append(d)
        res["por_letra"] = por_letra
        # medallón: la referencia del borde/fondo es el polígono del ajuste radial (720 vértices)
        s_mb = M("path.medallon-borde")
        s_mf = M("path.medallon-fondo")
        s_6 = M("path.seis")
        res["medallon-borde"] = round(iou(msil & ~mfon, s_mb), 4)
        res["medallon-fondo"] = round(iou(mfon, s_mf), 4)
        res["seis"] = round(iou(seis_ref, s_6), 4)
        # silueta sólida
        vb, inner = leer("rotulo-solido.svg")
        sol = pintar(pg, "rotulo-solido.svg", o_r, caja_r, "path") > 0.5
        res["rotulo-solido"] = dict(iou_con_silueta=round(iou(sil, sol), 4))
        b.close()

    comparacion(foto, caja_r, [(sil & ~fondo, s_borde), (letras_all, s_letras)],
                os.path.join(MARCA, "comparacion-rotulo.png"))
    comparacion(foto, caja_s, [(msil & ~mfon, s_mb), (seis_ref, s_6)], os.path.join(MARCA, "comparacion-seis.png"))
    comparacion(foto, caja_r, [(sil, sol)], os.path.join(MARCA, "comparacion-solido.png"))

    v = sorted(por_letra, key=lambda d: d["iou"])
    res["letras_sensibilidad"] = {f"umbral_{t}": dict(minimo=min(d[f"iou_si_umbral_{t}"] for d in por_letra),
                                                       media=round(float(np.mean([d[f"iou_si_umbral_{t}"] for d in por_letra])), 4))
                                  for t in (130, 140, 150)}
    res["letras_resumen"] = dict(minimo=v[0]["iou"], mediana=v[8]["iou"], maximo=v[-1]["iou"],
                                 peores=[f'{d["i"]} {d["letra"]} {d["iou"]}' for d in v[:3]])
    json.dump(res, open(os.path.join(MARCA, "iou.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    for k in ("cartela-borde", "cartela-fondo", "letras (todas)", "medallon-borde", "medallon-fondo", "seis",
              "rotulo-solido"):
        print(f"{k:16s}", res[k])
    print("letras:", res["letras_resumen"])
    print("sensibilidad:", res["letras_sensibilidad"])


if __name__ == "__main__":
    main()
