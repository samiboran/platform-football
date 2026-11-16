/**
 * Pixel-art HUD layout (M6.0). Sprites + the bitmap font come from
 * tools/pixelart/gen_sprites.py (assets/hud/). Every position/scale the
 * match HUD uses lives here.
 */
import { GAME_WIDTH, GAME_HEIGHT } from './arena';

/** 1 sprite pixel = this many screen pixels (same as characters). */
export const HUD_PIXEL_SCALE = 2;

// --- Bitmap font ----------------------------------------------------------
export const PIXEL_FONT_KEY = 'pixel_font';
/** Must match FONT_CHARS order in gen_sprites.py exactly. */
export const PIXEL_FONT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :-.!?/()=+|ÇŞĞİÖÜ';
export const PIXEL_FONT_CELL_W = 4;
export const PIXEL_FONT_CELL_H = 8;
export const PIXEL_FONT_PER_ROW = 16;

/** Uppercases (Turkish rules) and maps anything the font lacks to a space. */
export function toHudText(s: string): string {
  const up = s.toLocaleUpperCase('tr-TR').replace(/[—–]/g, '-');
  let out = '';
  for (const ch of up) out += PIXEL_FONT_CHARS.includes(ch) ? ch : ' ';
  return out;
}

// --- Texture keys -----------------------------------------------------------
export const HUD_TEXTURES = ['hud_scoreboard', 'hud_energy_full', 'hud_energy_empty', 'hud_button'] as const;

// --- Scoreboard (top center) -----------------------------------------------
export const SCOREBOARD_Y = 4;
/** Sprite-pixel x of each team-code slot center / the score well center. */
export const SCOREBOARD_SLOT_LEFT_X = 16;
export const SCOREBOARD_SLOT_RIGHT_X = 94;
export const SCOREBOARD_WELL_X = 55;
export const SCOREBOARD_HEIGHT = 18;
export const SCORE_FONT_SCALE = 4;
export const TEAM_CODE_FONT_SCALE = 2;
export const TEAM_CODE_LENGTH = 3;
export const SCORE_COLOR = 0xffe066;
export const TEAM_CODE_COLOR = 0xffffff;
export const TIMER_FONT_SCALE = 2;
export const TIMER_COLOR = 0xffffff;
export const TIMER_LOW_COLOR = 0xff6b5a;
export const TIMER_LOW_SECONDS = 15;

// --- Energy bar (bottom left) -----------------------------------------------
export const ENERGY_BAR_X = 16;
export const ENERGY_BAR_Y = GAME_HEIGHT - 40;
/** Gap between cells, screen px. */
export const ENERGY_CELL_GAP = 4;
export const ENERGY_LABEL = 'ENERJİ';
export const ENERGY_LABEL_SCALE = 2;
export const ENERGY_LABEL_COLOR = 0xffe066;

// --- Footer info / test button ------------------------------------------------
export const FOOTER_FONT_SCALE = 2;
export const FOOTER_INFO_COLOR = 0xd8dde8;
export const FOOTER_KEYS_COLOR = 0xaab2c4;
export const END_BUTTON_X = GAME_WIDTH - 60;
export const END_BUTTON_Y = 18;
