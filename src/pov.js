// QUẦY POV — lớp vẽ + kéo thả. Mọi luật bếp nằm ở game/counter.js (Counter), file này chỉ hiển thị và chuyển thao tác thành `C.drop(src, zone)`.
// Điều khiển: KÉO vật tới chỗ, hoặc CHẠM ĐÔI để nó tự bay tới đích hợp lý nhất (Kent: kéo chính xác trên điện thoại khó).
import { D, label, tokenMatches } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { Counter, povOk } from './game/counter.js';
import { dishArt, faceArt, fx, hand } from './game/art.js';
import { POUR, BOWL, SCENE, ZONES } from './data/counter-layout.js';
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
  // Nền là MỘT TẤM VẼ LIỀN; mọi trạm là ô trong suốt đặt lên trên theo % (data/counter-layout.js).
  // Ảnh hỏng/chưa có thì `.pv-stage` mất class `scene` → quay về bố cục khung cũ, vẫn chơi được.
  build() {
    const C = this.C; const need = (st) => Object.values(C.recs).some((r) => r.transforms.some((t) => t.station === st));
    this.has = { pot: need('pot'), sink: need('sink'), prep: need('prep'), fryer: need('fryer'), microwave: need('microwave'),
      burner: !!Object.keys(C.soups).length && !C.sim?.soupReady, ready: !!Object.keys(C.soups).length };
    const z = (k) => { const b = ZONES[k]; return `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`; };
    const pan = (it) => `<div class="pv-pan dragsrc" ${src1('item', it)}>${img(it)}<small>${label(it)}</small></div>`;
    const src = (it) => `<div class="pv-src dragsrc" ${src1('item', it)}>${img(it)}<small>${label(it)}</small></div>`;
    const zone = (k, inner, cls = '') => `<div class="pv-z ${cls}" style="${z(k)}">${inner}</div>`;
    const dropz = (k, name, inner, cls = '') => `<div class="pv-z drop ${cls}" data-zone="${name}" style="${z(k)}">${inner}</div>`;

    this.el.innerHTML = `
      <div class="pv-top"><span class="pill-dark" id="pvProg">0/${C.rounds}</span><button class="ghost small" id="pvQuit">Thoát</button></div>
      <div class="pv-stage scene" id="pvStage">
        <img class="pv-scene" src="${SCENE.src}" alt="" draggable="false"
             onerror="this.closest('.pv-stage').classList.remove('scene');this.remove()">
        <div class="pv-hud" style="${z('hudL')}"><span id="pvMoney">0k</span><i>tiền</i></div>
        <div class="pv-hud r" style="${z('hudR')}"><span id="pvServed">0/${C.rounds}</span><i>tô</i></div>
        <div class="pv-rail" id="pvTickets" style="${z('rail')}"></div>
        ${this.has.pot ? dropz('pot', 'pot', '<div class="pv-baskets" id="pvBaskets"></div>', 'st-pot') : ''}
        ${this.has.pot ? zone('hot', '<div class="pv-hot" id="pvHot"></div>') : ''}
        ${this.has.sink ? dropz('sink', 'sink', '<div class="pv-sinkin" id="pvSink"></div>', 'st-sink') : ''}
        ${this.has.ready ? zone('burner', `<div class="pv-pots" id="pvPots"></div><div class="pv-ready" id="pvReady"></div>`, 'st-burner') : ''}
        ${C.brothSrc.length ? zone('broth', C.brothSrc.map((b) => `<div class="pv-broth dragsrc" ${src1('broth', b)}>${img(b)}<small>${label(b)}</small></div>`).join(''), 'row') : ''}
        ${this.has.fryer ? dropz('fryer', 'fryer', '<div id="pvFryer"></div>', 'st-fryer') : ''}
        ${this.has.microwave ? dropz('micro', 'microwave', '<div id="pvMw"></div>', 'st-mw') : ''}
        ${zone('prep', `<div class="pv-pans" id="pvTops">${[...C.soupItems, ...C.topItems].map(pan).join('')}</div>`, 'shelf')}
        ${zone('stack', `<div class="pv-srcs">${C.bowlItems.map(src).join('')}</div>`, 'col')}
        ${zone('noodle', `<div class="pv-srcs">${C.noodleItems.map(src).join('')}</div>`, 'row')}
        ${this.has.prep ? zone('boards', '<div class="pv-boards" id="pvBoards"></div>', 'row') : ''}
        ${zone('slots', '<div class="pv-slots" id="pvSlots"></div>')}
        ${dropz('trash', 'trash', '<span class="pv-tr">🗑️</span>', 'trash')}
      </div>
      <div class="pv-msg" id="pvMsg">Kéo hoặc chạm đôi: tô vô nồi để trụng · sợi vô rọ · topping vô tô · tô xong lên phiếu</div>`;
    $('pvQuit').onclick = () => { this.stop(); this.o.onQuit?.(); };
    this.bind();
  }

  // ---------- vẽ phần động ----------
  render() {
    const C = this.C;
    $('pvProg').textContent = `${C.done}/${C.rounds}`;
    const mo = $('pvMoney'); if (mo) mo.textContent = `${Math.round(C.money)}k`;
    const sv = $('pvServed'); if (sv) sv.textContent = `${C.results.length - C.left}/${C.rounds}`;
    $('pvTickets').innerHTML = C.tickets.map((t) => `<div class="tk drop${t.regular ? ' reg' : ''}" data-zone="ticket" data-i="${t.id}"><img class="tk-face" src="${faceArt(t.regular, t.id)}" alt="" draggable="false" onerror="this.remove()"><b>${t.name}</b><span>${D.recipes[t.dish].name}</span><i class="bar"><u style="width:${C.patienceOf(t) * 100}%;background:${C.patienceOf(t) < 0.25 ? 'var(--red)' : C.patienceOf(t) < 0.5 ? 'var(--broth)' : 'var(--green)'}"></u></i></div>`).join('');
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
      const fit = C.fits(b.placed); const full = fit.some((t) => t.steps.length === b.placed.length);
      // Chỉ khi CÒN ĐÚNG MỘT món khớp mới biết vẽ tô nào; trước đó vẫn xếp icon như cũ.
      const only = fit.length === 1 ? fit[0].dish : null;
      const wet = !!only && b.placed.some((t) => /^broth:|-broth-ready$|^porridge-ready$/.test(t));
      const art = only ? dishArt(only, wet || full) : null;
      const inner = art
        ? `<img class="pv-art" src="${art}" alt="" draggable="false" onerror="this.remove()">`
        : `${img(b.placed[0].replace(/^bowl-hot:/, ''))}${b.placed.slice(1).map((t, k) => `<i class="lay" style="--k:${k}">${img(t)}</i>`).join('')}`;
      return `<div class="pv-slot drop has" data-zone="slot" data-i="${i}"><div class="pv-bowl dragsrc${full ? ' full' : ''}" ${src1('madebowl', null, i)}>${inner}</div><small>${full ? 'Xong — lên phiếu' : `${b.placed.length}/${(fit[0]?.steps.length) || '?'} bước`}</small></div>`;
    }).join('');
  }

  /** Sau mỗi thao tác đúng: chan nước thì chạy A10 (docs/ART-PIPELINE.md §2·§6). */
  afterDrop(res, src, zone) {
    if (!res?.ok || zone?.kind !== 'slot') return;
    const isBroth = ['broth', 'ready', 'burnerpot'].includes(src?.kind);
    if (!isBroth) return;
    const slot = this.el.querySelector(`.pv-slot[data-i="${zone.i}"]`);
    if (slot) this.pour(slot);
  }
  /** A10 — tay cầm vá trượt vào, nghiêng, dòng nước chảy xuống mặt nước trong tô rồi rút ra. */
  pour(slotEl) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const st = this.el.getBoundingClientRect(); const b = slotEl.getBoundingClientRect();
    const cx = b.left - st.left + b.width / 2;
    const rim = b.top - st.top + b.height * BOWL.rim;
    const surf = b.top - st.top + b.height * BOWL.surface;
    const D = POUR.duration, T = POUR.tilt;
    const mk = (cls, src) => { const e = document.createElement('div'); e.className = cls;
      e.innerHTML = `<img src="${src}" alt="" draggable="false" onerror="this.closest('.pv-fx').remove()">`;
      this.el.appendChild(e); return e; };
    const h = mk('pv-fx pv-hand', hand('ladle-d'));
    const w = Math.min(st.width * 0.62, 260); h.style.width = w + 'px';
    const hx = cx - w * 0.75, hy = rim - w * 0.92;
    h.animate([
      { transform: `translate(${hx}px, ${st.height}px) rotate(0deg)`, offset: 0, easing: 'cubic-bezier(.22,.9,.3,1)' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T * 0.65}deg)`, offset: POUR.t.rise, easing: 'ease-out' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T}deg)`, offset: POUR.t.tilted, easing: 'linear' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T}deg)`, offset: POUR.t.holdEnd, easing: 'cubic-bezier(.5,0,.75,.45)' },
      { transform: `translate(${hx}px, ${st.height}px) rotate(0deg)`, offset: 1 },
    ], { duration: D, easing: 'linear' }).onfinish = () => h.remove();

    const y0 = rim - b.height * BOWL.underLadle;
    const sm = mk('pv-fx pv-stream', fx('stream'));
    sm.style.left = cx + 'px'; sm.style.top = y0 + 'px';
    sm.style.width = Math.max(10, b.width * 0.13) + 'px'; sm.style.height = Math.max(10, surf - y0) + 'px';
    sm.animate([
      { opacity: 0, transform: 'translateX(-50%) scaleY(0)' },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: .2 },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: .82 },
      { opacity: 0, transform: 'translateX(-50%) scaleY(1)' },
    ], { duration: D * POUR.t.streamLen, delay: D * POUR.t.streamIn, easing: 'linear' }).onfinish = () => sm.remove();

    const sp = mk('pv-fx pv-splash', fx('splash'));
    sp.style.left = cx + 'px'; sp.style.top = surf + 'px'; sp.style.width = b.width * 0.24 + 'px';
    sp.animate([
      { opacity: 0, transform: 'translate(-50%,-60%) scale(.6)' },
      { opacity: .95, transform: 'translate(-50%,-60%) scale(1)', offset: .3 },
      { opacity: 0, transform: 'translate(-50%,-60%) scale(.9)' },
    ], { duration: D * POUR.t.splashLen, delay: D * POUR.t.splashIn, easing: 'linear' }).onfinish = () => sp.remove();
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
      drag = { el, ghost, x0: e.clientX, y0: e.clientY, moved: false }; el.classList.add('lift');
      root.classList.add('dragging');   // đang kéo mới hiện viền chỗ thả (CSS), lúc thường để tranh sạch
      this.ghostTo(e.clientX, e.clientY, ghost);
    };
    root.onpointermove = (e) => { if (!drag) return; if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) drag.moved = true; this.ghostTo(e.clientX, e.clientY, drag.ghost); };
    const end = (e) => { if (!drag) return; const d = drag; drag = null; d.ghost.remove(); d.el.classList.remove('lift');
      root.classList.remove('dragging'); root.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over'));
      if (!d.moved) return; const zone = document.elementsFromPoint(e.clientX, e.clientY).find((z) => z.classList?.contains('drop'));
      if (zone) { const sc = this.srcOf(d.el), zn = this.zoneOf(zone); const r = this.C.drop(sc, zn); this.render(); this.afterDrop(r, sc, zn); } };
    root.onpointerup = end; root.onpointercancel = end;
  }
  ghostTo(x, y, ghost) { ghost.style.transform = `translate(${x - 28}px, ${y - 28}px)`; this.el.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over')); const z = document.elementsFromPoint(x, y).find((q) => q.classList?.contains('drop')); if (z) z.classList.add('over'); }
  /** Chạm đôi: tìm đích hợp lý rồi bay tới. */
  auto(el) {
    const src = this.srcOf(el); const zone = this.autoZone(src); if (!zone) { this.msg(this.whyNoZone(src), 'bad'); return; }
    const sel = zone.kind === 'ticket' ? `.tk[data-i="${zone.id}"]` : `.drop[data-zone="${zone.kind}"]${zone.i != null ? `[data-i="${zone.i}"]` : ''}`;
    const dst = this.el.querySelector(sel) || this.el.querySelector(`.drop[data-zone="${zone.kind}"]`);
    const go = () => { const r = this.C.drop(src, zone); this.render(); this.afterDrop(r, src, zone); };
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
