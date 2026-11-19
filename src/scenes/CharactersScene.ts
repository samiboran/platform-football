import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, characterSpriteKey } from '../config/characters';
import { ELEMENTS, elementColor } from '../config/elements';
import { PERKS, PERK_ORDER, perkSlots } from '../config/progression';
import { ballSpriteKey } from '../config/animation';
import { portraitTextureKey } from '../systems/PowerCutIn';
import { makeFancyButton, panel, progressBar } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { equippedPerks, levelInfo, loadProfile, progressOf, selectCharacter, togglePerk } from '../systems/profile';
import { soundFX } from '../systems/SoundFX';

const ALL_IDS: CharacterId[] = ['brazil', 'congo', 'argentina', 'kenya'];

/** KARAKTER (M8): roster on the left, level / stats / perks on the right. */
export class CharactersScene extends Phaser.Scene {
  private viewing: CharacterId = 'brazil';

  constructor() {
    super('Characters');
  }

  create(data?: { viewing?: CharacterId }): void {
    soundFX.playMusic('menu');
    drawHubBackdrop(this);
    this.viewing = data?.viewing ?? loadProfile().selected;

    makeFancyButton(this, 90, 40, 140, 54, 'GERİ', 0x34495e, () => this.scene.start('Menu'), { labelScale: 3 });
    this.add.bitmapText(GAME_WIDTH / 2, 40, HUD.PIXEL_FONT_KEY, 'KARAKTERLER').setScale(5).setOrigin(0.5).setTint(HUD.UI_TITLE_COLOR);

    ALL_IDS.forEach((id, i) => this.drawTile(id, M.CHARS_LIST_TOP + i * (M.CHARS_TILE_H + M.CHARS_TILE_GAP)));
    this.drawDetail();
  }

  private drawTile(id: CharacterId, y: number): void {
    const def = CHARACTERS[id];
    const open = CHARACTER_ORDER.includes(id);
    const x = M.CHARS_LIST_X;
    const selected = loadProfile().selected === id;
    const viewing = this.viewing === id;
    const g = panel(this, x, y, M.CHARS_TILE_W, M.CHARS_TILE_H, viewing ? 0x3a2f80 : M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 14);
    if (viewing) g.lineStyle(4, HUD.UI_TITLE_COLOR).strokeRoundedRect(x - M.CHARS_TILE_W / 2, y - M.CHARS_TILE_H / 2, M.CHARS_TILE_W, M.CHARS_TILE_H, 14);
    const portrait = this.add.image(x - 60, y, portraitTextureKey(id)).setScale(1.8);
    if (!this.textures.exists(portraitTextureKey(id))) portrait.setVisible(false);
    if (!open) portrait.setTint(0x202030);
    this.add.bitmapText(x - 18, y - 14, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.name)).setScale(2).setOrigin(0, 0.5);
    const sub = open ? `${def.teamCode} LV ${levelInfo(progressOf(id).xp).level}` : M.CHARS_COMING_SOON;
    this.add
      .bitmapText(x - 18, y + 14, HUD.PIXEL_FONT_KEY, HUD.toHudText(sub))
      .setScale(2)
      .setOrigin(0, 0.5)
      .setTint(open ? HUD.UI_TITLE_COLOR : HUD.UI_DIM_TEXT_COLOR);
    if (selected) this.add.image(x + M.CHARS_TILE_W / 2 - 18, y - 22, 'icon_star').setScale(2);
    if (open) {
      this.add
        .rectangle(x, y, M.CHARS_TILE_W, M.CHARS_TILE_H, 0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
            soundFX.click();
          soundFX.click();
          this.scene.restart({ viewing: id });
        });
    }
  }

  private drawDetail(): void {
    const id = this.viewing;
    const def = CHARACTERS[id];
    const cx = M.CHARS_DETAIL_X;
    const cy = M.CHARS_DETAIL_Y;
    const left = cx - M.CHARS_DETAIL_W / 2;
    const top = cy - M.CHARS_DETAIL_H / 2;
    panel(this, cx, cy, M.CHARS_DETAIL_W, M.CHARS_DETAIL_H, M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 18);

    // Character + name/level column.
    const sprite = this.add.image(left + 90, top + 190, characterSpriteKey(id, 'front')).setOrigin(0.5, 1);
    sprite.setScale(150 / sprite.height);
    this.add.ellipse(left + 90, top + 192, 120, 26, 0x000000, 0.35).setDepth(-1);
    const lvl = levelInfo(progressOf(id).xp);
    this.add.bitmapText(left + 90, top + 222, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.name)).setScale(3).setOrigin(0.5);
    this.add.bitmapText(left + 90, top + 252, HUD.PIXEL_FONT_KEY, HUD.toHudText(`${def.teamCode} LV ${lvl.level}`)).setScale(3).setOrigin(0.5).setTint(HUD.UI_TITLE_COLOR);
    progressBar(this, left + 20, top + 280, 140, 12, elementColor(def.element, 2))(lvl.need > 0 ? lvl.into / lvl.need : 1);
    this.add
      .bitmapText(left + 90, top + 302, HUD.PIXEL_FONT_KEY, lvl.need > 0 ? `${lvl.into}/${lvl.need} XP` : 'MAX')
      .setScale(2)
      .setOrigin(0.5)
      .setTint(HUD.UI_DIM_TEXT_COLOR);

    // Middle column: element + stats.
    const mx = left + 200;
    this.add.image(mx + 12, top + 34, ballSpriteKey(3, def.element)).setScale(2.5);
    this.add
      .bitmapText(mx + 40, top + 34, HUD.PIXEL_FONT_KEY, HUD.toHudText(ELEMENTS[def.element].title.replace('!', '')))
      .setScale(2)
      .setOrigin(0, 0.5)
      .setTint(elementColor(def.element, 3));
    const stats: [string, number][] = [
      ['HIZ', def.speedMultiplier],
      ['ŞUT', def.shotPowerMultiplier],
      ['GÜÇ', def.powerMultiplier],
    ];
    stats.forEach(([label, v], i) => {
      const sy = top + 80 + i * 30;
      this.add.bitmapText(mx, sy, HUD.PIXEL_FONT_KEY, HUD.toHudText(label)).setScale(2).setOrigin(0, 0.5);
      const f = (v - M.CHAR_STAT_MIN) / (M.CHAR_STAT_MAX - M.CHAR_STAT_MIN);
      progressBar(this, mx + 50, sy, 120, 12, M.CHAR_STAT_COLOR)(Phaser.Math.Clamp(f, 0.05, 1));
    });
    this.add
      .bitmapText(mx, top + 180, HUD.PIXEL_FONT_KEY, HUD.toHudText('ÖZEL: ' + def.special))
      .setScale(2)
      .setMaxWidth(90)
      .setTint(HUD.UI_TEXT_COLOR);

    // Right column: perks.
    const px = left + 400;
    const slots = perkSlots(lvl.level);
    const eq = equippedPerks(id);
    this.add
      .bitmapText(px, top + 24, HUD.PIXEL_FONT_KEY, HUD.toHudText(`ÖZELLİKLER  ${eq.length}/${slots}`))
      .setScale(2)
      .setOrigin(0, 0.5)
      .setTint(HUD.UI_DIM_TEXT_COLOR);
    PERK_ORDER.forEach((perkId, i) => {
      const perk = PERKS[perkId];
      const ry = top + 60 + i * M.CHARS_PERK_ROW_H;
      const unlocked = lvl.level >= perk.unlockLevel;
      const on = eq.includes(perkId);
      const rowW = 260;
      const g = panel(this, px + rowW / 2, ry + 8, rowW, M.CHARS_PERK_ROW_H - 6, on ? 0x2f6a3a : unlocked ? 0x2c2460 : 0x15122c, 1, 10);
      if (on) g.lineStyle(3, 0x7cff9a).strokeRoundedRect(px, ry + 8 - (M.CHARS_PERK_ROW_H - 6) / 2, rowW, M.CHARS_PERK_ROW_H - 6, 10);
      this.add
        .bitmapText(px + 10, ry, HUD.PIXEL_FONT_KEY, HUD.toHudText(perk.name))
        .setScale(2)
        .setOrigin(0, 0.5)
        .setTint(unlocked ? HUD.UI_TITLE_COLOR : HUD.UI_DIM_TEXT_COLOR);
      this.add
        .bitmapText(px + 10, ry + 18, HUD.PIXEL_FONT_KEY, HUD.toHudText(perk.description))
        .setScale(2)
        .setOrigin(0, 0.5)
        .setTint(HUD.UI_TEXT_COLOR);
      if (!unlocked) {
        this.add.image(px + rowW - 52, ry, 'icon_lock').setScale(2);
        this.add.bitmapText(px + rowW - 12, ry, HUD.PIXEL_FONT_KEY, `LV${perk.unlockLevel}`).setScale(2).setOrigin(1, 0.5);
      } else {
        this.add
          .bitmapText(px + rowW - 12, ry, HUD.PIXEL_FONT_KEY, on ? 'ÇIKAR' : 'TAK')
          .setScale(2)
          .setOrigin(1, 0.5)
          .setTint(on ? 0x7cff9a : 0xffffff);
        this.add
          .rectangle(px + rowW / 2, ry + 8, rowW, M.CHARS_PERK_ROW_H - 6, 0, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => {
            if (togglePerk(id, perkId)) this.scene.restart({ viewing: id });
            else this.cameras.main.shake(120, 0.004);
          });
      }
    });

    // Select.
    const isSel = loadProfile().selected === id;
    const btn = makeFancyButton(this, cx + 180, M.HUB_BUTTON_Y, 300, 70, isSel ? 'SEÇİLİ' : 'SEÇ', M.CHARS_SELECT_COLOR, () => {
      selectCharacter(id);
      this.scene.restart({ viewing: id });
    }, { labelScale: 4 });
    if (isSel) btn.setEnabled(false);
    makeFancyButton(this, cx - 160, M.HUB_BUTTON_Y, 300, 70, 'OYNA', M.HUB_PLAY_COLOR, () => {
      selectCharacter(id);
      this.scene.start('StadiumSelect', { characterId: id });
    }, { icon: 'icon_whistle', labelScale: 4 });
  }
}
