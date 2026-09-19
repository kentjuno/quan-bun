// Ảnh art C dùng trong màn Quầy POV (docs/ART-PIPELINE.md §7).
// File nằm ở public/art/*.webp — đã cắt nền magenta, viền trắng sticker.
// Mỗi món có ĐÚNG MỘT cái tô, hai trạng thái: `-dry` (chưa có nước) và `-wet` (xong).
// Không có ảnh thì trả null → pov.js tự quay về icon cũ, không bao giờ vỡ giao diện.

const BASE = 'art/';
/** Món nào đã có ảnh tô (cập nhật khi gen thêm). */
export const DISH_ART = new Set([
  'pho-dac-biet', 'pho-tai-nam', 'pho-tai-dap', 'pho-suon-tai',
  'bun-rieu-cua', 'banh-da-cua', 'bun-bo-hue', 'bun-ca-hai-phong',
  'cha-ca-la-vong', 'bun-dau-mam-tom', 'banh-hoi-thit-heo',
  'bun-nem-cua-thit-nuong-tom-nuong', 'bun-ga-nuong', 'bun-cha-ha-noi',
  'cha-gio-viet-nam', 'goi-cuon-tom-thit', 'chao-long', 'chao-suon',
]);
/** Món nào có thêm ảnh giữa `-top` (đủ topping, chưa chan nước). */
export const DISH_TOP = new Set([
  'pho-dac-biet', 'pho-tai-nam', 'pho-tai-dap', 'pho-suon-tai',
  'bun-rieu-cua', 'banh-da-cua', 'bun-bo-hue', 'bun-ca-hai-phong',
  'chao-long', 'chao-suon',
]);
/** Món nào có ảnh vỏ trống `-s0` (mới lấy tô/dĩa ra, chưa bỏ gì). */
export const DISH_S0 = new Set([
  'pho-dac-biet', 'pho-tai-nam', 'pho-tai-dap', 'pho-suon-tai',
  'bun-rieu-cua', 'banh-da-cua', 'bun-bo-hue', 'bun-ca-hai-phong',
  'chao-long', 'chao-suon', 'bun-ga-nuong',
  'bun-nem-cua-thit-nuong-tom-nuong', 'goi-cuon-tom-thit',
]);
const RE_BROTH = /^@pour|^broth:|-broth-ready$|^porridge-ready$/;
const RE_VESSEL = /^bowl|^dry-bowl$|^tray|^dia-|^chen-|^mẹt/;
const RE_BASE = /^base-ready$|^noodle|^bun$|^banh-hoi-ready$|-bun-ready$|^banh-trang-ready$|^banh-da/;
/**
 * Bậc của tô theo NHỮNG GÌ ĐÃ BỎ VÀO — không đếm bước, vì mỗi level đơn giản hoá một kiểu.
 * KHÔNG bao giờ đè icon rời lên ảnh tô nữa (Kent 16/09).
 *   s0   = mới lấy vỏ ra, chưa bỏ gì
 *   dry  = đã có đế (bánh phở / bún / bánh tráng)
 *   top  = đã xếp topping, chưa chan nước
 *   wet  = đã chan nước hoặc xong tô
 */
export function dishStage(placed = [], full = false) {
  if (full) return 'wet';
  if (placed.some((t) => RE_BROTH.test(t))) return 'wet';
  const rest = placed.filter((t) => !RE_VESSEL.test(t));
  if (rest.some((t) => !RE_BASE.test(t))) return 'top';
  return rest.length ? 'dry' : 's0';
}
/** Ảnh tô của một món ở một bậc; thiếu ảnh bậc nào thì lùi về bậc có sẵn. */
export function dishArtAt(dish, stage = 'dry') {
  if (!DISH_ART.has(dish)) return null;
  if (stage === 's0' && !DISH_S0.has(dish)) stage = 'dry';    // mẹt/dĩa: `-dry` đã là cái mẹt trống
  if (stage === 'top' && !DISH_TOP.has(dish)) stage = 'wet';  // món khô: bậc giữa chính là ảnh xong
  return `${BASE}${dish}-${stage}.webp`;
}
/** Ảnh tô của một món. `wet` = đã chan nước / đã xong. */
export function dishArt(dish, wet = false) {
  return DISH_ART.has(dish) ? `${BASE}${dish}-${wet ? 'wet' : 'dry'}.webp` : null;
}
/** Ảnh khách: khách quen theo id, khách lạ rải đều theo tên. */
const STRANGERS = ['cus-x1', 'cus-x2', 'cus-x3', 'cus-x4', 'cus-x5', 'cus-x6', 'cus-x7', 'cus-x8'];
export function faceArt(regular, seed = 0) {
  if (regular) return `${BASE}cus-${regular}.webp`;
  return `${BASE}${STRANGERS[Math.abs(seed) % STRANGERS.length]}.webp`;
}
export const fx = (name) => `${BASE}fx-${name}.webp`;
export const ui = (name) => `${BASE}ui-${name}.webp`;
export const hand = (name) => `${BASE}hand-${name}.webp`;

/**
 * Sprite của trạm — đồ KHÔNG còn vẽ dính trong nền nữa, mỗi cái là một object riêng
 * nằm đúng ô của nó (Kent 16/09: "chồng tô nên là 1 object riêng").
 * Chỉ map những token THỪC SỰ là chồng tô / khay sợi. Mẹt, dĩa, bánh tráng… vẫn dùng icon
 * vì vẽ chồng tô cho cái mẹt thì sai hơn là không vẽ.
 */
export const STATION_ART = {
  'pho-bowl': `${BASE}st-bowl-stack.webp`,
  'soup-bowl': `${BASE}st-bowl-stack.webp`,
  'dry-bowl': `${BASE}st-bowl-stack.webp`,
  'extra-bowl': `${BASE}st-bowl-stack.webp`,
  'pho-noodle': `${BASE}st-noodle-tray.webp`,
  'bun': `${BASE}st-noodle-tray.webp`,
  'bun-to': `${BASE}st-noodle-tray.webp`,
  'banh-da': `${BASE}st-noodle-tray.webp`,
};
export const stationArt = (tok) => STATION_ART[tok] || null;

/** J7 — nồi nước đặt trên họng bếp: `pot-<token>.webp`. Nước phở sẵn (`broth:…`) dùng nồi nước phở;
 *  hai loại cháo chung một nồi. Thiếu ảnh thì pov.js quay về chip icon cũ. */
export const potArt = (tok) => {
  const k = /^broth:/.test(tok) ? 'nuoc-pho' : /^chao-/.test(tok) ? 'chao' : tok;
  return `${BASE}pot-${k}.webp`;
};

/** Rổ trụng: rỗng / đang có sợi. Thiếu ảnh thì pov.js quay về icon cũ. */
export const basketArt = (full = false) => `${BASE}st-basket${full ? '-noodle' : ''}.webp`;

/** Sprite trạm theo tên file `st-<name>.webp` (chảo chiên, lò vi sóng, nồi nước, thớt…). */
export const st = (name) => `${BASE}st-${name}.webp`;

/**
 * Khay topping: MỘT ảnh cho mỗi món, đồ được vẽ sẵn NẰM TRONG khay.
 * Tất cả nướng từ cùng một cái khay gốc nên hình dạng, góc, nét giống hệt nhau
 * — xếp bao nhiêu cái cạnh nhau cũng đều. Thiếu ảnh thì pov.js quay về icon cũ.
 */
export const panArt = (tok) => `${BASE}pan/${tok}.webp`;

/**
 * Tô đổi theo TỪNG món bỏ vào (Kent 17/09).
 * `DISH_STEPS[dish]` = những bước có ảnh riêng, đánh số theo công thức gọn.
 *
 * CHỈ dùng cho level chạy CÔNG THỨC ĐẦY ĐỦ. Level huấn luyện được đơn giản hoá
 * (bớt món) nên số thứ tự bước không khớp — vẽ theo đây sẽ hiện cả món mà level đó
 * cố tình chưa dạy, tức là dạy sai. Những level đó quay về thang 4 bậc.
 */
export const DISH_STEPS = {
  'banh-da-cua': [2, 3, 4, 5, 6, 7, 8, 9, 10],
  'banh-hoi-thit-heo': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'bun-bo-hue': [2, 3, 4, 5, 6, 7, 8, 9, 10],
  'bun-ca-hai-phong': [2, 3, 4, 5, 6, 7, 8],
  'bun-cha-ha-noi': [2, 3, 4, 5, 6, 7],
  'bun-dau-mam-tom': [2, 3, 4, 5, 6],
  'bun-ga-nuong': [2, 3],
  'bun-nem-cua-thit-nuong-tom-nuong': [2, 3],
  'bun-rieu-cua': [2, 3, 4, 5, 6, 7],
  'cha-gio-viet-nam': [2, 3],
  'chao-long': [2],
  'chao-suon': [2],
  'goi-cuon-tom-thit': [2, 3, 4, 5],
  'pho-dac-biet': [2, 3, 4, 5, 6, 7, 8, 9],
  'pho-suon-tai': [2, 3, 4, 5, 6],
  'pho-tai-dap': [2, 3, 4, 5, 6, 7],
  'pho-tai-nam': [2, 3, 4, 5, 6, 7],
};
export function dishStepArt(dish, placed) {
  // Công thức thật tách "lấy tô" và "bỏ sợi" thành HAI bước, còn ảnh đánh số theo
  // công thức gọn (`base-ready` = tô + sợi). Nên bỏ vào n thứ thì ảnh là k = n - 1.
  const k = placed - 1;
  const ks = DISH_STEPS[dish];
  return ks && ks.includes(k) ? `${BASE}step/${dish}-k${k}.webp` : null;
}

/** Thùng rác — trước là emoji 🗑️ nên mỗi máy vẽ một kiểu. */
export const trashArt = () => `${BASE}st-trash.webp`;

