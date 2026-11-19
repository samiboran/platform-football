import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import { DEFAULT_STADIUM, STADIUMS, STADIUM_ORDER, type StadiumId, type StadiumDef } from '../config/stadiums';
import type { CharacterId } from '../config/characters';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { makeFancyButton, pixelText, type UiButton } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { loadPref, savePref } from '../systems/prefs';
import { soundFX } from '../systems/SoundFX';
import * as D from '../config/difficulty';
import { loadDifficulty, saveDifficulty } from '../systems/difficulty';

interface StadiumSelectData {
  characterId: CharacterId;
}

/** Pick a stadium (CLAUDE.md §7) — 2×2 big tap cards (M7.4). */
export class StadiumSelectScene extends Phaser.Scene {
  private characterId!: CharacterId;
  private selected: StadiumId | null = null;
  private borders = new Map<StadiumId, Phaser.GameObjects.Rectangle>();
  private next!: UiButton;
  private difficulty: D.DifficultyId = D.DEFAULT_DIFFICULTY;
  private pills = new Map<D.DifficultyId, Phaser.GameObjects.Container>();

  constructor() {
    super('StadiumSelect');
  }

  init(data: StadiumSelectData): void {
    this.characterId = data.characterId;
  }

  create(): void {
    soundFX.playMusic('menu');
    this.borders.clear();
    drawHubBackdrop(this);
    pixelText(this, GAME_WIDTH / 2, M.SELECT_TITLE_Y, 'SAHAYI SEÇ', M.SELECT_TITLE_SCALE, HUD.UI_TITLE_COLOR);

    // Standard pitch: one wide card on top; the themed ones in a 2×2 grid.
    const wideW = M.STADIUM_CARD_W * 2 + M.STADIUM_CARD_GAP;
    this.drawCard(GAME_WIDTH / 2, M.STADIUM_GRID_TOP + M.STADIUM_WIDE_CARD_H / 2, STADIUMS[DEFAULT_STADIUM], wideW, M.STADIUM_WIDE_CARD_H);
    const gridTop = M.STADIUM_GRID_TOP + M.STADIUM_WIDE_CARD_H + M.STADIUM_CARD_GAP;
    STADIUM_ORDER.filter((id) => id !== DEFAULT_STADIUM).forEach((id, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = GAME_WIDTH / 2 + (col === 0 ? -1 : 1) * (M.STADIUM_CARD_W / 2 + M.STADIUM_CARD_GAP / 2);
      const y = gridTop + M.STADIUM_CARD_H / 2 + row * (M.STADIUM_CARD_H + M.STADIUM_CARD_GAP);
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
        saveDifficulty(this.difficulty);
        this.scene.start('Match', { characterId: this.characterId, stadiumId: this.selected, difficulty: this.difficulty });
      },
      { icon: 'icon_whistle', labelScale: 3 },
    );

    this.drawDifficultyRow();

    const last = loadPref(M.LAST_STADIUM_KEY) as StadiumId | null;
    this.selected = null;
    this.next.setEnabled(false);
    this.select(last && STADIUM_ORDER.includes(last) ? last : DEFAULT_STADIUM);
  }

  private drawCard(x: number, y: number, def: StadiumDef, w = M.STADIUM_CARD_W, h = M.STADIUM_CARD_H): void {
    const left = x - w / 2;
    const top = y - h / 2;
    const bg = this.add.rectangle(x, y, w, h, M.SELECT_CARD_BG, 0.92).setInteractive({ useHandCursor: true });
    // Surface swatch with stripes, like the real pitch.
    const sw = 120;
    const pad = M.STADIUM_CARD_PAD;
    this.add.rectangle(left + 16 + sw / 2, y, sw, h - pad * 2, def.groundLight);
    for (let i = 0; i < 4; i += 2) {
      this.add.rectangle(left + 16 + (i + 0.5) * (sw / 4), y, sw / 4, h - pad * 2, def.groundDark);
    }
    const border = this.add.rectangle(x, y, w, h).setStrokeStyle(3, M.SELECT_CARD_BORDER);
    this.borders.set(def.id, border);
    const tx = left + sw + 32;
    const [country, place] = def.name.split('—').map((t) => t.trim());
    // The short wide card (standard pitch) puts its description beside the name.
    const wide = h < M.STADIUM_CARD_H;
    this.add.bitmapText(tx, top + 24, HUD.PIXEL_FONT_KEY, HUD.toHudText(country)).setScale(3).setOrigin(0, 0.5);
    if (place) {
      this.add
        .bitmapText(tx, top + 52, HUD.PIXEL_FONT_KEY, HUD.toHudText(place))
        .setScale(2)
        .setOrigin(0, 0.5)
        .setTint(HUD.UI_TITLE_COLOR);
    }
    this.add
      .bitmapText(
        wide ? tx + M.STADIUM_WIDE_DESC_DX : tx,
        wide ? top + 24 : top + 70,
        HUD.PIXEL_FONT_KEY,
        HUD.toHudText(def.description.split(/[.—]/)[0].trim()),
      )
      .setScale(2)
      .setMaxWidth(wide ? w : (w - sw - 48) / 2)
      .setTint(HUD.UI_DIM_TEXT_COLOR);
    bg.on('pointerup', () => {
      soundFX.click();
      this.select(def.id);
    });
  }

  /** M9.2: KOLAY / ORTA / ZOR pills between GERİ and MAÇA BAŞLA. */
  private drawDifficultyRow(): void {
    this.pills.clear();
    this.difficulty = loadDifficulty();
    const cx = GAME_WIDTH / 2 + D.DIFFICULTY_ROW_DX;
    const n = D.DIFFICULTY_ORDER.length;
    const rowW = n * D.DIFFICULTY_PILL_W + (n - 1) * D.DIFFICULTY_PILL_GAP;
    pixelText(this, cx, M.SELECT_BOTTOM_Y + D.DIFFICULTY_CAPTION_DY, 'RAKİP', 2, HUD.UI_DIM_TEXT_COLOR);
    D.DIFFICULTY_ORDER.forEach((id, i) => {
      const def = D.DIFFICULTIES[id];
      const x = cx - rowW / 2 + D.DIFFICULTY_PILL_W / 2 + i * (D.DIFFICULTY_PILL_W + D.DIFFICULTY_PILL_GAP);
      const bg = this.add
        .rectangle(0, 0, D.DIFFICULTY_PILL_W, D.DIFFICULTY_PILL_H, def.color)
        .setStrokeStyle(3, M.SELECT_CARD_SELECTED_BORDER)
        .setInteractive({ useHandCursor: true });
      const label = pixelText(this, 0, 0, def.label, D.DIFFICULTY_PILL_LABEL_SCALE, HUD.UI_TEXT_COLOR);
      const pill = this.add.container(x, M.SELECT_BOTTOM_Y, [bg, label]);
      bg.on('pointerup', () => {
        soundFX.click();
        this.selectDifficulty(id);
      });
      this.pills.set(id, pill);
    });
    this.selectDifficulty(this.difficulty);
  }

  private selectDifficulty(id: D.DifficultyId): void {
    this.difficulty = id;
    this.pills.forEach((pill, pid) => {
      const on = pid === id;
      pill.setAlpha(on ? 1 : D.DIFFICULTY_UNSELECTED_ALPHA);
      const bg = pill.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(on ? M.SELECT_CARD_SELECTED_WIDTH : 0, M.SELECT_CARD_SELECTED_BORDER);
    });
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
