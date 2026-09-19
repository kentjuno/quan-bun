# J7 — noi nuoc tren bep: art/raw/pots/pot-*.png (nen magenta, tu edit-image) -> cat nen -> 300px -> public/art/pot-*.webp
import os, subprocess, sys
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
RAW = os.path.join(R, "art", "raw", "pots"); CUT = os.path.join(R, "art", "cut"); PUB = os.path.join(R, "public", "art")
subprocess.run([sys.executable, os.path.join(R, "scripts", "cut_magenta.py"), RAW], check=True, capture_output=True)
done = []
for f in sorted(os.listdir(RAW)):
    if not f.startswith("pot-") or not f.endswith(".png"): continue
    im = Image.open(os.path.join(CUT, f)).convert("RGBA")
    w, h = im.size; s = 300.0 / w
    im = im.resize((300, max(1, int(h * s))), Image.LANCZOS)
    out = os.path.join(PUB, f[:-4] + ".webp"); im.save(out, "WEBP", quality=90, method=6)
    done.append((f, im.size))
print(done)
