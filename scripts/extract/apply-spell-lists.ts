import { readFileSync, writeFileSync } from 'node:fs';
import type { ClassId } from '../../src/data/types.ts';
import { phbId, type SpellFacts } from './spell-facts.ts';

const FACTS = 'scripts/extract/spell-facts.json';
const facts = JSON.parse(readFileSync(FACTS, 'utf8')) as SpellFacts[];
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Record<string, string[]>;
const lists = read('scripts/extract/spell-lists.json');
// Tasha's expanded spell lists ("Additional <Class> Spells"): only reachable with the optional feature ticked
const optional = read('scripts/extract/spell-lists-optional.json');
const byId = new Map(facts.map(f => [f.id, f]));
const unknown: string[] = [];
const each = (all: Record<string, string[]>, fn: (f: SpellFacts, cls: ClassId) => void) => {
  for (const [cls, names] of Object.entries(all)) {
    for (const name of names) {
      const f = byId.get(phbId(name));
      if (!f) { unknown.push(`${cls}: ${name}`); continue; }
      fn(f, cls as ClassId);
    }
  }
};
for (const f of facts) { f.classes = []; delete f.optionalLists; }
each(lists, (f, cls) => { if (!f.classes.includes(cls)) f.classes.push(cls); });
// a class already on the base list is left out; an empty list leaves the key out
each(optional, (f, cls) => {
  if (f.classes.includes(cls)) return;
  if (!(f.optionalLists ??= []).includes(cls)) f.optionalLists.push(cls);
});
writeFileSync(FACTS, JSON.stringify(facts, null, 1) + '\n');
const none = facts.filter(f => f.classes.length === 0).map(f => f.id);
const expanded = facts.filter(f => f.optionalLists).length;
console.log(`lists applied; not on any list: ${none.join(', ') || 'none'}; on an expanded list only: ${expanded}; list names with no spell: ${unknown.join('; ') || 'none'}`);
if (unknown.length) process.exit(1);
