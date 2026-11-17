/**
 * Sprite animation + render tuning (M6.0 pixel-art pass). Pure presentation
 * values — gameplay timings live in power.ts / movement.ts.
 */

/** Seconds per frame of the 4-frame run cycle (run_<dir>_0..3). */
export const RUN_FRAME_SECONDS = 0.12;
/** Ground speed (px/s) above which a character plays the run cycle instead
 * of the idle facing pose. */
export const RUN_SPEED_THRESHOLD = 40;
/** Vertical bob (screen px) while running toward/away from the camera —
 * there are no front/back run frames, so a small step bob sells the motion. */
export const RUN_VERTICAL_BOB_PX = 2;

/** How long the kick pose stays up after a shot. */
export const KICK_POSE_SECONDS = 0.2;
/** How long the catch pose stays up after a catch attempt. */
export const CATCH_POSE_SECONDS = 0.35;

/** Sprite-pixel -> screen-pixel factor for the ball art (gen_sprites.py
 * draws 1 sprite pixel = 2 screen pixels). */
export const BALL_SPRITE_PIXEL_SCALE = 2;
/** Highest power aura level that has art (assets/fx/ball_power<N>.png). */
export const BALL_POWER_LEVEL_MAX = 3;
/** A powered ball loses its aura once it slows below this (px/s). */
export const BALL_AURA_MIN_SPEED = 180;

export function ballSpriteKey(level: number): string {
  return `ball_power${level}`;
}

/** Dash dust (Sami: "topla altında toz çıkararak dash"): a puff spawns at
 * the feet every DASH_DUST_INTERVAL s while dashing, drifts back against
 * the dash, grows and fades. */
export const DUST_TEXTURE_KEY = 'dust';
export const DASH_DUST_INTERVAL = 0.035;
export const DASH_DUST_LIFETIME_MS = 320;
export const DASH_DUST_SCALE_FROM = 2.4;
export const DASH_DUST_SCALE_TO = 4.2;
export const DASH_DUST_ALPHA = 0.95;
/** Drift (screen px) opposite to the dash direction over its lifetime. */
export const DASH_DUST_DRIFT = 22;
/** Random spread (screen px) around the feet. */
export const DASH_DUST_JITTER = 8;
