// M9.1 offline support — service worker settings. Read by both the build
// (vite.config.ts → tools/build/serviceWorkerPlugin.ts) and the game
// (src/systems/offline.ts). No Phaser imports here: vite.config loads it.

/** Generated worker file name, emitted at the dist root (scope = base). */
export const SW_FILENAME = 'sw.js';
/** Cache name prefix; the build appends a content hash so every deploy gets
 *  a fresh cache and the old one is deleted on activate. */
export const SW_CACHE_PREFIX = 'pf-cache-';
/** Files never precached (they are not needed offline). */
export const SW_PRECACHE_EXCLUDE: RegExp[] = [/\.map$/, /(^|\/)README\.md$/, /(^|\/)_legacy_midjourney\//];
/** Register the worker only in production builds (the dev server's HMR and
 *  a cache-first worker fight each other). */
export const SW_ENABLED_IN_DEV = false;
/** Inside the Capacitor Android app every file is already on the device
 *  (served by Capacitor's local server), so no worker is needed there. */
export const SW_ENABLED_IN_NATIVE = false;
/** How often (ms) a long-running tab asks the server for a newer worker. */
export const SW_UPDATE_CHECK_MS = 30 * 60 * 1000;
