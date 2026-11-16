import Phaser from 'phaser';
import { CHARACTER_ORDER, CHARACTER_POSES, characterSpriteKey } from '../config/characters';
import { BALL_POWER_LEVEL_MAX, ballSpriteKey } from '../config/animation';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const id of CHARACTER_ORDER) {
      for (const pose of CHARACTER_POSES) {
        this.load.image(characterSpriteKey(id, pose), `characters/${id}/${pose}.png`);
      }
    }
    for (let level = 0; level <= BALL_POWER_LEVEL_MAX; level++) {
      this.load.image(ballSpriteKey(level), `fx/ball_power${level}.png`);
    }
  }

  create(): void {
    this.scene.start('Menu');
  }
}
