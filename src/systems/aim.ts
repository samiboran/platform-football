import { AIM_SNAP_ANGLES_DEG } from '../config/aim';

const DEG = Math.PI / 180;

/**
 * Snap a screen-space stick direction (x right, z up) to the nearest
 * allowed shot angle (config/aim.ts). `forward` = +1 when attacking to the
 * right, −1 to the left. Returns a unit screen direction.
 */
export function snapShotAim(dirX: number, dirZ: number, forward: 1 | -1 = 1): { x: number; z: number } {
  // Angle from "up" (0°) through "at the goal" (90°) to "down" (180°).
  const fx = Math.max(0, dirX * forward);
  const deg = fx === 0 && dirZ === 0 ? 90 : Math.atan2(fx, dirZ) / DEG;
  let best = AIM_SNAP_ANGLES_DEG[0];
  for (const a of AIM_SNAP_ANGLES_DEG) if (Math.abs(a - deg) < Math.abs(best - deg)) best = a;
  return { x: Math.sin(best * DEG) * forward, z: Math.cos(best * DEG) };
}
