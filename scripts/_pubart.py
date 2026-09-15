
import os, io, zipfile, base64
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
CUT = os.path.join(R, "art", "cut")
OUT = os.path.join(R, "public", "art")
os.makedirs(OUT, exist_ok=True)
WANT = []
for f in sorted(os.listdir(CUT)):
    if not f.endswith(".png"): continue
    n = f[:-4]
    if n.endswith("-dry") or n.endswith("-wet") or n.startswith(("hand-", "fx-", "cus-", "ui-")):
        WANT.append(n)
tot = 0
for n in WANT:
    im = Image.open(os.path.join(CUT, n + ".png")).convert("RGBA")
    w = 300 if (n.endswith("-dry") or n.endswith("-wet")) else 260
    if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, n + ".webp")
    im.save(p, "WEBP", quality=72, method=6)
    tot += os.path.getsize(p)
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as z:
    for n in WANT: z.write(os.path.join(OUT, n + ".webp"), n + ".webp")
open(os.path.join(R, "public", "_art.b64"), "w").write(base64.b64encode(buf.getvalue()).decode())
print(len(WANT), "anh,", round(tot/1024), "KB, zip b64", os.path.getsize(os.path.join(R, "public", "_art.b64")))
