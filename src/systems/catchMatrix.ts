import { DEPTH_MIN, DEPTH_MAX } from '../config/arena';
import { POWER_MAX_SEGMENTS } from '../config/power';
import {
  CATCH_REACH_X,
  CATCH_REACH_Z,
  CATCH_MAX_HEIGHT_ABOVE_FEET,
  CLASH_DIFF_BOUNCE,
  CLASH_DIFF_STUN,
  CLASH_DIFF_GOAL,
  CLASH_EQUAL_REFUND,
  CLASH_SPILL_SPEED,
  CLASH_SPILL_VY,
  CLASH_STUN_SECONDS,
  CLASH_REBOUND_SPEED,
  CLASH_REBOUND_VY,
  CLASH_DEPTH_SPREAD,
  CLASH_GOAL_SPEED_KEEP,
  PARRY_CLASH_BONUS,
  PARRY_ENERGY_GAIN,
} from '../config/keeper';
import type { Ball } from '../entities/Ball';
import type { Character } from '../entities/Character';
import { emitImpact } from './impactFeel';

export type GoalSide = 'left' | 'right';

export type ClashOutcome = 'hold' | 'spill' | 'stun' | 'goal';

export interface ClashResult {
  /** Energy the catcher commits (auto: at most the shot's power). */
  catchPower: number;
  /** shot power − catch power */
  diff: number;
  outcome: ClashOutcome;
  /** Energy handed back to the catcher (exact match on a power shot, plus
   * the perfect-parry bonus). */
  refund: number;
  /** Tut landed inside the perfect-parry window. */
  perfect: boolean;
}

/**
 * The 16.11.2026 power-clash difference table (CLAUDE.md section 5) as a
 * pure, deterministic function — no randomness, so every row is testable.
 *
 *   diff = shot power − catch power
 *   ≤ 0  hold   — caught, ball stays in the catcher's half
 *            (exact match on a power shot: +1 energy back)
 *     1  spill  — caught but it bounces loose in the catcher's own half
 *     2  stun   — catcher knocked down (~0.6 s), ball rebounds to the shooter's half
 *   ≥ 3  goal   — straight through
 *
 * Pressing tut commits min(energy, shot power) automatically — never more
 * than needed. Not pressing = catch power 0.
 *
 * Perfect parry (tut within ~6 frames of contact): +PARRY_CLASH_BONUS free
 * catch power (so the auto-commit needs that much less energy) and
 * +PARRY_ENERGY_GAIN energy afterwards.
 */
export function resolveClash(
  shotPower: number,
  catcherEnergy: number,
  pressed: boolean,
  perfect = false,
): ClashResult {
  const shot = Math.max(0, Math.min(POWER_MAX_SEGMENTS, Math.round(shotPower)));
  const isPerfect = pressed && perfect;
  const bonus = isPerfect ? PARRY_CLASH_BONUS : 0;
  const needed = Math.max(0, shot - bonus);
  const catchPower = pressed ? Math.max(0, Math.min(Math.floor(catcherEnergy + 1e-6), needed)) : 0;
  const diff = shot - catchPower - bonus;
  const outcome: ClashOutcome =
    diff >= CLASH_DIFF_GOAL ? 'goal' : diff >= CLASH_DIFF_STUN ? 'stun' : diff >= CLASH_DIFF_BOUNCE ? 'spill' : 'hold';
  const refund = (diff === 0 && catchPower > 0 ? CLASH_EQUAL_REFUND : 0) + (isPerfect ? PARRY_ENERGY_GAIN : 0);
  return { catchPower, diff, outcome, refund, perfect: isPerfect };
}

/** Is `ball` a live shot heading at `side`'s goal that the catcher can
 * touch right now (contact reach in x/z, and low enough)? */
export function isCatchableShot(ball: Ball, side: GoalSide, catcher: Character): boolean {
  if (!ball.lastTouchWasShot || ball.clashResolved || ball.controller !== null) return false;
  const towardOwnGoal = side === 'left' ? ball.vx < 0 : ball.vx > 0;
  if (!towardOwnGoal) return false;
  if (Math.abs(ball.x - catcher.x) > CATCH_REACH_X) return false;
  if (Math.abs(ball.z - catcher.z) > CATCH_REACH_Z) return false;
  return ball.y <= catcher.y + CATCH_MAX_HEIGHT_ABOVE_FEET;
}

/**
 * Resolve a catch attempt on contact and apply its outcome to the ball and
 * catcher. Energy: the catcher spends `catchPower`, gets `refund` back.
 */
export function applyCatchAttempt(ball: Ball, side: GoalSide, catcher: Character, perfect = false): ClashResult {
  const result = resolveClash(ball.powerLevel, catcher.powerSegments, true, perfect);
  if (result.catchPower > 0) catcher.spendPower(result.catchPower);
  if (result.refund > 0) catcher.gainPower(result.refund);
  ball.clashResolved = true;
  ball.spin = 0; // any clash kills a falso
  emitImpact('clash'); // 12-frame hitstop + shake (M6.4)
  const away = side === 'left' ? 1 : -1; // direction away from the catcher's goal
  const spread = () => (Math.random() - 0.5) * CLASH_DEPTH_SPREAD;

  switch (result.outcome) {
    case 'hold':
      // Dead at the catcher's feet; the next updateControl() picks it up.
      ball.x = catcher.x + away * 8;
      ball.z = Math.max(DEPTH_MIN, Math.min(DEPTH_MAX, catcher.z));
      ball.vx = 0;
      ball.vz = 0;
      ball.vy = 0;
      catcher.playCatch();
      break;
    case 'spill':
      ball.vx = away * CLASH_SPILL_SPEED;
      ball.vz = spread();
      ball.vy = CLASH_SPILL_VY;
      catcher.playCatch();
      break;
    case 'stun':
      ball.vx = away * CLASH_REBOUND_SPEED;
      ball.vz = spread();
      ball.vy = CLASH_REBOUND_VY;
      catcher.playStunned(CLASH_STUN_SECONDS);
      break;
    case 'goal':
      ball.vx *= CLASH_GOAL_SPEED_KEEP;
      ball.vz *= CLASH_GOAL_SPEED_KEEP;
      catcher.playStunned(CLASH_STUN_SECONDS);
      break;
  }

  if (result.outcome !== 'goal') {
    // No longer a live shot: nobody can "catch" a spill or rebound.
    ball.lastTouchWasShot = false;
    ball.lastShotWasPower = false;
    ball.lastShotWasSuper = false;
    ball.powerLevel = 0;
  }
  return result;
}
