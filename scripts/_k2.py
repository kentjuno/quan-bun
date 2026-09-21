
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; PUB = os.path.join(R,"public","art","ob")
names = ["pot-blanch","noodle-tray"]
C, W, H = 2, 190, 190
sheet = Image.new("RGB", (C*W, H), (228, 224, 218))
for i, n in enumerate(names):
    im = Image.open(os.path.join(PUB, n + ".webp")).convert("RGBA")
    s = min((W-10)/im.width, (H-10)/im.height)
    im = im.resize((int(im.width*s), int(im.height*s)), Image.LANCZOS)
    sheet.paste(im, (i*W + (W-im.width)//2, (H-im.height)//2), im)
out = os.path.join(R, "art", "raw", "sheets", "_k2.jpg"); sheet.save(out, quality=60, optimize=True)
print(os.path.getsize(out))
