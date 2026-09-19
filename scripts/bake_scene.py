"""Nuong do vat TINH vao tranh nen (Kent 19/09: "nhin nhu dan ghep").

  Sprite (thung rac, chong to, khay soi, lo vi song, chao chien) dat vao dung ZONES
  (contain, can giua — y nhu .pv-objimg trong game) -> anh "guide" ->
  Flow edit-image ve lai cho cung anh sang / bong tiep xuc, KHONG doi bo cuc ->
  kiem struct_corr voi guide -> art/raw/scene/scene-baked.webp.
  Sau do scripts/draw_mats.py ve tam lot len -> public/art/scene.webp.

  python scripts/bake_scene.py            # nuong + kiem
  python scripts/bake_scene.py --guide    # chi tao anh guide de xem
Doi ZONES trong tools/zones.html -> chay lai la khop.
"""
import os, re, sys, json, time, urllib.request
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(R, "art", "raw", "scene", "scene-j1.webp")
GUIDE = os.path.join(R, "art", "raw", "scene", "scene-bake-guide.png")
RAW = os.path.join(R, "art", "raw", "scene", "scene-baked-raw.png")
OUT = os.path.join(R, "art", "raw", "scene", "scene-baked.webp")
PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
API = "http://127.0.0.1:8100"
# zone -> sprite (public/art/st-*.webp). Thu tu = thu tu ve (sau de len truoc).
# Flow hay "ve giup" them do (lan dau: khay rau xanh ngay cho thot). Vung nay tra lai pixel goc, mep lam mem.
RESTORE = ["boards"]
BAKE = [("micro", "st-microwave"), ("fryer", "st-fryer"), ("stack", "st-bowl-stack"), ("noodle", "st-noodle-tray"), ("trash", "st-trash")]

def zones():
    t = open(os.path.join(R, "src", "data", "counter-layout.js"), encoding="utf-8").read()
    body = t[t.find("export const ZONES"):]
    body = body[:body.find("};") + 2]
    z = {}
    for m in re.finditer(r"(\w+):\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),\s*w:\s*([\d.]+),\s*h:\s*([\d.]+)", body):
        z[m.group(1)] = tuple(float(m.group(i)) for i in range(2, 6))
    return z

def guide():
    im = Image.open(SRC).convert("RGBA"); W, H = im.size
    Z = zones()
    for zk, sp in BAKE:
        x, y, w, h = Z[zk]
        bx, by, bw, bh = int(x / 100 * W), int(y / 100 * H), int(w / 100 * W), int(h / 100 * H)
        s = Image.open(os.path.join(R, "public", "art", sp + ".webp")).convert("RGBA")
        k = min(bw / s.width, bh / s.height)
        s = s.resize((max(1, int(s.width * k)), max(1, int(s.height * k))), Image.LANCZOS)
        ox, oy = bx + (bw - s.width) // 2, by + (bh - s.height) // 2      # contain, can giua = .pv-objimg
        im.alpha_composite(s, (ox, oy))
    im.convert("RGB").save(GUIDE)
    return GUIDE

def post(path, body, timeout=300):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read().decode())

def retry(fn, n=4):
    last = None
    for _ in range(n):
        try: return fn()
        except Exception as e: last = e; time.sleep(4)
    raise last

def edges(L):
    gx = np.zeros_like(L); gy = np.zeros_like(L)
    gx[:, 1:-1] = L[:, 2:] - L[:, :-2]; gy[1:-1, :] = L[2:, :] - L[:-2, :]
    return np.hypot(gx, gy)

def struct_corr(a, b):
    ea, eb = edges(a).ravel(), edges(b).ravel()
    ea = ea / (ea.std() or 1); eb = eb / (eb.std() or 1)
    return float(np.corrcoef(ea - ea.mean(), eb - eb.mean())[0, 1])

PROMPT = ("This is one watercolour-and-ink illustration of a Vietnamese noodle kitchen. A few objects were pasted in as cut-outs: "
          "a metal trash bin, a stack of white bowls, a tray of noodles, a microwave oven on the wall shelf, a deep fryer on the stove. "
          "Repaint ONLY those pasted objects so they belong to the painting: the same ink line weight, the same watercolour palette and paper texture, "
          "light from the upper left like the rest of the room, and a soft contact shadow where each object touches the surface it stands on. "
          "Keep every object at EXACTLY the same position and size. Do not add, remove, move or restyle anything else. The composition must stay identical.")

def bake():
    g = guide()
    up = retry(lambda: post("/api/flow/upload-image", {"file_path": g, "project_id": PID, "file_name": "scene-bake-guide.png"}))
    mid = up.get("media_id") or up.get("mediaId")
    r = retry(lambda: post("/api/flow/edit-image", {"prompt": PROMPT, "source_media_id": mid, "project_id": PID, "aspect_ratio": "IMAGE_ASPECT_RATIO_PORTRAIT"}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    urllib.request.urlretrieve(url, RAW)
    a = Image.open(RAW).convert("L"); b = Image.open(g).convert("L")
    a = a.resize(b.size, Image.LANCZOS)
    sc = struct_corr(np.asarray(a, np.float32), np.asarray(b, np.float32))
    out = post_process()
    return {"struct_vs_guide": round(sc, 3), "raw": RAW, "out": OUT, "raw_size": Image.open(RAW).size}

def post_process():
    from PIL import ImageDraw, ImageFilter
    base = Image.open(SRC).convert("RGB"); W, H = base.size
    out = Image.open(RAW).convert("RGB").resize((W, H), Image.LANCZOS)
    Z = zones()
    for zk in RESTORE:
        x, y, w, h = Z[zk]
        m = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m).rectangle([x / 100 * W, y / 100 * H, (x + w) / 100 * W, (y + h) / 100 * H], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(10))
        out = Image.composite(base, out, m)
    out.save(OUT, "WEBP", quality=90, method=6)
    return OUT

if __name__ == "__main__":
    if "--guide" in sys.argv: print(guide())
    elif "--post" in sys.argv: print(post_process())      # chi lam lai buoc hau ky tu RAW, khong gen lai
    else: print(json.dumps(bake()))
