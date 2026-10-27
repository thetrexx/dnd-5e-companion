import { readFileSync } from 'node:fs';
import { DATA } from '../../src/data';
import type { SpellFacts } from '../../scripts/extract/spell-facts';
import { diceRange } from '../../src/logic/card';

const built = (lo: number, hi: number) => DATA.spells.filter(s => s.level >= lo && s.level <= hi && s.description.length > 0).length;
const facts = (lo: number, hi: number) =>
  (JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8')) as SpellFacts[]).filter(s => s.level >= lo && s.level <= hi).length;

test('batch 5a complete', () => expect(built(0, 1)).toBe(facts(0, 1)));
test('batch 5b complete', () => expect(built(2, 3)).toBe(facts(2, 3)));
test('batch 5c complete', () => expect(built(4, 6)).toBe(facts(4, 6)));
test('batch 5d complete', () => expect(built(7, 9)).toBe(facts(7, 9)));
test('every spell is built (361 PHB + 22 XGE levels 0-1)', () => expect(DATA.spells).toHaveLength(383));
test('confusion keeps its table', () => {
  const d = DATA.spells.find(s => s.id === 'confusion')!.description.join('\n');
  for (const row of ['1: ', '2-6: ', '7-8: ', '9-10: ']) expect(d).toContain(row);
});

const xge = DATA.spells.filter(s => s.book === 'xge');
test('xanathar band built', () => {
  // Task 3 ids: 'dragons-breath', 'shadow-blade', 'catnap', 'thunder-step', 'summon-greater-demon', 'sickening-radiance'
  // Task 4 ids: 'synaptic-static', 'steel-wind-strike', 'mass-polymorph', 'psychic-scream'
  for (const id of ['toll-the-dead', 'ice-knife', 'catapult', 'chaos-bolt', 'absorb-elements', 'word-of-radiance'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'xge', textSource: 'summary' });
});
test('every spell damage line parses', () => {
  for (const s of DATA.spells) if (s.summary?.damage) expect(() => diceRange(s.summary!.damage!.dice), s.id).not.toThrow();
});
test('xanathar spells are on class lists', () => { for (const s of xge) expect(s.classes.length, s.id).toBeGreaterThan(0); });
test('toll the dead facts', () => expect(DATA.spells.find(s => s.id === 'toll-the-dead')).toMatchObject({ level: 0, school: 'Necromancy', summary: { resolution: 'save', save: 'wis' } }));
