// Đóng gói một file: build Vite (inline dynamic imports) rồi nhúng JS vào HTML.
// Xuất 2 bản: dist-single/index.html (chạy độc lập) và dist-single/artifact.html (nội dung không có html/head/body để đăng Artifact)
import { build } from 'vite'; import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
await build({ configFile: 'vite.config.js', build: { outDir: 'dist-single', rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } } }, logLevel: 'warn' });
let html = readFileSync('dist-single/index.html', 'utf8');
let js = readFileSync('dist-single/app.js', 'utf8');
// nhúng GLB thành data URI để trang 1 file / Artifact tự chứa model
for (const f of readdirSync('public/models').filter((x) => x.endsWith('.glb'))) {
  const b64 = readFileSync(`public/models/${f}`).toString('base64');
  js = js.split(`./models/${f}`).join(`data:model/gltf-binary;base64,${b64}`);
}
// nhúng ảnh item (PNG) cho card / ô tay
try { for (const f of readdirSync('public/icons').filter((x) => x.endsWith('.png'))) { const b64 = readFileSync(`public/icons/${f}`).toString('base64'); js = js.split(`./icons/${f}`).join(`data:image/png;base64,${b64}`); } } catch {}
js = js.replace(/<\/script>/g, '<\\/script>');
html = html.replace(/<script type="module"[^>]*src="[^"]*app\.js"[^>]*><\/script>/, () => `<script type="module">\n${js}\n</script>`);
writeFileSync('dist-single/index.html', html);
// bản Artifact: chỉ giữ phần trong <head> (title/link/style) + phần trong <body>
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>/g, '').trim();
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1].trim();
writeFileSync('dist-single/artifact.html', `${head}\n${body}\n`);
console.log('single:', (html.length / 1024).toFixed(0), 'KB; artifact:', ((head.length + body.length) / 1024).toFixed(0), 'KB');
