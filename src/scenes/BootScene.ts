import Phaser from 'phaser';
import { CHARACTER_ORDER, CHARACTER_POSES, characterSpriteKey } from '../config/characters';
import { ELEMENT_IDS } from '../config/elements';
import { BALL_POWER_LEVEL_MAX, DUST_TEXTURE_KEY, ballSpriteKey } from '../config/animation';
import { FAN_VARIANTS } from '../config/pitchArt';
import { DRINK_TEXTURE_KEY, DRINK_GOLD_TEXTURE_KEY } from '../config/pickups';
import { fanTextureKey } from '../systems/CrowdBand';
import { portraitTextureKey } from '../systems/PowerCutIn';
import {
  HUD_TEXTURES,
  PIXEL_FONT_KEY,
  PIXEL_FONT_CHARS,
  PIXEL_FONT_CELL_W,
  PIXEL_FONT_CELL_H,
  PIXEL_FONT_PER_ROW,
} from '../config/hud';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/arena';
import * as B from '../config/boot';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  /** M9.1: progress bar + a rolling ball while the sprites load. */
  private drawLoadingBar(): void {
    document.getElementById('boot-loading')?.remove();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 30;
    const left = cx - B.BOOT_BAR_W / 2;
    this.add.rectangle(cx, cy, B.BOOT_BAR_W + 6, B.BOOT_BAR_H + 6, B.BOOT_BAR_BG).setStrokeStyle(3, B.BOOT_BAR_BORDER);
    const fill = this.add.rectangle(left, cy, 0, B.BOOT_BAR_H, B.BOOT_BAR_FILL).setOrigin(0, 0.5);
    const ball = this.add.circle(left, cy - B.BOOT_BAR_H - B.BOOT_BALL_RADIUS, B.BOOT_BALL_RADIUS, 0xffffff).setStrokeStyle(3, 0x222222);
    const seam = this.add.rectangle(left, ball.y, B.BOOT_BALL_RADIUS * 2, 3, 0x222222);
    this.tweens.add({ targets: seam, angle: 360, duration: B.BOOT_BALL_SPIN_MS, repeat: -1 });
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => {
      fill.width = B.BOOT_BAR_W * v;
      ball.x = seam.x = left + B.BOOT_BAR_W * v;
    });
  }

  preload(): void {
    this.drawLoadingBar();
    for (const id of CHARACTER_ORDER) {
      for (const pose of CHARACTER_POSES) {
        this.load.image(characterSpriteKey(id, pose), `characters/${id}/${pose}.png`);
      }
      this.load.image(portraitTextureKey(id), `characters/${id}/portrait.png`);
    }
    this.load.image(ballSpriteKey(0), `fx/${ballSpriteKey(0)}.png`);
    for (const element of ELEMENT_IDS) {
      for (let level = 1; level <= BALL_POWER_LEVEL_MAX; level++) {
        const key = ballSpriteKey(level, element);
        this.load.image(key, `fx/${key}.png`);
      }
    }
    for (const key of [DRINK_TEXTURE_KEY, DRINK_GOLD_TEXTURE_KEY, DUST_TEXTURE_KEY]) this.load.image(key, `fx/${key}.png`);
    for (let v = 0; v < FAN_VARIANTS; v++) {
      for (const cheer of [false, true]) {
        const key = fanTextureKey(v, cheer);
        this.load.image(key, `fx/${key}.png`);
      }
    }
    for (const key of HUD_TEXTURES) this.load.image(key, `hud/${key}.png`);
    this.load.image(PIXEL_FONT_KEY, `hud/${PIXEL_FONT_KEY}.png`);
  }

  create(): void {
    // Parse returns the full cache entry ({ data, texture, frame }).
    const fontEntry = Phaser.GameObjects.RetroFont.Parse(this, {
      image: PIXEL_FONT_KEY,
      width: PIXEL_FONT_CELL_W,
      height: PIXEL_FONT_CELL_H,
      chars: PIXEL_FONT_CHARS,
      charsPerRow: PIXEL_FONT_PER_ROW,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 0,
    });
    this.cache.bitmapFont.add(PIXEL_FONT_KEY, fontEntry);
    // M9.1 cold-start measurement (page start → menu).
    const bootMs = Math.round(performance.now());
    console.info(`[boot] ready in ${bootMs} ms`);
    try {
      window.localStorage.setItem(B.BOOT_TIME_STORAGE_KEY, String(bootMs));
    } catch {
      /* storage unavailable */
    }
    this.scene.start('Menu');
  }
}
