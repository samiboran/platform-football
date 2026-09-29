import Phaser from 'phaser';
import {
  CENTER_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_LINE_X,
  DEPTH_BAND_HEIGHT,
  CHARACTER_WIDTH,
  CONTACT_TOLERANCE_X,
  CONTACT_TOLERANCE_Z,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
} from '../config/arena';
import { SHOT_SPEED_NORMAL, SHOT_SPEED_POWER_MULTIPLIER, POWER_SHOT_SEGMENT_COST } from '../config/power';
import { KEEPER_CATCH_RANGE_X } from '../config/keeper';
import {
  OPPONENT_SHOT_COOLDOWN_SECONDS,
  OPPONENT_SHOT_CHANCE_PER_TOUCH,
  OPPONENT_POWER_SHOT_CHANCE,
  OPPONENT_AIM_WOBBLE,
  OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER,
  OPPONENT_MOVE_DEADZONE,
} from '../config/opponent';
import { resolveCatchAttempt } from '../systems/catchMatrix';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';
import type { CharacterDef } from '../config/characters';

/**
 * A computer-controlled outfield player defending/attacking the right half
 * — closes the "gerçek rakip" gap flagged in earlier PROGRESS notes (M3/M4
 * added a matrix and super moves that only the human could ever use).
 * Bounded to its own half exactly like the human player. Chases the ball
 * only when it's on its side, dribbles or shoots at the human's goal once
 * it's in contact — and defends its OWN goal too (no separate keeper
 * entity, see docs/PROGRESS.md): any real shot heading in gets an
 * automatic catch attempt via the shared M3 matrix. Doesn't use its
 * 3-segment super move — a deliberate scope cut, see docs/PROGRESS.md.
 */
export class AIOpponent {
  readonly character: Character;
  private readonly def: CharacterDef;
  private readonly homeX: number;
  private readonly homeZ: number;
  private shotCooldownRemaining = 0;
  private resolvedCatchThisApproach = false;

  constructor(scene: Phaser.Scene, def: CharacterDef) {
    this.def = def;
    const bounds = { minX: CENTER_LINE_X, maxX: RIGHT_GOAL_LINE_X - CHARACTER_WIDTH };
    this.homeX = (bounds.minX + bounds.maxX) / 2;
    this.homeZ = DEPTH_BAND_HEIGHT / 2;
    this.character = new Character(scene, this.homeX, this.homeZ, bounds, def.color, def.speedMultiplier, def.id);
  }

  update(delta: number, ball: Ball): void {
    const dt = delta / 1000;
    if (this.shotCooldownRemaining > 0) this.shotCooldownRemaining -= dt;

    // Chase the ball only within its own half; otherwise drift back home —
    // it's bounded the same way the human player is, so it couldn't
    // meaningfully chase across the line anyway.
    const ballInMyHalf = ball.x >= CENTER_LINE_X;
    const targetX = ballInMyHalf ? ball.x : this.homeX;
    const targetZ = ballInMyHalf ? ball.z : this.homeZ;
    const dx = targetX - this.character.x;
    const dz = targetZ - this.character.z;
    const moveX = Math.abs(dx) > OPPONENT_MOVE_DEADZONE ? Math.sign(dx) : 0;
    const moveZ = Math.abs(dz) > OPPONENT_MOVE_DEADZONE ? Math.sign(dz) : 0;
    this.character.update(delta, { moveX, moveZ, jumpPressed: false, dashPressed: false });

    // Defend its own goal: auto-attempt a catch on any real shot heading
    // in, same matrix the human uses via Aksiyon (CLAUDE.md section 5).
    const onTarget = ball.z >= GOAL_MOUTH_Z_MIN && ball.z <= GOAL_MOUTH_Z_MAX;
    const nearGoal = ball.x >= RIGHT_GOAL_LINE_X - KEEPER_CATCH_RANGE_X;
    const approaching = ball.lastTouchWasShot && ball.vx > 0;
    const catchable = onTarget && nearGoal && approaching;

    if (!catchable) {
      this.resolvedCatchThisApproach = false;
    } else if (!this.resolvedCatchThisApproach) {
      this.resolvedCatchThisApproach = true;
      // AI: always dives with power tutuş against a power şut when
      // available; otherwise occasionally overcommits anyway (exercises
      // the "normal şut, power tutuş — boşa gider" cell too).
      const wantsPowerCatch = this.character.canPowerCatch && (ball.lastShotWasPower || Math.random() < 0.3);
      const { caught } = resolveCatchAttempt(ball, 'right', this.def.catchChance, wantsPowerCatch);
      if (wantsPowerCatch) this.character.startCatchCooldown(this.def.cooldownSeconds);
      if (caught) soundFX.save();
      return;
    }

    const cdx = ball.x - this.character.x;
    const cdz = ball.z - this.character.z;
    const touching = Math.abs(cdx) <= CONTACT_TOLERANCE_X && Math.abs(cdz) <= CONTACT_TOLERANCE_Z;
    if (!touching) return;

    if (this.shotCooldownRemaining > 0 || Math.random() > OPPONENT_SHOT_CHANCE_PER_TOUCH) {
      // Not ready to shoot yet — just dribble it forward like the human's
      // own casual contact (M2's applyTouch).
      ball.applyTouch(moveX, moveZ, cdx, cdz, this.def.powerMultiplier, this.def.chaosTouch);
      return;
    }

    this.shotCooldownRemaining = OPPONENT_SHOT_COOLDOWN_SECONDS;
    const isPower = Math.random() < OPPONENT_POWER_SHOT_CHANCE && this.character.spendPower(POWER_SHOT_SEGMENT_COST);
    // Aim somewhere inside the goal mouth, not always dead-center — keeps
    // it beatable rather than laser-guided (CLAUDE.md: no auto-aim).
    const aimZ = Phaser.Math.Linear(GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX, Math.random());
    const dirX = LEFT_GOAL_LINE_X - this.character.x;
    const dirZ = aimZ - this.character.z;
    const speed = SHOT_SPEED_NORMAL * this.def.shotPowerMultiplier * (isPower ? SHOT_SPEED_POWER_MULTIPLIER : 1);
    const wobble = OPPONENT_AIM_WOBBLE * (this.def.chaosTouch ? OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER : 1);
    ball.shoot(dirX, dirZ, speed, true, isPower, false, wobble);
    soundFX.kick();
  }

  destroy(): void {
    this.character.destroy();
  }
}
