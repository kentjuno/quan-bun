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
      expect(s.src).toMatch(new RegExp(`art/scene/(room/)?${w}\\.webp$`));
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
    expect(base.zones.pot).toEqual(ZONES.pot);
  });

  it('quán kiểu phòng trống: tranh ở room/, 5 đồ tĩnh thành sprite, rơi về tranh nguyên tấm', () => {
    for (const [w, s] of Object.entries(SHOP_SCENES)) {
      const sc = sceneFor(w);
      if (s.room) {
        expect(sc.src).toBe(`art/scene/room/${w}.webp`);
        expect(sc.baked).toEqual([]);
        expect(sc.fallback).toBe(`art/scene/${w}.webp`);
      } else {
        expect(sc.baked).toEqual(SCENE.baked);
      }
    }
  });
});
