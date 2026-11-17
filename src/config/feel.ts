/**
 * Game feel (M6.4, CLAUDE.md §5 "His"): hitstop, light screen shake and the
 * power-shot portrait cut-in. Frame counts are at 60 FPS; the scene converts
 * them to seconds so a 120 Hz screen freezes for the same real time.
 */
export const FEEL_FRAME_SECONDS = 1 / 60;
/** Float slack so N frames of 1/60 s freeze exactly N updates. */
export const FEEL_EPSILON = 1e-6;

/** Hitstop length per impact kind, in frames. */
export const HITSTOP_FRAMES = {
  normal: 4,
  power: 8,
  clash: 12,
} as const;
export type ImpactKind = keyof typeof HITSTOP_FRAMES;

/** Light shake only (the camera never moves otherwise — CLAUDE.md §10).
 * Intensity is a fraction of the view size (0.003 × 960 ≈ 3 px). Normal
 * shots don't shake. */
export const SHAKE = {
  normal: { durationMs: 0, intensity: 0 },
  power: { durationMs: 140, intensity: 0.004 },
  clash: { durationMs: 180, intensity: 0.006 },
} as const;

/** Tsubasa-style portrait cut-in before a power shot (or super). The game
 * is frozen for the whole cut-in, then the power hitstop + shake play. */
export const CUTIN_SECONDS = 0.5;
/** Portrait art is 40×40 sprite px — drawn at this scale. */
export const CUTIN_PORTRAIT_SCALE = 4;
/** Slanted band across the screen behind the portrait. */
export const CUTIN_BAND_HEIGHT = 190;
export const CUTIN_BAND_SLANT = 60;
export const CUTIN_BAND_COLOR = 0x101018;
export const CUTIN_BAND_ALPHA = 0.88;
/** Band edge colour per power level (1 yellow, 2 orange flame, 3 white-blue). */
export const CUTIN_EDGE_COLORS = [0xffffff, 0xffd84a, 0xff8a2a, 0x9fdcff];
export const CUTIN_SPEEDLINE_COUNT = 14;
/** Portrait slides in from off-screen over this share of the cut-in. */
export const CUTIN_SLIDE_FRACTION = 0.3;
/** Portrait's resting x as a share of the screen width (left striker;
 * mirrored for the right). */
export const CUTIN_PORTRAIT_X = 0.28;
export const CUTIN_NAME_SCALE = 4;
export const CUTIN_TITLE_SCALE = 3;
/** Cut-in caption per power level (index = level; 4 = super). */
export const CUTIN_TITLES = ['', 'POWER ŞUT!', 'ALEV ŞUT!', 'YILDIRIM ŞUT!', 'SÜPER HAREKET!'];
export const CUTIN_DEPTH = 30000;
