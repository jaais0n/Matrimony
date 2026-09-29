import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT || '3000';
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),

    {
      name: 'sync-dist',
      closeBundle() {
        try {
          const localDist = path.resolve(import.meta.dirname, 'dist');
          const rootDist = path.resolve(import.meta.dirname, '../../dist');
          if (localDist !== rootDist && fs.existsSync(localDist)) {
            fs.mkdirSync(rootDist, { recursive: true });
            fs.cpSync(localDist, rootDist, { recursive: true, force: true });
          }
          const rootApi = path.resolve(import.meta.dirname, '../../api');
          const distApi = path.resolve(rootDist, 'api');
          if (fs.existsSync(rootApi)) {
            fs.mkdirSync(distApi, { recursive: true });
            fs.cpSync(rootApi, distApi, { recursive: true, force: true });
          }
        } catch (e) {
          // ignore
        }
      },
    },

    {
      name: 'local-api-handler',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/')) return next();

          const originalRes = res as any;
          if (!originalRes.status) {
            originalRes.status = function (code: number) { originalRes.statusCode = code; return originalRes; };
          }
          if (!originalRes.json) {
            originalRes.json = function (data: any) {
              originalRes.setHeader('Content-Type', 'application/json');
              originalRes.end(JSON.stringify(data));
              return originalRes;
            };
          }

          const parsedUrl = new URL(req.url, 'http://localhost');
          const pathname = parsedUrl.pathname;

          try {
            if (pathname === '/api/profiles') {
              const { default: handler } = await import('../../api/profiles/index.js');
              if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  try { (req as any).body = body ? JSON.parse(body) : {}; } catch { (req as any).body = {}; }
                  (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());
                  await handler(req as any, res as any);
                });
                return;
              }
              (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());
              await handler(req as any, res as any);
              return;
            }

            if (pathname === '/api/auth/users') {
              const { default: handler } = await import('../../api/auth/users.js');
              if (req.method === 'POST' || req.method === 'DELETE') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  try { (req as any).body = body ? JSON.parse(body) : {}; } catch { (req as any).body = {}; }
                  (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());
                  await handler(req as any, res as any);
                });
                return;
              }
              (req as any).query = Object.fromEntries(parsedUrl.searchParams.entries());
              await handler(req as any, res as any);
              return;
            }

            if (pathname === '/api/status') {
              const { default: handler } = await import('../../api/status.js');
              await handler(req as any, res as any);
              return;
            }

            if (pathname === '/api/profiles/sync') {
              const { default: handler } = await import('../../api/profiles/sync.js');
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try { (req as any).body = body ? JSON.parse(body) : {}; } catch { (req as any).body = {}; }
                await handler(req as any, res as any);
              });
              return;
            }

            if (pathname === '/api/auth/register') {
              const { default: handler } = await import('../../api/auth/register.js');
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try { (req as any).body = body ? JSON.parse(body) : {}; } catch { (req as any).body = {}; }
                await handler(req as any, res as any);
              });
              return;
            }
          } catch (err: any) {
            console.error('[vite-api-error]', err);
            originalRes.status(500).json({ error: err.message });
            return;
          }

          next();
        });
      },
    },
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
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 65536,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('wouter')) return 'vendor-router';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-core';
          }
        },
      },
    },
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
        target: process.env.API_SERVER_URL || 'https://pentacostalmatrimony.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },

  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
