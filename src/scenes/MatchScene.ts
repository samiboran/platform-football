import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEFT_GOAL_LINE_X,
  CENTER_LINE_X,
  DEPTH_BAND_HEIGHT,
  DEPTH_MIN,
  DEPTH_MAX,
  projectToScreen,
} from '../config/arena';
import { drawPitch } from '../systems/pitchRenderer';
import { InputController } from '../systems/InputController';
import { Character } from '../entities/Character';

/**
 * M1: movement, jump, shadows, depth sort, half/touchline bounds.
 * Ball (M2) and action/power (M3) land in later milestones.
 */
export class MatchScene extends Phaser.Scene {
  private input1!: InputController;
  private player!: Character;
  /** Static same-half reference character — debug aid (F1) proving the
   * depth-sort math, not a real gameplay entity. */
  private depthSortRef!: Character;
  private debugVisible = false;
  private debugGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Match');
  }

  create(): void {
    // Fixed camera — no zoom, no follow, no pan (CLAUDE.md section 10).
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    drawPitch(this);

    this.add
      .text(GAME_WIDTH / 2, 24, 'Platform Football — M1: hareket', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const leftHalfX = (LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2;
    const bounds = { minX: LEFT_GOAL_LINE_X, maxX: CENTER_LINE_X };

    this.player = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT / 2, bounds, 0x2e86de);
    this.depthSortRef = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT * 0.85, bounds, 0xe74c3c);
    this.depthSortRef.setVisible(false);

    this.input1 = new InputController(this, 90, GAME_HEIGHT - 90, GAME_WIDTH - 90, GAME_HEIGHT - 90);

    this.debugGraphics = this.add.graphics().setDepth(20000);

    this.input.keyboard?.on('keydown-F1', () => {
      this.debugVisible = !this.debugVisible;
      this.depthSortRef.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    });

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

  update(_time: number, delta: number): void {
    const move = this.input1.getMoveVector();
    const jumpPressed = this.input1.consumeJumpPressed();
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed });
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false });

    if (this.debugVisible) {
      this.debugGraphics.clear();
      this.debugGraphics.lineStyle(1, 0xff00ff, 0.8);
      // Left-half bounds as an actual trapezoid, matching the perspective pitch.
      const nearLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MIN, 0);
      const nearRight = projectToScreen(CENTER_LINE_X, DEPTH_MIN, 0);
      const farRight = projectToScreen(CENTER_LINE_X, DEPTH_MAX, 0);
      const farLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MAX, 0);
      this.debugGraphics.beginPath();
      this.debugGraphics.moveTo(nearLeft.screenX, nearLeft.screenY);
      this.debugGraphics.lineTo(nearRight.screenX, nearRight.screenY);
      this.debugGraphics.lineTo(farRight.screenX, farRight.screenY);
      this.debugGraphics.lineTo(farLeft.screenX, farLeft.screenY);
      this.debugGraphics.closePath();
      this.debugGraphics.strokePath();
    }
  }
}
