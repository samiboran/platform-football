/**
 * Ball physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Separate from movement.ts (character tuning) and arena.ts
 * (pure geometry/scale — BALL_RADIUS lives there).
 */

/** px/s². Same order as character gravity but tuned separately — the ball
 * should feel snappier/heavier than the floaty character jump. */
export const BALL_GRAVITY = 700;
/** Fraction of vertical speed kept after each ground bounce. Lowered from an
 * earlier 0.6 — Sami found the ball too "bouncy"/hard to control after a
 * shot (it kept re-bouncing instead of settling). */
export const BALL_BOUNCE_RESTITUTION = 0.45;
/** Below this vertical speed, stop bouncing and settle on the ground. */
export const BALL_MIN_BOUNCE_VY = 40;
/** Fraction of horizontal speed kept after bouncing off a touchline/wall/
 * goal frame. Lowered from an earlier 0.7 — walls should visibly kill some
 * speed, not just mirror it, or the ball reads as "flailing" between them. */
export const BALL_WALL_RESTITUTION = 0.55;
/** px/s² deceleration while the ball is rolling on the ground. Raised from
 * an earlier 220 — the ball used to keep sliding for a long time after a
 * touch/shot instead of settling, which read as "slippery"/uncontrollable. */
export const BALL_GROUND_FRICTION = 380;
/** px/s impulse imparted when a character touches the ball (M2's simple
 * "dribble nudge" — replaced by the real shoot/hold matrix in M3). */
export const BALL_TOUCH_SPEED = 260;
/** Hard cap on the ball's total horizontal speed (px/s), applied every
 * frame after gravity/wind/bounces. Comfortably above the fastest legit
 * shot (Brezilya's süper hareket: SHOT_SPEED_NORMAL * ~0.95 * 2.0 ≈ 1180
 * at today's tuning) — this isn't meant to clip a real shot, only to stop
 * the ball from accumulating runaway speed from repeated wall bounces or
 * wind over many frames. */
export const BALL_MAX_SPEED = 1400;
