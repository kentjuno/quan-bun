import { readFileSync, writeFileSync } from 'node:fs';
import { QUAN, PIECES, PROVINCES } from '../src/data/regions.js';
const f = 'src/data/i18n/vi.json';
const d = JSON.parse(readFileSync(f, 'utf8'));
let n = 0;
const put = (k, v) => { if (v != null && d[k] !== v) { d[k] = v; n++; } };
for (const [id, q] of Object.entries(QUAN)) { put(`quan.${id}.name`, q.name); put(`quan.${id}.greet`, q.greet); put(`quan.${id}.dare`, q.dare); if (q.who) put(`quan.${id}.who`, q.who); if (q.call) put(`quan.${id}.call`, q.call); }
for (const [id, P] of Object.entries(PIECES)) { for (const k of ['title', 'sub', 'sign', 'signSub', 'who', 'bubble', 'call']) if (P[k]) put(`trip.${id}.${k}`, P[k]); }
for (const p of PROVINCES) { put(`prov.${p.id}.name`, p.name); put(`prov.${p.id}.sub`, p.sub); }
writeFileSync(f, JSON.stringify(d, null, 1) + '\n');
console.log('synced', n);
