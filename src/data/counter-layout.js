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
  pot:     { x: 9.5, y:  18, w:  23, h:  24 },   // đúng lòng nồi: quai rổ nhô lên trên vành, cái rổ nằm trong nước
  hot:     { x:   5, y:  36, w:  33, h:   7 },   // tô nóng trữ ở mép nồi
  sink:    { x:  37, y:28.5, w:  25, h:  15 },   // bồn xả lạnh
  burner:  { x:  62, y:28.5, w:  23, h:13.5 },   // mặt bếp trái: 2 nồi nước (nồi đã xoá khỏi tranh)
  broth:   { x:  85, y:  30, w:  14, h:  11 },   // nước nấu sẵn ở đầu phải mặt bếp
  prep:    { x:   0, y:  44, w: 100, h: 5.4 },   // dải khay — vị trí từng khay nằm trong PANS
  fryer:   { x:  85, y:  28, w:  14, h:13.5 },   // chảo chiên đứng đầu phải mặt bếp
  micro:   { x:  66, y:  13, w:  18, h:  13 },   // lò vi sóng trên kệ tường
  stack:   { x:   0, y:  56, w:  15, h:  20 },   // chồng tô + mẹt/dĩa
  noodle:  { x:11.5, y:66.5, w:  26, h:  13 },   // khay sợi
  boards:  { x:   0, y:  79, w:  30, h:  16 },   // thớt
  slots:   { x:  36, y:  70, w:  56, h:  26 },   // mặt thớt trắng — chỗ ráp tô
  trash:   { x:  88, y:  55, w:  12, h:  18 },
  rail:    { x:   4, y: 9.5, w:  94, h:  14 },   // dây kẹp phiếu khách — treo trên mảng tường trống
  hudL:    { x:   2, y: 1.5, w:41.5, h: 7.5 },
  hudR:    { x:52.5, y:   1, w:  47, h: 7.5 },
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

/**
 * Vị trí TỪNG khay GN trên dải `prep`, tính theo % chiều ngang CẢ BỨC TRANH.
 *
 * KHÔNG được chia đều! Tranh vẽ có chiều sâu nên khay gần thì rộng, khay xa thì hẹp:
 * khay đầu 12.8% mà khay cuối chỉ 7.6%. Chia đều thì đến khay thứ 7–8 lệch tới 3.5%.
 * Số này do `scripts/measure_pans.py` đo thẳng từ `scene.webp` — đổi tranh thì chạy lại.
 */
export const PANS = [
  { x:   7.9, w:  12.8 }, { x:  20.7, w:  10.2 }, { x:  30.9, w:  10.3 },
  { x:  41.2, w:  10.9 }, { x:  52.1, w:   9.0 }, { x:  61.1, w:  10.2 },
  { x:  71.3, w:   9.8 }, { x:  81.1, w:  11.3 }, { x:  92.4, w:   7.6 },
];

