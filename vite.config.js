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
        name: 'Vue PWA with Push Notifications',
        short_name: 'VuePWA',
        description: 'A Vue.js PWA capable of receiving push notifications.',
        theme_color: '#42b883',
        version: '1.1.0', // Add a version to the manifest
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
});
