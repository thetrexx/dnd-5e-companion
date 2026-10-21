import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data';
import type { SpellFacts } from '../../scripts/extract/spell-facts';

const built = (lo: number, hi: number) => DATA.spells.filter(s => s.level >= lo && s.level <= hi && s.description.length > 0).length;
const facts = (lo: number, hi: number) =>
  (JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[]).filter(s => s.level >= lo && s.level <= hi).length;

test('batch 5a complete', () => expect(built(0, 1)).toBe(facts(0, 1)));
test('batch 5b complete', () => expect(built(2, 3)).toBe(facts(2, 3)));
test('batch 5c complete', () => expect(built(4, 6)).toBe(facts(4, 6)));
test('batch 5d complete', () => expect(built(7, 9)).toBe(facts(7, 9)));
test('every PHB spell is built', () => expect(DATA.spells).toHaveLength(361));
test('confusion keeps its table', () => {
  const d = DATA.spells.find(s => s.id === 'confusion')!.description.join('\n');
  for (const row of ['1: ', '2-6: ', '7-8: ', '9-10: ']) expect(d).toContain(row);
});
