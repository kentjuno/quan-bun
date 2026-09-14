// QUẦY POV — lớp vẽ + kéo thả. Mọi luật bếp nằm ở game/counter.js (Counter), file này chỉ hiển thị và chuyển thao tác thành `C.drop(src, zone)`.
// Điều khiển: KÉO vật tới chỗ, hoặc CHẠM ĐÔI để nó tự bay tới đích hợp lý nhất (Kent: kéo chính xác trên điện thoại khó).
import { D, label, tokenMatches } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { Counter, povOk } from './game/counter.js';
export { povOk };

const $ = (id) => document.getElementById(id);
const img = (tok) => { const u = iconUrl(tok); return u ? `<img src="${u}" alt="" draggable="false">` : `<span class="emo">${D.items[tok]?.icon || '🍲'}</span>`; };
const src1 = (kind, tok, i) => `data-k="${kind}"${tok != null ? ` data-t="${tok}"` : ''}${i != null ? ` data-i="${i}"` : ''}`;
const bar = (left, total) => (left > 0 && total ? `<i class="pv-bar" style="--p:${(1 - left / total) * 100}%"></i>` : '');

export class Pov {
  /** @param {{dishes,weights,rounds,level?,arrivals?,simplify?,constraints?,goal?,moneyTargets?,events?,burners?,patience?,sfx,onDone,onQuit}} o */
  constructor(o) { this.o = o; this.el = $('pov'); }
  start() {
    const o = this.o;
    this.C = new Counter({
      dishes: o.dishes, rounds: o.rounds ?? 8, arrivals: o.arrivals, simplify: o.simplify, constraints: o.constraints,
      goal: o.goal, moneyTargets: o.moneyTargets, burners: o.burners ?? 1,
      patience: o.patience ?? 90, gap: o.gap ?? 16, weights: o.weights,
      ev: { onSfx: (k) => o.sfx?.[k]?.(), onMsg: (m, c) => this.msg(m, c), onEnd: (r) => this.finish(r),
        onServe: (t, r) => this.msg(`${t.name}: “${r.say}” · ${r.sec.toFixed(0)}s · ${r.quality === 100 ? 'hoàn hảo' : r.quality >= 60 ? 'được' : 'ẩu'}`, r.quality === 100 ? 'good' : 'mid'),
        onExpire: (t) => this.msg(`${t.name} bỏ đi — chờ lâu quá`, 'bad'), onSpoil: () => this.msg('Sợi để lâu bị hư — đem vứt', 'bad') },
    });
    if (!this.C.dishes.length) return o.onDone(this.C.result());
    this.build(); this.el.classList.remove('hidden'); this.C.spawn(); this.render(); this.loop();
  }
  stop() { cancelAnimationFrame(this._raf); this.el.classList.add('hidden'); this.el.onpointerdown = null; }
  finish(r) { this.stop(); this.o.onDone(r); }
  msg(t, cls = '') { const m = $('pvMsg'); if (!m) return; m.textContent = t; m.className = 'pv-msg ' + cls; if (cls === 'bad') { this.el.classList.add('shake'); setTimeout(() => this.el.classList.remove('shake'), 320); } }

  // ---------- dựng quầy ----------
  build() {
    const C = this.C; const need = (st) => Object.values(C.recs).some((r) => r.transforms.some((t) => t.station === st));
    this.has = { pot: need('pot'), sink: need('sink'), prep: need('prep'), fryer: need('fryer'), microwave: need('microwave'), burner: !!Object.keys(C.soups).length && !C.sim?.soupReady, ready: !!Object.keys(C.soups).length };
    const pan = (it) => `<div class="pv-pan dragsrc" ${src1('item', it)}>${img(it)}<small>${label(it)}</small></div>`;
    this.el.innerHTML = `
      <div class="pv-top"><span class="pill-dark" id="pvProg">0/${C.rounds}</span><div class="pv-tickets" id="pvTickets"></div><button class="ghost small" id="pvQuit">Thoát</button></div>
      <div class="pv-back">
        ${this.has.pot ? '<div class="pv-pot drop" data-zone="pot"><div class="pv-lbl">Nồi trụng</div><div class="pv-baskets" id="pvBaskets"></div><div class="pv-hot" id="pvHot"></div></div>' : ''}
        <div class="pv-col">
          ${this.has.sink ? '<div class="pv-sink drop" data-zone="sink"><div class="pv-lbl">Bồn xả lạnh</div><div class="pv-sinkin" id="pvSink"></div></div>' : ''}
          ${this.has.fryer ? '<div class="pv-st drop fry" data-zone="fryer"><div class="pv-lbl">Chảo chiên</div><div id="pvFryer"></div></div>' : ''}
          ${this.has.microwave ? '<div class="pv-st drop mw" data-zone="microwave"><div class="pv-lbl">Lò vi sóng</div><div id="pvMw"></div></div>' : ''}
        </div>
        ${this.has.ready ? `<div class="pv-burner"><div class="pv-lbl">Lò đun nước</div><div class="pv-pots" id="pvPots"></div><div class="pv-ready" id="pvReady"></div></div>` : ''}
        ${C.brothSrc.length ? `<div class="pv-broths">${C.brothSrc.map((b) => `<div class="pv-broth dragsrc" ${src1('broth', b)}>${img(b)}<small>${label(b)}</small></div>`).join('')}</div>` : ''}
      </div>
      ${C.soupItems.length && this.has.burner ? `<div class="pv-shelf soup"><div class="pv-lbl dark">Kệ nước lèo</div><div class="pv-pans">${C.soupItems.map(pan).join('')}</div></div>` : ''}
      <div class="pv-shelf"><div class="pv-lbl dark">Tủ topping</div><div class="pv-pans" id="pvTops">${C.topItems.map(pan).join('')}</div></div>
      <div class="pv-front">
        <div class="pv-stack">${[...C.bowlItems, ...C.noodleItems].map((b) => `<div class="pv-src dragsrc" ${src1('item', b)}>${img(b)}<small>${label(b)}</small></div>`).join('')}</div>
        <div class="pv-work">
          ${this.has.prep ? '<div class="pv-boards" id="pvBoards"></div>' : ''}
          <div class="pv-slots" id="pvSlots"></div>
        </div>
        <div class="pv-trash drop" data-zone="trash">🗑️<small>vứt</small></div>
      </div>
      <div class="pv-msg" id="pvMsg">Kéo hoặc chạm đôi: tô vô nồi để trụng · sợi vô rọ · topping vô tô · tô xong lên phiếu</div>`;
    $('pvQuit').onclick = () => { this.stop(); this.o.onQuit?.(); };
    this.bind();
  }

  // ---------- vẽ phần động ----------
  render() {
    const C = this.C;
    $('pvProg').textContent = `${C.done}/${C.rounds}`;
    $('pvTickets').innerHTML = C.tickets.map((t) => `<div class="tk drop${t.regular ? ' reg' : ''}" data-zone="ticket" data-i="${t.id}"><b>${t.name}</b><span>${D.recipes[t.dish].name}</span><i class="bar"><u style="width:${C.patienceOf(t) * 100}%;background:${C.patienceOf(t) < 0.25 ? 'var(--red)' : C.patienceOf(t) < 0.5 ? 'var(--broth)' : 'var(--green)'}"></u></i></div>`).join('');
    if (this.has.pot) $('pvBaskets').innerHTML = C.baskets.map((b, i) => {
      if (!b) return `<div class="pv-basket drop" data-zone="pot" data-i="${i}"></div>`;
      const busy = b.left > 0; const st = b.spoiled ? 'hư — vứt đi' : busy ? '…' : b.state === 'hot' ? 'nóng' : b.state === 'rinsed' ? 'đã xả lạnh' : b.state === 'hot2' ? 'nóng lại' : 'xong';
      return `<div class="pv-basket drop ${b.spoiled ? 'bad' : b.state}" data-zone="pot" data-i="${i}"><div class="pv-rk ${busy ? '' : 'dragsrc'}" ${src1('basket', null, i)}>${img(b.spoiled ? b.input : b.input)}<small>${st}</small>${bar(b.left, b.total)}</div></div>`;
    }).join('');
    if (this.has.pot) $('pvHot').innerHTML = C.hot.length ? C.hot.map((h, i) => `<div class="pv-hb ${h.left > 0 ? '' : 'dragsrc'}" ${src1('hotbowl', null, i)}>${img(h.input)}<small>${h.left > 0 ? '…' : 'nóng'}</small>${bar(h.left, h.total)}</div>`).join('') : '<small class="hint">tô nóng trữ ở đây</small>';
    if (this.has.sink) $('pvSink').innerHTML = C.sinkJob ? `<div class="pv-job ${C.sinkJob.left > 0 ? '' : 'dragsrc'}" ${src1('sink')}>${img(C.sinkJob.input)}<small>${C.sinkJob.left > 0 ? C.sinkJob.name : 'xong'}</small>${bar(C.sinkJob.left, C.sinkJob.total)}</div>` : '';
    for (const [k, id] of [['fryer', 'pvFryer'], ['microwave', 'pvMw']]) { if (!this.has[k]) continue; const j = C[k];
      $(id).innerHTML = j ? `<div class="pv-job ${j.left > 0 ? '' : 'dragsrc'}" ${src1(k)}>${img(j.input)}<small>${j.left > 0 ? j.name : 'xong'}</small>${bar(j.left, j.total)}</div>` : '<small class="hint">trống</small>'; }
    if (this.has.ready) {
      $('pvPots').innerHTML = C.burner.pots.map((p, i) => {
        if (!p) return `<div class="pv-pt drop" data-zone="burner" data-i="${i}"><small class="hint">nồi trống</small></div>`;
        const done = p.left === 0; return `<div class="pv-pt drop ${done ? 'done' : ''}" data-zone="burner" data-i="${i}"><div class="${done ? 'dragsrc' : ''}" ${src1('burnerpot', null, i)}><b>${p.name}</b><small>${p.left === null ? p.items.map(label).join(' → ') : done ? 'xong — múc ra' : 'đang đun…'}</small>${bar(p.left, p.total)}</div></div>`;
      }).join('');
      $('pvReady').innerHTML = C.burner.ready.length ? C.burner.ready.map((r, i) => `<div class="pv-rd dragsrc" ${src1('ready', null, i)}>${img(r.output)}<small>${r.name}</small></div>`).join('') : '<small class="hint">kệ nước</small>';
    }
    if (this.has.prep) $('pvBoards').innerHTML = C.boards.map((b, i) => {
      if (!b) return `<div class="pv-board drop" data-zone="prep" data-i="${i}"><small class="hint">thớt ${i + 1}</small></div>`;
      const done = b.left === 0; return `<div class="pv-board drop ${done ? 'done' : ''}" data-zone="prep" data-i="${i}"><div class="${done ? 'dragsrc' : ''}" ${src1('board', null, i)}>${done ? img(b.output) : b.have.filter(Boolean).map(img).join('')}<small>${b.left === null ? `thiếu ${b.tf.inputs.filter((_, k) => !b.have[k]).map(label).join(', ')}` : done ? label(b.output) : b.name + '…'}</small>${bar(b.left, b.total)}</div></div>`;
    }).join('');
    $('pvSlots').innerHTML = C.slots.map((b, i) => {
      if (!b) return `<div class="pv-slot drop" data-zone="slot" data-i="${i}"><small>chỗ tô ${i + 1}</small></div>`;
      const full = C.fits(b.placed).some((t) => t.steps.length === b.placed.length);
      return `<div class="pv-slot drop has" data-zone="slot" data-i="${i}"><div class="pv-bowl dragsrc${full ? ' full' : ''}" ${src1('madebowl', null, i)}>${img(b.placed[0].replace(/^bowl-hot:/, ''))}${b.placed.slice(1).map((t, k) => `<i class="lay" style="--k:${k}">${img(t)}</i>`).join('')}</div><small>${full ? 'Xong — lên phiếu' : `${b.placed.length}/${(C.fits(b.placed)[0]?.steps.length) || '?'} bước`}</small></div>`;
    }).join('');
  }

  // ---------- kéo thả + chạm đôi ----------
  srcOf(el) { return { kind: el.dataset.k, tok: el.dataset.t, i: el.dataset.i != null ? Number(el.dataset.i) : undefined }; }
  zoneOf(el) { return { kind: el.dataset.zone, i: el.dataset.i != null ? Number(el.dataset.i) : undefined, id: el.dataset.zone === 'ticket' ? Number(el.dataset.i) : undefined }; }
  bind() {
    const root = this.el; let drag = null;
    root.onpointerdown = (e) => {
      const el = e.target.closest('.dragsrc'); if (!el || this.C.over) return; e.preventDefault(); root.setPointerCapture?.(e.pointerId);
      const key = el.dataset.k + ':' + (el.dataset.t || el.dataset.i); const now = performance.now();
      if (this._tap && this._tap.key === key && now - this._tap.t < 340) { this._tap = null; return this.auto(el); }
      this._tap = { key, t: now };
      const ghost = document.createElement('div'); ghost.className = 'pv-ghost'; ghost.innerHTML = el.querySelector('img,.emo')?.outerHTML || '•'; document.body.appendChild(ghost);
      drag = { el, ghost, x0: e.clientX, y0: e.clientY, moved: false }; el.classList.add('lift'); this.ghostTo(e.clientX, e.clientY, ghost);
    };
    root.onpointermove = (e) => { if (!drag) return; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) drag.moved = true; this.ghostTo(e.clientX, e.clientY, drag.ghost); };
    const end = (e) => { if (!drag) return; const d = drag; drag = null; d.ghost.remove(); d.el.classList.remove('lift'); root.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over'));
      if (!d.moved) return; const zone = document.elementsFromPoint(e.clientX, e.clientY).find((z) => z.classList?.contains('drop'));
      if (zone) { this.C.drop(this.srcOf(d.el), this.zoneOf(zone)); this.render(); } };
    root.onpointerup = end; root.onpointercancel = end;
  }
  ghostTo(x, y, ghost) { ghost.style.transform = `translate(${x - 28}px, ${y - 28}px)`; this.el.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over')); const z = document.elementsFromPoint(x, y).find((q) => q.classList?.contains('drop')); if (z) z.classList.add('over'); }
  /** Chạm đôi: tìm đích hợp lý rồi bay tới. */
  auto(el) {
    const src = this.srcOf(el); const zone = this.autoZone(src); if (!zone) { this.msg(this.whyNoZone(src), 'bad'); return; }
    const sel = zone.kind === 'ticket' ? `.tk[data-i="${zone.id}"]` : `.drop[data-zone="${zone.kind}"]${zone.i != null ? `[data-i="${zone.i}"]` : ''}`;
    const dst = this.el.querySelector(sel) || this.el.querySelector(`.drop[data-zone="${zone.kind}"]`);
    const go = () => { this.C.drop(src, zone); this.render(); };
    if (!dst) return go();
    const a = el.getBoundingClientRect(), b = dst.getBoundingClientRect();
    const g = document.createElement('div'); g.className = 'pv-ghost fly'; g.innerHTML = el.querySelector('img,.emo')?.outerHTML || '•'; document.body.appendChild(g);
    g.style.transform = `translate(${a.left + a.width / 2 - 28}px, ${a.top + a.height / 2 - 28}px)`; dst.classList.add('over');
    requestAnimationFrame(() => { g.style.transition = 'transform .2s cubic-bezier(.3,.7,.3,1)'; g.style.transform = `translate(${b.left + b.width / 2 - 28}px, ${b.top + b.height / 2 - 28}px) scale(.85)`; });
    setTimeout(() => { g.remove(); dst.classList.remove('over'); go(); }, 210);
  }
  /** Vì sao chạm đôi không biết đem đi đâu — nói cho người chơi thứ họ cần làm trước. */
  whyNoZone(src) {
    const C = this.C; const tok = C.token(src);
    if (tok == null) return 'Chưa xong — chờ chút';
    if (!C.slots.some(Boolean)) return 'Chưa có tô nào trên thớt — lấy tô (mẹt/dĩa) ra trước';
    const t = C.tickets[0]; const b = C.slots.find(Boolean);
    const want = b ? [...new Set(C.fits(b.placed).map((x) => x.steps[b.placed.length]).filter(Boolean))] : [];
    return want.length ? `Chưa cần ${label(tok)} — kế tiếp: ${want.map(label).join(' / ')}` : `Chưa biết đem ${label(tok)} đi đâu — thử kéo tay`;
  }
  autoZone(src) {
    const C = this.C; const tok = C.token(src); if (tok == null) return null;
    if (src.kind === 'madebowl') { const b = C.slots[src.i]; const t = C.tickets.find((x) => x.steps.length === b.placed.length && x.steps.every((s, k) => s === b.placed[k])); return t ? { kind: 'ticket', id: t.id } : null; }
    if (src.kind === 'basket' && C.baskets[src.i]?.spoiled) return { kind: 'trash' };
    // 1) tô đang cần đúng thứ này
    const si = C.slots.findIndex((b) => b && C.fits([...b.placed, tok]).length);
    if (si >= 0) return { kind: 'slot', i: si };
    // 2) mở tô mới ở chỗ trống (tô nóng / mẹt / dĩa)
    if (C.fits([tok]).length) { const e = C.slots.findIndex((b) => !b); if (e >= 0) return { kind: 'slot', i: e }; }
    // 3) trạm nào nhận thứ này
    for (const st of ['sink', 'pot', 'fryer', 'microwave']) if (C.transformAt(st, tok)) return { kind: st };
    if (C.transformsAt('prep').some((t) => t.inputs.some((r) => tokenMatches(r, tok)))) return { kind: 'prep' };
    if (this.has.burner && C.soupItems.includes(tok)) { let i = C.burner.pots.findIndex((p) => p && p.left === null); if (i < 0) i = C.burner.pots.findIndex((p) => !p); return i >= 0 ? { kind: 'burner', i } : null; }
    return null;
  }
  loop() { let last = performance.now();
    const tick = (now) => { if (this.C.over) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; this.C.update(dt); this.render(); this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick); }
}
