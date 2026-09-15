// Toạ độ & thông số hình ảnh của màn Quầy POV (docs/ART-PIPELINE.md §1).
// KHÔNG chứa kiến thức bếp — chỉ hình ảnh.
//
// Cách làm: nền là MỘT TẤM VẼ LIỀN (`art/scene.webp`, 768×1376). Mọi vùng thao tác là
// div trong suốt đặt chồng lên theo % của khung nền — đo tay trên chính tấm ảnh đó.
// Vẽ hitbox to hơn vật một chút cho dễ trúng ngón tay; ảnh chỉ để nhìn.
// Đổi nền khác thì đo lại đúng bảng ZONES này, không phải sửa code.

export const SCENE = { src: 'art/scene.webp', w: 768, h: 1376 };

/** x, y, w, h tính bằng % của khung nền. */
export const ZONES = {
  pot:     { x: 6,  y: 23, w: 33, h: 21 },   // nồi trụng + 3 rọ treo trong nồi
  hot:     { x: 6,  y: 44, w: 33, h: 7  },   // tô nóng trữ ở mép nồi
  sink:    { x: 36, y: 29, w: 25, h: 15 },   // bồn xả lạnh
  burner:  { x: 61, y: 28, w: 38, h: 18 },   // bếp lò + nồi nước lèo
  broth:   { x: 63, y: 30, w: 35, h: 9  },   // nước lèo có sẵn (phở) múc thẳng
  prep:    { x: 7,  y: 43, w: 90, h: 9  },   // dãy khay GN trên tủ prep = tủ topping
  fryer:   { x: 84, y: 20, w: 15, h: 10 },   // chảo chiên (chỉ hiện khi món cần)
  micro:   { x: 68, y: 10, w: 17, h: 11 },   // lò vi sóng (chỉ hiện khi món cần)
  stack:   { x: 0,  y: 56, w: 15, h: 20 },   // chồng tô + mẹt/dĩa
  noodle:  { x: 11, y: 66, w: 25, h: 17 },   // khay sợi
  boards:  { x: 0,  y: 79, w: 30, h: 16 },   // thớt
  slots:   { x: 36, y: 70, w: 56, h: 26 },   // mặt thớt trắng — chỗ ráp tô
  trash:   { x: 91, y: 88, w: 9,  h: 11 },
  rail:    { x: 3,  y: 16, w: 94, h: 14 },   // dây kẹp phiếu khách — treo trên mảng tường trống
  hudL:    { x: 2,  y: 2,  w: 30, h: 7  },
  hudR:    { x: 68, y: 2,  w: 30, h: 7  },
};

/** Ảnh bàn tay: `spout` = toạ độ MIỆNG VÁ trong ảnh (% rộng, % cao). */
export const HANDS = {
  ladle:  { src: 'art/hand-ladle-d.webp', spout: [75, 92], width: 62 },
  ladle2: { src: 'art/hand-ladle-b.webp', spout: [10, 44], width: 62 },
  bowl:   { src: 'art/hand-bowl.webp',    spout: null,     width: 70 },
};

/** Tô đang ráp: mốc theo % CHIỀU CAO CỦA TÔ. */
export const BOWL = { width: 54, centerY: 56, rim: 0.13, surface: 0.30, underLadle: 0.06 };

/** A10 — chan nước. Số Kent duyệt 14/09 trên art/demo/pour.html. */
export const POUR = {
  duration: 1500, tilt: 30, lift: 0, hand: 'ladle',
  t: { rise: 0.30, tilted: 0.42, holdEnd: 0.80, streamIn: 0.32, streamLen: 0.56,
       splashIn: 0.38, splashLen: 0.54, fillAt: 0.55, fillLen: 240 / 1500 },
  ease: { rise: 'cubic-bezier(.22,.9,.3,1)', drop: 'cubic-bezier(.5,0,.75,.45)' },
  // LƯU Ý: `easing` ở options của Web Animations bóp méo TOÀN BỘ timeline, không phải
  // từng đoạn → luôn để options.easing = 'linear', easing đi theo keyframe.
};

export const STEAM = { count: 6, spread: 14, gap: 240, duration: 1900, rise: 96 };
