// BẾP RIÊNG CHO TỪNG QUÁN (Kent 21/09: "mỗi tỉnh thành đi qua vẫn xài chung 1 khung cửa hàng").
// Ảnh: public/art/scene/<world>.webp — gen bằng `scripts/shop_scenes.py` trên PC (Flow edit-image từ art/scene.webp).
// LUẬT: mọi trạm giữ NGUYÊN chỗ nên ZONES dùng chung; quán nào vẽ lệch thì ghi đè vài ô ở `zones` bên dưới.
// HAI KIỂU TRANH (Kent 21/09: "làm theo layers thay vì nguyên tấm ảnh"):
//   · `art/scene/<id>.webp`      — tranh NGUYÊN TẤM: đồ tĩnh (thùng rác, chồng tô, khay sợi, lò vi sóng, chảo chiên) vẽ sẵn trong tranh.
//   · `art/scene/room/<id>.webp` — tranh PHÒNG TRỐNG: 5 thứ trên là sprite chung (`st-*.webp`) do pov.js vẽ đè → `baked: []`.
// Kiểu phòng trống là hướng đi chính: thêm quán chỉ cần một tấm phòng, đổi bố trí chỉ cần sửa ZONES, không phải nướng lại tranh.
// Thiếu ảnh → tự rơi về art/scene.webp (pov.js onerror), game vẫn chạy y cũ.
import { SCENE, ZONES } from './counter-layout.js';

/** world id → { src?, zones?, baked? }. Không có mục = dùng bếp gốc. */
export const SHOP_SCENES = {
  pho: {}, 'mon-kho': {}, 'cha-ca': {}, 'hai-phong': {}, 'bun-rieu': {},
  'bun-bo': { room: true },
  chao: {}, 'khai-vi': {}, 'mi-quang': {}, 'bun-cha-ca': {}, 'hu-tieu': {}, 'bun-thang': {},
};

/** Tranh + toạ độ trạm cho một quán. `fallback` = ảnh gốc để pov.js rơi về khi thiếu file. */
export function sceneFor(worldId) {
  const s = worldId && SHOP_SCENES[worldId];
  if (!s) return { ...SCENE, zones: ZONES, fallback: SCENE.src };
  const room = s.room === true;
  return { ...SCENE, ...s,
    src: s.src || (room ? `art/scene/room/${worldId}.webp` : `art/scene/${worldId}.webp`),
    baked: s.baked || (room ? [] : SCENE.baked),   // phòng trống → 5 thứ kia là sprite
    zones: s.zones ? { ...ZONES, ...s.zones } : ZONES,
    fallback: room ? `art/scene/${worldId}.webp` : SCENE.src };
}
