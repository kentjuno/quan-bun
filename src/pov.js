// QUẦY POV — lớp vẽ + kéo thả. Mọi luật bếp nằm ở game/counter.js (Counter), file này chỉ hiển thị và chuyển thao tác thành `C.drop(src, zone)`.
// Điều khiển: KÉO vật tới chỗ, hoặc CHẠM ĐÔI để nó tự bay tới đích hợp lý nhất (Kent: kéo chính xác trên điện thoại khó).
import { D, label, tokenMatches, recipeFor } from './game/recipes.js';
import { iconUrl } from './game/icons.js';
import { Counter, povOk } from './game/counter.js';
import { dishArt, dishArtAt, dishStage, faceArt, fx, hand, stationArt, basketArt, st, panArt, dishStepArt, trashArt, potArt } from './game/art.js';
import { POUR, BOWL, SCENE, ZONES, PAN_GAP, PAN_MAX1, PAN_ROW_GAP } from './data/counter-layout.js';
export { povOk };

const $ = (id) => document.getElementById(id);
/** Ảnh trạm nằm dưới, nội dung (nhãn, thanh thời gian) nằm trên. Dùng cả ở build() lẫn render(). */
/** Level này có chạy đúng công thức gốc không (không bớt bước nào)?
 *  So với `recipeFor(dish)` chưa đơn giản hoá — `D.recipes` là công thức gọn, so nhầm
 *  thì level nào cũng bị coi là đã bớt bước. */
const fullRecipe = (C, dish) => {
  const master = recipeFor(dish)?.assembly, lvl = C.recs?.[dish]?.assembly;
  return !!master && !!lvl && lvl.length === master.length && lvl.every((x, i) => x === master[i]);
};
const objImg = (n) => `<img class="pv-objimg" src="${st(n)}" alt="" draggable="false" onerror="this.remove()">`;
const img = (tok) => { const u = iconUrl(tok); return u ? `<img src="${u}" alt="" draggable="false">` : `<span class="emo">${D.items[tok]?.icon || '🍲'}</span>`; };
const src1 = (kind, tok, i) => `data-k="${kind}"${tok != null ? ` data-t="${tok}"` : ''}${i != null ? ` data-i="${i}"` : ''}`;
const bar = (left, total) => (left > 0 && total ? `<i class="pv-bar" style="--p:${(1 - left / total) * 100}%"></i>` : '');

export class Pov {
  /** @param {{dishes,weights,rounds,level?,arrivals?,simplify?,constraints?,goal?,moneyTargets?,events?,burners?,patience?,sfx,onDone,onQuit}} o */
  constructor(o) { this.o = o; this.el = $('pov'); }
  start() {
    const o = this.o;
    this.C = new Counter({
      dishes: o.dishes, rounds: o.rounds ?? 8, arrivals: o.arrivals, simplify: o.simplify, constraints: o.constraints,
      goal: o.goal, moneyTargets: o.moneyTargets, burners: o.burners ?? 1, seconds: o.seconds,
      patience: o.patience ?? 90, gap: o.gap ?? 16, weights: o.weights,
      ev: { onSfx: (k) => o.sfx?.[k]?.(), onMsg: (m, c) => this.msg(m, c), onEnd: (r) => this.finish(r),
        onServe: (t, r) => this.msg(`${t.name}: “${r.say}” · ${r.sec.toFixed(0)}s · ${r.quality === 100 ? 'hoàn hảo' : r.quality >= 60 ? 'được' : 'ẩu'}`, r.quality === 100 ? 'good' : 'mid'),
        onExpire: (t) => this.msg(`${t.name} bỏ đi — chờ lâu quá`, 'bad'), onSpoil: () => this.msg('Sợi để lâu bị hư — đem vứt', 'bad') },
    });
    if (!this.C.dishes.length) return o.onDone(this.C.result());
    this.build(); this.el.classList.remove('hidden'); this.C.spawn(); this.render(); this.loop();
  }
  stop() { cancelAnimationFrame(this._raf); this.el.classList.add('hidden'); this.el.onpointerdown = null; }
  finish(r) { this.stop(); this.o.onDone(r); }
  msg(t, cls = '') { const m = $('pvMsg'); if (!m) return; m.textContent = t; m.className = 'pv-msg ' + cls; if (cls === 'bad') { this.el.classList.add('shake'); setTimeout(() => this.el.classList.remove('shake'), 320); } }

  // ---------- dựng quầy ----------
  // Nền là MỘT TẤM VẼ LIỀN; mọi trạm là ô trong suốt đặt lên trên theo % (data/counter-layout.js).
  // Ảnh hỏng/chưa có thì `.pv-stage` mất class `scene` → quay về bố cục khung cũ, vẫn chơi được.
  build() {
    const C = this.C; const need = (st) => Object.values(C.recs).some((r) => r.transforms.some((t) => t.station === st));
    // "Mặt bếp" không phải ô riêng — vẫn là ô `burner`. Tuỳ món mà nó là nồi nước lèo
    // hay nồi/chảo nhỏ để hâm sốt vang / xào lăn (Kent 19/09).
    const soupHere = !!Object.keys(C.soups).length && !C.sim?.soupReady;
    this.has = { pot: need('pot'), sink: need('sink'), prep: need('prep'), fryer: need('fryer'), microwave: need('microwave'),
      stovetop: need('stovetop'), burner: soupHere || need('stovetop'), ready: !!Object.keys(C.soups).length };
    const z = (k) => { const b = ZONES[k]; return `left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%`; };
    // Khay là sprite nên có bao nhiêu món thì xếp bấy nhiêu khay, chia đều cả dải.
    // Trước đây bám theo khay vẽ trong tranh nên Hải Phòng (14 món / 9 khay) đồn 6 món lên một khay.
    // Quá PAN_MAX1 khay thì chia hai hàng: 14 món một hàng là mỗi khay 20px trên máy 412px,
    // ngón tay không bấm nổi. Hai hàng đưa lên 44px — đúng ngưỡng tối thiểu.
    const panList = C.panItems;   // nước cốt & nước trắng đã tách sang kệ nước / bồn
    const panRows = panList.length > PAN_MAX1 ? 2 : 1;
    const panPer = Math.ceil(panList.length / panRows);
    const panW = (100 - PAN_GAP * (panPer - 1)) / panPer;
    const rowH = (100 - PAN_ROW_GAP * (panRows - 1)) / panRows;
    const pan = (it, i) => {
      const r = Math.floor(i / panPer), c = i % panPer;
      const n = Math.min(panPer, panList.length - r * panPer);
      const off = (100 - (n * panW + PAN_GAP * (n - 1))) / 2;   // hàng cuối thiếu khay thì căn giữa
      const st = `left:${(off + c * (panW + PAN_GAP)).toFixed(3)}%;width:${panW.toFixed(3)}%`
        + `;top:${(r * (rowH + PAN_ROW_GAP)).toFixed(3)}%;height:${rowH.toFixed(3)}%`;
      return `<div class="pv-pan dragsrc" title="${label(it)}" style="${st}" ${src1('item', it)}><img class="pv-panimg" src="${panArt(it)}" alt="" draggable="false" onerror="this.closest('.pv-pan').classList.add('noart');this.remove()"><i class="pv-ghosticon">${img(it)}</i><small>${label(it)}</small></div>`;
    };
    // Đồ có sprite riêng thì vẽ to đầy ô; icon nhỏ giữ lại (ẩn) để làm cái bay theo ngón tay.
    const src = (it) => { const st = stationArt(it);
      return st
        ? `<div class="pv-obj dragsrc" ${src1('item', it)}><img class="pv-objimg" src="${st}" alt="" draggable="false" onerror="this.closest('.pv-obj').classList.add('noart');this.remove()"><i class="pv-ghosticon">${img(it)}</i><small>${label(it)}</small></div>`
        : `<div class="pv-src dragsrc" ${src1('item', it)}>${img(it)}<small>${label(it)}</small></div>`; };
    const zone = (k, inner, cls = '') => `<div class="pv-z ${cls}" style="${z(k)}">${inner}</div>`;
    const dropz = (k, name, inner, cls = '') => `<div class="pv-z drop ${cls}" data-zone="${name}" style="${z(k)}">${inner}</div>`;

    this.el.style.setProperty('--pv-bg', `url(${SCENE.src})`);   // nền ngoài khung = chính tranh, làm mờ
    this.el.innerHTML = `
      <div class="pv-stage scene" id="pvStage">
        <img class="pv-scene" src="${SCENE.src}" alt="" draggable="false"
             onerror="this.closest('.pv-stage').classList.remove('scene');this.remove()">
        <div class="pv-hud" style="${z('hudL')}"><span id="pvMoney">0k</span><i>tiền</i><b class="pv-streak" id="pvStreak"></b></div>
        <div class="pv-hud r" style="${z('hudR')}">
          <div class="pv-clock" id="pvClock"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.5"/><circle class="fg" cx="18" cy="18" r="15.5"/></svg><u id="pvTime">0</u></div>
          <span id="pvServed">0/${C.rounds}</span><i>tô</i>
          <button class="pv-x" id="pvQuit" aria-label="Thoát" title="Thoát">✕</button>
        </div>
        <div class="pv-rail" id="pvTickets" style="${z('rail')}"></div>
        ${this.has.pot ? dropz('pot', 'pot', '<div class="pv-baskets" id="pvBaskets"></div>', 'st-pot') : ''}
        ${this.has.pot ? zone('hot', '<div class="pv-hot" id="pvHot"></div>') : ''}
        ${this.has.sink || C.waterItems.length ? dropz('sink', 'sink', '<div class="pv-sinkin" id="pvSink"></div>', 'st-sink') : ''}
        ${this.has.burner || this.has.ready ? zone('burner', `<div class="pv-pots" id="pvPots"></div><div class="pv-ready" id="pvReady"></div>`
            + (this.has.stovetop ? `<div class="pv-stove drop" data-zone="burner" id="pvStove"></div>` : ''), 'st-burner') : ''}
        ${C.brothSrc.length + C.stockItems.length ? zone('broth',
            // J7 — nồi nước THẬT trên bếp, có khói. Vẫn là kind 'broth' / 'item' — chỉ đổi CHỖ VẼ, luật chơi y nguyên.
            // Thiếu sprite → .noart → quay về chip icon cũ.
            [...C.brothSrc.map((b) => ['broth', b]), ...C.stockItems.map((t) => ['item', t])].map(([kind, tok]) =>
              `<div class="pv-broth pv-potb dragsrc" title="${label(tok)}" ${src1(kind, tok)}>`
              + `<img class="pv-potimg" src="${potArt(tok)}" alt="" draggable="false" onerror="this.closest('.pv-broth').classList.add('noart');this.remove()">`
              + `<img class="pv-steam s1" src="${fx('steam')}" alt="" draggable="false" onerror="this.remove()"><img class="pv-steam s2" src="${fx('steam')}" alt="" draggable="false" onerror="this.remove()">`
              + `<i class="pv-ghosticon">${img(tok)}</i><small>${label(tok)}</small></div>`).join(''),
            'row pots') : ''}
        ${this.has.fryer ? dropz('fryer', 'fryer', `${objImg('fryer')}<div id="pvFryer"></div>`, 'st-fryer') : ''}
        ${this.has.microwave ? dropz('micro', 'microwave', `${objImg('microwave')}<div id="pvMw"></div>`, 'st-mw') : ''}
        ${zone('prep', `<div class="pv-pans${panRows > 1 ? ' two' : ''}" id="pvTops">${panList.map(pan).join('')}</div>`, 'shelf')}
        ${zone('stack', `<div class="pv-srcs">${C.bowlItems.map(src).join('')}</div>`, 'col')}
        ${zone('noodle', `<div class="pv-srcs">${C.noodleItems.map(src).join('')}</div>`, 'row')}
        ${this.has.prep ? zone('boards', '<div class="pv-boards" id="pvBoards"></div>', 'row') : ''}
        ${zone('slots', '<div class="pv-slots" id="pvSlots"></div>')}
        ${dropz('trash', 'trash', `<img class="pv-objimg" src="${trashArt()}" alt="" draggable="false" onerror="this.closest('.pv-z').classList.add('noart');this.remove()"><span class="pv-tr">🗑️</span>`, 'trash')}
      </div>
      <div class="pv-msg" id="pvMsg">Kéo hoặc chạm đôi: tô vô nồi để trụng · sợi vô rọ · topping vô tô · tô xong lên phiếu</div>`;
    // J8 — nhãn khay chỉ hiện ở level gợi ý (simplify / showLabels); level thật thì ẩn, sai 3 lần liên tiếp mới bật lại.
    this.el.classList.toggle('nolabels', !(C.sim || this.o.level?.showLabels));
    this._miss = 0;
    $('pvQuit').onclick = () => { this.stop(); this.o.onQuit?.(); };
    this.bind();
  }

  // ---------- vẽ phần động ----------
  render() {
    const C = this.C;
    const mo = $('pvMoney'); if (mo) mo.textContent = `${Math.round(C.money)}k`;
    const sv = $('pvServed'); if (sv) sv.textContent = `${C.results.length - C.left}/${C.rounds}`;
    this.hud();
    this.renderTickets();
    // Rổ đang xả / đã xả thì đứng ở BỒN chứ không còn trong nồi (Kent 18/09).
    const atSink = (b) => !!b && (b.state === 'rinsing' || b.state === 'rinsed');
    if (this.has.pot) $('pvBaskets').innerHTML = C.baskets.map((b0, i) => {
      const b = atSink(b0) ? null : b0;
      // Rổ là object riêng (docs/ART-PIPELINE.md §9): rỗng vẫn vẽ cái rổ, có sợi thì đổi ảnh.
      const rk = (full) => `<img class="pv-objimg" src="${basketArt(full)}" alt="" draggable="false" onerror="this.closest('.pv-basket')?.classList.add('noart');this.remove()">`;
      if (!b) return `<div class="pv-basket ${atSink(b0) ? 'away' : 'drop'}" data-zone="pot" data-i="${i}">${rk(false)}</div>`;
      const busy = b.left > 0; const st = b.spoiled ? 'hư — vứt đi' : busy ? '…' : b.state === 'hot' ? 'nóng' : b.state === 'rinsed' ? 'đã xả lạnh' : b.state === 'hot2' ? 'nóng lại' : 'xong';
      return `<div class="pv-basket drop ${b.spoiled ? 'bad' : b.state}" data-zone="pot" data-i="${i}"><div class="pv-rk ${busy ? '' : 'dragsrc'}" ${src1('basket', null, i)}>${rk(true)}<i class="pv-ghosticon">${img(b.input)}</i><small>${st}</small>${bar(b.left, b.total)}</div></div>`;
    }).join('');
    if (this.has.pot) $('pvHot').innerHTML = C.hot.length ? C.hot.map((h, i) => `<div class="pv-hb ${h.left > 0 ? '' : 'dragsrc'}" ${src1('hotbowl', null, i)}>${img(h.input)}<small>${h.left > 0 ? '…' : 'nóng'}</small>${bar(h.left, h.total)}</div>`).join('') : '<small class="hint">tô nóng trữ ở đây</small>';
    if (this.has.sink || C.waterItems.length) {
      const jobHtml = C.sinkJob ? `<div class="pv-job ${C.sinkJob.left > 0 ? '' : 'dragsrc'}" ${src1('sink')}>${img(C.sinkJob.input)}<small>${C.sinkJob.left > 0 ? C.sinkJob.name : 'xong'}</small>${bar(C.sinkJob.left, C.sinkJob.total)}</div>` : '';
      // Rổ xả lạnh hiện ở đây, kèm vòi nước đang chảy khi còn xả.
      const rinse = C.baskets.map((b, i) => {
        if (!atSink(b)) return '';
        const busy = b.left > 0;
        return `<div class="pv-rinse ${busy ? 'wet' : 'done'}">
          <img class="pv-objimg" src="${basketArt(true)}" alt="" draggable="false" onerror="this.remove()">
          ${busy ? `<img class="pv-water" src="${fx('splash-water')}" alt="" draggable="false" onerror="this.remove()">` : ''}
          <div class="pv-rk ${busy ? '' : 'dragsrc'}" ${src1('basket', null, i)}><i class="pv-ghosticon">${img(b.input)}</i><small>${busy ? 'đang xả lạnh' : 'đã xả lạnh'}</small>${bar(b.left, b.total)}</div>
        </div>`;
      }).join('');
      // Vòi nước: miếng nước trắng hứng ở đây rồi đem vô nồi, không phải lấy trên khay.
      const tap = C.waterItems.map((t) => `<div class="pv-tap dragsrc" title="${label(t)}" ${src1('item', t)}>${img(t)}<small>${label(t)}</small></div>`).join('');
      $('pvSink').innerHTML = tap + rinse + jobHtml;
    }
    if (this.has.stovetop && $('pvStove')) {
      const j = C.stovetop;
      const gathering = j && j.left === null;
      $('pvStove').innerHTML = j
        ? `<div class="pv-job ${j.left != null && j.left <= 0 ? 'dragsrc' : ''}" ${src1('stovetop')}>${img(j.input)}<small>${
            gathering ? 'thiếu ' + j.tf.inputs.filter((_, i) => !j.have[i]).map(label).join(', ') : j.left > 0 ? j.name : 'xong'
          }</small>${gathering ? '' : bar(j.left, j.total)}</div>`
        : '<small class="hint">nồi/chảo nhỏ</small>';
    }
    for (const [k, id] of [['fryer', 'pvFryer'], ['microwave', 'pvMw']]) { if (!this.has[k]) continue; const j = C[k];
      $(id).innerHTML = j ? `<div class="pv-job ${j.left > 0 ? '' : 'dragsrc'}" ${src1(k)}>${img(j.input)}<small>${j.left > 0 ? j.name : 'xong'}</small>${bar(j.left, j.total)}</div>` : '<small class="hint">trống</small>'; }
    if (this.has.ready) {
      $('pvPots').innerHTML = C.burner.pots.map((p, i) => {
        if (!p) return `<div class="pv-pt drop" data-zone="burner" data-i="${i}">${objImg('soup-pot')}<small class="hint">nồi trống</small></div>`;
        const done = p.left === 0; return `<div class="pv-pt drop ${done ? 'done' : ''}" data-zone="burner" data-i="${i}">${objImg('soup-pot')}<div class="${done ? 'dragsrc' : ''}" ${src1('burnerpot', null, i)}><b>${p.name}</b><small>${p.left === null ? p.items.map(label).join(' → ') : done ? 'xong — múc ra' : 'đang đun…'}</small>${bar(p.left, p.total)}</div></div>`;
      }).join('');
      $('pvReady').innerHTML = C.burner.ready.length ? C.burner.ready.map((r, i) => `<div class="pv-rd dragsrc" ${src1('ready', null, i)}>${img(r.output)}<small>${r.name}</small></div>`).join('') : '<small class="hint">kệ nước</small>';
    }
    if (this.has.prep) $('pvBoards').innerHTML = C.boards.map((b, i) => {
      if (!b) return `<div class="pv-board drop" data-zone="prep" data-i="${i}"><small class="hint">thớt ${i + 1}</small></div>`;
      const done = b.left === 0; return `<div class="pv-board drop ${done ? 'done' : ''}" data-zone="prep" data-i="${i}"><div class="${done ? 'dragsrc' : ''}" ${src1('board', null, i)}>${done ? img(b.output) : b.have.filter(Boolean).map(img).join('')}<small>${b.left === null ? `thiếu ${b.tf.inputs.filter((_, k) => !b.have[k]).map(label).join(', ')}` : done ? label(b.output) : b.name + '…'}</small>${bar(b.left, b.total)}</div></div>`;
    }).join('');
    $('pvSlots').innerHTML = C.slots.map((b, i) => {
      if (!b) return `<div class="pv-slot drop" data-zone="slot" data-i="${i}"></div>`;   // ô trống: để tranh sạch, tấm lót đã vẽ trong nền (J2)
      const fit = C.fits(b.placed); const full = fit.some((t) => t.steps.length === b.placed.length);
      // Một ảnh liền lạc cho cả cái tô — không đè icon rời lên nữa.
      // Còn nhiều món khớp thì lấy món đầu: cùng bậc này chúng nhìn như nhau.
      const only = fit[0]?.dish || null;
      // Level chạy đúng công thức gốc thì vẽ tô theo TỪNG món đã bỏ vào;
      // level đã đơn giản hoá thì số bước lệch, vẽ theo là hiện cả món chưa dạy → lùi về thang 4 bậc.
      const art = only
        ? ((fullRecipe(C, only) && dishStepArt(only, b.placed.length)) || dishArtAt(only, dishStage(b.placed, full)))
        : null;
      const inner = art
        ? `<img class="pv-art" src="${art}" alt="" draggable="false" onerror="this.remove()">`
        : `${img(b.placed[0].replace(/^bowl-hot:/, ''))}${b.placed.slice(1).map((t, k) => `<i class="lay" style="--k:${k}">${img(t)}</i>`).join('')}`;
      return `<div class="pv-slot drop has" data-zone="slot" data-i="${i}"><div class="pv-bowl dragsrc${full ? ' full' : ''}" ${src1('madebowl', null, i)}>${inner}</div><small>${full ? 'Xong — lên phiếu' : `${b.placed.length}/${(fit[0]?.steps.length) || '?'} bước`}</small></div>`;
    }).join('');
  }

  /** Sau mỗi thao tác đúng: chan nước thì chạy A10 (docs/ART-PIPELINE.md §2·§6). */
  afterDrop(res, src, zone, from) {
    if (!res?.ok) {                                    // J8: sai thứ tự 3 lần liên tiếp → bật nhãn lại tới hết level
      if (zone?.kind === 'slot' && ++this._miss >= 3) this.el.classList.remove('nolabels');
      return;
    }
    this._miss = 0;
    if (zone?.kind === 'trash') return this.toss();
    this.bump(zone);                 // trước đây chỉ đường kéo mới bump, chạm đôi thì không
    this.react(src, zone, from);     // J5 — vật nhận nảy theo kiểu riêng
    if (zone?.kind !== 'slot') return;
    const isBroth = ['broth', 'ready', 'burnerpot'].includes(src?.kind);
    if (!isBroth) return;
    const slot = this.el.querySelector(`.pv-slot[data-i="${zone.i}"]`);
    if (slot) this.pour(slot);
  }
  /** J4 — bưng tô lên phiếu: tô bay → đóng dấu ✓ → mặt khách nở → phiếu trượt đi (0,85 giây).
   *  render() dựng lại DOM mỗi khung hình nên MỌI thứ ở đây là bản sao gắn vào #pov,
   *  và toạ độ phải đo NGAY lúc bắt đầu chứ không giữ tham chiếu phần tử (docs/PLAN-JUICE.md J4). */
  serveFx(t, src) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const tk = this.el.querySelector(`.tk[data-i="${t.id}"]`); if (!tk) return;
    const tr = tk.getBoundingClientRect();
    const cx = tr.left + tr.width / 2, cy = tr.top + tr.height / 2;

    // 1. tô bay lên phiếu (0–280 ms)
    const bowl = this.el.querySelector(`.pv-slot[data-i="${src?.i}"] .pv-bowl`) || this.el.querySelector('.pv-bowl');
    if (bowl) {
      const br = bowl.getBoundingClientRect();
      const g = bowl.cloneNode(true); g.className = 'pv-fx pv-serve';
      g.style.cssText = `left:${br.left}px;top:${br.top}px;width:${br.width}px;height:${br.height}px`;
      this.el.appendChild(g);
      g.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${cx - br.left - br.width / 2}px,${cy - br.top - br.height / 2}px) scale(.55)`, opacity: .7 }],
        { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }).onfinish = () => g.remove();
      setTimeout(() => g.remove(), 380);   // onfinish KHÔNG chạy khi tab bị nén khung hình — dọn bằng hẹn giờ
    }
    setTimeout(() => this.C.ev?.onSfx?.('serve'), 200);

    // 2. bản sao phiếu ở lại để đóng dấu rồi trượt đi
    const gh = tk.cloneNode(true); gh.className = 'tk pv-tkghost';
    gh.style.cssText = `left:${tr.left}px;top:${tr.top}px;width:${tr.width}px;height:${tr.height}px`;
    this.el.appendChild(gh);

    setTimeout(() => {
      const st = document.createElement('img'); st.className = 'pv-fx pv-stamp'; st.src = fx('stamp');
      st.draggable = false; st.onerror = () => st.remove();
      // dấu cao ~0,8 chiều cao phiếu: đo lần đầu để 0.9*rộng → con dấu 65px trên phiếu 41px, to hơn cả phiếu
      st.style.cssText = `left:${tr.right - tr.width * 0.15}px;top:${tr.top + tr.height * 0.1}px;width:${(tr.height * 0.8).toFixed(0)}px`;
      this.el.appendChild(st);
      st.animate([{ transform: 'translate(-50%,-10%) rotate(-8deg) scale(1.6)', opacity: 0 },
        { transform: 'translate(-50%,-10%) rotate(-8deg) scale(1)', opacity: 1 }],
        { duration: 220, easing: 'cubic-bezier(.3,1.5,.5,1)', fill: 'forwards' });
      setTimeout(() => st.remove(), 600);
      const f = gh.querySelector('.tk-face');
      f?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)', offset: .5 }, { transform: 'scale(1)' }], { duration: 300 });
      if (!t.mistakes) for (const k of [-1, 1]) {           // tô không lỗi: hai ngôi sao bay lên
        const sp = document.createElement('img'); sp.className = 'pv-fx pv-star'; sp.src = fx('sparkle');
        sp.draggable = false; sp.onerror = () => sp.remove();
        sp.style.cssText = `left:${cx + k * tr.width * 0.22}px;top:${tr.top}px;width:${(tr.height * 0.5).toFixed(0)}px`;
        this.el.appendChild(sp);
        sp.animate([{ opacity: 0, transform: 'translate(-50%,0) scale(.6)' },
          { opacity: 1, transform: `translate(-50%,-${tr.height * 0.5}px) scale(1)`, offset: .4 },
          { opacity: 0, transform: `translate(-50%,-${tr.height * 1.1}px) scale(1.1)` }],
          { duration: 520, easing: 'ease-out', delay: k > 0 ? 90 : 0 }).onfinish = () => sp.remove();
        setTimeout(() => sp.remove(), 700);
      }
    }, 280);

    setTimeout(() => {
      gh.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(-120%)', opacity: 0 }],
        { duration: 250, easing: 'ease-in', fill: 'forwards' });
      setTimeout(() => gh.remove(), 280);
    }, 600);
  }

  /** J5 — bảng phản ứng theo loại đích (docs/PLAN-JUICE.md J5). Chỉ gọi khi thả ĐÚNG.
   *  Phải tìm lại phần tử SAU render() — tham chiếu cũ đã rụng. `from` = điểm nhả + icon (đường kéo),
   *  null khi chạm đôi (ghost đã bay tới đích rồi, bay thêm lần nữa là thừa). */
  react(src, zone, from) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const q = (s) => this.el.querySelector(s);
    const anim = (el, kf, ms, easing = 'ease-out') => { if (el) el.animate(kf, { duration: ms, easing }); };
    const sink = (el) => anim(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(6%)', offset: .5 }, { transform: 'translateY(0)' }], 180);
    const mid = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
    switch (zone.kind) {
      case 'pot': {
        const b = q(`.pv-basket[data-i="${zone.i}"]`) || q('.pv-z.st-pot'); if (!b) return;
        sink(b); const m = mid(b);
        this.spawnFx('splash-water', m.x, m.y - m.h * 0.15, Math.max(30, m.w * 1.1), 400, 'rise'); break; }
      case 'sink': {
        const tap = q('.pv-tap'); anim(tap, [{ transform: 'rotate(0)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], 220);
        const z = q('.pv-z.st-sink'); if (!z) return; const m = mid(z);
        this.spawnFx('splash-water', m.x, m.y - m.h * 0.1, Math.max(30, m.w * 0.6), 400, 'rise'); break; }
      case 'slot': {
        const bowl = q(`.pv-slot[data-i="${zone.i}"] .pv-bowl`); if (!bowl) return;
        const pulse = () => anim(bowl, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: .45 }, { transform: 'scale(1)' }], 180);
        if (from?.icon) this.flyItem(from, bowl.getBoundingClientRect(), from.icon, 200, pulse); else pulse();
        break; }
      case 'prep': {
        const b = q(`.pv-board[data-i="${zone.i}"]`) || q('.pv-boards'); if (!b) return;
        anim(b, [{ transform: 'translateY(0)' }, { transform: 'translateY(-4%)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-4%)' }, { transform: 'translateY(0)' }], 260, 'linear');
        const m = mid(b); this.spawnFx('chop', m.x, m.y - m.h * 0.2, Math.max(26, m.w * 0.7), 320, 'pop'); break; }
      case 'burner': {
        if (zone.i == null) {                                   // mặt bếp (#pvStove không có data-i)
          const s = q('#pvStove .pv-job') || q('#pvStove'); if (!s) return;
          anim(s, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .4 }, { transform: 'scale(1)' }], 200);
          const m = mid(s); this.spawnFx('sizzle', m.x, m.y - m.h * 0.3, Math.max(28, m.w * 0.8), 360, 'rise');
        } else {                                                // nồi nước lèo
          const pt = q(`.pv-pt[data-i="${zone.i}"]`); if (!pt) return;
          sink(pt); const m = mid(pt);
          this.spawnFx('steam', m.x, m.y - m.h * 0.35, Math.max(30, m.w * 0.9), 450, 'rise');
        }
        break; }
      case 'fryer': case 'microwave': {
        const z = q(`.drop[data-zone="${zone.kind}"]`); if (!z) return;
        anim(z, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)', offset: .4 }, { transform: 'scale(1)' }], 200);
        const m = mid(z); this.spawnFx(zone.kind === 'fryer' ? 'sizzle' : 'steam', m.x, m.y - m.h * 0.3, Math.max(28, m.w * 0.8), 380, 'rise');
        break; }
      default: break;   // ticket → J4 serveFx; trash → toss()
    }
  }
  /** Một tấm fx bung lên rồi tắt. Giới hạn 6 phần tử fx cùng lúc — thả liên tiếp không được chất đống. */
  spawnFx(name, cx, cy, w, ms, kind = 'rise') {
    if (this.el.querySelectorAll('.pv-fx').length >= 6) return null;
    const p = document.createElement('img'); p.className = 'pv-fx pv-burst'; p.src = fx(name); p.draggable = false;
    p.onerror = () => p.remove();
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${w.toFixed(0)}px`;
    this.el.appendChild(p);
    const kf = kind === 'pop'
      ? [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.5)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.05)', offset: .3 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1)' }]
      : [{ opacity: 0, transform: 'translate(-50%,-30%) scale(.7)' }, { opacity: .95, transform: 'translate(-50%,-60%) scale(1)', offset: .35 }, { opacity: 0, transform: 'translate(-50%,-95%) scale(1.08)' }];
    p.animate(kf, { duration: ms, easing: 'ease-out' }).onfinish = () => p.remove();
    setTimeout(() => p.remove(), ms + 80);   // onfinish không chạy khi khung hình bị nén
    return p;
  }
  /** Icon bay theo CUNG từ điểm nhả tới tâm đích (điểm giữa cao hơn 18 % quãng đường). */
  flyItem(from, to, src, ms = 200, done) {
    const img = document.createElement('img'); img.className = 'pv-fx pv-fly'; img.src = src; img.draggable = false;
    img.onerror = () => img.remove();
    const tx = to.left + to.width / 2, ty = to.top + to.height / 2;
    const sz = Math.max(24, Math.min(48, to.width * 0.5));
    img.style.cssText = `left:${from.x}px;top:${from.y}px;width:${sz}px;height:${sz}px`;
    this.el.appendChild(img);
    const dx = tx - from.x, dy = ty - from.y, lift = Math.hypot(dx, dy) * 0.18;
    img.animate([
      { transform: 'translate(-50%,-50%) scale(.9)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(dx / 2).toFixed(1)}px), calc(-50% + ${(dy / 2 - lift).toFixed(1)}px)) scale(.8)`, offset: .5 },
      { transform: `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(.6)`, opacity: .8 },
    ], { duration: ms, easing: 'cubic-bezier(.3,.6,.4,1)' });
    setTimeout(() => { img.remove(); done?.(); }, ms);
  }

  /** J8 — tooltip tên món nổi trên khay 1,2 s. Phần tử riêng trong #pov (render() dựng lại khay). */
  tip(el) {
    const name = el.title || label(this.srcOf(el)?.t || ''); if (!name) return;
    this.el.querySelectorAll('.pv-tip').forEach((x) => x.remove());
    const r = el.getBoundingClientRect(), s = document.createElement('div');
    s.className = 'pv-tip'; s.textContent = name;
    s.style.left = `${r.left + r.width / 2}px`; s.style.top = `${r.top}px`;
    this.el.appendChild(s); this.C.ev?.onSfx?.('tap');
    setTimeout(() => s.remove(), 1200);
  }

  /** Vứt rác: thùng rác giật một cái + bụi bay lên. */
  toss() {
    const z = this.el.querySelector('.pv-z.trash'); if (!z) return;
    z.classList.add('tossing');
    setTimeout(() => z.classList.remove('tossing'), 460);
    const r = z.getBoundingClientRect();
    const p = document.createElement('img');
    p.className = 'pv-fx pv-toss'; p.src = fx('sparkle'); p.draggable = false;
    p.onerror = () => p.remove();
    document.body.appendChild(p);
    p.style.left = `${r.left + r.width / 2}px`; p.style.top = `${r.top + r.height * 0.15}px`;
    p.style.width = `${Math.max(22, r.width * 0.8)}px`;
    p.animate([
      { opacity: 0, transform: 'translate(-50%,-40%) scale(.6)' },
      { opacity: .9, transform: 'translate(-50%,-70%) scale(1)', offset: .35 },
      { opacity: 0, transform: 'translate(-50%,-100%) scale(1.05)' },
    ], { duration: 520, easing: 'linear' }).onfinish = () => p.remove();
    setTimeout(() => p.remove(), 700);   // cùng bẫy: onfinish không chạy khi khung hình bị nén
    this.C.ev?.onSfx?.('mistake');
  }
  /** A10 — tay cầm vá trượt vào, nghiêng, dòng nước chảy xuống mặt nước trong tô rồi rút ra. */
  pour(slotEl) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const st = this.el.getBoundingClientRect(); const b = slotEl.getBoundingClientRect();
    const cx = b.left - st.left + b.width / 2;
    const rim = b.top - st.top + b.height * BOWL.rim;
    const surf = b.top - st.top + b.height * BOWL.surface;
    const D = POUR.duration, T = POUR.tilt;
    const mk = (cls, src) => { const e = document.createElement('div'); e.className = cls;
      e.innerHTML = `<img src="${src}" alt="" draggable="false" onerror="this.closest('.pv-fx').remove()">`;
      this.el.appendChild(e); return e; };
    const h = mk('pv-fx pv-hand', hand('ladle-d'));
    const w = Math.min(st.width * 0.62, 260); h.style.width = w + 'px';
    const hx = cx - w * 0.75, hy = rim - w * 0.92;
    h.animate([
      { transform: `translate(${hx}px, ${st.height}px) rotate(0deg)`, offset: 0, easing: 'cubic-bezier(.22,.9,.3,1)' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T * 0.65}deg)`, offset: POUR.t.rise, easing: 'ease-out' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T}deg)`, offset: POUR.t.tilted, easing: 'linear' },
      { transform: `translate(${hx}px, ${hy}px) rotate(${T}deg)`, offset: POUR.t.holdEnd, easing: 'cubic-bezier(.5,0,.75,.45)' },
      { transform: `translate(${hx}px, ${st.height}px) rotate(0deg)`, offset: 1 },
    ], { duration: D, easing: 'linear' }).onfinish = () => h.remove();

    const y0 = rim - b.height * BOWL.underLadle;
    const sm = mk('pv-fx pv-stream', fx('stream'));
    sm.style.left = cx + 'px'; sm.style.top = y0 + 'px';
    sm.style.width = Math.max(10, b.width * 0.13) + 'px'; sm.style.height = Math.max(10, surf - y0) + 'px';
    sm.animate([
      { opacity: 0, transform: 'translateX(-50%) scaleY(0)' },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: .2 },
      { opacity: 1, transform: 'translateX(-50%) scaleY(1)', offset: .82 },
      { opacity: 0, transform: 'translateX(-50%) scaleY(1)' },
    ], { duration: D * POUR.t.streamLen, delay: D * POUR.t.streamIn, easing: 'linear' }).onfinish = () => sm.remove();

    const sp = mk('pv-fx pv-splash', fx('splash'));
    sp.style.left = cx + 'px'; sp.style.top = surf + 'px'; sp.style.width = b.width * 0.24 + 'px';
    sp.animate([
      { opacity: 0, transform: 'translate(-50%,-60%) scale(.6)' },
      { opacity: .95, transform: 'translate(-50%,-60%) scale(1)', offset: .3 },
      { opacity: 0, transform: 'translate(-50%,-60%) scale(.9)' },
    ], { duration: D * POUR.t.splashLen, delay: D * POUR.t.splashIn, easing: 'linear' }).onfinish = () => sp.remove();
  }

  // ---------- kéo thả + chạm đôi ----------
  srcOf(el) { return { kind: el.dataset.k, tok: el.dataset.t, i: el.dataset.i != null ? Number(el.dataset.i) : undefined }; }
  zoneOf(el) { return { kind: el.dataset.zone, i: el.dataset.i != null ? Number(el.dataset.i) : undefined, id: el.dataset.zone === 'ticket' ? Number(el.dataset.i) : undefined }; }
  bind() {
    const root = this.el; let drag = null;

    // Bán kính "hít": thả hụt trong khoảng này vẫn tính là trúng ô gần nhất.
    // Ngón tay to hơn con trỏ nhiều — không hít thì ô nhỏ (rổ, khay) gần như không thả trúng.
    const SNAP = 34;

    const measure = () => [...root.querySelectorAll('.drop')].map((z) => ({ el: z, r: z.getBoundingClientRect() }));

    /** Ô nhận ở toạ độ này: ưu tiên ô đang nằm trong, không có thì ô gần nhất trong SNAP. */
    const hitAt = (x, y, zones) => {
      const on = document.elementsFromPoint(x, y).find((z) => z.classList?.contains('drop'));
      if (on) return on;
      let best = null, bd = SNAP * SNAP;
      for (const z of zones) {
        const r = z.r;
        const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = z.el; }
      }
      return best;
    };

    root.onpointerdown = (e) => {
      const el = e.target.closest('.dragsrc'); if (!el || this.C.over) return; e.preventDefault(); root.setPointerCapture?.(e.pointerId);
      const key = el.dataset.k + ':' + (el.dataset.t || el.dataset.i); const now = performance.now();
      if (this._tap && this._tap.key === key && now - this._tap.t < 340) { this._tap = null; return this.auto(el); }
      this._tap = { key, t: now };
      const ghost = document.createElement('div'); ghost.className = 'pv-ghost'; ghost.innerHTML = (el.querySelector('.pv-ghosticon img,.pv-ghosticon .emo') || el.querySelector('img,.emo'))?.outerHTML || '•'; document.body.appendChild(ghost);
      const hl = document.createElement('div'); hl.className = 'pv-hl'; document.body.appendChild(hl);
      drag = { el, ghost, hl, zones: measure(), x0: e.clientX, y0: e.clientY,
               px: e.clientX, tx: -1e9, ty: -1e9, tt: 0, tilt: 0, zone: null, moved: false };
      el.classList.add('lift');
      root.classList.add('dragging');   // đang kéo mới hiện viền chỗ thả (CSS), lúc thường để tranh sạch
      ghost.style.transform = `translate(${e.clientX - 28}px, ${e.clientY - 28}px)`;
      // J8 — chạm giữ ≥ 350 ms không kéo → tooltip tên món (nhãn khay ẩn mặc định)
      if (el.classList.contains('pv-pan')) drag.hold = setTimeout(() => { if (drag && !drag.moved) this.tip(el); }, 350);
    };
    // Bóng kéo bám con trỏ NGAY trong pointermove: đặt transform là việc rẻ, không đọc layout,
    // và không phụ thuộc rAF — tab bị hãm nhịp thì bóng vẫn theo tay. Chỗ nặng là dò ô
    // (đo lại toàn bộ + elementsFromPoint) nên chỗ đó mới chặn lại, nhiều nhất ~60 lần/giây.
    root.onpointermove = (e) => {
      if (!drag) return;
      const x = e.clientX, y = e.clientY;
      if (!drag.moved && Math.hypot(x - drag.x0, y - drag.y0) > 8) { drag.moved = true; clearTimeout(drag.hold); }
      const vx = Math.max(-14, Math.min(14, (x - drag.px) * 1.4));
      drag.tilt += (vx - drag.tilt) * 0.25;   // nghiêng theo đà tay, cho có sức nặng
      drag.px = x;
      drag.ghost.style.transform =
        `translate(${x - 28}px, ${y - 28}px) rotate(${drag.tilt.toFixed(2)}deg) scale(${drag.zone ? 1.14 : 1})`;

      const t = e.timeStamp || performance.now();
      if (t - drag.tt < 16 || Math.abs(x - drag.tx) + Math.abs(y - drag.ty) < 3) return;
      drag.tt = t; drag.tx = x; drag.ty = y;
      // Đo lại mỗi lần dò: đồng hồ của game có render() GIỮA LÚC ĐANG KÉO, phần tử cũ bị thay.
      drag.zones = measure();
      const z = hitAt(x, y, drag.zones);
      if (z !== drag.zone) {
        drag.zone = z;
        if (z) this.C.ev?.onSfx?.('tap');   // tách nhẹ khi hít vào ô — ngón che mất viền thì còn nghe
      }
      // Viền sáng là MỘT khối riêng nằm ngoài cây DOM của quầy, không phải class trên ô.
      // Quầy render lại liên tục — gắn class lên ô thì viền bị xoá ngay, người chơi không kịp thấy.
      if (z) { const r = z.getBoundingClientRect(), st = drag.hl.style;
        st.left = `${r.left}px`; st.top = `${r.top}px`; st.width = `${r.width}px`; st.height = `${r.height}px`;
        drag.hl.classList.add('on'); }
      else drag.hl.classList.remove('on');
    };
    const end = (e) => {
      if (!drag) return; const d = drag; drag = null; clearTimeout(d.hold);
      d.hl.remove(); d.el.classList.remove('lift');
      root.classList.remove('dragging'); root.querySelectorAll('.drop.over').forEach((z) => z.classList.remove('over'));
      // Dò lại ngay tại điểm nhả: lúc kéo chỉ dò mỗi 3px nên cú vẩy nhanh có thể còn ô cũ.
      const zone = d.moved ? hitAt(e.clientX, e.clientY, measure()) : null;
      if (!zone) return this.flyBack(d.ghost, d.el);
      const r = zone.getBoundingClientRect();
      d.ghost.style.transition = 'transform .13s cubic-bezier(.3,.8,.35,1)';
      d.ghost.style.transform = `translate(${r.left + r.width / 2 - 28}px, ${r.top + r.height / 2 - 28}px) scale(.8)`;
      setTimeout(() => d.ghost.remove(), 150);
      const sc = this.srcOf(d.el), zn = this.zoneOf(zone);
      const res = this.C.drop(sc, zn);
      if (res?.ok && res.served) this.serveFx(res.served, sc);   // J4 — phải chạy TRƯỚC render(), lúc phiếu & tô còn trong DOM
      this.render();
      const ic = d.el.querySelector('.pv-ghosticon img, img')?.src;
      this.afterDrop(res, sc, zn, { x: e.clientX, y: e.clientY, icon: ic });
    };
    root.onpointerup = end; root.onpointercancel = end;
  }
  /** Thả trật: bóng kéo bay về chỗ cũ rồi tan — cho biết là hụt, không phải app đứng. */
  flyBack(ghost, el) {
    const a = el.getBoundingClientRect();
    ghost.style.transition = 'transform .19s cubic-bezier(.4,0,.6,1), opacity .19s linear';
    ghost.style.transform = `translate(${a.left + a.width / 2 - 28}px, ${a.top + a.height / 2 - 28}px) scale(.55)`;
    ghost.style.opacity = '0';
    setTimeout(() => ghost.remove(), 210);
  }
  /** Ô vừa nhận nảy một cái. Phải tìm lại phần tử vì render() đã thay DOM. */
  bump(zn) {
    const sel = zn.kind === 'ticket' ? `.tk[data-i="${zn.id}"]`
      : `.drop[data-zone="${zn.kind}"]${zn.i != null ? `[data-i="${zn.i}"]` : ''}`;
    const z = this.el.querySelector(sel) || this.el.querySelector(`.drop[data-zone="${zn.kind}"]`);
    if (!z) return;
    z.classList.add('hit');
    setTimeout(() => z.classList.remove('hit'), 340);
  }
  /** Chạm đôi: tìm đích hợp lý rồi bay tới. */
  auto(el) {
    const src = this.srcOf(el); const zone = this.autoZone(src); if (!zone) { this.msg(this.whyNoZone(src), 'bad'); return; }
    const sel = zone.kind === 'ticket' ? `.tk[data-i="${zone.id}"]` : `.drop[data-zone="${zone.kind}"]${zone.i != null ? `[data-i="${zone.i}"]` : ''}`;
    const dst = this.el.querySelector(sel) || this.el.querySelector(`.drop[data-zone="${zone.kind}"]`);
    const go = () => { const r = this.C.drop(src, zone); if (r?.ok && r.served) this.serveFx(r.served, src); this.render(); this.afterDrop(r, src, zone, null); };
    if (!dst) return go();
    const a = el.getBoundingClientRect(), b = dst.getBoundingClientRect();
    const g = document.createElement('div'); g.className = 'pv-ghost fly'; g.innerHTML = (el.querySelector('.pv-ghosticon img,.pv-ghosticon .emo') || el.querySelector('img,.emo'))?.outerHTML || '•'; document.body.appendChild(g);
    g.style.transform = `translate(${a.left + a.width / 2 - 28}px, ${a.top + a.height / 2 - 28}px)`; dst.classList.add('over');
    requestAnimationFrame(() => { g.style.transition = 'transform .2s cubic-bezier(.3,.7,.3,1)'; g.style.transform = `translate(${b.left + b.width / 2 - 28}px, ${b.top + b.height / 2 - 28}px) scale(.85)`; });
    setTimeout(() => { g.remove(); dst.classList.remove('over'); go(); }, 210);
  }
  /** Vì sao chạm đôi không biết đem đi đâu — nói cho người chơi thứ họ cần làm trước. */
  whyNoZone(src) {
    const C = this.C; const tok = C.token(src);
    if (tok == null) return 'Chưa xong — chờ chút';
    if (!C.slots.some(Boolean)) return 'Chưa có tô nào trên thớt — lấy tô (mẹt/dĩa) ra trước';
    const t = C.tickets[0]; const b = C.slots.find(Boolean);
    const want = b ? [...new Set(C.fits(b.placed).map((x) => x.steps[b.placed.length]).filter(Boolean))] : [];
    return want.length ? `Chưa cần ${label(tok)} — kế tiếp: ${want.map(label).join(' / ')}` : `Chưa biết đem ${label(tok)} đi đâu — thử kéo tay`;
  }
  autoZone(src) {
    const C = this.C; const tok = C.token(src); if (tok == null) return null;
    if (src.kind === 'madebowl') { const b = C.slots[src.i]; const t = C.tickets.find((x) => x.steps.length === b.placed.length && x.steps.every((s, k) => s === b.placed[k])); return t ? { kind: 'ticket', id: t.id } : null; }
    if (src.kind === 'basket' && C.baskets[src.i]?.spoiled) return { kind: 'trash' };
    // 1) tô đang cần đúng thứ này
    const si = C.slots.findIndex((b) => b && C.fits([...b.placed, tok]).length);
    if (si >= 0) return { kind: 'slot', i: si };
    // 2) mở tô mới ở chỗ trống (tô nóng / mẹt / dĩa)
    if (C.fits([tok]).length) { const e = C.slots.findIndex((b) => !b); if (e >= 0) return { kind: 'slot', i: e }; }
    // 3) trạm nào nhận thứ này
    for (const st of ['sink', 'pot', 'fryer', 'microwave']) if (C.transformAt(st, tok)) return { kind: st };
    if (C.transformsAt('prep').some((t) => t.inputs.some((r) => tokenMatches(r, tok)))) return { kind: 'prep' };
    if (this.has.burner && C.soupItems.includes(tok)) { let i = C.burner.pots.findIndex((p) => p && p.left === null); if (i < 0) i = C.burner.pots.findIndex((p) => !p); return i >= 0 ? { kind: 'burner', i } : null; }
    return null;
  }
  /** J6 — phiếu khách: thẻ giấy kẹp trên dây, mặt to, tên món to, hàng icon nguyên liệu (chỉ level gợi ý).
   *  Dựng lại DOM CHỈ KHI bộ phiếu / số bước đã vào tô đổi — dựng mỗi khung hình thì
   *  animation "thẻ mới trượt xuống" bị khởi động lại liên tục. Thanh kiên nhẫn cập nhật riêng mỗi khung. */
  renderTickets() {
    const C = this.C, el = $('pvTickets'); if (!el) return;
    const hint = !!C.sim || this.o.level?.hintIcons === true;        // level đủ bước thật thì ẩn — mục tiêu là THUỘC
    // tô đang ráp khớp phiếu này (tiền tố thứ tự) → số bước đã vào
    const doneSteps = (t) => Math.max(0, ...C.slots.filter(Boolean)
      .filter((b) => b.placed.every((tok, i) => t.steps[i] === tok)).map((b) => b.placed.length));
    const key = C.tickets.map((t) => `${t.id}:${t.regular ? 1 : 0}:${hint ? doneSteps(t) : 0}`).join('|');
    if (key !== this._tkKey) {
      this._tkKey = key;
      this._seenTk ??= new Set();
      let fresh = false;
      el.innerHTML = C.tickets.map((t) => {
        const isNew = !this._seenTk.has(t.id); if (isNew) { this._seenTk.add(t.id); fresh = true; }
        const k = doneSteps(t);
        // tối đa 7 icon: 7 × 3.8cqw ≈ 108px vừa lòng thẻ 112px, 8 thì tràn
        const icons = hint ? t.steps.map((tok, i) => ({ tok, i })).filter(({ tok }) => !/^@/.test(tok) && tok !== 'base-ready' && iconUrl(tok.replace(/^bowl-hot:/, '')))
          .slice(0, 7).map(({ tok, i }) => `<img class="${i < k ? 'on' : ''}" src="${iconUrl(tok.replace(/^bowl-hot:/, ''))}" alt="" draggable="false" title="${label(tok)}">`).join('') : '';
        return `<div class="tk drop${t.regular ? ' reg' : ''}${isNew ? ' new' : ''}" data-zone="ticket" data-i="${t.id}">`
          + `<img class="tk-clip" src="${fx('clip')}" alt="" draggable="false" onerror="this.remove()">`
          + `<img class="tk-face" src="${faceArt(t.regular, t.id)}" alt="" draggable="false" onerror="this.remove()">`
          + `<b>${t.name}</b><span>${D.recipes[t.dish].name}</span>`
          + (icons ? `<div class="tk-ing">${icons}</div>` : '')
          + `<i class="bar"><u></u></i></div>`;
      }).join('');
      if (fresh && C.time > 0.5) this.o.sfx?.arrive?.();
    }
    for (const t of C.tickets) {
      const u = el.querySelector(`.tk[data-i="${t.id}"] .bar u`); if (!u) continue;
      const f = C.patienceOf(t); u.style.width = `${(f * 100).toFixed(1)}%`;
      const cls = f < 0.2 ? 'hot' : f < 0.5 ? 'warn' : '';
      if (u.dataset.c !== cls) { u.dataset.c = cls; u.className = cls; }
    }
  }

  /** Đồng hồ + chuỗi + số tiền bay lên. Gọi mỗi khung hình nên chỉ đụng DOM khi giá trị ĐỔI. */
  hud() {
    const C = this.C;
    // tiền tăng → +Nk bay lên. Phần tử riêng gắn vào #pov vì render() dựng lại DOM mỗi khung.
    const m = Math.round(C.money);
    if (this._money == null) this._money = m;
    else if (m > this._money) { this.moneyFloat(m - this._money); this._money = m; }
    else if (m !== this._money) this._money = m;
    // chuỗi tô đúng
    const sk = $('pvStreak');
    if (sk) { const s = C.streak >= 2 ? `×${C.streak}` : '';
      if (sk.textContent !== s) { sk.textContent = s; if (s) { sk.classList.remove('pop'); void sk.offsetWidth; sk.classList.add('pop'); } } }
    // đồng hồ ca
    const cl = $('pvClock'), tm = $('pvTime'); if (!cl || !tm) return;
    if (C.seconds == null) {                       // luyện đơn lẻ / rush: không có hạn giờ → đếm lên, không tô vòng
      cl.classList.add('up');
      const up = Math.floor(C.time); if (this._tsec !== up) { this._tsec = up; tm.textContent = `${Math.floor(up / 60)}:${String(up % 60).padStart(2, '0')}`; }
      return;
    }
    const leftS = Math.max(0, C.seconds - C.time), f = leftS / C.seconds;
    const fg = cl.querySelector('.fg'); if (fg) fg.style.strokeDashoffset = (97.4 * (1 - f)).toFixed(2);
    const w = f > 0.25 ? '' : f > 0.10 ? 'warn' : 'hot';
    if (this._clw !== w) { this._clw = w; cl.className = 'pv-clock ' + w; }
    const s = Math.ceil(leftS);
    if (this._tsec !== s) {
      this._tsec = s; tm.textContent = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}`;
      if (s <= 10 && s > 0) this.o.sfx?.tap?.();
    }
  }
  moneyFloat(n) {
    const a = $('pvMoney'); if (!a) return;
    const r = a.getBoundingClientRect(), e = document.createElement('span');
    e.className = 'pv-float'; e.textContent = `+${n}k`;
    e.style.left = `${r.left}px`; e.style.top = `${r.top}px`;
    this.el.appendChild(e); this.o.sfx?.coin?.();
    setTimeout(() => e.remove(), 720);
  }

  loop() { let last = performance.now();
    const tick = (now) => { if (this.C.over) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; this.C.update(dt); this.render(); this._raf = requestAnimationFrame(tick); };
    this._raf = requestAnimationFrame(tick); }
}
