import Phaser from 'phaser';
import * as HUD from '../config/hud';

export interface UiButton {
  container: Phaser.GameObjects.Container;
  setEnabled(on: boolean): void;
}

/**
 * Big pixel-font touch button (M7): fires on release inside, shrinks while
 * pressed so a thumb gets feedback. Everything is sized in game pixels;
 * the canvas is scaled to the phone, so keep h ≥ ~56.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onTap: () => void,
  opts: { primary?: boolean; depth?: number; labelScale?: number } = {},
): UiButton {
  const fill = opts.primary ? HUD.UI_BUTTON_PRIMARY_COLOR : HUD.UI_BUTTON_COLOR;
  const bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(3, HUD.UI_BUTTON_BORDER);
  const shadow = scene.add.rectangle(4, 5, w, h, 0x000000, 0.45);
  const text = scene.add
    .bitmapText(0, 1, HUD.PIXEL_FONT_KEY, HUD.toHudText(label))
    .setScale(opts.labelScale ?? HUD.UI_BUTTON_LABEL_SCALE)
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [shadow, bg, text]).setDepth(opts.depth ?? 0);
  let enabled = true;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => enabled && container.setScale(HUD.UI_BUTTON_PRESS_SCALE));
  bg.on('pointerout', () => container.setScale(1));
  bg.on('pointerup', () => {
    container.setScale(1);
    if (enabled) onTap();
  });
  return {
    container,
    setEnabled(on: boolean) {
      enabled = on;
      bg.setFillStyle(on ? fill : HUD.UI_BUTTON_DISABLED_COLOR);
      text.setAlpha(on ? 1 : 0.4);
    },
  };
}

/** Pixel-font text helper. */
export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  scale: number,
  color: number = HUD.UI_TEXT_COLOR,
): Phaser.GameObjects.BitmapText {
  return scene.add.bitmapText(x, y, HUD.PIXEL_FONT_KEY, HUD.toHudText(text)).setScale(scale).setOrigin(0.5).setTint(color);
}

/** Fill the screen with the menu background colour. */
export function menuBackground(scene: Phaser.Scene, w: number, h: number): void {
  scene.add.rectangle(0, 0, w, h, HUD.UI_BG_COLOR).setOrigin(0);
}
