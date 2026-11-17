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

/** Hold-to-charge power shot (CLAUDE.md section 5, 16.11.2026; M6.2).
 * Releasing Aksiyon before this many seconds = normal shot (0 energy).
 * Holding past it commits to a power shot that spends the WHOLE bar on
 * release; the shot's power level = whole segments spent (1..3). */
export const SHOT_CHARGE_TAP_SECONDS = 0.18;
/** Input buffer (CLAUDE.md §5, ~8 frames): an Aksiyon press this recent
 * still starts a shot if the ball is trapped just after the press. */
export const SHOT_PRESS_BUFFER_SECONDS = 8 / 60;
/** A charge auto-fires after this long so the ball can't be parked. */
export const SHOT_CHARGE_MAX_SECONDS = 1.2;
/** Shot speed multiplier per power level (index = level 0..3). */
export const SHOT_SPEED_BY_POWER_LEVEL = [1, 1.3, 1.55, 1.8];

/** Lob (M6.2): stick pulled back toward your own goal at least this far
 * (0..1) when the shot fires turns it into a lob. */
export const LOB_STICK_BACK_THRESHOLD = 0.5;
/** Lob goes forward (toward the opponent) with this x weight; the stick's
 * up/down component steers it in depth. */
export const LOB_FORWARD_WEIGHT = 1;
/** Upward launch speed (px/s). With BALL_GRAVITY 700: ~1.2 s flight, apex
 * ~126 px — a jumping player (jump ~70 + body 70) can just meet it. */
export const LOB_LAUNCH_VY = 420;
/** Lob horizontal speed relative to a normal shot (slow, readable arc). */
export const LOB_SPEED_MULTIPLIER = 0.75;
/** Power lob: horizontal speed multiplier per power level (lands deeper). */
export const LOB_SPEED_BY_POWER_LEVEL = [1, 1.1, 1.2, 1.3];

/** Header/volley (M6.2): Aksiyon on a free ball that's above trap height
 * and within this reach of the player (x px / z world units). */
export const AERIAL_REACH_X = 28;
export const AERIAL_REACH_Z = 20;
/** A jumping player can also volley a ball this far below their feet
 * (a ball popped up with a jump rises a bit slower than the jumper). */
export const AERIAL_REACH_BELOW_FEET = 30;
/** Volley speed relative to a normal shot. */
export const VOLLEY_SPEED_MULTIPLIER = 1.15;
/** Upward speed a volley/header adds, so it flies in a slight gravity arc
 * instead of a dead-flat line (Sami: "hafif bombeli"). */
export const VOLLEY_LAUNCH_VY = 160;
/** Jumping while dribbling pops the ball up with you (vy px/s): apex
 * ~64 px, i.e. around the jumper's chest at the top of the jump, so it can
 * be volleyed in the air. */
export const BALL_JUMP_CARRY_VY = 300;

/** Energy granted to the side that concedes a goal (comeback help). */
export const GOAL_CONCEDED_ENERGY_GAIN = 1;
