import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as FEEL from '../config/feel';
import { PIXEL_FONT_KEY, toHudText } from '../config/hud';
import type { CharacterId } from '../config/characters';
import { ELEMENTS, elementColor, powerLevelCaption, type ElementId } from '../config/elements';

export function portraitTextureKey(id: CharacterId): string {
  return `${id}_portrait`;
}

/**
 * Tsubasa-style portrait cut-in (M6.4): a slanted dark band with speed
 * lines sweeps across the screen, the striker's portrait slides in from
 * their own side with the name and a caption. Purely cosmetic — the scene
 * freezes gameplay for FEEL.CUTIN_SECONDS while this plays.
 */
export function playPowerCutIn(
  scene: Phaser.Scene,
  id: CharacterId,
  name: string,
  side: 'left' | 'right',
  level: number,
  element: ElementId,
  customTitle?: string,
): void {
  const dir = side === 'left' ? 1 : -1;
  const cy = GAME_HEIGHT / 2;
  const h = FEEL.CUTIN_BAND_HEIGHT;
  const s = FEEL.CUTIN_BAND_SLANT;
  // The striker's own element, always (Sami); the level only sets intensity.
  const edge = elementColor(element, level);
  const caption = customTitle ?? ELEMENTS[element].title;
  const total = FEEL.CUTIN_SECONDS * 1000;
  const slide = total * FEEL.CUTIN_SLIDE_FRACTION;

  const root = scene.add.container(0, 0).setDepth(FEEL.CUTIN_DEPTH);

  // Slanted band (parallelogram) + bright edges.
  const band = scene.add.graphics();
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  const pts = [
    new Phaser.Math.Vector2(-s, top + s * dir * 0.5),
    new Phaser.Math.Vector2(GAME_WIDTH + s, top - s * dir * 0.5),
    new Phaser.Math.Vector2(GAME_WIDTH + s, bottom - s * dir * 0.5),
    new Phaser.Math.Vector2(-s, bottom + s * dir * 0.5),
  ];
  band.fillStyle(FEEL.CUTIN_BAND_COLOR, FEEL.CUTIN_BAND_ALPHA);
  band.fillPoints(pts, true);
  band.lineStyle(4, edge, 1);
  band.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  band.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
  root.add(band);

  // Speed lines streaking away from the striker's side.
  for (let i = 0; i < FEEL.CUTIN_SPEEDLINE_COUNT; i += 1) {
    const y = top + 14 + Math.random() * (h - 28);
    const len = 60 + Math.random() * 180;
    const line = scene.add.rectangle(dir > 0 ? -len : GAME_WIDTH + len, y, len, 2, edge, 0.35 + Math.random() * 0.4);
    root.add(line);
    scene.tweens.add({
      targets: line,
      x: dir > 0 ? GAME_WIDTH + len : -len,
      duration: total * (0.5 + Math.random() * 0.5),
    });
  }

  // Portrait slides in from the striker's own edge.
  const restX = side === 'left' ? GAME_WIDTH * FEEL.CUTIN_PORTRAIT_X : GAME_WIDTH * (1 - FEEL.CUTIN_PORTRAIT_X);
  const key = portraitTextureKey(id);
  let portraitW = 0;
  if (scene.textures.exists(key)) {
    const portrait = scene.add
      .image(dir > 0 ? -100 : GAME_WIDTH + 100, cy, key)
      .setScale(FEEL.CUTIN_PORTRAIT_SCALE)
      .setFlipX(side === 'right');
    portraitW = portrait.displayWidth;
    portrait.y = bottom - portrait.displayHeight / 2 - 4;
    root.add(portrait);
    scene.tweens.add({ targets: portrait, x: restX, duration: slide, ease: 'Cubic.easeOut' });
  }

  // Name + caption beside the portrait, toward the screen centre.
  const textX = restX + dir * (portraitW / 2 + 24);
  const nameText = scene.add
    .bitmapText(textX, cy - 18, PIXEL_FONT_KEY, toHudText(name))
    .setScale(FEEL.CUTIN_NAME_SCALE)
    .setOrigin(side === 'left' ? 0 : 1, 0.5);
  const title = scene.add
    .bitmapText(textX, cy + 22, PIXEL_FONT_KEY, toHudText(caption))
    .setScale(FEEL.CUTIN_TITLE_SCALE)
    .setOrigin(side === 'left' ? 0 : 1, 0.5)
    .setTint(edge);
  const levelText = scene.add
    .bitmapText(textX, cy + 52, PIXEL_FONT_KEY, toHudText(powerLevelCaption(level)))
    .setScale(FEEL.CUTIN_LEVEL_SCALE)
    .setOrigin(side === 'left' ? 0 : 1, 0.5)
    .setTint(edge);
  root.add([nameText, title, levelText]);
  for (const t of [nameText, title, levelText]) {
    t.setAlpha(0);
    scene.tweens.add({ targets: t, alpha: 1, delay: slide * 0.6, duration: slide * 0.6 });
  }

  // Fade the whole thing out at the end, then clean up.
  scene.tweens.add({
    targets: root,
    alpha: 0,
    delay: total - slide * 0.6,
    duration: slide * 0.6,
    onComplete: () => root.destroy(),
  });
}
