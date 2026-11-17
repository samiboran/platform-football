import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/arena';
import { CHARACTERS, type CharacterId } from '../config/characters';
import type { StadiumId } from '../config/stadiums';
import { PERKS } from '../config/progression';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { makeFancyButton, panel } from '../systems/uiKit';
import { drawHubBackdrop } from '../systems/hubBackdrop';
import type { MatchRewards } from '../systems/profile';

interface ResultData {
  scoreLeft?: number;
  scoreRight?: number;
  characterId?: CharacterId;
  stadiumId?: StadiumId;
  rewards?: MatchRewards;
}

/** Final score, rewards (XP / gold / gems, level-up) and rematch (M8). */
export class ResultScene extends Phaser.Scene {
  private resultData: ResultData = {};

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.resultData = data ?? {};
  }

  create(): void {
    drawHubBackdrop(this);
    const { scoreLeft: l = 0, scoreRight: r = 0, rewards, characterId, stadiumId } = this.resultData;
    const title = l > r ? 'KAZANDIN!' : l < r ? 'KAYBETTİN' : 'BERABERE';
    const color = l > r ? HUD.UI_TITLE_COLOR : l < r ? 0xff8a7a : HUD.UI_TEXT_COLOR;

    panel(this, GAME_WIDTH / 2, 205, 560, 330, M.HUB_CARD_COLOR, 0.92, 20);
    this.add.bitmapText(GAME_WIDTH / 2, 80, HUD.PIXEL_FONT_KEY, HUD.toHudText(title)).setScale(7).setOrigin(0.5).setTint(color);
    this.add.bitmapText(GAME_WIDTH / 2, 150, HUD.PIXEL_FONT_KEY, `${l}-${r}`).setScale(9).setOrigin(0.5).setTint(HUD.SCORE_COLOR);

    if (rewards) {
      const items: [string, string][] = [
        ['icon_star', `+${rewards.xp} XP`],
        ['icon_coin', `+${rewards.gold}`],
        ['icon_gem', `+${rewards.gems}`],
      ];
      items.forEach(([icon, text], i) => {
        const x = GAME_WIDTH / 2 - 170 + i * 170;
        const img = this.add.image(x - 40, 232, icon).setScale(4);
        const t = this.add.bitmapText(x - 14, 234, HUD.PIXEL_FONT_KEY, text).setScale(3).setOrigin(0, 0.5);
        for (const o of [img, t]) {
          o.setAlpha(0);
          this.tweens.add({ targets: o, alpha: 1, delay: 300 + i * 250, duration: 250 });
        }
      });
      if (rewards.levelAfter > rewards.levelBefore && characterId) {
        const name = CHARACTERS[characterId].name;
        const up = this.add
          .bitmapText(GAME_WIDTH / 2, 290, HUD.PIXEL_FONT_KEY, HUD.toHudText(`${name} LV ${rewards.levelAfter}!`))
          .setScale(4)
          .setOrigin(0.5)
          .setTint(0x7cff9a);
        up.setScale(0);
        this.tweens.add({ targets: up, scale: 4, delay: 1100, duration: 400, ease: 'Back.easeOut' });
        if (rewards.newPerks.length) {
          this.add
            .bitmapText(
              GAME_WIDTH / 2,
              330,
              HUD.PIXEL_FONT_KEY,
              HUD.toHudText('YENİ ÖZELLİK: ' + rewards.newPerks.map((p) => PERKS[p].name).join(', ')),
            )
            .setScale(2)
            .setOrigin(0.5)
            .setTint(HUD.UI_TITLE_COLOR);
        }
      }
    }

    const canRematch = characterId !== undefined && stadiumId !== undefined;
    makeFancyButton(this, GAME_WIDTH / 2 + (canRematch ? 170 : 0), M.HUB_BUTTON_Y, 300, 70, 'DEVAM', 0x34495e, () =>
      this.scene.start('Menu'),
    { labelScale: 4 });
    if (canRematch) {
      makeFancyButton(this, GAME_WIDTH / 2 - 170, M.HUB_BUTTON_Y, 300, 70, 'RÖVANŞ', M.HUB_PLAY_COLOR, () =>
        this.scene.start('Match', { characterId, stadiumId }),
      { icon: 'icon_whistle', labelScale: 4 });
    }
  }
}
