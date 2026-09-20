
import os, sys, shutil, subprocess, json
R = r"F:\AntiGravity\Games\quan-bun"
PY = sys.executable
RAW = os.path.join(R, "art", "raw", "m5")
TMP_IC = os.path.join(R, "art", "raw", "m5-ic")
TMP_REST = os.path.join(R, "art", "raw", "m5-rest")
for d in (TMP_IC, TMP_REST):
    shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
for f in sorted(os.listdir(RAW)):
    if not f.endswith(".png"): continue
    if f.startswith("ic-"): shutil.copy(os.path.join(RAW, f), os.path.join(TMP_IC, f[3:]))
    else: shutil.copy(os.path.join(RAW, f), os.path.join(TMP_REST, f))
log = {}
r = subprocess.run([PY, os.path.join(R,"scripts","process_icons.py"), TMP_IC, os.path.join(R,"public","icons")], capture_output=True, text=True)
log["icons"] = (r.stdout or "")[-1500:] + (r.stderr or "")[-800:]
r = subprocess.run([PY, os.path.join(R,"scripts","cut_magenta.py"), TMP_REST], capture_output=True, text=True)
log["cut"] = (r.stdout or "")[-1200:] + (r.stderr or "")[-800:]
from PIL import Image
CUT = os.path.join(R, "art", "cut"); PUB = os.path.join(R, "public", "art")
made = []
for f in sorted(os.listdir(TMP_REST)):
    n = f[:-4]
    p = os.path.join(CUT, n + ".png")
    if not os.path.exists(p): log.setdefault("missing", []).append(n); continue
    im = Image.open(p).convert("RGBA")
    w = 300
    if im.width != w: im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    out = os.path.join(PUB, n + ".webp"); im.save(out, "WEBP", quality=80, method=6)
    made.append((n, im.size, os.path.getsize(out)))
log["webp"] = made
r = subprocess.run(["node", os.path.join(R,"scripts","gen_icons_map.mjs")], capture_output=True, text=True, cwd=R, shell=True)
log["iconsmap"] = (r.stdout or "") + (r.stderr or "")[-500:]
r = subprocess.run(["node", os.path.join(R,"scripts","_art_manifest.mjs")], capture_output=True, text=True, cwd=R, shell=True)
log["manifest"] = (r.stdout or "") + (r.stderr or "")[-500:]
log["done"] = True
open(os.path.join(R, "_m5art_status.json"), "w", encoding="utf8").write(json.dumps(log, ensure_ascii=False, default=str))
