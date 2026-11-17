import { CHARACTER_HEIGHT } from './arena';
/**
 * Catch ("tut") and power-clash tuning (CLAUDE.md section 5, 16.11.2026
 * rules; M6.3). Each outfield player defends their own goal with the
 * contextual Aksiyon — there's no separate keeper entity. The clash itself
 * is the pure difference table in systems/catchMatrix.ts.
 */

/** A catch only happens on contact: the shot must pass within this reach
 * of the catcher. x in px, z in world depth units — z is deliberately the
 * more forgiving one on screen (CLAUDE.md §3: "z toleransı yatay
 * toleranstan geniş"; 28 z ≈ 65 screen px vs 40 px horizontally). */
export const CATCH_REACH_X = 40;
export const CATCH_REACH_Z = 28;

/** A catch (tutuş) only reaches a ball no higher than this above the
 * catcher's own feet — a lob over a standing keeper can't be caught. */
export const CATCH_MAX_HEIGHT_ABOVE_FEET = CHARACTER_HEIGHT;

/** Pressing Aksiyon without the ball "holds tut" for this long: a shot that
 * reaches the catcher inside that window is caught/clashed. */
export const CATCH_ARM_SECONDS = 0.35;
/** After a tut window runs out without contact, a new one can't be opened
 * for this long — spamming Aksiyon can't keep tut up permanently. */
export const CATCH_WHIFF_COOLDOWN_SECONDS = 0.4;

/** Difference table (shot power − catch power) thresholds. */
export const CLASH_DIFF_BOUNCE = 1;
export const CLASH_DIFF_STUN = 2;
export const CLASH_DIFF_GOAL = 3;
/** Energy given back to a catcher who exactly matched a power shot. */
export const CLASH_EQUAL_REFUND = 1;

/** Diff 1: caught but spills — the ball pops up loose in the catcher's own
 * half, rolling gently away from their goal. */
export const CLASH_SPILL_SPEED = 120;
export const CLASH_SPILL_VY = 240;
/** Diff 2: catcher is knocked down/stunned and the ball rebounds hard into
 * the shooter's half. */
export const CLASH_STUN_SECONDS = 0.6;
export const CLASH_REBOUND_SPEED = 420;
export const CLASH_REBOUND_VY = 220;
/** Random depth spread (world z/s, ±half) on spills and rebounds. */
export const CLASH_DEPTH_SPREAD = 160;
/** Diff ≥ 3: the shot goes through, losing this fraction of its speed. */
export const CLASH_GOAL_SPEED_KEEP = 0.85;
