import { POWER_MAX_SEGMENTS } from './power';

/**
 * Per-character 3-segment super move tuning (CLAUDE.md section 4/5/6 —
 * "Özellik: tek basış, süper hareket (3 segment)"). Each character's flavor
 * comes from section 6's identity table; the exact numbers live here so
 * MatchScene stays free of magic numbers.
 */

/** Full bar required and spent — matches "3 segment dolu = süper hareket". */
export const SUPER_MOVE_SEGMENT_COST = POWER_MAX_SEGMENTS;

/** Brezilya — Capoeira ters vuruş: raw power, fires along facing even
 * without holding an aim direction. */
export const SUPER_STRIKE_SPEED_MULTIPLIER = 2.0;

/** Arjantin — Gambeta: control over power, so a lower speed multiplier,
 * but the aim is guaranteed dead-center at the opponent's goal instead of
 * coming from the joystick (never mis-aimed). */
export const SUPER_CONTROL_SPEED_MULTIPLIER = 1.5;

/** Kenya — Poşet top: "zayıf şut" archetype keeps the speed modest, but the
 * aerial wobble is much wilder than a normal chaos touch. */
export const SUPER_CHAOS_SPEED_MULTIPLIER = 1.3;
export const SUPER_CHAOS_WOBBLE_MULTIPLIER = 2.2;

/** Kongo — ritimli zamanlama: a repeating beat cycle with a short "sweet
 * spot" window; landing Özellik inside it adds a bonus on top of the
 * baseline super speed ("doğru anda basınca power bonusu"). */
export const SUPER_RHYTHM_SPEED_MULTIPLIER = 1.6;
export const SUPER_RHYTHM_BONUS_MULTIPLIER = 1.35;
export const KONGO_RHYTHM_PERIOD_SECONDS = 1.2;
export const KONGO_RHYTHM_WINDOW_SECONDS = 0.18;

/** CLAUDE.md section 5: "Tutma şansı dinamiktir: hızlı topa veya özel şuta
 * karşı düşer." Even a keeper committed to a power tutuş against a super
 * shot only holds it this fraction of the time. */
export const SUPER_SHOT_CATCH_CHANCE_MULTIPLIER = 0.5;
