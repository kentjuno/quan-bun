// P4 — quyền chọn của người chơi: loại khách, thưởng hàng loạt, 2 nâng cấp đổi cách chơi, sự kiện chạy ở quầy.
import { describe, it, expect } from 'vitest';
import { Counter, counterMove, TICKET_KINDS, BONUS } from '../src/game/counter.js';
import { povArrivals } from '../src/game/levels.js';
import { WORLDS, levelById } from '../src/config.js';

const play = (C, seconds = 600) => { let acc = 0; for (let i = 0; i < seconds * 20 && !C.over; i++) { C.update(0.05); acc += 0.05; if (acc >= 0.35) { acc = 0; const m = counterMove(C); if (m) C.drop(m.src, m.zone); } } return C; };
const mk = (o = {}) => new Counter({ dishes: ['pho-tai-nam'], rounds: 3, patience: 100, seconds: 300, rnd: () => 0.5, ...o });

describe('P4 loại khách', () => {
  it('phiếu mang loại; kiên nhẫn và tiền boa đổi theo loại', () => {
    const C = mk({ arrivals: [{ t: 0.5, type: 'tourist', patience: 100 }, { t: 1, type: 'office', patience: 100 }, { t: 1.5, type: 'office', patience: 100, vip: true }] });
    C.update(2);
    const [a, b, c] = C.tickets;
    expect([a.kind, b.kind, c.kind]).toEqual(['tourist', 'local', 'vip']);
    expect(a.pat).toBe(Math.round(100 * TICKET_KINDS.tourist.pat));
    expect(b.pat).toBeLessThan(a.pat); expect(c.pat).toBeLessThan(b.pat);
    expect(c.tipMult).toBe(3);
  });
  it('bot làm khách sộp trước vì họ chờ ít nhất', () => {
    const C = mk({ arrivals: [{ t: 0.2, type: 'office', patience: 200 }, { t: 0.4, type: 'office', patience: 200, vip: true }], rounds: 2 });
    C.update(1);
    const vip = C.tickets.find((t) => t.kind === 'vip');
    play(C, 120);
    expect(C.results.length).toBe(2);
    expect(C.results[0].dish).toBe(vip.dish);           // tô đầu tiên giao là của khách sộp
    expect(C.left).toBe(0);
  });
});

describe('P4 thưởng hàng loạt', () => {
  it('chuẩn bị sẵn trước khi khách thứ hai tới → thưởng SẴN SÀNG một lần', () => {
    const got = []; const C = mk({ arrivals: [{ t: 1, type: 'office', patience: 200 }, { t: 60, type: 'office', patience: 200 }], rounds: 2 });
    C.ev.onBonus = (k, v) => got.push([k, v]);
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' });
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' });
    C.drop({ kind: 'item', tok: 'pho-bowl' }, { kind: 'pot' });
    C.update(0.5);
    expect(got).toEqual([['ready', BONUS.ready]]);
    expect(C.money).toBe(BONUS.ready);
    C.update(1); expect(got.length).toBe(1);            // chỉ một lần
  });
  it('trễ thì không thưởng', () => {
    const got = []; const C = mk({ arrivals: [{ t: 1, type: 'office', patience: 200 }, { t: 6, type: 'office', patience: 200 }], rounds: 2 });
    C.ev.onBonus = (k) => got.push(k); C.update(8);
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' }); C.update(0.5);
    expect(got).toEqual([]);
  });
  it('hai tô lên phiếu trong 3 giây → thưởng ĐÔI (làm song song), cách xa thì không', () => {
    // Người chơi giỏi ráp sẵn hai tô rồi bưng liên tiếp. Bot luôn bưng ngay nên ở đây ta GIỮ tô lại
    // (nhấc khỏi thớt) cho tới khi có đủ hai tô, rồi đặt lại và bưng cách nhau `gap` giây.
    const run = (gap) => {
      const got = []; const C = mk({ arrivals: [{ t: 0.2, type: 'office', patience: 900 }, { t: 0.4, type: 'office', patience: 900 }], rounds: 2, seconds: 900, simplify: { hotBowl: true, skipRinse: true } });
      C.ev.onBonus = (k) => got.push(k); C.update(1);
      const [t1, t2] = C.tickets; const stash = [];
      for (let i = 0; i < 4000 && stash.length < 2; i++) {
        const m = counterMove(C);
        if (m && m.zone.kind === 'ticket') { stash.push(C.slots[m.src.i]); C.slots[m.src.i] = null; }
        else if (m) C.drop(m.src, m.zone);
        C.update(0.05);
      }
      expect(stash.length).toBe(2);
      C.slots[0] = stash[0]; C.slots[1] = stash[1];
      C.drop({ kind: 'madebowl', i: 0 }, { kind: 'ticket', id: t1.id });
      C.update(gap);
      C.drop({ kind: 'madebowl', i: 1 }, { kind: 'ticket', id: t2.id });
      expect(C.results.length).toBe(2);
      return { got, C };
    };
    const fast = run(1); expect(fast.got.includes('double')).toBe(true); expect(fast.C.bonus.doubles).toBe(1);
    const slow = run(5); expect(slow.got.includes('double')).toBe(false);
  });
});

describe('P4 nâng cấp đổi cách chơi', () => {
  it('Nồi trụng đôi: một lần thả ra hai rọ', () => {
    const C = mk({ constraints: { twinPot: true } });
    C.drop({ kind: 'item', tok: 'pho-noodle' }, { kind: 'pot' });
    expect(C.baskets.filter(Boolean).length).toBe(2);
    expect(C.baskets[0].output).toBe(C.baskets[1].output);
  });
  it('Bảng gọi món: thấy khách kế tiếp, không có nâng cấp thì không thấy', () => {
    const arr = [{ t: 1, type: 'office', patience: 100 }, { t: 30, type: 'office', patience: 100, dish: 'pho-tai-nam' }];
    expect(mk({ arrivals: arr }).nextUp()).toEqual([]);
    const C = mk({ arrivals: arr, constraints: { peek: 1 } }); C.update(2);
    expect(C.nextUp()).toEqual([{ dish: 'pho-tai-nam', in: 28, vip: false }]);
  });
});

describe('P4 sự kiện chạy ở quầy', () => {
  const ev = (kind, extra = {}) => { const C = mk({ arrivals: [{ t: 1, type: 'office', patience: 200 }, { t: 100, type: 'office', patience: 200 }, { t: 200, type: 'office', patience: 200 }], rounds: 3, seconds: 300, events: [{ at: 0.02, kind, ...extra }] }); return C; };
  it('tour: đoàn 4 người tới cùng lúc', () => {
    const C = ev('tour'); const seen = []; C.ev.onEvent = (k) => seen.push(k);
    C.update(7); C.update(2);
    expect(seen).toEqual(['tour']); expect(C.rounds).toBe(7); expect(C.tickets.length).toBe(3);
  });
  it('vip: khách kế tiếp thành khách sộp và tới ngay', () => {
    const C = ev('vip'); C.update(7); C.update(3);
    expect(C.tickets.some((t) => t.kind === 'vip')).toBe(true);
  });
  it('rain: vắng khách rồi dồn lại', () => {
    const C = ev('rain', { len: 20 }); C.update(7);
    const n0 = C.tickets.length; C.update(10);
    expect(C.tickets.length).toBe(n0);                       // đang mưa: không thêm khách
    expect(C.arrivals[1].t).toBeLessThan(100);               // khách sau dồn lại gần hơn
    C.update(30); expect(C.tickets.length).toBeGreaterThan(n0);
  });
  it('change-order: một phiếu đổi món', () => {
    const C = mk({ dishes: ['pho-tai-nam', 'pho-dac-biet'], arrivals: [{ t: 1, type: 'office', patience: 300, dish: 'pho-tai-nam' }], rounds: 1, seconds: 300, events: [{ at: 0.02, kind: 'change-order' }] });
    C.update(7); C.update(0.5);   // mốc sự kiện tới trước khi khách ngồi xuống → thử lại khung sau
    const t = C.tickets[0];
    expect(t.changed).toBe(true); expect(t.dish).toBe('pho-dac-biet'); expect(t.steps).toEqual(C.recs['pho-dac-biet'].assembly);
  });
  it('sự kiện của level thật chạy được và bot vẫn qua level', () => {
    const L = levelById('pho-14');   // level có sự kiện mưa
    expect(L.events?.length).toBeGreaterThan(0);
    const C = new Counter({ dishes: L.dishes, arrivals: povArrivals(L), simplify: L.simplify, constraints: L.constraints, goal: L.goal, moneyTargets: L.moneyTargets, patience: L.patience, seconds: L.seconds, rush: L.rush, events: L.events, rnd: () => 0.37 });
    const seen = []; C.ev.onEvent = (k) => seen.push(k);
    play(C, L.seconds + 5);
    expect(seen.length).toBeGreaterThan(0);
    expect(C.result().stars).toBeGreaterThanOrEqual(1);
  }, 30000);
});
