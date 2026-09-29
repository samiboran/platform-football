/**
 * Power bar + dash + shot tuning (CLAUDE.md section 5). Kept separate from
 * movement.ts (raw walk/jump) and ball.ts (passive ball physics) — this
 * file is specifically the stuff the Aksiyon/Dash/Özellik buttons spend.
 */

/** 3-segment bar (CLAUDE.md section 5). */
export const POWER_MAX_SEGMENTS = 3;
/** Seconds of passive fill to go from 0 to 1 full segment. */
export const POWER_FILL_SECONDS_PER_SEGMENT = 8;

/** Dash doesn't cost a whole segment, just eats into one (CLAUDE.md: "bir
 * segmentin ~%25'ini eritir, havada dash biraz daha fazla"). */
export const DASH_SEGMENT_COST_GROUND = 0.25;
export const DASH_SEGMENT_COST_AIR = 0.35;
/** px/s burst speed and how long the burst lasts. */
export const DASH_SPEED = 480;
export const DASH_DURATION = 0.18;
/** Minimum gap between dashes so holding the button doesn't spam-drain power. */
export const DASH_RETRIGGER_COOLDOWN = 0.25;

/** Ball speed (px/s) on a normal Aksiyon shot — notably harder than the
 * ball ever moves under dribble control (see BALL_CONTROL_STRENGTH,
 * config/ball.ts). Raised from an earlier 420 — Sami found shots too slow
 * to feel like a real strike. Crosses HALF_FIELD_WIDTH (arena.ts) in well
 * under a second now. */
export const SHOT_SPEED_NORMAL = 620;
/** Power şut multiplies that speed and costs a full segment. */
export const SHOT_SPEED_POWER_MULTIPLIER = 1.6;
export const POWER_SHOT_SEGMENT_COST = 1;
export const POWER_CATCH_SEGMENT_COST = 1;
