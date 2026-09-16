
import os, io, base64, sys
from PIL import Image, ImageDraw
CUT = r"F:\AntiGravity\Games\quan-bun\art\cut"
NAMES = ["bac-ha","banh-da","banh-hoi","banh-trang","bap-bo","bo-tai","bo-vien","bun","bun-to","ca-chien",
 "ca-chua","can-nuoc","cha-ca","cha-gio","cha-lua","cha-re","chao-ap-ca","chao-long","chao-suon","cot-cua",
 "dau-hu","dau-phong-rang","dia-dai","dia-lon","do-chua","dry-bowl","dua-leo","extra-bowl","goc-hanh-la","gung",
 "hanh-la","hanh-phi","hanh-tay","huyet","kinh-gioi","la-sach","mam-dan","mam-tom","meat-basket","mieng-nuoc",
 "mo-hanh","nam","ngo-ri-ngo-gai","noodle-basket","nuoc-bun-bo","nuoc-ca","nuoc-cot-chanh","ot-do","pho-bowl",
 "pho-noodle","quay","rau-muong","rau-ram","serving-plate","soup-bowl","suon-cay","thi-la","thit-luoc",
 "thit-nuong","tia-to","tom","tom-luoc","top-mo","tray","tray-paper","xa-lach","xoai"]
part = int(sys.argv[1]); names = NAMES[part*23:(part+1)*23]
COL = 5; C = 170
rows = (len(names)+COL-1)//COL
sheet = Image.new("RGB", (C*COL, (C+14)*rows), (240,235,226))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    p = os.path.join(CUT, n + ".png")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGBA"); im.thumbnail((C-8, C-8), Image.LANCZOS)
    bg = Image.new("RGBA", (C-8, C-8), (255,255,255,255))
    bg.alpha_composite(im, ((C-8-im.width)//2, (C-8-im.height)//2))
    sheet.paste(bg.convert("RGB"), ((i%COL)*C+4, (i//COL)*(C+14)+12))
    d.text(((i%COL)*C+4, (i//COL)*(C+14)+1), n[:22], fill=(35,28,20))
b = io.BytesIO(); sheet.save(b, "JPEG", quality=72)
print(base64.b64encode(b.getvalue()).decode())
