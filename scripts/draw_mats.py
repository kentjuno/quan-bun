
"""Ve 2 tam lot tron mo len mat thot trong scene.webp (PLAN-JUICE J2).

Lam bang script chu khong nho Flow: vi tri phai khop ZONES.slots tung pixel,
va Flow hay 've giup' them do khong ai xin.

  python scripts/draw_mats.py            # tu scene-j1.webp -> public/art/scene.webp
"""
import io, os, sys
from PIL import Image, ImageDraw, ImageFilter

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Nguon: ban da nuong do vat (bake_scene.py) neu co, khong thi scene-j1
SRC = os.path.join(R, "art", "raw", "scene", "scene-baked.webp")
if not os.path.exists(SRC): SRC = os.path.join(R, "art", "raw", "scene", "scene-j1.webp")
DST = os.path.join(R, "public", "art", "scene.webp")

# ZONES.slots = x 37, y 69, w 56, h 26 (% khung tranh). Hai cho to nam o 1/4 va 3/4 be ngang o.
SLOTS = (37.0, 69.0, 56.0, 26.0)
CX = [SLOTS[0] + SLOTS[2] * 0.25, SLOTS[0] + SLOTS[2] * 0.75]
CY = SLOTS[1] + SLOTS[3] * 0.76     # ngang DAY to, khong phai giua to
DIA = 27.0          # % be ngang khung tranh — rong hon day to mot chut
SQUASH = 0.30       # det theo phoi canh (nhin cheo tu tren xuong)

def draw(src=SRC, dst=DST):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    rw = DIA / 100 * W / 2
    rh = rw * SQUASH
    for cxp in CX:
        cx, cy = cxp / 100 * W, CY / 100 * H
        # bong mo duoi tam lot
        d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh], fill=(120, 96, 70, 34))
        # vien muc mong
        d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh], outline=(96, 74, 52, 96), width=max(2, W // 500))
    lay = lay.filter(ImageFilter.GaussianBlur(1.6))
    out = Image.alpha_composite(im.convert("RGBA"), lay).convert("RGB")
    out.save(dst, "WEBP", quality=88, method=6)
    return dst

if __name__ == "__main__":
    a = sys.argv[1:]
    print(draw(a[0] if a else SRC, a[1] if len(a) > 1 else DST))
