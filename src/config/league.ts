/**
 * League / story mode (M9.2, CLAUDE.md §6 "Sokak Dünya Kupası", M5's open
 * "mahalle → şehir → kıta → dünya finali"). Data only: the run is a fixed
 * ladder of matches, each with its pitch, AI difficulty and (when the
 * roster allows) the rival character. Win = next match; draw or loss =
 * play the same match again (no penalty). Clearing a stage pays a bonus;
 * the final crowns the player champion and the ladder can be replayed.
 */
import type { CharacterId } from './characters';
import type { DifficultyId } from './difficulty';
import type { StadiumId } from './stadiums';

export interface LeagueMatchDef {
  stadium: StadiumId;
  difficulty: DifficultyId;
  /** Preferred rival; if it's the player's own character (or not in the
   * roster yet) another roster character is used instead. */
  rival: CharacterId;
}

export interface LeagueStageDef {
  id: string;
  name: string;
  /** Short line under the stage name. */
  tagline: string;
  matches: LeagueMatchDef[];
  /** Bonus paid once when the stage's last match is won. */
  bonusGold: number;
  bonusGems: number;
  /** Map card colour. */
  color: number;
}

export const LEAGUE_STAGES: LeagueStageDef[] = [
  {
    id: 'mahalle',
    name: 'Mahalle',
    tagline: 'Sokak arası',
    matches: [
      { stadium: 'standard', difficulty: 'easy', rival: 'congo' },
      { stadium: 'brazil', difficulty: 'easy', rival: 'brazil' },
    ],
    bonusGold: 60,
    bonusGems: 0,
    color: 0x2fae5a,
  },
  {
    id: 'sehir',
    name: 'Şehir',
    tagline: 'Şehir turnuvası',
    matches: [
      { stadium: 'argentina', difficulty: 'normal', rival: 'congo' },
      { stadium: 'kenya', difficulty: 'normal', rival: 'brazil' },
    ],
    bonusGold: 100,
    bonusGems: 1,
    color: 0x2f9ae0,
  },
  {
    id: 'kita',
    name: 'Kıta',
    tagline: 'Kıta kupası',
    matches: [
      { stadium: 'congo', difficulty: 'normal', rival: 'congo' },
      { stadium: 'brazil', difficulty: 'hard', rival: 'brazil' },
    ],
    bonusGold: 150,
    bonusGems: 2,
    color: 0xc06a2a,
  },
  {
    id: 'final',
    name: 'Dünya Finali',
    tagline: 'Sokak Dünya Kupası',
    matches: [{ stadium: 'standard', difficulty: 'hard', rival: 'congo' }],
    bonusGold: 250,
    bonusGems: 5,
    color: 0xd4a017,
  },
];

/** Extra multiplier on match XP/gold in league games (on top of the
 * difficulty's own reward multiplier). */
export const LEAGUE_REWARD_MULTIPLIER = 1.1;

/** Total matches in one run. */
export const LEAGUE_MATCH_COUNT = LEAGUE_STAGES.reduce((n, s) => n + s.matches.length, 0);

/** Flat match index → stage + match inside it. */
export function leagueSlot(index: number): { stage: number; match: number } | null {
  let i = index;
  for (let s = 0; s < LEAGUE_STAGES.length; s += 1) {
    if (i < LEAGUE_STAGES[s].matches.length) return { stage: s, match: i };
    i -= LEAGUE_STAGES[s].matches.length;
  }
  return null;
}

/** Flat index of a stage's first match. */
export function stageStartIndex(stage: number): number {
  return LEAGUE_STAGES.slice(0, stage).reduce((n, s) => n + s.matches.length, 0);
}

// --- League screen layout -------------------------------------------------------
export const LEAGUE_TITLE = 'SOKAK DÜNYA KUPASI';
export const LEAGUE_STAGE_CARD_W = 200;
export const LEAGUE_STAGE_CARD_H = 170;
export const LEAGUE_STAGE_GAP = 24;
export const LEAGUE_STAGE_Y = 190;
export const LEAGUE_DOT_R = 13;
export const LEAGUE_DOT_GAP = 36;
export const LEAGUE_DOT_DONE = 0x7cff9a;
export const LEAGUE_DOT_NEXT = 0xffe066;
export const LEAGUE_DOT_LOCKED = 0x4a4a66;
export const LEAGUE_LOCKED_ALPHA = 0.45;
/** Gap between the gold and gem parts of a stage's bonus row. */
export const LEAGUE_BONUS_GAP = 14;
export const LEAGUE_NEXT_PANEL_Y = 352;
export const LEAGUE_NEXT_PANEL_W = 760;
export const LEAGUE_NEXT_PANEL_H = 96;
export const LEAGUE_PLAY_W = 320;
export const LEAGUE_RESET_W = 300;
export const LEAGUE_PLAY_COLOR = 0x2fae5a;
