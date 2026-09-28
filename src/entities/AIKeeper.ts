import Phaser from 'phaser';
import { RIGHT_GOAL_LINE_X, GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX, CENTER_X, DEPTH_BAND_HEIGHT } from '../config/arena';
import { KEEPER_CATCH_RANGE_X, CATCH_BASE_CHANCE, CATCH_SPEED_REFERENCE } from '../config/keeper';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';

/**
 * Minimal AI goalkeeper defending the right goal. There's no second human
 * player yet, so this is what makes the M3 shoot/hold matrix (CLAUDE.md
 * section 5) actually testable and the match feel like a game rather than
 * an open net — not meant to be a real opponent AI. See docs/PROGRESS.md.
 *
 * Implements the exact 2x2 matrix from CLAUDE.md section 5:
 *   Normal şut + Normal tutuş -> chance based on ball speed
 *   Power şut  + Normal tutuş -> tutamaz (ball continues in / deflects)
 *   Power şut  + Power tutuş  -> tutar
 *   Normal şut + Power tutuş  -> tutar, ama power boşa gider
 */
export class AIKeeper {
  readonly character: Character;
  private readonly catchChance: number;
  private readonly cooldownSeconds: number;
  private cooldownRemaining = 0;
  private resolvedThisApproach = false;
  private holdTimer = 0;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startZ: number,
    catchChance: number,
    cooldownSeconds: number,
    color: number,
  ) {
    this.character = new Character(
      scene,
      startX,
      startZ,
      { minX: RIGHT_GOAL_LINE_X - 4, maxX: RIGHT_GOAL_LINE_X + 4 },
      color,
    );
    this.catchChance = catchChance;
    this.cooldownSeconds = cooldownSeconds;
  }

  update(delta: number, ball: Ball): void {
    const dt = delta / 1000;
    if (this.cooldownRemaining > 0) this.cooldownRemaining -= dt;

    if (this.holdTimer > 0) {
      this.holdTimer -= dt;
      ball.x = this.character.x - 6;
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
    const moveZ = Math.abs(dz) > 2 ? Math.sign(dz) : 0;
    this.character.update(delta, { moveX: 0, moveZ, jumpPressed: false, dashPressed: false });

    if (this.holdTimer > 0) return;

    const onTarget = ball.z >= GOAL_MOUTH_Z_MIN && ball.z <= GOAL_MOUTH_Z_MAX;
    const inRange = onTarget && ball.x >= RIGHT_GOAL_LINE_X - KEEPER_CATCH_RANGE_X && ball.vx > 40;
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
      caught = true;
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
      ball.vx = -Math.abs(ball.vx) * 0.4;
      ball.vz = (Math.random() - 0.5) * 200;
    }

    ball.lastShotWasPower = false;
  }

  destroy(): void {
    this.character.destroy();
  }
}
