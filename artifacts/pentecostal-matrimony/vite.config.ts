import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

function syncDeployOutputs() {
  return {
    name: 'sync-deploy-outputs',
    closeBundle() {
      const out = path.resolve(import.meta.dirname, 'dist/public');
      const dirs = [
        path.resolve(import.meta.dirname, 'public'),
        path.resolve(import.meta.dirname, 'dist'),
        path.resolve(import.meta.dirname, '../../public'),
        path.resolve(import.meta.dirname, '../../dist'),
      ];
      for (const d of dirs) {
        if (d !== out) {
          try {
            fs.mkdirSync(d, { recursive: true });
            fs.cpSync(out, d, { recursive: true, force: true });
            console.log(`[Deploy Plugin] Synced build to: ${d}`);
          } catch (err) {
            console.warn(`[Deploy Plugin] Sync error for ${d}:`, err);
          }
        }
      }
    },
  };
}

const rawPort = process.env.PORT || '3000';
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    syncDeployOutputs(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
