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
  GOAL_HEIGHT,
  projectToScreen,
} from '../config/arena';
import { BALL_SPRITE_PIXEL_SCALE, BALL_POWER_LEVEL_MAX, BALL_AURA_MIN_SPEED, ballSpriteKey } from '../config/animation';
import {
  BALL_SHADOW_MIN_SCALE,
  BALL_SHADOW_GROUND_ALPHA,
  BALL_SHADOW_MIN_ALPHA,
  BALL_SHADOW_FADE_HEIGHT,
  LANDING_MARKER_MIN_HEIGHT,
  LANDING_MARKER_COLOR,
  LANDING_MARKER_ALPHA,
  BALL_GRAVITY,
  BALL_AIR_DRAG,
  BALL_BOUNCE_RESTITUTION,
  BALL_MIN_BOUNCE_VY,
  BALL_WALL_RESTITUTION,
  BALL_GROUND_FRICTION,
  BALL_MAX_SPEED,
  BALL_CONTROL_RADIUS,
  BALL_CONTROL_STRENGTH,
  DRIBBLE_POINT_LERP_SPEED,
  DRIBBLE_STICK_LERP_SPEED,
  DRIBBLE_CHAOS_WOBBLE,
  BALL_TRAP_MAX_HEIGHT,
  BALL_TRAP_MAX_RELATIVE_SPEED,
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
  /** The controller's facing direction as of the last updateControl() call
   * — used only for the forced hold-timeout release push (see update()). */
  private controllerFacingX = 1;
  private controllerFacingZ = 0;
  private blinkPhase = 0;
  /** Power aura level 0..BALL_POWER_LEVEL_MAX (M6.0) — picks the
   * ball_power<N> sprite. Set by shoot(), cleared when the ball is caught,
   * picked up, or slows below BALL_AURA_MIN_SPEED. */
  powerLevel = 0;
  /** Charge-up aura shown while the ball is still under dribble control and
   * the controller is holding Aksiyon for a power shot (M6.2). Purely
   * visual; shoot() turns it into the real powerLevel. */
  private chargeLevel = 0;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** Ring on the ground where a high free ball will first land (M6.2 lob). */
  private readonly landingMarker: Phaser.GameObjects.Ellipse;
  /** How far the ball has rolled (angle += speed/BALL_RADIUS * dt). The
   * pixel-art sprite rotates in 90° steps (pixel-perfect) so it reads as
   * rolling rather than sliding. */
  private spinAngle = 0;
  private currentLevel = -1;
  private readonly tuning: BallTuning;

  constructor(scene: Phaser.Scene, startX: number, startZ: number, startY = 40, tuning: Partial<BallTuning> = {}) {
    this.x = startX;
    this.z = startZ;
    this.y = startY;
    this.tuning = { ...DEFAULT_TUNING, ...tuning };

    this.shadow = scene.add.ellipse(0, 0, BALL_RADIUS * 2.2, BALL_RADIUS * 1.1, 0x000000, 0.35);
    this.sprite = scene.add.image(0, 0, ballSpriteKey(0));
    this.landingMarker = scene.add
      .ellipse(0, 0, BALL_RADIUS * 3, BALL_RADIUS * 1.5)
      .setStrokeStyle(2, LANDING_MARKER_COLOR, LANDING_MARKER_ALPHA)
      .setVisible(false);

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
    this.powerLevel = 0;
    this.chargeLevel = 0;
    this.controller = null;
    this.holdTimeRemaining = 0;
    this.justReleasedBy = null;
    this.recaptureLockoutRemaining = 0;
    this.sprite.setAlpha(1);
    this.syncTransform();
  }

  /** True in the last BALL_HOLD_WARNING_SECONDS of a hold — the sprite
   * blinks to warn the holder to shoot before it's forced away. */
  get holdExpiringSoon(): boolean {
    return this.controller !== null && this.holdTimeRemaining <= BALL_HOLD_WARNING_SECONDS;
  }

  /**
   * Dribble control (reworked after Sami's "top ayakta durmuyor" feedback,
   * modeled on YSoccer/Sensible Soccer's possession rule — see
   * docs/PROGRESS.md Oturum 24).
   *
   * Two phases:
   * 1. **Trap.** A free ball is only taken under control when it is near
   *    the character's raw dribble point, low enough (BALL_TRAP_MAX_HEIGHT)
   *    and NOT moving much faster than the character
   *    (BALL_TRAP_MAX_RELATIVE_SPEED). A fast shot rolls past instead of
   *    being magnetized onto the feet — the old "magnet" complaint stays
   *    fixed without the steering force that made the ball drift away.
   * 2. **Carry.** Once trapped the ball moves WITH the character: its
   *    velocity is the character's velocity and its position is pulled
   *    firmly (DRIBBLE_STICK_LERP_SPEED) onto a dribble point that swings
   *    around with the facing direction. It stays there until a shot, a
   *    Dash, the hold timeout, or the character leaves the ground.
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
    ownerVelX = 0,
    ownerVelZ = 0,
  ): void {
    const isMine = this.controller === side;
    if (isDashing || airborne) {
      if (isMine) this.controller = null;
      return;
    }

    if (!isMine) {
      const lockedOut = this.justReleasedBy === side && this.recaptureLockoutRemaining > 0;
      const dist = Math.hypot(this.x - rawTargetX, this.z - rawTargetZ);
      const relSpeed = Math.hypot(this.vx - ownerVelX, this.vz - ownerVelZ);
      if (lockedOut || dist > BALL_CONTROL_RADIUS || this.y > BALL_TRAP_MAX_HEIGHT || relSpeed > BALL_TRAP_MAX_RELATIVE_SPEED) {
        return;
      }
      this.controller = side;
      this.holdTimeRemaining = BALL_HOLD_SECONDS;
      this.controlPointX = rawTargetX;
      this.controlPointZ = rawTargetZ;
    } else {
      // The dribble point slides (never teleports) when facing flips, so
      // the ball visibly swings around the feet to the new direction.
      const k = Math.min(1, DRIBBLE_POINT_LERP_SPEED * dt);
      this.controlPointX = Phaser.Math.Linear(this.controlPointX, rawTargetX, k);
      this.controlPointZ = Phaser.Math.Linear(this.controlPointZ, rawTargetZ, k);
    }

    // Remembered for the forced hold-timeout release (see update()).
    this.controllerFacingX = facingX;
    this.controllerFacingZ = facingZ;

    let targetX = this.controlPointX;
    let targetZ = this.controlPointZ;
    if (chaos) {
      // Kenya's poşet top: the carried ball wobbles around the feet.
      targetX += (Math.random() - 0.5) * DRIBBLE_CHAOS_WOBBLE;
      targetZ += (Math.random() - 0.5) * DRIBBLE_CHAOS_WOBBLE;
    }
    const stick = Math.min(1, DRIBBLE_STICK_LERP_SPEED * dt);
    this.x = Phaser.Math.Linear(this.x, targetX, stick);
    this.z = Phaser.Math.Linear(this.z, targetZ, stick);
    // Move with the owner; update() integrates this, so the ball never lags
    // a frame behind a running character.
    this.vx = ownerVelX;
    this.vz = ownerVelZ;
    // Keep it on the ground while carried.
    if (this.y > 0) this.y = Math.max(0, this.y - BALL_TRAP_MAX_HEIGHT * stick);
    this.vy = 0;

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
  shoot(
    dirX: number,
    dirZ: number,
    speed: number,
    chaos = false,
    isPower = false,
    isSuper = false,
    chaosMagnitude = 1,
    powerLevel = isSuper ? BALL_POWER_LEVEL_MAX : isPower ? 1 : 0,
    launchVy = 0,
    carryMomentum = KICK_CARRY_MOMENTUM,
  ): void {
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
    this.vx = this.vx * carryMomentum + ix * speed;
    this.vz = this.vz * carryMomentum + iz * speed;
    // Lobs launch upward; a flat shot keeps whatever vertical speed the
    // ball already had (a volley strikes it where it is).
    if (launchVy > 0) this.vy = launchVy;
    this.lastShotWasPower = isPower;
    this.lastShotWasSuper = isSuper;
    this.lastTouchWasShot = true;
    this.powerLevel = Phaser.Math.Clamp(Math.round(powerLevel), 0, BALL_POWER_LEVEL_MAX);
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
    if (this.y > 0) {
      const drag = Math.max(0, 1 - BALL_AIR_DRAG * dt);
      this.vx *= drag;
      this.vz *= drag;
    }
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
      if (inGoalMouth && prevX >= LEFT_GOAL_LINE_X && this.y > GOAL_HEIGHT) {
        // Over the crossbar — bounces back like the end wall.
        this.x = LEFT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      } else if (inGoalMouth) {
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
      if (inGoalMouth && prevX <= RIGHT_GOAL_LINE_X && this.y > GOAL_HEIGHT) {
        this.x = RIGHT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      } else if (inGoalMouth) {
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

  /** Jumping while dribbling: the ball leaves the feet and rises with the
   * jumper, keeping their horizontal velocity (no shot, no lockout — it
   * can be volleyed in the air or re-trapped on landing). */
  liftWithOwner(ownerVelX: number, ownerVelZ: number, vy: number): void {
    this.controller = null;
    this.vx = ownerVelX;
    this.vz = ownerVelZ;
    this.vy = vy;
    this.lastTouchWasShot = false;
  }

  /** Predicted first ground contact of the free ball from its current
   * state (gravity + air drag; wind/walls ignored), or null if it's low.
   * Pure maths, recomputed every frame so wind drift self-corrects. */
  predictLanding(): { x: number; z: number } | null {
    if (this.controller !== null || this.y <= LANDING_MARKER_MIN_HEIGHT) return null;
    const g = BALL_GRAVITY;
    const t = (this.vy + Math.sqrt(this.vy * this.vy + 2 * g * this.y)) / g;
    const travel = BALL_AIR_DRAG > 0 ? (1 - Math.exp(-BALL_AIR_DRAG * t)) / BALL_AIR_DRAG : t;
    return {
      x: this.x + this.vx * travel,
      z: Phaser.Math.Clamp(this.z + this.vz * travel, DEPTH_MIN, DEPTH_MAX),
    };
  }

  /** Show the hold-to-charge aura (0 = none) while the ball is controlled. */
  setChargeLevel(level: number): void {
    this.chargeLevel = Phaser.Math.Clamp(Math.round(level), 0, BALL_POWER_LEVEL_MAX);
  }

  private syncTransform(): void {
    const ground = projectToScreen(this.x, this.z, 0);
    const lifted = projectToScreen(this.x, this.z, this.y);
    const scale = ground.scale;

    if (this.powerLevel > 0 && (this.controller !== null || Math.hypot(this.vx, this.vz) < BALL_AURA_MIN_SPEED)) {
      this.powerLevel = 0;
    }
    if (this.controller === null) this.chargeLevel = 0;
    const shownLevel = this.controller !== null ? this.chargeLevel : this.powerLevel;
    if (shownLevel !== this.currentLevel) {
      this.currentLevel = shownLevel;
      this.sprite.setTexture(ballSpriteKey(shownLevel));
    }

    // Shadow shrinks and fades as the ball rises (CLAUDE.md §3).
    const lift = Phaser.Math.Clamp(this.y / BALL_SHADOW_FADE_HEIGHT, 0, 1);
    this.shadow.setPosition(ground.screenX, ground.screenY);
    this.shadow.setScale(scale * Phaser.Math.Linear(1, BALL_SHADOW_MIN_SCALE, lift));
    this.shadow.setFillStyle(0x000000, Phaser.Math.Linear(BALL_SHADOW_GROUND_ALPHA, BALL_SHADOW_MIN_ALPHA, lift));

    const landing = this.predictLanding();
    this.landingMarker.setVisible(landing !== null);
    if (landing) {
      const p = projectToScreen(landing.x, landing.z, 0);
      this.landingMarker.setPosition(p.screenX, p.screenY).setScale(p.scale);
      this.landingMarker.setDepth(Math.round(p.screenY) - 2);
    }

    this.sprite.setScale(BALL_SPRITE_PIXEL_SCALE * scale);
    this.sprite.setPosition(lifted.screenX, lifted.screenY - BALL_RADIUS * scale);
    if (shownLevel >= 2 && this.controller === null) {
      // Flame tail is drawn trailing a left-moving ball — mirror it for
      // rightward shots, and don't spin it (the tail must stay behind).
      this.sprite.setRotation(0);
      this.sprite.setFlipX(this.vx > 0);
    } else {
      this.sprite.setFlipX(false);
      const quarterTurns = Math.floor(this.spinAngle / (Math.PI / 2));
      this.sprite.setRotation(quarterTurns * (Math.PI / 2));
    }

    // Ball renders just above a character standing on the same ground row.
    const depth = Math.round(ground.screenY);
    this.shadow.setDepth(depth - 1);
    this.sprite.setDepth(depth + 1);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.landingMarker.destroy();
  }
}
