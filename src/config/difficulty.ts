/**
 * AI difficulty levels (M9.2). ORTA (normal) reproduces the pre-M9.2
 * opponent exactly — every value there equals the old constant in
 * config/opponent.ts — so existing balance isn't disturbed. KOLAY / ZOR
 * scale reaction time, aim, defending error, shot eagerness and how often
 * the AI uses the air combos (falso = jump + air dash up/down + volley,
 * rövaşata = airborne super on a high ball with a full bar).
 */

export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  id: DifficultyId;
  /** Menu label. */
  label: string;
  /** Seconds between a shot being struck and the AI reacting to it. */
  catchReactionSeconds: number;
  /** Depth error (world z) when stepping onto an incoming shot's line. */
  interceptZError: number;
  /** Chance per incoming shot that the AI's tut is a perfect parry. */
  perfectParryChance: number;
  /** Aim wobble on every AI shot (higher = less accurate). */
  aimWobble: number;
  /** How fast the AI's perceived ball position catches up (1/s). */
  trackingLerpSpeed: number;
  /** Per-touch chance to shoot instead of dribbling. */
  shotChancePerTouch: number;
  /** Gap between shot attempts while on the ball (s). */
  shotCooldownSeconds: number;
  /** Power-shot chance with 1–2 segments / with a full bar. */
  powerShotChance: number;
  powerShotChanceFullBar: number;
  /** Multiplier on the AI character's run speed. */
  speedMultiplier: number;
  /** Chance, per jump for a high ball, to air-dash up/down for a falso
   * (costs 1 energy like the human's dash; needs the energy). */
  falsoChance: number;
  /** Chance, when an aerial strike is possible with a full bar, to go for
   * the rövaşata instead of a plain volley. */
  bicycleChance: number;
  /** Multiplier on XP and gold for a match at this level. */
  rewardMultiplier: number;
  /** Badge colour on the select screen / scoreboard. */
  color: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  easy: {
    id: 'easy',
    label: 'KOLAY',
    catchReactionSeconds: 0.26,
    interceptZError: 24,
    perfectParryChance: 0.04,
    aimWobble: 0.8,
    trackingLerpSpeed: 4,
    shotChancePerTouch: 0.35,
    shotCooldownSeconds: 1.5,
    powerShotChance: 0.2,
    powerShotChanceFullBar: 0.4,
    speedMultiplier: 0.9,
    falsoChance: 0,
    bicycleChance: 0,
    rewardMultiplier: 0.75,
    color: 0x2fae5a,
  },
  normal: {
    id: 'normal',
    label: 'ORTA',
    catchReactionSeconds: 0.15,
    interceptZError: 14,
    perfectParryChance: 0.15,
    aimWobble: 0.5,
    trackingLerpSpeed: 6,
    shotChancePerTouch: 0.5,
    shotCooldownSeconds: 1.1,
    powerShotChance: 0.35,
    powerShotChanceFullBar: 0.6,
    speedMultiplier: 1,
    falsoChance: 0.3,
    bicycleChance: 0.35,
    rewardMultiplier: 1,
    color: 0xf1c40f,
  },
  hard: {
    id: 'hard',
    label: 'ZOR',
    catchReactionSeconds: 0.09,
    interceptZError: 8,
    perfectParryChance: 0.28,
    aimWobble: 0.32,
    trackingLerpSpeed: 9,
    shotChancePerTouch: 0.65,
    shotCooldownSeconds: 0.85,
    powerShotChance: 0.45,
    powerShotChanceFullBar: 0.75,
    speedMultiplier: 1.06,
    falsoChance: 0.6,
    bicycleChance: 0.7,
    rewardMultiplier: 1.35,
    color: 0xe74c3c,
  },
};

export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: DifficultyId = 'normal';
/** localStorage key of the last chosen difficulty. */
export const DIFFICULTY_PREF_KEY = 'pf.aiDifficulty';

/** AI falso: how long after leaving the ground the AI fires its air dash
 * (s). 0 = first airborne frame (Character only sets the curve side when
 * y > 0); the AI holds its volley until the dash has gone out. */
export const AI_FALSO_DASH_DELAY_SECONDS = 0;

/** Stadium-select difficulty pills (game px). */
export const DIFFICULTY_PILL_W = 108;
export const DIFFICULTY_PILL_H = 44;
export const DIFFICULTY_PILL_GAP = 8;
export const DIFFICULTY_PILL_LABEL_SCALE = 2;
/** Centre x offset of the pill row from the screen centre (between GERİ and
 * MAÇA BAŞLA). */
export const DIFFICULTY_ROW_DX = -60;
export const DIFFICULTY_UNSELECTED_ALPHA = 0.35;
/** "RAKİP" caption above the pills. */
export const DIFFICULTY_CAPTION_DY = -36;

/** Small difficulty tag under the match timer (game px below the timer's
 * top, and font scale). Hidden in the tutorial. */
export const DIFFICULTY_TAG_DY = 16;
export const DIFFICULTY_TAG_SCALE = 2;
