import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const UA = 'dnd-5e-companion icon resolver (github.com/thetrexx/dnd-5e-companion)';
const CACHE = '.cache/icons.json';
const ALIASES = 'scripts/extract/icon-aliases.json';
const SPELL_ICONS = 'scripts/extract/spell-icons.json';
const PAUSE_MS = 150;

const BRITISH: [RegExp, string][] = [[/armor/gi, 'armour'], [/color/gi, 'colour'], [/center/gi, 'centre'], [/defense/gi, 'defence']];
const fileName = (name: string) => name.trim().replace(/\s+/g, '_');

/** `File:` titles to try for a spell, feature, race or feat name, best first. */
export function iconCandidates(name: string): string[] {
  const n = fileName(name);
  const out = [`File:${n}_Icon.webp`, `File:${n}_Icon.png`];
  let b = n;
  for (const [re, to] of BRITISH) b = b.replace(re, m => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to));
  if (b !== n) out.push(`File:${b}_Icon.webp`, `File:${b}_Icon.png`);
  out.push(`File:${n}_spell_Icon.webp`);
  return out;
}

/** Hotbar icon titles for a subclass, a few name variants. */
export function subclassCandidates(cls: string, name: string): string[] {
  const C = cls[0].toUpperCase() + cls.slice(1);
  const bare = name.replace(/^(Path of the|Path of|College of|Circle of the|Circle of|Way of the|Way of|Oath of the|Oath of|Order of the|The|School of|Domain)\s+/i, '').replace(/\s+Domain$/i, '');
  const variants = new Set([name, bare, name.replace(/^(the)\s+/i, ''), bare.replace(/^the\s+/i, '')]);
  const out: string[] = [];
  for (const v of variants) out.push(`File:Class_${C}_${fileName(v)}_Hotbar_Icon.png`);
  for (const v of variants) out.push(`File:${C}_${fileName(v)}_Hotbar_Icon.png`);
  return [...new Set(out)];
}

export function imageUrl(title: string): string {
  const f = title.replace(/^File:/, '').replace(/ /g, '_');
  const h = createHash('md5').update(f, 'utf8').digest('hex');
  return `https://bg3.wiki/w/images/${h[0]}/${h.slice(0, 2)}/${encodeURI(f)}`;
}

type Cache = Record<string, string | null>;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const readJson = <T>(p: string, d: T): T => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) as T : d);
const writeJson = (p: string, v: unknown, ind = 2) => writeFileSync(p, JSON.stringify(v, null, ind) + '\n');

async function head(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
      if (r.status === 200) return true;
      if (r.status === 404) return false;
    } catch { /* retry */ }
    await sleep(1000 * (attempt + 1));
  }
  throw new Error(`HEAD kept failing: ${url}`);
}

async function resolveTitle(title: string, cache: Cache): Promise<string | null> {
  if (title in cache) return cache[title];
  const url = imageUrl(title);
  const ok = await head(url);
  cache[title] = ok ? url : null;
  writeJson(CACHE, cache, 1);
  await sleep(PAUSE_MS);
  return cache[title];
}

async function firstHit(titles: string[], cache: Cache): Promise<string | null> {
  for (const t of titles) { const u = await resolveTitle(t, cache); if (u) return u; }
  return null;
}

interface Named { id: string; name: string; icon?: string; hotbarIcon?: string; cls?: string }

async function main() {
  mkdirSync('.cache', { recursive: true });
  const cache = readJson<Cache>(CACHE, {});
  const aliases = readJson<Record<string, string | null>>(ALIASES, {});
  const resolve = async (id: string, cands: string[]) => {
    if (id in aliases) return aliases[id] ? resolveTitle(aliases[id]!, cache) : null;
    return firstHit(cands, cache);
  };
  const stats: Record<string, [number, number]> = {};
  const misses: Record<string, string[]> = {};
  const count = (kind: string, id: string, ok: boolean) => {
    const s = (stats[kind] ??= [0, 0]); s[1]++; if (ok) s[0]++; else (misses[kind] ??= []).push(id);
  };

  // spells -> scripts/extract/spell-icons.json, merged by build-spells (never overwrites facts' icon)
  const facts = readJson<(Named & { icon?: string })[]>('scripts/extract/spell-facts.json', []);
  const spellIcons = readJson<Record<string, string>>(SPELL_ICONS, {});
  for (const f of facts) {
    if (f.icon || spellIcons[f.id]) { count('spells', f.id, true); continue; }
    const u = await resolve(f.id, iconCandidates(f.name));
    if (u) spellIcons[f.id] = u;
    count('spells', f.id, !!u);
  }
  writeJson(SPELL_ICONS, Object.fromEntries(Object.entries(spellIcons).sort(([a], [b]) => a.localeCompare(b))));

  // features, races, feats, subclasses -> data files in place
  const fill = async (kind: string, file: string, field: 'icon' | 'hotbarIcon', cands: (r: Named) => string[]) => {
    const rows = readJson<Named[]>(file, []);
    for (const r of rows) {
      if (r[field]) { count(kind, r.id, true); continue; }
      const u = await resolve(`${r.id}`, cands(r));
      if (u) r[field] = u;
      count(kind, r.id, !!u);
    }
    writeJson(file, rows);
  };
  for (const f of readdirSync('data/features').filter(f => f.endsWith('.json'))) {
    const kind = 'features';
    const file = `data/features/${f}`;
    const rows = readJson<Named[]>(file, []);
    for (const r of rows) {
      if (r.icon) { count(kind, r.id, true); continue; }
      const u = await resolve(r.id, iconCandidates(r.name));
      if (u) r.icon = u;
      count(kind, r.id, !!u);
    }
    writeJson(file, rows);
  }
  await fill('subclasses', 'data/subclasses.json', 'hotbarIcon', r => subclassCandidates(r.cls!, r.name));
  await fill('races', 'data/races.json', 'icon', r => iconCandidates(r.name));
  await fill('feats', 'data/feats.json', 'icon', r => iconCandidates(r.name));

  for (const [k, [ok, n]] of Object.entries(stats)) console.log(`${k}: ${ok}/${n}`);
  writeJson('.cache/icon-misses.json', misses);
}

if (process.argv[1]?.split('\\').join('/').endsWith('scripts/extract/icons.ts')) await main();
