import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/arena';
import * as FEEL from '../config/feel';
import { PIXEL_FONT_KEY, toHudText } from '../config/hud';
import { elementColor, type ElementId } from '../config/elements';

/**
 * Goal celebration (M6.4): name band + slow-motion replay for power goals.
 * Purely cosmetic — MatchScene keeps gameplay frozen while these play.
 */

/** Slanted "GOL!" band with the scorer's name, sliding in from their side. */
export function playGoalBand(
  scene: Phaser.Scene,
  name: string,
  side: 'left' | 'right',
  level: number,
  element: ElementId,
): void {
  const dir = side === 'left' ? 1 : -1;
  const cy = GAME_HEIGHT / 2;
  const h = FEEL.GOAL_BAND_HEIGHT;
  const s = FEEL.GOAL_BAND_SLANT;
  const edge = level > 0 ? elementColor(element, level) : FEEL.GOAL_EDGE_COLOR;
  const total = FEEL.GOAL_BAND_SECONDS * 1000;
  const slide = total * FEEL.GOAL_BAND_SLIDE_FRACTION;

  const root = scene.add.container(-dir * GAME_WIDTH, 0).setDepth(FEEL.GOAL_BAND_DEPTH);
  const band = scene.add.graphics();
  const top = cy - h / 2;
  const bottom = cy + h / 2;
  const pts = [
    new Phaser.Math.Vector2(-s, top + s * dir * 0.5),
    new Phaser.Math.Vector2(GAME_WIDTH + s, top - s * dir * 0.5),
    new Phaser.Math.Vector2(GAME_WIDTH + s, bottom - s * dir * 0.5),
    new Phaser.Math.Vector2(-s, bottom + s * dir * 0.5),
  ];
  band.fillStyle(FEEL.GOAL_BAND_COLOR, FEEL.GOAL_BAND_ALPHA);
  band.fillPoints(pts, true);
  band.lineStyle(4, edge, 1);
  band.lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  band.lineBetween(pts[3].x, pts[3].y, pts[2].x, pts[2].y);
  root.add(band);

  const title = scene.add
    .bitmapText(GAME_WIDTH / 2, cy - 14, PIXEL_FONT_KEY, toHudText(FEEL.GOAL_TITLE))
    .setScale(FEEL.GOAL_TITLE_SCALE * FEEL.GOAL_TITLE_POP)
    .setOrigin(0.5)
    .setTint(edge);
  const nameText = scene.add
    .bitmapText(GAME_WIDTH / 2, cy + 38, PIXEL_FONT_KEY, toHudText(name))
    .setScale(FEEL.GOAL_NAME_SCALE)
    .setOrigin(0.5);
  root.add([title, nameText]);

  scene.tweens.add({ targets: root, x: 0, duration: slide, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: title, scale: FEEL.GOAL_TITLE_SCALE, delay: slide, duration: slide, ease: 'Back.easeOut' });
  scene.tweens.add({
    targets: root,
    alpha: 0,
    delay: total - slide,
    duration: slide,
    onComplete: () => root.destroy(),
  });
}

type Visual = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.Visible &
  Phaser.GameObjects.Components.Depth &
  Phaser.GameObjects.Components.AlphaSingle;

interface ObjState {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  visible: boolean;
  depth: number;
  texture?: string;
  flipX?: boolean;
}

interface Frame {
  t: number;
  objs: ObjState[];
}

function snap(o: Visual): ObjState {
  const st: ObjState = {
    x: o.x,
    y: o.y,
    scaleX: o.scaleX,
    scaleY: o.scaleY,
    rotation: o.rotation,
    alpha: o.alpha,
    visible: o.visible,
    depth: o.depth,
  };
  if (o instanceof Phaser.GameObjects.Image) {
    st.texture = o.texture.key;
    st.flipX = o.flipX;
  }
  return st;
}

function apply(o: Visual, a: ObjState, b: ObjState, f: number): void {
  const lerp = Phaser.Math.Linear;
  o.setPosition(lerp(a.x, b.x, f), lerp(a.y, b.y, f));
  o.setScale(lerp(a.scaleX, b.scaleX, f), lerp(a.scaleY, b.scaleY, f));
  o.setRotation(f < 0.5 ? a.rotation : b.rotation);
  o.setAlpha(lerp(a.alpha, b.alpha, f));
  o.setVisible(f < 0.5 ? a.visible : b.visible);
  o.setDepth(f < 0.5 ? a.depth : b.depth);
  const pick = f < 0.5 ? a : b;
  if (o instanceof Phaser.GameObjects.Image && pick.texture) {
    if (o.texture.key !== pick.texture) o.setTexture(pick.texture);
    o.setFlipX(pick.flipX ?? false);
  }
}

/**
 * Records the on-screen state of the players and the ball every simulated
 * frame (a short ring buffer), and plays it back in slow motion by moving
 * those same display objects — no second copy of the scene. When playback
 * ends the objects are put back exactly as they were.
 */
export class ReplayRecorder {
  private frames: Frame[] = [];
  private clock = 0;
  /** Buffer time of the last strike/clash — playback starts a little
   * before it instead of at the (possibly idle) start of the buffer. */
  private lastStrikeT = -Infinity;
  private playing: { frames: Frame[]; t: number; live: ObjState[]; overlay: Phaser.GameObjects.Container } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly targets: Visual[],
  ) {}

  get isPlaying(): boolean {
    return this.playing !== null;
  }

  /** Seconds of real time a replay of the current buffer takes. */
  get playbackSeconds(): number {
    const frames = this.trimmed();
    if (frames.length < 2) return 0;
    return (frames[frames.length - 1].t - frames[0].t) / FEEL.REPLAY_SPEED;
  }

  capture(dt: number): void {
    if (this.playing) return;
    this.clock += dt;
    this.frames.push({ t: this.clock, objs: this.targets.map(snap) });
    const cutoff = this.clock - FEEL.REPLAY_BUFFER_SECONDS;
    while (this.frames.length > 2 && this.frames[0].t < cutoff) this.frames.shift();
  }

  clear(): void {
    this.frames = [];
  }

  /** A strike or clash just happened (impact bus). */
  markStrike(): void {
    this.lastStrikeT = this.clock;
  }

  /** Frames from REPLAY_LEAD_SECONDS before the last strike onward. */
  private trimmed(): Frame[] {
    const from = this.lastStrikeT - FEEL.REPLAY_LEAD_SECONDS;
    const i = this.frames.findIndex((f) => f.t >= from);
    if (i <= 0 || this.frames.length - i < 2) return this.frames;
    return this.frames.slice(i);
  }

  /** Start slow-motion playback of the buffer. Returns false if empty. */
  play(): boolean {
    const frames = this.trimmed();
    if (frames.length < 2 || this.playing) return false;
    const overlay = this.scene.add.container(0, 0).setDepth(FEEL.REPLAY_DEPTH);
    const barH = FEEL.REPLAY_BAR_HEIGHT;
    overlay.add(this.scene.add.rectangle(GAME_WIDTH / 2, barH / 2, GAME_WIDTH, barH, FEEL.REPLAY_BAR_COLOR));
    overlay.add(this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - barH / 2, GAME_WIDTH, barH, FEEL.REPLAY_BAR_COLOR));
    const label = this.scene.add
      .bitmapText(GAME_WIDTH - 20, barH / 2, PIXEL_FONT_KEY, toHudText(FEEL.REPLAY_LABEL))
      .setScale(FEEL.REPLAY_LABEL_SCALE)
      .setOrigin(1, 0.5)
      .setTint(FEEL.REPLAY_LABEL_COLOR);
    overlay.add(label);
    this.scene.tweens.add({ targets: label, alpha: 0.2, duration: FEEL.REPLAY_LABEL_BLINK_MS / 2, yoyo: true, repeat: -1 });
    this.playing = { frames, t: frames[0].t, live: this.targets.map(snap), overlay };
    this.frames = [];
    this.show(this.playing.t);
    return true;
  }

  /** Advance playback by `dt` real seconds; returns true while still playing. */
  update(dt: number): boolean {
    const p = this.playing;
    if (!p) return false;
    p.t += dt * FEEL.REPLAY_SPEED;
    if (p.t >= p.frames[p.frames.length - 1].t) {
      this.stop();
      return false;
    }
    this.show(p.t);
    return true;
  }

  /** End playback and restore the live state. */
  stop(): void {
    const p = this.playing;
    if (!p) return;
    this.targets.forEach((o, i) => apply(o, p.live[i], p.live[i], 0));
    p.overlay.destroy();
    this.playing = null;
  }

  private show(t: number): void {
    const frames = this.playing!.frames;
    let i = 0;
    while (i < frames.length - 2 && frames[i + 1].t <= t) i += 1;
    const a = frames[i];
    const b = frames[i + 1];
    const f = Phaser.Math.Clamp((t - a.t) / Math.max(1e-6, b.t - a.t), 0, 1);
    this.targets.forEach((o, k) => apply(o, a.objs[k], b.objs[k], f));
  }
}
