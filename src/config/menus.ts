/**
 * Menu layout (M7.4) — landscape phone first: few, big touch targets.
 * Everything in game pixels (960×540, scaled to the screen).
 */

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

/** Character stat bars. */
/** Stat multiplier mapped to an empty → full bar. */
export const CHAR_STAT_MIN = 0.6;
export const CHAR_STAT_MAX = 1.4;
export const CHAR_STAT_COLOR = 0xffe066;
export const LAST_STADIUM_KEY = 'pf.lastStadium';

/** Stadium cards (2×2 grid). */
export const STADIUM_CARD_W = 420;
export const STADIUM_CARD_H = 124;
export const STADIUM_CARD_GAP = 14;
/** The standard pitch: one wide, short card above the themed 2×2 grid. */
export const STADIUM_WIDE_CARD_H = 84;
/** Inner padding of the pitch swatch on a stadium card. */
export const STADIUM_CARD_PAD = 12;
/** Wide card: x offset of the description from the name column. */
export const STADIUM_WIDE_DESC_DX = 260;
export const STADIUM_GRID_TOP = 78;


// --- M8 hub ("pixel modern": rounded, glossy panels over a pixel stadium) -----
export const HUB_SKY_TOP = 0x1a1450;
export const HUB_SKY_BOTTOM = 0x3a2a7a;
export const HUB_PITCH_TOP_Y = 330;
export const HUB_PITCH_COLOR_A = 0x2f8a3a;
export const HUB_PITCH_COLOR_B = 0x37a044;
export const HUB_PITCH_STRIPE_W = 60;
export const HUB_CROWD_Y = 250;
export const HUB_CROWD_ROWS = 3;
export const HUB_CROWD_SCALE = 2;
export const HUB_LIGHT_COLOR = 0xfff6c0;
export const HUB_BOTTOM_BAR_COLOR = 0x241a4a;
export const HUB_BOTTOM_BAR_Y = 452;

export const HUB_TOP_Y = 30;
export const HUB_PILL_H = 38;
export const HUB_PILL_COLOR = 0x101028;
export const HUB_PILL_ALPHA = 0.8;
export const HUB_ACCOUNT_X = 24;
export const HUB_ACCOUNT_BAR_W = 150;
export const HUB_GOLD_X = 520;
export const HUB_GEM_X = 690;
export const HUB_PILL_W = 150;

export const HUB_CHAR_X = 480;
export const HUB_CHAR_FEET_Y = 372;
export const HUB_CHAR_HEIGHT = 190;
export const HUB_CHAR_BOB_PX = 4;
export const HUB_CHAR_BOB_MS = 900;
export const HUB_PEDESTAL_W = 230;
export const HUB_PEDESTAL_H = 56;
export const HUB_PEDESTAL_TOP = 0xd8dce8;
export const HUB_PEDESTAL_SIDE = 0x8a90a8;
export const HUB_PEDESTAL_RING = 0x5ad0ff;
export const HUB_NAMEPLATE_Y = 418;
export const HUB_NAMEPLATE_W = 260;

export const HUB_SIDE_CARD_W = 220;
export const HUB_SIDE_CARD_H = 190;
export const HUB_SIDE_CARD_Y = 250;
export const HUB_SIDE_CARD_LEFT_X = 150;
export const HUB_SIDE_CARD_RIGHT_X = 810;
export const HUB_CARD_COLOR = 0x1c1640;
export const HUB_CARD_ALPHA = 0.88;

export const HUB_BUTTON_Y = 496;
// M9.2: bottom row re-spaced to fit LİG between KARAKTER and OYNA.
export const HUB_PLAY_X = 727;
export const HUB_PLAY_W = 386;
export const HUB_PLAY_H = 80;
export const HUB_PLAY_COLOR = 0x2f9ae0;
export const HUB_CHAR_BTN_X = 160;
export const HUB_CHAR_BTN_W = 260;
/** M9.2 league button (Sokak Dünya Kupası). */
export const HUB_LEAGUE_BTN_X = 412;
export const HUB_LEAGUE_BTN_W = 210;
export const HUB_LEAGUE_BTN_COLOR = 0xd4a017;
export const HUB_CHAR_BTN_COLOR = 0x6a4ac0;
/** EKİPMAN button in the hub's top bar (between account level and gold). */
export const HUB_EQUIP_BTN_X = 335;
export const HUB_EQUIP_BTN_W = 170;
export const HUB_EQUIP_BTN_H = 44;
export const HUB_EQUIP_BTN_COLOR = 0xc06a2a;
/** AYAR (settings) button in the hub's top bar, right of the gem pill. */
export const HUB_SETTINGS_BTN_X = 808;
export const HUB_SETTINGS_BTN_W = 76;
export const HUB_SETTINGS_BTN_COLOR = 0x34495e;

// --- Fancy (pixel-modern) button ----------------------------------------------
export const FANCY_RADIUS = 14;
export const FANCY_LIP = 6;
export const FANCY_OUTLINE = 0xffffff;
export const FANCY_ICON_SCALE = 4;

// --- M8 Karakter screen --------------------------------------------------------
export const CHARS_LIST_X = 120;
export const CHARS_LIST_TOP = 110;
export const CHARS_TILE_W = 200;
export const CHARS_TILE_H = 86;
export const CHARS_TILE_GAP = 12;
export const CHARS_DETAIL_X = 600;
export const CHARS_DETAIL_Y = 270;
export const CHARS_DETAIL_W = 680;
export const CHARS_DETAIL_H = 330;
export const CHARS_PERK_ROW_H = 54;
export const CHARS_SELECT_COLOR = 0x2fae5a;
export const CHARS_COMING_SOON = 'YAKINDA';
