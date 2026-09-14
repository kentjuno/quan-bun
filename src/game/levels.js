// Sinh danh sách khách cho một level (docs/PLAN-WORLDS.md §5).
// Seed theo level.id → chơi lại thấy y hệt, nhưng mỗi level một kiểu. Không dùng Math.random.
import { CUSTOMERS } from '../config.js';
import { paceOf } from '../data/pace.js';

const TYPES = Object.keys(CUSTOMERS);
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/**
 * @param {object} level  một level trong config.WORLDS
 * @returns {Array} arrivals: { t, type, patience, dish?, regular?, group? }
 */
export function makeLevelArrivals(level) {
  const rnd = rng(hash(level.id)); const sec = level.seconds; const n = level.count;
  const ch = level.challenge; const out = [];
  const pat = () => Math.round(level.patience * (0.92 + rnd() * 0.16));
  const type = () => TYPES[Math.floor(rnd() * TYPES.length)];
  const newDish = level.unlocks?.dish && level.dishes.includes(level.unlocks.dish) ? level.unlocks.dish : null;
  const onlyDish = ch?.kind === 'only' ? ch.dish : null;

  let ts;
  if (ch?.kind === 'rush') ts = Array.from({ length: n }, (_, i) => 1 + i);                                   // cùng lúc: 1,2,3…
  else if (ch?.kind === 'lunch') ts = Array.from({ length: n }, (_, i) => Math.round(sec * (0.04 + 0.46 * (i + 0.2 + rnd() * 0.5) / n)));   // dồn nửa đầu
  else ts = Array.from({ length: n }, (_, i) => Math.round(sec * (0.05 + 0.8 * (i + 0.2 + rnd() * 0.6) / n)));
  ts.sort((a, b) => a - b);

  for (const t of ts) {
    const a = { t, type: type(), patience: pat() };
    if (onlyDish) a.dish = onlyDish; else if (newDish && rnd() < 0.45) a.dish = newDish;
    out.push(a);
  }
  // khách đi cặp: nhân bản một khách ở đoạn giữa, tới sau 1 giây, ngồi bàn khác nhưng gọi cùng lúc
  for (let k = 0; k < (level.pair || 0); k++) {
    const pool = out.filter((a) => a.t > sec * 0.15 && a.t < sec * 0.6 && !a.group);
    const src = pool[Math.floor(rnd() * pool.length)] || out[0];
    out.push({ ...src, t: src.t + 1, group: 'pair', regular: undefined });
    src.group = 'pair';
  }
  // boss: đoàn `group` người tới cùng lúc ở 60 % thời gian
  if (ch?.kind === 'boss') { const t0 = Math.round(sec * 0.6); for (let k = 0; k < (ch.group || 4); k++) out.push({ t: t0 + k, type: TYPES[k % TYPES.length], patience: Math.round(level.patience * 1.2), group: 'tour' }); }
  // khách quen: gán vào khách ở đoạn giữa (mỗi người một khách khác nhau)
  (level.regulars || []).forEach((rid, i) => {
    const pool = out.filter((a) => !a.regular && !a.group && (i % 2 ? a.t > sec * 0.5 : a.t < sec * 0.5));
    const a = pool[Math.floor(rnd() * pool.length)] || out.find((x) => !x.regular) || out[0];
    a.regular = rid; delete a.dish;
  });
  return out.sort((a, b) => a.t - b.t);
}

// ---- nhịp cho QUẦY POV ----
export const POV_FIRST = 4;      // giây: khách đầu tiên, đủ để nhìn quanh quầy một cái
export const POV_PACE = 1.0;     // 1.0 = khách tới đúng bằng tốc độ bot làm; <1 là dồn dập hơn
const TRAIN_EASE = 0.62;         // bản tập bỏ bớt bước nên làm nhanh hơn nhiều

/**
 * Lịch khách cho quầy POV: GIỮ NGUYÊN nhịp của level (đợt dồn, khách đôi, boss)
 * nhưng nén/giãn cả trục thời gian cho khớp tốc độ thật của quầy.
 * Lịch gốc canh cho bếp 3D — ở đó còn phải đi lại, nên bê nguyên qua quầy thì khách thưa rề rà.
 * @param {object} level
 * @param {Array} [base] lịch gốc (mặc định: makeLevelArrivals(level))
 */
export function povArrivals(level, base = null) {
  const arr = (base || makeLevelArrivals(level)).map((a) => ({ ...a }));
  if (arr.length < 2) { if (arr[0]) arr[0].t = POV_FIRST; return arr; }
  const t0 = arr[0].t; const span = arr[arr.length - 1].t - t0;
  if (span <= 0) return arr;
  const cur = span / (arr.length - 1);                                  // khoảng cách trung bình hiện tại
  let want = paceOf(level.dishes) * POV_PACE;                           // khoảng cách mong muốn
  if (level.training) want *= TRAIN_EASE;
  const k = Math.max(0.12, Math.min(1, want / cur));                    // chỉ nén lại, không bao giờ giãn ra
  for (const a of arr) a.t = +(POV_FIRST + (a.t - t0) * k).toFixed(2);
  return arr;
}
