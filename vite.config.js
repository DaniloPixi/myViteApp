import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import Inspector from 'vite-plugin-vue-inspector';

export default defineConfig({
  plugins: [
    vue(),
    Inspector(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,

      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      injectManifest: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },

      manifest: {
        name: 'Grus Corner',
        short_name: 'GrusCorner',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          {
            src: '/icons/manifest-icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/manifest-icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/manifest-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/manifest-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
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