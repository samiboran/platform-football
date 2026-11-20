/**
 * M9.2 "Dil": Turkish + English.
 *
 * gettext-style: the Turkish text in the code is the message id, and every
 * English translation lives in ONE file (`./en.ts`). All game text is drawn
 * with the pixel BitmapText font, so `installTranslation()` hooks
 * `BitmapText.setText` once — every label, button and HUD string is
 * translated at draw time, including text that config files build at load
 * time. Turkish (the source language) passes through untouched.
 *
 * Composite strings ("SIRADAKİ: ŞEHİR 1/2 - ORTA", "+60 ALTIN") are split
 * on separators and leading/trailing numbers, and each piece is looked up.
 */
import Phaser from 'phaser';
import { PIXEL_FONT_CHARS, toHudText } from '../config/hud';
import { EN, EN_PATTERNS } from './en';

export type Language = 'tr' | 'en';

let current: Language = 'tr';

export function getLanguage(): Language {
  return current;
}

export function setLanguage(lang: Language): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

/** Language to start with when the player never picked one. */
export function deviceLanguage(): Language {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    return langs.some((l) => l?.toLowerCase().startsWith('tr')) ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

/** Locale-aware thousands separator (1.250 / 1,250). */
export function formatNumber(n: number): string {
  return n.toLocaleString(current === 'tr' ? 'tr-TR' : 'en-US');
}

// --- Lookup -------------------------------------------------------------------
const norm = (s: string) => toHudText(s).replace(/\s+/g, ' ').trim();

const table = new Map<string, string>();
for (const [k, v] of Object.entries(EN)) table.set(norm(k), v);
const patterns = EN_PATTERNS.map(([re, fn]) => [re, fn] as const);

/** Separators a composite string is split on, strongest first. */
const SPLITTERS = [/(\s{2,})/, /(: )/, /( - )/, /( \/ )/, /( \+ )/, /(\s*=\s*)/, /(, )/];
const NUMBER_TAIL = /^(.*?\S)\s*([+\-]?\d[\d/.,%]*!?)$/;
const NUMBER_HEAD = /^([+\-]?\d[\d/.,%]*)\s+(.*\S)$/;

const missing = new Set<string>();

function translateCore(core: string): string | null {
  const hit = table.get(norm(core));
  if (hit !== undefined) return hit;
  for (const sp of SPLITTERS) {
    if (!sp.test(core)) continue;
    const parts = core.split(sp);
    let changed = false;
    const out = parts.map((p, i) => {
      if (i % 2 === 1 || !p.trim()) return p; // separator or blank
      const t = translateText(p);
      if (t !== p) changed = true;
      return t;
    });
    if (changed) return out.join('');
  }
  for (const [re, fn] of patterns) {
    const m = core.match(re);
    if (m) return fn(m, (s) => translateText(s));
  }
  let m = core.match(NUMBER_TAIL);
  if (m) {
    const head = translateCore(m[1]);
    if (head !== null) return `${head} ${m[2]}`;
  }
  m = core.match(NUMBER_HEAD);
  if (m) {
    const tail = translateCore(m[2]);
    if (tail !== null) return `${m[1]} ${tail}`;
  }
  return null;
}

/** Translate one piece of display text into the current language. */
export function translateText(text: string): string {
  if (current === 'tr' || !text) return text;
  const core = text.trim();
  if (!core || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(core)) return text;
  const t = translateCore(core);
  if (t === null) {
    if (import.meta.env.DEV && !missing.has(core)) {
      missing.add(core);
      (window as unknown as { __i18nMissing?: string[] }).__i18nMissing = [...missing];
    }
    return text;
  }
  const lead = text.slice(0, text.indexOf(core));
  const trail = text.slice(text.indexOf(core) + core.length);
  return lead + t + trail;
}

/** Uppercase + strip anything the pixel font cannot draw (English rules). */
function fontSafe(s: string): string {
  let out = '';
  for (const ch of s.toLocaleUpperCase('en-US')) out += PIXEL_FONT_CHARS.includes(ch) || ch === '\n' ? ch : ' ';
  return out;
}

let installed = false;

/** Route every BitmapText through `translateText` (call once, before the game starts). */
export function installTranslation(): void {
  if (installed) return;
  installed = true;
  const proto = Phaser.GameObjects.BitmapText.prototype as unknown as {
    setText(value: string | string[]): unknown;
  };
  const original = proto.setText;
  proto.setText = function (this: unknown, value: string | string[]) {
    if (current === 'tr') return original.call(this, value);
    // English has no dotted capital I: names drawn as "TİAGO" become "TIAGO".
    const one = (v: string) => fontSafe(translateText(String(v ?? ''))).replace(/İ/g, 'I');
    return original.call(this, Array.isArray(value) ? value.map(one) : one(value));
  };
}

/** Translate the static loading / rotate-phone overlays in index.html. */
export function translateDocument(): void {
  if (current === 'tr' || typeof document === 'undefined') return;
  const fix = (el: Element | null) => {
    if (!el) return;
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) node.textContent = translateText(node.textContent);
    }
  };
  fix(document.getElementById('boot-loading'));
  fix(document.getElementById('rotate'));
}

/** For callers that need a translated string outside BitmapText (e.g. `document.title`). */
export const t = translateText;
export { norm as normalizeKey };
