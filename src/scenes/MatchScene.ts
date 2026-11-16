import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEFT_GOAL_LINE_X,
  RIGHT_GOAL_LINE_X,
  CENTER_LINE_X,
  CENTER_X,
  DEPTH_BAND_HEIGHT,
  DEPTH_MIN,
  DEPTH_MAX,
  FAR_Y,
  GOAL_MOUTH_Z_MIN,
  GOAL_MOUTH_Z_MAX,
  projectToScreen,
} from '../config/arena';
import { MATCH_DURATION_SECONDS, GOAL_RESET_FREEZE_SECONDS } from '../config/match';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, type CharacterDef } from '../config/characters';
import { STADIUMS, type StadiumId } from '../config/stadiums';
import { KEEPER_CATCH_RANGE_X, CATCH_MAX_HEIGHT_ABOVE_FEET } from '../config/keeper';
import { canStrikeAerial } from '../systems/aerialStrike';
import { computeDribbleTarget } from '../systems/dribbleControl';
import {
  POWER_MAX_SEGMENTS,
  SHOT_SPEED_NORMAL,
  POWER_CATCH_SEGMENT_COST,
  SHOT_CHARGE_TAP_SECONDS,
  SHOT_PRESS_BUFFER_SECONDS,
  LOB_STICK_BACK_THRESHOLD,
  LOB_FORWARD_WEIGHT,
  LOB_LAUNCH_VY,
  LOB_SPEED_MULTIPLIER,
  LOB_SPEED_BY_POWER_LEVEL,
  VOLLEY_SPEED_MULTIPLIER,
  SHOT_CHARGE_MAX_SECONDS,
  SHOT_SPEED_BY_POWER_LEVEL,
  GOAL_CONCEDED_ENERGY_GAIN,
} from '../config/power';
import {
  SUPER_MOVE_SEGMENT_COST,
  SUPER_STRIKE_SPEED_MULTIPLIER,
  SUPER_CONTROL_SPEED_MULTIPLIER,
  SUPER_CHAOS_SPEED_MULTIPLIER,
  SUPER_CHAOS_WOBBLE_MULTIPLIER,
  SUPER_RHYTHM_SPEED_MULTIPLIER,
  SUPER_RHYTHM_BONUS_MULTIPLIER,
  KONGO_RHYTHM_PERIOD_SECONDS,
  KONGO_RHYTHM_WINDOW_SECONDS,
} from '../config/super';
import { screenDirToWorld } from '../config/movement';
import { drawPitch } from '../systems/pitchRenderer';
import { InputController } from '../systems/InputController';
import { soundFX } from '../systems/SoundFX';
import { CrowdBand } from '../systems/CrowdBand';
import { EnergyDrinks } from '../systems/EnergyDrinks';
import * as HUD from '../config/hud';
import { resolveCatchAttempt } from '../systems/catchMatrix';
import { Character } from '../entities/Character';
import { Ball } from '../entities/Ball';
import { AIOpponent } from '../entities/AIOpponent';

interface MatchData {
  characterId?: CharacterId;
  stadiumId?: StadiumId;
}

/**
 * Ball physics, character-ball contact, goal detection, scoreboard, match
 * timer (M2), the M3 Aksiyon/Dash/power system, M4's per-character super
 * moves, and (M5) a real AI opponent (AIOpponent) on the right half.
 * There's no separate goalkeeper entity — each side defends its own goal
 * itself via the contextual Aksiyon "tut" (catch) when not touching the
 * ball, exactly like CLAUDE.md's original design (an earlier dedicated
 * AIKeeper was a stopgap before AIOpponent existed and confused players by
 * standing in the goal doing nothing — see docs/PROGRESS.md).
 */
export class MatchScene extends Phaser.Scene {
  private input1!: InputController;
  private player!: Character;
  /** Static same-half reference character — debug aid (F1) proving the
   * depth-sort math, not a real gameplay entity. */
  private depthSortRef!: Character;
  private ball!: Ball;
  private opponent!: AIOpponent;
  private opponentCharacter: CharacterDef = CHARACTERS.kenya;
  private crowd!: CrowdBand;
  private drinks!: EnergyDrinks;
  private debugVisible = false;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private powerSegmentBoxes: Phaser.GameObjects.Image[] = [];
  /** Aim direction captured at the moment Aksiyon is pressed — CLAUDE.md:
   * "Şut yönü, Aksiyon'a basıldığı andaki joystick yönünden gelir." Falls
   * back to facing when the stick is neutral. */
  private lastAimX = 1;
  private lastAimZ = 0;
  /** Kongo's rhythm clock (M4 super move) — free-running, independent of
   * the stadium's cosmetic pulse, so timing works the same on any saha. */
  private rhythmClock = 0;

  private character = CHARACTERS.argentina;
  private stadium = STADIUMS.argentina;

  private scoreLeft = 0;
  private scoreRight = 0;
  private timeRemaining = MATCH_DURATION_SECONDS;
  private scoreText!: Phaser.GameObjects.BitmapText;
  private timeText!: Phaser.GameObjects.BitmapText;
  private matchOver = false;
  private wasControllingBall = false;
  /** Seconds Aksiyon has been held since a shot charge began, or null when
   * not charging (M6.2 hold-to-charge power shot). */
  private shotChargeSeconds: number | null = null;
  /** Seconds since the last unused Aksiyon press (input buffer). */
  private sinceActionPress = Infinity;
  /** Live stick vector this frame — the lob check reads it at release. */
  private liveMove = { x: 0, z: 0 };
  /** Counts down after a goal — controls locked, nothing moves, until it
   * hits 0 (CLAUDE.md: "~2 sn kontroller kilitli"). */
  private kickoffFreezeRemaining = 0;

  constructor() {
    super('Match');
  }

  init(data: MatchData): void {
    this.character = CHARACTERS[data.characterId ?? 'argentina'];
    this.stadium = STADIUMS[data.stadiumId ?? 'argentina'];
    // The computer picks a different character than the human's, purely
    // for variety — there's no AI character-select screen (out of scope).
    const pool = CHARACTER_ORDER.filter((id) => id !== this.character.id);
    this.opponentCharacter = CHARACTERS[Phaser.Utils.Array.GetRandom(pool)];
  }

  create(): void {
    // Fixed camera — no zoom, no follow, no pan (CLAUDE.md section 10).
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    this.scoreLeft = 0;
    this.scoreRight = 0;
    this.timeRemaining = MATCH_DURATION_SECONDS;
    this.matchOver = false;

    drawPitch(this, this.stadium);
    soundFX.whistle();

    // The stands already carry the stadium tint (pitchRenderer.ts); Kongo
    // additionally pulses to the street rhythm.
    if (this.stadium.rhythmVisual) this.addRhythmPulse();

    this.crowd = new CrowdBand(this);

    this.createHud();
    this.updateHud();

    const leftHalfX = (LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2;
    const bounds = { minX: LEFT_GOAL_LINE_X, maxX: CENTER_LINE_X };

    this.player = new Character(
      this,
      leftHalfX,
      DEPTH_BAND_HEIGHT / 2,
      bounds,
      this.character.color,
      this.character.speedMultiplier,
      this.character.id,
    );
    this.depthSortRef = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT * 0.85, bounds, 0xe74c3c);
    this.depthSortRef.setVisible(false);

    this.ball = new Ball(this, CENTER_X, DEPTH_BAND_HEIGHT / 2, 40, {
      bounceMultiplier: this.stadium.bounceMultiplier,
      frictionMultiplier: this.stadium.frictionMultiplier,
      windX: this.stadium.windX,
      windZ: this.stadium.windZ,
    });

    this.opponent = new AIOpponent(this, this.opponentCharacter);
    this.drinks = new EnergyDrinks(this);

    this.input1 = new InputController(this);

    this.debugGraphics = this.add.graphics().setDepth(20000);

    this.input.keyboard?.on('keydown-F1', () => {
      this.debugVisible = !this.debugVisible;
      this.depthSortRef.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    });

    // Manual early-end button, handy for testing without waiting out the clock.
    const endBtn = this.add
      .image(HUD.END_BUTTON_X, HUD.END_BUTTON_Y, 'hud_button')
      .setScale(HUD.HUD_PIXEL_SCALE)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    this.add
      .bitmapText(HUD.END_BUTTON_X, HUD.END_BUTTON_Y + 1, HUD.PIXEL_FONT_KEY, 'BİTİR (TEST)')
      .setScale(HUD.FOOTER_FONT_SCALE)
      .setOrigin(0.5)
      .setDepth(10001);
    endBtn.on('pointerup', () => this.endMatch());
  }

  update(_time: number, delta: number): void {
    if (this.matchOver) return;

    if (this.kickoffFreezeRemaining > 0) {
      // Controls locked after a goal (CLAUDE.md: "~2 sn kontroller
      // kilitli") — nothing moves, nobody can touch/shoot/catch, the clock
      // doesn't run down either. Crowd/HUD keep going, purely cosmetic.
      this.kickoffFreezeRemaining -= delta / 1000;
      this.crowd.update(delta);
      // Swallow presses during the lock so a held button doesn't fire
      // the moment play resumes.
      this.input1.drainPresses();
      this.sinceActionPress = Infinity;
      this.shotChargeSeconds = null;
      return;
    }

    const move = this.input1.getMoveVector();
    this.liveMove = move;
    if (move.x !== 0 || move.z !== 0) {
      this.lastAimX = move.x;
      this.lastAimZ = move.z;
    }
    const jumpPressed = this.input1.consumeJumpPressed();
    const dashPressed = this.input1.consumeDashPressed();
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed, dashPressed });
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false });
    this.opponent.update(delta, this.ball);
    this.drinks.update(delta, [this.player, this.opponent.character], () => soundFX.pickup());
    this.crowd.update(delta);

    this.rhythmClock = (this.rhythmClock + delta / 1000) % KONGO_RHYTHM_PERIOD_SECONDS;
    if (this.character.id === 'congo') {
      this.input1.setSpecialGlow(this.isInRhythmWindow());
    }

    // Ball-dribble control (force/lerp toward a dribble point ahead of the
    // player, never a position lock — see Ball.updateControl()). Called
    // unconditionally every frame; it's a no-op when the ball's too far
    // from the dribble point. Distance scales with the player's real
    // current speed (systems/dribbleControl.ts).
    const playerSpeed = Math.hypot(this.player.velX, this.player.velZ);
    const dribbleTarget = computeDribbleTarget(
      this.player.x,
      this.player.z,
      this.player.facingX,
      this.player.facingZ,
      playerSpeed,
    );
    this.ball.updateControl(
      'left',
      dribbleTarget.x,
      dribbleTarget.z,
      this.player.facingX,
      this.player.facingZ,
      this.player.isDashing,
      this.player.y > 0,
      delta / 1000,
      this.character.chaosTouch,
      this.player.moveVelX,
      this.player.moveVelZ,
    );

    let controllingBall = this.ball.controller === 'left';
    const dtSec = delta / 1000;
    if (this.input1.consumeActionPressed()) this.sinceActionPress = 0;
    else this.sinceActionPress += dtSec;
    const actionBuffered = this.sinceActionPress <= SHOT_PRESS_BUFFER_SECONDS;

    // M6.2 shot: tap Aksiyon = normal shot (0 energy); hold past
    // SHOT_CHARGE_TAP_SECONDS = power shot that spends the WHOLE bar on
    // release (CLAUDE.md §5). The aura shows that full level as soon as the
    // hold counts as a power shot. A press up to SHOT_PRESS_BUFFER_SECONDS
    // before the trap still counts (input buffer).
    if (controllingBall && actionBuffered && this.shotChargeSeconds === null) {
      this.shotChargeSeconds = this.sinceActionPress;
      this.sinceActionPress = Infinity;
    }
    if (this.shotChargeSeconds !== null) {
      if (!controllingBall) {
        // Lost the ball mid-charge — cancel, nothing spent.
        this.shotChargeSeconds = null;
        this.ball.setChargeLevel(0);
      } else {
        this.shotChargeSeconds += dtSec;
        const isPowerHold = this.shotChargeSeconds >= SHOT_CHARGE_TAP_SECONDS;
        const energy = Math.floor(this.player.powerSegments + 1e-6);
        this.ball.setChargeLevel(isPowerHold ? energy : 0);
        if (!this.input1.isActionHeld() || this.shotChargeSeconds >= SHOT_CHARGE_MAX_SECONDS) {
          this.shotChargeSeconds = null;
          this.ball.setChargeLevel(0);
          this.fireShot(isPowerHold ? energy : 0);
          controllingBall = false;
        }
      }
    } else if (actionBuffered && canStrikeAerial(this.ball, this.ball.controller !== null, this.player)) {
      // Header / volley on a high free ball (meets lobs).
      this.sinceActionPress = Infinity;
      this.fireVolley();
    } else if (!controllingBall && actionBuffered) {
      // Top bizde değilse tut (bağlamsal Aksiyon, CLAUDE.md section 4) —
      // only meaningful when a real shot is actually incoming on our own
      // goal and low enough to reach; otherwise the press stays buffered.
      const onTarget = this.ball.z >= GOAL_MOUTH_Z_MIN && this.ball.z <= GOAL_MOUTH_Z_MAX;
      const nearGoal = this.ball.x <= LEFT_GOAL_LINE_X + KEEPER_CATCH_RANGE_X;
      const approaching = this.ball.lastTouchWasShot && this.ball.vx < 0;
      const reachable = this.ball.y <= this.player.y + CATCH_MAX_HEIGHT_ABOVE_FEET;
      if (onTarget && nearGoal && approaching && reachable) {
        this.sinceActionPress = Infinity;
        const wantsPowerCatch =
          this.input1.isSpecialHeld() && this.player.canPowerCatch && this.player.spendPower(POWER_CATCH_SEGMENT_COST);
        const { caught } = resolveCatchAttempt(this.ball, 'left', this.character.catchChance, wantsPowerCatch);
        this.player.playCatch();
        if (wantsPowerCatch) this.player.startCatchCooldown(this.character.cooldownSeconds);
        if (caught) soundFX.save();
      }
    }
    if (controllingBall && !this.wasControllingBall) soundFX.kick();
    this.wasControllingBall = controllingBall;

    if (this.input1.consumeSpecialReleased() && controllingBall) {
      this.performSuperMove();
    }

    this.updatePowerBar();

    const scored = this.ball.update(delta);
    if (scored === 'left') {
      // Ball entered the left goal -> right side scores -> LEFT side
      // conceded, so kickoff goes to the center of the LEFT half
      // (CLAUDE.md: "gol yiyene, kendi yarısının ortasında verilsin").
      this.scoreRight += 1;
      this.player.gainPower(GOAL_CONCEDED_ENERGY_GAIN);
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
      this.ball.reset((LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2, DEPTH_BAND_HEIGHT / 2);
      this.kickoffFreezeRemaining = GOAL_RESET_FREEZE_SECONDS;
    } else if (scored === 'right') {
      this.scoreLeft += 1;
      this.opponent.character.gainPower(GOAL_CONCEDED_ENERGY_GAIN);
      this.updateHud();
      soundFX.goal();
      this.crowd.celebrate();
      this.ball.reset((CENTER_LINE_X + RIGHT_GOAL_LINE_X) / 2, DEPTH_BAND_HEIGHT / 2);
      this.kickoffFreezeRemaining = GOAL_RESET_FREEZE_SECONDS;
    }

    this.timeRemaining = Math.max(0, this.timeRemaining - delta / 1000);
    this.updateHud();
    if (this.timeRemaining <= 0) {
      this.endMatch();
      return;
    }

    if (this.debugVisible) {
      this.debugGraphics.clear();
      this.debugGraphics.lineStyle(1, 0xff00ff, 0.8);
      // Left-half bounds as an actual trapezoid, matching the perspective pitch.
      const nearLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MIN, 0);
      const nearRight = projectToScreen(CENTER_LINE_X, DEPTH_MIN, 0);
      const farRight = projectToScreen(CENTER_LINE_X, DEPTH_MAX, 0);
      const farLeft = projectToScreen(LEFT_GOAL_LINE_X, DEPTH_MAX, 0);
      this.debugGraphics.beginPath();
      this.debugGraphics.moveTo(nearLeft.screenX, nearLeft.screenY);
      this.debugGraphics.lineTo(nearRight.screenX, nearRight.screenY);
      this.debugGraphics.lineTo(farRight.screenX, farRight.screenY);
      this.debugGraphics.lineTo(farLeft.screenX, farLeft.screenY);
      this.debugGraphics.closePath();
      this.debugGraphics.strokePath();
    }
  }

  /** Fire the human's shot at `level` (0 = normal, 1..3 = power shot that
   * spends the whole bar). Stick pulled back toward our own goal at
   * release = lob (power lob when level > 0). Otherwise aim = latest stick
   * direction, else facing. */
  private fireShot(level: number): void {
    if (level > 0 && !this.player.spendPower(level)) level = 0;
    const base = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier;
    // Left side attacks +x, so "back" = stick pointing left.
    if (this.liveMove.x <= -LOB_STICK_BACK_THRESHOLD) {
      const w = screenDirToWorld(LOB_FORWARD_WEIGHT, this.liveMove.z);
      const speed = base * LOB_SPEED_MULTIPLIER * LOB_SPEED_BY_POWER_LEVEL[level];
      // No momentum carry: the player is backing off, and a predictable
      // landing spot matters more than a realistic kick.
      this.ball.shoot(w.x, w.z, speed * w.speedScale, false, level > 0, false, 1, level, LOB_LAUNCH_VY, 0);
      this.player.playKick(1);
      soundFX.kick();
      return;
    }
    const hasAim = this.lastAimX !== 0 || this.lastAimZ !== 0;
    const aimX = hasAim ? this.lastAimX : this.player.facingX;
    const aimZ = hasAim ? this.lastAimZ : this.player.facingZ;
    const speed = base * SHOT_SPEED_BY_POWER_LEVEL[level];
    // Stick direction is a screen direction — convert so the shot flies
    // at the stick's on-screen angle and speed (config/movement.ts).
    const w = screenDirToWorld(aimX, aimZ);
    this.ball.shoot(w.x, w.z, speed * w.speedScale, this.character.chaosTouch, level > 0, false, 1, level);
    this.player.playKick(aimX);
    soundFX.kick();
  }

  /** Header/volley: strike a high free ball where it is, along the stick
   * (default: forward). Normal power only — no energy involved. */
  private fireVolley(): void {
    const hasStick = this.liveMove.x !== 0 || this.liveMove.z !== 0;
    const aimX = hasStick ? this.liveMove.x : 1;
    const aimZ = hasStick ? this.liveMove.z : 0;
    const w = screenDirToWorld(aimX, aimZ);
    const speed = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier * VOLLEY_SPEED_MULTIPLIER;
    // Full overwrite (carry 0) and keep vy — a volley redirects the ball.
    this.ball.shoot(w.x, w.z, speed * w.speedScale, this.character.chaosTouch, false, false, 1, 0, 0, 0);
    this.player.playKick(aimX);
    soundFX.kick();
  }

  /** Kongo's "doğru anda basınca power bonusu" — a short recurring sweet
   * spot window on an independent beat clock. */
  private isInRhythmWindow(): boolean {
    return this.rhythmClock < KONGO_RHYTHM_WINDOW_SECONDS;
  }

  /** 3-segment super move (M4, CLAUDE.md section 6) — only fires while
   * touching the ball, since all four characters' identities (a strike, a
   * controlled pass, an aerial wobble, a timed power shot) are ball
   * actions. Consumes the whole power bar. */
  private performSuperMove(): void {
    if (this.player.powerSegments < SUPER_MOVE_SEGMENT_COST) return;
    if (!this.player.spendPower(SUPER_MOVE_SEGMENT_COST)) return;

    const aim = screenDirToWorld(this.player.facingX, this.player.facingZ);
    const aimX = aim.x;
    const aimZ = aim.z;
    const baseSpeed = SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier * aim.speedScale;
    soundFX.kick();
    this.player.playKick(aimX);

    switch (this.character.id) {
      case 'brazil':
        // Capoeira ters vuruş: pure power along the facing direction.
        this.ball.shoot(aimX, aimZ, baseSpeed * SUPER_STRIKE_SPEED_MULTIPLIER, false, true, true);
        break;
      case 'argentina':
        // Gambeta: control over power — always aimed dead-center at goal.
        this.ball.shoot(
          RIGHT_GOAL_LINE_X - this.player.x,
          DEPTH_BAND_HEIGHT / 2 - this.player.z,
          // World-space aim at a world point — no screen conversion.
          SHOT_SPEED_NORMAL * this.character.shotPowerMultiplier * SUPER_CONTROL_SPEED_MULTIPLIER,
          false,
          true,
          true,
        );
        break;
      case 'kenya':
        // Poşet top: weaker shot, much wilder wobble than a normal chaos touch.
        this.ball.shoot(
          aimX,
          aimZ,
          baseSpeed * SUPER_CHAOS_SPEED_MULTIPLIER,
          true,
          true,
          true,
          SUPER_CHAOS_WOBBLE_MULTIPLIER,
        );
        break;
      case 'congo': {
        // Ritimli zamanlama: bonus speed when pressed on the beat.
        const onBeat = this.isInRhythmWindow();
        const speed = baseSpeed * SUPER_RHYTHM_SPEED_MULTIPLIER * (onBeat ? SUPER_RHYTHM_BONUS_MULTIPLIER : 1);
        this.ball.shoot(aimX, aimZ, speed, false, true, true);
        break;
      }
    }
  }

  /** Pixel-art HUD (M6.0): scoreboard + timer top center, energy cells
   * bottom left, footer info — all sprites/bitmap font from assets/hud/. */
  private createHud(): void {
    const s = HUD.HUD_PIXEL_SCALE;
    const board = this.add
      .image(GAME_WIDTH / 2, HUD.SCOREBOARD_Y, 'hud_scoreboard')
      .setOrigin(0.5, 0)
      .setScale(s)
      .setDepth(10000);
    const boardLeft = board.x - board.displayWidth / 2;
    const midY = HUD.SCOREBOARD_Y + (HUD.SCOREBOARD_HEIGHT * s) / 2;
    const code = (def: CharacterDef) => HUD.toHudText(def.name).slice(0, HUD.TEAM_CODE_LENGTH);
    this.add
      .bitmapText(boardLeft + HUD.SCOREBOARD_SLOT_LEFT_X * s, midY, HUD.PIXEL_FONT_KEY, code(this.character))
      .setScale(HUD.TEAM_CODE_FONT_SCALE)
      .setOrigin(0.5)
      .setTint(HUD.TEAM_CODE_COLOR)
      .setDepth(10001);
    this.add
      .bitmapText(boardLeft + HUD.SCOREBOARD_SLOT_RIGHT_X * s, midY, HUD.PIXEL_FONT_KEY, code(this.opponentCharacter))
      .setScale(HUD.TEAM_CODE_FONT_SCALE)
      .setOrigin(0.5)
      .setTint(HUD.TEAM_CODE_COLOR)
      .setDepth(10001);
    this.scoreText = this.add
      .bitmapText(boardLeft + HUD.SCOREBOARD_WELL_X * s, midY, HUD.PIXEL_FONT_KEY, '0-0')
      .setScale(HUD.SCORE_FONT_SCALE)
      .setOrigin(0.5)
      .setTint(HUD.SCORE_COLOR)
      .setDepth(10001);
    this.timeText = this.add
      .bitmapText(GAME_WIDTH / 2, HUD.SCOREBOARD_Y + HUD.SCOREBOARD_HEIGHT * s + 2, HUD.PIXEL_FONT_KEY, '')
      .setScale(HUD.TIMER_FONT_SCALE)
      .setOrigin(0.5, 0)
      .setDepth(10001);

    // Energy bar (CLAUDE.md section 5) — 3 cells.
    this.powerSegmentBoxes = [];
    this.add
      .bitmapText(HUD.ENERGY_BAR_X, HUD.ENERGY_BAR_Y - 10, HUD.PIXEL_FONT_KEY, HUD.ENERGY_LABEL)
      .setScale(HUD.ENERGY_LABEL_SCALE)
      .setOrigin(0, 1)
      .setTint(HUD.ENERGY_LABEL_COLOR)
      .setDepth(10000);
    for (let i = 0; i < POWER_MAX_SEGMENTS; i += 1) {
      const cell = this.add
        .image(0, HUD.ENERGY_BAR_Y, 'hud_energy_empty')
        .setScale(s)
        .setOrigin(0, 0.5)
        .setDepth(10000);
      cell.x = HUD.ENERGY_BAR_X + i * (cell.displayWidth + HUD.ENERGY_CELL_GAP);
      this.powerSegmentBoxes.push(cell);
    }

    // Footer: who's playing where + the keyboard map (touch buttons and
    // keys aren't in the same order, so show it on screen).
    const footer = (y: number, text: string, color: number) =>
      this.add
        .bitmapText(10, y, HUD.PIXEL_FONT_KEY, HUD.toHudText(text))
        .setScale(HUD.FOOTER_FONT_SCALE)
        .setOrigin(0, 1)
        .setTint(color)
        .setDepth(10000);
    footer(
      GAME_HEIGHT - 12,
      `Karakter: ${this.character.name} | Saha: ${this.stadium.name} | Rakip: ${this.opponentCharacter.name}`,
      HUD.FOOTER_INFO_COLOR,
    );
    footer(GAME_HEIGHT + 2, 'Klavye: Z=Zıpla  Space=Aksiyon  X=Dash  C=Özel', HUD.FOOTER_KEYS_COLOR);
  }

  private updatePowerBar(): void {
    const filled = Math.floor(this.player.powerSegments + 1e-6);
    this.powerSegmentBoxes.forEach((cell, i) => {
      const key = i < filled ? 'hud_energy_full' : 'hud_energy_empty';
      if (cell.texture.key !== key) cell.setTexture(key);
    });
  }

  private updateHud(): void {
    this.scoreText.setText(`${this.scoreLeft}-${this.scoreRight}`);
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = Math.floor(this.timeRemaining % 60);
    this.timeText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    this.timeText.setTint(this.timeRemaining <= HUD.TIMER_LOW_SECONDS ? HUD.TIMER_LOW_COLOR : HUD.TIMER_COLOR);
  }

  private endMatch(): void {
    if (this.matchOver) return;
    this.matchOver = true;
    soundFX.whistle();
    this.scene.start('Result', { scoreLeft: this.scoreLeft, scoreRight: this.scoreRight });
  }

  /** Kongo's "ritim görsele yansır" — a cosmetic pulse on the stands band,
   * no physics involved. */
  private addRhythmPulse(): void {
    const pulse = this.add.rectangle(GAME_WIDTH / 2, FAR_Y / 2, GAME_WIDTH, FAR_Y, this.stadium.tintColor, 0.25);
    this.tweens.add({
      targets: pulse,
      alpha: { from: 0.1, to: 0.4 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
