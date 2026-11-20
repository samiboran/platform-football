/**
 * M9.2 Ayarlar (settings) screen: options, defaults and layout.
 * Sound / music toggles live in SoundFX (keys in config/audio.ts); everything
 * else is stored here as one JSON blob per device.
 */

/** localStorage key of the settings blob (bump the suffix on a breaking change). */
export const SETTINGS_KEY = 'pf.settings.v1';

export type Handedness = 'right' | 'left';
export type { Language } from '../i18n';
import type { Language } from '../i18n';

/** Touch button size presets. Scales radius, spacing and the cluster's
 * distance from the screen corner so the biggest preset still fits. */
export const BUTTON_SIZE_OPTIONS = [
  { label: 'KÜÇÜK', scale: 0.85 },
  { label: 'ORTA', scale: 1 },
  { label: 'BÜYÜK', scale: 1.18 },
] as const;

/** Touch control opacity presets (multiplies every control alpha). */
export const BUTTON_OPACITY_OPTIONS = [
  { label: '%40', alpha: 0.4 },
  { label: '%70', alpha: 0.7 },
  { label: '%100', alpha: 1 },
] as const;

export const HANDEDNESS_LABELS: Record<Handedness, string> = {
  right: 'SAĞ EL',
  left: 'SOL EL',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  tr: 'TÜRKÇE',
  en: 'ENGLISH',
};
/** Languages the DİL row cycles through (translations: src/i18n/en.ts). */
export const LANGUAGES_AVAILABLE: Language[] = ['tr', 'en'];

export const DEFAULT_SETTINGS = {
  vibration: true,
  /** Dashed shot-direction line on the pitch (config/aim.ts). */
  aimLine: true,
  buttonSizeIndex: 1,
  buttonOpacityIndex: 2,
  handedness: 'right' as Handedness,
  /** Overridden by the device language on first launch (systems/settings.ts). */
  language: 'tr' as Language,
};

// --- Screen layout (game px) -----------------------------------------------
export const SETTINGS_TITLE = 'AYARLAR';
export const SETTINGS_ON = 'AÇIK';
export const SETTINGS_OFF = 'KAPALI';
export const SETTINGS_SOON = 'YAKINDA';
export const SETTINGS_RESET = 'VARSAYILAN';
export const SETTINGS_ROW_X = 340;
export const SETTINGS_ROW_W = 600;
export const SETTINGS_ROW_H = 44;
export const SETTINGS_ROW_GAP = 6;
export const SETTINGS_ROWS_TOP = 100;
export const SETTINGS_LABEL_SCALE = 3;
export const SETTINGS_VALUE_W = 210;
export const SETTINGS_VALUE_H = 36;
export const SETTINGS_ON_COLOR = 0x2fae5a;
export const SETTINGS_OFF_COLOR = 0x7a3a3a;
export const SETTINGS_CYCLE_COLOR = 0x2f9ae0;
export const SETTINGS_DISABLED_COLOR = 0x4a4f5a;
export const SETTINGS_RESET_COLOR = 0x34495e;
/** Short buzz when TİTREŞİM is switched on, so the player feels it. */
export const SETTINGS_VIBRATE_SAMPLE_MS = 40;

/** Live preview of the touch layout (a mini match screen). */
export const SETTINGS_PREVIEW_X = 812;
export const SETTINGS_PREVIEW_Y = 230;
/** Preview size = game size × this. */
export const SETTINGS_PREVIEW_SCALE = 0.25;
export const SETTINGS_PREVIEW_PITCH = 0x2f8a3a;
