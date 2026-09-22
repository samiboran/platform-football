import Phaser from 'phaser';
import {
  GAME_WIDTH,
  BASE_Y,
  FAR_Y,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_BACK_X,
  RIGHT_GOAL_BACK_X,
  CENTER_LINE_X,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  projectToScreen,
} from '../config/arena';

/**
 * Draws the static M0 placeholder pitch: backdrop, playable field, touchlines,
 * center line, and the two goal mouths. Pure Phaser.Graphics, no textures —
 * every measurement comes from config/arena.ts.
 */
export function drawPitch(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // Backdrop (stands) behind everything.
  g.fillStyle(0x123018, 1);
  g.fillRect(0, 0, GAME_WIDTH, scene.scale.height);

  // Playable field strip (the depth band).
  const fieldTop = FAR_Y;
  const fieldHeight = BASE_Y - FAR_Y;
  g.fillStyle(0x1e8449, 1);
  g.fillRect(LEFT_GOAL_LINE_X, fieldTop, RIGHT_GOAL_LINE_X - LEFT_GOAL_LINE_X, fieldHeight);

  // Touchlines (near/far edges of the depth band).
  g.lineStyle(2, 0xffffff, 0.8);
  g.strokeRect(LEFT_GOAL_LINE_X, fieldTop, RIGHT_GOAL_LINE_X - LEFT_GOAL_LINE_X, fieldHeight);

  // Center line — players cannot cross this (enforced in M1).
  g.lineStyle(3, 0xffffff, 0.9);
  g.beginPath();
  g.moveTo(CENTER_LINE_X, fieldTop);
  g.lineTo(CENTER_LINE_X, fieldTop + fieldHeight);
  g.strokePath();

  drawGoal(g, LEFT_GOAL_LINE_X, LEFT_GOAL_BACK_X);
  drawGoal(g, RIGHT_GOAL_LINE_X, RIGHT_GOAL_BACK_X);
}

function drawGoal(g: Phaser.GameObjects.Graphics, lineX: number, backX: number): void {
  const top = projectToScreen(0, GOAL_MOUTH_Z_MAX, 0).screenY;
  const bottom = projectToScreen(0, GOAL_MOUTH_Z_MIN, 0).screenY;
  const left = Math.min(lineX, backX);
  const width = Math.abs(backX - lineX);

  g.fillStyle(0xf5f5f5, 0.9);
  g.fillRect(left, top, width, bottom - top);
  g.lineStyle(2, 0x222222, 1);
  g.strokeRect(left, top, width, bottom - top);
}
