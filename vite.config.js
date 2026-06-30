import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pad = (n) => String(n).padStart(2, '0')
const now = new Date()
const version = `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    open: true
  }
})
