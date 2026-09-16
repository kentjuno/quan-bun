"""Do vi tri TUNG khay GN tren dai `prep` truc tiep tu scene.webp.

Tranh ve co chieu sau nen khay khong deu nhau — chia deu la lech.
Cach do: quet dai y 45..48.5% tim cot co nhieu pixel muc (vach giua hai khay),
gom cum lai thanh cac vach ngan, khay thu k nam giua hai vach lien tiep.

  python scripts/measure_pans.py            # in ra block PANS de dan vao counter-layout.js
  python scripts/measure_pans.py --check    # chi in vach, khong in block
"""
import os, sys, json
from PIL import Image
import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENE = os.path.join(R, "public", "art", "scene.webp")
BAND = (0.450, 0.485)      # dai quet, theo % chieu cao anh
INK = 150                  # nguong "la net muc"

def separators(path=SCENE):
    im = Image.open(path).convert("L")
    W, H = im.size
    a = np.asarray(im).astype(float)
    band = a[int(H * BAND[0]):int(H * BAND[1]), :]
    ink = (band < INK).sum(axis=0).astype(float)
    ink = np.convolve(ink, np.ones(3) / 3.0, mode="same")
    th = ink.max() * 0.45
    peaks, i = [], 0
    while i < len(ink):
        if ink[i] >= th:
            j = i
            while j < len(ink) and ink[j] >= th:
                j += 1
            peaks.append((i + j - 1) / 2.0 * 100.0 / W)
            i = j
        else:
            i += 1
    # vach doi (hai net sat nhau) gom lam mot
    out = []
    for p in peaks:
        if out and p - out[-1] < 4.0:
            out[-1] = (out[-1] + p) / 2.0
        else:
            out.append(p)
    return [round(p, 1) for p in out]

if __name__ == "__main__":
    sep = separators()
    print("vach ngan (% chieu ngang anh):", sep)
    if "--check" in sys.argv:
        sys.exit()
    edges = sep + [100.0]
    pans = [{"x": round(edges[k], 1), "w": round(edges[k + 1] - edges[k], 1)}
            for k in range(len(edges) - 1)]
    print("\nexport const PANS = [")
    for k in range(0, len(pans), 3):
        row = "  " + " ".join(
            "{ x: %5.1f, w: %5.1f }," % (p["x"], p["w"]) for p in pans[k:k + 3])
        print(row)
    print("];")
