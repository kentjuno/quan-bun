// M3 — SỔ TAY MÓN (docs/PLAN-PUBLIC.md P3, ROADMAP §1 cơ chế sao):
//   trang món      : mở khi bưng món đó SẠCH lần đầu (mastery.clean ≥ 1) hoặc có ≥1★ ở level có món
//   công thức game : ≥ 1★ ở các level có món   (bước ráp từ dishes/<id>.json — bản chung, KHÔNG phải sim-data)
//   công thức thật : ≥ RECIPE_STARS ★ (tổng ★ tốt nhất của các level có món)   → dishes/<id>.json.real (vi/en, có nguồn)
// Chỉ đọc data/dishes + GAME_DATA — không bao giờ đọc sim-data (bẫy P3).
import { DISHES, DISH_IDS } from './data/dishes/index.js';
import { GAME_DATA } from './game/gamedata.js';
import { WORLDS } from './config.js';
import { bestStars } from './game/progress.js';
import { masteryOf } from './game/mastery.js';
import { dishArtAt } from './game/art.js';
import { PROVINCES } from './data/regions.js';
import { t as T, tl, lang } from './i18n.js';
import { labelL, setSource, source } from './game/recipes.js';
import { ev as logEv } from './playlog.js';

export const RECIPE_STARS = 6;   // Kent duyệt 20/09

/** Tổng ★ tốt nhất của mọi level có món này. */
export function dishStars(dish) { let n = 0; for (const w of WORLDS) for (const L of w.levels) if (L.dishes.includes(dish)) n += bestStars(L.id); return n; }
export const pageOpen = (dish) => masteryOf(dish).clean >= 1 || dishStars(dish) >= 1;
export const gameRecipeOpen = (dish) => dishStars(dish) >= 1;
export const realRecipeOpen = (dish) => dishStars(dish) >= RECIPE_STARS;
export const codexCount = () => DISH_IDS.filter(pageOpen).length;

/** Bước ráp bản CHUNG (nguồn game) — nhãn theo ngôn ngữ. */
export function gameSteps(dish) {
  const prev = source(); if (prev !== 'game') setSource('game');
  try { const r = GAME_DATA.recipes[dish]; return r.assembly.filter((s) => s !== '@finish').map((s) => (s === 'base-ready' ? [`bowl-hot:${r.base.bowl}`, `noodle-drained:${r.base.noodle}`] : s.startsWith('@') ? `broth:${s.slice(1)}` : s)).flat().map(labelL); }
  finally { if (prev !== 'game') setSource(prev); }
}
const provName = (id) => { const p = PROVINCES.find((x) => x.id === id); return p ? tl(`prov.${p.id}.name`, p.name) : id; };

/** Thứ tự sổ tay = thứ tự hành trình (tỉnh → world → lần xuất hiện đầu). */
export function codexOrder() {
  const seen = []; for (const p of PROVINCES) for (const wid of p.worlds) { const w = WORLDS.find((x) => x.id === wid); if (!w) continue; for (const L of w.levels) for (const d of L.dishes) if (DISHES[d] && !seen.includes(d)) seen.push(d); }
  for (const d of DISH_IDS) if (!seen.includes(d)) seen.push(d); return seen;
}

// ---------- lưới ----------
export function renderGrid(el, onOpen) {
  el.replaceChildren(...codexOrder().map((d) => { const D = DISHES[d]; const open = pageOpen(d); const st = dishStars(d);
    const c = document.createElement('button'); c.className = 'cx-cell' + (open ? '' : ' locked') + (realRecipeOpen(d) ? ' full' : '');
    const art = dishArtAt(d, 'wet');
    c.innerHTML = `${art ? `<img src="${art}" alt="" draggable="false">` : '<span class="ic">🍜</span>'}<b>${open ? D.name : '???'}</b><small>${open ? `${Math.min(st, RECIPE_STARS)}/${RECIPE_STARS} ★` : T('codex.lockedCell')}</small>`;
    c.onclick = () => { if (open) onOpen(d); };
    return c; }));
}

// ---------- trang món ----------
let cur = null;
export function openPage(dish, { sfx } = {}) {
  const D = DISHES[dish]; if (!D) return; closePage();
  logEv('codex.open', { dish, stars: dishStars(dish), real: realRecipeOpen(dish) });
  const L = lang(); const st = dishStars(dish); const art = dishArtAt(dish, 'wet');
  const real = D.real; const R = real ? (real[L] || real.vi) : null;
  const list = (arr) => `<ol>${(arr || []).map((x) => `<li>${x}</li>`).join('')}</ol>`;
  const ul = (arr) => `<ul>${(arr || []).map((x) => `<li>${x}</li>`).join('')}</ul>`;
  const locked = (need) => `<div class="cx-lock">🔒 ${T('codex.needStars', { n: need, have: st })}<small>${T('codex.needStars.how')}</small></div>`;
  const root = document.createElement('div'); root.id = 'codex';
  root.innerHTML = `<div class="cx-page">
    <button class="cx-x">✕</button>
    <div class="cx-hero">${art ? `<img src="${art}" alt="" draggable="false">` : ''}<h1>${D.name}</h1><div class="cx-pron">${D.pron ? `/${D.pron}/` : ''}${L !== 'vi' && D.gloss ? ` · <i>${D.gloss}</i>` : ''}</div>
      <div class="cx-meta">📍 ${provName(D.region)} · ${'★'.repeat(Math.min(st, RECIPE_STARS))}${'☆'.repeat(Math.max(0, RECIPE_STARS - st))}${st > RECIPE_STARS ? ` +${st - RECIPE_STARS}` : ''}</div></div>
    <section><h2>${T('codex.story')}</h2><p>${tl(`codex.${dish}.story`, D.codex?.story || '')}</p>${D.codex?.how_to_eat ? `<p><b>${T('codex.eat')}:</b> ${tl(`codex.${dish}.eat`, D.codex.how_to_eat)}</p>` : ''}${D.codex?.region_note && L === 'vi' ? `<p class="cx-note">${D.codex.region_note}</p>` : ''}</section>
    <section><h2>${T('codex.gameRecipe')}</h2>${gameRecipeOpen(dish) ? list(gameSteps(dish)) : locked(1)}</section>
    <section class="cx-real"><h2>${T('codex.realRecipe')}</h2>${realRecipeOpen(dish) && R ? `
      <div class="cx-rmeta">👥 ${T('codex.servings', { n: R.servings })} · ⏱ ${R.time}${real.review && L === 'vi' ? ` · <em>${real.review}</em>` : ''}</div>
      <h3>${T('codex.ingredients')}</h3>${ul(R.ingredients)}
      ${R.broth?.length ? `<h3>${T('codex.broth')}</h3>${list(R.broth)}` : ''}
      <h3>${T('codex.prep')}</h3>${list(R.prep)}
      <h3>${T('codex.assemble')}</h3>${list(R.assemble)}
      <p><b>${T('codex.serve')}:</b> ${R.serve}</p>
      <h3>${T('codex.tips')}</h3>${ul(R.tips)}
      <h3>${T('codex.sources')}</h3><ul class="cx-src">${(R.sources || []).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`).join('')}</ul>
      <div class="cx-actions"><button class="cx-print secondary">🖨 ${T('codex.print')}</button></div>` : locked(RECIPE_STARS)}</section>
    <div class="cx-actions"><button class="cx-share">📸 ${T('codex.share')}</button></div>
  </div>`;
  document.body.appendChild(root); cur = root;
  root.querySelector('.cx-x').onclick = closePage;
  root.querySelector('.cx-share').onclick = () => shareImage(dish).catch(() => {});
  root.querySelector('.cx-print')?.addEventListener('click', () => { document.body.classList.add('printing'); setTimeout(() => { window.print(); document.body.classList.remove('printing'); }, 50); });
  try { sfx?.place?.(); } catch {}
  return root;
}
export function closePage() { if (cur) { cur.remove(); cur = null; } }

// ---------- ảnh chia sẻ 1080×1350 (canvas) ----------
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function wrap(ctx, text, x, y, maxW, lh) { const words = text.split(' '); let line = ''; for (const w of words) { const test = line ? `${line} ${w}` : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = test; } if (line) ctx.fillText(line, x, y); return y + lh; }
export async function shareImage(dish) {
  const D = DISHES[dish]; const W = 1080, H = 1350; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#fffdf5'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#26190f'; c.lineWidth = 10; c.strokeRect(30, 30, W - 60, H - 60);
  const art = dishArtAt(dish, 'wet'); if (art) { try { const im = await loadImg(art); const s = Math.min(760 / im.width, 620 / im.height); const w = im.width * s, h = im.height * s; c.drawImage(im, (W - w) / 2, 120, w, h); } catch {} }
  c.fillStyle = '#26190f'; c.textAlign = 'center'; c.font = '700 84px "Patrick Hand", cursive'; c.fillText(D.name, W / 2, 840);
  c.font = '400 40px "Patrick Hand", cursive'; c.fillStyle = '#7a5a3a'; c.fillText(`/${D.pron || ''}/ · ${D.gloss || ''}`, W / 2, 900);
  c.fillStyle = '#26190f'; c.font = '400 40px "Patrick Hand", cursive'; c.textAlign = 'left';
  const story = tl(`codex.${dish}.story`, D.codex?.story || ''); const first = story.split(/(?<=[.!?])\s/)[0] || story; wrap(c, first, 90, 980, W - 180, 52);
  c.textAlign = 'center'; c.fillStyle = '#d64a2c'; c.font = '700 44px "Patrick Hand", cursive'; c.fillText(`${T('app.name')} · kentjuno.github.io/quan-bun`, W / 2, 1260);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png')); const file = new File([blob], `${dish}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: D.name }); return; } catch {} }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${dish}.png`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
