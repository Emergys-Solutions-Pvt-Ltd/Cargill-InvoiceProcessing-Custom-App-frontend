import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ENVIRONMENT picks the variable set (src/config/env.js): DEV -> VITE_*_DEV, STAGE -> VITE_*_STG, PROD/empty -> VITE_*
const ENVIRONMENTS = ['DEV', 'DEVELOPMENT', 'STAGE', 'STG', 'STAGING', 'PROD', 'PRD', 'PRODUCTION']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const environment = String(env.ENVIRONMENT || '').trim().toUpperCase()
  if (environment && !ENVIRONMENTS.includes(environment)) {
    throw new Error(`ENVIRONMENT must be DEV, STAGE or PROD (got "${env.ENVIRONMENT}")`)
  }

  return {
    plugins: [react(), tailwindcss()],
    // VITE_* plus ENVIRONMENT reach import.meta.env (src/config/env.js)
    envPrefix: ['VITE_', 'ENVIRONMENT'],
    server: {
      proxy: {
        // Forward API calls (and signed PDF links) to the Express backend
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
      },
    },
  }
})
