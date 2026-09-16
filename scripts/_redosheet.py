
import os, io, base64
from PIL import Image, ImageDraw
CUT = r"F:\AntiGravity\Games\quan-bun\art\cut"
names = ["bo-vien","nuoc-ca","tom-luoc","meat-basket","cha-gio","tray-paper"]
C = 260; COL = 3
rows = (len(names)+COL-1)//COL
sheet = Image.new("RGB", (C*COL, (C+16)*rows), (240,235,226))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    p = os.path.join(CUT, n + ".png")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA"); im.thumbnail((C-10, C-10), Image.LANCZOS)
    bg = Image.new("RGBA", (C-10, C-10), (255,255,255,255))
    bg.alpha_composite(im, ((C-10-im.width)//2, (C-10-im.height)//2))
    sheet.paste(bg.convert("RGB"), ((i%COL)*C+5, (i//COL)*(C+16)+14))
    d.text(((i%COL)*C+5, (i//COL)*(C+16)+2), n, fill=(35,28,20))
b = io.BytesIO(); sheet.save(b, "JPEG", quality=90)
print(base64.b64encode(b.getvalue()).decode())
