
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; RAW = os.path.join(R, "art", "raw", "intro-f")
ims = [Image.open(os.path.join(RAW, f"intro-{i}-small.jpg")) for i in range(1, 5)]
w, h = ims[0].size
sheet = Image.new("RGB", (w * 4, h), "white")
for i, im in enumerate(ims): sheet.paste(im, (i * w, 0))
sheet.save(os.path.join(R, "_introf_sheet.jpg"), quality=80)
print(sheet.size)
