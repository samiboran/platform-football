import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';

/** M0 placeholder — real score/stats land with M2 (goal detection, timer). */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0f14).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Maç Bitti', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const menuBtn = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 220, 50, 0x2c3e50)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Menüye Dön', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    menuBtn.on('pointerup', () => this.scene.start('Menu'));
  }
}
