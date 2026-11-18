// M9.1: registers the precaching service worker so the game runs offline
// after the first visit. The worker itself is generated at build time by
// tools/build/serviceWorkerPlugin.ts.
import { Capacitor } from '@capacitor/core';
import { SW_ENABLED_IN_DEV, SW_ENABLED_IN_NATIVE, SW_FILENAME, SW_UPDATE_CHECK_MS } from '../config/offline';

export function registerOfflineCache(): void {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV && !SW_ENABLED_IN_DEV) return;
  if (Capacitor.isNativePlatform() && !SW_ENABLED_IN_NATIVE) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}${SW_FILENAME}`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        // A long session (tab left open) still notices a new deploy; the new
        // worker takes over quietly and its files are used on the next launch.
        window.setInterval(() => void reg.update().catch(() => undefined), SW_UPDATE_CHECK_MS);
      })
      .catch((err) => console.warn('[offline] service worker registration failed', err));
  });
}
