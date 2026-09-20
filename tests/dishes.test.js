// P6 — món là data: dishes/*.json hợp lệ, dựng được công thức game, bot 3 sao mọi level bằng công thức CHUNG.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DISHES, DISH_IDS } from '../src/data/dishes/index.js';
import { validateDish, dishToSim, buildGameData } from '../src/game/dishlib.js';
import { D, setSource, source, recipeFor, soupRecipeFor, label, tokenMatches } from '../src/game/recipes.js';
import { Counter, povOk, counterMove } from '../src/game/counter.js';
import { WORLDS, ALL_DISHES } from '../src/config.js';
import { povArrivals } from '../src/game/levels.js';
import { SIM_DATA } from '../src/data/sim-data.js';
import items from '../src/data/i18n/items.json';

function play(C, seconds = 600) { let acc = 0; for (let i = 0; i < seconds * 20 && !C.over; i++) { C.update(0.05); acc += 0.05; if (acc >= 0.35) { acc = 0; const m = counterMove(C); if (m) C.drop(m.src, m.zone); } } return C; }

describe('P6 dishes/', () => {
  it('21 món của quán đều có bản chung (giữ id → giữ art + tiến độ); món mới chỉ có ở game chính', () => {
    const shop = Object.keys(SIM_DATA.recipes);
    expect(shop.every((d) => DISHES[d])).toBe(true);
    expect(ALL_DISHES.every((d) => DISHES[d])).toBe(true);
    const onlyGame = DISH_IDS.filter((d) => !shop.includes(d));
    expect(onlyGame.sort()).toEqual(['bun-cha-ca', 'bun-thang', 'cao-lau', 'hu-tieu-nam-vang', 'mi-quang']);
  });
  it('mọi file hợp lệ theo schema; pron/gloss/region/codex có đủ', () => {
    for (const d of Object.values(DISHES)) {
      expect(validateDish(d), d.id).toEqual([]);
      expect(d.pron, `${d.id} pron`).toBeTruthy(); expect(d.gloss, `${d.id} gloss`).toBeTruthy();
      expect(['ha-noi', 'hai-phong', 'hue', 'da-nang', 'nha-trang', 'sai-gon', 'mien-tay']).toContain(d.region);
      expect(d.codex?.story, `${d.id} story`).toBeTruthy();
    }
  });
  it('validateDish bắt lỗi thường gặp', () => {
    expect(validateDish({ id: 'x' })).toContain('thiếu name');
    expect(validateDish({ ...DISHES['pho-tai-nam'], assembly: ['nam'] })).toContain("assembly phải bắt đầu bằng '$vessel'");
    expect(validateDish({ ...DISHES['pho-tai-nam'], assembly: ['$vessel', '$noodle', 'lạ'] })).toContain("assembly: token lạ 'lạ'");
    expect(validateDish({ ...DISHES['bun-rieu-cua'], broth: { cook: ['cot-cua'], out: 'x' } })).toContain('broth.cook cần action (pour-…)');
  });
  it('dishToSim: tô nước → base + base-ready; món khô → chuỗi sợi ở stages; cháo → level1-ready', () => {
    const p = dishToSim(DISHES['pho-tai-nam']); expect(p.base).toEqual({ noodle: 'pho-noodle', bowl: 'pho-bowl' }); expect(p.assembly[0]).toBe('base-ready'); expect(p.assembly.at(-1)).toBe('@pour-pho-broth');
    const bb = dishToSim(DISHES['bun-bo-hue']); expect(bb.base.workflow).toBe('noodle-hot-only');
    const bc = dishToSim(DISHES['bun-cha-ha-noi']); expect(bc.base).toBeNull(); expect(bc.assembly.slice(0, 2)).toEqual(['tray-ready', 'noodle-drained:bun']); expect(bc.extraStages.map((s) => s.action)).toContain('cold-rinse'); expect(bc.assembly.at(-1)).toBe('@finish');
    const cl = dishToSim(DISHES['chao-long']); expect(cl.assembly[0]).toBe('level1-ready'); expect(cl.extraStages.map((s) => s.action)).toEqual(['blanch-bowl', 'put-porridge-in-pot', 'add-water', 'heat-porridge', 'pour-porridge', 'cut-youtiao']);
    const pg = dishToSim(DISHES['pho-ga']); expect(pg.extraStages.find((s) => s.action === 'add-pho-broth')).toBeTruthy();
  });

  describe('nguồn game', () => {
    beforeAll(() => setSource('game')); afterAll(() => setSource('shop'));
    it('setSource đổi ruột D; recipeFor dựng được mọi món, mọi bước có trạm POV, giá từ dish.json', () => {
      expect(source()).toBe('game'); expect(D.recipes['bun-rieu-cua'].region).toBe('hue');
      for (const id of DISH_IDS) {
        const r = recipeFor(id); expect(r.assembly.length, id).toBeGreaterThan(1); expect(povOk(id), `${id} có bước không rơi vào trạm POV`).toBe(true);
        expect(r.price).toBe(DISHES[id].price);
        for (const tok of [...r.assembly, ...r.transforms.flatMap((t) => t.inputs)]) expect(label(tok), `${id}: ${tok} không có nhãn`).not.toMatch(/^\(/);
      }
      expect(soupRecipeFor('bun-rieu-cua').items).toEqual(['cot-cua', 'huyet', 'mieng-nuoc']);
      expect(soupRecipeFor('pho-ga').byAction['nuoc-pho']).toBe('add-pho-broth');
      expect(recipeFor('bun-dau-mam-tom').assembly).toContain('dau-hu');   // bản chung có đậu hũ (bản quán không)
    });
    it('bản chung KHÔNG trùng bản quán ở ít nhất một nửa số món (đúng ý Kent: không lấy công thức quán vào game chính)', () => {
      let diff = 0;
      const shop = Object.keys(SIM_DATA.recipes);
      for (const id of shop) { const g = recipeFor(id).assembly.join('>'); setSource('shop'); const s = recipeFor(id).assembly.join('>'); setSource('game'); if (g !== s) diff++; }
      expect(diff).toBeGreaterThanOrEqual(shop.length / 2);
    });
    it('i18n: gloss/pron của món lấy từ dish.json', async () => {
      const { gloss, pron, setLang } = await import('../src/i18n.js'); setLang('en');
      expect(gloss('pho-tai-nam')).toBe(DISHES['pho-tai-nam'].gloss); expect(pron('bun-bo-hue')).toBe('boon baw hway'); setLang('vi');
    });
  });
});

describe('P6.3 stations.json', () => {
  it('6 trạm POV + lò nước; mọi action của sim-data đều có trạm (trừ chuỗi nước/glue/finish)', async () => {
    const { STATIONS, stationForAction } = await import('../src/game/recipes.js');
    expect(STATIONS.map((s) => s.id)).toEqual(['pot', 'sink', 'prep', 'fryer', 'microwave', 'stovetop', 'burner']);
    const skip = new Set(['load-noodle', 'load-beef-ball', 'drain', 'put-noodle-in-bowl', 'finish', 'pour-chicken-broth', 'pour-pho-broth', 'pour-crab-broth', 'pour-bun-bo', 'pour-fish-broth']);
    const listed = new Set(STATIONS.flatMap((s) => s.actions));
    const miss = Object.keys(SIM_DATA.actions).filter((a) => !skip.has(a) && !listed.has(a));
    expect(miss).toEqual([]);
    expect(stationForAction('stir-fry-xao-lan')).toBe('stovetop'); expect(stationForAction('warm-rib')).toBe('pot'); expect(stationForAction('deep-fry')).toBe('fryer');
  });
});

describe('P6.4 thêm món bằng data, không sửa code', () => {
  it('một món giả (test-dish) đủ schema → dựng được, bot chơi được ở quầy, rồi bỏ đi không để lại gì', async () => {
    const test = { id: 'test-dish', name: 'Bún Thử', pron: 'boon thoo', gloss: 'test bowl', region: 'hue', price: 42,
      serve: { vessel: 'soup-bowl', hot: true }, noodle: { item: 'bun', flow: 'hot-once' },
      broth: { cook: ['nuoc-ca', 'mieng-nuoc'], out: 'fish-broth-ready', action: 'pour-fish-broth' },
      prep: [{ action: 'cut-fish-cake', in: ['cha-ca'], out: 'cha-ca-ready' }],
      assembly: ['$vessel', '$noodle', 'ca-chua', 'cha-ca-ready', '$broth', 'hanh-la'], codex: { story: 'x' }, real: null };
    expect(validateDish(test)).toEqual([]);
    const data = buildGameData({ ...DISHES, 'test-dish': test });
    setSource(data);
    try {
      expect(D.recipes['test-dish'].price).toBe(42);
      expect(povOk('test-dish')).toBe(true);
      const C = new Counter({ dishes: ['test-dish'], rounds: 3, patience: 900, gap: 0.1, rnd: () => 0.5 });
      play(C, 300); expect(C.result().served).toBe(3); expect(C.results.every((r) => r.mistakes === 0)).toBe(true);
    } finally { setSource('shop'); }
    expect(D.recipes['test-dish']).toBeUndefined();
  });
  it('scripts/add_dish.mjs --scaffold tạo file mẫu hợp lệ, chạy lại báo thiếu asset (exit 2), xoá sạch', async () => {
    const { execFileSync } = await import('node:child_process'); const fs = await import('node:fs'); const path = await import('node:path');
    const root = path.join(import.meta.dirname, '..'); const f = path.join(root, 'src', 'data', 'dishes', 'zz-test-dish.json');
    const run = (a) => { try { return { out: execFileSync('node', ['scripts/add_dish.mjs', ...a], { cwd: root, encoding: 'utf8' }), code: 0 }; } catch (e) { return { out: e.stdout, code: e.status }; } };
    try {
      expect(run(['zz-test-dish']).code).toBe(1);
      expect(run(['zz-test-dish', '--scaffold']).code).toBe(0); expect(fs.existsSync(f)).toBe(true);
      const r = run(['zz-test-dish', '--json']); expect(r.code).toBe(2); const j = JSON.parse(r.out); expect(j.missing.some((m) => /zz-test-dish-dry/.test(m))).toBe(true); expect(j.steps[0]).toBe('base-ready');
    } finally { if (fs.existsSync(f)) fs.unlinkSync(f); execFileSync('node', ['scripts/_art_manifest.mjs'], { cwd: root }); }
  }, 30000);
});
