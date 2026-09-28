import Phaser from 'phaser';
import { LEFT_GOAL_LINE_X, RIGHT_GOAL_LINE_X, GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX, CENTER_X, DEPTH_BAND_HEIGHT } from '../config/arena';
import {
  KEEPER_TRACK_SPEED,
  KEEPER_MOVE_DEADZONE,
  KEEPER_CATCH_RANGE_X,
  CATCH_BASE_CHANCE,
  CATCH_SPEED_REFERENCE,
} from '../config/keeper';
import { MOVE_SPEED } from '../config/movement';
import { SUPER_SHOT_CATCH_CHANCE_MULTIPLIER } from '../config/super';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';

export type KeeperSide = 'left' | 'right';

/**
 * AI goalkeeper defending either goal. There's no second human player yet,
 * so this is what makes the M3 shoot/hold matrix (CLAUDE.md section 5)
 * actually testable, and — since M5's AIOpponent (M5) now shoots at the
 * human's own goal too — what defends the human's side automatically.
 * See docs/PROGRESS.md.
 *
 * Implements the exact 2x2 matrix from CLAUDE.md section 5:
 *   Normal şut + Normal tutuş -> chance based on ball speed
 *   Power şut  + Normal tutuş -> tutamaz (ball continues in / deflects)
 *   Power şut  + Power tutuş  -> tutar
 *   Normal şut + Power tutuş  -> tutar, ama power boşa gider
 *
 * Karakterlerin 3-segment süper hareketi (M4) de isPower olarak işaretlenir,
 * artı ball.lastShotWasSuper: bir power tutuşa commit edilse bile süper
 * şutlar SUPER_SHOT_CATCH_CHANCE_MULTIPLIER ihtimaliyle hâlâ geçebiliyor
 * (CLAUDE.md section 5: "özel şuta karşı düşer").
 */
export class AIKeeper {
  readonly character: Character;
  private readonly side: KeeperSide;
  private readonly goalLineX: number;
  private readonly catchChance: number;
  private readonly cooldownSeconds: number;
  private cooldownRemaining = 0;
  private resolvedThisApproach = false;
  private holdTimer = 0;

  constructor(
    scene: Phaser.Scene,
    side: KeeperSide,
    startZ: number,
    catchChance: number,
    cooldownSeconds: number,
    color: number,
  ) {
    this.side = side;
    this.goalLineX = side === 'right' ? RIGHT_GOAL_LINE_X : LEFT_GOAL_LINE_X;
    this.character = new Character(
      scene,
      this.goalLineX,
      startZ,
      { minX: this.goalLineX - 4, maxX: this.goalLineX + 4 },
      color,
      KEEPER_TRACK_SPEED / MOVE_SPEED,
    );
    this.catchChance = catchChance;
    this.cooldownSeconds = cooldownSeconds;
  }

  /** True while the keeper is holding the ball (forcing its position each
   * frame) — other entities must not touch the ball during this window, or
   * they end up fighting the keeper's hold every other frame (visible as
   * the ball "getting stuck" between two characters). */
  get isHolding(): boolean {
    return this.holdTimer > 0;
  }

  update(delta: number, ball: Ball): void {
    const dt = delta / 1000;
    if (this.cooldownRemaining > 0) this.cooldownRemaining -= dt;

    if (this.holdTimer > 0) {
      this.holdTimer -= dt;
      ball.x = this.character.x + (this.side === 'right' ? -6 : 6);
      ball.z = this.character.z;
      ball.y = 0;
      ball.vx = 0;
      ball.vz = 0;
      ball.vy = 0;
      if (this.holdTimer <= 0) {
        // Distribute back out toward the center to keep play moving.
        ball.shoot(CENTER_X - ball.x, DEPTH_BAND_HEIGHT / 2 - ball.z, 260);
      }
    }

    // Track the ball's depth so the keeper covers the goal width.
    const targetZ = Phaser.Math.Clamp(ball.z, GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX);
    const dz = targetZ - this.character.z;
    const moveZ = Math.abs(dz) > KEEPER_MOVE_DEADZONE ? Math.sign(dz) : 0;
    this.character.update(delta, { moveX: 0, moveZ, jumpPressed: false, dashPressed: false });

    if (this.holdTimer > 0) return;

    const onTarget = ball.z >= GOAL_MOUTH_Z_MIN && ball.z <= GOAL_MOUTH_Z_MAX;
    // Only react to a deliberate shot, never a casual dribble touch — a
    // routine applyTouch() push easily beats a flat speed threshold (it
    // used to be treated as a "shot" and get snatched away mid-dribble).
    const approaching = ball.lastTouchWasShot && (this.side === 'right' ? ball.vx > 0 : ball.vx < 0);
    const nearGoal =
      this.side === 'right'
        ? ball.x >= this.goalLineX - KEEPER_CATCH_RANGE_X
        : ball.x <= this.goalLineX + KEEPER_CATCH_RANGE_X;
    const inRange = onTarget && nearGoal && approaching;
    if (!inRange) {
      this.resolvedThisApproach = false;
      return;
    }
    if (this.resolvedThisApproach) return;

    this.resolvedThisApproach = true;
    this.resolveCatch(ball);
  }

  private resolveCatch(ball: Ball): void {
    const isPowerShot = ball.lastShotWasPower;
    const canPowerCatch = this.cooldownRemaining <= 0;
    // AI: always dives with power tutuş against a power şut when available;
    // otherwise occasionally overcommits anyway (exercises the "normal şut,
    // power tutuş — boşa gider" cell too).
    const wantsPowerCatch = canPowerCatch && (isPowerShot || Math.random() < 0.3);

    let caught: boolean;

    if (wantsPowerCatch) {
      // Even a committed power tutuş can be beaten by a super shot —
      // CLAUDE.md: "tutma şansı... özel şuta karşı düşer" (section 5).
      caught = ball.lastShotWasSuper ? Math.random() < SUPER_SHOT_CATCH_CHANCE_MULTIPLIER : true;
      this.cooldownRemaining = this.cooldownSeconds;
    } else if (isPowerShot) {
      caught = false;
    } else {
      const speed = Math.hypot(ball.vx, ball.vz);
      const speedFactor = Phaser.Math.Clamp(1 - speed / CATCH_SPEED_REFERENCE, 0.1, 1);
      caught = Math.random() < CATCH_BASE_CHANCE * this.catchChance * speedFactor;
    }

    if (caught) {
      this.holdTimer = 0.8;
      soundFX.save();
    } else if (isPowerShot && Math.random() < 0.5) {
      // Half the time a failed power şut deflects instead of a clean pass-through.
      const deflectSign = this.side === 'right' ? -1 : 1;
      ball.vx = deflectSign * Math.abs(ball.vx) * 0.4;
      ball.vz = (Math.random() - 0.5) * 200;
    }

    ball.lastShotWasPower = false;
    ball.lastShotWasSuper = false;
  }

  destroy(): void {
    this.character.destroy();
  }
}
