import { World } from './game/world.js';
import { View, loadModels } from './game/view.js';
import { LEVELS, SURVIVAL, DECOR, ALL_DISHES, kitchenFor } from './config.js';
import { progress, bestStars, isUnlocked, recordLevel, recordPlay, recordSurvival, pointsAvailable, hasDecor, buyDecor, setPractice, resetProgress } from './game/progress.js';
import { D } from './game/recipes.js';
import { botDecide } from './game/bot.js';
import { label } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { ensureAudio, startMusic, setMuted, isMuted, sfx } from './audio.js';
import { parFor } from './game/par.js';
import { Puzzle } from './puzzle.js';
import { recordResult, masteryOf, isMastered, weightsFor, allMastery, resetMastery } from './game/mastery.js';

const $ = (id) => document.getElementById(id);
const lib = await loadModels((p, n) => { $('loading').textContent = `Đang dọn bếp… ${Math.round(p * 100)}%`; });
const view = new View($('app'), lib);
let world = null; let running = false; let toastTimer = null;
let botMode = new URLSearchParams(location.search).has('bot'); let botTimer = 0;

function ripple(x, y) { const r = document.createElement('div'); r.className = 'ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 450); }
let hintTimer = null;
function showHint(msg, ms = 6000) { const el = $('hint'); el.textContent = msg; el.classList.remove('fade'); clearTimeout(hintTimer); hintTimer = setTimeout(() => el.classList.add('fade'), ms); }
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
let levelIdx = Math.min(LEVELS.length - 1, Math.max(0, Number(qs.get('shift') || qs.get('level') ? Number(qs.get('shift') || qs.get('level')) - 1 : (safeGet('qb.level') || 0))));   // ?level=4
let playMode = 'level';   // 'level' | 'survival' | 'drill' | 'rush' (drill/rush dùng món đã chọn ở tab Luyện tập)
let practice = (progress().practice || []).filter((d) => ALL_DISHES.includes(d)); if (!practice.length) practice = [...LEVELS[levelIdx].dishes];
function shiftFor(mode) {
  if (mode === 'survival') return { ...SURVIVAL, weights: weightsFor(SURVIVAL.dishes) };
  const base = LEVELS[levelIdx];
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
    onServe: (cu, price, tip) => { toast(tip ? `+${price}k +${tip}k tip` : `+${price}k`, 900); sfx.serve(); },
    onCustomer: (cu, e) => { if (e === 'leave') toast(`${cu.name} bỏ đi…`, 1400); else if (e === 'arrive') sfx.arrive(); },
    onFinish: (r) => showResult(r),
    onShelfOpen: (s) => openCard(s),
    onBurnerOpen: (s, slot) => openSoupCard(s, slot),
    onPick: () => sfx.pick(), onJobStart: () => sfx.drop(), onJobDone: () => sfx.done(), onPlace: () => sfx.place(), onTrash: () => sfx.trash(),
  }, kitchenFor(isPortrait()));
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
  ensureAudio(); startMusic(); playMode = mode;
  botMode = bot === true; world = newWorld();
  rebuild();   // mỗi level có thể khác trạm (bếp lớn dần) → dựng lại
  $('card').classList.remove('show');
  running = true; $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.remove('hidden');
  showHint(botMode ? 'Bot làm mẫu — bấm "Tự chơi" để cầm lái' : playMode === 'drill' ? 'Luyện 8 đơn nối tiếp, không giới hạn giờ — đúng rồi mới nhanh' : playMode === 'rush' ? 'Rush 3 đơn — dùng đủ 3 rọ + chồng tô, làm song song' : playMode === 'survival' ? 'Survival — 3 khách bỏ đi là hết; rảnh thì trụng tô, sợi sẵn' : 'Kệ → lấy · nồi/bồn → làm · quầy ráp → bỏ đúng thứ tự · quầy giao');
  // ẩn tên trên card khi mọi món trong ca đã thuộc (≥3 tô sạch liên tiếp), trừ khi Kent tự tick
  opts.hideNameAuto = world.shift.dishes.every(isMastered);
  $('btnTakeover').classList.toggle('hidden', !botMode);
  $('clockLbl').textContent = world.shift.survival ? 'Đã trụ' : 'Còn';
}
function showResult(r) {
  running = false; $('hud').classList.add('hidden'); $('result').classList.remove('hidden'); $('card').classList.remove('show');
  const isPz = !!r.puzzle; const st = r.stats || { bowls: [], idle: 0, taps: 0, trips: 0 };
  const sh = isPz ? { id: 'puzzle', name: lastPuzzle.kinds[0] === 'ninja' ? 'Chém' : 'Đố nhanh', dishes: [...new Set(st.bowls.map((b) => b.dish))] } : world.shift; const kitchen = world.kitchen;
  const par = (dish) => isPz ? { seconds: null, taps: 0, route: [] } : parFor(sh, kitchen, dish);
  let pts = null;
  if (!botMode) { recordResult(r); pts = playMode === 'level' ? recordLevel(sh.id, r) : playMode === 'survival' ? recordSurvival(r) : recordPlay(r); renderMenu(); }
  const clean = st.bowls.filter((b) => !b.mistakes).length;
  $('stars').textContent = playMode === 'level' ? '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : playMode === 'survival' ? `${r.served} khách` : isPz ? `${clean}/${st.bowls.length} sạch` : (r.mistakes === 0 ? '✓ Sạch' : `${r.mistakes} lỗi`);
  $('rTitle').textContent = playMode === 'drill' ? 'Hết 8 đơn' : playMode === 'rush' ? 'Hết rush' : playMode === 'survival' ? (pts?.record ? '🏆 Kỷ lục mới!' : 'Hết Survival') : isPz ? (lastPuzzle.kinds[0] === 'ninja' ? 'Hết chém' : 'Hết đố') : 'Hết level';
  $('rDishes').textContent = playMode === 'level' ? `${sh.name} · mục tiêu ${sh.moneyTargets.join(' / ')}k` : playMode === 'survival' ? `Trụ ${Math.floor((st.time || 0) / 60)}:${String(Math.floor((st.time || 0) % 60)).padStart(2, '0')} · ${sh.dishes.length} món` : sh.dishes.map((d) => D.recipes[d].name).join(' · ');
  $('rPoints').textContent = pts ? `+${pts.earned} điểm${pts.starBonus ? ` +${pts.starBonus} thưởng ${pts.newStars}★ mới` : ''} → có ${pointsAvailable()} điểm mua trang trí` : '';
  $('btnNext').classList.toggle('hidden', playMode !== 'level' || levelIdx >= LEVELS.length - 1 || !isUnlocked(LEVELS, levelIdx + 1));
  $('rMoney').textContent = r.money; $('rTips').textContent = r.tips; $('rServed').textContent = r.served; $('rLeft').textContent = r.left; $('rMistakes').textContent = r.mistakes;
  // --- báo cáo để tối ưu cách làm thật ---
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
let puzzle = null;
function startPuzzle(kinds = ['order', 'intruder', 'missing'], rounds = 9) {
  ensureAudio(); startMusic(); playMode = 'puzzle'; running = false; botMode = false;
  const dishes = practice.length ? practice : ALL_DISHES; const weights = weightsFor(dishes);
  $('menu').classList.add('hidden'); $('result').classList.add('hidden'); $('hud').classList.add('hidden');
  lastPuzzle = { kinds, rounds };
  puzzle = new Puzzle({ dishes, weights, rounds, kinds, sfx, onDone: (r) => showResult(r) }); puzzle.start();
}
let lastPuzzle = { kinds: ['order', 'intruder', 'missing'], rounds: 9 };
$('btnPuzzle').onclick = () => startPuzzle(['order', 'intruder', 'missing'], 9); $('btnNinja').onclick = () => startPuzzle(['ninja'], 6); $('pzQuit').onclick = () => { puzzle?.stop(); $('menu').classList.remove('hidden'); };
$('btnDrill').onclick = () => start(false, 'drill'); $('btnRush').onclick = () => start(false, 'rush'); $('btnSurvival').onclick = () => start(false, 'survival');
$('btnResetMastery').onclick = () => { if (confirm('Xoá toàn bộ tiến độ (nhớ món, level, điểm, trang trí)?')) { resetMastery(); resetProgress(); renderMenu(); world = newWorld(); rebuild(); } };
// ---- menu: tab ----
for (const b of document.querySelectorAll('.tabs button')) b.onclick = () => { for (const x of document.querySelectorAll('.tabs button')) x.classList.toggle('on', x === b); for (const t of document.querySelectorAll('.tab')) t.classList.toggle('hidden', t.id !== `tab-${b.dataset.tab}`); safeSet('qb.tab', b.dataset.tab); };
(document.querySelector(`.tabs button[data-tab="${safeGet('qb.tab') || 'level'}"]`) || document.querySelector('.tabs button')).click();
const dishName = (d) => D.recipes[d].name;
let slideDir = 0;
function renderMenu() {
  // level: carousel (‹ ›, vuốt) — một thẻ level, chấm tiến độ bên dưới
  const lv = LEVELS[levelIdx]; const un = isUnlocked(LEVELS, levelIdx); const st = bestStars(lv.id); const M = allMastery();
  const learned = lv.dishes.filter((d) => (M[d]?.streak || 0) >= 3).length; const plays = lv.dishes.reduce((n, d) => n + (M[d]?.plays || 0), 0);
  const card = $('lvCard'); card.className = 'lvcard' + (un ? '' : ' locked') + (slideDir ? (slideDir > 0 ? ' slide-r' : ' slide-l') : '');
  card.innerHTML = `<b>${un ? '' : '🔒 '}${lv.name}</b><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span><small class="dish">${lv.dishes.map(dishName).join(' · ')}</small><small>${un ? (plays ? `Đã thuộc ${learned}/${lv.dishes.length} món · ${plays} tô đã làm` : 'Chưa chơi') : `Đạt ≥1★ ở Level ${LEVELS[levelIdx - 1].id} để mở`}</small>`;
  if (slideDir) { requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('slide-l', 'slide-r'))); slideDir = 0; }
  $('lvPrev').disabled = levelIdx === 0; $('lvNext').disabled = levelIdx >= LEVELS.length - 1;
  $('lvDots').replaceChildren(...LEVELS.map((x, i) => { const d = document.createElement('i'); d.className = i === levelIdx ? 'on' : bestStars(x.id) ? 'done' : ''; d.onclick = () => selectLevel(i); return d; }));
  $('btnStart').disabled = !un; $('btnStart').textContent = un ? 'Mở hàng' : '🔒 Chưa mở';
  // survival
  const sv = progress().survival; $('survRecord').textContent = sv ? `Kỷ lục: ${sv.served} khách · ${Math.floor(sv.time / 60)}:${String(Math.floor(sv.time % 60)).padStart(2, '0')} · ${sv.money}k` : 'Chưa có kỷ lục';
  // luyện tập: chọn món
  $('dishPick').replaceChildren(...ALL_DISHES.map((d) => { const el = document.createElement('div'); const m = masteryOf(d); el.className = 'dp' + (practice.includes(d) ? ' on' : ''); el.innerHTML = `<span>${dishName(d)}</span><small>${m.plays ? `${m.clean}/${m.plays}${m.streak >= 3 ? ' ✓' : ''}` : '—'}</small>`; el.onclick = () => { practice = practice.includes(d) ? practice.filter((x) => x !== d) : [...practice, d]; setPractice(practice); renderMenu(); }; return el; }));
  $('pickCount').textContent = `${practice.length}/${ALL_DISHES.length} món`; $('pzScope').textContent = practice.length ? `${practice.length} món: ${practice.slice(0, 4).map(dishName).join(', ')}${practice.length > 4 ? '…' : ''}` : 'Đủ 16 món'; $('btnDrill').disabled = $('btnRush').disabled = practice.length === 0;
  // trang trí
  $('ptsNow').textContent = pointsAvailable(); $('ptsTotal').textContent = progress().points; $('ptsBadge').textContent = DECOR.some((d) => !hasDecor(d.id) && d.cost <= pointsAvailable()) ? '!' : '';
  $('shop').replaceChildren(...DECOR.map((d) => { const own = hasDecor(d.id); const el = document.createElement('div'); el.className = 'sh' + (own ? ' owned' : ''); el.innerHTML = `<span class="ic">${d.icon}</span><div><b>${d.name}</b><small>${d.desc}</small>${own ? '<small style="color:#2f8a3a;font-weight:700">Đã mua ✓</small>' : `<button ${d.cost > pointsAvailable() ? 'disabled' : ''}>⭐ ${d.cost}</button>`}</div>`; if (!own) el.querySelector('button').onclick = () => { if (buyDecor(d.id)) { sfx.done(); toast(`Đã mua ${d.name}!`); renderMenu(); world = newWorld(); rebuild(); } }; return el; }));
}
function stepLevel(d) { const i = Math.min(LEVELS.length - 1, Math.max(0, levelIdx + d)); if (i === levelIdx) return; slideDir = d; selectLevel(i); }
$('lvPrev').onclick = () => stepLevel(-1); $('lvNext').onclick = () => stepLevel(1);
{ let x0 = null; const car = document.querySelector('.carousel'); car.addEventListener('pointerdown', (e) => { x0 = e.clientX; }); car.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) stepLevel(dx < 0 ? 1 : -1); }); }
$('pickAll').onclick = () => { practice = [...ALL_DISHES]; setPractice(practice); renderMenu(); };
$('pickNone').onclick = () => { practice = []; setPractice(practice); renderMenu(); };
$('pickWeak').onclick = () => { practice = ALL_DISHES.filter((d) => !isMastered(d)); setPractice(practice); renderMenu(); };
function selectLevel(i) { levelIdx = i; safeSet('qb.level', String(i)); renderMenu(); if (!running) { world = newWorld(); rebuild(); } }
renderMenu();
$('btnStart').onclick = () => { if (isUnlocked(LEVELS, levelIdx)) start(false, 'level'); }; $('btnRetry').onclick = () => playMode === 'puzzle' ? startPuzzle(lastPuzzle.kinds, lastPuzzle.rounds) : start(botMode, playMode);
$('btnNext').onclick = () => { selectLevel(Math.min(LEVELS.length - 1, levelIdx + 1)); start(false, 'level'); };
$('btnBot').onclick = () => start(true);
function takeover() { if (!botMode) return; botMode = false; $('btnTakeover').classList.add('hidden'); showHint('Bạn cầm lái. Kệ → lấy · nồi/bồn → làm · quầy ráp → quầy giao', 4000); }
$('btnTakeover').onclick = takeover;
// nút loa
const btnMute = $('btnMute'); const paintMute = () => { btnMute.textContent = isMuted() ? '🔇' : '🔊'; btnMute.title = isMuted() ? 'Mở tiếng' : 'Tắt tiếng'; }; paintMute();
btnMute.onclick = () => { ensureAudio(); setMuted(!isMuted()); paintMute(); };
$('btnMenu').onclick = () => { running = false; $('result').classList.add('hidden'); $('menu').classList.remove('hidden'); playMode = 'level'; world = newWorld(); rebuild(); };
$('loading').classList.add('hidden'); $('btnStart').classList.remove('hidden');

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
        world.update(dt);
        // chốt an toàn: đứng chờ card mà card không mở → thả cho đi tiếp
        if (world.chef.waiting && !$('card').classList.contains('show')) { waitNoCard += dt; if (waitNoCard > 1.5) { world.chef.waiting = null; waitNoCard = 0; } } else waitNoCard = 0;
      } catch (e) { console.error(e); if (performance.now() - lastErr > 3000) { lastErr = performance.now(); toast(`Lỗi: ${e.message}`, 4000); } window.__qb.lastError = String(e.stack || e); const c = world.chef; c.target = null; c.busy = 0; c.waiting = null; c.queue.length = 0; }
    }
    $('money').textContent = world.money; $('served').textContent = world.served; $('left').textContent = world.left;
    const rem = world.shift.survival ? world.time : Math.max(0, world.shift.seconds - world.time); $('clock').textContent = `${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}`;
    const inPrep = running && world.prep > 0; $('prep').classList.toggle('hidden', !inPrep); if (inPrep) $('prepNum').textContent = Math.ceil(world.prep);
    view.sync(world, dt); if (running) syncHands();
  } else view.renderer.render(view.scene, view.camera);
}
// dựng bếp sẵn để menu có nền
world = newWorld(); rebuild();
if (new URLSearchParams(location.search).has('bot')) start(true);
requestAnimationFrame(frame);

// PWA: đăng ký service worker ở bản build (không ở dev/artifact); có bản mới → toast nhắc reload
if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:/.test(location.protocol) && !/claude\.ai/.test(location.host)) {
  navigator.serviceWorker.register('./sw.js').then((reg) => { reg.addEventListener('updatefound', () => { const nw = reg.installing; nw?.addEventListener('statechange', () => { if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Có bản mới — tải lại để cập nhật', 3000); }); }); }).catch(() => {});
}
window.__qb = { get world() { return world; }, get puzzle() { return puzzle; }, view, start, botDecide, tick, startPuzzle };
