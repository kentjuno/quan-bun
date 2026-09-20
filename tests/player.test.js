// Hồ sơ người chơi: tên + xưng hô. Giới tính CHỈ đổi thoại (Kent 20/09), không có bộ ảnh thứ hai.
import { describe, it, expect, vi } from 'vitest';
import { QUAN, PIECES } from '../src/data/regions.js';

function stub() {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  return m;
}
const fresh = async () => { stub(); vi.resetModules(); return import('../src/data/player.js'); };

describe('player', () => {
  it('chưa setup thì rỗng, {you} rơi về cách gọi của quán', async () => {
    const P = await fresh();
    expect(P.setupDone()).toBe(false);
    expect(P.speak('Vô đây {you} ơi', 'con')).toBe('Vô đây con ơi');
  });

  it('có tên thì chủ quán gọi tên', async () => {
    const P = await fresh();
    P.setPlayer({ name: 'Kent', gender: 'm', done: true });
    expect(P.playerName()).toBe('Kent');
    expect(P.speak('Vô đây {you} ơi', 'con')).toBe('Vô đây Kent ơi');
  });

  it('giới tính đổi xưng hô, không nói thì lấy vế đầu', async () => {
    const P = await fresh();
    P.setPlayer({ gender: 'f', done: true });
    expect(P.speak('{anh|chị} ăn cay được không?')).toBe('chị ăn cay được không?');
    P.setPlayer({ gender: 'm' });
    expect(P.speak('{anh|chị} ăn cay được không?')).toBe('anh ăn cay được không?');
    P.setPlayer({ gender: 'x' });
    expect(P.speak('{anh|chị} ăn cay được không?')).toBe('anh ăn cay được không?');
  });

  it('cách gọi mặc định cũng theo giới tính được (lồng {a|b} trong {you})', async () => {
    const P = await fresh();
    P.setPlayer({ gender: 'f', done: true });
    expect(P.speak('Hả {you}?', '{cậu|cô}')).toBe('Hả cô?');
  });

  it('tên bị dọn sạch: cắt ngắn, bỏ thẻ HTML', async () => {
    const P = await fresh();
    expect(P.cleanName('  Kent   Juno  ')).toBe('Kent Juno');
    expect(P.cleanName('<script>x</script>')).toBe('scriptx/script');
    expect(P.cleanName('x'.repeat(50)).length).toBe(P.MAX_NAME);
  });

  it('mọi quán có `call`, mọi thoại dùng {you} đều giải được', async () => {
    const P = await fresh();
    for (const [id, q] of Object.entries(QUAN)) {
      expect(q.call, `quán ${id} thiếu call`).toBeTruthy();
      for (const line of [q.greet, q.dare]) expect(P.speak(line, q.call)).not.toMatch(/\{/);
    }
    for (const [id, pc] of Object.entries(PIECES)) {
      expect(pc.call, `mảnh ${id} thiếu call`).toBeTruthy();
      expect(P.speak(pc.bubble, pc.call)).not.toMatch(/\{/);
    }
  });
});
