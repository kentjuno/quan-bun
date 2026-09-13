import { describe, it, expect } from 'vitest';
import { World } from '../src/game/world.js';
import { botDecide } from '../src/game/bot.js';
import { POT, SHIFTS as SHIFTS_CFG } from '../src/config.js';
const SHIFTS = [{ ...SHIFTS_CFG[0], prep: 0 }];   // test bỏ giai đoạn chuẩn bị (test riêng bên dưới)

function run(world, seconds, onTick) {
  const dt = 1 / 30;
  for (let i = 0; i < seconds * 30 && world.state === 'running'; i++) {
    const tap = botDecide(world); if (tap) world.tap(tap);
    world.update(dt); onTick?.(world);
  }
}

describe('một khách gọi phở tái nạm', () => {
  it('bot nấu và giao được tô đầu tiên, đúng thứ tự ráp', () => {
    const shift = { ...SHIFTS[0], seconds: 120, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const events = []; const placed = [];
    const w = new World(shift, { onPlace: (b, tok) => placed.push(tok), onServe: (cu, p, tip) => events.push(['serve', cu.dish, p, tip]), onMistake: (h) => events.push(['mistake', h]) });
    run(w, 90);
    expect(events.find((e) => e[0] === 'serve')).toBeTruthy();
    expect(placed).toEqual(['bowl-hot:pho-bowl', 'noodle-drained:pho-noodle', 'nam', 'bo-tai', 'hanh-tay', 'ngo-ri-ngo-gai', 'hanh-la', 'broth:pour-pho-broth']);
    expect(w.mistakes).toBe(0);
    expect(w.money).toBeGreaterThanOrEqual(45);
  });
  it('thời gian một tô nằm trong khoảng hợp lý cho ca 150s', () => {
    const shift = { ...SHIFTS[0], seconds: 120, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    let servedAt = null;
    const w = new World(shift, { onServe: () => { servedAt = w.time; } });
    run(w, 120);
    expect(servedAt).not.toBeNull();
    expect(servedAt).toBeLessThan(60);   // nếu > 60s thì 1 ca 150s chỉ phục vụ được 2 khách → phải rút gọn bước
    console.log('Thời gian 1 tô phở tái nạm (bot, không song song):', servedAt.toFixed(1), 's');
  });
});

describe('ca 1 đầy đủ', () => {
  it('bot chạy hết ca không lỗi, có khách được phục vụ, kết quả có sao', () => {
    const w = new World(SHIFTS[0], {});
    run(w, 200);
    expect(w.state).toBe('over');
    expect(w.result.served).toBeGreaterThan(0);
    console.log('Ca 1:', JSON.stringify(w.result));
  });
});

describe('luật', () => {
  it('kệ lấy đúng thứ người chơi chạm; lấy 2 cái giống nhau được; tay đầy chạm lại thì trả về', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {});
    const shelf = w.stationById['shelf-topping'];
    w.chef.x = shelf.stand.x; w.chef.z = shelf.stand.z;
    expect(w.tap('shelf-topping:xyz')).toBe(false);
    w.tap('shelf-topping:la-sach'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['la-sach']);          // lấy đúng thứ chạm, dù không cần cho phở tái nạm
    w.tap('shelf-topping:la-sach'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['la-sach', 'la-sach']);   // 2 cái giống nhau (vd. 2 tô cho 2 khách)
    w.tap('shelf-topping:la-sach'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['la-sach']);          // tay đầy → chạm lại = trả 1 cái
  });
  it('đem sợi tới bồn trước khi trụng là "sai trạm"', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    const sink = w.stationById['sink']; w.chef.hand = ['pho-noodle']; w.chef.x = sink.stand.x; w.chef.z = sink.stand.z;
    w.tap('sink'); w.update(1 / 30);
    expect(w.errors[0].tag).toMatch(/Sai trạm/);
    expect(w.chef.hand).toEqual(['pho-noodle']);
  });
  it('bỏ sai thứ tự bị tính lỗi và không mất tô', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {});
    w.update(0.1); // khách tới
    const counter = w.stations.find((s) => s.type === 'counter');
    counter.slots[0] = { recipe: w.recipes['pho-tai-nam'], customer: w.customers[0], placed: ['bowl-hot:pho-bowl', 'noodle-drained:pho-noodle'], done: false };
    w.chef.hand = ['hanh-la']; // đúng ra phải là nạm
    w.chef.x = counter.stand.x; w.chef.z = counter.stand.z; w.tap('counter:0'); w.update(1 / 30);
    expect(w.mistakes).toBe(1);
    expect(w.errors[0].tag).toMatch(/Ráp sớm: Hành/);
    expect(counter.slots[0].placed.length).toBe(2);
    expect(w.chef.hand).toEqual(['hanh-la']);
  });
  it('khách hết kiên nhẫn thì bỏ đi; tô đang làm giữ lại và giao được cho khách sau cùng món', () => {
    const shift = { ...SHIFTS[0], seconds: 120, arrivals: [{ t: 0, type: 'xeom', dish: 'pho-tai-nam' }, { t: 75, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {});
    w.update(0.1);
    const counter = w.stations.find((s) => s.type === 'counter');
    counter.slots[0] = { recipe: w.recipes['pho-tai-nam'], customer: w.customers[0], placed: ['bowl-hot:pho-bowl'], done: false };
    for (let i = 0; i < 76 * 30; i++) w.update(1 / 30);   // bác xe ôm 70 s kiên nhẫn → bỏ đi lúc 70 s
    expect(w.left).toBe(1);
    expect(w.customers[0].state).toBe('left');
    expect(counter.slots[0]).not.toBeNull();
    expect(counter.slots[0].customer).toBe(w.customers[1]);
  });
});

describe('nồi trụng xử lý nhiều thứ trên tay (bảng quyết định §2)', () => {
  function at(w, id) { const s = w.stationById[id]; w.chef.x = s.stand.x; w.chef.z = s.stand.z; return s; }
  it('[tô, sợi] → cả hai chạy nền trong nồi (tô nằm chờ trong nước nóng), tay trống; chạm rọ 0 khi chín → lấy đúng sợi', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    const pot = at(w, 'pot'); w.chef.hand = ['pho-bowl', 'pho-noodle'];
    w.tap('pot'); w.update(1 / 30);                 // tới trạm ngay (đã đứng sẵn)
    expect(pot.jobs.map((j) => j.input).sort()).toEqual(['pho-bowl', 'pho-noodle']);
    expect(w.chef.busy).toBe(0); expect(w.chef.hand).toEqual([]);   // không phải đứng làm
    expect(pot.jobs.find((j) => j.input === 'pho-noodle').slot).toBe(0);
    for (let i = 0; i < 4.2 * 30; i++) w.update(1 / 30);
    w.tap('pot:0'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['noodle-blanched:pho-noodle']);
    expect(pot.jobs.length).toBe(1); expect(pot.jobs[0].kind).toBe('bowl');   // tô vẫn nằm trong nồi
    w.tap('pot:bowl'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['noodle-blanched:pho-noodle', 'bowl-hot:pho-bowl']);
  });
  it('[tô, sợi đã xả] → trụng lại đứng làm 1.5 s, tô nền; tay ra [sợi đã ráo], tô lấy khi cần', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    at(w, 'pot'); w.chef.hand = ['pho-bowl', 'noodle-rinsed:pho-noodle'];
    w.tap('pot'); w.update(1 / 30);
    expect(w.chef.busy).toBeCloseTo(1.5, 0);
    for (let i = 0; i < 60; i++) w.update(1 / 30);
    expect(w.chef.hand).toEqual(['noodle-drained:pho-noodle']);   // xong việc đứng → lấy sợi; tô vẫn nằm trong nồi (chạm thân nồi chỉ lấy 1 thứ)
    expect(w.stationById.pot.jobs.filter((j) => j.kind === 'bowl').length).toBe(1);
  });
  it('sức chứa nồi: 3 rọ sợi, 5 tô; rọ thứ 4 bị báo đầy', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [] };
    const toasts = []; const w = new World(shift, { onToast: (m) => toasts.push(m) }); w.update(0.1);
    const pot = at(w, 'pot');
    for (let i = 0; i < 4; i++) { w.chef.hand = ['pho-noodle']; w.tap('pot'); w.update(1 / 30); }
    expect(pot.jobs.filter((j) => j.kind === 'noodle').length).toBe(3);
    expect(w.chef.hand).toEqual(['pho-noodle']); expect(toasts.at(-1)).toMatch(/đầy/);
    for (let i = 0; i < 6; i++) { w.chef.hand = ['pho-bowl']; w.tap('pot'); w.update(1 / 30); }
    expect(pot.jobs.filter((j) => j.kind === 'bowl').length).toBe(5);
  });
  it('sợi chín để lâu trong nồi → hư, lấy ra thành "Sợi hư", chỉ vứt được; tô để bao lâu cũng được', () => {
    const shift = { ...SHIFTS[0], seconds: 100, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    const pot = at(w, 'pot'); w.chef.hand = ['pho-noodle', 'pho-bowl']; w.tap('pot'); w.update(1 / 30);
    for (let i = 0; i < (4 + POT.noodleSpoilAfter + 1) * 30; i++) w.update(1 / 30);
    const nj = pot.jobs.find((j) => j.kind === 'noodle'); expect(nj.spoiled).toBe(true); expect(nj.output).toBe('noodle-spoiled');
    expect(pot.jobs.find((j) => j.kind === 'bowl').spoiled).toBeUndefined();
    w.tap('pot:0'); w.update(1 / 30); expect(w.chef.hand).toEqual(['noodle-spoiled']); expect(w.wasted).toBe(1);
    const sink = at(w, 'sink'); w.tap('sink'); w.update(1 / 30); expect(w.chef.hand).toEqual(['noodle-spoiled']);   // không dùng được
    const t = at(w, 'trash'); w.tap('trash'); w.update(1 / 30); expect(w.chef.hand).toEqual([]);
    expect(w.mistakes).toBe(0);
  });
  it('tay đầy tới nồi có sợi xong → không lấy được, có báo', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const toasts = []; const w = new World(shift, { onToast: (m) => toasts.push(m) }); w.update(0.1);
    const pot = at(w, 'pot'); pot.jobs.push({ input: 'pho-noodle', output: 'noodle-blanched:pho-noodle', action: 'blanch-noodle', left: 0, total: 4, passive: true, taken: false });
    w.chef.hand = ['nam', 'bo-tai']; w.tap('pot'); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['nam', 'bo-tai']);
    expect(toasts.some((t) => /Tay đầy/.test(t))).toBe(true);
  });
});

describe('chế độ card (kệ chỉ có tên, tới kệ mới chọn)', () => {
  it('chạm kệ không kèm item → đầu bếp tới, đứng chờ; chọn 2 thứ → lên tay, đi tiếp', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [] };
    let opened = null; const w = new World(shift, { onShelfOpen: (s) => { opened = s.id; } });
    expect(w.tap('shelf-topping')).toBe(true);
    for (let i = 0; i < 4 * 30 && !opened; i++) w.update(1 / 30);
    expect(opened).toBe('shelf-topping'); expect(w.chef.waiting).toBe('shelf-topping');
    w.tap('pot'); for (let i = 0; i < 30; i++) w.update(1 / 30);
    expect(w.chef.waiting).toBe('shelf-topping');                 // vẫn đứng chờ, việc sau xếp hàng
    expect(w.pickFromShelf(['nam', 'bo-tai', 'la-sach'])).toBe(true);
    expect(w.chef.hand).toEqual(['nam', 'bo-tai']);                // tối đa 2
    expect(w.chef.waiting).toBeNull();
    for (let i = 0; i < 30; i++) w.update(1 / 30); expect(w.chef.target).toBe('pot');   // đi tiếp việc đã xếp
  });
});

describe('nhiều món (ca 2–4)', () => {
  it('ca 4: bot nấu được cả 4 món, mỗi món đúng nước lèo của nồi đó, không lỗi', () => {
    const shift = { ...SHIFTS_CFG[3], prep: 0, seconds: 400, arrivals: [
      { t: 0, type: 'tourist', dish: 'pho-dac-biet' }, { t: 60, type: 'tourist', dish: 'bun-rieu-cua' }, { t: 130, type: 'tourist', dish: 'bun-bo-hue' }, { t: 200, type: 'tourist', dish: 'pho-tai-nam' }] };
    const served = []; const placed = {};
    const w = new World(shift, { onServe: (cu) => served.push(cu.dish), onPlace: (b, tok) => { (placed[b.recipe.id] ??= []).push(tok); } });
    run(w, 320);
    expect(served.sort()).toEqual(['bun-bo-hue', 'bun-rieu-cua', 'pho-dac-biet', 'pho-tai-nam']);
    expect(w.mistakes).toBe(0);
    expect(placed['bun-rieu-cua']).toEqual(['bowl-hot:soup-bowl', 'noodle-drained:bun', 'ca-chua', 'bo-tai', 'dau-hu', 'tom', 'crab-broth-ready', 'hanh-la']);
    expect(placed['bun-bo-hue']).toEqual(['bowl-hot:soup-bowl', 'noodle-drained:bun-to', 'thit-luoc', 'bap-bo', 'nam', 'cha-lua', 'cha-re', 'hanh-tay', 'rau-ram', 'hanh-la', 'bun-bo-broth-ready']);
    expect(placed['pho-dac-biet']).toContain('bo-vien-ready');
    expect(w.stations.some((s) => s.id === 'burner')).toBe(true);
    expect(w.soups['bun-rieu-cua'].items).toEqual(['cot-cua', 'huyet', 'mieng-nuoc']);
  });
  it('lò đun: chọn sai thứ tự → lỗi có tag; đúng → đun → MỘT phần tự sang kệ nước, lò trống; kệ stack nhiều loại, lấy đúng loại đang cần', () => {
    const shift = { ...SHIFTS_CFG[3], prep: 0, seconds: 100, arrivals: [] };
    const w = new World(shift, {}); w.update(0.1);
    const bu = w.stationById['burner']; w.chef.x = bu.stand.x; w.chef.z = bu.stand.z;
    w.tap('burner:0'); w.update(1 / 30); expect(w.chef.waiting).toBe('burner:0');
    expect(w.cookSoup(['huyet', 'cot-cua', 'mieng-nuoc'])).toBe(false); expect(w.mistakes).toBe(1); expect(w.errors[0].tag).toMatch(/sai thứ tự.*Nước cốt cua → Huyết → Miếng nước/); expect(bu.slots[0]).toBeNull();
    expect(w.chef.waiting).toBe('burner:0');   // sai → vẫn đứng ở lò, chọn lại
    expect(w.cookSoup(['cot-cua', 'huyet', 'mieng-nuoc'])).toBe(true); expect(w.chef.waiting).toBeNull(); expect(bu.slots[0].name).toBe('Nước riêu cua'); expect(bu.slots[0].left).toBeGreaterThan(0);
    w.tap('burner:1'); w.update(1 / 30); w.cookSoup(['nuoc-bun-bo', 'huyet', 'mieng-nuoc']); expect(bu.slots[1].name).toBe('Nước bún bò');
    w.tap('burner:0'); w.update(1 / 30); expect(w.chef.hand).toEqual([]);   // đang đun → chưa múc được
    for (let i = 0; i < 7 * 30; i++) w.update(1 / 30);
    expect(bu.slots[0]).toBeNull(); expect(bu.slots[1]).toBeNull(); expect(bu.ready.map((b) => b.output)).toEqual(['crab-broth-ready', 'bun-bo-broth-ready']);   // đun xong tự sang kệ nước
    // lấy đúng loại: chỉ định token
    w.chef.hand = []; w.tap('burner:ready.bun-bo-broth-ready'); for (let i = 0; i < 30; i++) w.update(1 / 30); expect(w.chef.hand).toEqual(['bun-bo-broth-ready']); expect(bu.ready.length).toBe(1);
    // không chỉ định, không ai cần → phần trên cùng; hết thì báo
    w.chef.hand = []; w.tap('burner:ready'); for (let i = 0; i < 30; i++) w.update(1 / 30); expect(w.chef.hand).toEqual(['crab-broth-ready']); expect(bu.ready.length).toBe(0);
    w.chef.hand = []; w.tap('burner:ready'); for (let i = 0; i < 30; i++) w.update(1 / 30); expect(w.chef.hand).toEqual([]);
  });
  it('ca 1 không có lò đun; ca 1 kệ topping chỉ bày đồ của phở tái nạm + lá sách, bò viên gây nhiễu', () => {
    const w = new World({ ...SHIFTS_CFG[0], prep: 0 }, {});
    expect(w.stations.some((s) => s.id === 'burner')).toBe(false);
    expect(w.stationById['shelf-topping'].items.sort()).toEqual(['bo-tai', 'bo-vien', 'hanh-la', 'hanh-tay', 'la-sach', 'nam', 'ngo-ri-ngo-gai'].sort());
  });
  it('ca 1 kệ chưa có cà chua, chưa có lò (bếp lớn dần theo ca)', () => {
    const w = new World({ ...SHIFTS_CFG[0], prep: 0 }, {});
    expect(w.stationById['shelf-topping'].items.includes('ca-chua')).toBe(false);
    expect(w.stations.some((s) => s.id === 'burner')).toBe(false);
  });
  it('nước phở không được chan vào bún riêu', () => {
    const shift = { ...SHIFTS_CFG[2], prep: 0, seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'bun-rieu-cua' }] };
    const w = new World(shift, {}); w.update(0.1);
    const counter = w.stations.find((s) => s.type === 'counter');
    counter.slots[0] = { recipe: w.recipes['bun-rieu-cua'], customer: w.customers[0], placed: ['bowl-hot:soup-bowl', 'noodle-drained:bun', 'ca-chua', 'bo-tai', 'dau-hu', 'tom'], done: false };
    w.chef.hand = ['broth:pour-pho-broth']; w.chef.x = counter.stand.x; w.chef.z = counter.stand.z; w.tap('counter:0'); w.update(1 / 30);
    expect(w.mistakes).toBe(1); expect(w.errors[0].tag).toMatch(/Không có trong Bún Riêu Cua: Nước phở/);
  });
});

describe('đủ 16 món (ca 5–9): thớt gom nhiều nguyên liệu, lò vi sóng, mẹt, tô khô, cháo', () => {
  it('bot làm được từng món đơn lẻ trên cả 2 bố trí, không lỗi', async () => {
    const { KITCHEN_LANDSCAPE, KITCHEN_PORTRAIT } = await import('../src/config.js');
    const { D } = await import('../src/game/recipes.js');
    for (const d of Object.keys(D.recipes)) for (const K of [KITCHEN_LANDSCAPE, KITCHEN_PORTRAIT]) {
      const sh = SHIFTS_CFG.find((s) => s.dishes.includes(d)); expect(sh, `${d} không nằm trong ca nào`).toBeTruthy();
      const w = new World({ ...sh, prep: 0, seconds: 400, arrivals: [{ t: 0, type: 'tourist', dish: d, patience: 1e9 }] }, {}, K);
      let servedAt = null; w.ev.onServe = () => { servedAt = w.time; };
      for (let i = 0; i < 200 * 30 && servedAt === null; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(1 / 30); }
      expect(servedAt, `${d} chưa giao được`).not.toBeNull();
      expect(w.mistakes, `${d} có lỗi: ${w.errors.map((e) => e.tag).join('; ')}`).toBe(0);
    }
  });
  it('thớt: đem thiếu → báo còn thiếu gì; đủ → làm (đứng) → kết quả lên tay', () => {
    const sh = SHIFTS_CFG.find((s) => s.dishes.includes('bun-ga-nuong'));
    const w = new World({ ...sh, prep: 0, seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'bun-ga-nuong' }] }, {}); w.update(0.1);
    const toasts = []; w.ev.onToast = (m) => toasts.push(m);
    const pr = w.stationById['prep']; w.chef.x = pr.stand.x; w.chef.z = pr.stand.z;
    w.chef.hand = ['xa-lach', 'dua-leo']; w.tap('prep'); w.update(1 / 30);
    expect(pr.slots[0].have.filter(Boolean).length).toBe(2); expect(w.chef.hand).toEqual([]);
    w.tap('prep:0'); w.update(1 / 30); expect(toasts.at(-1)).toMatch(/còn thiếu Đồ chua/);
    w.chef.hand = ['do-chua']; w.tap('prep'); w.update(1 / 30); expect(w.chef.busy).toBeGreaterThan(0);
    for (let i = 0; i < 4 * 30; i++) w.update(1 / 30);
    expect(w.chef.hand).toEqual(['salad-cut-ready']); expect(pr.slots[0]).toBeNull();
  });
  it('mẹt: quầy ráp mở bằng "Mẹt đã lót giấy", không phải tô', () => {
    const sh = SHIFTS_CFG.find((s) => s.dishes.includes('bun-dau-mam-tom'));
    const w = new World({ ...sh, prep: 0, seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'bun-dau-mam-tom' }] }, {}); w.update(0.1);
    const counter = w.stations.find((s) => s.type === 'counter'); w.chef.x = counter.stand.x; w.chef.z = counter.stand.z;
    w.chef.hand = ['bun']; w.tap('counter:0'); w.update(1 / 30); expect(w.errors[0].tag).toMatch(/Ráp sớm: Bún \(chưa có mẹt đã lót giấy\)/);
    w.chef.hand = ['tray-ready', 'bun']; w.tap('counter:0'); w.update(1 / 30); w.update(1);
    expect(counter.slots[0].placed).toEqual(['tray-ready', 'bun']);
  });
});

describe('giai đoạn chuẩn bị', () => {
  it('trong prep: đồng hồ ca chưa chạy, khách chưa tới, nhưng nồi và đầu bếp hoạt động', () => {
    const shift = { ...SHIFTS_CFG[0], prep: 5, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {});
    const pot = w.stationById['pot']; w.chef.x = pot.stand.x; w.chef.z = pot.stand.z; w.chef.hand = ['pho-bowl']; w.tap('pot');
    for (let i = 0; i < 3 * 30; i++) w.update(1 / 30);
    expect(w.time).toBe(0); expect(w.customers.length).toBe(0);
    expect(pot.jobs[0].left).toBe(0);                    // tô đã trụng xong trong lúc chuẩn bị
    for (let i = 0; i < 3 * 30; i++) w.update(1 / 30);
    expect(w.prep).toBe(0); expect(w.customers.length).toBe(1); expect(w.time).toBeGreaterThan(0);
  });
});

describe('thùng rác', () => {
  it('vứt hết đồ trên tay, không tính lỗi thứ tự, có ghi lại', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    const t = w.stationById['trash']; w.chef.x = t.stand.x; w.chef.z = t.stand.z;
    w.chef.hand = ['la-sach', 'noodle-rinsed']; w.tap('trash'); w.update(1 / 30);
    expect(w.chef.hand).toEqual([]);
    expect(w.mistakes).toBe(0);
    expect(w.wasted).toBe(2);
    expect(w.errors[0].tag).toMatch(/Vứt: Lá sách/);
  });
  it('nút × trên HUD: chỉ vứt đúng ô tay đó, giữ thứ kia', () => {
    const shift = { ...SHIFTS[0], seconds: 60, arrivals: [{ t: 0, type: 'tourist', dish: 'pho-tai-nam' }] };
    const w = new World(shift, {}); w.update(0.1);
    const t = w.stationById['trash']; w.chef.x = t.stand.x; w.chef.z = t.stand.z;
    w.chef.hand = ['la-sach', 'noodle-rinsed']; expect(w.tap('trash:0')).toBe(true); w.update(1 / 30);
    expect(w.chef.hand).toEqual(['noodle-rinsed']);
    expect(w.wasted).toBe(1);
    expect(w.tap('trash:5')).toBe(false);
  });
});

// ---- survival & tiến trình ----
import { SURVIVAL, LEVELS } from '../src/config.js';
describe('survival', () => {
  it('khách tới liên tục, gap giảm dần, 3 khách bỏ đi là hết', async () => {
    const { World } = await import('../src/game/world.js'); const { kitchenFor } = await import('../src/config.js');
    const w = new World({ ...SURVIVAL, prep: 0 }, {}, kitchenFor(false));
    const arrivals = []; for (let i = 0; i < 400 * 10; i++) { const n = w.arrivalIdx; w.update(0.1); if (w.arrivalIdx > n) arrivals.push(+w.time.toFixed(1)); if (w.state !== 'running') break; }
    expect(arrivals.length).toBeGreaterThanOrEqual(3);
    expect(w.state).toBe('over'); expect(w.left).toBe(SURVIVAL.lives);
    expect(w.shift.dishes.length).toBe(18);
  });
});

describe('đủ menu cùng lúc (survival / luyện tập chọn món)', () => {
  it('bot làm được cả 16 món khi bếp bày đủ menu (bún: nóng→lạnh→nóng vs trụng 1 lần không lẫn)', async () => {
    const { parFor } = await import('../src/game/par.js'); const { kitchenFor } = await import('../src/config.js');
    for (const K of [kitchenFor(false), kitchenFor(true)]) for (const d of SURVIVAL.dishes) expect(parFor(SURVIVAL, K, d).seconds, `${d} ${K.size.w}x${K.size.d}`).not.toBeNull();
  });
  it('bún riêu + bún chả cùng lúc: bot giao đúng cả hai, sợi bún theo loại', async () => {
    const { World } = await import('../src/game/world.js'); const { botDecide } = await import('../src/game/bot.js'); const { kitchenFor } = await import('../src/config.js');
    const w = new World({ ...SURVIVAL, survival: false, prep: 0, seconds: 400, arrivals: [{ t: 0, type: 'tourist', dish: 'bun-rieu-cua', patience: 1e9 }, { t: 1, type: 'tourist', dish: 'bun-cha-ha-noi', patience: 1e9 }] }, {}, kitchenFor(false));
    const placed = {}; w.ev.onServe = (cu) => { placed[cu.dish] = true; };
    for (let i = 0; i < 400 * 30 && w.served < 2; i++) { const t = botDecide(w); if (t) w.tap(t); w.update(1 / 30); }
    expect(w.served).toBe(2); expect(w.mistakes).toBe(0);
    expect(w.recipes['bun-cha-ha-noi'].assembly).toContain('noodle-drained:bun'); expect(w.recipes['bun-cha-ha-noi'].assembly.indexOf('dua-leo')).toBeGreaterThan(w.recipes['bun-cha-ha-noi'].assembly.indexOf('noodle-drained:bun'));
  });
});
