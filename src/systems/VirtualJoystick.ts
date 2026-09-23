import Phaser from 'phaser';

export interface JoystickVector {
  x: number; // -1..1, screen right is positive
  z: number; // -1..1, pushing the stick "up" (away from viewer) is positive
}

/**
 * On-screen touch/mouse joystick (CLAUDE.md section 4). Drag from inside the
 * base circle; releasing snaps the knob back to center and zeroes the output.
 * Sized generously — mobile-first, touch targets must not be tiny (section 10).
 */
export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly baseX: number;
  private readonly baseY: number;
  private readonly radius: number;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private pointerId: number | null = null;
  private vector: JoystickVector = { x: 0, z: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 60) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.radius = radius;

    this.base = scene.add
      .circle(x, y, radius, 0xffffff, 0.15)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(10000);
    this.knob = scene.add.circle(x, y, radius * 0.45, 0xffffff, 0.35).setDepth(10001);

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.baseX, this.baseY);
    if (dist > this.radius * 1.8) return; // ignore touches far from the stick
    this.pointerId = pointer.id;
    this.updateFromPointer(pointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.updateFromPointer(pointer);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector = { x: 0, z: 0 };
    this.knob.setPosition(this.baseX, this.baseY);
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.min(Math.hypot(dx, dy), this.radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    this.knob.setPosition(this.baseX + kx, this.baseY + ky);
    // Screen-down (positive ky) means "toward the viewer" -> negative z delta.
    this.vector = { x: kx / this.radius, z: -(ky / this.radius) };
  }

  getVector(): JoystickVector {
    return this.vector;
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.scene.input.off('pointerupoutside', this.onPointerUp, this);
    this.base.destroy();
    this.knob.destroy();
  }
}
