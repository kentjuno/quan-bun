// M3 — sổ tay: 21/21 món có codex + công thức thật (vi/en, ≥2 nguồn); mở khoá theo sao; bước ráp chỉ từ bản chung.
import { describe, it, expect, beforeAll } from 'vitest';
import { DISHES, DISH_IDS } from '../src/data/dishes/index.js';
import { SIM_DATA } from '../src/data/sim-data.js';

beforeAll(() => { const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } }; });

describe('M3 sổ tay', () => {
  it('21/21 món có chuyện + cách ăn + công thức thật vi/en đủ mục, ≥2 nguồn có URL', () => {
    const miss = [];
    for (const id of DISH_IDS) {
      const d = DISHES[id]; if (!d.codex?.story || !d.codex?.how_to_eat) miss.push(`${id}: codex`);
      const r = d.real; if (!r) { miss.push(`${id}: real`); continue; }
      for (const L of ['vi', 'en']) { const x = r[L]; for (const k of ['servings', 'time', 'ingredients', 'prep', 'assemble', 'serve', 'tips', 'sources']) if (!x?.[k] || (Array.isArray(x[k]) && !x[k].length)) miss.push(`${id}.${L}.${k}`); if ((x?.sources || []).filter((s) => /^https?:\/\//.test(s.url)).length < 2) miss.push(`${id}.${L}: nguồn`); }
    }
    expect(miss).toEqual([]);
  });
  it('mở khoá theo sao: trang khi bưng sạch, công thức game ≥1★, công thức thật ≥6★', async () => {
    const P = await import('../src/game/progress.js'); const C = await import('../src/codex.js'); const M = await import('../src/game/mastery.js');
    expect(C.RECIPE_STARS).toBe(6);
    expect(C.pageOpen('pho-tai-nam')).toBe(false); expect(C.codexCount()).toBe(0);
    M.recordResult({ errors: [], stats: { bowls: [{ dish: 'pho-tai-nam', mistakes: 0, wait: 20, servedAt: 20 }] } });
    expect(C.pageOpen('pho-tai-nam')).toBe(true); expect(C.gameRecipeOpen('pho-tai-nam')).toBe(false);
    P.recordLevel('pho-1', { stars: 3, money: 100, tips: 0 }); expect(C.dishStars('pho-tai-nam')).toBe(3); expect(C.gameRecipeOpen('pho-tai-nam')).toBe(true); expect(C.realRecipeOpen('pho-tai-nam')).toBe(false);
    P.recordLevel('pho-2', { stars: 3, money: 100, tips: 0 }); expect(C.realRecipeOpen('pho-tai-nam')).toBe(true);
    const n = P.codexNew(['pho-tai-nam'], C.pageOpen, C.realRecipeOpen); expect(n.map((x) => x.kind)).toEqual(['codex', 'recipe']);
    expect(P.codexNew(['pho-tai-nam'], C.pageOpen, C.realRecipeOpen)).toEqual([]);   // báo một lần
  });
  it('bước ráp trong sổ tay lấy từ bản chung, không lọt bản quán', async () => {
    const C = await import('../src/codex.js'); const R = await import('../src/game/recipes.js');
    const steps = C.gameSteps('bun-dau-mam-tom'); expect(steps.join(' ')).toMatch(/Đậu hũ/); expect(R.source()).toBe('shop');
    const src = (await import('node:fs')).readFileSync(new URL('../src/codex.js', import.meta.url), 'utf8'); expect(/import[^;]*sim-data/.test(src)).toBe(false);
    expect(SIM_DATA.recipes['bun-dau-mam-tom'].assembly.includes('dau-hu')).toBe(false);
  });
});
