import Phaser from 'phaser';
import { GAME_WIDTH, FAR_Y } from '../config/arena';
import { PITCH_PIXEL_SIZE } from '../config/pitchArt';
import * as ART from '../config/pitchArt';

export function fanTextureKey(variant: number, cheer: boolean): string {
  return `fan_${variant}_${cheer ? 'cheer' : 'idle'}`;
}

/**
 * Pixel-art crowd (M6.0): two rows of tiny spectator sprites standing in
 * the stands band above the advertising boards. Idle fans hop now and then
 * (in whole art pixels, so nothing goes sub-pixel); on a goal everyone
 * throws their arms up and jumps in a wave across the row.
 */
export class CrowdBand {
  private readonly scene: Phaser.Scene;
  private readonly fans: { img: Phaser.GameObjects.Image; baseY: number; variant: number; next: number; hopUntil: number }[] = [];
  private time = 0;
  private celebrateUntil = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const hoardingTop = FAR_Y - ART.HOARDING_HEIGHT;
    ART.FAN_ROW_OFFSETS.forEach((offset, row) => {
      const baseY = hoardingTop + offset;
      const shift = row % 2 === 0 ? 0 : ART.FAN_SPACING / 2;
      for (let x = ART.FAN_SPACING / 2 + shift; x < GAME_WIDTH; x += ART.FAN_SPACING) {
        const variant = Phaser.Math.Between(0, ART.FAN_VARIANTS - 1);
        const img = scene.add
          .image(Math.round(x / PITCH_PIXEL_SIZE) * PITCH_PIXEL_SIZE + PITCH_PIXEL_SIZE / 2, baseY, fanTextureKey(variant, false))
          .setOrigin(0.5, 1)
          .setScale(PITCH_PIXEL_SIZE);
        this.fans.push({ img, baseY, variant, next: Math.random() * ART.FAN_IDLE_HOP_INTERVAL * 2, hopUntil: 0 });
      }
    });
  }

  update(delta: number): void {
    this.time += delta / 1000;
    if (this.time < this.celebrateUntil) return; // celebration tweens own `y` right now

    for (const fan of this.fans) {
      if (this.time >= fan.next) {
        fan.hopUntil = this.time + ART.FAN_IDLE_HOP_SECONDS;
        fan.next = this.time + ART.FAN_IDLE_HOP_INTERVAL * (0.5 + Math.random());
      }
      fan.img.y = fan.baseY - (this.time < fan.hopUntil ? ART.FAN_HOP_PX : 0);
    }
  }

  /** A goal — arms up, jump in a wave across the stands. */
  celebrate(): void {
    this.celebrateUntil = this.time + ART.FAN_CHEER_SECONDS;
    this.fans.forEach((fan) => {
      fan.img.setTexture(fanTextureKey(fan.variant, true));
      fan.img.y = fan.baseY;
      this.scene.tweens.add({
        targets: fan.img,
        y: fan.baseY - ART.FAN_CHEER_HOP_PX,
        duration: 120,
        yoyo: true,
        repeat: 3,
        delay: (fan.img.x / GAME_WIDTH) * 300,
        ease: 'Stepped',
        easeParams: [2],
      });
    });
    this.scene.time.delayedCall(ART.FAN_CHEER_SECONDS * 1000, () => {
      this.fans.forEach((fan) => {
        fan.img.setTexture(fanTextureKey(fan.variant, false));
        fan.img.y = fan.baseY;
      });
    });
  }
}
