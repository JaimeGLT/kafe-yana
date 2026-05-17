import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'

const API_TARGET = 'https://kafeyanaapi20260321224446-bqdjh9acame8gydt.centralus-01.azurewebsites.net/'

// Agente HTTPS con keep-alive: reutiliza la conexión TCP+TLS entre peticiones
// Esto elimina los ~400-660ms de TLS handshake por cada request en desarrollo
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 10,
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost'
      },
      '/graphql': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost'
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
})
