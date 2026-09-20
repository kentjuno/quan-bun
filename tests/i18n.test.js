// P1 i18n — nghiệm thu (docs/PLAN-PUBLIC.md P1): lint = 0, không key thô, vi ⊆ en, giải nghĩa đủ cho mọi món/nguyên liệu.
import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { lint } from '../scripts/i18n_lint.mjs';
import vi from '../src/data/i18n/vi.json';
import en from '../src/data/i18n/en.json';
import items from '../src/data/i18n/items.json';
import { t, tl, setLang, gloss } from '../src/i18n.js';
import { D, label, labelL, dishLabel } from '../src/game/recipes.js';
import { WORLDS } from '../src/config.js';
import { REGULARS, lineFor, recapLine } from '../src/data/customers.js';

const ROOT = join(import.meta.dirname, '..');
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|html)$/.test(f)) out.push(p); } return out; };
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

describe('i18n', () => {
  beforeEach(() => setLang('vi'));

  test('lint: không còn chuỗi tiếng Việt ngoài i18n', () => {
    const hits = lint({ root: ROOT });
    expect(hits.map((h) => `${h.file}:${h.line} ${h.text}`)).toEqual([]);
  });

  test('mọi key t()/T() viết thẳng trong src đều có trong vi.json', () => {
    const used = new Set();
    for (const p of [...walk(join(ROOT, 'src')), join(ROOT, 'index.html')]) {
      if (p.endsWith('i18n.js')) continue;   // doc comment có ví dụ data-i18n="key"
      const src = readFileSync(p, 'utf8');
      for (const m of src.matchAll(/(?<![\w.])[tT]\(\s*'([\w.-]+)'/g)) used.add(m[1]);
      for (const m of src.matchAll(/data-i18n(?:-html|-title)?="([\w.-]+)"/g)) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !(k in vi));
    expect(missing).toEqual([]);
  });

  test('vi ⊆ en và placeholder khớp', () => {
    const missing = Object.keys(vi).filter((k) => !(k in en));
    expect(missing).toEqual([]);
    const bad = Object.keys(vi).filter((k) => vars(vi[k]) !== vars(en[k]));
    expect(bad).toEqual([]);
  });

  test('en.json có title/new/hint cho mọi level và thoại cho mọi khách quen', () => {
    const miss = [];
    for (const w of WORLDS) {
      for (const k of ['name', 'sub']) if (!en[`world.${w.id}.${k}`]) miss.push(`world.${w.id}.${k}`);
      for (const L of w.levels) for (const k of ['title', 'new', ...(L.hint ? ['hint'] : [])]) if (!en[`level.${L.id}.${k}`]) miss.push(`level.${L.id}.${k}`);
    }
    for (const r of REGULARS) { if (!en[`cust.${r.id}.sketch`]) miss.push(`cust.${r.id}.sketch`); for (const [kind, arr] of Object.entries(r.lines)) arr.forEach((_, i) => { if (!en[`cust.${r.id}.${kind}.${i}`]) miss.push(`cust.${r.id}.${kind}.${i}`); }); }
    expect(miss).toEqual([]);
  });

  test('items.json: giải nghĩa đủ cho mọi món, nguyên liệu, hành động, nhãn trạng thái', () => {
    const miss = [];
    for (const id of Object.keys(D.items)) if (!items.items[id]?.en) miss.push(`item ${id}`);
    for (const id of Object.keys(D.actions)) if (!items.actions[id]) miss.push(`action ${id}`);
    for (const id of Object.keys(D.labels)) if (!items.labels[id]) miss.push(`label ${id}`);
    expect(miss).toEqual([]);
  });

  test('thiếu key → không bao giờ hiện key thô', () => {
    expect(t('x.missing.key')).toBe('key');
    setLang('en'); expect(t('x.missing.key')).toBe('key');
    expect(t('pov.notYet', { item: 'A', next: 'B' })).toBe('Not A yet — next: B');
  });

  test('tên món giữ tiếng Việt; EN thêm giải nghĩa, trạng thái dịch hẳn', () => {
    expect(labelL('nam')).toBe('Nạm'); expect(gloss('nam')).toBe('');
    setLang('en');
    expect(labelL('nam')).toBe('Nạm (brisket)');
    expect(dishLabel('pho-tai-nam')).toBe('Phở Tái Nạm');
    expect(dishLabel('pho-tai-nam', true)).toBe('Phở Tái Nạm (rare beef & brisket noodle soup)');
    expect(labelL('bowl-hot:pho-bowl')).toBe('Tô phở (pho bowl), scalded');
    expect(labelL('noodle-rinsed:bun')).toBe('Bún (rice vermicelli), cold-rinsed');
    expect(labelL('broth:pour-pho-broth')).toBe('Pho broth');
    expect(labelL('tray-ready')).toBe('Tray, lined');
    expect(label('nam')).toBe('Nạm');   // label() gốc không đổi (khay + test)
  });

  test('thoại khách đổi theo ngôn ngữ, cùng chỉ số', () => {
    expect(recapLine('cau-hai', true)).toBe(vi['cust.cau-hai.recap.0']);
    setLang('en'); expect(recapLine('cau-hai', true)).toBe(en['cust.cau-hai.recap.0']);
    expect(en['cust.stranger.good']).toBeUndefined();
    for (let i = 0; i < 20; i++) expect(Object.values(en).includes(lineFor({}, 'good'))).toBe(true);
    expect(tl('level.pho-1.title', 'x')).toBe(en['level.pho-1.title']);
  });
});
