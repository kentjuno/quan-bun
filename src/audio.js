// Nhạc nền ambient chill + vài tiếng động nhẹ, tất cả sinh bằng WebAudio (không cần file).
// Bật sau cử chỉ đầu tiên của người chơi (chính sách autoplay). Tắt/mở bằng setMuted().
let ctx = null, master = null, musicGain = null, muted = false, started = false, timers = [];
const PENTA = [0, 2, 4, 7, 9];          // ngũ cung — hợp không khí quán Việt, không bị "sai nốt"
const ROOT = 220;                        // A3
const note = (deg, oct = 0) => ROOT * Math.pow(2, (PENTA[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  master.connect(comp).connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
  return ctx;
}
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05); try { localStorage.setItem('qb.muted', m ? '1' : '0'); } catch {} }
export function isMuted() { return muted; }
try { muted = localStorage.getItem('qb.muted') === '1'; } catch {}

// ---------- nhạc nền ----------
function pad(freq, t0, dur, vol = 0.05) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o1.type = 'triangle'; o2.type = 'sine'; o1.frequency.value = freq; o2.frequency.value = freq * 1.005; // hơi lệch → ấm
  f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.3;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.35); g.gain.linearRampToValueAtTime(0, t0 + dur);
  o1.connect(f); o2.connect(f); f.connect(g).connect(musicGain);
  o1.start(t0); o2.start(t0); o1.stop(t0 + dur + 0.1); o2.stop(t0 + dur + 0.1);
}
function pluck(freq, t0, vol = 0.09) {   // tiếng gảy mềm kiểu đàn tranh / kalimba
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t0); f.frequency.exponentialRampToValueAtTime(500, t0 + 0.6);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.6);
  o.connect(f).connect(g).connect(musicGain); o.start(t0); o.stop(t0 + 1.7);
}
function shaker(t0, vol = 0.012) {   // hơi thở nhịp rất nhẹ
  const n = ctx.createBufferSource(); const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  n.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000; const g = ctx.createGain(); g.gain.value = vol;
  n.connect(f).connect(g).connect(musicGain); n.start(t0);
}
const CHORDS = [[0, 2, 4], [3, 5, 7], [1, 3, 5], [2, 4, 6]];   // bậc ngũ cung, mỗi hợp âm 8 nhịp
// Không khí theo pha của ngày: calm (sáng/xế) · busy (giờ cao điểm: nhanh hơn, dày nốt hơn, shaker mỗi nhịp) · close (đóng cửa: chậm, thưa)
const MOODS = { calm: { bpm: 72, notes: [2, 4], rest: 0.25, shakerEvery: 2, vol: 1 }, busy: { bpm: 96, notes: [3, 6], rest: 0.1, shakerEvery: 1, vol: 1.15 }, close: { bpm: 58, notes: [1, 3], rest: 0.4, shakerEvery: 4, vol: 0.8 } };
let mood = 'calm';
export function setMood(m) { if (!MOODS[m] || m === mood) return; mood = m; if (musicGain && ctx) musicGain.gain.setTargetAtTime(0.55 * MOODS[m].vol, ctx.currentTime, 0.6); }
export function startMusic() {
  if (!ensureAudio() || started) return; started = true;
  let barIdx = 0; let nextBar = ctx.currentTime + 0.1;
  const schedule = () => {
    while (nextBar < ctx.currentTime + 2.5) {
      const M = MOODS[mood]; const beat = 60 / M.bpm, bar = beat * 4;
      const ch = CHORDS[Math.floor(barIdx / 2) % CHORDS.length];
      if (barIdx % 2 === 0) for (const deg of ch) pad(note(deg, -1), nextBar, bar * 2 + 0.5, 0.045);
      // giai điệu: số nốt / ô nhịp theo mood, chọn trong hợp âm + nốt lân cận, thỉnh thoảng nghỉ
      const n = M.notes[0] + Math.floor(Math.random() * (M.notes[1] - M.notes[0] + 1));
      for (let i = 0; i < n; i++) { if (Math.random() < M.rest) continue; const deg = ch[Math.floor(Math.random() * ch.length)] + (Math.random() < 0.3 ? 5 : 0) + (Math.random() < 0.15 ? 1 : 0); pluck(note(deg, 1), nextBar + i * (bar / n) + (Math.random() < 0.5 ? 0 : beat / 2), 0.07 + Math.random() * 0.03); }
      for (let b = 0; b < 4; b++) if ((b + 1) % M.shakerEvery === 0) shaker(nextBar + b * beat + beat / 2, mood === 'busy' ? 0.02 : 0.012);
      nextBar += bar; barIdx++;
    }
  };
  schedule(); timers.push(setInterval(schedule, 800));
}
// ---------- tiếng bếp nền: nồi sôi ục ục (noise lọc thấp + LFO), bật khi đang chơi ----------
let boilNodes = null;
export function setBoil(on, level = 1) {
  if (!ctx) return;
  if (on && !boilNodes) {
    const n = ctx.createBufferSource(); const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    n.buffer = buf; n.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 1.2;
    const g = ctx.createGain(); g.gain.value = 0; const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 2.3; const lg = ctx.createGain(); lg.gain.value = 0.02; lfo.connect(lg).connect(g.gain);
    n.connect(f).connect(g).connect(master); n.start(); lfo.start(); boilNodes = { n, g, lfo, lg };
  }
  if (boilNodes) boilNodes.g.gain.setTargetAtTime(on ? 0.045 * level : 0, ctx.currentTime, 0.4);
}
function noise(dur, vol = 0.08, hp = 1500, lp = 8000) {   // tiếng xì/xèo ngắn
  if (!ctx || muted) return; const t0 = ctx.currentTime; const n = ctx.createBufferSource(); const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  n.buffer = buf; const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = lp; const g = ctx.createGain(); g.gain.value = vol;
  n.connect(h).connect(l).connect(g).connect(master); n.start(t0);
}
export function stopMusic() { for (const t of timers) clearInterval(t); timers = []; started = false; }

// ---------- tiếng động ----------
function tone(freq, dur, type = 'sine', vol = 0.12, slide = 1) {
  if (!ctx || muted) return; const t0 = ctx.currentTime; const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
export const sfx = {
  tap() { tone(1200, 0.06, 'sine', 0.05, 0.8); },
  pick() { tone(660, 0.09, 'triangle', 0.08, 1.2); },
  drop() { tone(300, 0.14, 'sine', 0.1, 0.6); },        // thả vào nồi: "bụp"
  done() { tone(880, 0.25, 'sine', 0.07); setTimeout(() => tone(1320, 0.3, 'sine', 0.06), 90); },   // nồi xong
  place() { tone(520, 0.08, 'triangle', 0.07, 1.1); },
  serve() { [0, 120, 240].forEach((d, i) => setTimeout(() => tone([784, 988, 1175][i], 0.5, 'sine', 0.09), d)); },   // chuông 3 nốt
  mistake() { tone(180, 0.28, 'sawtooth', 0.05, 0.7); },
  arrive() { tone(1568, 0.35, 'sine', 0.05); },        // chuông cửa nhỏ
  trash() { tone(220, 0.2, 'square', 0.03, 0.5); },
  sizzle() { noise(0.9, 0.06, 2500, 9000); },             // thả vào chảo/nồi: xèo
  splash() { noise(0.25, 0.05, 600, 3000); tone(240, 0.12, 'sine', 0.05, 0.7); },   // thả sợi vào nước
  clink() { tone(2100, 0.12, 'triangle', 0.05, 0.98); setTimeout(() => tone(2600, 0.1, 'sine', 0.03), 30); },   // đặt tô: cạch
  coin() { tone(1760, 0.09, 'square', 0.03); setTimeout(() => tone(2349, 0.16, 'square', 0.03), 70); },       // tiền
  bell() { [0, 0, 160].forEach((d, i) => setTimeout(() => tone(i === 2 ? 1568 : 1046, 0.7, 'sine', 0.06), d)); },   // chuông mở cửa
  cheer() { [0, 90, 180, 270].forEach((d, i) => setTimeout(() => tone([523, 659, 784, 1046][i], 0.35, 'triangle', 0.06), d)); },   // hết ngày / sao
  chatter() { noise(0.4, 0.015, 300, 1200); },            // tiếng quán rì rào (khách nhóm)
  combo(n) { const b = 660 * Math.pow(1.19, Math.min(n, 6)); [0, 70, 140].forEach((d, i) => setTimeout(() => tone(b * [1, 1.25, 1.5][i], 0.18, 'square', 0.04), d)); },   // chuỗi: lên tông theo n
  crack() { noise(0.12, 0.08, 800, 6000); tone(140, 0.35, 'sawtooth', 0.06, 0.5); },   // vỡ chuỗi
  rush() { [0, 180, 360].forEach((d) => setTimeout(() => { tone(880, 0.12, 'square', 0.05); setTimeout(() => tone(1108, 0.12, 'square', 0.05), 80); }, d)); },   // còi cao điểm
  hum(kind) { if (kind === 'wait') tone(392, 0.18, 'sine', 0.03, 0.9); else tone(523, 0.14, 'sine', 0.03, 1.1); },   // khách lên tiếng
};
