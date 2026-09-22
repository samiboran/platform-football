import { defineConfig } from 'vite';

// Served from https://<user>.github.io/platform-football/ — keep base in
// sync with the repo name (see CLAUDE.md section 11: wrong base = blank Pages).
export default defineConfig({
  base: '/platform-football/',
  build: {
    outDir: 'dist',
  },
});
