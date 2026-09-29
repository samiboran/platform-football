import Phaser from 'phaser';
import { CHARACTER_ORDER, CHARACTER_POSES, characterSpriteKey } from '../config/characters';

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
  }

  create(): void {
    this.scene.start('Menu');
  }
}
