/**
 * Ball physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Separate from movement.ts (character tuning) and arena.ts
 * (pure geometry/scale — BALL_RADIUS lives there).
 */

/** px/s². Same order as character gravity but tuned separately — the ball
 * should feel snappier/heavier than the floaty character jump. */
export const BALL_GRAVITY = 700;
/** Fraction of vertical speed kept after each ground bounce. */
export const BALL_BOUNCE_RESTITUTION = 0.6;
/** Below this vertical speed, stop bouncing and settle on the ground. */
export const BALL_MIN_BOUNCE_VY = 40;
/** Fraction of horizontal speed kept after bouncing off a touchline/wall. */
export const BALL_WALL_RESTITUTION = 0.7;
/** px/s² deceleration while the ball is rolling on the ground. */
export const BALL_GROUND_FRICTION = 220;
/** px/s impulse imparted when a character touches the ball (M2's simple
 * "dribble nudge" — replaced by the real shoot/hold matrix in M3). */
export const BALL_TOUCH_SPEED = 260;
