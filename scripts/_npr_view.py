
import os, io, base64
from PIL import Image
A = r"F:\AntiGravity\Games\quan-bun\art\npr"
im = Image.open(os.path.join(A, "room.png")).convert("RGBA")
bg = Image.new("RGBA", im.size, (243, 233, 214, 255)); bg.alpha_composite(im)
im = bg.convert("RGB"); im.thumbnail((620, 3000), Image.LANCZOS)
b = io.BytesIO(); im.save(b, "JPEG", quality=95)
print(base64.b64encode(b.getvalue()).decode())
