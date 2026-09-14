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

// ============================================================
//  NGÀY Ở QUÁN (KJ's Choices) — vòng chơi chính. Mỗi ngày mở đúng MỘT thứ mới (món / khách quen / cơ chế),
//  nhịp: trưa đông → xế thở → chiều đông (docs/GAME-DESIGN.md §1, §5). Khách sinh có seed theo ngày → chơi lại thấy quen.
// ============================================================
export const DAY_SECONDS = 240;
// [ngày, món mới (null = không), ghi chú cơ chế]
const DAY_PLAN = [
  [1, 'pho-tai-nam', 'Mở quán — phở tái nạm'], [2, 'bun-rieu-cua', 'Thêm bún riêu cua — nấu nước ở lò'], [3, 'bun-bo-hue', 'Thêm bún bò Huế — nhiều nước cùng lúc'],
  [4, 'pho-dac-biet', 'Thêm phở đặc biệt'], [5, null, 'Khách đi cặp'], [6, 'bun-cha-ha-noi', 'Thêm bún chả Hà Nội — món khô, mẹt'], [7, null, 'Cuối tuần — đoàn khách'],
  [8, 'bun-ca-hai-phong', 'Thêm bún cá Hải Phòng'], [9, 'banh-da-cua', 'Thêm bánh đa cua'], [10, 'pho-tai-dap', 'Thêm phở tái đập'], [11, 'pho-suon-tai', 'Thêm phở sườn tái — lò vi sóng'],
  [12, 'bun-dau-mam-tom', 'Thêm bún đậu mắm tôm'], [13, 'banh-hoi-thit-heo', 'Thêm bánh hỏi thịt heo'], [14, null, 'Cuối tuần — đoàn khách'],
  [15, 'bun-nem-cua-thit-nuong-tom-nuong', 'Thêm bún nem cua thịt nướng'], [16, 'bun-ga-nuong', 'Thêm bún gà nướng'], [17, 'chao-long', 'Thêm cháo lòng'], [18, 'chao-suon', 'Thêm cháo sườn'],
  [19, 'cha-ca-la-vong', 'Thêm chả cá Lã Vọng'], [20, 'cha-gio-viet-nam', 'Thêm chả giò — chảo chiên'], [21, 'goi-cuon-tom-thit', 'Cuối tuần — thêm gỏi cuốn tôm thịt'],
];
function seeded(seed) { let s = seed * 2654435761 % 4294967296 || 1; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const TYPES = ['office', 'xeom', 'tourist'];
/** Sinh danh sách khách của một ngày theo 3 pha: trưa (2–42 %), xế (42–62 %), chiều (62–92 %). `regulars` = id khách quen ghé hôm nay. */
export function makeDayArrivals(day, dishes, newDish, regulars, seconds = DAY_SECONDS) {
  const rnd = seeded(day); const n = Math.min(14, 6 + day); const weekend = day % 7 === 0;
  const spread = (k, a, b) => Array.from({ length: k }, (_, i) => Math.round(seconds * (a + (b - a) * (i + 0.3 + rnd() * 0.4) / k)));
  const nLunch = Math.round(n * 0.55), nLull = Math.max(1, Math.round(n * 0.1)), nAft = Math.max(1, n - nLunch - nLull);
  const ts = [...spread(nLunch, 0.02, 0.42), ...spread(nLull, 0.44, 0.6), ...spread(nAft, 0.62, 0.9)];
  const arr = ts.map((t, i) => ({ t, type: TYPES[Math.floor(rnd() * TYPES.length)], patience: 95 + Math.round(rnd() * 35), dish: newDish && rnd() < 0.4 ? newDish : undefined }));
  // khách quen thay chỗ vài khách lạ: người lẻ vào trưa, người chẵn vào chiều
  regulars.forEach((rid, i) => { const pool = arr.filter((a) => (i % 2 ? a.t < seconds * 0.42 : a.t > seconds * 0.62) && !a.regular); const a = pool[Math.floor(rnd() * pool.length)] || arr[i % arr.length]; a.regular = rid; delete a.dish; });
  if (day >= 5) { const a = arr.find((x) => !x.regular && x.t > seconds * 0.1 && x.t < seconds * 0.4); if (a) arr.push({ ...a, t: a.t + 1, group: 'pair', regular: undefined, dish: undefined }); }   // cặp: hai người tới cách 1 s
  if (weekend) { const t0 = Math.round(seconds * 0.64); for (let k = 0; k < 4; k++) arr.push({ t: t0 + k, type: TYPES[k % 3], patience: 150, group: 'tour' }); }   // đoàn 4 người (3 bàn → người thứ 4 chờ ghế)
  return arr.sort((a, b) => a.t - b.t);
}
export const DAYS = (() => { const menu = []; return DAY_PLAN.map(([id, dish, note]) => {
  if (dish) menu.push(dish); const dishes = [...menu]; const avg = dishes.reduce((s, d) => s + PRICES[d], 0) / dishes.length;
  const n = Math.min(14, 6 + id) + (id >= 5 ? 1 : 0) + (id % 7 === 0 ? 4 : 0); const pot = Math.round(avg * n);
  return { id: `day-${id}`, day: id, name: `Ngày ${id}`, note, newDish: dish, weekend: id % 7 === 0, seconds: Math.min(DAY_SECONDS, 180 + id * 10), prep: 20, dishes, moneyTargets: [0.4, 0.6, 0.8].map((f) => Math.round(pot * f / 10) * 10), arrivals: null };   // arrivals sinh lúc bắt đầu ngày (cần biết khách quen)
}); })();
/** Ngày sau ngày cuối: đủ menu, khách dày dần theo số ngày. */
export function dayAfter(id) { const last = DAYS[DAYS.length - 1]; const n = Math.min(16, 6 + id); const avg = last.dishes.reduce((s, d) => s + PRICES[d], 0) / last.dishes.length; const pot = Math.round(avg * n); return { ...last, id: `day-${id}`, day: id, name: `Ngày ${id}`, note: id % 7 === 0 ? 'Cuối tuần — đoàn khách' : 'Đủ menu', newDish: null, weekend: id % 7 === 0, moneyTargets: [0.4, 0.6, 0.8].map((f) => Math.round(pot * f / 10) * 10) }; }

// Nâng cấp bếp mua bằng tiền quán — làm mình NHANH hơn (docs/GAME-DESIGN.md §2). `levels[i]` = giá lên cấp i+1; `apply(mods, lv)` đổi thông số.
export const UPGRADES = [
  { id: 'bowl-stack', name: 'Nồi trụng', icon: '🍜', desc: 'Chồng tô nóng trữ trong nồi: 3 → 4 → 5', unlockDay: 2, levels: [180, 320], apply: (m, lv) => { m.bowlSlots = 3 + lv; } },
  { id: 'burners', name: 'Bếp lò', icon: '🔥', desc: 'Số lò đun nước: 1 → 2 → 3', unlockDay: 3, levels: [220, 420], apply: (m, lv) => { m.burners = 1 + lv; } },
  { id: 'fire', name: 'Lửa lớn', icon: '♨️', desc: 'Nước lèo nóng nhanh hơn 15 % mỗi cấp', unlockDay: 4, levels: [200, 380], apply: (m, lv) => { m.heatMult = 1 - 0.15 * lv; } },
  { id: 'seats', name: 'Thêm bàn', icon: '🪑', desc: 'Bàn cho khách: 3 → 4 → 5', unlockDay: 5, levels: [300, 550], apply: (m, lv) => { m.seats = 3 + lv; } },
  { id: 'shoes', name: 'Dép bếp êm', icon: '🩴', desc: 'Đi lại nhanh hơn 12 % mỗi cấp', unlockDay: 6, levels: [260, 480], apply: (m, lv) => { m.speedMult = 1 + 0.12 * lv; } },
];
export const DECOR_PATIENCE = 0.06;   // mỗi món trang trí: khách kiên nhẫn thêm 6 %
/** Thông số bếp sau nâng cấp/trang trí: { bowlSlots, burners, heatMult, seats, speedMult, patienceMult }. */
export function modsFor(upLevels = {}, decorCount = 0) { const m = { bowlSlots: 3, burners: 1, heatMult: 1, seats: 3, speedMult: 1, patienceMult: 1 + DECOR_PATIENCE * decorCount }; for (const u of UPGRADES) if (upLevels[u.id]) u.apply(m, Math.min(u.levels.length, upLevels[u.id])); return m; }
// Survival: đủ 16 món, khách tới mãi, càng lâu càng dày (gap giảm mỗi khách), `lives` khách bỏ đi là thua. Điểm ×1.5.
export const SURVIVAL = { id: 'survival', name: 'Survival — đủ menu', survival: true, seconds: Infinity, dishes: ALL_DISHES, moneyTargets: [1e9, 1e9, 1e9], arrivals: [], prep: 15, startGap: 42, minGap: 18, gapDecay: 1.5, patience: 170, lives: 3 };
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

export function kitchenFor(portrait) { return portrait ? KITCHEN_PORTRAIT : KITCHEN_LANDSCAPE; }
export const KITCHEN = KITCHEN_LANDSCAPE; // mặc định (test)

export const CAMERA = { fov: 38, height: 11, back: 8.5, lookAtZ: 0.4 };
