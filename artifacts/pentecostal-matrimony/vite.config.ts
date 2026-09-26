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
      name: 'local-store-sync',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/profiles/sync' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const incoming = JSON.parse(body);
                const profiles = Array.isArray(incoming) ? incoming : (incoming.profiles || []);
                const targetPath = path.resolve(import.meta.dirname, '../../local_desktop_profiles.json');
                fs.writeFileSync(targetPath, JSON.stringify(profiles, null, 2));
                console.log('[LOCAL SYNC] Captured', profiles.length, 'profiles from desktop browser!');
              } catch (e) {
                console.error('[LOCAL SYNC ERROR]', e);
              }
              // Also forward to proxy or return 200
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, localSaved: true }));
            });
            return;
          }
          next();
        });
      },
    },
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
