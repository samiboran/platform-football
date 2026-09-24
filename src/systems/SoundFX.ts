/**
 * Tiny synthesized sound effects (CLAUDE.md section 5 — "Ses tasarımı").
 * No audio asset files exist yet, so these are plain Web Audio oscillator
 * blips: good enough placeholders, swap for real SFX later without
 * changing any call sites.
 */
export class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType, startGain: number, delay = 0): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + delay;
    gain.gain.setValueAtTime(startGain, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  /** Character touches the ball. */
  kick(): void {
    this.tone(180, 0.08, 'square', 0.15);
  }

  /** Ball bounces off the ground/wall. */
  bounce(): void {
    this.tone(300, 0.05, 'sine', 0.08);
  }

  /** Goal! A short rising arpeggio. */
  goal(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => this.tone(freq, 0.25, 'triangle', 0.2, i * 0.09));
  }

  /** Match start/end whistle. */
  whistle(): void {
    this.tone(2200, 0.35, 'sine', 0.12);
  }
}

export const soundFX = new SoundFX();
