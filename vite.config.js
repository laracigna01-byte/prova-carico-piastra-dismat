import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Il service worker usa questo elenco per memorizzare anche i chunk
    // generati da Vite e rendere completa la PWA al primo avvio offline.
    manifest: 'asset-manifest.json',
  },
})
