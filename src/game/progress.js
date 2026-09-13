// Tiến trình người chơi (localStorage): level đã mở, sao tốt nhất, điểm kiếm được, đồ trang trí đã mua, kỷ lục survival, món đang luyện.
// Điểm = tiền + tip mỗi lần chơi (mọi chế độ) + thưởng sao lần đầu. Điểm dùng mua trang trí quán (DECOR trong config).
import { DECOR } from '../config.js';
const KEY = 'qb.progress.v1';
let data = load();
function load() { try { return { stars: {}, points: 0, spent: 0, decor: [], survival: null, practice: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { stars: {}, points: 0, spent: 0, decor: [], survival: null, practice: null }; } }
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
export function resetProgress() { data = { stars: {}, points: 0, spent: 0, decor: [], survival: null, practice: null }; save(); }
