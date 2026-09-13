// Vẽ World bằng Three.js với khối tạm (blockout). Không chứa logic game.
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { CAMERA } from '../config.js';
import { label, D } from './recipes.js';

const COLORS = {
  floor: 0xc98b4a, wall: 0xf1e3cf, steel: 0xb8c0c8, shelf: 0x8a5a2b, pot: 0x6b7280, sink: 0x9fb8c8, stove: 0x3b3b3b, counter: 0xd9c2a3, serve: 0xe8a33c, seat: 0x2a9d8f,
  chef: 0xf4f1ea, apron: 0xe84a3b, skin: 0xf2c9a0,
};
const ITEM_COLORS = { 'pho-noodle': 0xfff2d0, bun: 0xfff2d0, 'bun-to': 0xfff2d0, 'pho-bowl': 0xffffff, 'soup-bowl': 0xffffff, nam: 0x8b4a2b, 'bo-tai': 0xc95a5a, 'la-sach': 0xd8c9b0, 'bo-vien': 0xb59a7a,
  'hanh-tay': 0xf3f0e6, 'ngo-ri-ngo-gai': 0x5fa55a, 'hanh-la': 0x3f9a3f, broth: 0xe8a33c, 'noodle-blanched': 0xfff2d0, 'noodle-rinsed': 0xe8f4ff, 'noodle-drained': 0xfff8e0, 'bowl-hot': 0xffffff, 'bo-vien-ready': 0xb59a7a };
const itemColor = (t) => ITEM_COLORS[t] ?? 0xcccccc;

function box(w, h, d, color, y = h / 2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }));
  m.position.y = y; m.castShadow = true; m.receiveShadow = true; return m;
}
function lbl(text, cls = 'lbl') { const el = document.createElement('div'); el.className = cls; el.textContent = text; return new CSS2DObject(el); }

export class View {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer(); this.labels.setSize(innerWidth, innerHeight);
    Object.assign(this.labels.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
    container.appendChild(this.labels.domElement);

    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x3b2f2a);
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, innerWidth / innerHeight, 0.1, 100);
    this.fitCamera();
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b4a2a, 0.7));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.2); sun.position.set(5, 10, 4); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); this.scene.add(sun);

    this.stationMeshes = new Map(); this.hitboxes = []; this.dyn = new Map(); // id -> {group, timer, qnum,...}
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.fitCamera(); this.renderer.setSize(innerWidth, innerHeight); this.labels.setSize(innerWidth, innerHeight); });
  }
  fitCamera() {
    const size = this.kitchenSize || { w: 10, d: 7 };
    // khớp bếp vào khung: chiều ngang cần thấy ±(w/2+0.6) m tại độ cao 0
    const halfW = size.w / 2 + 0.6, halfD = size.d / 2 + 1.0;
    const aspect = this.camera.aspect, vFov = THREE.MathUtils.degToRad(CAMERA.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const distW = halfW / Math.tan(hFov / 2), distD = halfD / Math.tan(vFov / 2) * 0.95;
    const dist = Math.max(distW, distD, 9);
    const pitch = THREE.MathUtils.degToRad(this.camera.aspect < 1 ? 58 : 52);
    this.camera.position.set(0, Math.sin(pitch) * dist, CAMERA.lookAtZ + Math.cos(pitch) * dist);
    this.camera.lookAt(0, 0, CAMERA.lookAtZ); this.camera.updateProjectionMatrix();
  }

  /** Xoá toàn bộ cảnh để dựng lại (đổi hướng màn hình). */
  clearAll() { for (const o of [...this.scene.children]) if (!o.isLight) this.scene.remove(o); this.stationMeshes.clear(); this.hitboxes.length = 0; this.dyn.clear(); this._handKey = null; this.labels.domElement.replaceChildren(); }
  /** Dựng bếp tĩnh từ World (một lần). */
  build(world) {
    this.kitchenSize = world.kitchen.size; this.fitCamera();
    const { w, d } = world.kitchen.size;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    // gạch kẻ
    const grid = new THREE.GridHelper(Math.max(w, d), Math.max(w, d), 0x9a6a33, 0x9a6a33); grid.position.y = 0.002; grid.material.opacity = 0.25; grid.material.transparent = true; this.scene.add(grid);
    const back = box(w, 2.2, 0.2, COLORS.wall); back.position.z = -d / 2 - 0.1; this.scene.add(back);
    for (const s of world.stations) this.buildStation(s);
    // đầu bếp
    const g = new THREE.Group();
    const body = box(0.5, 0.7, 0.4, COLORS.chef, 0.55); const apron = box(0.42, 0.5, 0.1, COLORS.apron, 0.5); apron.position.z = 0.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: COLORS.skin, flatShading: true })); head.position.y = 1.2; head.castShadow = true;
    const hat = box(0.4, 0.22, 0.4, 0xffffff, 1.5);
    g.add(body, apron, head, hat); this.scene.add(g); this.chef = g;
    this.handLabel = lbl('', 'hand'); this.handLabel.position.set(0, 1.9, 0); g.add(this.handLabel);
    this.handItems = new THREE.Group(); this.handItems.position.set(0, 0.9, 0.38); g.add(this.handItems);
  }
  buildStation(s) {
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.userData.id = s.id; g.userData.station = s;
    if (s.type !== 'shelf' && s.type !== 'counter') { const hit = box(Math.max(s.w || 0.8, 0.8), 1.6, Math.max(s.d || 0.8, 0.8) + 0.3, 0xffffff, 0.8); hit.visible = false; g.add(hit); hit.userData.id = s.id; this.hitboxes.push(hit); }
    const dyn = { group: g };
    switch (s.type) {
      case 'shelf': { g.add(box(s.w, 0.9, s.d, COLORS.shelf)); g.add(box(s.w * 0.9, 0.05, s.d * 0.9, COLORS.steel, 0.92));
        const n = s.items.length; const ax = s.d > s.w; const span = (ax ? s.d : s.w) * 0.9; const pitch = span / n;
        s.items.forEach((it, i) => {
          const off = -span / 2 + pitch * (i + 0.5);
          const c = box(0.26, 0.2, 0.26, itemColor(it), 1.03); c.position[ax ? 'z' : 'x'] = off; g.add(c);
          // ô chạm riêng cho từng nguyên liệu (to hơn khối để chạm bằng ngón tay)
          const hit = box(ax ? s.w + 0.4 : pitch, 1.5, ax ? pitch : s.d + 0.4, 0xffffff, 0.9); hit.visible = false; hit.position[ax ? 'z' : 'x'] = off; hit.userData.id = `${s.id}:${it}`; g.add(hit); this.hitboxes.push(hit);
          const l = lbl(label(it), 'lbl tiny'); l.position.set(ax ? 0 : off, 1.22, ax ? off : 0); g.add(l);
        }); break; }
      case 'pot': { g.add(box(s.w, 0.85, s.d, COLORS.steel)); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.5, 14), new THREE.MeshStandardMaterial({ color: COLORS.pot, flatShading: true })); pot.position.y = 1.05; pot.castShadow = true; g.add(pot);
        const water = new THREE.Mesh(new THREE.CircleGeometry(0.38, 14), new THREE.MeshStandardMaterial({ color: 0xdde9f5 })); water.rotation.x = -Math.PI / 2; water.position.y = 1.31; g.add(water); dyn.water = water; break; }
      case 'sink': { g.add(box(s.w, 0.85, s.d, COLORS.steel)); const basin = box(s.w * 0.7, 0.3, s.d * 0.6, COLORS.sink, 0.95); g.add(basin); break; }
      case 'stove': { g.add(box(s.w, 0.85, s.d, COLORS.stove)); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.6, 16), new THREE.MeshStandardMaterial({ color: COLORS.steel, flatShading: true })); pot.position.y = 1.1; g.add(pot);
        const broth = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshStandardMaterial({ color: 0xe8a33c, emissive: 0x7a4a10 })); broth.rotation.x = -Math.PI / 2; broth.position.y = 1.41; g.add(broth); break; }
      case 'counter': { g.add(box(s.w, 0.9, s.d, COLORS.counter)); dyn.slots = []; const n = s.slots.length; const pitch = s.w / n;
        for (let i = 0; i < n; i++) { const x = -s.w / 2 + pitch * (i + 0.5); const sg = new THREE.Group(); sg.position.set(x, 0.92, 0); g.add(sg); dyn.slots.push(sg);
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 24), new THREE.MeshBasicMaterial({ color: 0x8a5a2b })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.915, 0); g.add(ring);
          const hit = box(pitch, 1.6, s.d + 0.5, 0xffffff, 0.8); hit.visible = false; hit.position.x = x; hit.userData.id = `${s.id}:${i}`; g.add(hit); this.hitboxes.push(hit); } break; }
      case 'serve': { g.add(box(s.w, 1.0, s.d, COLORS.serve)); break; }
      case 'trash': { const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.8, 10), new THREE.MeshStandardMaterial({ color: 0x4a6b5a, flatShading: true })); bin.position.y = 0.4; bin.castShadow = true; g.add(bin); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0x2f4a3c, flatShading: true })); lid.position.y = 0.83; g.add(lid); break; }
      case 'seat': { const st = box(0.5, 0.45, 0.5, COLORS.seat); g.add(st); const tbl = box(0.9, 0.08, 0.6, COLORS.wall, 0.78); tbl.position.z = -0.6; g.add(tbl); const leg = box(0.1, 0.75, 0.1, COLORS.shelf, 0.38); leg.position.z = -0.6; g.add(leg); break; }
    }
    if (s.label && s.type !== 'shelf') { const l = lbl(s.label); l.position.set(0, s.type === 'counter' ? 1.3 : 1.55, s.type === 'counter' ? -0.55 : 0); g.add(l); }
    if (s.label && s.type === 'shelf') { const l = lbl(s.label, 'lbl shelfname'); const ax = s.d > s.w; l.position.set(ax ? 0 : 0, 0.55, ax ? -s.d / 2 - 0.1 : -s.d / 2 - 0.1); g.add(l); }
    this.scene.add(g); this.stationMeshes.set(s.id, g); this.dyn.set(s.id, dyn);
  }

  /** Chạm màn hình → id trạm hoặc null */
  pick(clientX, clientY) {
    this.ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(this.hitboxes, false);
    return hits.length ? hits[0].object.userData.id : null;
  }

  /** Đồng bộ cảnh với world mỗi frame. */
  sync(world, dt) {
    const c = world.chef;
    this.chef.position.set(c.x, 0, c.z); this.chef.rotation.y = c.facing;
    const moving = c.target && c.busy <= 0; this.chef.children[0].position.y = 0.55 + (moving ? Math.abs(Math.sin(world.time * 14)) * 0.06 : 0);
    if (c.busy > 0) this.chef.rotation.x = Math.sin(world.time * 10) * 0.08; else this.chef.rotation.x = 0;
    // đồ trên tay
    const handKey = c.hand.map((h) => (typeof h === 'object' ? 'bowl' : h)).join('|');
    if (this._handKey !== handKey) {
      this._handKey = handKey; this.handItems.clear();
      c.hand.forEach((h, i) => { const m = typeof h === 'object' ? this.bowlMesh(h) : box(0.22, 0.18, 0.22, itemColor(h), 0); m.position.set(-0.15 + i * 0.3, 0, 0); this.handItems.add(m); });
      this.handLabel.element.textContent = c.busy > 0 ? c.busyLabel : c.hand.map((h) => (typeof h === 'object' ? h.recipe.name : label(h))).join(' + ');
      this.handLabel.element.style.display = this.handLabel.element.textContent ? '' : 'none';
    }
    if (c.busy > 0 && c.busyLabel && this.handLabel.element.textContent !== c.busyLabel) { this.handLabel.element.textContent = c.busyLabel; this.handLabel.element.style.display = ''; }
    else if (c.busy <= 0 && this._lastBusy) { this._handKey = null; }
    this._lastBusy = c.busy > 0;

    // trạm: timer, số thứ tự hàng đợi
    for (const s of world.stations) {
      const dyn = this.dyn.get(s.id); if (!dyn) continue;
      // timers
      dyn.timers ??= []; const jobs = s.jobs;
      while (dyn.timers.length < jobs.length) { const el = document.createElement('div'); el.className = 'timer'; const o = new CSS2DObject(el); dyn.group.add(o); dyn.timers.push(o); }
      dyn.timers.forEach((o, i) => { const j = jobs[i]; if (!j) { o.visible = false; return; } o.visible = true; o.position.set(-0.3 + i * 0.6, 1.9, 0); const p = 1 - j.left / j.total; o.element.style.setProperty('--p', `${Math.round(p * 100)}%`); o.element.classList.toggle('done', j.left <= 0); o.element.textContent = j.left <= 0 ? '✓' : (D.actions[j.action]?.icon || '⏱'); });
      // queue number
      const qi = c.queue.findIndex((q) => q === s.id || q.startsWith(s.id + ':')); const isTarget = c.target === s.id || (c.target || '').startsWith(s.id + ':');
      if (qi >= 0 || isTarget) { if (!dyn.qnum) { const el = document.createElement('div'); el.className = 'qnum'; dyn.qnum = new CSS2DObject(el); dyn.qnum.position.set(0, 2.3, 0); dyn.group.add(dyn.qnum); } dyn.qnum.visible = true; dyn.qnum.element.textContent = isTarget ? '▶' : String(qi + 1); }
      else if (dyn.qnum) dyn.qnum.visible = false;
      if (dyn.water) dyn.water.material.color.setHex(s.jobs.length ? 0xfff0c0 : 0xdde9f5);
      // tô trên quầy
      if (dyn.slots) s.slots.forEach((b, i) => { const sg = dyn.slots[i]; const key = b ? `${b.recipe.id}:${b.placed.length}:${b.done}` : ''; if (sg.userData.key === key) return; sg.userData.key = key; sg.clear(); if (b) { sg.add(this.bowlMesh(b)); const l = lbl(b.done ? `${b.recipe.name} ✓` : `Tiếp: ${label(b.recipe.assembly[b.placed.length])}`, 'lbl small'); l.position.set(0, 0.45, 0.5); sg.add(l); } });
    }
    // khách
    for (const cu of world.customers) {
      let v = this.dyn.get('cust:' + cu.id);
      if (!v && cu.state === 'waiting') { v = this.buildCustomer(cu); this.dyn.set('cust:' + cu.id, v); }
      if (!v) continue;
      if (cu.state !== 'waiting') { if (v.group.parent) { this.scene.remove(v.group); } continue; }
      const f = cu.patience / cu.maxPatience; v.bar.style.width = `${Math.max(0, f * 100)}%`; v.barWrap.className = `patience ${f < 0.25 ? 'angry' : f < 0.5 ? 'warn' : ''}`;
      v.group.position.y = f < 0.25 ? Math.abs(Math.sin(world.time * 12)) * 0.05 : 0;
    }
    this.renderer.render(this.scene, this.camera); this.labels.render(this.scene, this.camera);
  }
  bowlMesh(b) {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.18, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true })); bowl.position.y = 0.09; g.add(bowl);
    b.placed.forEach((tok, i) => { if (tok === 'bowl-hot') return; const layer = new THREE.Mesh(new THREE.CylinderGeometry(0.26 - i * 0.015, 0.26 - i * 0.015, 0.035, 12), new THREE.MeshStandardMaterial({ color: itemColor(tok), flatShading: true })); layer.position.y = 0.19 + i * 0.03; g.add(layer); });
    return g;
  }
  buildCustomer(cu) {
    const s = cu.seat.station; const g = new THREE.Group(); g.position.set(s.x, 0, s.z);
    const color = { office: 0x2a9d8f, xeom: 0x8b5e3c, tourist: 0xf4a261 }[cu.type] || 0x888888;
    const body = box(0.45, 0.6, 0.35, color, 0.75); const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf2c9a0, flatShading: true })); head.position.y = 1.3; g.add(body, head);
    const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = `${D.recipes[cu.dish].name}`; const bo = new CSS2DObject(bubble); bo.position.set(0, 1.95, 0); g.add(bo);
    const barWrap = document.createElement('div'); barWrap.className = 'patience'; const bar = document.createElement('div'); barWrap.appendChild(bar); const po = new CSS2DObject(barWrap); po.position.set(0, 1.62, 0); g.add(po);
    this.scene.add(g); return { group: g, bar, barWrap };
  }
  reset() { for (const [k, v] of this.dyn) if (k.startsWith('cust:') && v.group) this.scene.remove(v.group); for (const k of [...this.dyn.keys()]) if (k.startsWith('cust:')) this.dyn.delete(k); for (const [, v] of this.dyn) { v.slots?.forEach((sg) => { sg.clear(); sg.userData.key = null; }); } this._handKey = null; }
}
