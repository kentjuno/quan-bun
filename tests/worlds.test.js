import { describe, it, expect } from 'vitest';
import { WORLDS, ALL_LEVELS, KITCHEN_VARIANTS, kitchenFor, modsFor, UPGRADES, PRICES, levelById, nextLevel } from '../src/config.js';
import { makeLevelArrivals } from '../src/game/levels.js';
import { World } from '../src/game/world.js';
import { NavGrid } from '../src/game/nav.js';
import { botDecide } from '../src/game/bot.js';
import { recipeFor, D } from '../src/game/recipes.js';
import { REGULARS } from '../src/data/customers.js';

const run = (w, secs, bot = true) => { for (let i = 0; i < secs * 30 && w.state === 'running'; i++) { if (bot) { const t = botDecide(w); if (t) w.tap(t); } w.update(1 / 30); } };

describe('bậc thang world/level', () => {
  it('8 world; độ dài đúng; id duy nhất; mọi món có trong sim-data', () => {
    expect(WORLDS.map((w) => w.levels.length)).toEqual([25, 12, 12, 16, 20, 16, 16, 12]);
    expect(new Set(ALL_LEVELS.map((l) => l.id)).size).toBe(ALL_LEVELS.length);
    for (const w of WORLDS) for (const d of w.dishes) expect(D.recipes[d]).toBeTruthy();
    expect(WORLDS[0].starsToUnlock).toBe(0);
    for (let i = 1; i < WORLDS.length; i++) expect(WORLDS[i].starsToUnlock).toBeGreaterThan(0);
  });
  it('L1–3 là bản tập, TỪ L4 đủ bước thật và giữ vậy tới hết world', () => {
    for (const w of WORLDS) {
      expect(w.levels[0].training).toBe(true);
      for (const L of w.levels) if (L.n >= 4) expect(L.simplify, `${L.id} phải đủ bước thật`).toBeNull();
    }
  });
  it('mỗi level có whatsNew; từ L6 phải có ít nhất một "cái mới" ngoài số khách', () => {
    for (const L of ALL_LEVELS) {
      expect(L.whatsNew, L.id).toBeTruthy();
      if (L.n < 6) continue;
      const isNew = L.layout !== 'default' || L.constraints || L.events || L.goal || L.challenge || L.unlocks?.dish || L.unlocks?.regular || L.pair || L.rule || L.mix;
      expect(isNew, `${L.id} không có trục biến thiên nào`).toBeTruthy();
    }
  });
  it('không có 3 level liên tiếp cùng một trục biến thiên', () => {
    const axis = (L) => (L.unlocks?.dish ? 'dish' : L.layout !== 'default' ? 'layout' : L.constraints ? 'con' : L.events ? 'ev' : L.goal ? 'goal' : L.challenge ? 'ch' : L.rule ? 'rule' : L.mix ? 'mix' : 'none');
    for (const w of WORLDS) for (let i = 7; i < w.levels.length; i++) {
      const a = [w.levels[i - 2], w.levels[i - 1], w.levels[i]].map(axis);
      expect(a[0] === a[1] && a[1] === a[2] && a[0] !== 'none', `${w.levels[i].id}: ba level liền cùng trục ${a[0]}`).toBe(false);
    }
  });
  it('mục tiêu tiền hợp lý và món chỉ lớn dần trong world', () => {
    for (const w of WORLDS) { let prev = 0;
      for (const L of w.levels) {
        expect(L.moneyTargets[0]).toBeLessThan(L.moneyTargets[2]);
        if (L.challenge?.kind !== 'only') { expect(L.dishes.length).toBeGreaterThanOrEqual(prev); prev = L.dishes.length; }
        for (const d of L.dishes) expect(PRICES[d]).toBeTruthy();
      } }
  });
  it('khách sinh có seed: cùng level → cùng danh sách; rush/lunch/boss/pair/regular đúng', () => {
    const L5 = levelById('pho-5'), L8 = levelById('pho-8'), L10 = levelById('pho-10'), L20 = levelById('pho-20');
    expect(makeLevelArrivals(L5)).toEqual(makeLevelArrivals(L5));
    expect(makeLevelArrivals(L5).map((a) => a.t)).toEqual([1, 2, 3]);
    expect(makeLevelArrivals(L8).filter((a) => a.group === 'pair').length).toBe(2);
    expect(makeLevelArrivals(L10).filter((a) => a.regular === 'cau-hai').length).toBe(1);
    expect(makeLevelArrivals(L10).every((a) => a.t < L10.seconds * 0.55)).toBe(true);
    expect(makeLevelArrivals(L20).filter((a) => a.group === 'tour').length).toBe(4);
    for (const L of ALL_LEVELS) { const arr = makeLevelArrivals(L); expect(arr.length, L.id).toBeGreaterThanOrEqual(L.count); expect(arr.every((a) => a.t < L.seconds), L.id).toBe(true); }
  });
  it('khách quen chỉ xuất hiện ở level có món ruột của họ', () => {
    for (const L of ALL_LEVELS) for (const rid of L.regulars) {
      const r = REGULARS.find((x) => x.id === rid); expect(r, rid).toBeTruthy();
      expect(L.dishes.includes(r.dish), `${L.id} có ${rid} nhưng không có ${r.dish}`).toBe(true);
    }
  });
  it('mọi biến thể bố trí bếp: mọi trạm đều tới được từ chỗ đứng đầu', () => {
    for (const ly of Object.keys(KITCHEN_VARIANTS)) for (const portrait of [false, true]) {
      const k = kitchenFor(portrait, ly); const st = k.stations.map((s) => ({ ...s }));
      const nav = new NavGrid(k, st, 0.25, 0.28); const reach = nav.reachableFrom(k.chefStart.x, k.chefStart.z);
      for (const s of st) expect(nav.standFor({ x: s.x, z: s.z, w: s.w || 0.8, d: s.d || 0.8 }, { x: s.x, z: s.z + (s.d || 0.8) / 2 + 0.55 }, reach), `${ly}/${portrait ? 'dọc' : 'ngang'}: ${s.id}`).toBeTruthy();
    }
  });
  it('nextLevel đi hết world rồi dừng', () => {
    expect(nextLevel(levelById('pho-1')).id).toBe('pho-2');
    expect(nextLevel(levelById('pho-25'))).toBeNull();
  });
});

describe('cờ rút gọn (bản tập) — KHÔNG đụng công thức gốc', () => {
  it('recipeFor(d) không tham số giữ nguyên công thức đầy đủ cho cả 18 món', () => {
    const snap = {};
    for (const d of Object.keys(PRICES)) { const r = recipeFor(d); snap[d] = [r.assembly.join('>'), r.transforms.map((t) => t.action + '→' + t.output).join(','), r.shelfItems.join(',')]; }
    // phở tái nạm: đủ nóng → lạnh → nóng + trụng tô + 5 topping
    expect(snap['pho-tai-nam'][0]).toBe('bowl-hot:pho-bowl>noodle-drained:pho-noodle>nam>bo-tai>hanh-tay>ngo-ri-ngo-gai>hanh-la>broth:pour-pho-broth');
    expect(snap['pho-tai-nam'][1]).toContain('cold-rinse');
    expect(snap['pho-tai-nam'][1]).toContain('blanch-bowl');
    expect(recipeFor('pho-tai-nam').simplify).toBeNull();
    // gọi lại sau khi đã dựng bản rút gọn vẫn y nguyên (không dính state)
    recipeFor('pho-tai-nam', { skipRinse: true, hotBowl: true, toppings: ['nam'] });
    for (const d of Object.keys(PRICES)) { const r = recipeFor(d); expect([r.assembly.join('>'), r.transforms.map((t) => t.action + '→' + t.output).join(','), r.shelfItems.join(',')], d).toEqual(snap[d]); }
  });
  it('skipRinse: sợi chỉ trụng một lần; hotBowl: không có bước trụng tô, kệ phát tô nóng', () => {
    const r = recipeFor('pho-tai-nam', { skipRinse: true, hotBowl: true });
    expect(r.transforms.map((t) => t.action)).toEqual(['blanch-noodle-once']);
    expect(r.shelfSubs['pho-bowl']).toBe('bowl-hot:pho-bowl');
    expect(r.assembly[0]).toBe('bowl-hot:pho-bowl');
  });
  it('toppings: lọc đúng, giữ thứ tự gốc, không đụng tô/sợi/nước', () => {
    const r = recipeFor('pho-tai-nam', { toppings: ['nam', 'bo-tai'] });
    expect(r.assembly).toEqual(['bowl-hot:pho-bowl', 'noodle-drained:pho-noodle', 'nam', 'bo-tai', 'broth:pour-pho-broth']);
    expect(r.shelfItems).not.toContain('hanh-la');
  });
  it('skipPrep/skipFry: bỏ bước, kệ phát thẳng token kết quả (nối chuỗi)', () => {
    const p = recipeFor('bun-ca-hai-phong', { skipPrep: true });
    expect(p.transforms.some((t) => t.station === 'prep')).toBe(false);
    expect(p.shelfSubs['cha-ca']).toBe('cha-ca-ready');
    const c = recipeFor('cha-gio-viet-nam', { skipPrep: true, skipFry: true });
    expect(c.shelfSubs['cha-gio']).toBe('cha-gio-cut');
    expect(c.transforms.length).toBe(0);
  });
  it('maxSteps cắt bớt bước ráp; bước thừa bị cắt theo', () => {
    expect(recipeFor('cha-ca-la-vong', { skipPrep: true, maxSteps: 3 }).assembly.length).toBe(3);
    expect(recipeFor('chao-long', { skipPrep: true }).transforms.length).toBe(0);
  });
  it('World lấy đồ trên kệ ra đúng token đã rút gọn', () => {
    const L = levelById('pho-1'); const w = new World(L, {}, kitchenFor(false, L.layout));
    const shelf = w.stationById['shelf-bowl'];
    w.chef.waiting = 'shelf-bowl'; w.pickFromShelf(['pho-bowl']);
    expect(w.chef.hand).toEqual(['bowl-hot:pho-bowl']);
    expect(shelf.items).toContain('pho-bowl');
  });
});

describe('ràng buộc · sự kiện · mục tiêu', () => {
  it('potSlots / handCapacity / brothCap / noStack đổi luật bếp', () => {
    const k = kitchenFor(false);
    const w1 = new World({ ...levelById('pho-9') }, {}, k);
    expect(w1.capacityFor(w1.stationById.pot, 'noodle')).toBe(1);
    const w2 = new World({ ...levelById('pho-15') }, {}, k);
    w2.chef.waiting = 'shelf-topping'; w2.pickFromShelf(['nam', 'bo-tai']);
    expect(w2.chef.hand.length).toBe(1);
    const w3 = new World({ ...levelById('bun-rieu-6') }, {}, k);
    expect(w3.stackMax).toBe(1);
    expect(new World({ ...levelById('bun-rieu-11') }, {}, k).noStack).toBe(true);
  });
  it('soupReady: nước có sẵn trên kệ, chưa cho nấu', () => {
    const w = new World({ ...levelById('bun-rieu-1') }, {}, kitchenFor(false));
    const b = w.stationById.burner;
    expect(b.ready.length).toBeGreaterThan(0);
    expect(b.ready[0].output).toBe('crab-broth-ready');
    w.useBurner(b, 0); expect(w.chef.waiting).toBeFalsy();   // không mở card nấu
  });
  it('mưa dời khách lại rồi dồn; VIP tip gấp ba; khách đổi ý thì tô cũ vẫn giữ', () => {
    const k = kitchenFor(false);
    const rain = new World({ ...levelById('pho-14'), prep: 0 }, {}, k);
    const before = rain.shift.arrivals.map((a) => a.t);
    rain.time = rain.shift.seconds * 0.31; rain.fireEvents();
    expect(rain.shift.arrivals.map((a) => a.t)).not.toEqual(before);
    expect(rain.shift.arrivals.every((a) => a.t < rain.time + 1 || a.t >= rain.time + 40)).toBe(true);

    const vip = new World({ ...levelById('pho-19'), prep: 0 }, {}, k);
    vip.time = vip.shift.seconds * 0.36; vip.fireEvents();
    expect(vip.shift.arrivals[vip.arrivalIdx].vip).toBe(true);

    const ch = new World({ ...levelById('pho-19'), prep: 0, events: [{ at: 0, kind: 'change-order' }] }, {}, k);
    ch.update(0.1); run(ch, 45);
    const changed = ch.customers.find((c) => c.changed);
    expect(changed).toBeTruthy();
  });
  it('mục tiêu riêng cho sao: clean / no-waste / streak / before', () => {
    const k = kitchenFor(false); const mk = (id, patch) => Object.assign(new World({ ...levelById(id) }, {}, k), patch);
    const clean = mk('pho-9', { stats: { bowls: [{ mistakes: 0 }, { mistakes: 0 }, { mistakes: 0 }, { mistakes: 0 }], idle: 0, taps: 0, tapTimes: [] }, errors: [] });
    expect(clean.starsForGoal(0)).toBe(3);
    clean.stats.bowls = [{ mistakes: 0 }, { mistakes: 0 }, { mistakes: 1 }];
    expect(clean.starsForGoal(0)).toBe(1);
    const nw = mk('pho-17', { stats: { bowls: [], idle: 0, taps: 0, tapTimes: [] }, errors: [{ waste: true }] });
    expect(nw.starsForGoal(3)).toBe(2);
    nw.errors = []; expect(nw.starsForGoal(3)).toBe(3);
    const sk = mk('bun-bo-8', { bestStreak: 5 }); expect(sk.starsForGoal(0)).toBe(3);
    sk.bestStreak = 3; expect(sk.starsForGoal(0)).toBe(1);
    const bf = mk('cha-ca-6', { clearedAt: 100, left: 0, served: 4 }); expect(bf.starsForGoal(0)).toBe(3);
    bf.clearedAt = 200; expect(bf.starsForGoal(0)).toBe(1);
  });
  it('bot chơi được level 1 của mọi world (bản tập) và level có ràng buộc/bố trí lạ', () => {
    for (const w0 of WORLDS) {
      const L = w0.levels[0]; const w = new World({ ...L }, {}, kitchenFor(false, L.layout));
      run(w, L.seconds + 30);
      expect(w.served, `${L.id}: bot không phục vụ được ai`).toBeGreaterThanOrEqual(1);
      expect(w.mistakes, `${L.id}: bot làm sai`).toBe(0);
    }
    const hard = levelById('pho-20');   // island + boss
    const w = new World({ ...hard }, {}, kitchenFor(false, hard.layout)); run(w, hard.seconds + 20);
    expect(w.served).toBeGreaterThan(2);
    const one = levelById('pho-9');     // potSlots 1
    const w2 = new World({ ...one }, {}, kitchenFor(false, one.layout)); run(w2, one.seconds + 20);
    expect(w2.served).toBeGreaterThan(1);
  });
  it('CẢ 124 level đều chơi được: bot phục vụ ít nhất 1 khách, không kẹt', () => {
    const bad = [];
    for (const w0 of WORLDS) for (const L of w0.levels) {
      const w = new World({ ...L }, {}, kitchenFor(false, L.layout)); run(w, L.seconds + 40);
      if (w.served < 1) bad.push(`${L.id}: 0 khách`);
      if (w.state !== 'over') bad.push(`${L.id}: không kết thúc`);
    }
    expect(bad.join(' | ')).toBe('');
  }, 120000);
});

describe('tiến trình: sao mở level/world, nâng cấp theo sao', () => {
  it('level mở dần theo sao; world mở khi world trước đủ sao; nâng cấp mở theo TỔNG sao', async () => {
    const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
    const P = await import('../src/game/progress.js?fresh=' + Math.random());
    expect(P.currentLevel().id).toBe('pho-1');
    expect(P.levelUnlocked(levelById('pho-1'))).toBe(true);
    expect(P.levelUnlocked(levelById('pho-2'))).toBe(false);
    expect(P.worldUnlocked('pho')).toBe(true);
    expect(P.worldUnlocked('bun-rieu')).toBe(false);
    expect(P.upgradeCost('bowl-stack')).toBeNull();      // chưa đủ sao → chưa mở bán

    P.recordLevel('pho-1', { stars: 3, money: 100, tips: 10 });
    expect(P.bestStars('pho-1')).toBe(3);
    expect(P.levelUnlocked(levelById('pho-2'))).toBe(true);
    expect(P.currentLevel().id).toBe('pho-2');
    expect(P.worldStars('pho')).toBe(3);
    for (let i = 2; i <= 4; i++) P.recordLevel(`pho-${i}`, { stars: 3, money: 100, tips: 10 });
    expect(P.totalStars()).toBe(12);
    expect(P.upgradeCost('bowl-stack')).toBe(180);       // ≥8★ → mở bán
    expect(P.upgradeCost('burners')).toBeNull();         // cần 20★
    expect(P.buyUpgrade('bowl-stack')).toBe(true);
    expect(P.playerMods().bowlSlots).toBe(4);

    for (const L of WORLDS[0].levels) P.recordLevel(L.id, { stars: 3, money: 0, tips: 0 });
    expect(P.worldStars('pho')).toBe(75);
    expect(P.worldUnlocked('bun-rieu')).toBe(true);
    expect(P.currentLevel().world).toBe('bun-rieu');
    expect(P.unlocksAfter(levelById('pho-25')).some((u) => u.kind === 'world' && u.id === 'bun-rieu')).toBe(true);
    expect(P.unlocksAfter(levelById('pho-10')).some((u) => u.kind === 'dish' && u.id === 'pho-dac-biet')).toBe(true);
    expect(P.unlocksAfter(levelById('pho-9')).some((u) => u.kind === 'regular' && u.id === 'cau-hai')).toBe(true);
    delete globalThis.localStorage;
  });
  it('mọi nâng cấp đều mở bán được trong world đầu (60★) và đổi đúng thông số bếp', () => {
    expect(UPGRADES.every((u) => u.unlockStars <= 60)).toBe(true);
    const m = modsFor({ burners: 2, seats: 2, 'bowl-stack': 2, shoes: 1, fire: 1 }, 0);
    expect(m.burners).toBe(3); expect(m.seats).toBe(5); expect(m.bowlSlots).toBe(5);
    expect(m.speedMult).toBeCloseTo(1.12); expect(m.heatMult).toBeCloseTo(0.85);
  });
});
