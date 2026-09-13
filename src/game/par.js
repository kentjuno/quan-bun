// "Par" = thời gian bot làm một tô đơn lẻ trên đúng bếp này, và lộ trình (chuỗi trạm) bot đi — dùng làm mốc so sánh & cheat sheet.
import { World } from './world.js';
import { botDecide } from './bot.js';
import { label } from './recipes.js';

const cache = new Map();
/**
 * @returns {{ seconds:number, taps:number, route:string[] }} route = các bước gộp theo chuyến ("Kệ tô: Tô phở", "Nồi: thả", …)
 */
export function parFor(shift, kitchen, dishId) {
  const key = `${kitchen.size.w}x${kitchen.size.d}:${shift.id}:${dishId}`;
  if (cache.has(key)) return cache.get(key);
  const w = new World({ ...shift, survival: false, drill: false, prep: 0, seconds: 300, arrivals: [{ t: 0, type: 'tourist', dish: dishId, patience: 1e9 }] }, {}, kitchen);
  const route = []; let servedAt = null;
  w.ev.onServe = () => { servedAt = w.time; };
  for (let i = 0; i < 300 * 30 && servedAt === null; i++) {
    const t = botDecide(w);
    if (t) { w.tap(t); route.push(describe(w, t)); }
    w.update(1 / 30);
  }
  const out = { seconds: servedAt === null ? null : +servedAt.toFixed(1), taps: route.length, route: compress(route) };
  cache.set(key, out); return out;
}

function describe(w, target) {
  const [sid, arg] = String(target).split(':'); const s = w.stationById[sid]; if (!s) return target;
  if (s.type === 'shelf') return `${s.label}: lấy ${label(arg)}`;
  if (s.type === 'pot') { const hand = w.chef.hand.filter((h) => typeof h === 'string' && w.transformAt('pot', h)); if (arg && arg.startsWith('bowl')) return `Nồi: lấy ${arg.includes('.') ? label(arg.slice(5)).toLowerCase() : 'tô'} nóng`; if (arg !== undefined) return `Nồi: lấy rọ ${Number(arg) + 1}`; return hand.length ? `Nồi: thả ${hand.map(label).join(' + ')}` : 'Nồi: lấy'; }
  if (s.type === 'sink') return 'Bồn: xả lạnh';
  if (s.type === 'stove') return `${s.label}: múc`;
  if (s.type === 'burner') { if (arg && arg.startsWith('ready')) return `Kệ nước: lấy ${arg.includes('.') ? label(arg.slice(6)).toLowerCase() : 'nước'}`; return `${s.label} ${Number(arg) + 1}: nấu`; }
  if (s.type === 'prep') { const hand = w.chef.hand.filter((h) => typeof h === 'string'); return hand.length ? `Thớt: đặt ${hand.map(label).join(' + ')}` : `Thớt${arg !== undefined ? ' ' + (Number(arg) + 1) : ''}: lấy`; }
  if (s.type === 'fryer') { const hand = w.chef.hand.filter((h) => typeof h === 'string' && w.transformAt('fryer', h)); return hand.length ? `Chảo chiên: chiên ${hand.map(label).join(' + ')}` : 'Chảo chiên: lấy'; }
  if (s.type === 'microwave') { const hand = w.chef.hand.filter((h) => typeof h === 'string' && w.transformAt('microwave', h)); return hand.length ? `Lò vi sóng: quay ${hand.map(label).join(' + ')}` : 'Lò vi sóng: lấy'; }
  if (s.type === 'counter') { const hand = w.chef.hand.filter((h) => typeof h === 'string'); return hand.length ? `Quầy ráp: bỏ ${hand.map(label).join(' + ')}` : 'Quầy ráp: cầm tô'; }
  if (s.type === 'serve' || s.type === 'seat') return 'Bàn khách: giao';
  if (s.type === 'trash') return 'Thùng rác';
  return s.label || target;
}
function compress(route) { const out = []; for (const r of route) if (out[out.length - 1] !== r) out.push(r); return out; }
