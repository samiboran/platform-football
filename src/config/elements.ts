/**
 * Power-shot elements (Sami, 17.11.2026): every character always shoots
 * with ITS OWN element — Brezilya yıldırım, Kongo alev, … The power level
 * (1–3) only changes how big/intense that element's aura is, never which
 * element it is. Art: assets/fx/ball_<element><level>.png (gen_sprites.py).
 */
export type ElementId = 'lightning' | 'fire' | 'wind' | 'earth';

export interface ElementDef {
  id: ElementId;
  /** Cut-in caption (power shot). */
  title: string;
  /** Accent colour per level (index 1..3; 0 unused) — cut-in band edge,
   * caption tint and the goal band. */
  colors: [number, number, number, number];
}

export const ELEMENTS: Record<ElementId, ElementDef> = {
  lightning: { id: 'lightning', title: 'YILDIRIM ŞUT!', colors: [0xffffff, 0x9fdcff, 0x6fc8ff, 0xe8f6ff] },
  fire: { id: 'fire', title: 'ALEV ŞUT!', colors: [0xffffff, 0xffd84a, 0xff8a2a, 0xff4a2a] },
  wind: { id: 'wind', title: 'RÜZGAR ŞUT!', colors: [0xffffff, 0xc8f5d8, 0x8fe8b0, 0x5fd890] },
  earth: { id: 'earth', title: 'TOPRAK ŞUT!', colors: [0xffffff, 0xe8c890, 0xd09a50, 0xb87830] },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS) as ElementId[];

/** Cut-in second line: which power level (1–3) the shot is. */
export function powerLevelCaption(level: number): string {
  return `GÜÇ ${level}`;
}

export function elementColor(id: ElementId, level: number): number {
  const c = ELEMENTS[id].colors;
  return c[Math.max(0, Math.min(c.length - 1, level))];
}
