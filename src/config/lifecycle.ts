/**
 * M9.1 app lifecycle: Android back button + background pause/mute.
 * Event names are emitted on `game.events`; dialog layout in game pixels.
 */

/** Emitted when the app/tab goes to the background (scene should pause). */
export const APP_BACKGROUND_EVENT = 'pf-app-background';
/** Emitted when the app/tab comes back to the foreground. */
export const APP_FOREGROUND_EVENT = 'pf-app-foreground';

/** Back-button routing for scenes without their own handler (scene key → target key). */
export const BACK_TARGETS: Record<string, string> = {
  Characters: 'Menu',
  Equipment: 'Menu',
  Settings: 'Menu',
  StadiumSelect: 'Menu',
  Result: 'Menu',
};

/** "Çıkılsın mı?" dialog on the main menu. */
export const EXIT_DIALOG_TITLE = 'ÇIKILSIN MI?';
export const EXIT_DIALOG_YES = 'EVET';
export const EXIT_DIALOG_NO = 'HAYIR';
export const EXIT_DIALOG_W = 460;
export const EXIT_DIALOG_H = 230;
export const EXIT_DIALOG_TITLE_SCALE = 4;
export const EXIT_DIALOG_BUTTON_W = 180;
export const EXIT_DIALOG_BUTTON_H = 64;
export const EXIT_DIALOG_BUTTON_GAP = 30;
export const EXIT_DIALOG_OVERLAY_ALPHA = 0.65;
export const EXIT_DIALOG_PANEL_COLOR = 0x1c1640;
export const EXIT_DIALOG_YES_COLOR = 0xc0392b;
export const EXIT_DIALOG_NO_COLOR = 0x23324a;
export const EXIT_DIALOG_DEPTH = 50000;
