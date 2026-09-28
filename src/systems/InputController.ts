import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';

/** One on-screen circular button: tracks held state + edge-triggered press. */
class TouchButton {
  private held = false;
  private consumed = false;
  readonly circle: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, label: string) {
    this.circle = scene.add
      .circle(x, y, radius, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    scene.add
      .text(x, y, label, { fontFamily: 'monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(10001);

    this.circle.on('pointerdown', () => {
      this.held = true;
    });
    this.circle.on('pointerup', () => {
      this.held = false;
    });
    this.circle.on('pointerout', () => {
      this.held = false;
    });
  }

  isHeld(keyDown: boolean): boolean {
    return this.held || keyDown;
  }

  /** Edge-triggered: true only on the frame this input transitions to down. */
  consumePressed(keyDown: boolean): boolean {
    const down = this.held || keyDown;
    if (down && !this.consumed) {
      this.consumed = true;
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

  constructor(scene: Phaser.Scene, joystickX: number, joystickY: number, clusterX: number, clusterY: number) {
    this.joystick = new VirtualJoystick(scene, joystickX, joystickY);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.actionKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.specialKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Diamond cluster: Zıpla (N), Özellik (E), Aksiyon (S, biggest/primary), Dash (W).
    const r = 46;
    this.jumpBtn = new TouchButton(scene, clusterX, clusterY - r, 28, 'ZIPLA');
    this.specialBtn = new TouchButton(scene, clusterX + r, clusterY, 28, 'ÖZEL');
    this.actionBtn = new TouchButton(scene, clusterX, clusterY + r, 32, 'AKSİYON');
    this.dashBtn = new TouchButton(scene, clusterX - r, clusterY, 28, 'DASH');
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

  /** Held state (not edge-triggered) — Aksiyon+Özellik together = power
   * version of the shot/catch (CLAUDE.md section 4). */
  isSpecialHeld(): boolean {
    return this.specialBtn.isHeld(this.specialKey.isDown);
  }

  /** Özellik pressed alone (not combined with Aksiyon) — the 3-segment
   * super move trigger. Edge-triggered. */
  consumeSpecialAlonePressed(): boolean {
    const pressed = this.specialBtn.consumePressed(this.specialKey.isDown);
    return pressed && !this.actionBtn.isHeld(this.actionKey.isDown);
  }

  destroy(): void {
    this.joystick.destroy();
    this.jumpBtn.destroy();
    this.actionBtn.destroy();
    this.dashBtn.destroy();
    this.specialBtn.destroy();
  }
}
