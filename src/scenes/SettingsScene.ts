import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as HUD from '../config/hud';
import * as M from '../config/menus';
import * as S from '../config/settings';
import { makeFancyButton, panel } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { loadSettings, resetSettings, saveSettings, touchLayout, type Settings } from '../systems/settings';
import { soundFX } from '../systems/SoundFX';

interface Row {
  label: string;
  value: (s: Settings) => string;
  color: (s: Settings) => number;
  /** Omitted = not changeable yet (shows YAKINDA). */
  onTap?: (s: Settings) => void;
}

/**
 * M9.2 AYARLAR: sound, music, vibration, touch button size / opacity,
 * left/right-hand layout, language. Every change is saved immediately; a
 * mini match screen on the right previews the touch layout.
 */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    soundFX.playMusic('menu');
    drawHubBackdrop(this);
    makeFancyButton(this, 90, 40, 140, 54, 'GERİ', 0x34495e, () => this.scene.start('Menu'), { labelScale: 3 });
    this.add
      .bitmapText(GAME_WIDTH / 2, 40, HUD.PIXEL_FONT_KEY, HUD.toHudText(S.SETTINGS_TITLE))
      .setScale(5)
      .setOrigin(0.5)
      .setTint(HUD.UI_TITLE_COLOR);

    const s = loadSettings();
    const onOff = (on: boolean) => (on ? S.SETTINGS_ON : S.SETTINGS_OFF);
    const onOffColor = (on: boolean) => (on ? S.SETTINGS_ON_COLOR : S.SETTINGS_OFF_COLOR);
    const cycle = <T,>(list: readonly T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length];
    const rows: Row[] = [
      {
        label: 'SES EFEKTLERİ',
        value: () => onOff(soundFX.sfxEnabled),
        color: () => onOffColor(soundFX.sfxEnabled),
        onTap: () => soundFX.setSfxEnabled(!soundFX.sfxEnabled),
      },
      {
        label: 'MÜZİK',
        value: () => onOff(soundFX.musicEnabled),
        color: () => onOffColor(soundFX.musicEnabled),
        onTap: () => soundFX.setMusicEnabled(!soundFX.musicEnabled),
      },
      {
        label: 'TİTREŞİM',
        value: (v) => onOff(v.vibration),
        color: (v) => onOffColor(v.vibration),
        onTap: (v) => {
          const on = !v.vibration;
          saveSettings({ vibration: on });
          if (on) {
            try {
              navigator.vibrate?.(S.SETTINGS_VIBRATE_SAMPLE_MS);
            } catch {
              /* unsupported */
            }
          }
        },
      },
      {
        label: 'TUŞ BOYUTU',
        value: (v) => S.BUTTON_SIZE_OPTIONS[v.buttonSizeIndex].label,
        color: () => S.SETTINGS_CYCLE_COLOR,
        onTap: (v) => saveSettings({ buttonSizeIndex: (v.buttonSizeIndex + 1) % S.BUTTON_SIZE_OPTIONS.length }),
      },
      {
        label: 'TUŞ ŞEFFAFLIĞI',
        value: (v) => S.BUTTON_OPACITY_OPTIONS[v.buttonOpacityIndex].label,
        color: () => S.SETTINGS_CYCLE_COLOR,
        onTap: (v) => saveSettings({ buttonOpacityIndex: (v.buttonOpacityIndex + 1) % S.BUTTON_OPACITY_OPTIONS.length }),
      },
      {
        label: 'EL DÜZENİ',
        value: (v) => S.HANDEDNESS_LABELS[v.handedness],
        color: () => S.SETTINGS_CYCLE_COLOR,
        onTap: (v) => saveSettings({ handedness: v.handedness === 'right' ? 'left' : 'right' }),
      },
      {
        label: 'DİL',
        value: (v) => S.LANGUAGE_LABELS[v.language],
        color: () => (S.LANGUAGES_AVAILABLE.length > 1 ? S.SETTINGS_CYCLE_COLOR : S.SETTINGS_DISABLED_COLOR),
        onTap:
          S.LANGUAGES_AVAILABLE.length > 1 ? (v) => saveSettings({ language: cycle(S.LANGUAGES_AVAILABLE, v.language) }) : undefined,
      },
    ];

    rows.forEach((row, i) => this.drawRow(row, i, s));

    const lastY = S.SETTINGS_ROWS_TOP + rows.length * (S.SETTINGS_ROW_H + S.SETTINGS_ROW_GAP);
    makeFancyButton(this, S.SETTINGS_PREVIEW_X, lastY - S.SETTINGS_ROW_H / 2, 200, 48, S.SETTINGS_RESET, S.SETTINGS_RESET_COLOR, () => {
      resetSettings();
      soundFX.setSfxEnabled(true);
      soundFX.setMusicEnabled(true);
      this.scene.restart();
    }, { labelScale: 3 });

    this.drawPreview(s);
  }

  private drawRow(row: Row, i: number, s: Settings): void {
    const cy = S.SETTINGS_ROWS_TOP + i * (S.SETTINGS_ROW_H + S.SETTINGS_ROW_GAP) + S.SETTINGS_ROW_H / 2;
    const left = S.SETTINGS_ROW_X - S.SETTINGS_ROW_W / 2;
    panel(this, S.SETTINGS_ROW_X, cy, S.SETTINGS_ROW_W, S.SETTINGS_ROW_H, M.HUB_CARD_COLOR, M.HUB_CARD_ALPHA, 12);
    this.add
      .bitmapText(left + 18, cy + 1, HUD.PIXEL_FONT_KEY, HUD.toHudText(row.label))
      .setScale(S.SETTINGS_LABEL_SCALE)
      .setOrigin(0, 0.5);
    const vx = left + S.SETTINGS_ROW_W - S.SETTINGS_VALUE_W / 2 - 8;
    const tap = row.onTap;
    makeFancyButton(this, vx, cy - 2, S.SETTINGS_VALUE_W, S.SETTINGS_VALUE_H, row.value(s), row.color(s), () => {
      if (!tap) return;
      tap(loadSettings());
      this.scene.restart();
    }, { labelScale: 3 });
    if (!tap) {
      this.add
        .bitmapText(vx - S.SETTINGS_VALUE_W / 2 - 12, cy + 1, HUD.PIXEL_FONT_KEY, HUD.toHudText(S.SETTINGS_SOON))
        .setScale(2)
        .setOrigin(1, 0.5)
        .setTint(HUD.UI_DIM_TEXT_COLOR);
    }
  }

  /** Mini match screen with the joystick + 4 buttons as they'll appear. */
  private drawPreview(s: Settings): void {
    const k = S.SETTINGS_PREVIEW_SCALE;
    const w = GAME_WIDTH * k;
    const h = GAME_HEIGHT * k;
    const ox = S.SETTINGS_PREVIEW_X - w / 2;
    const oy = S.SETTINGS_PREVIEW_Y - h / 2;
    const g = this.add.graphics();
    g.fillStyle(S.SETTINGS_PREVIEW_PITCH).fillRect(ox, oy, w, h);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(ox + w / 2, oy, ox + w / 2, oy + h);
    g.lineStyle(3, 0xffffff, 0.95).strokeRect(ox, oy, w, h);
    const L = touchLayout(s);
    const circle = (x: number, y: number, r: number) => {
      g.fillStyle(0x10131a, 0.6 * L.alpha).fillCircle(ox + x * k, oy + y * k, r * k);
      g.lineStyle(1, 0xffffff, 0.8 * L.alpha).strokeCircle(ox + x * k, oy + y * k, r * k);
    };
    g.fillStyle(0xffffff, 0.3 * L.alpha).fillCircle(ox + L.joyRestX * k, oy + L.joyRestY * k, L.joyRadius * k);
    const outer = L.leftHanded ? -L.spacing : L.spacing;
    circle(L.clusterX, L.clusterY - L.spacing, L.buttonRadius);
    circle(L.clusterX + outer, L.clusterY, L.buttonRadius);
    circle(L.clusterX - outer, L.clusterY, L.buttonRadius);
    circle(L.clusterX, L.clusterY + L.spacing, L.actionRadius);
    this.add
      .bitmapText(S.SETTINGS_PREVIEW_X, oy - 16, HUD.PIXEL_FONT_KEY, HUD.toHudText('ÖNİZLEME'))
      .setScale(2)
      .setOrigin(0.5)
      .setTint(HUD.UI_DIM_TEXT_COLOR);
  }
}
