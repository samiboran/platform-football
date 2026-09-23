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

type Point = { x: number; y: number };

const GRASS_STRIPE_COUNT = 6;
const GRASS_LIGHT = 0x22984d;
const GRASS_DARK = 0x1b7a3e;
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

/**
 * Draws the M0/M1 placeholder pitch as a proper trapezoid in perspective:
 * a stands band behind the far touchline, grass stripes and outline that
 * taper toward the far edge, a center line (stays vertical — it's the
 * trapezoid's axis of symmetry), and two volumetric goals. Every
 * measurement comes from config/arena.ts.
 */
export function drawPitch(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // Backdrop behind everything.
  g.fillStyle(0x123018, 1);
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
    fillQuad(g, [nearLeft, nearRight, farRight, farLeft], i % 2 === 0 ? GRASS_LIGHT : GRASS_DARK, 1);
  }

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
