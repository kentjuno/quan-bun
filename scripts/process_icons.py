# Ảnh Flow (nền phẳng một màu — magenta chroma key hoặc trắng, 1024²) → PNG trong suốt 256², cắt sát vật thể.
# Chạy: python3 scripts/process_icons.py <thư mục jpg> public/icons
# Màu nền lấy từ 4 góc ảnh nên đổi màu nền trong prompt vẫn chạy; vật thể trắng cần nền màu (magenta) mới tách được.
import sys, os
from PIL import Image
import numpy as np
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.lower().endswith(('.jpg', '.png')) or f.startswith('_') or f.startswith('test'): continue
    im = Image.open(os.path.join(src, f)).convert('RGB'); a = np.asarray(im).astype(np.float32) / 255
    H, W = a.shape[:2]; c = 24
    corners = np.concatenate([a[:c, :c].reshape(-1, 3), a[:c, -c:].reshape(-1, 3), a[-c:, :c].reshape(-1, 3), a[-c:, -c:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    # alpha = khoảng cách màu tới nền (chuẩn hoá theo ngưỡng), mép mềm
    dist = np.linalg.norm(a - bg, axis=2)
    lo, hi = 0.12, 0.45
    alpha = np.clip((dist - lo) / (hi - lo), 0, 1)
    # bóng đổ trên nền magenta = nền tối đi (a ≈ k·bg, k<1) → nối liền với mép ảnh thì coi là nền (không đụng màu tím bên trong vật thể)
    k = np.clip((a * bg).sum(axis=2) / (bg * bg).sum(), 0, 1.2); resid = np.linalg.norm(a - k[..., None] * bg, axis=2)
    bgish = (resid < 0.16) | (alpha <= 0)
    try:
        from scipy import ndimage
        lab, n = ndimage.label(bgish); border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])); border = border[border > 0]
        outside = np.isin(lab, border)
        alpha = np.where(outside, 0, alpha)
        # mép mềm cho phần vật thể giáp vùng bóng
        ring = ndimage.binary_dilation(outside, iterations=2) & ~outside; alpha = np.where(ring, np.minimum(alpha, 0.6), alpha)
    except ImportError: pass
    mask = alpha > 0.5
    ys, xs = np.where(mask)
    if len(xs) == 0: print('skip', f); continue
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); pad = int(0.06 * max(x1 - x0, y1 - y0)) + 8
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad); x1, y1 = min(W, x1 + pad), min(H, y1 + pad)
    # gỡ trộn với nền: c = (c_obs - (1-α)·bg) / α
    al = alpha[..., None]; col = np.where(al > 0.02, (a - (1 - al) * bg) / np.maximum(al, 0.02), a); col = np.clip(col, 0, 1)
    # khử viền màu nền (spill) ở mép: kéo pixel bán trong suốt về phía màu trung bình của vật thể
    inner = col[mask].mean(axis=0)
    edge = ((alpha > 0.02) & (alpha < 0.9))[..., None]
    col = np.where(edge, col * 0.6 + inner * 0.4, col)
    rgba = np.dstack([col, alpha]); crop = rgba[y0:y1, x0:x1]
    h, w = crop.shape[:2]; S = max(h, w); sq = np.zeros((S, S, 4), np.float32); oy, ox = (S - h) // 2, (S - w) // 2; sq[oy:oy + h, ox:ox + w] = crop
    out = Image.fromarray((sq * 255).astype(np.uint8), 'RGBA').resize((256, 256), Image.LANCZOS)
    name = os.path.splitext(f)[0] + '.png'; out.save(os.path.join(dst, name)); print('ok', name, f'{w}x{h}', 'bg', np.round(bg, 2))
