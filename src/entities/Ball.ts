import Phaser from 'phaser';
import {
  BALL_RADIUS,
  DEPTH_MIN,
  DEPTH_MAX,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_BACK_X,
  RIGHT_GOAL_BACK_X,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  projectToScreen,
} from '../config/arena';
import {
  BALL_GRAVITY,
  BALL_BOUNCE_RESTITUTION,
  BALL_MIN_BOUNCE_VY,
  BALL_WALL_RESTITUTION,
  BALL_GROUND_FRICTION,
  BALL_MAX_SPEED,
  BALL_CONTROL_RADIUS,
  BALL_CONTROL_STRENGTH,
  BALL_MASS,
  BALL_CONTROL_FORCE,
  DRIBBLE_POINT_LERP_SPEED,
  AIR_CONTROL_MULTIPLIER,
  KICK_CARRY_MOMENTUM,
  BALL_HOLD_SECONDS,
  BALL_HOLD_WARNING_SECONDS,
  BALL_HOLD_BLINK_HZ,
  BALL_RECAPTURE_LOCKOUT,
} from '../config/ball';

export type GoalSide = 'left' | 'right' | null;

export interface BallTuning {
  /** Multiplies BALL_BOUNCE_RESTITUTION (stadium data, M5). */
  bounceMultiplier: number;
  /** Multiplies BALL_GROUND_FRICTION. */
  frictionMultiplier: number;
  /** Constant world-space force on the ball, px/s². */
  windX: number;
  windZ: number;
}

const DEFAULT_TUNING: BallTuning = { bounceMultiplier: 1, frictionMultiplier: 1, windX: 0, windZ: 0 };

/** Dampens `v` toward 0 by at most `amount` — never overshoots past 0 and
 * flips sign, so friction always reads as a bounded decay per frame, never
 * an instant full stop. */
function dampen(v: number, amount: number): number {
  if (Math.abs(v) <= amount) return 0;
  return v - Math.sign(v) * amount;
}

/**
 * Ball physics: gravity + ground bounce (y), touchline bounce (z), goal-line
 * handling on x, and dribble control (CLAUDE.md's ball-feel spec) — a
 * force/lerp steering toward a controlling character's dribble point, laid
 * on top of the same physics rather than replacing it. The ball is never a
 * child object of a character: `updateControl()` only ever nudges velocity,
 * position always comes from integrating that velocity in `update()`.
 * Renders the same way as Character: a sprite + a mandatory ground shadow,
 * both scaled by the shared depth factor (CLAUDE.md section 3).
 */
export class Ball {
  x: number;
  z: number;
  y: number;
  vx = 0;
  vz = 0;
  vy = 0;
  /** Set by shoot() when fired as a power şut — CLAUDE.md's matrix says a
   * power shot can never be stopped by a normal (non-power) tutuş, which a
   * pure speed-based chance roll can't express on its own. Cleared on the
   * next touch/shot or once a keeper has resolved against it. */
  lastShotWasPower = false;
  /** Set by shoot() when fired as a character's 3-segment super move —
   * CLAUDE.md section 5: "tutma şansı... özel şuta karşı düşer", so even a
   * keeper committed to a power tutuş can still be beaten. */
  lastShotWasSuper = false;
  /** True after shoot(), false while under dribble control. Keepers gate
   * their catch attempts on this — only a deliberate shot should ever be
   * "caught", not the ball drifting under someone's own dribble control. */
  lastTouchWasShot = false;
  /** Which side currently has dribble control (CLAUDE.md's hold rule) —
   * null for a free ball. Set/cleared every frame by updateControl() based
   * on distance to that side's dribble point; a deliberate shoot() also
   * clears it. Control is a force applied to velocity, never a position
   * assignment — see updateControl(). */
  controller: GoalSide = null;
  /** Counts down from BALL_HOLD_SECONDS while controlled; forces a release
   * (see update()) when it hits 0. Resets whenever control is (re)acquired. */
  holdTimeRemaining = 0;
  /** Which side just released the ball (a shot, or the hold timeout) — that
   * side can't immediately re-acquire control via the passive radius check
   * until BALL_RECAPTURE_LOCKOUT expires (see updateControl()). The other
   * side can still intercept right away. */
  private justReleasedBy: GoalSide = null;
  private recaptureLockoutRemaining = 0;
  /** The controlling character's dribble point, smoothed so it never
   * teleports when facing flips (DRIBBLE_POINT_LERP_SPEED) — owned here
   * rather than by the caller so both MatchScene and AIOpponent get the
   * same smoothing for free just by calling updateControl() each frame. */
  private controlPointX = 0;
  private controlPointZ = 0;
  private controlPointInitialized = false;
  /** The controller's facing direction as of the last updateControl() call
   * — used only for the forced hold-timeout release push (see update()). */
  private controllerFacingX = 1;
  private controllerFacingZ = 0;
  private blinkPhase = 0;
  private readonly sprite: Phaser.GameObjects.Ellipse;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** A single seam line across the ball, rotated by how far it's actually
   * rolled (angle += speed/BALL_RADIUS * dt) — without this the ball reads
   * as "sliding" rather than rolling, however fast it's really going. */
  private readonly spinMark: Phaser.GameObjects.Line;
  private spinAngle = 0;
  private readonly tuning: BallTuning;

  constructor(scene: Phaser.Scene, startX: number, startZ: number, startY = 40, tuning: Partial<BallTuning> = {}) {
    this.x = startX;
    this.z = startZ;
    this.y = startY;
    this.tuning = { ...DEFAULT_TUNING, ...tuning };

    this.shadow = scene.add.ellipse(0, 0, BALL_RADIUS * 2.2, BALL_RADIUS * 1.1, 0x000000, 0.35);
    this.sprite = scene.add.ellipse(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2, 0xffffff).setStrokeStyle(1, 0x333333);
    this.spinMark = scene.add.line(0, 0, 0, -BALL_RADIUS * 0.75, 0, BALL_RADIUS * 0.75, 0x333333).setLineWidth(1.5);

    this.syncTransform();
  }

  reset(x: number, z: number, y = 40): void {
    this.x = x;
    this.z = z;
    this.y = y;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.lastShotWasPower = false;
    this.lastShotWasSuper = false;
    this.lastTouchWasShot = false;
    this.spinAngle = 0;
    this.controller = null;
    this.holdTimeRemaining = 0;
    this.justReleasedBy = null;
    this.recaptureLockoutRemaining = 0;
    this.controlPointInitialized = false;
    this.sprite.setAlpha(1);
    this.syncTransform();
  }

  /** True in the last BALL_HOLD_WARNING_SECONDS of a hold — the sprite
   * blinks to warn the holder to shoot before it's forced away. */
  get holdExpiringSoon(): boolean {
    return this.controller !== null && this.holdTimeRemaining <= BALL_HOLD_WARNING_SECONDS;
  }

  /**
   * Steers the ball toward `side`'s dribble point (world coords, already
   * offset ahead of them by systems/dribbleControl.ts) if it's within
   * BALL_CONTROL_RADIUS — a force/lerp on velocity, never a position
   * assignment (CLAUDE.md: "top asla oyuncunun child objesi olmamalı").
   * Call this once per frame for EACH side, before ball.update(); whichever
   * side is in range (and not locked out) gets/keeps control. `isDashing`
   * and `airborne` both suppress or weaken control (a Dash's burst speed
   * outruns the dribble point on purpose; a jumping character barely
   * steers the ball at all).
   */
  updateControl(
    side: 'left' | 'right',
    rawTargetX: number,
    rawTargetZ: number,
    facingX: number,
    facingZ: number,
    isDashing: boolean,
    airborne: boolean,
    dt: number,
    chaos = false,
  ): void {
    if (isDashing) {
      if (this.controller === side) this.controller = null;
      return;
    }

    if (!this.controlPointInitialized) {
      this.controlPointX = rawTargetX;
      this.controlPointZ = rawTargetZ;
      this.controlPointInitialized = true;
    } else if (this.controller === side) {
      // Only smooth-follow the target while WE hold control — otherwise an
      // idle far-away character's raw target would still drag the shared
      // control point around and distort the distance check below.
      this.controlPointX = Phaser.Math.Linear(this.controlPointX, rawTargetX, DRIBBLE_POINT_LERP_SPEED * dt);
      this.controlPointZ = Phaser.Math.Linear(this.controlPointZ, rawTargetZ, DRIBBLE_POINT_LERP_SPEED * dt);
    }

    const checkX = this.controller === side ? this.controlPointX : rawTargetX;
    const checkZ = this.controller === side ? this.controlPointZ : rawTargetZ;
    const dist = Math.hypot(this.x - checkX, this.z - checkZ);
    const lockedOut = this.justReleasedBy === side && this.recaptureLockoutRemaining > 0;

    if (dist > BALL_CONTROL_RADIUS || lockedOut) {
      if (this.controller === side) this.controller = null;
      return;
    }

    if (this.controller !== side) {
      this.controller = side;
      this.holdTimeRemaining = BALL_HOLD_SECONDS;
      this.controlPointX = rawTargetX;
      this.controlPointZ = rawTargetZ;
    }
    // Remembered for the forced hold-timeout release (see update()) — a
    // standing-still holder's control point sits almost exactly on the
    // ball at equilibrium, so the ball-to-point vector alone degenerates
    // to near-zero right when we'd need a real "ileri" direction the most.
    this.controllerFacingX = facingX;
    this.controllerFacingZ = facingZ;

    const airControl = airborne || this.y > 0 ? AIR_CONTROL_MULTIPLIER : 1;

    const toX = this.controlPointX - this.x;
    const toZ = this.controlPointZ - this.z;
    const toLen = Math.hypot(toX, toZ) || 1;
    let desiredVX = (toX / toLen) * BALL_CONTROL_STRENGTH;
    let desiredVZ = (toZ / toLen) * BALL_CONTROL_STRENGTH;
    if (chaos) {
      // Kenya's poşet top: dribbling it is a little unpredictable too, not
      // just shots (M4's chaosTouch carried over into the new control model).
      desiredVX += (Math.random() - 0.5) * BALL_CONTROL_STRENGTH * 0.5;
      desiredVZ += (Math.random() - 0.5) * BALL_CONTROL_STRENGTH * 0.5;
    }

    // Real force/mass steering, not an unbounded lerp: the velocity can
    // only change by at most (force/mass)*dt this frame, however big the
    // gap to the desired velocity is. This is what actually kills the
    // "magnet" feel — a fast ball can't be yanked to a dead stop toward
    // the dribble point in one frame, it has to visibly curve in over a
    // few frames (or simply can't be fully caught at all if it's moving
    // too fast and passes through the control radius too quickly).
    const steerX = desiredVX - this.vx;
    const steerZ = desiredVZ - this.vz;
    const steerLen = Math.hypot(steerX, steerZ);
    const maxDeltaV = (BALL_CONTROL_FORCE / BALL_MASS) * airControl * dt;
    if (steerLen > 0) {
      const applied = Math.min(steerLen, maxDeltaV);
      this.vx += (steerX / steerLen) * applied;
      this.vz += (steerZ / steerLen) * applied;
    }

    // Actively controlled = not "the ball a shot left behind" anymore.
    this.lastShotWasPower = false;
    this.lastShotWasSuper = false;
    this.lastTouchWasShot = false;
  }

  /** A deliberate Aksiyon shot (M3), aimed along (dirX, dirZ) at `speed`.
   * `isPower` marks it for the shoot/hold matrix — see `lastShotWasPower`.
   * `isSuper` marks a character's 3-segment super move (M4) — see
   * `lastShotWasSuper`. `chaosMagnitude` scales the wobble on top of the
   * base jitter, for Kenya's extra-unpredictable super.
   *
   * Carries a fraction of the ball's existing velocity into the shot
   * (KICK_CARRY_MOMENTUM) instead of overwriting it outright — hitting a
   * ball that's already moving with you should feel different from
   * striking a still one. Also releases control (CLAUDE.md's hold rule) —
   * shooting always ends a hold, with a brief recapture lockout so the
   * shooter can't instantly re-glue it to their own dribble point next
   * frame (see updateControl()). */
  shoot(dirX: number, dirZ: number, speed: number, chaos = false, isPower = false, isSuper = false, chaosMagnitude = 1): void {
    if (this.controller !== null) {
      this.justReleasedBy = this.controller;
      this.recaptureLockoutRemaining = BALL_RECAPTURE_LOCKOUT;
      this.controller = null;
    }
    const len = Math.hypot(dirX, dirZ) || 1;
    let ix = dirX / len;
    let iz = dirZ / len;
    if (chaos) {
      ix += (Math.random() - 0.5) * 0.6 * chaosMagnitude;
      iz += (Math.random() - 0.5) * 0.6 * chaosMagnitude;
    }
    this.vx = this.vx * KICK_CARRY_MOMENTUM + ix * speed;
    this.vz = this.vz * KICK_CARRY_MOMENTUM + iz * speed;
    this.lastShotWasPower = isPower;
    this.lastShotWasSuper = isSuper;
    this.lastTouchWasShot = true;
  }

  update(delta: number): GoalSide {
    const dt = delta / 1000;
    let scored: GoalSide = null;

    if (this.recaptureLockoutRemaining > 0) {
      this.recaptureLockoutRemaining -= dt;
      if (this.recaptureLockoutRemaining <= 0) this.justReleasedBy = null;
    }

    if (this.controller !== null) {
      this.holdTimeRemaining -= dt;
      if (this.holdExpiringSoon) {
        this.blinkPhase += dt * BALL_HOLD_BLINK_HZ * Math.PI * 2;
        this.sprite.setAlpha(0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.blinkPhase)));
      } else {
        this.blinkPhase = 0;
        this.sprite.setAlpha(1);
      }
      if (this.holdTimeRemaining <= 0) {
        // 6 saniye doldu — top zorla BALL_FREE'ye düşer, ileri (bakılan
        // yöne) gider. A standing-still holder's dribble point sits almost
        // exactly on the ball at equilibrium, so we can't rely on residual
        // control velocity alone to carry it away (it'd be near zero) —
        // push explicitly along the holder's last known facing instead.
        this.vx = this.controllerFacingX * BALL_CONTROL_STRENGTH;
        this.vz = this.controllerFacingZ * BALL_CONTROL_STRENGTH;
        this.justReleasedBy = this.controller;
        this.recaptureLockoutRemaining = BALL_RECAPTURE_LOCKOUT;
        this.controller = null;
      }
    } else {
      this.sprite.setAlpha(1);
    }

    // Wind (stadium data, M5) — a constant push on the ball.
    this.vx += this.tuning.windX * dt;
    this.vz += this.tuning.windZ * dt;

    // Gravity + ground bounce.
    this.vy -= BALL_GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      this.y = 0;
      const restitution = BALL_BOUNCE_RESTITUTION * this.tuning.bounceMultiplier;
      this.vy = Math.abs(this.vy) > BALL_MIN_BOUNCE_VY ? -this.vy * restitution : 0;
    }

    // Ground friction while rolling — a bounded decay (dampen()), never an
    // instant stop, so braking always reads as a real slide-to-a-halt.
    if (this.y === 0) {
      const friction = BALL_GROUND_FRICTION * this.tuning.frictionMultiplier;
      this.vx = dampen(this.vx, friction * dt);
      this.vz = dampen(this.vz, friction * dt);
    }

    // Hard speed cap — stops repeated wall bounces (or wind, over many
    // frames) from accumulating into an uncontrollable runaway speed.
    const speed = Math.hypot(this.vx, this.vz);
    if (speed > BALL_MAX_SPEED) {
      const clampScale = BALL_MAX_SPEED / speed;
      this.vx *= clampScale;
      this.vz *= clampScale;
    }

    // Visual rolling spin, tied to actual current speed (not a constant
    // decorative rate) — speeds up/slows down exactly as fast as the ball
    // really is right now.
    this.spinAngle += (Math.min(speed, BALL_MAX_SPEED) / BALL_RADIUS) * dt;

    const prevX = this.x;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Touchline bounce.
    if (this.z < DEPTH_MIN) {
      this.z = DEPTH_MIN;
      this.vz = -this.vz * BALL_WALL_RESTITUTION;
    } else if (this.z > DEPTH_MAX) {
      this.z = DEPTH_MAX;
      this.vz = -this.vz * BALL_WALL_RESTITUTION;
    }

    const inGoalMouth = this.z >= GOAL_MOUTH_Z_MIN && this.z <= GOAL_MOUTH_Z_MAX;

    if (this.x < LEFT_GOAL_LINE_X) {
      if (inGoalMouth) {
        if (prevX >= LEFT_GOAL_LINE_X) scored = 'left';
        if (this.x < LEFT_GOAL_BACK_X) {
          this.x = LEFT_GOAL_BACK_X;
          this.vx = -this.vx * BALL_WALL_RESTITUTION;
        }
      } else {
        this.x = LEFT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      }
    } else if (this.x > RIGHT_GOAL_LINE_X) {
      if (inGoalMouth) {
        if (prevX <= RIGHT_GOAL_LINE_X) scored = 'right';
        if (this.x > RIGHT_GOAL_BACK_X) {
          this.x = RIGHT_GOAL_BACK_X;
          this.vx = -this.vx * BALL_WALL_RESTITUTION;
        }
      } else {
        this.x = RIGHT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      }
    }

    this.syncTransform();
    return scored;
  }

  private syncTransform(): void {
    const ground = projectToScreen(this.x, this.z, 0);
    const lifted = projectToScreen(this.x, this.z, this.y);
    const scale = ground.scale;

    this.shadow.setPosition(ground.screenX, ground.screenY);
    this.shadow.setScale(scale);

    this.sprite.setScale(scale);
    this.sprite.setPosition(lifted.screenX, lifted.screenY - BALL_RADIUS * scale);

    this.spinMark.setScale(scale);
    this.spinMark.setPosition(lifted.screenX, lifted.screenY - BALL_RADIUS * scale);
    this.spinMark.setRotation(this.spinAngle);

    // Ball renders just above a character standing on the same ground row.
    const depth = Math.round(ground.screenY);
    this.shadow.setDepth(depth - 1);
    this.sprite.setDepth(depth + 1);
    this.spinMark.setDepth(depth + 2);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.spinMark.destroy();
  }
}
