/**
 * The four stadiums (CLAUDE.md section 7) — data only, mechanic effects
 * expressed as multipliers on the base ball/movement tuning so nothing is
 * hardcoded in scene/entity code. Real per-stadium pixel art is future
 * work (assets/stadiums/<id>/); `tintColor` stands in for it for now.
 */

export type StadiumId = 'brazil' | 'argentina' | 'kenya' | 'congo';

export interface StadiumDef {
  id: StadiumId;
  name: string;
  description: string;
  /** Multiplies BALL_BOUNCE_RESTITUTION — sand absorbs the bounce. */
  bounceMultiplier: number;
  /** Multiplies BALL_GROUND_FRICTION — rough ground slows the ball faster. */
  frictionMultiplier: number;
  /** Multiplies player MOVE_SPEED — stands in for "dar alan hissi" (tight
   * space) without reworking pitch geometry per match. */
  speedMultiplier: number;
  /** Constant world-space force on the ball each frame, px/s². */
  windX: number;
  windZ: number;
  /** Backdrop/stands tint until real stadium art exists. */
  tintColor: number;
  /** Kongo's street rhythm — cosmetic pulse on the backdrop, no physics. */
  rhythmVisual: boolean;
}

export const STADIUMS: Record<StadiumId, StadiumDef> = {
  brazil: {
    id: 'brazil',
    name: 'Brezilya — Kum Sahil',
    description: 'Kum saha, top daha az seker.',
    bounceMultiplier: 0.6,
    frictionMultiplier: 1.1,
    speedMultiplier: 1.0,
    windX: 0,
    windZ: 0,
    tintColor: 0xc2b280,
    rhythmVisual: false,
  },
  argentina: {
    id: 'argentina',
    name: 'Arjantin — Potrero',
    description: 'Engebeli toprak, dar alan hissi.',
    bounceMultiplier: 0.9,
    frictionMultiplier: 1.2,
    speedMultiplier: 0.9,
    windX: 0,
    windZ: 0,
    tintColor: 0x8b5a2b,
    rhythmVisual: false,
  },
  kenya: {
    id: 'kenya',
    name: 'Kenya — Toprak Saha',
    description: 'Toprak saha, rüzgar topu etkiler.',
    bounceMultiplier: 1.0,
    frictionMultiplier: 1.05,
    speedMultiplier: 1.0,
    windX: 35,
    windZ: 0,
    tintColor: 0xc97f3c,
    rhythmVisual: false,
  },
  congo: {
    id: 'congo',
    name: 'Kongo — Müzikli Sokak',
    description: 'Müzikli sokak, ritim görsele yansır.',
    bounceMultiplier: 1.0,
    frictionMultiplier: 1.0,
    speedMultiplier: 1.0,
    windX: 0,
    windZ: 0,
    tintColor: 0x7d3c98,
    rhythmVisual: true,
  },
};

export const STADIUM_ORDER: StadiumId[] = ['brazil', 'argentina', 'kenya', 'congo'];
