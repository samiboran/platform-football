import Phaser from 'phaser';
import {
  GAME_WIDTH,
  FAR_Y,
  DEPTH_MIN,
  DEPTH_MAX,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_BACK_X,
  RIGHT_GOAL_BACK_X,
  CENTER_LINE_X,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  GOAL_HEIGHT,
  depthScaleAt,
  projectToScreen,
} from '../config/arena';
import type { StadiumDef } from '../config/stadiums';

type Point = { x: number; y: number };

const GRASS_STRIPE_COUNT = 6;
const STANDS_COLOR = 0x2b2f3a;
const STANDS_EDGE = 0x555b6e;
const NET_FILL = 0xeaf4ff;
const NET_LINE = 0xffffff;

function project(x: number, z: number, y: number): Point {
  const { screenX, screenY } = projectToScreen(x, z, y);
  return { x: screenX, y: screenY };
}

function fillQuad(g: Phaser.GameObjects.Graphics, pts: Point[], color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Simple net mesh inside quad a(bottom-near/left) b(bottom-far/right)
 * c(top, above b) d(top, above a). */
function drawNetGrid(g: Phaser.GameObjects.Graphics, a: Point, b: Point, c: Point, d: Point): void {
  const cols = 4;
  const rows = 3;
  g.lineStyle(1, NET_LINE, 0.35);
  for (let i = 1; i < cols; i += 1) {
    const t = i / cols;
    const bottom = lerpPoint(a, b, t);
    const top = lerpPoint(d, c, t);
    g.beginPath();
    g.moveTo(bottom.x, bottom.y);
    g.lineTo(top.x, top.y);
    g.strokePath();
  }
  for (let i = 1; i < rows; i += 1) {
    const t = i / rows;
    const left = lerpPoint(a, d, t);
    const right = lerpPoint(b, c, t);
    g.beginPath();
    g.moveTo(left.x, left.y);
    g.lineTo(right.x, right.y);
    g.strokePath();
  }
}

const POST_COLOR = 0xffe066;

/**
 * A volumetric-ish goal: a ground footprint, a back net panel with a mesh
 * texture set back GOAL_ZONE_DEPTH behind the goal line, and a solid frame
 * (posts + crossbar) in front. The far post is shorter than the near one —
 * perspective shrink applies to goal height exactly like it does to
 * characters/ball (depthScaleAt). Side/roof net panels are deliberately
 * skipped: at this screen size they just muddy the silhouette.
 */
function drawGoal(g: Phaser.GameObjects.Graphics, lineX: number, backX: number): void {
  const nearZ = GOAL_MOUTH_Z_MIN;
  const farZ = GOAL_MOUTH_Z_MAX;
  const nearHeight = GOAL_HEIGHT * depthScaleAt(nearZ);
  const farHeight = GOAL_HEIGHT * depthScaleAt(farZ);

  const frontNearGround = project(lineX, nearZ, 0);
  const frontFarGround = project(lineX, farZ, 0);
  const backNearGround = project(backX, nearZ, 0);
  const backFarGround = project(backX, farZ, 0);
  const frontNearTop = project(lineX, nearZ, nearHeight);
  const frontFarTop = project(lineX, farZ, farHeight);
  const backNearTop = project(backX, nearZ, nearHeight);
  const backFarTop = project(backX, farZ, farHeight);

  // Ground footprint — grounds the structure visually.
  fillQuad(g, [frontNearGround, frontFarGround, backFarGround, backNearGround], 0x0d3d1f, 0.6);

  // Back net panel.
  fillQuad(g, [backNearGround, backFarGround, backFarTop, backNearTop], NET_FILL, 0.16);
  drawNetGrid(g, backNearGround, backFarGround, backFarTop, backNearTop);

  // Frame — posts + crossbar + goal-line base, drawn last, in a distinct
  // color so it never blends into the pitch's own white lines.
  g.lineStyle(3, POST_COLOR, 1);
  g.beginPath();
  g.moveTo(frontNearGround.x, frontNearGround.y);
  g.lineTo(frontNearTop.x, frontNearTop.y);
  g.moveTo(frontFarGround.x, frontFarGround.y);
  g.lineTo(frontFarTop.x, frontFarTop.y);
  g.moveTo(frontNearTop.x, frontNearTop.y);
  g.lineTo(frontFarTop.x, frontFarTop.y);
  g.strokePath();
}

/** Fixed relative (x-fraction across the pitch, z-fraction across the
 * depth band) spots for MUDDY stadiums' darker patches — a visual tell for
 * why this ground's frictionMultiplier is so much higher than usual.
 * Fixed rather than randomized so the pitch doesn't redraw differently
 * every match. */
const MUD_PATCH_SPOTS: { fracX: number; fracZ: number; radius: number }[] = [
  { fracX: 0.28, fracZ: 0.22, radius: 34 },
  { fracX: 0.62, fracZ: 0.35, radius: 26 },
  { fracX: 0.45, fracZ: 0.68, radius: 30 },
  { fracX: 0.78, fracZ: 0.58, radius: 22 },
  { fracX: 0.18, fracZ: 0.8, radius: 24 },
];

function drawMudPatches(g: Phaser.GameObjects.Graphics): void {
  for (const spot of MUD_PATCH_SPOTS) {
    const x = LEFT_GOAL_LINE_X + (RIGHT_GOAL_LINE_X - LEFT_GOAL_LINE_X) * spot.fracX;
    const z = DEPTH_MIN + (DEPTH_MAX - DEPTH_MIN) * spot.fracZ;
    const center = project(x, z, 0);
    const scale = depthScaleAt(z);
    g.fillStyle(0x4a3018, 0.4);
    g.fillEllipse(center.x, center.y, spot.radius * 2 * scale, spot.radius * scale);
  }
}

/**
 * Draws the M0/M1 placeholder pitch as a proper trapezoid in perspective:
 * a stands band behind the far touchline, grass stripes and outline that
 * taper toward the far edge, a center line (stays vertical — it's the
 * trapezoid's axis of symmetry), and two volumetric goals. Every
 * measurement comes from config/arena.ts.
 */
export function drawPitch(scene: Phaser.Scene, stadium: StadiumDef): void {
  const g = scene.add.graphics();

  // Backdrop behind everything — darkened version of this stadium's own
  // ground tone, so the whole scene reads as one place instead of a green
  // pitch with a colored sticker on top.
  const backdrop = Phaser.Display.Color.ValueToColor(stadium.groundDark).darken(55).color;
  g.fillStyle(backdrop, 1);
  g.fillRect(0, 0, GAME_WIDTH, scene.scale.height);

  // Stands band behind the far touchline.
  g.fillStyle(STANDS_COLOR, 1);
  g.fillRect(0, 0, GAME_WIDTH, FAR_Y);
  g.lineStyle(2, STANDS_EDGE, 0.8);
  g.beginPath();
  g.moveTo(0, FAR_Y);
  g.lineTo(GAME_WIDTH, FAR_Y);
  g.strokePath();

  // Grass stripes — trapezoidal bands across the whole depth range.
  const step = (DEPTH_MAX - DEPTH_MIN) / GRASS_STRIPE_COUNT;
  for (let i = 0; i < GRASS_STRIPE_COUNT; i += 1) {
    const z0 = DEPTH_MIN + i * step;
    const z1 = z0 + step;
    const nearLeft = project(LEFT_GOAL_LINE_X, z0, 0);
    const nearRight = project(RIGHT_GOAL_LINE_X, z0, 0);
    const farRight = project(RIGHT_GOAL_LINE_X, z1, 0);
    const farLeft = project(LEFT_GOAL_LINE_X, z1, 0);
    fillQuad(g, [nearLeft, nearRight, farRight, farLeft], i % 2 === 0 ? stadium.groundLight : stadium.groundDark, 1);
  }

  if (stadium.muddy) drawMudPatches(g);

  // Pitch outline (touchlines + goal-line edges — the latter read as
  // slanted, converging toward the far/top edge).
  const outlineNearLeft = project(LEFT_GOAL_LINE_X, DEPTH_MIN, 0);
  const outlineNearRight = project(RIGHT_GOAL_LINE_X, DEPTH_MIN, 0);
  const outlineFarRight = project(RIGHT_GOAL_LINE_X, DEPTH_MAX, 0);
  const outlineFarLeft = project(LEFT_GOAL_LINE_X, DEPTH_MAX, 0);
  g.lineStyle(2, 0xffffff, 0.85);
  g.beginPath();
  g.moveTo(outlineNearLeft.x, outlineNearLeft.y);
  g.lineTo(outlineNearRight.x, outlineNearRight.y);
  g.lineTo(outlineFarRight.x, outlineFarRight.y);
  g.lineTo(outlineFarLeft.x, outlineFarLeft.y);
  g.closePath();
  g.strokePath();

  // Center line — stays a straight vertical (trapezoid's axis of symmetry).
  const centerNear = project(CENTER_LINE_X, DEPTH_MIN, 0);
  const centerFar = project(CENTER_LINE_X, DEPTH_MAX, 0);
  g.lineStyle(3, 0xffffff, 0.9);
  g.beginPath();
  g.moveTo(centerNear.x, centerNear.y);
  g.lineTo(centerFar.x, centerFar.y);
  g.strokePath();

  drawGoal(g, LEFT_GOAL_LINE_X, LEFT_GOAL_BACK_X);
  drawGoal(g, RIGHT_GOAL_LINE_X, RIGHT_GOAL_BACK_X);
}
