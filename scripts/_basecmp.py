
import os, json, re
from PIL import Image, ImageChops
import numpy as np
R = r"F:\AntiGravity\Games\quan-bun"
base = Image.open(os.path.join(R,"art","raw","scene","scene-base.webp")).convert("RGB")
cur  = Image.open(os.path.join(R,"public","art","scene.webp")).convert("RGB").resize(base.size)
a = np.asarray(base, np.float32); b = np.asarray(cur, np.float32)
src = open(os.path.join(R,"src","data","counter-layout.js"), encoding="utf8").read()
Z = {}
for m in re.finditer(r"(\w+):\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),\s*w:\s*([\d.]+),\s*h:\s*([\d.]+)", src):
    Z[m.group(1)] = tuple(float(x) for x in m.groups()[1:])
H, W = a.shape[:2]
out = {}
for k in ["trash","micro","fryer","stack","noodle","pot","sink","burner"]:
    if k not in Z: continue
    x,y,w,h = Z[k]
    x0,y0,x1,y1 = int(x/100*W), int(y/100*H), int((x+w)/100*W), int((y+h)/100*H)
    d = np.abs(a[y0:y1, x0:x1] - b[y0:y1, x0:x1]).mean()
    out[k] = round(float(d), 1)
out["_whole"] = round(float(np.abs(a-b).mean()), 1)
out["_zones"] = sorted(Z)
print(json.dumps(out))
