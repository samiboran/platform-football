import type { CapacitorConfig } from '@capacitor/cli';

// M9.1 Android wrapper. The web game is built with a relative base
// (`npm run build:android`) into dist/, which Capacitor copies into the
// native project. Android SDK levels live in android/variables.gradle.
const config: CapacitorConfig = {
  appId: 'com.samiboran.platformfootball',
  appName: 'Platform Football',
  webDir: 'dist',
  backgroundColor: '#0b0f14',
  android: {
    // Phaser draws everything itself; no WebView overscroll glow / zoom.
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    // M9.1 safe area: edge-to-edge (Android 15+), insets reach the page as
    // env(safe-area-inset-*) / --safe-area-inset-* (index.html pads #app).
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
