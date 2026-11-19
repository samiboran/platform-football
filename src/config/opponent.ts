/**
 * AI outfield opponent decision-making (M5 — closes the "gerçek rakip"
 * gap flagged in the M3/M4 PROGRESS notes: without one, the league flow
 * has nothing to play against and the human's own goal was undefended).
 * The opponent otherwise reuses its assigned character's own stats
 * (speed, power, shot power, chaos) straight from characters.ts — this
 * file only holds the tuning that's specific to being a computer player.
 * M9.2: reaction, aim, defending error, shot eagerness and power-shot
 * chances moved to config/difficulty.ts (per difficulty level; ORTA keeps
 * the old values).
 */

/** The AI visibly "holds" a power shot (growing aura on the ball) for a
 * random time in this range before releasing — a readable tell the human
 * can react to, instead of an instant unannounced rocket. */
export const OPPONENT_CHARGE_SECONDS_MIN = 0.35;
export const OPPONENT_CHARGE_SECONDS_MAX = 0.6;

/** Lob chance per shot. Higher when the human has stepped up away from
 * their own goal (more than OPPONENT_LOB_RIVAL_ADVANCED_X from its line),
 * since the lob then drops behind them. */
export const OPPONENT_LOB_CHANCE = 0.15;
// 0.4 -> 0.25 (Sami 17.11: AI lob goals felt out of nowhere).
export const OPPONENT_LOB_CHANCE_RIVAL_ADVANCED = 0.25;
export const OPPONENT_LOB_RIVAL_ADVANCED_X = 160;

/** Jumping for high balls (lobs, volleys). The AI jumps when a free ball
 * will reach it within OPPONENT_JUMP_LEAD_SECONDS at a height between
 * these two values (px above ground) and is roughly in its depth lane. */
export const OPPONENT_JUMP_LEAD_SECONDS = 0.3;
export const OPPONENT_JUMP_MIN_BALL_HEIGHT = 60;
export const OPPONENT_JUMP_MAX_BALL_HEIGHT = 150;
export const OPPONENT_JUMP_LANE_Z = 24;

/** Kenya (chaosTouch) wobbles extra on top of the difficulty aimWobble. */
export const OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER = 1.6;

/** Distance (world units) inside which the opponent stops nudging toward
 * its move target. Must clear one frame's worth of movement at the
 * fastest character's speed (MOVE_SPEED * up to ~1.25, ~4.6px at 60fps,
 * more on a slower frame) with real margin, or it overshoots the deadzone
 * every frame and visibly vibrates in place instead of settling. */
export const OPPONENT_MOVE_DEADZONE = 12;
/** Tighter deadzone while walking onto a free ball in our half — the ball
 * is only trapped on real foot contact (BALL_TRAP_CONTACT_X/Z), so
 * stopping 12 short left the AI standing next to the ball forever. */
export const OPPONENT_BALL_CHASE_DEADZONE = 5;


/** After any AI strike, the AI can't volley/head the ball again for this
 * long (s). Without it a volley still in reach right after hitstop was hit
 * a second time — which also wiped a falso's spin (M9.2). */
export const OPPONENT_AERIAL_RESTRIKE_SECONDS = 0.35;
