/**
 * Shot aiming (19.11.2026, Sami: "kaleye yön vermek kolay değil").
 *
 * Angles are on screen, for the side attacking to the right:
 *   0° = straight up the pitch, 90° = straight at the opposing goal,
 *   180° = straight down. The stick is snapped to the nearest allowed angle,
 *   so a slightly-off thumb still sends the ball somewhere useful (CLAUDE.md
 *   §4: rough directions, no free aim, no auto-aim at the goal).
 *   - 90       straight
 *   - 70 / 110 toward the near corners of the goal
 *   - 45 / 135 bank shot off the side wall
 */
export const AIM_SNAP_ANGLES_DEG = [45, 70, 90, 110, 135];

/** Aim line: shown only to the human, while they have the ball at the feet.
 * Dashed, on the ground, follows one side-wall bounce. Off in Ayarlar. */
export const AIM_LINE_LENGTH = 300; // world px along the path
export const AIM_LINE_MAX_BOUNCES = 1;
export const AIM_LINE_DASH = 10; // world px
export const AIM_LINE_GAP = 8;
export const AIM_LINE_WIDTH = 3;
export const AIM_LINE_COLOR = 0xffffff;
/** Alpha while just dribbling / while charging a shot. */
export const AIM_LINE_ALPHA_IDLE = 0.35;
export const AIM_LINE_ALPHA_CHARGING = 0.85;
/** Above the pitch art, below every shadow/character (depth = screen y). */
export const AIM_LINE_DEPTH = 1;
