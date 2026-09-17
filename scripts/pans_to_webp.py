
"""Cat + chuan hoa anh khay topping thanh sprite deu nhau.

Moi khay do Flow ve lai nen khung hinh moi cai moi khac. Neu bo thang vao hang
thi cai to cai nho. Nen: cat nen magenta -> cat sat mep do -> phong cho BE NGANG
bang nhau -> dan vao khung co dinh, can day.

  python scripts/pans_to_webp.py
"""
import os, sys
from PIL import Image, ImageFilter
import numpy as np

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(R, "art", "raw", "pans2")
CUT = os.path.join(R, "art", "cut-pans")
OUT = os.path.join(R, "public", "art", "pan")
W, H = 320, 250          # khung co dinh cua moi khay

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

def main_blob(im):
    """Flow hay ve lem mot mieng khay ben canh vao gop anh. Chi giu MANG LON NHAT,
    xoa sach phan con lai — neu khong, xep hang lai thay via khay thua giua hai khay."""
    from scipy import ndimage
    a = np.asarray(im)
    mask = a[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n <= 1:
        return im
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    a = a.copy()
    a[..., 3] = np.where(lab == keep, a[..., 3], 0)
    return Image.fromarray(a, "RGBA")

def normalise(im):
    im = main_blob(im)
    bb = im.getbbox()
    if bb: im = im.crop(bb)
    s = W / im.width
    if im.height * s > H: s = H / im.height
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(im, ((W - im.width) // 2, H - im.height), im)   # can day: khay dung tren mat ban
    return c

if __name__ == "__main__":
    os.makedirs(CUT, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(RAW)):
        if not f.endswith(".png"): continue
        k = f[:-4]
        im = normalise(cut(Image.open(os.path.join(RAW, f))))
        im.save(os.path.join(CUT, k + ".png"))
        im.save(os.path.join(OUT, k + ".webp"), "WEBP", quality=80, method=6)
        n += 1
    print(n, "khay ->", OUT)
