import Phaser from 'phaser';
import * as T from '../config/tutorial';
import * as HUD from '../config/hud';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/arena';
import { HUB_PLAY_COLOR } from '../config/menus';
import { loadPref, savePref } from './prefs';
import { isTouchDevice } from './mobileShell';
import { makeFancyButton, panel, pixelText } from './uiKit';
import { soundFX } from './SoundFX';

/** Has the tutorial ever been auto-started on this device? */
export function tutorialSeen(): boolean {
  return loadPref(T.TUTORIAL_SEEN_KEY) === '1' || loadPref(T.TUTORIAL_DONE_KEY) === '1';
}
export function markTutorialSeen(): void {
  savePref(T.TUTORIAL_SEEN_KEY, '1');
}
export function markTutorialDone(): void {
  savePref(T.TUTORIAL_SEEN_KEY, '1');
  savePref(T.TUTORIAL_DONE_KEY, '1');
}

/** What the match tells the tutorial happened this frame. */
export type TutorialEvent = 'jump' | 'dash' | 'shot' | 'power' | 'lob' | 'catch' | 'perfect' | 'volley' | 'falso' | 'bicycle';

/** How the scene should stage the ball for the current step. */
export type BallMode = 'parked' | 'feet' | 'incoming' | 'toss';

const BALL_MODE: Record<T.TutorialStepId, BallMode> = {
  move: 'parked',
  jump: 'parked',
  dash: 'parked',
  shot: 'feet',
  power: 'feet',
  lob: 'feet',
  catch: 'incoming',
  falso: 'feet',
  bicycle: 'toss',
};

/** Events that count toward each step. */
const COUNTS: Partial<Record<T.TutorialStepId, TutorialEvent[]>> = {
  jump: ['jump'],
  dash: ['dash'],
  shot: ['shot'],
  power: ['power'],
  lob: ['lob'],
  catch: ['catch', 'perfect'],
  falso: ['falso'],
  bicycle: ['bicycle'],
};

/**
 * Step-by-step tutorial driver (M9.2). Owns the instruction panel and the
 * step progression; MatchScene feeds it events and asks it how to stage
 * the ball (ballMode) and whether a step just started (consumeStepStart).
 */
export class Tutorial {
  private index = 0;
  private count = 0;
  private gapRemaining = 0;
  private movedX = 0;
  private movedZ = 0;
  private lastPos: { x: number; z: number } | null = null;
  private stepStarted = true;
  private finished = false;
  private root: Phaser.GameObjects.Container;
  private title: Phaser.GameObjects.BitmapText;
  private hint: Phaser.GameObjects.BitmapText;
  private progress: Phaser.GameObjects.BitmapText;
  private readonly touch = isTouchDevice();

  constructor(private scene: Phaser.Scene, private onFinish: () => void) {
    markTutorialSeen();
    const x = T.TUTORIAL_PANEL_X;
    const y = T.TUTORIAL_PANEL_Y;
    const left = x - T.TUTORIAL_PANEL_W / 2;
    this.root = scene.add.container(0, 0).setDepth(T.TUTORIAL_PANEL_DEPTH);
    this.root.add(panel(scene, x, y, T.TUTORIAL_PANEL_W, T.TUTORIAL_PANEL_H, T.TUTORIAL_PANEL_COLOR, T.TUTORIAL_PANEL_ALPHA, 14));
    this.title = scene.add
      .bitmapText(left + 18, y - T.TUTORIAL_PANEL_H / 2 + 10, HUD.PIXEL_FONT_KEY, '')
      .setScale(T.TUTORIAL_TITLE_SCALE)
      .setTint(T.TUTORIAL_TITLE_COLOR);
    this.progress = scene.add
      .bitmapText(left + T.TUTORIAL_PANEL_W - 18 - T.TUTORIAL_SKIP_W - 14, y - T.TUTORIAL_PANEL_H / 2 + 12, HUD.PIXEL_FONT_KEY, '')
      .setScale(2)
      .setOrigin(1, 0)
      .setTint(T.TUTORIAL_STEP_COUNT_COLOR);
    this.hint = scene.add
      .bitmapText(left + 18, y - T.TUTORIAL_PANEL_H / 2 + 40, HUD.PIXEL_FONT_KEY, '')
      .setScale(T.TUTORIAL_HINT_SCALE)
      .setTint(T.TUTORIAL_HINT_COLOR)
      .setMaxWidth((T.TUTORIAL_PANEL_W - 36) / T.TUTORIAL_HINT_SCALE);
    this.root.add([this.title, this.progress, this.hint]);
    const skip = makeFancyButton(
      scene,
      left + T.TUTORIAL_PANEL_W - 18 - T.TUTORIAL_SKIP_W / 2,
      y - T.TUTORIAL_PANEL_H / 2 + 24,
      T.TUTORIAL_SKIP_W,
      T.TUTORIAL_SKIP_H,
      T.TUTORIAL_SKIP_LABEL,
      T.TUTORIAL_SKIP_COLOR,
      () => {
        markTutorialDone();
        scene.scene.start('Menu');
      },
      { labelScale: 2 },
    );
    this.root.add(skip.container);
    this.render();
  }

  get step(): T.TutorialStepDef {
    return T.TUTORIAL_STEPS[Math.min(this.index, T.TUTORIAL_STEPS.length - 1)];
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Ball staging for the current step (parked while between steps). */
  get ballMode(): BallMode {
    if (this.finished) return 'parked';
    return BALL_MODE[this.step.id];
  }

  /** True once per step, the frame it begins — the scene re-stages the ball. */
  consumeStepStart(): boolean {
    const s = this.stepStarted;
    this.stepStarted = false;
    return s;
  }

  /** Per frame: step gap timer + the walk-distance task. */
  update(dt: number, player: { x: number; z: number }): void {
    if (this.finished) return;
    if (this.gapRemaining > 0) {
      this.gapRemaining -= dt;
      if (this.gapRemaining <= 0) this.advance();
      return;
    }
    if (this.step.id !== 'move') {
      this.lastPos = null;
      return;
    }
    if (this.lastPos) {
      this.movedX += Math.abs(player.x - this.lastPos.x);
      this.movedZ += Math.abs(player.z - this.lastPos.z);
    }
    this.lastPos = { x: player.x, z: player.z };
    const p = Math.min(1, this.movedX / T.TUTORIAL_MOVE_X) * 0.5 + Math.min(1, this.movedZ / T.TUTORIAL_MOVE_Z) * 0.5;
    this.progress.setText(`${Math.round(p * 100)}%`);
    if (this.movedX >= T.TUTORIAL_MOVE_X && this.movedZ >= T.TUTORIAL_MOVE_Z) this.completeStep();
  }

  /** Something happened in the match; counts it if the current step wants it. */
  notify(ev: TutorialEvent): void {
    if (this.finished || this.gapRemaining > 0) return;
    if (ev === 'volley' && this.step.id === 'falso') {
      this.flashHint(T.TUTORIAL_FALSO_MISS_TEXT);
      return;
    }
    if (!COUNTS[this.step.id]?.includes(ev)) return;
    if (ev === 'perfect') this.flashHint(T.TUTORIAL_PERFECT_TEXT);
    this.count += 1;
    if (this.count >= this.step.repeat) this.completeStep();
    else this.render();
  }

  private completeStep(): void {
    soundFX.pickup();
    this.progress.setText('');
    this.title.setText(HUD.toHudText(`${this.step.title}  ${T.TUTORIAL_STEP_DONE_TEXT}`)).setTint(T.TUTORIAL_DONE_COLOR);
    this.gapRemaining = T.TUTORIAL_STEP_GAP_SECONDS;
  }

  private advance(): void {
    this.index += 1;
    this.count = 0;
    this.movedX = 0;
    this.movedZ = 0;
    this.lastPos = null;
    if (this.index >= T.TUTORIAL_STEPS.length) {
      this.finish();
      return;
    }
    this.stepStarted = true;
    this.render();
  }

  private render(): void {
    const s = this.step;
    const n = `${this.index + 1}/${T.TUTORIAL_STEPS.length}`;
    this.title.setText(HUD.toHudText(`${n}  ${s.title}`)).setTint(T.TUTORIAL_TITLE_COLOR);
    this.hint.setText(HUD.toHudText(this.touch ? s.touch : s.pc)).setTint(T.TUTORIAL_HINT_COLOR);
    this.progress.setText(s.repeat > 1 ? `${this.count}/${s.repeat}` : '');
  }

  private flashHint(text: string): void {
    this.hint.setText(HUD.toHudText(text)).setTint(T.TUTORIAL_TITLE_COLOR);
    this.scene.time.delayedCall(1400, () => {
      if (!this.finished && this.gapRemaining <= 0) this.render();
    });
  }

  private finish(): void {
    this.finished = true;
    markTutorialDone();
    soundFX.goal();
    this.root.destroy();
    const s = this.scene;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const root = s.add.container(0, 0).setDepth(T.TUTORIAL_PANEL_DEPTH + 1);
    root.add(s.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, HUD.PAUSE_OVERLAY_ALPHA).setOrigin(0).setInteractive());
    root.add(pixelText(s, cx, cy - 110, T.TUTORIAL_FINISH_TITLE, 6, T.TUTORIAL_DONE_COLOR));
    root.add(pixelText(s, cx, cy - 50, T.TUTORIAL_FINISH_SUB, 3, HUD.UI_TITLE_COLOR));
    const dx = T.TUTORIAL_FINISH_BUTTON_W / 2 + 14;
    const play = makeFancyButton(s, cx - dx, cy + 50, T.TUTORIAL_FINISH_BUTTON_W, T.TUTORIAL_FINISH_BUTTON_H, T.TUTORIAL_FINISH_PLAY, HUB_PLAY_COLOR, () => this.onFinish(), {
      labelScale: 3,
    });
    const menu = makeFancyButton(s, cx + dx, cy + 50, T.TUTORIAL_FINISH_BUTTON_W, T.TUTORIAL_FINISH_BUTTON_H, T.TUTORIAL_FINISH_MENU, HUD.UI_BUTTON_COLOR, () =>
      s.scene.start('Menu'),
    { labelScale: 3 });
    root.add([play.container, menu.container]);
  }
}
