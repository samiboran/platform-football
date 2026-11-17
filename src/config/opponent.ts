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

/** Chance to go for a hold-to-charge power shot (spends the WHOLE bar,
 * level = whole segments, same as the human — M6.2) when it has at least
 * one segment. */
export const OPPONENT_POWER_SHOT_CHANCE = 0.35;
/** With a full bar it's more eager to cash it in. */
export const OPPONENT_POWER_SHOT_CHANCE_FULL_BAR = 0.6;
/** The AI visibly "holds" a power shot (growing aura on the ball) for a
 * random time in this range before releasing — a readable tell the human
 * can react to, instead of an instant unannounced rocket. */
export const OPPONENT_CHARGE_SECONDS_MIN = 0.35;
export const OPPONENT_CHARGE_SECONDS_MAX = 0.6;

/** Lob chance per shot. Higher when the human has stepped up away from
 * their own goal (more than OPPONENT_LOB_RIVAL_ADVANCED_X from its line),
 * since the lob then drops behind them. */
export const OPPONENT_LOB_CHANCE = 0.15;
export const OPPONENT_LOB_CHANCE_RIVAL_ADVANCED = 0.4;
export const OPPONENT_LOB_RIVAL_ADVANCED_X = 160;

/** Defending a shot: the AI aims to stand on the shot's line at its own x,
 * give or take this much depth error (world z), so it isn't a perfect wall. */
export const OPPONENT_INTERCEPT_Z_ERROR = 14;

/** Jumping for high balls (lobs, volleys). The AI jumps when a free ball
 * will reach it within OPPONENT_JUMP_LEAD_SECONDS at a height between
 * these two values (px above ground) and is roughly in its depth lane. */
export const OPPONENT_JUMP_LEAD_SECONDS = 0.3;
export const OPPONENT_JUMP_MIN_BALL_HEIGHT = 60;
export const OPPONENT_JUMP_MAX_BALL_HEIGHT = 150;
export const OPPONENT_JUMP_LANE_Z = 24;

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

/** Delay (seconds) between a shot being struck toward the AI's goal and
 * the AI reacting to it — moving onto the shot's line and holding tut
 * (M6.3). Without it the AI read the shot before it was struck. A shot
 * that reaches the AI before this elapses beats it outright. */
export const OPPONENT_CATCH_REACTION_SECONDS = 0.15;
