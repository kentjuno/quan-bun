// BẾP RIÊNG CHO TỪNG QUÁN (Kent 21/09: "mỗi tỉnh thành đi qua vẫn xài chung 1 khung cửa hàng").
// Ảnh: public/art/scene/<world>.webp — gen bằng `scripts/shop_scenes.py` trên PC (Flow edit-image từ art/scene.webp).
// LUẬT: mọi trạm giữ NGUYÊN chỗ nên ZONES dùng chung; quán nào vẽ lệch thì ghi đè vài ô ở `zones` bên dưới.
// Thiếu ảnh → tự rơi về art/scene.webp (pov.js onerror), game vẫn chạy y cũ.
import { SCENE, ZONES } from './counter-layout.js';

/** world id → { src?, zones?, baked? }. Không có mục = dùng bếp gốc. */
export const SHOP_SCENES = {
  pho: {}, 'mon-kho': {}, 'cha-ca': {}, 'hai-phong': {}, 'bun-rieu': {}, 'bun-bo': {},
  chao: {}, 'khai-vi': {}, 'mi-quang': {}, 'bun-cha-ca': {}, 'hu-tieu': {}, 'bun-thang': {},
};

/** Tranh + toạ độ trạm cho một quán. `fallback` = ảnh gốc để pov.js rơi về khi thiếu file. */
export function sceneFor(worldId) {
  const s = worldId && SHOP_SCENES[worldId];
  if (!s) return { ...SCENE, zones: ZONES, fallback: SCENE.src };
  return { ...SCENE, ...s, src: s.src || `art/scene/${worldId}.webp`, zones: s.zones ? { ...ZONES, ...s.zones } : ZONES, fallback: SCENE.src };
}
