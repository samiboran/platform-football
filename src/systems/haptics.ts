import { VIBRATE_MS, VIBRATE_GOAL_PATTERN } from '../config/controls';
import type { ImpactKind } from '../config/feel';

/** M7.3: short phone vibrations (Android Chrome; a no-op elsewhere). */
function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not allowed before a user gesture, or unsupported */
  }
}

export function vibrateImpact(kind: ImpactKind): void {
  vibrate(VIBRATE_MS[kind]);
}

export function vibrateGoal(): void {
  vibrate(VIBRATE_GOAL_PATTERN);
}
