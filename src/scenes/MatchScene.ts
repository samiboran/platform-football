import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEFT_GOAL_LINE_X,
  CENTER_LINE_X,
  CENTER_X,
  DEPTH_BAND_HEIGHT,
  DEPTH_MIN,
  DEPTH_MAX,
  FAR_Y,
  CONTACT_TOLERANCE_X,
  CONTACT_TOLERANCE_Z,
  projectToScreen,
} from '../config/arena';
import { MATCH_DURATION_SECONDS } from '../config/match';
import { CHARACTERS, type CharacterId } from '../config/characters';
import { STADIUMS, type StadiumId } from '../config/stadiums';
import { drawPitch } from '../systems/pitchRenderer';
import { InputController } from '../systems/InputController';
import { Character } from '../entities/Character';
import { Ball } from '../entities/Ball';

interface MatchData {
  characterId?: CharacterId;
  stadiumId?: StadiumId;
}

/**
 * M2: ball physics, character-ball contact, goal detection, scoreboard,
 * match timer. Action/power (shoot/hold matrix) lands in M3 — contact here
 * is just a simple "dribble nudge" placeholder, scaled by the M4 character's
 * power stat and the M5 stadium's ball tuning.
 */
export class MatchScene extends Phaser.Scene {
  private input1!: InputController;
  private player!: Character;
  /** Static same-half reference character — debug aid (F1) proving the
   * depth-sort math, not a real gameplay entity. */
  private depthSortRef!: Character;
  private ball!: Ball;
  private debugVisible = false;
  private debugGraphics!: Phaser.GameObjects.Graphics;

  private character = CHARACTERS.argentina;
  private stadium = STADIUMS.argentina;

  private scoreLeft = 0;
  private scoreRight = 0;
  private timeRemaining = MATCH_DURATION_SECONDS;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private matchOver = false;

  constructor() {
    super('Match');
  }

  init(data: MatchData): void {
    this.character = CHARACTERS[data.characterId ?? 'argentina'];
    this.stadium = STADIUMS[data.stadiumId ?? 'argentina'];
  }

  create(): void {
    // Fixed camera — no zoom, no follow, no pan (CLAUDE.md section 10).
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    this.scoreLeft = 0;
    this.scoreRight = 0;
    this.timeRemaining = MATCH_DURATION_SECONDS;
    this.matchOver = false;

    drawPitch(this);

    // Stadium mood tint — a stand-in for real per-stadium art (M5).
    if (this.stadium.rhythmVisual) {
      this.addRhythmPulse();
    } else {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, this.stadium.tintColor, 0.06);
    }

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 20, '0 — 0', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ffe066',
      })
      .setOrigin(0.5);
    this.timeText = this.add
      .text(GAME_WIDTH / 2, 44, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(10, GAME_HEIGHT - 10, `Karakter: ${this.character.name}  |  Saha: ${this.stadium.name}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
      })
      .setOrigin(0, 1);
    this.updateHud();

    const leftHalfX = (LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2;
    const bounds = { minX: LEFT_GOAL_LINE_X, maxX: CENTER_LINE_X };

    this.player = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT / 2, bounds, this.character.color, this.character.speedMultiplier);
    this.depthSortRef = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT * 0.85, bounds, 0xe74c3c);
    this.depthSortRef.setVisible(false);

    this.ball = new Ball(this, CENTER_X, DEPTH_BAND_HEIGHT / 2, 40, {
      bounceMultiplier: this.stadium.bounceMultiplier,
      frictionMultiplier: this.stadium.frictionMultiplier,
      windX: this.stadium.windX,
      windZ: this.stadium.windZ,
    });

    this.input1 = new InputController(this, 90, GAME_HEIGHT - 90, GAME_WIDTH - 90, GAME_HEIGHT - 90);

    this.debugGraphics = this.add.graphics().setDepth(20000);

    this.input.keyboard?.on('keydown-F1', () => {
      this.debugVisible = !this.debugVisible;
      this.depthSortRef.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    });

    // Manual early-end button, handy for testing without waiting out the clock.
    const endBtn = this.add
      .rectangle(GAME_WIDTH - 90, 24, 140, 32, 0x2c3e50)
      .setStrokeStyle(1, 0xffffff)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH - 90, 24, 'Bitir (test)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    endBtn.on('pointerup', () => this.endMatch());
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return;

    const move = this.input1.getMoveVector();
    const jumpPressed = this.input1.consumeJumpPressed();
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed });
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false });

    // Character-ball contact — simple nudge (M3 replaces this with the
    // real shoot/hold power matrix).
    const dx = this.ball.x - this.player.x;
    const dz = this.ball.z - this.player.z;
    if (Math.abs(dx) <= CONTACT_TOLERANCE_X && Math.abs(dz) <= CONTACT_TOLERANCE_Z) {
      this.ball.applyTouch(move.x, move.z, dx, dz, this.character.powerMultiplier, this.character.chaosTouch);
    }

    const scored = this.ball.update(delta);
    if (scored === 'left') {
      this.scoreRight += 1; // ball entered the left goal -> right side scores
      this.updateHud();
      this.ball.reset(CENTER_X, DEPTH_BAND_HEIGHT / 2);
    } else if (scored === 'right') {
      this.scoreLeft += 1;
      this.updateHud();
      this.ball.reset(CENTER_X, DEPTH_BAND_HEIGHT / 2);
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - delta / 1000);
    this.updateHud();
    if (this.timeRemaining <= 0) {
      this.endMatch();
      return;
    }

    if (this.debugVisible) {
      this.debugGraphics.clear();
      this.debugGraphics.lineStyle(1, 0xff00ff, 0.8);
      // Left-half bounds as an actual trapezoid, matching the perspective pitch.
      const nearLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MIN, 0);
      const nearRight = projectToScreen(CENTER_LINE_X, DEPTH_MIN, 0);
      const farRight = projectToScreen(CENTER_LINE_X, DEPTH_MAX, 0);
      const farLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MAX, 0);
      this.debugGraphics.beginPath();
      this.debugGraphics.moveTo(nearLeft.screenX, nearLeft.screenY);
      this.debugGraphics.lineTo(nearRight.screenX, nearRight.screenY);
      this.debugGraphics.lineTo(farRight.screenX, farRight.screenY);
      this.debugGraphics.lineTo(farLeft.screenX, farLeft.screenY);
      this.debugGraphics.closePath();
      this.debugGraphics.strokePath();
    }
  }

  private updateHud(): void {
    this.scoreText.setText(`${this.scoreLeft} — ${this.scoreRight}`);
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = Math.floor(this.timeRemaining % 60);
    this.timeText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }

  private endMatch(): void {
    if (this.matchOver) return;
    this.matchOver = true;
    this.scene.start('Result', { scoreLeft: this.scoreLeft, scoreRight: this.scoreRight });
  }

  /** Kongo's "ritim görsele yansır" — a cosmetic pulse on the stands band,
   * no physics involved. */
  private addRhythmPulse(): void {
    const pulse = this.add.rectangle(GAME_WIDTH / 2, FAR_Y / 2, GAME_WIDTH, FAR_Y, this.stadium.tintColor, 0.25);
    this.tweens.add({
      targets: pulse,
      alpha: { from: 0.1, to: 0.4 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
