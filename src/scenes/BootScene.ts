import Phaser from 'phaser';
import { CHARACTER_ORDER, CHARACTER_POSES, characterSpriteKey } from '../config/characters';
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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const id of CHARACTER_ORDER) {
      for (const pose of CHARACTER_POSES) {
        this.load.image(characterSpriteKey(id, pose), `characters/${id}/${pose}.png`);
      }
      this.load.image(portraitTextureKey(id), `characters/${id}/portrait.png`);
    }
    for (let level = 0; level <= BALL_POWER_LEVEL_MAX; level++) {
      this.load.image(ballSpriteKey(level), `fx/ball_power${level}.png`);
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
    this.scene.start('Menu');
  }
}
