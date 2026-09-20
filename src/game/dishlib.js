// P6 — Món là DATA: src/data/dishes/<id>.json (công thức CHUNG Việt Nam, không phải bản quán) → bản ghi kiểu sim-data
// để engine (recipes.js / counter.js / bot) chạy y như cũ. Thêm món = thêm file JSON (+ art), không sửa code.
//
// Schema dishes/<id>.json (v1):
//   id, name (tiếng Việt, KHÔNG dịch), pron, gloss (en), region (id tỉnh — data/regions.js ở M2), price (k)
//   serve:   { vessel: 'pho-bowl'|'soup-bowl'|'dry-bowl'|'tray'|'dia-dai'|..., hot?: true, liner?: 'tray-paper' }
//            hot → trụng tô ở nồi trước khi ráp (bowl-hot:<vessel>); liner → lót giấy ở thớt (tray-ready)
//   noodle?: { item: 'pho-noodle'|'bun'|'bun-to'|'banh-da'|'banh-hoi', flow: 'hot-rinse-hot'|'hot-once' }
//   broth?:  { action: 'pour-pho-broth' }                                         — nước có sẵn ở kệ nước
//          | { cook: ['cot-cua','huyet','mieng-nuoc'], out: 'crab-broth-ready', action: 'pour-crab-broth' } — nấu ở lò
//          | { cook: ['chao-long','mieng-nuoc'], out: 'porridge-ready', porridge: true }                    — cháo (rót ở thớt)
//   prep?:   [ { action: 'pound-beef', in: ['bo-tai','gung'], out: 'tai-dap-ready' }, … ]   trạm suy từ action (recipes.js)
//   assembly: [ '$vessel', '$noodle', 'nam', …, '$broth', 'hanh-la' ]   thứ tự bỏ vào tô; token = item id hoặc `out` của prep/broth
//   codex:   { story, region_note, how_to_eat, review }   — sổ tay (M3); review = 'cần Kent duyệt' cho tới khi duyệt
//   real:    null | { servings, ingredients: [{ item, qty }], steps: [], sources: [] }   — công thức nấu thật (M3)
import { SIM_DATA } from '../data/sim-data.js';
import { GAME_EXTRAS as EXTRA } from '../data/game-extras.js';

/** Từ điển của GAME CHÍNH = đồ bếp quán (sim-data, KHÔNG sửa) + đồ riêng của món chung (game-extras.json). */
export const SIM = {
  ...SIM_DATA,
  items: { ...SIM_DATA.items, ...EXTRA.items },
  actions: { ...SIM_DATA.actions, ...EXTRA.actions },
  labels: { ...SIM_DATA.labels, ...EXTRA.labels },
};
export const FLOWS = ['hot-rinse-hot', 'hot-once'];
const REQ = ['id', 'name', 'region', 'price', 'serve', 'assembly'];
/** Bước cho từng thứ vào nồi nước (soupRecipeFor dùng action để biết lấy ở đâu: kệ nước / bồn / khay). Có thể ghi đè bằng { item, action } trong broth.cook. */
export const COOK_ACTION = { huyet: 'add-blood', 'mieng-nuoc': 'add-water', 'nuoc-pho': 'add-pho-broth' };

/** Kiểm schema + tham chiếu (item/action có trong sim-data hoặc `extra`). Trả về [] nếu ok. */
export function validateDish(d, items = SIM.items, actions = SIM.actions) {
  const e = [];
  if (!d || typeof d !== 'object') return ['không phải object'];
  for (const k of REQ) if (d[k] == null || d[k] === '') e.push(`thiếu ${k}`);
  if (d.id && !/^[a-z0-9-]+$/.test(d.id)) e.push(`id chỉ a-z0-9-: ${d.id}`);
  if (typeof d.price !== 'number' || d.price <= 0) e.push('price phải là số > 0');
  const item = (t, where) => { if (!items[t]) e.push(`${where}: item lạ '${t}'`); };
  const act = (a, where) => { if (!actions[a]) e.push(`${where}: action lạ '${a}'`); };
  if (d.serve) { item(d.serve.vessel, 'serve.vessel'); if (d.serve.liner) item(d.serve.liner, 'serve.liner'); }
  if (d.noodle) { item(d.noodle.item, 'noodle.item'); if (!FLOWS.includes(d.noodle.flow)) e.push(`noodle.flow phải là ${FLOWS.join('|')}`); }
  if (d.broth) {
    if (d.broth.cook) { d.broth.cook.forEach((t) => item(typeof t === 'string' ? t : t?.item, 'broth.cook')); if (!d.broth.out) e.push('broth.cook cần out'); if (!d.broth.porridge && !d.broth.action) e.push('broth.cook cần action (pour-…)'); }
    else if (!d.broth.action) e.push('broth cần action hoặc cook');
    if (d.broth.action) act(d.broth.action, 'broth.action');
  }
  const outs = new Set([...(d.prep || []).map((p) => p.out), d.broth?.out].filter(Boolean));
  for (const p of d.prep || []) { act(p.action, `prep ${p.out}`); (p.in || []).forEach((t) => { if (!items[t] && !outs.has(t)) e.push(`prep ${p.out}: in lạ '${t}'`); }); if (!p.out) e.push('prep thiếu out'); }
  const asm = d.assembly || [];
  if (asm[0] !== '$vessel') e.push("assembly phải bắt đầu bằng '$vessel'");
  if (d.noodle && asm[1] !== '$noodle') e.push("có noodle thì assembly[1] phải là '$noodle'");
  if (!d.noodle && asm.includes('$noodle')) e.push('assembly có $noodle nhưng không khai noodle');
  if (d.broth && !d.broth.porridge && !asm.includes('$broth')) e.push('có broth thì assembly phải có $broth');
  for (const t of asm) { if (t.startsWith('$')) { if (!['$vessel', '$noodle', '$broth'].includes(t)) e.push(`token lạ ${t}`); continue; } if (!items[t] && !outs.has(t)) e.push(`assembly: token lạ '${t}'`); }
  if (new Set(asm).size !== asm.length) e.push('assembly có token lặp');
  return e;
}

/** dish.json → bản ghi kiểu sim-data { name, menuCode, base?, extraStages, assembly, price, region, codex, real } + labels sinh thêm. */
export function dishToSim(d) {
  const stages = []; const labels = {};
  let base = null; const asm = [];
  const v = d.serve.vessel;
  const hotBowl = !!d.serve.hot;
  const soupStyle = !!(d.noodle && hotBowl);   // tô nước: base như sim (tô nóng + sợi ráo = base-ready)
  if (soupStyle) base = { noodle: d.noodle.item, bowl: v, ...(d.noodle.flow === 'hot-once' ? { workflow: 'noodle-hot-only' } : {}) };
  // vỏ
  let vesselTok = v;
  if (d.serve.liner) { stages.push({ id: 'prepare-tray', kind: 'action', action: 'prepare-tray', requires: [v, d.serve.liner], creates: 'tray-ready' }); vesselTok = 'tray-ready'; }
  else if (hotBowl && !soupStyle) { stages.push({ id: 'blanch-bowl', kind: 'action', action: 'blanch-bowl', requires: [v], creates: 'bowl-ready' }); vesselTok = 'bowl-ready'; }
  // sợi cho món khô (tô nước đã nằm trong base)
  let noodleTok = null;
  if (d.noodle && !soupStyle) {
    const n = d.noodle.item; const p = `dry-${n}`;
    if (d.noodle.flow === 'hot-once') stages.push({ id: `${p}-blanch`, kind: 'action', action: 'blanch-noodle-once', requires: [n], creates: `noodle-drained:${n}` });
    else {
      stages.push({ id: `${p}-blanch`, kind: 'action', action: 'blanch-noodle', requires: [n], creates: `noodle-blanched:${n}` });
      stages.push({ id: `${p}-rinse`, kind: 'action', action: 'cold-rinse', requires: [`noodle-blanched:${n}`], creates: `noodle-rinsed:${n}` });
      stages.push({ id: `${p}-reblanch`, kind: 'action', action: 'reblanch', requires: [`noodle-rinsed:${n}`], creates: `noodle-drained:${n}` });
    }
    noodleTok = `noodle-drained:${n}`;
  }
  // nước lèo / cháo nấu ở lò: chuỗi put-*-in-pot → add-* → heat-*
  let brothTok = null;
  if (d.broth?.cook) {
    const [first0, ...rest] = d.broth.cook; const first = typeof first0 === 'string' ? first0 : first0.item; const por = !!d.broth.porridge;
    stages.push({ id: 'soup-1', kind: 'action', action: por ? 'put-porridge-in-pot' : 'put-stock-in-pot', requires: [first], creates: por ? 'porridge-in-pot' : 'stock-in-pot' });
    let prev = por ? 'porridge-in-pot' : 'stock-in-pot';
    rest.forEach((raw, i) => { const it = typeof raw === 'string' ? raw : raw.item; const act = (typeof raw === 'object' && raw.action) || COOK_ACTION[it] || 'add-water'; const out = i === rest.length - 1 ? (por ? 'porridge-mixed' : 'soup-mixed') : (it === 'huyet' ? 'blood-in-pot' : `soup-step-${i}`); if (!SIM.labels[out]) labels[out] = `${SIM.items[it]?.name || it} đã vào nồi`; stages.push({ id: `soup-${i + 2}`, kind: 'action', action: act, requires: [prev, it], creates: out }); prev = out; });
    stages.push({ id: 'soup-heat', kind: 'action', action: por ? 'heat-porridge' : 'heat-soup', requires: [prev], creates: d.broth.out });
    if (por) { stages.push({ id: 'pour', kind: 'action', action: 'pour-porridge', requires: [d.broth.out, 'bowl-ready', 'serving-plate'], creates: 'level1-ready' }); }
    brothTok = por ? null : `@${d.broth.action}`;
  } else if (d.broth?.action) brothTok = `@${d.broth.action}`;
  for (const p of d.prep || []) stages.push({ id: `prep-${p.out}`, kind: 'action', action: p.action, requires: p.in, creates: p.out });
  // chuỗi ráp
  for (const t of d.assembly) {
    if (t === '$vessel') { if (soupStyle) asm.push('base-ready'); else if (d.broth?.porridge) asm.push('level1-ready'); else asm.push(vesselTok); }
    else if (t === '$noodle') { if (!soupStyle) asm.push(noodleTok); }
    else if (t === '$broth') { if (brothTok) asm.push(brothTok); }
    else asm.push(t);
  }
  if (!brothTok && !d.broth?.porridge) asm.push('@finish');
  return { id: d.id, name: d.name, menuCode: d.menuCode || null, base, extraStages: stages, assembly: asm, price: d.price, region: d.region, pron: d.pron || '', gloss: d.gloss || '', codex: d.codex || null, real: d.real || null, _labels: labels };
}

/** Dữ liệu game chính: items/actions của sim-data + recipes dựng từ dishes/. */
export function buildGameData(dishes) {
  const recipes = {}; const labels = { ...SIM.labels };
  for (const d of Object.values(dishes)) { const errs = validateDish(d); if (errs.length) throw new Error(`dishes/${d.id}.json: ${errs.join('; ')}`); const r = dishToSim(d); Object.assign(labels, r._labels); delete r._labels; recipes[d.id] = r; }
  return { ...SIM, items: SIM.items, actions: SIM.actions, recipes, labels };
}
