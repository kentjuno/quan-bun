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
/**
 * Bậc của tô theo những gì đã bỏ vào — KHÔNG bao giờ đè icon lên ảnh tô nữa (Kent 16/09).
 *   dry  = mới có đế (bánh phở / bún / mẹt trống)
 *   top  = đã xếp topping, chưa chan nước
 *   wet  = đã chan nước hoặc xong tô
 */
export function dishStage(placed = [], full = false) {
  if (full) return 'wet';
  if (placed.some((t) => /^@pour|^broth:|-broth-ready$|^porridge-ready$/.test(t))) return 'wet';
  return placed.length > 1 ? 'top' : 'dry';
}
/** Ảnh tô của một món ở một bậc. Món chưa có `-top` thì lùi về `-dry`. */
export function dishArtAt(dish, stage = 'dry') {
  if (!DISH_ART.has(dish)) return null;
  if (stage === 'top' && !DISH_TOP.has(dish)) stage = 'wet';   // món khô (mẹt/dĩa): bậc giữa chính là ảnh xong
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
