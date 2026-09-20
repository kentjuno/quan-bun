// Nhịp làm món Ở QUẦY POV: trung bình bao nhiêu GIÂY cho một tô khi làm liên tục.
// Số đo bằng bot (3 phiếu tới cùng lúc, lấy tổng thời gian / 3), không phải ước lượng tay.
// Dùng để giãn/nén lịch khách của level cho khớp với tốc độ thật của quầy —
// lịch gốc trong data/worlds.js được canh cho BẾP 3D (có đi lại) nên ở quầy sẽ thưa gấp 2–3 lần.
// Đo với NGUỒN GAME (dishes/*.json — công thức chung, P6). `tests/counter.test.js` đo lại và báo lỗi nếu lệch quá 40% → sửa bảng này.
export const POV_SECONDS = {
  'goi-cuon-tom-thit': 4.8,
  'chao-long': 11.8,
  'chao-suon': 11.8,
  'pho-tai-nam': 12,
  'cha-gio-viet-nam': 12.1,
  'pho-sot-vang': 13.1,
  'pho-xao-lan': 13.1,
  'bun-cha-ha-noi': 13.2,
  'banh-hoi-thit-heo': 13.5,
  'pho-suon-tai': 13.8,
  'bun-ga-nuong': 14.2,
  'pho-tai-dap': 15.2,
  'bun-bo-hue': 15.5,
  'pho-dac-biet': 15.9,
  'bun-dau-mam-tom': 16,
  'bun-rieu-cua': 18.7,
  'cha-ca-la-vong': 19.8,
  'pho-ga': 20.1,
  'banh-da-cua': 21.1,
  'bun-ca-hai-phong': 25,
  'bun-nem-cua-thit-nuong-tom-nuong': 14.9,
};
export const POV_DEFAULT = 15;
/** Giây/tô trung bình của các món trong level. */
export function paceOf(dishes) {
  if (!dishes?.length) return POV_DEFAULT;
  return dishes.reduce((n, d) => n + (POV_SECONDS[d] ?? POV_DEFAULT), 0) / dishes.length;
}

/** NHỊP THẬT (Kent duyệt 19/09). Đo trước đó bằng bot 129 level: kiên nhẫn 140–210 s trong khi bot làm
 *  1 tô 6–22 s (≈ 17×), bot xong ở 40 % giờ ca, 0/129 level có khách bỏ đi → không có gì ép tay.
 *  Từ đây kiên nhẫn & giờ ca SUY TỪ giây/tô của bot (POV_SECONDS), không đặt tay từng level.
 *  Đây là chỗ DUY NHẤT để chỉnh độ khó chung; số gốc của level giữ trong `L.base`. */
export const PACE = {
  patMax: 6.0, patMin: 4.0,    // kiên nhẫn = k × giây/tô bot; k giảm từ level đầu → cuối world (người ≈ 2× bot → 3 tô → 2 tô)
  patFloor: 30, patFloorLearn: 45,   // level rút gọn (đang học) không dưới 45 s
  tail: 3.0,                   // giờ ca = khách cuối tới + tail × giây/tô
  secFloor: 60,
  rush: { at: 0.6, len: 30, mult: 1.5 },        // giờ cao điểm: 30 s từ mốc 60 % ca, khách còn lại tới dày gấp đôi, tiền ×1.5
  combo: [1, 1, 1.25, 1.5, 1.75, 2],            // hệ số tiền theo chuỗi tô sạch: 0,1,2,3,4,5+
  targets: [0.5, 0.85, 1.2],                    // mốc 1/2/3 sao = % tổng giá gốc (trước 0.4/0.6/0.8). Có combo ×2 nên 3 sao = sạch VÀ gần tốc độ bot
};
export const comboMult = (streak) => PACE.combo[Math.min(Math.max(0, streak | 0), PACE.combo.length - 1)];

/** Ghi đè patience / seconds / rush của một level theo PACE. Gọi trong buildWorlds (data → data, không vòng lặp import).
 *  Giờ ca tính GIẢI TÍCH: povArrivals nén lịch về đúng giây/tô bot, khách đầu ở giây 4 →
 *  khách cuối ≈ 4 + (n−1)·S, cộng đuôi tail·S. Số gốc của level giữ ở `L.base`. */
export function applyPace(L, i = 0, n = 1) {
  if (!L || L.paced || !L.dishes?.length) return L;
  const S = paceOf(L.dishes);
  const cnt = (L.count || 5) + (L.pair || 0) + (L.challenge?.kind === 'boss' ? (L.challenge.group || 4) : 0);   // khách THẬT, kể cả cặp & đoàn
  const f = n > 1 ? i / (n - 1) : 0;
  const k = PACE.patMax + (PACE.patMin - PACE.patMax) * f;
  const r5 = (x) => Math.max(5, Math.round(x / 5) * 5);
  L.base = { patience: L.patience, seconds: L.seconds };
  L.patience = r5(Math.max(L.simplify ? PACE.patFloorLearn : PACE.patFloor, k * S));
  L.seconds = r5(Math.max(PACE.secFloor, 4 + (cnt + PACE.tail - 1) * S));
  if (L.challenge?.kind !== 'rush' && cnt >= 4) L.rush = { ...PACE.rush };   // level "rush" sẵn dồn cả 3 phiếu rồi
  L.paced = true;
  return L;
}
