
import os, sys
from PIL import Image, ImageFilter
import numpy as np

SRC = r"F:\AntiGravity\Games\quan-bun\art\raw\hands"
DST = r"F:\AntiGravity\Games\quan-bun\art\cut"
os.makedirs(DST, exist_ok=True)

def cut(name, outline=6):
    im = Image.open(os.path.join(SRC, name + ".png")).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # magenta: R cao, G thap, B cao
    mag = (r > 110) & (b > 110) & (g < 110) & (abs(r - b) < 90)
    alpha = np.where(mag, 0, 255).astype(np.uint8)
    m = Image.fromarray(alpha, "L")
    # bo dom nho + lam min mep
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.0)).point(lambda v: 0 if v < 128 else 255)
    out = im.convert("RGBA"); out.putalpha(m)
    # xoa vien magenta con sot: keo mau tu trong ra
    arr = np.asarray(out).astype(np.int16)
    am = np.asarray(m) > 0
    edge = am & (np.asarray(m.filter(ImageFilter.MinFilter(5))) == 0)
    arr[..., 0] = np.where(edge, np.clip(arr[..., 0] - 40, 0, 255), arr[..., 0])
    arr[..., 2] = np.where(edge, np.clip(arr[..., 2] - 40, 0, 255), arr[..., 2])
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    # vien trang sticker
    if outline:
        exp = m.filter(ImageFilter.MaxFilter(outline * 2 + 1))
        base = Image.new("RGBA", out.size, (255, 255, 255, 0))
        base.paste(Image.new("RGBA", out.size, (255, 253, 248, 255)), (0, 0), exp)
        base.alpha_composite(out); out = base
    bb = out.split()[3].getbbox()
    if bb: out = out.crop(bb)
    p = os.path.join(DST, name + ".png"); out.save(p)
    return p, out.size

done = []
for f in sorted(os.listdir(SRC)):
    if f.endswith(".png"):
        n = f[:-4]
        done.append(cut(n, outline=0 if n.startswith("fx-") else 5))
print(done)
