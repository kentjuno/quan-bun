import { buildWorlds } from './data/worlds.js';

// ============================================================
//  THÔNG SỐ CÂN BẰNG & BỐ TRÍ BẾP — sửa ở đây, không sửa trong logic.
//  Đơn vị: mét, giây, nghìn đồng.
// ============================================================

export const CHEF = {
  speed: 3.5,          // m/s
  handCapacity: 2,     // số thứ cầm được cùng lúc
  queueMax: 3,         // số việc chờ trong hàng đợi
  radius: 0.35,
};

// Thời gian thao tác trong game (giây). Rút ngắn từ bếp thật nhưng GIỮ tỉ lệ & thứ tự.
// Tên khoá = action id trong sim-data.js.
export const ACTION_TIME = {
  'blanch-noodle': 4,        // trụng lần 1 (passive: chạy nền trên nồi)
  'blanch-noodle-once': 4,   // bún bò: trụng một lần
  'cold-rinse': 2,           // xả lạnh (active: đứng làm)
  'reblanch': 1.5,           // trụng nóng lại + để ráo (gộp drain)
  'blanch-bowl': 1.5,        // trụng tô (passive: tô nằm trong nồi nóng, trữ được)
  'blanch-beef-ball': 3,     // passive
  'heat-soup': 6,            // passive — đun nước lèo trên lò
  'pour-pho-broth': 1.5,
  'pour-crab-broth': 1.5,
  'pour-bun-bo-broth': 1.5,
  'microwave-rib': 5,        // passive (thật 6 phút)
  'cut-rib': 2, 'warm-rib': 2, 'prepare-two-bowls': 1.5, 'pound-beef': 2.5,
  'blanch-veg': 2, 'cut-crab-cake': 1.5, 'cut-dill': 2, 'deep-fry': 8, 'cut-diagonal': 2, 'soak-rice-paper': 2, 'cut-fish-cake': 1.5, 'blanch-banh-hoi': 3,
  'prepare-tray': 1.5, 'cut-salad': 2.5, 'cut-youtiao': 1.5, 'pour-porridge': 1.5, 'heat-porridge': 6,
  'make-chen-chanh': 1.5, 'make-chen-dau-phong': 1.5, 'make-chen-ot': 1.5, 'make-chen-mam-tom': 2, 'pick-herbs': 2, 'make-dia-thi-la': 2, 'fill-ca-pan': 2,
  default: 1.5,
};

// Nồi trụng (theo bếp thật của Kent): sợi trụng lần 1 tối đa 3 rọ, tô trụng nóng trữ trong nồi tối đa 5 cái và để bao lâu cũng được.
// Sợi (phở/bún) để trong nồi lâu quá sẽ hư → phải lấy ra đem vứt. noodleSpoilAfter = số giây SAU KHI CHÍN (giá trị game, Kent chưa chốt số thật).
export const POT = { noodleSlots: 3, bowlSlots: 5, noodleSpoilAfter: 25 };
// Lò đun nước lèo (bếp thật, Kent 13/09): phở có nồi sẵn; nước khác lấy nồi nhỏ, cho cốt → huyết → nước, đun (nền) → MỘT phần. Đun xong tự để sang kệ nước (stack, nhiều loại lẫn nhau, tối đa stackMax) → lò trống để đun phần khác.
export const SOUP = { servings: 1, stackMax: 6, distractors: ['nuoc-ca'] };

export const RULES = {
  shiftSeconds: 180,
  prepSeconds: 10,           // chuẩn bị trước khi mở cửa (đồng hồ chưa chạy, khách chưa tới)
  bowlSlots: 2,
  wrongOrderPenalty: 5,      // trừ điểm khi bỏ sai thứ tự (không mất nguyên liệu trong prototype)
  tipOnTime: 0.2,            // +20% nếu phục vụ khi kiên nhẫn > 50%
  tipFast: 0.4,              // +40% nếu > 75%
  leaveLimitFor: [2, 1, 0],  // khách bỏ đi tối đa cho 1/2/3 sao
  starTargets: [1, 2, 3],    // số sao theo ngưỡng bên dưới (tiền)
};

// Game "chill": khách kiên nhẫn gấp đôi bản đầu — mục tiêu là nhớ món, không phải đua.
export const CUSTOMERS = {
  office:  { name: 'Cô công sở', patience: 90,  tipMult: 1.2, color: 0x2a9d8f },
  xeom:    { name: 'Bác xe ôm',  patience: 70,  tipMult: 0.8, color: 0xe84a3b },
  tourist: { name: 'Du khách',   patience: 130, tipMult: 1.6, color: 0xf4a261 },
};

export const PRICES = { 'cha-gio-viet-nam': 30, 'goi-cuon-tom-thit': 32, 'pho-tai-nam': 45, 'pho-dac-biet': 60, 'bun-rieu-cua': 50, 'bun-bo-hue': 55, 'pho-tai-dap': 50, 'pho-suon-tai': 65, 'banh-da-cua': 55, 'bun-ca-hai-phong': 50, 'cha-ca-la-vong': 120, 'bun-dau-mam-tom': 70, 'banh-hoi-thit-heo': 80, 'bun-nem-cua-thit-nuong-tom-nuong': 55, 'bun-ga-nuong': 45, 'bun-cha-ha-noi': 50, 'chao-long': 45, 'chao-suon': 40 };

// Level: khách tới lúc nào, loại gì; món ngẫu nhiên trong `dishes` (hoặc `dish` cố định). Mỗi level thêm món để nhớ dần; qua level (≥1★) mở level kế; tiền + tip → điểm mua trang trí quán.
export const ALL_DISHES = Object.keys(PRICES);
const ARR = [{ t: 2, type: 'office' }, { t: 30, type: 'xeom' }, { t: 60, type: 'office' }, { t: 85, type: 'tourist' }, { t: 115, type: 'xeom' }, { t: 140, type: 'office' }];
const ARR_LONG = ARR.map((a, i) => ({ ...a, t: a.t + i * 8, patience: 170 }));   // ca món phức tạp: khách kiên nhẫn hơn, tới thưa hơn
export const LEVELS = [
  { id: 1, name: 'Level 1 — Mở hàng', seconds: 180, dishes: ['pho-tai-nam'], moneyTargets: [120, 200, 280], arrivals: ARR_LONG },
  { id: 2, name: 'Level 2 — Thêm phở đặc biệt', seconds: 180, dishes: ['pho-tai-nam', 'pho-dac-biet'], moneyTargets: [130, 220, 300], arrivals: ARR.map((a, i) => ({ ...a, dish: i % 2 ? 'pho-dac-biet' : 'pho-tai-nam' })) },
  { id: 3, name: 'Level 3 — Thêm bún riêu cua', seconds: 180, dishes: ['pho-tai-nam', 'pho-dac-biet', 'bun-rieu-cua'], moneyTargets: [130, 220, 300], arrivals: ARR.map((a, i) => ({ ...a, dish: ['bun-rieu-cua', 'pho-tai-nam', 'bun-rieu-cua', 'pho-dac-biet', 'bun-rieu-cua', 'pho-tai-nam'][i] })) },
  { id: 4, name: 'Level 4 — Thêm bún bò Huế', seconds: 180, dishes: ['pho-tai-nam', 'pho-dac-biet', 'bun-rieu-cua', 'bun-bo-hue'], moneyTargets: [140, 240, 340], arrivals: ARR.map((a, i) => ({ ...a, dish: ['bun-bo-hue', 'bun-rieu-cua', 'bun-bo-hue', 'pho-tai-nam', 'bun-bo-hue', 'pho-dac-biet'][i] })) },
  // các ca sau: bao phủ hết 16 món có quy trình trong sim-data (món ra ngẫu nhiên theo trọng số tiến độ)
  { id: 5, name: 'Level 5 — Món khô (mẹt & tô khô)', seconds: 240, dishes: ['bun-dau-mam-tom', 'banh-hoi-thit-heo', 'bun-cha-ha-noi', 'bun-nem-cua-thit-nuong-tom-nuong', 'bun-ga-nuong'], moneyTargets: [150, 260, 360], arrivals: ARR_LONG },
  { id: 6, name: 'Level 6 — Phở nâng cao', seconds: 240, dishes: ['pho-tai-nam', 'pho-tai-dap', 'pho-suon-tai'], moneyTargets: [150, 250, 340], arrivals: ARR_LONG },
  { id: 7, name: 'Level 7 — Hải Phòng', seconds: 240, dishes: ['bun-rieu-cua', 'banh-da-cua', 'bun-ca-hai-phong'], moneyTargets: [150, 250, 340], arrivals: ARR_LONG },
  { id: 8, name: 'Level 8 — Cháo', seconds: 240, dishes: ['chao-long', 'chao-suon'], moneyTargets: [120, 200, 280], arrivals: ARR_LONG },
  { id: 9, name: 'Level 9 — Chả cá Lã Vọng', seconds: 240, dishes: ['cha-ca-la-vong'], moneyTargets: [120, 240, 360], arrivals: ARR_LONG.slice(0, 4) },
  { id: 10, name: 'Level 10 — Khai vị', seconds: 240, dishes: ['cha-gio-viet-nam', 'goi-cuon-tom-thit'], moneyTargets: [90, 150, 210], arrivals: ARR_LONG },
];
export const SHIFTS = LEVELS;   // tên cũ (tests, par)
// Survival: đủ 18 món, khách tới mãi, càng lâu càng dày (gap giảm mỗi khách), `lives` khách bỏ đi là thua. Tiền ×1.5.
export const SURVIVAL = { id: 'survival', name: 'Survival — đủ menu', survival: true, seconds: Infinity, dishes: ALL_DISHES, moneyTargets: [1e9, 1e9, 1e9], arrivals: [], prep: 15, startGap: 42, minGap: 18, gapDecay: 1.5, patience: 170, lives: 3 };

// Nâng cấp bếp mua bằng tiền quán — làm mình NHANH hơn (docs/PLAN-WORLDS.md §4). Mở bán theo TỔNG sao đã kiếm.
export const UPGRADES = [
  { id: 'bowl-stack', name: 'Nồi trụng', icon: '🍜', desc: 'Chồng tô nóng trữ trong nồi: 3 → 4 → 5', unlockStars: 8, levels: [180, 320], apply: (m, lv) => { m.bowlSlots = 3 + lv; } },
  { id: 'seats', name: 'Thêm bàn', icon: '🪑', desc: 'Bàn cho khách: 3 → 4 → 5', unlockStars: 14, levels: [300, 550], apply: (m, lv) => { m.seats = 3 + lv; } },
  { id: 'burners', name: 'Bếp lò', icon: '🔥', desc: 'Số lò đun nước: 1 → 2 → 3', unlockStars: 20, levels: [220, 420], apply: (m, lv) => { m.burners = 1 + lv; } },
  { id: 'fire', name: 'Lửa lớn', icon: '♨️', desc: 'Nước lèo nóng nhanh hơn 15 % mỗi cấp', unlockStars: 26, levels: [200, 380], apply: (m, lv) => { m.heatMult = 1 - 0.15 * lv; } },
  { id: 'shoes', name: 'Dép bếp êm', icon: '🩴', desc: 'Đi lại nhanh hơn 12 % mỗi cấp', unlockStars: 32, levels: [260, 480], apply: (m, lv) => { m.speedMult = 1 + 0.12 * lv; } },
];
export const DECOR_PATIENCE = 0.06;   // mỗi món trang trí: khách kiên nhẫn thêm 6 %
/** Thông số bếp sau nâng cấp/trang trí: { bowlSlots, burners, heatMult, seats, speedMult, patienceMult }. */
export function modsFor(upLevels = {}, decorCount = 0) { const m = { bowlSlots: 3, burners: 1, heatMult: 1, seats: 3, speedMult: 1, patienceMult: 1 + DECOR_PATIENCE * decorCount }; for (const u of UPGRADES) if (upLevels[u.id]) u.apply(m, Math.min(u.levels.length, upLevels[u.id])); return m; }

// Trang trí quán mua bằng điểm (view.js dựng). Chỉ là "áo" — không ảnh hưởng chơi.
export const DECOR = [
  { id: 'cay-canh', name: 'Cây cảnh', icon: '🪴', cost: 150, desc: '2 chậu cây trước quán' },
  { id: 'den-long', name: 'Đèn lồng', icon: '🏮', cost: 250, desc: 'Dây đèn lồng đỏ trên tường' },
  { id: 'bang-hieu', name: 'Bảng hiệu', icon: '🪧', cost: 300, desc: 'Bảng "KJ\'s Choices" treo tường' },
  { id: 'tranh', name: 'Tranh treo', icon: '🖼️', cost: 350, desc: 'Tranh sơn dầu phố cổ' },
  { id: 'gach-hoa', name: 'Gạch hoa', icon: '🟫', cost: 450, desc: 'Sàn gạch bông hai màu' },
  { id: 'be-ca', name: 'Bể cá', icon: '🐠', cost: 600, desc: 'Bể cá cạnh quán' },
  { id: 'tuong-vang', name: 'Sơn tường vàng', icon: '🎨', cost: 500, desc: 'Tường vàng nghệ kiểu Hội An' },
  { id: 'hoa-mai', name: 'Chậu mai', icon: '🌼', cost: 800, desc: 'Mai vàng nở rộ trước cửa' },
];
// Kệ (danh sách đầy đủ; mỗi ca chỉ bày thứ các món trong ca cần + alwaysShow)
const SHELF_NOODLE = ['pho-noodle', 'bun', 'bun-to', 'banh-da', 'banh-hoi'];
const SHELF_BOWL = ['pho-bowl', 'soup-bowl', 'dry-bowl', 'extra-bowl', 'serving-plate', 'dia-lon', 'dia-dai', 'tray', 'tray-paper', 'chao-ap-ca', 'banh-trang'];
export const SHELF_TOPPING = ['nam', 'bo-tai', 'la-sach', 'bo-vien', 'thit-luoc', 'bap-bo', 'cha-lua', 'cha-re', 'ca-chua', 'dau-hu', 'tom', 'hanh-tay', 'ngo-ri-ngo-gai', 'hanh-la', 'rau-ram',
  'gung', 'suon-cay', 'rau-muong', 'can-nuoc', 'cha-cua', 'bo-la-lot', 'cha-hap', 'cha-chien', 'top-mo', 'hanh-phi', 'ca-chien', 'cha-ca', 'thi-la',
  'nuoc-cot-chanh', 'dau-phong-rang', 'ot-do', 'mam-tom', 'mo-hanh', 'kinh-gioi', 'tia-to', 'bac-ha', 'goc-hanh-la', 'xa-lach', 'dua-leo', 'xoai', 'thit-nuong', 'do-chua', 'quay', 'chao-long', 'chao-suon', 'cha-gio', 'tom-luoc'];
const FRYER_DISHES = ['cha-gio-viet-nam'];
const PREP_DISHES = ['cha-gio-viet-nam', 'goi-cuon-tom-thit', 'pho-tai-dap', 'pho-suon-tai', 'banh-da-cua', 'bun-ca-hai-phong', 'cha-ca-la-vong', 'bun-dau-mam-tom', 'banh-hoi-thit-heo', 'bun-cha-ha-noi', 'bun-nem-cua-thit-nuong-tom-nuong', 'bun-ga-nuong', 'chao-long', 'chao-suon'];
const BURNER_DISHES = ['bun-rieu-cua', 'bun-bo-hue', 'banh-da-cua', 'bun-ca-hai-phong', 'chao-long', 'chao-suon'];

// Bố trí bếp (lưới mét, gốc ở giữa sàn; +z hướng về phía khách/camera).
// type: shelf (kệ: items[]), pot (nồi trụng), sink (bồn xả), stove (bếp/nước lèo: broth = action chan), counter (quầy ráp), serve (quầy giao), seat (ghế khách), trash
// `dishes`: trạm chỉ xuất hiện khi ca có món đó → bếp lớn dần theo ca. Hai bố trí: ngang (PC/web) và dọc (điện thoại).
export const KITCHEN_LANDSCAPE = {
  size: { w: 11, d: 7 },
  stations: [
    { id: 'shelf-noodle',  type: 'shelf', label: 'Kệ sợi',   x: -4.5, z: -2.6, w: 1, d: 1.9, items: SHELF_NOODLE, alwaysShow: ['pho-noodle', 'bun', 'bun-to'] },
    { id: 'shelf-bowl',    type: 'shelf', label: 'Kệ tô',    x: -4.5, z: 0.3, w: 1, d: 2.4, items: SHELF_BOWL, alwaysShow: ['pho-bowl', 'soup-bowl'] },
    { id: 'microwave',     type: 'microwave', label: 'Lò vi sóng', x: -3.0, z: 0.6, w: 0.8, d: 0.8, dishes: ['pho-suon-tai'] },
    { id: 'fryer',         type: 'fryer',     label: 'Chảo chiên', x: -3.0, z: 1.8, w: 0.8, d: 0.8, dishes: FRYER_DISHES },
    { id: 'prep',          type: 'prep',  label: 'Thớt',     x: 4.7,  z: 0.0, w: 1, d: 5.2, boards: 2, dishes: PREP_DISHES, onTable: 'shelf-topping' },   // thớt nằm trên mặt tủ topping (như tiệm)
    { id: 'pot',           type: 'pot',   label: 'Nồi trụng', x: -2.6, z: -2.7, w: 2.0, d: 1 },   // rộng để 3 rọ + chồng tô xếp một hàng
    { id: 'sink',          type: 'sink',  label: 'Bồn xả lạnh', x: -0.9, z: -2.7, w: 1.1, d: 1 },
    { id: 'stove',         type: 'stove', label: 'Nước phở',  x: 0.5,  z: -2.7, w: 1.2, d: 1, broth: 'pour-pho-broth' },
    { id: 'burner',        type: 'burner', label: 'Lò đun',   x: 2.3,  z: -2.7, w: 1.6, d: 1, burners: 2, dishes: BURNER_DISHES },
    // MỘT kệ topping chung cho cả thịt lẫn rau (như bếp thật); chỉ bày thứ các món trong ca cần + vài thứ gây nhiễu
    { id: 'shelf-topping', type: 'shelf', label: 'Kệ topping', x: 4.7, z: 0.0, w: 1, d: 5.2, items: SHELF_TOPPING, alwaysShow: ['la-sach', 'bo-vien'] },
    { id: 'counter',       type: 'counter', label: 'Quầy ráp', x: 0, z: 0.4, w: 2.6, d: 1, slots: 2 },
    { id: 'trash',         type: 'trash', label: 'Thùng rác', x: -4.5, z: -1.3, w: 0.6, d: 0.6 },   // giữa kệ sợi và kệ tô
    { id: 'seat-0', type: 'seat', x: -1.4, z: 3.6 }, { id: 'seat-1', type: 'seat', x: 0, z: 3.6 }, { id: 'seat-2', type: 'seat', x: 1.4, z: 3.6 },
    { id: 'seat-3', type: 'seat', x: -2.8, z: 3.6, extra: 4 }, { id: 'seat-4', type: 'seat', x: 2.8, z: 3.6, extra: 5 },   // bàn mua thêm (nâng cấp 'seats')
  ],
  chefStart: { x: 0, z: -1.2 },
};

export const KITCHEN_PORTRAIT = {
  size: { w: 7, d: 12 },
  stations: [
    // hàng trên: nồi – bồn – nước phở – lò đun
    { id: 'pot',           type: 'pot',   label: 'Nồi trụng', x: -2.4, z: -5.1, w: 2.0, d: 1 },   // rộng để 3 rọ + chồng tô xếp một hàng
    { id: 'sink',          type: 'sink',  label: 'Bồn xả',    x: -0.75, z: -5.1, w: 1.0, d: 1 },
    { id: 'stove',         type: 'stove', label: 'Nước phở',  x: 0.45, z: -5.1, w: 1.1, d: 1, broth: 'pour-pho-broth' },
    { id: 'burner',        type: 'burner', label: 'Lò đun',   x: 1.8,  z: -5.1, w: 1.3, d: 1, burners: 2, dishes: BURNER_DISHES },
    // kệ bên trái (dọc): sợi, tô — kệ bên phải: topping chung
    { id: 'shelf-noodle',  type: 'shelf', label: 'Kệ sợi',   x: -3.1, z: -2.9, w: 0.8, d: 2.2, items: SHELF_NOODLE, alwaysShow: ['pho-noodle', 'bun', 'bun-to'] },
    { id: 'shelf-bowl',    type: 'shelf', label: 'Kệ tô',    x: -3.1, z: 0.9,  w: 0.8, d: 2.6, items: SHELF_BOWL, alwaysShow: ['pho-bowl', 'soup-bowl'] },
    { id: 'shelf-topping', type: 'shelf', label: 'Kệ topping', x: 3.1, z: -0.4, w: 0.8, d: 7.0, items: SHELF_TOPPING, alwaysShow: ['la-sach', 'bo-vien'] },
    { id: 'microwave',     type: 'microwave', label: 'Lò vi sóng', x: -1.7, z: -2.9, w: 0.8, d: 0.8, dishes: ['pho-suon-tai'] },
    { id: 'fryer',         type: 'fryer',     label: 'Chảo chiên', x: -0.6, z: -2.9, w: 0.8, d: 0.8, dishes: FRYER_DISHES },
    { id: 'prep',          type: 'prep',  label: 'Thớt',     x: 3.1,  z: -0.4, w: 0.8, d: 7.0, boards: 2, dishes: PREP_DISHES, onTable: 'shelf-topping' },
    { id: 'counter',       type: 'counter', label: 'Quầy ráp', x: 0, z: -1.0, w: 2.0, d: 1, slots: 2 },
    { id: 'trash',         type: 'trash', label: 'Thùng rác', x: -3.1, z: -1.0, w: 0.6, d: 0.6 },   // giữa kệ sợi và kệ tô
    { id: 'seat-0', type: 'seat', x: -1.6, z: 4.5 }, { id: 'seat-1', type: 'seat', x: -0.2, z: 4.5 }, { id: 'seat-2', type: 'seat', x: 1.2, z: 4.5 },
    { id: 'seat-3', type: 'seat', x: -1.6, z: 5.9, extra: 4 }, { id: 'seat-4', type: 'seat', x: 1.2, z: 5.9, extra: 5 },   // bàn mua thêm (nâng cấp 'seats')
  ],
  chefStart: { x: 0, z: -2.6 },
};

// ============================================================
//  BIẾN THỂ BỐ TRÍ BẾP (level.layout) — một trục biến thiên của bậc thang level (docs/PLAN-WORLDS.md §2b).
//  Mỗi biến thể chỉ DỜI CHỖ vài trạm (x/z); nav.js tự tính lại đường đi, view.js tự dựng lại theo world.stations.
//  `land` / `port` = ghi đè theo id trạm cho bố trí ngang / dọc.
// ============================================================
export const KITCHEN_VARIANTS = {
  default: { name: 'Bếp quen', desc: '', land: {}, port: {} },
  'far-pot': { name: 'Nồi ở cuối bếp', desc: 'Nồi trụng nằm xa kệ tô — phải gom việc lại',
    land: { pot: { x: 2.9 }, sink: { x: 0.6 }, stove: { x: -0.9 }, burner: { x: -2.8 } },
    port: { pot: { x: 1.9 }, sink: { x: 0.35 }, stove: { x: -0.7 }, burner: { x: -2.2 } } },
  'left-topping': { name: 'Tủ topping đổi bên', desc: 'Tủ topping, thớt và kệ sợi/tô đổi chỗ cho nhau',
    land: { 'shelf-topping': { x: -4.7 }, prep: { x: -4.7 }, 'shelf-noodle': { x: 4.5 }, 'shelf-bowl': { x: 4.5 }, trash: { x: 4.5 } },
    port: { 'shelf-topping': { x: -3.1 }, prep: { x: -3.1 }, 'shelf-noodle': { x: 3.1 }, 'shelf-bowl': { x: 3.1 }, trash: { x: 3.1 } } },
  island: { name: 'Quầy ra giữa quán', desc: 'Quầy ráp nằm giữa sàn — phải đi vòng',
    land: { counter: { x: 0, z: 1.7 }, 'seat-0': { x: -3.4, z: 3.4 }, 'seat-1': { x: 0, z: 3.9 }, 'seat-2': { x: 3.4, z: 3.4 }, 'seat-3': { x: -4.6, z: 2.2 }, 'seat-4': { x: 4.6, z: 2.2 } },
    port: { counter: { x: 0, z: 1.4 }, 'seat-0': { x: -2.2, z: 4.6 }, 'seat-1': { x: 0.4, z: 5.2 }, 'seat-2': { x: 2.4, z: 4.2 }, 'seat-3': { x: -2.6, z: 2.6 }, 'seat-4': { x: 2.6, z: 2.6 } } },
};
/** Bố trí bếp cho một level: hướng màn hình + biến thể (`level.layout`). */
export function kitchenFor(portrait, layout = 'default') {
  const base = portrait ? KITCHEN_PORTRAIT : KITCHEN_LANDSCAPE;
  const v = KITCHEN_VARIANTS[layout]; const over = v ? (portrait ? v.port : v.land) : null;
  if (!over || !Object.keys(over).length) return base;
  return { ...base, layout, stations: base.stations.map((s) => (over[s.id] ? { ...s, ...over[s.id] } : s)) };
}
export const KITCHEN = KITCHEN_LANDSCAPE; // mặc định (test)

export const CAMERA = { fov: 38, height: 11, back: 8.5, lookAtZ: 0.4 };

// ============================================================
//  WORLDS — vòng chơi chính (docs/PLAN-WORLDS.md). Ladder nằm ở src/data/worlds.js (dữ liệu thuần).
// ============================================================
export const WORLDS = buildWorlds(PRICES);
export const ALL_LEVELS = WORLDS.flatMap((w) => w.levels);
export function worldById(id) { return WORLDS.find((w) => w.id === id) || WORLDS[0]; }
export function levelById(id) { return ALL_LEVELS.find((l) => l.id === id) || null; }
/** Level kế tiếp trong cùng world (null nếu là level cuối). */
export function nextLevel(level) { const w = worldById(level.world); return w.levels[level.n] || null; }
