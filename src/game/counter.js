// LÕI "QUẦY POV" — trạng thái thuần, KHÔNG đụng DOM (docs/PLAN-CORE.md §3). pov.js chỉ vẽ + bắt kéo thả rồi gọi các hàm ở đây.
// Mọi thao tác là "đem VẬT A tới CHỖ B" (kéo hoặc chạm đôi) — đúng như đứng trước quầy prep thật.
// Công thức lấy từ recipeFor(dish, simplify): KHÔNG bịa bước; mọi `transform` của món đều phải có một chỗ thả tương ứng.
import { D, recipeFor, soupRecipeFor, label, labelL as L, actName, soupName, dishLabel, tokenMatches, actionTime, STATIONS as STATION_DEFS } from './recipes.js';
import { t as T } from '../i18n.js';
import { POT, SOUP, SHELF_TOPPING, PRICES } from '../config.js';
import { REGULARS, lineFor } from '../data/customers.js';
import { comboMult } from '../data/pace.js';

const isBroth = (t) => /^broth:|-broth-ready$|^porridge-ready$/.test(t);
const BOWLISH = /bowl|^tray$|tray-paper|^dia-|mam-dan|chao-ap-ca|serving-plate|banh-trang/;
/** Mọi món đều chơi được ở quầy POV: mỗi transform phải rơi vào một trạm có chỗ thả. */
const STATIONS = STATION_DEFS.filter((s) => s.kind !== 'soup').map((s) => s.id);   // data/stations.json (P6.3)
export function povOk(dish) { const r = recipeFor(dish); return r.transforms.every((t) => STATIONS.includes(t.station)); }

export class Counter {
  /**
   * @param {object} o
   *   dishes[]            món trong màn
   *   rounds              số phiếu
   *   simplify            cờ rút gọn của level (recipeFor)
   *   constraints         { slots, potSlots, brothCap, noStack, boards }
   *   patience, gap       giây kiên nhẫn mỗi phiếu · giây giữa hai phiếu
   *   weights, rnd        chọn món · hàm random (test truyền hàm cố định)
   *   ev                  { onServe, onExpire, onSpawn, onMsg, onSfx }
   */
  constructor(o = {}) {
    const c = o.constraints || null; const sim = o.simplify || null;
    this.o = o; this.sim = sim; this.con = c; this.ev = o.ev || {};
    this.rnd = o.rnd || Math.random;
    this.dishes = (o.dishes || []).filter(povOk);
    this.recs = Object.fromEntries(this.dishes.map((d) => [d, recipeFor(d, sim)]));
    this.soups = Object.fromEntries(this.dishes.map((d) => [d, soupRecipeFor(d)]).filter(([, v]) => v));
    // lịch khách của level (makeLevelArrivals) — không có thì rải đều theo `gap`
    this.arrivals = (o.arrivals || []).filter((a) => !a.dish || this.dishes.includes(a.dish));
    this.rounds = this.arrivals.length || (o.rounds ?? 8);
    this.patience = o.patience ?? 90; this.gap = o.gap ?? 16;
    // Hết giờ là ĐÓNG CA thật (Kent 19/09). Trước đây `seconds` của level chỉ in ra menu
    // chứ quầy POV không dùng — menu hứa "180s" mà chơi bao lâu cũng được.
    this.seconds = Number.isFinite(o.seconds) ? o.seconds : null;
    // Giờ cao điểm (data/pace.js PACE.rush): tới mốc `at` của ca thì khách còn lại tới dày gấp đôi trong `len` giây, tiền ×mult.
    this.rush = o.rush || null; this.rushUntil = 0; this._rushed = false;
    this.maxTickets = c?.tickets ?? o.maxTickets ?? 3;   // số phiếu treo cùng lúc — càng nhiều càng làm song song được
    this.time = 0; this.spawned = 0; this.done = 0; this.over = false; this.results = [];
    this.nextSpawn = 1;
    // ---- level (docs/PLAN-WORLDS.md): mục tiêu riêng, tiền, chuỗi tô đúng ----
    this.goal = o.goal || null; this.moneyTargets = o.moneyTargets || null;
    this.money = 0; this.tips = 0; this.left = 0;
    this.streak = 0; this.bestStreak = 0; this.clearedAt = null;
    this.errors = []; this.regulars = {};
    // ---- chỗ trên quầy ----
    this.slots = Array.from({ length: c?.slots ?? 2 }, () => null);            // tô đang ráp trên mặt thớt
    this.baskets = Array.from({ length: c?.potSlots ?? POT.noodleSlots }, () => null);   // rọ trong nồi trụng
    this.hot = [];                                                             // tô đang/đã trụng nóng trong nồi
    this.boards = Array.from({ length: c?.boards ?? 2 }, () => null);          // thớt
    this.fryer = null; this.microwave = null; this.sinkJob = null; this.stovetop = null;   // chảo chiên · lò vi sóng · bồn (nhúng bánh tráng) · mặt bếp (nồi/chảo nhỏ)
    this.burner = { pots: Array.from({ length: o.burners ?? 1 }, () => null), ready: [] };
    // `soupReady: true` = nước nấu sẵn ĐỦ CHO CẢ CA (this.rounds). Trước đây cứng 2 phần → level 2 của 4 world
    // (3 khách) không bao giờ làm được tô thứ 3; kiên nhẫn 190 s che mất (khách bỏ đi, level vẫn kết thúc). Phát hiện 19/09 khi siết giờ ca.
    if (sim?.soupReady) for (const r of Object.values(this.soups)) for (let i = 0; i < (sim.soupReady === true ? Math.max(2, this.rounds) : sim.soupReady); i++) this.burner.ready.push({ name: r.name, output: r.output, items: r.items });
    this.stackMax = c?.brothCap ?? SOUP.stackMax; this.noStack = !!c?.noStack;
    this.tickets = [];
    // bản tập bỏ bước: lấy item nào trên kệ thì nhận thẳng token kết quả (vd tô đã nóng sẵn)
    this.shelfSubs = Object.assign({}, ...Object.values(this.recs).map((r) => r.shelfSubs || {}));
    this.buildShelves();
  }

  // ---------- kệ (nguồn kéo) ----------
  buildShelves() {
    const recs = Object.values(this.recs);
    const need = new Set(recs.flatMap((r) => r.shelfItems));
    this.soupItems = [...new Set(Object.values(this.soups).flatMap((r) => r.items))];
    for (const it of this.soupItems) need.add(it);
    const all = [...need].filter((it) => D.items[it]);
    this.noodleItems = [...new Set(recs.map((r) => r.noodle).filter(Boolean))];
    this.bowlItems = all.filter((it) => !this.noodleItems.includes(it) && BOWLISH.test(it));
    this.topItems = all.filter((it) => !this.noodleItems.includes(it) && !this.bowlItems.includes(it) && !this.soupItems.includes(it));
    this.topItems.sort((a, b) => (SHELF_TOPPING.indexOf(a) + 99 * (SHELF_TOPPING.indexOf(a) < 0)) - (SHELF_TOPPING.indexOf(b) + 99 * (SHELF_TOPPING.indexOf(b) < 0)));
    this.brothSrc = [...new Set(recs.flatMap((r) => r.assembly.filter(isBroth)))].filter((t) => !Object.values(this.soups).some((s) => s.output === t));   // nước có sẵn trên bếp (phở)
    // Đồ nấu nước KHÔNG phải topping — nó đi vào nồi, không vào tô. Chia theo bước ăn nó:
    //   put-stock-in-pot / put-porridge-in-pot → can nước cốt, nồi cháo: để ở kệ nước cạnh bếp
    //   add-water                              → miếng nước trắng: hứng ở vòi bồn rửa
    //   còn lại (huyết)                        → đồ rắn, vẫn nằm khay
    const sAct = Object.assign({}, ...Object.values(this.soups).map((r) => r.byAction || {}));
    this.stockItems = this.soupItems.filter((t) => /^(put-(stock|porridge)-in-pot|add-pho-broth)$/.test(sAct[t] || ''));
    this.waterItems = this.soupItems.filter((t) => (sAct[t] || '') === 'add-water');
    const onPan = (t) => !this.stockItems.includes(t) && !this.waterItems.includes(t);
    this.panItems = [...this.soupItems.filter(onPan), ...this.topItems];
  }

  // ---------- phiếu khách ----------
  pickDish() { const w = this.o.weights || {}; const sum = this.dishes.reduce((n, k) => n + (w[k] ?? 1), 0); let r = this.rnd() * sum; for (const k of this.dishes) { r -= (w[k] ?? 1); if (r <= 0) return k; } return this.dishes[this.dishes.length - 1]; }
  /** Ai gọi món — không để trùng tên với phiếu đang treo. */
  who(dish) {
    const used = new Set(this.tickets.map((t) => t.name));
    const rs = REGULARS.filter((x) => x.dish === dish && !used.has(x.name));
    if (rs.length && this.rnd() < 0.5) { const g = rs[Math.floor(this.rnd() * rs.length)]; return { name: g.name, regular: g.id }; }
    const ns = [1, 2, 3, 4, 5, 6].map((k) => T(`cust.walkin.${k}`));
    const free = ns.filter((n) => !used.has(n));
    const pool = free.length ? free : ns;
    return { name: pool[Math.floor(this.rnd() * pool.length)], regular: null };
  }
  spawn(dish = null, arr = null) {
    if (this.spawned >= this.rounds || this.tickets.length >= this.maxTickets) return null;
    if (!arr && this.arrivals.length) arr = this.arrivals[this.spawned];
    const d = dish || arr?.dish || this.pickDish();
    let reg = arr?.regular ? REGULARS.find((x) => x.id === arr.regular) : null;
    if (reg && this.tickets.some((t) => t.regular === reg.id || t.name === reg.name)) reg = null;   // khách quen đang đứng chờ thì không hiện thêm phiếu nữa
    const w = reg ? { name: reg.name, regular: reg.id } : this.who(d);
    const t = { id: this.spawned++, dish: d, ...w, steps: this.recs[d].assembly, born: this.time,
      pat: arr?.patience || this.patience, tipMult: reg?.tipMult || 1, mistakes: 0, taps: 0 };
    this.tickets.push(t); this.ev.onSpawn?.(t); return t;
  }
  /** Tô đã bỏ `placed` còn khớp phiếu nào đang treo? */
  fits(placed) { return this.tickets.filter((t) => placed.every((tok, i) => t.steps[i] === tok)); }

  // ---------- tiện ích ----------
  ok(msg) { this.ev.onMsg?.(msg, 'good'); return { ok: true, msg }; }
  /** Vứt/hư đồ — không phải lỗi thứ tự, nhưng tính cho mục tiêu `no-waste`. */
  waste(tag) { this.errors.push({ t: +this.time.toFixed(1), tag, waste: true }); }
  err(msg, slotIdx = null) {
    const b = slotIdx != null ? this.slots[slotIdx] : null;
    if (b) b.mistakes = (b.mistakes || 0) + 1;   // lỗi không gắn với tô nào chỉ ghi vào `errors`, không đổ cho phiếu nào
    this.errors.push({ t: +this.time.toFixed(1), tag: msg, waste: false });
    this.ev.onMsg?.(msg, 'bad'); this.ev.onSfx?.('mistake'); return { ok: false, msg };
  }
  /** Phép biến đổi tại trạm nhận token này (ưu tiên món của phiếu đang treo). */
  transformAt(station, tok) {
    const want = new Set(this.tickets.map((t) => t.dish));
    const ids = Object.keys(this.recs).sort((a, b) => (want.has(b) ? 1 : 0) - (want.has(a) ? 1 : 0));
    for (const id of ids) { const t = this.recs[id].transforms.find((x) => x.station === station && x.inputs.length === 1 && tokenMatches(x.inputs[0], tok)); if (t) return t; }
    return null;
  }
  transformsAt(station) { const seen = new Map(); for (const r of Object.values(this.recs)) for (const t of r.transforms) if (t.station === station && !seen.has(t.output)) seen.set(t.output, t); return [...seen.values()]; }
  /** Token mà một nguồn đang mang (null = chưa lấy được). */
  token(src) {
    if (src.kind === 'item') return this.shelfSubs[src.tok] || src.tok;
    if (src.kind === 'basket') { const b = this.baskets[src.i]; return b && b.left <= 0 && !b.spoiled ? b.output : null; }
    if (src.kind === 'hotbowl') { const h = this.hot[src.i]; return h && h.left <= 0 ? h.output : null; }
    if (src.kind === 'board') { const b = this.boards[src.i]; return b && b.left === 0 ? b.output : null; }
    if (src.kind === 'fryer') return this.fryer && this.fryer.left <= 0 ? this.fryer.output : null;
    if (src.kind === 'microwave') return this.microwave && this.microwave.left <= 0 ? this.microwave.output : null;
    if (src.kind === 'stovetop') return this.stovetop && this.stovetop.left != null && this.stovetop.left <= 0 ? this.stovetop.output : null;
    if (src.kind === 'sink') return this.sinkJob && this.sinkJob.left <= 0 ? this.sinkJob.output : null;
    if (src.kind === 'ready') return this.burner.ready[src.i]?.output || null;
    if (src.kind === 'burnerpot') { const p = this.burner.pots[src.i]; return p && p.left <= 0 ? p.output : null; }
    if (src.kind === 'broth') return src.tok;                                  // nồi nước có sẵn (phở): múc bao nhiêu cũng được
    if (src.kind === 'madebowl') return 'BOWL';
    return null;
  }
  take(src) {   // lấy token ra khỏi nguồn (nguồn "một lần")
    if (src.kind === 'basket') this.baskets[src.i] = null;
    else if (src.kind === 'hotbowl') this.hot.splice(src.i, 1);
    else if (src.kind === 'board') this.boards[src.i] = null;
    else if (src.kind === 'fryer') this.fryer = null;
    else if (src.kind === 'microwave') this.microwave = null;
    else if (src.kind === 'stovetop') this.stovetop = null;
    else if (src.kind === 'sink') this.sinkJob = null;
    else if (src.kind === 'ready') this.burner.ready.splice(src.i, 1);
    else if (src.kind === 'burnerpot') this.burner.pots[src.i] = null;
  }

  // ---------- THẢ: vật A → chỗ B ----------
  /** @param {{kind:string, tok?:string, i?:number}} src @param {{kind:string, i?:number, id?:number}} zone */
  drop(src, zone) {
    if (this.over) return { ok: false, msg: '' };
    const t0 = this.tickets[0]; if (t0) t0.taps++;
    const tok = this.token(src);
    if (zone.kind === 'trash') return this.toTrash(src, tok);                  // vứt được cả đồ hư / đang dở
    if (tok === null) return this.err(T('pov.wait'));
    switch (zone.kind) {
      case 'pot': return this.toPot(src, tok);
      case 'sink': return this.toSink(src, tok);
      case 'prep': return this.toPrep(src, tok, zone.i);
      case 'fryer': return this.toJobStation('fryer', src, tok);
      case 'microwave': return this.toJobStation('microwave', src, tok);
      // Ô bếp làm hai việc: nồi/chảo nhỏ (hâm, xào) và nồi nước lèo. Token nào thuộc mặt bếp thì về đó.
      case 'burner': return this.transformsAt('stovetop').some((t) => t.inputs.some((req) => tokenMatches(req, tok)))
        ? this.toStovetop(src, tok) : this.toBurner(src, tok, zone.i);
      case 'slot': return this.toSlot(src, tok, zone.i);
      case 'ticket': return this.toTicket(src, zone.id);
      default: return this.err(T('err.noDrop'));
    }
  }
  toPot(src, tok) {
    // rọ đã xả lạnh → trụng nóng lại
    if (src.kind === 'basket') { const b = this.baskets[src.i]; const t = this.transformAt('pot', b.output); if (!t) return this.err(b.state === 'hot' ? T('err.basketHot') : T('err.basketDone')); b.output = t.output; b.left = t.time; b.total = t.time; b.hold = 0; b.state = 'reblanching'; this.ev.onSfx?.('splash'); return this.ok(`${L(t.input)}: ${actName(t.action, 'trụng lại')}`); }   // vi-src
    const t = this.transformAt('pot', tok);
    if (!t) { if (this.recs[Object.keys(this.recs)[0]]?.shelfSubs?.[tok]) return this.err(T('err.bowlPreHot')); return this.err(T('err.notAt', { item: L(tok), where: T('st.pot') })); }
    if (t.action === 'blanch-bowl') {
      if (this.hot.length >= POT.bowlSlots) return this.err(T('err.potFullBowls', { n: POT.bowlSlots }));
      this.hot.push({ input: tok, output: t.output, left: t.time, total: t.time }); this.ev.onSfx?.('splash'); return this.ok(`${L(tok)}: ${T('st.blanching')}`);
    }
    const i = this.baskets.findIndex((b) => !b); if (i < 0) return this.err(T('err.noBasket'));
    this.baskets[i] = { input: tok, output: t.output, left: t.time, total: t.time, hold: 0, state: 'blanching', action: t.action };
    this.ev.onSfx?.('splash'); return this.ok(`${L(tok)}: ${actName(t.action, 'trụng')}`);   // vi-src
  }
  toSink(src, tok) {
    if (src.kind === 'basket') { const b = this.baskets[src.i]; const t = this.transformAt('sink', b.output); if (!t) return this.err(b.state === 'rinsed' ? T('err.rinsedAlready') : T('err.noRinse')); b.output = t.output; b.left = t.time; b.total = t.time; b.state = 'rinsing'; this.ev.onSfx?.('splash'); return this.ok(T('st.rinsing')); }
    const t = this.transformAt('sink', tok); if (!t) return this.err(T('err.notAt', { item: L(tok), where: T('st.sink') }));
    if (this.sinkJob) return this.err(T('err.sinkBusy'));
    this.sinkJob = { input: tok, output: t.output, left: t.time, total: t.time, name: actName(t.action, 'Nhúng') };   // vi-src
    this.take(src); this.ev.onSfx?.('splash'); return this.ok(`${L(tok)}: ${this.sinkJob.name}`);
  }
  toJobStation(kind, src, tok) {
    const where = T(`st.${kind}`);
    const tf = this.transformAt(kind, tok); if (!tf) return this.err(T('err.notAt', { item: L(tok), where }));
    if (this[kind]) return this.err(T('err.stationBusy', { where }));
    this[kind] = { input: tok, output: tf.output, left: tf.time, total: tf.time, name: actName(tf.action) };
    this.take(src); this.ev.onSfx?.(kind === 'microwave' ? 'drop' : 'sizzle'); return this.ok(`${L(tok)}: ${this[kind].name}`);
  }
  /** Mặt bếp: một nồi/chảo nhỏ, gom đủ đồ rồi mới chạy (xào lăn cần thịt tái + rau cải). */
  toStovetop(src, tok) {
    let s = this.stovetop;
    if (s && s.left !== null) return this.err(s.left > 0 ? T('err.secsLeft', { name: s.name, s: s.left.toFixed(0) }) : T('err.doneTakeOut', { name: s.name }));
    if (!s) {
      const tf = this.transformsAt('stovetop').find((x) => x.inputs.some((req) => tokenMatches(req, tok)));
      if (!tf) return this.err(T('err.notAt', { item: L(tok), where: T('st.stovetop') }));
      s = this.stovetop = { tf, have: tf.inputs.map(() => null), left: null, total: tf.time, input: tok, output: tf.output, name: actName(tf.action) };
    }
    const k = s.tf.inputs.findIndex((req, i) => !s.have[i] && tokenMatches(req, tok));
    if (k < 0) return this.err(T('err.stoveDoing', { name: s.name, item: L(tok) }));
    s.have[k] = tok; this.take(src); this.ev.onSfx?.('place');
    if (s.have.every(Boolean)) { s.left = s.tf.time; this.ev.onSfx?.('sizzle'); return this.ok(`${s.name}…`); }
    return this.ok(T('st.missing', { name: s.name, list: s.tf.inputs.filter((_, i) => !s.have[i]).map(L).join(', ') }));
  }
  toPrep(src, tok, idx) {
    const tfs = this.transformsAt('prep');
    // thớt đang thiếu đúng thứ này?
    let bi = this.boards.findIndex((b) => b && b.left === null && b.tf.inputs.some((req, k) => !b.have[k] && tokenMatches(req, tok)));
    if (bi < 0) {
      const tf = tfs.find((x) => x.inputs.some((req) => tokenMatches(req, tok))); if (!tf) return this.err(T('err.notAt', { item: L(tok), where: T('st.prep') }));
      bi = idx != null && !this.boards[idx] ? idx : this.boards.findIndex((b) => !b);
      if (bi < 0) return this.err(T('err.boardsFull'));
      this.boards[bi] = { tf, have: tf.inputs.map(() => null), left: null, total: tf.time, output: tf.output, name: actName(tf.action) };
    }
    const b = this.boards[bi]; const k = b.tf.inputs.findIndex((req, i) => !b.have[i] && tokenMatches(req, tok));
    b.have[k] = tok; this.take(src); this.ev.onSfx?.('place');
    if (b.have.every(Boolean)) { b.left = b.tf.time; this.ev.onSfx?.('drop'); return this.ok(`${b.name}…`); }
    const missing = b.tf.inputs.filter((_, i) => !b.have[i]).map(L);
    return this.ok(T('st.missing', { name: b.name, list: missing.join(', ') }));
  }
  toBurner(src, tok, idx) {
    if (this.sim?.soupReady) return this.err(T('err.soupReady'));
    let i = idx != null && (!this.burner.pots[idx] || this.burner.pots[idx].left === null) ? idx : this.burner.pots.findIndex((p) => p && p.left === null);
    if (i < 0 || i == null) i = this.burner.pots.findIndex((p) => !p);
    if (i < 0) return this.err(T('err.noBurner'));
    let p = this.burner.pots[i];
    if (p && p.left !== null) return this.err(p.left > 0 ? T('err.secsLeft', { name: soupName(p), s: p.left.toFixed(0) }) : T('err.doneLadle', { name: soupName(p) }));
    if (!p) p = this.burner.pots[i] = { items: [], left: null, total: null, name: T('st.soupPot') };
    const seq = [...p.items, tok];
    const pre = Object.values(this.soups).filter((r) => seq.every((it, k) => r.items[k] === it));
    if (!pre.length) {
      const want = [...new Set(Object.values(this.soups).filter((r) => p.items.every((it, k) => r.items[k] === it)).map((r) => r.items[p.items.length]).filter(Boolean))];
      this.burner.pots[i] = p.items.length ? p : null;
      return this.err(want.length ? T('err.soupOrder', { item: L(tok), list: want.map(L).join(' / ') }) : T('err.notSoup', { item: L(tok) }));
    }
    p.items = seq; this.take(src); this.ev.onSfx?.('drop');
    const full = pre.find((r) => r.items.length === seq.length);
    if (full) { p.name = full.name; p.output = full.output; p.left = actionTime(full.heatAction); p.total = p.left; this.ev.onSfx?.('sizzle'); return this.ok(T('st.soupHeating', { name: soupName(full), list: full.items.map(L).join(' → ') })); }
    return this.ok(T('st.soupMore', { list: seq.map(L).join(' → ') }));
  }
  toSlot(src, tok, i) {
    const b = this.slots[i];
    // tô nóng / mẹt / dĩa: mở một tô mới ở chỗ trống
    if (!b) {
      const first = this.fits([tok]);
      if (!first.length) return this.err(T('err.noTicketStarts', { item: L(tok) }));
      this.take(src); this.slots[i] = { placed: [tok], mistakes: 0, bornAt: this.time }; this.ev.onSfx?.('clink'); return this.ok(`${L(tok)} ✓`);
    }
    // rọ sợi: kiểm tra đã đúng trạng thái chưa (nóng→lạnh→nóng vs trụng một lần)
    if (src.kind === 'basket') {
      const bk = this.baskets[src.i];
      if (bk.spoiled) return this.err(T('err.spoiled'), i);
      const cands = this.fits(b.placed);
      const wantsThis = cands.some((t) => t.steps[b.placed.length] === bk.output);
      if (!wantsThis) {
        const more = this.transformAt('pot', bk.output) || this.transformAt('sink', bk.output);
        if (more) return this.err(more.station === 'sink' ? T('err.needRinseReblanch', { item: L(bk.input) }) : T('err.needReblanch', { item: L(bk.input) }), i);
      }
    }
    const next = [...b.placed, tok]; const ok = this.fits(next);
    if (!ok.length) {
      const cands = this.fits(b.placed); const want = [...new Set(cands.map((t) => t.steps[b.placed.length]).filter(Boolean))];
      return this.err(want.length ? T('pov.notYet', { item: L(tok), next: want.map(L).join(' / ') }) : T('err.bowlComplete'), i);
    }
    this.take(src); b.placed = next; this.ev.onSfx?.('place');
    return this.ok(`${L(tok)} ✓`);
  }
  toTicket(src, id) {
    if (src.kind !== 'madebowl') return this.err(T('err.onlyDoneBowl'));
    const b = this.slots[src.i]; if (!b) return this.err(T('err.noBowlHere'));
    const tk = this.tickets.find((x) => x.id === id); if (!tk) return this.err(T('err.ticketGone'));
    const match = tk.steps.length === b.placed.length && tk.steps.every((s, k) => s === b.placed[k]);
    if (!match) {
      const other = this.tickets.find((x) => x !== tk && x.steps.length === b.placed.length && x.steps.every((s, k) => s === b.placed[k]));
      // đưa nhầm phiếu là lỗi CỦA TÔ ĐÓ → trừ chất lượng đúng tô, không đổ cho phiếu khác
      return this.err(other ? T('err.wrongTicket', { dish: dishLabel(other.dish), who: other.name, name: tk.name }) : T('err.bowlIncomplete'), src.i);
    }
    tk.mistakes += b.mistakes || 0; this.slots[src.i] = null; return this.serve(tk, b);
  }
  toTrash(src, tok) {
    if (src.kind === 'item') return this.err(T('err.noTrashShelf'));
    if (src.kind === 'madebowl') { this.slots[src.i] = null; this.waste(T('st.wasteBowl')); this.ev.onSfx?.('trash'); return this.ok(T('st.bowlDumped')); }
    this.take(src); this.waste(T('st.wasteItem', { item: tok ? L(tok) : T('st.thing') })); this.ev.onSfx?.('trash'); return this.ok(T('st.trashed', { item: tok ? L(tok) : T('st.thing') }));
  }

  // ---------- giao / hết giờ ----------
  serve(t, bowl) {
    const sec = this.time - t.born; const q = Math.max(0, 100 - 20 * t.mistakes - (sec > (this.o.par || 1e9) ? 10 : 0));
    this.results.push({ dish: t.dish, mistakes: t.mistakes, sec, taps: t.taps, quality: q });
    const price = PRICES[t.dish] || 30;
    const tipRate = t.mistakes ? 0 : sec <= t.pat * 0.45 ? 0.2 : sec <= t.pat * 0.7 ? 0.1 : 0;
    const tip = Math.round(price * tipRate * (t.tipMult || 1));
    // Chuỗi tô sạch (combo) nhân tiền — tính TRƯỚC khi cộng tiền để tô này được hưởng. Sai 1 tô là về 0.
    const hadStreak = this.streak;
    if (t.mistakes) this.streak = 0; else { this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); }
    const mult = comboMult(this.streak) * (this.rushUntil ? this.rush.mult : 1);
    const gain = Math.round((price + tip) * mult);
    this.money += gain; this.tips += tip;
    if (t.mistakes && hadStreak >= 2) this.ev.onComboBreak?.(hadStreak);
    else if (this.streak >= 2) this.ev.onCombo?.(this.streak, comboMult(this.streak));
    if (t.regular) this.regulars[t.regular] = { id: t.regular, name: t.name, served: true };
    this.tickets.splice(this.tickets.indexOf(t), 1); this.done++; this.ev.onSfx?.('serve');
    if (this.done >= this.rounds && this.clearedAt == null) this.clearedAt = +this.time.toFixed(1);
    const say = t.mistakes ? (t.regular ? lineFor({ regular: t.regular }, 'wrong') : T('cust.meh')) : (t.regular ? lineFor({ regular: t.regular }, 'good') : lineFor({}, 'good'));
    this.ev.onServe?.(t, { sec, quality: q, say, gain, mult });
    this.checkEnd(); return { ok: true, msg: `${t.name}: “${say}”`, served: t };
  }
  expire(t) {
    this.results.push({ dish: t.dish, mistakes: t.mistakes + 3, sec: t.pat, taps: t.taps, quality: 0 });
    this.left++; if (this.streak >= 2) this.ev.onComboBreak?.(this.streak); this.streak = 0;
    if (t.regular) this.regulars[t.regular] = { id: t.regular, name: t.name, served: false };
    this.tickets.splice(this.tickets.indexOf(t), 1); this.done++; this.ev.onSfx?.('mistake'); this.ev.onExpire?.(t); this.checkEnd();
  }
  checkEnd() { if (this.done >= this.rounds && !this.over) { this.over = true; this.ev.onEnd?.(this.result()); } }
  /** Đóng ca vì hết giờ. Khách chưa tới thì thôi không tới; phiếu đang treo coi như khách về. */
  endShift() { if (this.over) return; this.over = true; this.ev.onSfx?.('done'); this.ev.onEnd?.(this.result()); }

  // ---------- đồng hồ ----------
  update(dt) {
    if (this.over) return; this.time += dt;
    if (this.seconds != null && this.time >= this.seconds) return this.endShift();
    if (this.rush && this.seconds != null) {
      if (!this._rushed && this.time >= this.seconds * this.rush.at) {
        this._rushed = true; this.rushUntil = this.time + this.rush.len;
        // khách chưa tới: dồn về gấp đôi (khoảng cách còn lại chia 2)
        for (let i = this.spawned; i < this.arrivals.length; i++) { const a = this.arrivals[i]; if (a.t > this.time) a.t = +(this.time + (a.t - this.time) / 2).toFixed(2); }
        this.ev.onRush?.(true, this.rush);
      } else if (this.rushUntil && this.time >= this.rushUntil) { this.rushUntil = 0; this.ev.onRush?.(false, this.rush); }
    }
    if (this.arrivals.length) {
      // khách tới theo lịch; quầy chỉ treo 3 phiếu nên người tới sớm phải đợi chỗ trống
      while (this.spawned < this.rounds && this.tickets.length < this.maxTickets && this.time >= this.arrivals[this.spawned].t) this.spawn(null, this.arrivals[this.spawned]);
    } else if (this.time >= this.nextSpawn && this.tickets.length < this.maxTickets && this.spawned < this.rounds) { this.spawn(); this.nextSpawn = this.time + this.gap; }
    const tickJob = (j) => { if (j && j.left > 0) { j.left = Math.max(0, j.left - dt); if (j.left === 0) this.ev.onSfx?.('done'); } };
    for (const b of this.baskets) { if (!b) continue; tickJob(b);
      if (b.left === 0 && b.state !== 'rinsed') { b.state = b.state === 'blanching' ? 'hot' : b.state === 'reblanching' ? 'hot2' : b.state; }
      if (b.left === 0 && b.state === 'rinsing') b.state = 'rinsed';
      // sợi chín để lâu trong nồi thì hư (như bếp thật); tô thì để bao lâu cũng được
      if (b.left === 0 && /noodle/.test(b.output) && !this.sim?.noSpoil && !b.spoiled) { b.hold += dt; if (b.hold >= POT.noodleSpoilAfter) { b.spoiled = true; b.output = 'noodle-spoiled'; this.waste(T('st.wasteSpoil')); this.ev.onSpoil?.(b); } }
    }
    for (const h of this.hot) tickJob(h);
    for (const b of this.boards) tickJob(b);
    tickJob(this.fryer); tickJob(this.microwave); tickJob(this.sinkJob); tickJob(this.stovetop);
    this.burner.pots.forEach((p, i) => { if (!p || p.left === null) return; tickJob(p);
      if (p.left === 0 && !this.noStack && this.burner.ready.length < this.stackMax) { this.burner.ready.push({ name: p.name, output: p.output, items: p.items }); this.burner.pots[i] = null; } });
    for (const t of [...this.tickets]) if (this.time - t.born >= t.pat) this.expire(t);
  }
  /** Còn bao nhiêu phần trăm kiên nhẫn (để vẽ thanh). */
  patienceOf(t) { return Math.max(0, 1 - (this.time - t.born) / t.pat); }

  /** Mục tiêu riêng của level — cùng luật với World.starsForGoal (docs/PLAN-WORLDS.md §2b·4). */
  starsForGoal(moneyStars, stats) {
    const g = this.goal; if (!g) return moneyStars;
    const clean = stats.bowls.filter((b) => !b.mistakes).length;
    const waste = this.errors.filter((e) => e.waste).length;
    const st = (ok3, ok2, ok1) => (ok3 ? 3 : ok2 ? 2 : ok1 ? 1 : 0);
    if (g.kind === 'clean') { const n = g.bowls; return st(clean >= n, clean >= Math.ceil(n * 0.75), clean >= Math.ceil(n * 0.5)); }
    if (g.kind === 'no-waste') return Math.min(Math.max(moneyStars, 1), st(waste === 0, waste <= 1, waste <= 2));
    if (g.kind === 'streak') { const n = g.n; return st(this.bestStreak >= n, this.bestStreak >= n - 1, this.bestStreak >= Math.max(1, n - 2)); }
    if (g.kind === 'before') { const c = this.clearedAt; if (c == null || this.left) return st(false, false, this.results.length > 0 && !this.left); return st(c <= g.seconds, c <= g.seconds * 1.15, true); }
    return moneyStars;
  }
  result() {
    let acc = 0; const bowls = this.results.map((r) => { acc += r.sec; return { dish: r.dish, name: D.recipes[r.dish].name, arrivedAt: +(acc - r.sec).toFixed(1), servedAt: +acc.toFixed(1), wait: +r.sec.toFixed(1), mistakes: r.mistakes, taps: r.taps, quality: r.quality }; });
    const mistakes = this.results.reduce((n, r) => n + r.mistakes, 0);
    const served = this.results.length - this.left;
    const stats = { bowls, idle: 0, taps: this.results.reduce((n, r) => n + r.taps, 0), trips: 0, time: +this.time.toFixed(1) };
    let stars = 0;
    if (this.moneyTargets) { const t = this.moneyTargets; stars = this.money >= t[2] ? 3 : this.money >= t[1] ? 2 : this.money >= t[0] ? 1 : 0; if (this.left >= 3) stars = Math.min(stars, 1); }
    stars = this.starsForGoal(stars, stats);
    return { puzzle: !this.moneyTargets, pov: true, money: this.money, tips: this.tips, served, left: this.left, mistakes,
      wasted: this.errors.filter((e) => e.waste).length, errors: this.errors, stars,
      regulars: Object.values(this.regulars), goal: this.goal, bestStreak: this.bestStreak, clearedAt: this.clearedAt,
      quality: this.results.length ? Math.round(this.results.reduce((n, r) => n + r.quality, 0) / this.results.length) : 0,
      stats };
  }
}

/**
 * "Bot" cho quầy: trả về nước đi kế tiếp {src, zone} để hoàn thành phiếu đầu — dùng cho test và cho par.
 * Quy tắc: đi theo `assembly` của phiếu đang làm, bước nào chưa có thì truy ngược chuỗi transform.
 */
/** Nước đi kế tiếp của bot. Phiếu đầu kẹt (đang chờ nồi/thớt) thì quay sang phiếu khác — làm song song như người thật. */
export function counterMove(C) {
  for (const t of C.tickets) { const m = moveFor(C, t); if (m) return m; }
  return null;
}
function moveFor(C, t) {
  if (!t) return null;
  const si = C.slots.findIndex((b) => b && C.fits(b.placed).includes(t));
  const bowl = si >= 0 ? C.slots[si] : null;
  const rec = C.recs[t.dish];
  // tô xong → giao
  if (bowl && bowl.placed.length === t.steps.length) return { src: { kind: 'madebowl', i: si }, zone: { kind: 'ticket', id: t.id } };
  const need = t.steps[bowl ? bowl.placed.length : 0];
  // hết chỗ thớt thì chờ, tuyệt đối không đổ vào tô của phiếu khác
  const free = C.slots.findIndex((b) => !b);
  if (si < 0 && free < 0) return null;
  const slotZone = () => (si >= 0 ? { kind: 'slot', i: si } : { kind: 'slot', i: free });
  // đã có sẵn ở đâu đó → đem vô tô
  const ready = findReady(C, need); if (ready) return { src: ready, zone: slotZone() };
  const sm = soupMove(C, need); if (sm) return sm;                            // nước lèo phải nấu ở lò
  // truy ngược chuỗi transform: tìm bước đầu tiên chưa làm
  return backtrack(C, rec, need, slotZone());
}
function findReady(C, need) {
  const m = (out) => out && tokenMatches(need, out);
  for (let i = 0; i < C.baskets.length; i++) { const b = C.baskets[i]; if (b && b.left <= 0 && !b.spoiled && m(b.output)) return { kind: 'basket', i }; }
  for (let i = 0; i < C.hot.length; i++) if (C.hot[i].left <= 0 && m(C.hot[i].output)) return { kind: 'hotbowl', i };
  for (let i = 0; i < C.boards.length; i++) { const b = C.boards[i]; if (b && b.left === 0 && m(b.output)) return { kind: 'board', i }; }
  if (C.fryer && C.fryer.left <= 0 && m(C.fryer.output)) return { kind: 'fryer' };
  if (C.microwave && C.microwave.left <= 0 && m(C.microwave.output)) return { kind: 'microwave' };
  if (C.stovetop && C.stovetop.left != null && C.stovetop.left <= 0 && m(C.stovetop.output)) return { kind: 'stovetop' };
  if (C.sinkJob && C.sinkJob.left <= 0 && m(C.sinkJob.output)) return { kind: 'sink' };
  for (let i = 0; i < C.burner.ready.length; i++) if (m(C.burner.ready[i].output)) return { kind: 'ready', i };
  for (let i = 0; i < C.burner.pots.length; i++) { const p = C.burner.pots[i]; if (p && p.left === 0 && m(p.output)) return { kind: 'burnerpot', i }; }
  if (D.items[need]) return { kind: 'item', tok: need };
  // bản tập bỏ bước: lấy thẳng đồ trên kệ là ra luôn token kết quả (vd tô đã nóng sẵn)
  const sub = Object.entries(C.shelfSubs || {}).find(([it, out]) => D.items[it] && tokenMatches(need, out));
  if (sub) return { kind: 'item', tok: sub[0] };
  if (C.brothSrc.some((b) => tokenMatches(need, b))) return { kind: 'broth', tok: C.brothSrc.find((b) => tokenMatches(need, b)) };
  return null;
}
/** Nước lèo/cháo phải nấu ở lò: nước đi kế tiếp để nấu ra `need` (null nếu không phải soup hoặc đang đun). */
function soupMove(C, need) {
  if (C.sim?.soupReady) return null;                                          // bản tập: nước nấu sẵn, lò tắt — lấy ở kệ nước
  const soup = Object.values(C.soups).find((s) => tokenMatches(need, s.output)); if (!soup) return null;
  if (C.burner.pots.some((p) => p && p.output === soup.output && p.left > 0)) return null;   // đang đun → chờ
  let pi = C.burner.pots.findIndex((p) => p && p.left === null && soup.items.every((it, k) => k >= p.items.length || p.items[k] === it));
  if (pi < 0) pi = C.burner.pots.findIndex((p) => !p);
  if (pi < 0) return null;
  const p = C.burner.pots[pi]; const k = p ? p.items.length : 0;
  return { src: { kind: 'item', tok: soup.items[k] }, zone: { kind: 'burner', i: pi } };
}
function backtrack(C, rec, need, slotZone, depth = 0) {
  if (depth > 8) return null;
  const t = rec.transforms.find((x) => tokenMatches(need, x.output)); if (!t) return null;
  // đang làm dở ở trạm? → chờ
  const busy = [...C.baskets, ...C.boards, C.fryer, C.microwave, C.sinkJob, C.stovetop].some((j) => j && j.output === t.output && j.left > 0);
  if (busy) return null;
  const zone = t.station === 'prep' ? { kind: 'prep' } : { kind: t.station === 'stovetop' ? 'burner' : t.station };
  // thớt nhiều đầu vào: đem thứ còn thiếu tới
  if (t.station === 'prep' || t.station === 'stovetop') {
    const b = t.station === 'prep'
      ? C.boards.find((x) => x && x.left === null && x.tf.output === t.output)
      : (C.stovetop && C.stovetop.left === null && C.stovetop.tf.output === t.output ? C.stovetop : null);
    const missing = t.inputs.filter((req, i) => !(b && b.have[i]));
    for (const req of missing) { const q = req.split('|')[0];
      const r = findReady(C, q); if (r) return { src: r, zone };
      const sm = soupMove(C, q); if (sm) return sm;
      const deeper = backtrack(C, rec, q, slotZone, depth + 1); if (deeper) return deeper; }
    return null;
  }
  const src = findReady(C, t.inputs[0]); if (src) return { src, zone };
  const sm = soupMove(C, t.inputs[0]); if (sm) return sm;
  return backtrack(C, rec, t.inputs[0], slotZone, depth + 1);
}
