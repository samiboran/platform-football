import { DEPTH_SCALE } from './arena';

/**
 * Movement/physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Kept separate from arena.ts, which is pure geometry/scale.
 */

/** x/z ground movement speed, px/s. Oturum 26: 220 → 150 after Sami found
 * walking/moving far too fast (Brezilya ran 275 px/s ≈ 4 body heights a
 * second). 150 ≈ 2 body heights/s; Brezilya 188, Kongo 120. */
export const MOVE_SPEED = 150;

/** px/s² — how fast a character reaches MOVE_SPEED from a standstill.
 * Without this, ground movement was an instant velocity snap (position +=
 * input*speed*dt every frame); the ball-feel rework needs a real character
 * velocity to derive the dribble point's distance from, and instant snaps
 * also made the ball's "stop chasing you the moment you stop" look robotic. */
// Oturum 26: lowered from 1800 — reaching full speed in ~0.17 s instead of
// ~0.1 s gives the character a little weight without feeling laggy.
export const PLAYER_ACCELERATION = 900;
/** px/s² — braking rate when input releases. Higher than acceleration on
 * purpose: a player stops faster than they speed up (matches "oyuncu daha
 * hızlı durur, top kısa mesafe ileri kayar" — the ball should visibly
 * outrun the player for an instant when they plant their feet). */
export const PLAYER_DECELERATION = 1500;
/** px/s² — rate used specifically when reversing direction (current
 * velocity and target velocity have opposite signs on an axis), distinct
 * from accelerating from a standstill. Higher than PLAYER_ACCELERATION so
 * a sharp change of direction (a real player's quick pivot) feels snappier
 * than building up speed from idle. */
export const PLAYER_TURN_SPEED = 1900;

// --- Jump (Oturum 26 rework) ------------------------------------------
// Old: one constant gravity 600 + 380 px/s launch → a symmetric 1.27 s
// arc peaking at 120 px (1.7 body heights): it shot straight up and down
// "like an arrow". New: a game-feel arc — quick takeoff, a short float at
// the apex, a slightly faster fall. ~0.9 s total, apex ~70 px (one body
// height — enough to meet a lob with the head/a volley).
/** Initial upward velocity on jump, px/s. */
export const JUMP_VELOCITY = 330;
/** Gravity while rising, px/s². */
export const GRAVITY = 780;
/** Gravity multiplier while falling (>1 = snappier landing). */
export const FALL_GRAVITY_MULTIPLIER = 1.35;
/** Near the apex (|vy| below this, px/s) gravity is reduced → hang time. */
export const APEX_HANG_SPEED = 70;
export const APEX_HANG_GRAVITY_MULTIPLIER = 0.45;

// --- Depth-axis speed (Oturum 28) ----------------------------------------
// The z axis is foreshortened on screen: 1 world z unit = DEPTH_SCALE
// (~2.3) screen px, while 1 world x unit is ~1 screen px. Moving at the same
// world speed on both axes made up/down ~2.8x faster ON SCREEN than
// left/right (measured: 133 vs 370 px/s) and bent a 45° stick input into a
// ~66° run. Fix used by 2.5D brawlers / tilted-camera games (see Okhlos
// devlog "Cameras, Pythagoras and faking it"): tune depth speed by how it
// LOOKS on screen, not by world units. Characters keep velX/velZ in
// screen-equivalent px/s and convert z with DEPTH_SPEED_FACTOR when moving.
/** On-screen vertical speed as a fraction of the same input's horizontal
 * speed. 1.0 = equal px/s. Okhlos found that under a tilted camera
 * vertical motion still *reads* slower, so don't go much below 1. */
export const DEPTH_SCREEN_SPEED_RATIO = 1.0;
/** world-z units per screen-equivalent px of depth motion. */
export const DEPTH_SPEED_FACTOR = DEPTH_SCREEN_SPEED_RATIO / DEPTH_SCALE;

/** Converts a screen-space direction (joystick / keyboard / facing, z up)
 * into a world-space velocity direction + speed scale, so a shot or dash
 * aimed 45° on the stick also travels 45° on screen at the same screen
 * speed. Feed to Ball.shoot(x, z, speed * speedScale). */
export function screenDirToWorld(dirX: number, dirZ: number): { x: number; z: number; speedScale: number } {
  const len = Math.hypot(dirX, dirZ) || 1;
  const x = dirX / len;
  const z = (dirZ / len) * DEPTH_SPEED_FACTOR;
  return { x, z, speedScale: Math.hypot(x, z) };
}
