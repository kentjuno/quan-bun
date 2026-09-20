// HỒ SƠ NGƯỜI CHƠI (màn setup đầu game): tên · giới tính · ngôn ngữ.
// Chỉ nằm trong localStorage của máy người chơi, không gửi đi đâu (giống playlog).
// Giới tính CHỈ đổi xưng hô trong thoại (Kent chốt 20/09) — không có bộ ảnh nhân vật thứ hai.
const KEY = 'qb.player';
const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const put = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };

/** {name, gender:'m'|'f'|'x', done} — `done` = đã qua màn setup. */
export function player() { const p = get(); return { name: '', gender: 'x', done: false, ...(p || {}) }; }
export function setPlayer(patch) { const p = { ...player(), ...patch }; put(p); return p; }
export const setupDone = () => player().done === true;
/** Tên người chơi, hoặc `fallback` (cách chủ quán gọi: "con", "cháu"…) nếu chưa nhập. */
export const playerName = (fallback = '') => player().name || fallback;
export const MAX_NAME = 16;
/** Dọn tên: bỏ khoảng trắng thừa, cắt ngắn, chặn thẻ HTML. */
export const cleanName = (s) => String(s || '').replace(/[<>&\x22\x27]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/**
 * Thay chỗ trống trong thoại:
 *   `{you}`   → tên người chơi, chưa có thì lấy `fallback` (cách gọi mặc định của quán đó)
 *   `{a|b}`   → a nếu nam, b nếu nữ; không nói thì lấy a
 * Không có chỗ trống thì trả nguyên văn — thoại cũ vẫn chạy.
 */
export function speak(text, fallback = '', p = player()) {
  if (!text) return text;
  return String(text)
    .replace(/\{you\}/g, () => p.name || fallback)
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, m, f) => (p.gender === 'f' ? f : m));
}
