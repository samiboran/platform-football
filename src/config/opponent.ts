/**
 * AI outfield opponent decision-making (M5 — closes the "gerçek rakip"
 * gap flagged in the M3/M4 PROGRESS notes: without one, the league flow
 * has nothing to play against and the human's own goal was undefended).
 * The opponent otherwise reuses its assigned character's own stats
 * (speed, power, shot power, chaos) straight from characters.ts — this
 * file only holds the tuning that's specific to being a computer player.
 */

/** Minimum gap between the opponent's shot attempts once it's on the ball,
 * so it doesn't fire every single frame while standing on top of it. */
export const OPPONENT_SHOT_COOLDOWN_SECONDS = 1.1;

/** Per-touch chance to shoot instead of just dribble-nudging the ball
 * forward — keeps the AI from blasting the instant it arrives. */
export const OPPONENT_SHOT_CHANCE_PER_TOUCH = 0.5;

/** Chance to spend a power segment on a power şut instead of a normal one,
 * when it has a full segment available. */
export const OPPONENT_POWER_SHOT_CHANCE = 0.35;

/** Base aim wobble applied to every AI shot — CLAUDE.md gives the human no
 * auto-aim, so the AI shouldn't get laser-guided aim either; it needs to be
 * beatable. Characters with chaosTouch (Kenya) wobble extra on top. */
export const OPPONENT_AIM_WOBBLE = 0.5;
export const OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER = 1.6;

/** Distance (world units) inside which the opponent stops nudging toward
 * its move target. Must clear one frame's worth of movement at the
 * fastest character's speed (MOVE_SPEED * up to ~1.25, ~4.6px at 60fps,
 * more on a slower frame) with real margin, or it overshoots the deadzone
 * every frame and visibly vibrates in place instead of settling. */
export const OPPONENT_MOVE_DEADZONE = 12;

/** Lerp rate (1/s) for the AI's *perceived* ball position, which it chases
 * instead of the ball's true position every frame. Without this the AI
 * read as omniscient — always exactly where the ball currently is with
 * zero latency, "biliyormuş gibi" per Sami. A human-scale reaction lag on
 * top of that (not a perfect readout) makes it feel like it's actually
 * watching the ball rather than being fed its coordinates. */
export const OPPONENT_TRACKING_LERP_SPEED = 6;

/** Delay (seconds) between a shot becoming catchable and the AI actually
 * attempting the catch — without this it reacted the instant a shot came
 * on target, as if it already knew the shot was coming before it was even
 * struck. A fast/power shot can now cross the goal line before this delay
 * elapses, beating the keeper outright — matches CLAUDE.md's "no auto-aim,
 * has to be beatable" spirit for the defending side too. */
export const OPPONENT_CATCH_REACTION_SECONDS = 0.15;
