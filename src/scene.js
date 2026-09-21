// M2 — MÀN KỂ CHUYỆN cắt giấy: (1) mở đầu văn phòng 4 tấm (public/art/intro/intro-N.webp), (2) "xin vô quán": chủ quán trượt vào + bảng hiệu + 2 câu.
// Bỏ qua được. Chữ: i18n `intro.N`, `quan.<world>.greet|dare`. Không engine, không rAF.
import { QUAN } from './data/regions.js';
import { REGULARS } from './data/customers.js';
import { faceArt } from './game/art.js';
import { sceneFor } from './data/scenes.js';
import { t as T, tl } from './i18n.js';
import { speak, player } from './data/player.js';

let cur = null;
export const sceneRunning = () => !!cur;
function mount(html, cls = '') { const root = document.createElement('div'); root.id = 'scene'; root.className = cls; root.innerHTML = html; document.body.appendChild(root); return root; }
function end(root, onDone) { if (!cur) return; cur = null; root.classList.add('out'); setTimeout(() => root.remove(), 350); onDone?.(); }

/** Mở đầu: 4 tấm + lời dẫn, chạm để sang tấm kế. */
export function playIntro({ onDone, sfx } = {}) {
  if (cur) { onDone?.(); return; }
  const N = 4; let i = 0;
  // Bản nữ dùng bộ ảnh art/intro/f/ (Kent 21/09). Thiếu ảnh thì tự rơi về bộ gốc.
  const dir = player().gender === 'f' ? 'art/intro/f/' : 'art/intro/';
  const root = mount(`<div class="sc-slides">${Array.from({ length: N }, (_, k) => `<img class="sc-img" src="${dir}intro-${k + 1}.webp" data-alt="art/intro/intro-${k + 1}.webp" alt="" draggable="false" onerror="if (this.src.indexOf(this.dataset.alt) < 0) this.src = this.dataset.alt; else this.classList.add('noart')">`).join('')}</div>
    <div class="sc-cap"><p></p><small>${T('scene.tap')}</small></div><button class="sc-skip ghost small">${T('trip.skip')}</button>`, 'intro');
  const imgs = root.querySelectorAll('.sc-img'); const cap = root.querySelector('.sc-cap p');
  const show = () => { imgs.forEach((im, k) => im.classList.toggle('on', k === i)); cap.textContent = T(`intro.${i + 1}`); root.querySelector('.sc-cap').classList.remove('in'); void cap.offsetWidth; root.querySelector('.sc-cap').classList.add('in'); try { sfx?.place?.(); } catch {} };
  cur = { finish: () => end(root, onDone) };
  root.querySelector('.sc-skip').onclick = (e) => { e.stopPropagation(); cur.finish(); };
  root.onclick = () => { i++; if (i >= N) cur.finish(); else show(); };
  show();
  return cur;
}

/** Xin vô quán: chủ quán nói 2 câu (chào + thử thách), rồi vô bếp. */
export function playOwner(worldId, { onDone, sfx } = {}) {
  const q = QUAN[worldId]; if (!q || cur) { onDone?.(); return; }
  const face = faceArt(q.owner, worldId.length);
  const call = tl(`quan.${worldId}.call`, q.call || '');   // chủ quán gọi gì khi chưa biết tên
  const lines = [tl(`quan.${worldId}.greet`, q.greet), tl(`quan.${worldId}.dare`, q.dare)].map((x) => speak(x, call)); let i = 0;
  const root = mount(`<div class="sc-door"></div><div class="sc-sign">${tl(`quan.${worldId}.name`, q.name)}</div>
    <img class="sc-face" src="${face}" alt="" draggable="false" onerror="this.remove()">
    <div class="sc-bubble"><b></b><span></span><small>${T('scene.tap')}</small></div><button class="sc-skip ghost small">${T('trip.skip')}</button>`, 'owner');
  const who = q.who ? tl(`quan.${worldId}.who`, q.who) : q.owner ? (REGULARS.find((r) => r.id === q.owner)?.name || q.owner) : T('scene.owner');
  root.querySelector('.sc-bubble b').textContent = who + ': ';
  const show = () => { const b = root.querySelector('.sc-bubble'); b.querySelector('span').textContent = lines[i]; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); try { sfx?.hum?.('good'); } catch {} };
  cur = { finish: () => end(root, onDone) };
  root.querySelector('.sc-skip').onclick = (e) => { e.stopPropagation(); cur.finish(); };
  root.onclick = () => { i++; if (i >= lines.length) cur.finish(); else show(); };
  // nền màn xin vô quán = bếp của chính quán đó (thiếu ảnh thì giữ bếp gốc trong CSS)
  const bg = sceneFor(worldId).src; const pre = new Image(); pre.onload = () => { root.style.backgroundImage = `url(${bg})`; }; pre.src = bg;
  setTimeout(() => { root.classList.add('open'); try { sfx?.arrive?.(); } catch {} }, 50);
  setTimeout(show, 500);
  return cur;
}
