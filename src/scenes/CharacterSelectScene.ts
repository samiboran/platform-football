import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, type CharacterDef } from '../config/characters';
import { ELEMENTS, elementColor } from '../config/elements';
import { ballSpriteKey } from '../config/animation';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { portraitTextureKey } from '../systems/PowerCutIn';
import { makeButton, menuBackground, pixelText, type UiButton } from '../systems/uiKit';
import { loadPref, savePref } from '../systems/prefs';

/** Pick a kid (CLAUDE.md §6) — big tap cards with element + stats (M7.4). */
export class CharacterSelectScene extends Phaser.Scene {
  private selected: CharacterId | null = null;
  private borders = new Map<CharacterId, Phaser.GameObjects.Rectangle>();
  private next!: UiButton;

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    this.borders.clear();
    menuBackground(this, GAME_WIDTH, GAME_HEIGHT);
    pixelText(this, GAME_WIDTH / 2, M.SELECT_TITLE_Y, 'KARAKTERİNİ SEÇ', M.SELECT_TITLE_SCALE, HUD.UI_TITLE_COLOR);

    const n = CHARACTER_ORDER.length;
    const total = n * M.CHAR_CARD_W + (n - 1) * M.CHAR_CARD_GAP;
    CHARACTER_ORDER.forEach((id, i) => {
      const x = GAME_WIDTH / 2 - total / 2 + M.CHAR_CARD_W / 2 + i * (M.CHAR_CARD_W + M.CHAR_CARD_GAP);
      this.drawCard(x, M.CHAR_CARD_Y, CHARACTERS[id]);
    });

    makeButton(this, M.SELECT_BACK_W / 2 + 24, M.SELECT_BOTTOM_Y, M.SELECT_BACK_W, M.SELECT_BUTTON_H, 'GERİ', () =>
      this.scene.start('Menu'),
    );
    this.next = makeButton(
      this,
      GAME_WIDTH - M.SELECT_NEXT_W / 2 - 24,
      M.SELECT_BOTTOM_Y,
      M.SELECT_NEXT_W,
      M.SELECT_BUTTON_H,
      'DEVAM',
      () => {
        if (!this.selected) return;
        savePref(M.LAST_CHARACTER_KEY, this.selected);
        this.scene.start('StadiumSelect', { characterId: this.selected });
      },
      { primary: true },
    );

    const last = loadPref(M.LAST_CHARACTER_KEY) as CharacterId | null;
    this.selected = null;
    this.next.setEnabled(false);
    if (last && CHARACTER_ORDER.includes(last)) this.select(last);
  }

  private drawCard(x: number, y: number, def: CharacterDef): void {
    const w = M.CHAR_CARD_W;
    const h = M.CHAR_CARD_H;
    const top = y - h / 2;
    const left = x - w / 2;
    const bg = this.add.rectangle(x, y, w, h, M.SELECT_CARD_BG).setInteractive({ useHandCursor: true });
    const border = this.add.rectangle(x, y, w, h).setStrokeStyle(3, M.SELECT_CARD_BORDER);
    this.borders.set(def.id, border);

    // Portrait (left) + name / origin / element (right).
    const portrait = this.add.image(left + 80, top + 80, portraitTextureKey(def.id)).setScale(M.CHAR_PORTRAIT_SCALE);
    if (!this.textures.exists(portraitTextureKey(def.id))) portrait.setVisible(false);
    const tx = left + 160;
    this.add.bitmapText(tx, top + 30, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.name)).setScale(4).setOrigin(0, 0.5);
    this.add
      .bitmapText(tx, top + 62, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.archetype))
      .setScale(2)
      .setOrigin(0, 0.5)
      .setTint(HUD.UI_DIM_TEXT_COLOR);
    const el = ELEMENTS[def.element];
    this.add.image(tx + 14, top + 108, ballSpriteKey(3, def.element)).setScale(2.5);
    this.add
      .bitmapText(tx + 42, top + 108, HUD.PIXEL_FONT_KEY, HUD.toHudText(el.title.replace('!', '')))
      .setScale(2)
      .setOrigin(0, 0.5)
      .setTint(elementColor(def.element, 3));

    // Stat bars.
    const stats: [string, number][] = [
      ['HIZ', def.speedMultiplier],
      ['ŞUT', def.shotPowerMultiplier],
      ['GÜÇ', def.powerMultiplier],
    ];
    stats.forEach(([label, v], i) => {
      const sy = top + 180 + i * 30;
      this.add.bitmapText(left + 30, sy, HUD.PIXEL_FONT_KEY, HUD.toHudText(label)).setScale(2).setOrigin(0, 0.5);
      const bx = left + 100;
      this.add.rectangle(bx, sy, M.CHAR_STAT_BAR_W, M.CHAR_STAT_BAR_H, M.CHAR_STAT_BG).setOrigin(0, 0.5);
      const f = Phaser.Math.Clamp((v - M.CHAR_STAT_MIN) / (M.CHAR_STAT_MAX - M.CHAR_STAT_MIN), 0.05, 1);
      this.add.rectangle(bx, sy, M.CHAR_STAT_BAR_W * f, M.CHAR_STAT_BAR_H, M.CHAR_STAT_COLOR).setOrigin(0, 0.5);
    });

    // Special move.
    this.add
      .bitmapText(left + 30, top + 280, HUD.PIXEL_FONT_KEY, HUD.toHudText('ÖZEL: ' + def.special))
      .setScale(2)
      .setMaxWidth((w - 60) / 2)
      .setOrigin(0, 0)
      .setTint(HUD.UI_TEXT_COLOR);

    bg.on('pointerup', () => this.select(def.id));
  }

  private select(id: CharacterId): void {
    this.selected = id;
    this.borders.forEach((b, bid) =>
      b.setStrokeStyle(
        bid === id ? M.SELECT_CARD_SELECTED_WIDTH : 3,
        bid === id ? M.SELECT_CARD_SELECTED_BORDER : M.SELECT_CARD_BORDER,
      ),
    );
    this.next.setEnabled(true);
  }
}
