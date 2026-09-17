
"""Cat + xuat anh to theo tung buoc rap sang public/art/step/."""
import os, sys
from PIL import Image, ImageFilter
import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(R, "art", "raw", "steps")
OUT = os.path.join(R, "public", "art", "step")

def cut(im):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 110) & (b > 110) & (g < 110) & (abs(r - b) < 90)
    m = Image.fromarray(np.where(mag, 0, 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.0)).point(lambda v: 0 if v < 128 else 255)
    out = im.convert("RGBA"); out.putalpha(m)
    arr = np.asarray(out).astype(np.int16)
    am = np.asarray(m) > 0
    edge = am & (np.asarray(m.filter(ImageFilter.MinFilter(5))) == 0)
    arr[..., 0] = np.where(edge, np.clip(arr[..., 0] - 40, 0, 255), arr[..., 0])
    arr[..., 2] = np.where(edge, np.clip(arr[..., 2] - 40, 0, 255), arr[..., 2])
    return Image.fromarray(arr.astype(np.uint8), "RGBA")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(RAW)):
        if not f.endswith(".png"): continue
        im = cut(Image.open(os.path.join(RAW, f)))
        bb = im.getbbox()
        if bb: im = im.crop(bb)
        if im.width > 300:
            im = im.resize((300, round(im.height * 300 / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, f[:-4] + ".webp"), "WEBP", quality=74, method=6)
        n += 1
    print(n, "anh buoc ->", OUT)
