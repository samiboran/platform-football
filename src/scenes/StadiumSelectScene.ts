import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import { STADIUMS, STADIUM_ORDER, type StadiumId } from '../config/stadiums';
import type { CharacterId } from '../config/characters';

const CARD_WIDTH = 200;
const CARD_HEIGHT = 240;
const CARD_GAP = 20;

interface StadiumSelectData {
  characterId: CharacterId;
}

/** Pick one of the four stadiums (CLAUDE.md section 7) before kickoff. */
export class StadiumSelectScene extends Phaser.Scene {
  private characterId!: CharacterId;
  private selected: StadiumId | null = null;
  private cardBorders = new Map<StadiumId, Phaser.GameObjects.Rectangle>();
  private continueText!: Phaser.GameObjects.Text;

  constructor() {
    super('StadiumSelect');
  }

  init(data: StadiumSelectData): void {
    this.characterId = data.characterId;
  }

  create(): void {
    this.selected = null;
    this.cardBorders.clear();

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0b0f14).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 50, 'Sahayı Seç', { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5);

    const totalWidth = STADIUM_ORDER.length * CARD_WIDTH + (STADIUM_ORDER.length - 1) * CARD_GAP;
    const startX = GAME_WIDTH / 2 - totalWidth / 2 + CARD_WIDTH / 2;
    const cardY = GAME_HEIGHT / 2 - 20;

    STADIUM_ORDER.forEach((id, i) => {
      const def = STADIUMS[id];
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      this.drawCard(x, cardY, def);
    });

    const continueBtn = this.add
      .rectangle(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 50, 220, 50, 0x2c3e50)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.continueText = this.add
      .text(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 50, 'MAÇA BAŞLA', {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#666666',
      })
      .setOrigin(0.5);
    continueBtn.on('pointerup', () => {
      if (this.selected) {
        this.scene.start('Match', { characterId: this.characterId, stadiumId: this.selected });
      }
    });

    const backBtn = this.add
      .rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 50, 180, 50, 0x2c3e50)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 50, 'Geri', { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' })
      .setOrigin(0.5);
    backBtn.on('pointerup', () => this.scene.start('CharacterSelect'));
  }

  private drawCard(x: number, y: number, def: (typeof STADIUMS)[StadiumId]): void {
    const bg = this.add
      .rectangle(x, y, CARD_WIDTH, CARD_HEIGHT, def.tintColor, 0.25)
      .setInteractive({ useHandCursor: true });
    const border = this.add.rectangle(x, y, CARD_WIDTH, CARD_HEIGHT).setStrokeStyle(2, 0x555555);
    this.cardBorders.set(def.id, border);

    this.add.rectangle(x, y - 70, CARD_WIDTH - 30, 50, def.tintColor).setStrokeStyle(1, 0x000000);

    this.add
      .text(x, y - 25, def.name, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5);
    this.add
      .text(x, y + 20, def.description, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#cccccc',
        align: 'center',
        wordWrap: { width: CARD_WIDTH - 20 },
      })
      .setOrigin(0.5, 0);

    bg.on('pointerup', () => this.select(def.id));
  }

  private select(id: StadiumId): void {
    this.selected = id;
    this.cardBorders.forEach((border, borderId) => {
      border.setStrokeStyle(borderId === id ? 3 : 2, borderId === id ? 0xffe066 : 0x555555);
    });
    this.continueText.setColor('#ffffff');
  }
}
