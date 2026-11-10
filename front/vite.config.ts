import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The backend has no CORS; the dev server forwards API calls (and file downloads) to it.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
