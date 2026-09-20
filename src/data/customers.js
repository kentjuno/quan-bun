// Khách quen của KJ's Choices — tên kiểu quê nhà, mỗi người một món ruột, một nét nhận diện và vài câu thoại.
// Kent sửa thoại thẳng ở đây, không cần đụng code. Thoại: ngắn, một dòng, giọng miền quê, ít dấu chấm than.
// `unlockDay`: từ ngày đó khách quen ghé mỗi ngày (khi món ruột đã có trong menu). `type`: model 3D tạm dùng (office/xeom/tourist).
export const REGULARS = [
  { id: 'cau-hai', name: 'Cậu Hai', dish: 'pho-tai-nam', unlockDay: 1, type: 'office', sketch: 'áo sơ mi xắn tay, hay đọc báo', patienceMult: 1.3, tipMult: 1.2,
    lines: {
      sit: ['Cho cậu tô phở tái nạm nghe con.', 'Nay quán đông dữ hen.', 'Cậu Hai nay đói lắm đó, làm lẹ nghe.', 'Bữa nay nóng quá, cho tô phở cho mát ruột.'],
      wait: ['Con ơi, tô của cậu tới đâu rồi.', 'Từ từ không sao, cậu chờ được.'],
      good: ['Chu cha nước phở này nó ngon.', 'Đúng ý cậu rồi đó.', 'Cha, thơm dữ.'],
      wrong: ['Ủa con, cậu đâu có kêu cái này.'],
      leave: ['Tính tiền nghe con.', 'Mai cậu ghé nữa.'],
      recap: ['Nay con làm lẹ hơn hôm qua đó.', 'Phở bữa nay hơi lâu nghe, mai ráng.'],
    } },
  { id: 'di-ba', name: 'Dì Ba', dish: 'bun-rieu-cua', unlockDay: 2, type: 'office', sketch: 'khăn rằn, giỏ đi chợ', patienceMult: 1.3, tipMult: 1.2,
    lines: {
      sit: ['Cho dì tô bún riêu nghe con.', 'Đi chợ về ghé con làm tô riêu cho ấm bụng.', 'Nay quán đông dữ hen.'],
      wait: ['Con ơi, tô của dì tới đâu rồi.', 'Từ từ không sao, dì chờ được.'],
      good: ['Riêu nay ngon hơn hôm qua đó con.', 'Đúng ý dì rồi đó.', 'Cha, thơm dữ.'],
      wrong: ['Ủa con, dì đâu có kêu cái này.'],
      leave: ['Mai dì ghé nữa.', 'Tính tiền nghe con.'],
      recap: ['Dì Ba: nay bún riêu ngon hơn hôm qua đó con.', 'Dì Ba: riêu bữa nay hơi lâu nghe, mai ráng.'],
    } },
  { id: 'thim-bay', name: 'Thím Bảy', dish: 'bun-bo-hue', unlockDay: 3, type: 'tourist', sketch: 'nón lá, nói to', patienceMult: 1.2, tipMult: 1.3,
    lines: {
      sit: ['Bún bò Huế một tô, cay cay nghe con.', 'Ngồi đây đỡ mỏi chân, cho thím tô bún bò.', 'Chu cha, thơm từ ngoài ngõ.'],
      wait: ['Con ơi, thím đói rồi đó.', 'Lẹ lẹ nghe con, thím còn ra chợ.'],
      good: ['Ngon, để thím dắt thêm mấy đứa nữa tới.', 'Cay đã ghê.', 'Đúng vị Huế rồi đó con.'],
      wrong: ['Ủa, thím kêu bún bò mà con.'],
      leave: ['Tính tiền nghe con.', 'Mai thím ghé nữa.'],
      recap: ['Thím Bảy: bún bò nay đã lắm, mai thím dắt bạn tới.', 'Thím Bảy: chờ hơi lâu nghe con, mai ráng.'],
    } },
  { id: 'chu-tu', name: 'Chú Tư', dish: 'pho-dac-biet', unlockDay: 4, type: 'xeom', sketch: 'kính lão, ăn chậm', patienceMult: 1.5, tipMult: 1.1,
    lines: {
      sit: ['Cho chú tô đặc biệt, đủ thứ nghe.', 'Chú ăn chậm, con cứ từ từ.', 'Nay trời đẹp hen con.'],
      wait: ['Chú không gấp đâu con.', 'Con làm cho người ta trước đi, chú đợi được.'],
      good: ['Đủ vị rồi đó con.', 'Ngon, y như hồi xưa.', 'Cha, tô này đầy dữ.'],
      wrong: ['Ủa, chú kêu đặc biệt mà con.'],
      leave: ['Tính tiền nghe con.', 'Mai chú ghé nữa.'],
      recap: ['Chú Tư: con làm coi bộ quen tay rồi đó.', 'Chú Tư: hôm nay chú đợi hơi lâu, không sao, mai ráng.'],
    } },
  { id: 'ut-muoi', name: 'Út Mười', dish: 'bun-cha-ha-noi', unlockDay: 6, type: 'office', sketch: 'trẻ, tai nghe, hay chụp hình đồ ăn', patienceMult: 1.0, tipMult: 1.4,
    lines: {
      sit: ['Cho em mẹt bún chả, để em chụp hình nha.', 'Quán này lên mạng ghê lắm đó.', 'Bún chả một mẹt, đẹp đẹp nghe anh.'],
      wait: ['Anh ơi, em sắp hết pin rồi.', 'Lẹ lẹ giùm em, em còn đi làm.'],
      good: ['Đẹp quá, để em đăng lên.', 'Ngon nha, chấm nước mắm đã.', 'Mẹt này đủ rau ghê.'],
      wrong: ['Ủa anh, em kêu bún chả mà.'],
      leave: ['Em đi nha, mai em ghé.', 'Tính tiền anh ơi.'],
      recap: ['Út Mười: mẹt bún chả nay đẹp, em đăng rồi đó.', 'Út Mười: đợi hơi lâu nha anh, mai ráng.'],
    } },
  { id: 'ong-nam', name: 'Ông Năm xe ôm', dish: 'bun-ca-hai-phong', unlockDay: 8, type: 'xeom', sketch: 'mũ bảo hiểm để trên bàn', patienceMult: 0.9, tipMult: 1.0,
    lines: {
      sit: ['Bún cá một tô, lẹ nghe con, ông còn chạy khách.', 'Nay nắng cháy da luôn.', 'Cho ông tô bún cá, nhiều thì là.'],
      wait: ['Con ơi, khách ông đang đợi ngoài kia.', 'Lẹ lẹ nghe con.'],
      good: ['Cá chiên giòn dữ.', 'Đã, chạy tiếp được rồi.', 'Ngon, mai ông ghé nữa.'],
      wrong: ['Ủa, ông kêu bún cá mà con.'],
      leave: ['Tính tiền nghe con.', 'Ông đi nghe.'],
      recap: ['Ông Năm: bún cá nay lẹ, ông kịp cuốc khách.', 'Ông Năm: nay đợi lâu, ông trễ khách rồi, mai ráng.'],
    } },
];

// Khách lạ: không tên, thoại chung.
export const STRANGER_LINES = {
  sit: ['Cho một tô nghe.', 'Quán này nghe đồn ngon lắm.', 'Ngồi đây được không em.', 'Đói quá, làm lẹ giùm.', 'Nay quán đông hen.'],
  wait: ['Em ơi, tô của anh sao rồi.', 'Lâu quá em.', 'Còn lâu không em.'],
  good: ['Ngon nha.', 'Được đó.', 'Cha, thơm dữ.', 'Ăn là biết nấu có tâm.'],
  wrong: ['Ủa, tôi đâu kêu cái này.'],
  leave: ['Tính tiền.', 'Cảm ơn nghe.'],
};

import { tl } from '../i18n.js';
/** Thoại theo ngôn ngữ: tiếng Việt ở đây là nguồn, bản dịch ở i18n/<lang>.json theo key `cust.<id|stranger>.<kind>.<n>` (P1 §3). */
export function lineAt(regularId, kind, n) { const r = regularId ? REGULARS.find((x) => x.id === regularId) : null; const arr = (r ? r.lines : STRANGER_LINES)[kind] || []; const s = arr[n]; return s == null ? '' : tl(`cust.${r ? r.id : 'stranger'}.${kind}.${n}`, s); }
/** Một câu thoại cho khách `cu` ở tình huống `kind` (sit/wait/good/wrong/leave). */
export function lineFor(cu, kind) { const r = cu.regular ? REGULARS.find((x) => x.id === cu.regular) : null; const arr = (r ? r.lines : STRANGER_LINES)[kind]; if (!arr || !arr.length) return ''; return lineAt(r?.id, kind, Math.floor(Math.random() * arr.length)); }
/** Khách quen có mặt ở ngày `day` với menu `dishes` (món ruột phải có trong menu). */
export function regularsFor(day, dishes) { return REGULARS.filter((r) => r.unlockDay <= day && dishes.includes(r.dish)); }
/** Câu nhận xét cuối ngày của một khách quen đã ghé: `served` = có được phục vụ không. */
export function recapLine(regularId, served) { const r = REGULARS.find((x) => x.id === regularId); if (!r) return ''; return lineAt(r.id, 'recap', served ? 0 : 1); }
