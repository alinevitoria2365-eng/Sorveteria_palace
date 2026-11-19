import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dev-entry-html',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/entry.html';
          }
          next();
        });
      },
      closeBundle() {
        const distDir = path.resolve('dist');
        const distEntry = path.join(distDir, 'entry.html');
        const distIndex = path.join(distDir, 'index.html');
        if (fs.existsSync(distEntry)) {
          fs.renameSync(distEntry, distIndex);
        }
        // Espelha build estático na raiz para GitHub Pages (branch main / root) e Live Server
        if (fs.existsSync(distIndex)) {
          fs.copyFileSync(distIndex, path.resolve('index.html'));
        }
        const distAssets = path.join(distDir, 'assets');
        const rootAssets = path.resolve('assets');
        if (fs.existsSync(distAssets)) {
          fs.rmSync(rootAssets, { recursive: true, force: true });
          fs.cpSync(distAssets, rootAssets, { recursive: true });
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: 'entry.html',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
