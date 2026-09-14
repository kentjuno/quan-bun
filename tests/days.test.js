import { describe, it, expect } from 'vitest';
import { DAYS, makeDayArrivals, modsFor, dayAfter, UPGRADES } from '../src/config.js';
import { World } from '../src/game/world.js';
import { REGULARS, regularsFor, lineFor, recapLine } from '../src/data/customers.js';
import { botDecide } from '../src/game/bot.js';

describe('ngày ở quán', () => {
  it('21 ngày, mỗi ngày thêm tối đa một món, menu chỉ lớn dần', () => {
    expect(DAYS.length).toBe(21);
    for (let i = 1; i < DAYS.length; i++) { expect(DAYS[i].dishes.length - DAYS[i - 1].dishes.length).toBeLessThanOrEqual(1); expect(DAYS[i].dishes.slice(0, DAYS[i - 1].dishes.length)).toEqual(DAYS[i - 1].dishes); }
    expect(DAYS[20].dishes.length).toBe(18); expect(dayAfter(30).dishes.length).toBe(18);
  });
  it('khách sinh có seed: cùng ngày → cùng danh sách; có 3 pha; khách quen ghé; cuối tuần có đoàn', () => {
    const d = DAYS[6]; const regs = regularsFor(d.day, d.dishes).map((r) => r.id);
    const a = makeDayArrivals(d.day, d.dishes, d.newDish, regs, d.seconds); const b = makeDayArrivals(d.day, d.dishes, d.newDish, regs, d.seconds);
    expect(a).toEqual(b);
    expect(a.filter((x) => x.t < d.seconds * 0.42).length).toBeGreaterThan(a.filter((x) => x.t >= d.seconds * 0.42 && x.t < d.seconds * 0.62).length);   // trưa đông hơn xế
    expect(a.filter((x) => x.regular).map((x) => x.regular).sort()).toEqual(regs.slice().sort());
    expect(a.filter((x) => x.group === 'tour').length).toBe(4);
    expect(a.every((x) => x.t < d.seconds * 0.93)).toBe(true);
  });
  it('khách quen có món ruột trong menu và thoại đủ 6 loại', () => {
    for (const r of REGULARS) { expect(DAYS.some((d) => d.dishes.includes(r.dish))).toBe(true); for (const k of ['sit', 'wait', 'good', 'wrong', 'leave', 'recap']) expect(r.lines[k].length).toBeGreaterThan(0); }
    expect(regularsFor(1, DAYS[0].dishes).map((r) => r.id)).toEqual(['cau-hai']);
    expect(lineFor({ regular: 'di-ba' }, 'sit')).toMatch(/dì|Dì|chợ|đông/);
    expect(recapLine('cau-hai', true)).toBeTruthy();
  });
  it('World ngày 2: khách quen ngồi, nói, ăn xong nói rồi trả ghế; bot phục vụ được', () => {
    const said = []; const w = new World(DAYS[1], { onSpeak: (cu, k, t) => said.push([cu.name, k, t]) }, undefined, modsFor({}, 0));
    expect(w.shift.arrivals.length).toBeGreaterThan(5);
    for (let i = 0; i < 4000 && w.state === 'running'; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(0.1); }
    const cau = w.customers.find((c) => c.regular === 'cau-hai'); expect(cau).toBeTruthy(); expect(cau.dish).toBe('pho-tai-nam');
    expect(said.some(([n, k]) => n === 'Cậu Hai' && k === 'sit')).toBe(true);
    expect(w.result.regulars.map((r) => r.id)).toContain('cau-hai'); expect(w.result.day).toBe(2);
    expect(w.served).toBeGreaterThan(3);
  });
  it('nâng cấp đổi thông số bếp: lò, bàn, chồng tô, tốc độ, kiên nhẫn', () => {
    const m = modsFor({ burners: 2, seats: 1, 'bowl-stack': 2, shoes: 1 }, 3);
    expect(m.burners).toBe(3); expect(m.seats).toBe(4); expect(m.bowlSlots).toBe(5); expect(m.speedMult).toBeCloseTo(1.12); expect(m.patienceMult).toBeCloseTo(1.18);
    const w = new World(DAYS[2], {}, undefined, m);
    expect(w.stations.find((s) => s.type === 'burner').slots.length).toBe(3); expect(w.seats.length).toBe(4); expect(w.pot.bowlSlots).toBe(5);
    const w0 = new World(DAYS[2], {}, undefined, modsFor({}, 0)); expect(w0.stations.find((s) => s.type === 'burner').slots.length).toBe(1); expect(w0.seats.length).toBe(3);
    expect(UPGRADES.every((u) => u.levels.length >= 2)).toBe(true);
  });
});
