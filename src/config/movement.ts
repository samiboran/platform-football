/**
 * Movement/physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Kept separate from arena.ts, which is pure geometry/scale.
 */

/** x/z ground movement speed, px/s. */
export const MOVE_SPEED = 220;

/** px/s² — how fast a character reaches MOVE_SPEED from a standstill.
 * Without this, ground movement was an instant velocity snap (position +=
 * input*speed*dt every frame); the ball-feel rework needs a real character
 * velocity to derive the dribble point's distance from, and instant snaps
 * also made the ball's "stop chasing you the moment you stop" look robotic. */
export const PLAYER_ACCELERATION = 1800;
/** px/s² — braking rate when input releases. Higher than acceleration on
 * purpose: a player stops faster than they speed up (matches "oyuncu daha
 * hızlı durur, top kısa mesafe ileri kayar" — the ball should visibly
 * outrun the player for an instant when they plant their feet). */
export const PLAYER_DECELERATION = 2400;
/** px/s² — rate used specifically when reversing direction (current
 * velocity and target velocity have opposite signs on an axis), distinct
 * from accelerating from a standstill. Higher than PLAYER_ACCELERATION so
 * a sharp change of direction (a real player's quick pivot) feels snappier
 * than building up speed from idle. */
export const PLAYER_TURN_SPEED = 3000;

/** "Low gravity" jump — floaty arc, generous hang time. px/s². */
export const GRAVITY = 600;
/** Initial upward velocity on jump, px/s. */
export const JUMP_VELOCITY = 380;
