// P7 / M6 — GHI LOG PLAYTEST (docs/PLAN-PUBLIC.md §P7).
// Bật bằng `?log=1` (nhớ vào localStorage, tắt bằng `?log=0`). KHÔNG gửi đi đâu hết:
// mọi thứ nằm trong localStorage `qb.log`, xuất ra file JSON bằng nút "Xuất log" ở Cách chơi · tuỳ chọn.
// Dùng để trả lời đúng 4 câu của P7: phút mấy bưng tô đầu · phút mấy chán/bỏ · làm gì trước · có mở sổ tay không.
const KEY = 'qb.log';
const MAX = 500;            // cắt bớt cho khỏi đầy localStorage
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

let on = false;
try {
  const q = new URLSearchParams(location.search).get('log');
  if (q === '1') set(KEY + '.on', '1'); else if (q === '0') set(KEY + '.on', '0');
  on = get(KEY + '.on') === '1';
} catch {}

/** Có đang ghi log không? */
export const logOn = () => on;
/** Mốc 0 của phiên chơi (mở app). Mọi `at` là giây kể từ đây. */
const T0 = Date.now();
let firstBowl = null;       // giây của tô đầu tiên trong phiên (câu hỏi quan trọng nhất của P7)

export function readLog() { try { return JSON.parse(get(KEY) || '[]'); } catch { return []; } }
function write(rows) { set(KEY, JSON.stringify(rows.slice(-MAX))); }

/** Ghi một sự kiện. `type` kiểu 'level.start'; `data` là object nhỏ, không chứa gì riêng tư. */
export function ev(type, data = {}) {
  if (!on) return null;
  const at = +((Date.now() - T0) / 1000).toFixed(1);
  const row = { at, type, ...data };
  if (type === 'serve' && firstBowl == null) { firstBowl = at; row.first = true; }
  const rows = readLog(); rows.push(row); write(rows);
  return row;
}

/** Giây của tô đầu tiên trong phiên này (null = chưa bưng tô nào). */
export const firstBowlAt = () => firstBowl;
export function clearLog() { set(KEY, '[]'); firstBowl = null; }

/** Tóm tắt để đọc bằng mắt mà không cần mở JSON. */
export function summary(rows = readLog()) {
  const first = rows.find((r) => r.type === 'serve');
  const levels = rows.filter((r) => r.type === 'level.start').length;
  const quits = rows.filter((r) => r.type === 'level.quit').length;
  const ends = rows.filter((r) => r.type === 'level.end');
  const codex = rows.filter((r) => r.type === 'codex.open').length;
  return {
    events: rows.length,
    firstBowlAt: first ? first.at : null,
    lastAt: rows.length ? rows[rows.length - 1].at : 0,
    levelsStarted: levels, levelsFinished: ends.length, quits,
    starsBest: ends.reduce((n, r) => Math.max(n, r.stars || 0), 0),
    codexOpened: codex,
    tutorial: rows.some((r) => r.type === 'tut.skip') ? 'skip' : rows.some((r) => r.type === 'tut.done') ? 'done' : 'none',
  };
}

/** Tải file JSON (log + tóm tắt). Không có server, không gửi đi đâu. */
export function exportLog() {
  const rows = readLog();
  const blob = new Blob([JSON.stringify({ app: 'kj-pho-real', exportedAt: new Date().toISOString(), summary: summary(rows), events: rows }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `qb-log-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return rows.length;
}
