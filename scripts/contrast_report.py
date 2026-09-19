
"""Do tuong phan nen quay POV (docs/PLAN-JUICE.md J1).

  python scripts/contrast_report.py <anh-moi.webp> [anh-goc.webp]

In ra JSON: SSIM voi ban goc, phan vi do sang, do sang mat truoc tu.
Nguong dat: ssim>=0.80, p5_drop>=25%, range_gain>=30%, cabinet_p50<=170.
"""
import io, os, sys, json
import numpy as np
from PIL import Image

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(R, "art", "raw", "scene", "scene-base.webp")

def lum(im):
    a = np.asarray(im.convert("RGB")).astype(np.float64)
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

def ssim(a, b):
    """SSIM toan cuc tren anh thu nho — du de bat 'bo cuc da troi'."""
    a = a.astype(np.float64); b = b.astype(np.float64)
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    mu_a, mu_b = a.mean(), b.mean()
    va, vb = a.var(), b.var()
    cov = ((a - mu_a) * (b - mu_b)).mean()
    return ((2 * mu_a * mu_b + C1) * (2 * cov + C2)) / ((mu_a ** 2 + mu_b ** 2 + C1) * (va + vb + C2))

def ssim_tiles(a, b, n=8):
    """SSIM trung binh tren luoi n x n — nhay hon voi dich chuyen cuc bo."""
    h, w = a.shape; out = []
    for i in range(n):
        for j in range(n):
            ta = a[i * h // n:(i + 1) * h // n, j * w // n:(j + 1) * w // n]
            tb = b[i * h // n:(i + 1) * h // n, j * w // n:(j + 1) * w // n]
            out.append(ssim(ta, tb))
    return float(np.mean(out))

def edges(L):
    """Do lon gradient (Sobel) — khong phu thuoc sang/toi, chi phu thuoc HINH."""
    gx = np.zeros_like(L); gy = np.zeros_like(L)
    gx[:, 1:-1] = L[:, 2:] - L[:, :-2]
    gy[1:-1, :] = L[2:, :] - L[:-2, :]
    return np.hypot(gx, gy)

def struct_corr(a, b):
    """Tuong quan Pearson cua do lon gradient. 1.0 = bo cuc y het."""
    ea, eb = edges(a).ravel(), edges(b).ravel()
    ea = ea / (ea.std() or 1); eb = eb / (eb.std() or 1)
    return float(np.corrcoef(ea - ea.mean(), eb - eb.mean())[0, 1])

def report(new_path, base_path=BASE):
    new = Image.open(new_path); base = Image.open(base_path)
    Ln, Lb = lum(new), lum(base)
    small = lambda L, im: np.asarray(Image.fromarray(L.astype(np.uint8)).resize((96, 172), Image.LANCZOS)).astype(np.float64)
    sn, sb = small(Ln, new), small(Lb, base)
    H, W = Ln.shape
    cab = lambda L: L[int(H * .56):int(H * .79), int(W * .15):int(W * .88)]
    p = lambda L, q: float(np.percentile(L, q))
    p5n, p95n = p(Ln, 5), p(Ln, 95)
    p5b, p95b = p(Lb, 5), p(Lb, 95)
    return {
        "file": os.path.basename(new_path),
        "size": list(new.size),
        "ssim": round(ssim_tiles(sn, sb), 4),
        "struct": round(struct_corr(sn, sb), 4),
        "p5": round(p5n, 1), "p5_base": round(p5b, 1),
        "p5_drop_pct": round((p5b - p5n) / p5b * 100, 1),
        "range": round(p95n - p5n, 1), "range_base": round(p95b - p5b, 1),
        "range_gain_pct": round(((p95n - p5n) - (p95b - p5b)) / (p95b - p5b) * 100, 1),
        "cabinet_p50": round(float(np.percentile(cab(Ln), 50)), 1),
        "cabinet_p50_base": round(float(np.percentile(cab(Lb), 50)), 1),
    }

def verdict(r):
    return {"struct>=0.75": r["struct"] >= 0.75,
            "p5_drop>=25%": r["p5_drop_pct"] >= 25,
            "range_gain>=30%": r["range_gain_pct"] >= 30,
            "cabinet<=170": r["cabinet_p50"] <= 170}

if __name__ == "__main__":
    args = sys.argv[1:]
    base = args[1] if len(args) > 1 else BASE
    r = report(args[0], base); r["dat"] = verdict(r)
    print(json.dumps(r, ensure_ascii=False))
