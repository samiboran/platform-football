import * as S from '../config/settings';
import * as C from '../config/controls';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import { loadPref, savePref } from './prefs';
import { deviceLanguage, setLanguage } from '../i18n';

export type Settings = typeof S.DEFAULT_SETTINGS;

let cache: Settings | null = null;

function clampIndex(i: unknown, len: number, fallback: number): number {
  return typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < len ? i : fallback;
}

/** Device settings (M9.2). Unknown / broken values fall back to defaults. */
export function loadSettings(): Settings {
  if (cache) return cache;
  const d = S.DEFAULT_SETTINGS;
  let raw: Partial<Settings> = {};
  try {
    raw = JSON.parse(loadPref(S.SETTINGS_KEY) ?? '{}') ?? {};
  } catch {
    raw = {};
  }
  cache = {
    vibration: typeof raw.vibration === 'boolean' ? raw.vibration : d.vibration,
    aimLine: typeof raw.aimLine === 'boolean' ? raw.aimLine : d.aimLine,
    buttonSizeIndex: clampIndex(raw.buttonSizeIndex, S.BUTTON_SIZE_OPTIONS.length, d.buttonSizeIndex),
    buttonOpacityIndex: clampIndex(raw.buttonOpacityIndex, S.BUTTON_OPACITY_OPTIONS.length, d.buttonOpacityIndex),
    handedness: raw.handedness === 'left' || raw.handedness === 'right' ? raw.handedness : d.handedness,
    language: S.LANGUAGES_AVAILABLE.includes(raw.language as S.Language) ? (raw.language as S.Language) : deviceLanguage(),
  };
  setLanguage(cache.language);
  return cache;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  cache = { ...loadSettings(), ...patch };
  setLanguage(cache.language);
  savePref(S.SETTINGS_KEY, JSON.stringify(cache));
  return cache;
}

export function resetSettings(): Settings {
  // Reset keeps the language: a player who cannot read the other one must not get stuck in it.
  cache = { ...S.DEFAULT_SETTINGS, language: loadSettings().language };
  savePref(S.SETTINGS_KEY, JSON.stringify(cache));
  return cache;
}

/** Where the touch controls go for the current settings (game px). */
export interface TouchLayout {
  scale: number;
  alpha: number;
  leftHanded: boolean;
  /** Joystick zone: x range in game px. */
  zoneMinX: number;
  zoneMaxX: number;
  joyRestX: number;
  joyRestY: number;
  joyRadius: number;
  clusterX: number;
  clusterY: number;
  spacing: number;
  buttonRadius: number;
  actionRadius: number;
}

export function touchLayout(s: Settings = loadSettings()): TouchLayout {
  const scale = S.BUTTON_SIZE_OPTIONS[s.buttonSizeIndex].scale;
  const alpha = S.BUTTON_OPACITY_OPTIONS[s.buttonOpacityIndex].alpha;
  const leftHanded = s.handedness === 'left';
  const mirror = (x: number) => (leftHanded ? GAME_WIDTH - x : x);
  // Keep the cluster's distance from the corner proportional to its size,
  // so BÜYÜK still fits and KÜÇÜK hugs the corner.
  const clusterX = mirror(GAME_WIDTH - (GAME_WIDTH - C.BUTTON_CLUSTER_X) * scale);
  const clusterY = GAME_HEIGHT - (GAME_HEIGHT - C.BUTTON_CLUSTER_Y) * scale;
  const zoneW = GAME_WIDTH * C.JOYSTICK_ZONE_WIDTH_FRACTION;
  return {
    scale,
    alpha,
    leftHanded,
    zoneMinX: leftHanded ? GAME_WIDTH - zoneW : 0,
    zoneMaxX: leftHanded ? GAME_WIDTH : zoneW,
    joyRestX: mirror(C.JOYSTICK_REST_X * scale),
    joyRestY: GAME_HEIGHT - (GAME_HEIGHT - C.JOYSTICK_REST_Y) * scale,
    joyRadius: C.JOYSTICK_RADIUS * scale,
    clusterX,
    clusterY,
    spacing: C.BUTTON_SPACING * scale,
    buttonRadius: C.BUTTON_RADIUS * scale,
    actionRadius: C.BUTTON_ACTION_RADIUS * scale,
  };
}
