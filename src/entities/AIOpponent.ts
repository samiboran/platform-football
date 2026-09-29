import Phaser from 'phaser';
import {
  CENTER_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_LINE_X,
  DEPTH_BAND_HEIGHT,
  CHARACTER_WIDTH,
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
import { computeDribbleTarget } from '../systems/dribbleControl';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';
import type { CharacterDef } from '../config/characters';

/**
 * A computer-controlled outfield player defending/attacking the right half
 * — closes the "gerçek rakip" gap flagged in earlier PROGRESS notes (M3/M4
 * added a matrix and super moves that only the human could ever use).
 * Bounded to its own half exactly like the human player. Chases the ball
 * only when it's on its side, dribbles (force-based control, same rules as
 * the human — see systems/dribbleControl.ts) or shoots at the human's goal
 * once it has control, and defends its OWN goal too (no separate keeper
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

    // Ball-dribble control — force/lerp toward a dribble point ahead of the
    // AI, exactly the same rules as the human (systems/dribbleControl.ts).
    const opponentSpeed = Math.hypot(this.character.velX, this.character.velZ);
    const dribbleTarget = computeDribbleTarget(
      this.character.x,
      this.character.z,
      this.character.facingX,
      this.character.facingZ,
      opponentSpeed,
    );
    ball.updateControl(
      'right',
      dribbleTarget.x,
      dribbleTarget.z,
      this.character.facingX,
      this.character.facingZ,
      this.character.isDashing,
      this.character.y > 0,
      dt,
      this.def.chaosTouch,
    );

    if (ball.controller !== 'right') return;

    const holdExpired = ball.holdTimeRemaining <= 0;
    const readyToShoot = this.shotCooldownRemaining <= 0 && Math.random() < OPPONENT_SHOT_CHANCE_PER_TOUCH;

    if (readyToShoot) {
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
    } else if (holdExpired) {
      // 6 saniye doldu, şut kararı da gelmedi — Ball.update() zaten kontrolü
      // bırakır, burada ekstra bir şey yapmaya gerek yok (top zaten dribble
      // kontrol hızıyla ileri gidiyordu, sadece bırakılıyor).
      return;
    }
  }

  destroy(): void {
    this.character.destroy();
  }
}
