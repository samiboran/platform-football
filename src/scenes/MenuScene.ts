import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setZoom(1);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0f14).setOrigin(0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'Platform Football', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const startBtn = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 220, 60, 0xc0392b)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'BAŞLA', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    startBtn.on('pointerup', () => this.scene.start('Match'));
  }
}
