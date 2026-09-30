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
export const BALL_MAX_SPEED = 1400;

// --- Dribble control (force-based, not a position lock) -------------------
// The ball is never the player's child object and its position is never
// assigned directly. Instead, while within BALL_CONTROL_RADIUS of a
// character's (smoothed) dribble point, a bounded STEERING FORCE nudges
// its velocity toward a "desired velocity" pointing at that dribble point
// — real force/mass, not an unbounded lerp. An earlier lerp-based version
// (`vel = lerp(vel, desiredVel, response*dt)`) had no cap on how much the
// velocity could change in one frame, so a fast ball passing near a player
// got yanked toward them instantly — Sami described it as "magnet"-like.
// Capping the per-frame velocity change to BALL_CONTROL_FORCE/BALL_MASS
// (a real acceleration limit) means redirecting a fast ball now visibly
// takes a beat, and a ball moving fast enough simply can't be full-force
// trapped in one frame, however close it passes — it has to actually slow
// down or the player has to stay near it for a moment. This keeps every
// bit of existing free physics (gravity, friction, bounce, wall/goal
// checks) running underneath control at all times; control is additive,
// never a separate mode that replaces physics. See
// systems/dribbleControl.ts and Ball.updateControl().

/** How close the ball must be to a character's dribble point to be under
 * that character's control at all. Shrunk from an earlier 45 (roughly half
 * a character-width) — even with the force cap below, that radius let the
 * ball start curving in from a visible distance, still reading as a
 * magnet. Now closer to "the ball has to actually be near the feet". Not a
 * broad body-collision box (this project doesn't do rigid-body collision
 * between characters and the ball, see docs/PROGRESS.md). */
export const BALL_CONTROL_RADIUS = 30;
/** The "seek speed" (px/s) the desired-velocity vector is scaled to when
 * steering the ball toward the dribble point — a target speed, not an
 * instant velocity; BALL_CONTROL_FORCE/BALL_MASS below decide how fast the
 * ball's real velocity can actually climb toward it. */
export const BALL_CONTROL_STRENGTH = 260;
/** The ball's "mass" for dribble-control purposes: divides
 * BALL_CONTROL_FORCE to get the actual acceleration cap
 * (`accel = force / mass`). Doesn't affect gravity/bounce/wall physics —
 * those already have their own separate tuning — only how sluggishly the
 * ball responds to a player's control force. Higher = heavier/harder to
 * redirect, lower = lighter/more eager to follow. */
export const BALL_MASS = 1;
/** Maximum steering force (in the same px/s² units as an acceleration,
 * before dividing by BALL_MASS) the dribble-control system can apply to
 * the ball's velocity per frame. This is the actual fix for the "magnet"
 * feel — it hard-caps how much the ball's velocity can change in one
 * frame no matter how far off it starts, so control always ramps in over
 * a handful of frames instead of snapping. */
export const BALL_CONTROL_FORCE = 900;
/** Multiplies the effective control force while either the ball or its
 * controlling character is airborne (y > 0) — a jumping player barely
 * steers the ball, it isn't glued to their feet mid-air. */
export const AIR_CONTROL_MULTIPLIER = 0.15;
/** How far in front of a character's feet (world px, along facing) the
 * dribble point sits while standing still/walking slowly. */
export const DRIBBLE_DISTANCE_WALK = 10;
/** ...at full running speed (MOVE_SPEED). */
export const DRIBBLE_DISTANCE_RUN = 24;
/** ...right after a Dash — deliberately further than BALL_CONTROL_RADIUS:
 * the point the ball "should" reach if control could keep up at that
 * speed is genuinely out of reach, which is what actually causes the
 * "control kaybı" a Dash is supposed to risk (see Ball.updateControl(),
 * which also refuses to apply control at all while isDashing is true). */
export const DRIBBLE_DISTANCE_DASH = 48;
/** Lerp rate (1/s) the dribble point itself (not the ball's velocity, the
 * *target* the control force steers toward) uses to follow the character's
 * raw feet+facing position — never teleports when facing direction
 * flips, always slides there. */
export const DRIBBLE_POINT_LERP_SPEED = 10;
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
