
# SCENE GRAPH buoc 1: tach DO DAC trong bep thanh object rieng (nen magenta -> PNG trong suot)
#   - cat vung tu art/scene.webp, dan len nen magenta, nho Flow "chi giu MOT mon do, nen magenta phang"
#   - cat nen bang scripts/cut_magenta.py -> art/cut/ob-*.png -> public/art/ob/<name>.webp
# Chay: C:\Python314\python.exe scripts/scene_objects.py [ten ...]
import os, sys, json, time, urllib.request, subprocess
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
API = "http://127.0.0.1:8100"; PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
SRC = os.path.join(R, "public", "art", "scene.webp")
RAW = os.path.join(R, "art", "raw", "objs"); os.makedirs(RAW, exist_ok=True)
PUB = os.path.join(R, "public", "art", "ob"); os.makedirs(PUB, exist_ok=True)
ST  = os.path.join(R, "_objs_status.json")

# (x0, y0, x1, y1) theo % khung 768x1376, va cau ta mon do
OBJS = {
 "pot-blanch": ((2, 24, 40, 46), "the big aluminium stock pot with two handles standing on its low stove"),
 "sink":       ((33, 26, 64, 48), "the small stainless sink with the tall curved tap"),
 "stove":      ((56, 26, 100, 48), "the black gas stove top with its burner grates and control knobs"),
 "counter-back": ((0, 40, 100, 62), "the long back counter top with the metal cabinet doors under it"),
 "counter-front": ((0, 60, 100, 100), "the big pale front counter top, empty, seen from just above"),
}
KEEP = (" The background must be a flat solid MAGENTA #FF00FF, nothing else on it, no shadow on the background, "
        "no table, no floor, no wall, no other objects, just that one thing floating on the magenta. "
        "Keep the exact same drawing, same angle, same size, same ink line weight, same watercolour colours. "
        "No text, no words, no people.")

def post(path, body, timeout=600):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read().decode())
def retry(fn, n=3):
    last = None
    for _ in range(n):
        try: return fn()
        except Exception as e: last = e; time.sleep(5)
    raise last

def one(name):
    box, what = OBJS[name]
    base = Image.open(SRC).convert("RGB"); W, H = base.size
    x0, y0, x1, y1 = [int(v / 100 * (W if i % 2 == 0 else H)) for i, v in enumerate(box)]
    crop = base.crop((x0, y0, x1, y1))
    pad = 60
    canvas = Image.new("RGB", (crop.width + pad * 2, crop.height + pad * 2), (255, 0, 255))
    canvas.paste(crop, (pad, pad))
    seed = os.path.join(RAW, name + "-seed.png"); canvas.save(seed)
    up = retry(lambda: post("/api/flow/upload-image", {"file_path": seed, "project_id": PID, "file_name": name + "-seed.png"}))
    mid = up.get("media_id") or up.get("mediaId")
    prompt = ("Keep ONLY " + what + " from this picture and erase everything else." + KEEP)
    r = retry(lambda: post("/api/flow/edit-image", {"prompt": prompt, "source_media_id": mid, "project_id": PID, "aspect_ratio": "IMAGE_ASPECT_RATIO_SQUARE"}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    png = os.path.join(RAW, "ob-" + name + ".png"); urllib.request.urlretrieve(url, png)
    return os.path.getsize(png)

if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if a in OBJS] or list(OBJS)
    log = {}
    for n in ids:
        try: log[n] = one(n)
        except Exception as e: log[n] = "ERR " + str(e)[:160]
        json.dump(log, open(ST, "w"), ensure_ascii=False)
    # cat nen magenta
    subprocess.run([sys.executable, os.path.join(R, "scripts", "cut_magenta.py"), RAW], capture_output=True, text=True)
    CUT = os.path.join(R, "art", "cut")
    for n in ids:
        p = os.path.join(CUT, "ob-" + n + ".png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGBA")
            if im.width > 700: im = im.resize((700, max(1, round(im.height * 700 / im.width))), Image.LANCZOS)
            out = os.path.join(PUB, n + ".webp"); im.save(out, "WEBP", quality=88, method=6)
            log[n + "_webp"] = [im.size, os.path.getsize(out)]
    log["done"] = True
    json.dump(log, open(ST, "w"), ensure_ascii=False)
    print(json.dumps(log))
