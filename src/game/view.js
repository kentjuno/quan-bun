// Vẽ World bằng Three.js với model GLB dựng từ Blender (art/scripts/build_kitchen.py). Không chứa logic game.
// Ánh sáng theo hồ sơ "toy miniature": key ấm 55° cao, fill hemisphere, rim nhẹ, nền tối hơn vật thể một stop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { CAMERA, POT, CHEF } from '../config.js';
// vị trí (x trong nhóm nồi) của 3 rọ sợi và chồng tô
// màu tạm cho nguyên liệu chưa có lớp model trong tô
const FALLBACK_COLOR = { 'ca-chua': 0xe0432b, 'dau-hu': 0xe8b64a, 'tom': 0xf07a3a, 'thit-luoc': 0xe9b8a6, 'bap-bo': 0x7a3b2e, 'cha-lua': 0xf2c9c0, 'cha-re': 0xc86a3a, 'rau-ram': 0x3f7a3c };
const POT_X = { noodle: (i) => -0.7 + i * 0.46, bowl: 0.72, y: () => 2.05 };   // 3 rọ trái → phải + chồng tô bên phải, cùng một hàng (nồi rộng 1.8 m)
import { label, D } from './recipes.js';
import { iconUrl } from './icons.js';

const FILES = { kitchen: './models/kitchen.glb', chef: './models/chef.glb', customers: './models/customers.glb', items: './models/items.glb' };

function lbl(text, cls = 'lbl') { const el = document.createElement('div'); el.className = cls; el.textContent = text; return new CSS2DObject(el); }
/** Gỡ object khỏi cha và xoá phần tử DOM của mọi CSS2DObject bên trong (CSS2DRenderer không tự xoá). */
function dispose(o) { o.traverse((c) => { if (c.isCSS2DObject) c.element.remove(); }); o.parent?.remove(o); }
function clearGroup(g) { for (const c of [...g.children]) dispose(c); }
function shadows(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
/** Clone giữ material dùng chung (không cần đổi màu từng con). */
function clone(o) { return shadows(o.clone(true)); }

export async function loadModels(onProgress) {
  const loader = new GLTFLoader(); const out = {}; let done = 0; const names = Object.keys(FILES);
  const clips = {};
  await Promise.all(names.map(async (n) => { const g = await loader.loadAsync(FILES[n]); out[n] = g.scene; clips[n] = g.animations; done++; onProgress?.(done / names.length, n); }));
  // các gốc được xếp hàng trong Blender để render preview → đưa về (0,0,0)
  for (const root of Object.values(out)) root.traverse((c) => { c.name = c.name.replace(/(\D)\d{3}$/, '$1'); });   // Blender thêm .001 khi trùng tên (GLTFLoader bỏ dấu chấm → 001)
  for (const root of Object.values(out)) root.children.forEach((c) => c.position.set(0, 0, 0));
  // chỉ mục theo tên gốc
  const lib = { station: {}, item: {}, layer: {}, customer: {}, chef: null, bowl: null };
  out.kitchen.children.forEach((c) => { lib.station[c.name.replace('Station_', '')] = c; });
  out.items.children.forEach((c) => { if (c.name.startsWith('Item_')) lib.item[c.name.slice(5)] = c; else if (c.name.startsWith('Bowl_layer_')) lib.layer[c.name.slice(11)] = c; else if (c.name === 'Bowl_base') lib.bowl = c; });
  out.customers.children.forEach((c) => { lib.customer[c.name.replace('Customer_', '')] = c; });
  lib.chef = out.chef.children[0]; lib.chefClips = clips.chef || [];   // rig + clip Idle/Walk/Carry/CarryIdle/Work (NLA track trong Blender)
  for (const root of Object.values(out)) root.traverse((m) => { if (m.isMesh) { m.material.roughness = 0.8; m.material.metalness = 0; if (/Broth|Burner/.test(m.material.name)) { m.material.emissive = new THREE.Color(m.material.name.includes('Broth') ? 0x6a3a08 : 0x5a1a10); } } });
  return lib;
}

const SHOW_HIT = new URLSearchParams(location.search).has('hit');
function hitbox(w, h, d) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: SHOW_HIT, color: 0xff00ff, transparent: true, opacity: 0.25, depthWrite: false })); }

export class View {
  constructor(container, lib) {
    this.lib = lib;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);
    this.labels = new CSS2DRenderer(); this.labels.setSize(innerWidth, innerHeight);
    Object.assign(this.labels.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
    container.appendChild(this.labels.domElement);

    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x2e2420);
    this.scene.fog = new THREE.FogExp2(0x2e2420, 0.012);
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, innerWidth / innerHeight, 0.1, 120);
    // ánh sáng: key ấm cao 55°, azimuth 300 (từ trái-trước), fill hemi, rim đối diện
    this.lights = new THREE.Group(); this.scene.add(this.lights);
    const key = new THREE.DirectionalLight(0xfff4e4, 3.0); const el = THREE.MathUtils.degToRad(55), az = THREE.MathUtils.degToRad(300);
    key.position.set(Math.cos(el) * Math.sin(az) * 14, Math.sin(el) * 14, Math.cos(el) * Math.cos(az) * 14); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 }); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
    const fill = new THREE.HemisphereLight(0xcfe0f0, 0x5a3a28, 1.1);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(-6, 6, -10);
    this.lights.add(key, fill, rim);
    this.stationMeshes = new Map(); this.hitboxes = []; this.dyn = new Map();
    this.ray = new THREE.Raycaster(); this.ndc = new THREE.Vector2();
    this.steam = []; this.time = 0;
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.fitCamera(); this.renderer.setSize(innerWidth, innerHeight); this.labels.setSize(innerWidth, innerHeight); });
  }
  fitCamera() {
    const size = this.kitchenSize || { w: 10, d: 7 };
    const halfW = size.w / 2 + 0.6, halfD = size.d / 2 + 1.0;
    const aspect = this.camera.aspect, vFov = THREE.MathUtils.degToRad(CAMERA.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const dist = Math.max(halfW / Math.tan(hFov / 2), halfD / Math.tan(vFov / 2) * 0.95, 9);
    const pitch = THREE.MathUtils.degToRad(aspect < 1 ? 58 : 52);
    this.camera.position.set(0, Math.sin(pitch) * dist, CAMERA.lookAtZ + Math.cos(pitch) * dist);
    this.camera.lookAt(0, 0, CAMERA.lookAtZ); this.camera.updateProjectionMatrix();
  }
  /** Tủ lạnh prep table (sandwich/pizza): thân inox + 3 cửa có tay nắm, mặt thớt trắng phía trước, khoang khay lạnh 2 hàng phía sau (sát tường), rail thấp sau lưng. Trả về vị trí 2 hàng khay theo trục ngang kệ. */
  buildPrepTable(g, s, side) {
    const along = side ? 'z' : 'x', across = side ? 'x' : 'z'; const L = side ? s.d : s.w, Dp = side ? s.w : s.d; const back = side ? side : -1;
    const steel = new THREE.MeshStandardMaterial({ color: 0xb6bcc2, metalness: 0.65, roughness: 0.32 });
    const steelDark = new THREE.MeshStandardMaterial({ color: 0x8d949a, metalness: 0.6, roughness: 0.4 });
    const board = new THREE.MeshStandardMaterial({ color: 0xf3efe4, roughness: 0.85 });
    const pan = new THREE.MeshStandardMaterial({ color: 0x5f666c, metalness: 0.5, roughness: 0.5 });
    const box = (la, h, lc, a, y, c, mat) => { const geo = new THREE.BoxGeometry(along === 'x' ? la : lc, h, along === 'x' ? lc : la); const m = new THREE.Mesh(geo, mat); m.position.y = y; m.position[along] = a; m.position[across] = c; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    box(L, 0.84, Dp, 0, 0.42, 0, steel);                                   // thân tủ
    const doors = 3, dw = L / doors; const front = -back * (Dp / 2 + 0.012);
    for (let i = 0; i < doors; i++) { const a = -L / 2 + dw * (i + 0.5); box(dw * 0.9, 0.62, 0.024, a, 0.36, front, steelDark); box(0.05, 0.2, 0.03, a + dw * 0.32, 0.5, front - back * 0.02, new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.6 })); }
    box(L * 0.98, 0.16, Dp * 0.55, 0, 0.92, back * Dp * 0.225, steel);      // khoang lạnh phía sau (cao hơn mặt thớt)
    box(L, 0.04, Dp * 0.46, 0, 0.86, -back * Dp * 0.27, board);            // mặt thớt trắng phía trước
    box(L, 0.22, 0.03, 0, 1.1, back * (Dp / 2 - 0.015), steel);            // rail/tấm chắn thấp sát tường
    // khay GN: 2 hàng × cột theo số item (tối đa 12 cột cho gọn)
    const cols = Math.max(4, Math.ceil(s.items.length / 2)); const pw = (L * 0.98) / cols; const rowC = [back * Dp * 0.115, back * Dp * 0.345]; const pd = Dp * 0.2;
    for (let i = 0; i < cols; i++) for (let r = 0; r < 2; r++) box(pw * 0.86, 0.05, pd * 0.86, -L * 0.49 + pw * (i + 0.5), 1.0, rowC[r], pan);
    return { rows: rowC, cols, pw, L };   // hàng 0 = gần thớt, hàng 1 = sát tường
  }
  /** Vật thể item: có ảnh Flow → thẻ đứng (sprite luôn quay về camera), không thì model/khối tạm. Texture cache theo url. */
  itemMesh(tok, size = 0.42) {
    const url = iconUrl(tok);
    if (url) {
      this._tex = this._tex || new Map();
      let tex = this._tex.get(url);
      if (!tex) { tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; this._tex.set(url, tex); }
      const g = new THREE.Group(); g.userData.billboard = true;
      // bóng kiểu drop-shadow (như card): chính ảnh đó tô đen, mờ, lệch xuống-phải một chút, vẽ sau
      const sh = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x000000, opacity: 0.32, transparent: true, alphaTest: 0.05, depthWrite: false }));
      sh.scale.set(size * 1.02, size * 0.98, 1); sh.center.set(0.5, 0); sh.position.set(size * 0.05, -size * 0.045, -0.001); sh.renderOrder = 1; g.add(sh);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.08, depthWrite: false }));
      sp.scale.set(size, size, 1); sp.center.set(0.5, 0); sp.renderOrder = 2; g.add(sp);
      return g;
    }
    const L = this.lib;
    return clone(L.item[tok] || (tok.startsWith('broth:') ? L.item['broth'] : null) || (tok.startsWith('bowl-hot:') ? L.item[tok.slice(9)] : null) || (/^noodle-\w+:/.test(tok) ? L.item[tok.split(':')[1]] : null) || L.item['pho-noodle']);
  }
  /** Trang trí quán đã mua (progress.decor) — chỉ là "áo", không có hitbox. */
  buildDecor(ids, w, d, floor, wall) {
    if (!ids.length) return;
    const g = new THREE.Group(); g.name = 'decor'; const has = (id) => ids.includes(id);
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    const plant = (x, z, leaf = 0x4f8f3a, big = false) => {
      const p = new THREE.Group(); const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.32, 10), std(0xb5552e)); pot.position.y = 0.16; p.add(pot);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, big ? 0.9 : 0.5, 6), std(0x6b4a2b)); stem.position.y = big ? 0.75 : 0.55; p.add(stem);
      const n = big ? 7 : 4; for (let i = 0; i < n; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.26 : 0.2, 8, 6), std(leaf)); const a = i / n * Math.PI * 2; b.position.set(Math.cos(a) * (big ? 0.28 : 0.15), (big ? 1.15 : 0.8) + (i % 2) * 0.12, Math.sin(a) * (big ? 0.28 : 0.15)); p.add(b); }
      if (big) for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), std(0xf7c531, { emissive: 0x6b4d00 })); const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.28; f.position.set(Math.cos(a) * r, 0.95 + Math.random() * 0.5, Math.sin(a) * r); p.add(f); }
      p.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); p.position.set(x, 0, z); return p;
    };
    if (has('cay-canh')) { g.add(plant(-(w / 2 + 0.35), d / 2 + 0.25)); g.add(plant(w / 2 + 0.35, d / 2 + 0.25)); }
    if (has('hoa-mai')) { g.add(plant(-(w / 2 + 0.35), d / 2 - 1.1, 0x3d7a2e, true)); }
    if (has('den-long')) { const n = Math.max(3, Math.floor(w / 2)); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * (w / n); const l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), std(0xe8452b, { emissive: 0xff5a2a, emissiveIntensity: 0.6 })); l.scale.y = 1.25; l.position.set(x, 2.15, -d / 2 + 0.25); g.add(l); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.06, 8), std(0xf4c542)); cap.position.set(x, 2.38, -d / 2 + 0.25); g.add(cap); const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6), std(0xf4c542)); tas.position.set(x, 1.85, -d / 2 + 0.25); g.add(tas); } }
    if (has('bang-hieu')) { const b = new THREE.Mesh(new THREE.BoxGeometry(Math.min(3.2, w * 0.45), 0.6, 0.08), std(0x7a2e1a)); b.position.set(0, 1.95, -d / 2 - 0.02); b.castShadow = true; g.add(b); const t = lbl('QUÁN BÚN', 'lbl sign'); t.position.set(0, 1.95, -d / 2 + 0.05); g.add(t); }
    if (has('tranh')) { const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.05), std(0xd9b36a)); fr.position.set(w / 4, 1.75, -d / 2 + 0.02); g.add(fr); const cv = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.06), std(0x3d6fa3)); cv.position.set(w / 4, 1.75, -d / 2 + 0.03); g.add(cv); const sun = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), std(0xf4c542, { emissive: 0x9a7a10 })); sun.position.set(w / 4 + 0.25, 1.9, -d / 2 + 0.07); g.add(sun); for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18 + i * 0.05, 0.02), std([0xf2c14e, 0xc9573b, 0xe0a458, 0xb8674a][i])); h.position.set(w / 4 - 0.35 + i * 0.22, 1.55 + (0.18 + i * 0.05) / 2, -d / 2 + 0.07); g.add(h); } }
    if (has('be-ca')) { const tank = new THREE.Group(); const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.5), new THREE.MeshStandardMaterial({ color: 0x7fc8e8, transparent: true, opacity: 0.45, roughness: 0.1 })); glass.position.y = 0.75; tank.add(glass); const stand = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.4, 0.55), std(0x4a3328)); stand.position.y = 0.2; tank.add(stand); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), std([0xff7a2a, 0xffd23c, 0xff4d6d][i], { emissive: 0x331100 })); f.rotation.z = Math.PI / 2; f.position.set(-0.3 + i * 0.3, 0.65 + (i % 2) * 0.15, 0); f.userData.fish = { x0: f.position.x, ph: i * 2 }; tank.add(f); this.decorFish = this.decorFish || []; this.decorFish.push(f); } tank.position.set(w / 2 + 0.55, 0, d / 2 - 0.9); tank.rotation.y = -Math.PI / 2; g.add(tank); }
    if (has('gach-hoa')) { let i = 0; for (const t of floor.children) { if (!t.isGroup && !t.isMesh) continue; if (t.geometry?.type === 'BoxGeometry') continue; const x = Math.round(t.position.x * 2), z = Math.round(t.position.z * 2); if (((x + z) / 2) % 2 === 0) t.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(0.85, 0.72, 0.62)); } }); i++; } }
    if (has('tuong-vang')) for (const t of wall.children) t.traverse((m) => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.set(0xe3b547); } });
    this.scene.add(g);
  }
  clearAll() { this.decorFish = []; for (const o of [...this.scene.children]) if (o !== this.lights) this.scene.remove(o); this.stationMeshes.clear(); this.hitboxes.length = 0; this.dyn.clear(); this.steam.length = 0; this._handKey = null; this.labels.domElement.replaceChildren(); }

  // ---------- dựng ----------
  build(world, opts = {}) {
    this.shelfCard = !!opts.shelfCard;   // chế độ card: kệ chỉ có tên + 1 ô chạm cả kệ
    this.kitchenSize = world.kitchen.size; this.fitCamera();
    const { w, d } = world.kitchen.size; const L = this.lib;
    // sàn gạch: mỗi ô 1 m một tile clone (ít ô nên clone thẳng)
    const floor = new THREE.Group();
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) { const t = clone(L.station.floor); t.position.set(x - w / 2 + 0.5, 0, z - d / 2 + 0.5); t.traverse((m) => { if (m.isMesh) m.castShadow = false; }); floor.add(t); }
    // nền tối bao quanh ("đế" mô hình đồ chơi) — một stop tối hơn sàn
    const base = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.3, d + 1.2), new THREE.MeshStandardMaterial({ color: 0x4a3328, roughness: 1 })); base.position.y = -0.17; base.receiveShadow = true; floor.add(base);
    this.scene.add(floor);
    // tường sau + 2 tường bên thấp
    const wall = new THREE.Group();
    for (let x = 0; x < w; x++) { const t = clone(L.station.wall); t.position.set(x - w / 2 + 0.5, 0, -d / 2 - 0.06); wall.add(t); }
    for (const sx of [-1, 1]) for (let z = 0; z < d; z++) { const t = clone(L.station.wall); t.scale.set(1, 0.55, 1); t.rotation.y = sx * Math.PI / 2; t.position.set(sx * (w / 2 + 0.06), 0, z - d / 2 + 0.5); wall.add(t); }
    this.scene.add(wall);
    this.buildDecor(opts.decor || [], w, d, floor, wall);
    for (const s of world.stations) this.buildStation(s);
    // đầu bếp
    this.chef = shadows(SkeletonUtils.clone(L.chef)); this.chef.traverse((m) => { if (m.isSkinnedMesh) m.frustumCulled = false; }); this.scene.add(this.chef);
    // animation: mixer + một action cho mỗi clip; đổi trạng thái bằng crossfade
    this.mixer = new THREE.AnimationMixer(this.chef); this.actions = {}; this.anim = null;
    for (const clip of L.chefClips) { const a = this.mixer.clipAction(clip); a.setLoop(THREE.LoopRepeat, Infinity); a.enabled = true; this.actions[clip.name] = a; }
    // đồ cầm gắn vào xương Carry (trước bụng), giữ hướng thẳng ở tư thế nghỉ
    const carry = this.chef.getObjectByName('Carry');
    this.handItems = new THREE.Group();
    if (carry) { this.chef.updateMatrixWorld(true); const q = new THREE.Quaternion(); carry.getWorldQuaternion(q); this.handItems.quaternion.copy(q).invert(); carry.add(this.handItems); }
    else { this.handItems.position.set(0, 0.85, 0.42); this.chef.add(this.handItems); }
    this.handLabel = lbl('', 'hand'); this.handLabel.position.set(0, 2.05, 0); this.chef.add(this.handLabel);
    // khói cho nồi và bếp
    for (const s of world.stations) if (s.type === 'pot' || s.type === 'stove') this.addSteam(s.x, s.type === 'pot' ? 1.45 : 1.6, s.z, s.type === 'stove' ? 0.45 : 0.32);
  }
  buildStation(s) {
    const L = this.lib; const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.userData.id = s.id;
    const dyn = { group: g }; const edge = this.kitchenSize.w / 2 - 1.2;
    const side = s.x > edge ? 1 : s.x < -edge ? -1 : 0;   // kệ bên phải/trái quay mặt vào giữa
    if (s.type === 'serve') return;   // không còn quầy giao: bưng tô ra thẳng bàn khách
    const model = L.station[s.type] || (s.type === 'burner' ? L.station.stove : s.type === 'prep' ? L.station.counter : s.type === 'microwave' ? L.station.pot : null); if (!model) return;
    const m = clone(model);
    if (s.type === 'burner') {   // lò: 2 bếp = 2 model bếp thu nhỏ đặt cạnh nhau
      m.scale.set(s.w / 2 * 0.95, 0.85, s.d); m.position.x = -s.w / 4; const m2 = clone(model); m2.scale.copy(m.scale); m2.position.x = s.w / 4; g.add(m2);
      dyn.burners = [];
      for (let i = 0; i < (s.burners || 2); i++) { const x = -s.w / 4 + i * s.w / 2; const hit = hitbox(s.w * 0.36, 1.6, s.d + 0.1); hit.position.set(x, 0.8, 0); hit.userData.id = `${s.id}:${i}`; g.add(hit); this.hitboxes.push(hit); const sg = new THREE.Group(); sg.position.set(x, 0, 0); g.add(sg); dyn.burners.push(sg); }
      // kệ nước (giữa 2 bếp, phía trên): các phần đã đun xong xếp chồng — chạm để lấy phần đang cần
      const rh = hitbox(s.w * 0.26, 1.6, s.d + 0.1); rh.position.set(0, 1.1, 0); rh.userData.id = `${s.id}:ready`; g.add(rh); this.hitboxes.push(rh);
      dyn.ready = new THREE.Group(); dyn.ready.position.set(0, 0, 0); g.add(dyn.ready);
    }
    if (s.type === 'shelf' || s.type === 'counter' || s.type === 'serve') {
      if (side) { m.rotation.y = -side * Math.PI / 2; m.scale.set(s.d, 1, s.w); } else m.scale.set(s.w, 1, s.d);
    }
    if (s.type === 'pot') m.scale.set(s.w / 1.4, 1, 1);   // model nồi chuẩn 1.4 m
    if (s.type === 'microwave') { m.scale.set(s.w / 1.4, 0.75, s.d / 1.0); }
    if (s.type === 'prep' && s.onTable) {   // thớt nằm trên mặt thớt trắng của tủ topping: 2 tấm thớt gỗ dọc theo tủ, chạm riêng
      dyn.boards = []; dyn.boardPos = []; const along = side ? 'z' : 'x', across = side ? 'x' : 'z'; const L = side ? s.d : s.w, Dp = side ? s.w : s.d; const back = side ? side : -1; const n = s.boards || 2; const pitch = L / n;
      for (let i = 0; i < n; i++) {
        const a = -L / 2 + pitch * (i + 0.5), c = -back * Dp * 0.27;
        const board = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? pitch * 0.6 : Dp * 0.36, 0.035, along === 'x' ? Dp * 0.36 : pitch * 0.6), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.9 })); board.position.y = 0.9; board.position[along] = a; board.position[across] = c; board.castShadow = board.receiveShadow = true; g.add(board);
        const hit = hitbox(along === 'x' ? pitch : Dp * 0.5, 0.7, along === 'x' ? Dp * 0.5 : pitch); hit.position.y = 1.1; hit.position[along] = a; hit.position[across] = c; hit.userData.id = `${s.id}:${i}`; g.add(hit); this.hitboxes.push(hit);
        const sg = new THREE.Group(); sg.position.y = 0; sg.position[along] = a; sg.position[across] = c; g.add(sg); dyn.boards.push(sg); dyn.boardPos.push({ x: sg.position.x, z: sg.position.z });
      }
    } else if (s.type === 'prep') {   // thớt rời: mặt quầy + 2 ô thớt (chạm riêng)
      m.scale.set(s.w, 1, s.d); dyn.boards = []; dyn.boardPos = []; const n = s.boards || 2; const pitch = s.w / n;
      for (let i = 0; i < n; i++) { const x = -s.w / 2 + pitch * (i + 0.5); const board = new THREE.Mesh(new THREE.BoxGeometry(pitch * 0.7, 0.04, s.d * 0.6), new THREE.MeshStandardMaterial({ color: 0xd8b98a, roughness: 0.9 })); board.position.set(x, 0.93, 0); board.receiveShadow = true; g.add(board);
        const hit = hitbox(pitch, 0.9, s.d + 0.1); hit.position.set(x, 1.1, 0); hit.userData.id = `${s.id}:${i}`; g.add(hit); this.hitboxes.push(hit); const sg = new THREE.Group(); sg.position.set(x, 0, 0); g.add(sg); dyn.boards.push(sg); dyn.boardPos.push({ x, z: 0 }); }
    }
    if (s.type === 'seat') m.rotation.y = Math.PI;   // ghế quay về phía bếp (bàn ở phía −z của ghế)
    const prepTable = s.type === 'shelf' && s.id === 'shelf-topping';   // kệ topping = tủ lạnh prep table (như tiệm Kent)
    let wellRows = null;
    if (prepTable) wellRows = this.buildPrepTable(g, s, side); else if (!(s.type === 'prep' && s.onTable)) g.add(m);
    if (s.type !== 'shelf' && s.type !== 'counter' && s.type !== 'burner' && s.type !== 'prep') {
      const top = s.type === 'stove' ? 1.7 : s.type === 'pot' ? 1.5 : s.type === 'trash' ? 0.9 : 1.0;
      const hit = hitbox((s.w || 0.7) + 0.1, top, (s.d || 0.7) + 0.1); hit.position.y = top / 2; hit.userData.id = s.id; g.add(hit); this.hitboxes.push(hit);
    }
    if (s.type === 'pot') {
      // 3 rọ sợi (trái → phải) + chồng tô nóng (phải): ô chạm riêng phía trên nồi để lấy đúng thứ mình muốn
      for (let i = 0; i < POT.noodleSlots; i++) { const h = hitbox(0.38, 0.8, 1.0); h.position.set(POT_X.noodle(i), POT_X.y(i) - 0.1, 0); h.userData.id = `${s.id}:${i}`; g.add(h); this.hitboxes.push(h); }
      const hb = hitbox(0.42, 0.8, 1.0); hb.position.set(POT_X.bowl, POT_X.y(1) - 0.1, 0); hb.userData.id = `${s.id}:bowl`; g.add(hb); this.hitboxes.push(hb);
    }
    if (s.type === 'shelf') {
      const n = s.items.length; const along = side ? 'z' : 'x'; const across = side ? 'x' : 'z'; const span = (side ? s.d : s.w) * 0.92; const pitch = span / n;
      // hai hàng so le (trước/sau), thẻ nhỏ + bóng đổ tròn dưới chân để "đứng" trên kệ
      const twoRows = n >= 4; const depth = (side ? s.w : s.d) * 0.22; const size = Math.min(wellRows ? 0.3 : 0.34, (twoRows ? pitch * 2.1 : pitch) * 0.95);
      s.items.forEach((it, i) => {
        // prep table: item nằm đúng ô khay (cột = i/2, hàng = i%2); kệ thường: so le 2 hàng
        let off = -span / 2 + pitch * (i + 0.5); const row = twoRows ? (i % 2 ? 1 : -1) : 0;
        if (wellRows) off = -wellRows.L * 0.49 + wellRows.pw * (Math.floor(i / 2) + 0.5) - (Math.floor(i / 2) >= wellRows.cols ? 0 : 0);
        const im = this.itemMesh(it, wellRows ? Math.min(0.3, wellRows.pw * 0.95) : size); im.position.y = wellRows ? 1.0 : 0.94; im.position[along] = off; im.position[across] = wellRows ? wellRows.rows[i % 2] : row * depth; if (!im.userData.billboard) im.rotation.y = i * 0.7; g.add(im);

        if (this.shelfCard) return;
        // ô chạm = đúng phần kệ của nguyên liệu đó, từ mặt kệ tới trên nhãn (0.85 → 1.45 m)
        const hit = hitbox(side ? s.w : pitch, 0.6, side ? pitch : s.d); hit.position.y = 1.15; hit.position[along] = off; hit.userData.id = `${s.id}:${it}`; g.add(hit); this.hitboxes.push(hit);
        const l = lbl(label(it), 'lbl tiny'); l.position.set(along === 'x' ? off : 0, along === 'x' && n >= 4 ? (i % 2 ? 1.5 : 1.25) : 1.25, along === 'z' ? off : 0); g.add(l);   // kệ ngang ≥ 4 món: nhãn so le cao/thấp
      });
      if (this.shelfCard) {   // một ô chạm cho cả kệ + tên kệ to (prep table: chỉ nửa sau = khoang khay; nửa trước là thớt)
        const back = side ? side : -1; const hit = wellRows ? hitbox(side ? s.w * 0.5 : s.w + 0.1, 1.5, side ? s.d + 0.1 : s.d * 0.5) : hitbox(s.w + 0.1, 1.5, s.d + 0.1); hit.position.y = 0.75; if (wellRows) hit.position[across] = back * (side ? s.w : s.d) * 0.25; hit.userData.id = s.id; g.add(hit); this.hitboxes.push(hit);
        const nm = lbl(s.label, 'lbl small'); nm.position.set(0, 1.45, 0); g.add(nm);
      } else { const nm = lbl(s.label, 'lbl shelfname'); nm.position.set(0, 0.5, side ? -s.d / 2 - 0.15 : -s.d / 2 - 0.15); g.add(nm); }
    }
    if (s.type === 'counter') {
      dyn.slots = []; const n = s.slots.length; const pitch = s.w / n;
      for (let i = 0; i < n; i++) {
        const x = -s.w / 2 + pitch * (i + 0.5); const sg = new THREE.Group(); sg.position.set(x, 0.91, 0); g.add(sg); dyn.slots.push(sg);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.36, 28), new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 1 })); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.915, 0); ring.receiveShadow = true; g.add(ring);
        const hit = hitbox(pitch, 0.7, s.d); hit.position.set(x, 1.2, 0); hit.userData.id = `${s.id}:${i}`; g.add(hit); this.hitboxes.push(hit);
      }
    }
    if (s.label && s.type !== 'shelf' && s.type !== 'seat') { const l = lbl(s.label); l.position.set(0, s.type === 'counter' || s.type === 'prep' ? 1.25 : s.type === 'stove' ? 2.05 : s.type === 'pot' ? 1.1 : 1.75, s.type === 'counter' || s.type === 'prep' ? -0.6 : s.type === 'pot' ? 0.6 : 0);
      if (s.type === 'prep' && s.onTable) { const along = side ? 'z' : 'x', across = side ? 'x' : 'z'; const L = side ? s.d : s.w, Dp = side ? s.w : s.d; const back = side ? side : -1; l.position.set(0, 1.05, 0); l.position[along] = -L / 2 + L / (s.boards || 2) * 0.5; l.position[across] = -back * Dp * 0.27; l.element.className = 'lbl tiny'; }   // "Thớt" nhỏ, đặt ngay tấm thớt đầu
      g.add(l); }   // nhãn nồi đặt thấp phía trước để không đè lên hàng rọ
    this.scene.add(g); this.stationMeshes.set(s.id, g); this.dyn.set(s.id, dyn);
  }
  addSteam(x, y, z, r) {
    const N = 14; const pos = new Float32Array(N * 3); const seeds = [];
    for (let i = 0; i < N; i++) seeds.push({ a: Math.random() * 6.28, r: Math.random() * r, t: Math.random(), s: 0.6 + Math.random() * 0.6 });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const ctx = cv.getContext('2d'); const gr = ctx.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ size: 0.55, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.45, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(geo, mat); pts.position.set(x, y, z); this.scene.add(pts); this.steam.push({ pts, seeds, pos });
  }

  pick(clientX, clientY) {
    this.ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(this.hitboxes, false);
    return hits.length ? hits[0].object.userData.id : null;
  }
  /** Nhấp nháy trạm vừa chạm. */
  pulse(targetId) { const sid = String(targetId).split(':')[0]; const g = this.stationMeshes.get(sid); if (g) g.userData.pulse = 0.35; }

  // ---------- mỗi frame ----------
  sync(world, dt) {
    if (this.decorFish) for (const f of this.decorFish) { if (!f.parent) continue; const t = performance.now() / 1000 + f.userData.fish.ph; f.position.x = f.userData.fish.x0 + Math.sin(t * 0.7) * 0.25; f.rotation.y = Math.cos(t * 0.7) > 0 ? 0 : Math.PI; }
    this.time += dt; const c = world.chef;
    this.chef.position.set(c.x, 0, c.z); this.chef.rotation.y = c.facing;
    const moving = !!c.target && c.busy <= 0 && (c.path?.length > 0);
    const t = this.time;
    // trạng thái → clip: đi (tay không / có đồ), đứng làm, đứng cầm đồ, đứng không
    const want = c.busy > 0 ? 'Work' : moving ? (c.hand.length ? 'Carry' : 'Walk') : c.hand.length ? 'CarryIdle' : 'Idle';
    this.playAnim(want, moving ? 0.12 : 0.2);
    if (this.actions.Walk && this.actions.Carry) this.actions.Walk.timeScale = this.actions.Carry.timeScale = CHEF.speed / 2.6;   // 1 chu kỳ bước ≈ 2.6 m
    this.mixer?.update(dt);
    // đồ trên tay
    const handKey = c.hand.map((h) => (typeof h === 'object' ? 'bowl:' + h.placed.length : h)).join('|') + (c.busy > 0 ? '#b' : '');
    if (this._handKey !== handKey) {
      this._handKey = handKey; clearGroup(this.handItems);
      c.hand.forEach((h, i) => { const m = typeof h === 'object' ? this.bowlMesh(h) : this.itemMesh(h, 0.4); m.position.set(-0.16 + i * 0.32, m.userData.billboard ? -0.1 : 0, 0); if (typeof h === 'object') m.scale.setScalar(0.8); this.handItems.add(m); });
      const txt = c.busy > 0 ? c.busyLabel : c.hand.map((h) => (typeof h === 'object' ? h.recipe.name : label(h))).join(' + ');
      this.handLabel.element.textContent = txt; this.handLabel.element.style.display = txt ? '' : 'none';
    }
    // trạm
    for (const s of world.stations) {
      const dyn = this.dyn.get(s.id); if (!dyn) continue; const g = dyn.group;
      if (g.userData.pulse > 0) { g.userData.pulse -= dt; const k = 1 + Math.sin(Math.max(0, g.userData.pulse) / 0.35 * Math.PI) * 0.06; g.scale.setScalar(k); } else g.scale.setScalar(1);
      dyn.timers ??= [];
      // mỗi việc một vòng tròn; nồi: sợi theo rọ 0..2, tô gộp thành một chồng có số lượng
      let vis;
      if (s.type === 'pot') {
        vis = [];
        for (let i = 0; i < POT.noodleSlots; i++) {
          const j = s.jobs.find((x) => x.kind === 'noodle' && x.slot === i);
          vis.push(j ? { x: POT_X.noodle(i), y: POT_X.y(i), sm: true, p: 1 - j.left / j.total, done: j.left <= 0, bad: j.spoiled, hold: j.spoiled ? 1 : Math.min(1, (j.hold || 0) / POT.noodleSpoilAfter), text: j.spoiled ? '✖' : j.left <= 0 ? '✓' : (D.actions[j.action]?.icon || '⏱') }
                     : { x: POT_X.noodle(i), y: POT_X.y(i), sm: true, p: 0, empty: true, text: '' });   // rọ trống: vòng mờ để biết chỗ chạm
        }
        const bowls = s.jobs.filter((j) => j.kind === 'bowl'); const ready = bowls.filter((j) => j.left <= 0).length; const cooking = bowls.find((j) => j.left > 0);
        vis.push(bowls.length ? { x: POT_X.bowl, y: POT_X.y(1), sm: true, p: cooking ? 1 - cooking.left / cooking.total : 1, done: ready > 0, text: ready ? `${ready}` : '🥣', badge: ready > 0 }
                              : { x: POT_X.bowl, y: POT_X.y(1), sm: true, p: 0, empty: true, text: '🥣', bowlSlot: true });
      } else if (s.type === 'prep') {
        vis = s.slots.map((b, i) => b ? { x: dyn.boardPos[i].x, z: dyn.boardPos[i].z, y: 1.9, sm: true, p: b.left === null ? 0 : 1 - b.left / b.total, done: b.left === 0, text: b.left === 0 ? '✓' : b.left === null ? `${b.have.filter(Boolean).length}/${b.have.length}` : '🔪', badge: b.left === null } : null).filter(Boolean);
      } else if (s.type === 'burner') {
        vis = s.slots.map((b, i) => b ? { x: -s.w / 4 + i * s.w / 2, y: 2.3, p: 1 - b.left / b.total, done: b.left <= 0, text: b.left <= 0 ? '✓' : '♨️' } : null).filter(Boolean);
        vis.push(s.ready.length ? { x: 0, y: 2.6, sm: true, p: 1, done: true, text: `${s.ready.length}`, badge: true } : { x: 0, y: 2.6, sm: true, p: 0, empty: true, text: '🍲' });
      } else vis = s.jobs.map((j, i) => ({ x: -0.35 + i * 0.7, y: s.type === 'stove' ? 2.4 : 2.05, p: 1 - j.left / j.total, done: j.left <= 0, text: j.left <= 0 ? '✓' : (D.actions[j.action]?.icon || '⏱') }));
      while (dyn.timers.length < vis.length) { const el = document.createElement('div'); el.className = 'timer'; const o = new CSS2DObject(el); g.add(o); dyn.timers.push(o); }
      dyn.timers.forEach((o, i) => { const v = vis[i]; if (!v) { o.visible = false; return; } o.visible = true; o.position.set(v.x, v.y, v.z || 0); o.element.style.setProperty('--p', `${Math.round(v.p * 100)}%`); o.element.style.setProperty('--h', `${Math.round((v.hold || 0) * 100)}%`); o.element.className = `timer${v.sm ? ' sm' : ''}${v.empty ? ' empty' : ''}${v.done ? ' done' : ''}${v.bad ? ' bad' : ''}${v.badge ? ' stack' : ''}${v.hold ? ' aging' : ''}`; o.element.textContent = v.text; });
      const qi = c.queue.findIndex((q) => q === s.id || q.startsWith(s.id + ':')); const isTarget = c.target === s.id || (c.target || '').startsWith(s.id + ':');
      if (qi >= 0 || isTarget) { if (!dyn.qnum) { const el = document.createElement('div'); el.className = 'qnum'; dyn.qnum = new CSS2DObject(el); dyn.qnum.position.set(0, 2.45, 0); g.add(dyn.qnum); } dyn.qnum.visible = true; dyn.qnum.element.textContent = isTarget ? '▶' : String(qi + 1); dyn.qnum.element.classList.toggle('now', isTarget); }
      else if (dyn.qnum) dyn.qnum.visible = false;
      if (dyn.boards) s.slots.forEach((b, i) => { const sg = dyn.boards[i]; const key = b ? `${b.output}:${b.have.filter(Boolean).length}` : ''; if (sg.userData.key === key) return; sg.userData.key = key; clearGroup(sg); if (b) { const l = lbl(b.left === null ? `${b.name}: thiếu ${b.tf.inputs.filter((_, k) => !b.have[k]).map(label).join(', ')}` : b.name, 'lbl tiny'); l.position.set(0, 1.45, 0.3); sg.add(l); } });
      if (dyn.ready) { const key = s.ready.map((b) => b.output).join(','); if (dyn.ready.userData.key !== key) { dyn.ready.userData.key = key; clearGroup(dyn.ready); if (s.ready.length) { const cnt = {}; for (const b of s.ready) cnt[b.name] = (cnt[b.name] || 0) + 1; const l = lbl(Object.entries(cnt).map(([n, k]) => `${n.replace(/^Nước /, '')}${k > 1 ? ' ×' + k : ''}`).join(' · '), 'lbl tiny'); l.position.set(0, 0.95, 0.75); dyn.ready.add(l); s.ready.slice(0, 4).forEach((b, k) => { const m = this.itemMesh(b.output, 0.34); m.position.set(-0.18 + k * 0.12, 0.98 + k * 0.02, 0.15 + k * 0.05); dyn.ready.add(m); }); } } }
      if (dyn.burners) s.slots.forEach((b, i) => { const sg = dyn.burners[i]; const key = b ? b.name : ''; if (sg.userData.key === key) return; sg.userData.key = key; clearGroup(sg); if (b) { const l = lbl(b.name, 'lbl tiny'); l.position.set(0, 1.85, 0); sg.add(l); } });
      if (dyn.slots) s.slots.forEach((b, i) => { const sg = dyn.slots[i]; const key = b ? `${b.recipe.id}:${b.placed.length}:${b.done}` : ''; if (sg.userData.key === key) return; sg.userData.key = key; clearGroup(sg); if (b) { sg.add(this.bowlMesh(b)); const l = lbl(b.done ? `${b.recipe.name} ✓` : `Tiếp: ${label(b.recipe.assembly[b.placed.length])}`, 'lbl small'); l.position.set(0, 0.5, 0.55); sg.add(l); } });
    }
    // khách
    for (const cu of world.customers) {
      let v = this.dyn.get('cust:' + cu.id);
      if (!v && cu.state === 'waiting') { v = this.buildCustomer(cu); this.dyn.set('cust:' + cu.id, v); }
      if (!v) continue;
      if (cu.state !== 'waiting') { if (v.group.parent) dispose(v.group); continue; }
      const f = cu.patience / cu.maxPatience; v.bar.style.width = `${Math.max(0, f * 100)}%`; v.barWrap.className = `patience ${f < 0.25 ? 'angry' : f < 0.5 ? 'warn' : ''}`;
      v.group.position.y = f < 0.25 ? Math.abs(Math.sin(t * 12)) * 0.05 : 0;
      if (v.head) v.head.rotation.z = f < 0.5 ? Math.sin(t * (f < 0.25 ? 8 : 3)) * 0.12 : 0;
    }
    // khói
    for (const st of this.steam) { st.seeds.forEach((sd, i) => { sd.t += dt * 0.35 * sd.s; if (sd.t > 1) { sd.t = 0; sd.a = Math.random() * 6.28; sd.r = Math.random() * 0.35; } const rr = sd.r + sd.t * 0.25; st.pos[i * 3] = Math.cos(sd.a + sd.t * 2) * rr; st.pos[i * 3 + 1] = sd.t * 1.2; st.pos[i * 3 + 2] = Math.sin(sd.a + sd.t * 2) * rr; }); st.pts.geometry.attributes.position.needsUpdate = true; }
    this.renderer.render(this.scene, this.camera); this.labels.render(this.scene, this.camera);
  }
  playAnim(name, fade = 0.15) {
    const a = this.actions[name]; if (!a || this.anim === name) return;
    const prev = this.actions[this.anim]; this.anim = name;
    a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
    if (prev) prev.fadeOut(fade);
  }
  bowlMesh(b) {
    const g = new THREE.Group(); g.add(clone(this.lib.bowl));
    b.placed.forEach((tok, i) => {
      const layer = this.lib.layer[tok] || (tok.startsWith('broth:') ? this.lib.layer['broth'] : null); if (tok.startsWith('bowl-hot:')) return;   // tô = chính cái tô
      if (layer) { g.add(clone(layer)); return; }
      // chưa có lớp model riêng → viên nhỏ màu theo nguyên liệu, xếp vòng
      const col = FALLBACK_COLOR[tok] || 0xc9a27a; const a = i * 2.1;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
      m.position.set(Math.cos(a) * 0.12, 0.25, Math.sin(a) * 0.12); m.castShadow = true; g.add(m);
    });
    return g;
  }
  buildCustomer(cu) {
    const s = cu.seat.station; const g = new THREE.Group(); g.position.set(s.x, 0.02, s.z + 0.05);
    const m = clone(this.lib.customer[cu.type] || this.lib.customer.office); m.rotation.y = Math.PI; g.add(m);
    const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = `${D.recipes[cu.dish].name}`; const bo = new CSS2DObject(bubble); bo.position.set(0, 2.05, 0); g.add(bo);
    const barWrap = document.createElement('div'); barWrap.className = 'patience'; const bar = document.createElement('div'); barWrap.appendChild(bar); const po = new CSS2DObject(barWrap); po.position.set(0, 1.7, 0); g.add(po);
    this.scene.add(g); return { group: g, bar, barWrap, head: m.getObjectByName(`Customer_${cu.type}_Head`) };
  }
  reset() {
    for (const [k, v] of this.dyn) if (k.startsWith('cust:') && v.group) dispose(v.group);
    for (const k of [...this.dyn.keys()]) if (k.startsWith('cust:')) this.dyn.delete(k);
    for (const [, v] of this.dyn) { v.slots?.forEach((sg) => { clearGroup(sg); sg.userData.key = null; }); v.timers?.forEach((o) => { o.visible = false; }); if (v.qnum) v.qnum.visible = false; }
    clearGroup(this.handItems); this._handKey = null;
  }
}
