/**
 * The four playable kids (CLAUDE.md section 6) — data only, no code branches
 * per character. Stats are multipliers on the base tuning in movement.ts /
 * ball.ts (1.0 = baseline). `color` is a placeholder tint until real
 * sprites land in assets/characters/<id>/ (M4 — "sen sprite üretmiyorsun").
 *
 * `special` names the 3-segment super move; the mechanic itself needs the
 * power bar from M3 and isn't implemented yet.
 */

import type { ElementId } from './elements';

export type CharacterId = 'brazil' | 'argentina' | 'kenya' | 'congo';

export interface CharacterDef {
  id: CharacterId;
  /** The kid's own name (18.11.2026, Sami: characters aren't "Kenya",
   * "Kongo" — the country is the team they play for). */
  name: string;
  /** National team (Sokak Dünya Kupası, like a UEFA/FIFA cup). */
  team: string;
  /** 3-letter team code for the scoreboard (FIFA style). */
  teamCode: string;
  origin: string;
  archetype: string;
  special: string;
  /** Ground move speed multiplier (x/z). */
  speedMultiplier: number;
  /** GÜÇ — body strength: divides how long this kid stays down when
   * stunned/knocked over, and multiplies how far a normal shot bounces off
   * their body (systems/catchMatrix.ts applyBodyBlock). */
  powerMultiplier: number;
  /** ŞUT — multiplies every shot's speed. */
  shotPowerMultiplier: number;
  /** Kenya's plastic-bag ball wobbles unpredictably in the air — a small
   * random jitter added whenever this character touches the ball. */
  chaosTouch: boolean;
  /** Power-shot element — always this one, whatever the level
   * (config/elements.ts). */
  element: ElementId;
  color: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  brazil: {
    id: 'brazil',
    name: 'Tiago',
    team: 'Brezilya',
    teamCode: 'BRA',
    origin: 'Favela/plaj çocuğu',
    archetype: 'Hızlı / elektrik',
    special: 'Capoeira ters vuruşu (ginga çalımı)',
    speedMultiplier: 1.25,
    powerMultiplier: 0.9,
    shotPowerMultiplier: 0.95,
    chaosTouch: false,
    element: 'lightning',
    color: 0xf1c40f,
  },
  argentina: {
    id: 'argentina',
    name: 'Nico',
    team: 'Arjantin',
    teamCode: 'ARG',
    origin: 'Potrero (toprak arsa) çocuğu',
    archetype: 'Dengeli',
    special: 'Gambeta — dar alanda top kontrolü',
    speedMultiplier: 1.0,
    powerMultiplier: 1.0,
    shotPowerMultiplier: 1.0,
    chaosTouch: false,
    element: 'earth',
    color: 0x6fa8dc,
  },
  kenya: {
    id: 'kenya',
    name: 'Baraka',
    team: 'Kenya',
    teamCode: 'KEN',
    origin: 'Topunu poşetten yapan çocuk',
    archetype: 'Zayıf şut, kaotik',
    special: 'Poşet top — havada öngörülemez sapar',
    speedMultiplier: 0.95,
    powerMultiplier: 0.75,
    shotPowerMultiplier: 0.7,
    chaosTouch: true,
    element: 'wind',
    color: 0xe67e22,
  },
  congo: {
    id: 'congo',
    name: 'Kiala',
    team: 'Kongo',
    teamCode: 'COD',
    origin: 'Kinşasa, sapeur/rumba kültürü',
    archetype: 'Güçlü / iri',
    special: 'Ritimli zamanlama — doğru anda basınca power bonusu',
    speedMultiplier: 0.8,
    powerMultiplier: 1.3,
    shotPowerMultiplier: 1.25,
    chaosTouch: false,
    element: 'fire',
    color: 0x9b59b6,
  },
};

// Roster trimmed to 2 for now (Sami, 16.11) — argentina/kenya data kept, art parked.
export const CHARACTER_ORDER: CharacterId[] = ['brazil', 'congo'];

/** Real per-character art — procedural pixel art from
 * tools/pixelart/gen_sprites.py, one PNG per pose in
 * assets/characters/<id>/<pose>.png. `front`/`back`/`left`/`right` are the
 * idle turnaround, `run_<dir>_0..3` the run cycle (left/right only),
 * `slide`/`slide_right` the Dash pose (source faces left), plus jump,
 * kick, catch and stunned. */
export type CharacterPose =
  | 'front' | 'back' | 'left' | 'right'
  | 'slide' | 'slide_right' | 'jump' | 'jump_left' | 'jump_right'
  | 'kick_left' | 'kick_right' | 'catch' | 'stunned'
  | 'run_left_0' | 'run_left_1' | 'run_left_2' | 'run_left_3'
  | 'run_right_0' | 'run_right_1' | 'run_right_2' | 'run_right_3';
export const RUN_FRAME_COUNT = 4;
export const CHARACTER_POSES: CharacterPose[] = [
  'front', 'back', 'left', 'right', 'slide', 'slide_right', 'jump', 'jump_left', 'jump_right',
  'kick_left', 'kick_right', 'catch', 'stunned',
  'run_left_0', 'run_left_1', 'run_left_2', 'run_left_3',
  'run_right_0', 'run_right_1', 'run_right_2', 'run_right_3',
];

export function characterSpriteKey(id: CharacterId, pose: CharacterPose): string {
  return `${id}_${pose}`;
}
