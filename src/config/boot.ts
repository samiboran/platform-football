/** M9.1 loading screen (BootScene) — drawn with plain shapes because the
 * pixel font is itself one of the files being loaded. */
export const BOOT_BAR_W = 420;
export const BOOT_BAR_H = 22;
export const BOOT_BAR_BORDER = 0xffffff;
export const BOOT_BAR_FILL = 0xffe066;
export const BOOT_BAR_BG = 0x1b1f2a;
export const BOOT_BALL_RADIUS = 14;
export const BOOT_BALL_SPIN_MS = 700;
/** Last measured cold-start time (ms from page start to the menu), kept for
 * debugging slow phones — read it from devtools: localStorage['pf.bootMs']. */
export const BOOT_TIME_STORAGE_KEY = 'pf.bootMs';
