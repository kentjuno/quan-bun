import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: {
    target: 'es2022', sourcemap: false,
    // Hai trang: game, và tools/zones.html (chỉnh toạ độ ô bằng mắt).
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), zones: resolve(__dirname, 'tools/zones.html') } },
  },
  test: { include: ['tests/**/*.test.js'] },
});
