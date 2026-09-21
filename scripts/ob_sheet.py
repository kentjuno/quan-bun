
# SCENE GRAPH buoc 1b: GEN OBJECT THAT (khong cat tu tranh cu nua).
# Ca bo do gen trong MOT ban ve -> chung goc nhin, chung huong sang, chung net.
# Roi tach tung mon bang connected-component tren alpha -> public/art/ob/<name>.webp
# Chay: C:\Python314\python.exe scripts/ob_sheet.py <sheet> [<sheet> ...]
import os, sys, json, time, urllib.request
from PIL import Image, ImageFilter
import numpy as np
R = r"F:\AntiGravity\Games\quan-bun"
API = "http://127.0.0.1:8100"; PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
RAW = os.path.join(R, "art", "raw", "sheets"); os.makedirs(RAW, exist_ok=True)
PUB = os.path.join(R, "public", "art", "ob"); os.makedirs(PUB, exist_ok=True)
ST  = os.path.join(R, "_sheet_status.json")

# Goc nhin + net ve: PHAI giong het nhau o moi ban ve thi rap moi khop
VIEW = ("Everything is drawn from exactly the same viewpoint: a cook standing at a kitchen counter, "
        "looking straight ahead and slightly down, about fifteen degrees, no wide-angle distortion. "
        "Light always comes from the upper left, soft. "
        "Ink line art with warm marker and watercolour wash, brown ink outline, hand-drawn illustration, "
        "flat even colours, no heavy shading. ")
BG = ("The background is a flat solid MAGENTA #FF00FF and nothing else: no floor, no wall, no table, no shadow "
      "on the magenta, no frame, no text, no labels, no numbers, no people, no hands. "
      "Every object floats separately with clear magenta space all around it, nothing touching or overlapping.")

SHEETS = {
 # ten sheet: (aspect, so cot, danh sach (ten object, mo ta))
 "kit": ("IMAGE_ASPECT_RATIO_SQUARE", 3, [
   ("pot-blanch", "a tall wide aluminium stock pot with two side handles, full of water, standing on a low black gas ring"),
   ("sink", "a small square stainless steel sink with a tall curved chrome tap, on a plain metal cabinet"),
   ("stove", "a black four-burner gas stove top with round cast-iron grates and four control knobs at the front"),
   ("trash", "a round brushed metal kitchen bin with a mesh rim, empty"),
   ("bowl-stack", "a neat stack of eight plain white ceramic noodle bowls"),
   ("noodle-tray", "a rectangular stainless steel tray holding a coil of fresh white rice noodles"),
 ]),
 "furni": ("IMAGE_ASPECT_RATIO_PORTRAIT", 1, [
   ("counter-back", "a long straight stainless steel back counter, seen straight on, with three plain metal cabinet doors under it and an empty flat top"),
   ("counter-front", "a long straight pale cream stone work counter, seen straight on and slightly from above, completely empty, with a plain wooden front panel"),
 ]),
 "furni-wood": ("IMAGE_ASPECT_RATIO_PORTRAIT", 1, [
   ("counter-back-wood", "a long straight dark teak wood back counter, seen straight on, with three carved wooden cabinet doors under it and an empty flat top"),
   ("counter-front-wood", "a long straight dark polished teak work counter, seen straight on and slightly from above, completely empty, with a plain wooden front panel"),
 ]),
}

def post(p, b, t=600):
    r = urllib.request.Request(API + p, data=json.dumps(b).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=t) as x: return json.loads(x.read().decode())
def retry(fn, n=3):
    last = None
    for _ in range(n):
        try: return fn()
        except Exception as e: last = e; time.sleep(5)
    raise last

def prompt_for(cols, items):
    rows = (len(items) + cols - 1) // cols
    lines = "; ".join(f"({i+1}) {d}" for i, (_, d) in enumerate(items))
    grid = (f"A reference sheet with {len(items)} separate kitchen objects laid out in {cols} column"
            f"{'s' if cols > 1 else ''} and {rows} row{'s' if rows > 1 else ''}, in reading order, "
            "each one whole and fully visible, all drawn at a believable relative size. ")
    return grid + "The objects are: " + lines + ". " + VIEW + BG

def cut_magenta(im):
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r > 105) & (b > 105) & (g < 115) & (abs(r - b) < 95)
    m = Image.fromarray(np.where(mag, 0, 255).astype(np.uint8), "L")
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = m.filter(ImageFilter.GaussianBlur(1.0)).point(lambda v: 0 if v < 128 else 255)
    out = im.convert("RGBA"); out.putalpha(m)
    arr = np.asarray(out).astype(np.int16)
    edge = (np.asarray(m) > 0) & (np.asarray(m.filter(ImageFilter.MinFilter(5))) == 0)
    arr[..., 0] = np.where(edge, np.clip(arr[..., 0] - 45, 0, 255), arr[..., 0])
    arr[..., 2] = np.where(edge, np.clip(arr[..., 2] - 45, 0, 255), arr[..., 2])
    return Image.fromarray(arr.astype(np.uint8), "RGBA")

def split(rgba, cols, names):
    from scipy import ndimage
    al = np.asarray(rgba)[..., 3] > 60
    al = ndimage.binary_closing(al, np.ones((9, 9)))
    lab, n = ndimage.label(al)
    sizes = ndimage.sum(al, lab, range(1, n + 1))
    keep = [i + 1 for i in np.argsort(sizes)[::-1][:len(names)] if sizes[i] > al.size * 0.004]
    boxes = []
    for i in keep:
        ys, xs = np.where(lab == i)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    if not boxes: return []
    rowh = rgba.height / max(1, (len(names) + cols - 1) // cols)
    boxes.sort(key=lambda b: (int((b[1] + b[3]) / 2 // rowh), b[0]))
    out = []
    for (nm, _), bb in zip(names, boxes):
        ob = rgba.crop(bb)
        if ob.width > 760: ob = ob.resize((760, max(1, round(ob.height * 760 / ob.width))), Image.LANCZOS)
        p = os.path.join(PUB, nm + ".webp"); ob.save(p, "WEBP", quality=90, method=6)
        out.append((nm, ob.size, os.path.getsize(p)))
    return out

def one(sheet):
    aspect, cols, items = SHEETS[sheet]
    r = retry(lambda: post("/api/flow/generate-image", {"prompt": prompt_for(cols, items), "project_id": PID, "aspect_ratio": aspect}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    png = os.path.join(RAW, sheet + ".png"); urllib.request.urlretrieve(url, png)
    rgba = cut_magenta(Image.open(png))
    rgba.save(os.path.join(RAW, sheet + "-cut.png"))
    return split(rgba, cols, items)

if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if a in SHEETS] or list(SHEETS)
    log = {}
    for s in ids:
        try: log[s] = one(s)
        except Exception as e: log[s] = "ERR " + str(e)[:200]
        json.dump(log, open(ST, "w"), ensure_ascii=False, default=str)
    log["done"] = True
    json.dump(log, open(ST, "w"), ensure_ascii=False, default=str)
    print(json.dumps(log, default=str))
