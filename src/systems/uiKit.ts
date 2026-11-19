import Phaser from 'phaser';
import * as HUD from '../config/hud';
import * as M_FANCY from '../config/menus';
import { soundFX } from './SoundFX';

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
    if (!enabled) return;
    soundFX.click();
    onTap();
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

/** Darken/lighten a 0xRRGGBB colour by factor f. */
export function shadeColor(c: number, f: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

/**
 * "Pixel modern" button (M8): rounded, a darker 3D lip below, glossy top
 * half, white outline, optional pixel icon left of the label. Presses
 * sink into the lip.
 */
export function makeFancyButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: number,
  onTap: () => void,
  opts: { icon?: string; labelScale?: number; depth?: number } = {},
): UiButton {
  const R = M_FANCY.FANCY_RADIUS;
  const lip = M_FANCY.FANCY_LIP;
  const g = scene.add.graphics();
  const face = scene.add.container(0, 0);
  const draw = (c: number) => {
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 3, -h / 2 + lip + 4, w, h, R);
    g.fillStyle(shadeColor(c, 0.55)).fillRoundedRect(-w / 2, -h / 2 + lip, w, h, R);
  };
  const faceG = scene.add.graphics();
  const drawFace = (c: number) => {
    faceG.clear();
    faceG.fillStyle(c).fillRoundedRect(-w / 2, -h / 2, w, h, R);
    faceG.fillStyle(0xffffff, 0.18).fillRoundedRect(-w / 2 + 6, -h / 2 + 5, w - 12, h * 0.42, R * 0.7);
    faceG.lineStyle(3, M_FANCY.FANCY_OUTLINE, 0.95).strokeRoundedRect(-w / 2, -h / 2, w, h, R);
  };
  draw(color);
  drawFace(color);
  face.add(faceG);
  const text = scene.add
    .bitmapText(0, 2, HUD.PIXEL_FONT_KEY, HUD.toHudText(label))
    .setScale(opts.labelScale ?? 4)
    .setOrigin(0.5);
  const textShadow = scene.add
    .bitmapText(3, 5, HUD.PIXEL_FONT_KEY, HUD.toHudText(label))
    .setScale(opts.labelScale ?? 4)
    .setOrigin(0.5)
    .setTint(0x000000)
    .setAlpha(0.45);
  face.add([textShadow, text]);
  if (opts.icon && scene.textures.exists(opts.icon)) {
    const icon = scene.add.image(0, 0, opts.icon).setScale(M_FANCY.FANCY_ICON_SCALE);
    const total = icon.displayWidth + 14 + text.width;
    icon.x = -total / 2 + icon.displayWidth / 2;
    text.x = textShadow.x = icon.x + icon.displayWidth / 2 + 14 + text.width / 2;
    textShadow.x += 3;
    face.add(icon);
  }
  const container = scene.add.container(x, y, [g, face]).setDepth(opts.depth ?? 0);
  const hit = scene.add.rectangle(0, lip / 2, w, h + lip, 0x000000, 0).setInteractive({ useHandCursor: true });
  container.add(hit);
  let enabled = true;
  hit.on('pointerdown', () => enabled && (face.y = lip - 1));
  hit.on('pointerout', () => (face.y = 0));
  hit.on('pointerup', () => {
    face.y = 0;
    if (!enabled) return;
    soundFX.click();
    onTap();
  });
  return {
    container,
    setEnabled(on: boolean) {
      enabled = on;
      const c = on ? color : HUD.UI_BUTTON_DISABLED_COLOR;
      draw(c);
      drawFace(c);
      text.setAlpha(on ? 1 : 0.4);
    },
  };
}

/** Rounded translucent panel. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number, alpha = 1, radius = 12): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha).fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(2, 0xffffff, 0.25).strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

/** Rounded progress bar; returns a setter for 0..1. */
export function progressBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): (f: number) => void {
  const g = scene.add.graphics();
  return (f: number) => {
    g.clear();
    g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y - h / 2, w, h, h / 2);
    const fw = Math.max(h, w * Phaser.Math.Clamp(f, 0, 1));
    if (f > 0) g.fillStyle(color).fillRoundedRect(x, y - h / 2, fw, h, h / 2);
    if (f > 0) g.fillStyle(0xffffff, 0.3).fillRoundedRect(x + 3, y - h / 2 + 2, fw - 6, h / 3, h / 6);
    g.lineStyle(2, 0xffffff, 0.6).strokeRoundedRect(x, y - h / 2, w, h, h / 2);
  };
}
