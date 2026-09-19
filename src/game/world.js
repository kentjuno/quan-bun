// Trạng thái game thuần (không Three.js): bếp, đầu bếp, trạm, tô, khách, ca.
// Render (view.js) chỉ đọc state này và vẽ. Test được không cần trình duyệt.
import { CHEF, RULES, CUSTOMERS, KITCHEN, POT, SOUP } from '../config.js';
import { REGULARS, lineFor } from '../data/customers.js';
import { makeLevelArrivals } from './levels.js';
import { recipeFor, nextStep, label, D, soupRecipeFor, actionTime, tokenMatches } from './recipes.js';
import { NavGrid } from './nav.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class World {
  /** `mods`: thông số bếp sau nâng cấp (config.modsFor) — null = mặc định trong bố trí bếp. */
  constructor(shift, events = {}, kitchen = KITCHEN, mods = null) {
    // Bếp 3D (phần phụ, có đi lại) chậm hơn quầy POV nhiều → dùng số GỐC của level, không dùng số đã áp PACE (data/pace.js).
    if (shift?.base) shift = { ...shift, ...shift.base };
    this.shift = shift; this.ev = events; this.kitchen = kitchen; this.mods = mods;
    // ---- bậc thang level (docs/PLAN-WORLDS.md): cờ rút gọn + ràng buộc + sự kiện + mục tiêu ----
    const sim = shift.simplify || null; const con = shift.constraints || null;
    this.sim = sim; this.con = con;
    this.pot = { ...POT, bowlSlots: mods?.bowlSlots ?? POT.bowlSlots, noodleSlots: con?.potSlots ?? POT.noodleSlots };
    this.handCap = con?.handCapacity ?? CHEF.handCapacity;
    this.stackMax = con?.brothCap ?? SOUP.stackMax;
    this.noStack = !!con?.noStack;                  // lò xong KHÔNG tự đẩy sang kệ nước
    this.events = (shift.events || []).map((e) => ({ ...e, fired: false }));
    this.goal = shift.goal || null; this.streak = 0; this.bestStreak = 0; this.clearedAt = null;
    this.speed = CHEF.speed * (mods?.speedMult ?? 1);
    // khách quen ghé level này (src/data/customers.js)
    this.regulars = shift.regulars || [];
    if (shift.world && !shift.arrivals) this.shift = shift = { ...shift, arrivals: makeLevelArrivals(shift) };
    this.recipes = Object.fromEntries(shift.dishes.map((d) => [d, recipeFor(d, sim)]));
    // bản tập bỏ bước: lấy item nào trên kệ thì nhận thẳng token kết quả (vd "chả cá" → "chả cá đã cắt")
    this.shelfSubs = Object.assign({}, ...Object.values(this.recipes).map((r) => r.shelfSubs || {}));
    // trạm có `dishes` chỉ xuất hiện khi ca có món đó (bếp lớn dần theo ca)
    // kệ chỉ bày nguyên liệu các món trong ca (+ `alwaysShow` để có thứ gây nhiễu) → một kệ chung cho cả thịt lẫn rau như bếp thật
    const used = new Set(Object.values(this.recipes).flatMap((r) => r.shelfItems));
    this.stations = kitchen.stations.filter((s) => !s.dishes || s.dishes.some((d) => shift.dishes.includes(d))).filter((s) => !s.extra || (mods?.seats ?? 3) >= s.extra).map((s) => ({
      ...s, stand: standPoint(s, kitchen), jobs: [], burners: s.type === 'burner' ? (mods?.burners ?? s.burners ?? 2) : s.burners,
      items: s.type === 'shelf' ? s.items.filter((it) => used.has(it) || (s.alwaysShow || []).includes(it)) : s.items,
      slots: s.type === 'counter' ? Array.from({ length: s.slots ?? RULES.bowlSlots }, () => null) : s.type === 'burner' ? Array.from({ length: mods?.burners ?? s.burners ?? 2 }, () => null) : (s.type === 'prep' || s.type === 'stovetop') ? Array.from({ length: s.boards ?? 2 }, () => null) : [],
    }));
    // nước lèo phải nấu trên lò (bếp thật: phở có sẵn; riêu/bún bò lấy nồi cho cốt → huyết → nước rồi đun)
    this.soups = Object.fromEntries(shift.dishes.map((d) => [d, soupRecipeFor(d)]).filter(([, v]) => v));
    this.chef = { x: kitchen.chefStart.x, z: kitchen.chefStart.z, hand: [], queue: [], busy: 0, busyLabel: '', target: null, facing: 0 };
    for (const s of this.stations) if (s.type === 'burner') s.ready = [];   // kệ nước: các phần nước lèo đã đun xong (nhiều loại, stack)
    // bản tập `soupReady`: nước lèo (hoặc cháo) đã nấu sẵn, để sẵn trên kệ nước — level sau mới học nấu
    if (sim?.soupReady) { const b = this.stations.find((x) => x.type === 'burner'); if (b) for (const r of Object.values(this.soups)) for (let i = 0; i < (sim.soupReady === true ? 2 : sim.soupReady); i++) b.ready.push({ name: r.name, brothAction: r.brothAction, output: r.output, left: 0, total: 1, servings: SOUP.servings, items: r.items }); }
    this.customers = []; this.seats = this.stations.filter((s) => s.type === 'seat').map((s) => ({ station: s, customer: null }));
    this.time = 0; this.money = 0; this.tips = 0; this.served = 0; this.left = 0; this.mistakes = 0; this.state = 'running';
    this.prep = shift.prep ?? RULES.prepSeconds;
    // thống kê để tối ưu cách làm: từng tô (bắt đầu khi khách tới → giao), thời gian đứng nghĩ, số chạm, số chuyến
    this.stats = { bowls: [], idle: 0, taps: 0, trips: 0, tapTimes: [] };
    this.drillTotal = shift.drill ? (shift.drillCount ?? 5) : 0;   // giây chuẩn bị trước khi mở cửa: đồng hồ ca chưa chạy, khách chưa tới, được trụng tô/sợi sẵn
    this.arrivalIdx = 0; this.log = []; this.errors = [];
    this.stationById = Object.fromEntries(this.stations.map((s) => [s.id, s]));
    this.nav = new NavGrid(kitchen, this.stations, 0.25, 0.28);
    // chỗ đứng: điểm ưu tiên (standPoint) nếu trống & tới được, không thì ô kề trạm gần nhất tới được
    const reach = this.nav.reachableFrom(this.chef.x, this.chef.z);
    for (const s of this.stations) if (s.type !== 'seat') s.stand = this.nav.standFor({ x: s.x, z: s.z, w: s.w || 0.8, d: s.d || 0.8 }, s.stand, reach);
    this.chef.path = [];
  }

  // ---------- input ----------
  /**
   * Người chơi chạm một MỤC TIÊU. Dạng id:
   *   'shelf-topping:nam'  = một nguyên liệu cụ thể trên kệ (người chơi tự chọn — đây là phần luyện nhớ)
   *   'counter:0'          = một tô cụ thể trên quầy ráp
   *   'pot' | 'sink' | 'stove' | 'serve' | 'seat-0' = trạm
   * Thêm vào hàng đợi việc; chạm lại việc đang chờ = huỷ.
   */
  tap(targetId) {
    if (this.state !== 'running') return false;
    if (!this.resolve(targetId)) return false;
    const idx = this.chef.queue.indexOf(targetId);
    if (idx >= 0) { this.chef.queue.splice(idx, 1); return true; }
    if (this.chef.queue.length >= CHEF.queueMax) { this.toast('Hàng đợi đầy'); return false; }
    this.chef.queue.push(targetId); this.stats.taps++; this.stats.tapTimes.push(+this.time.toFixed(2)); return true;
  }
  /** targetId → { station, item?, slot? } hoặc null */
  resolve(targetId) {
    const [sid, arg] = String(targetId).split(':');
    const st = this.stationById[sid]; if (!st) return null;
    if (st.type === 'shelf') { if (!arg) return { station: st, item: null }; if (!st.items.includes(arg)) return null; return { station: st, item: arg }; }   // không có item = tới kệ rồi mở card chọn (chế độ card)
    if (st.type === 'counter') { const i = Number(arg); if (!Number.isInteger(i) || i < 0 || i >= st.slots.length) return null; return { station: st, slot: i }; }
    if (st.type === 'pot' && arg) { if (arg.startsWith('bowl')) return { station: st, slot: arg }; /* 'bowl' = chồng tô (tự chọn loại đang cần), 'bowl.soup-bowl' = đúng loại */ const i = Number(arg); if (!Number.isInteger(i) || i < 0 || i >= POT.noodleSlots) return null; return { station: st, slot: i }; }   // 'pot:0..2' = rọ sợi cụ thể, 'pot:bowl' = chồng tô nóng
    if (st.type === 'prep' || st.type === 'stovetop') { if (!arg) return { station: st }; const i = Number(arg); if (!Number.isInteger(i) || i < 0 || i >= st.slots.length) return null; return { station: st, slot: i }; }   // 'prep:0' = một thớt
    if (st.type === 'burner') { if (arg && arg.startsWith('ready')) return { station: st, slot: 'ready', want: arg.includes('.') ? arg.slice(6) : null }; const i = Number(arg); if (!Number.isInteger(i) || i < 0 || i >= st.slots.length) return null; return { station: st, slot: i }; }   // 'burner:0' = một bếp lò · 'burner:ready' / 'burner:ready.<token>' = kệ nước đã đun
    if (st.type === 'trash' && arg) { const i = Number(arg); if (!Number.isInteger(i) || i < 0 || i >= this.handCap) return null; return { station: st, slot: i }; }   // 'trash:0' = vứt riêng ô tay 0
    return { station: st };
  }
  /** Ghi lỗi với tag cụ thể (dùng cho phần Tiến độ sau này). */
  err(tag) { this.mistakes++; this.errors.push({ t: +this.time.toFixed(1), tag }); this.money = Math.max(0, this.money - RULES.wrongOrderPenalty); this.ev.onMistake?.(tag); }

  // ---------- update ----------
  update(dt) {
    if (this.state !== 'running') return;
    if (this.prep > 0) {   // giai đoạn chuẩn bị
      this.prep -= dt; this.updateStations(dt); this.updateChef(dt);
      if (this.prep <= 0) { this.prep = 0; this.ev.onOpen?.(); this.toast('Mở cửa!'); }
      return;
    }
    this.time += dt;
    this.fireEvents();
    this.spawnCustomers();
    this.updateStations(dt);
    this.updateChef(dt);
    this.updateCustomers(dt);
    // đứng nghĩ: không đi, không làm, không chờ card, mà vẫn có khách đang chờ
    const c = this.chef;
    if (!c.target && !c.queue.length && c.busy <= 0 && !c.waiting && this.customers.some((x) => x.state === 'waiting')) this.stats.idle += dt;
    if (this.drillTotal && this.served >= this.drillTotal) return this.finish();
    if (this.shift.survival && this.left >= this.shift.lives) return this.finish();
    if (this.time >= this.shift.seconds) this.finish();
  }

  spawnCustomers() {
    const arr = this.shift.arrivals;
    // chế độ luyện đơn lẻ: khách kế tới ngay khi không còn ai chờ, tối đa drillCount; món chọn theo trọng số (món yếu ra nhiều hơn)
    if (this.drillTotal) {
      if (this.arrivalIdx < this.drillTotal && !this.customers.some((x) => x.state === 'waiting') && this.seats.some((s) => !s.customer)) {
        const seat = this.seats.find((s) => !s.customer); const dish = this.pickDish();
        const c = { id: `c${this.arrivalIdx}`, type: 'drill', name: 'Đơn', dish, patience: 1e9, maxPatience: 1e9, tipMult: 1, seat, state: 'waiting', arrivedAt: this.time };
        seat.customer = c; this.customers.push(c); this.arrivalIdx++; this.ev.onCustomer?.(c, 'arrive');
      }
      return;
    }
    // survival: khách tới mãi; khoảng cách giảm dần theo số khách đã tới (startGap → minGap); hết ghế thì chờ ghế
    if (this.shift.survival) {
      const sh = this.shift; if (this.nextArrival == null) this.nextArrival = 1;
      if (this.time >= this.nextArrival && this.seats.some((s) => !s.customer)) {
        const seat = this.seats.find((s) => !s.customer); const types = Object.keys(CUSTOMERS); const tk = types[Math.floor(Math.random() * types.length)]; const type = CUSTOMERS[tk]; const dish = this.pickDish();
        const c = { id: `c${this.arrivalIdx}`, type: tk, name: type.name, dish, patience: sh.patience, maxPatience: sh.patience, tipMult: type.tipMult, seat, state: 'waiting', arrivedAt: this.time };
        seat.customer = c; this.customers.push(c); this.arrivalIdx++; this.ev.onCustomer?.(c, 'arrive'); this.speak(c, 'sit');
        this.nextArrival = this.time + Math.max(sh.minGap, sh.startGap - this.arrivalIdx * sh.gapDecay);
      }
      return;
    }
    while (this.arrivalIdx < arr.length && arr[this.arrivalIdx].t <= this.time) {
      const a = arr[this.arrivalIdx];
      const seat = this.seats.find((s) => !s.customer);
      if (!seat) break; // chờ ghế trống
      const reg = a.regular ? REGULARS.find((r) => r.id === a.regular) : null; const type = CUSTOMERS[reg?.type || a.type] || CUSTOMERS.office;
      const dish = reg ? reg.dish : (a.dish || this.pickDish());
      const pat = (a.patience ?? type.patience) * (reg?.patienceMult ?? 1) * (this.mods?.patienceMult ?? 1);
      const c = { id: `c${this.arrivalIdx}`, type: reg?.type || a.type, name: reg ? reg.name : type.name, regular: reg?.id || null, group: a.group || null, vip: !!a.vip, dish, patience: pat, maxPatience: pat, tipMult: (reg?.tipMult ?? type.tipMult) * (a.vip ? 3 : 1), seat, state: 'waiting', arrivedAt: this.time };
      seat.customer = c; this.customers.push(c); this.arrivalIdx++;
      this.speak(c, 'sit');
      const orphan = this.stations.find((x) => x.type === 'counter').slots.find((b) => b && !b.customer && b.recipe.id === dish);
      if (orphan) orphan.customer = c;
      this.ev.onCustomer?.(c, 'arrive');
    }
  }

  /** Chọn món cho khách: có `weights` (từ Tiến độ — món yếu nặng hơn) thì quay theo trọng số, không thì đều. */
  pickDish() {
    const ds = this.shift.dishes; const wts = ds.map((d) => this.shift.weights?.[d] ?? 1); const sum = wts.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum; for (let i = 0; i < ds.length; i++) { r -= wts[i]; if (r <= 0) return ds[i]; } return ds[ds.length - 1];
  }
  updateStations(dt) {
    for (const s of this.stations) if (s.type === 'prep' || s.type === 'stovetop') for (const b of s.slots) { if (b && b.left > 0) { b.left -= dt; if (b.left <= 0) { b.left = 0; this.ev.onJobDone?.(s, b); } } }
    for (const s of this.stations) if (s.type === 'burner') s.slots.forEach((b, i) => { if (b && b.left > 0) { b.left -= dt; if (b.left <= 0) { b.left = 0; this.ev.onJobDone?.(s, b); if (!this.noStack && s.ready.length < this.stackMax) { s.ready.push(b); s.slots[i] = null; this.toast(`${b.name} đã nóng — để sẵn trên kệ nước`); } else this.toast(this.noStack ? `${b.name} đã nóng — lấy ra khỏi lò đi` : `${b.name} đã nóng — kệ nước đầy, còn trên lò`); } } });
    for (const s of this.stations) for (const j of s.jobs) {
      if (j.left > 0) { j.left -= dt; if (j.left <= 0) { j.left = 0; this.ev.onJobDone?.(s, j); } continue; }
      // sợi chín nằm trong nồi lâu quá → hư (tô thì để bao lâu cũng được)
      if (s.type === 'pot' && j.kind === 'noodle' && /noodle/.test(j.action) && !j.taken && !j.spoiled) { /* chỉ sợi mới hư */ j.hold = (j.hold || 0) + dt; if (!this.sim?.noSpoil && j.hold >= POT.noodleSpoilAfter) { j.spoiled = true; j.output = 'noodle-spoiled'; this.errors.push({ t: +this.time.toFixed(1), tag: `Sợi hư trong nồi: ${label(j.input)}`, waste: true }); this.ev.onSpoil?.(s, j); this.toast(`${label(j.input)} để lâu bị hư — lấy ra vứt`); } }
    }
  }

  updateChef(dt) {
    const c = this.chef;
    if (c.waiting) return;   // đang đứng ở kệ chờ người chơi chọn trên card
    if (c.busy > 0) { c.busy -= dt; if (c.busy > 0) return; c.busy = 0; c.busyLabel = ''; const tg = this.resolve(c.target); c.target = null; if (tg) this.arrive(tg); return; }
    if (!c.target) {
      if (!c.queue.length) return; c.target = c.queue.shift();
      const tg0 = this.resolve(c.target); if (!tg0) { c.target = null; return; }   // mục tiêu không còn hợp lệ → bỏ, không kẹt
      const p = tg0.station.stand;
      c.path = this.nav.path(c.x, c.z, p.x, p.z); if (!c.path.length) c.path = [{ x: p.x, z: p.z }];
    }
    const tg = this.resolve(c.target); if (!tg) { c.target = null; c.path = []; return; } const s = tg.station; const p = s.stand;
    // đi theo từng điểm trên đường; điểm cuối là điểm đứng của trạm
    let remaining = this.speed * dt;
    while (remaining > 0 && c.path.length) {
      const wp = c.path[0]; const d = dist(c, wp);
      if (d <= remaining) { c.x = wp.x; c.z = wp.z; remaining -= d; c.path.shift(); }
      else { c.facing = Math.atan2(wp.x - c.x, wp.z - c.z); c.x += (wp.x - c.x) / d * remaining; c.z += (wp.z - c.z) / d * remaining; remaining = 0; }
    }
    if (!c.path.length && dist(c, p) < 0.05) { c.x = p.x; c.z = p.z; c.facing = Math.atan2(s.x - c.x, s.z - c.z); this.interact(tg); }
  }

  /** Tới trạm: quyết định làm gì. Việc "active" đặt busy rồi gọi arrive() khi xong. */
  interact(tg) {
    const c = this.chef; const s = tg.station; this.stats.trips++;
    switch (s.type) {
      case 'shelf': return this.takeFromShelf(s, tg.item);
      case 'pot': case 'sink': case 'stove': case 'microwave': case 'fryer': return this.useStation(s, tg.slot);
      // Mặt bếp gom nhiều thứ (xào lăn = thịt tái + rau cải) nên đi theo cơ chế của thớt, không phải trạm một việc.
      case 'prep': case 'stovetop': return this.usePrep(s, tg.slot);
      case 'counter': return this.useCounter(s, tg.slot);
      case 'serve': case 'seat': return this.serve(s);
      case 'trash': return this.useTrash(s, tg.slot);
      case 'burner': return this.useBurner(s, tg.slot, tg.want);
      default: c.target = null;
    }
  }
  arrive(tg) { /* gọi sau khi việc active xong */ const s = tg.station; if (s.type === 'pot' || s.type === 'sink') { this.collectJobs(s, s.activeJobs || []); s.activeJobs = null; } else if (s.type === 'microwave' || s.type === 'fryer') this.collectJobs(s, s.activeJobs || []); else if (s.type === 'stove') this.finishStove(s); else if (s.type === 'burner') this.finishBurner(s, tg.slot); else if (s.type === 'prep' || s.type === 'stovetop') this.finishPrep(s); }

  // ---------- kệ ----------
  /** Lấy ĐÚNG nguyên liệu người chơi chạm; lấy 2 cái giống nhau được (vd. 2 tô cho 2 khách). Tay đầy mà chạm thứ đang cầm = trả lại kệ; muốn bỏ 1 thứ thì dùng nút × ở ô tay. Không tự đoán. */
  takeFromShelf(s, item) {
    const c = this.chef; c.target = null;
    if (item === null) { c.waiting = s.id; this.ev.onShelfOpen?.(s); return; }   // chế độ card: đứng lại, UI mở card
    if (c.hand.length < this.handCap) { c.hand.push(this.shelfToken(item)); this.ev.onPick?.(item, s); return; }
    const held = c.hand.indexOf(item);
    if (held >= 0) { c.hand.splice(held, 1); this.ev.onReturn?.(item, s); return this.toast(`Trả lại: ${label(item)}`); }
    this.toast(this.handCap > 1 ? 'Tay đầy (2 thứ) — bấm × ở ô tay để vứt' : 'Một tay thôi — bấm × ở ô tay để vứt');
  }
  /** Chế độ card: chọn xong trên card → lấy các thứ đã chọn (trong giới hạn tay) rồi đi tiếp. items=[] = đóng card không lấy. */
  pickFromShelf(items) {
    const c = this.chef; const s = this.stationById[c.waiting]; if (!s) return false;
    for (const it of items) { if (!s.items.includes(it)) continue; if (c.hand.length >= this.handCap) { this.toast(this.handCap > 1 ? 'Tay đầy (2 thứ)' : 'Một tay thôi'); break; } c.hand.push(this.shelfToken(it)); this.ev.onPick?.(it, s); }
    c.waiting = null; return true;
  }
  /** Token nhận được khi lấy một item trên kệ (bản tập có thể phát thẳng token đã chế biến). */
  shelfToken(item) { return this.shelfSubs?.[item] || item; }
  /** Item trên kệ tạo ra token này (qua chuỗi transforms) */
  sourceItem(r, tok) {
    if (D.items[tok]) return tok;
    const fromShelf = (t) => Object.keys(r.shelfSubs || {}).find((k) => tokenMatches(t, r.shelfSubs[k]));   // bản tập: token này lấy thẳng trên kệ
    let cur = tok;
    if (fromShelf(cur)) return fromShelf(cur);
    for (let g = 0; g < 6; g++) { const t = r.transforms.find((x) => tokenMatches(cur, x.output)); if (!t) break; cur = t.inputs[0].split('|')[0]; if (D.items[cur]) return cur; if (fromShelf(cur)) return fromShelf(cur); }
    return null;
  }

  // ---------- nồi / bồn / bếp ----------
  /** Loại chỗ trong trạm cho một việc: nồi chia 'noodle' (3 rọ) / 'bowl' (5 tô); trạm khác 1 chỗ. */
  jobKind(s, t) { return s.type === 'pot' ? (t.action === 'blanch-bowl' ? 'bowl' : 'noodle') : 'any'; }   // rọ dùng chung cho sợi và topping (bò viên)
  capacityFor(s, kind) { return s.type === 'pot' ? (kind === 'bowl' ? this.pot.bowlSlots : this.pot.noodleSlots) : 1; }
  /** Ô trống cho việc mới (sợi: 0..2 để vẽ/chạm từng rọ; tô: xếp chồng). */
  freeSlot(s, kind) { const used = new Set(s.jobs.filter((j) => j.kind === kind).map((j) => j.slot)); for (let i = 0; i < this.capacityFor(s, kind); i++) if (!used.has(i)) return i; return -1; }
  useStation(s, slot) {
    const c = this.chef;
    if (s.type === 'stove') return this.useStove(s);
    // 1) thả TẤT CẢ thứ áp dụng được — thứ chạy nền trước, rồi thứ đứng làm
    const applicable = c.hand.filter((tok) => typeof tok === 'string' && this.transformAt(s.type, tok)).map((tok) => ({ tok, t: this.transformAt(s.type, tok) })).sort((a, b) => (b.t.passive ? 1 : 0) - (a.t.passive ? 1 : 0));
    let busy = 0; const started = []; let full = false;
    for (const { tok, t } of applicable) {
      const kind = this.jobKind(s, t); const sl = this.freeSlot(s, kind);
      if (sl < 0) { full = true; continue; }
      c.hand.splice(c.hand.indexOf(tok), 1);
      const job = { input: tok, output: t.output, action: t.action, left: t.time, total: t.time, passive: t.passive, taken: false, kind, slot: sl, hold: 0 };
      s.jobs.push(job); started.push(job); this.ev.onJobStart?.(s, job);
      if (!t.passive) busy += t.time;
    }
    if (started.length) this.toast(started.map((j) => `${D.actions[j.action]?.name || j.action}: ${label(j.input)}`).join(' · ') + (full ? ` · ${s.label} đầy` : ''));
    else if (full) this.toast(`${s.label} đầy`);
    if (busy > 0) { c.busy = busy; c.busyLabel = started.filter((j) => !j.passive).map((j) => D.actions[j.action]?.name).join(' + '); s.activeJobs = started.filter((j) => !j.passive); return; } // arrive() → lấy đúng kết quả việc đứng làm
    c.target = null;
    if (started.length) return;   // đã thả đồ vào → không tự lấy gì ra (muốn lấy thì chạm lại đúng rọ/chồng tô)
    // 2) không thả gì → lấy đồ đã xong (chạm đúng rọ/chồng tô thì chỉ lấy cái đó; chạm thân nồi lấy 1 thứ)
    const took = this.collectDone(s, slot);
    if (took) return;
    // 3) không thả, không lấy → giải thích
    if (slot !== undefined) { const isBowl = typeof slot === 'string'; const j = s.jobs.find((x) => (isBowl ? x.kind === 'bowl' : x.kind === 'noodle' && x.slot === slot) && !x.taken); if (!j) return this.toast(isBowl ? 'Chưa có tô nào trong nồi' : 'Rọ trống'); if (j.left > 0) return this.toast(`${D.actions[j.action]?.name}: còn ${j.left.toFixed(0)} s`); if (c.hand.length >= this.handCap) return this.toast('Tay đầy — không lấy được'); }
    if (c.hand.includes('noodle-spoiled')) return this.toast('Sợi hư — đem vứt thùng rác');
    if (c.hand.some((t) => typeof t === 'string' && (t.startsWith('broth:') || /-broth-ready$/.test(t)))) return this.toast('Nước lèo đem ra quầy ráp');
    const wrong = c.hand.find((tok) => typeof tok === 'string' && Object.values(this.recipes).some((r) => r.transforms.some((x) => x.inputs.some((req) => tokenMatches(req, tok)))));
    if (wrong) { const t = Object.values(this.recipes).flatMap((r) => r.transforms).find((x) => x.inputs.some((req) => tokenMatches(req, wrong))); const st = this.stations.find((x) => x.type === t.station); this.err(`Sai trạm: ${label(wrong)} phải đem tới ${st?.label || t.station}`); return; }
    const pending = s.jobs.find((j) => j.left > 0);
    if (pending && c.hand.length >= this.handCap) return this.toast('Tay đầy — không lấy được');
    if (pending) return this.toast(`${D.actions[pending.action]?.name}: còn ${pending.left.toFixed(0)} s`);
    this.toast(c.hand.length ? `${s.label}: không làm gì với thứ đang cầm` : 'Tay trống');
  }
  /** Lấy thứ đã xong trong trạm khi tay còn chỗ. slot: 0..2 = đúng rọ sợi đó, 'bowl' = 1 tô nóng, undefined = mọi thứ xong (sợi trước, sợi hư sau cùng). Trả về số thứ lấy được. */
  collectDone(s, slot) {
    let list = [...s.jobs].filter((j) => j.left <= 0 && !j.taken);
    if (typeof slot === 'string' && slot.startsWith('bowl')) {
      let bowls = list.filter((j) => j.kind === 'bowl');
      const want = slot.includes('.') ? slot.slice(5) : this.wantedBowl();
      if (want && bowls.some((j) => j.input === want)) bowls = bowls.filter((j) => j.input === want);
      list = bowls.slice(0, 1);
    }
    else if (slot !== undefined) list = list.filter((j) => j.kind === 'noodle' && j.slot === slot);
    else { list.sort((a, b) => (a.spoiled ? 1 : 0) - (b.spoiled ? 1 : 0) || (a.kind === 'bowl' ? 1 : 0) - (b.kind === 'bowl' ? 1 : 0)); if (s.type === 'pot') list = list.slice(0, 1); }   // chạm thân nồi = lấy 1 thứ (sợi ngon trước), không vét hết
    return this.collectJobs(s, list);
  }
  /** Loại tô mà khách đang chờ (chưa có tô trên quầy) cần — để chạm chồng tô lấy đúng loại. */
  wantedBowl() {
    const cu = this.customers.filter((x) => x.state === 'waiting' && !this.bowlFor(x)).sort((a, b) => a.patience - b.patience)[0];
    return cu ? this.recipes[cu.dish].bowl : null;
  }
  /** Lấy đúng các việc đã xong trong danh sách (tay còn chỗ). */
  collectJobs(s, list) {
    const c = this.chef; let n = 0;
    for (const j of list) {
      if (j.left > 0 || j.taken || !s.jobs.includes(j)) continue;
      if (c.hand.length >= this.handCap) { this.toast('Tay đầy — còn đồ trong ' + s.label); break; }
      if (j.spoiled) this.wasted = (this.wasted || 0) + 1;
      j.taken = true; s.jobs.splice(s.jobs.indexOf(j), 1); c.hand.push(j.output); this.ev.onPick?.(j.output, s); n++;
    }
    return n;
  }
  transformAt(stationType, tok) {
    // cùng một nguyên liệu có thể đi 2 đường (bún: nóng→lạnh→nóng cho V4/V5/V6, trụng 1 lần cho bánh hỏi) → ưu tiên món khách đang chờ / tô đang ráp
    const need = new Set(this.customers.filter((c) => c.state === 'waiting').map((c) => c.dish).concat((this.stations.find((x) => x.type === 'counter')?.slots || []).filter(Boolean).map((b) => b.recipe.id)));
    const ids = Object.keys(this.recipes).sort((a, b) => (need.has(b) ? 1 : 0) - (need.has(a) ? 1 : 0));
    for (const id of ids) { const t = this.recipes[id].transforms.find((x) => x.station === stationType && x.inputs.length === 1 && tokenMatches(x.inputs[0], tok)); if (t) return t; }
    return null;
  }
  /** Mọi phép biến đổi (đã gộp trùng theo output) tại trạm kiểu `stationType` của các món trong ca. */
  transformsAt(stationType) {
    const seen = new Map();
    for (const r of Object.values(this.recipes)) for (const t of r.transforms) if (t.station === stationType && !seen.has(t.output)) seen.set(t.output, t);
    return [...seen.values()];
  }

  // ---------- thớt / bàn soạn (prep): gom đủ nguyên liệu vào một thớt rồi làm ----------
  /** Thớt nào đang chứa một phần nguyên liệu của phép biến đổi `t`? */
  prepSlotFor(s, t) { return s.slots.findIndex((b) => b && b.tf === t && b.left === null); }
  usePrep(s, slot) {
    const c = this.chef; const tfs = this.transformsAt(s.type);   // dùng lại cho mặt bếp (s.type === 'stovetop')
    // 1) thả từng thứ trên tay vào thớt đang cần nó (ưu tiên thớt đã có một phần), hoặc thớt trống được chỉ định / trống bất kỳ
    const dropped = []; let busy = 0; const startedActive = [];
    for (const tok of [...c.hand]) {
      if (typeof tok !== 'string') continue;
      const want = (b) => b.tf.inputs.find((req, i) => !b.have[i] && tokenMatches(req, tok)) !== undefined;
      let bi = s.slots.findIndex((b) => b && b.left === null && want(b));
      if (bi < 0) {
        const t = tfs.find((x) => x.inputs.some((req) => tokenMatches(req, tok))); if (!t) continue;
        bi = slot !== undefined && !s.slots[slot] ? slot : s.slots.findIndex((b) => !b);
        if (bi < 0) { this.toast(`${s.label} đầy`); break; }
        s.slots[bi] = { tf: t, have: t.inputs.map(() => null), left: null, total: null, output: t.output, name: D.actions[t.action]?.name || t.action };
      }
      const b = s.slots[bi]; const i = b.tf.inputs.findIndex((req, k) => !b.have[k] && tokenMatches(req, tok)); b.have[i] = tok;
      c.hand.splice(c.hand.indexOf(tok), 1); dropped.push(tok);
      if (b.have.every(Boolean)) { b.left = b.tf.time; b.total = b.tf.time; if (!b.tf.passive) { busy += b.tf.time; startedActive.push(b); } this.ev.onJobStart?.(s, b); }
    }
    if (dropped.length) this.toast(dropped.map(label).join(' + ') + ' → ' + s.label);
    if (busy > 0) { c.busy = busy; c.busyLabel = startedActive.map((b) => b.name).join(' + '); s.activeSlots = startedActive; return; }   // arrive() → finishPrep
    c.target = null;
    if (dropped.length) return;
    // 2) không thả gì → lấy kết quả đã xong (thớt chỉ định hoặc bất kỳ)
    const cand = slot !== undefined ? [s.slots[slot]] : s.slots;
    const done = cand.find((b) => b && b.left === 0);
    if (done) { if (c.hand.length >= this.handCap) return this.toast('Tay đầy — không lấy được'); this.takePrep(s, done); return; }
    const partial = cand.find((b) => b && b.left === null);
    if (partial) return this.toast(`${partial.name}: còn thiếu ${partial.tf.inputs.filter((_, i) => !partial.have[i]).map(label).join(', ')}`);
    const cooking = cand.find((b) => b && b.left > 0); if (cooking) return this.toast(`${cooking.name}: còn ${cooking.left.toFixed(0)} s`);
    this.toast(c.hand.length ? `${s.label}: không làm gì với thứ đang cầm` : `${s.label} trống`);
  }
  takePrep(s, b) { const i = s.slots.indexOf(b); s.slots[i] = null; this.chef.hand.push(b.output); this.ev.onPick?.(b.output, s); }
  finishPrep(s) { for (const b of s.activeSlots || []) if (s.slots.includes(b) && b.left === 0) { if (this.chef.hand.length >= this.handCap) { this.toast('Tay đầy — còn đồ trên ' + s.label); break; } this.takePrep(s, b); } s.activeSlots = null; }
  useStove(s) {
    const c = this.chef; const tok = `broth:${s.broth}`;
    if (c.hand.includes(tok)) { c.target = null; return this.toast(`Đang cầm ${label(tok).toLowerCase()} rồi`); }
    if (c.hand.length >= this.handCap) { c.target = null; return this.toast('Tay đầy'); }
    c.busy = 0.6; c.busyLabel = `Múc ${label(tok).toLowerCase()}`; // arrive() → finishStove
  }
  finishStove(s) { const tok = `broth:${s.broth}`; this.chef.hand.push(tok); this.ev.onPick?.(tok, s); }

  // ---------- lò đun nước lèo ----------
  /** Bếp lò trống → đứng lại, UI mở card chọn nguyên liệu nước lèo (đúng thứ tự). Đang đun → báo còn bao lâu. Đã nóng → múc 1 phần. */
  useBurner(s, slot, want = null) {
    const c = this.chef;
    if (slot === 'ready') {   // kệ nước: lấy MỘT phần — đúng loại đang cần (tô đang ráp / khách chờ), hoặc loại chỉ định
      const pick = this.wantedBroth(s, want); c.target = null;
      if (pick < 0) return this.toast(s.ready.length ? 'Kệ nước không có loại đang cần' : 'Kệ nước trống — đun ở lò trước');
      if (c.hand.length >= this.handCap) return this.toast('Tay đầy');
      s.readyPick = pick; c.target = `${s.id}:ready`; c.busy = 0.6; c.busyLabel = `Lấy ${s.ready[pick].name.toLowerCase()}`;   // arrive() → finishBurner
      return;
    }
    const b = s.slots[slot];
    if (!b && this.sim?.soupReady) { c.target = null; return this.toast('Hôm nay nước đã nấu sẵn — lấy ở kệ nước'); }   // bản tập: chưa học nấu
    if (!b) { c.target = null; c.waiting = `${s.id}:${slot}`; this.ev.onBurnerOpen?.(s, slot); return; }
    if (b.left > 0) { c.target = null; return this.toast(`${b.name}: còn ${b.left.toFixed(0)} s`); }
    // đã nóng mà còn trên lò (kệ nước đầy) → cầm luôn
    if (c.hand.length >= this.handCap) { c.target = null; return this.toast('Tay đầy'); }
    c.busy = 0.6; c.busyLabel = `Múc ${b.name.toLowerCase()}`;   // arrive() → finishBurner
  }
  finishBurner(s, slot) {
    if (slot === 'ready') { const b = s.ready[s.readyPick]; if (!b) return; s.ready.splice(s.readyPick, 1); this.chef.hand.push(b.output); this.ev.onPick?.(b.output, s); return; }
    const b = s.slots[slot]; if (!b || b.left > 0) return;
    this.chef.hand.push(b.output); this.ev.onPick?.(b.output, s); s.slots[slot] = null;
  }
  /** Chỉ số phần nước trên kệ nên lấy: `want` (token) → đúng loại; không thì loại mà tô đang ráp/khách chờ cần; không có thì phần trên cùng. -1 = không có. */
  wantedBroth(s, want = null) {
    if (!s.ready.length) return -1;
    if (want) return s.ready.findIndex((b) => b.output === want);
    const need = [];
    for (const h of this.chef.hand) if (typeof h === 'object' && !h.done) need.push(h.recipe.assembly[h.placed.length]);
    for (const b of this.stations.find((x) => x.type === 'counter').slots) if (b && !b.done) need.push(b.recipe.assembly[b.placed.length]);
    for (const cu of this.customers) if (cu.state === 'waiting') for (const t of this.recipes[cu.dish].assembly) need.push(t);
    for (const t of need) { const i = s.ready.findIndex((b) => b.output === t); if (i >= 0) return i; }
    return s.ready.length - 1;
  }
  /** Danh sách nguyên liệu nước lèo có thể chọn trên card (mọi món trong ca + gây nhiễu). */
  soupIngredients() { const set = new Set(Object.values(this.soups).flatMap((r) => r.items)); for (const d of SOUP.distractors) set.add(d); return [...set]; }
  /** Chọn xong trên card: items theo THỨ TỰ người chơi bấm. Khớp công thức nào → bắt đầu đun. Sai → lỗi có tag, không đun. items=[] = đóng. */
  cookSoup(items) {
    const c = this.chef; if (!c.waiting || !c.waiting.startsWith('burner')) return false;
    const [sid, si] = c.waiting.split(':'); const s = this.stationById[sid]; const slot = Number(si);
    if (!items.length) { c.waiting = null; return true; }
    const match = Object.values(this.soups).find((r) => r.items.length === items.length && r.items.every((it, i) => it === items[i]));
    if (!match) {   // sai → tính lỗi nhưng VẪN đứng ở lò, card mở lại để chọn lại (không đóng card rồi đứng im)
      const sameSet = Object.values(this.soups).find((r) => r.items.length === items.length && [...r.items].sort().join() === [...items].sort().join());
      this.err(sameSet ? `Nước lèo sai thứ tự: ${sameSet.name} phải ${sameSet.items.map(label).join(' → ')}` : `Không có nước lèo nào nấu từ ${items.map(label).join(' + ')}`);
      return false;
    }
    c.waiting = null;
    s.slots[slot] = { name: match.name, brothAction: match.brothAction, output: match.output, left: actionTime(match.heatAction) * (this.mods?.heatMult ?? 1), total: actionTime(match.heatAction) * (this.mods?.heatMult ?? 1), servings: SOUP.servings, items: match.items };
    this.ev.onJobStart?.(s, s.slots[slot]); this.toast(`${match.name}: đang đun (${match.items.map(label).join(' → ')})`);
    return true;
  }

  // ---------- quầy ráp ----------
  bowlFor(cu) { const s = this.stations.find((x) => x.type === 'counter'); return s.slots.find((b) => b && b.customer === cu) || null; }
  useCounter(s, slot) {
    const c = this.chef; c.target = null;
    let bowl = s.slots[slot];
    // a) tô xong → cầm lên
    if (bowl && bowl.done) {
      if (c.hand.length >= this.handCap) return this.toast('Tay đầy, không cầm tô được');
      s.slots[slot] = null; c.hand.push(bowl); this.ev.onPick?.('bowl', s); return;
    }
    const items = c.hand.filter((t) => typeof t === 'string');
    if (!items.length) return this.toast(bowl ? this.hintFor(bowl) : 'Tay trống — cần tô/mẹt để bắt đầu');
    // b) tô trống: chỉ mở bằng tô đã trụng
    if (!bowl) {
      const cu = this.customers.filter((x) => x.state === 'waiting' && !this.bowlFor(x)).sort((a, b) => a.patience - b.patience)[0];
      if (!cu) return this.toast('Chưa có khách nào cần tô mới');
      const rec = this.recipes[cu.dish]; const opener = rec.opener;   // tô nóng đúng loại / mẹt đã lót / tô bún khô / tô cháo đã múc…
      if (!c.hand.includes(opener)) {
        const wrong = items.find((t) => rec.assembly.includes(t));
        const otherBowl = items.find((t) => t.startsWith('bowl-hot:'));
        if (otherBowl && opener.startsWith('bowl-hot:')) this.err(`Sai tô: ${rec.name} dùng ${label(rec.bowl)}, không phải ${label(otherBowl.slice(9))}`);
        else if (wrong) this.err(`Ráp sớm: ${label(wrong)} (chưa có ${label(opener).toLowerCase()})`); else this.toast(`Cần ${label(opener).toLowerCase()} trước`);
        return;
      }
      bowl = s.slots[slot] = { recipe: this.recipes[cu.dish], customer: cu, placed: [], done: false };
    }
    // c) bỏ vào theo đúng thứ tự công thức; thứ thuộc công thức nhưng chưa tới lượt = lỗi "ráp sớm"
    let placed = 0;
    for (let guard = 0; guard < 16 && !bowl.done; guard++) {
      const need = nextStep(bowl.recipe, bowl.placed);
      if (!need || !c.hand.includes(need)) break;
      c.hand.splice(c.hand.indexOf(need), 1); bowl.placed.push(need); placed++;
      this.ev.onPlace?.(bowl, need, s, slot);
      if (bowl.placed.length === bowl.recipe.assembly.length) { bowl.done = true; this.ev.onBowlDone?.(bowl); }
    }
    const early = c.hand.filter((t) => typeof t === 'string' && bowl.recipe.assembly.includes(t) && !bowl.placed.includes(t));
    const foreign = c.hand.filter((t) => typeof t === 'string' && !bowl.recipe.assembly.includes(t) && (D.items[t] || t.startsWith('broth:') || /-ready$/.test(t)));
    if (c.hand.includes('noodle-spoiled') && !placed) return this.err('Sợi hư không được cho vào tô — đem vứt');
    // chỉ tính lỗi khi KHÔNG bỏ được gì (cầm sẵn đồ cho bước sau trong lúc bỏ bước này là bình thường)
    if (early.length && !placed) this.err(`Ráp sớm: ${label(early[0])} — tiếp theo phải là ${label(nextStep(bowl.recipe, bowl.placed))}`);
    else if (foreign.length && !placed) this.err(`Không có trong ${bowl.recipe.name}: ${label(foreign[0])}`);
    else if (placed && !bowl.done) this.toast(this.hintFor(bowl));
    if (placed && c.busy === 0) { c.busy = 0.35 * placed; c.busyLabel = 'Ráp'; c.target = `${s.id}:${slot}`; }
  }
  hintFor(bowl) { return `Tiếp theo: ${label(nextStep(bowl.recipe, bowl.placed))}`; }

  // ---------- thùng rác ----------
  /** Vứt thứ trên tay (kể cả tô dở): slot = ô tay cụ thể (từ nút × trên HUD), không có slot = vứt hết. Không tính là lỗi thứ tự, nhưng ghi lại để xem lãng phí. */
  useTrash(s, slot) {
    const c = this.chef; c.target = null;
    if (!c.hand.length) return this.toast('Tay trống');
    const drop = slot === undefined ? [...c.hand] : (c.hand[slot] !== undefined ? [c.hand[slot]] : []);
    if (!drop.length) return this.toast('Ô tay đó trống rồi');
    const names = drop.map((h) => (typeof h === 'object' ? `tô ${h.recipe.name} (${h.placed.length} lớp)` : label(h)));
    this.wasted = (this.wasted || 0) + drop.length;
    this.errors.push({ t: +this.time.toFixed(1), tag: `Vứt: ${names.join(', ')}`, waste: true });
    for (const h of drop) c.hand.splice(c.hand.indexOf(h), 1);
    this.ev.onTrash?.(names); this.toast(`Đã vứt: ${names.join(', ')}`);
  }

  // ---------- giao món ----------
  serve(s) {
    const c = this.chef; c.target = null;
    const bowl = c.hand.find((t) => typeof t === 'object' && t.done);
    if (!bowl) return this.toast('Chưa có tô nào xong');
    let cu = bowl.customer && bowl.customer.state === 'waiting' ? bowl.customer : null;
    if (!cu) cu = this.customers.filter((x) => x.state === 'waiting' && x.dish === bowl.recipe.id && !this.bowlFor(x)).sort((a, b) => a.patience - b.patience)[0];
    if (!cu) return this.toast(`Chưa có khách nào gọi ${bowl.recipe.name}`);
    c.hand.splice(c.hand.indexOf(bowl), 1);
    const frac = cu.patience / cu.maxPatience;
    const tipRate = frac > 0.75 ? RULES.tipFast : frac > 0.5 ? RULES.tipOnTime : 0;
    const price = bowl.recipe.price; const tip = Math.round(price * tipRate * cu.tipMult);
    this.money += price + tip; this.tips += tip; this.served++;
    const since = this.stats.bowls.length ? this.stats.bowls[this.stats.bowls.length - 1].servedAt : 0;
    const mistakes = this.errors.filter((e) => !e.waste && e.t > since).length;   // lỗi thứ tự kể từ tô trước
    this.stats.bowls.push({ dish: bowl.recipe.id, name: bowl.recipe.name, arrivedAt: +(cu.arrivedAt ?? 0).toFixed(1), servedAt: +this.time.toFixed(1), wait: +(this.time - (cu.arrivedAt ?? 0)).toFixed(1), mistakes, taps: this.stats.tapTimes.filter((t) => t > since).length });
    // chuỗi tô đúng liên tiếp (mục tiêu `streak`) + mốc phục vụ hết khách (mục tiêu `before`)
    if (mistakes) this.streak = 0; else { this.streak++; if (this.streak > this.bestStreak) this.bestStreak = this.streak; }
    if (!this.customers.some((x) => x.state === 'waiting' && x !== cu) && this.arrivalIdx >= (this.shift.arrivals?.length || 0)) this.clearedAt = this.time;
    cu.state = 'served'; cu.servedAt = this.time; this.ev.onServe?.(cu, price, tip); this.speak(cu, 'good'); if (!cu.linger) cu.seat.customer = null;   // có thoại → ngồi thêm ~2.6 s rồi mới trả ghế
  }

  updateCustomers(dt) {
    for (const cu of this.customers) {
      if (cu.state === 'served' && cu.seat.customer === cu && this.time - cu.servedAt >= (cu.linger || 0)) cu.seat.customer = null;
      if (cu.state !== 'waiting') continue;
      cu.patience -= dt;
      if (!cu.saidWait && cu.patience < cu.maxPatience * 0.45 && cu.maxPatience < 1e8) { cu.saidWait = true; this.speak(cu, 'wait'); }
      if (cu.patience <= 0) {
        cu.state = 'left'; cu.seat.customer = null; this.left++;
        // tô đang làm cho khách này KHÔNG bị dọn — như bếp thật, tô vẫn ở đó và sẽ giao cho khách sau gọi cùng món
        for (const b of this.stations.find((x) => x.type === 'counter').slots) if (b && b.customer === cu) b.customer = null;
        this.ev.onCustomer?.(cu, 'leave');
      }
    }
  }

  finish() {
    this.state = 'over';
    const t = this.shift.moneyTargets; let stars = 0;
    for (let i = 0; i < 3; i++) if (this.money >= t[i] && this.left <= RULES.leaveLimitFor[i]) stars = i + 1;
    stars = this.starsForGoal(stars);
    const regulars = this.customers.filter((c) => c.regular).map((c) => ({ id: c.regular, name: c.name, served: c.state === 'served' }));
    this.result = { money: this.money, tips: this.tips, served: this.served, left: this.left, mistakes: this.mistakes, wasted: this.wasted || 0, errors: this.errors, stars, regulars,
      level: this.shift.world ? this.shift.id : null, goal: this.goal, bestStreak: this.bestStreak, clearedAt: this.clearedAt, stats: { ...this.stats, idle: +this.stats.idle.toFixed(1), time: +this.time.toFixed(1) } };
    this.ev.onFinish?.(this.result);
  }
  /**
   * Mục tiêu riêng của level (docs/PLAN-WORLDS.md §2b·4). Không có `goal` → theo tiền + khách bỏ đi như cũ.
   *  clean n   : n tô KHÔNG lỗi thứ tự · no-waste: không vứt/hư · streak n: chuỗi tô đúng liên tiếp · before s: xong hết khách trước giây s
   */
  starsForGoal(moneyStars) {
    const g = this.goal; if (!g) return moneyStars;
    const clean = this.stats.bowls.filter((b) => !b.mistakes).length;
    const waste = this.errors.filter((e) => e.waste).length;
    const st = (ok3, ok2, ok1) => (ok3 ? 3 : ok2 ? 2 : ok1 ? 1 : 0);
    if (g.kind === 'clean') { const n = g.bowls; return st(clean >= n, clean >= Math.ceil(n * 0.75), clean >= Math.ceil(n * 0.5)); }
    if (g.kind === 'no-waste') return Math.min(Math.max(moneyStars, 1), st(waste === 0, waste <= 1, waste <= 2));
    if (g.kind === 'streak') { const n = g.n; return st(this.bestStreak >= n, this.bestStreak >= n - 1, this.bestStreak >= Math.max(1, n - 2)); }
    if (g.kind === 'before') { const c = this.clearedAt; if (c == null || this.left) return st(false, false, this.served > 0 && !this.left); return st(c <= g.seconds, c <= g.seconds * 1.15, true); }
    return moneyStars;
  }
  /** Sự kiện giữa level: đoàn khách · khách sộp · mưa · khách đổi ý. */
  fireEvents() {
    const f = this.time / this.shift.seconds;
    for (const e of this.events) {
      if (e.fired || f < (e.at ?? 0.5)) continue;
      if (e.kind === 'change-order' && !(this.shift.dishes.length > 1 && this.customers.some((x) => x.state === 'waiting' && !x.regular))) continue;   // chờ có khách để đổi
      e.fired = true;
      if (e.kind === 'tour') { const t0 = this.time; for (let k = 0; k < (e.n || 4); k++) this.shift.arrivals.push({ t: t0 + k, type: 'tourist', patience: Math.round((this.shift.patience || 150) * 1.2), group: 'tour' }); this.sortPending(); this.ev.onEvent?.('tour', 'Đoàn khách tới!', `${e.n || 4} người vô một lượt`); }
      else if (e.kind === 'vip') { const a = this.shift.arrivals[this.arrivalIdx]; if (a) { a.vip = true; a.patience = 60; } else { const cu = this.customers.find((x) => x.state === 'waiting'); if (cu) { cu.vip = true; cu.tipMult *= 3; } } this.ev.onEvent?.('vip', 'Khách sộp!', 'Tip gấp ba nhưng chờ được ít'); }
      else if (e.kind === 'rain') { const cut = this.time + 40; const tail = this.shift.arrivals.slice(this.arrivalIdx); let k = 0; for (const a of tail) if (a.t < cut) { a.t = cut + (k++) * 2; a.patience = Math.round(a.patience * 1.1); } this.sortPending(); this.ev.onEvent?.('rain', 'Mưa rồi', 'Quán vắng một lúc — tranh thủ chuẩn bị'); }
      else if (e.kind === 'change-order') {
        const cu = this.shift.dishes.length > 1 ? this.customers.find((x) => x.state === 'waiting' && !x.regular) : null;
        if (cu) { const other = this.shift.dishes.filter((d) => d !== cu.dish); const nd = other[Math.floor(this.time) % other.length];
          const b = this.bowlFor(cu); if (b) b.customer = null;
          cu.dish = nd; cu.changed = true; this.ev.onChangeOrder?.(cu); this.ev.onEvent?.('change-order', 'Khách đổi ý', `${cu.name} đổi sang ${this.recipes[nd]?.name || label(nd)}`); this.speak(cu, 'sit'); }
      }
    }
  }
  /** Sắp xếp lại các arrival chưa tới (sau khi sự kiện dời giờ). */
  sortPending() { const head = this.shift.arrivals.slice(0, this.arrivalIdx); const tail = this.shift.arrivals.slice(this.arrivalIdx).sort((a, b) => a.t - b.t); this.shift.arrivals = [...head, ...tail]; }
  toast(msg) { this.ev.onToast?.(msg); this.log.push(msg); }
  /** Khách nói một câu (khách quen: thoại riêng; khách lạ: thoại chung). Chỉ chế độ có khách thật (không drill/par). */
  speak(cu, kind) { if (cu.type === 'drill' || cu.maxPatience >= 1e8 || !this.ev.onSpeak) return; const t = lineFor(cu, kind); if (!t) return; if (kind === 'good') cu.linger = 2.6; this.ev.onSpeak(cu, kind, t); }
}

/** Điểm đứng trước trạm: phía +z (về phía khách) cho hàng trên, phía -z cho hàng dưới. */
function standPoint(s, kitchen) {
  const edge = kitchen.size.w / 2 - 1.2;
  const gap = 0.55;                                                     // khoảng cách từ mép trạm tới chỗ đứng (> vùng nở 0.28 của lưới đi)
  if (s.type === 'seat') return { x: s.x, z: s.z - 1.0 };
  if (s.type === 'serve') return { x: s.x, z: s.z - (s.d || 0.8) / 2 - gap };
  if (s.type === 'counter') return { x: s.x, z: s.z - (s.d || 1) / 2 - gap };
  if (s.type === 'trash') return { x: s.x, z: s.z + (s.d || 0.7) / 2 + gap };
  if (s.x > edge) return { x: s.x - (s.w || 1) / 2 - gap, z: s.z };     // kệ bên phải: đứng bên trái kệ
  if (s.x < -edge) return { x: s.x + (s.w || 1) / 2 + gap, z: s.z };    // kệ bên trái
  return { x: s.x, z: s.z + (s.d || 1) / 2 + gap };                     // hàng trên (nồi, bồn, bếp)
}
