
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; RAW = os.path.join(R,"art","raw","shops")
ids = ["pho","bun-bo","hu-tieu"]
ims = []
for i in ids:
    p = os.path.join(RAW, i+"-small.jpg")
    if os.path.exists(p): ims.append(Image.open(p).resize((180,323)))
base = Image.open(os.path.join(R,"public","art","scene.webp")).convert("RGB").resize((180,323))
ims = [base] + ims
sheet = Image.new("RGB",(180*len(ims),323),"white")
for i,im in enumerate(ims): sheet.paste(im,(i*180,0))
sheet.save(os.path.join(RAW,"_sheet.jpg"), quality=58, optimize=True)
print(os.path.getsize(os.path.join(RAW,"_sheet.jpg")), len(ims))
