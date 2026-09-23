import Phaser from 'phaser';
import {
  BALL_RADIUS,
  DEPTH_MIN,
  DEPTH_MAX,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  LEFT_GOAL_BACK_X,
  RIGHT_GOAL_BACK_X,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  projectToScreen,
} from '../config/arena';
import {
  BALL_GRAVITY,
  BALL_BOUNCE_RESTITUTION,
  BALL_MIN_BOUNCE_VY,
  BALL_WALL_RESTITUTION,
  BALL_GROUND_FRICTION,
  BALL_TOUCH_SPEED,
} from '../config/ball';

export type GoalSide = 'left' | 'right' | null;

function dampen(v: number, amount: number): number {
  if (Math.abs(v) <= amount) return 0;
  return v - Math.sign(v) * amount;
}

/**
 * Ball physics: gravity + ground bounce (y), touchline bounce (z), and
 * goal-line handling on x — bounces off the "wall" beside each goal, but
 * passes through into the net pocket when z is within the goal mouth,
 * bouncing off the net's back instead and reporting which side scored.
 * Renders the same way as Character: a sprite + a mandatory ground shadow,
 * both scaled by the shared depth factor (CLAUDE.md section 3).
 */
export class Ball {
  x: number;
  z: number;
  y: number;
  vx = 0;
  vz = 0;
  vy = 0;
  private readonly sprite: Phaser.GameObjects.Ellipse;
  private readonly shadow: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, startX: number, startZ: number, startY = 40) {
    this.x = startX;
    this.z = startZ;
    this.y = startY;

    this.shadow = scene.add.ellipse(0, 0, BALL_RADIUS * 2.2, BALL_RADIUS * 1.1, 0x000000, 0.35);
    this.sprite = scene.add.ellipse(0, 0, BALL_RADIUS * 2, BALL_RADIUS * 2, 0xffffff).setStrokeStyle(1, 0x333333);

    this.syncTransform();
  }

  reset(x: number, z: number, y = 40): void {
    this.x = x;
    this.z = z;
    this.y = y;
    this.vx = 0;
    this.vz = 0;
    this.vy = 0;
    this.syncTransform();
  }

  /** M2's simple contact response: push the ball along the toucher's move
   * direction, or straight away from them if they're standing still. */
  applyTouch(moveX: number, moveZ: number, pushX: number, pushZ: number): void {
    let ix = moveX;
    let iz = moveZ;
    if (ix === 0 && iz === 0) {
      const len = Math.hypot(pushX, pushZ) || 1;
      ix = pushX / len;
      iz = pushZ / len;
    }
    this.vx = ix * BALL_TOUCH_SPEED;
    this.vz = iz * BALL_TOUCH_SPEED;
  }

  update(delta: number): GoalSide {
    const dt = delta / 1000;
    let scored: GoalSide = null;

    // Gravity + ground bounce.
    this.vy -= BALL_GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy) > BALL_MIN_BOUNCE_VY ? -this.vy * BALL_BOUNCE_RESTITUTION : 0;
    }

    // Ground friction while rolling.
    if (this.y === 0) {
      this.vx = dampen(this.vx, BALL_GROUND_FRICTION * dt);
      this.vz = dampen(this.vz, BALL_GROUND_FRICTION * dt);
    }

    const prevX = this.x;
    this.x += this.vx * dt;
    this.z += this.vz * dt;

    // Touchline bounce.
    if (this.z < DEPTH_MIN) {
      this.z = DEPTH_MIN;
      this.vz = -this.vz * BALL_WALL_RESTITUTION;
    } else if (this.z > DEPTH_MAX) {
      this.z = DEPTH_MAX;
      this.vz = -this.vz * BALL_WALL_RESTITUTION;
    }

    const inGoalMouth = this.z >= GOAL_MOUTH_Z_MIN && this.z <= GOAL_MOUTH_Z_MAX;

    if (this.x < LEFT_GOAL_LINE_X) {
      if (inGoalMouth) {
        if (prevX >= LEFT_GOAL_LINE_X) scored = 'left';
        if (this.x < LEFT_GOAL_BACK_X) {
          this.x = LEFT_GOAL_BACK_X;
          this.vx = -this.vx * BALL_WALL_RESTITUTION;
        }
      } else {
        this.x = LEFT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      }
    } else if (this.x > RIGHT_GOAL_LINE_X) {
      if (inGoalMouth) {
        if (prevX <= RIGHT_GOAL_LINE_X) scored = 'right';
        if (this.x > RIGHT_GOAL_BACK_X) {
          this.x = RIGHT_GOAL_BACK_X;
          this.vx = -this.vx * BALL_WALL_RESTITUTION;
        }
      } else {
        this.x = RIGHT_GOAL_LINE_X;
        this.vx = -this.vx * BALL_WALL_RESTITUTION;
      }
    }

    this.syncTransform();
    return scored;
  }

  private syncTransform(): void {
    const ground = projectToScreen(this.x, this.z, 0);
    const lifted = projectToScreen(this.x, this.z, this.y);
    const scale = ground.scale;

    this.shadow.setPosition(ground.screenX, ground.screenY);
    this.shadow.setScale(scale);

    this.sprite.setScale(scale);
    this.sprite.setPosition(lifted.screenX, lifted.screenY - BALL_RADIUS * scale);

    // Ball renders just above a character standing on the same ground row.
    const depth = Math.round(ground.screenY);
    this.shadow.setDepth(depth - 1);
    this.sprite.setDepth(depth + 1);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
  }
}
