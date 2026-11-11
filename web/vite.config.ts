import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Port 5176 so the dev server can run next to the other projects.
export default defineConfig({
  plugins: [react()],
  server: { port: 5176, strictPort: true },
  preview: { port: 4176, strictPort: true },
})
