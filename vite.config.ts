import { cloudflare } from '@cloudflare/vite-plugin'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, searchForWorkspaceRoot } from 'vite'

export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tailwindcss(), reactRouter()],
  resolve: { tsconfigPaths: true },
  worker: { format: 'es' },
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), '../orbis/wasm/pkg'] } },
})
