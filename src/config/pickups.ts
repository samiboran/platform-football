/**
 * Energy drink pickup tuning (CLAUDE.md section 5, 16.11.2026 rules):
 * every ~12 s a pair of drinks appears, one in each half at mirrored
 * positions, +1 energy (rarely a golden +2).
 */

/** Seconds between two spawns (the first spawn also waits this long). */
export const DRINK_SPAWN_INTERVAL_SECONDS = 12;
/** An uncollected drink disappears after this long. */
export const DRINK_LIFETIME_SECONDS = 8;
/** Last part of the lifetime during which the can blinks before vanishing. */
export const DRINK_BLINK_SECONDS = 2;
export const DRINK_BLINK_PERIOD_SECONDS = 0.15;

export const DRINK_ENERGY = 1;
export const DRINK_GOLDEN_ENERGY = 2;
/** Chance that a spawn pair is golden (both halves alike — mirrored = fair). */
export const DRINK_GOLDEN_CHANCE = 0.15;

/** Spawn area, as fractions of the half-field: distance from the center
 * line (0 = center line, 1 = goal line) and of the depth band. Keeps the
 * cans out of the goal mouth and off the touchlines. */
export const DRINK_SPAWN_X_FRACTION_MIN = 0.2;
export const DRINK_SPAWN_X_FRACTION_MAX = 0.7;
export const DRINK_SPAWN_Z_FRACTION_MIN = 0.15;
export const DRINK_SPAWN_Z_FRACTION_MAX = 0.85;

/** Pickup tolerance (world units). z is wider than x, same as ball contact
 * (CLAUDE.md section 3). */
export const DRINK_PICKUP_RANGE_X = 26;
export const DRINK_PICKUP_RANGE_Z = 34;
/** A character jumping higher than this sails over the can. */
export const DRINK_PICKUP_MAX_HEIGHT = 40;

/** Rendering: sprite-pixel scale and a gentle hover bob. */
export const DRINK_SPRITE_PIXEL_SCALE = 2;
export const DRINK_BOB_PX = 3;
export const DRINK_BOB_PERIOD_SECONDS = 0.9;

export const DRINK_TEXTURE_KEY = 'energy_drink';
export const DRINK_GOLD_TEXTURE_KEY = 'energy_drink_gold';
