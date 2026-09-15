
import os, io, base64
from PIL import Image, ImageDraw
p = r"F:\AntiGravity\Games\quan-bun\art\raw\scene\scene-c.png"
im = Image.open(p).convert("RGB")
W0, H0 = im.size
im = im.resize((560, round(H0*560/W0)), Image.LANCZOS)
W, H = im.size
d = ImageDraw.Draw(im)
for k in range(1, 10):
    x = W*k//10; y = H*k//10
    d.line([(x,0),(x,H)], fill=(255,0,0), width=1)
    d.line([(0,y),(W,y)], fill=(0,90,255), width=1)
    d.text((x+2, 2), str(k*10), fill=(200,0,0))
    d.text((2, y+2), str(k*10), fill=(0,0,200))
b = io.BytesIO(); im.save(b, "JPEG", quality=88)
print(W0, H0)
print(base64.b64encode(b.getvalue()).decode())
