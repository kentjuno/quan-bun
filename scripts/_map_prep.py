
import os, sys, subprocess
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
RAW = os.path.join(R, "art", "raw", "map"); PUB = os.path.join(R, "public", "art", "map"); os.makedirs(PUB, exist_ok=True)
# ban do: resize 768x1376
m = Image.open(os.path.join(RAW, "map-hn-hp.png")).convert("RGB"); print("map raw", m.size)
m = m.resize((768, 1376), Image.LANCZOS); m.save(os.path.join(PUB, "map-hn-hp.webp"), "WEBP", quality=88, method=6)
# xe + may: cat magenta (dung cut_magenta.py, outline=0)
subprocess.run([sys.executable, os.path.join(R, "scripts", "cut_magenta.py"), RAW], check=True, capture_output=True)
CUT = os.path.join(R, "art", "cut")
for n, w in [("bike", 420), ("clouds", 600)]:
    im = Image.open(os.path.join(CUT, n + ".png")).convert("RGBA")
    k = w / im.width; im = im.resize((w, max(1, int(im.height * k))), Image.LANCZOS)
    im.save(os.path.join(PUB, ("cloud" if n == "clouds" else n) + ".webp"), "WEBP", quality=90, method=6); print(n, im.size)
