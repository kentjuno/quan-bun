
import numpy as np
from PIL import Image
im = Image.open(r"F:\AntiGravity\Games\quan-bun\art\raw\fx\stamp-raw.png").convert("RGB")
a = np.asarray(im).astype(np.float32); h,w,_ = a.shape
lum = a.mean(axis=2)
print("size", w, h)
print("corner", lum[5,5], "center-ish", lum[h//2, w//2])
# histogram tho
for lo in range(0,256,32):
    print(lo, int(((lum>=lo)&(lum<lo+32)).sum()))
out = Image.open(r"F:\AntiGravity\Games\quan-bun\public\art\fx-stamp.webp").convert("RGBA")
al = np.asarray(out)[:,:,3]
print("alpha corner", al[3,3], "max", al.max(), "nonzero", int((al>8).sum()))
