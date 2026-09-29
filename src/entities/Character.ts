import Phaser from 'phaser';
import { CHARACTER_SPRITE_WIDTH, CHARACTER_HEIGHT, DEPTH_MIN, DEPTH_MAX, projectToScreen } from '../config/arena';
import { MOVE_SPEED, GRAVITY, JUMP_VELOCITY } from '../config/movement';
import {
  POWER_MAX_SEGMENTS,
  POWER_FILL_SECONDS_PER_SEGMENT,
  DASH_SEGMENT_COST_GROUND,
  DASH_SEGMENT_COST_AIR,
  DASH_SPEED,
  DASH_DURATION,
  DASH_RETRIGGER_COOLDOWN,
} from '../config/power';
import { type CharacterId, type CharacterPose, characterSpriteKey } from '../config/characters';

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
 * Dash spends a slice of it directly. Power şut/tutuş spend it through
 * `spendPower()`, called from MatchScene/AIOpponent — there's no separate
 * keeper entity, catching is this same character's own contextual action.
 */
export class Character {
  x: number;
  z: number;
  y = 0;
  private vy = 0;
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

  /** 0..POWER_MAX_SEGMENTS. */
  powerSegments = 0;
  /** Last nonzero move direction — where Dash goes when the joystick is
   * neutral (CLAUDE.md section 4). */
  facingX = 1;
  facingZ = 0;

  private dashTimeRemaining = 0;
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

  get isDashing(): boolean {
    return this.dashTimeRemaining > 0;
  }

  /** Spend power if there's enough; returns whether it went through. */
  spendPower(amount: number): boolean {
    if (this.powerSegments < amount) return false;
    this.powerSegments -= amount;
    return true;
  }

  get canPowerCatch(): boolean {
    return this.catchCooldownRemaining <= 0;
  }

  startCatchCooldown(seconds: number): void {
    this.catchCooldownRemaining = seconds;
  }

  update(delta: number, input: CharacterInput): void {
    const dt = delta / 1000;

    this.powerSegments = Phaser.Math.Clamp(
      this.powerSegments + dt / POWER_FILL_SECONDS_PER_SEGMENT,
      0,
      POWER_MAX_SEGMENTS,
    );

    if (input.moveX !== 0 || input.moveZ !== 0) {
      this.facingX = input.moveX;
      this.facingZ = input.moveZ;
    }

    if (this.dashRetriggerTimer > 0) this.dashRetriggerTimer -= dt;
    if (this.catchCooldownRemaining > 0) this.catchCooldownRemaining -= dt;

    if (input.dashPressed && !this.isDashing && this.dashRetriggerTimer <= 0) {
      const dirX = input.moveX !== 0 || input.moveZ !== 0 ? input.moveX : this.facingX;
      const dirZ = input.moveX !== 0 || input.moveZ !== 0 ? input.moveZ : this.facingZ;
      const len = Math.hypot(dirX, dirZ) || 1;
      const cost = this.y > 0 ? DASH_SEGMENT_COST_AIR : DASH_SEGMENT_COST_GROUND;
      if (this.spendPower(cost)) {
        this.dashVX = (dirX / len) * DASH_SPEED;
        this.dashVZ = (dirZ / len) * DASH_SPEED;
        this.dashTimeRemaining = DASH_DURATION;
        this.dashRetriggerTimer = DASH_RETRIGGER_COOLDOWN;
      }
    }

    if (this.isDashing) {
      this.x = Phaser.Math.Clamp(this.x + this.dashVX * dt, this.bounds.minX, this.bounds.maxX);
      this.z = Phaser.Math.Clamp(this.z + this.dashVZ * dt, DEPTH_MIN, DEPTH_MAX);
      this.dashTimeRemaining -= dt;
    } else {
      const speed = MOVE_SPEED * this.speedMultiplier;
      this.x = Phaser.Math.Clamp(this.x + input.moveX * speed * dt, this.bounds.minX, this.bounds.maxX);
      this.z = Phaser.Math.Clamp(this.z + input.moveZ * speed * dt, DEPTH_MIN, DEPTH_MAX);
    }

    if (input.jumpPressed && this.y === 0) {
      this.vy = JUMP_VELOCITY;
    }
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) this.vy = 0;
    }

    this.syncTransform();
  }

  setVisible(visible: boolean): void {
    this.spriteImage?.setVisible(visible);
    this.placeholderSprite?.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  /** Dash ("kayma") beats jump, which beats plain directional idle —
   * matches CLAUDE.md's pose list (idle/koşma reuse the same 4-direction
   * art; no separate run-cycle frames yet). */
  private resolvePose(): CharacterPose {
    if (this.isDashing) return 'slide';
    if (this.y > 0) return 'jump';
    if (Math.abs(this.facingZ) >= Math.abs(this.facingX)) {
      return this.facingZ > 0 ? 'back' : 'front';
    }
    return this.facingX > 0 ? 'right' : 'left';
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
      this.spriteImage.setPosition(lifted.screenX, lifted.screenY);
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
