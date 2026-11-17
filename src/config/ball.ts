/**
 * Ball physics tuning (CLAUDE.md section 10: no magic numbers outside
 * config). Separate from movement.ts (character tuning) and arena.ts
 * (pure geometry/scale — BALL_RADIUS lives there).
 */

/** px/s². Same order as character gravity but tuned separately — the ball
 * should feel snappier/heavier than the floaty character jump. */
export const BALL_GRAVITY = 700;
/** Air drag while the ball is off the ground: fraction of horizontal speed
 * lost per second. Small — just enough that a high ball visibly loses pace
 * instead of flying dead-straight (YSoccer uses ~0.3/s). */
export const BALL_AIR_DRAG = 0.2;
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
/** px/s² deceleration while the ball is rolling freely on the ground —
 * doubles as the "rolling friction" the dribble-feel task asked for; kept
 * under this one name rather than a duplicate BALL_ROLLING_FRICTION alias.
 * Lowered from 380 — Sami found a shot decelerating far too fast (barely
 * carried its own speed before dying out). 380 itself was a prior fix for
 * the ball sliding forever after a touch — that concern is now handled by
 * per-stadium `frictionMultiplier` instead (see config/stadiums.ts: Kenya's
 * "muddy ground" is the sharp-deceleration surface now, not the global
 * default). Only ever *dampens* velocity by a bounded amount per frame (see
 * `dampen()` in Ball.ts) — it can slow the ball to a stop but never zeroes
 * it in one frame, so braking always looks like a real decay, never a snap. */
export const BALL_GROUND_FRICTION = 150;
/** Hard cap on the ball's total horizontal speed (px/s), applied every
 * frame after gravity/wind/bounces/control. Comfortably above the fastest
 * legit shot (Brezilya's süper hareket, further boosted by
 * KICK_CARRY_MOMENTUM on an already-moving ball) — this isn't meant to
 * clip a real shot, only to stop the ball from accumulating runaway speed
 * from repeated wall bounces or wind over many frames. */
export const BALL_MAX_SPEED = 1100;

// --- Dribble control (trap + carry) -------------------------------------
// Reworked in Oturum 24 after Sami: "futbolcu topa gidince top ayağa
// gelmeli, tekrar çıkmamalı, oyuncunun yönüyle birlikte hareket etmeli".
// The earlier force-based steering (seek speed 260 px/s, 900 px/s² cap)
// could not keep up with a 220 px/s character that turned, so the ball
// drifted out of the control radius and got dropped. Modeled on YSoccer
// (open-source Sensible Soccer remake): a ball is TRAPPED only if it is
// close, low, and not much faster than the character (so fast shots are
// not magnetized), and once trapped it is CARRIED — it moves with the
// character's velocity and is held on a dribble point ahead of the feet
// that swings with the facing direction. See Ball.updateControl().

/** Trap only on real contact (Sami: "duran top hareket ediyor"): a free
 * ball is taken only when it touches the feet — inside an ellipse around
 * the character's feet, BALL_TRAP_CONTACT_X wide (world x px) and
 * BALL_TRAP_CONTACT_Z deep (world z units, ~2.3 screen px each). Depth is
 * more forgiving than x (CLAUDE.md §3). The old rule measured a 30 px
 * radius from a point 14-24 px AHEAD of the feet, so a resting ball
 * ~40 px away slid onto the feet before anyone touched it. */
export const BALL_TRAP_CONTACT_X = 20;
export const BALL_TRAP_CONTACT_Z = 14;
/** Seek speed used only for the forced hold-timeout release push (see
 * Ball.update()). */
export const BALL_CONTROL_STRENGTH = 260;
/** A free ball above this height (world px) can't be trapped — it has to
 * come down first (or be headed/volleyed). */
export const BALL_TRAP_MAX_HEIGHT = 22;
/** A free ball moving faster than this RELATIVE to the character (px/s)
 * rolls past instead of being trapped — this is what keeps a hard shot
 * from being magnetized onto the feet. YSoccer uses ~220-290. */
export const BALL_TRAP_MAX_RELATIVE_SPEED = 340;
/** How firmly (1/s) a carried ball is pulled onto the dribble point each
 * frame. High = glued to the feet, low = loose touches. */
export const DRIBBLE_STICK_LERP_SPEED = 22;
/** Kenya poşet top: random jitter (world px) on the carried ball's target. */
export const DRIBBLE_CHAOS_WOBBLE = 10;
/** How far in front of a character's feet (world px, along facing) the
 * dribble point sits while standing still/walking slowly. */
export const DRIBBLE_DISTANCE_WALK = 14;
/** ...at full running speed (MOVE_SPEED). */
export const DRIBBLE_DISTANCE_RUN = 24;
/** ...at Dash speed. Dash now KEEPS the ball (Sami: "topla dash yapsa"):
 * it rides a little further ahead of the feet, kicking up dust. */
export const DRIBBLE_DISTANCE_DASH = 30;
/** Lerp rate (1/s) the dribble point itself (not the ball's velocity, the
 * *target* the control force steers toward) uses to follow the character's
 * raw feet+facing position — never teleports when facing direction
 * flips, always slides there. */
export const DRIBBLE_POINT_LERP_SPEED = 14;
/** Fraction of a moving ball's existing velocity carried into a shot,
 * added to (not replacing) the shot's own velocity: `shotVel = ball.vel *
 * KICK_CARRY_MOMENTUM + shootDir * shootSpeed`. Hitting a ball already
 * moving with you should feel different from hitting a still one. */
export const KICK_CARRY_MOMENTUM = 0.3;

/** How long a controlled ball can be held (CLAUDE.md's hold rule) before
 * it's forced back to BALL_FREE — nobody can dribble forever. The timer
 * only counts while actively controlled; losing control for any other
 * reason (leaving the radius, a Dash, an opponent's contact) resets it. */
export const BALL_HOLD_SECONDS = 6;
/** The ball starts blinking this many seconds before the automatic release,
 * warning the holder to shoot. */
export const BALL_HOLD_WARNING_SECONDS = 1.5;
/** Blink frequency (full fade cycles per second) during the warning window. */
export const BALL_HOLD_BLINK_HZ = 4;
/** After an explicit release (a shot, or the BALL_HOLD_SECONDS timeout),
 * the side that just let go can't immediately re-acquire control via the
 * passive radius check for this many seconds. A released ball's velocity
 * hasn't carried it out of BALL_CONTROL_RADIUS within a single frame, so
 * without this every shot would instantly re-capture back onto its own
 * shooter's dribble point the very next frame. The other side can still
 * intercept immediately — this only blocks the side that just released it. */
export const BALL_RECAPTURE_LOCKOUT = 0.35;

/** Ball shadow shrinks/fades with height (CLAUDE.md §3): at
 * BALL_SHADOW_FADE_HEIGHT and above it's this fraction of its ground size. */
export const BALL_SHADOW_MIN_SCALE = 0.45;
export const BALL_SHADOW_GROUND_ALPHA = 0.35;
export const BALL_SHADOW_MIN_ALPHA = 0.22;
export const BALL_SHADOW_FADE_HEIGHT = 140;
/** Landing marker ring: shown while a free ball is higher than this. */
export const LANDING_MARKER_MIN_HEIGHT = 30;
export const LANDING_MARKER_COLOR = 0xffe14d;
export const LANDING_MARKER_ALPHA = 0.8;
