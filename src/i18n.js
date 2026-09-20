// i18n — mọi chữ hiện ra màn hình đi qua đây (docs/PLAN-PUBLIC.md P1).
// Hai loại chuỗi:
//   1. UI: key trong data/i18n/<lang>.json → t('menu.start').
//   2. DATA (worlds.js, customers.js, config LEVELS…): tiếng Việt viết thẳng trong data là NGUỒN;
//      bản dịch nằm trong <lang>.json theo key → tl('level.pho-4.title', L.title). Không có key thì trả tiếng Việt.
// Tên món / nguyên liệu KHÔNG dịch (label() giữ tiếng Việt) — chỉ thêm cách đọc + giải nghĩa qua items.json (P1.2).
import vi from './data/i18n/vi.json';
import en from './data/i18n/en.json';
import items from './data/i18n/items.json';

const TABLES = { vi, en };
export const LANGS = Object.keys(TABLES);
let cur = 'vi';
const KEY = 'qb.lang';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

/** Gọi một lần lúc khởi động: ngôn ngữ đã lưu, không thì theo trình duyệt (vi-* → vi, còn lại en). */
export function initLang() {
  const saved = safeGet(KEY);
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'vi';
  cur = TABLES[saved] ? saved : (nav.toLowerCase().startsWith('vi') ? 'vi' : 'en');
  if (typeof document !== 'undefined') document.documentElement.lang = cur;
  return cur;
}
export const lang = () => cur;
export function setLang(code) {
  if (!TABLES[code]) return cur;
  cur = code; safeSet(KEY, code);
  if (typeof document !== 'undefined') { document.documentElement.lang = code; applyDom(); }
  for (const f of listeners) f(code);
  return cur;
}
const listeners = new Set();
/** Đăng ký vẽ lại khi đổi ngôn ngữ (menu, thẻ level…). */
export const onLang = (f) => { listeners.add(f); return () => listeners.delete(f); };

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)) : s);

/** Chuỗi UI theo key. Thiếu ở ngôn ngữ hiện tại → vi; thiếu cả vi → phần cuối của key (không bao giờ hiện key thô có dấu chấm). */
export function t(key, vars) {
  let s = TABLES[cur][key];
  if (s == null) s = TABLES.vi[key];
  if (s == null) { if (typeof console !== 'undefined') console.warn('[i18n] thiếu key', key); s = String(key).split('.').pop(); }   // vi-src
  return fill(s, vars);
}

/** Chuỗi trong DATA: `viText` là nguồn, bản dịch (nếu có) ở <lang>.json theo `key`. */
export function tl(key, viText, vars) {
  const s = cur === 'vi' ? viText : (TABLES[cur][key] ?? viText);
  return fill(s ?? '', vars);
}

/** Đổ chữ vào DOM tĩnh: <el data-i18n="key">, data-i18n-title="key", data-i18n-html="key" (cho chuỗi có thẻ). */
export function applyDom(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
}

// ---- tên món / nguyên liệu: giữ tiếng Việt, thêm giải nghĩa + cách đọc (P1 §2) ----
/** Giải nghĩa tiếng Anh của món (`dishes`) hoặc nguyên liệu (`items`); '' nếu không có hoặc đang chơi tiếng Việt. */
export function gloss(tok) { if (cur === 'vi') return ''; return items.dishes[tok]?.en || items.items[tok]?.en || ''; }
/** Cách đọc kiểu Anh gần đúng ("fuh tie nahm"); '' nếu không có. */
export const pron = (tok) => items.dishes[tok]?.pron || items.items[tok]?.pron || '';
/** Tên Việt + giải nghĩa: "Nạm (brisket)". Tiếng Việt → chỉ tên. */
export function withGloss(viName, tok) { const g = gloss(tok); return g ? `${viName} (${g})` : viName; }
/** Tên hành động ở trạm (không phải tên riêng → dịch hẳn). */
export const actionName = (id, viName) => (cur === 'vi' ? viName : (items.actions[id] || viName));
/** Nhãn trạng thái từ sim-data.labels (dịch hẳn). */
export const stateLabel = (id, viName) => (cur === 'vi' ? viName : (items.labels[id] || viName));
export const ITEM_GLOSS = items;
