/**
 * The four playable kids (CLAUDE.md section 6) — data only, no code branches
 * per character. Stats are multipliers on the base tuning in movement.ts /
 * ball.ts (1.0 = baseline). `color` is a placeholder tint until real
 * sprites land in assets/characters/<id>/ (M4 — "sen sprite üretmiyorsun").
 *
 * `special` names the 3-segment super move; the mechanic itself needs the
 * power bar from M3 and isn't implemented yet.
 */

export type CharacterId = 'brazil' | 'argentina' | 'kenya' | 'congo';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  origin: string;
  archetype: string;
  special: string;
  /** Ground move speed multiplier (x/z). */
  speedMultiplier: number;
  /** Ball-touch push strength multiplier. */
  powerMultiplier: number;
  /** Placeholder for the M3 shot-power stat — how hard a "power şut" lands. */
  shotPowerMultiplier: number;
  /** Placeholder for the M3 catch-chance stat (goalkeeping). */
  catchChance: number;
  /** Catch cooldown in seconds (CLAUDE.md: ~5-8s, per character). */
  cooldownSeconds: number;
  /** Kenya's plastic-bag ball wobbles unpredictably in the air — a small
   * random jitter added whenever this character touches the ball. */
  chaosTouch: boolean;
  color: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  brazil: {
    id: 'brazil',
    name: 'Brezilya',
    origin: 'Favela/plaj çocuğu',
    archetype: 'Hızlı / elektrik',
    special: 'Capoeira ters vuruşu (ginga çalımı)',
    speedMultiplier: 1.25,
    powerMultiplier: 0.9,
    shotPowerMultiplier: 0.95,
    catchChance: 0.9,
    cooldownSeconds: 5,
    chaosTouch: false,
    color: 0xf1c40f,
  },
  argentina: {
    id: 'argentina',
    name: 'Arjantin',
    origin: 'Potrero (toprak arsa) çocuğu',
    archetype: 'Dengeli',
    special: 'Gambeta — dar alanda top kontrolü',
    speedMultiplier: 1.0,
    powerMultiplier: 1.0,
    shotPowerMultiplier: 1.0,
    catchChance: 1.0,
    cooldownSeconds: 6.5,
    chaosTouch: false,
    color: 0x6fa8dc,
  },
  kenya: {
    id: 'kenya',
    name: 'Kenya',
    origin: 'Topunu poşetten yapan çocuk',
    archetype: 'Zayıf şut, kaotik',
    special: 'Poşet top — havada öngörülemez sapar',
    speedMultiplier: 0.95,
    powerMultiplier: 0.75,
    shotPowerMultiplier: 0.7,
    catchChance: 0.85,
    cooldownSeconds: 7,
    chaosTouch: true,
    color: 0xe67e22,
  },
  congo: {
    id: 'congo',
    name: 'Kongo',
    origin: 'Kinşasa, sapeur/rumba kültürü',
    archetype: 'Güçlü / iri',
    special: 'Ritimli zamanlama — doğru anda basınca power bonusu',
    speedMultiplier: 0.8,
    powerMultiplier: 1.3,
    shotPowerMultiplier: 1.25,
    catchChance: 1.1,
    cooldownSeconds: 8,
    chaosTouch: false,
    color: 0x9b59b6,
  },
};

export const CHARACTER_ORDER: CharacterId[] = ['brazil', 'argentina', 'kenya', 'congo'];
