
# Bep rieng cho tung quan: giu NGUYEN vi tri moi trang (ZONES khong doi), chi thay CAN PHONG.
# Chay: C:\Python314\python.exe scripts/shop_scenes.py <id> [<id> ...]
import os, sys, json, time, urllib.request
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
API = "http://127.0.0.1:8100"; PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
SRC = os.path.join(R, "public", "art", "scene.webp")
SRCPNG = os.path.join(R, "art", "raw", "shops", "_src.png")
RAW = os.path.join(R, "art", "raw", "shops"); os.makedirs(RAW, exist_ok=True)
PUB = os.path.join(R, "public", "art", "scene"); os.makedirs(PUB, exist_ok=True)
ST = os.path.join(R, "_shops_status.json")

KEEP = ("Keep the EXACT same camera angle and composition. Every piece of equipment must stay at EXACTLY the same position, "
        "size and shape as in the source picture: the big aluminium stock pot on the upper left, the small sink with the tall tap "
        "in the middle, the gas stove top on the right, the microwave oven high on the right wall, the small fryer basket on the stove, "
        "the stack of white bowls on the lower left, the tray of noodles next to it, the metal bin on the right, and the two empty "
        "counter tops across the bottom half. Do not move, resize, add or remove any equipment. "
        "Same ink line weight, same watercolour-and-ink style, same paper texture, light from the upper left. "
        "No text, no words, no letters, no signage, no people, no hands.")

SHOPS = {
 "pho": "Repaint the room as an old Hanoi pho shop from the 1990s: lime-washed mustard-yellow walls with damp patches, dark worn teak wainscoting, a small street window on the left with a plane tree outside, an old ceiling fan, blue enamel ware and a wooden shelf with glass jars.",
 "mon-kho": "Repaint the room as a bright modern Hanoi bun dau shop: clean white subway tiles, woven round bamboo trays hung on the wall, a few green potted plants, pale wood shelves, fresh daylight from a big window on the left.",
 "cha-ca": "Repaint the room as a hundred-year-old Hanoi cha ca house: dark polished teak panelling, brass fittings, faded ochre plaster above, old framed black-and-white photographs on the wall, warm dim tungsten light.",
 "hai-phong": "Repaint the room as a port-town Hai Phong eatery at dawn: sea-blue painted concrete walls with salt stains, a rolled fishing net and floats hung high, weathered galvanised metal, cool blue morning light through an open shutter.",
 "bun-rieu": "Repaint the room as a small Hue family kitchen: mossy grey-purple lime plaster, dark wooden lattice screen, a conical leaf hat and a bundle of dried herbs on the wall, terracotta jars, soft rainy light.",
 "bun-bo": "Repaint the room as a Hue bun bo shop with imperial touches: deep red lacquer trim, dark carved wood, strings of dried red chillies and lemongrass hanging, a brass tray on the wall, warm lamp light.",
 "chao": "Repaint the room as an open-air Saigon morning porridge stall: pastel mint painted wall flaking, corrugated tin roof above, a stack of red and blue plastic stools in the corner, tropical plants, bright golden dawn light.",
 "khai-vi": "Repaint the room as a breezy Saigon roll shop: turquoise glazed tiles, bunches of fresh herbs hanging, stacked bamboo steamer baskets, rattan blinds, bright airy daylight.",
 "mi-quang": "Repaint the room as a Hoi An old-town kitchen: ochre-yellow lime wall with dark green wooden shutters, red silk lanterns hanging, old terracotta roof tiles visible, warm afternoon light.",
 "bun-cha-ca": "Repaint the room as a seaside Nha Trang fish-cake shop: whitewashed rough wall, pale blue wooden shutters open to bright sea light, a bamboo rack of drying fish, a coil of rope, sandy warm palette.",
 "hu-tieu": "Repaint the room as a Cho Lon Chinese-Vietnamese noodle shop: red and gold painted wall, dark lacquered wood, a small red altar shelf with oranges, hanging round paper lamps, warm amber light.",
 "bun-thang": "Repaint the room as an elegant old Hanoi kitchen: soft grey-green painted wall, neat dark wood shelves with celadon ceramic jars, a lacquered wooden tray on the wall, quiet cool daylight.",
}

def post(path, body, timeout=600):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r: return json.loads(r.read().decode())

def retry(fn, n=3):
    last = None
    for _ in range(n):
        try: return fn()
        except Exception as e: last = e; time.sleep(5)
    raise last

def src_media():
    if not os.path.exists(SRCPNG):
        Image.open(SRC).convert("RGB").save(SRCPNG)
    up = retry(lambda: post("/api/flow/upload-image", {"file_path": SRCPNG, "project_id": PID, "file_name": "shop-src.png"}))
    return up.get("media_id") or up.get("mediaId")

def one(sid, mid):
    prompt = SHOPS[sid] + " " + KEEP
    r = retry(lambda: post("/api/flow/edit-image", {"prompt": prompt, "source_media_id": mid, "project_id": PID, "aspect_ratio": "IMAGE_ASPECT_RATIO_PORTRAIT"}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    png = os.path.join(RAW, sid + ".png")
    urllib.request.urlretrieve(url, png)
    base = Image.open(SRC).convert("RGB")
    im = Image.open(png).convert("RGB").resize(base.size, Image.LANCZOS)
    out = os.path.join(PUB, sid + ".webp"); im.save(out, "WEBP", quality=86, method=6)
    im.resize((256, 459)).save(os.path.join(RAW, sid + "-small.jpg"), quality=72)
    return os.path.getsize(out)

if __name__ == "__main__":
    ids = [a for a in sys.argv[1:] if a in SHOPS] or list(SHOPS)
    log = {}
    mid = src_media(); log["src_media"] = mid[:12] if mid else None
    json.dump(log, open(ST, "w"), ensure_ascii=False)
    for sid in ids:
        try: log[sid] = one(sid, mid)
        except Exception as e: log[sid] = "ERR " + str(e)[:200]
        json.dump(log, open(ST, "w"), ensure_ascii=False)
    log["done"] = True
    json.dump(log, open(ST, "w"), ensure_ascii=False)
    print(json.dumps(log))
