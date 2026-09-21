
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; PUB = os.path.join(R,"public","art","ob")
names = ["pot-blanch","sink","stove","trash","bowl-stack","noodle-tray","counter-back","counter-front","prep-top","prep-top-wood","counter-back-wood","counter-front-wood"]
C, W, H = 4, 145, 145
sheet = Image.new("RGB", (C*W, ((len(names)+C-1)//C)*H), (225, 221, 214))
for i, n in enumerate(names):
    p = os.path.join(PUB, n + ".webp")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA")
    s = min((W-8)/im.width, (H-8)/im.height)
    im = im.resize((max(1,int(im.width*s)), max(1,int(im.height*s))), Image.LANCZOS)
    sheet.paste(im, ((i%C)*W + (W-im.width)//2, (i//C)*H + (H-im.height)//2), im)
out = os.path.join(R, "art", "raw", "sheets", "_grid2.jpg")
sheet.save(out, quality=52, optimize=True)
print(os.path.getsize(out))
