
import os, io, base64
from PIL import Image, ImageDraw
S = r"F:\AntiGravity\Games\quan-bun\art\raw\scene"
names = ["scene-a", "scene-b", "scene-c"]
W = 300
ims = [Image.open(os.path.join(S, n + ".png")).convert("RGB") for n in names]
for i in ims: i.thumbnail((W, 10000), Image.LANCZOS)
H = max(i.height for i in ims)
sheet = Image.new("RGB", (W*3, H+16), (240,236,228))
d = ImageDraw.Draw(sheet)
for k, (n, im) in enumerate(zip(names, ims)):
    sheet.paste(im, (k*W, 16))
    d.text((k*W+4, 3), n, fill=(30,30,30))
b = io.BytesIO(); sheet.save(b, "JPEG", quality=80)
print(base64.b64encode(b.getvalue()).decode())
