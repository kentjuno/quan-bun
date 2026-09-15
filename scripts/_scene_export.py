
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"
src = os.path.join(R, "art", "raw", "scene", "scene-c.png")
dst = os.path.join(R, "public", "art", "scene.webp")
im = Image.open(src).convert("RGB")
im = im.resize((768, round(im.height * 768 / im.width)), Image.LANCZOS)
im.save(dst, "WEBP", quality=80, method=6)
print(im.size, os.path.getsize(dst) // 1024, "KB")
