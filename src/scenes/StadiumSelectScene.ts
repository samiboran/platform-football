import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import { STADIUMS, STADIUM_ORDER, type StadiumId, type StadiumDef } from '../config/stadiums';
import type { CharacterId } from '../config/characters';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { makeFancyButton, pixelText, type UiButton } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { loadPref, savePref } from '../systems/prefs';

interface StadiumSelectData {
  characterId: CharacterId;
}

/** Pick a stadium (CLAUDE.md §7) — 2×2 big tap cards (M7.4). */
export class StadiumSelectScene extends Phaser.Scene {
  private characterId!: CharacterId;
  private selected: StadiumId | null = null;
  private borders = new Map<StadiumId, Phaser.GameObjects.Rectangle>();
  private next!: UiButton;

  constructor() {
    super('StadiumSelect');
  }

  init(data: StadiumSelectData): void {
    this.characterId = data.characterId;
  }

  create(): void {
    this.borders.clear();
    drawHubBackdrop(this);
    pixelText(this, GAME_WIDTH / 2, M.SELECT_TITLE_Y, 'SAHAYI SEÇ', M.SELECT_TITLE_SCALE, HUD.UI_TITLE_COLOR);

    STADIUM_ORDER.forEach((id, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = GAME_WIDTH / 2 + (col === 0 ? -1 : 1) * (M.STADIUM_CARD_W / 2 + M.STADIUM_CARD_GAP / 2);
      const y = M.STADIUM_GRID_TOP + M.STADIUM_CARD_H / 2 + row * (M.STADIUM_CARD_H + M.STADIUM_CARD_GAP);
      this.drawCard(x, y, STADIUMS[id]);
    });

    makeFancyButton(this, M.SELECT_BACK_W / 2 + 24, M.SELECT_BOTTOM_Y, M.SELECT_BACK_W, M.SELECT_BUTTON_H, 'GERİ', 0x34495e, () =>
      this.scene.start('Menu'),
    { labelScale: 3 });
    this.next = makeFancyButton(
      this,
      GAME_WIDTH - M.SELECT_NEXT_W / 2 - 24,
      M.SELECT_BOTTOM_Y,
      M.SELECT_NEXT_W,
      M.SELECT_BUTTON_H,
      'MAÇA BAŞLA',
      M.HUB_PLAY_COLOR,
      () => {
        if (!this.selected) return;
        savePref(M.LAST_STADIUM_KEY, this.selected);
        this.scene.start('Match', { characterId: this.characterId, stadiumId: this.selected });
      },
      { icon: 'icon_whistle', labelScale: 3 },
    );

    const last = loadPref(M.LAST_STADIUM_KEY) as StadiumId | null;
    this.selected = null;
    this.next.setEnabled(false);
    if (last && STADIUM_ORDER.includes(last)) this.select(last);
  }

  private drawCard(x: number, y: number, def: StadiumDef): void {
    const w = M.STADIUM_CARD_W;
    const h = M.STADIUM_CARD_H;
    const left = x - w / 2;
    const top = y - h / 2;
    const bg = this.add.rectangle(x, y, w, h, M.SELECT_CARD_BG, 0.92).setInteractive({ useHandCursor: true });
    // Surface swatch with stripes, like the real pitch.
    const sw = 120;
    this.add.rectangle(left + 16 + sw / 2, y, sw, h - 32, def.tintColor);
    for (let i = 0; i < 4; i += 2) {
      this.add.rectangle(left + 16 + (i + 0.5) * (sw / 4), y, sw / 4, h - 32, 0xffffff, 0.12);
    }
    const border = this.add.rectangle(x, y, w, h).setStrokeStyle(3, M.SELECT_CARD_BORDER);
    this.borders.set(def.id, border);
    const tx = left + sw + 32;
    const [country, place] = def.name.split('—').map((t) => t.trim());
    this.add.bitmapText(tx, top + 30, HUD.PIXEL_FONT_KEY, HUD.toHudText(country)).setScale(3).setOrigin(0, 0.5);
    if (place) {
      this.add
        .bitmapText(tx, top + 60, HUD.PIXEL_FONT_KEY, HUD.toHudText(place))
        .setScale(2)
        .setOrigin(0, 0.5)
        .setTint(HUD.UI_TITLE_COLOR);
    }
    this.add
      .bitmapText(tx, top + 82, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.description.split(/[.—]/)[0].trim()))
      .setScale(2)
      .setMaxWidth((w - sw - 48) / 2)
      .setTint(HUD.UI_DIM_TEXT_COLOR);
    bg.on('pointerup', () => this.select(def.id));
  }

  private select(id: StadiumId): void {
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
