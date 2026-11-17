import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as M from '../config/menus';
import * as HUD from '../config/hud';
import { ballSpriteKey } from '../config/animation';
import { makeButton, menuBackground, pixelText } from '../systems/uiKit';
import { isFullscreen, isTouchDevice, toggleFullscreen } from '../systems/mobileShell';

/** Title screen (M7.4): big OYNA button, fullscreen toggle on phones. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    this.cameras.main.setZoom(1);
    menuBackground(this, GAME_WIDTH, GAME_HEIGHT);

    pixelText(this, GAME_WIDTH / 2, M.MENU_TITLE_Y, M.MENU_TITLE, M.MENU_TITLE_SCALE, HUD.UI_TITLE_COLOR);
    pixelText(this, GAME_WIDTH / 2, M.MENU_TITLE_Y + M.MENU_SUBTITLE_GAP, M.MENU_SUBTITLE, M.MENU_SUBTITLE_SCALE, HUD.UI_TEXT_COLOR);

    const ball = this.add.image(GAME_WIDTH / 2, M.MENU_BALL_Y, ballSpriteKey(3, 'fire')).setScale(M.MENU_BALL_SCALE);
    this.tweens.add({
      targets: ball,
      y: M.MENU_BALL_Y - M.MENU_BALL_BOB_PX,
      duration: M.MENU_BALL_BOB_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    makeButton(this, GAME_WIDTH / 2, M.MENU_PLAY_Y, M.MENU_BUTTON_W, M.MENU_BUTTON_H, M.MENU_PLAY_LABEL, () =>
      this.scene.start('CharacterSelect'),
    { primary: true, labelScale: 4 });

    if (isTouchDevice() && document.fullscreenEnabled && !isFullscreen()) {
      makeButton(this, GAME_WIDTH / 2, M.MENU_FULLSCREEN_Y, M.MENU_BUTTON_W, M.MENU_BUTTON_H, M.MENU_FULLSCREEN_LABEL, () => {
        void toggleFullscreen();
      });
    }
  }
}
