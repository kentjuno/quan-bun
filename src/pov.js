// BẢN THỬ LÕI MỚI #2 — "Quầy POV": góc nhìn thứ nhất trước quầy prep, KÉO THẢ mọi thao tác (Papa's × bếp thật của Kent).
// Không đi lại. Kéo tô vô nồi để trụng, kéo sợi vô rọ → rọ lên bồn → rọ vô nồi → trút vô tô, kéo topping vô tô, kéo vá nước vô tô, kéo tô lên phiếu để giao.
// Dữ liệu công thức: recipeFor(d) ĐỦ BƯỚC (không rút gọn). Kết quả trả về cùng dạng puzzle để mastery/progress dùng chung.
import { D, recipeFor, label } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { SHELF_TOPPING } from './config.js';
import { REGULARS, STRANGER_LINES, lineFor } from './data/customers.js';

const $ = (id) => document.getElementById(id);
const img = (tok, cls = '') => { const u = iconUrl(tok); return u ? `<img class="${cls}" src="${u}" alt="" draggable="false">` : `<span class="emo ${cls}">${D.items[tok]?.icon || '🍲'}</span>`; };
const isBroth = (t) => /^broth:|-broth-ready$|^porridge-ready$/.test(t);
/** Món dùng được cho bản thử: tô + sợi + topping rời + nước (chưa thớt/chảo/lò). */
export function povOk(d) { const r = recipeFor(d); return r.bowl && r.noodle && r.assembly.every((t) => t.startsWith('bowl-hot:') || t.startsWith('noodle-drained:') || isBroth(t) || (D.items[t] && SHELF_TOPPING.includes(t))); }

export class Pov {
  /** @param {{ dishes: string[], weights: Object, rounds: number, onDone: (r) => void, sfx: any }} o */
  constructor(o) { this.o = o; this.el = $('pov'); this.results = []; }
  start() {
    const o = this.o; this.dishes = o.dishes.filter(povOk); if (!this.dishes.length) return o.onDone(this.result());
    this.recs = Object.fromEntries(this.dishes.map((d) => [d, recipeFor(d)]));
    this.tickets = []; this.spawned = 0; this.done = 0; this.over = false; this.t0 = performance.now(); this.nextSpawn = performance.now() + 9000;
    this.PAT = 90; this.GAP = 18;   // bản thử kéo thả: chậm hơn chạm ~3×, cho kiên nhẫn rộng
    this.bowls = [null, null];                                      // 2 chỗ tô trên mặt thớt: { placed: [], type }
    this.baskets = [null, null, null];                              // 3 rọ trong nồi: { noodle, state: 'blanching'|'hot'|'rinsing'|'rinsed'|'reblanching'|'hot2', until }
    this.hotBowls = [];                                             // tô đang trụng / đã nóng trong nồi: { type, until }
    this.build(); this.el.classList.remove('hidden'); this.spawn(); this.loop();
  }
  stop() { this.over = true; cancelAnimationFrame(this._raf); this.el.classList.add('hidden'); this.el.onpointerdown = null; }
  // ---------- dựng màn ----------
  build() {
    const recs = Object.values(this.recs);
    this.bowlTypes = [...new Set(recs.map((r) => r.bowl))]; this.noodleTypes = [...new Set(recs.map((r) => r.noodle))];
    this.tops = SHELF_TOPPING.filter((it) => recs.some((r) => r.assembly.includes(it)));
    this.broths = [...new Set(recs.flatMap((r) => r.assembly.filter(isBroth)))];
    this.el.innerHTML = `
      <div class="pv-top"><span class="pill-dark" id="pvProg">0/${this.o.rounds}</span><div class="pv-tickets" id="pvTickets"></div><button class="ghost small" id="pvQuit">Thoát</button></div>
      <div class="pv-back">
        <div class="pv-pot drop" data-zone="pot"><div class="pv-potlbl">Nồi trụng</div><div class="pv-baskets">${[0, 1, 2].map((i) => `<div class="pv-basket drop" data-zone="basket" data-i="${i}"></div>`).join('')}</div><div class="pv-hot drop" data-zone="pothot"></div></div>
        <div class="pv-sink drop" data-zone="sink"><div class="pv-potlbl">Bồn xả lạnh</div><div class="pv-sinkin"></div></div>
        <div class="pv-broths">${this.broths.map((b) => `<div class="pv-broth dragsrc" data-kind="broth" data-tok="${b}">${img(b)}<small>${label(b)}</small></div>`).join('')}</div>
      </div>
      <div class="pv-prep">${this.tops.map((it) => `<div class="pv-pan dragsrc" data-kind="top" data-tok="${it}">${img(it)}<small>${label(it)}</small></div>`).join('')}</div>
      <div class="pv-front">
        <div class="pv-stack">${this.bowlTypes.map((b) => `<div class="pv-src dragsrc" data-kind="bowl" data-tok="${b}">${img(b)}<small>${label(b)}</small></div>`).join('')}${this.noodleTypes.map((n) => `<div class="pv-src dragsrc" data-kind="noodle" data-tok="${n}">${img(n)}<small>${label(n)}</small></div>`).join('')}</div>
        <div class="pv-slots">${[0, 1].map((i) => `<div class="pv-slot drop" data-zone="slot" data-i="${i}"><small>chỗ tô ${i + 1}</small></div>`).join('')}</div>
      </div>
      <div class="pv-msg" id="pvMsg">Kéo tô vô nồi để trụng · kéo sợi vô rọ · kéo topping vô tô · kéo tô lên phiếu để giao</div>`;
    $('pvQuit').onclick = () => { this.stop(); this.o.onQuit?.(); };
    this.bindDrag();
  }
  // ---------- phiếu ----------
  who(dish) { const r = REGULARS.filter((x) => x.dish === dish); if (r.length && Math.random() < 0.5) { const g = r[Math.floor(Math.random() * r.length)]; return { name: g.name, regular: g.id }; } return { name: ['Khách', 'Cô áo xanh', 'Anh áo đỏ', 'Bác nón lá', 'Bé học sinh', 'Chị công sở'][Math.floor(Math.random() * 6)], regular: null }; }
  spawn() { if (this.spawned >= this.o.rounds || this.tickets.length >= 3) return; const ks = this.dishes; const w = this.o.weights || {}; const sum = ks.reduce((n, k) => n + (w[k] ?? 1), 0); let r = Math.random() * sum; let dish = ks[ks.length - 1]; for (const k of ks) { r -= (w[k] ?? 1); if (r <= 0) { dish = k; break; } }
    this.tickets.push({ id: this.spawned++, dish, ...this.who(dish), steps: this.recs[dish].assembly, born: performance.now(), mistakes: 0, taps: 0 }); this.renderTickets(); this.o.sfx?.arrive?.(); }
  renderTickets() {
    $('pvTickets').replaceChildren(...this.tickets.map((t) => { const el = document.createElement('div'); el.className = 'tk drop' + (t.regular ? ' reg' : ''); el.dataset.zone = 'ticket'; el.dataset.id = t.id; el.innerHTML = `<b>${t.name}</b><span>${D.recipes[t.dish].name}</span><i class="bar"><u></u></i>`; return el; }));
    $('pvProg').textContent = `${this.done}/${this.o.rounds}`;
  }
  msg(t, cls = '') { const m = $('pvMsg'); m.textContent = t; m.className = 'pv-msg ' + cls; }
  /** Lỗi tính cho TÔ đang làm (slotIdx) — khi giao, lỗi của tô cộng vào phiếu nhận tô; lỗi không gắn tô nào thì tính cho phiếu đầu. */
  wrong(t, slotIdx = null) { this.msg(t, 'bad'); this.o.sfx?.mistake?.(); const b = slotIdx != null ? this.bowls[slotIdx] : null; if (b) b.mistakes = (b.mistakes || 0) + 1; else if (this.tickets[0]) this.tickets[0].mistakes++; this.el.classList.add('shake'); setTimeout(() => this.el.classList.remove('shake'), 350); }
  // ---------- tô đang ráp: hợp lệ khi placed là tiền tố chuỗi ráp của ÍT NHẤT một phiếu đang treo ----------
  fits(placed) { return this.tickets.filter((t) => placed.every((tok, i) => t.steps[i] === tok)); }
  place(slotIdx, tok) {
    const b = this.bowls[slotIdx]; if (!b) return this.wrong('Chưa có tô ở chỗ này — kéo tô nóng từ nồi xuống trước');
    const next = [...b.placed, tok]; const ok = this.fits(next);
    if (!ok.length) { const cands = this.fits(b.placed); const want = [...new Set(cands.map((t) => t.steps[b.placed.length]).filter(Boolean))]; return this.wrong(want.length ? `Chưa tới lượt "${label(tok)}" — kế tiếp: ${want.map(label).join(' / ')}` : 'Tô này đã đủ — kéo lên phiếu để giao', slotIdx); }
    b.placed = next; this.o.sfx?.place?.(); this.msg(`${label(tok)} ✓`); this.renderSlot(slotIdx);
  }
  renderSlot(i) {
    const el = this.el.querySelector(`.pv-slot[data-i="${i}"]`); const b = this.bowls[i];
    if (!b) { el.innerHTML = `<small>chỗ tô ${i + 1}</small>`; el.classList.remove('has'); return; }
    el.classList.add('has');
    const full = this.fits(b.placed).some((t) => t.steps.length === b.placed.length);
    el.innerHTML = `<div class="pv-bowl dragsrc${full ? ' full' : ''}" data-kind="madebowl" data-i="${i}">${img(b.type, 'base')}${b.placed.slice(1).map((t, k) => `<i class="lay" style="--k:${k}">${img(t)}</i>`).join('')}</div><small>${full ? 'Xong — kéo lên phiếu' : `${b.placed.length} bước`}</small>`;
  }
  renderPot() {
    this.baskets.forEach((bk, i) => { const el = this.el.querySelector(`.pv-basket[data-i="${i}"]`); if (!bk) { el.innerHTML = ''; el.className = 'pv-basket drop'; return; }
      const st = bk.state; const busy = /ing$/.test(st); const lbl = st === 'blanching' ? 'trụng…' : st === 'hot' ? 'nóng' : st === 'rinsing' ? 'xả…' : st === 'rinsed' ? 'đã xả lạnh' : st === 'reblanching' ? 'trụng lại…' : 'nóng lại';
      el.className = 'pv-basket drop ' + st; el.innerHTML = `<div class="pv-rk ${busy ? '' : 'dragsrc'}" data-kind="basket" data-i="${i}">${img(bk.noodle)}<small>${lbl}</small>${busy ? '<i class="ring"></i>' : ''}</div>`; });
    const hot = this.el.querySelector('.pv-hot'); hot.innerHTML = this.hotBowls.map((h, i) => `<div class="pv-hb ${h.until > performance.now() ? 'busy' : 'dragsrc'}" data-kind="hotbowl" data-i="${i}">${img(h.type)}<small>${h.until > performance.now() ? 'trụng…' : 'nóng'}</small></div>`).join('') || '<small class="hint">tô nóng trữ ở đây</small>';
  }
  // ---------- kéo thả ----------
  bindDrag() {
    const root = this.el; let drag = null;
    root.onpointerdown = (e) => {
      const src = e.target.closest('.dragsrc'); if (!src || this.over) return;
      e.preventDefault(); root.setPointerCapture?.(e.pointerId);
      const ghost = document.createElement('div'); ghost.className = 'pv-ghost'; ghost.innerHTML = src.querySelector('img,.emo')?.outerHTML || '•'; document.body.appendChild(ghost);
      drag = { kind: src.dataset.kind, tok: src.dataset.tok, i: Number(src.dataset.i), ghost, src }; src.classList.add('lift'); this.moveGhost(e, ghost);
    };
    root.onpointermove = (e) => { if (drag) this.moveGhost(e, drag.ghost); };
    const end = (e) => { if (!drag) return; const d = drag; drag = null; d.ghost.remove(); d.src.classList.remove('lift'); root.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over'));
      const zone = document.elementsFromPoint(e.clientX, e.clientY).find((z) => z.classList?.contains('drop')); if (zone) this.drop(d, zone); };
    root.onpointerup = end; root.onpointercancel = end;
  }
  moveGhost(e, ghost) { ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 28}px)`; this.el.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over')); const zone = document.elementsFromPoint(e.clientX, e.clientY).find((z) => z.classList?.contains('drop')); if (zone) zone.classList.add('over'); }
  drop(d, zone) {
    const z = zone.dataset.zone; const now = performance.now(); const cur = this.tickets[0]; if (cur) cur.taps++;
    // tô sạch → nồi: trụng tô (nền), trữ trong nồi
    if (d.kind === 'bowl') { if (z !== 'pot' && z !== 'pothot' && z !== 'basket') return this.wrong('Tô phải trụng nóng trong nồi trước'); if (this.hotBowls.length >= 5) return this.wrong('Nồi đã đầy tô (5)'); this.hotBowls.push({ type: d.tok, until: now + 700 }); this.o.sfx?.splash?.(); this.renderPot(); return; }
    // tô nóng → chỗ tô trên mặt thớt
    if (d.kind === 'hotbowl') { const h = this.hotBowls[d.i]; if (!h || h.until > now) return; if (z !== 'slot') return this.wrong('Đặt tô nóng xuống chỗ tô trên thớt'); const si = Number(zone.dataset.i); if (this.bowls[si]) return this.wrong('Chỗ này đang có tô'); const tok = `bowl-hot:${h.type}`; if (!this.fits([tok]).length) return this.wrong(`Không phiếu nào dùng ${label(h.type)}`); this.hotBowls.splice(d.i, 1); this.bowls[si] = { type: h.type, placed: [tok] }; this.o.sfx?.clink?.(); this.renderPot(); this.renderSlot(si); this.msg(`${label(tok)} ✓`); return; }
    // sợi sống → rọ trống trong nồi
    if (d.kind === 'noodle') { if (z !== 'basket' && z !== 'pot') return this.wrong('Sợi phải vô rọ trong nồi trụng'); let bi = z === 'basket' ? Number(zone.dataset.i) : this.baskets.findIndex((b) => !b); if (bi < 0 || this.baskets[bi]) { bi = this.baskets.findIndex((b) => !b); if (bi < 0) return this.wrong('Hết rọ trống'); } this.baskets[bi] = { noodle: d.tok, state: 'blanching', until: now + 1200 }; this.o.sfx?.splash?.(); this.renderPot(); return; }
    // rọ → bồn (xả lạnh) / nồi (trụng lại) / tô (trút sợi)
    if (d.kind === 'basket') {
      const bk = this.baskets[d.i]; if (!bk || /ing$/.test(bk.state)) return;
      if (z === 'sink') { if (bk.state !== 'hot') return this.wrong(bk.state === 'rinsed' ? 'Đã xả rồi — đem trụng nóng lại' : 'Sợi đã trụng lại rồi, không xả nữa'); bk.state = 'rinsing'; bk.until = now + 700; this.o.sfx?.splash?.(); this.renderPot(); return; }
      if (z === 'pot' || z === 'basket' || z === 'pothot') { if (bk.state !== 'rinsed') return this.wrong(bk.state === 'hot' ? 'Sợi đang nóng — qua bồn xả lạnh hoặc trút vô tô' : 'Rọ này đã nóng lại rồi'); bk.state = 'reblanching'; bk.until = now + 600; this.o.sfx?.splash?.(); this.renderPot(); return; }
      if (z === 'slot') {
        const si = Number(zone.dataset.i); const b = this.bowls[si]; if (!b) return this.wrong('Chưa có tô ở chỗ này');
        const wf = (dish) => D.recipes[dish]?.base?.workflow || 'noodle-base'; const cands = this.fits(b.placed);
        const wantHotOnly = cands.some((t) => wf(t.dish) === 'noodle-hot-only' && this.recs[t.dish].noodle === bk.noodle); const wantBase = cands.some((t) => wf(t.dish) === 'noodle-base' && this.recs[t.dish].noodle === bk.noodle);
        if (bk.state === 'hot' && !wantHotOnly && wantBase) return this.wrong(`${label(bk.noodle)} phải xả lạnh rồi trụng nóng lại trước khi vô tô`, si);
        if (bk.state === 'hot2' && !wantBase && wantHotOnly) return this.wrong(`${label(bk.noodle)} chỉ trụng một lần — không xả lạnh`, si);
        if (bk.state === 'rinsed') return this.wrong('Sợi đang lạnh — trụng nóng lại trước', si);
        this.baskets[d.i] = null; this.renderPot(); this.place(si, `noodle-drained:${bk.noodle}`); return;
      }
      return this.wrong('Rọ chỉ đem qua bồn, vô nồi hoặc trút vô tô');
    }
    // topping / nước → tô
    if (d.kind === 'top' || d.kind === 'broth') { if (z !== 'slot') return this.wrong(`${label(d.tok)} thì bỏ vô tô`); this.place(Number(zone.dataset.i), d.tok); return; }
    // tô xong → phiếu
    if (d.kind === 'madebowl') {
      const b = this.bowls[d.i]; if (!b) return; if (z !== 'ticket') return this.wrong('Kéo tô lên phiếu khách để giao');
      const t = this.tickets.find((x) => String(x.id) === zone.dataset.id); if (!t) return;
      if (t.steps.length !== b.placed.length || !t.steps.every((s, i) => s === b.placed[i])) { const other = this.tickets.find((x) => x.steps.length === b.placed.length && x.steps.every((s, i) => s === b.placed[i])); return this.wrong(other ? `Tô này của ${other.name}, không phải ${t.name}` : 'Tô chưa đúng phiếu này — còn thiếu bước'); }
      t.mistakes += b.mistakes || 0; this.bowls[d.i] = null; this.renderSlot(d.i); this.serve(t);
    }
  }
  serve(t) {
    const sec = (performance.now() - t.born) / 1000; this.results.push({ dish: t.dish, mistakes: t.mistakes, sec, taps: t.taps });
    this.tickets.splice(this.tickets.indexOf(t), 1); this.done++; this.o.sfx?.serve?.();
    const say = t.mistakes ? (t.regular ? lineFor({ regular: t.regular }, 'wrong') : 'Ừ… cũng được.') : (t.regular ? lineFor({ regular: t.regular }, 'good') : STRANGER_LINES.good[Math.floor(Math.random() * STRANGER_LINES.good.length)]);
    this.msg(`${t.name}: “${say}” · ${sec.toFixed(0)}s${t.mistakes ? ` · ${t.mistakes} lỗi` : ' · hoàn hảo'}`, t.mistakes ? 'mid' : 'good');
    this.renderTickets(); this.checkEnd();
  }
  expire(t) { this.results.push({ dish: t.dish, mistakes: t.mistakes + 3, sec: this.PAT, taps: t.taps }); this.tickets.splice(this.tickets.indexOf(t), 1); this.done++; this.o.sfx?.mistake?.(); this.msg(`${t.name} bỏ đi — chờ lâu quá`, 'bad'); this.renderTickets(); this.checkEnd(); }
  checkEnd() { if (this.done >= this.o.rounds) { this.over = true; cancelAnimationFrame(this._raf); setTimeout(() => { this.el.classList.add('hidden'); this.o.onDone(this.result()); }, 1300); } }
  loop() {
    const tick = () => { if (this.over) return; const now = performance.now();
      if (now >= this.nextSpawn) { this.spawn(); this.nextSpawn = now + this.GAP * 1000; }
      let dirty = false;
      for (const bk of this.baskets) if (bk && /ing$/.test(bk.state) && now >= bk.until) { bk.state = bk.state === 'blanching' ? 'hot' : bk.state === 'rinsing' ? 'rinsed' : 'hot2'; dirty = true; this.o.sfx?.done?.(); }
      for (const h of this.hotBowls) if (h.until && h.until <= now && !h.doneSfx) { h.doneSfx = true; dirty = true; }
      if (dirty) this.renderPot();
      for (const el of $('pvTickets').children) { const t = this.tickets.find((x) => String(x.id) === el.dataset.id); if (!t) continue; const f = Math.max(0, 1 - (now - t.born) / 1000 / this.PAT); const u = el.querySelector('u'); u.style.width = `${f * 100}%`; u.style.background = f < 0.25 ? 'var(--red)' : f < 0.5 ? 'var(--broth)' : 'var(--green)'; if (f <= 0) { this.expire(t); break; } }
      this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick);
  }
  result() {
    const total = (performance.now() - this.t0) / 1000; let t = 0;
    const bowls = this.results.map((r) => { t += r.sec; return { dish: r.dish, name: D.recipes[r.dish].name, arrivedAt: +(t - r.sec).toFixed(1), servedAt: +t.toFixed(1), wait: +r.sec.toFixed(1), mistakes: r.mistakes, taps: r.taps }; });
    const mistakes = this.results.reduce((n, r) => n + r.mistakes, 0); const clean = this.results.filter((r) => !r.mistakes).length;
    return { puzzle: true, pov: true, money: clean * 10, tips: 0, served: this.results.length, left: 0, mistakes, wasted: 0, errors: [], stars: 0, stats: { bowls, idle: 0, taps: this.results.reduce((n, r) => n + r.taps, 0), trips: 0, time: +total.toFixed(1) } };
  }
}
