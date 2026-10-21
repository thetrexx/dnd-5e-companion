import { readFileSync } from 'node:fs';
import { buildSpells, factsFromSrd, merge, type SpellFacts, type SrdSpell } from '../../scripts/extract/spell-facts';

const facts: SpellFacts[] = JSON.parse(readFileSync('scripts/extract/spell-facts.json', 'utf8'));
const f = (id: string) => facts.find(x => x.id === id)!;

test('361 spell facts, PHB names, every one on a list with a page', () => {
  expect(facts).toHaveLength(361);
  expect(f('tashas-hideous-laughter').name).toBe("Tasha's Hideous Laughter");
  expect(facts.find(x => x.id === 'hideous-laughter')).toBeUndefined();
  expect(facts.filter(x => x.classes.length === 0 || x.page < 1).map(x => x.id)).toEqual([]);
});
test('facts', () => {
  expect(f('fireball')).toMatchObject({ level: 3, school: 'Evocation', page: 241, range: '150 feet',
    summary: { damage: { dice: '8d6', type: 'Fire' }, resolution: 'save', save: 'dex' } });
  expect(f('shield').classes.sort()).toEqual(['sorcerer', 'wizard']);
  expect(f('cure-wounds').classes.sort()).toEqual(['bard', 'cleric', 'druid', 'paladin', 'ranger']);
  expect(f('cure-wounds').summary?.damage).toMatchObject({ dice: '1d8', healing: true, plusMod: true });
  expect(f('hex').cast.cost).toBe('bonus');
  expect(f('hellish-rebuke').cast.cost).toBe('reaction');
  expect(f('magic-missile').summary).toMatchObject({ resolution: 'auto', damage: { dice: '1d4+1', count: 3, unit: 'darts' } });
  expect(f('identify').components.m).toMatchObject({ costGp: 100, consumed: false });
  expect(Object.keys(f('fireball'))).not.toContain('description');
});
test('build keeps only summarized ids', () => {
  const out = buildSpells(facts, { fireball: { description: ['x'], material: 'bat guano and sulfur' } });
  expect(out.map(s => s.id)).toEqual(['fireball']);
  expect(out[0]).toMatchObject({ textSource: 'summary', components: { m: { text: 'bat guano and sulfur' } } });
});
test('every reaction spell has a trigger', () => {
  expect(facts.filter(x => x.cast.cost === 'reaction' && !x.cast.trigger).map(x => x.id)).toEqual([]);
});
test('factsFromSrd reads structure only', () => {
  const api = {
    index: 'hideous-laughter', name: 'Hideous Laughter', level: 1, school: { name: 'Enchantment' },
    casting_time: '1 action', range: '30 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute',
    concentration: true, ritual: false, dc: { dc_type: { index: 'wis' } }, material: 'Tiny tarts worth 2,500 gp, consumed',
  } as unknown as SrdSpell;
  const r = factsFromSrd(api, { 'hideous-laughter': "Tasha's Hideous Laughter" });
  expect(r).toMatchObject({ id: 'tashas-hideous-laughter', components: { m: { costGp: 2500, consumed: true } }, summary: { resolution: 'save', save: 'wis' } });
});

test('a null override deletes the key instead of writing null', () => {
  expect(merge({ summary: { resolution: 'none', damage: { dice: '1d6' } } }, { summary: { damage: null } }))
    .toEqual({ summary: { resolution: 'none' } });
  expect(JSON.stringify(facts)).not.toContain('"damage":null');
});
