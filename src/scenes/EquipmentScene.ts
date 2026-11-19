import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import * as HUD from '../config/hud';
import * as M from '../config/menus';
import * as E from '../config/equipment';
import { makeFancyButton, panel } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { buyOrEquip, loadProfile, owns } from '../systems/profile';
import { soundFX } from '../systems/SoundFX';

/**
 * EKİPMAN (18.11.2026): boots / armband / headband, bought with gold and
 * shared by every character. Tap an owned item to wear it, a locked one to
 * buy (and wear) it.
 */
export class EquipmentScene extends Phaser.Scene {
  constructor() {
    super('Equipment');
  }

  create(): void {
    soundFX.playMusic('menu');
    drawHubBackdrop(this);
    const profile = loadProfile();
    makeFancyButton(this, 90, 40, 140, 54, 'GERİ', 0x34495e, () => this.scene.start('Menu'), { labelScale: 3 });
    this.add.bitmapText(GAME_WIDTH / 2, 40, HUD.PIXEL_FONT_KEY, HUD.toHudText('EKİPMAN')).setScale(5).setOrigin(0.5).setTint(HUD.UI_TITLE_COLOR);

    // Gold pill.
    const gx = GAME_WIDTH - 110;
    panel(this, gx, 40, M.HUB_PILL_W, M.HUB_PILL_H, M.HUB_PILL_COLOR, M.HUB_PILL_ALPHA, M.HUB_PILL_H / 2);
    this.add.image(gx - M.HUB_PILL_W / 2 + 6, 40, 'icon_coin').setScale(4);
    this.add
      .bitmapText(gx + M.HUB_PILL_W / 2 - 16, 41, HUD.PIXEL_FONT_KEY, profile.gold.toLocaleString('tr-TR'))
      .setScale(3)
      .setOrigin(1, 0.5);

    E.EQUIP_SLOTS.forEach(({ slot, title }, col) => {
      const cx = GAME_WIDTH / 2 + (col - 1) * (E.EQUIP_COLUMN_W + E.EQUIP_COLUMN_GAP);
      this.add.bitmapText(cx, E.EQUIP_TOP, HUD.PIXEL_FONT_KEY, HUD.toHudText(title)).setScale(3).setOrigin(0.5).setTint(HUD.UI_DIM_TEXT_COLOR);
      E.EQUIPMENT.filter((e) => e.slot === slot).forEach((item, row) => {
        const cy = E.EQUIP_TOP + 30 + E.EQUIP_CARD_H / 2 + row * (E.EQUIP_CARD_H + E.EQUIP_CARD_GAP);
        this.drawCard(cx, cy, item, profile.equipped[slot] === item.id, owns(item.id), profile.gold);
      });
    });
  }

  private drawCard(cx: number, cy: number, item: E.EquipDef, worn: boolean, owned: boolean, gold: number): void {
    const w = E.EQUIP_COLUMN_W;
    const h = E.EQUIP_CARD_H;
    const left = cx - w / 2;
    const g = panel(this, cx, cy, w, h, worn ? E.EQUIP_CARD_EQUIPPED_COLOR : E.EQUIP_CARD_COLOR, M.HUB_CARD_ALPHA, 12);
    if (worn) g.lineStyle(3, E.EQUIP_CARD_EQUIPPED_BORDER).strokeRoundedRect(left, cy - h / 2, w, h, 12);
    // Colour swatch until real item art exists.
    this.add.rectangle(left + 26, cy, 32, 32, item.color).setStrokeStyle(2, 0xffffff, 0.6);
    this.add.bitmapText(left + 52, cy - 18, HUD.PIXEL_FONT_KEY, HUD.toHudText(item.name)).setScale(2).setOrigin(0, 0.5).setTint(HUD.UI_TITLE_COLOR);
    this.add.bitmapText(left + 52, cy + 2, HUD.PIXEL_FONT_KEY, HUD.toHudText(item.description)).setScale(2).setOrigin(0, 0.5);
    // Status line: worn / wear / price.
    let status: string;
    let tint: number = HUD.UI_TEXT_COLOR;
    if (worn) {
      status = 'TAKILI';
      tint = E.EQUIP_CARD_EQUIPPED_BORDER;
    } else if (owned) {
      status = 'TAK';
    } else {
      status = `${item.price}`;
      tint = gold >= item.price ? HUD.UI_TITLE_COLOR : E.EQUIP_CANT_AFFORD_COLOR;
      this.add.image(left + w - 16 - status.length * 8 - 18, cy + 24, 'icon_coin').setScale(2);
    }
    this.add.bitmapText(left + w - 14, cy + 24, HUD.PIXEL_FONT_KEY, HUD.toHudText(status)).setScale(2).setOrigin(1, 0.5).setTint(tint);
    if (worn) return;
    this.add
      .rectangle(cx, cy, w, h, 0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        soundFX.click();
        if (buyOrEquip(item.id)) this.scene.restart();
        else this.cameras.main.shake(120, 0.004);
      });
  }
}
