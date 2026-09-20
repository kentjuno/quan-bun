// P7 / M6 — log playtest: chỉ ghi khi bật, tô đầu đánh dấu `first`, tóm tắt đúng, không gửi đi đâu.
import { describe, it, expect, vi } from 'vitest';

function stub(search = '?log=1') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.location = { search };
  return store;
}
const fresh = async (search) => { stub(search); vi.resetModules(); return import('../src/playlog.js'); };

describe('playlog', () => {
  it('tắt mặc định — không ghi gì', async () => {
    const L = await fresh('');
    expect(L.logOn()).toBe(false);
    expect(L.ev('serve', { dish: 'pho' })).toBe(null);
    expect(L.readLog()).toEqual([]);
  });

  it('?log=1 thì ghi, tô đầu có cờ first', async () => {
    const L = await fresh('?log=1');
    expect(L.logOn()).toBe(true);
    L.ev('level.start', { id: 'pho-1' });
    const a = L.ev('serve', { dish: 'pho-tai-nam' });
    const b = L.ev('serve', { dish: 'pho-tai-nam' });
    expect(a.first).toBe(true);
    expect(b.first).toBeUndefined();
    expect(L.firstBowlAt()).toBeTypeOf('number');
    const rows = L.readLog();
    expect(rows.length).toBe(3);
    expect(rows.every((r) => typeof r.at === 'number' && r.type)).toBe(true);
  });

  it('tóm tắt trả lời đúng câu hỏi của P7', async () => {
    const L = await fresh('?log=1');
    L.ev('boot', { lang: 'en' });
    L.ev('level.start', { id: 'pho-1' });
    L.ev('serve', { dish: 'pho-tai-nam' });
    L.ev('level.end', { id: 'pho-1', stars: 2 });
    L.ev('level.start', { id: 'pho-2' });
    L.ev('level.quit', { id: 'pho-2' });
    L.ev('codex.open', { dish: 'pho-tai-nam' });
    L.ev('tut.skip');
    const s = L.summary();
    expect(s.levelsStarted).toBe(2);
    expect(s.levelsFinished).toBe(1);
    expect(s.quits).toBe(1);
    expect(s.starsBest).toBe(2);
    expect(s.codexOpened).toBe(1);
    expect(s.tutorial).toBe('skip');
    expect(s.firstBowlAt).not.toBe(null);
  });

  it('xoá log thì sạch', async () => {
    const L = await fresh('?log=1');
    L.ev('serve', {}); L.clearLog();
    expect(L.readLog()).toEqual([]);
    expect(L.firstBowlAt()).toBe(null);
  });
});
