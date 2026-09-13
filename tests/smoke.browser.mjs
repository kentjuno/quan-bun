// Smoke test headless: tải, mở hàng, chạm vài trạm, bot chơi 60s game-time, chụp ảnh, không lỗi console.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
const preview = spawn('npx', ['vite', 'preview', '--port', '4175', '--strictPort'], { stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 2500));
mkdirSync('tests/out', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
for (const vp of [{ w: 1280, h: 720, tag: 'land' }, { w: 430, h: 900, tag: 'port' }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
  page.on('pageerror', (e) => errors.push(vp.tag + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION_RESET|fonts\.g/.test(m.text())) errors.push(vp.tag + ' console: ' + m.text()); });
  await page.goto('http://localhost:4175/?card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 });
  await page.screenshot({ path: `tests/out/${vp.tag}_01_menu.png` });
  await page.click('#btnStart'); await page.waitForTimeout(1200);
  // chạm bằng chuột thật vào kệ tô (raycast) rồi nồi
  const pts = await page.evaluate(() => { const { view, world } = window.__qb; const out = {}; for (const id of ['shelf-bowl', 'pot']) { const s = world.stationById[id]; const v = new (Object.getPrototypeOf(view.camera.position).constructor)(s.x + (id === 'shelf-bowl' ? 0 : 0), 1.0, s.z + (id === 'shelf-bowl' ? -0.22 : 0)); v.project(view.camera); out[id] = [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; } return out; });
  await page.mouse.click(...pts['shelf-bowl']); await page.mouse.click(...pts['pot']);
  const q = await page.evaluate(() => JSON.stringify(window.__qb.world.chef.queue.concat(window.__qb.world.chef.target || [])));
  console.log(vp.tag, 'QUEUE_AFTER_TAPS', q);
  const anims = await page.evaluate(() => Object.keys(window.__qb.view.actions || {}));
  console.log(vp.tag, 'ANIMS', anims.join(','), 'playing', await page.evaluate(() => window.__qb.view.anim));
  if (anims.length < 5) errors.push(vp.tag + ' chef clips missing');
  // bot chơi 60 s game-time
  const sim = await page.evaluate(async () => {
    const { botDecide } = window.__qb;
    const w = window.__qb.world; let taps = 0;
    for (let i = 0; i < 60 * 30; i++) { const t = botDecide ? botDecide(w) : null; if (t) { w.tap(t); taps++; } w.update(1 / 30); }
    return { time: +w.time.toFixed(1), money: w.money, served: w.served, left: w.left, mistakes: w.mistakes, taps, customers: w.customers.length };
  });
  console.log(vp.tag, 'SIM', JSON.stringify(sim));
  // ô tay HUD: đặt đồ vào tay, chờ 1 khung hình, ô phải hiện; bấm × → queue có trash:0; bấm lại → huỷ
  await page.evaluate(() => { const w = window.__qb.world; w.chef.queue.length = 0; w.chef.target = null; w.chef.busy = 0; w.chef.hand = ['nam']; });
  const t0 = Date.now(); await page.waitForFunction(() => document.querySelector('#hands .slot[data-i="0"]').classList.contains('full'), null, { timeout: 5000 }).catch(() => {}); console.log(vp.tag, 'HANDS_MS', Date.now() - t0);
  const slotTxt = await page.evaluate(() => document.querySelector('#hands .slot[data-i="0"]').textContent);
  await page.click('#hands .slot[data-i="0"] .x'); await page.waitForTimeout(60);
  const q1 = await page.evaluate(() => JSON.stringify(window.__qb.world.chef.queue.concat(window.__qb.world.chef.target || [])));
  console.log(vp.tag, 'HANDS', JSON.stringify(slotTxt), q1);
  if (!slotTxt.includes('Nạm') || !q1.includes('trash:0')) errors.push(vp.tag + ' hands HUD');
  await page.evaluate(() => { const w = window.__qb.world; w.chef.hand.push('noodle-rinsed:pho-noodle'); const pot = w.stationById.pot; pot.jobs.length = 0;
    pot.jobs.push({ input: 'pho-noodle', output: 'noodle-blanched:pho-noodle', action: 'blanch-noodle', left: 0, total: 4, passive: true, taken: false, kind: 'noodle', slot: 0, hold: 9 });
    pot.jobs.push({ input: 'pho-noodle', output: 'noodle-blanched:pho-noodle', action: 'blanch-noodle', left: 2, total: 4, passive: true, taken: false, kind: 'noodle', slot: 1, hold: 0 });
    pot.jobs.push({ input: 'pho-noodle', output: 'noodle-spoiled', action: 'blanch-noodle', left: 0, total: 4, passive: true, taken: false, kind: 'noodle', slot: 2, hold: 20, spoiled: true });
    for (let i = 0; i < 3; i++) pot.jobs.push({ input: 'pho-bowl', output: 'bowl-hot', action: 'blanch-bowl', left: 0, total: 1.5, passive: true, taken: false, kind: 'bowl', slot: i, hold: 0 }); }); await page.waitForTimeout(700); await page.screenshot({ path: `tests/out/${vp.tag}_04_hands.png` });
  // khách đã phục vụ/bỏ đi không được để lại bong bóng hay thanh kiên nhẫn trên màn hình
  await page.waitForTimeout(1500);
  const dom = await page.evaluate(() => ({ bubbles: [...document.querySelectorAll('.bubble')].filter((e) => e.style.display !== 'none').length, waiting: window.__qb.world.customers.filter((c) => c.state === 'waiting').length }));
  console.log(vp.tag, 'DOM_CLEAN', JSON.stringify(dom), dom.bubbles <= dom.waiting ? 'OK' : 'LEAK');
  if (dom.bubbles > dom.waiting) errors.push(vp.tag + ' bubble leak');
  if (vp.tag === 'port') {   // chế độ card: chạm cả kệ → đầu bếp tới → card mở → chọn 2 → lên tay
    await page.goto('http://localhost:4175/?card=1'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(1200);
    const pt = await page.evaluate(() => { const { view, world } = window.__qb; const s = world.stationById['shelf-topping']; const v = new (Object.getPrototypeOf(view.camera.position).constructor)(s.x, 0.9, s.z); v.project(view.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
    console.log('CARD_PT', pt, await page.evaluate(([x, y]) => JSON.stringify({ pick: window.__qb.view.pick(x, y), running: !document.querySelector('#hud').classList.contains('hidden'), shift: window.__qb.world.shift.id, el: document.elementFromPoint(x, y)?.id || document.elementFromPoint(x, y)?.className }), pt));
    await page.mouse.click(...pt);
    const opened = await page.waitForSelector('#card.show', { timeout: 20000 }).then(() => true).catch(() => false);
    if (!opened) console.log('CARD_DBG', await page.evaluate(() => JSON.stringify({ q: window.__qb.world.chef.queue, t: window.__qb.world.chef.target, w: window.__qb.world.chef.waiting, card: window.__qb.view.shelfCard, hits: window.__qb.view.hitboxes.length })));
    if (opened) { await page.click('#card .it[data-it="nam"]'); await page.click('#card .it[data-it="nam"]');/* 2 cái giống nhau */ await page.screenshot({ path: 'tests/out/port_card.png' }); await page.click('#cardTake'); await page.waitForTimeout(200); }
    const hand = await page.evaluate(() => JSON.stringify(window.__qb.world.chef.hand));
    console.log(vp.tag, 'CARD', opened, hand);
    if (!opened || hand !== '["nam","nam"]') errors.push('card mode');
    // lò đun (ca 3): chạm bếp lò 0 → card nước lèo → bấm cốt cua, huyết, nước → Đun → lò có nồi "Nước riêu cua"
    await page.goto('http://localhost:4175/?shift=3'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(1200);
    const bp = await page.evaluate(() => { const { view, world } = window.__qb; const s = world.stationById['burner']; const v = new (Object.getPrototypeOf(view.camera.position).constructor)(s.x - s.w / 4, 1.0, s.z); v.project(view.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
    await page.mouse.click(...bp);
    const sopen = await page.waitForSelector('#card.show', { timeout: 20000 }).then(() => true).catch(() => false);
    if (sopen) { for (const it of ['cot-cua', 'huyet', 'mieng-nuoc']) await page.click(`#card .it[data-it="${it}"]`); await page.screenshot({ path: 'tests/out/port_soupcard.png' }); await page.click('#cardTake'); await page.waitForTimeout(200); }
    const soup = await page.evaluate(() => JSON.stringify(window.__qb.world.stationById['burner'].slots.map((b) => b && b.name)));
    console.log(vp.tag, 'SOUP', sopen, soup); if (!sopen || !soup.includes('Nước riêu cua')) errors.push('soup card');
    // ca 5 (mẹt/tô khô, thớt) — bot làm 60 s để có đồ trên thớt rồi chụp
    await page.goto('http://localhost:4175/?shift=5&card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(1200);
    const s5 = await page.evaluate(() => { const { botDecide } = window.__qb; const w = window.__qb.world; for (let i = 0; i < 40 * 30; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(1 / 30); } return { served: w.served, prep: !!w.stationById.prep, mistakes: w.mistakes }; });
    await page.waitForTimeout(800); await page.screenshot({ path: 'tests/out/port_shift5.png' });
    console.log(vp.tag, 'SHIFT5', JSON.stringify(s5)); if (!s5.prep || s5.mistakes) errors.push('shift5');
    await page.goto('http://localhost:4175/?shift=4&card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(600); await page.screenshot({ path: 'tests/out/port_shift4.png' });
    const st4 = await page.evaluate(() => window.__qb.world.stations.map((s) => s.id).filter((i) => /burner/.test(i)).concat(window.__qb.world.stationById['shelf-topping'].items.filter((i) => /cha-re|ca-chua/.test(i))));
    console.log(vp.tag, 'SHIFT4', st4.join(',')); if (st4.length < 3) errors.push('shift4 stations');
    await page.goto('http://localhost:4175/?hit=1&card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(400); await page.screenshot({ path: 'tests/out/port_hitboxes.png' }); }
  await page.waitForTimeout(400); await page.screenshot({ path: `tests/out/${vp.tag}_02_play.png` });
  if (vp.tag === 'land') {   // luyện đơn lẻ: bot lái 5 đơn → báo cáo tổng kết có bảng tô / so với bot / lộ trình
    await page.goto('http://localhost:4175/?shift=2&card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.evaluate(() => document.getElementById('btnDrill').click()); await page.waitForTimeout(600);
    const drill = await page.evaluate(() => { const { botDecide } = window.__qb; const w = window.__qb.world; let taps = 0; for (let i = 0; i < 400 * 30 && w.state === 'running'; i++) { const t = botDecide(w); if (t) { w.tap(t); taps++; } w.update(1 / 30); } return { state: w.state, served: w.served, taps, bowls: w.result?.stats?.bowls?.length, idle: w.result?.stats?.idle }; });
    await page.waitForTimeout(800);
    const rep = await page.evaluate(() => ({ visible: !document.querySelector('#result').classList.contains('hidden'), rows: document.querySelectorAll('#report table tbody tr').length, route: !!document.querySelector('#report ol.route'), title: document.querySelector('#rTitle').textContent }));
    console.log(vp.tag, 'DRILL', JSON.stringify(drill), JSON.stringify(rep));
    if (drill.state !== 'over' || drill.served !== 8 || !rep.visible || rep.rows !== 8) errors.push('drill/report');
    await page.screenshot({ path: 'tests/out/land_report.png' });
    await page.goto('http://localhost:4175/?shift=4&card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 }); await page.click('#btnStart'); await page.waitForTimeout(600); await page.screenshot({ path: 'tests/out/land_shift4.png' });
    // survival + trang trí: mua hết đồ (điểm giả) → dựng quán có cây/đèn/bảng → bot chơi 90 s → ép 3 khách bỏ đi → kết quả
    await page.evaluate(() => localStorage.setItem('qb.progress.v1', JSON.stringify({ stars: { 1: 3, 2: 2 }, points: 5000, spent: 0, decor: ['cay-canh', 'den-long', 'bang-hieu', 'tranh', 'gach-hoa', 'be-ca', 'tuong-vang', 'hoa-mai'] })));
    await page.goto('http://localhost:4175/?card=0'); await page.waitForSelector('#btnStart:not(.hidden)', { timeout: 30000 });
    const menu = await page.evaluate(() => ({ dots: document.querySelectorAll('#lvDots i').length, done: document.querySelectorAll('#lvDots i.done').length, shop: document.querySelectorAll('#shop .sh.owned').length, decor: window.__qb.view.scene.getObjectByName('decor')?.children.length }));
    console.log(vp.tag, 'MENU', JSON.stringify(menu)); if (menu.dots !== 10 || menu.done !== 1 || menu.shop !== 8 || !menu.decor) errors.push('menu/decor');
    await page.click('#lvNext'); await page.click('#lvNext'); await page.click('#lvNext'); await page.waitForTimeout(250); const lv4 = await page.evaluate(() => ({ txt: document.getElementById('lvCard').textContent, locked: document.getElementById('lvCard').classList.contains('locked'), start: document.getElementById('btnStart').disabled })); console.log(vp.tag, 'CAROUSEL', JSON.stringify(lv4)); if (!lv4.txt.includes('Level 4') || !lv4.locked || !lv4.start) errors.push('carousel'); await page.screenshot({ path: 'tests/out/land_menu_locked.png' }); await page.click('#lvPrev'); await page.waitForTimeout(250);
    await page.screenshot({ path: 'tests/out/land_menu_decor.png' });
    await page.evaluate(() => document.getElementById('btnSurvival').click()); await page.waitForTimeout(800); await page.screenshot({ path: 'tests/out/land_survival_start.png' });
    const sv = await page.evaluate(() => { const { botDecide } = window.__qb; const w = window.__qb.world; for (let i = 0; i < 150 * 30 && w.state === 'running'; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(1 / 30); } return { survival: !!w.shift.survival, served: w.served, left: w.left, arrived: w.arrivalIdx, state: w.state, mistakes: w.mistakes, clock: document.getElementById('clock').textContent }; });
    await page.waitForTimeout(600); await page.screenshot({ path: 'tests/out/land_survival.png' });
    console.log(vp.tag, 'SURVIVAL', JSON.stringify(sv)); if (!sv.survival || sv.arrived < 3 || sv.state !== 'running') errors.push('survival');
    await page.evaluate(() => { const w = window.__qb.world; w.left = 3; w.update(0.05); }); await page.waitForTimeout(300);
    const svr = await page.evaluate(() => ({ visible: !document.querySelector('#result').classList.contains('hidden'), stars: document.querySelector('#stars').textContent, pts: document.querySelector('#rPoints').textContent }));
    console.log(vp.tag, 'SURVIVAL_RESULT', JSON.stringify(svr)); if (!svr.visible || !svr.stars.includes('khách') || !svr.pts.includes('điểm')) errors.push('survival result');
    await page.screenshot({ path: 'tests/out/land_survival_result.png' }); }
  await page.evaluate(() => { const w = window.__qb.world; w.time = w.shift.seconds; w.update(0.05); }); await page.waitForTimeout(300);
  console.log(vp.tag, 'RESULT_VISIBLE', await page.isVisible('#result'), await page.textContent('#stars'));
  await page.screenshot({ path: `tests/out/${vp.tag}_03_result.png` });
  await page.close();
}
console.log('ERRORS', errors.length ? errors : 'none');
await browser.close(); preview.kill(); process.exit(errors.length ? 1 : 0);
