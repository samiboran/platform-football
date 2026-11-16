import { BALL_RADIUS, CHARACTER_HEIGHT } from '../config/arena';
import { BALL_TRAP_MAX_HEIGHT } from '../config/ball';
import { AERIAL_REACH_X, AERIAL_REACH_Z, AERIAL_REACH_BELOW_FEET } from '../config/power';

/** Minimal positional view of a ball / character for the aerial check. */
interface Point3 {
  x: number;
  z: number;
  y: number;
}

/**
 * Header/volley reach test (M6.2 lob counter-play). A free ball that is
 * too high to trap (y > BALL_TRAP_MAX_HEIGHT) can still be struck with
 * Aksiyon if it is within reach in x/z and vertically between a little
 * below the character's feet (AERIAL_REACH_BELOW_FEET) and its head. Standing still only reaches
 * a low-flying ball; meeting a lob near its apex requires a jump.
 */
export function canStrikeAerial(ball: Point3, ballControlled: boolean, character: Point3): boolean {
  if (ballControlled || ball.y <= BALL_TRAP_MAX_HEIGHT) return false;
  if (Math.abs(ball.x - character.x) > AERIAL_REACH_X) return false;
  if (Math.abs(ball.z - character.z) > AERIAL_REACH_Z) return false;
  return ball.y >= character.y - AERIAL_REACH_BELOW_FEET && ball.y <= character.y + CHARACTER_HEIGHT + BALL_RADIUS;
}
