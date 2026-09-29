import { defineConfig } from 'vite';

// Served from https://<user>.github.io/platform-football/ — keep base in
// sync with the repo name (see CLAUDE.md section 11: wrong base = blank Pages).
export default defineConfig({
  base: '/platform-football/',
  // The project's asset pipeline already writes real art to assets/<kind>/
  // (see CLAUDE.md, assets/characters/README.md) — serve that folder as
  // Vite's static public dir instead of introducing a separate public/
  // that would duplicate the same convention.
  publicDir: 'assets',
  build: {
    outDir: 'dist',
  },
});
