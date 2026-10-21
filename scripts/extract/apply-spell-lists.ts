import { readFileSync, writeFileSync } from 'node:fs';
import type { ClassId } from '../../src/data/types.ts';
import { phbId, type SpellFacts } from './spell-facts.ts';

const FACTS = 'scripts/extract/spell-facts.json';
const facts = JSON.parse(readFileSync(FACTS, 'utf8')) as SpellFacts[];
const lists = JSON.parse(readFileSync('scripts/extract/spell-lists.json', 'utf8')) as Record<string, string[]>;
const byId = new Map(facts.map(f => [f.id, f]));
for (const f of facts) f.classes = [];
const unknown: string[] = [];
for (const [cls, names] of Object.entries(lists)) {
  for (const name of names) {
    const f = byId.get(phbId(name));
    if (!f) { unknown.push(`${cls}: ${name}`); continue; }
    if (!f.classes.includes(cls as ClassId)) f.classes.push(cls as ClassId);
  }
}
writeFileSync(FACTS, JSON.stringify(facts, null, 1) + '\n');
const none = facts.filter(f => f.classes.length === 0).map(f => f.id);
console.log(`lists applied; not on any list: ${none.join(', ') || 'none'}; list names with no spell: ${unknown.join('; ') || 'none'}`);
if (unknown.length) process.exit(1);
