
import os, sys
from PIL import Image
CUT = r"F:\AntiGravity\Games\quan-bun\art\cut"
DST = r"F:\AntiGravity\Games\quan-bun\public\icons"
names = sys.argv[1].split(",")
n = 0; miss = []
for k in names:
    p = os.path.join(CUT, k + ".png")
    if not os.path.exists(p): miss.append(k); continue
    im = Image.open(p).convert("RGBA")
    s = max(im.size)
    sq = Image.new("RGBA", (s, s), (0,0,0,0))
    sq.paste(im, ((s-im.width)//2, (s-im.height)//2))
    sq = sq.resize((256, 256), Image.LANCZOS)
    sq.save(os.path.join(DST, k + ".png"), "PNG", optimize=True)
    n += 1
print(n, "|", ",".join(miss))
