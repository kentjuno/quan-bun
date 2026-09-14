// Chế độ "Đố" — puzzle 2D nhanh, cùng dữ liệu công thức với bếp 3D (sửa món ở sim-data → đố đổi theo).
// 3 kiểu: (1) Xếp thứ tự ráp tô  (2) Bắt kẻ lạ: nguyên liệu không thuộc món  (3) Thiếu gì: bước bị giấu, chọn 1/4.
// Kết quả ghi vào Tiến độ nhớ món (mastery) như một tô: sạch = không bấm sai lần nào.
import { D, recipeFor, label } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { ALL_DISHES, SHELF_TOPPING } from './config.js';
import { REGULARS, STRANGER_LINES, lineFor } from './data/customers.js';

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

/** Món dùng được cho Ráp tô bản thử: chuỗi ráp chỉ gồm tô nóng, sợi, topping rời, nước lèo (chưa có thớt/chảo/lò vi sóng). */
export function assembleOk(d) { const r = recipeFor(d); return r.bowl && r.noodle && r.assembly.every((t) => t.startsWith('bowl-hot:') || t.startsWith('noodle-drained:') || /^broth:|-broth-ready$/.test(t) || (D.items[t] && SHELF_TOPPING.includes(t))); }

export class Puzzle {
  /** @param {{ dishes: string[], weights: Object, rounds: number, kinds?: string[], onDone: (result) => void, sfx: any }} o — kinds: ['order','intruder','missing'] (Đố nhanh) hoặc ['ninja'] (Chém) */
  constructor(o) { this.o = o; this.i = 0; this.results = []; this.el = $('puzzle'); }
  start() { this.i = 0; this.results = []; this.t0 = performance.now(); this.el.classList.remove('hidden'); this.next(); }
  stop() { this.el.classList.add('hidden'); this.ninja?.stop(); cancelAnimationFrame(this._raf); }
  next() {
    if ((this.o.kinds || [])[0] === 'assemble') { if (this.i) return this.finish(); this.i = 1; this.cur = { dish: null, kind: 'assemble', mistakes: 0, t0: performance.now(), taps: 0 }; $('pzCanvas').classList.add('hidden'); $('pzGrid').classList.remove('hidden', 'reflex'); $('pzTickets').classList.add('hidden'); $('pzGrid').classList.remove('assemble'); return this.buildAssemble(); }
    if (this.i >= this.o.rounds) return this.finish();
    const dish = pickW(this.o.weights); const kinds = this.o.kinds || ['order', 'intruder', 'missing']; const kind = kinds[this.i % kinds.length];
    this.cur = { dish, kind, mistakes: 0, t0: performance.now(), taps: 0 }; this.i++;
    $('pzProgress').textContent = `${this.i}/${this.o.rounds}`; $('pzDish').textContent = D.recipes[dish].name;
    $('pzCanvas').classList.add('hidden'); $('pzGrid').classList.remove('hidden'); $('pzGrid').classList.remove('reflex'); cancelAnimationFrame(this._raf);
    $('pzTickets').classList.add('hidden'); $('pzGrid').classList.remove('assemble');
    ({ order: this.buildOrder, intruder: this.buildIntruder, missing: this.buildMissing, ninja: this.buildNinja, reflex: this.buildReflex, assemble: this.buildAssemble })[kind].call(this, dish);
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
    const mine = recipeFor(dish).shelfItems.filter((it) => D.items[it] && !/tray-paper|noodle-basket/.test(it)); const good = shuffle(mine).slice(0, 7); const bad = intruders(dish, Math.max(2, Math.round(good.length * 0.5)));
    this._sol = good.map(label);
    $('pzTitle').textContent = `Vuốt chém đúng thành phần của ${D.recipes[dish].name} (${good.length} thứ) — chừa đồ lạ`; $('pzAnswer').classList.add('hidden'); $('pzGrid').classList.add('hidden');
    const cv = $('pzCanvas'); cv.classList.remove('hidden');
    this.ninja?.stop();
    for (const t of [...good, ...bad]) { const im = new Image(); im.src = iconUrl(t) || ''; }   // nạp ảnh trước khi tung
    this.ninja = new Ninja(cv, { good, bad, onHit: (ok, tok) => { this.cur.taps++; if (!ok) this.wrong(cv, `"${label(tok)}" không có trong ${D.recipes[dish].name}`); else { this.o.sfx?.place?.(); $('pzMsg').textContent = ''; } }, onMiss: (tok) => { this.cur.mistakes++; $('pzMsg').textContent = `Sót "${label(tok)}" — có trong món này`; this.o.sfx?.mistake?.(); }, onEnd: () => this.solved() });
    this.ninja.start();
  }
  // ---- (5) phản xạ: LƯỚI CỐ ĐỊNH (thứ tự như kệ thật, không xáo) — tên món hiện ra, bấm thật nhanh đủ topping của món (thứ tự tự do) trước khi hết giờ ----
  buildReflex(dish) {
    // lưới = mọi topping của các món trong nhóm đang luyện, xếp theo thứ tự kệ topping cố định → tập nhớ VỊ TRÍ + phản xạ
    if (!this._grid) { const pool = new Set(); for (const d of this.o.dishes) for (const it of recipeFor(d).shelfItems) if (SHELF_TOPPING.includes(it)) pool.add(it); this._grid = SHELF_TOPPING.filter((it) => pool.has(it)); }
    const need = new Set(recipeFor(dish).shelfItems.filter((it) => this._grid.includes(it))); const total = need.size; this._sol = [...need].map(label);
    const limit = 3 + total * 1.6;   // giây
    $('pzTitle').textContent = `Bấm đủ ${total} topping của món — càng nhanh càng tốt`; $('pzAnswer').classList.remove('hidden');
    $('pzAnswer').innerHTML = `<span class="ans timer"><i id="pzBar"></i><b id="pzLeft">${limit.toFixed(0)}s</b></span><span class="ans" id="pzGot">0/${total}</span>`;
    const t0 = performance.now(); let got = 0; let over = false;
    const tick = () => { if (over) return; const el = (performance.now() - t0) / 1000; const left = Math.max(0, limit - el); const bar = $('pzBar'); if (bar) { bar.style.width = `${(left / limit) * 100}%`; $('pzLeft').textContent = `${left.toFixed(1)}s`; } if (left <= 0) { over = true; this.cur.mistakes += need.size; $('pzMsg').textContent = `Hết giờ — còn thiếu: ${[...need].map(label).join(', ')}`; for (const b of $('pzGrid').children) { if (need.has(b.dataset.it)) b.classList.add('missed'); } this.o.sfx?.mistake?.(); setTimeout(() => this.solved(), 1400); return; } this._raf = requestAnimationFrame(tick); };
    $('pzGrid').classList.add('reflex');
    $('pzGrid').replaceChildren(...this._grid.map((it) => {
      const el = document.createElement('button'); el.className = 'pz sm'; el.dataset.it = it; el.innerHTML = `${icon(it)}<span>${label(it)}</span>`;
      el.onclick = () => { if (over) return; this.cur.taps++; if (need.has(it)) { need.delete(it); got++; el.classList.add('ok'); el.disabled = true; $('pzGot').textContent = `${got}/${total}`; this.o.sfx?.place?.(); if (!need.size) { over = true; cancelAnimationFrame(this._raf); this.solved(); } } else this.wrong(el, `"${label(it)}" không có trong ${D.recipes[dish].name}`); };
      return el;
    }));
    this._raf = requestAnimationFrame(tick);
  }
  // ---- (6) RÁP TÔ — bản thử lõi mới (Papa's × Cook Serve Delicious): phiếu khách treo, ráp ngay trên kệ, chấm từng bước, không đi lại ----
  // Một phiên = `rounds` phiếu tới dần (tối đa 3 treo), mỗi phiếu có kiên nhẫn. Phiếu đầu là phiếu đang làm.
  // Kệ cố định như tủ topping thật; sợi có thẻ riêng: trụng → chọn "vô tô" hay "xả lạnh" → trụng lại (kiểm tra kiến thức nóng-lạnh-nóng).
  buildAssemble() {
    const A = this; const dishes = this.o.dishes.filter(assembleOk); if (!dishes.length) return this.finish();
    const weights = Object.fromEntries(dishes.map((d) => [d, this.o.weights[d] ?? 1]));
    const total = this.o.rounds; const tickets = []; let spawned = 0; let done = 0; let over = false; const t0 = performance.now();
    const PAT = 38, GAP = 11;   // giây kiên nhẫn mỗi phiếu · giây giữa hai phiếu
    const who = (dish) => { const r = REGULARS.filter((x) => x.dish === dish); if (r.length && Math.random() < 0.5) { const g = r[Math.floor(Math.random() * r.length)]; return { name: g.name, regular: g.id }; } return { name: ['Khách', 'Cô áo xanh', 'Anh áo đỏ', 'Bác nón lá', 'Bé học sinh', 'Chị công sở'][Math.floor(Math.random() * 6)], regular: null }; };
    const spawn = () => { if (spawned >= total) return; const dish = pickW(weights); const w = who(dish); tickets.push({ id: spawned++, dish, ...w, steps: recipeFor(dish).assembly, k: 0, mistakes: 0, taps: 0, born: performance.now(), pat: PAT, noodle: null, bowlBusy: 0 }); renderTickets(); };
    // ---- kệ cố định: tô · sợi · topping (thứ tự kệ thật) · nước ----
    const recs = dishes.map((d) => recipeFor(d));
    const bowls = [...new Set(recs.map((r) => r.bowl).filter(Boolean))];
    const noodles = [...new Set(recs.map((r) => r.noodle).filter(Boolean))];
    const tops = SHELF_TOPPING.filter((it) => recs.some((r) => r.assembly.includes(it)));
    const broths = [...new Set(recs.flatMap((r) => r.assembly.filter((t) => /^broth:|-broth-ready$/.test(t))))];
    const cur = () => tickets[0] || null;
    const wrongTap = (el, msg) => { const t = cur(); if (t) t.mistakes++; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); $('pzMsg').textContent = msg; A.o.sfx?.mistake?.(); };
    const place = (tok, el) => {   // đặt token vào tô của phiếu đang làm — đúng bước kế thì nhận, sai thì lỗi
      const t = cur(); if (!t || over) return false; t.taps++;
      const need = t.steps[t.k];
      const ok = need === tok || (need.startsWith('bowl-hot:') && tok === need) || (need.startsWith('noodle-drained:') && tok === need);
      if (!ok) { wrongTap(el, t.k === 0 ? `Bắt đầu bằng ${label(need)}` : `Chưa tới lượt "${label(tok)}"`); return false; }
      t.k++; A.o.sfx?.place?.(); $('pzMsg').textContent = ''; renderBowl();
      if (t.k >= t.steps.length) serve(t);
      return true;
    };
    const serve = (t) => {
      const sec = (performance.now() - t.born) / 1000; A.results.push({ dish: t.dish, mistakes: t.mistakes, sec, taps: t.taps });
      tickets.shift(); done++; A.o.sfx?.serve?.();
      const say = t.mistakes ? (t.regular ? lineFor({ regular: t.regular }, 'wrong') : 'Ừ… cũng được.') : (t.regular ? lineFor({ regular: t.regular }, 'good') : STRANGER_LINES.good[Math.floor(Math.random() * STRANGER_LINES.good.length)]);
      $('pzMsg').innerHTML = `<span style="color:${t.mistakes ? 'var(--broth)' : '#2f8a3a'}">${t.name}: “${say}” · ${sec.toFixed(0)}s${t.mistakes ? ` · ${t.mistakes} lỗi` : ' · hoàn hảo'}</span>`;
      $('pzProgress').textContent = `${done}/${total}`; renderTickets(); renderBowl();
      if (done >= total) { over = true; cancelAnimationFrame(A._raf); setTimeout(() => A.finish(), 1200); }
    };
    const expire = (t) => { A.results.push({ dish: t.dish, mistakes: t.mistakes + 3, sec: PAT, taps: t.taps }); tickets.splice(tickets.indexOf(t), 1); done++; A.o.sfx?.mistake?.(); $('pzMsg').innerHTML = `<span style="color:var(--red)">${t.name} bỏ đi — chờ lâu quá</span>`; $('pzProgress').textContent = `${done}/${total}`; renderTickets(); renderBowl(); if (done >= total) { over = true; cancelAnimationFrame(A._raf); setTimeout(() => A.finish(), 1200); } };
    // ---- vẽ ----
    const renderTickets = () => {
      $('pzTickets').replaceChildren(...tickets.slice(0, 3).map((t, i) => { const el = document.createElement('div'); el.className = 'tk' + (i === 0 ? ' on' : '') + (t.regular ? ' reg' : ''); el.dataset.id = t.id;
        el.innerHTML = `<b>${t.name}</b><span>${D.recipes[t.dish].name}</span><i class="bar"><u></u></i>`; return el; }));
      const t = cur(); $('pzDish').textContent = t ? D.recipes[t.dish].name : '—';
    };
    const renderBowl = () => {
      const t = cur(); const box = $('pzAnswer'); box.classList.remove('hidden');
      if (!t) { box.innerHTML = '<span class="ans">Đang chờ khách…</span>'; return; }
      box.replaceChildren(...t.steps.map((tok, i) => { const el = document.createElement('span'); el.className = 'ans' + (i < t.k ? '' : ' hole'); el.textContent = i < t.k ? label(tok) : (i === t.k ? '?' : '·'); return el; }));
    };
    // sợi: thẻ có trạng thái — chọn đúng nóng → (xả lạnh → trụng lại | vô tô) theo món
    const noodleCard = (n) => {
      const el = document.createElement('div'); el.className = 'pz sm nd'; el.dataset.it = n; let st = 'raw'; let busy = false;
      const draw = () => { el.innerHTML = `${icon(n)}<span>${label(n)}${st === 'hot' ? ' — nóng' : st === 'rinsed' ? ' — đã xả lạnh' : st === 'hot2' ? ' — nóng lại' : ''}</span>` + (st === 'raw' ? '<div class="opt"><button data-a="blanch">♨️ Trụng</button></div>' : st === 'hot' ? '<div class="opt"><button data-a="bowl">🥣 Vô tô</button><button data-a="rinse">🚿 Xả lạnh</button></div>' : st === 'rinsed' ? '<div class="opt"><button data-a="reblanch">♨️ Trụng lại</button><button data-a="bowl">🥣 Vô tô</button></div>' : '<div class="opt"><button data-a="bowl">🥣 Vô tô</button></div>'); };
      const wf = (dish) => (D.recipes[dish]?.base?.workflow || 'noodle-base');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || busy || over) return; const a = b.dataset.a; const t = cur(); if (!t) return; t.taps++;
        const act = (ms, next) => { busy = true; el.classList.add('busy'); setTimeout(() => { busy = false; el.classList.remove('busy'); st = next; draw(); A.o.sfx?.done?.(); }, ms); A.o.sfx?.drop?.(); };
        if (a === 'blanch') return act(900, 'hot');
        if (a === 'rinse') { if (wf(t.dish) === 'noodle-hot-only') return wrongTap(el, `${label(n)} chỉ trụng một lần — không xả lạnh`); return act(600, 'rinsed'); }
        if (a === 'reblanch') return act(600, 'hot2');
        if (a === 'bowl') {
          const need = t.steps[t.k]; const tok = `noodle-drained:${n}`;
          if (wf(t.dish) === 'noodle-base' && st !== 'hot2') return wrongTap(el, st === 'hot' ? 'Phải xả lạnh rồi trụng nóng lại mới vô tô' : 'Chưa trụng nóng lại');
          if (need !== tok) return wrongTap(el, need.startsWith('noodle-drained:') ? `Món này dùng ${label(need.split(':')[1])}, không phải ${label(n)}` : `Chưa tới lượt sợi — kế tiếp là ${label(need)}`);
          st = 'raw'; draw(); place(tok, el);
        }
      });
      draw(); return el;
    };
    const cardBtn = (tok, cls, onTap) => { const el = document.createElement('button'); el.className = 'pz sm ' + cls; el.dataset.it = tok; el.innerHTML = `${icon(tok)}<span>${label(tok)}</span>`; el.onclick = () => { if (over) return; onTap(el); }; return el; };
    const grid = $('pzGrid'); grid.classList.add('assemble'); grid.replaceChildren();
    const section = (title, els) => { if (!els.length) return; const h = document.createElement('div'); h.className = 'sec'; h.textContent = title; grid.appendChild(h); for (const e of els) grid.appendChild(e); };
    section('Kệ tô', bowls.map((b) => cardBtn(b, 'bw', (el) => { if (el.classList.contains('busy')) return; el.classList.add('busy'); A.o.sfx?.drop?.(); setTimeout(() => { el.classList.remove('busy'); place(`bowl-hot:${b}`, el); }, 500); })));
    section('Nồi trụng', noodles.map(noodleCard));
    section('Tủ topping', tops.map((it) => cardBtn(it, 'tp', (el) => place(it, el))));
    section('Nước lèo', broths.map((t) => cardBtn(t, 'br', (el) => place(t, el))));
    $('pzTitle').textContent = 'Ráp đúng thứ tự cho phiếu đang sáng · phiếu mới tới dần, chờ lâu là bỏ đi'; $('pzTickets').classList.remove('hidden'); $('pzProgress').textContent = `0/${total}`;
    spawn(); renderBowl();
    let nextSpawn = performance.now() + GAP * 1000;
    const tick = () => { if (over) return; const now = performance.now();
      if (now >= nextSpawn && tickets.length < 3 && spawned < total) { spawn(); nextSpawn = now + GAP * 1000; } else if (tickets.length >= 3) nextSpawn = now + 3000;
      for (const el of $('pzTickets').children) { const t = tickets.find((x) => String(x.id) === el.dataset.id); if (!t) continue; const f = Math.max(0, 1 - (now - t.born) / 1000 / t.pat); const u = el.querySelector('u'); u.style.width = `${f * 100}%`; u.style.background = f < 0.25 ? 'var(--red)' : f < 0.5 ? 'var(--broth)' : 'var(--green)'; if (f <= 0) { expire(t); break; } }
      A._raf = requestAnimationFrame(tick); };
    A._raf = requestAnimationFrame(tick);
    this._sol = cur() ? cur().steps.map(label) : [];
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
    const q = this.queue.shift(); const r = Math.min(46, this.W * 0.115); const x = r + 20 + Math.random() * (this.W - 2 * r - 40);
    const g = this.H * 0.7; const vy = -Math.sqrt(2 * g * this.H * (0.72 + Math.random() * 0.12));   // đỉnh 72–84% màn
    const vx = (this.W / 2 - x) * 0.18 + (Math.random() - 0.5) * 30;
    this.objs.push({ ...q, x, y: this.H + r, vx, vy, r, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 0.8, sliced: false });
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
    // tung TỪNG món: món kế chỉ tung khi món trước đã bị chém / đang rơi xuống nửa dưới màn / hết
    const live = this.objs.filter((o) => !o.sliced && !o.missed);
    const canSpawn = !live.length || live.every((o) => o.vy > 0 && o.y > this.H * 0.55);
    if (this.queue.length && canSpawn && this.t >= this.nextSpawn) { this.spawn(); this.nextSpawn = this.t + 0.6; }
    const g = this.H * 0.7;   // chậm: bay lên ~3 s, đỉnh ~80% chiều cao
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
      if (!o.sliced) { c.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(255,247,234,.95)'; c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = 4; c.fillText(label(o.tok), o.x, o.y + o.r + 16); c.shadowBlur = 0; }
    }
    for (const p of this.parts) { c.globalAlpha = Math.max(0, p.life * 2); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 4, 0, Math.PI * 2); c.fill(); } c.globalAlpha = 1;
    if (this.trail.length > 1) { c.lineCap = 'round'; c.lineJoin = 'round'; for (let i = 1; i < this.trail.length; i++) { c.strokeStyle = `rgba(255,247,234,${i / this.trail.length})`; c.lineWidth = 2 + 6 * i / this.trail.length; c.beginPath(); c.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); c.lineTo(this.trail[i].x, this.trail[i].y); c.stroke(); } }
  }
}
