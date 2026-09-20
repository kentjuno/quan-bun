#!/usr/bin/env node
// P6.4 — Thêm món bằng MỘT lệnh:  node scripts/add_dish.mjs <dish-id> [--scaffold] [--json]
//   1. Chưa có src/data/dishes/<id>.json → --scaffold tạo file mẫu rồi dừng (Kent/model điền công thức chung).
//   2. Có file → validate schema + tham chiếu (dishlib.validateDish) → dựng công thức (dishToSim) → kiểm mọi bước có trạm.
//   3. Kiểm asset: tô 4 bậc (public/art/<id>-{s0,dry,top,wet}.webp), icon từng nguyên liệu (public/icons/<item>.png),
//      khay (public/art/pan/<item>.webp), nồi nước (public/art/pot-<stock>.webp), giải nghĩa (i18n/items.json).
//   4. Cập nhật src/data/art-manifest.json (art.js đọc) và in checklist: thiếu gì, chạy script nào để gen (docs/ART-PIPELINE.md).
//   Không sửa file code nào. Exit 0 = đủ hết; 2 = thiếu asset/i18n (game vẫn chạy: thiếu ảnh thì rơi về icon); 1 = JSON sai.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIM_DATA } from '../src/data/sim-data.js';
import { validateDish, dishToSim } from '../src/game/dishlib.js';
import { writeArtManifest, ROOT } from './_art_manifest.mjs';

const args = process.argv.slice(2); const id = args.find((a) => !a.startsWith('--'));
const flag = (f) => args.includes(f);
if (!id) { console.log('Dùng: node scripts/add_dish.mjs <dish-id> [--scaffold] [--json]'); process.exit(1); }
const file = join(ROOT, 'src', 'data', 'dishes', `${id}.json`);

const TEMPLATE = (id) => ({
  id, name: 'Tên Món (giữ tiếng Việt)', pron: 'cach doc kieu Anh', gloss: 'short English gloss', region: 'ha-noi', price: 45,
  serve: { vessel: 'soup-bowl', hot: true },
  noodle: { item: 'bun', flow: 'hot-rinse-hot' },
  broth: { cook: ['cot-cua', 'mieng-nuoc'], out: 'crab-broth-ready', action: 'pour-crab-broth' },
  prep: [],
  assembly: ['$vessel', '$noodle', 'dau-hu', 'ca-chua', '$broth', 'hanh-la'],
  codex: { story: '', region_note: '', how_to_eat: '', review: 'cần Kent duyệt' },
  real: null,
});

if (!existsSync(file)) {
  if (!flag('--scaffold')) { console.log(`Chưa có ${file}. Chạy lại với --scaffold để tạo file mẫu.`); process.exit(1); }
  writeFileSync(file, JSON.stringify(TEMPLATE(id), null, 2) + '\n');
  console.log(`Đã tạo ${file} — điền công thức chung rồi chạy lại: node scripts/add_dish.mjs ${id}`); process.exit(0);
}

const d = JSON.parse(readFileSync(file, 'utf8'));
const errs = validateDish(d, SIM_DATA.items, SIM_DATA.actions);
if (d.id !== id) errs.push(`id trong file (${d.id}) khác tên file (${id})`);
if (errs.length) { console.log(`✗ ${id}.json sai schema:\n  - ${errs.join('\n  - ')}`); process.exit(1); }
const sim = dishToSim(d);

// ---- asset checklist ----
const miss = []; const opt = []; const todo = new Set();
const has = (p) => existsSync(join(ROOT, 'public', p));
const items = new Set();
for (const t of d.assembly) if (SIM_DATA.items[t]) items.add(t);
for (const p of d.prep || []) for (const t of p.in || []) if (SIM_DATA.items[t]) items.add(t);
if (d.noodle) items.add(d.noodle.item); items.add(d.serve.vessel); if (d.serve.liner) items.add(d.serve.liner);
const stocks = (d.broth?.cook || []).map((x) => (typeof x === 'string' ? x : x.item));
for (const t of stocks) items.add(t);
for (const st of ['dry', 'wet']) if (!has(`art/${id}-${st}.webp`)) { miss.push(`tô bậc ${st}: public/art/${id}-${st}.webp`); todo.add('gen 4 bậc tô: Flow prompt theo docs/ART-PIPELINE.md §7 → scripts/cut_magenta.py → public/art/'); }
for (const st of ['s0', 'top']) if (!has(`art/${id}-${st}.webp`)) opt.push(`tô bậc ${st}: public/art/${id}-${st}.webp — thiếu thì lùi về dry/wet`);
for (const it of items) {
  if (!has(`icons/${it}.png`)) { miss.push(`icon ${it}: public/icons/${it}.png`); todo.add('gen icon: scripts/process_icons.py rồi node scripts/gen_icons_map.mjs'); }
  if (!/bowl|tray|dia-|mam-dan|chao-ap-ca|serving-plate|basket|mieng-nuoc|^nuoc-|^cot-|^chao-|noodle|^bun$|^bun-to$|^banh-da$|^banh-hoi$/.test(it) && !has(`art/pan/${it}.webp`)) { miss.push(`khay ${it}: public/art/pan/${it}.webp`); todo.add('gen khay: scripts/pans_to_webp.py (+ scripts/draw_mats.py nếu thêm ô khay)'); }
}
for (const t of stocks) if (/^(cot-|nuoc-|chao-)/.test(t) && !has(`art/pot-${t}.webp`)) { miss.push(`nồi ${t}: public/art/pot-${t}.webp`); todo.add('gen nồi: scripts/pots_to_webp.py'); }
// i18n
const i18n = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'i18n', 'items.json'), 'utf8'));
for (const it of items) if (!i18n.items[it]?.en) miss.push(`giải nghĩa nguyên liệu ${it}: src/data/i18n/items.json → items.${it}.en`);
for (const a of new Set([...(d.prep || []).map((p) => p.action), d.broth?.action].filter(Boolean))) if (!i18n.actions[a]) miss.push(`dịch hành động ${a}: items.json → actions.${a}`);
for (const o of [...(d.prep || []).map((p) => p.out), d.broth?.out].filter(Boolean)) if (!SIM_DATA.labels[o] && !i18n.labels[o] && !/^noodle-/.test(o)) miss.push(`nhãn trạng thái ${o}: sim-data.labels + items.json → labels.${o}`);
if (!d.gloss) miss.push('gloss (giải nghĩa tiếng Anh) trong dish.json'); if (!d.pron) miss.push('pron (cách đọc) trong dish.json');
if (!d.codex?.story) miss.push('codex.story (sổ tay)');
// level nào dùng món này?
const worlds = readFileSync(join(ROOT, 'src', 'data', 'worlds.js'), 'utf8');
const usedInLevels = worlds.includes(`'${id}'`);

const m = writeArtManifest(ROOT);
const report = { id, name: d.name, region: d.region, price: d.price, steps: sim.assembly, stations: [...new Set(sim.extraStages.map((s) => s.action))], missing: miss, optional: opt, next: [...todo], usedInLevels, artManifest: { dishArt: m.dishArt.includes(id), steps: (m.steps[id] || []).length } };
if (flag('--json')) { console.log(JSON.stringify(report, null, 1)); process.exit(miss.length ? 2 : 0); }
console.log(`✓ ${d.name} (${id}) — ${d.region}, ${d.price}k`);
console.log(`  ráp: ${sim.assembly.join(' → ')}`);
console.log(`  trạm: ${report.stations.join(', ') || '(không có bước chế biến)'}`);
console.log(`  art-manifest: tô ${report.artManifest.dishArt ? 'có' : 'CHƯA'} · ảnh bước ${report.artManifest.steps}`);
console.log(`  level đang dùng: ${usedInLevels ? 'có (worlds.js)' : 'chưa — thêm vào world/tỉnh trong src/data/worlds.js'}`);
if (opt.length) console.log(`  tuỳ chọn: ${opt.join(' · ')}`);
if (miss.length) { console.log(`\n✗ Thiếu ${miss.length} thứ (game vẫn chạy, thiếu ảnh thì rơi về icon):\n  - ${miss.join('\n  - ')}`); if (todo.size) console.log(`\nViệc cần chạy:\n  - ${[...todo].join('\n  - ')}`); process.exit(2); }
console.log('\n✓ Đủ asset + i18n. Chạy `npx vitest run` để chắc.');
