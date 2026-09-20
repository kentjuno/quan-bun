import { t as T, tl, initLang, setLang, lang, applyDom, onLang } from './i18n.js';
initLang();
import { World } from './game/world.js';
import { View, loadModels } from './game/view.js';
import { SURVIVAL, DECOR, UPGRADES, WORLDS, ALL_DISHES, GAME_DISHES, kitchenFor, levelById, nextLevel, worldById, KITCHEN_VARIANTS } from './config.js';
import { REGULARS, recapLine } from './data/customers.js';
import { progress, bestStars, recordLevel, recordPlay, recordSurvival, pointsAvailable, hasDecor, buyDecor, setPractice, resetProgress, currentLevel, levelUnlocked, worldUnlocked, worldStars, totalStars, upgradeLevel, upgradeCost, buyUpgrade, upgradeUnlocked, playerMods, unlocksAfter, provinceUnlocked, provinceStars, tripSeen, markTrip, journeyWorlds, introSeen, markIntro, ownerMet, markOwner, codexNew, tutSeen, markTut, souvenirs, hasSouvenir, winSouvenir } from './game/progress.js';
import { PROVINCES, QUAN, MINIS, provinceOf, prevProvince } from './data/regions.js';
import { playTrip, tripRunning } from './trip.js';
import { playIntro, playOwner, sceneRunning } from './scene.js';
import { renderGrid as renderCodex, openPage as openCodex, closePage as closeCodex, pageOpen, realRecipeOpen, codexCount, RECIPE_STARS } from './codex.js';
import { D, recipeFor, setSource } from './game/recipes.js';
import { botDecide } from './game/bot.js';
import { label, labelL, dishLabel } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { ensureAudio, startMusic, setMuted, isMuted, sfx, setMood, setBoil } from './audio.js';
import { parFor } from './game/par.js';
import { povArrivals } from './game/levels.js';
import { Puzzle, assembleOk } from './puzzle.js';
import { counterMove } from './game/counter.js';
import { Pov, povOk } from './pov.js';
import { recordResult, masteryOf, isMastered, weightsFor, allMastery, resetMastery } from './game/mastery.js';
import { ev as logEv, logOn, exportLog, summary as logSummary, readLog, clearLog } from './playlog.js';

const $ = (id) => document.getElementById(id);
const lib = await loadModels((p, n) => { $('loading').textContent = T('menu.loading3d', { p: Math.round(p * 100) }); });
const view = new View($('app'), lib);
let world = null; let running = false; let toastTimer = null;
let botMode = new URLSearchParams(location.search).has('bot'); let botTimer = 0;

function ripple(x, y) { const r = document.createElement('div'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 450); }
let hintTimer = null;
function showHint(msg, ms = 6000) { const el = $('hint'); el.textContent = msg; el.classList.remove('fade'); clearTimeout(hintTimer); hintTimer = setTimeout(() => el.classList.add('fade'), ms); }
function buzz(p) { try { navigator.vibrate?.(p); } catch {} }
let bannerTimer = null;
/** Chữ lớn giữa màn hình khi đổi pha (Mở cửa · Giờ cao điểm · Xế chiều · Sắp đóng cửa). */
function banner(big, small = '', ms = 2200) { const el = $('banner'); el.innerHTML = `<b>${big}</b>${small ? `<small>${small}</small>` : ''}`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => el.classList.remove('show'), ms); }
const PHASES = [[0.42, 'lunch', 'busy'], [0.62, 'lull', 'calm'], [0.92, 'afternoon', 'busy'], [9, 'closing', 'close']].map(([at, id, mood]) => [at, id, mood, T(`phase.${id}`), T(`phase.${id}.sub`)]);
let phase = '';
function syncPhase() {
  if (!world?.shift.world || world.prep > 0) { if (phase) { phase = ''; setMood('calm'); } return; }
  const f = world.time / world.shift.seconds; const ph = PHASES.find((p) => f < p[0]);
  if (ph && ph[1] !== phase) { const first = !phase; phase = ph[1]; setMood(ph[2]); if (!first || ph[1] !== 'lunch') banner(ph[3], ph[4]); }
}
function toast(msg, ms = 1200) { const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms); }

const isPortrait = () => innerHeight > innerWidth;
// tuỳ chọn thử nghiệm: kệ kiểu card (?card=1 hoặc checkbox menu), ẩn tên trên card
const qs = new URLSearchParams(location.search);
const opts = { shelfCard: (qs.get('card') ?? safeGet('qb.card') ?? '1') === '1', hideName: qs.has('hidename') || safeGet('qb.hidename') === '1' };
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
$('optCard').checked = opts.shelfCard; $('optHideName').checked = opts.hideName;
$('optCard').onchange = (e) => { opts.shelfCard = e.target.checked; safeSet('qb.card', opts.shelfCard ? '1' : '0'); if (!running) { world = newWorld(); rebuild(); } };
$('optHideName').onchange = (e) => { opts.hideName = e.target.checked; safeSet('qb.hidename', opts.hideName ? '1' : '0'); };
// level đang chọn: ?world=pho&level=5 (dev) hoặc level đang tới
let level = levelById(`${qs.get('world') || 'pho'}-${qs.get('level') || 0}`) || currentLevel();
let worldIdx = Math.max(0, WORLDS.findIndex((w) => w.id === level.world));
let playMode = 'level';   // 'level' | 'survival' | 'drill' | 'rush' | 'puzzle' (drill/rush dùng món đã chọn ở Luyện)
let practice = (progress().practice || []).filter((d) => ALL_DISHES.includes(d)); if (!practice.length) practice = [...level.dishes];
function shiftFor(mode) {
  if (mode === 'survival') return { ...SURVIVAL, weights: weightsFor(SURVIVAL.dishes) };
  const base = level;
  if (mode === 'drill' || mode === 'rush') {
    const dishes = practice.length ? practice : base.dishes; const weights = weightsFor(dishes); const nm = dishes.length > 3 ? T('n.dishes', { n: dishes.length }) : dishes.map((d) => D.recipes[d].name).join(' · ');
    if (mode === 'drill') return { id: 'drill', name: `${T('more.drill')} — ${nm}`, dishes, drill: true, drillCount: 8, seconds: 900, prep: 5, arrivals: [], weights, moneyTargets: [1e9, 1e9, 1e9] };
    return { id: 'rush', name: `${T('more.rush')} — ${nm}`, dishes, seconds: 300, prep: 10, arrivals: [0, 1, 2].map((i) => ({ t: 0.5 + i, type: 'tourist', patience: 300 })), weights, rush: true, moneyTargets: [1e9, 1e9, 1e9] };
  }
  return { ...base, weights: weightsFor(base.dishes) };
}
function newWorld() {
  const w = new World(shiftFor(playMode), {
    onToast: (m) => toast(m),
    onMistake: (hint) => { lastMistake = hint; toast(`${/^(Nước lèo|Không có nước lèo)/.test(hint) ? T('m3d.cookWrong') : T('m3d.orderWrong')} ${hint}`, 2200); sfx.mistake(); },   // vi-src
    onServe: (cu, price, tip) => { view.float(cu, tip ? `+${price}k +${tip}k tip` : `+${price}k`, tip ? 'tip' : ''); sfx.serve(); setTimeout(() => sfx.coin(), 260); buzz(18); },
    onCustomer: (cu, e) => { if (e === 'leave') { toast(T('pov.left', { name: cu.name }), 1400); view.float(cu, `✖ ${T('result.left').toLowerCase()}`, 'bad'); buzz([30, 40, 30]); } else if (e === 'arrive') { sfx.arrive(); if (cu.group) sfx.chatter(); } },
    onOpen: () => { sfx.bell(); banner(T('m3d.open'), T('m3d.open.sub')); },
    onFinish: (r) => showResult(r),
    onShelfOpen: (s) => openCard(s),
    onBurnerOpen: (s, slot) => openSoupCard(s, slot),
    onPick: () => sfx.pick(), onJobStart: (s) => (s.type === 'fryer' || s.type === 'burner' ? sfx.sizzle() : s.type === 'pot' ? sfx.splash() : sfx.drop()), onJobDone: () => sfx.done(), onPlace: (bowl) => (bowl?.done ? sfx.clink() : sfx.place()), onTrash: () => sfx.trash(),
    onSpeak: (cu, kind, text) => { view.say(cu, text); if (kind === 'wait' || kind === 'good') sfx.hum(kind); },
  }, kitchenFor(isPortrait(), playMode === 'level' ? level.layout : 'default'), playerMods());
  return w;
}
function rebuild() { view.clearAll(); view.build(world, { ...opts, decor: progress().decor }); }
let lastPortrait = isPortrait();
addEventListener('resize', () => {
  const p = isPortrait(); if (p === lastPortrait) return; lastPortrait = p;
  if (running) return; // đổi hướng giữa ca: giữ nguyên tới ca sau
  world = newWorld(); rebuild();
});
// ---- card chọn nguyên liệu ----
let cardSel = [];   // danh sách item đã chọn, có thể trùng (2 tô cho 2 khách)
function openCard(s) {
  if (botMode) { world.pickFromShelf([]); return; }   // bot không dùng card
  cardMode = 'shelf'; cardSel = []; const free = 2 - world.chef.hand.length;
  $('cardTitle').textContent = s.label; $('card').classList.toggle('hidename', opts.hideName || !!opts.hideNameAuto);
  $('cardGrid').replaceChildren(...s.items.map((it) => {
    const el = document.createElement('div'); el.className = 'it'; el.dataset.it = it;
    el.innerHTML = `<span class="ic">${iconFor(it)}</span><span class="nm">${label(it)}</span><span class="cnt"></span><span class="minus">−</span>`;
    // chạm ô = thêm 1 (chạm 2 lần = 2 cái giống nhau); đầy rồi chạm ô khác = thay cái cũ nhất; nút − = bớt 1
    el.onclick = (e) => { if (e.target.classList.contains('minus')) { const i = cardSel.lastIndexOf(it); if (i >= 0) cardSel.splice(i, 1); } else if (free <= 0) return; else { if (cardSel.length >= free) cardSel.shift(); cardSel.push(it); } renderCardSel(free); };
    return el;
  }));
  renderCardSel(free); $('card').classList.add('show');
}
function iconFor(it) { const u = iconUrl(it); return u ? `<img src="${u}" alt="" draggable="false">` : (D.items[it]?.icon || '🍲'); }
function renderCardSel(free) {
  for (const el of $('cardGrid').children) { const n = cardSel.filter((x) => x === el.dataset.it).length; el.classList.toggle('sel', n > 0); el.querySelector('.cnt').textContent = n > 1 ? `×${n}` : ''; }
  $('cardNote').textContent = free <= 0 ? T('m3d.handFull') : T('m3d.pick', { n: free, left: free - cardSel.length });
  $('cardTake').textContent = cardSel.length ? T('m3d.take', { n: cardSel.length }) : T('m3d.noTake');
}
let cardMode = 'shelf';
function closeCard(items) {
  const wt = world?.chef.waiting; if (!wt) { $('card').classList.remove('show'); return; }
  if (String(wt).startsWith('burner')) {
    const ok = world.cookSoup(items);
    if (!ok) { cardSel = []; renderSoupSel(); $('cardNote').innerHTML = `<b style="color:var(--red)">${lastMistake}</b> — ${T('m3d.reorder')}`; sfx.mistake(); return; }   // sai → card mở tiếp
  } else world.pickFromShelf(items);
  $('card').classList.remove('show');
}
let lastMistake = '';   // phân theo chỗ đang đứng chờ, không theo cardMode (tránh kẹt)
$('cardClose').onclick = () => closeCard([]); $('cardTake').onclick = () => closeCard(cardSel);
// card nước lèo ở lò: bấm nguyên liệu THEO THỨ TỰ cho vào nồi (bếp thật: cốt → huyết → nước), rồi "Đun"
function openSoupCard(s, slot) {
  if (botMode) return;   // bot tự nấu trong botDecide
  cardMode = 'soup'; cardSel = [];
  $('cardTitle').textContent = T('m3d.burnerWhat', { n: slot + 1 }); $('card').classList.toggle('hidename', opts.hideName);
  $('cardGrid').replaceChildren(...world.soupIngredients().map((it) => {
    const el = document.createElement('div'); el.className = 'it'; el.dataset.it = it;
    el.innerHTML = `<span class="ic">${iconFor(it)}</span><span class="nm">${label(it)}</span><span class="cnt"></span><span class="minus">−</span>`;
    el.onclick = (e) => { if (e.target.classList.contains('minus')) { const i = cardSel.indexOf(it); if (i >= 0) cardSel.splice(i, 1); } else if (!cardSel.includes(it)) cardSel.push(it); renderSoupSel(); };
    return el;
  }));
  renderSoupSel(); $('card').classList.add('show');
}
function renderSoupSel() {
  for (const el of $('cardGrid').children) { const i = cardSel.indexOf(el.dataset.it); el.classList.toggle('sel', i >= 0); el.querySelector('.cnt').textContent = i >= 0 ? `${i + 1}` : ''; }
  $('cardNote').textContent = cardSel.length ? T('m3d.potOrder', { list: cardSel.map(labelL).join(' → ') }) : T('m3d.potHint');
  $('cardTake').textContent = cardSel.length ? T('m3d.heat') : T('m3d.noHeat');
}
function start(bot = false, mode = playMode) {
  setSource('shop');   // bếp 3D / Luyện / Rush / Survival: công thức quán (sim-data)
  ensureAudio(); startMusic(); playMode = mode; povLevel = null; set3D(true);
  botMode = bot === true; world = newWorld();
  rebuild();   // mỗi level có thể khác trạm (bếp lớn dần) → dựng lại
  $('card').classList.remove('show');
  running = true; $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden'); armBackGuard();
  logEv('level.start', { id: playMode === 'level' ? level.id : playMode, mode: playMode === 'level' ? '3d' : playMode, bot: botMode || undefined });
  showHint(botMode ? T('m3d.hint.bot') : playMode === 'drill' ? T('m3d.hint.drill') : playMode === 'rush' ? T('m3d.hint.rush') : playMode === 'survival' ? T('m3d.hint.survival') : (tl(`level.${level.id}.hint`, level.hint) || tl(`level.${level.id}.new`, level.whatsNew)), playMode === 'level' ? 9000 : 6000);
  // ẩn tên trên card khi mọi món trong ca đã thuộc (≥3 tô sạch liên tiếp), trừ khi Kent tự tick
  opts.hideNameAuto = world.shift.dishes.every(isMastered);
  $('btnTakeover').classList.toggle('hidden', !botMode);
  $('clockLbl').textContent = world.shift.survival ? T('hud.survived') : T('hud.timeLeft');
}
function showResult(r) {
  running = false; setBoil(false); setMood(playMode === 'day' ? 'close' : 'calm'); if (r.stars >= 1 || (r.puzzle)) setTimeout(() => sfx.cheer(), 300); $('hud').classList.add('hidden'); $('result').classList.remove('hidden'); $('card').classList.remove('show');
  const isPz = !!r.puzzle; const st = r.stats || { bowls: [], idle: 0, taps: 0, trips: 0 }; const isDay = playMode === 'level';
  const sh = isPz ? { id: 'puzzle', name: T(`mini.${['ninja', 'reflex', 'assemble', 'pov'].includes(lastPuzzle.kinds[0]) ? lastPuzzle.kinds[0] : 'quiz'}`), dishes: [...new Set(st.bowls.map((b) => b.dish))] } : (povLevel || world.shift);
  logEv(isPz ? 'mini.end' : 'level.end', { id: sh.id, stars: r.stars || 0, served: r.served, left: r.left, mistakes: r.mistakes, money: r.money });
  const kitchen = world.kitchen;
  // quầy POV không đi lại nên không so được với lộ trình bot của bếp 3D
  const par = (dish) => (isPz || r.pov) ? { seconds: null, taps: 0, route: [] } : parFor(sh, kitchen, dish);
  let pts = null; const wasNew = isDay && bestStars(sh.id) === 0;
  if (!botMode) { recordResult(r); pts = isDay ? recordLevel(sh.id, r) : playMode === 'survival' ? recordSurvival(r) : recordPlay(r); renderMenu(); }
  const clean = st.bowls.filter((b) => !b.mistakes).length;
  // sao rơi từng cái · tiền chạy số
  const starsEl = $('stars');
  if (isDay) { starsEl.innerHTML = [0, 1, 2].map((i) => `<span class="s">${i < r.stars ? '★' : '☆'}</span>`).join(''); [...starsEl.children].forEach((el, i) => setTimeout(() => { el.classList.add('in'); if (i < r.stars) sfx.done(); }, 350 + i * 380)); }
  else starsEl.textContent = playMode === 'survival' ? T('n.customers', { n: r.served }) : isPz ? T('result.cleanOf', { a: clean, b: st.bowls.length }) : (r.mistakes === 0 ? `✓ ${T('result.clean')}` : T('pz.nErr', { n: r.mistakes }));
  countUp($('rMoney'), r.money, isDay ? 1400 : 0);
  $('rTitle').textContent = playMode === 'drill' ? T('result.drillEnd') : playMode === 'rush' ? T('result.rushEnd') : playMode === 'survival' ? (pts?.record ? T('result.newRecord') : T('result.survivalEnd')) : isPz ? T('result.miniEnd', { name: sh.name }) : `${sh.name} — ${tl(`level.${sh.id}.title`, sh.title)}${r.stars ? '' : ` · ${T('result.failed')}`}`;
  $('rDishes').textContent = isDay ? `${goalText(sh)} · ${tl(`level.${sh.id}.new`, sh.whatsNew)}` : playMode === 'survival' ? `${T('hud.survived')} ${Math.floor((st.time || 0) / 60)}:${String(Math.floor((st.time || 0) % 60)).padStart(2, '0')} · ${T('n.dishes', { n: sh.dishes.length })}` : sh.dishes.map((d) => D.recipes[d].name).join(' · ');
  $('rPoints').textContent = pts ? `+${pts.earned}k${pts.starBonus ? ` ${T('result.starBonus', { k: pts.starBonus, n: pts.newStars })}` : ''} → ${T('result.bank', { k: pointsAvailable() })}` : '';
  // khách quen nhận xét cuối ngày
  const regs = r.regulars || []; const rc = $('rRecap');
  if (isDay && regs.length) { const pick = regs[Math.floor(Math.random() * regs.length)]; rc.textContent = recapLine(pick.id, pick.served); rc.classList.toggle('hidden', !rc.textContent); } else rc.classList.add('hidden');
  // thẻ mở khoá: level sau có gì mới (chỉ khi lần đầu qua level này)
  // P6b — mini-game của tỉnh: đủ câu sạch thì được vật kỷ niệm (một lần)
  const miniProv = isPz && lastPuzzle.prov ? PROVINCES.find((p) => p.id === lastPuzzle.prov) : null;
  const souvenir = miniProv && clean >= (MINIS[miniProv.id]?.pass ?? 99) && winSouvenir(miniProv.id) ? [{ kind: 'souvenir', id: miniProv.id }] : [];
  const nextUnlocks = [...souvenir, ...(isDay && !botMode ? codexNew(sh.dishes, pageOpen, realRecipeOpen) : []), ...(isDay && r.stars >= 1 && wasNew ? unlocksAfter(sh) : [])];   // sổ tay mở TRƯỚC (thưởng thật)
  $('rUnlock').replaceChildren(...nextUnlocks.map((u, i) => { const el = document.createElement('div'); el.className = 'u'; el.style.animationDelay = `${1.4 + i * 0.25}s`;
    if (u.kind === 'dish') { const ic = iconUrl(D.recipes[u.id]?.base?.bowl || 'soup-bowl'); el.innerHTML = `${ic ? `<img src="${ic}" alt="">` : '<span class="ic">🍜</span>'}<div><b>${T('unlock.dish')}</b><small>${dishLabel(u.id, true)}</small></div>`; }
    else if (u.kind === 'upgrade') { const up = UPGRADES.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">${up.icon}</span><div><b>${T('unlock.upgrade', { name: tl(`upgrade.${up.id}.name`, up.name) })}</b><small>${tl(`upgrade.${up.id}.desc`, up.desc)}</small></div>`; }
    else if (u.kind === 'souvenir') { const m = MINIS[u.id]; const pv = PROVINCES.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">${m.icon}</span><div><b>${T('unlock.souvenir', { name: tl(`mini.${u.id}.name`, m.name) })}</b><small>${tl(`prov.${pv.id}.name`, pv.name)} · ${tl(`mini.${u.id}.note`, m.note)}</small></div>`; }
    else if (u.kind === 'codex') { el.innerHTML = `<span class="ic">📖</span><div><b>${T('unlock.codex', { name: dishLabel(u.id) })}</b><small>${T('unlock.codex.sub')}</small></div>`; el.onclick = () => openCodex(u.id, { sfx }); }
    else if (u.kind === 'recipe') { el.innerHTML = `<span class="ic">🍳</span><div><b>${T('unlock.recipe', { name: dishLabel(u.id) })}</b><small>${T('unlock.recipe.sub', { n: RECIPE_STARS })}</small></div>`; el.onclick = () => openCodex(u.id, { sfx }); }
    else if (u.kind === 'province') { const pv = PROVINCES.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">${pv.icon}</span><div><b>${T('unlock.province', { name: tl(`prov.${pv.id}.name`, pv.name) })}</b><small>${tl(`prov.${pv.id}.sub`, pv.sub)} · ${T('unlock.province.trip')}</small></div>`; }
    else if (u.kind === 'world') { const wd = worldById(u.id); el.innerHTML = `<span class="ic">${wd.icon}</span><div><b>${T('unlock.world', { name: QUAN[wd.id] ? tl(`quan.${wd.id}.name`, QUAN[wd.id].name) : tl(`world.${wd.id}.name`, wd.name) })}</b><small>${tl(`world.${wd.id}.sub`, wd.sub)} · ${wd.levels.length} level</small></div>`; }
    else { const rg = REGULARS.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">🙋</span><div><b>${T('unlock.regular', { name: rg.name })}</b><small>${tl(`cust.${rg.id}.sketch`, rg.sketch)} · ${T('unlock.regular.fav', { dish: dishLabel(rg.dish) })}</small></div>`; }
    return el; }));
  const nxt = isDay ? nextLevel(sh) : null; const J = journeyWorlds(); const nw = isDay && !nxt ? J[J.indexOf(worldById(sh.world)) + 1] : null;
  const nb = $('btnNext'); nb.classList.toggle('hidden', !isDay || r.stars < 1 || (!nxt && !(nw && worldUnlocked(nw.id))));
  nb.textContent = nxt ? `Level ${nxt.n} →` : nw ? T('result.nextWorld', { name: QUAN[nw.id] ? tl(`quan.${nw.id}.name`, QUAN[nw.id].name) : tl(`world.${nw.id}.name`, nw.name) }) : '';
  $('rTips').textContent = r.tips; $('rServed').textContent = r.served; $('rLeft').textContent = r.left; $('rMistakes').textContent = r.mistakes;
  // --- báo cáo để tối ưu cách làm thật (gấp trong <details>) ---
  const rows = st.bowls.map((b) => { const pr = par(b.dish); const d = pr.seconds ? b.wait - pr.seconds : null;
    return `<tr><td>${b.name}</td><td class="num">${b.wait.toFixed(0)}s</td><td class="num ${d == null ? '' : d <= 5 ? 'good' : d <= 15 ? 'mid' : 'bad'}">${pr.seconds ? (d >= 0 ? '+' : '') + d.toFixed(0) + 's' : '—'}</td><td class="num ${b.mistakes ? 'bad' : 'good'}">${b.mistakes || '✓'}</td><td class="num">${b.taps}</td></tr>`; }).join('');
  const orderErrs = r.errors.filter((e) => !e.waste); const wasteErrs = r.errors.filter((e) => e.waste);
  const slowest = st.bowls.slice().sort((a, b) => (b.wait - (par(b.dish).seconds || 0)) - (a.wait - (par(a.dish).seconds || 0)))[0];
  const route = slowest ? par(slowest.dish) : null;
  const mast = sh.dishes.map((d) => { const m = masteryOf(d); return `<span class="chip ${m.streak >= 3 ? 'good' : ''}">${D.recipes[d].name}: ${T('result.cleanOf', { a: m.clean, b: m.plays })}${m.streak >= 3 ? ` · ${T('rep.mastered')}` : ''}${m.best ? ` · ${T('rep.fastest', { s: m.best.toFixed(0) })}` : ''}</span>`; }).join('');
  $('report').innerHTML = `
    <div class="kpis"><div><b>${st.idle.toFixed(0)}s</b><small>${T('rep.idle')}</small></div><div><b>${st.taps}</b><small>${T('rep.taps')}</small></div><div><b>${st.bowls.length ? (st.bowls.reduce((n, b) => n + b.wait, 0) / st.bowls.length).toFixed(0) + 's' : '—'}</b><small>${T('rep.avgBowl')}</small></div><div><b>${wasteErrs.length}</b><small>${T('rep.waste')}</small></div></div>
    ${rows ? `<table class="rep"><thead><tr><th>${isPz ? T('rep.q') : T('rep.bowl')}</th><th>${T('rep.time')}</th><th>${isPz ? '' : T('rep.vsBot')}</th><th>${T('rep.err')}</th><th>${T('rep.tap')}</th></tr></thead><tbody>${rows}</tbody></table>` : `<div class="sub">${T('rep.none')}</div>`}
    ${orderErrs.length ? `<details><summary>${T('rep.orderErrs', { n: orderErrs.length })}</summary><ul class="errs">${orderErrs.map((e) => `<li><span class="t">${e.t.toFixed(0)}s</span> ${e.tag}</li>`).join('')}</ul></details>` : ''}
    ${route && route.seconds ? `<details><summary>${T('rep.route', { name: slowest.name, s: route.seconds, taps: route.taps })}</summary><ol class="route">${route.route.map((x) => `<li>${x}</li>`).join('')}</ol></details>` : ''}
    <div class="mast">${mast}</div>`;
}
/** Số chạy lên tới `to` trong `ms` (kèm tiếng leng keng thưa). */
function countUp(el, to, ms) {
  if (!ms) { el.textContent = to; return; }
  const t0 = performance.now(); let lastTick = 0;
  const step = (now) => { const k = Math.min(1, (now - t0) / ms); const e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e); if (k - lastTick > 0.12) { lastTick = k; sfx.tap(); } if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
let puzzle = null;
function startPuzzle(kinds = ['order', 'intruder', 'missing'], rounds = 9, prov = null) {
  // P6b: mini-game của TỈNH dùng công thức chung + món của các quán trong tỉnh; mini ở tab Thêm vẫn dùng bản quán.
  setSource(prov ? 'game' : 'shop'); ensureAudio(); startMusic(); playMode = 'puzzle'; running = false; botMode = false;
  let dishes = prov ? [...new Set(prov.worlds.flatMap((w) => worldById(w)?.levels.flatMap((L) => L.dishes) || []))] : (practice.length ? practice : ALL_DISHES);
  if (kinds[0] === 'assemble') { dishes = dishes.filter(assembleOk); if (!dishes.length) dishes = ALL_DISHES.filter(assembleOk); }
  if (!dishes.length) dishes = ALL_DISHES;
  const weights = weightsFor(dishes);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden');
  lastPuzzle = { kinds, rounds, prov: prov?.id || null }; armBackGuard();
  puzzle = new Puzzle({ dishes, weights, rounds, kinds, sfx, onDone: (r) => showResult(r) }); puzzle.start();
  logEv('mini.start', { kind: kinds[0], rounds, prov: prov?.id || undefined });
}
/** Mini-game của một tỉnh (data/regions.js MINIS) — đạt `pass` câu sạch thì được vật kỷ niệm. */
function startProvinceMini(p) { const m = MINIS[p.id]; if (!m) return; startPuzzle([m.kind], m.rounds, p); }
let lastPuzzle = { kinds: ['order', 'intruder', 'missing'], rounds: 9 };
let pov = null;
function startPov(rounds = 8) {
  setSource('shop'); ensureAudio(); startMusic(); playMode = 'puzzle'; running = false; botMode = false; set3D(false);
  let dishes = (practice.length ? practice : ALL_DISHES).filter(povOk); if (!dishes.length) dishes = ALL_DISHES.filter(povOk);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden');
  lastPuzzle = { kinds: ['pov'], rounds }; povLevel = null; armBackGuard();
  pov = new Pov({ dishes, weights: weightsFor(dishes), rounds, sfx, onDone: (r) => showResult(r), onQuit: () => { $('menu').classList.remove('hidden'); } }); pov.start();
}
/** Level chơi ở QUẦY POV (docs/PLAN-CORE.md bước 2). Món nào quầy không làm được thì rơi về bếp 3D. */
function levelOnPov(L) {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('bep3d')) return false;   // dev/smoke: ép về bếp 3D
  return L.dishes.every(povOk);
}
let povLevel = null;                      // level đang chơi ở quầy POV (null = đang chơi bếp 3D)
let show3d = false;                       // khung 3D chỉ bật khi thật sự chơi "Bếp thật"
/** Bếp 3D là phần phụ: ẩn hẳn canvas (và ngưng vẽ) khi không chơi nó. */
function set3D(on) {
  show3d = !!on;
  $('app').classList.toggle('hidden', !show3d);
  document.body.classList.toggle('flat', !show3d);
}
function startLevelPov(L) {
  setSource('game');   // game chính: công thức chung Việt Nam (dishes/*.json)
  ensureAudio(); startMusic(); playMode = 'level'; running = false; botMode = false; povLevel = L; set3D(false);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden'); $('card').classList.remove('show');
  armBackGuard();
  const mods = playerMods(); const con = { ...(L.constraints || {}) };
  if (mods.bowlSlots > 3 && !con.slots) con.bowlSlots = mods.bowlSlots;   // nâng cấp Chồng tô nóng
  if (mods.peek && !con.peek) con.peek = mods.peek;                       // nâng cấp Bảng gọi món (P4)
  if (mods.twinPot) con.twinPot = true;                                   // nâng cấp Nồi trụng đôi (P4)
  pov = new Pov({
    dishes: L.dishes, weights: weightsFor(L.dishes), level: L,
    arrivals: povArrivals(L), simplify: L.simplify, constraints: con,
    goal: L.goal, moneyTargets: L.moneyTargets, events: L.events, seconds: L.seconds, rush: L.rush,
    burners: mods.burners || 1, patience: L.patience, sfx,
    tutorial: L.id === 'pho-1' && !tutSeen(), onTutorialDone: () => { markTut(); logEv('tut.done'); }, onTutorialSkip: () => { markTut(); logEv('tut.skip'); },
    onDone: (r) => showResult(r), onQuit: () => { logEv('level.quit', { id: L.id, mode: 'pov' }); $('menu').classList.remove('hidden'); },
  });
  pov.start();
  logEv('level.start', { id: L.id, world: L.world, dishes: L.dishes.length, mode: 'pov' });
  showHint(L.hint ? tl(`level.${L.id}.hint`, L.hint) : tl(`level.${L.id}.new`, L.whatsNew), 9000);
}
$('btnPov').onclick = () => startPov(8);
$('btnKitchen3d').onclick = () => { if (levelUnlocked(level)) start(false, 'level'); };
$('btnPuzzle').onclick = () => startPuzzle(['order', 'intruder', 'missing'], 9); $('btnAssemble').onclick = () => startPuzzle(['assemble'], 10); $('btnNinja').onclick = () => startPuzzle(['ninja'], 6); $('btnReflex').onclick = () => startPuzzle(['reflex'], 10); $('pzQuit').onclick = () => { puzzle?.stop(); $('menu').classList.remove('hidden'); };
$('btnDrill').onclick = () => start(false, 'drill'); $('btnRush').onclick = () => start(false, 'rush'); $('btnSurvival').onclick = () => start(false, 'survival');
$('btnResetMastery').onclick = () => { if (confirm(T('menu.resetConfirm'))) { resetMastery(); resetProgress(); renderMenu(); world = newWorld(); rebuild(); } };
// ---- menu: tab ----
for (const b of document.querySelectorAll('.tabs.three button')) b.onclick = () => { for (const x of document.querySelectorAll('.tabs.three button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('.tab.main')) t.classList.toggle('hidden', t.id !== `tab-${b.dataset.tab}`); safeSet('qb.tab', b.dataset.tab); };
for (const b of document.querySelectorAll('.tabs.sub button')) b.onclick = () => { for (const x of document.querySelectorAll('.tabs.sub button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('.tab.sub')) t.classList.toggle('hidden', t.id !== `tab-${b.dataset.sub}`); safeSet('qb.sub', b.dataset.sub); };
(document.querySelector(`.tabs.three button[data-tab="${safeGet('qb.tab') || 'day'}"]`) || document.querySelector('.tabs.three button')).click();
(document.querySelector(`.tabs.sub button[data-sub="${safeGet('qb.sub') || 'survival'}"]`) || document.querySelector('.tabs.sub button')).click();
const dishName = (d) => D.recipes[d].name;
function renderMenu() {
  // --- bản đồ: hàng world + lưới level + thẻ chi tiết (docs/PLAN-WORLDS.md §6) ---
  const cur = currentLevel(); const M = allMastery();
  // --- hành trình: hàng tỉnh (Bắc → Nam) rồi hàng quán trong tỉnh đang chọn (data/regions.js) ---
  const curProv = provinceOf(WORLDS[worldIdx].id) || PROVINCES[0];
  $('provRow').replaceChildren(...PROVINCES.map((p) => {
    const un = provinceUnlocked(p.id); const el = document.createElement('div');
    const isNew = un && p.piece && !tripSeen(p.id) && !p.soon;
    el.className = 'pv' + (p.id === curProv.id ? ' on' : '') + (un ? '' : ' locked') + (p.soon ? ' soon' : '') + (isNew ? ' new' : '');
    const pw = prevProvince(p.id);
    const max = p.worlds.reduce((n, w) => n + (worldById(w)?.maxStars || 0), 0);
    const sv = hasSouvenir(p.id) ? MINIS[p.id]?.icon : '';
    el.innerHTML = `<div class="ic">${un ? p.icon : '🔒'}</div><b>${tl(`prov.${p.id}.name`, p.name)}</b><small>${p.soon ? T('menu.prov.soon') : un ? `${provinceStars(p.id)}/${max} ★` : T('menu.locked', { n: p.unlockStars })}</small>${un && p.piece && !p.soon ? `<span class="trip" title="${T('menu.prov.replay')}">🛵</span>` : ''}${un && !p.soon && MINIS[p.id] ? `<span class="mini" title="${T('menu.prov.mini')}">${sv || '🎪'}</span>` : ''}`;
    el.onclick = (e) => {
      if (!un) { toast(T('menu.lockProv', { n: p.unlockStars, prev: pw ? tl(`prov.${pw.id}.name`, pw.name) : '' }), 1600); return; }
      if (e.target.closest('.mini')) { startProvinceMini(p); return; }
      if (e.target.closest('.trip') || (p.piece && !tripSeen(p.id))) { markTrip(p.id); playTrip(p.piece, { sfx, onDone: () => { renderMenu(); } }); if (p.soon) return; }
      if (p.soon) { toast(T('menu.prov.soonTip'), 1600); return; }
      const w = worldById(p.worlds.find((id) => worldUnlocked(id) && worldStars(id) < worldById(id).maxStars) || p.worlds[0]); worldIdx = WORLDS.indexOf(w);
      const first = w.levels.find((L) => !levelUnlocked(L)) || w.levels[0]; selectLevel(w.levels.find((L) => L.id === cur.id) ? cur : (levelUnlocked(first) ? first : w.levels[0]));
    };
    return el;
  }));
  $('worldRow').replaceChildren(...curProv.worlds.map((id) => worldById(id)).filter(Boolean).map((w) => {
    const i = WORLDS.indexOf(w); const un = worldUnlocked(w.id); const el = document.createElement('div');
    el.className = 'wd' + (i === worldIdx ? ' on' : '') + (un ? '' : ' locked');
    const q = QUAN[w.id];
    el.innerHTML = `<div class="ic">${un ? w.icon : '🔒'}</div><b>${q ? tl(`quan.${w.id}.name`, q.name) : tl(`world.${w.id}.name`, w.name)}</b><small>${un ? `${worldStars(w.id)}/${w.maxStars} ★` : T('menu.locked', { n: w.starsToUnlock })}</small>`;
    el.onclick = () => { worldIdx = i; const first = w.levels.find((L) => !levelUnlocked(L)) || w.levels[0]; selectLevel(w.levels.find((L) => L.id === cur.id) ? cur : (levelUnlocked(first) ? first : w.levels[0])); };
    return el;
  }));
  const W = WORLDS[worldIdx];
  $('lvGrid').replaceChildren(...W.levels.map((L) => {
    const un = levelUnlocked(L); const st = bestStars(L.id); const el = document.createElement('button');
    el.className = 'lvb' + (L.id === level.id ? ' on' : '') + (un ? '' : ' locked') + (L.challenge ? ' ch' : '') + (st ? ' done' : '') + (L.id === cur.id ? ' next' : '');
    el.innerHTML = `${un ? L.n : '🔒'}<span class="st">${'★'.repeat(st)}${un ? '☆'.repeat(3 - st) : ''}</span>`;
    el.onclick = () => selectLevel(L);
    return el;
  }));
  const un = levelUnlocked(level); const st = bestStars(level.id);
  const learned = level.dishes.filter((d) => (M[d]?.streak || 0) >= 3).length;
  const card = $('lvCard'); card.className = 'lvcard daycard' + (un ? '' : ' locked');
  const tags = [
    level.training ? `<span class="tag train">${T('tag.training')} — ${simplifyLabel(level.simplify)}</span>` : '',
    level.challenge ? `<span class="tag new">⭐ ${T('tag.challenge')}</span>` : '',
    level.goal ? `<span class="tag goal">${goalText(level)}</span>` : '',
    ...conTags(level.constraints),
    level.layout !== 'default' ? `<span class="tag">🍳 ${tl(`kitchen.${level.layout}.name`, KITCHEN_VARIANTS[level.layout].name)}</span>` : '',
    ...(level.events || []).map((e) => `<span class="tag">${T(`tag.ev.${['rain', 'vip', 'tour'].includes(e.kind) ? e.kind : 'change'}`)}</span>`),
    level.regulars.length ? `<span class="tag">🙋 ${level.regulars.map((id) => REGULARS.find((r) => r.id === id)?.name).join(', ')}</span>` : '',
  ].filter(Boolean).join('');
  card.innerHTML = un
    ? `<b>${tl(`world.${level.world}.name`, worldById(level.world).name)} ${level.n} — ${tl(`level.${level.id}.title`, level.title)}</b><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
       <small class="whatsnew">${tl(`level.${level.id}.new`, level.whatsNew)}</small>
       <small class="dish">${level.dishes.length > 4 ? T('n.dishes', { n: level.dishes.length }) : level.dishes.map(dishName).join(' · ')}</small>
       <div class="tags">${tags}</div>
       <small>${T('menu.card.meta', { sec: level.seconds, n: level.count, money: level.moneyTargets[0] })}${learned ? ` · ${T('menu.card.learned', { a: learned, b: level.dishes.length })}` : ''}</small>`
    : `<b>🔒 ${level.name}</b><small>${worldUnlocked(level.world) ? T('menu.lockLevel', { world: tl(`world.${W.id}.name`, W.name), n: level.n - 1 }) : (() => { const J = journeyWorlds(); const pw = J[J.indexOf(W) - 1]; return T('menu.lockWorld', { n: W.starsToUnlock, world: pw ? tl(`world.${pw.id}.name`, pw.name) : '' }); })()}</small>`;
  const lvName = `${tl(`world.${level.world}.name`, worldById(level.world).name)} ${level.n}`;
  $('btnStart').disabled = !un; $('btnStart').textContent = un ? (st ? T('menu.replay', { name: lvName }) : T('menu.enter', { name: lvName })) : '🔒 ' + T('menu.notOpen');
  // nâng cấp bếp
  const total = totalStars();
  $('upgrades').replaceChildren(...UPGRADES.map((u) => { const lv2 = upgradeLevel(u.id); const cost = upgradeCost(u.id); const locked = !upgradeUnlocked(u.id); const el = document.createElement('div'); el.className = 'sh' + (!locked && cost == null ? ' max' : '') + (locked ? ' locked' : '');
    el.innerHTML = `<span class="ic">${u.icon}</span><div><b>${tl(`upgrade.${u.id}.name`, u.name)} <span class="lv">${'●'.repeat(lv2)}${'○'.repeat(u.levels.length - lv2)}</span></b><small>${tl(`upgrade.${u.id}.desc`, u.desc)}</small>${locked ? `<small>${T('shop.unlockAt', { n: u.unlockStars, have: total })}</small>` : cost == null ? `<small style="color:#2f8a3a;font-weight:700">${T('shop.max')} ✓</small>` : `<button ${cost > pointsAvailable() ? 'disabled' : ''}>💰 ${cost}k</button>`}</div>`;
    const b = el.querySelector('button'); if (b) b.onclick = () => { if (buyUpgrade(u.id)) { sfx.done(); toast(T('shop.upgraded', { name: tl(`upgrade.${u.id}.name`, u.name), lv: upgradeLevel(u.id) })); renderMenu(); world = newWorld(); rebuild(); } }; return el; }));
  // survival
  const sv = progress().survival; $('survRecord').textContent = sv ? `${T('more.record')}: ${T('n.customers', { n: sv.served })} · ${Math.floor(sv.time / 60)}:${String(Math.floor(sv.time % 60)).padStart(2, '0')} · ${sv.money}k` : T('more.noRecord');
  // luyện tập: chọn món
  $('dishPick').replaceChildren(...ALL_DISHES.map((d) => { const el = document.createElement('div'); const m = masteryOf(d); el.className = 'dp' + (practice.includes(d) ? ' on' : ''); el.innerHTML = `<span>${dishName(d)}</span><small>${m.plays ? `${m.clean}/${m.plays}${m.streak >= 3 ? ' ✓' : ''}` : '—'}</small>`; el.onclick = () => { practice = practice.includes(d) ? practice.filter((x) => x !== d) : [...practice, d]; setPractice(practice); renderMenu(); }; return el; }));
  $('pickCount').textContent = T('n.dishesOf', { a: practice.length, b: ALL_DISHES.length }); $('pzScope').textContent = practice.length ? `${T('n.dishes', { n: practice.length })}: ${practice.slice(0, 4).map(dishName).join(', ')}${practice.length > 4 ? '…' : ''}` : T('more.allDishes', { n: ALL_DISHES.length }); $('btnDrill').disabled = $('btnRush').disabled = practice.length === 0;
  // trang trí
  $('ptsNow').textContent = pointsAvailable(); $('ptsTotal').textContent = progress().points; $('ptsBadge').textContent = DECOR.some((d) => !hasDecor(d.id) && d.cost <= pointsAvailable()) || UPGRADES.some((u) => upgradeCost(u.id) != null && upgradeCost(u.id) <= pointsAvailable()) ? '!' : '';
  // sổ tay
  renderCodex($('codexGrid'), (d) => openCodex(d, { sfx })); const cn = codexCount(); $('cxBadge').textContent = cn ? String(cn) : ''; $('cxSub').textContent = cn ? T('n.dishesOf', { a: cn, b: GAME_DISHES.length }) : T('codex.empty');
  // P6b — kệ vật kỷ niệm: mỗi tỉnh một món, thắng mini-game của tỉnh thì được
  const svAll = souvenirs();
  $('cxSouv').replaceChildren(...PROVINCES.filter((p) => MINIS[p.id]).map((p) => { const m = MINIS[p.id]; const got = !!svAll[p.id]; const el = document.createElement('div');
    el.className = 'sv' + (got ? '' : ' locked'); el.title = got ? `${tl(`mini.${p.id}.name`, m.name)} — ${tl(`mini.${p.id}.note`, m.note)}` : T('menu.prov.mini');
    el.innerHTML = `<span class="ic">${got ? m.icon : '·'}</span><small>${got ? tl(`mini.${p.id}.name`, m.name) : tl(`prov.${p.id}.name`, p.name)}</small>`;
    el.onclick = () => { if (provinceUnlocked(p.id)) startProvinceMini(p); else toast(T('menu.lockProv', { n: p.unlockStars, prev: prevProvince(p.id) ? tl(`prov.${prevProvince(p.id).id}.name`, prevProvince(p.id).name) : '' }), 1600); };
    return el; }));
  $('shop').replaceChildren(...DECOR.map((d) => { const own = hasDecor(d.id); const el = document.createElement('div'); el.className = 'sh' + (own ? ' owned' : ''); el.innerHTML = `<span class="ic">${d.icon}</span><div><b>${tl(`decor.${d.id}.name`, d.name)}</b><small>${tl(`decor.${d.id}.desc`, d.desc)}</small>${own ? `<small style="color:#2f8a3a;font-weight:700">${T('shop.owned')} ✓</small>` : `<button ${d.cost > pointsAvailable() ? 'disabled' : ''}>💰 ${d.cost}k</button>`}</div>`; if (!own) el.querySelector('button').onclick = () => { if (buyDecor(d.id)) { sfx.done(); toast(T('shop.bought', { name: tl(`decor.${d.id}.name`, d.name) })); renderMenu(); world = newWorld(); rebuild(); } }; return el; }));
}
/** Nhãn ngắn cho phần công thức được rút gọn ở level tập. */
function simplifyLabel(sim) {
  if (!sim) return '';
  const miss = []; if (sim.skipRinse) miss.push(T('simp.rinse')); if (sim.hotBowl) miss.push(T('simp.bowl')); if (sim.skipPrep) miss.push(T('simp.prep')); if (sim.skipFry) miss.push(T('simp.fry')); if (sim.soupReady) miss.push(T('simp.soup')); if (sim.toppings || sim.maxSteps) miss.push(T('simp.toppings'));
  return miss.length ? T('simp.without', { list: miss.join(', ') }) : T('simp.short');
}
function goalText(L) {
  const g = L.goal; if (!g) return T('goal.money', { list: L.moneyTargets.join(' / ') });
  if (g.kind === 'clean') return `🎯 ${T('goal.clean', { n: g.bowls })}`;
  if (g.kind === 'no-waste') return `🎯 ${T('goal.noWaste')}`;
  if (g.kind === 'streak') return `🎯 ${T('goal.streak', { n: g.n })}`;
  if (g.kind === 'before') return `🎯 ${T('goal.before', { s: g.seconds })}`;
  return '';
}
function conTags(c) {
  if (!c) return [];
  const out = []; if (c.potSlots) out.push(`<span class="tag">🧺 ${T('tag.baskets', { n: c.potSlots })}`); if (c.handCapacity === 1) out.push(`<span class="tag">✋ ${T('tag.oneHand')}`);
  if (c.brothCap) out.push(`<span class="tag">🥘 ${T('tag.brothCap', { n: c.brothCap })}`); if (c.noStack) out.push(`<span class="tag">🔥 ${T('tag.noStack')}`);
  return out.map((x) => x + '</span>');
}
$('pickAll').onclick = () => { practice = [...ALL_DISHES]; setPractice(practice); renderMenu(); };
$('pickNone').onclick = () => { practice = []; setPractice(practice); renderMenu(); };
$('pickBun').onclick = () => { practice = ALL_DISHES.filter((d) => /^bun-/.test(d)); setPractice(practice); renderMenu(); };
$('pickWeak').onclick = () => { practice = ALL_DISHES.filter((d) => !isMastered(d)); setPractice(practice); renderMenu(); };
function selectLevel(L) { if (!L) return; level = L; worldIdx = Math.max(0, WORLDS.findIndex((w) => w.id === L.world)); renderMenu(); if (!running) { world = newWorld(); rebuild(); } }
renderMenu();
/** Vô bếp một level: lần đầu tiên → mở đầu văn phòng; lần đầu vô một quán → chủ quán chào + thử thách; rồi mới nấu. */
function enterLevel(L) {
  const go = () => (levelOnPov(L) ? startLevelPov(L) : start(false, 'level'));
  const owner = () => { if (QUAN[L.world] && !ownerMet(L.world)) { markOwner(L.world); playOwner(L.world, { sfx, onDone: go }); } else go(); };
  if (!introSeen()) { markIntro(); ensureAudio(); playIntro({ sfx, onDone: owner }); } else owner();
}
$('btnStart').onclick = () => { if (!levelUnlocked(level)) return; enterLevel(level); };
$('btnIntro').onclick = () => playIntro({ sfx }); $('btnRetry').onclick = () => playMode === 'puzzle' ? (lastPuzzle.kinds[0] === 'pov' ? startPov(lastPuzzle.rounds) : startPuzzle(lastPuzzle.kinds, lastPuzzle.rounds)) : playMode === 'level' && levelOnPov(level) ? startLevelPov(level) : start(botMode, playMode);
$('btnNext').onclick = () => {
  const n = nextLevel(level); if (n) selectLevel(n); else { const J = journeyWorlds(); const w = J[J.indexOf(worldById(level.world)) + 1]; if (w) selectLevel(w.levels[0]); }
  // sang tỉnh mới lần đầu → chuyến xe trước, rồi mới vô bếp
  const pv = provinceOf(level.world); if (pv?.piece && provinceUnlocked(pv.id) && !tripSeen(pv.id)) { $('result').classList.add('hidden'); markTrip(pv.id); playTrip(pv.piece, { sfx, onDone: () => enterLevel(level) }); return; }
  enterLevel(level);
};
$('btnBot').onclick = () => start(true);
function takeover() { if (!botMode) return; botMode = false; $('btnTakeover').classList.add('hidden'); showHint(T('m3d.takeover'), 4000); }
$('btnTakeover').onclick = takeover;
// nút loa
const btnMute = $('btnMute'); const paintMute = () => { btnMute.textContent = isMuted() ? '🔇' : '🔊'; btnMute.title = isMuted() ? T('menu.unmute') : T('menu.mute'); }; paintMute();
btnMute.onclick = () => { ensureAudio(); setMuted(!isMuted()); paintMute(); };
$('btnBack').onclick = () => { if (!running) return; logEv('level.quit', { id: playMode === 'level' ? level.id : playMode, mode: '3d' }); running = false; setBoil(false); setMood('calm'); botMode = false; $('hud').classList.add('hidden'); $('card').classList.remove('show'); $('menu').classList.remove('hidden'); playMode = 'level'; world = newWorld(); rebuild(); renderMenu(); };   // thoát giữa ca: không ghi kết quả
$('btnMenu').onclick = () => { running = false; set3D(false); $('result').classList.add('hidden'); $('menu').classList.remove('hidden'); playMode = 'level'; if (bestStars(level.id) >= 1) level = currentLevel(); selectLevel(level); };
// P7 — hộp log playtest (chỉ hiện khi ?log=1)
function paintLog() {
  const box = $('logBox'); if (!box) return;
  box.classList.toggle('hidden', !logOn()); if (!logOn()) return;
  const s = logSummary();
  $('logSum').textContent = T('log.sum', { n: s.events, first: s.firstBowlAt == null ? '—' : `${s.firstBowlAt}s`, lv: s.levelsFinished, cx: s.codexOpened });
}
$('btnLogExport')?.addEventListener('click', () => { const n = exportLog(); toast(T('log.exported', { n })); });
$('btnLogClear')?.addEventListener('click', () => { clearLog(); paintLog(); });
if (logOn()) { logEv('boot', { lang: lang(), w: innerWidth, h: innerHeight, stars: totalStars() }); setInterval(paintLog, 5000); }
paintLog(); onLang(paintLog);
$('loading').classList.add('hidden'); $('btnStart').classList.remove('hidden');

// ---- chặn nút/cử chỉ Back của trình duyệt khi đang chơi (Kent: quẹt trái/phải trên điện thoại bị back ra khỏi game) ----
// Vào màn chơi → đẩy một history state; bấm/quẹt Back → popstate → đẩy lại ngay và coi như không có gì (menu thoát bằng nút ‹ trong game).
let guardOn = false;
function armBackGuard() { if (guardOn) return; guardOn = true; try { history.pushState({ qb: 'play' }, ''); } catch {} }
function disarmBackGuard() { guardOn = false; }
addEventListener('popstate', () => { const playing = running || !$('puzzle').classList.contains('hidden') || !$('pov').classList.contains('hidden') || !$('result').classList.contains('hidden'); if (playing) { try { history.pushState({ qb: 'play' }, ''); } catch {} toast(T('menu.backGuard'), 1400); } else disarmBackGuard(); });
// iOS Safari: quẹt từ mép trái = Back của trình duyệt, không chặn được bằng JS → chỉ tránh được khi cài PWA (standalone). Nhắc một lần.
if (/iPhone|iPad/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone) setTimeout(() => toast(T('menu.iosTip'), 3500), 2500);

// chạm là đi
view.renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!running || botMode) return;   // đang xem bot → bấm "Tự chơi" để cầm lái (chạm màn hình không tính)
  if ($('card').classList.contains('show')) closeCard([]);   // chạm ra ngoài card = đóng card (không lấy gì), rồi đi tiếp chỗ vừa chạm
  const id = view.pick(e.clientX, e.clientY);
  if (id) { if (world.tap(id)) { view.pulse(id); sfx.tap(); } ripple(e.clientX, e.clientY); }
});

// hai ô tay: hiện thứ đang cầm, nút × = đi tới thùng rác vứt riêng thứ đó (chạm lại × để huỷ)
const slotEls = [...document.querySelectorAll('#hands .slot')]; let lastHands = '';
for (const el of slotEls) el.addEventListener('pointerdown', (e) => {
  if (!e.target.classList.contains('x') || !running) return; e.stopPropagation();
  if (botMode) return;
  if (world.tap(`trash:${el.dataset.i}`)) { view.pulse('trash'); ripple(e.clientX, e.clientY); }
});
function syncHands() {
  const h = world.chef.hand; const q = world.chef.queue.concat(world.chef.target ? [world.chef.target] : []);
  const key = h.map((t) => (typeof t === 'object' ? `bowl${t.placed.length}${t.done}` : t)).join('|') + '#' + q.filter((t) => t.startsWith('trash:')).join(',');
  if (key === lastHands) return; lastHands = key;
  slotEls.forEach((el, i) => {
    const t = h[i]; const wasFull = el.classList.contains('full');
    el.className = 'slot' + (t !== undefined ? ' full' : '') + (typeof t === 'object' ? ' bowl' : '');
    if (t === undefined) { el.textContent = ''; return; }
    const name = typeof t === 'object' ? (t.done ? `${T('rep.bowl')} ${t.recipe.name} ✓` : `${T('rep.bowl')} ${t.recipe.name} (${t.placed.length}/${t.recipe.assembly.length})`) : labelL(t);
    const u = typeof t === 'string' ? iconUrl(t) : null;
    el.innerHTML = `${u ? `<img src="${u}" alt="">` : ''}<span class="${u ? 'under' : ''}">${name}</span><div class="x${q.includes(`trash:${i}`) ? ' queued' : ''}" title="${T('m3d.trash')}">×</div>`;
    if (!wasFull) { el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 150); }
  });
}

// vòng lặp
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
  tick(dt);
}
let lastErr = 0; let waitNoCard = 0;
function tick(dt) {
  if (world) {
    if (running) {
      try {
        if (botMode) { botTimer -= dt; if (botTimer <= 0) { const t = botDecide(world); if (t) { world.tap(t); botTimer = 0.35; } } }
        world.update(dt); syncPhase(); setBoil(true, world.stations.some((s) => s.type === 'pot' && s.jobs.length) ? 1 : 0.45);
        // chốt an toàn: đứng chờ card mà card không mở → thả cho đi tiếp
        if (world.chef.waiting && !$('card').classList.contains('show')) { waitNoCard += dt; if (waitNoCard > 1.5) { world.chef.waiting = null; waitNoCard = 0; } } else waitNoCard = 0;
      } catch (e) { console.error(e); if (performance.now() - lastErr > 3000) { lastErr = performance.now(); toast(`${T('err.generic')}: ${e.message}`, 4000); } window.__qb.lastError = String(e.stack || e); const c = world.chef; c.target = null; c.busy = 0; c.waiting = null; c.queue.length = 0; }
    }
    $('money').textContent = world.money; $('served').textContent = world.served; $('left').textContent = world.left;
    const rem = world.shift.survival ? world.time : Math.max(0, world.shift.seconds - world.time); $('clock').textContent = `${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}`;
    const inPrep = running && world.prep > 0; $('prep').classList.toggle('hidden', !inPrep); if (inPrep) $('prepNum').textContent = Math.ceil(world.prep);
    if (show3d) { view.sync(world, dt); if (running) syncHands(); }
  } else if (show3d) view.renderer.render(view.scene, view.camera);
}
// i18n: đổ chữ tĩnh, nút VI/EN, đổi ngôn ngữ thì vẽ lại menu
applyDom();
$('btnLang')?.addEventListener('click', () => { const to = lang() === 'vi' ? 'en' : 'vi'; logEv('lang', { to }); setLang(to); });
onLang(() => { applyDom(); renderMenu(); });
// dựng bếp sẵn để menu có nền
world = newWorld(); rebuild(); set3D(false);
if (new URLSearchParams(location.search).has('bot')) start(true);
requestAnimationFrame(frame);

// PWA: đăng ký service worker ở bản build (không ở dev/artifact); có bản mới → toast nhắc reload
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/claude\.ai/.test(location.host)) {
  navigator.serviceWorker.register('./sw.js').then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast(T('menu.newVersion'), 3000); }); }); }).catch(() => {});
}
window.__qb = { get world() { return world; }, get puzzle() { return puzzle; }, get pov() { return pov; }, view, start, botDecide, counterMove, tick, startPuzzle, D, recipeFor, playTrip, tripRunning, playIntro, playOwner, openCodex };
