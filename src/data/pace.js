// Nhịp làm món Ở QUẦY POV: trung bình bao nhiêu GIÂY cho một tô khi làm liên tục.
// Số đo bằng bot (3 phiếu tới cùng lúc, lấy tổng thời gian / 3), không phải ước lượng tay.
// Dùng để giãn/nén lịch khách của level cho khớp với tốc độ thật của quầy —
// lịch gốc trong data/worlds.js được canh cho BẾP 3D (có đi lại) nên ở quầy sẽ thưa gấp 2–3 lần.
// `tests/counter.test.js` đo lại và báo lỗi nếu lệch quá 40% → sửa bảng này.
export const POV_SECONDS = {
  'goi-cuon-tom-thit': 4.8,
  'bun-dau-mam-tom': 4.8,
  'chao-long': 11.4,
  'chao-suon': 11.4,
  'cha-gio-viet-nam': 11.8,
  'pho-tai-nam': 12.0,
  'bun-nem-cua-thit-nuong-tom-nuong': 13.2,
  'bun-ga-nuong': 13.2,
  'bun-cha-ha-noi': 13.2,
  'pho-tai-dap': 15.2,
  'pho-dac-biet': 15.9,
  'bun-bo-hue': 16.2,
  'pho-suon-tai': 18.3,
  'bun-rieu-cua': 19.0,
  'cha-ca-la-vong': 19.5,
  'banh-da-cua': 21.8,
  'banh-hoi-thit-heo': 22.6,
  'bun-ca-hai-phong': 25.0,
};
export const POV_DEFAULT = 15;
/** Giây/tô trung bình của các món trong level. */
export function paceOf(dishes) {
  if (!dishes?.length) return POV_DEFAULT;
  return dishes.reduce((n, d) => n + (POV_SECONDS[d] ?? POV_DEFAULT), 0) / dishes.length;
}
