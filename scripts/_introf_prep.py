
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
RAW = os.path.join(R, "art", "raw", "intro-f")
PUB = os.path.join(R, "public", "art", "intro", "f"); os.makedirs(PUB, exist_ok=True)
out = []
for n in ["intro-1", "intro-2", "intro-3", "intro-4"]:
    p = os.path.join(RAW, n + ".png")
    if not os.path.exists(p): continue
    im = Image.open(p).convert("RGB"); im.thumbnail((900, 1200))
    q = os.path.join(PUB, n + ".webp"); im.save(q, "WEBP", quality=82, method=6)
    im.resize((320, 427)).save(os.path.join(RAW, n + "-small.jpg"), quality=78)
    out.append((n, im.size, os.path.getsize(q)))
print(out)
