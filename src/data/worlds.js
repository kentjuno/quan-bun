// KJ's Choices — WORLD & LEVEL (bậc thang kiểu Overcooked). Xem docs/PLAN-WORLDS.md.
// Mỗi world = một món chủ đạo (+ món anh em mở dần). Level 1 rất dễ rồi thêm bước; TỪ LEVEL 4 của mỗi world
// công thức phải ĐỦ BƯỚC THẬT (simplify rỗng) và giữ vậy tới hết world — người chơi không được thuộc bản sai.
// Từ L6 mỗi level phải có ÍT NHẤT MỘT "cái mới" KHÔNG phải bước công thức (layout / constraints / events / goal / món mới):
// đó là `whatsNew` — bắt buộc, một dòng. Không viết được whatsNew thì cắt level đó.
// File này là DỮ LIỆU THUẦN: không import config (tránh vòng lặp import). `buildWorlds(prices)` ở cuối ráp thành WORLDS.

import { applyPace, PACE } from './pace.js';   // data → data, không vòng lặp import

/** Một level. `n` = số thứ tự trong world. Mọi field khác đều tuỳ chọn. */
const lv = (n, title, whatsNew, o = {}) => ({
  n, title, whatsNew,
  dishes: o.dishes,                    // bắt buộc (kế thừa từ level trước nếu bỏ trống — buildWorlds điền)
  simplify: o.simplify || null,        // cờ rút gọn: skipRinse hotBowl toppings[] maxSteps noSpoil soupReady skipPrep
  count: o.count ?? 5,                 // số khách
  patience: o.patience ?? 150,         // giây kiên nhẫn cơ bản
  seconds: o.seconds ?? 180,
  prep: o.prep ?? 15,
  layout: o.layout || 'default',
  constraints: o.constraints || null,  // { potSlots, handCapacity, brothCap, noStack }
  events: o.events || null,            // [{ at: 0..1, kind: 'tour'|'vip'|'rain'|'change-order', n? }]
  goal: o.goal || null,                // { kind: 'clean'|'no-waste'|'streak'|'before', ... } — null = theo tiền
  challenge: o.challenge || null,      // { kind: 'rush'|'lunch'|'only'|'boss', ... } — mốc 5/10/15/20
  pair: o.pair || 0,                   // số cặp khách đi chung bàn
  regulars: o.regulars || [],          // id khách quen (src/data/customers.js)
  unlocks: o.unlocks || null,          // { dish | regular | upgrade | world } — thẻ mở khoá ở màn kết
  hint: o.hint || '',                  // câu hướng dẫn đầu level
  rule: o.rule || null,                // luật bếp mới bật ở level này (vd 'spoil' = sợi để lâu bị hư)
  mix: o.mix || false,                 // level đầu tiên trộn chung các món đã mở (kỹ năng đọc đơn, chọn đúng tô/topping)
});

// ============================== WORLD 1 — PHỞ (20 level) ==============================
const PHO = ['pho-tai-nam'], PHO2 = ['pho-tai-nam', 'pho-dac-biet'], PHO3 = [...PHO2, 'pho-tai-dap'], PHO4 = [...PHO3, 'pho-suon-tai'];
const PHO7 = [...PHO4, 'pho-ga', 'pho-sot-vang', 'pho-xao-lan'];   // 3 món Kent kể 19/09
const W_PHO = {
  id: 'pho', name: 'Phở', icon: '🍜', sub: 'Hà Nội gánh về', dishes: PHO7,
  levels: [
    lv(1, 'Tô phở đầu tiên', 'Học chạm-là-đi: trụng sợi → ráp → bưng ra bàn', { dishes: PHO, count: 2, patience: 200, seconds: 120, prep: 12,
      simplify: { skipRinse: true, hotBowl: true, toppings: ['nam', 'bo-tai'], noSpoil: true },
      hint: 'Chạm kệ để lấy đồ, chạm nồi để trụng. Tô đã nóng sẵn — lấy tô, cho sợi, bỏ nạm và bò tái, chan nước, bưng ra bàn khách.' }),
    lv(2, 'Đủ topping', 'Thêm hành tây, ngò, hành lá — phải bỏ ĐÚNG THỨ TỰ', { dishes: PHO, count: 3, patience: 200, seconds: 140,
      simplify: { skipRinse: true, hotBowl: true, noSpoil: true },
      hint: 'Thứ tự thật của tiệm: nạm → bò tái → hành tây → ngò rí+ngò gai → hành lá → chan nước.' }),
    lv(3, 'Tự trụng tô', 'Tô phải tự trụng nóng trong nồi (trữ được, trụng sẵn nhiều cái)', { dishes: PHO, count: 3, patience: 180, seconds: 150,
      simplify: { skipRinse: true, noSpoil: true },
      hint: 'Lấy tô ở kệ → bỏ vô nồi trụng → lấy tô nóng ra. Rảnh thì trụng sẵn vài tô để dành.' }),
    lv(4, 'Nóng → lạnh → nóng', 'Đủ bước thật: sợi trụng nóng, xả lạnh, trụng nóng lại', { dishes: PHO, count: 4, patience: 170, seconds: 160,
      hint: 'Sợi phở: trụng nóng → qua bồn xả lạnh → trụng nóng lại rồi mới cho vô tô. Từ đây là quy trình y như tiệm.' }),
    lv(5, '⭐ Ba khách một lúc', 'Thử thách: ba khách vô cùng lúc — dùng đủ 3 rọ', { dishes: PHO, count: 3, patience: 165, seconds: 170,
      challenge: { kind: 'rush' }, hint: 'Ba tô một lượt: thả cả 3 rọ sợi trước, trụng tô sẵn, rồi ráp lần lượt.' }),
    lv(6, 'Sợi để lâu bị hư', 'Luật mới: sợi chín để quá lâu trong nồi sẽ hư — phải lấy ra vứt', { dishes: PHO, count: 5, patience: 150, seconds: 180, rule: 'spoil',
      hint: 'Rọ nào viền chuyển đỏ là sợi đang già. Hư rồi thì lấy ra vứt thùng rác, đừng cho vô tô.' }),
    lv(7, 'Nồi ở cuối bếp', 'Bố trí mới: nồi trụng nằm xa kệ tô — phải gom việc lại', { dishes: PHO, count: 5, patience: 150, seconds: 180,
      layout: 'far-pot', hint: 'Bếp hôm nay đổi chỗ: nồi trụng ở cuối. Mỗi chuyến đi nên làm nhiều việc một lúc.' }),
    lv(8, 'Khách đi hai người', 'Khách đi cặp ngồi chung bàn, gọi hai tô cùng lúc', { dishes: PHO, count: 5, patience: 145, seconds: 180, pair: 1,
      hint: 'Hai người ngồi chung — hai tô ra gần nhau mới kịp.' }),
    lv(9, 'Một rọ thôi', 'Ràng buộc: nồi chỉ còn 1 rọ trụng — sợi phải xếp hàng', { dishes: PHO, count: 5, patience: 155, seconds: 190,
      constraints: { potSlots: 1 }, goal: { kind: 'clean', bowls: 4 },
      hint: 'Chỉ một rọ: trụng sợi liên tục, tranh thủ lấy topping trong lúc chờ. Mục tiêu: 4 tô không sai thứ tự.' }),
    lv(10, '⭐ Đợt trưa — Cậu Hai', 'Khách quen đầu tiên: Cậu Hai, phở tái nạm không đổi', { dishes: PHO, count: 6, patience: 140, seconds: 200,
      challenge: { kind: 'lunch' }, regulars: ['cau-hai'], unlocks: { regular: 'cau-hai' },
      hint: 'Giờ trưa khách vô dồn. Cậu Hai là khách quen — nhìn bong bóng là biết ông gọi gì.' }),
    lv(11, 'Phở đặc biệt', 'Món mới: bò viên phải trụng rọ, thêm lá sách', { dishes: ['pho-dac-biet'], count: 3, patience: 175, seconds: 170,
      unlocks: { dish: 'pho-dac-biet' },
      hint: 'Phở đặc biệt: bò viên bỏ rọ trụng như sợi, thêm lá sách. Thứ tự: nạm → lá sách → bò tái → bò viên → hành tây → ngò → hành lá.' }),
    lv(12, 'Hai món xen nhau', 'Hai món cùng lúc — đọc bong bóng để ráp đúng tô cho đúng khách', { dishes: PHO2, count: 5, patience: 150, seconds: 190, mix: true,
      hint: 'Hai món khác topping. Nhìn bong bóng trên đầu khách trước khi lấy đồ.' }),
    lv(13, 'Tủ topping đổi bên', 'Bố trí mới: tủ topping và thớt dời sang bên kia bếp', { dishes: PHO2, count: 6, patience: 145, seconds: 200,
      layout: 'left-topping', unlocks: { upgrade: 'bowl-stack' },
      hint: 'Tủ topping hôm nay nằm bên trái. Đường đi đổi hết — tính lại lộ trình.' }),
    lv(14, 'Cơn mưa', 'Sự kiện: mưa — quán vắng một lúc rồi khách ào vô cùng lúc', { dishes: PHO2, count: 7, patience: 140, seconds: 210,
      events: [{ at: 0.3, kind: 'rain' }],
      hint: 'Mưa thì vắng khách — tranh thủ trụng sẵn tô và sợi, vì hết mưa là ào vô.' }),
    lv(15, '⭐ Một tay, chỉ đặc biệt', 'Thử thách: chỉ cầm được MỘT thứ mỗi chuyến', { dishes: ['pho-dac-biet'], count: 5, patience: 150, seconds: 210,
      challenge: { kind: 'only', dish: 'pho-dac-biet' }, constraints: { handCapacity: 1 },
      hint: 'Hôm nay bưng một tay: mỗi chuyến chỉ một thứ. Đi ít lại — trụng sẵn, gom việc.' }),
    lv(16, 'Phở tái đập', 'Món mới: đập thịt tái với gừng ở thớt', { dishes: ['pho-tai-dap'], count: 4, patience: 165, seconds: 190,
      unlocks: { dish: 'pho-tai-dap' },
      hint: 'Tái đập: lấy bò tái + gừng ra thớt đập, rồi mới cho vô tô thay bò tái thường.' }),
    lv(17, 'Không vứt gì', 'Mục tiêu mới: đừng để hư sợi nào — hư là mất sao', { dishes: PHO3, count: 6, patience: 145, seconds: 200,
      goal: { kind: 'no-waste' }, unlocks: { upgrade: 'shoes' },
      hint: 'Trụng vừa đủ dùng. Sợi hư hoặc đồ vứt đi đều trừ sao.' }),
    lv(18, 'Phở sườn tái', 'Món mới: sườn quay lò vi sóng rồi cắt, thêm tô phụ', { dishes: ['pho-suon-tai'], count: 4, patience: 175, seconds: 210,
      unlocks: { dish: 'pho-suon-tai' },
      hint: 'Sườn cây vô lò vi sóng (chạy nền) → cắt ở thớt → ủ ấm. Nhớ chuẩn bị tô phụ.' }),
    lv(19, 'Khách sộp đổi ý', 'Sự kiện: khách VIP tip gấp ba nhưng chờ ít; một khách đổi món giữa chừng', { dishes: PHO4, count: 7, patience: 140, seconds: 220,
      events: [{ at: 0.35, kind: 'vip' }, { at: 0.6, kind: 'change-order' }],
      hint: 'Khách viền vàng tip gấp ba nhưng mau đói. Coi chừng có người đổi món giữa chừng.' }),
    lv(20, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ráp ra giữa quán + đoàn 4 người', { dishes: PHO4, count: 6, patience: 150, seconds: 240,
      layout: 'island', challenge: { kind: 'boss', group: 4 }, regulars: ['cau-hai', 'chu-tu'],
      hint: 'Quầy ráp ra giữa sàn, phải đi vòng. Giữa buổi có đoàn 4 người — trụng sẵn thật nhiều trước khi họ tới.' }),
    lv(21, 'Phở gà', 'Món mới: nước phở gà phải tự pha cốt với nước phở rồi đun ở lò', { dishes: ['pho-ga'], count: 4, patience: 180, seconds: 220,
      unlocks: { dish: 'pho-ga' },
      hint: 'Nước phở gà không có sẵn: lấy cốt phở gà vô nồi, pha thêm nước phở rồi đun. Trong lúc chờ thì chặt gà luộc ở thớt. Món này chỉ có size M.' }),
    lv(22, 'Gà chen vô menu bò', 'Mục tiêu: đừng nhầm nước — phở bò múc sẵn, phở gà phải tự đun', { dishes: [...PHO4, 'pho-ga'], count: 6, patience: 160, seconds: 220,
      goal: { kind: 'no-waste' }, mix: true,
      hint: 'Hai loại nước trên bếp. Nhớ đun nồi phở gà TRƯỚC khi khách gọi, đừng để nồi nguội rồi mới chạy.' }),
    lv(23, 'Phở sốt vang', 'Món mới: hâm cốt sốt vang bằng nồi nhỏ ngay trên mặt bếp', { dishes: ['pho-sot-vang'], count: 4, patience: 175, seconds: 200,
      unlocks: { dish: 'pho-sot-vang' },
      hint: 'Cốt sốt vang bỏ lên mặt bếp hâm nóng (chạy nền) rồi mới cho lên tô. Vẫn chan nước phở như thường. Món này chỉ có size M.' }),
    lv(24, 'Phở xào lăn', 'Món mới: xào thịt tái + rau cải ngay trên mặt bếp', { dishes: ['pho-xao-lan'], count: 4, patience: 175, seconds: 200,
      unlocks: { dish: 'pho-xao-lan' },
      hint: 'Thịt tái với rau cải đem lên mặt bếp xào lăn, xong mới bỏ lên phở đã trụng, rồi chan nước phở. Món này chỉ có size L.' }),
    lv(25, '⭐ Cả menu phở', 'Thử thách: bảy món phở cùng lúc — mặt bếp với lò đun chạy song song', { dishes: PHO7, count: 7, patience: 150, seconds: 250,
      challenge: { kind: 'boss', group: 3 }, regulars: ['cau-hai'],
      hint: 'Đủ bảy món. Mặt bếp chỉ có MỘT chỗ — xếp thứ tự hâm/xào cho khéo, đừng để nó kẹt.' }),
  ],
};

// ============================== WORLD 2 — BÚN RIÊU CUA (12 level) ==============================
const RIEU = ['bun-rieu-cua'];
const W_RIEU = {
  id: 'bun-rieu', name: 'Bún riêu cua', icon: '🦀', sub: 'Nồi nước lèo đầu tiên', dishes: RIEU,
  levels: [
    lv(1, 'Tô riêu đầu tiên', 'Món nước tự nấu: hôm nay nước riêu đã có sẵn trên kệ', { dishes: RIEU, count: 2, patience: 200, seconds: 130, prep: 12,
      simplify: { skipRinse: true, hotBowl: true, toppings: ['ca-chua', 'dau-hu'], noSpoil: true, soupReady: true },
      hint: 'Nước riêu đã nấu sẵn ở kệ nước. Lấy tô, cho bún, cà chua, đậu hũ rồi chan nước.' }),
    lv(2, 'Đủ topping riêu', 'Thêm bò tái, tôm và hành lá — hành lá bỏ SAU khi chan nước', { dishes: RIEU, count: 3, patience: 190, seconds: 150,
      simplify: { skipRinse: true, hotBowl: true, noSpoil: true, soupReady: true },
      hint: 'Thứ tự: cà chua → bò tái → đậu hũ → tôm → chan nước riêu → hành lá bỏ sau cùng.' }),
    lv(3, 'Tự nấu nước riêu', 'Học nấu ở lò: cốt cua → huyết → miếng nước → đun', { dishes: RIEU, count: 3, patience: 185, seconds: 170,
      simplify: { skipRinse: true, noSpoil: true },
      hint: 'Chạm lò đun, chọn theo đúng thứ tự: nước cốt cua → huyết → miếng nước, rồi bấm Đun. Mỗi nồi ra MỘT phần.' }),
    lv(4, 'Đủ bước thật', 'Bún cũng nóng → lạnh → nóng như phở', { dishes: RIEU, count: 4, patience: 170, seconds: 180,
      hint: 'Từ đây đủ quy trình tiệm: bún trụng nóng → xả lạnh → trụng nóng lại; nước tự nấu từng phần.' }),
    lv(5, '⭐ Ba khách một lúc', 'Thử thách: 3 tô riêu cùng lúc — nấu nước trước khi khách tới', { dishes: RIEU, count: 3, patience: 170, seconds: 180,
      challenge: { kind: 'rush' }, hint: 'Lúc chuẩn bị hãy nấu sẵn 2–3 phần nước, vì mỗi nồi chỉ ra một phần.' }),
    lv(6, 'Kệ nước chật', 'Ràng buộc: kệ nước chỉ chứa được 1 phần — nấu đúng nhịp', { dishes: RIEU, count: 5, patience: 155, seconds: 190,
      constraints: { brothCap: 1 },
      hint: 'Kệ nước chỉ để được một phần. Chan xong mới nấu phần kế, đừng nấu dồn.' }),
    lv(7, 'Nồi ở cuối bếp', 'Bố trí mới: nồi trụng xa kệ tô, lò đun đổi chỗ', { dishes: RIEU, count: 5, patience: 155, seconds: 190,
      layout: 'far-pot', hint: 'Đường từ kệ tô tới nồi dài hơn — trụng tô thành đợt.' }),
    lv(8, 'Sạch sáu tô', 'Mục tiêu mới: 6 tô không sai một thứ tự nào', { dishes: RIEU, count: 6, patience: 160, seconds: 200,
      goal: { kind: 'clean', bowls: 6 },
      hint: 'Chậm mà đúng: 6 tô không lỗi thứ tự là 3 sao.' }),
    lv(9, 'Một tay', 'Ràng buộc: chỉ cầm một thứ mỗi chuyến', { dishes: RIEU, count: 5, patience: 165, seconds: 200,
      constraints: { handCapacity: 1 },
      hint: 'Một tay thì đi nhiều — xếp thứ tự lấy đồ cho khỏi quay lui.' }),
    lv(10, 'Dì Ba ghé giữa mưa', 'Khách quen Dì Ba + cơn mưa giữa buổi', { dishes: RIEU, count: 6, patience: 150, seconds: 210,
      regulars: ['di-ba'], events: [{ at: 0.3, kind: 'rain' }], unlocks: { regular: 'di-ba' },
      hint: 'Dì Ba đi chợ về, bún riêu là món ruột. Mưa xong khách ào vô — nấu sẵn nước.' }),
    lv(11, 'Lò xong phải lấy liền', 'Ràng buộc: nồi nấu xong KHÔNG tự sang kệ — phải tự lấy ra', { dishes: RIEU, count: 6, patience: 150, seconds: 210,
      constraints: { noStack: true },
      hint: 'Nước sôi xong nằm lại trên lò, lò đó bị chiếm. Lấy ra ngay mới nấu phần kế được.' }),
    lv(12, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ráp ra giữa quán + đoàn 4 người', { dishes: RIEU, count: 6, patience: 155, seconds: 240,
      layout: 'island', challenge: { kind: 'boss', group: 4 }, regulars: ['di-ba'],
      hint: 'Đoàn 4 người cùng gọi riêu. Nấu sẵn 4 phần nước và trụng sẵn tô trước khi họ tới.' }),
  ],
};

// ============================== WORLD 3 — BÚN BÒ HUẾ (12 level) ==============================
const BBH = ['bun-bo-hue'];
const W_BBH = {
  id: 'bun-bo', name: 'Bún bò Huế', icon: '🌶️', sub: 'Cay và nhiều topping', dishes: BBH,
  levels: [
    lv(1, 'Tô bún bò đầu tiên', 'Bún cọng to chỉ trụng MỘT lần; nước đã nấu sẵn', { dishes: BBH, count: 2, patience: 200, seconds: 130, prep: 12,
      simplify: { hotBowl: true, toppings: ['thit-luoc', 'cha-lua'], noSpoil: true, soupReady: true },
      hint: 'Bún bò dùng bún cọng to, trụng nóng một lần là xong (không xả lạnh). Nước đã có sẵn ở kệ.' }),
    lv(2, 'Đủ topping bún bò', 'Sáu thứ topping đúng thứ tự: thịt luộc → bắp bò → nạm → chả lụa → chả rế → hành tây → rau răm → hành lá', { dishes: BBH, count: 3, patience: 190, seconds: 160,
      simplify: { hotBowl: true, noSpoil: true, soupReady: true },
      hint: 'Món này nhiều topping nhất world: thịt luộc, bắp bò, nạm, chả lụa, chả rế, hành tây, rau răm, hành lá.' }),
    lv(3, 'Tự nấu nước bún bò', 'Học nấu ở lò: nước bún bò → huyết → miếng nước → đun', { dishes: BBH, count: 3, patience: 185, seconds: 175,
      simplify: { noSpoil: true },
      hint: 'Chạm lò: nước bún bò → huyết → miếng nước → Đun. Mỗi nồi một phần.' }),
    lv(4, 'Đủ bước thật', 'Tự trụng tô, tự nấu nước, sợi để lâu sẽ hư', { dishes: BBH, count: 4, patience: 175, seconds: 185,
      hint: 'Từ đây đủ quy trình tiệm. Nhớ trụng tô sẵn để dành.' }),
    lv(5, '⭐ Ba khách một lúc', 'Thử thách: 3 tô cùng lúc với 8 topping mỗi tô', { dishes: BBH, count: 3, patience: 175, seconds: 190,
      challenge: { kind: 'rush' }, hint: 'Nhiều topping thì lấy theo cặp: mỗi chuyến hai thứ, ráp liên tục.' }),
    lv(6, 'Lò xong phải lấy liền', 'Ràng buộc: nồi nấu xong không tự sang kệ nước', { dishes: BBH, count: 5, patience: 160, seconds: 195,
      constraints: { noStack: true },
      hint: 'Nước xong nằm lại trên lò và chiếm chỗ. Lấy ra rồi mới nấu tiếp.' }),
    lv(7, 'Tủ topping đổi bên', 'Bố trí mới: tủ topping sang bên kia — 8 topping đi xa hơn', { dishes: BBH, count: 5, patience: 160, seconds: 200,
      layout: 'left-topping', hint: 'Tủ topping đổi bên. Món nhiều topping nên lộ trình quan trọng hơn hẳn.' }),
    lv(8, 'Chuỗi năm tô', 'Mục tiêu mới: 5 tô ĐÚNG LIÊN TIẾP không đứt chuỗi', { dishes: BBH, count: 7, patience: 165, seconds: 210,
      goal: { kind: 'streak', n: 5 },
      hint: 'Sai một tô là chuỗi về 0. Chậm lại, đọc kỹ thứ tự.' }),
    lv(9, 'Khách sộp', 'Sự kiện: khách VIP tip gấp ba nhưng kiên nhẫn ngắn', { dishes: BBH, count: 6, patience: 155, seconds: 200,
      events: [{ at: 0.4, kind: 'vip' }],
      hint: 'Khách viền vàng tới thì ưu tiên, tip gấp ba.' }),
    lv(10, 'Thím Bảy giờ trưa', 'Khách quen Thím Bảy + đợt trưa dồn khách', { dishes: BBH, count: 6, patience: 150, seconds: 210,
      challenge: { kind: 'lunch' }, regulars: ['thim-bay'], unlocks: { regular: 'thim-bay' },
      hint: 'Thím Bảy nói to, ăn bún bò cay. Trưa đông — nấu trước 2 phần nước.' }),
    lv(11, 'Một tay, một rọ', 'Ràng buộc kép: một tay cầm + nồi chỉ còn 1 rọ', { dishes: BBH, count: 5, patience: 170, seconds: 215,
      constraints: { handCapacity: 1, potSlots: 1 },
      hint: 'Hôm nay bếp thiếu đồ: một rọ, một tay. Lên kế hoạch từng chuyến.' }),
    lv(12, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ra giữa quán + đoàn 4 người', { dishes: BBH, count: 6, patience: 160, seconds: 240,
      layout: 'island', challenge: { kind: 'boss', group: 4 }, regulars: ['thim-bay'],
      hint: 'Đoàn 4 người ăn bún bò. Chuẩn bị nước và tô thật nhiều trước khi họ ngồi xuống.' }),
  ],
};

// ============================== WORLD 4 — HẢI PHÒNG (16 level) ==============================
const BCA = ['bun-ca-hai-phong'], BDC = ['bun-ca-hai-phong', 'banh-da-cua'];
const W_HP = {
  id: 'hai-phong', name: 'Hải Phòng', icon: '🐟', sub: 'Bún cá & bánh đa cua', dishes: BDC,
  levels: [
    lv(1, 'Tô bún cá đầu tiên', 'Món cá: hôm nay chả cá và thì là đã cắt sẵn', { dishes: BCA, count: 2, patience: 200, seconds: 130, prep: 12,
      simplify: { skipRinse: true, hotBowl: true, skipPrep: true, soupReady: true, noSpoil: true, toppings: ['ca-chua', 'ca-chien'] },
      hint: 'Bún cá Hải Phòng: cà chua, cá chiên rồi chan nước cá. Đồ cắt sẵn hết, cứ lấy là dùng.' }),
    lv(2, 'Đủ thành phần', 'Thêm rau cần trụng, chả cá, hành lá; thì là bỏ SAU nước', { dishes: BCA, count: 3, patience: 190, seconds: 160,
      simplify: { skipRinse: true, hotBowl: true, skipPrep: true, soupReady: true, noSpoil: true },
      hint: 'Thứ tự: cà chua → rau cần trụng → cá chiên → chả cá → hành lá → chan nước cá → thì là sau cùng.' }),
    lv(3, 'Tự nấu nước cá', 'Học nấu nước cá ở lò và trụng rau cần', { dishes: BCA, count: 3, patience: 185, seconds: 175,
      simplify: { skipRinse: true, skipPrep: true, noSpoil: true },
      hint: 'Nước cá: nước cá → miếng nước → Đun. Rau cần trụng sơ ở nồi.' }),
    lv(4, 'Ra thớt', 'Đủ bước thật: chả cá 2 miếng cắt đôi, thì là cắt 3 khúc ở thớt', { dishes: BCA, count: 4, patience: 175, seconds: 190,
      hint: 'Chả cá lấy 2 miếng ra thớt cắt đôi thành 4. Thì là cắt 3 khúc, bỏ sau khi chan nước.' }),
    lv(5, '⭐ Ba khách một lúc', 'Thử thách: 3 tô — cắt sẵn ở thớt trước khi khách tới', { dishes: BCA, count: 3, patience: 175, seconds: 190,
      challenge: { kind: 'rush' }, hint: 'Lúc chuẩn bị: cắt sẵn chả cá và thì là, nấu sẵn nước.' }),
    lv(6, 'Tủ topping đổi bên', 'Bố trí mới: tủ topping và thớt sang bên kia bếp', { dishes: BCA, count: 5, patience: 160, seconds: 195,
      layout: 'left-topping', hint: 'Thớt nằm trên tủ topping nên cũng đổi bên theo.' }),
    lv(7, 'Sạch năm tô', 'Mục tiêu mới: 5 tô không sai thứ tự (thì là rất hay bỏ sớm)', { dishes: BCA, count: 6, patience: 165, seconds: 200,
      goal: { kind: 'clean', bowls: 5 },
      hint: 'Lỗi hay gặp: bỏ thì là trước khi chan nước. Thì là luôn sau cùng.' }),
    lv(8, 'Một rọ thôi', 'Ràng buộc: nồi chỉ còn 1 rọ — sợi và rau cần tranh chỗ', { dishes: BCA, count: 5, patience: 165, seconds: 200,
      constraints: { potSlots: 1 },
      hint: 'Rau cần cũng phải trụng ở nồi — một rọ thì phải xếp lượt.' }),
    lv(9, 'Bánh đa cua', 'Món mới: bánh đa, rau muống trụng, tóp mỡ và hành phi', { dishes: ['banh-da-cua'], count: 4, patience: 180, seconds: 200,
      unlocks: { dish: 'banh-da-cua' },
      hint: 'Bánh đa cua: bánh đa → rau muống trụng → chả cá → tôm → cà chua → hành tây → hành lá → tóp mỡ → hành phi → chan nước cua.' }),
    lv(10, 'Hai món xen nhau', 'Hai loại nước khác nhau trên kệ cùng lúc — chan đúng nồi', { dishes: BDC, count: 6, patience: 160, seconds: 210, mix: true,
      hint: 'Nước cá và nước cua nằm chung kệ. Chạm kệ nước sẽ hỏi lấy loại nào.' }),
    lv(11, 'Kệ nước chật', 'Ràng buộc: kệ nước chỉ chứa 1 phần mà có tới hai loại', { dishes: BDC, count: 6, patience: 160, seconds: 210,
      constraints: { brothCap: 1 },
      hint: 'Chỉ để được một phần nước — nấu đúng loại khách đang chờ, đừng nấu dư.' }),
    lv(12, 'Nồi ở cuối bếp', 'Bố trí mới: nồi trụng dời xa, hai món đều cần nồi', { dishes: BDC, count: 6, patience: 160, seconds: 215,
      layout: 'far-pot', hint: 'Cả sợi, rau muống và rau cần đều qua nồi — đi một chuyến làm luôn mấy việc.' }),
    lv(13, 'Ông Năm xe ôm', 'Khách quen Ông Năm: chờ ít vì còn chạy khách', { dishes: BDC, count: 7, patience: 155, seconds: 220,
      regulars: ['ong-nam'], unlocks: { regular: 'ong-nam' },
      hint: 'Ông Năm kiên nhẫn thấp hơn khách thường — ưu tiên tô của ông.' }),
    lv(14, 'Không vứt gì', 'Mục tiêu mới: không để hư sợi hay bỏ phí đồ nào', { dishes: BDC, count: 7, patience: 160, seconds: 220,
      goal: { kind: 'no-waste' },
      hint: 'Trụng đúng số cần. Nước nấu sai loại cũng tính là phí.' }),
    lv(15, '⭐ Một tay, chỉ bánh đa', 'Thử thách: chỉ bánh đa cua, cầm một thứ mỗi chuyến', { dishes: ['banh-da-cua'], count: 5, patience: 170, seconds: 225,
      challenge: { kind: 'only', dish: 'banh-da-cua' }, constraints: { handCapacity: 1 },
      hint: 'Món 9 bước mà một tay — sắp xếp thứ tự lấy đồ cho khỏi đi lui.' }),
    lv(16, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ra giữa quán + đoàn 4 người, hai món', { dishes: BDC, count: 6, patience: 165, seconds: 245,
      layout: 'island', challenge: { kind: 'boss', group: 4 }, regulars: ['ong-nam'],
      hint: 'Đoàn 4 người gọi lẫn lộn hai món. Nấu sẵn cả hai loại nước.' }),
  ],
};

// ============================== WORLD 5 — MÓN KHÔ (20 level) ==============================
const BCHN = ['bun-cha-ha-noi'], V4 = ['bun-nem-cua-thit-nuong-tom-nuong'], V5 = ['bun-ga-nuong'];
const KHO2 = [...BCHN, ...V4], KHO3 = [...KHO2, ...V5], KHO4 = [...KHO3, 'bun-dau-mam-tom'], KHO5 = [...KHO4, 'banh-hoi-thit-heo'];
const W_KHO = {
  id: 'mon-kho', name: 'Món khô', icon: '🧺', sub: 'Mẹt, tô khô, bánh hỏi', dishes: KHO5,
  levels: [
    lv(1, 'Mẹt bún chả đầu tiên', 'Món khô: không có nước lèo, ráp lên MẸT lót giấy', { dishes: BCHN, count: 2, patience: 200, seconds: 130, prep: 12,
      simplify: { skipRinse: true, toppings: ['xa-lach', 'kinh-gioi'], noSpoil: true },
      hint: 'Lấy mẹt + giấy lót ở kệ tô, lót giấy trước. Món khô không chan nước.' }),
    lv(2, 'Đủ bộ rau', 'Bộ rau bún đậu: xà lách, kinh giới, bạc hà, tía tô', { dishes: BCHN, count: 3, patience: 190, seconds: 155,
      simplify: { skipRinse: true, noSpoil: true },
      hint: 'Rau trước, bún sau, dưa leo 3 miếng bỏ SAU khi có bún.' }),
    lv(3, 'Bún để lâu cũng hư', 'Luật mới: sợi bún trong nồi vẫn hư như món nước', { dishes: BCHN, count: 4, patience: 180, seconds: 170, rule: 'spoil',
      simplify: { skipRinse: true },
      hint: 'Món khô nhưng bún vẫn trụng ở nồi — để lâu là hư.' }),
    lv(4, 'Nóng → lạnh → nóng', 'Đủ bước thật: bún mẹt cũng nóng → xả lạnh → nóng lại', { dishes: BCHN, count: 4, patience: 175, seconds: 180,
      hint: 'Kent xác nhận: bún ăn mẹt cũng trụng nóng → xả lạnh → trụng nóng lại.' }),
    lv(5, '⭐ Ba mẹt một lúc', 'Thử thách: 3 mẹt cùng lúc — lót giấy sẵn trước', { dishes: BCHN, count: 3, patience: 175, seconds: 185,
      challenge: { kind: 'rush' }, hint: 'Lúc chuẩn bị: lót sẵn mấy cái mẹt, trụng sẵn bún.' }),
    lv(6, 'Tô bún khô', 'Món mới: tô bún khô — KHÔNG trụng tô, cắt xà lách + dưa leo + đồ chua', { dishes: V4, count: 4, patience: 180, seconds: 190,
      unlocks: { dish: 'bun-nem-cua-thit-nuong-tom-nuong' },
      hint: 'Tô bún khô khác tô món nước: lấy ở kệ, KHÔNG trụng nóng. Xà lách, dưa leo, đồ chua cắt chung ở thớt.' }),
    lv(7, 'Bún gà nướng', 'Món mới nhưng y hệt: cùng quy trình tô bún khô', { dishes: [...V4, ...V5], count: 5, patience: 170, seconds: 195,
      unlocks: { dish: 'bun-ga-nuong' },
      hint: 'Bún gà nướng làm y như bún nem cua — nhận ra điểm giống là làm nhanh hơn.' }),
    lv(8, 'Nồi ở cuối bếp', 'Bố trí mới: nồi trụng xa, mà món nào cũng cần bún', { dishes: KHO3, count: 6, patience: 165, seconds: 200, mix: true,
      layout: 'far-pot', hint: 'Ba món đều cần bún — trụng thành đợt lớn rồi ráp một loạt.' }),
    lv(9, 'Sạch sáu phần', 'Mục tiêu mới: 6 phần không sai thứ tự (mẹt và tô khô lẫn nhau)', { dishes: KHO3, count: 6, patience: 170, seconds: 205,
      goal: { kind: 'clean', bowls: 6 },
      hint: 'Dễ nhầm: mẹt thì rau trước bún sau; tô khô thì bún trước rồi mới salad cắt.' }),
    lv(10, 'Út Mười giờ trưa', 'Khách quen Út Mười + đợt trưa dồn khách', { dishes: KHO3, count: 6, patience: 160, seconds: 210,
      challenge: { kind: 'lunch' }, regulars: ['ut-muoi'], unlocks: { regular: 'ut-muoi' },
      hint: 'Út Mười hay chụp hình mẹt bún chả — làm cho đẹp.' }),
    lv(11, 'Bún đậu mắm tôm', 'Món mới: mẹt bún đậu, chỉ rau và bún', { dishes: ['bun-dau-mam-tom'], count: 4, patience: 180, seconds: 195,
      unlocks: { dish: 'bun-dau-mam-tom' },
      hint: 'Mẹt bún đậu: lót giấy → bún → xà lách → kinh giới → bạc hà → tía tô.' }),
    lv(12, 'Một rọ thôi', 'Ràng buộc: một rọ trụng cho cả bốn món', { dishes: KHO4, count: 6, patience: 170, seconds: 210,
      constraints: { potSlots: 1 },
      hint: 'Một rọ mà bốn món đều cần bún — trụng liên tục, đừng để nồi trống.' }),
    lv(13, 'Tủ topping đổi bên', 'Bố trí mới: tủ topping và thớt sang bên kia', { dishes: KHO4, count: 6, patience: 165, seconds: 210,
      layout: 'left-topping', hint: 'Rau nằm bên kia rồi — gom rau một chuyến.' }),
    lv(14, 'Khách đổi ý', 'Sự kiện: một khách đổi món giữa chừng', { dishes: KHO4, count: 7, patience: 160, seconds: 215,
      events: [{ at: 0.5, kind: 'change-order' }],
      hint: 'Phần đang ráp cho khách đó vẫn giữ được — sẽ có khách sau gọi đúng món đó.' }),
    lv(15, '⭐ Một tay, chỉ bún đậu', 'Thử thách: chỉ bún đậu mắm tôm, cầm một thứ mỗi chuyến', { dishes: ['bun-dau-mam-tom'], count: 5, patience: 175, seconds: 220,
      challenge: { kind: 'only', dish: 'bun-dau-mam-tom' }, constraints: { handCapacity: 1 },
      hint: 'Bốn loại rau mà một tay — nhớ thứ tự để khỏi đi lui.' }),
    lv(16, 'Bánh hỏi thịt heo', 'Món mới: bánh hỏi VÀ bún, cả hai đều nóng → lạnh → nóng', { dishes: ['banh-hoi-thit-heo'], count: 4, patience: 185, seconds: 215,
      unlocks: { dish: 'banh-hoi-thit-heo' },
      hint: 'Mẹt bánh hỏi: bánh hỏi trước, mỡ hành, dưa leo, xoài, rồi tới bún, rau, thịt nướng sau cùng.' }),
    lv(17, 'Khách sộp', 'Sự kiện: khách VIP tip gấp ba nhưng chờ ít', { dishes: KHO5, count: 7, patience: 160, seconds: 220,
      events: [{ at: 0.4, kind: 'vip' }],
      hint: 'Năm món rồi — nhìn bong bóng kỹ trước khi lót mẹt hay lấy tô.' }),
    lv(18, 'Không vứt gì', 'Mục tiêu mới: không hư sợi nào với 5 món cùng lúc', { dishes: KHO5, count: 7, patience: 165, seconds: 225,
      goal: { kind: 'no-waste' },
      hint: 'Trụng đúng số cần cho khách đang chờ.' }),
    lv(19, 'Quầy ra giữa quán', 'Bố trí mới: quầy ráp ra giữa sàn, phải đi vòng', { dishes: KHO5, count: 8, patience: 160, seconds: 230,
      layout: 'island', hint: 'Đi vòng quầy — chọn hướng đi trước khi chạm.' }),
    lv(20, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: đoàn 4 người, đủ 5 món khô', { dishes: KHO5, count: 6, patience: 170, seconds: 250,
      layout: 'island', challenge: { kind: 'boss', group: 4 }, regulars: ['ut-muoi'],
      hint: 'Đoàn 4 người gọi đủ thứ. Lót sẵn mẹt, lấy sẵn tô khô, trụng sẵn bún.' }),
  ],
};

// ============================== WORLD 6 — CHÁO (16 level) ==============================
const CL = ['chao-long'], CS = ['chao-suon'], CHAO2 = ['chao-long', 'chao-suon'];
const W_CHAO = {
  id: 'chao', name: 'Cháo', icon: '🥣', sub: 'Cháo lòng & cháo sườn', dishes: CHAO2,
  levels: [
    lv(1, 'Tô cháo đầu tiên', 'Không có sợi: cháo đun ở lò rồi múc ra tô, quẩy cắt sẵn', { dishes: CL, count: 2, patience: 200, seconds: 120, prep: 12,
      simplify: { skipPrep: true, noSpoil: true },
      hint: 'Cháo không có bún. Hôm nay cháo đã múc sẵn ra tô và quẩy cắt sẵn — chỉ việc bày ra cho khách.' }),
    lv(2, 'Cắt quẩy', 'Quẩy phải tự cắt khúc ở thớt', { dishes: CL, count: 3, patience: 190, seconds: 145,
      simplify: { hotBowl: true, soupReady: true, noSpoil: true },
      hint: 'Cháo đã đun sẵn ở kệ, tô đã nóng sẵn. Lấy quẩy ra thớt cắt khúc, múc cháo ra tô rồi bỏ quẩy lên.' }),
    lv(3, 'Tự đun cháo', 'Học đun cháo ở lò — mỗi nồi một phần như nước lèo', { dishes: CL, count: 3, patience: 185, seconds: 165,
      simplify: { hotBowl: true, noSpoil: true },
      hint: 'Chạm lò, chọn cháo lòng rồi Đun. Mỗi nồi ra một tô.' }),
    lv(4, 'Đủ bước thật', 'Tự trụng tô, tự đun cháo, tự cắt quẩy', { dishes: CL, count: 4, patience: 180, seconds: 175,
      hint: 'Từ đây đủ quy trình. Đun cháo mất thời gian — đun trước khi khách tới.' }),
    lv(5, '⭐ Ba tô một lúc', 'Thử thách: 3 tô cháo — mỗi nồi chỉ một phần', { dishes: CL, count: 3, patience: 180, seconds: 180,
      challenge: { kind: 'rush' }, hint: 'Ba tô là ba nồi cháo. Lúc chuẩn bị đun sẵn hết.' }),
    lv(6, 'Cháo sườn', 'Món mới: cháo sườn — cùng quy trình, khác nồi cháo', { dishes: CS, count: 4, patience: 180, seconds: 185,
      unlocks: { dish: 'chao-suon' },
      hint: 'Cháo sườn làm y như cháo lòng nhưng chọn đúng loại cháo ở lò.' }),
    lv(7, 'Hai loại cháo', 'Hai loại cháo nằm chung kệ — múc đúng loại khách gọi', { dishes: CHAO2, count: 5, patience: 170, seconds: 195, mix: true,
      hint: 'Chạm kệ nước sẽ hỏi lấy loại nào. Nhìn bong bóng khách trước.' }),
    lv(8, 'Kệ chật', 'Ràng buộc: kệ chỉ để được 1 phần cháo', { dishes: CHAO2, count: 5, patience: 170, seconds: 195,
      constraints: { brothCap: 1 },
      hint: 'Đun đúng loại đang cần, múc ra rồi mới đun tiếp.' }),
    lv(9, 'Sạch năm tô', 'Mục tiêu mới: 5 tô không sai (dễ múc nhầm loại cháo)', { dishes: CHAO2, count: 6, patience: 175, seconds: 200,
      goal: { kind: 'clean', bowls: 5 },
      hint: 'Múc nhầm cháo lòng cho khách gọi cháo sườn là tính lỗi.' }),
    lv(10, 'Đợt trưa', 'Đợt trưa dồn khách mà cháo thì đun lâu', { dishes: CHAO2, count: 6, patience: 165, seconds: 205,
      challenge: { kind: 'lunch' },
      hint: 'Cháo đun lâu nhất bếp — trước giờ trưa phải đun sẵn nhiều phần.' }),
    lv(11, 'Lò xong phải lấy liền', 'Ràng buộc: nồi cháo xong không tự sang kệ', { dishes: CHAO2, count: 6, patience: 170, seconds: 205,
      constraints: { noStack: true },
      hint: 'Cháo xong nằm lại trên lò, chiếm chỗ. Múc ra ngay.' }),
    lv(12, 'Tủ topping đổi bên', 'Bố trí mới: thớt cắt quẩy đổi bên', { dishes: CHAO2, count: 6, patience: 170, seconds: 205,
      layout: 'left-topping', hint: 'Thớt nằm trên tủ topping nên cũng đổi bên.' }),
    lv(13, 'Khách sộp', 'Sự kiện: khách VIP tip gấp ba nhưng chờ ít, mà cháo thì lâu', { dishes: CHAO2, count: 6, patience: 165, seconds: 210,
      events: [{ at: 0.4, kind: 'vip' }],
      hint: 'Khách viền vàng chờ ít — chỉ nhận nổi nếu đã có cháo sẵn trên kệ.' }),
    lv(14, 'Cơn mưa', 'Sự kiện: mưa — vắng rồi ào vô, đúng lúc cháo chưa kịp đun', { dishes: CHAO2, count: 7, patience: 165, seconds: 215,
      events: [{ at: 0.3, kind: 'rain' }],
      hint: 'Lúc mưa vắng khách chính là lúc đun sẵn cả hai loại cháo.' }),
    lv(15, '⭐ Một tay', 'Thử thách: chỉ cầm một thứ mỗi chuyến', { dishes: CHAO2, count: 5, patience: 175, seconds: 215,
      constraints: { handCapacity: 1 }, challenge: { kind: 'rush' },
      hint: 'Một tay: tô, cháo, quẩy là ba chuyến. Đun và cắt sẵn hết trước.' }),
    lv(16, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ra giữa quán + đoàn 4 người', { dishes: CHAO2, count: 6, patience: 175, seconds: 240,
      layout: 'island', challenge: { kind: 'boss', group: 4 },
      hint: 'Bốn tô cháo cùng lúc = bốn nồi. Đun sẵn từ lúc chuẩn bị.' }),
  ],
};

// ============================== WORLD 7 — KHAI VỊ (16 level) ==============================
const CG = ['cha-gio-viet-nam'], GC = ['goi-cuon-tom-thit'], KV2 = ['cha-gio-viet-nam', 'goi-cuon-tom-thit'];
const W_KV = {
  id: 'khai-vi', name: 'Khai vị', icon: '🥢', sub: 'Chả giò & gỏi cuốn', dishes: KV2,
  levels: [
    lv(1, 'Dĩa chả giò đầu tiên', 'Trạm mới: CHẢO CHIÊN — chả giò chiên sẵn, chỉ việc bày dĩa', { dishes: CG, count: 2, patience: 200, seconds: 120, prep: 12,
      simplify: { skipPrep: true, maxSteps: 2, noSpoil: true },
      hint: 'Khai vị dùng dĩa dài. Hôm nay chả giò đã chiên và cắt sẵn — lấy dĩa, bỏ chả giò lên.' }),
    lv(2, 'Thêm đồ chua', 'Đủ dĩa: chả giò cắt chéo + đồ chua', { dishes: CG, count: 3, patience: 190, seconds: 140,
      simplify: { skipPrep: true, noSpoil: true },
      hint: 'Dĩa dài → chả giò → đồ chua.' }),
    lv(3, 'Ra thớt cắt chéo', 'Chả giò phải tự cắt chéo ở thớt', { dishes: CG, count: 3, patience: 185, seconds: 160,
      simplify: { noSpoil: true, skipFry: true },
      hint: 'Chiên xong lấy ra thớt cắt chéo rồi mới bày dĩa.' }),
    lv(4, 'Tự chiên', 'Đủ bước thật: 2 cây chả giò vô chảo, lửa nhỏ, chờ chín', { dishes: CG, count: 4, patience: 180, seconds: 180,
      hint: 'Chảo chiên: bỏ 2 cây chả giò, chiên ngập dầu lửa nhỏ (chạy nền) → lấy ra thớt cắt chéo → bày dĩa.' }),
    lv(5, '⭐ Ba dĩa một lúc', 'Thử thách: 3 dĩa — chảo chỉ chiên được một mẻ', { dishes: CG, count: 3, patience: 180, seconds: 185,
      challenge: { kind: 'rush' }, hint: 'Chiên mất thời gian nhất — bỏ chảo ngay từ lúc chuẩn bị.' }),
    lv(6, 'Gỏi cuốn tôm thịt', 'Món mới: nhúng bánh tráng ở bồn, cuốn ở thớt', { dishes: GC, count: 4, patience: 190, seconds: 195,
      unlocks: { dish: 'goi-cuon-tom-thit' },
      hint: 'Nhúng bánh tráng ở bồn → thớt: 2 miếng thịt luộc xếp ngang → 4 con tôm → bún lên thịt → gấp 2 mép → 2 lá xà lách → cuốn, cắt đôi, bày dĩa dài.' }),
    lv(7, 'Hai món xen nhau', 'Một món chiên, một món cuốn — hai trạm khác nhau', { dishes: KV2, count: 5, patience: 175, seconds: 200, mix: true,
      hint: 'Chả giò thì chiên (chờ nền), gỏi cuốn thì cuốn tay. Bỏ chảo trước rồi đi cuốn.' }),
    lv(8, 'Sạch năm dĩa', 'Mục tiêu mới: 5 dĩa không sai thứ tự cuốn', { dishes: KV2, count: 6, patience: 180, seconds: 205,
      goal: { kind: 'clean', bowls: 5 },
      hint: 'Gỏi cuốn sai thứ tự là hỏng cuốn: thịt → tôm → bún → gấp mép → xà lách.' }),
    lv(9, 'Tủ topping đổi bên', 'Bố trí mới: thớt cuốn và tủ topping sang bên kia', { dishes: KV2, count: 6, patience: 175, seconds: 205,
      layout: 'left-topping', hint: 'Bồn nhúng bánh tráng và thớt giờ ở hai đầu — tính đường đi.' }),
    lv(10, 'Đợt trưa', 'Đợt trưa dồn khách mà chảo chỉ có một', { dishes: KV2, count: 6, patience: 170, seconds: 210,
      challenge: { kind: 'lunch' },
      hint: 'Chảo là nút thắt. Chiên liên tục, xen kẽ cuốn gỏi trong lúc chờ.' }),
    lv(11, 'Một tay', 'Ràng buộc: chỉ cầm một thứ mỗi chuyến', { dishes: KV2, count: 5, patience: 180, seconds: 210,
      constraints: { handCapacity: 1 },
      hint: 'Gỏi cuốn cần nhiều thứ — một tay thì phải đi đúng thứ tự.' }),
    lv(12, 'Khách đổi ý', 'Sự kiện: khách đổi từ chả giò sang gỏi cuốn (hoặc ngược lại)', { dishes: KV2, count: 6, patience: 175, seconds: 210,
      events: [{ at: 0.5, kind: 'change-order' }],
      hint: 'Dĩa đang làm vẫn giữ được cho khách sau gọi đúng món.' }),
    lv(13, 'Khách sộp', 'Sự kiện: khách VIP tip gấp ba, mà chiên thì lâu', { dishes: KV2, count: 6, patience: 170, seconds: 215,
      events: [{ at: 0.4, kind: 'vip' }],
      hint: 'Muốn kịp khách sộp thì luôn có một mẻ đang chiên sẵn.' }),
    lv(14, 'Không vứt gì', 'Mục tiêu mới: không bỏ phí cuốn nào', { dishes: KV2, count: 7, patience: 175, seconds: 220,
      goal: { kind: 'no-waste' },
      hint: 'Đừng cuốn dư hay chiên dư khi không có khách gọi.' }),
    lv(15, '⭐ Chỉ gỏi cuốn, một tay', 'Thử thách: chỉ gỏi cuốn, cầm một thứ mỗi chuyến', { dishes: GC, count: 5, patience: 185, seconds: 220,
      challenge: { kind: 'only', dish: 'goi-cuon-tom-thit' }, constraints: { handCapacity: 1 },
      hint: 'Sáu bước cuốn mà một tay — thuộc thứ tự là qua.' }),
    lv(16, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ra giữa quán + đoàn 4 người', { dishes: KV2, count: 6, patience: 180, seconds: 240,
      layout: 'island', challenge: { kind: 'boss', group: 4 },
      hint: 'Đoàn 4 người gọi khai vị — chiên sẵn và cuốn sẵn trước khi họ tới.' }),
  ],
};

// ============================== WORLD 8 — CHẢ CÁ LÃ VỌNG (12 level) ==============================
const CCLV = ['cha-ca-la-vong'];
const W_CCLV = {
  id: 'cha-ca', name: 'Chả cá Lã Vọng', icon: '🍳', sub: 'Bảy phần trên một mâm', dishes: CCLV,
  levels: [
    lv(1, 'Ba chén đầu tiên', 'Món mâm: không tô không sợi — làm từng chén nhỏ, hôm nay pha sẵn', { dishes: CCLV, count: 2, patience: 210, seconds: 130, prep: 12,
      simplify: { skipPrep: true, maxSteps: 3, noSpoil: true },
      hint: 'Chả cá Lã Vọng là một mâm gồm nhiều chén. Hôm nay các chén pha sẵn — chỉ việc bày: mắm tôm, chanh, đậu phộng.' }),
    lv(2, 'Năm phần', 'Thêm chén ớt và chén rau', { dishes: CCLV, count: 3, patience: 200, seconds: 155,
      simplify: { skipPrep: true, maxSteps: 5, noSpoil: true },
      hint: 'Thêm chén ớt đỏ và chén rau (kinh giới, tía tô, bạc hà).' }),
    lv(3, 'Đủ bảy phần', 'Đủ mâm: thêm dĩa thì là và chảo áp cá', { dishes: CCLV, count: 3, patience: 195, seconds: 175,
      simplify: { skipPrep: true, noSpoil: true },
      hint: 'Đủ 7 phần: mắm tôm → chanh → đậu phộng → ớt → rau → dĩa thì là → chảo áp cá.' }),
    lv(4, 'Tự làm từng chén', 'Đủ bước thật: mỗi chén phải tự pha ở thớt', { dishes: CCLV, count: 3, patience: 195, seconds: 195,
      hint: 'Từ đây tự làm: chén mắm tôm rưới mỡ hành, nhặt lá vào chén rau, bày dĩa thì là + gốc hành + hành tây, bỏ hành tây + thì là vào chảo áp cá.' }),
    lv(5, '⭐ Ba mâm một lúc', 'Thử thách: 3 mâm — mỗi mâm 7 phần', { dishes: CCLV, count: 3, patience: 200, seconds: 210,
      challenge: { kind: 'rush' }, hint: 'Làm theo loại: pha 3 chén mắm tôm một lượt rồi tới chén khác.' }),
    lv(6, 'Xong trước giờ', 'Mục tiêu mới: phục vụ hết khách TRƯỚC khi hết giờ sớm', { dishes: CCLV, count: 4, patience: 200, seconds: 220,
      goal: { kind: 'before', seconds: 150 },
      hint: 'Món này không có thứ tự bắt buộc — cứ làm gọn và nhanh.' }),
    lv(7, 'Tủ topping đổi bên', 'Bố trí mới: thớt và tủ topping sang bên kia bếp', { dishes: CCLV, count: 4, patience: 195, seconds: 215,
      layout: 'left-topping', hint: 'Mọi chén đều làm ở thớt — thớt đổi bên là đổi cả lộ trình.' }),
    lv(8, 'Một tay', 'Ràng buộc: chỉ cầm một thứ mỗi chuyến', { dishes: CCLV, count: 4, patience: 200, seconds: 220,
      constraints: { handCapacity: 1 },
      hint: 'Bảy phần mà một tay — làm xong chén nào bày chén đó.' }),
    lv(9, 'Khách sộp', 'Sự kiện: khách VIP tip gấp ba nhưng chờ ít', { dishes: CCLV, count: 5, patience: 190, seconds: 220,
      events: [{ at: 0.4, kind: 'vip' }],
      hint: 'Món đắt nhất quán mà khách sộp thì tip gấp ba — ưu tiên làm trước.' }),
    lv(10, 'Cơn mưa', 'Sự kiện: mưa — vắng rồi ào vô', { dishes: CCLV, count: 5, patience: 190, seconds: 225,
      events: [{ at: 0.3, kind: 'rain' }],
      hint: 'Lúc vắng thì pha sẵn chén để dành.' }),
    lv(11, 'Không vứt gì', 'Mục tiêu mới: không bỏ phí chén nào', { dishes: CCLV, count: 5, patience: 195, seconds: 225,
      goal: { kind: 'no-waste' },
      hint: 'Pha vừa đủ — chén pha dư mà không có khách là phí.' }),
    lv(12, '⭐ Cuối tuần — đoàn khách', 'Thử thách cuối: quầy ra giữa quán + đoàn 4 người, 28 phần', { dishes: CCLV, count: 5, patience: 200, seconds: 260,
      layout: 'island', challenge: { kind: 'boss', group: 4 },
      hint: 'Bốn mâm cùng lúc là 28 phần. Pha sẵn từ lúc chuẩn bị, làm theo loại chén.' }),
  ],
};

export const WORLD_DEFS = [W_PHO, W_RIEU, W_BBH, W_HP, W_KHO, W_CHAO, W_KV, W_CCLV];

/**
 * Ráp WORLDS đầy đủ: điền id/name level, món kế thừa, moneyTargets theo giá, ngưỡng sao mở world.
 * `prices`: map món → giá (config.PRICES). Không import config ở đây để tránh vòng lặp import.
 */
export function buildWorlds(prices) {
  let prevMax = 0;
  return WORLD_DEFS.map((w) => {
    let menu = [];
    const levels = w.levels.map((L) => {
      // món: level chỉ ghi món MỚI/đang tập; menu của level = các món đã mở trong world tới lúc đó
      for (const d of L.dishes || []) if (!menu.includes(d)) menu.push(d);
      const dishes = L.dishes && L.dishes.length && L.challenge?.kind === 'only' ? [...L.dishes] : [...menu];
      const avg = dishes.reduce((s, d) => s + (prices[d] ?? 40), 0) / dishes.length;
      const total = avg * (L.count + (L.challenge?.kind === 'boss' ? (L.challenge.group || 0) : 0) + L.pair);
      return { ...L, dishes, world: w.id, id: `${w.id}-${L.n}`, name: `${w.name} ${L.n}`,
        training: !!(L.simplify && Object.keys(L.simplify).length),
        // Mốc sao theo PACE.targets (có combo nhân tiền nên 3 sao phải > 100 % giá gốc = chỉ đạt khi chơi sạch)
        moneyTargets: PACE.targets.map((f) => Math.max(10, Math.round(total * f / 10) * 10)) };
    });
    levels.forEach((L, i) => applyPace(L, i, levels.length));   // nhịp thật: kiên nhẫn / giờ ca / cao điểm theo tốc độ bot
    const starsToUnlock = Math.floor(prevMax * 3 * 0.6 / 5) * 5;
    prevMax = w.levels.length;
    return { ...w, levels, maxStars: levels.length * 3, starsToUnlock };
  });
}
