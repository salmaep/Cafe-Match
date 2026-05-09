import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@shared` → repo-root `shared/` folder shared with `client-mobile/`.
    // Vite bundles imported files into static output at build time, so
    // there's no runtime dependency on this folder layout.
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 3083,
    proxy: {
      '/api': {
        target: 'http://localhost:3084',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3084',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3083,
    allowedHosts: ['salma.imola.ai'],
  },
})
