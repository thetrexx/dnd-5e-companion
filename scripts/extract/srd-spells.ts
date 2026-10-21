import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Ability, Cost, Spell } from '../../src/data/types.ts';
import { CACHE } from './config.ts';
import { normalizeOcr } from './ocr.ts';
import { extractPage } from './pages.ts';

export interface SrdSpell {
  index: string; name: string; desc: string[]; higher_level?: string[];
  range: string; components: string[]; material?: string; ritual: boolean; duration: string; concentration: boolean;
  casting_time: string; level: number;
  attack_type?: string;
  damage?: { damage_type?: { name: string }; damage_at_slot_level?: Record<string, string>; damage_at_character_level?: Record<string, string> }[];
  heal_at_slot_level?: Record<string, string>;
  dc?: { dc_type: { index: string } };
  school: { name: string };
}

const DICE = /^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/;

/** "Tasha's Hideous Laughter" -> "tashas-hideous-laughter" */
export function phbId(name: string): string {
  return name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const clean = (s: string): string => s.replace(/\*+/g, '').trim();

/** SRD markdown to plain paragraphs: table rows become "<roll>: <text>", "- " becomes "• ". */
function plainDesc(desc: string[]): string[] {
  const out: string[] = [];
  desc.forEach((p, i) => {
    if (p.startsWith('|')) {
      if (/^\|[\s|:-]+\|?$/.test(p)) return;                       // separator row
      if (/^\|[\s|:-]+\|?$/.test(desc[i + 1] ?? '')) return;       // header row
      const cells = p.replace(/^\||\|$/g, '').split('|').map(c => clean(c));
      out.push(`${cells[0]}: ${cells.slice(1).join(' ')}`);
      return;
    }
    out.push(clean(p.replace(/^- /, '• ')));
  });
  return out;
}

export function mapSrdSpell(api: SrdSpell, phbNames: Record<string, string>): Spell {
  const name = phbNames[api.index] ?? api.name;
  const ct = api.casting_time;
  const cost: Cost = /^1 action$/.test(ct) ? 'action' : /^1 bonus action$/.test(ct) ? 'bonus' : /^1 reaction/.test(ct) ? 'reaction' : 'other';
  const spell: Spell = {
    id: phbId(name), name, level: api.level, school: api.school.name,
    cast: { cost, text: ct },
    range: api.range, duration: api.duration, concentration: api.concentration, ritual: api.ritual,
    components: { v: api.components.includes('V'), s: api.components.includes('S') },
    description: plainDesc(api.desc),
    classes: [], page: 0, textSource: 'srd',
  };
  if (api.components.includes('M') && api.material) {
    const text = api.material.trim().replace(/\.$/, '');
    const gp = /(\d[\d,]*)\s*gp/.exec(text);
    spell.components.m = { text, ...(gp ? { costGp: Number(gp[1].replace(/,/g, '')) } : {}), consumed: /consume/i.test(text) };
  }
  if (api.higher_level?.length) spell.higherLevels = api.higher_level.join(' ');

  // summary
  const levelKey = String(api.level);
  const dmg = api.damage?.[0];
  const raw = api.heal_at_slot_level?.[levelKey] ?? dmg?.damage_at_slot_level?.[levelKey] ?? dmg?.damage_at_character_level?.['1'];
  const healing = api.heal_at_slot_level !== undefined;
  const summary: NonNullable<Spell['summary']> = {
    resolution: api.dc ? 'save' : api.attack_type ? 'attack' : 'none',
  };
  if (api.dc) summary.save = api.dc.dc_type.index as Ability;
  if (raw) {
    const plusMod = /\s*\+\s*MOD$/i.test(raw);
    const dice = raw.replace(/\s*\+\s*MOD$/i, '').trim();
    if (DICE.test(dice)) {
      summary.damage = { dice, type: healing ? 'Healing' : (dmg?.damage_type?.name ?? ''), ...(healing ? { healing: true } : {}), ...(plusMod ? { plusMod: true } : {}) };
    } else {
      console.warn(`dice dropped: ${spell.id} "${raw}"`);
    }
  }
  const up = /increases by (\S+) for each slot level above (\w+)/.exec(spell.higherLevels ?? '');
  if (up) summary.upcast = `+${up[1]} per slot level above ${up[2]}`;
  spell.summary = summary;
  return spell;
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

async function getJson(url: string, file: string): Promise<unknown> {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const text = await res.text();
  writeFileSync(file, text);
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const SRD = '.cache/srd';
  mkdirSync(SRD, { recursive: true });
  const list = await getJson('https://www.dnd5eapi.co/api/2014/spells', `${SRD}/_list.json`) as { results: { index: string }[] };
  const phbNames = JSON.parse(readFileSync('scripts/extract/phb-names.json', 'utf8')) as Record<string, string>;
  const existing = JSON.parse(readFileSync('data/spells.json', 'utf8')) as Spell[];
  const have = new Set(existing.map(s => s.id));
  let added = 0;
  for (const { index } of list.results) {
    const api = await getJson(`https://www.dnd5eapi.co/api/2014/spells/${index}`, `${SRD}/${index}.json`) as SrdSpell;
    const spell = mapSrdSpell(api, phbNames);
    if (have.has(spell.id)) continue;
    existing.push(spell); have.add(spell.id); added++;
  }
  // locate pages for records without one
  const pages = new Map<number, string>();
  for (let p = 212; p <= 289; p++) {
    if (!existsSync(`${CACHE}/p${p}.txt`)) { try { extractPage(p); } catch { break; } }
    if (existsSync(`${CACHE}/p${p}.txt`)) pages.set(p, readFileSync(`${CACHE}/p${p}.txt`, 'utf8'));
  }
  const others = existing.map(s => s.name);
  let located = 0; const missing: string[] = [];
  if (pages.size) {
    for (const s of existing.filter(x => !x.page)) {
      const pg = findSpellPage(s.name, pages, others);
      if (pg) { s.page = pg; located++; } else missing.push(s.id);
    }
  }
  existing.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync('data/spells.json', JSON.stringify(existing, null, 2) + '\n');
  console.log(`SRD spells: ${list.results.length}; added ${added}; pages located ${located}; no page: ${missing.join(', ') || 'none'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
