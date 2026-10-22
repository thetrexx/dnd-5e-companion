import { DATA } from '../data';
import { CLASS_IDS } from '../data/validate';
import type { ClassId } from '../data/types';
import type { CharClass, CharSpell, Character } from './types';

export type ParseResult = { ok: true; ch: Character; dropped: string[] } | { ok: false; error: string };
export const ERR_NOT_CHARACTER = "This doesn't look like a saved character.";
export const ERR_NEWER = 'This character comes from a newer version of the site. Reload the page and try again.';

const GRANT = /^[a-z]+:[a-z0-9-]+:\d+$/;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function parseClasses(raw: unknown, dropped: string[]): CharClass[] {
  const out: CharClass[] = [];
  for (const c of arr(raw)) {
    if (!isObj(c)) continue;
    const cls = c.cls as ClassId;
    if (typeof cls !== 'string' || !CLASS_IDS.includes(cls)) { dropped.push(`class "${String(c.cls)}"`); continue; }
    if (out.some(o => o.cls === cls)) continue;
    const n = typeof c.level === 'number' && Number.isFinite(c.level) ? Math.trunc(c.level) : 1;
    const item: CharClass = { cls, level: clamp(n, 1, 20) };
    if (typeof c.sub === 'string') {
      if (DATA.subclasses.some(s => s.id === c.sub && s.cls === cls)) item.sub = c.sub;
      else dropped.push(`subclass "${c.sub}"`);
    }
    if (typeof c.mod === 'number' && Number.isInteger(c.mod) && c.mod >= -5 && c.mod <= 10) item.mod = c.mod;
    out.push(item);
  }
  return out;
}

/** Keeps known ids once each; names the rest in `dropped`. */
function parseIds(raw: unknown, label: string, known: (id: string) => boolean, dropped: string[]): string[] {
  const out: string[] = [];
  for (const id of arr(raw)) {
    if (typeof id !== 'string') continue;
    if (!known(id)) dropped.push(`${label} "${id}"`);
    else if (!out.includes(id)) out.push(id);
  }
  return out;
}

function parseSpells(raw: unknown, classes: CharClass[], dropped: string[]): CharSpell[] {
  const out: CharSpell[] = [];
  const spellIds = new Set(DATA.spells.map(s => s.id));
  for (const s of arr(raw)) {
    if (!isObj(s) || typeof s.id !== 'string') continue;
    if (!spellIds.has(s.id)) { dropped.push(`spell "${s.id}"`); continue; }
    const hasCls = s.cls !== undefined, hasGrant = s.grant !== undefined;
    let item: CharSpell | undefined;
    if (hasCls && !hasGrant && typeof s.cls === 'string' && classes.some(c => c.cls === s.cls)) {
      item = { id: s.id, cls: s.cls as ClassId };
      if (s.extra === true) item.extra = true;
    } else if (hasGrant && !hasCls && typeof s.grant === 'string' && GRANT.test(s.grant)) {
      item = { id: s.id, grant: s.grant };
    }
    if (!item) { dropped.push(`spell "${s.id}"`); continue; }
    const { id, cls, grant } = item;
    if (!out.some(o => o.id === id && o.cls === cls && o.grant === grant)) out.push(item);
  }
  return out;
}

export function parseCharacter(raw: unknown): ParseResult {
  if (!isObj(raw) || typeof raw.v !== 'number') return { ok: false, error: ERR_NOT_CHARACTER };
  if (raw.v > 1) return { ok: false, error: ERR_NEWER };
  const dropped: string[] = [];
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const ch: Character = { v: 1, name: name.length <= 60 ? name : '', classes: [], options: [], feats: [], spells: [] };
  if (typeof raw.race === 'string') {
    if (DATA.races.some(r => r.id === raw.race)) ch.race = raw.race;
    else dropped.push(`race "${raw.race}"`);
  }
  ch.classes = parseClasses(raw.classes, dropped);
  ch.options = parseIds(raw.options, 'option', id => DATA.features.some(f => f.id === id && f.source.kind === 'option'), dropped);
  ch.feats = parseIds(raw.feats, 'feat', id => DATA.feats.some(f => f.id === id), dropped);
  ch.spells = parseSpells(raw.spells, ch.classes, dropped);
  return { ok: true, ch, dropped };
}
