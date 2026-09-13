// Chế độ "Đố" — puzzle 2D nhanh, cùng dữ liệu công thức với bếp 3D (sửa món ở sim-data → đố đổi theo).
// 3 kiểu: (1) Xếp thứ tự ráp tô  (2) Bắt kẻ lạ: nguyên liệu không thuộc món  (3) Thiếu gì: bước bị giấu, chọn 1/4.
// Kết quả ghi vào Tiến độ nhớ món (mastery) như một tô: sạch = không bấm sai lần nào.
import { D, recipeFor, label } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { ALL_DISHES } from './config.js';

const $ = (id) => document.getElementById(id);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickW = (weights) => { const ks = Object.keys(weights); const sum = ks.reduce((n, k) => n + weights[k], 0); let r = Math.random() * sum; for (const k of ks) { r -= weights[k]; if (r <= 0) return k; } return ks[ks.length - 1]; };
const icon = (tok) => { const u = iconUrl(tok); return u ? `<img src="${u}" alt="" draggable="false">` : `<span class="emo">${D.items[tok]?.icon || '🍲'}</span>`; };
/** Nguyên liệu "gây nhiễu" cho món d: đồ của món khác không có trong món này (ưu tiên cùng nhóm sợi/nước cho khó hơn) */
function intruders(d, n) {
  const mine = new Set(recipeFor(d).shelfItems); const pool = new Set();
  for (const o of ALL_DISHES) if (o !== d) for (const it of recipeFor(o).shelfItems) if (!mine.has(it) && D.items[it] && !/bowl|tray|plate|dia-lon|mam-dan|noodle-basket|chao-ap-ca/.test(it)) pool.add(it);
  return shuffle([...pool]).slice(0, n);
}

export class Puzzle {
  /** @param {{ dishes: string[], weights: Object, rounds: number, kinds?: string[], onDone: (result) => void, sfx: any }} o — kinds: ['order','intruder','missing'] (Đố nhanh) hoặc ['ninja'] (Chém) */
  constructor(o) { this.o = o; this.i = 0; this.results = []; this.el = $('puzzle'); }
  start() { this.i = 0; this.results = []; this.t0 = performance.now(); this.el.classList.remove('hidden'); this.next(); }
  stop() { this.el.classList.add('hidden'); this.ninja?.stop(); }
  next() {
    if (this.i >= this.o.rounds) return this.finish();
    const dish = pickW(this.o.weights); const kinds = this.o.kinds || ['order', 'intruder', 'missing']; const kind = kinds[this.i % kinds.length];
    this.cur = { dish, kind, mistakes: 0, t0: performance.now(), taps: 0 }; this.i++;
    $('pzProgress').textContent = `${this.i}/${this.o.rounds}`; $('pzDish').textContent = D.recipes[dish].name;
    $('pzCanvas').classList.add('hidden'); $('pzGrid').classList.remove('hidden');
    ({ order: this.buildOrder, intruder: this.buildIntruder, missing: this.buildMissing, ninja: this.buildNinja })[kind].call(this, dish);
  }
  steps(dish) { return recipeFor(dish).assembly; }
  // ---- (1) xếp thứ tự: bấm các bước theo đúng thứ tự ráp ----
  buildOrder(dish) {
    const steps = this.steps(dish); let k = 0; this._sol = steps.map(label);
    $('pzTitle').textContent = 'Bấm các bước theo đúng thứ tự ráp'; $('pzAnswer').replaceChildren(); $('pzAnswer').classList.remove('hidden');
    $('pzGrid').replaceChildren(...shuffle(steps.map((t, idx) => idx)).map((idx) => {
      const el = document.createElement('button'); el.className = 'pz'; el.innerHTML = `${icon(steps[idx])}<span>${label(steps[idx])}</span>`;
      el.onclick = () => { this.cur.taps++; if (idx === k) { el.classList.add('ok'); el.disabled = true; const a = document.createElement('span'); a.className = 'ans'; a.textContent = `${k + 1}. ${label(steps[idx])}`; $('pzAnswer').appendChild(a); k++; this.o.sfx?.place?.(); if (k === steps.length) this.solved(); } else this.wrong(el, `Chưa tới lượt "${label(steps[idx])}" — kế tiếp là bước ${k + 1}`); };
      return el;
    }));
  }
  // ---- (2) bắt kẻ lạ: 2 nguyên liệu không thuộc món, bấm đúng cả 2 ----
  buildIntruder(dish) {
    const mine = recipeFor(dish).shelfItems.filter((it) => D.items[it] && !/bowl|tray-paper|noodle-basket/.test(it)); const bad = intruders(dish, 2); let left = bad.length; this._sol = bad.map(label);
    $('pzTitle').textContent = `Bắt ${bad.length} thứ KHÔNG thuộc món này`; $('pzAnswer').classList.add('hidden');
    $('pzGrid').replaceChildren(...shuffle([...mine.slice(0, 8), ...bad]).map((it) => {
      const el = document.createElement('button'); el.className = 'pz'; el.innerHTML = `${icon(it)}<span>${label(it)}</span>`;
      el.onclick = () => { this.cur.taps++; if (bad.includes(it)) { el.classList.add('bad-found'); el.disabled = true; this.o.sfx?.trash?.(); if (--left === 0) this.solved(); } else this.wrong(el, `"${label(it)}" có trong ${D.recipes[dish].name}`); };
      return el;
    }));
  }
  // ---- (3) thiếu gì: chuỗi ráp bị giấu 1 bước, chọn đúng trong 4 ----
  buildMissing(dish) {
    const steps = this.steps(dish); const hide = 1 + Math.floor(Math.random() * (steps.length - 1)); const answer = steps[hide];
    const others = intruders(dish, 3); this._sol = [label(answer)];   // đáp án sai = đồ của món khác (bước đang hiện thì loại ngay, không đố)
    $('pzTitle').textContent = 'Bước bị giấu là gì?'; $('pzAnswer').classList.remove('hidden');
    $('pzAnswer').replaceChildren(...steps.map((t, i) => { const a = document.createElement('span'); a.className = 'ans' + (i === hide ? ' hole' : ''); a.textContent = i === hide ? `${i + 1}. ?` : `${i + 1}. ${label(t)}`; return a; }));
    $('pzGrid').replaceChildren(...shuffle([answer, ...others]).map((t) => {
      const el = document.createElement('button'); el.className = 'pz'; el.innerHTML = `${icon(t)}<span>${label(t)}</span>`;
      el.onclick = () => { this.cur.taps++; if (t === answer) { el.classList.add('ok'); $('pzAnswer').querySelector('.hole').textContent = `${hide + 1}. ${label(answer)}`; this.solved(); } else this.wrong(el, `Không phải "${label(t)}"`); };
      return el;
    }));
  }
  // ---- (4) chém: nguyên liệu tung lên, vuốt chém đúng thành phần của món; chém đồ lạ hoặc để sót đồ của món = lỗi ----
  buildNinja(dish) {
    const mine = recipeFor(dish).shelfItems.filter((it) => D.items[it] && !/tray-paper|noodle-basket/.test(it)); const good = shuffle(mine).slice(0, 8); const bad = intruders(dish, Math.max(3, Math.round(good.length * 0.6)));
    this._sol = good.map(label);
    $('pzTitle').textContent = `Vuốt chém đúng thành phần của ${D.recipes[dish].name} (${good.length} thứ) — chừa đồ lạ`; $('pzAnswer').classList.add('hidden'); $('pzGrid').classList.add('hidden');
    const cv = $('pzCanvas'); cv.classList.remove('hidden');
    this.ninja?.stop();
    for (const t of [...good, ...bad]) { const im = new Image(); im.src = iconUrl(t) || ''; }   // nạp ảnh trước khi tung
    this.ninja = new Ninja(cv, { good, bad, onHit: (ok, tok) => { this.cur.taps++; if (!ok) this.wrong(cv, `"${label(tok)}" không có trong ${D.recipes[dish].name}`); else { this.o.sfx?.place?.(); $('pzMsg').textContent = ''; } }, onMiss: (tok) => { this.cur.mistakes++; $('pzMsg').textContent = `Sót "${label(tok)}" — có trong món này`; this.o.sfx?.mistake?.(); }, onEnd: () => this.solved() });
    this.ninja.start();
  }
  /** (test) nhãn các nút cần bấm theo thứ tự để giải câu hiện tại */
  solution() { return this._sol || []; }
  wrong(el, msg) { this.cur.mistakes++; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); $('pzMsg').textContent = msg; this.o.sfx?.mistake?.(); }
  solved() {
    const c = this.cur; const sec = (performance.now() - c.t0) / 1000; this.results.push({ dish: c.dish, mistakes: c.mistakes, sec, taps: c.taps });
    $('pzMsg').textContent = c.mistakes ? `Xong · ${c.mistakes} lần sai · ${sec.toFixed(0)}s` : `✓ Sạch · ${sec.toFixed(0)}s`; this.o.sfx?.done?.();
    for (const b of $('pzGrid').children) b.disabled = true; this.ninja?.stop();
    setTimeout(() => { $('pzMsg').textContent = ''; this.next(); }, 900);
  }
  finish() {
    this.stop(); const total = (performance.now() - this.t0) / 1000; let t = 0;
    // kết quả cùng dạng với ca bếp để mastery/progress dùng chung: mỗi câu = một "tô"
    const bowls = this.results.map((r) => { t += r.sec; return { dish: r.dish, name: D.recipes[r.dish].name, arrivedAt: +(t - r.sec).toFixed(1), servedAt: +t.toFixed(1), wait: +r.sec.toFixed(1), mistakes: r.mistakes, taps: r.taps }; });
    const mistakes = this.results.reduce((n, r) => n + r.mistakes, 0); const clean = this.results.filter((r) => !r.mistakes).length;
    this.o.onDone({ puzzle: true, money: clean * 10, tips: 0, served: this.results.length, left: 0, mistakes, wasted: 0, errors: [], stars: 0, stats: { bowls, idle: 0, taps: this.results.reduce((n, r) => n + r.taps, 0), trips: 0, time: +total.toFixed(1) } });
  }
}

/** Mini-game chém kiểu Fruit Ninja trên canvas 2D: tung từng đợt (đồ của món + đồ lạ), kéo ngón tay tạo vệt chém; đồ của món rơi khỏi màn = sót. */
class Ninja {
  constructor(cv, o) { this.cv = cv; this.o = o; this.ctx = cv.getContext('2d'); this.objs = []; this.trail = []; this.parts = []; this.imgs = new Map(); }
  img(tok) { if (!this.imgs.has(tok)) { const im = new Image(); im.src = iconUrl(tok) || ''; this.imgs.set(tok, im); } return this.imgs.get(tok); }
  start() {
    const cv = this.cv; const rect = cv.getBoundingClientRect(); this.dpr = Math.min(2, devicePixelRatio || 1); cv.width = rect.width * this.dpr; cv.height = rect.height * this.dpr; this.W = rect.width; this.H = rect.height;
    // hàng đợi tung: xáo đồ của món + đồ lạ, mỗi 0.75 s tung 1–2 thứ
    this.queue = shuffle([...this.o.good.map((t) => ({ tok: t, good: true })), ...this.o.bad.map((t) => ({ tok: t, good: false }))]);
    this.t = 0; this.nextSpawn = 0.4; this.done = false; this.last = performance.now(); this.down = false;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    this.onDown = (e) => { this.down = true; this.trail = [pos(e)]; cv.setPointerCapture?.(e.pointerId); };
    this.onMove = (e) => { if (!this.down) return; const p = pos(e); const q = this.trail[this.trail.length - 1]; this.trail.push(p); if (this.trail.length > 12) this.trail.shift(); if (q) this.slice(q, p); };
    this.onUp = () => { this.down = false; this.trail = []; };
    cv.addEventListener('pointerdown', this.onDown); cv.addEventListener('pointermove', this.onMove); cv.addEventListener('pointerup', this.onUp); cv.addEventListener('pointercancel', this.onUp);
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }
  stop() { cancelAnimationFrame(this.raf); const cv = this.cv; cv.removeEventListener('pointerdown', this.onDown); cv.removeEventListener('pointermove', this.onMove); cv.removeEventListener('pointerup', this.onUp); cv.removeEventListener('pointercancel', this.onUp); this.done = true; }
  spawn() {
    const n = Math.random() < 0.35 && this.queue.length > 1 ? 2 : 1;
    for (let k = 0; k < n && this.queue.length; k++) {
      const q = this.queue.shift(); const r = Math.min(34, this.W * 0.085); const x = r + Math.random() * (this.W - 2 * r);
      const vy = -(this.H * 0.95 + Math.random() * this.H * 0.25); const vx = (this.W / 2 - x) * (0.25 + Math.random() * 0.35) + (Math.random() - 0.5) * 60;
      this.objs.push({ ...q, x, y: this.H + r, vx, vy, r, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, sliced: false });
    }
  }
  slice(a, b) {
    for (const o of this.objs) {
      if (o.sliced) continue;
      // khoảng cách từ tâm tới đoạn a→b
      const dx = b.x - a.x, dy = b.y - a.y; const L2 = dx * dx + dy * dy || 1; let t = ((o.x - a.x) * dx + (o.y - a.y) * dy) / L2; t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx, py = a.y + t * dy; if ((px - o.x) ** 2 + (py - o.y) ** 2 > (o.r * 1.05) ** 2) continue;
      o.sliced = true; o.hitAt = this.t; o.ang = Math.atan2(dy, dx); this.o.onHit(o.good, o.tok);
      for (let i = 0; i < 8; i++) this.parts.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 250, life: 0.5, col: o.good ? '#5fa55a' : '#e84a3b' });
    }
  }
  frame(now) {
    if (this.done) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    if (this.queue.length && this.t >= this.nextSpawn) { this.spawn(); this.nextSpawn = this.t + 0.75; }
    const g = this.H * 1.15;
    for (const o of this.objs) { o.vy += g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if (o.sliced) { o.vx *= 0.98; } }
    for (const o of this.objs) if (!o.sliced && !o.missed && o.y - o.r > this.H && o.vy > 0) { o.missed = true; if (o.good) this.o.onMiss(o.tok); }
    this.objs = this.objs.filter((o) => o.y - o.r < this.H + 80 || o.vy < 0);
    for (const p of this.parts) { p.vy += 600 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter((p) => p.life > 0);
    this.draw();
    if (!this.queue.length && !this.objs.length) { this.stop(); this.o.onEnd(); return; }
    this.raf = requestAnimationFrame((n) => this.frame(n));
  }
  draw() {
    const c = this.ctx; c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.W, this.H);
    for (const o of this.objs) {
      const im = this.img(o.tok); const s = o.r * 2;
      c.save(); c.translate(o.x, o.y); c.rotate(o.rot);
      if (o.sliced) {   // hai nửa tách ra theo hướng vệt chém
        const k = Math.min(1, (this.t - o.hitAt) * 3) * 14; const nx = -Math.sin(o.ang), ny = Math.cos(o.ang);
        c.save(); c.beginPath(); c.moveTo(-s, -s); c.lineTo(s, -s); c.lineTo(s, 0); c.lineTo(-s, 0); c.closePath(); c.clip(); c.translate(-nx * k, -ny * k); if (im.complete && im.naturalWidth) c.drawImage(im, -o.r, -o.r, s, s); c.restore();
        c.save(); c.beginPath(); c.moveTo(-s, 0); c.lineTo(s, 0); c.lineTo(s, s); c.lineTo(-s, s); c.closePath(); c.clip(); c.translate(nx * k, ny * k); if (im.complete && im.naturalWidth) c.drawImage(im, -o.r, -o.r, s, s); c.restore();
      } else if (im.complete && im.naturalWidth) { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 8; c.shadowOffsetY = 4; c.drawImage(im, -o.r, -o.r, s, s); }
      else { c.fillStyle = '#e8a33c'; c.beginPath(); c.arc(0, 0, o.r * 0.8, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life * 2); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
    if (this.trail.length > 1) { c.lineCap = 'round'; c.lineJoin = 'round'; for (let i = 1; i < this.trail.length; i++) { c.strokeStyle = `rgba(255,247,234,${i / this.trail.length})`; c.lineWidth = 2 + 6 * i / this.trail.length; c.beginPath(); c.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); c.lineTo(this.trail[i].x, this.trail[i].y); c.stroke(); } }
  }
}
