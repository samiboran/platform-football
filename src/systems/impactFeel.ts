import type { ImpactKind } from '../config/feel';

/**
 * Tiny impact bus (M6.4): gameplay code reports "something got hit" without
 * knowing about the scene; MatchScene listens and plays hitstop + shake.
 * One listener at a time (the running MatchScene).
 */
type Listener = (kind: ImpactKind) => void;
let listener: Listener | null = null;

export function setImpactListener(fn: Listener | null): void {
  listener = fn;
}

export function emitImpact(kind: ImpactKind): void {
  listener?.(kind);
}
