import { describe, it, expect } from 'vitest';
import { dishStage, dishArtAt, dishStepArt, DISH_STEPS } from '../src/game/art.js';
import { Counter, counterMove, povOk } from '../src/game/counter.js';
import { ALL_DISHES, levelById, WORLDS } from '../src/config.js';
import { makeLevelArrivals, povArrivals } from '../src/game/levels.js';
import { POV_SECONDS, POV_DEFAULT } from '../src/data/pace.js';
import { recipeFor, D } from '../src/game/recipes.js';

/** Chạy quầy bằng bot: mỗi 0.35 s làm một nước đi, còn lại để đồng hồ chạy. */
function play(C, seconds = 600) {
  let acc = 0;
  for (let i = 0; i < seconds * 20 && !C.over; i++) {
    C.update(0.05); acc += 0.05;
    if (acc >= 0.35) { acc = 0; const m = counterMove(C); if (m) C.drop(m.src, m.zone); }
  }
  return C;
}
const mk = (dishes, o = {}) => new Counter({ dishes, rounds: o.rounds ?? 2, patience: o.patience ?? 600, gap: o.gap ?? 3, rnd: () => 0.99, ...o });

describe('Counter — lõi quầy POV', () => {
  it('cả 21 món đều chơi được ở quầy (mọi transform có chỗ thả)', () => {
    expect(ALL_DISHES.filter(povOk).length).toBe(21);
    for (const d of ALL_DISHES) for (const t of recipeFor(d).transforms) expect(['pot', 'sink', 'prep', 'fryer', 'microwave', 'stovetop'], `${d}/${t.action}`).toContain(t.station);
  });

  it('bot làm xong CẢ 21 MÓN, đúng chuỗi ráp, không lỗi', () => {
    const bad = [];
    for (const d of ALL_DISHES) {
      const C = mk([d], { rounds: 2 }); play(C, 900);
      const served = C.results.filter((r) => r.quality > 0);
      if (served.length < 2) bad.push(`${d}: xong ${served.length}/2`);
      const m = C.results.reduce((n, r) => n + r.mistakes, 0); if (m) bad.push(`${d}: ${m} lỗi`);
    }
    expect(bad.join(' | ')).toBe('');
  }, 120000);

  it('nóng → lạnh → nóng bị kiểm: trút sợi mới trụng vô tô phở là lỗi, bún bò thì được', () => {
    const C = mk(['pho-tai-nam'], { rounds: 1 }); C.spawn('pho-tai-nam');
    C.drop({ kind: 'item', tok: 'pho-bowl' }, { kind: 'pot' }); C.update(2);
    C.drop({ kind: 'hotbowl', i: 0 }, { kind: 'slot', i: 0 });
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' }); C.update(5);
    expect(C.baskets[0].state).toBe('hot');
    const r1 = C.drop({ kind: 'basket', i: 0 }, { kind: 'slot', i: 0 });
    expect(r1.ok).toBe(false); expect(r1.msg).toMatch(/xả lạnh/);
    C.drop({ kind: 'basket', i: 0 }, { kind: 'sink' }); C.update(3); expect(C.baskets[0].state).toBe('rinsed');
    C.drop({ kind: 'basket', i: 0 }, { kind: 'pot' }); C.update(3); expect(C.baskets[0].state).toBe('hot2');
    expect(C.drop({ kind: 'basket', i: 0 }, { kind: 'slot', i: 0 }).ok).toBe(true);

    const B = mk(['bun-bo-hue'], { rounds: 1 }); B.spawn('bun-bo-hue');
    B.drop({ kind: 'item', tok: 'soup-bowl' }, { kind: 'pot' }); B.update(2); B.drop({ kind: 'hotbowl', i: 0 }, { kind: 'slot', i: 0 });
    B.drop({ kind: 'item', tok: 'bun-to' }, { kind: 'pot' }); B.update(5);
    expect(B.drop({ kind: 'basket', i: 0 }, { kind: 'slot', i: 0 }).ok).toBe(true);   // bún bò: trụng một lần là vô tô
  });

  it('nấu nước ở lò phải đúng thứ tự cốt → huyết → nước', () => {
    const C = mk(['bun-rieu-cua'], { rounds: 1 }); C.spawn('bun-rieu-cua');
    const bad = C.drop({ kind: 'item', tok: 'huyet' }, { kind: 'burner', i: 0 });
    expect(bad.ok).toBe(false); expect(bad.msg).toMatch(/cốt cua|Nước cốt cua/i);
    expect(C.drop({ kind: 'item', tok: 'cot-cua' }, { kind: 'burner', i: 0 }).ok).toBe(true);
    expect(C.drop({ kind: 'item', tok: 'mieng-nuoc' }, { kind: 'burner', i: 0 }).ok).toBe(false);   // thiếu huyết
    expect(C.drop({ kind: 'item', tok: 'huyet' }, { kind: 'burner', i: 0 }).ok).toBe(true);
    expect(C.drop({ kind: 'item', tok: 'mieng-nuoc' }, { kind: 'burner', i: 0 }).ok).toBe(true);
    expect(C.burner.pots[0].left).toBeGreaterThan(0);
    C.update(20); expect(C.burner.ready[0].output).toBe('crab-broth-ready');
  });

  it('thớt gom đủ nguyên liệu mới làm (cắt xà lách + dưa leo + đồ chua)', () => {
    const C = mk(['bun-ga-nuong'], { rounds: 1 }); C.spawn('bun-ga-nuong');
    C.drop({ kind: 'item', tok: 'xa-lach' }, { kind: 'prep' });
    expect(C.boards[0].left).toBeNull();
    C.drop({ kind: 'item', tok: 'dua-leo' }, { kind: 'prep' });
    expect(C.boards[0].left).toBeNull();
    C.drop({ kind: 'item', tok: 'do-chua' }, { kind: 'prep' });
    expect(C.boards[0].left).toBeGreaterThan(0);
    C.update(5); expect(C.boards[0].output).toBe('salad-cut-ready');
  });

  it('chảo chiên + lò vi sóng: chả giò và sườn đi đúng trạm', () => {
    const C = mk(['cha-gio-viet-nam'], { rounds: 1 }); C.spawn('cha-gio-viet-nam');
    expect(C.drop({ kind: 'item', tok: 'cha-gio' }, { kind: 'prep' }).ok).toBe(false);
    expect(C.drop({ kind: 'item', tok: 'cha-gio' }, { kind: 'fryer' }).ok).toBe(true);
    C.update(12); expect(C.fryer.left).toBe(0);
    expect(C.drop({ kind: 'fryer' }, { kind: 'prep' }).ok).toBe(true); C.update(5);
    expect(C.boards[0].output).toBe('cha-gio-cut');
    const M = mk(['pho-suon-tai'], { rounds: 1 }); M.spawn('pho-suon-tai');
    expect(M.drop({ kind: 'item', tok: 'suon-cay' }, { kind: 'microwave' }).ok).toBe(true);
  });

  it('giao nhầm phiếu bị bắt; tô đúng thì khách nhận và tính chất lượng', () => {
    const C = mk(['pho-tai-nam', 'bun-bo-hue'], { rounds: 2 });
    const a = C.spawn('pho-tai-nam'); const b = C.spawn('bun-bo-hue');
    // bot làm song song nhiều phiếu → phải tìm đúng cái tô ĐÃ XONG của phiếu a, không phải tô bất kỳ đủ số bước
    const doneA = () => C.slots.findIndex((s) => s && s.placed.length === a.steps.length && a.steps.every((x, k) => x === s.placed[k]));
    for (let i = 0; i < 800 && doneA() < 0; i++) { const m = counterMove(C); if (m) C.drop(m.src, m.zone); C.update(0.3); }
    const si = doneA();
    expect(si).toBeGreaterThanOrEqual(0);
    const wrong = C.drop({ kind: 'madebowl', i: si }, { kind: 'ticket', id: b.id });
    expect(wrong.ok).toBe(false); expect(wrong.msg).toMatch(/của /);
    const good = C.drop({ kind: 'madebowl', i: si }, { kind: 'ticket', id: a.id });
    expect(good.ok).toBe(true); expect(C.results[0].quality).toBe(80);   // giao nhầm một lần = −20
  });

  it('cờ rút gọn của level dùng lại được: hotBowl / skipRinse / soupReady', () => {
    const L1 = levelById('pho-1');
    const C = new Counter({ dishes: L1.dishes, rounds: 2, simplify: L1.simplify, rnd: () => 0.5 });
    C.spawn('pho-tai-nam');
    expect(C.drop({ kind: 'item', tok: 'pho-bowl' }, { kind: 'slot', i: 0 }).ok).toBe(true);   // tô nóng sẵn
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' }); C.update(6);
    expect(C.drop({ kind: 'basket', i: 0 }, { kind: 'slot', i: 0 }).ok).toBe(true);            // trụng một lần
    const R = new Counter({ dishes: ['bun-rieu-cua'], rounds: 1, simplify: levelById('bun-rieu-1').simplify, rnd: () => 0.5 });
    expect(R.burner.ready.length).toBeGreaterThan(0);
    expect(R.drop({ kind: 'item', tok: 'cot-cua' }, { kind: 'burner', i: 0 }).ok).toBe(false);  // chưa học nấu
  });

  it('ràng buộc level: 1 rọ · kệ nước 1 phần · lò xong không tự sang kệ', () => {
    const C = mk(['pho-tai-nam'], { constraints: { potSlots: 1, slots: 1 } });
    expect(C.baskets.length).toBe(1); expect(C.slots.length).toBe(1);
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' });
    expect(C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' }).ok).toBe(false);
    const N = mk(['bun-rieu-cua'], { constraints: { noStack: true }, rounds: 1 });
    N.drop({ kind: 'item', tok: 'cot-cua' }, { kind: 'burner', i: 0 }); N.drop({ kind: 'item', tok: 'huyet' }, { kind: 'burner', i: 0 }); N.drop({ kind: 'item', tok: 'mieng-nuoc' }, { kind: 'burner', i: 0 });
    N.update(20); expect(N.burner.ready.length).toBe(0); expect(N.burner.pots[0].left).toBe(0);
  });

  it('sợi để lâu trong nồi thì hư và phải vứt', () => {
    const C = mk(['pho-tai-nam'], { rounds: 1 }); C.spawn('pho-tai-nam');
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' }); C.update(5 + 30);
    expect(C.baskets[0].spoiled).toBe(true);
    expect(C.drop({ kind: 'basket', i: 0 }, { kind: 'trash' }).ok).toBe(true);
    expect(C.baskets[0]).toBeNull();
  });

  it('khách chờ quá lâu thì bỏ đi', () => {
    const C = mk(['pho-tai-nam'], { rounds: 1, patience: 10 }); C.spawn('pho-tai-nam');
    C.update(11); expect(C.done).toBe(1); expect(C.results[0].quality).toBe(0);
  });
});

// ---- level chạy trên quầy POV (docs/PLAN-CORE.md bước 2) ----
describe('Quầy POV chạy được world/level', () => {
  const lvCounter = (L) => new Counter({
    dishes: L.dishes, arrivals: povArrivals(L), simplify: L.simplify,
    constraints: L.constraints, goal: L.goal, moneyTargets: L.moneyTargets,
    patience: L.patience, rnd: () => 0.37,
  });

  it('CẢ 124 level đều chơi được ở quầy: bot phục vụ được khách, không kẹt', () => {
    const bad = [];
    for (const w of WORLDS) for (const L of w.levels) {
      const C = lvCounter(L); play(C, L.seconds + 240);
      const r = C.result();
      if (r.served < 1) bad.push(`${L.id}: phục vụ ${r.served}/${C.rounds}`);
      if (r.mistakes > C.rounds * 3) bad.push(`${L.id}: ${r.mistakes} lỗi`);
    }
    expect(bad, bad.slice(0, 8).join(' | ')).toEqual([]);
  }, 180000);

  it('level trả về đủ số liệu để chấm sao như bếp 3D', () => {
    const L = WORLDS[0].levels[0];
    const C = lvCounter(L); play(C, L.seconds + 240);
    const r = C.result();
    for (const k of ['money', 'tips', 'served', 'left', 'mistakes', 'wasted', 'errors', 'stars', 'regulars', 'stats'])
      expect(r, k).toHaveProperty(k);
    expect(r.stars).toBeGreaterThanOrEqual(0); expect(r.stars).toBeLessThanOrEqual(3);
    expect(r.money).toBeGreaterThan(0);
  });

  it('khách tới đúng lịch của level, không phải rải đều', () => {
    const L = WORLDS[0].levels[3];
    const arr = makeLevelArrivals(L);
    const C = new Counter({ dishes: L.dishes, arrivals: arr, simplify: L.simplify, patience: L.patience, rnd: () => 0.5 });
    expect(C.rounds).toBe(arr.length);
    C.update(0.05);
    expect(C.spawned).toBe(arr[0].t <= 0.05 ? 1 : 0);
  });

  it('mục tiêu riêng của level được chấm (clean / no-waste / streak / before)', () => {
    const mkGoal = (goal) => { const C = new Counter({ dishes: ['pho-tai-nam'], rounds: 4, goal, patience: 600, rnd: () => 0.9 }); return C; };
    const C1 = mkGoal({ kind: 'clean', bowls: 4 }); play(C1, 900);
    expect(C1.result().stars).toBeGreaterThanOrEqual(1);
    const C2 = mkGoal({ kind: 'no-waste' }); play(C2, 900);
    expect(C2.result().wasted).toBe(0);
  });
});


// ---- nhịp khách ở quầy (Kent 14/09: "tần suất khách xuất hiện ít quá") ----
describe('Nhịp khách ở quầy POV', () => {
  it('bảng giây/tô còn khớp với bot (lệch >40% là phải đo lại)', () => {
    const off = [];
    for (const d of ALL_DISHES) {
      const C = new Counter({ dishes: [d], rounds: 3, patience: 900, gap: 0.1, rnd: () => 0.5 });
      let acc = 0;
      for (let i = 0; i < 900 * 20 && !C.over; i++) { C.update(0.05); acc += 0.05; if (acc >= 0.35) { acc = 0; const m = counterMove(C); if (m) C.drop(m.src, m.zone); } }
      const real = C.time / 3; const book = POV_SECONDS[d] ?? POV_DEFAULT;
      if (Math.abs(real - book) / book > 0.4) off.push(`${d}: bảng ${book}s, đo ${real.toFixed(1)}s`);
    }
    expect(off, off.join(' | ')).toEqual([]);
  }, 120000);

  it('khách đầu tới sớm và khoảng cách bám theo tốc độ thật của quầy', () => {
    for (const w of WORLDS) for (const L of w.levels) {
      const a = povArrivals(L);
      expect(a[0].t, `${L.id} khách đầu`).toBeLessThanOrEqual(6);
      if (a.length > 2) {
        const span = a[a.length - 1].t - a[0].t;
        const avg = span / (a.length - 1);
        expect(avg, `${L.id} khoảng cách trung bình`).toBeLessThanOrEqual(40);
      }
    }
  });

  // Từ 19/09 `seconds` là HẠN GIỜ THẬT (Counter.endShift). Trước đó nó chỉ in ra menu.
  // Nếu chuông reo mà bot còn quá nửa số khách chưa phục vụ thì level đó hứa suông.
  it('hết giờ là đóng ca: trong đúng `seconds` bot vẫn phục vụ được phần lớn khách', () => {
    const bad = [];
    for (const w of WORLDS) for (const L of w.levels) {
      const C = new Counter({ dishes: L.dishes, arrivals: povArrivals(L), simplify: L.simplify,
        constraints: L.constraints, goal: L.goal, moneyTargets: L.moneyTargets, patience: L.patience,
        seconds: L.seconds, rnd: () => 0.37 });
      play(C, L.seconds + 60);
      const r = C.result();
      if (r.served < Math.ceil(C.rounds * 0.6)) bad.push(`${L.id}: ${r.served}/${C.rounds} trong ${L.seconds}s`);
    }
    expect(bad, bad.slice(0, 10).join(' | ')).toEqual([]);
  }, 180000);

  // NHỊP THẬT (data/pace.js, Kent 19/09): kiên nhẫn ≈ 4–6 × giây/tô bot, giờ ca = khách cuối + 3 tô, combo ×2, cao điểm.
  // Bot (trần trên) phải 3 sao MỌI level, nếu không thang level đã bị siết quá tay → chỉnh PACE, không chỉnh từng level.
  it('PACE: bot 3 sao ở cả 129 level, không khách nào bỏ đi; level 2 mỗi world có đủ nước nấu sẵn cho cả ca', () => {
    const bad = [];
    for (const w of WORLDS) for (const L of w.levels) {
      expect(L.paced, `${L.id} chưa áp PACE`).toBe(true);
      expect(L.base.patience, `${L.id}: số gốc phải giữ trong L.base`).toBeGreaterThan(L.patience);
      const C = new Counter({ dishes: L.dishes, arrivals: povArrivals(L), simplify: L.simplify, constraints: L.constraints, goal: L.goal,
        moneyTargets: L.moneyTargets, patience: L.patience, seconds: L.seconds, rush: L.rush, rnd: () => 0.37 });
      play(C, L.seconds + 5); const r = C.result(); const T = L.moneyTargets;
      if (C.money < T[2]) bad.push(`${L.id}: ${C.money}k < ${T[2]}k`);
      if (r.left) bad.push(`${L.id}: bỏ đi ${r.left}`);
    }
    expect(bad, bad.slice(0, 8).join(' | ')).toEqual([]);
  }, 180000);

  it('combo: chuỗi tô sạch nhân tiền, sai 1 tô là về 1×; giờ cao điểm dồn khách còn lại và nhân tiền', () => {
    const C = new Counter({ dishes: ['pho-tai-nam'], rounds: 6, patience: 900, gap: 0.1, seconds: 300, rush: { at: 0.03, len: 20, mult: 1.5 }, rnd: () => 0.5 });   // cao điểm ở giây 9, lúc bot còn đang làm
    const events = []; C.ev.onCombo = (n, m) => events.push(['combo', n, m]); C.ev.onComboBreak = (n) => events.push(['break', n]); C.ev.onRush = (on) => events.push(['rush', on]);
    play(C, 400);
    expect(events.some((e) => e[0] === 'combo' && e[1] >= 2)).toBe(true);
    expect(C.money).toBeGreaterThan(6 * 40);                       // có nhân combo → hơn giá gốc
    expect(events.some((e) => e[0] === 'rush' && e[1] === true)).toBe(true);
    expect(events.some((e) => e[0] === 'rush' && e[1] === false)).toBe(true);
  });

  it('nén lịch nhưng KHÔNG làm level thành bất khả thi: bot vẫn không để khách bỏ đi nhiều', () => {
    const bad = [];
    for (const w of WORLDS) for (const L of w.levels) {
      const C = new Counter({ dishes: L.dishes, arrivals: povArrivals(L), simplify: L.simplify,
        constraints: L.constraints, goal: L.goal, moneyTargets: L.moneyTargets, patience: L.patience, rnd: () => 0.41 });
      play(C, L.seconds + 240);
      const r = C.result();
      if (r.left > Math.max(1, Math.ceil(C.rounds * 0.34))) bad.push(`${L.id}: bỏ đi ${r.left}/${C.rounds}`);
    }
    expect(bad, bad.slice(0, 8).join(' | ')).toEqual([]);
  }, 180000);
});

describe('bậc ảnh của tô (art C)', () => {
  it('đi đúng thang s0 → dry → top → wet theo thứ đã bỏ vào, không đếm bước', () => {
    expect(dishStage(['bowl-hot:pho-bowl'])).toBe('s0');
    expect(dishStage(['bowl-hot:pho-bowl', 'noodle-drained:pho-noodle'])).toBe('dry');
    expect(dishStage(['base-ready'])).toBe('dry');
    expect(dishStage(['base-ready', 'nam'])).toBe('top');
    expect(dishStage(['base-ready', 'nam', '@pour-pho-broth'])).toBe('wet');
    expect(dishStage(['base-ready', 'nam'], true)).toBe('wet');
    expect(dishStage(['tray-ready'])).toBe('s0');
  });
  it('món thiếu ảnh bậc nào thì lùi về bậc có sẵn, món không có art thì trả null', () => {
    expect(dishArtAt('pho-tai-nam', 'top')).toBe('art/pho-tai-nam-top.webp');
    expect(dishArtAt('bun-cha-ha-noi', 'top')).toBe('art/bun-cha-ha-noi-wet.webp');   // món khô: không có -top
    expect(dishArtAt('bun-cha-ha-noi', 's0')).toBe('art/bun-cha-ha-noi-dry.webp');    // mẹt trống chính là -dry
    expect(dishArtAt('mon-khong-co-that', 'wet')).toBe(null);
  });
});

describe('tô đổi theo từng món bỏ vào', () => {
  it('ảnh bước đánh số lùi 1 so với số thứ đã bỏ (công thức thật tách tô và sợi)', () => {
    expect(dishStepArt('pho-tai-nam', 3)).toBe('art/step/pho-tai-nam-k2.webp');
    expect(dishStepArt('pho-tai-nam', 2)).toBe(null);
    expect(dishStepArt('mon-khong-co-that', 3)).toBe(null);
  });
  it('mọi món có ảnh bước đều liền mạch từ k2, không đứt quãng', () => {
    for (const [dish, ks] of Object.entries(DISH_STEPS)) {
      expect(ks[0], dish).toBe(2);
      for (let i = 1; i < ks.length; i++) expect(ks[i] - ks[i - 1], `${dish} đứt ở k${ks[i]}`).toBe(1);
    }
  });
});

describe('kệ nước — nước cốt & nước trắng không nằm trên khay topping', () => {
  it('cả 124 level: đồ nấu nước đứng đúng chỗ, không lẫn vào dải khay', () => {
    const bad = [];
    for (const w of WORLDS) for (const lv of (w.levels || [])) {
      const dishes = lv.dishes || lv.menu || []; if (!dishes.length) continue;
      const C = new Counter({ dishes, rounds: 1, patience: 600, gap: 3, rnd: () => 0.99 });
      for (const t of C.stockItems) if (C.panItems.includes(t)) bad.push(`${lv.id}: nước cốt ${t} còn trên khay`);
      for (const t of C.waterItems) if (C.panItems.includes(t)) bad.push(`${lv.id}: nước trắng ${t} còn trên khay`);
      // không được mất món: mọi thứ cần vẫn phải lấy được ở đâu đó
      for (const t of C.soupItems)
        if (!C.panItems.includes(t) && !C.stockItems.includes(t) && !C.waterItems.includes(t))
          bad.push(`${lv.id}: ${t} không còn chỗ nào lấy`);
    }
    expect(bad).toEqual([]);
  });

  // ZONES.broth (85,30,14,11) và ZONES.fryer (83.5,28,14,13.5) nằm ĐÈ lên nhau trong tranh.
  // Hiện không level nào bật cả hai nên không sao — chốt lại bằng test để sau này thêm món
  // vừa chiên vừa nấu nước thì vỡ ở đây, chứ không vỡ âm thầm trên màn hình.
  it('không level nào vừa có chảo chiên vừa có kệ nước (hai ô đè nhau)', () => {
    const clash = [];
    for (const w of WORLDS) for (const lv of (w.levels || [])) {
      const dishes = lv.dishes || lv.menu || []; if (!dishes.length) continue;
      const C = new Counter({ dishes, rounds: 1, patience: 600, gap: 3, rnd: () => 0.99 });
      const needFryer = Object.values(C.recs).some((r) => r.transforms.some((x) => x.station === 'fryer'));
      if (needFryer && C.brothSrc.length + C.stockItems.length) clash.push(lv.id);
    }
    expect(clash).toEqual([]);
  });

  // J7: kệ nước là MỘT HÀNG NỒI trong ô broth rộng 14 % — quá 3 nồi thì mỗi nồi < 17 px, không bấm nổi.
  it('không level nào quá 3 nồi nước (brothSrc + stockItems ≤ 3)', () => {
    const bad = [];
    for (const w of WORLDS) for (const lv of (w.levels || [])) {
      const dishes = lv.dishes || lv.menu || []; if (!dishes.length) continue;
      const C = new Counter({ dishes, rounds: 1, patience: 600, gap: 3, rnd: () => 0.99 });
      const n = C.brothSrc.length + C.stockItems.length; if (n > 3) bad.push(`${lv.id}: ${n}`);
    }
    expect(bad).toEqual([]);
  });

  it('bún riêu: cốt cua ở kệ nước, miếng nước ở bồn, huyết vẫn ở khay', () => {
    const C = mk(['bun-rieu-cua']);
    expect(C.stockItems).toContain('cot-cua');
    expect(C.waterItems).toEqual(['mieng-nuoc']);
    expect(C.panItems).toContain('huyet');
    expect(C.panItems).not.toContain('cot-cua');
    expect(C.panItems).not.toContain('mieng-nuoc');
  });
});
