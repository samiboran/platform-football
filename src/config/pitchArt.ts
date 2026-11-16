/**
 * Pixel-art pitch / stands tuning (M6.0, pitchRenderer.ts + CrowdBand.ts).
 * The pitch is rasterized per pixel at 1/PITCH_PIXEL_SIZE resolution and
 * scaled up with nearest filtering so it shares the characters' pixel grid
 * (1 art pixel = 2 screen pixels).
 */
import { CHARACTER_WIDTH } from './arena';

export const PITCH_PIXEL_SIZE = 2;

// --- Ground ---------------------------------------------------------------
/** Mowing stripes across x (converge with the perspective). */
export const PITCH_STRIPE_COUNT = 12;
/** Fraction of pixels that get a speck (grain / sand / gravel texture). */
export const GROUND_SPECK_CHANCE = 0.09;
/** Speck brightness shift (Phaser Color lighten/darken percent). */
export const GROUND_SPECK_SHIFT = 10;
/** Outside-the-lines apron: darker than the pitch stripes. */
export const APRON_DARKEN = 22;
/** Pitch line colour + how strongly it covers the ground under it (0..1). */
export const LINE_COLOR = 0xf4f4ec;
export const LINE_ALPHA = 0.88;
/** Dark 1-art-px edge drawn just below the near touchline for depth. */
export const NEAR_EDGE_DARKEN = 30;

// --- Markings (world units) -------------------------------------------------
export const CENTER_CIRCLE_RADIUS = CHARACTER_WIDTH * 1.1;
/** On-screen height/width of the center circle. The depth axis is drawn
 * stretched (DEPTH_SCALE > 1), so a true world circle reads as a tall
 * sliver; squash its z radius so it reads as a ground-plane ellipse. */
export const CENTER_CIRCLE_SCREEN_ASPECT = 0.75;
export const CENTER_CIRCLE_SEGMENTS = 120;
/** Goal area box: depth into the pitch (x) and extra z either side of the mouth. */
export const GOAL_AREA_DEPTH = CHARACTER_WIDTH * 0.75;
export const GOAL_AREA_Z_MARGIN = CHARACTER_WIDTH * 0.25;

// --- Mud (muddy stadiums) -----------------------------------------------------
export const MUD_COLOR = 0x4a3018;
export const MUD_ALPHA = 0.45;

// --- Goals ------------------------------------------------------------------
export const GOAL_POST_COLOR = 0xffffff;
export const GOAL_POST_SHADE = 0x8d99a6;
export const GOAL_FRAME_BACK_COLOR = 0xb8c0c8;
export const GOAL_NET_COLOR = 0xffffff;
/** Net lattice period in art pixels and the two blend strengths. */
export const GOAL_NET_PERIOD = 3;
export const GOAL_NET_LINE_ALPHA = 0.55;
export const GOAL_NET_FILL_ALPHA = 0.1;
export const GOAL_FOOTPRINT_DARKEN = 25;

// --- Stands -----------------------------------------------------------------
/** Height of each concrete tier, screen px. */
export const STANDS_TIER_HEIGHT = 6;
/** Stand colours are derived from the stadium tint, darkened by these. */
export const STANDS_DARKEN_A = 62;
export const STANDS_DARKEN_B = 70;
/** Advertising hoarding strip just above the far touchline. */
export const HOARDING_HEIGHT = 8;
export const HOARDING_PANEL_WIDTH = 64;
export const HOARDING_COLORS = [0xd63c3c, 0x2f6fd6, 0xf2c230, 0x2fae5c, 0xf2f2f2, 0x8a3fc4];

// --- Crowd (CrowdBand.ts) -----------------------------------------------------
export const FAN_VARIANTS = 6;
/** Horizontal spacing between fans, screen px. */
export const FAN_SPACING = 15;
/** Bottom y of each row (screen px, relative to the hoarding top). Back row first. */
export const FAN_ROW_OFFSETS = [-7, 0];
/** Seconds between a fan's idle hops (randomized per fan within ±50%). */
export const FAN_IDLE_HOP_INTERVAL = 2.2;
export const FAN_IDLE_HOP_SECONDS = 0.15;
/** Hop height, screen px (kept a multiple of the art pixel). */
export const FAN_HOP_PX = 2;
export const FAN_CHEER_HOP_PX = 6;
export const FAN_CHEER_SECONDS = 1.6;
