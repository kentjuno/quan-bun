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
  // Object GEN RIÊNG, vẽ DẸP CHÍNH DIỆN như hình cắt giấy (scripts/ob_sheet.py):
  // cả bộ vẽ trong một bản, KHÔNG phối cảnh, không điểm tụ — nên ráp kiểu gì cũng khớp.
  // Kent 21/09: "nó lệch banh chành luôn, prompt bro gen ảnh có vấn đề đó" — đúng, bản trước
  // mỗi món một phối cảnh riêng nên ráp vô là vênh.
  //   x, y, w, h = % khung · hit = ô thả nằm trong object (%, so với chính nó)
  { id: 'counter-back', art: `${OB}counter-back.webp`, layer: 'mid', x: -2, y: 40, w: 104, h: 26 },
  // Nồi trụng, bồn, bếp ĐỨNG TRÊN mặt quầy sau: đáy của chúng = mép trên quầy (40%).
  { id: 'pot-blanch', art: `${OB}pot-blanch.webp`, layer: 'mid', x: 4, y: 26, w: 30, h: 14,
    zone: 'pot', hit: { x: 8, y: 14, w: 84, h: 62 } },
  { id: 'sink', art: `${OB}sink.webp`, layer: 'mid', x: 36, y: 25.5, w: 22, h: 14.5,
    zone: 'sink', hit: { x: 6, y: 18, w: 88, h: 60 } },
  { id: 'stove', art: `${OB}stove.webp`, layer: 'mid', x: 58, y: 30, w: 40, h: 10,
    zone: 'burner', hit: { x: 4, y: 5, w: 60, h: 90 } },
  // Mặt bàn ráp tô: nhìn TỪ TRÊN XUỐNG, một mảng phẳng (Kent: "ví dụ bàn prep đi").
  { id: 'prep-top', art: `${OB}prep-top.webp`, layer: 'fg', x: -6, y: 56, w: 112, h: 44 },
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
