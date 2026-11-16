/**
 * Touch controls tuning (CLAUDE.md section 4 + 10: mobile-first, big
 * targets). Floating joystick: a touch ANYWHERE in the left zone spawns
 * the stick under the thumb, like most mobile action games — no need to
 * hit a small fixed circle.
 */
import { GAME_WIDTH, GAME_HEIGHT } from './arena';

// --- Floating joystick ------------------------------------------------------
/** The left part of the screen (fraction of GAME_WIDTH) that acts as the
 * joystick zone. */
export const JOYSTICK_ZONE_WIDTH_FRACTION = 0.5;
/** Touches above this y (screen px) are ignored — keeps the HUD strip free. */
export const JOYSTICK_ZONE_TOP = 60;
/** Knob travel for full deflection, screen px. Smaller = more sensitive. */
export const JOYSTICK_RADIUS = 52;
/** Below this fraction of JOYSTICK_RADIUS the output is 0 (thumb jitter). */
export const JOYSTICK_DEAD_ZONE = 0.12;
/** When the thumb drags further than the radius, the base follows it so
 * reversing direction is always one short swipe away. */
export const JOYSTICK_FOLLOW = true;
/** Where the idle stick is drawn (a hint; touching anywhere in the zone works). */
export const JOYSTICK_REST_X = 110;
export const JOYSTICK_REST_Y = GAME_HEIGHT - 110;
/** Idle / active visual alpha of the stick. */
export const JOYSTICK_IDLE_ALPHA = 0.35;
export const JOYSTICK_ACTIVE_ALPHA = 1;

// --- Buttons (diamond cluster, bottom right) ---------------------------------
export const BUTTON_CLUSTER_X = GAME_WIDTH - 125;
export const BUTTON_CLUSTER_Y = GAME_HEIGHT - 118;
/** Distance from cluster center to each button center. */
export const BUTTON_SPACING = 66;
export const BUTTON_RADIUS = 40;
/** Aksiyon is the primary button — biggest. */
export const BUTTON_ACTION_RADIUS = 48;
/** Touch hit area is this much larger than the drawn circle. */
export const BUTTON_HIT_SCALE = 1.2;
export const BUTTON_LABEL_SCALE = 2;
/** Button fill: dark so the white labels read on light sand too. */
export const BUTTON_FILL_COLOR = 0x10131a;
export const BUTTON_FILL_ALPHA = 0.45;
export const BUTTON_ACTIVE_COLOR = 0x2ecc71;
export const BUTTON_ACTIVE_ALPHA = 0.6;
