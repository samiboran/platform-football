import { DIFFICULTIES, DIFFICULTY_ORDER, DEFAULT_DIFFICULTY, DIFFICULTY_PREF_KEY, type DifficultyId } from '../config/difficulty';
import { loadPref, savePref } from './prefs';

/** Last chosen AI difficulty (M9.2); unknown values fall back to ORTA. */
export function loadDifficulty(): DifficultyId {
  const raw = loadPref(DIFFICULTY_PREF_KEY) as DifficultyId | null;
  return raw && DIFFICULTY_ORDER.includes(raw) && DIFFICULTIES[raw] ? raw : DEFAULT_DIFFICULTY;
}

export function saveDifficulty(id: DifficultyId): void {
  savePref(DIFFICULTY_PREF_KEY, id);
}
