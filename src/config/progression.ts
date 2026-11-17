/**
 * Progression (M8, Sami 17.11.2026: "karakter hangisi seçiliyse onda lvl
 * atlanır, belki ekstra değişebilen özellikler lvl'e göre açılır").
 * Saved per device (systems/profile.ts). All tuning lives here.
 */
import type { CharacterId } from './characters';

// --- Match rewards --------------------------------------------------------------
export const REWARD_XP = { base: 30, win: 40, draw: 15, perGoal: 10 } as const;
export const REWARD_GOLD = { win: 50, draw: 25, loss: 10, perGoal: 5 } as const;
/** Gems are rare: a win by this margin, and every character level-up. */
export const REWARD_GEMS_BIG_WIN = 1;
export const BIG_WIN_MARGIN = 3;
export const REWARD_GEMS_PER_LEVEL_UP = 5;

// --- Character levels -----------------------------------------------------------
export const CHARACTER_MAX_LEVEL = 10;
/** XP needed to go from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  return 100 + 50 * (level - 1);
}

// --- Account level (the star badge; every match's XP counts) --------------------
export const ACCOUNT_XP_PER_LEVEL = 250;

// --- Perks: unlocked by character level, equipped into slots -------------------
export type PerkId = 'quickDash' | 'warmStart' | 'wall' | 'secondWind';

export interface PerkDef {
  id: PerkId;
  name: string;
  description: string;
  unlockLevel: number;
}

export const PERKS: Record<PerkId, PerkDef> = {
  quickDash: { id: 'quickDash', name: 'Çevik', description: 'Dash bekleme 0.75 sn', unlockLevel: 2 },
  warmStart: { id: 'warmStart', name: 'Isınmış', description: 'Maça 1 enerjiyle başla', unlockLevel: 3 },
  wall: { id: 'wall', name: 'Duvar', description: 'Parry penceresi +3 kare', unlockLevel: 5 },
  secondWind: { id: 'secondWind', name: 'İkinci Nefes', description: 'Pasif enerji her 4 sn', unlockLevel: 7 },
};
export const PERK_ORDER: PerkId[] = ['quickDash', 'warmStart', 'wall', 'secondWind'];

/** Equip slots by character level: [level, slots] — highest matching wins. */
export const PERK_SLOTS_BY_LEVEL: [number, number][] = [
  [1, 0],
  [2, 1],
  [6, 2],
];

export function perkSlots(level: number): number {
  let slots = 0;
  for (const [lvl, n] of PERK_SLOTS_BY_LEVEL) if (level >= lvl) slots = n;
  return slots;
}

/** Gameplay effects of the equipped perks (only the human player). */
export interface PerkMods {
  dashCooldownMultiplier: number;
  startEnergy: number;
  parryWindowBonusSeconds: number;
  passiveGainSeconds: number | null;
}

export const PERK_EFFECTS = {
  quickDashCooldownMultiplier: 0.75,
  warmStartEnergy: 1,
  wallParryBonusFrames: 3,
  secondWindPassiveSeconds: 4,
} as const;

export function perkMods(perks: PerkId[]): PerkMods {
  return {
    dashCooldownMultiplier: perks.includes('quickDash') ? PERK_EFFECTS.quickDashCooldownMultiplier : 1,
    startEnergy: perks.includes('warmStart') ? PERK_EFFECTS.warmStartEnergy : 0,
    parryWindowBonusSeconds: perks.includes('wall') ? PERK_EFFECTS.wallParryBonusFrames / 60 : 0,
    passiveGainSeconds: perks.includes('secondWind') ? PERK_EFFECTS.secondWindPassiveSeconds : null,
  };
}

export const DEFAULT_CHARACTER: CharacterId = 'brazil';
export const PROFILE_STORAGE_KEY = 'pf.profile.v1';
