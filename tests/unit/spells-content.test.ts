import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data';
import type { SpellFacts } from '../../scripts/extract/spell-facts';

const built = (lo: number, hi: number) => DATA.spells.filter(s => s.level >= lo && s.level <= hi && s.description.length > 0).length;
const facts = (lo: number, hi: number) =>
  (JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[]).filter(s => s.level >= lo && s.level <= hi).length;

test('batch 5a complete', () => expect(built(0, 1)).toBe(facts(0, 1)));
