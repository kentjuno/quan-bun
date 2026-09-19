// Bot chơi tự động — dùng cho test và (sau này) phụ bếp AI. Mỗi lần gọi trả về station id nên chạm, hoặc null nếu nên chờ.
// Làm nhiều tô cùng lúc: tô nào đang chờ nồi (việc nền) thì chuyển sang tô khác / lấy trước đồ của các bước sau.
import { nextStep, tokenMatches } from './recipes.js';
const isBroth = (tok) => typeof tok === 'string' && (tok.startsWith('broth:') || /-broth-ready$|^porridge-ready$/.test(tok));

export function botDecide(w) {
  const c = w.chef;
  // đang đứng ở lò trống (card nước lèo) → nấu đúng nước lèo mà một tô đang cần
  if (c.waiting && c.waiting.startsWith('burner')) {
    // mỗi nồi = 1 phần: nấu loại mà số phần cần > số phần đang có (kệ nước + đang đun)
    const nb = neededBroths(w); const cnt = {}; for (const t of nb) cnt[t] = (cnt[t] || 0) + 1;
    const need = Object.keys(cnt).find((tok) => !w.stations.some((s) => s.type === 'stove' && `broth:${s.broth}` === tok) && brothAvailable(w, tok) < cnt[tok]);
    const soup = need && Object.values(w.soups).find((r) => r.output === need);
    w.cookSoup(soup ? soup.items : []); return null;
  }
  if (c.waiting) return null;
  if (c.queue.length || c.target || c.busy > 0) return null;
  const counter = w.stations.find((s) => s.type === 'counter');
  // tô xong → bưng ra bàn khách (không còn quầy giao): bàn của khách đặt tô đó, không thì bàn khách nào đang chờ đúng món
  const doneBowl = c.hand.find((t) => typeof t === 'object' && t.done);
  if (doneBowl) { const cu = (doneBowl.customer && doneBowl.customer.state === 'waiting' ? doneBowl.customer : null) || w.customers.find((x) => x.state === 'waiting' && x.dish === doneBowl.recipe.id) || w.customers.find((x) => x.state === 'waiting'); return cu ? cu.seat.station.id : w.seats[0].station.id; }
  // sợi hư: đang cầm → vứt; còn trong nồi → lấy ra (khi tay còn chỗ)
  if (c.hand.includes('noodle-spoiled')) return `trash:${c.hand.indexOf('noodle-spoiled')}`;   // vứt riêng sợi hư, giữ thứ kia
  const pot = w.stations.find((s) => s.type === 'pot');
  const spoiled = pot.jobs.find((j) => j.spoiled && !j.taken);
  if (spoiled && c.hand.length < w.handCap) return `pot:${spoiled.slot}`;
  const doneSlot = counter.slots.findIndex((b) => b && b.done);
  if (doneSlot >= 0) return `${counter.id}:${doneSlot}`;

  // Danh sách tô cần làm: tô đang làm (khách ít kiên nhẫn trước), rồi tô mới cho khách chưa có tô (nếu còn ô trống)
  const cands = [];
  counter.slots.forEach((b, i) => { if (b && !b.done) cands.push({ bowl: b, slot: i, pat: b.customer?.patience ?? 1e9 }); });
  cands.sort((a, b) => a.pat - b.pat);
  const waiting = w.customers.filter((x) => x.state === 'waiting' && !w.bowlFor(x)).sort((a, b) => a.patience - b.patience);
  const freeSlots = counter.slots.map((b, i) => (b ? -1 : i)).filter((i) => i >= 0);
  for (const cu of waiting) { if (!freeSlots.length) break; cands.push({ bowl: { recipe: w.recipes[cu.dish], placed: [] }, slot: freeSlots.shift(), pat: cu.patience, fresh: true }); }
  if (!cands.length) return prepBowls(w);   // chưa có khách (giai đoạn chuẩn bị) → trụng sẵn tô

  // Dọn tay: thứ đang cầm không dẫn tới bước cần của BẤT KỲ tô nào (và không phải nước lèo/tô) → trả về kệ
  const useful = new Set();
  const addUseful = (recipe, tok, depth) => {   // token + mọi nguyên liệu/token dẫn tới nó (đệ quy qua các phép biến đổi)
    if (depth > 6) return; for (const alt of tok.split('|')) useful.add(alt);
    for (const t of recipe.transforms) if (tokenMatches(tok, t.output) || t.output === tok) for (const i of t.inputs) addUseful(recipe, i, depth + 1);
    if (tok === 'bowl-hot:*' && recipe.bowl) useful.add(recipe.bowl);
  };
  for (const { bowl } of cands) for (const tok of bowl.recipe.assembly.slice(bowl.placed.length)) addUseful(bowl.recipe, tok, 0);
  const isUseful = (h) => [...useful].some((u) => tokenMatches(u, h));
  // (kệ chỉ nhận trả khi tay đầy — tay còn chỗ thì chạm kệ là lấy thêm)
  if (c.hand.length >= w.handCap) for (const h of c.hand) {
    if (typeof h !== 'string' || isUseful(h)) continue;
    const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(h));
    if (shelf) return `${shelf.id}:${h}`;
  }
  // đang cầm thứ cần NẤU NỀN (sợi sống, tô chưa trụng) → thả vào nồi ngay để nó chạy trong lúc làm việc khác
  // (chỉ khi kết quả nấu là thứ một tô đang cần, và không tô nào cần chính thứ sống đó — vd. bún đậu dùng bún không trụng)
  for (const h of c.hand) {
    if (typeof h !== 'string') continue;
    if (cands.some(({ bowl }) => bowl.recipe.assembly.slice(bowl.placed.length).includes(h))) continue;
    const t = Object.values(w.recipes).flatMap((r) => r.transforms).find((x) => x.inputs.length === 1 && tokenMatches(x.inputs[0], h) && x.passive && [...useful].some((u) => tokenMatches(u, x.output)));
    if (!t) continue;
    const st = w.stations.find((s) => s.type === t.station);
    if (st && w.freeSlot(st, w.jobKind(st, t)) >= 0) return st.id;
  }
  // tay đầy mà bước kế của tô ưu tiên không phải thứ đang cầm và không lấy được khi tay đầy → trả 1 thứ (thứ dùng muộn nhất) về kệ
  if (c.hand.length >= w.handCap && cands.length) {
    const need0 = nextStep(cands[0].bowl.recipe, cands[0].bowl.placed);
    if (need0 && !c.hand.some((h) => typeof h === 'string' && tokenMatches(need0, h)) && !howToGet(w, cands[0].bowl.recipe, need0, 'x')) {
      const asm = cands[0].bowl.recipe.assembly;
      const back = [...c.hand].filter((h) => typeof h === 'string').sort((a, b) => asm.indexOf(b) - asm.indexOf(a)).find((h) => w.stations.some((s) => s.type === 'shelf' && s.items.includes(h)));
      if (back) { const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(back)); return `${shelf.id}:${back}`; }
    }
  }

  // Tô nào có việc làm được ngay thì làm (tô ưu tiên trước; tô đang chờ nồi → sang tô kế)
  for (const { bowl, slot } of cands) {
    const need = nextStep(bowl.recipe, bowl.placed);
    const r = howToGet(w, bowl.recipe, need, `${counter.id}:${slot}`);
    if (!r) continue;
    // tay trống, sắp đi kệ cho tô này → nếu tô khác đang cần thứ phải NẤU NỀN (sợi → nồi) mà chưa có phần nào trong nồi, lấy thứ đó trước để nồi chạy song song
    // (chỉ khi tô này còn ≤ 4 bước, để sợi của tô sau không nằm nồi quá lâu mà hư)
    if (c.hand.length === 0 && !r.startsWith(counter.id + ':') && bowl.recipe.assembly.length - bowl.placed.length <= 4) {
      for (const o of cands) {
        if (o.bowl === bowl) continue;
        for (const need2 of o.bowl.recipe.assembly.slice(o.bowl.placed.length, o.bowl.placed.length + 2)) {   // nhìn trước 2 bước (tô + sợi)
          const src = w.sourceItem(o.bowl.recipe, need2);
          const t = o.bowl.recipe.transforms.find((x) => x.input === src);
          if (!src || !t || !t.passive || src === (r.split(':')[1] || '')) continue;
          const inProgress = w.stations.some((st) => st.jobs.some((j) => !j.taken && (j.input === src || w.sourceItem(o.bowl.recipe, j.output) === src)));
          const shelf = w.stations.find((st) => st.type === 'shelf' && st.items.includes(src));
          if (!inProgress && shelf) return `${shelf.id}:${src}`;
        }
      }
    }
    // sắp đi bỏ vào tô mà tay còn chỗ → gom thêm 1 thứ trên kệ cần ngay sau đó (cùng tô, hoặc tô khác) rồi đi một lượt
    if (r.startsWith(counter.id + ':') && c.hand.length < w.handCap) {
      const extra = nextShelfNeed(w, cands, c.hand);
      if (extra) return extra;
    }
    // sắp đem 1 thứ từ kệ đi trạm (vd. sợi → nồi) mà tô khác cũng cần đúng thứ đó và chưa có phần nào đang làm → lấy thêm 1 phần đi luôn
    if (c.hand.length === 1 && typeof c.hand[0] === 'string' && !r.includes(':')) {
      const x = c.hand[0]; const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(x));
      if (shelf) {
        const needX = cands.filter(({ bowl: b }) => w.sourceItem(b.recipe, nextStep(b.recipe, b.placed)) === x).length;
        const have = 1 + w.stations.reduce((n, s) => n + s.jobs.filter((j) => !j.taken && (j.input === x || w.sourceItem(bowl.recipe, j.output) === x)).length, 0);
        if (needX > have) return `${shelf.id}:${x}`;
      }
    }
    return r;
  }
  // Mọi tô đều chờ → tranh thủ lấy trước 1 thứ cho bước sau, chừa 1 tay để lấy đồ trong nồi khi xong
  if (c.hand.length < 1) {
    for (const { bowl } of cands) {
      for (const tok of bowl.recipe.assembly.slice(bowl.placed.length + 1)) {
        if (c.hand.includes(tok)) continue;
        const src = w.sourceItem(bowl.recipe, tok); if (!src || c.hand.includes(src)) continue;
        if (w.stations.some((st) => st.jobs.some((j) => !j.taken && (j.input === src || w.sourceItem(bowl.recipe, j.output) === src)))) continue;   // đã có phần đang nấu
        const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(src));
        if (shelf) return `${shelf.id}:${src}`;
        if (isBroth(tok)) return stoveFor(w, tok);
      }
    }
  }
  return null;
}

/** Chuẩn bị: giữ sẵn 2 tô nóng trong nồi khi rảnh. */
function prepBowls(w) {
  const c = w.chef; const pot = w.stations.find((s) => s.type === 'pot');
  const recipe = w.recipes[w.shift.dishes[0]]; const bowlItem = recipe.bowl; if (!bowlItem) return null;
  const inPot = pot.jobs.filter((j) => j.kind === 'bowl').length; const inHand = c.hand.filter((h) => h === bowlItem).length;
  if (inHand && (inPot + inHand <= 2 || c.hand.length >= w.handCap)) return 'pot';
  if (inPot + inHand >= 2 || c.hand.length >= w.handCap) return null;
  const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(bowlItem));
  return shelf ? `${shelf.id}:${bowlItem}` : null;
}

/** Thứ trên kệ mà một tô sắp cần (bước kế sau những thứ đang cầm), chưa cầm → 'shelf:item' hoặc null. */
function nextShelfNeed(w, cands, hand) {
  for (const { bowl } of cands) {
    const rest = bowl.recipe.assembly.slice(bowl.placed.length);
    let i = 0; while (i < rest.length && hand.includes(rest[i])) i++;   // bỏ qua các bước đã có trên tay
    const tok = rest[i]; if (!tok) continue;
    const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(tok));
    if (shelf && !hand.includes(tok)) return `${shelf.id}:${tok}`;
  }
  return null;
}

/** Các token nước lèo mà tô đang làm / khách đang chờ sẽ cần. */
function neededBroths(w) {
  const counter = w.stations.find((s) => s.type === 'counter'); const out = [];
  for (const b of counter.slots) if (b && !b.done) for (const t of b.recipe.assembly.slice(b.placed.length)) if (isBroth(t)) out.push(t);
  for (const cu of w.customers) if (cu.state === 'waiting' && !w.bowlFor(cu)) for (const t of w.recipes[cu.dish].assembly) if (isBroth(t)) out.push(t);
  // và nước cần cho phép biến đổi ở thớt (cháo: múc cháo cần porridge-ready)
  for (const r of Object.values(w.recipes)) for (const t of r.transforms) for (const i of t.inputs) if (isBroth(i) && !out.includes(i)) out.push(i);
  return out;
}
/** Nguồn nước lèo sẵn: nồi phở (`stove`) hoặc bếp lò đã có nồi đó (đang đun hoặc đã nóng) → target id, null nếu chưa có. */
function brothSource(w, tok) {
  const st = w.stations.find((s) => s.type === 'stove' && `broth:${s.broth}` === tok); if (st) return st.id;
  const bu = w.stations.find((s) => s.type === 'burner'); if (!bu) return null;
  if (bu.ready.some((b) => b.output === tok)) return `${bu.id}:ready.${tok}`;   // đã đun xong, nằm trên kệ nước
  const i = bu.slots.findIndex((b) => b && b.output === tok); return i >= 0 ? `${bu.id}:${i}` : null;
}
/** Số phần nước `tok` đang có (kệ nước + đang đun trên lò). */
function brothAvailable(w, tok) { const bu = w.stations.find((s) => s.type === 'burner'); if (!bu) return 0; return bu.ready.filter((b) => b.output === tok).length + bu.slots.filter((b) => b && b.output === tok).length; }
/** Lấy nước lèo `tok`: có sẵn → tới đó (đang đun → chờ); chưa có → tới bếp lò trống để nấu. */
function stoveFor(w, tok) {
  const src = brothSource(w, tok);
  if (src) { const [sid, si] = src.split(':'); const st = w.stationById[sid]; if (st.type === 'burner' && !si.startsWith('ready') && st.slots[Number(si)].left > 0) return null; return src; }
  const bu = w.stations.find((s) => s.type === 'burner'); if (!bu) return null;
  const free = bu.slots.findIndex((b) => !b); return free >= 0 ? `${bu.id}:${free}` : null;
}

function howToGet(w, recipe, tok, slotId, depth = 0) {
  const c = w.chef; if (depth > 8) return null;
  const inHand = (req) => c.hand.some((h) => typeof h === 'string' && tokenMatches(req, h));
  if (inHand(tok)) return slotId;
  if (isBroth(tok)) return c.hand.length < w.handCap ? stoveFor(w, tok) : null;
  if (tok.includes('|')) { for (const alt of tok.split('|')) { const r = howToGet(w, recipe, alt, slotId, depth + 1); if (r) return r; } return null; }   // requiresAny: thứ nào có thì lấy
  const shelf = w.stations.find((s) => s.type === 'shelf' && s.items.includes(tok));
  if (shelf) return c.hand.length < w.handCap ? `${shelf.id}:${tok}` : null;
  // bản tập bỏ bước: token này lấy thẳng trên kệ qua item nguồn (recipe.shelfSubs)
  const srcItem = Object.keys(recipe.shelfSubs || {}).find((k) => tokenMatches(tok, recipe.shelfSubs[k]));
  if (srcItem) { const sh = w.stations.find((s) => s.type === 'shelf' && s.items.includes(srcItem)); if (sh) return c.hand.length < w.handCap ? `${sh.id}:${srcItem}` : null; }
  const t = recipe.transforms.find((x) => tokenMatches(tok, x.output));
  if (!t) return null;
  const st = w.stations.find((s) => s.type === t.station); if (!st) return null;
  if (st.type === 'prep' || st.type === 'stovetop') {   // thớt & mặt bếp: gom đủ nguyên liệu (nhiều thứ) rồi làm
    const doneIdx = st.slots.findIndex((b) => b && b.tf.output === t.output && b.left === 0);
    if (doneIdx >= 0) return c.hand.length < w.handCap ? `${st.id}:${doneIdx}` : null;
    if (st.slots.some((b) => b && b.tf.output === t.output && b.left > 0)) return null;   // đang làm → chờ
    const part = st.slots.find((b) => b && b.tf.output === t.output && b.left === null);
    const needIn = t.inputs.filter((req, i) => !(part && part.have[i]));
    const carrying = needIn.filter(inHand); const missing = needIn.filter((req) => !inHand(req));
    if (carrying.length && (c.hand.length >= w.handCap || !missing.length)) return st.id;   // đem tới thớt
    if (missing.length) { if (c.hand.length < w.handCap) return howToGet(w, recipe, missing[0], slotId, depth + 1); return carrying.length ? st.id : null; }
    return st.id;
  }
  const job = st.jobs.find((j) => tokenMatches(tok, j.output) && !j.taken);
  if (job) { if (job.left > 0 || c.hand.length >= w.handCap) return null; return st.type === 'pot' ? (job.kind === 'bowl' ? `pot:bowl.${job.input}` : `pot:${job.slot}`) : st.id; }   // xong thì lấy đúng rọ/tô (nếu tay còn chỗ), chưa thì chờ
  if (inHand(t.inputs[0])) return w.freeSlot(st, w.jobKind(st, t)) >= 0 ? st.id : null;   // trạm đầy → chờ
  return howToGet(w, recipe, t.inputs[0], slotId, depth + 1);
}
