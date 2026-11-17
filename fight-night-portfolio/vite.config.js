import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only stand-in for api/views.js (Vercel functions don't run under `vite dev`).
function devViews() {
  const db = { total: 1287, country: 'CA' };
  const pool = ['US', 'IN', 'GB', 'DE', 'CA', 'JP', 'BR', 'AU'];
  return {
    name: 'dev-views-api',
    configureServer(server) {
      server.middlewares.use('/api/views', (req, res) => {
        let body = { total: db.total, country: db.country };
        if (req.method === 'POST') {
          db.total++;
          body = { total: db.total, country: db.country };
          db.country = pool[Math.floor(Math.random() * pool.length)];
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(body));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devViews()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
