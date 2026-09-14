// Toạ độ & thông số hình ảnh của màn Quầy POV.
// Mọi vị trí là % của KHUNG SÂN KHẤU (hoặc % của chính vật, ghi rõ ở từng chỗ)
// → đổi cỡ màn hình không phải sửa gì. Xem docs/ART-PIPELINE.md §1–§2.
// KHÔNG chứa kiến thức bếp — chỉ hình ảnh.

/** Ảnh bàn tay: `spout` = toạ độ MIỆNG VÁ trong ảnh (% rộng, % cao),
 *  dùng để giải ngược vị trí tay sao cho nước rơi đúng giữa tô. */
export const HANDS = {
  ladle:  { src: 'art/hand-ladle-d.png', spout: [75, 92], width: 62 },   // vá cán dài — Kent duyệt 14/09
  ladle2: { src: 'art/hand-ladle-b.png', spout: [10, 44], width: 62 },   // vá ngang (dự phòng)
  bowl:   { src: 'art/hand-bowl.png',    spout: null,     width: 70 },   // bưng tô ra cho khách
};

/** Tô đang ráp: mốc theo % CHIỀU CAO CỦA TÔ, tính từ đỉnh ảnh tô. */
export const BOWL = {
  width: 54,        // % bề ngang sân khấu
  centerY: 56,      // % chiều cao sân khấu — tâm tô
  rim: 0.13,        // mép miệng tô
  surface: 0.30,    // mặt nước trong tô — nước rơi tới đây, toé ở đây
  underLadle: 0.06, // dòng nước bắt đầu thấp hơn miệng vá chừng này
};

/** A10 — chan nước. Số Kent duyệt 14/09 trên art/demo/pour.html. */
export const POUR = {
  duration: 1500,   // ms
  tilt: 30,         // độ nghiêng vá
  lift: 0,          // % chiều cao sân khấu — vá cao hơn miệng tô
  hand: 'ladle',
  // mốc thời gian theo tỉ lệ của duration
  t: { rise: 0.30, tilted: 0.42, holdEnd: 0.80, streamIn: 0.32, streamLen: 0.56,
       splashIn: 0.38, splashLen: 0.54, fillAt: 0.55, fillLen: 240 / 1500 },
  ease: { rise: 'cubic-bezier(.22,.9,.3,1)', drop: 'cubic-bezier(.5,0,.75,.45)' },
  // LƯU Ý: `easing` đặt ở options của Web Animations bóp méo TOÀN BỘ timeline,
  // không phải từng đoạn → luôn để options.easing = 'linear', easing đi theo keyframe.
};

/** Hơi nước bốc lên sau khi chan (A1). */
export const STEAM = { count: 6, spread: 14, gap: 240, duration: 1900, rise: 96 };
