/**
 * Single source of truth for every arena measurement (CLAUDE.md section 3).
 * Scenes and systems read from here — nothing below should be hardcoded
 * anywhere else, so balance passes only ever touch this file.
 */

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// --- Logical resolution -----------------------------------------------
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// --- Character scale -----------------------------------------------
/** ~12-15% of screen height, per CLAUDE.md. */
export const CHARACTER_HEIGHT = 70;
/**
 * "Character width" as used everywhere in this file (half-field sizing,
 * goal-zone depth, x contact tolerance) is a gameplay FOOTPRINT/personal-
 * space unit, not the rendered sprite's pixel width — a literal humanoid
 * silhouette width (~40px) made the half-field far too narrow (4-5 of
 * those widths left huge dead backdrop on both sides and failed the
 * "iki kale aynı anda görünür" framing goal from CLAUDE.md section 3;
 * verified visually before M1 — see docs/PROGRESS.md). 70 keeps the
 * 4-5-character-widths rule but sizes the pitch to actually fill the frame.
 */
export const CHARACTER_WIDTH = 70;
/** Narrower box for the placeholder sprite render — keeps it human-shaped
 * even though CHARACTER_WIDTH (above) is wider for layout math. */
export const CHARACTER_SPRITE_WIDTH = 40;

// --- Depth band (z axis, drawn as up/down on screen) -------------------
/** ~3 character heights tall, per CLAUDE.md. */
export const DEPTH_BAND_HEIGHT = CHARACTER_HEIGHT * 3;
/** z=0 is the near touchline, z=DEPTH_MAX is the far touchline. */
export const DEPTH_MIN = 0;
export const DEPTH_MAX = DEPTH_BAND_HEIGHT;

/** Fraction of GAME_HEIGHT the pitch (touchline-to-touchline) should fill
 * on screen — the rest is the stands band + a thin bottom margin. */
const PITCH_SCREEN_FILL = 0.9;
/**
 * World-to-screen depth conversion factor — the knob for "how much upward
 * screen movement each unit of z produces." Defaults to filling
 * PITCH_SCREEN_FILL of the screen; override this constant directly for a
 * different feel (bigger = pitch reads "closer/zoomed", smaller = "farther").
 */
export const DEPTH_SCALE = (GAME_HEIGHT * PITCH_SCREEN_FILL) / DEPTH_MAX;

// --- Perspective shrink (applies to anything with real-world height:
// characters, the ball, goalposts) -----------------------------------
/** Scale at the far touchline; scale is 1.0 at the near touchline. */
export const DEPTH_FAR_SCALE = 0.85;

/** 1.0 near the camera, DEPTH_FAR_SCALE at the far touchline, lerped by z. */
export function depthScaleAt(z: number): number {
  return lerp(1, DEPTH_FAR_SCALE, clamp01((z - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)));
}

// --- Horizontal layout (x axis, left/right halves) ----------------------
/** Half-pitch width ≈ 4-5 character widths, per CLAUDE.md — using 4.5. */
export const CHARACTER_WIDTHS_PER_HALF = 4.5;
export const HALF_FIELD_WIDTH = CHARACTER_WIDTH * CHARACTER_WIDTHS_PER_HALF;
export const FIELD_WIDTH = HALF_FIELD_WIDTH * 2;

export const CENTER_X = GAME_WIDTH / 2;
/** x of the vertical center line — players cannot cross this. Stays a
 * straight vertical line on screen at any depth (it's the trapezoid's own
 * axis of symmetry), unlike every other x position. */
export const CENTER_LINE_X = CENTER_X;
export const LEFT_GOAL_LINE_X = CENTER_X - HALF_FIELD_WIDTH;
export const RIGHT_GOAL_LINE_X = CENTER_X + HALF_FIELD_WIDTH;

/** Extra depth (in x) behind each goal line where a goal registers. */
export const GOAL_ZONE_DEPTH = CHARACTER_WIDTH * 1.2;
export const LEFT_GOAL_BACK_X = LEFT_GOAL_LINE_X - GOAL_ZONE_DEPTH;
export const RIGHT_GOAL_BACK_X = RIGHT_GOAL_LINE_X + GOAL_ZONE_DEPTH;

/** Far edge of the pitch is this fraction of the near edge's width — the
 * trapezoid taper. 0.75 = far edge is ~25% narrower than the near edge. */
export const PITCH_FAR_WIDTH_RATIO = 0.75;

/** How much a world x is pulled toward CENTER_X at depth z (trapezoid). */
export function widthScaleAt(z: number): number {
  return lerp(1, PITCH_FAR_WIDTH_RATIO, clamp01((z - DEPTH_MIN) / (DEPTH_MAX - DEPTH_MIN)));
}

// --- Goal mouth (z axis) -------------------------------------------------
/** Goal mouth spans ~50% of the depth band, centered. */
export const GOAL_MOUTH_HEIGHT = DEPTH_BAND_HEIGHT * 0.5;
export const GOAL_MOUTH_Z_MIN = (DEPTH_BAND_HEIGHT - GOAL_MOUTH_HEIGHT) / 2;
export const GOAL_MOUTH_Z_MAX = GOAL_MOUTH_Z_MIN + GOAL_MOUTH_HEIGHT;
/** Real goals run ~1.35x a player's height. */
export const GOAL_HEIGHT = CHARACTER_HEIGHT * 1.4;

// --- Screen-space anchors -------------------------------------------------
export const PITCH_CENTER_Y = GAME_HEIGHT / 2;
/** z=0 (near touchline) screen Y — the "ground" baseline. */
export const BASE_Y = PITCH_CENTER_Y + (DEPTH_SCALE * DEPTH_MAX) / 2;
/** z=DEPTH_MAX (far touchline) screen Y — stands band sits above this. */
export const FAR_Y = PITCH_CENTER_Y - (DEPTH_SCALE * DEPTH_MAX) / 2;

/**
 * The 2.5D projection formula from CLAUDE.md section 3, extended with the
 * trapezoid taper on x: screenY = baseY - z * depthScale - y, and
 * screenX = centerX + (x - centerX) * widthScaleAt(z). `scale` is how much
 * to shrink anything with real-world height (sprite, goalpost) at this z.
 */
export function projectToScreen(x: number, z: number, y: number): { screenX: number; screenY: number; scale: number } {
  return {
    screenX: CENTER_X + (x - CENTER_X) * widthScaleAt(z),
    screenY: BASE_Y - z * DEPTH_SCALE - y,
    scale: depthScaleAt(z),
  };
}

/** Hit-testing tolerance on z should be looser than on x (CLAUDE.md section 3). */
export const CONTACT_TOLERANCE_X = CHARACTER_WIDTH * 0.6;
export const CONTACT_TOLERANCE_Z = CHARACTER_HEIGHT * 0.9;
