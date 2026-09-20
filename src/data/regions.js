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
  { id: 'ha-noi', name: 'Hà Nội', sub: 'phở · bún chả · chả cá', icon: '🏯', worlds: ['pho', 'mon-kho', 'cha-ca'], unlockStars: 0, piece: null },
  { id: 'hai-phong', name: 'Hải Phòng', sub: 'đất cảng · bánh đa cua', icon: '⚓', worlds: ['hai-phong'], unlockStars: 40, piece: 'hn-hp' },
  { id: 'hue', name: 'Huế', sub: 'cố đô · bún bò · bún riêu', icon: '👑', worlds: ['bun-rieu', 'bun-bo'], unlockStars: 20, piece: 'hp-hue' },
  { id: 'da-nang', name: 'Đà Nẵng · Hội An', sub: 'mì Quảng · cao lầu', icon: '🐉', worlds: [], unlockStars: 30, piece: 'hue-dn', soon: true },
  { id: 'nha-trang', name: 'Nha Trang', sub: 'bún chả cá · bánh căn', icon: '🏖️', worlds: [], unlockStars: 20, piece: 'dn-nt', soon: true },
  { id: 'sai-gon', name: 'Sài Gòn', sub: 'gỏi cuốn · chả giò · cháo', icon: '🌆', worlds: ['chao', 'khai-vi'], unlockStars: 30, piece: 'nt-sg' },
  { id: 'mien-tay', name: 'Miền Tây', sub: 'bún cá Châu Đốc · bánh khọt', icon: '🛶', worlds: [], unlockStars: 20, piece: 'sg-mientay', soon: true },
];

/** Quán = world: tên quán + chủ quán (khách quen cũ lên làm chủ — M2 "chủ quán"). `[cần Kent duyệt]` tên quán. */
export const QUAN = {
  pho: { name: 'Phở Cậu Hai', owner: 'cau-hai' },
  'mon-kho': { name: 'Mẹt Út Mười', owner: 'ut-muoi' },
  'cha-ca': { name: 'Chả Cá Lã Vọng', owner: 'chu-tu' },
  'hai-phong': { name: 'Quán Ông Năm', owner: 'ong-nam' },
  'bun-rieu': { name: 'Riêu Dì Ba', owner: 'di-ba' },
  'bun-bo': { name: 'Bún Bò Thím Bảy', owner: 'thim-bay' },
  chao: { name: 'Cháo Sáng Bến Thành', owner: null },
  'khai-vi': { name: 'Cuốn & Chả Giò Cô Sáu', owner: null },
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
    title: 'ĐÀ NẴNG', sub: 'mì Quảng · cao lầu', sign: 'Quán Mì Quảng', signSub: 'sắp mở', who: 'Chủ quán', bubble: 'Quán còn đang sửa, mai mốt con ghé lại nghe.' },
  'dn-nt': { img: 'map-dn-nt', from: 'da-nang', to: 'nha-trang', border: 0.70, pts: [[430, 230], [380, 300], [320, 380], [290, 470], [265, 560], [280, 650], [350, 720], [380, 780], [340, 860], [300, 940], [260, 1020], [230, 1080]],
    title: 'NHA TRANG', sub: 'bún chả cá', sign: 'Quán Bún Chả Cá', signSub: 'sắp mở', who: 'Chủ quán', bubble: 'Quán còn đang sửa, mai mốt con ghé lại nghe.' },
  'nt-sg': { img: 'map-nt-sg', from: 'nha-trang', to: 'sai-gon', border: 0.72, pts: [[350, 70], [300, 160], [300, 260], [350, 350], [320, 440], [240, 520], [190, 600], [220, 690], [300, 770], [400, 850], [420, 940], [380, 1020], [320, 1100]],
    title: 'SÀI GÒN', sub: 'gỏi cuốn · chả giò · cháo', sign: 'Cháo Sáng Bến Thành', signSub: 'cháo lòng · cháo sườn', who: 'Chủ quán', bubble: 'Sài Gòn đây con! Sáng sớm là phải có tô cháo nóng, vô phụ chị nấu nghe.' },
  'sg-mientay': { img: 'map-sg-mientay', from: 'sai-gon', to: 'mien-tay', border: 0.70, pts: [[330, 230], [320, 320], [400, 410], [350, 500], [250, 590], [300, 680], [430, 770], [490, 860], [420, 940], [310, 1020], [270, 1100]],
    title: 'MIỀN TÂY', sub: 'bún cá Châu Đốc', sign: 'Quán Bún Cá Châu Đốc', signSub: 'sắp mở', who: 'Chủ quán', bubble: 'Quán còn đang sửa, mai mốt con ghé lại nghe.' },
};

export const provinceOf = (worldId) => PROVINCES.find((p) => p.worlds.includes(worldId)) || null;
export const provinceById = (id) => PROVINCES.find((p) => p.id === id) || null;
export const prevProvince = (id) => { const i = PROVINCES.findIndex((p) => p.id === id); return i > 0 ? PROVINCES[i - 1] : null; };
