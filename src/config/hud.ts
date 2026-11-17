/**
 * Pixel-art HUD layout (M6.0). Sprites + the bitmap font come from
 * tools/pixelart/gen_sprites.py (assets/hud/). Every position/scale the
 * match HUD uses lives here.
 */
import { GAME_WIDTH } from './arena';

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
export const HUD_TEXTURES = [
  'hud_scoreboard',
  'hud_energy_full',
  'hud_energy_empty',
  'hud_button',
  'icon_coin',
  'icon_gem',
  'icon_star',
  'icon_whistle',
  'icon_shirt',
  'icon_lock',
] as const;

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

// --- Energy bars (top corners, M7.2) ------------------------------------------
// Top-left (you) / top-right (rival): never under a thumb on a phone. The
// rival's bar matters for the clash table (CLAUDE.md §5).
export const ENERGY_CELL_SCALE = 3;
export const ENERGY_BAR_X = 16;
export const ENERGY_BAR_Y = 44;
/** Rival bar's right edge (leaves room for the pause button). */
export const RIVAL_ENERGY_BAR_RIGHT = GAME_WIDTH - 76;
/** Gap between cells, screen px. */
export const ENERGY_CELL_GAP = 4;
export const ENERGY_LABEL = 'ENERJİ';
export const RIVAL_ENERGY_LABEL = 'RAKİP';
export const ENERGY_LABEL_SCALE = 2;
export const ENERGY_LABEL_COLOR = 0xffe066;
export const RIVAL_ENERGY_LABEL_COLOR = 0xff9a8a;
/** A cell that just filled pops to this scale factor for a moment. */
export const ENERGY_CELL_POP = 1.35;
/** Dark plate behind each bar so it reads over the stands. */
export const ENERGY_PLATE_COLOR = 0x0b0f14;
export const ENERGY_PLATE_ALPHA = 0.7;
export const ENERGY_PLATE_PAD = 6;
export const ENERGY_CELL_POP_MS = 160;

// --- Footer info (keyboard hints; hidden on touch devices) -------------------
export const FOOTER_FONT_SCALE = 2;
export const FOOTER_INFO_COLOR = 0xd8dde8;
export const FOOTER_KEYS_COLOR = 0xaab2c4;

// --- Pause (M7.2) -------------------------------------------------------------
export const PAUSE_BUTTON_X = GAME_WIDTH - 34;
export const PAUSE_BUTTON_Y = 34;
/** Square touch target, screen px (≥ 48 for a thumb). */
export const PAUSE_BUTTON_SIZE = 52;
export const PAUSE_OVERLAY_ALPHA = 0.7;
export const PAUSE_TITLE = 'DURAKLATILDI';
export const PAUSE_TITLE_SCALE = 5;
export const PAUSE_MENU_BUTTON_W = 280;
export const PAUSE_MENU_BUTTON_H = 60;
export const PAUSE_MENU_BUTTON_GAP = 16;
export const PAUSE_DEPTH = 40000;

// --- Generic menu buttons / cards (M7.4, systems/uiKit.ts) --------------------
export const UI_BUTTON_COLOR = 0x23324a;
export const UI_BUTTON_PRIMARY_COLOR = 0xc0392b;
export const UI_BUTTON_DISABLED_COLOR = 0x1a1f26;
export const UI_BUTTON_BORDER = 0xffffff;
export const UI_BUTTON_LABEL_SCALE = 3;
export const UI_BUTTON_PRESS_SCALE = 0.94;
export const UI_BG_COLOR = 0x0b0f14;
export const UI_TITLE_COLOR = 0xffe066;
export const UI_TEXT_COLOR = 0xd8dde8;
export const UI_DIM_TEXT_COLOR = 0x8a93a6;
