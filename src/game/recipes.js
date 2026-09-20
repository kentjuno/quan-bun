// Chuyển dữ liệu bếp thật (sim-data.js) thành "công thức game": chuỗi ráp + các phép biến đổi ở trạm.
// Quy tắc: được GỘP bước cho nhanh, KHÔNG được đổi thứ tự bếp thật.
import { SIM_DATA } from '../data/sim-data.js';
import { GAME_DATA } from './gamedata.js';
import STATIONS_JSON from '../data/stations.json';
import { ACTION_TIME, PRICES } from '../config.js';
import { t, lang, withGloss, actionName, stateLabel } from '../i18n.js';

/**
 * Hai nguồn sự thật (docs/PLAN-PUBLIC.md §0):
 *   'shop' = sim-data.js — công thức THẬT của quán, cho tab Luyện / mini-game / bếp 3D (và mọi test cũ).
 *   'game' = dishes/*.json qua dishlib — công thức CHUNG Việt Nam, cho game chính (level trên bản đồ).
 * `D` là object sống: setSource() đổi ruột nó, mọi nơi đọc D.recipes/D.items… thấy ngay. Mặc định 'shop' để test/mini-game giữ nguyên.
 */
const SOURCES = { shop: SIM_DATA, game: GAME_DATA };
export const D = { ...SIM_DATA };
let curSource = 'shop';
/** Đổi nguồn: 'shop' | 'game' | một object dữ liệu (test / add_dish). */
export function setSource(name) { const src = typeof name === 'object' ? name : SOURCES[name]; if (!src) throw new Error(`source lạ: ${name}`); for (const k of Object.keys(D)) delete D[k]; Object.assign(D, src); curSource = typeof name === 'object' ? 'custom' : name; return curSource; }   // vi-src
export const source = () => curSource;
export const GAME = GAME_DATA; export const SHOP = SIM_DATA;

export function actionTime(actionId) { return ACTION_TIME[actionId] ?? ACTION_TIME.default; }

/** Nhãn tiếng Việt cho mọi token/item có thể lên UI. Không bao giờ trả về id nội bộ trần. Dùng cho khay + test; UI thông báo dùng labelL(). */
export function label(token) {
  if (token === 'bowl-hot') return D.labels['bowl-ready'] || 'Tô đã trụng';   // vi-src
  if (token === 'bowl-hot:*') return 'Tô đã trụng';   // vi-src
  if (token.startsWith('bowl-hot:')) return `${D.items[token.slice(9)]?.name || 'Tô'} đã trụng`;   // tô nóng theo LOẠI tô (tô phở ≠ tô món nước)   // vi-src
  // sợi theo LOẠI: 'noodle-blanched:bun' → "Bún đã trụng nóng lần 1" (bếp thật: bún ≠ sợi phở ≠ bánh đa)
  if (/^noodle-(blanched|rinsed|drained):/.test(token)) { const [st, n] = token.split(':'); const nm = D.items[n]?.name || 'Sợi'; return `${nm} ${st === 'noodle-blanched' ? 'đã trụng nóng lần 1' : st === 'noodle-rinsed' ? 'đã xả lạnh' : 'đã trụng + ráo'}`; }   // vi-src
  if (token === 'noodle-blanched') return D.labels['first-blanch-done'] || 'Sợi đã trụng lần 1';   // vi-src
  if (token === 'broth') return 'Nước lèo';   // vi-src
  if (token.startsWith('broth:')) { const n = D.actions[token.slice(6)]?.name || 'Chan nước lèo'; return n.replace(/^(Chan|Đổ)\s+/, '').replace(/^\w/, (c) => c.toUpperCase()); }   // 'broth:pour-pho-broth' → "Nước phở"   // vi-src
  if (token === 'noodle-spoiled') return 'Sợi hư (vứt)';   // vi-src
  if (token.startsWith('@')) return D.actions[token.slice(1)]?.name || 'Chan nước';   // vi-src
  return D.items[token]?.name || D.labels[token] || D.actions[token]?.name || `(${token})`;
}
/** Nhãn THEO NGÔN NGỮ cho thông báo/tooltip: tên Việt giữ nguyên + giải nghĩa "(brisket)"; trạng thái/hành động dịch hẳn. vi → y như label(). */
export function labelL(token) {
  if (lang() === 'vi') return label(token);
  if (token === 'bowl-hot' || token === 'bowl-hot:*') return stateLabel('bowl-ready', label(token));
  if (token.startsWith('bowl-hot:')) return t('lbl.bowlHot', { name: labelL(token.slice(9)) });
  if (/^noodle-(blanched|rinsed|drained):/.test(token)) { const [st, n] = token.split(':'); return t(`lbl.${st}`, { name: labelL(n) }); }
  if (token === 'noodle-blanched') return stateLabel('first-blanch-done', label(token));
  if (token === 'broth') return t('lbl.broth');
  if (token.startsWith('broth:')) return actionName(token.slice(6), label(token)).replace(/^Ladle\s+/, '').replace(/^\w/, (c) => c.toUpperCase());
  if (token === 'noodle-spoiled') return t('lbl.spoiled');
  if (token.startsWith('@')) return actionName(token.slice(1), label(token));
  if (D.items[token]) return withGloss(D.items[token].name, token);
  if (D.labels[token]) return stateLabel(token, D.labels[token]);
  if (D.actions[token]) return actionName(token, D.actions[token].name);
  return label(token);
}
/** Tên hành động theo ngôn ngữ (fallback = viText hoặc id). */
export const actName = (id, fallback) => actionName(id, D.actions[id]?.name || fallback || id);
/** Tên món giữ tiếng Việt; EN thêm giải nghĩa sau dấu chấm giữa khi `full`. */
export function dishLabel(id, full = false) { const n = D.recipes[id]?.name || id; return full ? withGloss(n, id) : n; }

/** Token khớp yêu cầu? 'bowl-hot:*' = tô nóng bất kỳ loại; 'bowl-ready' (sim-data) cũng nghĩa là tô nóng. */
export function tokenMatches(req, tok) {
  if (req === tok) return true;
  if ((req === 'bowl-hot:*' || req === 'bowl-ready') && tok.startsWith('bowl-hot:')) return true;
  if (req.includes('|')) return req.split('|').includes(tok);   // requiresAny: 'rau-muong|can-nuoc'
  return false;
}
const GLUE_IN = new Set(['load-noodle', 'load-beef-ball']);   // "cho vào rọ" — gộp vào bước trụng kế tiếp (rọ là đồ của nồi)
const GLUE_OUT = new Set(['drain']);                          // "để ráo" — gộp vào bước trước
const TOOLS = new Set(['noodle-basket', 'meat-basket']);
// cùng một thứ thật nhưng sim-data đặt tên token khác nhau theo món → quy về một token để nồi cho ra đúng thứ mọi món dùng được
// token bún khô của sim-data (dry-bun-*, bh-bun-*) = cùng một sợi bún qua cùng các bước như món nước → gộp về token theo loại sợi
const TOKEN_ALIAS = { 'bh-bun-ready': 'noodle-drained:bun', 'bh-bun-blanched': 'noodle-blanched:bun', 'bh-bun-rinsed': 'noodle-rinsed:bun', 'bh-bun-hot': 'noodle-drained:bun', 'bh-bun-loaded': 'bun', 'banh-hoi-loaded': 'banh-hoi', 'banh-hoi-blanched': 'noodle-blanched:banh-hoi', 'banh-hoi-rinsed': 'noodle-rinsed:banh-hoi', 'banh-hoi-hot': 'noodle-drained:banh-hoi', 'banh-hoi-ready': 'noodle-drained:banh-hoi', 'dry-bun-ready': 'noodle-drained:bun', 'dry-bun-blanched': 'noodle-blanched:bun', 'dry-bun-rinsed': 'noodle-rinsed:bun', 'dry-bun-hot': 'noodle-drained:bun', 'dry-bun-loaded': 'bun' };
export const canon = (t) => TOKEN_ALIAS[t] || t;      // dụng cụ gắn với nồi, không phải nguyên liệu phải lấy

/** Chuỗi nấu nước lèo / cháo trên lò (put-*-in-pot → add-* → heat-*): các stage này KHÔNG thành transform, mà thành soupRecipe. */
function soupChainIds(stages) {
  const ids = new Set();
  for (const heat of stages.filter((s) => /^heat-/.test(s.action))) {
    let cur = heat;
    for (let g = 0; g < 10 && cur; g++) { ids.add(cur.id); const prevTok = (cur.requires || []).find((t) => !D.items[t]); cur = stages.find((s) => s.creates === prevTok); }
  }
  return ids;
}

/**
 * Phép biến đổi tại trạm: đem `inputs` (1..n token) tới trạm `station` → sau `time` giây ra `output`.
 * passive = bỏ vào rồi đi làm việc khác; active = đứng làm. `input` = inputs[0] (tương thích cũ).
 * Từ SIM_DATA: workflow sợi (gộp theo bếp thật) + từng extraStage (giữ nguyên từng bước để nhớ).
 */
/**
 * Cờ RÚT GỌN của một level (docs/PLAN-WORLDS.md §3). KHÔNG đụng sim-data: chỉ bỏ bớt bước khi DỰNG công thức cho level.
 * Mọi chế độ khác (Luyện/Rush/Survival/Đố/Chém/Phản xạ) gọi recipeFor(d) không tham số → luôn đủ bước thật.
 *   skipRinse  bún/phở chỉ trụng nóng một lần (bỏ xả lạnh + trụng lại)
 *   hotBowl    tô ở kệ đã nóng sẵn (bỏ bước trụng tô)
 *   skipPrep   bỏ các bước ở thớt (đồ đã cắt/pha sẵn) · skipFry bỏ bước chiên
 *   toppings   danh sách topping được giữ lại trong chuỗi ráp (giữ nguyên thứ tự gốc)
 *   maxSteps   chỉ lấy n bước ráp đầu
 *   noSpoil / soupReady  do World xử lý (sợi không hư · nước lèo có sẵn trên kệ)
 */
const skippedStations = (sim) => [...(sim?.skipPrep ? ['prep'] : []), ...(sim?.skipFry ? ['fryer'] : [])];

export function transformsFor(dishId, sim = null) { return buildTransforms(dishId, sim).out; }

/** Dựng chuỗi chế biến + bảng thay thế token của các bước bị bỏ (bản tập). */
function buildTransforms(dishId, sim) {
  const r = D.recipes[dishId];
  if (!r) throw new Error(`Không có món ${dishId} trong sim-data`);   // vi-src
  const out = []; const subs = {};                       // subs: token của bước bị bỏ → token kết quả
  const push = (t) => { t.inputs = t.inputs.map(canon); t.output = canon(t.output); t.input = t.inputs[0]; t.time = actionTime(t.action); out.push(t); };
  if (r.base) {
    const wf = r.base.workflow || 'noodle-base';
    const noodle = r.base.noodle, bowl = r.base.bowl;
    if (wf === 'noodle-base' && sim?.skipRinse) {
      push({ station: 'pot', inputs: [noodle], output: `noodle-drained:${noodle}`, action: 'blanch-noodle-once', passive: true });   // bản tập: trụng một lần là xong
    } else if (wf === 'noodle-base') {
      // nóng → xả lạnh → nóng lại (+ để ráo). Ba lần ghé trạm, đúng bếp thật.
      push({ station: 'pot', inputs: [noodle], output: `noodle-blanched:${noodle}`, action: 'blanch-noodle', passive: true });
      push({ station: 'sink', inputs: [`noodle-blanched:${noodle}`], output: `noodle-rinsed:${noodle}`, action: 'cold-rinse', passive: false });
      push({ station: 'pot', inputs: [`noodle-rinsed:${noodle}`], output: `noodle-drained:${noodle}`, action: 'reblanch', passive: false });
    } else if (wf === 'noodle-hot-only') {
      push({ station: 'pot', inputs: [noodle], output: `noodle-drained:${noodle}`, action: 'blanch-noodle-once', passive: true });
    } else throw new Error(`workflow lạ: ${wf}`);   // vi-src
    if (sim?.hotBowl) subs[bowl] = `bowl-hot:${bowl}`;   // tô ở kệ đã nóng sẵn
    else push({ station: 'pot', inputs: [bowl], output: `bowl-hot:${bowl}`, action: 'blanch-bowl', passive: true });   // tô nằm trong nồi nóng, trữ được
  }
  const stages = (r.extraStages || []).filter((s) => s.kind === 'action' && D.actions[s.action]);
  const soupIds = soupChainIds(stages);
  const skipSt = [...(sim?.skipPrep ? ['prep'] : []), ...(sim?.skipFry ? ['fryer'] : [])];
  for (const st of stages) {
    if (soupIds.has(st.id) || GLUE_IN.has(st.action) || GLUE_OUT.has(st.action)) continue;
    // inputs: item giữ nguyên; token do bước "glue" tạo → thay bằng item của bước glue; bỏ dụng cụ
    let inputs = [];
    for (const req of st.requires || []) {
      const glue = stages.find((g) => g.creates === req && GLUE_IN.has(g.action));
      const src = glue ? (glue.requires || []) : [req];
      for (const t of src) if (!TOOLS.has(t)) inputs.push(t === 'bowl-ready' ? 'bowl-hot:*' : t);
    }
    if (st.requiresAny) inputs.push(st.requiresAny[0]);   // game chỉ dùng lựa chọn đầu (rau muống); phương án thay thế (cần nước khi hết) để trong cooking-note — Kent 13/09
    let output = st.creates;
    const drain = stages.find((g) => GLUE_OUT.has(g.action) && (g.requires || []).includes(st.creates)); if (drain) output = drain.creates;
    if (st.action === 'blanch-bowl') output = `bowl-hot:${inputs[0]}`;   // tô nóng theo loại, như base
    const station = stationForAction(st.action); if (!station) continue;
    // bản tập: bỏ bước → ghi lại "token vào → token ra" để bước trước (hoặc kệ) phát thẳng token kết quả
    const skipRinseStage = sim?.skipRinse && /^(cold-rinse|reblanch)$/.test(st.action);
    const skipBowlStage = sim?.hotBowl && st.action === 'blanch-bowl';
    if (skipSt.includes(station) || skipRinseStage || skipBowlStage) { const src = canon(inputs.find((i) => D.items[i]) ?? inputs[0]); if (src) subs[src] = canon(output); continue; }
    push({ station, inputs, output, action: st.action, passive: !!D.actions[st.action]?.passive || st.action === 'blanch-bowl' });
  }
  return { out, subs };
}
/** Nối chuỗi thay thế: a→b, b→c ⇒ a→c (chả giò: chiên rồi cắt, bỏ cả hai thì kệ phát thẳng token cuối). */
function chase(subs, tok) { let cur = tok; for (let g = 0; g < 6 && subs[cur] && subs[cur] !== cur; g++) cur = subs[cur]; return cur; }

/** Việc làm ngay trên MẶT BẾP bằng nồi/chảo nhỏ — Kent kể 19/09.
 *  Liệt kê thẳng tên chứ không bắt theo chữ: `stir-fry-xao-lan` có chữ "fry" (dễ rơi vào chảo
 *  chiên) và `warm-sot-vang` có chữ "warm" (dễ rơi vào nồi trụng), cả hai đều sai chỗ. */
const STOVE_ACTIONS = new Set(['warm-sot-vang', 'stir-fry-xao-lan']);

/** Trạm theo hành động: bảng data/stations.json trước (P6.3), hành động lạ thì đoán theo tên. pot: trụng/ủ ấm · sink: xả · microwave · stovetop: mặt bếp · prep: cắt, đập, làm chén, lót mẹt, múc cháo… */
export const STATIONS = STATIONS_JSON.stations;
const ACTION_STATION = Object.fromEntries(STATIONS.flatMap((s) => (s.actions || []).map((a) => [a, s.id])));
export function stationForAction(actionId) {
  const known = ACTION_STATION[actionId];
  if (known) return known === 'burner' ? 'stovetop' : known;   // chuỗi nước lèo bị lọc ở soupChainIds; nếu lọt thì rơi vào ô bếp
  if (STOVE_ACTIONS.has(actionId)) return 'stovetop';   // 'stove' đã là NỒI NƯỚC PHỞ SẴN trong bếp 3D — đừng dùng lại tên đó
  if (/microwave/.test(actionId)) return 'microwave';
  if (/fry/.test(actionId)) return 'fryer';
  if (/soak/.test(actionId)) return 'sink';
  if (/blanch|reblanch|warm/.test(actionId)) return 'pot';
  if (/rinse/.test(actionId)) return 'sink';
  if (/heat|stock|water|blood|porridge-in-pot|add-pho-broth/.test(actionId)) return 'stovetop';
  return 'prep';
}

/** Chuỗi ráp cho game: base-ready → [tô nóng, sợi ráo]; @pour-X → token nước lèo (nồi lò: output của heat-*; phở: broth:pour-pho-broth); bỏ @finish. */
export function assemblyFor(dishId, sim = null) {
  const r = D.recipes[dishId]; const soup = soupRecipeFor(dishId);
  const steps = [];
  for (const tok of r.assembly) {
    if (tok === 'base-ready') steps.push(`bowl-hot:${r.base.bowl}`, `noodle-drained:${r.base.noodle}`);
    else if (tok === '@finish') continue;
    else if (tok.startsWith('@')) steps.push(soup ? soup.output : 'broth:' + tok.slice(1));
    else steps.push(canon(tok));
  }
  if (!sim) return steps;
  let out = steps;
  // toppings: chỉ giữ các nguyên liệu "rời" có trong danh sách (tô, sợi, nước, token đã chế biến luôn được giữ)
  if (sim.toppings) out = out.filter((t) => !D.items[t] || sim.toppings.includes(t));
  if (sim.maxSteps) out = out.slice(0, sim.maxSteps);
  return out;
}

export function recipeFor(dishId, sim = null) {
  const r = D.recipes[dishId];
  if (sim && !Object.keys(sim).length) sim = null;
  const { out: transforms, subs } = buildTransforms(dishId, sim);
  const assembly = assemblyFor(dishId, sim);
  const brothAction = (r.assembly.find((t) => t.startsWith('@') && t !== '@finish') || '').slice(1) || null;
  const items = (toks) => toks.flatMap((t) => t.includes('|') ? t.split('|') : [t]).filter((t) => D.items[t]);
  // bản tập bỏ bước: token kết quả "dời lên" bước còn lại phía trước (hoặc lên kệ)
  for (const t of transforms) t.output = chase(subs, t.output);
  // bản tập: bỏ bước có thể làm một bước khác thành thừa (vd bỏ bước múc cháo thì khỏi cần trụng tô) → cắt luôn cho gọn
  if (sim) for (let g = 0; g < 5; g++) {
    const needed = new Set([...assembly, ...transforms.flatMap((t) => t.inputs)]);
    const dead = transforms.filter((t) => ![...needed].some((n) => tokenMatches(n, t.output)));
    if (!dead.length) break; for (const d of dead) transforms.splice(transforms.indexOf(d), 1);
  }
  const made = new Set(transforms.map((t) => t.output));
  const needTok = new Set([...assembly, ...transforms.flatMap((t) => t.inputs)]);
  // kệ: item nguồn của bước bị bỏ (lấy ra là token kết quả, nếu token đó còn được dùng) + item thật trong chuỗi ráp / đầu vào các bước còn lại
  const shelfSubs = {};
  for (const k of Object.keys(subs)) { if (!D.items[k] || made.has(k)) continue; const v = chase(subs, k); if ([...needTok].some((t) => tokenMatches(t, v))) shelfSubs[k] = v; }
  const need = [r.base?.noodle, sim?.hotBowl ? null : r.base?.bowl, ...items(assembly), ...items(transforms.flatMap((t) => t.inputs))].filter(Boolean);
  const shelfItems = [...new Set([...Object.keys(shelfSubs), ...need])].filter((it) => !made.has(it));
  return { id: dishId, name: r.name, price: r.price ?? PRICES[dishId] ?? 40, region: r.region || null, transforms, assembly, brothAction, simplify: sim || null, shelfSubs,
    noodle: r.base?.noodle, bowl: r.base?.bowl, opener: assembly[0], menuCode: r.menuCode || null,
    /** Nguyên liệu người chơi phải lấy từ kệ (item id) */
    shelfItems };
}

/**
 * Công thức nấu trên lò (bếp thật: lấy nồi, cho cốt → huyết → nước, đun). Lấy từ extraStages có heat-* (nước lèo, cháo).
 * → { items (đúng thứ tự), heatAction, brothAction, name, output: token nồi (vd 'crab-broth-ready', 'porridge-ready') } hoặc null nếu món dùng nước sẵn (phở).
 */
export function soupRecipeFor(dishId) {
  const r = D.recipes[dishId]; const stages = (r.extraStages || []).filter((s) => s.kind === 'action');
  const heat = stages.find((s) => /^heat-/.test(s.action)); if (!heat) return null;
  const chain = []; let cur = heat;
  for (let g = 0; g < 10 && cur; g++) { chain.unshift(cur); const prevTok = (cur.requires || []).find((t) => !D.items[t]); cur = stages.find((s) => s.creates === prevTok); }
  const items = chain.flatMap((s) => (s.requires || []).filter((t) => D.items[t]));
  // Món nào bị BƯỚC NÀO ăn — để quầy biết nước cốt đứng ở kệ nước, nước trắng hứng ở bồn,
  // còn đồ rắn (huyết) thì vẫn nằm khay. Không đoán theo tên item.
  const byAction = {};
  for (const s of chain) for (const t of (s.requires || []).filter((x) => D.items[x])) byAction[t] = s.action;
  const brothAction = (r.assembly.find((t) => t.startsWith('@') && t !== '@finish') || '').slice(1) || null;
  return { items, byAction, heatAction: heat.action, brothAction, name: label(heat.creates).replace(/ đã nóng$/, ''), output: heat.creates };   // vi-src
}

/** Token nào cần đưa vào tô tiếp theo. */
export function nextStep(recipe, placed) { return recipe.assembly[placed.length] ?? null; }
/** Tên nồi nước lèo theo ngôn ngữ (soupRecipeFor().name là tiếng Việt lúc build). */
export const soupName = (r) => (lang() === 'vi' || !r?.output ? r?.name : stateLabel(r.output, r.name).replace(/, hot$/, ''));
