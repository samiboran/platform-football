import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId } from '../config/characters';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 300;
const CARD_GAP = 20;

/** Pick one of the four kids (CLAUDE.md section 6) before picking a stadium. */
export class CharacterSelectScene extends Phaser.Scene {
  private selected: CharacterId | null = null;
  private cardBorders = new Map<CharacterId, Phaser.GameObjects.Rectangle>();
  private continueBtn!: Phaser.GameObjects.Rectangle;
  private continueText!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelect');
  }

  create(): void {
    this.selected = null;
    this.cardBorders.clear();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0f14).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 50, 'Karakterini Seç', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    const totalWidth = CHARACTER_ORDER.length * CARD_WIDTH + (CHARACTER_ORDER.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + CARD_WIDTH / 2;
    const cardY = GAME_HEIGHT / 2 - 20;

    CHARACTER_ORDER.forEach((id, i) => {
      const def = CHARACTERS[id];
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      this.drawCard(x, cardY, def);
    });

    this.continueBtn = this.add
      .rectangle(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 50, 220, 50, 0x2c3e50)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.continueText = this.add
      .text(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 50, 'DEVAM', { fontFamily: 'monospace', fontSize: '18px', color: '#666666' })
      .setOrigin(0.5);
    this.continueBtn.on('pointerup', () => {
      if (this.selected) this.scene.start('StadiumSelect', { characterId: this.selected });
    });

    const backBtn = this.add
      .rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 50, 180, 50, 0x2c3e50)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 50, 'Geri', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    backBtn.on('pointerup', () => this.scene.start('Menu'));
  }

  private drawCard(x: number, y: number, def: (typeof CHARACTERS)[CharacterId]): void {
    const bg = this.add
      .rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, 0x1a1f26)
      .setInteractive({ useHandCursor: true });
    const border = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT).setStrokeStyle(2, 0x555555);
    this.cardBorders.set(def.id, border);

    this.add.rectangle(x, y - 90, 60, 90, def.color).setStrokeStyle(1, 0x000000);

    this.add
      .text(x, y - 20, def.name, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(x, y + 4, def.origin, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5, 0);
    this.add
      .text(x, y + 55, def.archetype, { fontFamily: 'monospace', fontSize: '11px', color: '#ffe066' })
      .setOrigin(0.5);
    this.add
      .text(x, y + 78, def.special, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5, 0);

    bg.on('pointerup', () => this.select(def.id));
  }

  private select(id: CharacterId): void {
    this.selected = id;
    this.cardBorders.forEach((border, borderId) => {
      border.setStrokeStyle(borderId === id ? 3 : 2, borderId === id ? 0xffe066 : 0x555555);
    });
    this.continueText.setColor('#ffffff');
  }
}
