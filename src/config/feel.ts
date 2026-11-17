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
export const CUTIN_SPEEDLINE_COUNT = 14;
/** Portrait slides in from off-screen over this share of the cut-in. */
export const CUTIN_SLIDE_FRACTION = 0.3;
/** Portrait's resting x as a share of the screen width (left striker;
 * mirrored for the right). */
export const CUTIN_PORTRAIT_X = 0.28;
export const CUTIN_NAME_SCALE = 4;
export const CUTIN_TITLE_SCALE = 3;
/** Band edge + caption come from the striker's element (config/elements.ts);
 * the super move uses this caption instead, at full level. */
export const CUTIN_SUPER_TITLE = 'SÜPER HAREKET!';
export const CUTIN_LEVEL_SCALE = 2;
/** Rövaşata cut-in caption (air super). */
export const BICYCLE_TITLE = 'RÖVAŞATA!';
/** Combo popup above the player ("FALSO!"). */
export const FALSO_TEXT = 'FALSO!';
export const FALSO_TEXT_COLOR = 0x7cff9a;
export const POPUP_TEXT_SCALE = 3;
export const POPUP_RISE_PX = 34;
export const POPUP_MS = 700;
export const CUTIN_DEPTH = 30000;

/** Goal celebration (M6.4): a slanted name band ("GOL!" + scorer) plays on
 * every goal during the kickoff lock; power goals (shot level ≥
 * REPLAY_MIN_LEVEL) first get a slow-motion replay of the last
 * REPLAY_BUFFER_SECONDS. Gameplay stays frozen the whole time. */
export const GOAL_BAND_SECONDS = 1.6;
export const GOAL_BAND_HEIGHT = 130;
export const GOAL_BAND_SLANT = 40;
export const GOAL_BAND_COLOR = 0x101018;
export const GOAL_BAND_ALPHA = 0.85;
export const GOAL_TITLE = 'GOL!';
export const GOAL_TITLE_SCALE = 8;
export const GOAL_NAME_SCALE = 3;
/** Band edge / title colour for a normal goal (power goals use the
 * scorer's element colour at that level). */
export const GOAL_EDGE_COLOR = 0xffe066;
/** Share of the band time spent sliding in / fading out. */
export const GOAL_BAND_SLIDE_FRACTION = 0.2;
/** "GOL!" pops from this scale factor to 1. */
export const GOAL_TITLE_POP = 1.6;
export const GOAL_BAND_DEPTH = 30500;

/** Replay buffer length (real seconds of play kept) and playback speed. */
export const REPLAY_BUFFER_SECONDS = 1.3;
export const REPLAY_SPEED = 0.35;
/** Playback starts this long before the last strike (if buffered). */
export const REPLAY_LEAD_SECONDS = 0.25;
export const REPLAY_MIN_LEVEL = 1;
/** Letterbox bars + caption while the replay plays. */
export const REPLAY_BAR_HEIGHT = 44;
export const REPLAY_BAR_COLOR = 0x000000;
export const REPLAY_LABEL = 'TEKRAR';
export const REPLAY_LABEL_SCALE = 3;
export const REPLAY_LABEL_COLOR = 0xff5a4a;
/** Caption blink period (ms). */
export const REPLAY_LABEL_BLINK_MS = 400;
export const REPLAY_DEPTH = 30400;
