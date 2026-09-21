
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; PUB = os.path.join(R,"public","art","ob")
names = ["pot-blanch","sink","stove","trash","bowl-stack","noodle-tray","counter-back","counter-front"]
C, W, H = 4, 150, 150
sheet = Image.new("RGB", (C*W, ((len(names)+C-1)//C)*H), (220, 216, 208))
for i, n in enumerate(names):
    p = os.path.join(PUB, n + ".webp")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA")
    s = min((W-10)/im.width, (H-10)/im.height)
    im = im.resize((max(1,int(im.width*s)), max(1,int(im.height*s))), Image.LANCZOS)
    x, y = (i % C)*W + (W-im.width)//2, (i//C)*H + (H-im.height)//2
    sheet.paste(im, (x, y), im)
out = os.path.join(R, "art", "raw", "sheets", "_grid.jpg")
sheet.save(out, quality=58, optimize=True)
print(os.path.getsize(out), sheet.size)
