import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
