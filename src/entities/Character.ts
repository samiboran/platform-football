import Phaser from 'phaser';
import { CHARACTER_SPRITE_WIDTH, CHARACTER_HEIGHT, DEPTH_MIN, DEPTH_MAX, projectToScreen } from '../config/arena';
import { MOVE_SPEED, GRAVITY, JUMP_VELOCITY } from '../config/movement';

export interface CharacterBounds {
  minX: number;
  maxX: number;
}

export interface CharacterInput {
  moveX: number; // -1..1
  moveZ: number; // -1..1
  jumpPressed: boolean;
}

/**
 * A single character on the pitch: ground position (x, z) plus jump height
 * (y). Renders a placeholder sprite and a mandatory ground shadow (CLAUDE.md
 * section 3 — depth is unreadable without one), and keeps its Phaser depth
 * synced to its screen position so nearer characters draw in front.
 */
export class Character {
  x: number;
  z: number;
  y = 0;
  private vy = 0;
  private readonly bounds: CharacterBounds;
  private readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, startX: number, startZ: number, bounds: CharacterBounds, color: number) {
    this.x = startX;
    this.z = startZ;
    this.bounds = bounds;

    this.shadow = scene.add.ellipse(0, 0, CHARACTER_SPRITE_WIDTH * 1.1, CHARACTER_SPRITE_WIDTH * 0.5, 0x000000, 0.35);
    this.sprite = scene.add.rectangle(0, 0, CHARACTER_SPRITE_WIDTH, CHARACTER_HEIGHT, color).setStrokeStyle(1, 0x000000);

    this.syncTransform();
  }

  update(delta: number, input: CharacterInput): void {
    const dt = delta / 1000;

    this.x = Phaser.Math.Clamp(this.x + input.moveX * MOVE_SPEED * dt, this.bounds.minX, this.bounds.maxX);
    this.z = Phaser.Math.Clamp(this.z + input.moveZ * MOVE_SPEED * dt, DEPTH_MIN, DEPTH_MAX);

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
