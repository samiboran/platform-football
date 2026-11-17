import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';
import * as C from '../config/controls';
import { PIXEL_FONT_KEY, toHudText } from '../config/hud';

/** One on-screen circular button: tracks held state + edge-triggered press. */
class TouchButton {
  private held = false;
  private consumed = false;
  private pressLatched = false;
  private pointerId = -1;
  readonly circle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string) {
    // Hit area is a bit larger than the drawn circle (BUTTON_HIT_SCALE) —
    // a thumb rarely lands dead center.
    const hitR = radius * C.BUTTON_HIT_SCALE;
    this.circle = scene.add
      .circle(x, y, radius, C.BUTTON_FILL_COLOR, C.BUTTON_FILL_ALPHA)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(10000)
      .setInteractive({
        hitArea: new Phaser.Geom.Circle(radius, radius, hitR),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
      });
    scene.add
      .bitmapText(x, y + 1, PIXEL_FONT_KEY, toHudText(label))
      .setScale(C.BUTTON_LABEL_SCALE)
      .setOrigin(0.5)
      .setDepth(10001);

    // Track the pointer that pressed this button. Release is detected on a
    // scene-wide pointerup for that pointer, NOT on pointerout — a thumb
    // sliding a little off the button must not count as letting go (it
    // would fire a charged shot early).
    this.circle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.held = true;
      this.pointerId = pointer.id;
      // Latched until consumed, so a tap that goes down and up between two
      // frames (likely on a slow phone) still registers.
      this.pressLatched = true;
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.pointerId) {
        this.held = false;
        this.pointerId = -1;
      }
    });
  }

  isHeld(keyDown: boolean): boolean {
    return this.held || keyDown;
  }

  /** Visual glow toggle — used for Kongo's rhythm "sweet spot" cue on Özel. */
  setActive(active: boolean): void {
    this.circle.setFillStyle(
      active ? C.BUTTON_ACTIVE_COLOR : C.BUTTON_FILL_COLOR,
      active ? C.BUTTON_ACTIVE_ALPHA : C.BUTTON_FILL_ALPHA,
    );
  }

  /** Edge-triggered: true only on the frame this input transitions to down. */
  consumePressed(keyDown: boolean): boolean {
    const down = this.held || keyDown;
    if (this.pressLatched || (down && !this.consumed)) {
      this.pressLatched = false;
      this.consumed = down;
      return true;
    }
    if (!down) this.consumed = false;
    return false;
  }

  destroy(): void {
    this.circle.destroy();
  }
}

/**
 * Merges the on-screen joystick + 4 buttons (touch) with keyboard (PC,
 * CLAUDE.md section 4): arrows/joystick for movement, Space=Zıpla,
 * Z=Aksiyon, X=Dash, C=Özellik.
 */
export class InputController {
  private readonly joystick: VirtualJoystick;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly actionKey: Phaser.Input.Keyboard.Key;
  private readonly dashKey: Phaser.Input.Keyboard.Key;
  private readonly specialKey: Phaser.Input.Keyboard.Key;

  private readonly jumpBtn: TouchButton;
  private readonly actionBtn: TouchButton;
  private readonly dashBtn: TouchButton;
  private readonly specialBtn: TouchButton;

  /** Tracks an in-progress Özellik hold, for consumeSpecialReleased(). */
  private specialWasDown = false;
  /** True if Aksiyon was pressed at any point during the current/last
   * Özellik hold — if so, that hold was a power şut/tutuş combo, not a
   * request for the 3-segment süper hareket. */
  private actionUsedDuringSpecialHold = false;

  constructor(scene: Phaser.Scene) {
    this.joystick = new VirtualJoystick(scene);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    // Space = Aksiyon (primary action, most reached-for key) — swapped from
    // an earlier Z/Space layout after real-world testing showed players
    // expect Space to shoot.
    this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.actionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.specialKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Diamond cluster: Zıpla (N), Özellik (E), Aksiyon (S, biggest/primary), Dash (W).
    const cx = C.BUTTON_CLUSTER_X;
    const cy = C.BUTTON_CLUSTER_Y;
    const r = C.BUTTON_SPACING;
    this.jumpBtn = new TouchButton(scene, cx, cy - r, C.BUTTON_RADIUS, 'Zıpla');
    this.specialBtn = new TouchButton(scene, cx + r, cy, C.BUTTON_RADIUS, 'Özel');
    this.actionBtn = new TouchButton(scene, cx, cy + r, C.BUTTON_ACTION_RADIUS, 'Aksiyon');
    this.dashBtn = new TouchButton(scene, cx - r, cy, C.BUTTON_RADIUS, 'Dash');
  }

  getMoveVector(): { x: number; z: number } {
    const joystickVector = this.joystick.getVector();
    if (joystickVector.x !== 0 || joystickVector.z !== 0) return joystickVector;

    let x = 0;
    let z = 0;
    if (this.cursors.left?.isDown) x -= 1;
    if (this.cursors.right?.isDown) x += 1;
    if (this.cursors.up?.isDown) z += 1;
    if (this.cursors.down?.isDown) z -= 1;
    if (x !== 0 && z !== 0) {
      const len = Math.hypot(x, z);
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  /** True only on the frame jump input transitions from up to down. */
  consumeJumpPressed(): boolean {
    return this.jumpBtn.consumePressed(this.jumpKey.isDown);
  }

  consumeDashPressed(): boolean {
    return this.dashBtn.consumePressed(this.dashKey.isDown);
  }

  /** True only on the frame Aksiyon transitions from up to down. */
  consumeActionPressed(): boolean {
    return this.actionBtn.consumePressed(this.actionKey.isDown);
  }

  /** Held state of Aksiyon — hold-to-charge power shot (M6.2). */
  isActionHeld(): boolean {
    return this.actionBtn.isHeld(this.actionKey.isDown);
  }

  /** Held state (not edge-triggered) of Özellik. Since M6.3 neither power
   * shots nor catches use Özellik+Aksiyon (shot = hold-to-charge, catch
   * power is committed automatically by the clash table). */
  isSpecialHeld(): boolean {
    return this.specialBtn.isHeld(this.specialKey.isDown);
  }

  /** The 3-segment süper hareket trigger — edge-triggered on Özellik's
   * RELEASE, not its press. Özellik+Aksiyon together is how a power şut/
   * tutuş combo works (CLAUDE.md section 5); if süper fired the instant
   * Özellik went down, a player could never reach that combo — Aksiyon
   * would never get pressed because the süper already used up the power
   * bar. So: hold Özellik, and if Aksiyon is never pressed during that
   * hold, releasing Özellik fires the süper. If Aksiyon WAS pressed during
   * the hold, that was a power şut/tutuş attempt instead — no süper. */
  consumeSpecialReleased(): boolean {
    const specialDown = this.specialBtn.isHeld(this.specialKey.isDown);
    if (specialDown) {
      if (this.actionBtn.isHeld(this.actionKey.isDown)) {
        this.actionUsedDuringSpecialHold = true;
      }
      this.specialWasDown = true;
      return false;
    }
    if (!this.specialWasDown) return false;
    this.specialWasDown = false;
    const fire = !this.actionUsedDuringSpecialHold;
    this.actionUsedDuringSpecialHold = false;
    return fire;
  }

  /** Throw away any pending presses (used while controls are locked after
   * a goal, so a button held through the freeze doesn't fire afterwards). */
  drainPresses(): void {
    this.consumeActionPressed();
    this.consumeJumpPressed();
    this.consumeDashPressed();
    this.consumeSpecialReleased();
  }

  /** Visual glow toggle — used for Kongo's rhythm "sweet spot" cue on Özel. */
  setSpecialGlow(active: boolean): void {
    this.specialBtn.setActive(active);
  }

  destroy(): void {
    this.joystick.destroy();
    this.jumpBtn.destroy();
    this.actionBtn.destroy();
    this.dashBtn.destroy();
    this.specialBtn.destroy();
  }
}
