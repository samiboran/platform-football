import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { serviceWorkerPlugin } from './tools/build/serviceWorkerPlugin';

// Single version source (src/config/version.ts).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Served from https://<user>.github.io/platform-football/ — keep base in
// sync with the repo name (see CLAUDE.md section 11: wrong base = blank Pages).
export default defineConfig({
  base: '/platform-football/',
  // The project's asset pipeline already writes real art to assets/<kind>/
  // (see CLAUDE.md, assets/characters/README.md) — serve that folder as
  // Vite's static public dir instead of introducing a separate public/
  // that would duplicate the same convention.
  publicDir: 'assets',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [serviceWorkerPlugin()],
  build: {
    outDir: 'dist',
  },
});
