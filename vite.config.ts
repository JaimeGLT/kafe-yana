import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'node:http'
import https from 'node:https'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const API_TARGET = env.VITE_BACKEND_PROXY

  const isHttps = API_TARGET.startsWith('https')
  const keepAliveAgent = isHttps
    ? new https.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 10 })
    : new http.Agent({ keepAlive: true, keepAliveMsecs: 30_000, maxSockets: 10 })

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/recharts'))        return 'vendor-charts';
            if (id.includes('node_modules/jspdf'))           return 'vendor-pdf';
            if (id.includes('node_modules/@tabler') ||
                id.includes('node_modules/lucide-react'))    return 'vendor-icons';
            if (id.includes('node_modules/@microsoft/signalr')) return 'vendor-signalr';
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router'))    return 'vendor-react';
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          agent: keepAliveAgent,
        },
        '/graphql': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          agent: keepAliveAgent,
        },
        '/hubs': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          ws: true,
        },
      },
    },
  }
})