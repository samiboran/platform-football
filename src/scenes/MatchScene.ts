import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import { drawPitch } from '../systems/pitchRenderer';

/**
 * M0: static placeholder pitch only. Movement (M1), ball (M2), and
 * action/power (M3) land in later milestones — see docs/ROADMAP.md.
 */
export class MatchScene extends Phaser.Scene {
  constructor() {
    super('Match');
  }

  create(): void {
    // Fixed camera — no zoom, no follow, no pan (CLAUDE.md section 10).
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    drawPitch(this);

    this.add
      .text(GAME_WIDTH / 2, 24, 'Platform Football — M0 iskelet', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Temporary debug exit so the Match -> Result link is verifiable before
    // real match-end logic exists (M2 adds score/timer-driven end).
    const endBtn = this.add
      .rectangle(GAME_WIDTH - 90, 24, 140, 32, 0x2c3e50)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH - 90, 24, 'Bitir (test)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    endBtn.on('pointerup', () => this.scene.start('Result'));
  }
}
