import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/arena';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CharactersScene } from './scenes/CharactersScene';
import { LeagueScene } from './scenes/LeagueScene';
import { StadiumSelectScene } from './scenes/StadiumSelectScene';
import { MatchScene } from './scenes/MatchScene';
import { ResultScene } from './scenes/ResultScene';
import { EquipmentScene } from './scenes/EquipmentScene';
import { SettingsScene } from './scenes/SettingsScene';
import { installAutoFullscreen } from './systems/mobileShell';
import { registerOfflineCache } from './systems/offline';
import { installAppLifecycle } from './systems/appLifecycle';
import { soundFX } from './systems/SoundFX';
import { installTranslation, translateDocument } from './i18n';
import { loadSettings } from './systems/settings';

installTranslation();
loadSettings(); // applies the saved / device language before the first text is drawn
translateDocument();
installAutoFullscreen();
registerOfflineCache();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0b0f14',
  pixelArt: true,
  // A long-press on the touch buttons must fire the button, not a
  // right-click-style context menu (mainly an Android/desktop-trackpad
  // issue, but harmless to disable everywhere).
  disableContextMenu: true,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  // Phaser only tracks 1 touch by default — joystick (left thumb) + a
  // button (right thumb) at the same time needs at least 2. 3 leaves room
  // for M3's extra buttons without touching this again.
  input: {
    activePointers: 3,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CharactersScene, EquipmentScene, SettingsScene, StadiumSelectScene, LeagueScene, MatchScene, ResultScene],
});

installAppLifecycle(game);
soundFX.installUnlock();

// Dev-server only (stripped from production builds): lets
// tools/store/capture.cjs drive a match for store screenshots.
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
