import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import Inspector from 'vite-plugin-vue-inspector';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [
      vue(),
      Inspector(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          // Only precache files in build, not in development
          globPatterns: isBuild ? ['**/*.{js,css,html,ico,png,svg}'] : [],
          // Runtime caching for external resources
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/www\.gstatic\.com\/firebasejs\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'firebase-js-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Vue PWA with Push Notifications',
          short_name: 'VuePWA',
          description: 'A Vue.js PWA capable of receiving push notifications.',
          theme_color: '#42b883',
          icons: [
            {
              src: 'manifest-icon-192.maskable.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'manifest-icon-512.maskable.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'manifest-icon-512.maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          start_url: '.',
          display: 'standalone',
          background_color: '#ffffff'
        }
      })
    ]
  };
});
