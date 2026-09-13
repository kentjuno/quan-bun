// Tiến độ nhớ món (localStorage) — theo tinh thần Leitner của cooking-note: món hay sai ra nhiều hơn, món thuộc rồi thì ẩn tên.
// Mỗi món: plays (số tô đã giao), clean (số tô giao không lỗi thứ tự), streak (chuỗi sạch liên tiếp), best (giây/tô nhanh nhất), last (giây tô gần nhất), errors[] (tag lỗi gần đây, tối đa 20)
const KEY = 'qb.mastery.v1';
let data = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} }
export function masteryOf(dish) { return data[dish] || { plays: 0, clean: 0, streak: 0, best: null, last: null, errors: [] }; }
export function allMastery() { return { ...data }; }
/** Ghi kết quả một ca / drill: từng tô + các lỗi có tag. */
export function recordResult(result) {
  const errs = result.errors.filter((e) => !e.waste);
  for (const b of result.stats?.bowls || []) {
    const m = masteryOf(b.dish); m.plays++;
    if (b.mistakes === 0) { m.clean++; m.streak++; } else m.streak = 0;
    m.last = b.wait; if (m.best == null || b.wait < m.best) m.best = b.wait;
    data[b.dish] = m;
  }
  // lỗi gắn vào món của tô đang làm lúc đó (xấp xỉ: tô giao ngay sau lỗi)
  for (const e of errs) { const b = (result.stats?.bowls || []).find((x) => x.servedAt >= e.t); if (!b) continue; const m = masteryOf(b.dish); m.errors = [...(m.errors || []), e.tag].slice(-20); data[b.dish] = m; }
  save();
}
/** Đã "thuộc" = ≥ 3 tô sạch liên tiếp → ẩn tên trên card. */
export function isMastered(dish) { return masteryOf(dish).streak >= 3; }
/** Trọng số ra đơn: món chưa thuộc / hay sai nặng hơn (1 → 4). */
export function weightsFor(dishes) {
  const out = {};
  for (const d of dishes) { const m = masteryOf(d); const errRate = m.plays ? 1 - m.clean / m.plays : 1; out[d] = 1 + 3 * errRate + (m.streak >= 3 ? -0.6 : 0); out[d] = Math.max(0.4, out[d]); }
  return out;
}
export function resetMastery() { data = {}; save(); }
