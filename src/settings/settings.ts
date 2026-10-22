import { readJSON, writeJSON } from './storage';
import { THEMES } from '../theme/themes';

export type Strength = 'off' | 'faint' | 'medium' | 'strong';
/** Character spells: only the character's own, or the whole list with the character's ringed. */
export type SpellView = 'mine' | 'all';
export interface Settings { v: 1; theme: string; strength: Strength; iosTipSeen: boolean; spellView: SpellView }

export const STRENGTHS: Strength[] = ['off', 'faint', 'medium', 'strong'];
export const SPELL_VIEWS: SpellView[] = ['mine', 'all'];
export const DEFAULT_SETTINGS: Settings = { v: 1, theme: 'faerun', strength: 'medium', iosTipSeen: false, spellView: 'mine' };
const KEY = 'dndcs.settings';

export function loadSettings(): Settings {
  const raw = readJSON<Partial<Settings> | null>(KEY, null);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  return {
    v: 1,
    theme: THEMES.some((t) => t.id === raw.theme) ? (raw.theme as string) : DEFAULT_SETTINGS.theme,
    strength: STRENGTHS.includes(raw.strength as Strength) ? (raw.strength as Strength) : DEFAULT_SETTINGS.strength,
    iosTipSeen: raw.iosTipSeen === true,
    spellView: SPELL_VIEWS.includes(raw.spellView as SpellView) ? (raw.spellView as SpellView) : DEFAULT_SETTINGS.spellView,
  };
}

/** Fired on window after every save, so the app can follow a new theme or strength at once. */
export const SETTINGS_EVENT = 'dndcs:settings';

export function saveSettings(s: Settings): void {
  writeJSON(KEY, s);
  try { dispatchEvent(new Event(SETTINGS_EVENT)); } catch { /* no window: nothing listens */ }
}

export function effectiveStrength(s: Settings, prefersReducedMotion: boolean): Strength {
  return prefersReducedMotion ? 'off' : s.strength;
}

export function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function applyStrength(s: Settings): void {
  document.documentElement.dataset.strength = effectiveStrength(s, reducedMotion());
}
