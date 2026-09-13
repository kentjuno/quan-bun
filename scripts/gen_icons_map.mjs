// Sinh src/game/icons.js từ public/icons/*.png (đường dẫn literal để scripts_single nhúng base64 được)
import { readdirSync, writeFileSync } from 'node:fs';
const files = readdirSync('public/icons').filter((f) => f.endsWith('.png')).sort();
const lines = files.map((f) => `  '${f.slice(0, -4)}': './icons/${f}',`);
writeFileSync('src/game/icons.js', `// Sinh tự động bởi scripts/gen_icons_map.mjs — ảnh item (Flow → cắt nền) dùng cho card và ô tay\nexport const ICONS = {\n${lines.join('\n')}\n};\n// token đã chế biến dùng ảnh của nguyên liệu gốc (sợi/tô theo loại: 'noodle-drained:bun' → bun, 'bowl-hot:soup-bowl' → soup-bowl)
const BASE = { 'noodle-spoiled': 'pho-noodle', 'bowl-hot': 'pho-bowl', 'bowl-hot:*': 'pho-bowl', 'broth:pour-pho-broth': 'nuoc-pho', 'bo-vien-ready': 'bo-vien', 'tai-dap-ready': 'bo-tai', 'rib-hot': 'suon-cay', 'rib-cut': 'suon-cay', 'rib-ready': 'suon-cay', 'two-bowls-ready': 'extra-bowl', 'cha-ca-ready': 'cha-ca', 'cha-cua-ready': 'cha-cua', 'youtiao-ready': 'quay', 'level1-ready': 'soup-bowl' };
export function iconUrl(tok) {
  if (!tok) return null;
  if (ICONS[tok]) return ICONS[tok];
  if (BASE[tok]) return ICONS[BASE[tok]] || null;
  if (/^(noodle-\\w+|bowl-hot):/.test(tok)) return ICONS[tok.split(':')[1]] || ICONS[tok.startsWith('bowl') ? 'pho-bowl' : 'pho-noodle'] || null;
  return null;
}
`);
console.log('icons:', files.length);
