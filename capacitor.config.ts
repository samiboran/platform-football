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
};

export default config;
