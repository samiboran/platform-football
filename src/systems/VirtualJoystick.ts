import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as C from '../config/controls';

export interface JoystickVector {
  x: number; // -1..1, screen right is positive
  z: number; // -1..1, pushing the stick "up" (away from viewer) is positive
}

/**
 * Floating on-screen joystick (CLAUDE.md section 4). A touch anywhere in the
 * left zone (JOYSTICK_ZONE_*) drops the stick's base under the thumb; drag
 * to steer. Dragging past the radius pulls the base along (JOYSTICK_FOLLOW)
 * so the thumb never has to travel back to a fixed spot. Output has a small
 * dead zone and is rescaled so it still reaches full magnitude.
 */
export class VirtualJoystick {
  private readonly scene: Phaser.Scene;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;
  private baseX = C.JOYSTICK_REST_X;
  private baseY = C.JOYSTICK_REST_Y;
  private pointerId: number | null = null;
  private vector: JoystickVector = { x: 0, z: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.base = scene.add
      .circle(this.baseX, this.baseY, C.JOYSTICK_RADIUS, 0xffffff, 0.15)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(10000);
    this.knob = scene.add.circle(this.baseX, this.baseY, C.JOYSTICK_RADIUS * 0.45, 0xffffff, 0.35).setDepth(10001);
    this.setActiveLook(false);

    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
  }

  /** True if a screen point belongs to the joystick zone. */
  static inZone(x: number, y: number): boolean {
    return x < GAME_WIDTH * C.JOYSTICK_ZONE_WIDTH_FRACTION && y > C.JOYSTICK_ZONE_TOP && y < GAME_HEIGHT;
  }

  private setActiveLook(active: boolean): void {
    const a = active ? C.JOYSTICK_ACTIVE_ALPHA : C.JOYSTICK_IDLE_ALPHA;
    this.base.setAlpha(a);
    this.knob.setAlpha(a);
  }

  private placeBase(x: number, y: number): void {
    // Keep the whole stick on screen.
    const r = C.JOYSTICK_RADIUS;
    this.baseX = Phaser.Math.Clamp(x, r, GAME_WIDTH - r);
    this.baseY = Phaser.Math.Clamp(y, r, GAME_HEIGHT - r);
    this.base.setPosition(this.baseX, this.baseY);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null) return;
    if (!VirtualJoystick.inZone(pointer.x, pointer.y)) return;
    this.pointerId = pointer.id;
    this.placeBase(pointer.x, pointer.y);
    this.setActiveLook(true);
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
    this.placeBase(C.JOYSTICK_REST_X, C.JOYSTICK_REST_Y);
    this.knob.setPosition(this.baseX, this.baseY);
    this.setActiveLook(false);
  }

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const r = C.JOYSTICK_RADIUS;
    let dx = pointer.x - this.baseX;
    let dy = pointer.y - this.baseY;
    let dist = Math.hypot(dx, dy);
    if (dist > r && C.JOYSTICK_FOLLOW) {
      // Drag the base along behind the thumb.
      this.baseX = pointer.x - (dx / dist) * r;
      this.baseY = pointer.y - (dy / dist) * r;
      this.base.setPosition(this.baseX, this.baseY);
      dx = pointer.x - this.baseX;
      dy = pointer.y - this.baseY;
      dist = r;
    }
    const clamped = Math.min(dist, r);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.knob.setPosition(this.baseX + nx * clamped, this.baseY + ny * clamped);

    // Dead zone, then rescale so the edge of the dead zone maps to 0 and
    // the rim to 1.
    const t = clamped / r;
    const mag = t <= C.JOYSTICK_DEAD_ZONE ? 0 : (t - C.JOYSTICK_DEAD_ZONE) / (1 - C.JOYSTICK_DEAD_ZONE);
    // Screen-down (positive dy) means "toward the viewer" -> negative z.
    this.vector = { x: nx * mag, z: -ny * mag };
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
