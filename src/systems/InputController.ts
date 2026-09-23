import Phaser from 'phaser';
import { VirtualJoystick } from './VirtualJoystick';

/**
 * Merges the on-screen joystick (touch) with keyboard arrows (PC, CLAUDE.md
 * section 4) for movement, plus a single jump input for M1. The other three
 * buttons (Aksiyon/Dash/Özellik) land in M3.
 */
export class InputController {
  private readonly joystick: VirtualJoystick;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;
  private readonly jumpButton: Phaser.GameObjects.Arc;
  private jumpButtonHeld = false;
  private jumpConsumedThisPress = false;

  constructor(scene: Phaser.Scene, joystickX: number, joystickY: number, jumpX: number, jumpY: number) {
    this.joystick = new VirtualJoystick(scene, joystickX, joystickY);

    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.jumpButton = scene.add
      .circle(jumpX, jumpY, 40, 0xffffff, 0.2)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    scene.add
      .text(jumpX, jumpY, 'ZIPLA', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(10001);

    this.jumpButton.on('pointerdown', () => {
      this.jumpButtonHeld = true;
    });
    this.jumpButton.on('pointerup', () => {
      this.jumpButtonHeld = false;
    });
    this.jumpButton.on('pointerout', () => {
      this.jumpButtonHeld = false;
    });
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
    const down = this.jumpButtonHeld || this.jumpKey.isDown;
    if (down && !this.jumpConsumedThisPress) {
      this.jumpConsumedThisPress = true;
      return true;
    }
    if (!down) this.jumpConsumedThisPress = false;
    return false;
  }

  destroy(): void {
    this.joystick.destroy();
    this.jumpButton.destroy();
  }
}
