import * as A from '../config/audio';
import type { ImpactKind } from '../config/feel';
import { loadPref, savePref } from './prefs';

/**
 * M9.2 sound: synthesized SFX, stadium crowd and chiptune music, all Web
 * Audio (no files — nothing to license, works offline). Graph:
 *
 *   sfx bus ─┐
 *   music bus ┼─► master ─► speakers
 *   crowd bus ┘
 *
 * The context is created lazily and resumed on the first user gesture
 * (browsers block audio before one). Tuning: config/audio.ts.
 */

type Bus = 'sfx' | 'music' | 'crowd';

interface ToneOpts {
  delay?: number;
  /** Exponential pitch glide target. */
  slideTo?: number;
  bus?: Bus;
  /** Linear attack before the decay (default: instant). */
  attack?: number;
}

interface NoiseOpts {
  delay?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqTo?: number;
  q?: number;
  bus?: Bus;
  attack?: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C4' / 'F#3' / 'Bb2' → Hz (A4 = 440). */
export function noteToFreq(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
  if (!m) return 0;
  const semi = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ParsedTrack {
  def: A.MusicTrack;
  bass: number[];
  lead: number[];
  drums: string;
  steps: number;
}

function parseTrack(def: A.MusicTrack): ParsedTrack {
  const melodic = (bars: string[]) => bars.flatMap((b) => b.trim().split(/\s+/).map((t) => (t === '.' ? 0 : noteToFreq(t))));
  const bass = melodic(def.bass);
  const lead = melodic(def.lead);
  const drums = def.drums.join('');
  return { def, bass, lead, drums, steps: Math.max(bass.length, lead.length, drums.length) };
}

export class SoundFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<Bus, GainNode> | null = null;
  private noise: AudioBuffer | null = null;
  /** M9.1: true while the app is in the background — no sound at all. */
  private suspended = false;
  private ducked = false;
  private sfxOn = loadPref(A.PREF_SFX_KEY) !== '0';
  private musicOn = loadPref(A.PREF_MUSIC_KEY) !== '0';
  private lastBounceAt = -Infinity;

  // Crowd loop
  private crowdNodes: { src: AudioBufferSourceNode; gain: GainNode; band: BiquadFilterNode; lfo: OscillatorNode } | null = null;
  private crowdWanted = false;

  // Music sequencer
  private trackId: A.MusicTrackId | null = null;
  private track: ParsedTrack | null = null;
  private step = 0;
  private nextStepTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  // --- Settings / lifecycle ----------------------------------------------

  get sfxEnabled(): boolean {
    return this.sfxOn;
  }

  get musicEnabled(): boolean {
    return this.musicOn;
  }

  setSfxEnabled(on: boolean): void {
    this.sfxOn = on;
    savePref(A.PREF_SFX_KEY, on ? '1' : '0');
    if (!on) this.stopCrowd(true);
    else if (this.crowdWanted) this.startCrowd();
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    savePref(A.PREF_MUSIC_KEY, on ? '1' : '0');
    if (!on) this.stopSequencer();
    else if (this.trackId) this.startSequencer();
  }

  setSuspended(on: boolean): void {
    this.suspended = on;
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Pause menu: music + crowd drop to DUCK_FACTOR. */
  setDucked(on: boolean): void {
    this.ducked = on;
    if (!this.ctx || !this.buses) return;
    const t = this.ctx.currentTime;
    const f = on ? A.DUCK_FACTOR : 1;
    this.fadeTo(this.buses.music.gain, A.MUSIC_VOLUME * f, t);
    this.fadeTo(this.buses.crowd.gain, A.CROWD_VOLUME * f, t);
  }

  /** Browsers start audio suspended until a gesture; resume on the first one. */
  installUnlock(): void {
    const unlock = () => {
      if (this.suspended) return;
      const ctx = this.getContext();
      if (ctx.state !== 'running') void ctx.resume();
      if (ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
        window.removeEventListener('touchend', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchend', unlock, true);
  }

  private fadeTo(param: AudioParam, value: number, t: number): void {
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + A.BUS_FADE_SECONDS);
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = A.MASTER_VOLUME;
      this.master.connect(ctx.destination);
      const bus = (v: number) => {
        const g = ctx.createGain();
        g.gain.value = v;
        g.connect(this.master!);
        return g;
      };
      const f = this.ducked ? A.DUCK_FACTOR : 1;
      this.buses = { sfx: bus(A.SFX_VOLUME), music: bus(A.MUSIC_VOLUME * f), crowd: bus(A.CROWD_VOLUME * f) };
      const len = Math.floor(ctx.sampleRate * A.NOISE_BUFFER_SECONDS);
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended' && !this.suspended) void this.ctx.resume();
    return this.ctx;
  }

  /** Context ready and allowed to make this bus's sound right now? */
  private ready(bus: Bus): AudioContext | null {
    if (this.suspended) return null;
    if (bus === 'music' ? !this.musicOn : !this.sfxOn) return null;
    return this.getContext();
  }

  // --- Primitives --------------------------------------------------------

  private envelope(gain: GainNode, peak: number, start: number, duration: number, attack = 0): void {
    gain.gain.setValueAtTime(0.0001, start);
    if (attack > 0) gain.gain.linearRampToValueAtTime(peak, start + attack);
    else gain.gain.setValueAtTime(peak, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(duration, attack + 0.01));
  }

  private tone(freq: number, duration: number, type: OscillatorType, peak: number, o: ToneOpts = {}): void {
    const bus = o.bus ?? 'sfx';
    const ctx = this.ready(bus);
    if (!ctx || !this.buses || freq <= 0) return;
    this.toneAt(ctx, ctx.currentTime + (o.delay ?? 0), freq, duration, type, peak, bus, o);
  }

  private toneAt(ctx: AudioContext, start: number, freq: number, duration: number, type: OscillatorType, peak: number, bus: Bus, o: ToneOpts = {}): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, start + duration);
    this.envelope(gain, peak, start, duration, o.attack);
    osc.connect(gain);
    gain.connect(this.buses![bus]);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private noiseBurst(duration: number, peak: number, o: NoiseOpts = {}): void {
    const bus = o.bus ?? 'sfx';
    const ctx = this.ready(bus);
    if (!ctx || !this.buses) return;
    this.noiseAt(ctx, ctx.currentTime + (o.delay ?? 0), duration, peak, bus, o);
  }

  private noiseAt(ctx: AudioContext, start: number, duration: number, peak: number, bus: Bus, o: NoiseOpts = {}): void {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const gain = ctx.createGain();
    let head: AudioNode = gain;
    if (o.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = o.filter;
      filter.frequency.setValueAtTime(o.freq ?? 1000, start);
      if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, start + duration);
      filter.Q.value = o.q ?? 1;
      filter.connect(gain);
      head = filter;
    }
    this.envelope(gain, peak, start, duration, o.attack);
    src.connect(head);
    gain.connect(this.buses![bus]);
    // Random offset so repeated bursts don't sound identical.
    const maxOffset = Math.max(0, A.NOISE_BUFFER_SECONDS - duration - 0.05);
    src.start(start, Math.random() * maxOffset, duration + 0.02);
  }

  private notes(notes: readonly number[], step: number, duration: number, peak: number, type: OscillatorType = 'square'): void {
    notes.forEach((f, i) => this.tone(f, duration, type, peak, { delay: i * step }));
  }

  // --- Sound effects -----------------------------------------------------

  /** Foot on ball (any strike, first touch). */
  kick(): void {
    const k = A.KICK;
    this.tone(k.thumpFrom, k.thumpSeconds, 'sine', k.thumpGain, { slideTo: k.thumpTo });
    this.noiseBurst(k.clickSeconds, k.clickGain, { filter: 'highpass', freq: k.clickHighpass });
  }

  /** Power / clash impact — plays when the hitstop starts (after the cut-in). */
  impact(kind: ImpactKind): void {
    if (kind === 'normal') return;
    const im = A.IMPACT;
    const p = im[kind];
    this.tone(p.boomFrom, p.boomSeconds, 'sine', p.boomGain, { slideTo: p.boomTo });
    this.noiseBurst(im.whooshSeconds, p.whooshGain, { filter: 'bandpass', freq: im.whooshFrom, freqTo: im.whooshTo, q: 0.8 });
    if (kind === 'clash') im.clashRing.forEach((f) => this.tone(f, im.clashRingSeconds, 'square', im.clashRingGain));
    this.crowdOoh();
  }

  /** Rising sweep under the portrait cut-in. */
  powerCharge(level: number): void {
    const c = A.POWER_CHARGE;
    const g = c.baseGain + c.gainPerLevel * Math.max(0, level - 1);
    this.noiseBurst(c.seconds, g, { filter: 'bandpass', freq: c.sweepFrom, freqTo: c.sweepTo, q: 2, attack: c.seconds * 0.8 });
    this.tone(c.shimmerFreq, c.seconds, 'triangle', c.shimmerGain, { attack: c.seconds * 0.7, slideTo: c.shimmerFreq * 1.5 });
  }

  /** Ball bounce. `intensity` 0..1 (default: a solid bounce). */
  bounce(intensity = 0.7): void {
    const b = A.BOUNCE;
    if (intensity < b.minIntensity) return;
    const ctx = this.ready('sfx');
    if (!ctx) return;
    if (ctx.currentTime - this.lastBounceAt < b.minIntervalSeconds) return;
    this.lastBounceAt = ctx.currentTime;
    const i = Math.min(1, intensity);
    this.tone(b.thudFrom, b.seconds, 'sine', b.maxGain * i, { slideTo: b.thudTo });
    this.noiseBurst(b.seconds * 0.6, b.noiseGain * i, { filter: 'lowpass', freq: b.noiseLowpass });
  }

  /** Bounce from a world speed (px/s) — quiet taps are skipped. */
  bounceAtSpeed(speed: number): void {
    this.bounce(Math.abs(speed) / A.BOUNCE.fullSpeed);
  }

  /** Keeper catch / spill: glove slap. */
  save(): void {
    const s = A.SAVE;
    this.noiseBurst(s.slapSeconds, s.slapGain, { filter: 'bandpass', freq: s.slapBandpass, q: 1.2 });
    this.tone(s.bodyFreq, s.bodySeconds, 'square', s.bodyGain);
  }

  parry(): void {
    const p = A.PARRY;
    this.notes(p.notes, p.stepSeconds, p.seconds, p.gain, 'triangle');
  }

  dash(): void {
    const d = A.DASH;
    this.noiseBurst(d.seconds, d.gain, { filter: 'bandpass', freq: d.from, freqTo: d.to, q: 1.5 });
  }

  jump(): void {
    const j = A.JUMP;
    this.tone(j.from, j.seconds, 'square', j.gain, { slideTo: j.to });
  }

  pickup(): void {
    const p = A.PICKUP;
    this.notes(p.notes, p.stepSeconds, p.seconds, p.gain);
  }

  click(): void {
    const c = A.CLICK;
    this.tone(c.freq, c.seconds, 'square', c.gain);
  }

  /** Referee whistle: kickoff = one long blast, full time = three. */
  whistle(kind: 'start' | 'end' = 'start'): void {
    const ctx = this.ready('sfx');
    if (!ctx || !this.buses) return;
    const w = A.WHISTLE;
    let t = ctx.currentTime;
    for (const len of w[kind]) {
      const gain = ctx.createGain();
      this.envelope(gain, w.gain, t, len, w.attackSeconds);
      gain.connect(this.buses.sfx);
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = w.vibratoHz;
      depth.gain.value = w.vibratoDepth;
      lfo.connect(depth);
      for (const f of w.freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        depth.connect(osc.frequency);
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + len + 0.02);
      }
      lfo.start(t);
      lfo.stop(t + len + 0.02);
      t += len + w.gapSeconds;
    }
  }

  /** Goal: crowd roar + a short jingle. */
  goal(): void {
    const j = A.GOAL_JINGLE;
    this.notes(j.notes, j.stepSeconds, j.seconds, j.gain, 'square');
    this.crowdRoar();
  }

  /** Result-screen stinger. */
  stinger(kind: 'win' | 'draw' | 'lose'): void {
    const s = A.STINGERS[kind];
    this.notes(s.notes, s.stepSeconds, s.seconds, s.gain, 'square');
  }

  // --- Crowd -------------------------------------------------------------

  /** Stadium murmur loop (match only). */
  startCrowd(): void {
    this.crowdWanted = true;
    if (this.crowdNodes) return;
    const ctx = this.ready('crowd');
    if (!ctx || !this.buses || !this.noise) return;
    const c = A.CROWD;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = c.bandpassFreq;
    band.Q.value = c.bandpassQ;
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.frequency.value = c.rumbleLowpass;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = c.rumbleGain;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(c.baseGain, t + c.fadeInSeconds);
    // Slow swell: an LFO adds ± swellDepth around the base level.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = c.swellHz;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = c.swellDepth;
    lfo.connect(lfoDepth);
    lfoDepth.connect(gain.gain);
    src.connect(band);
    band.connect(gain);
    src.connect(rumble);
    rumble.connect(rumbleGain);
    rumbleGain.connect(gain);
    gain.connect(this.buses.crowd);
    src.start(t);
    lfo.start(t);
    this.crowdNodes = { src, gain, band, lfo };
  }

  /** `keepWanted`: switched off in settings — restart it when re-enabled. */
  stopCrowd(keepWanted = false): void {
    if (!keepWanted) this.crowdWanted = false;
    const n = this.crowdNodes;
    if (!n || !this.ctx) return;
    this.crowdNodes = null;
    const t = this.ctx.currentTime;
    this.fadeTo(n.gain.gain, 0.0001, t);
    n.src.stop(t + A.BUS_FADE_SECONDS + 0.05);
    n.lfo.stop(t + A.BUS_FADE_SECONDS + 0.05);
  }

  private crowdSwell(peak: number, attack: number, hold: number, release: number, bandTo?: number): void {
    const n = this.crowdNodes;
    if (!n || !this.ctx || this.suspended) return;
    const c = A.CROWD;
    const t = this.ctx.currentTime;
    const g = n.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.setValueAtTime(peak, t + attack + hold);
    g.linearRampToValueAtTime(c.baseGain, t + attack + hold + release);
    if (bandTo) {
      const f = n.band.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.linearRampToValueAtTime(bandTo, t + attack);
      f.setValueAtTime(bandTo, t + attack + hold);
      f.linearRampToValueAtTime(c.bandpassFreq, t + attack + hold + release);
    }
  }

  crowdRoar(): void {
    const c = A.CROWD;
    this.crowdSwell(c.roarGain, c.roarAttack, c.roarHold, c.roarRelease, c.roarBandFreq);
  }

  crowdOoh(): void {
    const c = A.CROWD;
    this.crowdSwell(c.oohGain, c.oohAttack, 0, c.oohRelease);
  }

  // --- Music -------------------------------------------------------------

  /** Loop a track; calling with the one already playing does nothing. */
  playMusic(id: A.MusicTrackId): void {
    if (this.trackId === id && (this.timer || !this.musicOn)) return;
    this.stopSequencer();
    this.trackId = id;
    this.track = parseTrack(A.MUSIC_TRACKS[id]);
    this.startSequencer();
  }

  stopMusic(): void {
    this.stopSequencer();
    this.trackId = null;
    this.track = null;
  }

  get currentMusic(): A.MusicTrackId | null {
    return this.trackId;
  }

  private startSequencer(): void {
    if (!this.musicOn || !this.track || this.timer) return;
    this.step = 0;
    this.nextStepTime = -1;
    this.timer = setInterval(() => this.tick(), A.MUSIC_TICK_MS);
    this.tick();
  }

  private stopSequencer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const tr = this.track;
    if (!tr || this.suspended) return;
    const ctx = this.ready('music');
    // Not unlocked yet: wait instead of piling notes on a frozen clock.
    if (!ctx || ctx.state !== 'running' || !this.buses) return;
    const stepSec = 60 / tr.def.bpm / 4;
    if (this.nextStepTime < ctx.currentTime) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + A.MUSIC_LOOKAHEAD_SECONDS) {
      this.playStep(ctx, tr, this.step % tr.steps, this.nextStepTime, stepSec);
      this.step = (this.step + 1) % tr.steps;
      this.nextStepTime += stepSec;
    }
  }

  private playStep(ctx: AudioContext, tr: ParsedTrack, i: number, t: number, stepSec: number): void {
    const d = tr.def;
    const bass = tr.bass[i] ?? 0;
    const lead = tr.lead[i] ?? 0;
    if (bass) this.toneAt(ctx, t, bass, stepSec * d.bassSteps * 0.95, 'triangle', d.bassGain, 'music');
    if (lead) this.toneAt(ctx, t, lead, stepSec * d.leadSteps * 0.9, 'square', d.leadGain, 'music');
    const hit = tr.drums[i] ?? '.';
    const dr = A.DRUMS;
    const g = d.drumGain;
    if (hit === 'k' || hit === 'x') this.toneAt(ctx, t, dr.kick.from, dr.kick.seconds, 'sine', dr.kick.gain * g, 'music', { slideTo: dr.kick.to });
    if (hit === 'h' || hit === 'x') this.noiseAt(ctx, t, dr.hat.seconds, dr.hat.gain * g, 'music', { filter: 'highpass', freq: dr.hat.highpass });
    if (hit === 's') {
      this.noiseAt(ctx, t, dr.snare.seconds, dr.snare.gain * g, 'music', { filter: 'highpass', freq: dr.snare.highpass });
      this.toneAt(ctx, t, dr.snare.bodyFreq, dr.snare.seconds * 0.5, 'triangle', dr.snare.bodyGain * g, 'music');
    }
  }
}

export const soundFX = new SoundFX();
