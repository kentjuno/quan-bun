// MÀN SETUP ĐẦU GAME (Kent 20/09: "mở app phải là intro cốt truyện rồi mới vô game").
// Thứ tự lần đầu mở app:  setup (ngôn ngữ → tên + giới tính)  →  intro 4 tấm  →  quán đầu.
// Giới tính chỉ đổi xưng hô trong thoại (xem data/player.js `speak`), KHÔNG có bộ ảnh nhân vật thứ hai.
import { t as T, setLang, lang } from './i18n.js';
import { player, setPlayer, cleanName, MAX_NAME } from './data/player.js';

// Màn chọn ngôn ngữ phải SONG NGỮ (người chưa chọn thì chưa có ngôn ngữ) → chuỗi nằm thẳng ở đây.
const PICK = 'Chọn ngôn ngữ · Choose your language';   // vi-src
const LANGS = [['vi', '🇻🇳', 'Tiếng Việt'], ['en', '🌏', 'English']];   // vi-src

let cur = null;
export const setupRunning = () => !!cur;

/** @param {{onDone?:Function, sfx?:object, edit?:boolean}} o  `edit` = mở lại từ tuỳ chọn (bỏ bước ngôn ngữ nếu muốn). */
export function playSetup({ onDone, sfx, edit = false } = {}) {
  if (cur) { onDone?.(); return null; }
  const root = document.createElement('div'); root.id = 'setup'; document.body.appendChild(root);
  const p = player(); let gender = p.gender || 'x';
  const finish = () => { if (!cur) return; cur = null; root.classList.add('out'); setTimeout(() => root.remove(), 300); onDone?.(); };
  cur = { finish };

  function stepLang() {
    root.innerHTML = `<div class="su-card">
      <h1>KJ Phở Real</h1>
      <p class="su-sub">${PICK}</p>
      <div class="su-langs">
        ${LANGS.map(([l, flag, name]) => `<button data-l="${l}"><span>${flag}</span>${name}</button>`).join('')}
      </div></div>`;
    for (const b of root.querySelectorAll('.su-langs button')) b.onclick = () => { setLang(b.dataset.l); try { sfx?.place?.(); } catch {} stepWho(); };
  }

  function stepWho() {
    root.innerHTML = `<div class="su-card">
      <h1>${T('setup.title')}</h1>
      <p class="su-sub">${T('setup.why')}</p>
      <label class="su-field"><span>${T('setup.name')}</span>
        <input id="suName" type="text" maxlength="${MAX_NAME}" autocomplete="off" placeholder="${T('setup.namePh')}" value="${p.name || ''}"></label>
      <div class="su-field"><span>${T('setup.gender')}</span>
        <div class="su-gender">${[['m', T('setup.g.m')], ['f', T('setup.g.f')], ['x', T('setup.g.x')]].map(([g, n]) => `<button data-g="${g}"${g === gender ? ' class="on"' : ''}>${n}</button>`).join('')}</div></div>
      <button id="suGo" class="su-go">${T('setup.go')}</button>
      <button id="suSkip" class="ghost small">${T('setup.skip')}</button></div>`;
    for (const b of root.querySelectorAll('.su-gender button')) b.onclick = () => { gender = b.dataset.g; for (const x of root.querySelectorAll('.su-gender button')) x.classList.toggle('on', x === b); try { sfx?.tap?.(); } catch {} };
    const go = () => { setPlayer({ name: cleanName(root.querySelector('#suName').value), gender, lang: lang(), done: true }); try { sfx?.done?.(); } catch {} finish(); };
    root.querySelector('#suGo').onclick = go;
    root.querySelector('#suSkip').onclick = () => { setPlayer({ name: '', gender: 'x', lang: lang(), done: true }); finish(); };
    root.querySelector('#suName').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    setTimeout(() => root.querySelector('#suName')?.focus(), 250);
  }

  if (edit) stepWho(); else stepLang();
  return cur;
}
