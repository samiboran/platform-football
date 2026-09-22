/**
 * Single source of truth for every arena measurement (CLAUDE.md section 3).
 * Scenes and systems read from here — nothing below should be hardcoded
 * anywhere else, so balance passes only ever touch this file.
 */

// --- Logical resolution -----------------------------------------------
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// --- Character scale -----------------------------------------------
/** ~12-15% of screen height, per CLAUDE.md. */
export const CHARACTER_HEIGHT = 70;
/** Placeholder sprite-box width until real art lands (M4). */
export const CHARACTER_WIDTH = 42;

// --- Depth band (z axis, drawn as up/down on screen) -------------------
/** ~3 character heights tall, per CLAUDE.md. */
export const DEPTH_BAND_HEIGHT = CHARACTER_HEIGHT * 3;
/** z=0 is the near touchline, z=DEPTH_MAX is the far touchline. */
export const DEPTH_MIN = 0;
export const DEPTH_MAX = DEPTH_BAND_HEIGHT;
/**
 * World-to-screen depth conversion factor. z is tracked in the same units
 * as screen pixels for now (scale 1) — revisit if a match/court needs a
 * different feel once M1 movement is in.
 */
export const DEPTH_SCALE = 1;

// --- Horizontal layout (x axis, left/right halves) ----------------------
/** Half-pitch width ≈ 4-5 character widths, per CLAUDE.md — using 4.5. */
export const CHARACTER_WIDTHS_PER_HALF = 4.5;
export const HALF_FIELD_WIDTH = CHARACTER_WIDTH * CHARACTER_WIDTHS_PER_HALF;
export const FIELD_WIDTH = HALF_FIELD_WIDTH * 2;

export const CENTER_X = GAME_WIDTH / 2;
/** x of the vertical center line — players cannot cross this. */
export const CENTER_LINE_X = CENTER_X;
export const LEFT_GOAL_LINE_X = CENTER_X - HALF_FIELD_WIDTH;
export const RIGHT_GOAL_LINE_X = CENTER_X + HALF_FIELD_WIDTH;

/** Extra depth (in x) behind each goal line where a goal registers. */
export const GOAL_ZONE_DEPTH = CHARACTER_WIDTH * 1.2;
export const LEFT_GOAL_BACK_X = LEFT_GOAL_LINE_X - GOAL_ZONE_DEPTH;
export const RIGHT_GOAL_BACK_X = RIGHT_GOAL_LINE_X + GOAL_ZONE_DEPTH;

// --- Goal mouth (z axis) -------------------------------------------------
/** Goal mouth spans ~50% of the depth band, centered. */
export const GOAL_MOUTH_HEIGHT = DEPTH_BAND_HEIGHT * 0.5;
export const GOAL_MOUTH_Z_MIN = (DEPTH_BAND_HEIGHT - GOAL_MOUTH_HEIGHT) / 2;
export const GOAL_MOUTH_Z_MAX = GOAL_MOUTH_Z_MIN + GOAL_MOUTH_HEIGHT;

// --- Screen-space anchors -------------------------------------------------
export const PITCH_CENTER_Y = GAME_HEIGHT / 2;
/** z=0 (near touchline) screen Y — the "ground" baseline. */
export const BASE_Y = PITCH_CENTER_Y + DEPTH_BAND_HEIGHT / 2;
/** z=DEPTH_MAX (far touchline) screen Y. */
export const FAR_Y = PITCH_CENTER_Y - DEPTH_BAND_HEIGHT / 2;

/**
 * The 2.5D projection formula from CLAUDE.md section 3:
 * screenY = baseY - z * depthScale - y
 */
export function projectToScreen(x: number, z: number, y: number): { screenX: number; screenY: number } {
  return {
    screenX: x,
    screenY: BASE_Y - z * DEPTH_SCALE - y,
  };
}

/** Hit-testing tolerance on z should be looser than on x (CLAUDE.md section 3). */
export const CONTACT_TOLERANCE_X = CHARACTER_WIDTH * 0.6;
export const CONTACT_TOLERANCE_Z = CHARACTER_HEIGHT * 0.9;
