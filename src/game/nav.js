// Lưới đi đường cho đầu bếp: A* 8 hướng trên ô 0.25 m, vật cản = footprint trạm/bàn/ghế nở thêm bán kính đầu bếp.
// Thuần JS, không Three.js — test được.

export class NavGrid {
  /**
   * @param {{size:{w:number,d:number}}} kitchen
   * @param {Array} stations world.stations (có x,z,w,d,type)
   * @param {number} cell kích thước ô (m)
   * @param {number} inflate nở vật cản (≈ bán kính đầu bếp)
   */
  constructor(kitchen, stations, cell = 0.25, inflate = 0.3) {
    this.cell = cell; this.w = kitchen.size.w; this.d = kitchen.size.d;
    this.cols = Math.round(this.w / cell); this.rows = Math.round(this.d / cell);
    this.blocked = new Uint8Array(this.cols * this.rows);
    this.rects = [];
    for (const s of stations) {
      if (s.type === 'seat') { this.rects.push({ x: s.x, z: s.z, w: 0.5, d: 0.5 }); this.rects.push({ x: s.x, z: s.z - 0.6, w: 0.9, d: 0.6 }); }   // ghế + bàn
      else if (!s.onTable) this.rects.push({ x: s.x, z: s.z, w: s.w || 0.8, d: s.d || 0.8 });   // thớt trên tủ topping: tủ đã là vật cản
    }
    for (const r of this.rects) this.fill(r, inflate);
  }
  fill(r, inflate) {
    const x0 = r.x - r.w / 2 - inflate, x1 = r.x + r.w / 2 + inflate, z0 = r.z - r.d / 2 - inflate, z1 = r.z + r.d / 2 + inflate;
    // ô bị chặn = ô có phần giao với hình chữ nhật đã nở (biên trên dùng ceil-1 để đúng biên ô)
    const c0 = Math.max(0, Math.floor((x0 + this.w / 2) / this.cell)), c1 = Math.min(this.cols - 1, Math.ceil((x1 + this.w / 2) / this.cell) - 1);
    const r0 = Math.max(0, Math.floor((z0 + this.d / 2) / this.cell)), r1 = Math.min(this.rows - 1, Math.ceil((z1 + this.d / 2) / this.cell) - 1);
    for (let c = c0; c <= c1; c++) for (let rr = r0; rr <= r1; rr++) this.blocked[rr * this.cols + c] = 1;
  }
  toCell(x, z) { return { c: Math.min(this.cols - 1, Math.max(0, Math.floor((x + this.w / 2) / this.cell))), r: Math.min(this.rows - 1, Math.max(0, Math.floor((z + this.d / 2) / this.cell))) }; }
  toWorld(c, r) { return { x: (c + 0.5) * this.cell - this.w / 2, z: (r + 0.5) * this.cell - this.d / 2 }; }
  free(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows && !this.blocked[r * this.cols + c]; }
  /** Ô trống gần nhất (khi điểm đích rơi vào vùng nở). */
  nearestFree(c, r) {
    if (this.free(c, r)) return { c, r };
    for (let rad = 1; rad < 8; rad++) for (let dc = -rad; dc <= rad; dc++) for (let dr = -rad; dr <= rad; dr++) if (Math.max(Math.abs(dc), Math.abs(dr)) === rad && this.free(c + dc, r + dr)) return { c: c + dc, r: r + dr };
    return { c, r };
  }
  /** Tập ô tới được từ (x,z) (flood fill 4 hướng). */
  reachableFrom(x, z) {
    const s = this.nearestFree(...Object.values(this.toCell(x, z)));
    const seen = new Uint8Array(this.cols * this.rows); const st = [s.r * this.cols + s.c]; seen[st[0]] = 1;
    while (st.length) { const k = st.pop(); const c = k % this.cols, r = Math.floor(k / this.cols);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (!this.free(nc, nr)) continue; const nk = nr * this.cols + nc; if (!seen[nk]) { seen[nk] = 1; st.push(nk); } } }
    return seen;
  }
  /**
   * Chọn chỗ đứng cho trạm: ô trống, tới được, nằm trong vành quanh footprint, gần điểm ưu tiên nhất.
   * Trả về điểm ưu tiên nếu nó đã hợp lệ.
   */
  standFor(rect, preferred, reachable) {
    const ok = (x, z) => { const { c, r } = this.toCell(x, z); return this.free(c, r) && reachable[r * this.cols + c]; };
    if (ok(preferred.x, preferred.z)) return preferred;
    let best = null, bd = Infinity;
    const x0 = rect.x - rect.w / 2 - 1.2, x1 = rect.x + rect.w / 2 + 1.2, z0 = rect.z - rect.d / 2 - 1.2, z1 = rect.z + rect.d / 2 + 1.2;
    for (let x = x0; x <= x1; x += this.cell) for (let z = z0; z <= z1; z += this.cell) {
      if (!ok(x, z)) continue;
      // phải kề footprint (cách mép ≤ 0.9) để với tay tới trạm
      const dx = Math.max(0, Math.abs(x - rect.x) - rect.w / 2), dz = Math.max(0, Math.abs(z - rect.z) - rect.d / 2);
      if (Math.hypot(dx, dz) > 0.9) continue;
      const d = Math.hypot(x - preferred.x, z - preferred.z); if (d < bd) { bd = d; best = { x, z }; }
    }
    return best || preferred;
  }
  /** Đường đi (mảng điểm world) từ (x,z) tới (tx,tz); đích luôn là điểm đích thật. Trả về [] nếu không có đường. */
  path(x, z, tx, tz) {
    const s = this.nearestFree(...Object.values(this.toCell(x, z))); const g = this.nearestFree(...Object.values(this.toCell(tx, tz)));
    if (s.c === g.c && s.r === g.r) return [{ x: tx, z: tz }];
    const key = (c, r) => r * this.cols + c; const N = this.cols * this.rows;
    const gScore = new Float32Array(N).fill(Infinity); const came = new Int32Array(N).fill(-1); const closed = new Uint8Array(N);
    const open = [{ k: key(s.c, s.r), f: 0 }]; gScore[open[0].k] = 0;
    const h = (c, r) => Math.hypot(c - g.c, r - g.r);
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let found = false;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;   // lưới nhỏ → tìm min tuyến tính đủ nhanh
      const cur = open.splice(bi, 1)[0]; const cc = cur.k % this.cols, cr = Math.floor(cur.k / this.cols);
      if (closed[cur.k]) continue; closed[cur.k] = 1;
      if (cc === g.c && cr === g.r) { found = true; break; }
      for (const [dc, dr] of DIRS) {
        const nc = cc + dc, nr = cr + dr; if (!this.free(nc, nr)) continue;
        if (dc && dr && (!this.free(cc + dc, cr) || !this.free(cc, cr + dr))) continue;   // không cắt góc vật cản
        const nk = key(nc, nr); const ng = gScore[cur.k] + Math.hypot(dc, dr);
        if (ng < gScore[nk]) { gScore[nk] = ng; came[nk] = cur.k; open.push({ k: nk, f: ng + h(nc, nr) }); }
      }
    }
    if (!found) return [];
    const cells = []; let k = key(g.c, g.r);
    while (k !== -1 && k !== key(s.c, s.r)) { cells.push(k); k = came[k]; }
    cells.reverse();
    const pts = cells.map((k2) => this.toWorld(k2 % this.cols, Math.floor(k2 / this.cols)));
    pts[pts.length - 1] = { x: tx, z: tz };
    return this.smooth({ x, z }, pts);
  }
  /** Kéo thẳng: bỏ điểm trung gian khi đoạn thẳng không cắt vật cản. */
  smooth(start, pts) {
    const out = []; let from = start; let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.lineFree(from, pts[j])) j--;
      out.push(pts[j]); from = pts[j]; i = j + 1;
    }
    return out;
  }
  lineFree(a, b) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (this.cell * 0.5)) + 1;
    for (let i = 0; i <= n; i++) { const t = i / n; const { c, r } = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); if (!this.free(c, r)) return false; }
    return true;
  }
}
