/**
 * Movement/physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Kept separate from arena.ts, which is pure geometry/scale.
 */

/** x/z ground movement speed, px/s. */
export const MOVE_SPEED = 220;

/** "Low gravity" jump — floaty arc, generous hang time. px/s². */
export const GRAVITY = 600;
/** Initial upward velocity on jump, px/s. */
export const JUMP_VELOCITY = 380;
