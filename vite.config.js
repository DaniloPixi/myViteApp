import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import Inspector from 'vite-plugin-vue-inspector';

export default defineConfig({
  plugins: [
    vue(),
    Inspector(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      // Switch to the 'injectManifest' strategy to use our own service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Grus Corner',
        short_name: 'GrusCorner',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon.svg',
            sizes: '72x72 96x96 128x128 256x256',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        // 🔥 New: screenshots for richer install UI (Chrome, etc.)
        screenshots: [
          {
            src: '/screenshots/grus-home-narrow.png',
            sizes: '720x1280',
            type: 'image/png',
            form_factor: 'narrow',
          },
          {
            src: '/screenshots/grus-home-wide.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
      },
    }),
  ],
});
