import { describe, it, expect } from 'vitest';
import { recipeFor, transformsFor, assemblyFor, label, D } from '../src/game/recipes.js';

describe('phở tái nạm', () => {
  const r = recipeFor('pho-tai-nam');
  it('chuỗi ráp giữ đúng thứ tự bếp thật', () => {
    expect(r.assembly).toEqual(['bowl-hot:pho-bowl', 'noodle-drained:pho-noodle', 'nam', 'bo-tai', 'hanh-tay', 'ngo-ri-ngo-gai', 'hanh-la', 'broth:pour-pho-broth']);
  });
  it('sợi phở đi nóng → xả lạnh → nóng lại (3 lần ghé trạm), tô trụng ở nồi', () => {
    const t = r.transforms.map((x) => `${x.station}:${x.input}>${x.output}`);
    expect(t).toEqual(['pot:pho-noodle>noodle-blanched:pho-noodle', 'sink:noodle-blanched:pho-noodle>noodle-rinsed:pho-noodle', 'pot:noodle-rinsed:pho-noodle>noodle-drained:pho-noodle', 'pot:pho-bowl>bowl-hot:pho-bowl']);
    expect(r.transforms[0].passive).toBe(true);
    expect(r.transforms[1].passive).toBe(false);
  });
  it('mọi thứ lên UI có nhãn tiếng Việt, không lộ id', () => {
    for (const tok of [...r.assembly, ...r.transforms.map((t) => t.output)]) {
      const l = label(tok);
      expect(l.startsWith('(')).toBe(false);
      expect(l).not.toMatch(/-/);
    }
  });
});

describe('bún bò Huế khác phở đúng chỗ bếp thật khác', () => {
  it('chỉ trụng một lần, không xả lạnh', () => {
    const t = transformsFor('bun-bo-hue');
    expect(t.some((x) => x.station === 'sink')).toBe(false);
    expect(t.find((x) => x.input === 'bun-to').output).toBe('noodle-drained:bun-to');
    expect(t.find((x) => x.input === 'bun-to').action).toBe('blanch-noodle-once');
  });
});

describe('phở đặc biệt', () => {
  it('bò viên trụng riêng ở nồi (passive) và vào tô sau bò tái', () => {
    const t = transformsFor('pho-dac-biet').find((x) => x.input === 'bo-vien');
    expect(t).toMatchObject({ station: 'pot', output: 'bo-vien-ready', passive: true });
    const a = assemblyFor('pho-dac-biet');
    expect(a.indexOf('bo-vien-ready')).toBeGreaterThan(a.indexOf('bo-tai'));
  });
});

describe('dữ liệu nguồn còn nguyên', () => {
  it('có 21 món, workflows đúng tên', () => {
    expect(Object.keys(D.recipes).length).toBe(21);
    expect(Object.keys(D.workflows)).toEqual(['noodle-base', 'noodle-hot-only']);
  });
});
