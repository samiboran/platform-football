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
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  projectToScreen,
} from '../config/arena';
import { MATCH_DURATION_SECONDS, GOAL_RESET_FREEZE_SECONDS } from '../config/match';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, type CharacterDef } from '../config/characters';
import { STADIUMS, type StadiumId } from '../config/stadiums';
import { KEEPER_CATCH_RANGE_X } from '../config/keeper';
import { computeDribbleTarget } from '../systems/dribbleControl';
import {
  POWER_MAX_SEGMENTS,
  SHOT_SPEED_NORMAL,
  SHOT_SPEED_POWER_MULTIPLIER,
  POWER_SHOT_SEGMENT_COST,
  POWER_CATCH_SEGMENT_COST,
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
import { resolveCatchAttempt } from '../systems/catchMatrix';
import { Character } from '../entities/Character';
import { Ball } from '../entities/Ball';
import { AIOpponent } from '../entities/AIOpponent';

interface MatchData {
  characterId?: CharacterId;
  stadiumId?: StadiumId;
}

/**
 * Ball physics, character-ball contact, goal detection, scoreboard, match
 * timer (M2), the M3 Aksiyon/Dash/power system, M4's per-character super
 * moves, and (M5) a real AI opponent (AIOpponent) on the right half.
 * There's no separate goalkeeper entity — each side defends its own goal
 * itself via the contextual Aksiyon "tut" (catch) when not touching the
 * ball, exactly like CLAUDE.md's original design (an earlier dedicated
 * AIKeeper was a stopgap before AIOpponent existed and confused players by
 * standing in the goal doing nothing — see docs/PROGRESS.md).
 */
export class MatchScene extends Phaser.Scene {
  private input1!: InputController;
  private player!: Character;
  /** Static same-half reference character — debug aid (F1) proving the
   * depth-sort math, not a real gameplay entity. */
  private depthSortRef!: Character;
  private ball!: Ball;
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
  private wasControllingBall = false;
  /** Counts down after a goal — controls locked, nothing moves, until it
   * hits 0 (CLAUDE.md: "~2 sn kontroller kilitli"). */
  private kickoffFreezeRemaining = 0;

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

    drawPitch(this, this.stadium);
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
        GAME_HEIGHT - 20,
        `Karakter: ${this.character.name}  |  Saha: ${this.stadium.name}  |  Rakip: ${this.opponentCharacter.name}`,
        {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#888888',
        },
      )
      .setOrigin(0, 1);
    // Klavye eşlemesi ekranda görünsün — tuşlar dokunmatik tuşlarla aynı
    // sırada değil (Zıpla=Z, Aksiyon=Space, Dash=X, Özel=C) ve bilmeyen
    // biri klavyede bunları bulamaz.
    this.add
      .text(10, GAME_HEIGHT - 10, `Klavye: Z=Zıpla  Space=Aksiyon  X=Dash  C=Özel`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#666666',
      })
      .setOrigin(0, 1);
    this.updateHud();

    const leftHalfX = (LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2;
    const bounds = { minX: LEFT_GOAL_LINE_X, maxX: CENTER_LINE_X };

    this.player = new Character(
      this,
      leftHalfX,
      DEPTH_BAND_HEIGHT / 2,
      bounds,
      this.character.color,
      this.character.speedMultiplier,
      this.character.id,
    );
    this.depthSortRef = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT * 0.85, bounds, 0xe74c3c);
    this.depthSortRef.setVisible(false);

    this.ball = new Ball(this, CENTER_X, DEPTH_BAND_HEIGHT / 2, 40, {
      bounceMultiplier: this.stadium.bounceMultiplier,
      frictionMultiplier: this.stadium.frictionMultiplier,
      windX: this.stadium.windX,
      windZ: this.stadium.windZ,
    });

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

    if (this.kickoffFreezeRemaining > 0) {
      // Controls locked after a goal (CLAUDE.md: "~2 sn kontroller
      // kilitli") — nothing moves, nobody can touch/shoot/catch, the clock
      // doesn't run down either. Crowd/HUD keep going, purely cosmetic.
      this.kickoffFreezeRemaining -= delta / 1000;
      this.crowd.update(delta);
      return;
    }

    const move = this.input1.getMoveVector();
    if (move.x !== 0 || move.z !== 0) {
      this.lastAimX = move.x;
      this.lastAimZ = move.z;
    }
    const jumpPressed = this.input1.consumeJumpPressed();
    const dashPressed = this.input1.consumeDashPressed();
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed, dashPressed });
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false });
    this.opponent.update(delta, this.ball);
    this.crowd.update(delta);

    this.rhythmClock = (this.rhythmClock + delta / 1000) % KONGO_RHYTHM_PERIOD_SECONDS;
    if (this.character.id === 'congo') {
      this.input1.setSpecialGlow(this.isInRhythmWindow());
    }

    // Ball-dribble control (force/lerp toward a dribble point ahead of the
    // player, never a position lock — see Ball.updateControl()). Called
    // unconditionally every frame; it's a no-op when the ball's too far
    // from the dribble point. Distance scales with the player's real
    // current speed (systems/dribbleControl.ts).
    const playerSpeed = Math.hypot(this.player.velX, this.player.velZ);
    const dribbleTarget = computeDribbleTarget(
      this.player.x,
      this.player.z,
      this.player.facingX,
      this.player.facingZ,
      playerSpeed,
    );
    this.ball.updateControl(
      'left',
      dribbleTarget.x,
      dribbleTarget.z,
      this.player.facingX,
      this.player.facingZ,
      this.player.isDashing,
      this.player.y > 0,
      delta / 1000,
      this.character.chaosTouch,
    );

    const controllingBall = this.ball.controller === 'left';
    const actionPressed = this.input1.consumeActionPressed();

    if (controllingBall && actionPressed) {
      const isPower = this.input1.isSpecialHeld() && this.player.spendPower(POWER_SHOT_SEGMENT_COST);
      const aimX = this.lastAimX !== 0 || this.lastAimZ !== 0 ? this.lastAimX : this.player.facingX;
      const aimZ = this.lastAimX !== 0 || this.lastAimZ !== 0 ? this.lastAimZ : this.player.facingZ;
      const speed = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier * (isPower ? SHOT_SPEED_POWER_MULTIPLIER : 1);
      this.ball.shoot(aimX, aimZ, speed, this.character.chaosTouch, isPower);
      soundFX.kick();
    } else if (!controllingBall && actionPressed) {
      // Top bizde değilse tut (bağlamsal Aksiyon, CLAUDE.md section 4) —
      // only meaningful when a real shot is actually incoming on our own
      // goal; otherwise this is a no-op (nothing to catch).
      const onTarget = this.ball.z >= GOAL_MOUTH_Z_MIN && this.ball.z <= GOAL_MOUTH_Z_MAX;
      const nearGoal = this.ball.x <= LEFT_GOAL_LINE_X + KEEPER_CATCH_RANGE_X;
      const approaching = this.ball.lastTouchWasShot && this.ball.vx < 0;
      if (onTarget && nearGoal && approaching) {
        const wantsPowerCatch =
          this.input1.isSpecialHeld() && this.player.canPowerCatch && this.player.spendPower(POWER_CATCH_SEGMENT_COST);
        const { caught } = resolveCatchAttempt(this.ball, 'left', this.character.catchChance, wantsPowerCatch);
        if (wantsPowerCatch) this.player.startCatchCooldown(this.character.cooldownSeconds);
        if (caught) soundFX.save();
      }
    }
    if (controllingBall && !this.wasControllingBall) soundFX.kick();
    this.wasControllingBall = controllingBall;

    if (this.input1.consumeSpecialReleased() && controllingBall) {
      this.performSuperMove();
    }

    this.updatePowerBar();

    const scored = this.ball.update(delta);
    if (scored === 'left') {
      // Ball entered the left goal -> right side scores -> LEFT side
      // conceded, so kickoff goes to the center of the LEFT half
      // (CLAUDE.md: "gol yiyene, kendi yarısının ortasında verilsin").
      this.scoreRight += 1;
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
      this.ball.reset((LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2, DEPTH_BAND_HEIGHT / 2);
      this.kickoffFreezeRemaining = GOAL_RESET_FREEZE_SECONDS;
    } else if (scored === 'right') {
      this.scoreLeft += 1;
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
      this.ball.reset((CENTER_LINE_X + RIGHT_GOAL_LINE_X) / 2, DEPTH_BAND_HEIGHT / 2);
      this.kickoffFreezeRemaining = GOAL_RESET_FREEZE_SECONDS;
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
