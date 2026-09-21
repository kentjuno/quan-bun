
# SCENE GRAPH buoc 3: tranh NEN (chi tuong + san) cho tung quan -> public/art/scene/bg/<id>.webp
# Chay: C:\Python314\python.exe scripts/scene_bg.py <id> [...]
import os, sys, json, time, urllib.request
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
API = "http://127.0.0.1:8100"; PID = "c20ed4c0-2339-430b-9c60-e16ed525a0e9"
ROOM = os.path.join(R, "public", "art", "scene", "room")
RAW = os.path.join(R, "art", "raw", "bg"); os.makedirs(RAW, exist_ok=True)
PUB = os.path.join(R, "public", "art", "scene", "bg"); os.makedirs(PUB, exist_ok=True)
ST = os.path.join(R, "_bg_status.json")
PROMPT = ("Strip this kitchen down to an EMPTY ROOM: remove the counters and the cabinets under them, "
          "remove the stove top, remove the sink and its tap, remove the big stock pot and its stand. "
          "Paint the wall and the floor continuing behind where they stood, in the same watercolour-and-ink style. "
          "KEEP the room itself exactly as it is: same camera, same wall material and colour, same tiles, same window, "
          "same hanging decorations high on the wall, same ceiling, same light, same paper texture. "
          "The lower half becomes plain floor. No furniture, no equipment, no text, no people.")
def post(p, b, t=600):
    r = urllib.request.Request(API + p, data=json.dumps(b).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=t) as x: return json.loads(x.read().decode())
def retry(fn, n=3):
    last = None
    for _ in range(n):
        try: return fn()
        except Exception as e: last = e; time.sleep(5)
    raise last
def one(sid):
    src = os.path.join(RAW, sid + "-src.png")
    Image.open(os.path.join(ROOM, sid + ".webp")).convert("RGB").save(src)
    up = retry(lambda: post("/api/flow/upload-image", {"file_path": src, "project_id": PID, "file_name": sid + "-room.png"}))
    mid = up.get("media_id") or up.get("mediaId")
    r = retry(lambda: post("/api/flow/edit-image", {"prompt": PROMPT, "source_media_id": mid, "project_id": PID, "aspect_ratio": "IMAGE_ASPECT_RATIO_PORTRAIT"}))
    url = r["media"][0]["image"]["generatedImage"]["fifeUrl"]
    png = os.path.join(RAW, sid + ".png"); urllib.request.urlretrieve(url, png)
    base = Image.open(os.path.join(R, "public", "art", "scene.webp"))
    im = Image.open(png).convert("RGB").resize(base.size, Image.LANCZOS)
    out = os.path.join(PUB, sid + ".webp"); im.save(out, "WEBP", quality=86, method=6)
    return os.path.getsize(out)
if __name__ == "__main__":
    log = {}
    for sid in sys.argv[1:]:
        try: log[sid] = one(sid)
        except Exception as e: log[sid] = "ERR " + str(e)[:160]
        json.dump(log, open(ST, "w"), ensure_ascii=False)
    log["done"] = True; json.dump(log, open(ST, "w"), ensure_ascii=False); print(json.dumps(log))
