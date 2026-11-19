import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/arena';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { CHARACTERS, characterSpriteKey } from '../config/characters';
import { ELEMENTS, elementColor } from '../config/elements';
import { PERKS, PERK_SLOTS_BY_LEVEL, perkSlots } from '../config/progression';
import { ballSpriteKey } from '../config/animation';
import { makeFancyButton, panel, progressBar } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { accountLevel, characterLevel, equippedPerks, levelInfo, loadProfile, progressOf } from '../systems/profile';
import { isFullscreen, isTouchDevice, toggleFullscreen } from '../systems/mobileShell';
import * as L from '../config/lifecycle';
import { exitApp } from '../systems/appLifecycle';
import { soundFX } from '../systems/SoundFX';

/**
 * Main hub (M8, Kafa Topu style, "pixel modern"): account level + gold +
 * gems on top, the selected character on a pedestal, KARAKTER / OYNA.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  /** M9.1: "Çıkılsın mı?" dialog, open while non-null. */
  private exitDialog: Phaser.GameObjects.Container | null = null;

  create(): void {
    soundFX.playMusic('menu');
    this.exitDialog = null;
    this.cameras.main.setZoom(1);
    drawHubBackdrop(this);
    const profile = loadProfile();
    const def = CHARACTERS[profile.selected];

    this.drawTopBar(profile.gold, profile.gems);

    // Pedestal + character.
    const px = M.HUB_CHAR_X;
    const py = M.HUB_CHAR_FEET_Y;
    const ped = this.add.graphics();
    ped.fillStyle(0x000000, 0.35).fillEllipse(px + 6, py + 26, M.HUB_PEDESTAL_W, M.HUB_PEDESTAL_H);
    ped.fillStyle(M.HUB_PEDESTAL_SIDE).fillRect(px - M.HUB_PEDESTAL_W / 2, py, M.HUB_PEDESTAL_W, 18);
    ped.fillStyle(M.HUB_PEDESTAL_SIDE).fillEllipse(px, py + 18, M.HUB_PEDESTAL_W, M.HUB_PEDESTAL_H);
    ped.fillStyle(M.HUB_PEDESTAL_TOP).fillEllipse(px, py, M.HUB_PEDESTAL_W, M.HUB_PEDESTAL_H);
    ped.lineStyle(4, elementColor(def.element, 2), 0.9).strokeEllipse(px, py, M.HUB_PEDESTAL_W - 24, M.HUB_PEDESTAL_H - 12);
    const sprite = this.add.image(px, py + 6, characterSpriteKey(def.id, 'front')).setOrigin(0.5, 1);
    sprite.setScale(M.HUB_CHAR_HEIGHT / sprite.height);
    this.tweens.add({ targets: sprite, y: sprite.y - M.HUB_CHAR_BOB_PX, duration: M.HUB_CHAR_BOB_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sprite.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      soundFX.click();
      this.scene.start('Characters');
    });

    // Name plate: name + level + XP to next level.
    const lvl = levelInfo(progressOf(def.id).xp);
    panel(this, px, M.HUB_NAMEPLATE_Y, M.HUB_NAMEPLATE_W, 52, M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 14);
    this.add.bitmapText(px - M.HUB_NAMEPLATE_W / 2 + 16, M.HUB_NAMEPLATE_Y - 10, HUD.PIXEL_FONT_KEY, HUD.toHudText(def.name)).setScale(3).setOrigin(0, 0.5);
    this.add
      .bitmapText(px + M.HUB_NAMEPLATE_W / 2 - 16, M.HUB_NAMEPLATE_Y - 10, HUD.PIXEL_FONT_KEY, HUD.toHudText(`${def.teamCode} LV ${lvl.level}`))
      .setScale(3)
      .setOrigin(1, 0.5)
      .setTint(HUD.UI_TITLE_COLOR);
    progressBar(this, px - M.HUB_NAMEPLATE_W / 2 + 16, M.HUB_NAMEPLATE_Y + 13, M.HUB_NAMEPLATE_W - 32, 10, elementColor(def.element, 2))(
      lvl.need > 0 ? lvl.into / lvl.need : 1,
    );

    // Left card: equipped perks (slots by level).
    this.drawPerkCard(def.id);
    // Right card: power element.
    const rx = M.HUB_SIDE_CARD_RIGHT_X;
    const cy = M.HUB_SIDE_CARD_Y;
    panel(this, rx, cy, M.HUB_SIDE_CARD_W, M.HUB_SIDE_CARD_H, M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 16);
    this.add.bitmapText(rx, cy - 70, HUD.PIXEL_FONT_KEY, 'ELEMENT').setScale(2).setOrigin(0.5).setTint(HUD.UI_DIM_TEXT_COLOR);
    const ball = this.add.image(rx, cy - 10, ballSpriteKey(3, def.element)).setScale(4);
    this.tweens.add({ targets: ball, angle: 360, duration: 4000, repeat: -1 });
    this.add
      .bitmapText(rx, cy + 60, HUD.PIXEL_FONT_KEY, HUD.toHudText(ELEMENTS[def.element].title.replace('!', '')))
      .setScale(2)
      .setOrigin(0.5)
      .setTint(elementColor(def.element, 3));

    // Bottom buttons.
    makeFancyButton(this, M.HUB_CHAR_BTN_X, M.HUB_BUTTON_Y, M.HUB_CHAR_BTN_W, M.HUB_PLAY_H, 'KARAKTER', M.HUB_CHAR_BTN_COLOR, () =>
      this.scene.start('Characters'),
    { icon: 'icon_shirt', labelScale: 4 });
    makeFancyButton(this, M.HUB_PLAY_X, M.HUB_BUTTON_Y, M.HUB_PLAY_W, M.HUB_PLAY_H, 'OYNA', M.HUB_PLAY_COLOR, () =>
      this.scene.start('StadiumSelect', { characterId: def.id }),
    { icon: 'icon_whistle', labelScale: 6 });
  }

  /** M9.1 Android back on the main menu: ask before closing the app;
   * a second back press closes the dialog. */
  onBackButton(): void {
    if (this.exitDialog) {
      this.closeExitDialog();
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = this.add.container(0, 0).setDepth(L.EXIT_DIALOG_DEPTH);
    // Full-screen blocker so taps don't reach the hub behind the dialog.
    root.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, L.EXIT_DIALOG_OVERLAY_ALPHA).setOrigin(0).setInteractive());
    root.add(panel(this, cx, cy, L.EXIT_DIALOG_W, L.EXIT_DIALOG_H, L.EXIT_DIALOG_PANEL_COLOR, 1, 18));
    root.add(
      this.add
        .bitmapText(cx, cy - 55, HUD.PIXEL_FONT_KEY, HUD.toHudText(L.EXIT_DIALOG_TITLE))
        .setScale(L.EXIT_DIALOG_TITLE_SCALE)
        .setOrigin(0.5)
        .setTint(HUD.UI_TITLE_COLOR),
    );
    const dx = (L.EXIT_DIALOG_BUTTON_W + L.EXIT_DIALOG_BUTTON_GAP) / 2;
    const by = cy + 45;
    const yes = makeFancyButton(this, cx - dx, by, L.EXIT_DIALOG_BUTTON_W, L.EXIT_DIALOG_BUTTON_H, L.EXIT_DIALOG_YES, L.EXIT_DIALOG_YES_COLOR, () => {
      this.closeExitDialog();
      exitApp();
    }, { labelScale: 4 });
    const no = makeFancyButton(this, cx + dx, by, L.EXIT_DIALOG_BUTTON_W, L.EXIT_DIALOG_BUTTON_H, L.EXIT_DIALOG_NO, L.EXIT_DIALOG_NO_COLOR, () => this.closeExitDialog(), {
      labelScale: 4,
    });
    root.add([yes.container, no.container]);
    this.exitDialog = root;
  }

  private closeExitDialog(): void {
    this.exitDialog?.destroy();
    this.exitDialog = null;
  }

  private drawTopBar(gold: number, gems: number): void {
    const y = M.HUB_TOP_Y;
    const acc = accountLevel();
    // Account level: star badge + XP bar.
    const ax = M.HUB_ACCOUNT_X;
    panel(this, ax + 20 + M.HUB_ACCOUNT_BAR_W / 2 + 10, y, M.HUB_ACCOUNT_BAR_W + 50, M.HUB_PILL_H, M.HUB_PILL_COLOR, M.HUB_PILL_ALPHA, M.HUB_PILL_H / 2);
    progressBar(this, ax + 44, y, M.HUB_ACCOUNT_BAR_W - 10, 14, 0xb070ff)(acc.into / acc.need);
    this.add.image(ax + 20, y, 'icon_star').setScale(5);
    this.add.bitmapText(ax + 21, y + 3, HUD.PIXEL_FONT_KEY, `${acc.level}`).setScale(2).setOrigin(0.5);

    makeFancyButton(this, M.HUB_EQUIP_BTN_X, y + 2, M.HUB_EQUIP_BTN_W, M.HUB_EQUIP_BTN_H, 'EKİPMAN', M.HUB_EQUIP_BTN_COLOR, () =>
      this.scene.start('Equipment'),
    { labelScale: 3 });
    this.currencyPill(M.HUB_GOLD_X, y, 'icon_coin', gold);
    this.currencyPill(M.HUB_GEM_X, y, 'icon_gem', gems);

    if (isTouchDevice() && document.fullscreenEnabled && !isFullscreen()) {
      makeFancyButton(this, GAME_WIDTH - 60, y + 4, 90, 44, 'TAM', 0x34495e, () => void toggleFullscreen(), { labelScale: 2 });
    }
  }

  private currencyPill(x: number, y: number, icon: string, value: number): void {
    panel(this, x, y, M.HUB_PILL_W, M.HUB_PILL_H, M.HUB_PILL_COLOR, M.HUB_PILL_ALPHA, M.HUB_PILL_H / 2);
    this.add.image(x - M.HUB_PILL_W / 2 + 6, y, icon).setScale(4);
    this.add
      .bitmapText(x + M.HUB_PILL_W / 2 - 16, y + 1, HUD.PIXEL_FONT_KEY, value.toLocaleString('tr-TR'))
      .setScale(3)
      .setOrigin(1, 0.5);
  }

  private drawPerkCard(id: keyof typeof CHARACTERS): void {
    const x = M.HUB_SIDE_CARD_LEFT_X;
    const y = M.HUB_SIDE_CARD_Y;
    panel(this, x, y, M.HUB_SIDE_CARD_W, M.HUB_SIDE_CARD_H, M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 16);
    this.add.bitmapText(x, y - 70, HUD.PIXEL_FONT_KEY, HUD.toHudText('ÖZELLİKLER')).setScale(2).setOrigin(0.5).setTint(HUD.UI_DIM_TEXT_COLOR);
    const level = characterLevel(id);
    const eq = equippedPerks(id);
    const maxSlots = Math.max(...PERK_SLOTS_BY_LEVEL.map(([, n]) => n));
    for (let i = 0; i < maxSlots; i += 1) {
      const sy = y - 24 + i * 52;
      const open = i < perkSlots(level);
      panel(this, x, sy, M.HUB_SIDE_CARD_W - 30, 42, open ? 0x2c2460 : 0x15122c, 1, 10);
      const perk = eq[i];
      if (perk) {
        this.add.bitmapText(x, sy + 1, HUD.PIXEL_FONT_KEY, HUD.toHudText(PERKS[perk].name)).setScale(2).setOrigin(0.5).setTint(HUD.UI_TITLE_COLOR);
      } else if (open) {
        this.add.bitmapText(x, sy + 1, HUD.PIXEL_FONT_KEY, 'BOŞ').setScale(2).setOrigin(0.5).setTint(HUD.UI_DIM_TEXT_COLOR);
      } else {
        this.add.image(x - 34, sy, 'icon_lock').setScale(3);
        const unlockAt = PERK_SLOTS_BY_LEVEL.find(([, n]) => n > i)?.[0] ?? 0;
        this.add.bitmapText(x + 10, sy + 1, HUD.PIXEL_FONT_KEY, `LV ${unlockAt}`).setScale(2).setOrigin(0.5).setTint(HUD.UI_DIM_TEXT_COLOR);
      }
    }
  }
}
