import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world.js';
import { NavGrid } from '../src/game/nav.js';
import { SHIFTS, KITCHEN_LANDSCAPE, KITCHEN_PORTRAIT } from '../src/config.js';

for (const [name, K] of [['ngang', KITCHEN_LANDSCAPE], ['dọc', KITCHEN_PORTRAIT]]) {
  describe(`đường đi — bố trí ${name}`, () => {
    // ca có đủ mọi trạm (lò vi sóng, thớt, lò đun, …) để kiểm hết chỗ đứng
    const w = new World({ ...SHIFTS[0], dishes: ['pho-suon-tai', 'banh-da-cua', 'bun-cha-ha-noi', 'chao-long'] }, {}, K);
    it('mọi điểm đứng của trạm đều tới được từ chỗ đầu bếp xuất phát, và điểm đứng không nằm trong vật cản', () => {
      for (const s of w.stations) {
        if (s.type === 'seat') continue;
        const cell = w.nav.toCell(s.stand.x, s.stand.z);
        expect(w.nav.free(cell.c, cell.r), `${s.id} stand blocked`).toBe(true);
        const p = w.nav.path(w.chef.x, w.chef.z, s.stand.x, s.stand.z);
        expect(p.length, `${s.id} no path`).toBeGreaterThan(0);
        expect(p[p.length - 1]).toEqual({ x: s.stand.x, z: s.stand.z });
      }
    });
    it('đường đi không cắt qua footprint trạm nào', () => {
      const inside = (pt) => w.nav.rects.some((r) => Math.abs(pt.x - r.x) < r.w / 2 && Math.abs(pt.z - r.z) < r.d / 2);
      const ids = w.stations.filter((s) => s.type !== 'seat').map((s) => s.id);
      for (const a of ids) for (const b of ids) {
        if (a === b) continue;
        const A = w.stationById[a].stand, B = w.stationById[b].stand;
        const path = w.nav.path(A.x, A.z, B.x, B.z); let from = A;
        for (const to of path) { for (let t = 0; t <= 1; t += 0.05) expect(inside({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }), `${a}→${b}`).toBe(false); from = to; }
      }
    });
  });
}

describe('đầu bếp đi vòng qua quầy ráp thay vì xuyên', () => {
  it('từ kệ tô sang kệ topping (hai bên quầy) đường đi có nhiều hơn 1 điểm', () => {
    const w = new World(SHIFTS[3], {}, KITCHEN_LANDSCAPE);
    const A = w.stationById['shelf-bowl'].stand, B = w.stationById['shelf-topping'].stand;
    const p = w.nav.path(A.x, A.z, B.x, B.z);
    expect(p.length).toBeGreaterThan(1);
  });
});
