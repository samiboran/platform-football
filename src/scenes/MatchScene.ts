import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
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
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, type CharacterDef } from '../config/characters';
import { STADIUMS, type StadiumId } from '../config/stadiums';
import {
  POWER_MAX_SEGMENTS,
  SHOT_SPEED_NORMAL,
  SHOT_SPEED_POWER_MULTIPLIER,
  POWER_SHOT_SEGMENT_COST,
} from '../config/power';
import {
  SUPER_MOVE_SEGMENT_COST,
  SUPER_STRIKE_SPEED_MULTIPLIER,
  SUPER_CONTROL_SPEED_MULTIPLIER,
  SUPER_CHAOS_SPEED_MULTIPLIER,
  SUPER_CHAOS_WOBBLE_MULTIPLIER,
  SUPER_RHYTHM_SPEED_MULTIPLIER,
  SUPER_RHYTHM_BONUS_MULTIPLIER,
  KONGO_RHYTHM_PERIOD_SECONDS,
  KONGO_RHYTHM_WINDOW_SECONDS,
} from '../config/super';
import { drawPitch } from '../systems/pitchRenderer';
import { InputController } from '../systems/InputController';
import { soundFX } from '../systems/SoundFX';
import { CrowdBand } from '../systems/CrowdBand';
import { Character } from '../entities/Character';
import { Ball } from '../entities/Ball';
import { AIKeeper } from '../entities/AIKeeper';
import { AIOpponent } from '../entities/AIOpponent';

interface MatchData {
  characterId?: CharacterId;
  stadiumId?: StadiumId;
}

/**
 * Ball physics, character-ball contact, goal detection, scoreboard, match
 * timer (M2), the M3 Aksiyon/Dash/power system, M4's per-character super
 * moves, and (M5) a real AI opponent: a computer-controlled outfield
 * player on the right half (AIOpponent) plus a keeper for each goal —
 * one defending against the human (tied to the AI's character stats),
 * one automatically defending the human's own goal (tied to the human's
 * own character stats), since there's no second human player yet. See
 * docs/PROGRESS.md.
 */
export class MatchScene extends Phaser.Scene {
  private input1!: InputController;
  private player!: Character;
  /** Static same-half reference character — debug aid (F1) proving the
   * depth-sort math, not a real gameplay entity. */
  private depthSortRef!: Character;
  private ball!: Ball;
  private keeper!: AIKeeper;
  private leftKeeper!: AIKeeper;
  private opponent!: AIOpponent;
  private opponentCharacter: CharacterDef = CHARACTERS.kenya;
  private crowd!: CrowdBand;
  private debugVisible = false;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private powerSegmentBoxes: Phaser.GameObjects.Rectangle[] = [];
  /** Aim direction captured at the moment Aksiyon is pressed — CLAUDE.md:
   * "Şut yönü, Aksiyon'a basıldığı andaki joystick yönünden gelir." Falls
   * back to facing when the stick is neutral. */
  private lastAimX = 1;
  private lastAimZ = 0;
  /** Kongo's rhythm clock (M4 super move) — free-running, independent of
   * the stadium's cosmetic pulse, so timing works the same on any saha. */
  private rhythmClock = 0;

  private character = CHARACTERS.argentina;
  private stadium = STADIUMS.argentina;

  private scoreLeft = 0;
  private scoreRight = 0;
  private timeRemaining = MATCH_DURATION_SECONDS;
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private matchOver = false;
  private wasTouchingBall = false;

  constructor() {
    super('Match');
  }

  init(data: MatchData): void {
    this.character = CHARACTERS[data.characterId ?? 'argentina'];
    this.stadium = STADIUMS[data.stadiumId ?? 'argentina'];
    // The computer picks a different character than the human's, purely
    // for variety — there's no AI character-select screen (out of scope).
    const pool = CHARACTER_ORDER.filter((id) => id !== this.character.id);
    this.opponentCharacter = CHARACTERS[Phaser.Utils.Array.GetRandom(pool)];
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
    soundFX.whistle();

    // Stadium mood tint — a stand-in for real per-stadium art (M5).
    if (this.stadium.rhythmVisual) {
      this.addRhythmPulse();
    } else {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, this.stadium.tintColor, 0.06);
    }

    this.crowd = new CrowdBand(this);

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
      .text(
        10,
        GAME_HEIGHT - 10,
        `Karakter: ${this.character.name}  |  Saha: ${this.stadium.name}  |  Rakip: ${this.opponentCharacter.name}`,
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#888888',
        },
      )
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

    // Right keeper defends against the human, so it represents the AI
    // team's identity — tied to the opponent's stats, not the human's own.
    this.keeper = new AIKeeper(
      this,
      'right',
      DEPTH_BAND_HEIGHT / 2,
      this.opponentCharacter.catchChance,
      this.opponentCharacter.cooldownSeconds,
      this.opponentCharacter.color,
    );
    // Left keeper automatically defends the human's own goal — there's no
    // human "tut" input for their own net yet (see docs/PROGRESS.md), so
    // this is effectively their team's own keeper, tied to their stats.
    this.leftKeeper = new AIKeeper(
      this,
      'left',
      DEPTH_BAND_HEIGHT / 2,
      this.character.catchChance,
      this.character.cooldownSeconds,
      0x2980b9,
    );
    this.opponent = new AIOpponent(this, this.opponentCharacter);

    this.input1 = new InputController(this, 90, GAME_HEIGHT - 90, GAME_WIDTH - 90, GAME_HEIGHT - 90);

    this.debugGraphics = this.add.graphics().setDepth(20000);

    // 3-segment power bar, bottom-left (CLAUDE.md section 5).
    const barX = 16;
    const barY = GAME_HEIGHT - 40;
    for (let i = 0; i < POWER_MAX_SEGMENTS; i += 1) {
      const box = this.add
        .rectangle(barX + i * 26, barY, 20, 14, 0x333333)
        .setStrokeStyle(1, 0xffffff)
        .setOrigin(0, 0.5)
        .setDepth(10000);
      this.powerSegmentBoxes.push(box);
    }

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
    if (move.x !== 0 || move.z !== 0) {
      this.lastAimX = move.x;
      this.lastAimZ = move.z;
    }
    const jumpPressed = this.input1.consumeJumpPressed();
    const dashPressed = this.input1.consumeDashPressed();
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed, dashPressed });
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false });
    this.keeper.update(delta, this.ball);
    this.leftKeeper.update(delta, this.ball);
    this.opponent.update(delta, this.ball);
    this.crowd.update(delta);

    this.rhythmClock = (this.rhythmClock + delta / 1000) % KONGO_RHYTHM_PERIOD_SECONDS;
    if (this.character.id === 'congo') {
      this.input1.setSpecialGlow(this.isInRhythmWindow());
    }

    // Character-ball contact: casual dribble nudge on simple touch, or a
    // deliberate Aksiyon shot (contextual: bizdeyse şut — CLAUDE.md section 4).
    const dx = this.ball.x - this.player.x;
    const dz = this.ball.z - this.player.z;
    const touching = Math.abs(dx) <= CONTACT_TOLERANCE_X && Math.abs(dz) <= CONTACT_TOLERANCE_Z;
    const actionPressed = this.input1.consumeActionPressed();

    if (touching && actionPressed) {
      const isPower = this.input1.isSpecialHeld() && this.player.spendPower(POWER_SHOT_SEGMENT_COST);
      const aimX = this.lastAimX !== 0 || this.lastAimZ !== 0 ? this.lastAimX : this.player.facingX;
      const aimZ = this.lastAimX !== 0 || this.lastAimZ !== 0 ? this.lastAimZ : this.player.facingZ;
      const speed = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier * (isPower ? SHOT_SPEED_POWER_MULTIPLIER : 1);
      this.ball.shoot(aimX, aimZ, speed, this.character.chaosTouch, isPower);
      soundFX.kick();
    } else if (touching) {
      this.ball.applyTouch(move.x, move.z, dx, dz, this.character.powerMultiplier, this.character.chaosTouch);
      if (!this.wasTouchingBall) soundFX.kick();
    }
    this.wasTouchingBall = touching;

    if (this.input1.consumeSpecialAlonePressed() && touching) {
      this.performSuperMove();
    }

    this.updatePowerBar();

    const scored = this.ball.update(delta);
    if (scored === 'left') {
      this.scoreRight += 1; // ball entered the left goal -> right side scores
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
      this.ball.reset(CENTER_X, DEPTH_BAND_HEIGHT / 2);
    } else if (scored === 'right') {
      this.scoreLeft += 1;
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
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

  /** Kongo's "doğru anda basınca power bonusu" — a short recurring sweet
   * spot window on an independent beat clock. */
  private isInRhythmWindow(): boolean {
    return this.rhythmClock < KONGO_RHYTHM_WINDOW_SECONDS;
  }

  /** 3-segment super move (M4, CLAUDE.md section 6) — only fires while
   * touching the ball, since all four characters' identities (a strike, a
   * controlled pass, an aerial wobble, a timed power shot) are ball
   * actions. Consumes the whole power bar. */
  private performSuperMove(): void {
    if (this.player.powerSegments < SUPER_MOVE_SEGMENT_COST) return;
    if (!this.player.spendPower(SUPER_MOVE_SEGMENT_COST)) return;

    const aimX = this.player.facingX;
    const aimZ = this.player.facingZ;
    const baseSpeed = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier;
    soundFX.kick();

    switch (this.character.id) {
      case 'brazil':
        // Capoeira ters vuruş: pure power along the facing direction.
        this.ball.shoot(aimX, aimZ, baseSpeed * SUPER_STRIKE_SPEED_MULTIPLIER, false, true, true);
        break;
      case 'argentina':
        // Gambeta: control over power — always aimed dead-center at goal.
        this.ball.shoot(
          RIGHT_GOAL_LINE_X - this.player.x,
          DEPTH_BAND_HEIGHT / 2 - this.player.z,
          baseSpeed * SUPER_CONTROL_SPEED_MULTIPLIER,
          false,
          true,
          true,
        );
        break;
      case 'kenya':
        // Poşet top: weaker shot, much wilder wobble than a normal chaos touch.
        this.ball.shoot(
          aimX,
          aimZ,
          baseSpeed * SUPER_CHAOS_SPEED_MULTIPLIER,
          true,
          true,
          true,
          SUPER_CHAOS_WOBBLE_MULTIPLIER,
        );
        break;
      case 'congo': {
        // Ritimli zamanlama: bonus speed when pressed on the beat.
        const onBeat = this.isInRhythmWindow();
        const speed = baseSpeed * SUPER_RHYTHM_SPEED_MULTIPLIER * (onBeat ? SUPER_RHYTHM_BONUS_MULTIPLIER : 1);
        this.ball.shoot(aimX, aimZ, speed, false, true, true);
        break;
      }
    }
  }

  private updatePowerBar(): void {
    const filled = Math.floor(this.player.powerSegments + 1e-6);
    this.powerSegmentBoxes.forEach((box, i) => {
      box.setFillStyle(i < filled ? 0xffe066 : 0x333333);
    });
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
    soundFX.whistle();
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
