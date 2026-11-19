import Phaser from 'phaser';
import { APP_BACKGROUND_EVENT } from '../config/lifecycle';
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
  CHARACTER_HEIGHT,
  projectToScreen,
} from '../config/arena';
import { MATCH_DURATION_SECONDS, GOAL_RESET_FREEZE_SECONDS } from '../config/match';
import { CHARACTERS, CHARACTER_ORDER, type CharacterId, type CharacterDef } from '../config/characters';
import { DEFAULT_STADIUM, STADIUMS, type StadiumId } from '../config/stadiums';
import { equipMods, type EquipMods } from '../config/equipment';
import {
  CATCH_ARM_SECONDS,
  CATCH_WHIFF_COOLDOWN_SECONDS,
  PARRY_WINDOW_SECONDS,
  PARRY_FLASH_MS,
  PARRY_FLASH_ALPHA,
} from '../config/keeper';
import { canStrikeAerial } from '../systems/aerialStrike';
import { computeDribbleTarget } from '../systems/dribbleControl';
import {
  POWER_MAX_SEGMENTS,
  SHOT_SPEED_NORMAL,
  SHOT_CHARGE_TAP_SECONDS,
  SHOT_PRESS_BUFFER_SECONDS,
  LOB_STICK_BACK_THRESHOLD,
  LOB_FORWARD_WEIGHT,
  BALL_JUMP_CARRY_VY,
  SHOT_CHARGE_MAX_SECONDS,
  GOAL_CONCEDED_ENERGY_GAIN,
  SHOT_SPEED_BY_POWER_LEVEL,
  BICYCLE_SPEED_MULTIPLIER,
  CURVE_ACCEL,
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
import { applyBodyBlock, applyCatchAttempt, isBodyBlock, isCatchableShot } from '../systems/catchMatrix';
import { strikeBall, curvedAim } from '../systems/shotKinds';
import { setImpactListener, emitImpact } from '../systems/impactFeel';
import { playPowerCutIn } from '../systems/PowerCutIn';
import { playGoalBand, ReplayRecorder } from '../systems/GoalCelebration';
import { isTouchDevice } from '../systems/mobileShell';
import { equippedPerks, grantMatchRewards, equippedItems } from '../systems/profile';
import { perkMods } from '../config/progression';
import { vibrateImpact, vibrateGoal } from '../systems/haptics';
import { BUTTON_RING_TAP_COLOR } from '../config/controls';
import { elementColor } from '../config/elements';
import { makeFancyButton, pixelText } from '../systems/uiKit';
import { HUB_PLAY_COLOR as PAUSE_PRIMARY_COLOR } from '../config/menus';


import {
  FEEL_FRAME_SECONDS,
  FEEL_EPSILON,
  HITSTOP_FRAMES,
  SHAKE,
  CUTIN_SECONDS,
  GOAL_BAND_SECONDS,
  CUTIN_SUPER_TITLE,
  BICYCLE_TITLE,
  FALSO_TEXT,
  FALSO_TEXT_COLOR,
  POPUP_TEXT_SCALE,
  POPUP_RISE_PX,
  POPUP_MS,
  REPLAY_MIN_LEVEL,
  type ImpactKind,
} from '../config/feel';
import { Character } from '../entities/Character';
import { Ball } from '../entities/Ball';
import { BALL_POWER_LEVEL_MAX } from '../config/animation';
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
  private rivalSegmentBoxes: Phaser.GameObjects.Image[] = [];
  /** M7.2 pause state + its overlay. */
  private paused = false;
  private pauseMenu: Phaser.GameObjects.Container | null = null;
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
  /** Seconds left on an open "tut" window (Aksiyon pressed without the
   * ball, M6.3) and the cooldown after a window that caught nothing. */
  private catchArmRemaining = 0;
  private catchWhiffCooldown = 0;
  /** Seconds since the tut press that opened the current window (counts the
   * input-buffer delay too) — inside PARRY_WINDOW_SECONDS = perfect parry. */
  private catchArmElapsed = 0;
  /** Live stick vector this frame — the lob check reads it at release. */
  private liveMove = { x: 0, z: 0 };
  /** Counts down after a goal — controls locked, nothing moves, until it
   * hits 0 (CLAUDE.md: "~2 sn kontroller kilitli"). */
  private kickoffFreezeRemaining = 0;
  /** M6.4 feel: whole-world freeze (hitstop), the portrait cut-in timer,
   * and the strongest impact that landed during a cut-in (played after). */
  private hitstopRemaining = 0;
  private cutInRemaining = 0;
  private pendingImpact: ImpactKind | null = null;
  /** M6.4 goal celebration: rolling replay buffer, and seconds until a
   * pending power-goal replay starts (after the name band), or null. */
  private replay!: ReplayRecorder;
  private replayStartIn: number | null = null;
  /** Ball popped up by our own jump and not touched since (air combo). */
  private airCarry = false;

  constructor() {
    super('Match');
  }

  init(data: MatchData): void {
    this.character = CHARACTERS[data.characterId ?? 'argentina'];
    this.stadium = STADIUMS[data.stadiumId ?? DEFAULT_STADIUM];
    // The computer picks a different character than the human's, purely
    // for variety — there's no AI character-select screen (out of scope).
    const pool = CHARACTER_ORDER.filter((id) => id !== this.character.id);
    this.opponentCharacter = CHARACTERS[Phaser.Utils.Array.GetRandom(pool)];
  }

  /** 18.11.2026 equipment multipliers for the human (config/equipment.ts). */
  private equip!: EquipMods;

  /** ŞUT of the human: character stat × equipment. */
  private get shotMult(): number {
    return this.character.shotPowerMultiplier * this.equip.shotSpeed;
  }

  create(): void {
    this.equip = equipMods(equippedItems());
    // Fixed camera — no zoom, no follow, no pan (CLAUDE.md section 10).
    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    this.scoreLeft = 0;
    this.scoreRight = 0;
    this.timeRemaining = MATCH_DURATION_SECONDS;
    this.matchOver = false;
    this.paused = false;
    this.pauseMenu = null;

    drawPitch(this, this.stadium);
    soundFX.whistle('start');
    soundFX.playMusic('match');
    soundFX.startCrowd();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      soundFX.stopCrowd();
      soundFX.setDucked(false);
    });

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
      this.character.speedMultiplier * this.stadium.speedMultiplier * this.equip.moveSpeed,
      this.character.id,
    );
    // M8: the player's equipped perks (profile, per character).
    this.player.bodyStrength = this.character.powerMultiplier * this.equip.body;
    const perks = perkMods(equippedPerks(this.character.id));
    this.player.mods = { ...perks, dashCooldownMultiplier: perks.dashCooldownMultiplier * this.equip.dashCooldown };
    this.player.gainPower(this.player.mods.startEnergy);
    this.depthSortRef = new Character(this, leftHalfX, DEPTH_BAND_HEIGHT * 0.85, bounds, 0xe74c3c);
    this.depthSortRef.setVisible(false);

    this.ball = new Ball(this, CENTER_X, DEPTH_BAND_HEIGHT / 2, 40, {
      bounceMultiplier: this.stadium.bounceMultiplier,
      frictionMultiplier: this.stadium.frictionMultiplier,
      windX: this.stadium.windX,
      windZ: this.stadium.windZ,
    });

    // Each side always shoots its own element (config/elements.ts).
    this.ball.elementBySide = { left: this.character.element, right: this.opponentCharacter.element };
    this.opponent = new AIOpponent(this, this.opponentCharacter, this.stadium.speedMultiplier);
    this.opponent.onPerfectParry = () => this.flashParry();
    this.opponent.onPowerShot = (level) => this.startCutIn('right', this.opponentCharacter, level);
    this.hitstopRemaining = 0;
    this.cutInRemaining = 0;
    this.pendingImpact = null;
    setImpactListener((kind) => this.onImpact(kind));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => setImpactListener(null));
    this.drinks = new EnergyDrinks(this);
    this.replay = new ReplayRecorder(this, [
      ...this.player.replayTargets(),
      ...this.opponent.character.replayTargets(),
      ...this.ball.replayTargets(),
    ] as ConstructorParameters<typeof ReplayRecorder>[1]);
    this.replayStartIn = null;

    this.input1 = new InputController(this);

    this.debugGraphics = this.add.graphics().setDepth(20000);

    this.input.keyboard?.on('keydown-F1', () => {
      this.debugVisible = !this.debugVisible;
      this.depthSortRef.setVisible(this.debugVisible);
      if (!this.debugVisible) this.debugGraphics.clear();
    });

    // M7.2: pause button (top-right) replaces the old "BİTİR (TEST)".
    this.createPauseButton();
    this.input.keyboard?.on('keydown-ESC', () => this.setPaused(!this.paused));
    this.input.keyboard?.on('keydown-P', () => this.setPaused(!this.paused));
    // M9.1: app/tab sent to the background → pause (sound is muted globally).
    const onBackground = () => this.setPaused(true);
    this.game.events.on(APP_BACKGROUND_EVENT, onBackground);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(APP_BACKGROUND_EVENT, onBackground));
  }

  /** M9.1 Android back: pause, or resume if the pause menu is open. */
  onBackButton(): void {
    this.setPaused(!this.paused);
  }

  update(_time: number, delta: number): void {
    if (this.matchOver || this.paused) return;

    // M6.4: portrait cut-in, then hitstop — the whole simulation pauses
    // (inputs stay buffered, nothing is drained).
    if (this.cutInRemaining > FEEL_EPSILON) {
      this.cutInRemaining -= delta / 1000;
      if (this.cutInRemaining <= FEEL_EPSILON && this.pendingImpact) {
        const kind = this.pendingImpact;
        this.pendingImpact = null;
        this.startHitstop(kind);
      }
      return;
    }
    if (this.hitstopRemaining > FEEL_EPSILON) {
      this.hitstopRemaining -= delta / 1000;
      return;
    }

    if (this.kickoffFreezeRemaining > 0) {
      // Controls locked after a goal (CLAUDE.md: "~2 sn kontroller
      // kilitli") — nothing moves, nobody can touch/shoot/catch, the clock
      // doesn't run down either. Crowd/HUD keep going, purely cosmetic.
      this.kickoffFreezeRemaining -= delta / 1000;
      this.crowd.update(delta);
      if (this.replayStartIn !== null) {
        this.replayStartIn -= delta / 1000;
        if (this.replayStartIn <= 0) {
          this.replayStartIn = null;
          this.replay.play();
        }
      } else if (this.replay.isPlaying) {
        this.replay.update(delta / 1000);
      }
      // Swallow presses during the lock so a held button doesn't fire
      // the moment play resumes.
      this.input1.drainPresses();
      this.sinceActionPress = Infinity;
      this.shotChargeSeconds = null;
      this.catchArmRemaining = 0;
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
    const hadBallBeforeUpdate = this.ball.controller === 'left';
    const wasGrounded = this.player.y === 0;
    this.player.update(delta, { moveX: move.x, moveZ: move.z, jumpPressed, dashPressed });
    if (hadBallBeforeUpdate && wasGrounded && this.player.y > 0 && !this.player.isDashing) {
      // Jumped with the ball at the feet — it pops up with the player.
      this.shotChargeSeconds = null;
      this.ball.setChargeLevel(0);
      this.ball.liftWithOwner(this.player.moveVelX, this.player.moveVelZ, BALL_JUMP_CARRY_VY);
      this.airCarry = true;
    }
    // Air combo: a ball popped up with the jump rides along an air dash, so
    // jump → dash up/down → Aksiyon (falso volley) stays reachable.
    if (this.player.y === 0 || this.ball.controller !== null) this.airCarry = false;
    if (this.airCarry && this.player.isDashing) {
      this.ball.vx = this.player.moveVelX;
      this.ball.vz = this.player.moveVelZ;
    }
    this.depthSortRef.update(delta, { moveX: 0, moveZ: 0, jumpPressed: false, dashPressed: false });
    this.opponent.update(delta, this.ball, this.player);
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
      this.player.x,
      this.player.z,
    );

    let controllingBall = this.ball.controller === 'left';
    const dtSec = delta / 1000;
    if (this.input1.consumeActionPressed()) this.sinceActionPress = 0;
    else this.sinceActionPress += dtSec;
    // Stunned (M6.3): presses are kept in the buffer but nothing fires.
    const actionBuffered = this.sinceActionPress <= SHOT_PRESS_BUFFER_SECONDS && !this.player.isStunned;

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
    } else if (!controllingBall && actionBuffered && this.catchArmRemaining <= 0 && this.catchWhiffCooldown <= 0) {
      // Top bizde değilse tut (bağlamsal Aksiyon, CLAUDE.md §4): opens a
      // short tut window; the clash resolves on contact (M6.3).
      this.catchArmElapsed = this.sinceActionPress;
      this.sinceActionPress = Infinity;
      this.catchArmRemaining = CATCH_ARM_SECONDS;
    }
    this.updateCatch(dtSec);
    if (controllingBall && !this.wasControllingBall) soundFX.kick();
    this.wasControllingBall = controllingBall;

    if (this.input1.consumeSpecialReleased()) {
      if (controllingBall) {
        this.performSuperMove();
      } else if (
        this.player.y > 0 &&
        !this.player.isStunned &&
        canStrikeAerial(this.ball, this.ball.controller !== null, this.player)
      ) {
        this.performBicycleKick();
      }
    }

    this.updatePowerBar();
    this.updateButtonFeedback();

    this.updateBodyBlocks(dtSec);
    const scored = this.ball.update(delta);
    this.replay.capture(dtSec);
    if (scored) this.onGoal(scored);

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

  /** Ball entered `goalSide`'s goal: the other side scores. Conceding side
   * gets +1 energy and the kickoff in the centre of its own half
   * (CLAUDE.md). M6.4: "GOL!" name band, and a slow-motion replay first
   * when it was a power shot (level ≥ REPLAY_MIN_LEVEL). */
  private onGoal(goalSide: 'left' | 'right'): void {
    const scorerSide = goalSide === 'left' ? 'right' : 'left';
    const scorer = scorerSide === 'left' ? this.character : this.opponentCharacter;
    const conceder = goalSide === 'left' ? this.player : this.opponent.character;
    const level = this.ball.shotLevel;
    if (scorerSide === 'left') this.scoreLeft += 1;
    else this.scoreRight += 1;
    conceder.gainPower(GOAL_CONCEDED_ENERGY_GAIN);
    this.updateHud();
    soundFX.goal();
    vibrateGoal();
    this.crowd.celebrate();
    // Element of whoever actually struck it (an own goal shows the shooter's).
    playGoalBand(this, scorer.name, scorerSide, level, this.ball.element);

    let freeze = GOAL_RESET_FREEZE_SECONDS;
    if (level >= REPLAY_MIN_LEVEL && this.replay.playbackSeconds > 0) {
      this.replayStartIn = GOAL_BAND_SECONDS;
      freeze = Math.max(freeze, GOAL_BAND_SECONDS + this.replay.playbackSeconds + GOAL_RESET_FREEZE_SECONDS / 2);
    } else {
      this.replay.clear();
    }
    const kickoffX = goalSide === 'left' ? (LEFT_GOAL_LINE_X + CENTER_LINE_X) / 2 : (CENTER_LINE_X + RIGHT_GOAL_LINE_X) / 2;
    this.ball.reset(kickoffX, DEPTH_BAND_HEIGHT / 2);
    this.kickoffFreezeRemaining = freeze;
  }

  /** Human tut window: a live shot reaching the player while it's open
   * goes through the difference table (systems/catchMatrix.ts). */
  private updateCatch(dt: number): void {
    if (this.catchWhiffCooldown > 0) this.catchWhiffCooldown -= dt;
    if (this.catchArmRemaining <= 0) return;
    if (isCatchableShot(this.ball, 'left', this.player)) {
      this.catchArmRemaining = 0;
      const perfect = this.catchArmElapsed <= PARRY_WINDOW_SECONDS + this.player.mods.parryWindowBonusSeconds;
      const result = applyCatchAttempt(this.ball, 'left', this.player, perfect);
      if (result.outcome === 'hold' || result.outcome === 'spill') soundFX.save();
      if (result.perfect) this.flashParry();
      return;
    }
    this.catchArmRemaining -= dt;
    this.catchArmElapsed += dt;
    if (this.catchArmRemaining <= 0) this.catchWhiffCooldown = CATCH_WHIFF_COOLDOWN_SECONDS;
  }

  /** 18.11.2026: a shot no longer passes through a player who isn't
   * pressing Tut (systems/catchMatrix.ts applyBodyBlock). */
  private updateBodyBlocks(dt: number): void {
    const checks: ['left' | 'right', Character][] = [];
    if (this.catchArmRemaining <= 0) checks.push(['left', this.player]);
    checks.push(['right', this.opponent.character]);
    for (const [side, who] of checks) {
      if (!isBodyBlock(this.ball, side, who, dt)) continue;
      if (applyBodyBlock(this.ball, side, who) === 'deflect') soundFX.bounce();
      return;
    }
  }

  /** An impact landed (strike / clash). During a cut-in the strongest one
   * waits until the portrait is gone, so the kick "lands" after it. */
  private onImpact(kind: ImpactKind): void {
    this.replay.markStrike();
    vibrateImpact(kind);
    if (this.cutInRemaining > FEEL_EPSILON) {
      if (!this.pendingImpact || HITSTOP_FRAMES[kind] > HITSTOP_FRAMES[this.pendingImpact]) this.pendingImpact = kind;
      return;
    }
    this.startHitstop(kind);
  }

  private startHitstop(kind: ImpactKind): void {
    soundFX.impact(kind);
    this.hitstopRemaining = Math.max(this.hitstopRemaining, HITSTOP_FRAMES[kind] * FEEL_FRAME_SECONDS);
    const shake = SHAKE[kind];
    if (shake.durationMs > 0) this.cameras.main.shake(shake.durationMs, shake.intensity);
  }

  /** Power shot / super: freeze for the portrait cut-in (CUTIN_SECONDS). */
  private startCutIn(side: 'left' | 'right', def: CharacterDef, level: number, caption?: string): void {
    this.cutInRemaining = CUTIN_SECONDS;
    soundFX.powerCharge(level);
    playPowerCutIn(this, def.id, def.name, side, level, def.element, caption);
  }

  /** Perfect-parry feedback: brief white flash (fixed camera, no shake). */
  flashParry(): void {
    soundFX.parry();
    const flash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, PARRY_FLASH_ALPHA)
      .setDepth(20000);
    this.tweens.add({ targets: flash, alpha: 0, duration: PARRY_FLASH_MS, onComplete: () => flash.destroy() });
  }

  /** Fire the human's shot at `level` (0 = normal, 1..3 = power shot that
   * spends the whole bar). Stick pulled back toward our own goal at
   * release = lob (power lob when level > 0). Otherwise aim = latest stick
   * direction, else facing. */
  private fireShot(level: number): void {
    if (level > 0 && !this.player.spendPower(level)) level = 0;
    if (level > 0) this.startCutIn('left', this.character, level);
    const strike = { level, shotPowerMultiplier: this.shotMult, element: this.character.element };
    // Left side attacks +x, so "back" = stick pointing left.
    if (this.liveMove.x <= -LOB_STICK_BACK_THRESHOLD) {
      const w = screenDirToWorld(LOB_FORWARD_WEIGHT, this.liveMove.z);
      strikeBall(this.ball, 'lob', w.x, w.z, { ...strike, speedScale: w.speedScale });
      this.player.playKick(1);
      soundFX.kick();
      return;
    }
    const hasAim = this.lastAimX !== 0 || this.lastAimZ !== 0;
    const aimX = hasAim ? this.lastAimX : this.player.facingX;
    const aimZ = hasAim ? this.lastAimZ : this.player.facingZ;
    // Stick direction is a screen direction — convert so the shot flies
    // at the stick's on-screen angle and speed (config/movement.ts).
    const w = screenDirToWorld(aimX, aimZ);
    strikeBall(this.ball, 'ground', w.x, w.z, { ...strike, speedScale: w.speedScale, chaos: this.character.chaosTouch });
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
    const curve = this.player.airCurveSide * this.equip.curve;
    this.player.airCurveSide = 0;
    this.airCarry = false;
    if (curve !== 0) this.popText(FALSO_TEXT, FALSO_TEXT_COLOR);
    strikeBall(this.ball, 'volley', w.x, w.z, {
      level: 0,
      curve,
      shotPowerMultiplier: this.shotMult,
      element: this.character.element,
      speedScale: w.speedScale,
      chaos: this.character.chaosTouch,
    });
    this.player.playKick(aimX);
    soundFX.kick();
  }

  /** Kongo's "doğru anda basınca power bonusu" — a short recurring sweet
   * spot window on an independent beat clock. */
  private isInRhythmWindow(): boolean {
    return this.rhythmClock < KONGO_RHYTHM_WINDOW_SECONDS;
  }

  /** Rövaşata: Özel in the air on a reachable high ball = the airborne
   * super (full bar). Level-3 shot of our element along the stick (default
   * forward); an earlier air dash up/down makes it a falso too. */
  private performBicycleKick(): void {
    if (this.player.powerSegments < SUPER_MOVE_SEGMENT_COST) return;
    if (!this.player.spendPower(SUPER_MOVE_SEGMENT_COST)) return;
    const hasStick = this.liveMove.x !== 0 || this.liveMove.z !== 0;
    const w = screenDirToWorld(hasStick ? this.liveMove.x : 1, hasStick ? this.liveMove.z : 0);
    const curve = this.player.airCurveSide * this.equip.curve;
    this.player.airCurveSide = 0;
    this.airCarry = false;
    const aim = curvedAim(w.x, w.z, curve);
    const level = SHOT_SPEED_BY_POWER_LEVEL.length - 1;
    const speed =
      SHOT_SPEED_NORMAL * this.shotMult * w.speedScale * SHOT_SPEED_BY_POWER_LEVEL[level] * BICYCLE_SPEED_MULTIPLIER;
    this.startCutIn('left', this.character, level, BICYCLE_TITLE);
    this.ball.element = this.character.element;
    this.ball.shoot(aim.x, aim.z, speed, false, true, true, 1, level, 0, 0);
    if (curve !== 0) this.ball.spin = curve * CURVE_ACCEL;
    emitImpact('power');
    this.player.playBicycle();
    soundFX.kick();
  }

  /** Small rising caption above the player (combo feedback). */
  private popText(text: string, color: number): void {
    const p = projectToScreen(this.player.x, this.player.z, this.player.y);
    const t = this.add
      .bitmapText(p.screenX, p.screenY - CHARACTER_HEIGHT - 10, HUD.PIXEL_FONT_KEY, HUD.toHudText(text))
      .setScale(POPUP_TEXT_SCALE)
      .setOrigin(0.5)
      .setTint(color)
      .setDepth(25000);
    this.tweens.add({
      targets: t,
      y: t.y - POPUP_RISE_PX,
      alpha: 0,
      duration: POPUP_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
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
    const baseSpeed = SHOT_SPEED_NORMAL * this.shotMult * aim.speedScale;
    this.startCutIn('left', this.character, BALL_POWER_LEVEL_MAX, CUTIN_SUPER_TITLE);
    this.ball.element = this.character.element;
    emitImpact('power');
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
          SHOT_SPEED_NORMAL * this.shotMult * SUPER_CONTROL_SPEED_MULTIPLIER,
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
    const code = (def: CharacterDef) => HUD.toHudText(def.teamCode).slice(0, HUD.TEAM_CODE_LENGTH);
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

    // Energy bars (CLAUDE.md §5) — top corners so no thumb covers them
    // (M7.2). Rival's bar too: the clash table depends on it.
    this.powerSegmentBoxes = this.createEnergyBar(HUD.ENERGY_BAR_X, 'left', HUD.ENERGY_LABEL, HUD.ENERGY_LABEL_COLOR);
    this.rivalSegmentBoxes = this.createEnergyBar(
      HUD.RIVAL_ENERGY_BAR_RIGHT,
      'right',
      HUD.RIVAL_ENERGY_LABEL,
      HUD.RIVAL_ENERGY_LABEL_COLOR,
    );

    // Footer: keyboard map — only on devices with a real keyboard/mouse.
    if (!isTouchDevice()) {
      this.add
        .bitmapText(10, GAME_HEIGHT + 2, HUD.PIXEL_FONT_KEY, HUD.toHudText('WASD=Hareket  Space=Zıpla  Shift=Dash  Sol tık=Şut/Tut  Sağ tık=Özel  P=Duraklat'))
        .setScale(HUD.FOOTER_FONT_SCALE)
        .setOrigin(0, 1)
        .setTint(HUD.FOOTER_KEYS_COLOR)
        .setDepth(10000);
    }
  }

  /** 3 energy cells anchored at `edgeX` (left edge for 'left', right edge
   * for 'right'), with a label above. */
  private createEnergyBar(edgeX: number, align: 'left' | 'right', label: string, color: number): Phaser.GameObjects.Image[] {
    const cells: Phaser.GameObjects.Image[] = [];
    const cellW = this.textures.get('hud_energy_empty').getSourceImage().width * HUD.ENERGY_CELL_SCALE;
    const total = POWER_MAX_SEGMENTS * cellW + (POWER_MAX_SEGMENTS - 1) * HUD.ENERGY_CELL_GAP;
    const left = align === 'left' ? edgeX : edgeX - total;
    const cellH = this.textures.get('hud_energy_empty').getSourceImage().height * HUD.ENERGY_CELL_SCALE;
    const pad = HUD.ENERGY_PLATE_PAD;
    const plateTop = HUD.ENERGY_BAR_Y - 16 - 16 - pad;
    const plateBottom = HUD.ENERGY_BAR_Y + cellH / 2 + pad;
    this.add
      .rectangle(left - pad, plateTop, total + pad * 2, plateBottom - plateTop, HUD.ENERGY_PLATE_COLOR, HUD.ENERGY_PLATE_ALPHA)
      .setOrigin(0)
      .setDepth(9999);
    this.add
      .bitmapText(align === 'left' ? left : edgeX, HUD.ENERGY_BAR_Y - 16, HUD.PIXEL_FONT_KEY, HUD.toHudText(label))
      .setScale(HUD.ENERGY_LABEL_SCALE)
      .setOrigin(align === 'left' ? 0 : 1, 1)
      .setTint(color)
      .setDepth(10000);
    for (let i = 0; i < POWER_MAX_SEGMENTS; i += 1) {
      // Rival's cells fill from the right edge inward (mirror).
      const slot = align === 'left' ? i : POWER_MAX_SEGMENTS - 1 - i;
      const cell = this.add
        .image(left + slot * (cellW + HUD.ENERGY_CELL_GAP) + cellW / 2, HUD.ENERGY_BAR_Y, 'hud_energy_empty')
        .setScale(HUD.ENERGY_CELL_SCALE)
        .setDepth(10000);
      cells.push(cell);
    }
    return cells;
  }

  private createPauseButton(): void {
    const sz = HUD.PAUSE_BUTTON_SIZE;
    const btn = this.add
      .rectangle(HUD.PAUSE_BUTTON_X, HUD.PAUSE_BUTTON_Y, sz, sz, HUD.UI_BUTTON_COLOR, 0.85)
      .setStrokeStyle(3, HUD.UI_BUTTON_BORDER)
      .setDepth(10000)
      .setInteractive({ useHandCursor: true });
    const barW = sz * 0.16;
    const barH = sz * 0.5;
    for (const dx of [-barW, barW]) {
      this.add.rectangle(HUD.PAUSE_BUTTON_X + dx, HUD.PAUSE_BUTTON_Y, barW, barH, 0xffffff).setDepth(10001);
    }
    btn.on('pointerup', () => {
      soundFX.click();
      this.setPaused(true);
    });
  }

  /** M7.2 pause: freezes the match (update() returns early) and shows
   * Devam / Yeniden / Ana menü. */
  private setPaused(on: boolean): void {
    if (this.matchOver || on === this.paused) return;
    this.paused = on;
    soundFX.setDucked(on);
    this.pauseMenu?.destroy();
    this.pauseMenu = null;
    if (!on) {
      this.tweens.resumeAll();
      return;
    }
    this.tweens.pauseAll();
    const root = this.add.container(0, 0).setDepth(HUD.PAUSE_DEPTH);
    root.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, HUD.PAUSE_OVERLAY_ALPHA).setOrigin(0).setInteractive());
    root.add(pixelText(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 130, HUD.PAUSE_TITLE, HUD.PAUSE_TITLE_SCALE, HUD.UI_TITLE_COLOR));
    const items: [string, () => void, boolean][] = [
      ['DEVAM', () => this.setPaused(false), true],
      ['YENİDEN BAŞLA', () => this.scene.restart(), false],
      ['ANA MENÜ', () => this.scene.start('Menu'), false],
    ];
    const step = HUD.PAUSE_MENU_BUTTON_H + HUD.PAUSE_MENU_BUTTON_GAP;
    items.forEach(([label, fn, primary], i) => {
      const b = makeFancyButton(
        this,
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 40 + i * step,
        HUD.PAUSE_MENU_BUTTON_W,
        HUD.PAUSE_MENU_BUTTON_H,
        label,
        primary ? PAUSE_PRIMARY_COLOR : HUD.UI_BUTTON_COLOR,
        fn,
        { labelScale: 3 },
      );
      root.add(b.container);
    });
    this.pauseMenu = root;
  }

  private updatePowerBar(): void {
    this.fillEnergyCells(this.powerSegmentBoxes, this.player.powerSegments);
    this.fillEnergyCells(this.rivalSegmentBoxes, this.opponent.character.powerSegments);
  }

  /** M7.3: dim dash/özel when they can't fire; ring around Aksiyon while
   * charging (white until it counts as a power shot, then the element
   * colour, full ring = whole bar spent). */
  private updateButtonFeedback(): void {
    this.input1.setDashAvailable(this.player.canDash);
    this.input1.setSpecialAvailable(this.player.powerSegments >= SUPER_MOVE_SEGMENT_COST);
    if (this.shotChargeSeconds === null) {
      this.input1.setActionRing(0, 0);
      return;
    }
    const energy = Math.floor(this.player.powerSegments + 1e-6);
    if (this.shotChargeSeconds < SHOT_CHARGE_TAP_SECONDS || energy === 0) {
      this.input1.setActionRing(Math.min(1, this.shotChargeSeconds / SHOT_CHARGE_TAP_SECONDS) * 0.25, BUTTON_RING_TAP_COLOR);
    } else {
      this.input1.setActionRing(energy / POWER_MAX_SEGMENTS, elementColor(this.character.element, energy));
    }
  }

  private fillEnergyCells(cells: Phaser.GameObjects.Image[], energy: number): void {
    const filled = Math.floor(energy + 1e-6);
    cells.forEach((cell, i) => {
      const key = i < filled ? 'hud_energy_full' : 'hud_energy_empty';
      if (cell.texture.key === key) return;
      cell.setTexture(key);
      if (i < filled) {
        // Pop when a cell fills, so gaining energy is noticed mid-play.
        this.tweens.add({
          targets: cell,
          scale: { from: HUD.ENERGY_CELL_SCALE * HUD.ENERGY_CELL_POP, to: HUD.ENERGY_CELL_SCALE },
          duration: HUD.ENERGY_CELL_POP_MS,
        });
      }
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
    soundFX.whistle('end');
    const rewards = grantMatchRewards(this.character.id, this.scoreLeft, this.scoreRight);
    this.scene.start('Result', {
      rewards,
      scoreLeft: this.scoreLeft,
      scoreRight: this.scoreRight,
      characterId: this.character.id,
      stadiumId: this.stadium.id,
    });
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
