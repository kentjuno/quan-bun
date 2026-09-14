
import os, io, base64, sys
from PIL import Image, ImageDraw
CUT = r"F:\AntiGravity\Games\quan-bun\art\cut"
ORDER = ["pho-dac-biet","pho-tai-nam","pho-tai-dap","pho-suon-tai","bun-rieu-cua","banh-da-cua",
         "bun-bo-hue","bun-ca-hai-phong","cha-ca-la-vong","bun-dau-mam-tom","banh-hoi-thit-heo",
         "bun-nem-cua-thit-nuong-tom-nuong","bun-ga-nuong","bun-cha-ha-noi","cha-gio-viet-nam",
         "goi-cuon-tom-thit","chao-long","chao-suon"]
part = int(sys.argv[1]); names = ORDER[part*9:(part+1)*9]
C = 150
sheet = Image.new("RGB", (C*2*3, (C+16)*3), (238,232,220))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    for j, st in enumerate(["dry","wet"]):
        p = os.path.join(CUT, n + "-" + st + ".png")
        if not os.path.exists(p): continue
        im = Image.open(p).convert("RGBA"); im.thumbnail((C-6, C-6), Image.LANCZOS)
        bg = Image.new("RGBA", (C-6, C-6), (255,255,255,255))
        bg.alpha_composite(im, ((C-6-im.width)//2, (C-6-im.height)//2))
        x = (i%3)*C*2 + j*C + 3; y = (i//3)*(C+16) + 14
        sheet.paste(bg.convert("RGB"), (x, y))
    d.text(((i%3)*C*2+4, (i//3)*(C+16)+2), n[:34], fill=(40,30,20))
b = io.BytesIO(); sheet.save(b, "JPEG", quality=55)
print(base64.b64encode(b.getvalue()).decode())
