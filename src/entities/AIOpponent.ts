import Phaser from 'phaser';
import {
  CENTER_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_LINE_X,
  DEPTH_BAND_HEIGHT,
  DEPTH_MIN,
  DEPTH_MAX,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
} from '../config/arena';
import { BALL_GRAVITY, BALL_TRAP_MAX_HEIGHT } from '../config/ball';
import {
  OPPONENT_SHOT_COOLDOWN_SECONDS,
  OPPONENT_SHOT_CHANCE_PER_TOUCH,
  OPPONENT_POWER_SHOT_CHANCE,
  OPPONENT_POWER_SHOT_CHANCE_FULL_BAR,
  OPPONENT_CHARGE_SECONDS_MIN,
  OPPONENT_CHARGE_SECONDS_MAX,
  OPPONENT_LOB_CHANCE,
  OPPONENT_LOB_CHANCE_RIVAL_ADVANCED,
  OPPONENT_LOB_RIVAL_ADVANCED_X,
  OPPONENT_INTERCEPT_Z_ERROR,
  OPPONENT_JUMP_LEAD_SECONDS,
  OPPONENT_JUMP_MIN_BALL_HEIGHT,
  OPPONENT_JUMP_MAX_BALL_HEIGHT,
  OPPONENT_JUMP_LANE_Z,
  OPPONENT_AIM_WOBBLE,
  OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER,
  OPPONENT_MOVE_DEADZONE,
  OPPONENT_TRACKING_LERP_SPEED,
  OPPONENT_CATCH_REACTION_SECONDS,
} from '../config/opponent';
import { POWER_MAX_SEGMENTS } from '../config/power';
import { applyCatchAttempt, isCatchableShot } from '../systems/catchMatrix';
import { canStrikeAerial } from '../systems/aerialStrike';
import { computeDribbleTarget } from '../systems/dribbleControl';
import { strikeBall, type ShotKind } from '../systems/shotKinds';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';
import type { CharacterDef } from '../config/characters';

/** Minimal view of the human player the AI reads for shot choice. */
export interface RivalView {
  x: number;
}

/**
 * Computer-controlled player on the right half, bounded exactly like the
 * human. Plays by the same M6 rules:
 *  - shots go through the shared systems/shotKinds.ts: ground shots, lobs,
 *    and hold-to-charge power shots/lobs that spend the whole bar, with a
 *    visible charge-up aura before release (a tell the human can read);
 *  - jumps for high balls and volleys them (meets the human's lobs);
 *  - defends by stepping onto the shot's line after a reaction delay and
 *    holding tut; the clash itself is the shared difference table
 *    (systems/catchMatrix.ts).
 * Doesn't use its 3-segment super move (deliberate scope cut).
 */
export class AIOpponent {
  readonly character: Character;
  private readonly def: CharacterDef;
  private readonly homeX: number;
  private readonly homeZ: number;
  private shotCooldownRemaining = 0;
  /** Reaction countdown to an incoming shot; once it reaches 0 the AI is
   * "holding tut" until that shot is resolved or stops being a threat. */
  private shotReactionRemaining: number | null = null;
  private interceptZError = 0;
  /** Power-shot charge in progress: seconds left before release, or null. */
  private chargeRemaining: number | null = null;
  private chargeKind: ShotKind = 'ground';
  /** The AI's "perceived" ball position — lags the real one
   * (OPPONENT_TRACKING_LERP_SPEED) so chasing doesn't look omniscient. */
  private trackedBallX: number;
  private trackedBallZ: number;

  constructor(scene: Phaser.Scene, def: CharacterDef) {
    this.def = def;
    // Same reach as the human (whose bounds run to its own goal line): a
    // character-width margin here left a ball resting against the AI's end
    // wall out of control range forever — the AI stood still, game stuck.
    const bounds = { minX: CENTER_LINE_X, maxX: RIGHT_GOAL_LINE_X };
    this.homeX = (bounds.minX + bounds.maxX) / 2;
    this.homeZ = DEPTH_BAND_HEIGHT / 2;
    this.trackedBallX = this.homeX;
    this.trackedBallZ = this.homeZ;
    this.character = new Character(scene, this.homeX, this.homeZ, bounds, def.color, def.speedMultiplier, def.id);
  }

  update(delta: number, ball: Ball, rival?: RivalView): void {
    const dt = delta / 1000;
    if (this.shotCooldownRemaining > 0) this.shotCooldownRemaining -= dt;

    this.trackedBallX = Phaser.Math.Linear(this.trackedBallX, ball.x, OPPONENT_TRACKING_LERP_SPEED * dt);
    this.trackedBallZ = Phaser.Math.Linear(this.trackedBallZ, ball.z, OPPONENT_TRACKING_LERP_SPEED * dt);

    // --- Incoming shot: reaction delay, then step onto its line + tut.
    const shotIncoming = ball.lastTouchWasShot && !ball.clashResolved && ball.controller === null && ball.vx > 0;
    if (!shotIncoming) {
      this.shotReactionRemaining = null;
    } else if (this.shotReactionRemaining === null) {
      this.shotReactionRemaining = OPPONENT_CATCH_REACTION_SECONDS;
      this.interceptZError = (Math.random() * 2 - 1) * OPPONENT_INTERCEPT_Z_ERROR;
    } else if (this.shotReactionRemaining > 0) {
      this.shotReactionRemaining -= dt;
    }
    const holdingTut = this.shotReactionRemaining !== null && this.shotReactionRemaining <= 0;

    // --- Movement target.
    const target = this.chooseTarget(ball, holdingTut);
    const dx = target.x - this.character.x;
    const dz = target.z - this.character.z;
    const moveX = Math.abs(dx) > OPPONENT_MOVE_DEADZONE ? Math.sign(dx) : 0;
    const moveZ = Math.abs(dz) > OPPONENT_MOVE_DEADZONE ? Math.sign(dz) : 0;
    this.character.update(delta, { moveX, moveZ, jumpPressed: this.wantsJump(ball), dashPressed: false });

    if (holdingTut && isCatchableShot(ball, 'right', this.character)) {
      const { outcome } = applyCatchAttempt(ball, 'right', this.character);
      if (outcome === 'hold' || outcome === 'spill') soundFX.save();
      this.shotReactionRemaining = null;
      return;
    }

    // --- Header / volley on a high free ball.
    if (canStrikeAerial(ball, ball.controller !== null, this.character)) {
      const aim = this.aimAtGoal();
      strikeBall(ball, 'volley', aim.x, aim.z, {
        level: 0,
        shotPowerMultiplier: this.def.shotPowerMultiplier,
        chaos: true,
        wobble: this.wobble(),
      });
      this.character.playKick(aim.x);
      soundFX.kick();
      return;
    }

    // --- Dribble control: same force-based rules as the human.
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
      this.character.moveVelX,
      this.character.moveVelZ,
    );

    if (ball.controller !== 'right') {
      if (this.chargeRemaining !== null) {
        // Lost the ball mid-charge — cancel, nothing spent.
        this.chargeRemaining = null;
        ball.setChargeLevel(0);
      }
      return;
    }

    // --- Power charge in progress: aura grows to the level it will spend.
    if (this.chargeRemaining !== null) {
      ball.setChargeLevel(this.energyLevel());
      this.chargeRemaining -= dt;
      if (this.chargeRemaining <= 0) {
        this.chargeRemaining = null;
        ball.setChargeLevel(0);
        const level = this.energyLevel();
        this.fire(ball, this.chargeKind, level > 0 && this.character.spendPower(level) ? level : 0);
      }
      return;
    }

    if (this.shotCooldownRemaining > 0 || Math.random() >= OPPONENT_SHOT_CHANCE_PER_TOUCH) return;
    this.shotCooldownRemaining = OPPONENT_SHOT_COOLDOWN_SECONDS;

    const rivalAdvanced = rival !== undefined && rival.x - LEFT_GOAL_LINE_X > OPPONENT_LOB_RIVAL_ADVANCED_X;
    const kind: ShotKind =
      Math.random() < (rivalAdvanced ? OPPONENT_LOB_CHANCE_RIVAL_ADVANCED : OPPONENT_LOB_CHANCE) ? 'lob' : 'ground';
    const energy = this.energyLevel();
    const powerChance = energy >= POWER_MAX_SEGMENTS ? OPPONENT_POWER_SHOT_CHANCE_FULL_BAR : OPPONENT_POWER_SHOT_CHANCE;
    if (energy > 0 && Math.random() < powerChance) {
      this.chargeKind = kind;
      this.chargeRemaining = Phaser.Math.FloatBetween(OPPONENT_CHARGE_SECONDS_MIN, OPPONENT_CHARGE_SECONDS_MAX);
      ball.setChargeLevel(energy);
      return;
    }
    this.fire(ball, kind, 0);
  }

  /** Where to run this frame. */
  private chooseTarget(ball: Ball, holdingTut: boolean): { x: number; z: number } {
    const c = this.character;
    if (holdingTut) {
      // Stand on the shot's line where it will cross our current x.
      const t = ball.vx > 1 ? Math.max(0, (c.x - ball.x) / ball.vx) : 0;
      const z = Phaser.Math.Clamp(ball.z + ball.vz * t + this.interceptZError, DEPTH_MIN, DEPTH_MAX);
      return { x: c.x, z };
    }
    const landing = ball.predictLanding();
    if (landing && landing.x >= CENTER_LINE_X) {
      // High free ball dropping into our half (a lob): get under it.
      return { x: Phaser.Math.Clamp(landing.x, CENTER_LINE_X, RIGHT_GOAL_LINE_X), z: landing.z };
    }
    if (ball.x >= CENTER_LINE_X) return { x: this.trackedBallX, z: this.trackedBallZ };
    // Ball in the human's half: wait at home, shading toward the ball's
    // depth inside our goal mouth.
    return { x: this.homeX, z: Phaser.Math.Clamp(this.trackedBallZ, GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX) };
  }

  /** Jump when a high free ball will arrive within reach shortly. */
  private wantsJump(ball: Ball): boolean {
    const c = this.character;
    if (c.y > 0 || ball.controller !== null || ball.y <= BALL_TRAP_MAX_HEIGHT) return false;
    if (Math.abs(ball.z - c.z) > OPPONENT_JUMP_LANE_Z) return false;
    const dx = c.x - ball.x;
    const closing = Math.abs(ball.vx) > 1 ? dx / ball.vx : Math.abs(dx) < OPPONENT_MOVE_DEADZONE ? 0 : -1;
    if (closing < 0 || closing > OPPONENT_JUMP_LEAD_SECONDS) return false;
    const heightThen = ball.y + ball.vy * closing - 0.5 * BALL_GRAVITY * closing * closing;
    return heightThen >= OPPONENT_JUMP_MIN_BALL_HEIGHT && heightThen <= OPPONENT_JUMP_MAX_BALL_HEIGHT;
  }

  private fire(ball: Ball, kind: ShotKind, level: number): void {
    const aim = this.aimAtGoal();
    strikeBall(ball, kind, aim.x, aim.z, {
      level,
      shotPowerMultiplier: this.def.shotPowerMultiplier,
      chaos: true,
      wobble: this.wobble(),
    });
    this.character.playKick(aim.x);
    soundFX.kick();
  }

  /** World direction at a random point inside the human's goal mouth — no
   * laser aim (CLAUDE.md: no auto-aim; the AI must be beatable). */
  private aimAtGoal(): { x: number; z: number } {
    const aimZ = Phaser.Math.Linear(GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX, Math.random());
    return { x: LEFT_GOAL_LINE_X - this.character.x, z: aimZ - this.character.z };
  }

  private wobble(): number {
    return OPPONENT_AIM_WOBBLE * (this.def.chaosTouch ? OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER : 1);
  }

  private energyLevel(): number {
    return Math.floor(this.character.powerSegments + 1e-6);
  }

  destroy(): void {
    this.character.destroy();
  }
}
