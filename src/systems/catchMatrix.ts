import Phaser from 'phaser';
import { CATCH_BASE_CHANCE, CATCH_SPEED_REFERENCE } from '../config/keeper';
import { SUPER_SHOT_CATCH_CHANCE_MULTIPLIER } from '../config/super';
import { Ball } from '../entities/Ball';

export type GoalSide = 'left' | 'right';

/**
 * The M3 shoot/hold matrix (CLAUDE.md section 5), as a shared pure
 * function — both the human's own contextual "tut" (Aksiyon while not
 * touching the ball) and the AI opponent's automatic defense of its own
 * goal call into this. There's no separate goalkeeper character; each
 * outfield player defends their own net themselves, per CLAUDE.md's
 * original "bağlamsal Aksiyon" design (see docs/PROGRESS.md — an earlier
 * dedicated AIKeeper entity was a stopgap before AIOpponent existed, and
 * confused players by standing in the goal with nothing to do).
 *
 *   Normal şut + Normal tutuş -> chance based on ball speed
 *   Power şut  + Normal tutuş -> tutamaz (ball continues in / deflects)
 *   Power şut  + Power tutuş  -> tutar
 *   Normal şut + Power tutuş  -> tutar (caller already paid the power cost)
 *
 * `wantsPowerCatch` is decided by the caller: the human only ever wants
 * one when explicitly holding Özellik+Aksiyon (and paid a power segment
 * for it), while the AI opponent also "overcommits" a fraction of the
 * time on normal shots, mirroring a defender occasionally diving early.
 */
export function resolveCatchAttempt(
  ball: Ball,
  side: GoalSide,
  catchChance: number,
  wantsPowerCatch: boolean,
): { caught: boolean } {
  const isPowerShot = ball.lastShotWasPower;
  let caught: boolean;

  if (wantsPowerCatch) {
    // Even a committed power tutuş can be beaten by a super shot —
    // CLAUDE.md: "tutma şansı... özel şuta karşı düşer" (section 5).
    caught = ball.lastShotWasSuper ? Math.random() < SUPER_SHOT_CATCH_CHANCE_MULTIPLIER : true;
  } else if (isPowerShot) {
    caught = false;
  } else {
    const speed = Math.hypot(ball.vx, ball.vz);
    const speedFactor = Phaser.Math.Clamp(1 - speed / CATCH_SPEED_REFERENCE, 0.1, 1);
    caught = Math.random() < CATCH_BASE_CHANCE * catchChance * speedFactor;
  }

  if (caught) {
    // Stop it dead at the catcher's feet — the very next frame's
    // updateControl() call for `side` finds it at zero speed, well inside
    // BALL_CONTROL_RADIUS, and naturally picks up dribble control from
    // there (same BALL_HOLD_SECONDS hold rule as any other control pickup).
    ball.vx = 0;
    ball.vz = 0;
    ball.vy = 0;
  } else if (isPowerShot && Math.random() < 0.5) {
    // Half the time a failed power şut deflects instead of a clean pass-through.
    const deflectSign = side === 'right' ? -1 : 1;
    ball.vx = deflectSign * Math.abs(ball.vx) * 0.4;
    ball.vz = (Math.random() - 0.5) * 200;
  }

  ball.lastShotWasPower = false;
  ball.lastShotWasSuper = false;

  return { caught };
}
