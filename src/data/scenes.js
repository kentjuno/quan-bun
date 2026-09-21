// BẾP RIÊNG CHO TỪNG QUÁN (Kent 21/09: "mỗi tỉnh thành đi qua vẫn xài chung 1 khung cửa hàng").
// Ảnh: public/art/scene/<world>.webp — gen bằng `scripts/shop_scenes.py` trên PC (Flow edit-image từ art/scene.webp).
// LUẬT: mọi trạm giữ NGUYÊN chỗ nên ZONES dùng chung; quán nào vẽ lệch thì ghi đè vài ô ở `zones` bên dưới.
// HAI KIỂU TRANH (Kent 21/09: "làm theo layers thay vì nguyên tấm ảnh"):
//   · `art/scene/<id>.webp`      — tranh NGUYÊN TẤM: đồ tĩnh (thùng rác, chồng tô, khay sợi, lò vi sóng, chảo chiên) vẽ sẵn trong tranh.
//   · `art/scene/room/<id>.webp` — tranh PHÒNG TRỐNG: 5 thứ trên là sprite chung (`st-*.webp`) do pov.js vẽ đè → `baked: []`.
//   · `art/scene/bg/<id>.webp`   — chỉ TƯỜNG + SÀN; mọi đồ đạc là object rời ráp theo `scene-graph.js` → `graph: true`.
// Kiểu SCENE GRAPH là đích đến (Kent 21/09): object chính là vùng bấm, dời object thì ô thả đi theo.
// Thiếu ảnh → tự rơi về art/scene.webp (pov.js onerror), game vẫn chạy y cũ.
import { SCENE, ZONES } from './counter-layout.js';
import { KITCHEN, zonesFrom, layersFrom } from './scene-graph.js';

/** world id → { src?, zones?, baked? }. Không có mục = dùng bếp gốc. */
export const SHOP_SCENES = {
  pho: { room: true, graph: true, tint: 'sepia(.15) saturate(1.05) brightness(.97)' },
  'mon-kho': { room: true, tint: 'brightness(1.02)' },
  'cha-ca': { room: true, tint: 'sepia(.26) saturate(1.05) brightness(.86)' },
  'hai-phong': { room: true, tint: 'hue-rotate(8deg) saturate(.95) brightness(.95)' },
  'bun-rieu': { room: true, tint: 'saturate(.9) brightness(.94)' },
  'bun-bo': { room: true, graph: true, tint: 'sepia(.22) saturate(1.12) brightness(.9) hue-rotate(-10deg)' },
  chao: { room: true, tint: 'saturate(1.05) brightness(1.01)' },
  'khai-vi': { room: true, tint: 'hue-rotate(4deg) brightness(1.01)' },
  'mi-quang': { room: true, tint: 'sepia(.18) brightness(.96)' },
  'bun-cha-ca': { room: true, tint: 'saturate(.98) brightness(1.02)' },
  'hu-tieu': { room: true, tint: 'sepia(.2) saturate(1.1) brightness(.9)' },
  'bun-thang': { room: true, tint: 'saturate(.92) brightness(.97)' },
};

/** Tranh + toạ độ trạm cho một quán. `fallback` = ảnh gốc để pov.js rơi về khi thiếu file. */
export function sceneFor(worldId) {
  const s = worldId && SHOP_SCENES[worldId];
  if (!s) return { ...SCENE, zones: ZONES, fallback: SCENE.src };
  const room = s.room === true;
  const graph = s.graph === true;
  const gz = graph ? zonesFrom(s.objs || KITCHEN) : null;
  return { ...SCENE, ...s,
    src: s.src || (graph ? `art/scene/bg/${worldId}.webp` : room ? `art/scene/room/${worldId}.webp` : `art/scene/${worldId}.webp`),
    baked: s.baked || (graph || room ? [] : SCENE.baked),   // phòng trống / scene graph → 5 thứ kia là sprite
    objs: graph ? layersFrom(s.objs || KITCHEN) : null,     // đồ đạc vẽ theo lớp bg → mid → fg
    zones: { ...(gz || ZONES), ...(s.zones || {}) },
    tint: s.tint || null,   // lọc màu cho sprite đồ đạc bắt sáng theo phòng (khỏi nhìn như dán ghép)
    fallback: graph ? `art/scene/room/${worldId}.webp` : room ? `art/scene/${worldId}.webp` : SCENE.src };
}
