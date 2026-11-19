import { CHARACTER_ORDER, type CharacterId } from '../config/characters';
import { LEAGUE_STAGES, leagueSlot, type LeagueMatchDef } from '../config/league';

/** The league match at a flat index, with its stage, or null past the end. */
export function leagueMatch(index: number): { def: LeagueMatchDef; stage: number; match: number } | null {
  const slot = leagueSlot(index);
  if (!slot) return null;
  return { def: LEAGUE_STAGES[slot.stage].matches[slot.match], ...slot };
}

/** The rival actually used: the preferred one unless it's the player's own
 * character or not playable yet — then the first other roster character. */
export function leagueRival(def: LeagueMatchDef, playerId: CharacterId): CharacterId {
  if (def.rival !== playerId && CHARACTER_ORDER.includes(def.rival)) return def.rival;
  return CHARACTER_ORDER.find((id) => id !== playerId) ?? def.rival;
}

/** "ŞEHİR 1/2"-style label for a league match. */
export function leagueMatchLabel(index: number): string {
  const m = leagueMatch(index);
  if (!m) return '';
  const stage = LEAGUE_STAGES[m.stage];
  return stage.matches.length > 1 ? `${stage.name} ${m.match + 1}/${stage.matches.length}` : stage.name;
}
