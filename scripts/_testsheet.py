
import os, io, base64
from PIL import Image, ImageDraw
import numpy as np
OUT = r"F:\AntiGravity\Games\quan-bun\art\raw\items"
names = ["_test-xa-lach", "_test-nam", "_test-pho-bowl"]
def cut(im):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[...,0], a[...,1], a[...,2]
    mag = (r > 110) & (b > 110) & (g < 110) & (abs(r - b) < 90)
    al = np.where(mag, 0, 255).astype(np.uint8)
    out = im.convert("RGBA"); out.putalpha(Image.fromarray(al, "L"))
    bb = out.split()[3].getbbox()
    return out.crop(bb) if bb else out
C = 300
sheet = Image.new("RGB", (C*3, C+16), (255,255,255))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    im = cut(Image.open(os.path.join(OUT, n + ".png")))
    im.thumbnail((C-10, C-10), Image.LANCZOS)
    bg = Image.new("RGBA", (C-10, C-10), (255,255,255,255))
    bg.alpha_composite(im, ((C-10-im.width)//2, (C-10-im.height)//2))
    sheet.paste(bg.convert("RGB"), (i*C+5, 16))
    d.text((i*C+5, 3), n.replace("_test-",""), fill=(30,30,30))
b = io.BytesIO(); sheet.save(b, "JPEG", quality=92)
print(base64.b64encode(b.getvalue()).decode())
