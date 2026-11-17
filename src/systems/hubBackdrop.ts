import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as M from '../config/menus';
import { fanTextureKey } from './CrowdBand';
import { FAN_VARIANTS } from '../config/pitchArt';

/**
 * Night stadium behind the hub menus (M8): gradient sky, floodlights, a
 * pixel crowd made of the match fans, and a striped pitch.
 */
export function drawHubBackdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(M.HUB_SKY_TOP, M.HUB_SKY_TOP, M.HUB_SKY_BOTTOM, M.HUB_SKY_BOTTOM, 1);
  g.fillRect(0, 0, GAME_WIDTH, M.HUB_PITCH_TOP_Y);

  // Floodlights: pole + glowing lamp bank + soft cone.
  for (const lx of [90, GAME_WIDTH - 90]) {
    g.fillStyle(M.HUB_LIGHT_COLOR, 0.07).fillTriangle(lx, 70, lx - 160, M.HUB_PITCH_TOP_Y, lx + 160, M.HUB_PITCH_TOP_Y);
    g.fillStyle(0x2a2a3a).fillRect(lx - 3, 70, 6, M.HUB_CROWD_Y - 70);
    g.fillStyle(0x2a2a3a).fillRect(lx - 34, 54, 68, 26);
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 2; j += 1) g.fillStyle(M.HUB_LIGHT_COLOR).fillRect(lx - 30 + i * 16, 58 + j * 10, 12, 7);
    }
    g.fillStyle(M.HUB_LIGHT_COLOR, 0.15).fillCircle(lx, 67, 50);
  }

  // Crowd: rows of pixel fans.
  const sample = scene.textures.get(fanTextureKey(0, false)).getSourceImage();
  const fw = sample.width * M.HUB_CROWD_SCALE;
  const fh = sample.height * M.HUB_CROWD_SCALE;
  g.fillStyle(0x14102a).fillRect(0, M.HUB_CROWD_Y - fh * 0.6, GAME_WIDTH, M.HUB_PITCH_TOP_Y - M.HUB_CROWD_Y + fh * 0.6);
  for (let r = 0; r < M.HUB_CROWD_ROWS; r += 1) {
    const y = M.HUB_CROWD_Y + r * fh * 0.55;
    for (let x = (r % 2) * (fw / 2); x < GAME_WIDTH + fw; x += fw * 0.9) {
      const v = Math.floor(Math.random() * FAN_VARIANTS);
      const fan = scene.add.image(x, y, fanTextureKey(v, Math.random() < 0.3)).setScale(M.HUB_CROWD_SCALE);
      fan.setTint(r === 0 ? 0x8080a0 : r === 1 ? 0xa0a0c0 : 0xd0d0e0);
    }
  }

  // Pitch with stripes + touchline.
  const p = scene.add.graphics();
  for (let x = 0, i = 0; x < GAME_WIDTH; x += M.HUB_PITCH_STRIPE_W, i += 1) {
    p.fillStyle(i % 2 ? M.HUB_PITCH_COLOR_A : M.HUB_PITCH_COLOR_B).fillRect(x, M.HUB_PITCH_TOP_Y, M.HUB_PITCH_STRIPE_W, GAME_HEIGHT);
  }
  p.fillStyle(0xffffff, 0.8).fillRect(0, M.HUB_PITCH_TOP_Y + 6, GAME_WIDTH, 3);
  p.fillStyle(M.HUB_BOTTOM_BAR_COLOR).fillRect(0, M.HUB_BOTTOM_BAR_Y, GAME_WIDTH, GAME_HEIGHT - M.HUB_BOTTOM_BAR_Y);
  p.fillStyle(0xffffff, 0.15).fillRect(0, M.HUB_BOTTOM_BAR_Y, GAME_WIDTH, 3);
}
