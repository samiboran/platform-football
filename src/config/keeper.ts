/**
 * Minimal AI goalkeeper tuning. There's no second human player yet, so the
 * opponent goal needs *something* defending it to make the shoot/hold
 * matrix (CLAUDE.md section 5) actually testable/playable — see
 * docs/PROGRESS.md for the scope note.
 */

/** How fast the keeper slides along the goal line (z) to track the ball. */
export const KEEPER_TRACK_SPEED = 180;
/** Stop nudging toward the target once within this z distance. Must clear
 * one frame's worth of movement at KEEPER_TRACK_SPEED (~3px at 60fps) with
 * real margin, or the keeper overshoots the deadzone every frame and
 * visibly vibrates in place instead of settling. */
export const KEEPER_MOVE_DEADZONE = 10;
/** Ball must be within this x-distance of the goal line for the keeper to
 * even attempt a catch — otherwise it's not "on target" yet. */
export const KEEPER_CATCH_RANGE_X = 90;

/** Base catch probability before the character's catchChance stat and the
 * shot-speed falloff are applied (CLAUDE.md: "dinamik... hızlı topa karşı düşer"). */
export const CATCH_BASE_CHANCE = 0.6;
/** Shot speed (px/s) at which the speed-based chance penalty saturates. */
export const CATCH_SPEED_REFERENCE = 900;
