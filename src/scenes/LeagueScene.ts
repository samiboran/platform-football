import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import * as LG from '../config/league';
import { CHARACTERS } from '../config/characters';
import { STADIUMS } from '../config/stadiums';
import { DIFFICULTIES } from '../config/difficulty';
import { makeFancyButton, panel, pixelText } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import { loadProfile, restartLeague } from '../systems/profile';
import { leagueMatch, leagueMatchLabel, leagueRival } from '../systems/league';
import { soundFX } from '../systems/SoundFX';

/**
 * M9.2 league / story mode ("Sokak Dünya Kupası"): the ladder
 * mahalle → şehir → kıta → dünya finali as four stage cards with a dot
 * per match, the next match's rival / pitch / difficulty, and OYNA.
 */
export class LeagueScene extends Phaser.Scene {
  constructor() {
    super('League');
  }

  create(): void {
    soundFX.playMusic('menu');
    drawHubBackdrop(this);
    const profile = loadProfile();
    const next = profile.league.next;
    const done = next >= LG.LEAGUE_MATCH_COUNT;
    const current = leagueMatch(next);

    pixelText(this, GAME_WIDTH / 2, M.SELECT_TITLE_Y, LG.LEAGUE_TITLE, M.SELECT_TITLE_SCALE, HUD.UI_TITLE_COLOR);
    if (profile.league.titles > 0) {
      const tx = GAME_WIDTH - 70;
      this.add.image(tx - 26, M.SELECT_TITLE_Y, 'icon_trophy').setScale(4);
      this.add.bitmapText(tx, M.SELECT_TITLE_Y + 2, HUD.PIXEL_FONT_KEY, `X${profile.league.titles}`).setScale(3).setOrigin(0, 0.5);
    }

    // Stage cards, left → right, with arrows between them.
    const n = LG.LEAGUE_STAGES.length;
    const rowW = n * LG.LEAGUE_STAGE_CARD_W + (n - 1) * LG.LEAGUE_STAGE_GAP;
    const x0 = GAME_WIDTH / 2 - rowW / 2 + LG.LEAGUE_STAGE_CARD_W / 2;
    LG.LEAGUE_STAGES.forEach((stage, s) => {
      const x = x0 + s * (LG.LEAGUE_STAGE_CARD_W + LG.LEAGUE_STAGE_GAP);
      const y = LG.LEAGUE_STAGE_Y;
      const start = LG.stageStartIndex(s);
      const cleared = next >= start + stage.matches.length;
      const active = !done && current?.stage === s;
      const locked = !cleared && !active;
      const items: Phaser.GameObjects.GameObject[] = [];
      items.push(panel(this, x, y, LG.LEAGUE_STAGE_CARD_W, LG.LEAGUE_STAGE_CARD_H, M.HUB_CARD_COLOR, 0.96, 16));
      const band = this.add.graphics();
      band.fillStyle(stage.color).fillRoundedRect(x - LG.LEAGUE_STAGE_CARD_W / 2, y - LG.LEAGUE_STAGE_CARD_H / 2, LG.LEAGUE_STAGE_CARD_W, 46, { tl: 16, tr: 16, bl: 0, br: 0 });
      items.push(band);
      const top = y - LG.LEAGUE_STAGE_CARD_H / 2;
      items.push(pixelText(this, x, top + 24, stage.name, stage.name.length > 8 ? 2 : 3, HUD.UI_TEXT_COLOR));
      items.push(pixelText(this, x, top + 66, stage.tagline, 2, HUD.UI_DIM_TEXT_COLOR));
      // One dot per match.
      const m = stage.matches.length;
      stage.matches.forEach((_, i) => {
        const dx = x + (i - (m - 1) / 2) * LG.LEAGUE_DOT_GAP;
        const idx = start + i;
        const color = idx < next ? LG.LEAGUE_DOT_DONE : idx === next ? LG.LEAGUE_DOT_NEXT : LG.LEAGUE_DOT_LOCKED;
        const dot = this.add.circle(dx, top + 104, LG.LEAGUE_DOT_R, color).setStrokeStyle(3, 0x000000, 0.5);
        items.push(dot);
        if (idx === next) this.tweens.add({ targets: dot, scale: 1.25, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
      // Bottom line: bonus, or TAMAM once cleared.
      const by = top + LG.LEAGUE_STAGE_CARD_H - 26;
      if (cleared) {
        items.push(pixelText(this, x, by, 'TAMAM', 2, LG.LEAGUE_DOT_DONE));
      } else {
        items.push(...this.bonusRow(x, by, stage.bonusGold, stage.bonusGems));
      }
      if (locked) {
        // Keep the card opaque (busy crowd behind it); dim its contents.
        for (const o of items.slice(2)) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(LG.LEAGUE_LOCKED_ALPHA);
        band.setAlpha(LG.LEAGUE_LOCKED_ALPHA + 0.25);
        this.add.image(x + LG.LEAGUE_STAGE_CARD_W / 2 - 20, top + 24, 'icon_lock').setScale(3);
      }
      if (active) {
        const ring = this.add.graphics();
        ring.lineStyle(M.SELECT_CARD_SELECTED_WIDTH, M.SELECT_CARD_SELECTED_BORDER).strokeRoundedRect(x - LG.LEAGUE_STAGE_CARD_W / 2, top, LG.LEAGUE_STAGE_CARD_W, LG.LEAGUE_STAGE_CARD_H, 16);
      }
      if (s < n - 1) pixelText(this, x + LG.LEAGUE_STAGE_CARD_W / 2 + LG.LEAGUE_STAGE_GAP / 2, y, '>', 3, HUD.UI_DIM_TEXT_COLOR);
    });

    // Next-match panel.
    const py = LG.LEAGUE_NEXT_PANEL_Y;
    panel(this, GAME_WIDTH / 2, py, LG.LEAGUE_NEXT_PANEL_W, LG.LEAGUE_NEXT_PANEL_H, M.HUB_CARD_COLOR, 0.92, 16);
    if (done || !current) {
      this.add.image(GAME_WIDTH / 2 - 190, py, 'icon_trophy').setScale(6);
      pixelText(this, GAME_WIDTH / 2 + 30, py - 14, 'ŞAMPİYONSUN!', 4, HUD.UI_TITLE_COLOR);
      pixelText(this, GAME_WIDTH / 2 + 30, py + 24, 'YENİ SEZONA BAŞLA', 2, HUD.UI_DIM_TEXT_COLOR);
    } else {
      const me = CHARACTERS[profile.selected];
      const rival = CHARACTERS[leagueRival(current.def, me.id)];
      const diff = DIFFICULTIES[current.def.difficulty];
      const left = GAME_WIDTH / 2 - LG.LEAGUE_NEXT_PANEL_W / 2 + 24;
      this.add
        .bitmapText(left, py - 22, HUD.PIXEL_FONT_KEY, HUD.toHudText(`SIRADAKİ: ${leagueMatchLabel(next)}`))
        .setScale(3)
        .setOrigin(0, 0.5)
        .setTint(HUD.UI_TITLE_COLOR);
      this.add
        .bitmapText(left, py + 18, HUD.PIXEL_FONT_KEY, HUD.toHudText(`RAKİP: ${rival.name} (${rival.teamCode})   SAHA: ${STADIUMS[current.def.stadium].name}`))
        .setScale(2)
        .setOrigin(0, 0.5);
      this.add
        .bitmapText(GAME_WIDTH / 2 + LG.LEAGUE_NEXT_PANEL_W / 2 - 24, py - 22, HUD.PIXEL_FONT_KEY, HUD.toHudText(diff.label))
        .setScale(3)
        .setOrigin(1, 0.5)
        .setTint(diff.color);
    }

    makeFancyButton(this, M.SELECT_BACK_W / 2 + 24, M.SELECT_BOTTOM_Y, M.SELECT_BACK_W, M.SELECT_BUTTON_H, 'GERİ', 0x34495e, () => this.scene.start('Menu'), {
      labelScale: 3,
    });
    if (done) {
      makeFancyButton(this, GAME_WIDTH - LG.LEAGUE_RESET_W / 2 - 24, M.SELECT_BOTTOM_Y, LG.LEAGUE_RESET_W, M.SELECT_BUTTON_H, 'YENİ SEZON', LG.LEAGUE_PLAY_COLOR, () => {
        restartLeague();
        this.scene.restart();
      }, { icon: 'icon_trophy', labelScale: 3 });
    } else {
      makeFancyButton(this, GAME_WIDTH - LG.LEAGUE_PLAY_W / 2 - 24, M.SELECT_BOTTOM_Y, LG.LEAGUE_PLAY_W, M.SELECT_BUTTON_H, 'OYNA', LG.LEAGUE_PLAY_COLOR, () =>
        this.scene.start('Match', { characterId: profile.selected, leagueIndex: next }),
      { icon: 'icon_whistle', labelScale: 4 });
    }
  }

  /** Centered "[coin] +100  [gem] +1" row; returns its objects. */
  private bonusRow(cx: number, y: number, gold: number, gems: number): Phaser.GameObjects.GameObject[] {
    const parts: [string, string][] = [['icon_coin', `+${gold}`]];
    if (gems > 0) parts.push(['icon_gem', `+${gems}`]);
    const objs: (Phaser.GameObjects.Image | Phaser.GameObjects.BitmapText)[] = [];
    let x = 0;
    parts.forEach(([icon, text], i) => {
      if (i > 0) x += LG.LEAGUE_BONUS_GAP;
      const img = this.add.image(0, y, icon).setScale(2).setOrigin(0, 0.5);
      img.x = x;
      x += img.displayWidth + 6;
      const t = this.add.bitmapText(x, y + 1, HUD.PIXEL_FONT_KEY, text).setScale(2).setOrigin(0, 0.5);
      x += t.width;
      objs.push(img, t);
    });
    const shift = cx - x / 2;
    for (const o of objs) o.x += shift;
    return objs;
  }
}
