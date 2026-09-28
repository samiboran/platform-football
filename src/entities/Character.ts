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

/**
 * A single character on the pitch: ground position (x, z) plus jump height
 * (y). Renders a placeholder sprite and a mandatory ground shadow (CLAUDE.md
 * section 3 — depth is unreadable without one), and keeps its Phaser depth
 * synced to its screen position so nearer characters draw in front.
 *
 * Also owns the M3 power bar (CLAUDE.md section 5): it fills passively and
 * Dash spends a slice of it directly. Power şut/tutuş spend it through
 * `spendPower()`, called from MatchScene/AIKeeper.
 */
export class Character {
  x: number;
  z: number;
  y = 0;
  private vy = 0;
  private readonly bounds: CharacterBounds;
  private readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  /** Per-character ground-speed multiplier (M4 character stats, 1.0 = base). */
  private readonly speedMultiplier: number;

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

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startZ: number,
    bounds: CharacterBounds,
    color: number,
    speedMultiplier = 1,
  ) {
    this.x = startX;
    this.z = startZ;
    this.bounds = bounds;
    this.speedMultiplier = speedMultiplier;

    this.shadow = scene.add.ellipse(0, 0, CHARACTER_SPRITE_WIDTH * 1.1, CHARACTER_SPRITE_WIDTH * 0.5, 0x000000, 0.35);
    this.sprite = scene.add.rectangle(0, 0, CHARACTER_SPRITE_WIDTH, CHARACTER_HEIGHT, color).setStrokeStyle(1, 0x000000);

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
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
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

    this.sprite.setScale(depthScale);
    this.sprite.setPosition(lifted.screenX, lifted.screenY - (CHARACTER_HEIGHT * depthScale) / 2);

    // Depth sort by ground screenY (not lifted) so jumping never reorders
    // front/back — only z does (CLAUDE.md section 3).
    const depth = Math.round(ground.screenY);
    this.shadow.setDepth(depth - 1);
    this.sprite.setDepth(depth);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
