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
export function startMusic() {
  if (!ensureAudio() || started) return; started = true;
  const bpm = 72, beat = 60 / bpm, bar = beat * 4; let barIdx = 0; let nextBar = ctx.currentTime + 0.1;
  const schedule = () => {
    while (nextBar < ctx.currentTime + 2.5) {
      const ch = CHORDS[Math.floor(barIdx / 2) % CHORDS.length];
      if (barIdx % 2 === 0) for (const deg of ch) pad(note(deg, -1), nextBar, bar * 2 + 0.5, 0.045);
      // giai điệu thưa: 2–4 nốt / ô nhịp, chọn trong hợp âm + nốt lân cận, thỉnh thoảng nghỉ
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { if (Math.random() < 0.25) continue; const deg = ch[Math.floor(Math.random() * ch.length)] + (Math.random() < 0.3 ? 5 : 0) + (Math.random() < 0.15 ? 1 : 0); pluck(note(deg, 1), nextBar + i * (bar / n) + (Math.random() < 0.5 ? 0 : beat / 2), 0.07 + Math.random() * 0.03); }
      for (let b = 0; b < 4; b++) if (b % 2 === 1) shaker(nextBar + b * beat + beat / 2);
      nextBar += bar; barIdx++;
    }
  };
  schedule(); timers.push(setInterval(schedule, 800));
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
};
