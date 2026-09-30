/**
 * The four stadiums (CLAUDE.md section 7) — data only, mechanic effects
 * expressed as multipliers on the base ball/movement tuning so nothing is
 * hardcoded in scene/entity code. Real per-stadium pixel art is future
 * work (assets/stadiums/<id>/); `groundLight`/`groundDark` (pitchRenderer.ts's
 * grass-stripe pattern, recolored per surface) and `tintColor` stand in for
 * it for now — CLAUDE.md section 7 explicitly asks for each saha to look
 * different, not just play different, which the pitch itself didn't do
 * until Oturum 20 (only a near-invisible 0.06-alpha tint overlay did).
 */

export type StadiumId = 'brazil' | 'argentina' | 'kenya' | 'congo';

export interface StadiumDef {
  id: StadiumId;
  name: string;
  description: string;
  /** Multiplies BALL_BOUNCE_RESTITUTION — sand/mud absorbs the bounce. */
  bounceMultiplier: number;
  /** Multiplies BALL_GROUND_FRICTION — rough/muddy ground slows a rolling
   * ball faster. Shot speed itself is untouched (SHOT_SPEED_NORMAL isn't
   * scaled by this) — only how fast it dies down once it's on the ground,
   * so "top hızlı gider ama yere değince hızlı yavaşlar" reads correctly. */
  frictionMultiplier: number;
  /** Multiplies player MOVE_SPEED — stands in for "dar alan hissi" (tight
   * space) without reworking pitch geometry per match. */
  speedMultiplier: number;
  /** Constant world-space force on the ball each frame, px/s². */
  windX: number;
  windZ: number;
  /** Pitch surface colors (pitchRenderer.ts's alternating grass-stripe
   * pattern, recolored per stadium — sand/dirt/street instead of grass). */
  groundLight: number;
  groundDark: number;
  /** Backdrop/stands tint until real stadium art exists. */
  tintColor: number;
  /** Kongo's street rhythm — cosmetic pulse on the backdrop, no physics. */
  rhythmVisual: boolean;
  /** Draws a handful of darker patches on the pitch (pitchRenderer.ts) —
   * a visual cue for why the ground here eats the ball's speed so much
   * faster (frictionMultiplier) than anywhere else. Purely cosmetic. */
  muddy: boolean;
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
    groundLight: 0xe8d9a0,
    groundDark: 0xd8c384,
    tintColor: 0xc2b280,
    rhythmVisual: false,
    muddy: false,
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
    groundLight: 0xa9784c,
    groundDark: 0x8f6339,
    tintColor: 0x8b5a2b,
    rhythmVisual: false,
    muddy: false,
  },
  kenya: {
    id: 'kenya',
    name: 'Kenya — Toprak Saha',
    description: 'Toprak saha, rüzgar topu etkiler — ıslak/çamurlu zeminde top yere değince sert yavaşlar.',
    bounceMultiplier: 0.7,
    // Well above every other stadium (and the global default) on purpose —
    // this IS the stadium's distinguishing physical identity: a shot keeps
    // its speed in the air same as anywhere else, but the instant it's
    // rolling on this ground it bleeds speed much faster than normal,
    // reading as mud/wet dirt rather than a firm pitch.
    frictionMultiplier: 2.6,
    speedMultiplier: 1.0,
    windX: 35,
    windZ: 0,
    groundLight: 0xc98a4a,
    groundDark: 0x9c6530,
    tintColor: 0xc97f3c,
    rhythmVisual: false,
    muddy: true,
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
    groundLight: 0x7a7885,
    groundDark: 0x605e6b,
    tintColor: 0x7d3c98,
    rhythmVisual: true,
    muddy: false,
  },
};

export const STADIUM_ORDER: StadiumId[] = ['brazil', 'argentina', 'kenya', 'congo'];
