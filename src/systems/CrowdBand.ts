import Phaser from 'phaser';
import { GAME_WIDTH, FAR_Y } from '../config/arena';

const FAN_COUNT = 26;
const FAN_COLORS = [0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71, 0xffffff, 0xe67e22];

/**
 * Placeholder crowd (M5: "seyirci tepkileri") — a row of small dots in the
 * thin stands band that idle-bob and pulse/jump together on a goal. Real
 * crowd sprites/animation are future work; this is just enough to make the
 * stands feel alive.
 */
export class CrowdBand {
  private readonly scene: Phaser.Scene;
  private readonly dots: Phaser.GameObjects.Arc[] = [];
  private readonly baseY: number[] = [];
  private time = 0;
  private celebrateUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const margin = 20;
    const usableWidth = GAME_WIDTH - margin * 2;

    for (let i = 0; i < FAN_COUNT; i += 1) {
      const x = margin + (usableWidth * i) / (FAN_COUNT - 1);
      const y = FAR_Y * 0.3 + (Math.random() - 0.5) * FAR_Y * 0.4;
      const color = FAN_COLORS[i % FAN_COLORS.length];
      const dot = scene.add.circle(x, y, 3, color, 0.9);
      this.dots.push(dot);
      this.baseY.push(y);
    }
  }

  update(delta: number): void {
    this.time += delta / 1000;
    if (this.time < this.celebrateUntil) return; // celebration tweens own `y` right now

    this.dots.forEach((dot, i) => {
      dot.y = this.baseY[i] + Math.sin(this.time * 2 + i) * 1.2;
    });
  }

  /** A goal — the crowd jumps and flashes in a little wave across the row. */
  celebrate(): void {
    this.celebrateUntil = this.time + 0.9;
    this.dots.forEach((dot, i) => {
      const delay = i * 8;
      this.scene.tweens.add({
        targets: dot,
        y: this.baseY[i] - 10,
        scale: 1.8,
        duration: 140,
        yoyo: true,
        repeat: 2,
        delay,
        ease: 'Sine.easeOut',
      });
    });
  }
}
