/**
 * Menu layout (M7.4) — landscape phone first: few, big touch targets.
 * Everything in game pixels (960×540, scaled to the screen).
 */
export const MENU_TITLE = 'PLATFORM FOOTBALL';
export const MENU_SUBTITLE = 'SOKAK DÜNYA KUPASI';
export const MENU_TITLE_SCALE = 8;
export const MENU_SUBTITLE_SCALE = 3;
export const MENU_TITLE_Y = 80;
export const MENU_BALL_Y = 222;
export const MENU_BALL_SCALE = 4;
export const MENU_BALL_BOB_PX = 10;
export const MENU_BALL_BOB_MS = 700;
export const MENU_PLAY_Y = 340;
export const MENU_FULLSCREEN_Y = 430;
export const MENU_BUTTON_W = 320;
export const MENU_BUTTON_H = 70;
export const MENU_PLAY_LABEL = 'OYNA';
export const MENU_FULLSCREEN_LABEL = 'TAM EKRAN';

/** Screen header + bottom bar shared by the select screens. */
export const SELECT_TITLE_Y = 40;
export const SELECT_TITLE_SCALE = 5;
export const SELECT_BOTTOM_Y = 492;
export const SELECT_BACK_W = 180;
export const SELECT_NEXT_W = 300;
export const SELECT_BUTTON_H = 64;
export const SELECT_CARD_BG = 0x1a1f26;
export const SELECT_CARD_BORDER = 0x555555;
export const SELECT_CARD_SELECTED_BORDER = 0xffe066;
export const SELECT_CARD_SELECTED_WIDTH = 5;

/** Character cards. */
export const CHAR_CARD_W = 400;
export const CHAR_CARD_H = 370;
export const CHAR_CARD_GAP = 30;
export const CHAR_CARD_Y = 262;
export const CHAR_PORTRAIT_SCALE = 3;
export const CHAR_STAT_BAR_W = 150;
export const CHAR_STAT_BAR_H = 12;
/** Stat multiplier mapped to an empty → full bar. */
export const CHAR_STAT_MIN = 0.6;
export const CHAR_STAT_MAX = 1.4;
export const CHAR_STAT_COLOR = 0xffe066;
export const CHAR_STAT_BG = 0x333a46;
/** Remember the last pick between visits (per-device convenience). */
export const LAST_CHARACTER_KEY = 'pf.lastCharacter';
export const LAST_STADIUM_KEY = 'pf.lastStadium';

/** Stadium cards (2×2 grid). */
export const STADIUM_CARD_W = 420;
export const STADIUM_CARD_H = 170;
export const STADIUM_CARD_GAP = 20;
export const STADIUM_GRID_TOP = 90;

/** Result screen. */
export const RESULT_TITLE_Y = 110;
export const RESULT_SCORE_Y = 220;
export const RESULT_SCORE_SCALE = 12;
export const RESULT_BUTTONS_Y = 400;
/** Title → subtitle distance. */
export const MENU_SUBTITLE_GAP = 50;
