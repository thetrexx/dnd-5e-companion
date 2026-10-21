import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildSpells, type SpellFacts, type SpellSummary } from './spell-facts.ts';

const facts = JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[];
const summaries = JSON.parse(readFileSync('scripts/extract/spell-summaries.json', 'utf8')) as Record<string, SpellSummary>;
const known = new Set(facts.map(f => f.id));
const stray = Object.keys(summaries).filter(id => !known.has(id));
if (stray.length) { console.error(`summaries for unknown ids: ${stray.join(', ')}`); process.exit(1); }
const icons = existsSync('scripts/extract/spell-icons.json')
  ? JSON.parse(readFileSync('scripts/extract/spell-icons.json', 'utf8')) as Record<string, string> : {};
const spells = buildSpells(facts, summaries).map(s => (s.icon || !icons[s.id] ? s : { ...s, icon: icons[s.id] }));
writeFileSync('data/spells.json', JSON.stringify(spells, null, 2) + '\n');
console.log(`built ${spells.length} of ${facts.length} spells`);
