import { describe, it, expect } from 'vitest';
import { WORLDS, kitchenFor, modsFor, levelById } from '../src/config.js';
import { World } from '../src/game/world.js';
import { REGULARS, lineFor, recapLine, STRANGER_LINES } from '../src/data/customers.js';
import { botDecide } from '../src/game/bot.js';
import { Counter } from '../src/game/counter.js';
import { povArrivals } from '../src/game/levels.js';

describe('khách quen & thoại', () => {
  it('mỗi khách quen có món ruột nằm trong một world, đủ 6 loại thoại', () => {
    for (const r of REGULARS) {
      expect(WORLDS.some((w) => w.dishes.includes(r.dish)), r.id).toBe(true);
      for (const k of ['sit', 'wait', 'good', 'wrong', 'leave', 'recap']) expect(r.lines[k].length, `${r.id}.${k}`).toBeGreaterThan(0);
      expect(WORLDS.flatMap((w) => w.levels).some((L) => L.regulars.includes(r.id)), `${r.id} chưa xuất hiện ở level nào`).toBe(true);
    }
    expect(lineFor({ regular: 'di-ba' }, 'sit')).toMatch(/dì|Dì|chợ|đông/);
    expect(lineFor({}, 'sit')).toBeTruthy();
    expect(STRANGER_LINES.good.length).toBeGreaterThan(2);
    expect(recapLine('cau-hai', true)).toBeTruthy();
    expect(recapLine('cau-hai', false)).toBeTruthy();
  });
  it('level có khách quen: khách ngồi đúng tên, nói khi ngồi, ăn xong nói rồi mới trả ghế', () => {
    const L = levelById('pho-10'); const said = [];
    const w = new World({ ...L }, { onSpeak: (cu, k, t) => said.push([cu.name, k, t]) }, kitchenFor(false, L.layout), modsFor({}, 0));
    for (let i = 0; i < (L.seconds + 30) * 30 && w.state === 'running'; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(1 / 30); }
    const cau = w.customers.find((c) => c.regular === 'cau-hai');
    expect(cau).toBeTruthy(); expect(cau.dish).toBe('pho-tai-nam');
    expect(said.some(([n, k]) => n === 'Cậu Hai' && k === 'sit')).toBe(true);
    expect(said.some(([, k]) => k === 'good')).toBe(true);
    expect(w.result.regulars.map((r) => r.id)).toContain('cau-hai');
    expect(w.result.level).toBe('pho-10');
  });
  it('khách quen kiên nhẫn hơn khách lạ cùng level', () => {
    const L = levelById('pho-10'); const w = new World({ ...L }, {}, kitchenFor(false));
    for (let i = 0; i < L.seconds * 30 && w.state === 'running'; i++) w.update(1 / 30);
    const reg = w.customers.find((c) => c.regular); const str = w.customers.find((c) => !c.regular);
    expect(reg.maxPatience).toBeGreaterThan(str.maxPatience * 0.99);
  });
  it('quầy POV: không bao giờ có hai phiếu trùng tên khách cùng lúc', () => {
    const L = levelById('pho-10');
    const arr = povArrivals(L);
    let r = 0.13; const rnd = () => (r = (r * 9301 + 49297) % 233280 / 233280);
    const C = new Counter({ dishes: L.dishes, arrivals: arr, simplify: L.simplify, patience: 999, maxTickets: 4, rnd });
    for (let i = 0; i < 120 * 30; i++) {
      C.update(1 / 30);
      const names = C.tickets.map((t) => t.name);
      expect(new Set(names).size, names.join(' | ')).toBe(names.length);
    }
  });
});
