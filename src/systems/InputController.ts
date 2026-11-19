import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';
import * as C from '../config/controls';
import { PIXEL_FONT_KEY, toHudText } from '../config/hud';
import { touchLayout } from './settings';

/** One on-screen circular button: tracks held state + edge-triggered press. */
class TouchButton {
  private held = false;
  private consumed = false;
  private pressLatched = false;
  private pointerId = -1;
  readonly circle: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly ring: Phaser.GameObjects.Graphics;
  private available = true;
  private glow = false;

  /** Overall control opacity from Ayarlar (multiplies every alpha). */
  private readonly opacity: number;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string, opacity = 1) {
    this.opacity = opacity;
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
    this.label = scene.add
      .bitmapText(x, y + 1, PIXEL_FONT_KEY, toHudText(label))
      .setScale(C.BUTTON_LABEL_SCALE)
      .setOrigin(0.5)
      .setDepth(10001);
    this.ring = scene.add.graphics().setDepth(10002).setPosition(x, y);
    this.radius = radius;
    this.refreshFill();

    // Track the pointer that pressed this button. Release is detected on a
    // scene-wide pointerup for that pointer, NOT on pointerout — a thumb
    // sliding a little off the button must not count as letting go (it
    // would fire a charged shot early).
    this.circle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Mouse clicks are Aksiyon / Özel on PC (InputController), not taps
      // on these on-screen buttons.
      if (!pointer.wasTouch) return;
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

  /** Count a press that may be shorter than one frame (mouse click). */
  latch(): void {
    this.pressLatched = true;
  }

  isHeld(keyDown: boolean): boolean {
    return this.held || keyDown;
  }

  private readonly radius: number;

  /** Visual glow toggle — used for Kongo's rhythm "sweet spot" cue on Özel. */
  setActive(active: boolean): void {
    this.glow = active;
    this.refreshFill();
  }

  /** M7.3: dim a button whose action can't happen right now (still
   * pressable — presses are buffered as before). */
  setAvailable(available: boolean): void {
    if (available === this.available) return;
    this.available = available;
    this.refreshFill();
  }

  /** M7.3: charge ring around the button, 0..1 of a full circle. */
  setRing(fraction: number, color: number): void {
    this.ring.clear();
    if (fraction <= 0) return;
    this.ring.lineStyle(C.BUTTON_RING_WIDTH, color, this.opacity);
    this.ring.beginPath();
    this.ring.arc(0, 0, this.radius + C.BUTTON_RING_GAP, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fraction));
    this.ring.strokePath();
  }

  private refreshFill(): void {
    this.circle.setFillStyle(
      this.glow ? C.BUTTON_ACTIVE_COLOR : C.BUTTON_FILL_COLOR,
      this.glow ? C.BUTTON_ACTIVE_ALPHA : C.BUTTON_FILL_ALPHA,
    );
    const a = (this.available ? 1 : C.BUTTON_UNAVAILABLE_ALPHA) * this.opacity;
    this.circle.setAlpha(a);
    this.label.setAlpha(a);
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
    this.label.destroy();
    this.ring.destroy();
  }
}

/**
 * Merges the on-screen joystick + 4 buttons (touch) with keyboard (PC,
 * CLAUDE.md section 4): arrows/joystick for movement, Space=Zıpla,
 * Space=Zıpla, Shift=Dash, mouse left / J = Aksiyon, mouse right / E = Özel.
 */
export class InputController {
  private readonly joystick: VirtualJoystick;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly actionKey: Phaser.Input.Keyboard.Key;
  private readonly dashKey: Phaser.Input.Keyboard.Key;
  private readonly specialKey: Phaser.Input.Keyboard.Key;
  /** PC mouse (Sami 17.11): left = Aksiyon, right = Özel. */
  private mouseAction = false;
  private mouseSpecial = false;
  /** A right-click shorter than a frame still counts as an Özel release. */
  private specialClickLatched = false;

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
    // M9.2: size / opacity / left-hand layout from the Ayarlar screen.
    const layout = touchLayout();
    this.joystick = new VirtualJoystick(scene, layout);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    // PC layout (Sami 17.11.2026): WASD (arrows also work) move, Space
    // jump, Shift dash, mouse left = Aksiyon, mouse right = Özel. J / E are
    // keyboard fallbacks for Aksiyon / Özel (trackpads).
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.wasd = {
      up: keyboard.addKey(K.W),
      left: keyboard.addKey(K.A),
      down: keyboard.addKey(K.S),
      right: keyboard.addKey(K.D),
    };
    this.jumpKey = keyboard.addKey(K.SPACE);
    this.actionKey = keyboard.addKey(K.J);
    this.dashKey = keyboard.addKey(K.SHIFT);
    this.specialKey = keyboard.addKey(K.E);

    const onDown = (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (pointer.wasTouch || over.length > 0) return; // UI (pause etc.) clicks aren't shots
      if (pointer.rightButtonDown()) {
        this.mouseSpecial = true;
      } else if (pointer.leftButtonDown()) {
        this.mouseAction = true;
        this.actionBtn.latch();
      }
    };
    const onUp = (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) return;
      if (!pointer.leftButtonDown()) this.mouseAction = false;
      if (this.mouseSpecial && !pointer.rightButtonDown()) {
        this.mouseSpecial = false;
        this.specialClickLatched = true;
      }
    };
    scene.input.on('pointerdown', onDown);
    scene.input.on('pointerup', onUp);
    scene.input.on('pointerupoutside', onUp);

    // Diamond cluster: Zıpla (N), Özellik (E), Aksiyon (S, biggest/primary), Dash (W).
    // Left-handed layout mirrors the cluster (Özel stays on the outer edge).
    const cx = layout.clusterX;
    const cy = layout.clusterY;
    const r = layout.spacing;
    const outer = layout.leftHanded ? -r : r;
    const a = layout.alpha;
    this.jumpBtn = new TouchButton(scene, cx, cy - r, layout.buttonRadius, 'Zıpla', a);
    this.specialBtn = new TouchButton(scene, cx + outer, cy, layout.buttonRadius, 'Özel', a);
    this.actionBtn = new TouchButton(scene, cx, cy + r, layout.actionRadius, 'Aksiyon', a);
    this.dashBtn = new TouchButton(scene, cx - outer, cy, layout.buttonRadius, 'Dash', a);
  }

  getMoveVector(): { x: number; z: number } {
    const joystickVector = this.joystick.getVector();
    if (joystickVector.x !== 0 || joystickVector.z !== 0) return joystickVector;

    let x = 0;
    let z = 0;
    if (this.cursors.left?.isDown || this.wasd.left.isDown) x -= 1;
    if (this.cursors.right?.isDown || this.wasd.right.isDown) x += 1;
    if (this.cursors.up?.isDown || this.wasd.up.isDown) z += 1;
    if (this.cursors.down?.isDown || this.wasd.down.isDown) z -= 1;
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
    return this.actionBtn.consumePressed(this.actionDown());
  }

  /** Held state of Aksiyon — hold-to-charge power shot (M6.2). */
  isActionHeld(): boolean {
    return this.actionBtn.isHeld(this.actionDown());
  }

  /** Held state (not edge-triggered) of Özellik. Since M6.3 neither power
   * shots nor catches use Özellik+Aksiyon (shot = hold-to-charge, catch
   * power is committed automatically by the clash table). */
  isSpecialHeld(): boolean {
    return this.specialBtn.isHeld(this.specialDown());
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
    const specialDown = this.specialBtn.isHeld(this.specialDown());
    if (specialDown) {
      if (this.actionBtn.isHeld(this.actionDown())) {
        this.actionUsedDuringSpecialHold = true;
      }
      this.specialWasDown = true;
      return false;
    }
    if (this.specialClickLatched) {
      this.specialClickLatched = false;
      this.specialWasDown = true;
    }
    if (!this.specialWasDown) return false;
    this.specialWasDown = false;
    const fire = !this.actionUsedDuringSpecialHold;
    this.actionUsedDuringSpecialHold = false;
    return fire;
  }

  private actionDown(): boolean {
    return this.actionKey.isDown || this.mouseAction;
  }

  private specialDown(): boolean {
    return this.specialKey.isDown || this.mouseSpecial;
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

  /** M7.3 button state: dash / özel availability and Aksiyon's charge ring. */
  setDashAvailable(on: boolean): void {
    this.dashBtn.setAvailable(on);
  }

  setSpecialAvailable(on: boolean): void {
    this.specialBtn.setAvailable(on);
  }

  setActionRing(fraction: number, color: number): void {
    this.actionBtn.setRing(fraction, color);
  }

  destroy(): void {
    this.joystick.destroy();
    this.jumpBtn.destroy();
    this.actionBtn.destroy();
    this.dashBtn.destroy();
    this.specialBtn.destroy();
  }
}
