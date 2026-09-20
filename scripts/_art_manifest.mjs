// Quét public/art → src/data/art-manifest.json (art.js đọc). Gọi từ add_dish.mjs hoặc chạy riêng: node scripts/_art_manifest.mjs
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
export function buildArtManifest(root = ROOT) {
  const art = readdirSync(join(root, 'public', 'art'));
  const stepDir = join(root, 'public', 'art', 'step');
  const steps = existsSync(stepDir) ? readdirSync(stepDir) : [];
  const m = { _: 'SINH TỰ ĐỘNG bởi scripts/_art_manifest.mjs — đừng sửa tay. Ảnh tô theo bậc: -s0 -dry -top -wet; ảnh từng bước: step/<dish>-k<N>.webp', dishArt: [], dishTop: [], dishS0: [], steps: {} };
  const by = (suf) => art.filter((f) => f.endsWith(`-${suf}.webp`)).map((f) => f.slice(0, -(suf.length + 6)));
  const dry = new Set(by('dry')), wet = new Set(by('wet'));
  m.dishArt = [...dry].filter((d) => wet.has(d)).sort();
  m.dishTop = by('top').filter((d) => dry.has(d)).sort();
  m.dishS0 = by('s0').filter((d) => dry.has(d)).sort();
  for (const f of steps) { const mm = /^(.+)-k(\d+)\.webp$/.exec(f); if (!mm) continue; (m.steps[mm[1]] ??= []).push(+mm[2]); }
  for (const k of Object.keys(m.steps)) m.steps[k].sort((a, b) => a - b);
  m.steps = Object.fromEntries(Object.entries(m.steps).sort());
  return m;
}
export function writeArtManifest(root = ROOT) { const m = buildArtManifest(root); writeFileSync(join(root, 'src', 'data', 'art-manifest.json'), JSON.stringify(m, null, 1) + '\n'); return m; }
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { const m = writeArtManifest(); console.log(`art-manifest: ${m.dishArt.length} món có tô, ${Object.keys(m.steps).length} món có ảnh bước`); }
