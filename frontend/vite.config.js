import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/**',
        'assets/**',
      ],
      manifest: {
        "name": "Ironkeep",
        "short_name": "IronKeep",
        "start_url": ".",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#2b2b2b",
        "icons": [
          {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/reconnecting/,
            handler: "NetworkFirst",
            options: {
              cacheName: "html-cache"
            }
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          }
        ]
      }
    }),
  ],
  server: {
    host: '0.0.0.0',  
    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: false,
        secure: false,
      },
    },
  },
  preview: {
    allowedHosts: ['team24.cs144.org'],
  },
})
