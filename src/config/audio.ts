/**
 * M9.2 audio: every sound is synthesized at runtime with Web Audio (no
 * audio files, no licences, works offline). All levels, envelopes and the
 * music patterns live here so they can be tuned without touching
 * systems/SoundFX.ts.
 */

/** Bus levels (0..1). Master feeds the speakers; the three buses feed master. */
export const MASTER_VOLUME = 0.8;
export const SFX_VOLUME = 0.9;
export const MUSIC_VOLUME = 0.32;
export const CROWD_VOLUME = 0.55;
/** Music + crowd multiplier while the match is paused. */
export const DUCK_FACTOR = 0.3;
/** Seconds for bus fades (duck, music stop). */
export const BUS_FADE_SECONDS = 0.25;

/** localStorage keys for the on/off switches (the M9.2 settings screen
 * flips these through soundFX.setSfxEnabled / setMusicEnabled). */
export const PREF_SFX_KEY = 'pf.audio.sfx';
export const PREF_MUSIC_KEY = 'pf.audio.music';

/** Length of the shared white-noise buffer every noise sound slices. */
export const NOISE_BUFFER_SECONDS = 2;

// --- Sound effects --------------------------------------------------------

/** Leather kick: a pitch-dropping thump plus a short high click. */
export const KICK = {
  thumpFrom: 160,
  thumpTo: 55,
  thumpSeconds: 0.12,
  thumpGain: 0.45,
  clickHighpass: 2200,
  clickSeconds: 0.03,
  clickGain: 0.22,
};

/** Power / clash impact boom that lands after the cut-in (with the hitstop). */
export const IMPACT = {
  power: { boomFrom: 110, boomTo: 32, boomSeconds: 0.4, boomGain: 0.6, whooshGain: 0.28 },
  clash: { boomFrom: 140, boomTo: 40, boomSeconds: 0.5, boomGain: 0.7, whooshGain: 0.35 },
  whooshFrom: 500,
  whooshTo: 3200,
  whooshSeconds: 0.35,
  /** Metallic ring added to a clash (two detuned squares). */
  clashRing: [330, 347],
  clashRingSeconds: 0.25,
  clashRingGain: 0.08,
};

/** Rising "charge" sweep under the portrait cut-in; grows with the level. */
export const POWER_CHARGE = {
  sweepFrom: 300,
  sweepTo: 2400,
  seconds: 0.45,
  baseGain: 0.2,
  gainPerLevel: 0.06,
  shimmerFreq: 1320,
  shimmerGain: 0.05,
};

/** Ball bounce (ground / walls / body). Speed → loudness. */
export const BOUNCE = {
  thudFrom: 230,
  thudTo: 110,
  seconds: 0.07,
  maxGain: 0.22,
  noiseLowpass: 900,
  noiseGain: 0.12,
  /** World speed (px/s) that gives full loudness. */
  fullSpeed: 900,
  /** Quieter impacts than this fraction are skipped (rolling ball). */
  minIntensity: 0.12,
  /** Never more than one bounce sound per this many seconds. */
  minIntervalSeconds: 0.06,
};

/** Keeper catch: glove slap. */
export const SAVE = {
  slapBandpass: 1500,
  slapSeconds: 0.08,
  slapGain: 0.4,
  bodyFreq: 110,
  bodySeconds: 0.1,
  bodyGain: 0.18,
};

/** Perfect parry: bright two-note ding. */
export const PARRY = { notes: [1568, 2093], seconds: 0.22, gain: 0.14, stepSeconds: 0.05 };

/** Dash whoosh (filtered noise sweeping down). */
export const DASH = { from: 1800, to: 450, seconds: 0.16, gain: 0.28 };

/** Jump: quick upward blip. */
export const JUMP = { from: 280, to: 620, seconds: 0.1, gain: 0.07 };

/** Energy drink pickup. */
export const PICKUP = { notes: [660, 990, 1320], seconds: 0.07, gain: 0.1, stepSeconds: 0.045 };

/** Menu / UI tap. */
export const CLICK = { freq: 880, seconds: 0.035, gain: 0.07 };

/** Referee whistle: two close sines (beating) with a fast vibrato trill. */
export const WHISTLE = {
  freqs: [2750, 2890],
  vibratoHz: 28,
  vibratoDepth: 70,
  gain: 0.09,
  attackSeconds: 0.015,
  /** Blast lengths: kickoff = one long, full time = short-short-long. */
  start: [0.45],
  end: [0.18, 0.18, 0.7],
  gapSeconds: 0.09,
};

/** Goal jingle on top of the crowd roar. */
export const GOAL_JINGLE = { notes: [523.25, 659.25, 783.99, 1046.5, 1318.5], seconds: 0.22, gain: 0.13, stepSeconds: 0.085 };

/** Result-screen stingers. */
export const STINGERS = {
  win: { notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5], stepSeconds: 0.11, seconds: 0.3, gain: 0.13 },
  draw: { notes: [523.25, 659.25, 587.33, 523.25], stepSeconds: 0.14, seconds: 0.3, gain: 0.12 },
  lose: { notes: [659.25, 587.33, 523.25, 392.0], stepSeconds: 0.18, seconds: 0.4, gain: 0.12 },
};

/** Result stinger waits for the full-time whistle to finish. */
export const STINGER_DELAY_SECONDS = 1.3;

// --- Crowd ----------------------------------------------------------------

/** Stadium murmur: looping noise through a band-pass, slowly swelling.
 * Goals and power shots push it up for a moment. */
export const CROWD = {
  bandpassFreq: 650,
  bandpassQ: 0.6,
  rumbleLowpass: 260,
  rumbleGain: 0.35,
  baseGain: 0.16,
  swellHz: 0.13,
  swellDepth: 0.05,
  /** Goal roar: peak gain, attack, hold, release (seconds); the band
   * filter brightens while it roars. */
  roarGain: 0.75,
  roarAttack: 0.25,
  roarHold: 1.4,
  roarRelease: 2.6,
  roarBandFreq: 1150,
  /** "Ooh" on a power shot. */
  oohGain: 0.38,
  oohAttack: 0.12,
  oohRelease: 1.0,
  fadeInSeconds: 1.2,
};

// --- Music ----------------------------------------------------------------

/**
 * Tiny chiptune sequencer. Each track loops `bars`; one bar = 16 steps
 * (16th notes). Melodic channels are space-separated tokens per step: a
 * note name like `C4`/`F#3`, or `.` for nothing. Drum channel: one char per
 * step — k = kick, s = snare, h = hat, x = kick + hat, `.` = nothing.
 * Everything here is original, written for this game.
 */
export interface MusicTrack {
  bpm: number;
  bass: string[];
  lead: string[];
  drums: string[];
  /** Steps each melodic note rings. */
  bassSteps: number;
  leadSteps: number;
  bassGain: number;
  leadGain: number;
  drumGain: number;
}

export const MUSIC_TRACKS = {
  /** Menus: sunny street-samba groove, C – Am – F – G. */
  menu: {
    bpm: 112,
    bass: [
      'C2 . . C2 . . G2 . C2 . . C2 . . G2 .',
      'A1 . . A1 . . E2 . A1 . . A1 . . E2 .',
      'F1 . . F1 . . C2 . F1 . . F1 . . C2 .',
      'G1 . . G1 . . D2 . G1 . . G1 . . D2 .',
    ],
    lead: [
      'E4 . G4 . C5 . . . B4 . G4 . A4 . G4 .',
      'E4 . . . A4 . C5 . B4 . A4 . E4 . . .',
      'F4 . A4 . C5 . A4 . D5 . C5 . A4 . F4 .',
      'G4 . B4 . D5 . . . C5 . B4 . A4 . G4 .',
    ],
    drums: ['k.h.s.hkk.h.s.hh', 'k.h.s.hkk.h.s.hh', 'k.h.s.hkk.h.s.hh', 'k.h.s.hkk.hss.sh'],
    bassSteps: 2,
    leadSteps: 2,
    bassGain: 0.32,
    leadGain: 0.09,
    drumGain: 0.5,
  },
  /** Match: driving minor loop, sparse lead so SFX stay readable. */
  match: {
    bpm: 138,
    bass: [
      'A1 . A1 . A1 . A2 . A1 . A1 . A2 . E2 .',
      'F1 . F1 . F1 . F2 . F1 . F1 . F2 . C2 .',
      'C2 . C2 . C2 . C3 . C2 . C2 . C3 . G2 .',
      'G1 . G1 . G1 . G2 . G1 . G1 . B1 . D2 .',
    ],
    lead: [
      'A4 . . C5 . . E5 . . . D5 . C5 . . .',
      'C5 . . A4 . . F4 . . . G4 . A4 . . .',
      'G4 . . C5 . . E5 . . . D5 . E5 . G5 .',
      'D5 . . B4 . . G4 . . . A4 . B4 . . .',
    ],
    drums: ['x.h.s.h.k.k.s.hh', 'x.h.s.h.k.k.s.hh', 'x.h.s.h.k.k.s.hh', 'x.h.s.h.k.ksss.s'],
    bassSteps: 1,
    leadSteps: 2,
    bassGain: 0.3,
    leadGain: 0.06,
    drumGain: 0.45,
  },
} satisfies Record<string, MusicTrack>;
export type MusicTrackId = keyof typeof MUSIC_TRACKS;

/** Drum voices used by the sequencer. */
export const DRUMS = {
  kick: { from: 130, to: 45, seconds: 0.14, gain: 0.9 },
  snare: { highpass: 1400, seconds: 0.12, gain: 0.45, bodyFreq: 190, bodyGain: 0.25 },
  hat: { highpass: 7000, seconds: 0.03, gain: 0.22 },
};

/** Sequencer scheduling: look this far ahead, wake up this often. */
export const MUSIC_LOOKAHEAD_SECONDS = 0.12;
export const MUSIC_TICK_MS = 25;
