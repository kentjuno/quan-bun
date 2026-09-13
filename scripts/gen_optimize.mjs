// Sinh docs/OPTIMIZE.md: lộ trình nhanh nhất (bot) cho từng món + nguyên tắc rút ra. Chạy: node scripts/gen_optimize.mjs
import { writeFileSync } from 'node:fs';
import { parFor } from '../src/game/par.js';
import { SHIFTS, KITCHEN_LANDSCAPE } from '../src/config.js';
import { D, soupRecipeFor } from '../src/game/recipes.js';

let md = `# Cách làm nhanh — rút từ bot làm mẫu (Quán Bún)\n\nSinh tự động bởi \`scripts/gen_optimize.mjs\` từ dữ liệu bếp thật (\`sim-data.js\`) và bot trong game. Thời gian là giây game (rút ngắn, GIỮ tỉ lệ & thứ tự bếp thật). Mục đích: nhớ THỨ TỰ và cách XẾP VIỆC, không phải số giây.\n\n## Nguyên tắc chung (áp dụng ngoài đời)\n\n1. **Việc chạy nền đi trước**: vừa nhận đơn → thả tô vào nồi nóng và thả sợi vào rọ NGAY, rồi mới đi lấy topping. Trong lúc sợi trụng, tay đang lấy 2 thứ đầu của tô.\n2. **Mỗi chuyến 2 thứ**: kệ topping lấy 2 món liền nhau trong thứ tự ráp rồi mới qua quầy. Không đi tay không, không đi một thứ.\n3. **Tô nóng trữ sẵn**: lúc rảnh (đầu ca, giữa hai đơn) thả 2 tô vào nồi. Tô để bao lâu cũng được; sợi thì không.\n4. **Sợi không nằm nồi lâu**: chỉ thả sợi cho tô sau khi tô này còn ≤ 4 bước; sợi chín để lâu là hư.\n5. **Nước lèo riêu / bún bò**: hết nồi mới nấu; nấu ngay khi thấy đơn riêu/bún bò đầu tiên trong lúc sợi đang trụng (đun chạy nền). Thứ tự cho vào nồi cố định: cốt → huyết → nước.\n6. **Hai đơn cùng lúc**: xong bước nền của tô 1 → mở tô 2 (tô + sợi vào nồi) → quay lại ráp tô 1 → tô 2. Ba rọ sợi là để làm 2–3 tô song song.\n\n`;
for (const d of Object.keys(D.recipes)) {
  const sh = SHIFTS.find((x) => x.dishes.includes(d)); if (!sh) continue;
  const r = D.recipes[d]; const p = parFor(sh, KITCHEN_LANDSCAPE, d); const soup = soupRecipeFor(d);
  md += `## ${r.name}\n\n`;
  if (r.base) md += `- Sợi: **${D.items[r.base.noodle].name}** — ${r.base.workflow === 'noodle-hot-only' ? 'trụng nóng 1 lần → ráo (KHÔNG xả lạnh)' : 'trụng nóng → xả lạnh → trụng nóng lại → ráo'}. Tô: **${D.items[r.base.bowl].name}** (trụng/ trữ trong nồi nóng).\n`;
  else md += `- Món không có sợi trụng kiểu phở (mẹt / tô khô / cháo / chả cá): xem lộ trình.\n`;
  if (r.todo) md += `- ⚠️ Chưa xác nhận: ${r.todo}\n`;
  if (soup) md += `- Nước lèo: **${soup.name}** nấu ở lò: ${soup.items.map((i) => D.items[i].name).join(' → ')} → đun.\n`;
  else if (r.assembly.some((t) => t.startsWith('@pour'))) md += `- Nước lèo: **nước phở** có sẵn.\n`;
  md += `- Thứ tự ráp: ${r.assembly.map((t) => t === 'base-ready' ? 'tô + sợi' : t.startsWith('@') ? (D.actions[t.slice(1)]?.name || t) : (D.items[t]?.name || D.labels[t] || t)).join(' → ')}\n`;
  md += `- Bot: **${p.seconds}s / tô, ${p.taps} chạm**. Lộ trình:\n\n`;
  p.route.forEach((x, i) => { md += `  ${i + 1}. ${x}\n`; });
  md += '\n';
}
md += `## Trạm mới (từ 0.3.0)\n\n- **Thớt** (2 thớt): đem đủ nguyên liệu của một bước (vd. rau salad + dưa leo + đồ chua; mẹt + giấy lót; bò tái + gừng) rồi đứng làm. Thiếu thứ gì thớt báo. Tay chỉ cầm 2 thứ nên bước 3–4 nguyên liệu phải đi 2 chuyến — lộ trình bot cho thấy cách gom.\n- **Lò vi sóng**: sườn cây quay nền, rồi thớt cắt, rồi ủ ấm trong nồi.\n- **Lò đun** cũng nấu cháo (cháo + nước → đun) → múc cháo ở thớt cùng tô đã trụng + dĩa lót.\n\n## Ghi chú\n\n- Thời gian bot là mốc để so trong bảng tổng kết sau ca ("so với bot"). Người thật khó nhanh hơn bot vì bot không đứng nghĩ; mục tiêu thực tế là ≤ +10 s và 0 lỗi.\n- Món đã "thuộc" (≥ 3 tô sạch liên tiếp) → card ẩn tên nguyên liệu, và ra đơn ít hơn; món hay sai ra nhiều hơn (trọng số 1–4).\n`;
writeFileSync('docs/OPTIMIZE.md', md); console.log('docs/OPTIMIZE.md', md.length, 'chars');
