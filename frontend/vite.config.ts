import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Empty prefix also exposes non-VITE_ vars (incl. the process environment)
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          // Overridden in docker-compose, where the backend is reachable as "backend"
          target: env.API_PROXY_TARGET || 'http://localhost:8000',
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
