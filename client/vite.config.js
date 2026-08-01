import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/slot-matrix/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA support so the site can be wrapped into an APK (PWABuilder).
    // Everything below must resolve under BASE, not root — start_url/scope
    // pointing at '/' is what makes PWABuilder report a scope mismatch.
    VitePWA({
      base: BASE,
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        name: 'BIT Inventory',
        short_name: 'BIT Inventory',
        description: 'BIT Consumables Inventory Management',
        id: BASE,
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#6c47ff', // --ic-purple, the .ic-tab.active brand purple
        icons: [
          { src: `${BASE}pwa-192x192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${BASE}pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${BASE}pwa-maskable-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: BASE,
})
