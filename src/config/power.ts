/**
 * Power bar + dash + shot tuning (CLAUDE.md section 5). Kept separate from
 * movement.ts (raw walk/jump) and ball.ts (passive ball physics) — this
 * file is specifically the stuff the Aksiyon/Dash/Özellik buttons spend.
 */

/** 3-segment bar (CLAUDE.md section 5). */
export const POWER_MAX_SEGMENTS = 3;
/** Passive gain (CLAUDE.md section 5, 16.11.2026): +1 whole segment every
 * this many seconds while the bar isn't full. Discrete steps, not a
 * continuous trickle — the timer pauses (and resets) while the bar is full. */
export const POWER_PASSIVE_GAIN_SECONDS = 5;
export const POWER_PASSIVE_GAIN_AMOUNT = 1;

/** Dash always costs exactly 1 energy segment, on the ground or in the air
 * (CLAUDE.md section 5, 16.11.2026 rules — replaces the old 0.25/0.35
 * fractional slice). No energy → no dash. */
export const DASH_ENERGY_COST = 1;
/** px/s burst speed and how long the burst lasts. */
export const DASH_SPEED = 380;
export const DASH_DURATION = 0.22;
/** Seconds that must pass between two dashes (measured from the start of the
 * previous dash), so a full bar can't be dumped in three instant bursts. */
export const DASH_COOLDOWN = 1.0;

/** Ball speed (px/s) on a normal Aksiyon shot — notably harder than the
 * ball ever moves under dribble control (see BALL_CONTROL_STRENGTH,
 * config/ball.ts). History: 420 (too slow, Sami) → 620 (Oturum 24: "çok
 * hızlı gidiyor, takip etmesi zor") → 480, about 2.2x MOVE_SPEED: still a
 * clear strike, but the eye can follow it across the fixed camera. */
export const SHOT_SPEED_NORMAL = 480;
/** Power şut multiplies that speed and costs a full segment (AI opponent's
 * legacy 1-segment power shot; the human uses the per-level table below). */
export const SHOT_SPEED_POWER_MULTIPLIER = 1.5;

/** Hold-to-charge power shot (CLAUDE.md section 5, 16.11.2026; M6.2).
 * Releasing Aksiyon before this many seconds = normal shot (0 energy).
 * Holding past it commits to a power shot that spends the WHOLE bar on
 * release; the shot's power level = whole segments spent (1..3). */
export const SHOT_CHARGE_TAP_SECONDS = 0.18;
/** While charging, the ball aura climbs one level every this many seconds
 * (1 yellow → 2 orange flame → 3 white-blue), capped at the energy held. */
export const SHOT_CHARGE_LEVEL_STEP_SECONDS = 0.15;
/** A charge auto-fires after this long so the ball can't be parked. */
export const SHOT_CHARGE_MAX_SECONDS = 1.2;
/** Shot speed multiplier per power level (index = level 0..3). */
export const SHOT_SPEED_BY_POWER_LEVEL = [1, 1.3, 1.55, 1.8];

/** Energy granted to the side that concedes a goal (comeback help). */
export const GOAL_CONCEDED_ENERGY_GAIN = 1;
export const POWER_SHOT_SEGMENT_COST = 1;
export const POWER_CATCH_SEGMENT_COST = 1;
