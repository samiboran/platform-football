import Phaser from 'phaser';
import { CHARACTER_SPRITE_WIDTH, CHARACTER_HEIGHT, DEPTH_MIN, DEPTH_MAX, projectToScreen } from '../config/arena';
import {
  MOVE_SPEED,
  GRAVITY,
  JUMP_VELOCITY,
  FALL_GRAVITY_MULTIPLIER,
  APEX_HANG_SPEED,
  APEX_HANG_GRAVITY_MULTIPLIER,
  PLAYER_ACCELERATION,
  PLAYER_DECELERATION,
  PLAYER_TURN_SPEED,
  DEPTH_SPEED_FACTOR,
} from '../config/movement';
import {
  POWER_MAX_SEGMENTS,
  POWER_PASSIVE_GAIN_SECONDS,
  POWER_PASSIVE_GAIN_AMOUNT,
  DASH_ENERGY_COST,
  DASH_SPEED,
  DASH_DURATION,
  DASH_COOLDOWN,
} from '../config/power';
import { STUN_MOVE_MULTIPLIER } from '../config/keeper';
import { type CharacterId, type CharacterPose, RUN_FRAME_COUNT, characterSpriteKey } from '../config/characters';
import {
  RUN_FRAME_SECONDS,
  RUN_SPEED_THRESHOLD,
  RUN_VERTICAL_BOB_PX,
  KICK_POSE_SECONDS,
  CATCH_POSE_SECONDS,
  DUST_TEXTURE_KEY,
  DASH_DUST_INTERVAL,
  DASH_DUST_LIFETIME_MS,
  DASH_DUST_SCALE_FROM,
  DASH_DUST_SCALE_TO,
  DASH_DUST_ALPHA,
  DASH_DUST_DRIFT,
  DASH_DUST_JITTER,
} from '../config/animation';

export interface CharacterBounds {
  minX: number;
  maxX: number;
}

export interface CharacterInput {
  moveX: number; // -1..1
  moveZ: number; // -1..1
  jumpPressed: boolean;
  dashPressed: boolean;
}

/** Approaches `target` from `current` by at most `maxDelta`, same idea as
 * Unity's Mathf.MoveToward — used for the character's ground velocity so
 * starting/stopping/turning has real acceleration instead of an instant
 * snap (needed for the ball-dribble feel rework: the dribble point's
 * distance is derived from the character's actual current speed). */

/** Placeholder-only skin tone for the head, used only when no characterId
 * is given (the F1 debug reference character) — real sprites (M4 art pass)
 * cover every playable/AI character now. */
const PLACEHOLDER_HEAD_COLOR = 0xe0ac69;

/**
 * A single character on the pitch: ground position (x, z) plus jump height
 * (y). Renders a real per-character sprite (idle front/back/left/right,
 * jump, slide — M4 art pass) plus a mandatory ground shadow (CLAUDE.md
 * section 3 — depth is unreadable without one), and keeps its Phaser depth
 * synced to its screen position so nearer characters draw in front. Falls
 * back to a plain placeholder silhouette when no characterId is given (the
 * F1 debug reference character, which isn't any real identity).
 *
 * Also owns the M3 power bar (CLAUDE.md section 5): it fills passively and
 * Dash spends 1 full segment directly (1 s cooldown). Power şut/tutuş spend it through
 * `spendPower()`, called from MatchScene/AIOpponent — there's no separate
 * keeper entity, catching is this same character's own contextual action.
 */
export class Character {
  x: number;
  z: number;
  y = 0;
  private vy = 0;
  /** Current ground velocity (px/s) — real acceleration/deceleration now
   * (see movement.ts's PLAYER_ACCELERATION/DECELERATION/TURN_SPEED), not an
   * instant snap to input. Public so the ball-dribble system can read the
   * character's actual current speed to decide how far ahead the ball sits.
   * Both in screen-equivalent px/s: z is turned into world units with
   * DEPTH_SPEED_FACTOR only when the position moves (movement.ts). */
  velX = 0;
  velZ = 0;
  /** Velocity actually travelled last frame (boundary clamps included). */
  moveVelX = 0;
  moveVelZ = 0;
  private readonly scene: Phaser.Scene;
  private dustTimer = 0;
  private readonly bounds: CharacterBounds;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** Per-character ground-speed multiplier (M4 character stats, 1.0 = base). */
  private readonly speedMultiplier: number;

  private readonly characterId: CharacterId | null;
  /** Real sprite mode (characterId given). */
  private readonly spriteImage?: Phaser.GameObjects.Image;
  /** Scale that makes the `front` pose's native pixel height equal
   * CHARACTER_HEIGHT — reused as-is for every other pose of the same
   * character so their relative proportions (e.g. `slide` reading shorter,
   * lying down) stay whatever the source art intended. */
  private readonly spriteBaseScale: number = 1;
  private currentPose: CharacterPose | null = null;
  /** Placeholder fallback mode (no characterId — F1 debug reference only). */
  private readonly placeholderSprite?: Phaser.GameObjects.Container;

  /** 0..POWER_MAX_SEGMENTS, whole segments only. */
  powerSegments = 0;
  /** Seconds accumulated toward the next passive +1 (0 while full). */
  passiveGainTimer = 0;
  /** Last nonzero move direction — where Dash goes when the joystick is
   * neutral (CLAUDE.md section 4). */
  facingX = 1;
  facingZ = 0;

  /** Last nonzero horizontal facing sign — picks left/right art for poses
   * that only exist sideways (run cycle, slide, kick). */
  private lastHorizFacing = 1;
  private runPhase = 0;
  /** A one-shot pose (kick/catch/stunned) overriding the resolved pose
   * until its timer runs out. */
  private transientPose: CharacterPose | null = null;
  private transientPoseRemaining = 0;

  private dashTimeRemaining = 0;
  /** Seconds left knocked down/stunned (M6.3): slowed, no dash/jump. */
  private stunRemaining = 0;
  private dashRetriggerTimer = 0;
  private dashVX = 0;
  private dashVZ = 0;

  /** M3 "tut" cooldown (CLAUDE.md section 5) — gates power tutuş, not
   * normal tutuş (which is chance-based and always available). Lives here
   * because catching is now the same character's own contextual action
   * (Aksiyon while not touching the ball), not a separate keeper entity —
   * see docs/PROGRESS.md. */
  private catchCooldownRemaining = 0;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startZ: number,
    bounds: CharacterBounds,
    color: number,
    speedMultiplier = 1,
    characterId: CharacterId | null = null,
  ) {
    this.scene = scene;
    this.x = startX;
    this.z = startZ;
    this.bounds = bounds;
    this.speedMultiplier = speedMultiplier;
    this.characterId = characterId;

    this.shadow = scene.add.ellipse(0, 0, CHARACTER_SPRITE_WIDTH * 1.1, CHARACTER_SPRITE_WIDTH * 0.5, 0x000000, 0.35);

    if (characterId) {
      const frontKey = characterSpriteKey(characterId, 'front');
      const frontTex = scene.textures.get(frontKey).getSourceImage();
      this.spriteBaseScale = CHARACTER_HEIGHT / frontTex.height;
      this.currentPose = 'front';
      this.spriteImage = scene.add.image(0, 0, frontKey).setOrigin(0.5, 1);
    } else {
      // Plain placeholder silhouette (head + body) for the F1 debug
      // reference character — not any real identity, so no sprite art.
      const headRadius = CHARACTER_SPRITE_WIDTH * 0.38;
      const bodyHeight = CHARACTER_HEIGHT - headRadius * 2;
      const head = scene.add.circle(0, headRadius, headRadius, PLACEHOLDER_HEAD_COLOR).setStrokeStyle(1, 0x000000);
      const body = scene.add
        .rectangle(0, headRadius * 2 + bodyHeight / 2, CHARACTER_SPRITE_WIDTH, bodyHeight, color)
        .setStrokeStyle(1, 0x000000);
      this.placeholderSprite = scene.add.container(0, 0, [body, head]);
    }

    this.syncTransform();
  }

  /** Could a dash start right now? (M7.3 button dimming) */
  get canDash(): boolean {
    return !this.isDashing && this.dashRetriggerTimer <= 0 && this.powerSegments >= DASH_ENERGY_COST && !this.isStunned;
  }

  get isDashing(): boolean {
    return this.dashTimeRemaining > 0;
  }

  /** Spend power if there's enough; returns whether it went through. */
  spendPower(amount: number): boolean {
    if (this.powerSegments < amount) return false;
    this.powerSegments -= amount;
    return true;
  }

  /** Add energy (passive tick, drink pickup, …), clamped to the bar. */
  gainPower(amount: number): void {
    this.powerSegments = Phaser.Math.Clamp(this.powerSegments + amount, 0, POWER_MAX_SEGMENTS);
  }

  /** Shot follow-through pose, facing the shot's horizontal direction. */
  playKick(dirX: number): void {
    const sign = dirX !== 0 ? Math.sign(dirX) : this.lastHorizFacing;
    this.playPose(sign > 0 ? 'kick_right' : 'kick_left', KICK_POSE_SECONDS);
  }

  playCatch(): void {
    this.playPose('catch', CATCH_POSE_SECONDS);
  }

  /** Knocked down/stunned for `seconds` (M6.3): stunned pose, slowed to
   * STUN_MOVE_MULTIPLIER, no dash or jump; the scene/AI also block
   * shooting and catching while `isStunned`. Cancels a running dash. */
  playStunned(seconds: number): void {
    this.stunRemaining = Math.max(this.stunRemaining, seconds);
    this.dashTimeRemaining = 0;
    this.playPose('stunned', seconds);
  }

  get isStunned(): boolean {
    return this.stunRemaining > 0;
  }

  get currentPoseName(): CharacterPose | null {
    return this.currentPose;
  }

  private playPose(pose: CharacterPose, seconds: number): void {
    this.transientPose = pose;
    this.transientPoseRemaining = seconds;
    this.syncTransform();
  }

  get canPowerCatch(): boolean {
    return this.catchCooldownRemaining <= 0;
  }

  startCatchCooldown(seconds: number): void {
    this.catchCooldownRemaining = seconds;
  }

  update(delta: number, input: CharacterInput): void {
    const dt = delta / 1000;

    if (this.powerSegments >= POWER_MAX_SEGMENTS) {
      this.passiveGainTimer = 0;
    } else {
      this.passiveGainTimer += dt;
      if (this.passiveGainTimer >= POWER_PASSIVE_GAIN_SECONDS) {
        this.passiveGainTimer -= POWER_PASSIVE_GAIN_SECONDS;
        this.gainPower(POWER_PASSIVE_GAIN_AMOUNT);
      }
    }

    if (input.moveX !== 0 || input.moveZ !== 0) {
      this.facingX = input.moveX;
      this.facingZ = input.moveZ;
      if (input.moveX !== 0) this.lastHorizFacing = Math.sign(input.moveX);
    }

    if (this.transientPoseRemaining > 0) {
      this.transientPoseRemaining -= dt;
      if (this.transientPoseRemaining <= 0) this.transientPose = null;
    }

    if (this.dashRetriggerTimer > 0) this.dashRetriggerTimer -= dt;
    if (this.catchCooldownRemaining > 0) this.catchCooldownRemaining -= dt;
    const stunned = this.stunRemaining > 0;
    if (stunned) this.stunRemaining = Math.max(0, this.stunRemaining - dt);

    if (input.dashPressed && !stunned && !this.isDashing && this.dashRetriggerTimer <= 0) {
      const dirX = input.moveX !== 0 || input.moveZ !== 0 ? input.moveX : this.facingX;
      const dirZ = input.moveX !== 0 || input.moveZ !== 0 ? input.moveZ : this.facingZ;
      const len = Math.hypot(dirX, dirZ) || 1;
      if (this.spendPower(DASH_ENERGY_COST)) {
        this.dashVX = (dirX / len) * DASH_SPEED;
        this.dashVZ = (dirZ / len) * DASH_SPEED;
        this.dashTimeRemaining = DASH_DURATION;
        this.dashRetriggerTimer = DASH_COOLDOWN;
      }
    }

    if (this.isDashing) {
      this.velX = this.dashVX;
      this.velZ = this.dashVZ;
      const prevX = this.x;
      const prevZ = this.z;
      this.x = Phaser.Math.Clamp(this.x + this.dashVX * dt, this.bounds.minX, this.bounds.maxX);
      this.z = Phaser.Math.Clamp(this.z + this.dashVZ * DEPTH_SPEED_FACTOR * dt, DEPTH_MIN, DEPTH_MAX);
      // Real displacement, so a carried ball rides along with the dash.
      this.moveVelX = dt > 0 ? (this.x - prevX) / dt : 0;
      this.moveVelZ = dt > 0 ? (this.z - prevZ) / dt : 0;
      this.dashTimeRemaining -= dt;
      this.dustTimer -= dt;
      if (this.dustTimer <= 0 && this.y === 0) {
        this.dustTimer = DASH_DUST_INTERVAL;
        this.spawnDust();
      }
    } else {
      const topSpeed = MOVE_SPEED * this.speedMultiplier * (stunned ? STUN_MOVE_MULTIPLIER : 1);
      const targetVX = input.moveX * topSpeed;
      const targetVZ = input.moveZ * topSpeed;
      // Radial (vector) acceleration — one rate for the whole velocity
      // vector, not per axis. The old per-axis version reached full speed
      // on each axis independently, so diagonals and direction changes
      // curved and felt different from straight runs. Rate choice:
      // stopping → deceleration, turning more than 90° (a pivot) → turn
      // speed (a real player changes direction faster than they build up
      // speed), otherwise → acceleration.
      const dot = this.velX * targetVX + this.velZ * targetVZ;
      const rate =
        targetVX === 0 && targetVZ === 0
          ? PLAYER_DECELERATION
          : dot < 0
            ? PLAYER_TURN_SPEED
            : PLAYER_ACCELERATION;
      const dvx = targetVX - this.velX;
      const dvz = targetVZ - this.velZ;
      const dvLen = Math.hypot(dvx, dvz);
      const step = rate * dt;
      if (dvLen <= step) {
        this.velX = targetVX;
        this.velZ = targetVZ;
      } else {
        this.velX += (dvx / dvLen) * step;
        this.velZ += (dvz / dvLen) * step;
      }
      const prevX = this.x;
      const prevZ = this.z;
      this.x = Phaser.Math.Clamp(this.x + this.velX * dt, this.bounds.minX, this.bounds.maxX);
      this.z = Phaser.Math.Clamp(this.z + this.velZ * DEPTH_SPEED_FACTOR * dt, DEPTH_MIN, DEPTH_MAX);
      // Actual displacement velocity — velX/velZ stay "intended" (for the
      // run animation) even when pinned against a boundary; a carried ball
      // must follow where the character really went, not where it pushed.
      this.moveVelX = dt > 0 ? (this.x - prevX) / dt : 0;
      this.moveVelZ = dt > 0 ? (this.z - prevZ) / dt : 0;
    }

    if (input.jumpPressed && !stunned && this.y === 0) {
      this.vy = JUMP_VELOCITY;
    }
    if (this.y > 0 || this.vy > 0) {
      let g = GRAVITY;
      if (Math.abs(this.vy) < APEX_HANG_SPEED) g *= APEX_HANG_GRAVITY_MULTIPLIER;
      else if (this.vy < 0) g *= FALL_GRAVITY_MULTIPLIER;
      this.vy -= g * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) this.vy = 0;
    }

    if (this.isRunning) {
      // Leg cycle follows real ground speed — a slow character doesn't
      // pedal at a sprinter's cadence.
      const speedRatio = Math.max(0.5, Math.hypot(this.velX, this.velZ) / MOVE_SPEED);
      this.runPhase = (this.runPhase + (dt * speedRatio) / RUN_FRAME_SECONDS) % RUN_FRAME_COUNT;
    } else {
      this.runPhase = 0;
    }

    this.syncTransform();
  }

  setVisible(visible: boolean): void {
    this.spriteImage?.setVisible(visible);
    this.placeholderSprite?.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  /** Priority: one-shot pose (kick/catch/stunned) > Dash slide > jump >
   * run cycle > idle facing. The run cycle only has left/right art, so
   * running mostly toward/away from the camera keeps the front/back pose
   * with a small step bob (see syncTransform). */
  private resolvePose(): CharacterPose {
    if (this.transientPose) return this.transientPose;
    if (this.isDashing) {
      const sign = this.dashVX !== 0 ? Math.sign(this.dashVX) : this.lastHorizFacing;
      return sign > 0 ? 'slide_right' : 'slide';
    }
    // Airborne keeps a side profile toward the last horizontal facing — the
    // front-facing 'jump' art made the player turn to the camera mid-air.
    if (this.y > 0) return this.lastHorizFacing > 0 ? 'jump_right' : 'jump_left';
    const vertical = Math.abs(this.facingZ) > Math.abs(this.facingX);
    if (vertical) return this.facingZ > 0 ? 'back' : 'front';
    if (this.isRunning) {
      const frame = Math.floor(this.runPhase) % RUN_FRAME_COUNT;
      return `run_${this.facingX > 0 ? 'right' : 'left'}_${frame}` as CharacterPose;
    }
    return this.facingX > 0 ? 'right' : 'left';
  }

  private get isRunning(): boolean {
    return Math.hypot(this.velX, this.velZ) > RUN_SPEED_THRESHOLD && !this.isDashing && this.y === 0;
  }

  /** One dust puff at the feet, drifting back against the dash. */
  private spawnDust(): void {
    if (!this.scene.textures.exists(DUST_TEXTURE_KEY)) return;
    const ground = projectToScreen(this.x, this.z, 0);
    const len = Math.hypot(this.dashVX, this.dashVZ) || 1;
    const backX = -this.dashVX / len;
    const backY = this.dashVZ / len; // +z is up the screen
    const jitter = () => (Math.random() - 0.5) * DASH_DUST_JITTER;
    const puff = this.scene.add
      .image(ground.screenX + jitter(), ground.screenY + jitter() * 0.5, DUST_TEXTURE_KEY)
      .setOrigin(0.5, 1)
      .setScale(DASH_DUST_SCALE_FROM * ground.scale)
      .setAlpha(DASH_DUST_ALPHA)
      .setFlipX(Math.random() < 0.5)
      .setDepth(Math.round(ground.screenY) - 1);
    this.scene.tweens.add({
      targets: puff,
      x: puff.x + backX * DASH_DUST_DRIFT,
      y: puff.y + backY * DASH_DUST_DRIFT * 0.5 - 4,
      scale: DASH_DUST_SCALE_TO * ground.scale,
      alpha: 0,
      duration: DASH_DUST_LIFETIME_MS,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy(),
    });
  }

  /** Display objects the goal replay records and replays (M6.4). */
  replayTargets(): Phaser.GameObjects.GameObject[] {
    const body = this.spriteImage ?? this.placeholderSprite;
    return body ? [this.shadow, body] : [this.shadow];
  }

  private syncTransform(): void {
    const ground = projectToScreen(this.x, this.z, 0);
    const lifted = projectToScreen(this.x, this.z, this.y);
    // `scale` is the perspective shrink at this depth (1.0 near -> 0.85 far,
    // same factor for the shadow so both stay visually consistent).
    const depthScale = ground.scale;

    // Shadow stays on the z-plane and shrinks/fades with jump height —
    // it must never follow y, or it stops reading as "ground contact".
    this.shadow.setPosition(ground.screenX, ground.screenY);
    const jumpShrink = Phaser.Math.Clamp(1 - this.y / 140, 0.4, 1);
    this.shadow.setScale(depthScale * jumpShrink);
    this.shadow.setAlpha(0.35 * jumpShrink);

    const depth = Math.round(ground.screenY);

    if (this.spriteImage && this.characterId) {
      const pose = this.resolvePose();
      if (pose !== this.currentPose) {
        this.currentPose = pose;
        this.spriteImage.setTexture(characterSpriteKey(this.characterId, pose));
      }
      // Bottom-center origin — position is the ground-contact point, no
      // manual height offset needed (unlike the old top-anchored container).
      this.spriteImage.setScale(this.spriteBaseScale * depthScale);
      // Step bob for front/back running (no dedicated run frames there).
      const bob =
        this.isRunning && (pose === 'front' || pose === 'back') && Math.floor(this.runPhase) % 2 === 1
          ? RUN_VERTICAL_BOB_PX
          : 0;
      this.spriteImage.setPosition(lifted.screenX, lifted.screenY - bob);
      this.spriteImage.setDepth(depth);
    } else if (this.placeholderSprite) {
      this.placeholderSprite.setScale(depthScale);
      // Top-anchored (local y=0 is the head's top) — bottom of the figure
      // lands exactly at lifted.screenY regardless of scale.
      this.placeholderSprite.setPosition(lifted.screenX, lifted.screenY - CHARACTER_HEIGHT * depthScale);
      this.placeholderSprite.setDepth(depth);
    }

    this.shadow.setDepth(depth - 1);
  }

  destroy(): void {
    this.spriteImage?.destroy();
    if (this.placeholderSprite) {
      // Container.destroy() alone only detaches its children, it doesn't
      // destroy them (Phaser: removeAll(false) unless `exclusive` is set) —
      // explicitly destroy the head/body shapes too, or they'd leak as
      // orphaned GameObjects still rendering in the scene.
      this.placeholderSprite.removeAll(true);
      this.placeholderSprite.destroy();
    }
    this.shadow.destroy();
  }
}
