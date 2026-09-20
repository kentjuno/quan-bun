// M2 — CHUYẾN XE sang tỉnh mới, cắt giấy thuần web (khuôn chốt: tools/roadtrip.html, Kent 20/09).
// playTrip(pieceId, { onDone }) dựng overlay #trip, chạy 9 s: xe chạy đường SVG, camera bám, qua ranh màu loang + tên tỉnh,
// tới quán bảng hiệu pop + bong bóng chủ quán. Bỏ qua được. Vòng lặp setTimeout (rAF bị bóp ở khung xem trước).
import { PIECES } from './data/regions.js';
import { t as T, tl } from './i18n.js';

const MAP_W = 768, MAP_H = 1376, DURATION = 9000, WHEELS = [[24, 74], [80, 74]];
const smooth = (P) => { if (P.length < 2) return ''; let d = `M ${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`; } return d; };
const ease = (x) => x < .08 ? (x / .08) * (x / .08) * .08 : x > .9 ? 1 - Math.pow((1 - x) / .1, 2) * .1 : x;

let cur = null;
/** Đang có chuyến xe trên màn? */
export const tripRunning = () => !!cur;

export function playTrip(pieceId, { onDone, sfx } = {}) {
  const P = PIECES[pieceId]; if (!P || !P.pts || cur) { onDone?.(); return null; }
  const root = document.createElement('div'); root.id = 'trip';
  const map = `art/map/${P.img}.webp`;
  root.innerHTML = `
    <div class="tr-view"><div class="tr-world" style="--border:${P.border * 100}%;--cx:50%;--cy:50%;--r:0px">
      <img class="tr-map" src="${map}" alt="" draggable="false">
      <div class="tr-fog" style="background-image:url(${map})"></div>
      <svg class="tr-route" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none"><path d="${smooth(P.pts)}"></path></svg>
      <div class="tr-quan"><div class="sign">${tl(`trip.${pieceId}.sign`, P.sign)}<small>${tl(`trip.${pieceId}.signSub`, P.signSub)}</small></div></div>
      <div class="tr-bike"><img src="art/map/bike.webp" alt="" draggable="false"><i class="wheel"></i><i class="wheel"></i></div>
    </div>
    <div class="tr-clouds"></div><div class="tr-vignette"></div>
    <div class="tr-title">${tl(`trip.${pieceId}.title`, P.title)}<small>${tl(`trip.${pieceId}.sub`, P.sub)}</small></div>
    <div class="tr-bubble"><b>${tl(`trip.${pieceId}.who`, P.who)}:</b> ${tl(`trip.${pieceId}.bubble`, P.bubble)}</div>
    <div class="tr-ui"><button class="tr-skip ghost small">${T('trip.skip')}</button><button class="tr-go hidden">${T('trip.go')}</button></div></div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const view = $('.tr-view'), world = $('.tr-world'), path = $('path'), bike = $('.tr-bike'), quan = $('.tr-quan'), title = $('.tr-title'), bubble = $('.tr-bubble');
  let scale = 1, camX = 0, camY = 0, timer = null, done = false;
  function layout() { scale = (view.clientWidth || innerWidth || MAP_W) / MAP_W * 1.45; world.style.width = `${MAP_W}px`; world.style.height = `${MAP_H}px`; bike.style.setProperty('--bw', `${Math.round(MAP_W * 0.17)}px`); }
  layout();
  const L = path.getTotalLength();
  const at = (tt) => path.getPointAtLength(Math.max(0, Math.min(1, tt)) * L);
  let CROSS_T = 0.6; for (let k = 0; k <= 200; k++) { if (at(k / 200).y >= MAP_H * P.border) { CROSS_T = k / 200; break; } }
  function camera(p, dt) {
    const vw = view.clientWidth, vh = view.clientHeight;
    const tx = Math.max(0, Math.min(MAP_W * scale - vw, p.x * scale - vw * 0.5)), ty = Math.max(0, Math.min(MAP_H * scale - vh, p.y * scale - vh * 0.55));
    const k = Math.min(1, dt * 4); camX += (tx - camX) * k; camY += (ty - camY) * k;
    world.style.transform = `translate(${-camX}px, ${-camY}px) scale(${scale})`; return camY;
  }
  const wheels = bike.querySelectorAll('.wheel');
  function placeWheels() { const bw = bike.clientWidth, bh = bike.querySelector('img').clientHeight || bw * 0.75; const wd = bw * 0.22; bike.style.setProperty('--wd', `${wd}px`);
    wheels.forEach((el, i) => { const [px, py] = WHEELS[i]; el.style.left = `${bw * px / 100 - wd / 2}px`; el.style.top = `${bh * py / 100 - wd / 2}px`; }); }
  function placeBike(tt) { const p = at(tt), q = at(tt + 0.004); const dx = q.x - p.x, dy = q.y - p.y; const bw = bike.clientWidth, bh = bike.clientHeight;
    const flip = dx < -0.01; const ang = Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI; const tilt = Math.max(-10, Math.min(10, ang * 0.2));
    bike.style.transform = `translate(${p.x - bw / 2}px, ${p.y - bh * 0.85}px) scaleX(${flip ? -1 : 1}) rotate(${tilt}deg)`; return p; }
  let lastDust = 0;
  function dust(p, now) { if (now - lastDust < 140) return; lastDust = now; const d = document.createElement('i'); d.className = 'dust'; d.style.left = `${p.x - 30 + Math.random() * 10}px`; d.style.top = `${p.y - 8}px`; world.appendChild(d);
    d.animate([{ transform: 'translate(0,0) scale(.5)', opacity: .8 }, { transform: `translate(${-30 - Math.random() * 20}px,-${18 + Math.random() * 10}px) scale(1.4)`, opacity: 0 }], { duration: 600, easing: 'ease-out' }); setTimeout(() => d.remove(), 650); }
  const clouds = $('.tr-clouds');
  const CL = [[8, 4, .12], [62, 30, .08], [30, 70, .1]].map(([x, y, sp]) => { const im = document.createElement('img'); im.src = 'art/map/cloud.webp'; im.style.left = `${x}%`; im.style.top = `${y}%`; im.dataset.sp = sp; im.onerror = () => im.remove(); clouds.appendChild(im); return im; });
  const moveClouds = (cy) => { for (const im of CL) im.style.transform = `translateY(${-cy * +im.dataset.sp}px)`; };
  function reveal(p) {
    world.style.setProperty('--cx', `${p.x}px`); world.style.setProperty('--cy', `${p.y}px`);
    const t0 = performance.now(); const go = () => { if (done) return; const k = Math.min(1, (performance.now() - t0) / 1600); const e = 1 - Math.pow(1 - k, 3); world.style.setProperty('--r', `${e * 1800}px`); if (k < 1) setTimeout(go, 16); }; go();
    title.classList.add('on'); try { sfx?.bell?.(); } catch {}
  }
  function arrive(p) {
    root.classList.remove('moving');
    quan.style.left = `${p.x + 40}px`; quan.style.top = `${p.y - 30}px`; quan.classList.add('on'); try { sfx?.arrive?.(); } catch {}
    setTimeout(() => { if (!done) bubble.classList.add('on'); }, 500);
    setTimeout(() => { if (!done) { $('.tr-go').classList.remove('hidden'); $('.tr-skip').classList.add('hidden'); } }, 1200);
  }
  function finish() { if (done) return; done = true; clearTimeout(timer); cur = null; root.remove(); onDone?.(); }
  $('.tr-skip').onclick = finish; $('.tr-go').onclick = finish;
  cur = { finish };
  // chạy
  placeWheels(); placeBike(0); camera(at(0), 1);
  bike.querySelector('img').onload = () => { placeWheels(); placeBike(0); };
  setTimeout(() => {
    if (done) return; root.classList.add('moving'); let crossed = false;
    const t0 = performance.now(); let last = t0;
    const tick = () => { if (done) return; const now = performance.now(); const dt = (now - last) / 1000; last = now;
      const tt = ease(Math.min(1, (now - t0) / DURATION)); const p = placeBike(tt); moveClouds(camera(p, dt)); dust(p, now);
      if (!crossed && tt >= CROSS_T) { crossed = true; reveal(p); }
      if (tt < 1) timer = setTimeout(tick, 16); else arrive(p); };
    tick();
  }, 600);
  return cur;
}
