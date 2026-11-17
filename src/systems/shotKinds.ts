import {
  SHOT_SPEED_NORMAL,
  SHOT_SPEED_BY_POWER_LEVEL,
  LOB_LAUNCH_VY,
  LOB_SPEED_MULTIPLIER,
  LOB_SPEED_BY_POWER_LEVEL,
  VOLLEY_SPEED_MULTIPLIER,
  VOLLEY_LAUNCH_VY,
  CURVE_ACCEL,
  CURVE_AIM_OFFSET,
  CURVE_SPEED_MULTIPLIER,
} from '../config/power';
import type { Ball } from '../entities/Ball';
import type { ElementId } from '../config/elements';
import { emitImpact } from './impactFeel';

/** The M6.2 shot types, shared by the human (MatchScene) and the AI. */
export type ShotKind = 'ground' | 'lob' | 'volley';

export interface StrikeOptions {
  /** 0 = normal, 1..3 = power level (energy already spent by the caller). */
  level: number;
  /** The striker's CharacterDef.shotPowerMultiplier. */
  shotPowerMultiplier: number;
  /** Extra speed factor — screenDirToWorld()'s speedScale for stick aims. */
  speedScale?: number;
  /** Random aim jitter on/off and its magnitude (Ball.shoot chaos). */
  chaos?: boolean;
  wobble?: number;
  /** The striker's power element (config/elements.ts). */
  element?: ElementId;
  /** Falso (air combo): -1/+1 = bend toward -z/+z, 0 = straight. */
  curve?: number;
}

/** Aim + spin for a falso: start biased away from the curve side, then the
 * ball's spin (Ball.spin) bends it back toward that side. */
export function curvedAim(dirX: number, dirZ: number, curve: number): { x: number; z: number } {
  const len = Math.hypot(dirX, dirZ) || 1;
  return { x: dirX / len, z: dirZ / len - curve * CURVE_AIM_OFFSET };
}

/**
 * Strike the ball as a ground shot, lob or volley along a WORLD direction.
 * Speeds/launches come from config/power.ts so both sides play by exactly
 * the same rules.
 */
export function strikeBall(ball: Ball, kind: ShotKind, dirX: number, dirZ: number, o: StrikeOptions): void {
  const level = kind === 'volley' ? 0 : Math.max(0, Math.min(SHOT_SPEED_BY_POWER_LEVEL.length - 1, o.level));
  const base = SHOT_SPEED_NORMAL * o.shotPowerMultiplier * (o.speedScale ?? 1);
  const chaos = o.chaos ?? false;
  const wobble = o.wobble ?? 1;
  if (o.element) ball.element = o.element;
  const curve = o.curve ?? 0;
  if (curve !== 0) {
    const a = curvedAim(dirX, dirZ, curve);
    dirX = a.x;
    dirZ = a.z;
  }
  const curveSpeed = curve !== 0 ? CURVE_SPEED_MULTIPLIER : 1;
  switch (kind) {
    case 'ground':
      ball.shoot(dirX, dirZ, base * SHOT_SPEED_BY_POWER_LEVEL[level], chaos, level > 0, false, wobble, level);
      break;
    case 'lob':
      // No momentum carry and no chaos: a predictable landing spot matters
      // more than a realistic kick.
      ball.shoot(
        dirX,
        dirZ,
        base * LOB_SPEED_MULTIPLIER * LOB_SPEED_BY_POWER_LEVEL[level],
        false,
        level > 0,
        false,
        1,
        level,
        LOB_LAUNCH_VY,
        0,
      );
      break;
    case 'volley':
      // Full overwrite (carry 0) plus a small lift for a gentle arc.
      ball.shoot(dirX, dirZ, base * VOLLEY_SPEED_MULTIPLIER * curveSpeed, chaos && curve === 0, false, false, wobble, 0, VOLLEY_LAUNCH_VY, 0);
      break;
  }
  if (curve !== 0) ball.spin = curve * CURVE_ACCEL;
  // Hitstop on every strike (M6.4): 4 frames normal, 8 power.
  emitImpact(level > 0 ? 'power' : 'normal');
}
