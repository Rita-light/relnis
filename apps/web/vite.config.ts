import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // « @/ » désigne le dossier src : import { Button } from '@/shared/ui/button'
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // /api passe à l'API : une seule origine pour le navigateur (cookies, CSRF), comme Vercel en production.
    // changeOrigin: false écrit en toutes lettres : la forme courte ('/api': 'http://…') l'active.
    // L'hôte reçu par l'API reste celui du navigateur, comme l'origine vérifiée par la protection CSRF.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } },
  },
})
