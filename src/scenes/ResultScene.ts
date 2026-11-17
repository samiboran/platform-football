import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import type { CharacterId } from '../config/characters';
import type { StadiumId } from '../config/stadiums';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { makeButton, menuBackground, pixelText } from '../systems/uiKit';

interface ResultData {
  scoreLeft?: number;
  scoreRight?: number;
  characterId?: CharacterId;
  stadiumId?: StadiumId;
}

/** Final score + rematch (M7.4). */
export class ResultScene extends Phaser.Scene {
  private resultData: ResultData = {};

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.resultData = data ?? {};
  }

  create(): void {
    menuBackground(this, GAME_WIDTH, GAME_HEIGHT);
    const { scoreLeft: l = 0, scoreRight: r = 0 } = this.resultData;
    const title = l > r ? 'KAZANDIN!' : l < r ? 'KAYBETTİN' : 'BERABERE';
    const color = l > r ? HUD.UI_TITLE_COLOR : l < r ? 0xff8a7a : HUD.UI_TEXT_COLOR;
    pixelText(this, GAME_WIDTH / 2, M.RESULT_TITLE_Y, title, 8, color);
    pixelText(this, GAME_WIDTH / 2, M.RESULT_SCORE_Y, `${l}-${r}`, M.RESULT_SCORE_SCALE, HUD.SCORE_COLOR);

    const { characterId, stadiumId } = this.resultData;
    const canRematch = characterId !== undefined && stadiumId !== undefined;
    const bw = 300;
    const gap = 30;
    makeButton(this, GAME_WIDTH / 2 + (canRematch ? bw / 2 + gap / 2 : 0), M.RESULT_BUTTONS_Y, bw, 70, 'ANA MENÜ', () =>
      this.scene.start('Menu'),
    );
    if (canRematch) {
      makeButton(
        this,
        GAME_WIDTH / 2 - bw / 2 - gap / 2,
        M.RESULT_BUTTONS_Y,
        bw,
        70,
        'RÖVANŞ',
        () => this.scene.start('Match', { characterId, stadiumId }),
        { primary: true },
      );
    }
  }
}
