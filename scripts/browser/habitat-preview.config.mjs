import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// yarn vite --config scripts/browser/habitat-preview.config.mjs
export default {
  root: fileURLToPath(new URL('../../', import.meta.url)),
  cacheDir: join(tmpdir(), 'pokemon-habitat-preview-vite-cache'),
  esbuild: { jsx: 'automatic' },
  optimizeDeps: { entries: ['scripts/browser/habitat-preview.html'] },
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
}
