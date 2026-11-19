/**
 * Equipment (18.11.2026, Sami's idea: "kol bandı güç, pabuç hız, şapka
 * falso, farklı pabuçlar farklı özellikler"). Bought with gold, one item per
 * slot, shared by every character. Every item is a small trade-off (a few %
 * up, a little down) so buying gear never simply wins a match — this keeps
 * a future PvP fair. Effects apply to the human player only (AI: none).
 * All tuning lives here.
 */

export type EquipSlot = 'boots' | 'armband' | 'headband';

/** Multipliers on the character's own stats (1 = no change). */
export interface EquipEffects {
  /** HIZ — ground move speed. */
  moveSpeed?: number;
  /** ŞUT — every shot's speed. */
  shotSpeed?: number;
  /** GÜÇ — body strength (shorter knockdowns, harder body deflections). */
  body?: number;
  /** Dash cooldown (below 1 = dash again sooner). */
  dashCooldown?: number;
  /** Falso bend (air-combo curve) strength. */
  curve?: number;
}

export interface EquipDef {
  id: string;
  slot: EquipSlot;
  name: string;
  /** One-line effect text shown on the card. */
  description: string;
  /** Gold price; 0 = owned from the start. */
  price: number;
  effects: EquipEffects;
  /** Swatch colour on the card (no item sprites yet). */
  color: number;
}

export const EQUIP_SLOTS: { slot: EquipSlot; title: string }[] = [
  { slot: 'boots', title: 'PABUÇ' },
  { slot: 'armband', title: 'KOL BANDI' },
  { slot: 'headband', title: 'SAÇ BANDI' },
];

export const EQUIPMENT: EquipDef[] = [
  // --- Boots: speed / dash --------------------------------------------------------
  { id: 'boots_old', slot: 'boots', name: 'Eski Pabuç', description: 'Etkisi yok', price: 0, effects: {}, color: 0x8a6a4a },
  { id: 'boots_runner', slot: 'boots', name: 'Koşu Pabucu', description: 'Hız +6%  Şut -4%', price: 300, effects: { moveSpeed: 1.06, shotSpeed: 0.96 }, color: 0x3fa9f5 },
  { id: 'boots_studs', slot: 'boots', name: 'Krampon', description: 'Şut +6%  Hız -4%', price: 300, effects: { shotSpeed: 1.06, moveSpeed: 0.96 }, color: 0x2b2b2b },
  { id: 'boots_spring', slot: 'boots', name: 'Yaylı Pabuç', description: 'Dash bekl. -12%  Güç -8%', price: 450, effects: { dashCooldown: 0.88, body: 0.92 }, color: 0x7cff9a },

  // --- Armband: power / body ------------------------------------------------------
  { id: 'band_none', slot: 'armband', name: 'Bantsız', description: 'Etkisi yok', price: 0, effects: {}, color: 0x555a66 },
  { id: 'band_captain', slot: 'armband', name: 'Kaptan Bandı', description: 'Güç +12%  Hız -3%', price: 350, effects: { body: 1.12, moveSpeed: 0.97 }, color: 0xffd23a },
  { id: 'band_striker', slot: 'armband', name: 'Golcü Bandı', description: 'Şut +5%  Dash bekl. +10%', price: 400, effects: { shotSpeed: 1.05, dashCooldown: 1.1 }, color: 0xe74c3c },

  // --- Headband: falso ------------------------------------------------------------
  { id: 'head_none', slot: 'headband', name: 'Açık Kafa', description: 'Etkisi yok', price: 0, effects: {}, color: 0x555a66 },
  { id: 'head_curve', slot: 'headband', name: 'Falso Bandı', description: 'Falso +25%  Şut -3%', price: 350, effects: { curve: 1.25, shotSpeed: 0.97 }, color: 0xb070ff },
  { id: 'head_cap', slot: 'headband', name: 'Ters Kep', description: 'Hız +3%  Falso -15%', price: 250, effects: { moveSpeed: 1.03, curve: 0.85 }, color: 0x2ecc71 },
];

/** Starting gear (price 0) per slot. */
export const DEFAULT_EQUIPMENT: Record<EquipSlot, string> = {
  boots: 'boots_old',
  armband: 'band_none',
  headband: 'head_none',
};

export function equipById(id: string): EquipDef | undefined {
  return EQUIPMENT.find((e) => e.id === id);
}

/** Combined multipliers of the equipped items. */
export interface EquipMods {
  moveSpeed: number;
  shotSpeed: number;
  body: number;
  dashCooldown: number;
  curve: number;
}

export function equipMods(ids: string[]): EquipMods {
  const m: EquipMods = { moveSpeed: 1, shotSpeed: 1, body: 1, dashCooldown: 1, curve: 1 };
  for (const id of ids) {
    const e = equipById(id)?.effects;
    if (!e) continue;
    m.moveSpeed *= e.moveSpeed ?? 1;
    m.shotSpeed *= e.shotSpeed ?? 1;
    m.body *= e.body ?? 1;
    m.dashCooldown *= e.dashCooldown ?? 1;
    m.curve *= e.curve ?? 1;
  }
  return m;
}

// --- Equipment screen layout (game px) -------------------------------------------
export const EQUIP_COLUMN_W = 290;
export const EQUIP_COLUMN_GAP = 14;
export const EQUIP_TOP = 96;
export const EQUIP_CARD_H = 82;
export const EQUIP_CARD_GAP = 10;
export const EQUIP_CARD_COLOR = 0x1c1640;
export const EQUIP_CARD_EQUIPPED_COLOR = 0x2f6a3a;
export const EQUIP_CARD_EQUIPPED_BORDER = 0x7cff9a;
export const EQUIP_CANT_AFFORD_COLOR = 0xe74c3c;
