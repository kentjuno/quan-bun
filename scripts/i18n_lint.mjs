// i18n lint — báo mọi string literal (không phải comment) có dấu tiếng Việt ngoài src/data/i18n/ và sim-data.
// Chạy: node scripts/i18n_lint.mjs [--list]   (exit 1 nếu có vi phạm). tests/i18n.test.js gọi hàm lint().
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const VI = /[ăâđêôơưĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/;
/** File được phép chứa tiếng Việt: bảng dịch, data nguồn (tl() lấy làm nguồn vi), sim-data của quán, script/công cụ. */
const ALLOW = [/src[\\/]data[\\/]i18n[\\/]/, /sim-data/, /src[\\/]data[\\/]worlds\.js$/, /src[\\/]data[\\/]customers\.js$/, /src[\\/]data[\\/]dishes[\\/]/, /src[\\/]config\.js$/,
  // Bếp 3D bản cũ (Thêm → "Bếp thật (3D)"): không thuộc game chính, không dịch — thẻ menu ghi rõ "chỉ tiếng Việt".
  /src[\\/]game[\\/](world|par|bot|view|view\.blockout)\.js$/];
/** Dòng có `// vi-src` = chuỗi tiếng Việt là NGUỒN dữ liệu (fallback cho tl()/actName()) — được phép. */
const MARK = /\/\/\s*vi-src\b/;
// Data giữ tiếng Việt làm nguồn (PLAN-PUBLIC P1 §0): worlds.js (title/new/hint qua tl()), customers.js (thoại qua tl()).

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|mjs|html)$/.test(f)) out.push(p);
  }
  return out;
}

/** Bỏ comment JS (// và /* *\/) nhưng giữ số dòng; không đụng vào chuỗi. Template literal: `${ ... }` được coi là code (có thể chứa comment / chuỗi lồng). */
function stripJsComments(src) {
  let out = ''; let i = 0; const n = src.length;
  const stack = [];   // 'code' | '"' | "'" | '`' ; trong `${` đẩy thêm 'code'
  let q = null;       // đang trong chuỗi nào
  let depth = 0;      // độ sâu {} trong ${...} hiện tại
  const tplDepth = [];
  while (i < n) {
    const c = src[i]; const d = src[i + 1];
    if (q) {
      out += c;
      if (c === '\\') { out += d ?? ''; i += 2; continue; }
      if (q === '`' && c === '$' && d === '{') { out += d; i += 2; tplDepth.push(0); stack.push(q); q = null; continue; }
      if (c === q) q = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const seg = src.slice(i, e < 0 ? n : e + 2); out += seg.replace(/[^\n]/g, ''); i = e < 0 ? n : e + 2; continue; }
    if (tplDepth.length) {
      if (c === '{') tplDepth[tplDepth.length - 1]++;
      else if (c === '}') { if (tplDepth[tplDepth.length - 1] === 0) { tplDepth.pop(); q = stack.pop(); out += c; i++; continue; } tplDepth[tplDepth.length - 1]--; }
    }
    out += c; i++;
  }
  return out;
}

/** HTML: bỏ <style>, <!-- -->, và phần tử đã có data-i18n* (chữ bên trong sẽ bị applyDom ghi đè). Trong <script> áp luật JS. */
function stripHtml(src) {
  let s = src.replace(/<style[\s\S]*?<\/style>/g, (m) => m.replace(/[^\n]/g, ''));
  s = s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ''));
  s = s.replace(/<script[\s\S]*?<\/script>/g, (m) => stripJsComments(m));
  // dòng có data-i18n → nội dung sẽ bị thay; bỏ chữ giữa thẻ mở và thẻ đóng gần nhất
  // data-i18n-html: cả phần trong (có thẻ con) sẽ bị thay → bỏ tới thẻ đóng cùng tên gần nhất
  s = s.replace(/<([a-z0-9]+)([^>]*\bdata-i18n-html="[^"]*"[^>]*)>([\s\S]*?)<\/\1>/g, (m, tag, attrs, inner) => `<${tag}${attrs}>${inner.replace(/[^\n]/g, '')}</${tag}>`);
  s = s.replace(/<([a-z0-9]+)([^>]*\bdata-i18n="[^"]*"[^>]*)>([^<]*)/g, (m, tag, attrs, txt) => `<${tag}${attrs}>${txt.replace(/[^\n]/g, '')}`);
  s = s.replace(/<title>[^<]*<\/title>/g, (m) => m.replace(/[^\n]/g, ''));   // tên app
  s = s.replace(/<[^>]*\bdata-i18n-title="[^"]*"[^>]*>/g, (m) => m.replace(/(?<![-\w])title="[^"]*"/, 'title=""'));   // title sẽ bị applyDom thay
  return s;
}

export function lint({ root = ROOT } = {}) {
  const files = [...walk(join(root, 'src')), join(root, 'index.html')];
  const hits = [];
  for (const p of files) {
    const rel = relative(root, p);
    if (ALLOW.some((r) => r.test(rel))) continue;
    const raw = readFileSync(p, 'utf8');
    const src = p.endsWith('.html') ? stripHtml(raw) : stripJsComments(raw);
    const rawLines = raw.split('\n');
    src.split('\n').forEach((line, i) => {
      if (!VI.test(line) || MARK.test(rawLines[i] || '')) return;
      if (p.endsWith('.html') || /['"`]/.test(line)) hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 120) });
    });
  }
  return hits;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const hits = lint();
  const byFile = {};
  for (const h of hits) (byFile[h.file] ??= []).push(h);
  for (const [f, hs] of Object.entries(byFile)) {
    console.log(`${f}: ${hs.length}`);
    if (process.argv.includes('--list')) for (const h of hs) console.log(`  ${h.line}: ${h.text}`);
  }
  console.log(hits.length ? `\n${hits.length} chuỗi tiếng Việt ngoài i18n` : 'i18n lint: sạch');
  process.exit(hits.length ? 1 : 0);
}
