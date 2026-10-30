import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the project at /despertares/; dev stays at the root.
  base: command === 'build' ? '/despertares/' : '/',
  // Bind all interfaces so both http://localhost and http://127.0.0.1 work (IPv4 and IPv6).
  server: { host: true, port: 5173, strictPort: true },
}))
