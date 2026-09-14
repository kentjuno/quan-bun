
import os
from PIL import Image
import numpy as np
CUT = r"F:\AntiGravity\Games\quan-bun\art\cut"
DISHES = [f[:-4] for f in os.listdir(CUT) if f.endswith(".png") and ("-dry" in f or "-wet" in f)]

def depink(p, top=0.32):
    im = Image.open(p).convert("RGBA"); a = np.asarray(im).astype(np.int16).copy()
    h = int(a.shape[0]*top)
    r, g, b, al = a[:h,:,0], a[:h,:,1], a[:h,:,2], a[:h,:,3]
    pink = (r > g + 24) & (b > g + 10) & (al > 0)
    al[pink] = 0; a[:h,:,3] = al
    Image.fromarray(a.astype(np.uint8), "RGBA").save(p)
    return int(pink.sum())

def square(p):
    im = Image.open(p).convert("RGBA")
    bb = im.split()[3].getbbox()
    if bb: im = im.crop(bb)
    s = max(im.size)
    c = Image.new("RGBA", (s, s), (0,0,0,0))
    c.paste(im, ((s-im.width)//2, (s-im.height)//2))
    c.save(p)

n = 0
for name in DISHES:
    p = os.path.join(CUT, name + ".png")
    n += depink(p); square(p)
print(len(DISHES), "anh,", n, "pixel hong bi xoa")
