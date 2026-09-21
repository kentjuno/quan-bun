
import os
from PIL import Image
R = r"F:\AntiGravity\Games\quan-bun"; S = os.path.join(R,"art","raw","scene")
im = Image.open(os.path.join(S,"scene-base.webp")).convert("RGB").resize((220,394))
im.save(os.path.join(S,"_base_s.jpg"), quality=55, optimize=True)
print(os.path.getsize(os.path.join(S,"_base_s.jpg")), Image.open(os.path.join(S,"scene-base.webp")).size)
