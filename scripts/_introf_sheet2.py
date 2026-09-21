
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; RAW = os.path.join(R, "art", "raw", "intro-f")
ims = [Image.open(os.path.join(RAW, f"intro-{i}-small.jpg")).resize((240, 320)) for i in range(1, 5)]
sheet = Image.new("RGB", (240*4, 320), "white")
for i, im in enumerate(ims): sheet.paste(im, (i*240, 0))
sheet.save(os.path.join(RAW, "_sheet_s.jpg"), quality=62, optimize=True)
print(os.path.getsize(os.path.join(RAW, "_sheet_s.jpg")))
