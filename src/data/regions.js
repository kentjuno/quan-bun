// P2 / M2 — HÀNH TRÌNH Bắc → Nam (docs/ROADMAP.md, docs/PLAN-PUBLIC.md §P2).
// Tỉnh = nhóm quán (world). Mảnh bản đồ = chuyến xe từ tỉnh trước sang tỉnh này (khuôn tools/roadtrip.html).
// KHÔNG đổi id world / level ở đây (tiến độ người chơi treo vào id). Thêm tỉnh / thêm quán = thêm mục ở đây + dishes/ + worlds.js.
// Chữ tiếng Việt ở đây là NGUỒN; bản dịch: i18n/en.json key `prov.<id>.name|sub`, `quan.<world>.name|owner`, `trip.<piece>.title|sub|bubble`.

/**
 * Tỉnh theo thứ tự đi. `worlds`: quán trong tỉnh theo thứ tự mở (quán sau mở khi quán trước đủ `starsToUnlock`).
 * `unlockStars`: tổng ★ cần có ở tỉnh TRƯỚC để xe chạy sang tỉnh này (tỉnh đầu = 0).
 * `piece`: mảnh bản đồ chuyến xe TỚI tỉnh này (null = tỉnh đầu / chưa vẽ).
 * `soon`: chưa có quán (M5) — hiện mờ "sắp mở".
 */
export const PROVINCES = [
  { id: 'ha-noi', name: 'Hà Nội', sub: 'phở · bún chả · bún thang', icon: '🏯', worlds: ['pho', 'mon-kho', 'cha-ca', 'bun-thang'], unlockStars: 0, piece: null },
  { id: 'hai-phong', name: 'Hải Phòng', sub: 'đất cảng · bánh đa cua', icon: '⚓', worlds: ['hai-phong'], unlockStars: 40, piece: 'hn-hp' },
  { id: 'hue', name: 'Huế', sub: 'cố đô · bún bò · bún riêu', icon: '👑', worlds: ['bun-rieu', 'bun-bo'], unlockStars: 20, piece: 'hp-hue' },
  { id: 'da-nang', name: 'Đà Nẵng · Hội An', sub: 'mì Quảng · cao lầu', icon: '🐉', worlds: ['mi-quang'], unlockStars: 30, piece: 'hue-dn' },
  { id: 'nha-trang', name: 'Nha Trang', sub: 'bún chả cá · bánh căn', icon: '🏖️', worlds: ['bun-cha-ca'], unlockStars: 20, piece: 'dn-nt' },
  { id: 'sai-gon', name: 'Sài Gòn', sub: 'gỏi cuốn · chả giò · hủ tiếu', icon: '🌆', worlds: ['chao', 'khai-vi', 'hu-tieu'], unlockStars: 30, piece: 'nt-sg' },
  { id: 'mien-tay', name: 'Miền Tây', sub: 'bún cá Châu Đốc · bánh khọt', icon: '🛶', worlds: [], unlockStars: 20, piece: 'sg-mientay', soon: true },
];

/** Quán = world: tên quán + chủ quán (khách quen cũ lên làm chủ — M2 "chủ quán"). `[cần Kent duyệt]` tên quán. */
export const QUAN = {
  pho: { name: 'Phở Cậu Hai', owner: 'cau-hai', greet: 'Bỏ việc đi học nấu ăn hả? Gan đó. Phở là môn đầu — làm được tô phở tử tế rồi hẵng nói chuyện đi xa.', dare: 'Đứng ca cho ra hồn, đủ sao cậu đưa công thức thật cho mà mang về nấu.' },
  'mon-kho': { name: 'Mẹt Út Mười', owner: 'ut-muoi', greet: 'Anh là người bỏ văn phòng đi học nấu đó hả? Em theo dõi anh trên mạng nè!', dare: 'Mẹt bún chả, bún đậu phải đẹp mới lên hình được. Rau trước bún sau, nhớ nghe.' },
  'cha-ca': { name: 'Chả Cá Lã Vọng', owner: 'chu-tu', greet: 'Quán này trăm năm rồi con. Chả cá không có thứ tự bắt buộc, nhưng bảy phần phải đủ.', dare: 'Làm cho khéo, cho nhanh. Chú không vội nhưng khách thì vội.' },
  'hai-phong': { name: 'Quán Ông Năm', owner: 'ong-nam', greet: 'Tới Hải Phòng rồi hả. Bánh đa đỏ, chả cá, nước cua — đất cảng ăn phải đậm.', dare: 'Ông chạy xe cả ngày, sáng chỉ có mười phút. Làm lẹ mà đúng nghe.' },
  'bun-rieu': { name: 'Riêu Dì Ba', owner: 'di-ba', greet: 'Con đi từ ngoài Bắc vô tới đây học riêu hả? Ngồi xuống, dì kể cho nghe nồi riêu này nấu sao.', dare: 'Cốt cua, huyết, nước — đúng thứ tự thì nước mới trong. Sai một lần là đục cả nồi.' },
  'bun-bo': { name: 'Bún Bò Thím Bảy', owner: 'thim-bay', greet: 'Bún bò Huế phải cay, phải thơm sả, phải đỏ dầu điều. Con ăn cay được không?', dare: 'Nhiều topping nhất đường này đó. Nhớ được hết là thím phục.' },
  chao: { name: 'Cháo Sáng Bến Thành', owner: null, greet: 'Sài Gòn dậy sớm lắm con. Bốn giờ sáng nồi cháo phải sôi rồi.', dare: 'Cháo đun lâu — chưa có khách đã phải đun. Ai chờ cháo là mất khách.' },
  'bun-thang': { name: 'Bún Thang Bà Cụ', owner: null, who: 'Bà Cụ', greet: 'Bún thang là món cầu kỳ nhất Hà Nội đó cháu. Hai mươi thứ mới ra một tô.', dare: 'Thái chỉ cho đều, xếp thành múi cho đẹp. Bà không nhận ai làm ẩu.' },
  'mi-quang': { name: 'Mì Quảng Bà Mua', owner: null, who: 'Bà Mua', greet: 'Mì Quảng không phải món nước đâu con. Chan xâm xấp thôi, ăn trộn mới đúng.', dare: 'Trong quán này có cả cao lầu Hội An — một món nước một món khô, đừng lấy nhầm tô.' },
  'bun-cha-ca': { name: 'Chả Cá Cô Hai', owner: null, who: 'Cô Hai', greet: 'Chả cá Nha Trang quết tay từ cá thu, sáng nào cũng bán hết trước chín giờ.', dare: 'Thì là bỏ sau khi chan nước nghe con. Bỏ trước là hỏng nồi.' },
  'hu-tieu': { name: 'Hủ Tiếu Nam Vang Chú Chín', owner: null, who: 'Chú Chín', greet: 'Hủ tiếu Nam Vang gốc Campuchia, qua Sài Gòn thành món của Sài Gòn luôn.', dare: 'Nước phải trong. Đun bùng một cái là đục, chú nhìn là biết.' },
  'khai-vi': { name: 'Cuốn & Chả Giò Cô Sáu', owner: null, greet: 'Gỏi cuốn với chả giò, món nào khách Tây cũng mê. Con học xong là đi khắp thế giới được.', dare: 'Cuốn phải chắc tay, chiên phải lửa nhỏ. Hai việc hai nhịp, làm song song mới kịp.' },
};

/** P6b — MINI-GAME theo tỉnh: dùng 5 engine sẵn có trong puzzle.js, món lấy từ các quán của tỉnh.
 *  `pass` = số câu sạch tối thiểu để được VẬT KỶ NIỆM. Vật kỷ niệm chỉ để kể chuyện + khoe (sổ tay), không ảnh hưởng độ khó. */
export const MINIS = {
  'ha-noi': { kind: 'order', rounds: 6, pass: 4, icon: '🥢', name: 'Đôi đũa gỗ mun', note: 'Ông chủ quán phở tặng khi thấy bạn xếp đúng thứ tự sáu lần liền.' },
  'hai-phong': { kind: 'reflex', rounds: 6, pass: 4, icon: '🐚', name: 'Vỏ sò đất Cảng', note: 'Nhặt ở bến cá lúc năm giờ sáng, còn mùi gió biển.' },
  hue: { kind: 'intruder', rounds: 6, pass: 4, icon: '🎐', name: 'Chuông gió cung đình', note: 'Mua ở chợ Đông Ba, treo lên là nghe tiếng sông Hương.' },
  'da-nang': { kind: 'ninja', rounds: 6, pass: 4, icon: '🏮', name: 'Đèn lồng Hội An', note: 'Lồng đèn lụa đỏ, gấp lại bỏ vừa cốp xe.' },
  'nha-trang': { kind: 'reflex', rounds: 6, pass: 4, icon: '🐠', name: 'San hô khô', note: 'Nhặt trên bãi sau cơn bão, trắng như vôi.' },
  'sai-gon': { kind: 'missing', rounds: 6, pass: 4, icon: '☕', name: 'Phin cà phê nhôm', note: 'Mua ở quán cóc quận 1, nhỏ giọt chậm hơn bất cứ cái phin nào.' },
  'mien-tay': { kind: 'ninja', rounds: 6, pass: 4, icon: '🛶', name: 'Xuồng ba lá mini', note: 'Người bán ở chợ nổi Cái Răng đẽo tặng, bằng gỗ mù u.' },
};

/**
 * Mảnh bản đồ 768×1376 (public/art/map/map-<id>.webp). `pts`: điểm trên đường (toạ độ ảnh) — lấy bằng tools/roadtrip.html?edit=1.
 * `border`: ranh vùng mới theo % chiều cao (0..1) — phần dưới ranh xám cho tới khi xe qua. `sign`: bảng hiệu ở cuối đường.
 */
export const PIECES = {
  'hn-hp': { img: 'map-hn-hp', from: 'ha-noi', to: 'hai-phong', border: 0.62,
    pts: [[453, 330], [470, 403], [430, 461], [457, 530], [492, 591], [461, 661], [399, 730], [369, 791], [253, 768], [257, 860], [284, 945], [361, 1006], [461, 1064], [568, 1114]],
    title: 'HẢI PHÒNG', sub: 'đất cảng · bánh đa cua', sign: 'Quán Ông Năm', signSub: 'bánh đa cua · bún cá', who: 'Ông Năm', bubble: 'Ủa, khách phương xa hả? Vô đây, muốn học nấu bánh đa cua thì phụ ông một buổi.' },
  'hp-hue': { img: 'map-hp-hue', from: 'hai-phong', to: 'hue', border: 0.72, pts: [[400, 100], [385, 180], [330, 260], [300, 340], [330, 430], [380, 510], [350, 600], [300, 690], [265, 770], [285, 860], [250, 940], [235, 1020], [300, 1090]],
    title: 'HUẾ', sub: 'cố đô · bún bò', sign: 'Riêu Dì Ba', signSub: 'bún riêu · bún bò', who: 'Dì Ba', bubble: 'Đi xa dữ hen con. Vô đây, dì chỉ cho cách nấu nồi riêu cho đúng.' },
  'hue-dn': { img: 'map-hue-dn', from: 'hue', to: 'da-nang', border: 0.55, pts: [[330, 190], [290, 290], [310, 380], [350, 450], [300, 540], [265, 620], [300, 700], [330, 790], [320, 860], [380, 930], [420, 1000], [400, 1060]],
    title: 'ĐÀ NẴNG', sub: 'mì Quảng · cao lầu', sign: 'Mì Quảng Bà Mua', signSub: 'mì Quảng · cao lầu', who: 'Bà Mua', bubble: 'Tới Quảng Nam rồi hả con. Vô đây, bà chỉ cho tô mì Quảng chan xâm xấp cho đúng.' },
  'dn-nt': { img: 'map-dn-nt', from: 'da-nang', to: 'nha-trang', border: 0.70, pts: [[430, 230], [380, 300], [320, 380], [290, 470], [265, 560], [280, 650], [350, 720], [380, 780], [340, 860], [300, 940], [260, 1020], [230, 1080]],
    title: 'NHA TRANG', sub: 'bún chả cá', sign: 'Chả Cá Cô Hai', signSub: 'bún chả cá · chả cá quết tay', who: 'Cô Hai', bubble: 'Biển Nha Trang đây con. Sáng mai bốn giờ dậy phụ cô quết chả cá nghe.' },
  'nt-sg': { img: 'map-nt-sg', from: 'nha-trang', to: 'sai-gon', border: 0.72, pts: [[350, 70], [300, 160], [300, 260], [350, 350], [320, 440], [240, 520], [190, 600], [220, 690], [300, 770], [400, 850], [420, 940], [380, 1020], [320, 1100]],
    title: 'SÀI GÒN', sub: 'gỏi cuốn · chả giò · cháo', sign: 'Cháo Sáng Bến Thành', signSub: 'cháo lòng · cháo sườn', who: 'Chủ quán', bubble: 'Sài Gòn đây con! Sáng sớm là phải có tô cháo nóng, vô phụ chị nấu nghe.' },
  'sg-mientay': { img: 'map-sg-mientay', from: 'sai-gon', to: 'mien-tay', border: 0.70, pts: [[330, 230], [320, 320], [400, 410], [350, 500], [250, 590], [300, 680], [430, 770], [490, 860], [420, 940], [310, 1020], [270, 1100]],
    title: 'MIỀN TÂY', sub: 'bún cá Châu Đốc', sign: 'Quán Bún Cá Châu Đốc', signSub: 'sắp mở', who: 'Chủ quán', bubble: 'Quán còn đang sửa, mai mốt con ghé lại nghe.' },
};

export const provinceOf = (worldId) => PROVINCES.find((p) => p.worlds.includes(worldId)) || null;
export const provinceById = (id) => PROVINCES.find((p) => p.id === id) || null;
export const prevProvince = (id) => { const i = PROVINCES.findIndex((p) => p.id === id); return i > 0 ? PROVINCES[i - 1] : null; };
