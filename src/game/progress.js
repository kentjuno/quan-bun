// Tiến trình người chơi (localStorage): level đã mở, sao tốt nhất, điểm kiếm được, đồ trang trí đã mua, kỷ lục survival, món đang luyện.
// Điểm = tiền + tip mỗi lần chơi (mọi chế độ) + thưởng sao lần đầu. Điểm dùng mua trang trí quán (DECOR trong config).
import { DECOR, UPGRADES, WORLDS, modsFor } from '../config.js';
import { PROVINCES, provinceOf } from '../data/regions.js';
const KEY = 'qb.progress.v1';
let data = load();
function load() { try { return { stars: {}, points: 0, spent: 0, decor: [], upgrades: {}, survival: null, practice: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { stars: {}, points: 0, spent: 0, decor: [], upgrades: {}, survival: null, practice: null }; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
export const STAR_BONUS = 60;   // điểm thưởng mỗi sao mới của một level

export function progress() { return data; }
export function bestStars(levelId) { return data.stars[levelId] || 0; }
/** Level i (0-based) mở khi level trước đã ≥ 1 sao (level 0 luôn mở). `?all` mở hết. */
export function isUnlocked(levels, i) {
  if (i <= 0) return true;
  if (typeof location !== 'undefined') { const q = new URLSearchParams(location.search); if (q.has('all') || q.has('shift') || q.has('level')) return true; }   // dev: ?all, ?shift=N, ?level=N bỏ khoá
  return bestStars(levels[i - 1].id) >= 1;
}
/** Ghi kết quả một level: trả về { earned, starBonus, newStars } để hiện lên bảng kết quả. */
export function recordLevel(levelId, result) {
  const prev = bestStars(levelId); const newStars = Math.max(0, result.stars - prev);
  const earned = Math.max(0, Math.round(result.money + result.tips)); const starBonus = newStars * STAR_BONUS;
  if (result.stars > prev) data.stars[levelId] = result.stars;
  data.points += earned + starBonus; save();
  return { earned, starBonus, newStars };
}
/** Ghi điểm cho drill / rush / survival (không có sao). */
export function recordPlay(result, mult = 1) { const earned = Math.max(0, Math.round((result.money + result.tips) * mult)); data.points += earned; save(); return { earned, starBonus: 0, newStars: 0 }; }
export function recordSurvival(result) {
  const r = recordPlay(result, 1.5);
  const rec = { served: result.served, time: result.stats?.time || 0, money: result.money };
  if (!data.survival || rec.served > data.survival.served || (rec.served === data.survival.served && rec.money > data.survival.money)) { data.survival = rec; r.record = true; }
  save(); return r;
}
export function pointsAvailable() { return data.points - data.spent; }
export function hasDecor(id) { return data.decor.includes(id); }
export function buyDecor(id) {
  const d = DECOR.find((x) => x.id === id); if (!d || hasDecor(id) || pointsAvailable() < d.cost) return false;
  data.decor.push(id); data.spent += d.cost; save(); return true;
}
export function setPractice(dishes) { data.practice = dishes; save(); }
export function resetProgress() { data = { stars: {}, points: 0, spent: 0, decor: [], upgrades: {}, survival: null, practice: null }; save(); }
// ---- world / level (docs/PLAN-WORLDS.md) ----
/** Tổng sao của một world. */
export function worldStars(worldId) { const w = WORLDS.find((x) => x.id === worldId); return w ? w.levels.reduce((n, L) => n + bestStars(L.id), 0) : 0; }
/** Tổng sao toàn game (dùng cho mốc mở bán nâng cấp). */
export function totalStars() { return WORLDS.reduce((n, w) => n + worldStars(w.id), 0); }
const devOpen = () => { if (typeof location === 'undefined') return false; const q = new URLSearchParams(location.search); return q.has('all') || q.has('world') || q.has('level'); };
/** Tổng ★ của một tỉnh (mọi quán trong tỉnh). */
export function provinceStars(provId) { const p = PROVINCES.find((x) => x.id === provId); return p ? p.worlds.reduce((n, w) => n + worldStars(w), 0) : 0; }
/** Tỉnh trước gần nhất CÓ quán (tỉnh "sắp mở" không chặn đường). */
function prevWithWorlds(provId) { const i = PROVINCES.findIndex((p) => p.id === provId); for (let k = i - 1; k >= 0; k--) if (PROVINCES[k].worlds.length) return PROVINCES[k]; return null; }
/** Tỉnh mở (xe chạy sang được) khi tỉnh trước có quán đã đủ `unlockStars` ★. Tỉnh đầu luôn mở. */
export function provinceUnlocked(provId) {
  const p = PROVINCES.find((x) => x.id === provId); if (!p) return false;
  if (PROVINCES[0].id === provId || devOpen()) return true;
  const prev = prevWithWorlds(provId); if (!prev) return true;
  return provinceStars(prev.id) >= p.unlockStars;
}
/** Quán (world) mở khi tỉnh mở và quán trước trong tỉnh đủ `starsToUnlock` (quán đầu tỉnh chỉ cần tỉnh mở). World không thuộc tỉnh nào → luật cũ (tuần tự). */
export function worldUnlocked(worldId) {
  if (devOpen()) return true;
  const p = provinceOf(worldId);
  if (!p) { const i = WORLDS.findIndex((w) => w.id === worldId); if (i <= 0) return true; return worldStars(WORLDS[i - 1].id) >= WORLDS[i].starsToUnlock; }
  if (!provinceUnlocked(p.id)) return false;
  const k = p.worlds.indexOf(worldId); if (k <= 0) return true;
  const W = WORLDS.find((w) => w.id === worldId);
  return worldStars(p.worlds[k - 1]) >= (W?.starsToUnlock || 0);
}
/** Chuyến xe sang tỉnh đã xem chưa (M2: xem lần đầu khi tỉnh mở, sau đó bỏ qua được). */
export function tripSeen(provId) { return !!(data.trips || {})[provId]; }
export function markTrip(provId) { data.trips = data.trips || {}; data.trips[provId] = 1; save(); }
export function ownerMet(worldId) { return !!(data.owners || {})[worldId]; }
export function markOwner(worldId) { data.owners = data.owners || {}; data.owners[worldId] = 1; save(); }
/** Sổ tay: trang / công thức thật vừa mở sau một ca (báo một lần, ghi nhớ). `open(d)` / `full(d)` = hàm kiểm của codex.js. */
export function codexNew(dishes, open, full) {
  data.codex = data.codex || {}; const out = [];
  for (const d of dishes) { const k = data.codex[d] || 0; if (k < 1 && open(d)) { data.codex[d] = 1; out.push({ kind: 'codex', id: d }); } if ((data.codex[d] || 0) < 2 && full(d)) { data.codex[d] = 2; out.push({ kind: 'recipe', id: d }); } }
  if (out.length) save(); return out;
}
/** P6b — vật kỷ niệm của tỉnh (mini-game đạt `pass`). */
export function souvenirs() { return { ...(data.souvenirs || {}) }; }
export const hasSouvenir = (provId) => !!(data.souvenirs || {})[provId];
export function winSouvenir(provId) { if (hasSouvenir(provId)) return false; data.souvenirs = { ...(data.souvenirs || {}), [provId]: Date.now() }; save(); return true; }
export function tutSeen() { return !!data.tut; }
export function markTut() { data.tut = 1; save(); }
export function introSeen() { return !!data.intro; }
export function markIntro() { data.intro = 1; save(); }
/** Level mở khi level trước trong world đã ≥1★ (level 1 luôn mở nếu world mở). */
export function levelUnlocked(level) {
  if (!level || !worldUnlocked(level.world)) return false;
  if (level.n <= 1 || devOpen()) return true;
  const w = WORLDS.find((x) => x.id === level.world);
  return bestStars(w.levels[level.n - 2].id) >= 1;
}
/** Level đang tới: level đầu tiên chưa ≥1★ trong world mở gần nhất. */
/** Quán theo thứ tự HÀNH TRÌNH (tỉnh Bắc → Nam, quán trong tỉnh) + quán chưa xếp tỉnh (giữ thứ tự cũ). */
export function journeyWorlds() { const inProv = PROVINCES.flatMap((p) => p.worlds).map((id) => WORLDS.find((w) => w.id === id)).filter(Boolean); return [...inProv, ...WORLDS.filter((w) => !inProv.includes(w))]; }
export function currentLevel() {
  for (const w of journeyWorlds()) { if (!worldUnlocked(w.id)) break; const L = w.levels.find((x) => bestStars(x.id) < 1); if (L) return L; }
  return WORLDS[WORLDS.length - 1].levels.slice(-1)[0];
}
// ---- nâng cấp bếp ----
export function upgradeLevel(id) { return data.upgrades?.[id] || 0; }
export function upgradeCost(id) { const u = UPGRADES.find((x) => x.id === id); const lv = upgradeLevel(id); return u && lv < u.levels.length && upgradeUnlocked(id) ? u.levels[lv] : null; }
export function buyUpgrade(id) { const cost = upgradeCost(id); if (cost == null || pointsAvailable() < cost) return false; data.upgrades = { ...(data.upgrades || {}), [id]: upgradeLevel(id) + 1 }; data.spent += cost; save(); return true; }
/** Thông số bếp của người chơi (nâng cấp + trang trí). */
export function playerMods() { return modsFor(data.upgrades || {}, data.decor.length); }
/** Nâng cấp đã mở bán chưa (theo tổng sao). */
export function upgradeUnlocked(id) { const u = UPGRADES.find((x) => x.id === id); return !!u && totalStars() >= u.unlockStars; }
/** Thứ mở khoá NGAY SAU khi qua level này: món mới / khách quen / nâng cấp đủ sao / world kế. */
export function unlocksAfter(level) {
  const out = []; const w = WORLDS.find((x) => x.id === level.world); const nxt = w?.levels[level.n];
  if (nxt?.unlocks?.dish) out.push({ kind: 'dish', id: nxt.unlocks.dish });
  if (nxt?.unlocks?.regular) out.push({ kind: 'regular', id: nxt.unlocks.regular });
  if (level.unlocks?.upgrade) out.push({ kind: 'upgrade', id: level.unlocks.upgrade });
  const total = totalStars(); const J = journeyWorlds(); const i = J.indexOf(w);
  for (const u of UPGRADES) if (u.unlockStars <= total && u.unlockStars > total - 3) out.push({ kind: 'upgrade', id: u.id });
  // quán kế trên hành trình vừa mở nhờ ★ của quán này (báo một lần: khi tô sao vừa chạm ngưỡng — xấp xỉ bằng "mở và chênh ≤ 3★")
  const N = J[i + 1];
  if (N && worldUnlocked(N.id)) {
    const pN = provinceOf(N.id), pW = provinceOf(w.id);
    if (pN && pW && pN.id !== pW.id) { if (!nxt || provinceStars(pW.id) - pN.unlockStars < 3) out.push({ kind: 'province', id: pN.id }, { kind: 'world', id: N.id }); }
    else if (!nxt || worldStars(w.id) - (N.starsToUnlock || 0) < 3) out.push({ kind: 'world', id: N.id });
  }
  return out.filter((x, k) => out.findIndex((y) => y.kind === x.kind && y.id === x.id) === k);
}
