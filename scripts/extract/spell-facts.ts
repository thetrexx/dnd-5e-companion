import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ability, Cost, Spell } from '../../src/data/types.ts';
import { CACHE } from './config.ts';
import { normalizeOcr } from './ocr.ts';
import { extractPage } from './pages.ts';

/** The structured fields of an SRD spell. The prose fields (desc, higher_level) are not part of this type and are never read. */
export interface SrdSpell {
  index: string; name: string;
  range: string; components: string[]; material?: string; ritual: boolean; duration: string; concentration: boolean;
  casting_time: string; level: number;
  attack_type?: string;
  damage?: { damage_type?: { name: string }; damage_at_slot_level?: Record<string, string>; damage_at_character_level?: Record<string, string> }[];
  heal_at_slot_level?: Record<string, string>;
  dc?: { dc_type: { index: string } };
  school: { name: string };
}

/** Every Spell field except the text we write ourselves; components.m keeps only the cost facts. */
export type SpellFacts = Omit<Spell, 'description' | 'higherLevels' | 'textSource' | 'components'> &
  { components: { v: boolean; s: boolean; m?: { costGp?: number; consumed: boolean } } };

export interface SpellSummary { description: string[]; higherLevels?: string; material?: string }

const DICE = /^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/;

/** "Tasha's Hideous Laughter" -> "tashas-hideous-laughter" */
export function phbId(name: string): string {
  return name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const stripMod = (raw: string): { dice: string; plusMod: boolean } => {
  const plusMod = /\s*\+\s*MOD$/i.test(raw);
  return { dice: raw.replace(/\s*\+\s*MOD$/i, '').replace(/\s+/g, ''), plusMod };
};

/** Own-words scaling note from a level -> dice table (slot levels or cantrip character levels). */
function upcastNote(table: Record<string, string> | undefined, cantrip: boolean): string | undefined {
  if (!table) return undefined;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (keys.length < 2) return undefined;
  const dice = (k: number) => stripMod(table[String(k)]).dice;
  if (cantrip) return keys.slice(1).map(k => `${dice(k)} at level ${k}`).join(', ');
  const m1 = /^(\d+)d(\d+)(.*)$/.exec(dice(keys[0]));
  const m2 = /^(\d+)d(\d+)(.*)$/.exec(dice(keys[1]));
  if (!m1 || !m2 || m1[2] !== m2[2] || m1[3] !== m2[3]) return undefined;
  const gain = (Number(m2[1]) - Number(m1[1])) / (keys[1] - keys[0]);
  if (!Number.isInteger(gain) || gain < 1) return undefined;
  return `+${gain}d${m1[2]} per slot level above ${keys[0]}`;
}

/** The book writes "Concentration, up to ..."; the SRD data says "Up to ..." and flags concentration separately. */
function bookDuration(api: SrdSpell): string {
  const d = api.duration;
  return api.concentration && /^up to/i.test(d) ? `Concentration, ${d.charAt(0).toLowerCase()}${d.slice(1)}` : d;
}

export function factsFromSrd(api: SrdSpell, phbNames: Record<string, string>): SpellFacts {
  const name = phbNames[api.index] ?? api.name;
  const ct = api.casting_time;
  const cost: Cost = /^1 action$/.test(ct) ? 'action' : /^1 bonus action$/.test(ct) ? 'bonus' : /^1 reaction/.test(ct) ? 'reaction' : 'other';
  const facts: SpellFacts = {
    id: phbId(name), name, level: api.level, school: api.school.name,
    cast: { cost, text: ct },
    range: api.range, duration: bookDuration(api), concentration: api.concentration, ritual: api.ritual,
    components: { v: api.components.includes('V'), s: api.components.includes('S') },
    classes: [], page: 0,
  };
  if (api.components.includes('M')) {
    // Only two facts leave the material text: whether it is consumed and its gold cost. The text is not stored.
    const mat = api.material ?? '';
    const gp = /(\d[\d,]*)\s*gp/.exec(mat);
    facts.components.m = { ...(gp ? { costGp: Number(gp[1].replace(/,/g, '')) } : {}), consumed: /consume/i.test(mat) };
  }

  const dmg = api.damage?.[0];
  const healing = api.heal_at_slot_level !== undefined;
  const table = healing ? api.heal_at_slot_level : api.level === 0 ? dmg?.damage_at_character_level : dmg?.damage_at_slot_level;
  const raw = api.level === 0 ? table?.['1'] : table?.[String(api.level)];
  const summary: NonNullable<Spell['summary']> = { resolution: api.dc ? 'save' : api.attack_type ? 'attack' : 'none' };
  if (api.dc) summary.save = api.dc.dc_type.index as Ability;
  if (raw) {
    const { dice, plusMod } = stripMod(raw);
    if (DICE.test(dice)) {
      summary.damage = { dice, type: healing ? 'Healing' : (dmg?.damage_type?.name ?? ''), ...(healing ? { healing: true } : {}), ...(plusMod ? { plusMod: true } : {}) };
      const up = upcastNote(table, api.level === 0);
      if (up) summary.upcast = up;
    } else {
      console.warn(`dice dropped by the card regex: ${facts.id} "${raw}"`);
    }
  }
  facts.summary = summary;
  return facts;
}

/** Facts plus our own text. Only ids that have a summary are built. Sorted by name. */
export function buildSpells(facts: SpellFacts[], summaries: Record<string, SpellSummary>): Spell[] {
  const out: Spell[] = [];
  for (const f of facts) {
    const t = summaries[f.id];
    if (!t) continue;
    const { components, ...rest } = f;
    let m: Spell['components']['m'];
    if (components.m) {
      if (!t.material) throw new Error(`${f.id}: has a material component, summary needs "material"`);
      m = { text: t.material, ...components.m };
    } else if (t.material) throw new Error(`${f.id}: summary has "material" but the spell has no material component`);
    out.push({
      ...rest,
      components: { v: components.v, s: components.s, ...(m ? { m } : {}) },
      description: t.description, ...(t.higherLevels ? { higherLevels: t.higherLevels } : {}),
      textSource: 'summary',
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Book page whose OCR has the spell's heading: the name at the start of a line, followed (same line
 * or next) by the level / cantrip line. `others` are other spell names: a line that starts with a
 * longer one of them (Light vs Lightning Bolt) is not this spell's heading.
 */
export function findSpellPage(name: string, pages: Map<number, string>, others: string[] = []): number | null {
  const n = normalizeOcr(name);
  const marks = [normalizeOcr('level'), normalizeOcr('cantrip')];
  const longer = others.map(normalizeOcr).filter(o => o.length > n.length && o.startsWith(n));
  for (const page of [...pages.keys()].sort((a, b) => a - b)) {
    const lines = pages.get(page)!.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const l = normalizeOcr(lines[i]);
      if (!l.startsWith(n) || longer.some(o => l.startsWith(o))) continue;
      const rest = l.slice(n.length);
      if (rest.length > 60) continue;
      const probe = rest || normalizeOcr(lines[i + 1] ?? '').slice(0, 40);
      if (marks.some(m => probe.includes(m))) return page;
    }
  }
  return null;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function merge<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return patch as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    // null in an override deletes the key
    if (v === null) delete out[k];
    else out[k] = k in out ? merge(out[k], v) : v;
  }
  return out as T;
}

function main(): void {
  const FACTS = 'scripts/extract/spell-facts.json';
  const phbNames = readJson<Record<string, string>>('scripts/extract/phb-names.json');
  const overrides = readJson<Record<string, unknown>>('scripts/extract/spell-overrides.json');
  const nonSrd = readJson<SpellFacts[]>('scripts/extract/spell-nonsrd.json');
  const prev = new Map((existsSync(FACTS) ? readJson<SpellFacts[]>(FACTS) : []).map(f => [f.id, f]));
  const index = readJson<{ results: { index: string }[] }>('.cache/srd/_list.json').results;

  const all: SpellFacts[] = index.map(r => factsFromSrd(readJson<SrdSpell>(`.cache/srd/${r.index}.json`), phbNames));
  const srdCount = all.length;
  for (const n of nonSrd) all.push(n);
  const ids = new Set(all.map(f => f.id));
  if (ids.size !== all.length) throw new Error('duplicate spell ids');
  for (const id of Object.keys(overrides)) if (!ids.has(id)) throw new Error(`override for unknown id ${id}`);

  const pages = new Map<number, string>();
  for (let p = 212; p <= 289; p++) {
    if (!existsSync(`${CACHE}/p${p}.txt`)) extractPage(p);
    pages.set(p, readFileSync(`${CACHE}/p${p}.txt`, 'utf8'));
  }
  const names = all.map(f => f.name);
  const missing: string[] = [];
  const result = all.map(f0 => {
    let f = merge(f0, overrides[f0.id] ?? {});
    const old = prev.get(f.id);
    if (old?.classes.length) f = { ...f, classes: old.classes };
    if (!f.page) {
      const pg = findSpellPage(f.name, pages, names);
      if (pg) f = { ...f, page: pg }; else missing.push(f.id);
    }
    return f;
  });
  result.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(FACTS, JSON.stringify(result, null, 1) + '\n');
  console.log(`facts: ${result.length} (SRD ${srdCount}, from images ${nonSrd.length}); no page found: ${missing.join(', ') || 'none'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
