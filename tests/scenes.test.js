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

  it('quán không bật graph vẫn dùng toạ độ đo tay cũ', () => {
    const s = sceneFor('cha-ca');
    expect(s.zones.pot).toEqual(ZONES.pot);
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
import { KITCHEN, KITCHEN_WOOD, zonesFrom, layersFrom, moveObj } from '../src/data/scene-graph.js';

describe('scene graph', () => {
  it('ô thả nằm gọn trong object mang nó', () => {
    const z = zonesFrom();
    for (const o of KITCHEN.filter((x) => x.zone)) {
      const b = z[o.zone];
      expect(b.x).toBeGreaterThanOrEqual(o.x);
      expect(b.y).toBeGreaterThanOrEqual(o.y);
      expect(b.x + b.w).toBeLessThanOrEqual(o.x + o.w + 0.01);
      expect(b.y + b.h).toBeLessThanOrEqual(o.y + o.h + 0.01);
      expect(b.w).toBeGreaterThan(8);   // đủ to cho ngón tay
      expect(b.h).toBeGreaterThan(5);
    }
  });

  it('dời object thì ô thả đi theo — không phải canh lại', () => {
    const base = zonesFrom();
    const pot = KITCHEN.find((o) => o.id === 'pot-blanch');
    const z = zonesFrom(moveObj(KITCHEN, 'pot-blanch', { y: pot.y + 6 }));
    expect(z.pot.y).toBeCloseTo(base.pot.y + 6, 1);
    expect(z.pot.x).toBeCloseTo(base.pot.x, 1);   // chỉ đổi cái mình đổi
    expect(z.sink).toEqual(zonesFrom().sink);
  });

  it('vẽ theo lớp: bg → mid → fg', () => {
    const order = layersFrom().map((o) => o.layer);
    const rank = { bg: 0, mid: 1, fg: 2 };
    for (let i = 1; i < order.length; i++) expect(rank[order[i]]).toBeGreaterThanOrEqual(rank[order[i - 1]]);
    expect(layersFrom().at(-1).id).toBe('prep-top');
  });

  it('quán bật graph thì lấy tranh nền riêng và không nướng đồ vô tranh', () => {
    const s = sceneFor('bun-bo');
    expect(s.src).toBe('art/scene/bg/bun-bo.webp');
    expect(s.baked).toEqual([]);
    expect(s.objs.length).toBe(KITCHEN.length);
  });
});

describe('biến thể object theo quán', () => {
  it('bản gỗ chỉ đổi hai mặt bàn, mọi thứ khác y nguyên', () => {
    const wood = Object.fromEntries(KITCHEN_WOOD.map((o) => [o.id, o]));
    for (const o of KITCHEN) {
      const w = wood[o.id];
      expect({ ...w, art: null }).toEqual({ ...o, art: null });   // hộp và ô thả không đổi
      if (['counter-back', 'prep-top'].includes(o.id)) expect(w.art).toMatch(/-wood\.webp$/);
      else expect(w.art).toBe(o.art);
    }
  });

  it('đổi bộ object không làm lệch ô thả', () => {
    expect(zonesFrom(KITCHEN_WOOD)).toEqual(zonesFrom(KITCHEN));
  });
});
