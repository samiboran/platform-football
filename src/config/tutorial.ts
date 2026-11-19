/**
 * M9.2 first-launch tutorial (Eğitim): step-by-step mini tasks inside a
 * clock-less match on the standard pitch. Texts, thresholds and layout live
 * here; the step logic is in systems/Tutorial.ts.
 */

/** Set once the tutorial has been auto-started (so it never auto-starts
 * twice, even if the player leaves halfway). */
export const TUTORIAL_SEEN_KEY = 'pf.tutorial.seen';
/** Set when every step is finished or the player pressed ATLA. */
export const TUTORIAL_DONE_KEY = 'pf.tutorial.done';

export type TutorialStepId = 'move' | 'jump' | 'dash' | 'shot' | 'power' | 'lob' | 'catch' | 'falso' | 'bicycle';

export interface TutorialStepDef {
  id: TutorialStepId;
  title: string;
  /** Instruction on a touch device. */
  touch: string;
  /** Instruction with keyboard + mouse. */
  pc: string;
  /** How many times the task must be done. */
  repeat: number;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'move',
    title: 'HAREKET',
    touch: 'SOL TARAFTA PARMAĞINI KAYDIR: SAĞA-SOLA VE YUKARI-AŞAĞI YÜRÜ',
    pc: 'WASD (YA DA OKLAR) İLE SAĞA-SOLA VE YUKARI-AŞAĞI YÜRÜ',
    repeat: 1,
  },
  { id: 'jump', title: 'ZIPLA', touch: 'ZIPLA TUŞUNA BAS', pc: 'SPACE İLE ZIPLA', repeat: 2 },
  {
    id: 'dash',
    title: 'DASH',
    touch: 'JOYSTICK İLE BİR YÖN SEÇ, DASH TUŞUNA BAS (1 ENERJİ)',
    pc: 'BİR YÖNE BASARKEN SHIFT = DASH (1 ENERJİ)',
    repeat: 2,
  },
  {
    id: 'shot',
    title: 'ŞUT',
    touch: 'TOPA GİT, AKSİYON TUŞUNA DOKUN. JOYSTICK YÖNÜ = ŞUT YÖNÜ',
    pc: 'TOPA GİT, SOL TIK = ŞUT. HAREKET YÖNÜ = ŞUT YÖNÜ',
    repeat: 2,
  },
  {
    id: 'power',
    title: 'POWER ŞUT',
    touch: 'AKSİYONU BASILI TUT, BIRAK: BARIN TAMAMI HARCANIR',
    pc: 'SOL TIKI BASILI TUT, BIRAK: BARIN TAMAMI HARCANIR',
    repeat: 1,
  },
  {
    id: 'lob',
    title: 'LOB',
    touch: 'JOYSTICK GERİ (KENDİ KALENE) + AKSİYON = LOB',
    pc: 'A (GERİ) BASILIYKEN SOL TIK = LOB',
    repeat: 1,
  },
  {
    id: 'catch',
    title: 'TUT / PARRY',
    touch: 'TOP GELİRKEN AKSİYONA BAS = TUT. TAM TEMAS ANINDA = MÜKEMMEL PARRY',
    pc: 'TOP GELİRKEN SOL TIK = TUT. TAM TEMAS ANINDA = MÜKEMMEL PARRY',
    repeat: 2,
  },
  {
    id: 'falso',
    title: 'FALSO',
    touch: 'TOPLA ZIPLA, HAVADA YUKARI/AŞAĞI DASH, SONRA AKSİYON',
    pc: 'TOPLA SPACE, HAVADA W/S + SHIFT, SONRA SOL TIK',
    repeat: 1,
  },
  {
    id: 'bicycle',
    title: 'RÖVAŞATA',
    touch: 'HAVADAKİ TOPA ZIPLA, ÖZEL TUŞUNA BAS (TAM BAR)',
    pc: 'HAVADAKİ TOPA SPACE İLE ZIPLA, SAĞ TIK = ÖZEL (TAM BAR)',
    repeat: 1,
  },
];

// --- Step thresholds --------------------------------------------------------
/** Hareket: world distance to walk along x and along z (depth). */
export const TUTORIAL_MOVE_X = 120;
export const TUTORIAL_MOVE_Z = 50;
/** Ball steps: respawn the ball at the player's feet after it has been away
 * from the player's control for this long. */
export const TUTORIAL_BALL_RESPAWN_SECONDS = 2.2;
/** Respawned ball sits this far in front of the player (world x). */
export const TUTORIAL_BALL_OFFSET_X = 26;
/** Tut step: a practice shot from the other half every this many seconds. */
export const TUTORIAL_CATCH_SHOT_INTERVAL = 2.4;
/** Practice shot starts this far right of the centre line, at this speed. */
export const TUTORIAL_CATCH_SHOT_FROM_X = 70;
export const TUTORIAL_CATCH_SHOT_SPEED = 330;
/** Rövaşata step: ball tossed up next to the player (world x offset, vy). */
export const TUTORIAL_TOSS_OFFSET_X = 14;
export const TUTORIAL_TOSS_VY = 420;
/** Toss starts above the trap height so the feet don't grab it at once. */
export const TUTORIAL_TOSS_START_Y = 32;
/** Re-toss once the ball has been on the ground / at the feet this long. */
export const TUTORIAL_TOSS_RETRY_SECONDS = 0.5;
/** Pause between a finished step and the next one. */
export const TUTORIAL_STEP_GAP_SECONDS = 1.1;

// --- Panel layout (game px) --------------------------------------------------
export const TUTORIAL_PANEL_X = 480;
export const TUTORIAL_PANEL_Y = 118;
export const TUTORIAL_PANEL_W = 700;
export const TUTORIAL_PANEL_H = 84;
export const TUTORIAL_PANEL_COLOR = 0x1b1840;
export const TUTORIAL_PANEL_ALPHA = 0.88;
export const TUTORIAL_PANEL_DEPTH = 15000;
export const TUTORIAL_TITLE_SCALE = 3;
export const TUTORIAL_TITLE_COLOR = 0xffd34d;
export const TUTORIAL_HINT_SCALE = 2;
export const TUTORIAL_HINT_COLOR = 0xffffff;
export const TUTORIAL_DONE_COLOR = 0x5ef08a;
export const TUTORIAL_STEP_COUNT_COLOR = 0x9aa4c8;
export const TUTORIAL_SKIP_LABEL = 'ATLA';
export const TUTORIAL_SKIP_W = 90;
export const TUTORIAL_SKIP_H = 36;
export const TUTORIAL_SKIP_COLOR = 0x34495e;
/** Shown in place of the match clock. */
export const TUTORIAL_CLOCK_TEXT = 'EĞİTİM';
export const TUTORIAL_STEP_DONE_TEXT = 'TAMAM!';
export const TUTORIAL_FALSO_MISS_TEXT = 'HAVADA YUKARI/AŞAĞI DASH UNUTMA';
export const TUTORIAL_PERFECT_TEXT = 'MÜKEMMEL PARRY!';
/** Final screen. */
export const TUTORIAL_FINISH_TITLE = 'EĞİTİM TAMAM!';
export const TUTORIAL_FINISH_SUB = 'ARTIK SOKAK DÜNYA KUPASINA HAZIRSIN';
export const TUTORIAL_FINISH_PLAY = 'MAÇA BAŞLA';
export const TUTORIAL_FINISH_MENU = 'ANA MENÜ';
export const TUTORIAL_FINISH_BUTTON_W = 260;
export const TUTORIAL_FINISH_BUTTON_H = 64;
/** Settings screen button that replays the tutorial. */
export const TUTORIAL_SETTINGS_LABEL = 'EĞİTİM';
export const TUTORIAL_SETTINGS_Y = 420;
export const TUTORIAL_SETTINGS_COLOR = 0x8e44ad;
