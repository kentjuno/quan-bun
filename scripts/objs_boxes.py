
# SCENE GRAPH buoc 2: cat nen magenta GIU NGUYEN KHUNG roi tinh HOP cua tung object theo % khung bep.
# Ghi public/art/ob/<name>.webp + src/data/ob-boxes.json  (x, y, w, h tinh bang % cua khung 768x1376)
import os, sys, json
from PIL import Image, ImageFilter
import numpy as np
R = r"F:\AntiGravity\Games\quan-bun"
RAW = os.path.join(R, "art", "raw", "objs")
PUB = os.path.join(R, "public", "art", "ob"); os.makedirs(PUB, exist_ok=True)
SRC = os.path.join(R, "public", "art", "scene.webp")
PAD = 60
sys.path.insert(0, os.path.join(R, "scripts"))
from scene_objects import OBJS

def cut(im):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 110) & (b > 110) & (g < 110) & (abs(r - b) < 90)
    m = Image.fromarray(np.where(mag, 0, 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.0)).point(lambda v: 0 if v < 128 else 255)
    out = im.convert("RGBA"); out.putalpha(m)
    arr = np.asarray(out).astype(np.int16)
    edge = (np.asarray(m) > 0) & (np.asarray(m.filter(ImageFilter.MinFilter(5))) == 0)
    arr[..., 0] = np.where(edge, np.clip(arr[..., 0] - 40, 0, 255), arr[..., 0])
    arr[..., 2] = np.where(edge, np.clip(arr[..., 2] - 40, 0, 255), arr[..., 2])
    return Image.fromarray(arr.astype(np.uint8), "RGBA")

base = Image.open(SRC); W, H = base.size
boxes = {}
for name, (box, _) in OBJS.items():
    p = os.path.join(RAW, "ob-" + name + ".png")
    if not os.path.exists(p): continue
    x0, y0, x1, y1 = [int(v / 100 * (W if i % 2 == 0 else H)) for i, v in enumerate(box)]
    cw, ch = x1 - x0, y1 - y0
    seed_w, seed_h = cw + PAD * 2, ch + PAD * 2
    im = Image.open(p)
    sx, sy = im.width / seed_w, im.height / seed_h
    rgba = cut(im)
    bb = rgba.split()[3].getbbox()
    if not bb: continue
    bx0, by0, bx1, by1 = bb
    fx0 = x0 + (bx0 / sx - PAD); fy0 = y0 + (by0 / sy - PAD)
    fx1 = x0 + (bx1 / sx - PAD); fy1 = y0 + (by1 / sy - PAD)
    obj = rgba.crop(bb)
    if obj.width > 760: obj = obj.resize((760, max(1, round(obj.height * 760 / obj.width))), Image.LANCZOS)
    out = os.path.join(PUB, name + ".webp"); obj.save(out, "WEBP", quality=88, method=6)
    boxes[name] = {"x": round(fx0 / W * 100, 2), "y": round(fy0 / H * 100, 2),
                   "w": round((fx1 - fx0) / W * 100, 2), "h": round((fy1 - fy0) / H * 100, 2),
                   "px": list(obj.size), "bytes": os.path.getsize(out)}
json.dump(boxes, open(os.path.join(R, "src", "data", "ob-boxes.json"), "w"), indent=1)
print(json.dumps(boxes))
