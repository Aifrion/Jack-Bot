import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // REST endpoints (e.g. GET /api/rooms/:code) hit the game server.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // Socket.IO uses both HTTP polling + a WS upgrade, so ws: true.
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
