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
  OPPONENT_CHARGE_SECONDS_MIN,
  OPPONENT_CHARGE_SECONDS_MAX,
  OPPONENT_LOB_CHANCE,
  OPPONENT_LOB_CHANCE_RIVAL_ADVANCED,
  OPPONENT_LOB_RIVAL_ADVANCED_X,
  OPPONENT_JUMP_LEAD_SECONDS,
  OPPONENT_JUMP_MIN_BALL_HEIGHT,
  OPPONENT_JUMP_MAX_BALL_HEIGHT,
  OPPONENT_JUMP_LANE_Z,
  OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER,
  OPPONENT_MOVE_DEADZONE,
  OPPONENT_BALL_CHASE_DEADZONE,
  OPPONENT_AERIAL_RESTRIKE_SECONDS,
} from '../config/opponent';
import {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  AI_FALSO_DASH_DELAY_SECONDS,
  type DifficultyDef,
} from '../config/difficulty';
import { SUPER_MOVE_SEGMENT_COST } from '../config/super';
import {
  BICYCLE_SPEED_MULTIPLIER,
  CURVE_ACCEL,
  DASH_ENERGY_COST,
  SHOT_SPEED_NORMAL,
  SHOT_SPEED_BY_POWER_LEVEL,
} from '../config/power';
import { emitImpact } from '../systems/impactFeel';
import { POWER_MAX_SEGMENTS } from '../config/power';
import { applyCatchAttempt, isCatchableShot } from '../systems/catchMatrix';
import { canStrikeAerial } from '../systems/aerialStrike';
import { computeDribbleTarget } from '../systems/dribbleControl';
import { strikeBall, curvedAim, type ShotKind } from '../systems/shotKinds';
import { Character } from './Character';
import { Ball } from './Ball';
import { soundFX } from '../systems/SoundFX';
import { BICYCLE_TITLE } from '../config/feel';
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
 *  - M9.2: plays at a difficulty level (config/difficulty.ts) and uses the
 *    air combos — air-dash falso volleys and the rövaşata (airborne super).
 * Doesn't use its ground 3-segment super move (deliberate scope cut).
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
  /** Rolled per incoming shot: this tut will be a perfect parry. */
  private perfectParry = false;
  /** Called when the AI lands a perfect parry (scene flash). */
  onPerfectParry?: () => void;
  /** Called right before the AI releases a power shot (portrait cut-in);
   * caption is set for the rövaşata. */
  onPowerShot?: (level: number, caption?: string) => void;
  /** Called when the AI strikes a falso (curving) volley. */
  onFalso?: () => void;
  private readonly diff: DifficultyDef;
  /** Air combo plan for the current jump: air-dash for a falso, and the
   * time spent airborne so far. */
  private plannedFalso = false;
  private airTime = 0;
  /** Rövaşata decision rolled once per airborne strike chance. */
  private bicycleRolled: boolean | null = null;
  /** Seconds before the AI may strike a high ball again. */
  private aerialLockout = 0;
  /** Power-shot charge in progress: seconds left before release, or null. */
  private chargeRemaining: number | null = null;
  private chargeKind: ShotKind = 'ground';
  /** The AI's "perceived" ball position — lags the real one
   * (difficulty trackingLerpSpeed) so chasing doesn't look omniscient. */
  private trackedBallX: number;
  private trackedBallZ: number;

  constructor(
    scene: Phaser.Scene,
    def: CharacterDef,
    pitchSpeedMultiplier = 1,
    difficulty: DifficultyDef = DIFFICULTIES[DEFAULT_DIFFICULTY],
  ) {
    this.def = def;
    this.diff = difficulty;
    // Same reach as the human (whose bounds run to its own goal line): a
    // character-width margin here left a ball resting against the AI's end
    // wall out of control range forever — the AI stood still, game stuck.
    const bounds = { minX: CENTER_LINE_X, maxX: RIGHT_GOAL_LINE_X };
    this.homeX = (bounds.minX + bounds.maxX) / 2;
    this.homeZ = DEPTH_BAND_HEIGHT / 2;
    this.trackedBallX = this.homeX;
    this.trackedBallZ = this.homeZ;
    this.character = new Character(scene, this.homeX, this.homeZ, bounds, def.color, def.speedMultiplier * pitchSpeedMultiplier * difficulty.speedMultiplier, def.id);
    this.character.bodyStrength = def.powerMultiplier;
  }

  update(delta: number, ball: Ball, rival?: RivalView): void {
    const dt = delta / 1000;
    if (this.shotCooldownRemaining > 0) this.shotCooldownRemaining -= dt;
    if (this.aerialLockout > 0) this.aerialLockout -= dt;

    this.trackedBallX = Phaser.Math.Linear(this.trackedBallX, ball.x, this.diff.trackingLerpSpeed * dt);
    this.trackedBallZ = Phaser.Math.Linear(this.trackedBallZ, ball.z, this.diff.trackingLerpSpeed * dt);

    // --- Incoming shot: reaction delay, then step onto its line + tut.
    const shotIncoming = ball.lastTouchWasShot && !ball.clashResolved && ball.controller === null && ball.vx > 0;
    if (!shotIncoming) {
      this.shotReactionRemaining = null;
    } else if (this.shotReactionRemaining === null) {
      this.shotReactionRemaining = this.diff.catchReactionSeconds;
      this.interceptZError = (Math.random() * 2 - 1) * this.diff.interceptZError;
      this.perfectParry = Math.random() < this.diff.perfectParryChance;
    } else if (this.shotReactionRemaining > 0) {
      this.shotReactionRemaining -= dt;
    }
    const stunned = this.character.isStunned;
    const holdingTut = !stunned && this.shotReactionRemaining !== null && this.shotReactionRemaining <= 0;

    // --- Movement target.
    const target = this.chooseTarget(ball, holdingTut);
    const dx = target.x - this.character.x;
    const dz = target.z - this.character.z;
    const chasingLooseBall = !holdingTut && ball.controller === null && ball.x >= CENTER_LINE_X;
    const deadzone = chasingLooseBall ? OPPONENT_BALL_CHASE_DEADZONE : OPPONENT_MOVE_DEADZONE;
    const moveX = Math.abs(dx) > deadzone ? Math.sign(dx) : 0;
    const moveZ = Math.abs(dz) > deadzone ? Math.sign(dz) : 0;
    const jump = !stunned && this.wantsJump(ball);
    if (jump) {
      this.plannedFalso =
        this.diff.falsoChance > 0 &&
        this.character.powerSegments >= DASH_ENERGY_COST &&
        Math.random() < this.diff.falsoChance;
      this.airTime = 0;
    }
    // Falso set-up: shortly after take-off, air-dash up/down toward the
    // ball's depth side (Character turns that into airCurveSide).
    let dash = false;
    let dashX = moveX;
    let dashZ = moveZ;
    if (this.character.y > 0) {
      this.airTime += dt;
      if (this.plannedFalso && (ball.controller !== null || ball.y <= BALL_TRAP_MAX_HEIGHT)) {
        // The high ball is gone — don't burn energy on a pointless dash.
        this.plannedFalso = false;
      } else if (this.plannedFalso && this.airTime >= AI_FALSO_DASH_DELAY_SECONDS) {
        this.plannedFalso = false;
        dash = true;
        dashX = -1;
        dashZ = Math.abs(ball.z - this.character.z) > 2 ? Math.sign(ball.z - this.character.z) : Math.random() < 0.5 ? -1 : 1;
      }
    } else if (!jump) {
      this.plannedFalso = false;
      this.bicycleRolled = null;
    }
    this.character.update(delta, {
      moveX: dash ? dashX : moveX,
      moveZ: dash ? dashZ : moveZ,
      jumpPressed: jump,
      dashPressed: dash,
    });

    if (holdingTut && isCatchableShot(ball, 'right', this.character)) {
      const { outcome, perfect } = applyCatchAttempt(ball, 'right', this.character, this.perfectParry);
      if (outcome === 'hold' || outcome === 'spill') soundFX.save();
      if (perfect) this.onPerfectParry?.();
      this.shotReactionRemaining = null;
      return;
    }

    // --- Header / volley on a high free ball.
    if (!stunned && this.aerialLockout <= 0 && canStrikeAerial(ball, ball.controller !== null, this.character)) {
      // Falso planned: hold the strike until the air dash has gone out.
      if (this.plannedFalso && this.character.y > 0) return;
      this.aerialLockout = OPPONENT_AERIAL_RESTRIKE_SECONDS;
      if (this.character.y > 0 && this.bicycleRolled === null) {
        this.bicycleRolled =
          this.character.powerSegments >= SUPER_MOVE_SEGMENT_COST && Math.random() < this.diff.bicycleChance;
      }
      if (this.bicycleRolled) {
        this.bicycleRolled = false;
        this.performBicycleKick(ball);
        return;
      }
      const aim = this.aimAtGoal();
      const curve = this.character.y > 0 ? this.character.airCurveSide : 0;
      this.character.airCurveSide = 0;
      if (curve !== 0) this.onFalso?.();
      strikeBall(ball, 'volley', aim.x, aim.z, {
        level: 0,
        curve,
        shotPowerMultiplier: this.def.shotPowerMultiplier,
        element: this.def.element,
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
      this.character.x,
      this.character.z,
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

    if (stunned) return;
    if (this.shotCooldownRemaining > 0 || Math.random() >= this.diff.shotChancePerTouch) return;
    this.shotCooldownRemaining = this.diff.shotCooldownSeconds;

    const rivalAdvanced = rival !== undefined && rival.x - LEFT_GOAL_LINE_X > OPPONENT_LOB_RIVAL_ADVANCED_X;
    const kind: ShotKind =
      Math.random() < (rivalAdvanced ? OPPONENT_LOB_CHANCE_RIVAL_ADVANCED : OPPONENT_LOB_CHANCE) ? 'lob' : 'ground';
    const energy = this.energyLevel();
    const powerChance = energy >= POWER_MAX_SEGMENTS ? this.diff.powerShotChanceFullBar : this.diff.powerShotChance;
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
    if (level > 0) this.onPowerShot?.(level);
    const aim = this.aimAtGoal();
    strikeBall(ball, kind, aim.x, aim.z, {
      level,
      shotPowerMultiplier: this.def.shotPowerMultiplier,
      element: this.def.element,
      chaos: true,
      wobble: this.wobble(),
    });
    this.character.playKick(aim.x);
    soundFX.kick();
  }

  /** Rövaşata (same rules as the human's, MatchScene.performBicycleKick):
   * full bar, level-3 shot of our element, curving if we air-dashed. */
  private performBicycleKick(ball: Ball): void {
    if (!this.character.spendPower(SUPER_MOVE_SEGMENT_COST)) return;
    const curve = this.character.airCurveSide;
    this.character.airCurveSide = 0;
    const goal = this.aimAtGoal();
    const aim = curvedAim(goal.x, goal.z, curve);
    const level = SHOT_SPEED_BY_POWER_LEVEL.length - 1;
    const speed = SHOT_SPEED_NORMAL * this.def.shotPowerMultiplier * SHOT_SPEED_BY_POWER_LEVEL[level] * BICYCLE_SPEED_MULTIPLIER;
    this.onPowerShot?.(level, BICYCLE_TITLE);
    ball.element = this.def.element;
    ball.shoot(aim.x, aim.z, speed, false, true, true, 1, level, 0, 0);
    if (curve !== 0) ball.spin = curve * CURVE_ACCEL;
    emitImpact('power');
    this.character.playBicycle();
    soundFX.kick();
  }

  /** World direction at a random point inside the human's goal mouth — no
   * laser aim (CLAUDE.md: no auto-aim; the AI must be beatable). */
  private aimAtGoal(): { x: number; z: number } {
    const aimZ = Phaser.Math.Linear(GOAL_MOUTH_Z_MIN, GOAL_MOUTH_Z_MAX, Math.random());
    return { x: LEFT_GOAL_LINE_X - this.character.x, z: aimZ - this.character.z };
  }

  private wobble(): number {
    return this.diff.aimWobble * (this.def.chaosTouch ? OPPONENT_CHAOS_CHARACTER_WOBBLE_MULTIPLIER : 1);
  }

  private energyLevel(): number {
    return Math.floor(this.character.powerSegments + 1e-6);
  }

  destroy(): void {
    this.character.destroy();
  }
}
