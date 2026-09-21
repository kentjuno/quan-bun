// SCENE GRAPH — bếp dựng bằng OBJECT rời, không phải một tấm tranh (Kent 21/09).
//
//   "nếu mình chia thành các layer objects thì mình chỉ cần generate các objects rồi ráp vô thôi,
//    để đâu cũng được mà không sợ bị sai vị trí"
//
// Luật cốt lõi: **object CHÍNH LÀ vùng bấm**. Mỗi món đồ khai một hộp (x, y, w, h — % của khung);
// ô thả (`zone`) suy ra từ hộp đó chứ không đo tay trên tranh. Kéo cái bếp xuống 5% thì ô thả
// đi theo, không phải chỉnh gì thêm — hết cảnh "vẽ lại tranh rồi dò lại toạ độ".
//
// Ba lớp, vẽ từ sau ra trước:
//   bg   — tường + sàn (ảnh riêng từng quán: art/scene/bg/<world>.webp)
//   mid  — đồ cố định của bếp: quầy sau, bếp lò, bồn rửa, nồi trụng, tủ
//   fg   — thứ nằm trước mặt người chơi: mặt quầy ráp
// Đồ "rời" (chồng tô, khay sợi, thùng rác, lò vi sóng, chảo chiên) vẫn do pov.js vẽ theo ô thả
// như cũ — chúng chỉ hiện khi level cần.
import { ZONES } from './counter-layout.js';

export const OB = 'art/ob/';

/**
 * Một mục: { id, art?, x, y, w, h, layer, zone?, hit? }
 *   x,y,w,h : % của khung hình
 *   zone    : tên ô thả mà object này mang (pov.js dùng y như ZONES cũ)
 *   hit     : hộp con TRONG object (%, so với chính nó) — ví dụ chỉ lòng nồi mới nhận thả,
 *             không phải cả cái nồi. Bỏ trống = cả object.
 */
export const KITCHEN = [
  // Object GEN RIÊNG (scripts/ob_sheet.py — cả bộ vẽ trong một bản để chung góc, chung hướng sáng),
  // KHÔNG còn cắt ra từ tranh bếp cũ. Vị trí do mình đặt, không phải đo theo tranh:
  //   x, y, w, h = % khung · h tính theo đúng tỉ lệ ảnh để không bị méo
  //   hit = ô thả nằm trong object (%, so với chính nó): chỉ lòng nồi / lòng bồn / mặt bếp mới nhận thả
  { id: 'counter-back', art: `${OB}counter-back.webp`, layer: 'mid', x: -2, y: 41, w: 104, h: 36.1 },
  { id: 'pot-blanch', art: `${OB}pot-blanch.webp`, layer: 'mid', x: 4, y: 25.5, w: 30, h: 18.1,
    zone: 'pot', hit: { x: 14, y: 6, w: 72, h: 55 } },
  { id: 'sink', art: `${OB}sink.webp`, layer: 'mid', x: 36, y: 25.5, w: 22, h: 18.6,
    zone: 'sink', hit: { x: 10, y: 30, w: 80, h: 45 } },
  { id: 'stove', art: `${OB}stove.webp`, layer: 'mid', x: 55, y: 26.5, w: 44, h: 16.9,
    zone: 'burner', hit: { x: 8, y: 15, w: 60, h: 60 } },
  // Mặt bàn ráp tô: nhìn từ TRÊN xuống (Kent: "ví dụ bàn prep đi"), không phải cái hộp nhìn nghiêng.
  { id: 'prep-top', art: `${OB}prep-top.webp`, layer: 'fg', x: -4, y: 58, w: 108, h: 42 },
];

/** Bản gỗ: cùng bộ object, đổi chất liệu hai mặt bàn — cho Huế, Chợ Lớn, Lã Vọng… */
export const KITCHEN_WOOD = KITCHEN.map((o) =>
  ['counter-back', 'prep-top'].includes(o.id) ? { ...o, art: `${OB}${o.id}-wood.webp` } : o);

const abs = (o) => {
  const h = o.hit;
  if (!h) return { x: o.x, y: o.y, w: o.w, h: o.h };
  return { x: o.x + (o.w * h.x) / 100, y: o.y + (o.h * h.y) / 100, w: (o.w * h.w) / 100, h: (o.h * h.h) / 100 };
};

/** Ô thả suy ra từ vị trí object; ô nào không thuộc object nào (HUD, phiếu, dải khay…) lấy từ ZONES. */
export function zonesFrom(graph = KITCHEN, base = ZONES) {
  const z = { ...base };
  for (const o of graph) if (o.zone) z[o.zone] = abs(o);
  return z;
}

/** Danh sách ảnh để vẽ, đúng thứ tự lớp. */
const ORDER = { bg: 0, mid: 1, fg: 2 };
export function layersFrom(graph = KITCHEN) {
  return graph.filter((o) => o.art).slice().sort((a, b) => (ORDER[a.layer] ?? 1) - (ORDER[b.layer] ?? 1));
}

/** Dời/đổi cỡ một object rồi trả về graph mới — ô thả tự đi theo. */
export function moveObj(graph, id, patch) {
  return graph.map((o) => (o.id === id ? { ...o, ...patch } : o));
}
