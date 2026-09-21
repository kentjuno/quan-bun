// Bếp riêng từng quán: mọi quán có mục, toạ độ trạm đủ, quán lạ rơi về bếp gốc.
import { describe, it, expect } from 'vitest';
import { SHOP_SCENES, sceneFor } from '../src/data/scenes.js';
import { SCENE, ZONES } from '../src/data/counter-layout.js';
import { QUAN } from '../src/data/regions.js';

describe('bếp theo quán', () => {
  it('mọi quán trong QUAN đều có bếp riêng', () => {
    expect(Object.keys(QUAN).filter((w) => !(w in SHOP_SCENES))).toEqual([]);
  });

  it('sceneFor trả đủ toạ độ trạm và ảnh riêng', () => {
    for (const w of Object.keys(QUAN)) {
      const s = sceneFor(w);
      expect(s.src).toMatch(new RegExp(`art/scene/(room/|bg/)?${w}\\.webp$`));
      expect(s.fallback).toBeTruthy();
      expect(Object.keys(s.zones).sort()).toEqual(Object.keys(ZONES).sort());
    }
  });

  it('quán lạ / không có world → bếp gốc', () => {
    for (const w of [undefined, null, 'khong-co-quan-nay']) {
      const s = sceneFor(w);
      expect(s.src).toBe(SCENE.src);
      expect(s.zones).toBe(ZONES);
    }
  });

  it('ghi đè zones chỉ đổi ô được ghi, giữ nguyên ô khác', () => {
    const base = sceneFor('pho');
    for (const q of ['x', 'y', 'w', 'h']) expect(base.zones.pot[q]).toBeCloseTo(ZONES.pot[q], 1);
  });

  it('quán kiểu phòng trống: tranh ở room/, 5 đồ tĩnh thành sprite, rơi về tranh nguyên tấm', () => {
    for (const [w, s] of Object.entries(SHOP_SCENES)) {
      const sc = sceneFor(w);
      if (s.graph) {
        expect(sc.src).toBe(`art/scene/bg/${w}.webp`);
        expect(sc.baked).toEqual([]);
        expect(sc.fallback).toBe(`art/scene/room/${w}.webp`);
      } else if (s.room) {
        expect(sc.src).toBe(`art/scene/room/${w}.webp`);
        expect(sc.baked).toEqual([]);
        expect(sc.fallback).toBe(`art/scene/${w}.webp`);
      } else {
        expect(sc.baked).toEqual(SCENE.baked);
      }
    }
  });
});

// SCENE GRAPH: object chính là ô thả
import { KITCHEN, zonesFrom, layersFrom, moveObj } from '../src/data/scene-graph.js';

describe('scene graph', () => {
  it('ô thả suy từ object khớp đúng toạ độ đo tay cũ', () => {
    const z = zonesFrom();
    for (const k of ['pot', 'sink', 'burner']) {
      for (const q of ['x', 'y', 'w', 'h']) expect(z[k][q]).toBeCloseTo(ZONES[k][q], 1);
    }
  });

  it('dời object thì ô thả đi theo — không phải canh lại', () => {
    const moved = moveObj(KITCHEN, 'pot-blanch', { y: 27.5 + 6 });
    const z = zonesFrom(moved);
    expect(z.pot.y).toBeCloseTo(ZONES.pot.y + 6, 1);
    expect(z.pot.x).toBeCloseTo(ZONES.pot.x, 1);   // chỉ đổi cái mình đổi
    expect(z.sink).toEqual(zonesFrom().sink);
  });

  it('vẽ theo lớp: bg → mid → fg', () => {
    const order = layersFrom().map((o) => o.layer);
    const rank = { bg: 0, mid: 1, fg: 2 };
    for (let i = 1; i < order.length; i++) expect(rank[order[i]]).toBeGreaterThanOrEqual(rank[order[i - 1]]);
    expect(layersFrom().at(-1).id).toBe('counter-front');
  });

  it('quán bật graph thì lấy tranh nền riêng và không nướng đồ vô tranh', () => {
    const s = sceneFor('bun-bo');
    expect(s.src).toBe('art/scene/bg/bun-bo.webp');
    expect(s.baked).toEqual([]);
    expect(s.objs.length).toBe(KITCHEN.length);
  });
});
