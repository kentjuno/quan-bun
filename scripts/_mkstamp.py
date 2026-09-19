
import sys, urllib.request, numpy as np
from PIL import Image
url, out, raw = sys.argv[1], sys.argv[2], sys.argv[3]
import os as _o
if not _o.path.exists(raw): urllib.request.urlretrieve(url, raw)
im = Image.open(raw).convert("RGB")
a = np.asarray(im).astype(np.float32)
# nen trang -> alpha: cang toi cang dac
lum = a.mean(axis=2)
# Giay trong anh Flow khong trang tinh (~230) -> nguong 235 de lai o vuong mo.
alpha = np.clip((200.0 - lum) / 85.0, 0, 1)
alpha[lum > 200] = 0.0
rgba = np.dstack([a, alpha * 255.0]).astype(np.uint8)
im2 = Image.fromarray(rgba, "RGBA")
bb = im2.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
if bb: im2 = im2.crop(bb)
w, h = im2.size
s = 320.0 / max(w, h)
im2 = im2.resize((max(1,int(w*s)), max(1,int(h*s))), Image.LANCZOS)
im2.save(out, "WEBP", quality=92, method=6)
print("OK", im2.size)
