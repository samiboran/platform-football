import Phaser from 'phaser';
import { MOVE_SPEED } from '../config/movement';
import { DASH_SPEED } from '../config/power';
import { DRIBBLE_DISTANCE_WALK, DRIBBLE_DISTANCE_RUN, DRIBBLE_DISTANCE_DASH } from '../config/ball';

/**
 * Where a character's ball-dribble control point sits — a shared pure
 * function so the human (MatchScene) and the AI (AIOpponent) dribble by
 * identical rules, same precedent as catchMatrix.ts's shared shoot/hold
 * matrix. Not part of Ball.ts (which stays pure physics) or Character.ts
 * (which stays pure movement) — this is specifically the "top kontrolü"
 * concern the ball-feel task asked to keep separate from both (section 13).
 *
 * The point sits ahead of the character along its facing direction; how
 * far ahead scales with the character's actual current speed (its real
 * velocity, post-acceleration — see movement.ts), not raw input: standing
 * still keeps the ball close, running pushes it further out, and a Dash's
 * burst speed pushes the target point out past BALL_CONTROL_RADIUS
 * entirely (Ball.updateControl() also refuses control outright while
 * dashing) — that's the intended "control kaybı" a Dash risks.
 */
export function computeDribbleTarget(
  characterX: number,
  characterZ: number,
  facingX: number,
  facingZ: number,
  currentSpeed: number,
): { x: number; z: number } {
  const distance =
    currentSpeed <= MOVE_SPEED
      ? Phaser.Math.Linear(DRIBBLE_DISTANCE_WALK, DRIBBLE_DISTANCE_RUN, Phaser.Math.Clamp(currentSpeed / MOVE_SPEED, 0, 1))
      : Phaser.Math.Linear(
          DRIBBLE_DISTANCE_RUN,
          DRIBBLE_DISTANCE_DASH,
          Phaser.Math.Clamp((currentSpeed - MOVE_SPEED) / (DASH_SPEED - MOVE_SPEED), 0, 1),
        );
  const len = Math.hypot(facingX, facingZ) || 1;
  return {
    x: characterX + (facingX / len) * distance,
    z: characterZ + (facingZ / len) * distance,
  };
}
