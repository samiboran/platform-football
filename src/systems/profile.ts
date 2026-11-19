import { CHARACTER_ORDER, type CharacterId } from '../config/characters';
import * as P from '../config/progression';
import { LEAGUE_MATCH_COUNT, LEAGUE_STAGES, leagueSlot } from '../config/league';
import { DEFAULT_EQUIPMENT, EQUIPMENT, equipById, type EquipSlot } from '../config/equipment';

/**
 * Player profile (M8): currencies, account XP, selected character, and each
 * character's XP + equipped perks. Stored in localStorage on this device;
 * if storage is unavailable the game still runs with an in-memory profile.
 */
export interface CharacterProgress {
  xp: number; // total XP earned with this character
  perks: P.PerkId[];
}

export interface Profile {
  /** Save schema version (config/progression.ts PROFILE_VERSION). */
  version: number;
  gold: number;
  gems: number;
  accountXp: number;
  selected: CharacterId;
  characters: Partial<Record<CharacterId, CharacterProgress>>;
  /** Equipment ids bought (price-0 starters are always owned). */
  owned: string[];
  equipped: Record<EquipSlot, string>;
  /** M9.2 league run: next match (flat index into LEAGUE_STAGES) and how
   * many times the player has won the Dünya Finali. */
  league: LeagueProgress;
}

export interface LeagueProgress {
  next: number;
  titles: number;
}

export interface MatchRewards {
  xp: number;
  gold: number;
  gems: number;
  levelBefore: number;
  levelAfter: number;
  newPerks: P.PerkId[];
}

let cache: Profile | null = null;

function fresh(): Profile {
  return {
    version: P.PROFILE_VERSION,
    gold: 0,
    gems: 0,
    accountXp: 0,
    selected: P.DEFAULT_CHARACTER,
    characters: {},
    owned: [],
    equipped: { ...DEFAULT_EQUIPMENT },
    league: { next: 0, titles: 0 },
  };
}

type RawSave = Record<string, unknown> & { version?: number };

/** One step per schema bump: MIGRATIONS[n] turns a v(n) save into v(n+1).
 * v1 saves have no `version` field. */
const MIGRATIONS: Record<number, (s: RawSave) => RawSave> = {
  1: (s) => ({ ...s, version: 2, owned: [], equipped: { ...DEFAULT_EQUIPMENT } }),
  2: (s) => ({ ...s, version: 3, league: { next: 0, titles: 0 } }),
};

export function migrateSave(raw: RawSave): RawSave {
  let s = raw;
  let v = typeof s.version === 'number' ? s.version : 1;
  while (v < P.PROFILE_VERSION && MIGRATIONS[v]) {
    s = MIGRATIONS[v](s);
    v = typeof s.version === 'number' ? s.version : v + 1;
  }
  return s;
}

function readSave(): RawSave | null {
  for (const key of [P.PROFILE_STORAGE_KEY, ...P.LEGACY_PROFILE_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as RawSave;
  }
  return null;
}

export function loadProfile(): Profile {
  if (cache) return cache;
  let p = fresh();
  let migrated = false;
  try {
    const saved = readSave();
    if (saved) {
      const before = saved.version ?? 1;
      p = { ...p, ...migrateSave(saved) } as Profile;
      migrated = before < P.PROFILE_VERSION;
    }
  } catch {
    /* corrupted or unavailable — start fresh */
  }
  if (!CHARACTER_ORDER.includes(p.selected)) p.selected = CHARACTER_ORDER[0];
  // Drop gear that no longer exists (renamed/removed items).
  p.owned = (p.owned ?? []).filter((id) => equipById(id));
  p.equipped = { ...DEFAULT_EQUIPMENT, ...(p.equipped ?? {}) };
  const lg = p.league ?? { next: 0, titles: 0 };
  p.league = {
    next: Math.min(Math.max(0, Math.floor(Number(lg.next) || 0)), LEAGUE_MATCH_COUNT),
    titles: Math.max(0, Math.floor(Number(lg.titles) || 0)),
  };
  for (const slot of Object.keys(DEFAULT_EQUIPMENT) as EquipSlot[]) {
    const item = equipById(p.equipped[slot]);
    if (!item || item.slot !== slot || !ownsItem(p, item.id)) p.equipped[slot] = DEFAULT_EQUIPMENT[slot];
  }
  cache = p;
  if (migrated) saveProfile();
  return p;
}

function ownsItem(p: Profile, id: string): boolean {
  const item = equipById(id);
  return !!item && (item.price === 0 || p.owned.includes(id));
}

export function owns(id: string): boolean {
  return ownsItem(loadProfile(), id);
}

/** Buy (if needed and affordable) and equip an item. False = not enough gold. */
export function buyOrEquip(id: string): boolean {
  const p = loadProfile();
  const item = equipById(id);
  if (!item) return false;
  if (!ownsItem(p, id)) {
    if (p.gold < item.price) return false;
    p.gold -= item.price;
    p.owned = [...p.owned, id];
  }
  p.equipped[item.slot] = id;
  saveProfile();
  return true;
}

/** Ids of the equipped items, one per slot. */
export function equippedItems(): string[] {
  return Object.values(loadProfile().equipped).filter((id) => EQUIPMENT.some((e) => e.id === id));
}

export function saveProfile(): void {
  if (!cache) return;
  try {
    window.localStorage.setItem(P.PROFILE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function progressOf(id: CharacterId): CharacterProgress {
  const p = loadProfile();
  if (!p.characters[id]) p.characters[id] = { xp: 0, perks: [] };
  return p.characters[id]!;
}

/** Level + XP inside the current level from a character's total XP. */
export function levelInfo(totalXp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = totalXp;
  while (level < P.CHARACTER_MAX_LEVEL && rest >= P.xpForNextLevel(level)) {
    rest -= P.xpForNextLevel(level);
    level += 1;
  }
  const need = level >= P.CHARACTER_MAX_LEVEL ? 0 : P.xpForNextLevel(level);
  return { level, into: level >= P.CHARACTER_MAX_LEVEL ? 0 : rest, need };
}

export function characterLevel(id: CharacterId): number {
  return levelInfo(progressOf(id).xp).level;
}

export function accountLevel(): { level: number; into: number; need: number } {
  const xp = loadProfile().accountXp;
  return {
    level: Math.floor(xp / P.ACCOUNT_XP_PER_LEVEL) + 1,
    into: xp % P.ACCOUNT_XP_PER_LEVEL,
    need: P.ACCOUNT_XP_PER_LEVEL,
  };
}

export function selectCharacter(id: CharacterId): void {
  loadProfile().selected = id;
  saveProfile();
}

/** Toggle a perk on the character if unlocked and a slot is free. */
export function togglePerk(id: CharacterId, perk: P.PerkId): boolean {
  const prog = progressOf(id);
  const lvl = characterLevel(id);
  if (prog.perks.includes(perk)) {
    prog.perks = prog.perks.filter((x) => x !== perk);
  } else {
    if (lvl < P.PERKS[perk].unlockLevel || prog.perks.length >= P.perkSlots(lvl)) return false;
    prog.perks = [...prog.perks, perk];
  }
  saveProfile();
  return true;
}

/** Equipped perks that are still valid (unlocked, within slots). */
export function equippedPerks(id: CharacterId): P.PerkId[] {
  const prog = progressOf(id);
  const lvl = characterLevel(id);
  return prog.perks.filter((x) => P.PERKS[x] && lvl >= P.PERKS[x].unlockLevel).slice(0, P.perkSlots(lvl));
}

/** Pay out a finished match to the character that played it. */
export function grantMatchRewards(
  id: CharacterId,
  goalsFor: number,
  goalsAgainst: number,
  rewardMultiplier = 1,
): MatchRewards {
  const p = loadProfile();
  const prog = progressOf(id);
  const win = goalsFor > goalsAgainst;
  const draw = goalsFor === goalsAgainst;
  const xp = Math.round(rewardMultiplier * (P.REWARD_XP.base + (win ? P.REWARD_XP.win : draw ? P.REWARD_XP.draw : 0) + goalsFor * P.REWARD_XP.perGoal));
  const gold = Math.round(rewardMultiplier * ((win ? P.REWARD_GOLD.win : draw ? P.REWARD_GOLD.draw : P.REWARD_GOLD.loss) + goalsFor * P.REWARD_GOLD.perGoal));
  const levelBefore = levelInfo(prog.xp).level;
  prog.xp += xp;
  const levelAfter = levelInfo(prog.xp).level;
  const gems =
    (win && goalsFor - goalsAgainst >= P.BIG_WIN_MARGIN ? P.REWARD_GEMS_BIG_WIN : 0) +
    (levelAfter - levelBefore) * P.REWARD_GEMS_PER_LEVEL_UP;
  p.gold += gold;
  p.gems += gems;
  p.accountXp += xp;
  const newPerks = P.PERK_ORDER.filter((k) => P.PERKS[k].unlockLevel > levelBefore && P.PERKS[k].unlockLevel <= levelAfter);
  saveProfile();
  return { xp, gold, gems, levelBefore, levelAfter, newPerks };
}

/** M9.2 league result: a win advances the run (stage bonus on a stage's
 * last match, a title on the final); a draw/loss leaves it where it is.
 * `index` is the match that was played — stale replays don't advance. */
export interface LeagueOutcome {
  index: number;
  won: boolean;
  /** Stage just cleared (its bonus was paid), else null. */
  stageCleared: number | null;
  bonusGold: number;
  bonusGems: number;
  champion: boolean;
}

export function recordLeagueResult(index: number, goalsFor: number, goalsAgainst: number): LeagueOutcome {
  const p = loadProfile();
  const won = goalsFor > goalsAgainst;
  const out: LeagueOutcome = { index, won, stageCleared: null, bonusGold: 0, bonusGems: 0, champion: false };
  if (!won || index !== p.league.next) return out;
  const slot = leagueSlot(index);
  if (!slot) return out;
  p.league.next = index + 1;
  const stage = LEAGUE_STAGES[slot.stage];
  if (slot.match === stage.matches.length - 1) {
    out.stageCleared = slot.stage;
    out.bonusGold = stage.bonusGold;
    out.bonusGems = stage.bonusGems;
    p.gold += stage.bonusGold;
    p.gems += stage.bonusGems;
    if (p.league.next >= LEAGUE_MATCH_COUNT) {
      out.champion = true;
      p.league.titles += 1;
    }
  }
  saveProfile();
  return out;
}

/** Start a new run after winning the final (titles are kept). */
export function restartLeague(): void {
  loadProfile().league.next = 0;
  saveProfile();
}
