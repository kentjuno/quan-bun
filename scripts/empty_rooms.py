
# Tranh PHONG TRONG cho tung quan: xoa 5 do tinh khoi tranh quan -> sprite chung ve de.
# Chay: C:\Python314\python.exe scripts/empty_rooms.py <id> [<id> ...]
import os, sys, json, time, urllib.request
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
API = "http://127.0.0.1:8100"; PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
RAW = os.path.join(R, "art", "raw", "shops")
PUB = os.path.join(R, "public", "art", "scene", "room"); os.makedirs(PUB, exist_ok=True)
ST = os.path.join(R, "_empty_status.json")
PROMPT = ("Remove five things from this kitchen picture and paint what would be behind them, in the same "
          "watercolour-and-ink style: (1) the metal bin on the right, (2) the stack of white bowls on the lower left, "
          "(3) the tray of noodles next to it, (4) the microwave oven high on the right wall, (5) the small metal fryer "
          "basket standing on the stove. Leave bare wall, bare shelf and bare counter where they were. "
          "Keep EVERYTHING else exactly as it is: same camera, same big stock pot, same sink and tap, same stove top, "
          "same counters, same walls, same colours, same light, same paper texture. Do not add anything. "
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
def one(sid):
    src = os.path.join(RAW, sid + ".png")
    up = retry(lambda: post("/api/flow/upload-image", {"file_path": src, "project_id": PID, "file_name": sid + "-src.png"}))
    mid = up.get("media_id") or up.get("mediaId")
    r = retry(lambda: post("/api/flow/edit-image", {"prompt": PROMPT, "source_media_id": mid, "project_id": PID, "aspect_ratio": "IMAGE_ASPECT_RATIO_PORTRAIT"}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    png = os.path.join(RAW, sid + "-room.png"); urllib.request.urlretrieve(url, png)
    base = Image.open(os.path.join(R, "public", "art", "scene.webp"))
    im = Image.open(png).convert("RGB").resize(base.size, Image.LANCZOS)
    out = os.path.join(PUB, sid + ".webp"); im.save(out, "WEBP", quality=86, method=6)
    return os.path.getsize(out)
if __name__ == "__main__":
    log = {}
    for sid in sys.argv[1:]:
        try: log[sid] = one(sid)
        except Exception as e: log[sid] = "ERR " + str(e)[:200]
        json.dump(log, open(ST, "w"), ensure_ascii=False)
    log["done"] = True
    json.dump(log, open(ST, "w"), ensure_ascii=False)
    print(json.dumps(log))
