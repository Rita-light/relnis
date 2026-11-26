import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // « @/ » désigne le dossier src : import { Button } from '@/components/ui/button'
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // /api passe à l'API : une seule origine pour le navigateur (cookies, CSRF), comme Vercel en production.
    // Pas de changeOrigin : la protection CSRF de l'API compare l'origine à l'hôte d'origine.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
