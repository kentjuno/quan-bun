import { World } from './game/world.js';
import { View, loadModels } from './game/view.js';
import { SURVIVAL, DECOR, UPGRADES, WORLDS, ALL_DISHES, kitchenFor, levelById, nextLevel, worldById, KITCHEN_VARIANTS } from './config.js';
import { REGULARS, recapLine } from './data/customers.js';
import { progress, bestStars, recordLevel, recordPlay, recordSurvival, pointsAvailable, hasDecor, buyDecor, setPractice, resetProgress, currentLevel, levelUnlocked, worldUnlocked, worldStars, totalStars, upgradeLevel, upgradeCost, buyUpgrade, upgradeUnlocked, playerMods, unlocksAfter } from './game/progress.js';
import { D, recipeFor } from './game/recipes.js';
import { botDecide } from './game/bot.js';
import { label } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { ensureAudio, startMusic, setMuted, isMuted, sfx, setMood, setBoil } from './audio.js';
import { parFor } from './game/par.js';
import { povArrivals } from './game/levels.js';
import { Puzzle, assembleOk } from './puzzle.js';
import { counterMove } from './game/counter.js';
import { Pov, povOk } from './pov.js';
import { recordResult, masteryOf, isMastered, weightsFor, allMastery, resetMastery } from './game/mastery.js';

const $ = (id) => document.getElementById(id);
const lib = await loadModels((p, n) => { $('loading').textContent = `Đang dọn bếp… ${Math.round(p * 100)}%`; });
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
const PHASES = [[0.42, 'lunch', 'busy', 'Giờ cao điểm', 'Khách vô dồn — làm song song, trụng sẵn tô'], [0.62, 'lull', 'calm', 'Xế chiều', 'Thở một chút — nấu bù nước lèo, trụng tô sẵn'], [0.92, 'afternoon', 'busy', 'Đợt chiều', 'Đông lần hai — khách quen ghé'], [9, 'closing', 'close', 'Sắp đóng cửa', 'Hết khách mới — giao nốt mấy tô còn lại']];
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
    const dishes = practice.length ? practice : base.dishes; const weights = weightsFor(dishes); const nm = dishes.length > 3 ? `${dishes.length} món` : dishes.map((d) => D.recipes[d].name).join(' · ');
    if (mode === 'drill') return { id: 'drill', name: `Luyện đơn lẻ — ${nm}`, dishes, drill: true, drillCount: 8, seconds: 900, prep: 5, arrivals: [], weights, moneyTargets: [1e9, 1e9, 1e9] };
    return { id: 'rush', name: `Rush 3 đơn — ${nm}`, dishes, seconds: 300, prep: 10, arrivals: [0, 1, 2].map((i) => ({ t: 0.5 + i, type: 'tourist', patience: 300 })), weights, rush: true, moneyTargets: [1e9, 1e9, 1e9] };
  }
  return { ...base, weights: weightsFor(base.dishes) };
}
function newWorld() {
  const w = new World(shiftFor(playMode), {
    onToast: (m) => toast(m),
    onMistake: (hint) => { lastMistake = hint; toast(`${/^(Nước lèo|Không có nước lèo)/.test(hint) ? 'Nấu sai!' : 'Sai thứ tự!'} ${hint}`, 2200); sfx.mistake(); },
    onServe: (cu, price, tip) => { view.float(cu, tip ? `+${price}k +${tip}k tip` : `+${price}k`, tip ? 'tip' : ''); sfx.serve(); setTimeout(() => sfx.coin(), 260); buzz(18); },
    onCustomer: (cu, e) => { if (e === 'leave') { toast(`${cu.name} bỏ đi…`, 1400); view.float(cu, '✖ bỏ đi', 'bad'); buzz([30, 40, 30]); } else if (e === 'arrive') { sfx.arrive(); if (cu.group) sfx.chatter(); } },
    onOpen: () => { sfx.bell(); banner('Mở cửa!', 'Khách tới rồi — bưng ra bàn cho đúng người'); },
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
  $('cardNote').textContent = free <= 0 ? 'Tay đầy — bấm × ở ô tay để vứt' : `Chọn ${free} thứ (chạm 2 lần = 2 cái giống nhau) · còn ${free - cardSel.length} chỗ`;
  $('cardTake').textContent = cardSel.length ? `Lấy ${cardSel.length}` : 'Không lấy';
}
let cardMode = 'shelf';
function closeCard(items) {
  const wt = world?.chef.waiting; if (!wt) { $('card').classList.remove('show'); return; }
  if (String(wt).startsWith('burner')) {
    const ok = world.cookSoup(items);
    if (!ok) { cardSel = []; renderSoupSel(); $('cardNote').innerHTML = `<b style="color:var(--red)">${lastMistake}</b> — chọn lại theo đúng thứ tự`; sfx.mistake(); return; }   // sai → card mở tiếp
  } else world.pickFromShelf(items);
  $('card').classList.remove('show');
}
let lastMistake = '';   // phân theo chỗ đang đứng chờ, không theo cardMode (tránh kẹt)
$('cardClose').onclick = () => closeCard([]); $('cardTake').onclick = () => closeCard(cardSel);
// card nước lèo ở lò: bấm nguyên liệu THEO THỨ TỰ cho vào nồi (bếp thật: cốt → huyết → nước), rồi "Đun"
function openSoupCard(s, slot) {
  if (botMode) return;   // bot tự nấu trong botDecide
  cardMode = 'soup'; cardSel = [];
  $('cardTitle').textContent = `Lò ${slot + 1} — nấu nước lèo gì?`; $('card').classList.toggle('hidename', opts.hideName);
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
  $('cardNote').textContent = cardSel.length ? `Thứ tự cho vào nồi: ${cardSel.map(label).join(' → ')}` : 'Bấm nguyên liệu theo thứ tự cho vào nồi, rồi Đun';
  $('cardTake').textContent = cardSel.length ? 'Đun ♨️' : 'Không nấu';
}
function start(bot = false, mode = playMode) {
  ensureAudio(); startMusic(); playMode = mode; povLevel = null; set3D(true);
  botMode = bot === true; world = newWorld();
  rebuild();   // mỗi level có thể khác trạm (bếp lớn dần) → dựng lại
  $('card').classList.remove('show');
  running = true; $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden'); armBackGuard();
  showHint(botMode ? 'Bot làm mẫu — bấm "Tự chơi" để cầm lái' : playMode === 'drill' ? 'Luyện 8 đơn nối tiếp, không giới hạn giờ — đúng rồi mới nhanh' : playMode === 'rush' ? 'Rush 3 đơn — dùng đủ 3 rọ + chồng tô, làm song song' : playMode === 'survival' ? 'Survival — 3 khách bỏ đi là hết; rảnh thì trụng tô, sợi sẵn' : (level.hint || level.whatsNew), playMode === 'level' ? 9000 : 6000);
  // ẩn tên trên card khi mọi món trong ca đã thuộc (≥3 tô sạch liên tiếp), trừ khi Kent tự tick
  opts.hideNameAuto = world.shift.dishes.every(isMastered);
  $('btnTakeover').classList.toggle('hidden', !botMode);
  $('clockLbl').textContent = world.shift.survival ? 'Đã trụ' : 'Còn';
}
function showResult(r) {
  running = false; setBoil(false); setMood(playMode === 'day' ? 'close' : 'calm'); if (r.stars >= 1 || (r.puzzle)) setTimeout(() => sfx.cheer(), 300); $('hud').classList.add('hidden'); $('result').classList.remove('hidden'); $('card').classList.remove('show');
  const isPz = !!r.puzzle; const st = r.stats || { bowls: [], idle: 0, taps: 0, trips: 0 }; const isDay = playMode === 'level';
  const sh = isPz ? { id: 'puzzle', name: lastPuzzle.kinds[0] === 'ninja' ? 'Chém' : lastPuzzle.kinds[0] === 'reflex' ? 'Phản xạ' : lastPuzzle.kinds[0] === 'assemble' ? 'Ráp tô' : lastPuzzle.kinds[0] === 'pov' ? 'Quầy POV' : 'Đố nhanh', dishes: [...new Set(st.bowls.map((b) => b.dish))] } : (povLevel || world.shift);
  const kitchen = world.kitchen;
  // quầy POV không đi lại nên không so được với lộ trình bot của bếp 3D
  const par = (dish) => (isPz || r.pov) ? { seconds: null, taps: 0, route: [] } : parFor(sh, kitchen, dish);
  let pts = null; const wasNew = isDay && bestStars(sh.id) === 0;
  if (!botMode) { recordResult(r); pts = isDay ? recordLevel(sh.id, r) : playMode === 'survival' ? recordSurvival(r) : recordPlay(r); renderMenu(); }
  const clean = st.bowls.filter((b) => !b.mistakes).length;
  // sao rơi từng cái · tiền chạy số
  const starsEl = $('stars');
  if (isDay) { starsEl.innerHTML = [0, 1, 2].map((i) => `<span class="s">${i < r.stars ? '★' : '☆'}</span>`).join(''); [...starsEl.children].forEach((el, i) => setTimeout(() => { el.classList.add('in'); if (i < r.stars) sfx.done(); }, 350 + i * 380)); }
  else starsEl.textContent = playMode === 'survival' ? `${r.served} khách` : isPz ? `${clean}/${st.bowls.length} sạch` : (r.mistakes === 0 ? '✓ Sạch' : `${r.mistakes} lỗi`);
  countUp($('rMoney'), r.money, isDay ? 1400 : 0);
  $('rTitle').textContent = playMode === 'drill' ? 'Hết 8 đơn' : playMode === 'rush' ? 'Hết rush' : playMode === 'survival' ? (pts?.record ? '🏆 Kỷ lục mới!' : 'Hết Survival') : isPz ? (lastPuzzle.kinds[0] === 'ninja' ? 'Hết chém' : lastPuzzle.kinds[0] === 'reflex' ? 'Hết phản xạ' : lastPuzzle.kinds[0] === 'assemble' ? 'Đóng quầy — Ráp tô' : lastPuzzle.kinds[0] === 'pov' ? 'Đóng quầy — POV' : 'Hết đố') : `${sh.name} — ${sh.title}${r.stars ? '' : ' · chưa đạt, chơi lại'}`;
  $('rDishes').textContent = isDay ? `${goalText(sh)} · ${sh.whatsNew}` : playMode === 'survival' ? `Trụ ${Math.floor((st.time || 0) / 60)}:${String(Math.floor((st.time || 0) % 60)).padStart(2, '0')} · ${sh.dishes.length} món` : sh.dishes.map((d) => D.recipes[d].name).join(' · ');
  $('rPoints').textContent = pts ? `+${pts.earned}k${pts.starBonus ? ` +${pts.starBonus}k thưởng ${pts.newStars}★ mới` : ''} → quán có ${pointsAvailable()}k` : '';
  // khách quen nhận xét cuối ngày
  const regs = r.regulars || []; const rc = $('rRecap');
  if (isDay && regs.length) { const pick = regs[Math.floor(Math.random() * regs.length)]; rc.textContent = recapLine(pick.id, pick.served); rc.classList.toggle('hidden', !rc.textContent); } else rc.classList.add('hidden');
  // thẻ mở khoá: level sau có gì mới (chỉ khi lần đầu qua level này)
  const nextUnlocks = isDay && r.stars >= 1 && wasNew ? unlocksAfter(sh) : [];
  $('rUnlock').replaceChildren(...nextUnlocks.map((u, i) => { const el = document.createElement('div'); el.className = 'u'; el.style.animationDelay = `${1.4 + i * 0.25}s`;
    if (u.kind === 'dish') { const ic = iconUrl(D.recipes[u.id]?.base?.bowl || 'soup-bowl'); el.innerHTML = `${ic ? `<img src="${ic}" alt="">` : '<span class="ic">🍜</span>'}<div><b>Món mới ngày mai</b><small>${D.recipes[u.id].name}</small></div>`; }
    else if (u.kind === 'upgrade') { const up = UPGRADES.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">${up.icon}</span><div><b>Mở bán: ${up.name}</b><small>${up.desc}</small></div>`; }
    else if (u.kind === 'world') { const wd = worldById(u.id); el.innerHTML = `<span class="ic">${wd.icon}</span><div><b>Mở world mới: ${wd.name}</b><small>${wd.sub} · ${wd.levels.length} level</small></div>`; }
    else { const rg = REGULARS.find((x) => x.id === u.id); el.innerHTML = `<span class="ic">🙋</span><div><b>Khách quen mới: ${rg.name}</b><small>${rg.sketch} · ruột ${D.recipes[rg.dish].name}</small></div>`; }
    return el; }));
  const nxt = isDay ? nextLevel(sh) : null; const nw = isDay && !nxt ? WORLDS[WORLDS.indexOf(worldById(sh.world)) + 1] : null;
  const nb = $('btnNext'); nb.classList.toggle('hidden', !isDay || r.stars < 1 || (!nxt && !(nw && worldStars(sh.world) >= nw.starsToUnlock)));
  nb.textContent = nxt ? `Level ${nxt.n} →` : nw ? `Sang ${nw.name} →` : '';
  $('rTips').textContent = r.tips; $('rServed').textContent = r.served; $('rLeft').textContent = r.left; $('rMistakes').textContent = r.mistakes;
  // --- báo cáo để tối ưu cách làm thật (gấp trong <details>) ---
  const rows = st.bowls.map((b) => { const pr = par(b.dish); const d = pr.seconds ? b.wait - pr.seconds : null;
    return `<tr><td>${b.name}</td><td class="num">${b.wait.toFixed(0)}s</td><td class="num ${d == null ? '' : d <= 5 ? 'good' : d <= 15 ? 'mid' : 'bad'}">${pr.seconds ? (d >= 0 ? '+' : '') + d.toFixed(0) + 's' : '—'}</td><td class="num ${b.mistakes ? 'bad' : 'good'}">${b.mistakes || '✓'}</td><td class="num">${b.taps}</td></tr>`; }).join('');
  const orderErrs = r.errors.filter((e) => !e.waste); const wasteErrs = r.errors.filter((e) => e.waste);
  const slowest = st.bowls.slice().sort((a, b) => (b.wait - (par(b.dish).seconds || 0)) - (a.wait - (par(a.dish).seconds || 0)))[0];
  const route = slowest ? par(slowest.dish) : null;
  const mast = sh.dishes.map((d) => { const m = masteryOf(d); return `<span class="chip ${m.streak >= 3 ? 'good' : ''}">${D.recipes[d].name}: ${m.clean}/${m.plays} sạch${m.streak >= 3 ? ' · thuộc' : ''}${m.best ? ` · nhanh nhất ${m.best.toFixed(0)}s` : ''}</span>`; }).join('');
  $('report').innerHTML = `
    <div class="kpis"><div><b>${st.idle.toFixed(0)}s</b><small>đứng nghĩ</small></div><div><b>${st.taps}</b><small>lần chạm</small></div><div><b>${st.bowls.length ? (st.bowls.reduce((n, b) => n + b.wait, 0) / st.bowls.length).toFixed(0) + 's' : '—'}</b><small>tb / tô</small></div><div><b>${wasteErrs.length}</b><small>vứt/hư</small></div></div>
    ${rows ? `<table class="rep"><thead><tr><th>${isPz ? 'Câu' : 'Tô'}</th><th>Thời gian</th><th>${isPz ? '' : 'so với bot'}</th><th>Lỗi</th><th>Chạm</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="sub">Chưa giao được tô nào.</div>'}
    ${orderErrs.length ? `<details><summary>${orderErrs.length} lỗi thứ tự — bấm xem</summary><ul class="errs">${orderErrs.map((e) => `<li><span class="t">${e.t.toFixed(0)}s</span> ${e.tag}</li>`).join('')}</ul></details>` : ''}
    ${route && route.seconds ? `<details><summary>Lộ trình nhanh nhất cho <b>${slowest.name}</b> (bot ${route.seconds}s, ${route.taps} chạm)</summary><ol class="route">${route.route.map((x) => `<li>${x}</li>`).join('')}</ol></details>` : ''}
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
function startPuzzle(kinds = ['order', 'intruder', 'missing'], rounds = 9) {
  ensureAudio(); startMusic(); playMode = 'puzzle'; running = false; botMode = false;
  let dishes = practice.length ? practice : ALL_DISHES; if (kinds[0] === 'assemble') { dishes = dishes.filter(assembleOk); if (!dishes.length) dishes = ALL_DISHES.filter(assembleOk); } const weights = weightsFor(dishes);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden');
  lastPuzzle = { kinds, rounds }; armBackGuard();
  puzzle = new Puzzle({ dishes, weights, rounds, kinds, sfx, onDone: (r) => showResult(r) }); puzzle.start();
}
let lastPuzzle = { kinds: ['order', 'intruder', 'missing'], rounds: 9 };
let pov = null;
function startPov(rounds = 8) {
  ensureAudio(); startMusic(); playMode = 'puzzle'; running = false; botMode = false; set3D(false);
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
  ensureAudio(); startMusic(); playMode = 'level'; running = false; botMode = false; povLevel = L; set3D(false);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden'); $('card').classList.remove('show');
  armBackGuard();
  const mods = playerMods(); const con = { ...(L.constraints || {}) };
  if (mods.potSlots && !con.potSlots) con.potSlots = mods.potSlots;      // nâng cấp Nồi trụng
  pov = new Pov({
    dishes: L.dishes, weights: weightsFor(L.dishes), level: L,
    arrivals: povArrivals(L), simplify: L.simplify, constraints: con,
    goal: L.goal, moneyTargets: L.moneyTargets, events: L.events, seconds: L.seconds,
    burners: mods.burners || 1, patience: L.patience, sfx,
    onDone: (r) => showResult(r), onQuit: () => { $('menu').classList.remove('hidden'); },
  });
  pov.start();
  showHint(L.hint || L.whatsNew, 9000);
}
$('btnPov').onclick = () => startPov(8);
$('btnKitchen3d').onclick = () => { if (levelUnlocked(level)) start(false, 'level'); };
$('btnPuzzle').onclick = () => startPuzzle(['order', 'intruder', 'missing'], 9); $('btnAssemble').onclick = () => startPuzzle(['assemble'], 10); $('btnNinja').onclick = () => startPuzzle(['ninja'], 6); $('btnReflex').onclick = () => startPuzzle(['reflex'], 10); $('pzQuit').onclick = () => { puzzle?.stop(); $('menu').classList.remove('hidden'); };
$('btnDrill').onclick = () => start(false, 'drill'); $('btnRush').onclick = () => start(false, 'rush'); $('btnSurvival').onclick = () => start(false, 'survival');
$('btnResetMastery').onclick = () => { if (confirm('Xoá toàn bộ tiến độ (nhớ món, level, điểm, trang trí)?')) { resetMastery(); resetProgress(); renderMenu(); world = newWorld(); rebuild(); } };
// ---- menu: tab ----
for (const b of document.querySelectorAll('.tabs.three button')) b.onclick = () => { for (const x of document.querySelectorAll('.tabs.three button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('.tab.main')) t.classList.toggle('hidden', t.id !== `tab-${b.dataset.tab}`); safeSet('qb.tab', b.dataset.tab); };
for (const b of document.querySelectorAll('.tabs.sub button')) b.onclick = () => { for (const x of document.querySelectorAll('.tabs.sub button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('.tab.sub')) t.classList.toggle('hidden', t.id !== `tab-${b.dataset.sub}`); safeSet('qb.sub', b.dataset.sub); };
(document.querySelector(`.tabs.three button[data-tab="${safeGet('qb.tab') || 'day'}"]`) || document.querySelector('.tabs.three button')).click();
(document.querySelector(`.tabs.sub button[data-sub="${safeGet('qb.sub') || 'survival'}"]`) || document.querySelector('.tabs.sub button')).click();
const dishName = (d) => D.recipes[d].name;
function renderMenu() {
  // --- bản đồ: hàng world + lưới level + thẻ chi tiết (docs/PLAN-WORLDS.md §6) ---
  const cur = currentLevel(); const M = allMastery();
  $('worldRow').replaceChildren(...WORLDS.map((w, i) => {
    const un = worldUnlocked(w.id); const el = document.createElement('div');
    el.className = 'wd' + (i === worldIdx ? ' on' : '') + (un ? '' : ' locked');
    el.innerHTML = `<div class="ic">${un ? w.icon : '🔒'}</div><b>${w.name}</b><small>${un ? `${worldStars(w.id)}/${w.maxStars} ★` : `cần ${w.starsToUnlock}★`}</small>`;
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
    level.training ? `<span class="tag train">Bản tập — ${simplifyLabel(level.simplify)}</span>` : '',
    level.challenge ? `<span class="tag new">⭐ Thử thách</span>` : '',
    level.goal ? `<span class="tag goal">${goalText(level)}</span>` : '',
    ...conTags(level.constraints),
    level.layout !== 'default' ? `<span class="tag">🍳 ${KITCHEN_VARIANTS[level.layout].name}</span>` : '',
    ...(level.events || []).map((e) => `<span class="tag">${e.kind === 'rain' ? '🌧️ Mưa' : e.kind === 'vip' ? '💰 Khách sộp' : e.kind === 'tour' ? '👥 Đoàn khách' : '🔄 Khách đổi ý'}</span>`),
    level.regulars.length ? `<span class="tag">🙋 ${level.regulars.map((id) => REGULARS.find((r) => r.id === id)?.name).join(', ')}</span>` : '',
  ].filter(Boolean).join('');
  card.innerHTML = un
    ? `<b>${level.name} — ${level.title}</b><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span>
       <small class="whatsnew">${level.whatsNew}</small>
       <small class="dish">${level.dishes.length > 4 ? `${level.dishes.length} món` : level.dishes.map(dishName).join(' · ')}</small>
       <div class="tags">${tags}</div>
       <small>${level.seconds}s · ${level.count} khách · mục tiêu ${level.moneyTargets[0]}k${learned ? ` · thuộc ${learned}/${level.dishes.length} món` : ''}</small>`
    : `<b>🔒 ${level.name}</b><small>${worldUnlocked(level.world) ? `Đạt ≥1★ ở ${W.name} ${level.n - 1} để mở` : `Cần ${W.starsToUnlock}★ ở ${WORLDS[worldIdx - 1].name} để mở world này`}</small>`;
  $('btnStart').disabled = !un; $('btnStart').textContent = un ? (st ? `Chơi lại ${level.name}` : `Vô bếp — ${level.name}`) : '🔒 Chưa mở';
  // nâng cấp bếp
  const total = totalStars();
  $('upgrades').replaceChildren(...UPGRADES.map((u) => { const lv2 = upgradeLevel(u.id); const cost = upgradeCost(u.id); const locked = !upgradeUnlocked(u.id); const el = document.createElement('div'); el.className = 'sh' + (!locked && cost == null ? ' max' : '') + (locked ? ' locked' : '');
    el.innerHTML = `<span class="ic">${u.icon}</span><div><b>${u.name} <span class="lv">${'●'.repeat(lv2)}${'○'.repeat(u.levels.length - lv2)}</span></b><small>${u.desc}</small>${locked ? `<small>Mở bán khi đủ ${u.unlockStars}★ (đang có ${total}★)</small>` : cost == null ? '<small style="color:#2f8a3a;font-weight:700">Tối đa ✓</small>' : `<button ${cost > pointsAvailable() ? 'disabled' : ''}>💰 ${cost}k</button>`}</div>`;
    const b = el.querySelector('button'); if (b) b.onclick = () => { if (buyUpgrade(u.id)) { sfx.done(); toast(`${u.name} lên cấp ${upgradeLevel(u.id)}!`); renderMenu(); world = newWorld(); rebuild(); } }; return el; }));
  // survival
  const sv = progress().survival; $('survRecord').textContent = sv ? `Kỷ lục: ${sv.served} khách · ${Math.floor(sv.time / 60)}:${String(Math.floor(sv.time % 60)).padStart(2, '0')} · ${sv.money}k` : 'Chưa có kỷ lục';
  // luyện tập: chọn món
  $('dishPick').replaceChildren(...ALL_DISHES.map((d) => { const el = document.createElement('div'); const m = masteryOf(d); el.className = 'dp' + (practice.includes(d) ? ' on' : ''); el.innerHTML = `<span>${dishName(d)}</span><small>${m.plays ? `${m.clean}/${m.plays}${m.streak >= 3 ? ' ✓' : ''}` : '—'}</small>`; el.onclick = () => { practice = practice.includes(d) ? practice.filter((x) => x !== d) : [...practice, d]; setPractice(practice); renderMenu(); }; return el; }));
  $('pickCount').textContent = `${practice.length}/${ALL_DISHES.length} món`; $('pzScope').textContent = practice.length ? `${practice.length} món: ${practice.slice(0, 4).map(dishName).join(', ')}${practice.length > 4 ? '…' : ''}` : 'Đủ 16 món'; $('btnDrill').disabled = $('btnRush').disabled = practice.length === 0;
  // trang trí
  $('ptsNow').textContent = pointsAvailable(); $('ptsTotal').textContent = progress().points; $('ptsBadge').textContent = DECOR.some((d) => !hasDecor(d.id) && d.cost <= pointsAvailable()) || UPGRADES.some((u) => upgradeCost(u.id) != null && upgradeCost(u.id) <= pointsAvailable()) ? '!' : '';
  $('shop').replaceChildren(...DECOR.map((d) => { const own = hasDecor(d.id); const el = document.createElement('div'); el.className = 'sh' + (own ? ' owned' : ''); el.innerHTML = `<span class="ic">${d.icon}</span><div><b>${d.name}</b><small>${d.desc}</small>${own ? '<small style="color:#2f8a3a;font-weight:700">Đã mua ✓</small>' : `<button ${d.cost > pointsAvailable() ? 'disabled' : ''}>💰 ${d.cost}k</button>`}</div>`; if (!own) el.querySelector('button').onclick = () => { if (buyDecor(d.id)) { sfx.done(); toast(`Đã mua ${d.name}!`); renderMenu(); world = newWorld(); rebuild(); } }; return el; }));
}
/** Nhãn ngắn cho phần công thức được rút gọn ở level tập. */
function simplifyLabel(sim) {
  if (!sim) return '';
  const miss = []; if (sim.skipRinse) miss.push('xả lạnh'); if (sim.hotBowl) miss.push('trụng tô'); if (sim.skipPrep) miss.push('thớt'); if (sim.skipFry) miss.push('chiên'); if (sim.soupReady) miss.push('nấu nước'); if (sim.toppings || sim.maxSteps) miss.push('bớt topping');
  return miss.length ? `chưa có ${miss.join(', ')}` : 'rút gọn';
}
function goalText(L) {
  const g = L.goal; if (!g) return `Mục tiêu ${L.moneyTargets.join(' / ')}k`;
  if (g.kind === 'clean') return `🎯 ${g.bowls} tô không sai thứ tự`;
  if (g.kind === 'no-waste') return '🎯 Không vứt/hư thứ gì';
  if (g.kind === 'streak') return `🎯 ${g.n} tô đúng liên tiếp`;
  if (g.kind === 'before') return `🎯 Xong hết khách trước ${g.seconds}s`;
  return '';
}
function conTags(c) {
  if (!c) return [];
  const out = []; if (c.potSlots) out.push(`<span class="tag">🧺 ${c.potSlots} rọ trụng`); if (c.handCapacity === 1) out.push('<span class="tag">✋ Một tay');
  if (c.brothCap) out.push(`<span class="tag">🥘 Kệ nước ${c.brothCap} phần`); if (c.noStack) out.push('<span class="tag">🔥 Lò xong phải lấy liền');
  return out.map((x) => x + '</span>');
}
$('pickAll').onclick = () => { practice = [...ALL_DISHES]; setPractice(practice); renderMenu(); };
$('pickNone').onclick = () => { practice = []; setPractice(practice); renderMenu(); };
$('pickBun').onclick = () => { practice = ALL_DISHES.filter((d) => /^bun-/.test(d)); setPractice(practice); renderMenu(); };
$('pickWeak').onclick = () => { practice = ALL_DISHES.filter((d) => !isMastered(d)); setPractice(practice); renderMenu(); };
function selectLevel(L) { if (!L) return; level = L; worldIdx = Math.max(0, WORLDS.findIndex((w) => w.id === L.world)); renderMenu(); if (!running) { world = newWorld(); rebuild(); } }
renderMenu();
$('btnStart').onclick = () => { if (!levelUnlocked(level)) return; levelOnPov(level) ? startLevelPov(level) : start(false, 'level'); }; $('btnRetry').onclick = () => playMode === 'puzzle' ? (lastPuzzle.kinds[0] === 'pov' ? startPov(lastPuzzle.rounds) : startPuzzle(lastPuzzle.kinds, lastPuzzle.rounds)) : playMode === 'level' && levelOnPov(level) ? startLevelPov(level) : start(botMode, playMode);
$('btnNext').onclick = () => {
  const n = nextLevel(level); if (n) selectLevel(n); else { const w = WORLDS[WORLDS.indexOf(worldById(level.world)) + 1]; if (w) selectLevel(w.levels[0]); }
  levelOnPov(level) ? startLevelPov(level) : start(false, 'level');
};
$('btnBot').onclick = () => start(true);
function takeover() { if (!botMode) return; botMode = false; $('btnTakeover').classList.add('hidden'); showHint('Bạn cầm lái. Kệ → lấy · nồi/bồn → làm · quầy ráp → quầy giao', 4000); }
$('btnTakeover').onclick = takeover;
// nút loa
const btnMute = $('btnMute'); const paintMute = () => { btnMute.textContent = isMuted() ? '🔇' : '🔊'; btnMute.title = isMuted() ? 'Mở tiếng' : 'Tắt tiếng'; }; paintMute();
btnMute.onclick = () => { ensureAudio(); setMuted(!isMuted()); paintMute(); };
$('btnBack').onclick = () => { if (!running) return; running = false; setBoil(false); setMood('calm'); botMode = false; $('hud').classList.add('hidden'); $('card').classList.remove('show'); $('menu').classList.remove('hidden'); playMode = 'level'; world = newWorld(); rebuild(); renderMenu(); };   // thoát giữa ca: không ghi kết quả
$('btnMenu').onclick = () => { running = false; set3D(false); $('result').classList.add('hidden'); $('menu').classList.remove('hidden'); playMode = 'level'; if (bestStars(level.id) >= 1) level = currentLevel(); selectLevel(level); };
$('loading').classList.add('hidden'); $('btnStart').classList.remove('hidden');

// ---- chặn nút/cử chỉ Back của trình duyệt khi đang chơi (Kent: quẹt trái/phải trên điện thoại bị back ra khỏi game) ----
// Vào màn chơi → đẩy một history state; bấm/quẹt Back → popstate → đẩy lại ngay và coi như không có gì (menu thoát bằng nút ‹ trong game).
let guardOn = false;
function armBackGuard() { if (guardOn) return; guardOn = true; try { history.pushState({ qb: 'play' }, ''); } catch {} }
function disarmBackGuard() { guardOn = false; }
addEventListener('popstate', () => { const playing = running || !$('puzzle').classList.contains('hidden') || !$('pov').classList.contains('hidden') || !$('result').classList.contains('hidden'); if (playing) { try { history.pushState({ qb: 'play' }, ''); } catch {} toast('Đang chơi — dùng nút ‹ để về menu', 1400); } else disarmBackGuard(); });
// iOS Safari: quẹt từ mép trái = Back của trình duyệt, không chặn được bằng JS → chỉ tránh được khi cài PWA (standalone). Nhắc một lần.
if (/iPhone|iPad/.test(navigator.userAgent) && !matchMedia('(display-mode: standalone)').matches && !navigator.standalone) setTimeout(() => toast('Trên iPhone: thêm vào Màn hình chính để quẹt không bị back', 3500), 2500);

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
    const name = typeof t === 'object' ? (t.done ? `Tô ${t.recipe.name} ✓` : `Tô ${t.recipe.name} (${t.placed.length}/${t.recipe.assembly.length})`) : label(t);
    const u = typeof t === 'string' ? iconUrl(t) : null;
    el.innerHTML = `${u ? `<img src="${u}" alt="">` : ''}<span class="${u ? 'under' : ''}">${name}</span><div class="x${q.includes(`trash:${i}`) ? ' queued' : ''}" title="Vứt">×</div>`;
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
      } catch (e) { console.error(e); if (performance.now() - lastErr > 3000) { lastErr = performance.now(); toast(`Lỗi: ${e.message}`, 4000); } window.__qb.lastError = String(e.stack || e); const c = world.chef; c.target = null; c.busy = 0; c.waiting = null; c.queue.length = 0; }
    }
    $('money').textContent = world.money; $('served').textContent = world.served; $('left').textContent = world.left;
    const rem = world.shift.survival ? world.time : Math.max(0, world.shift.seconds - world.time); $('clock').textContent = `${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}`;
    const inPrep = running && world.prep > 0; $('prep').classList.toggle('hidden', !inPrep); if (inPrep) $('prepNum').textContent = Math.ceil(world.prep);
    if (show3d) { view.sync(world, dt); if (running) syncHands(); }
  } else if (show3d) view.renderer.render(view.scene, view.camera);
}
// dựng bếp sẵn để menu có nền
world = newWorld(); rebuild(); set3D(false);
if (new URLSearchParams(location.search).has('bot')) start(true);
requestAnimationFrame(frame);

// PWA: đăng ký service worker ở bản build (không ở dev/artifact); có bản mới → toast nhắc reload
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/claude\.ai/.test(location.host)) {
  navigator.serviceWorker.register('./sw.js').then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Có bản mới — tải lại để cập nhật', 3000); }); }); }).catch(() => {});
}
window.__qb = { get world() { return world; }, get puzzle() { return puzzle; }, get pov() { return pov; }, view, start, botDecide, counterMove, tick, startPuzzle, D, recipeFor };
