import { DATA } from '../../src/data';
import { validateDataset } from '../../src/data/validate';

test('fixtures are valid', () => expect(validateDataset(DATA)).toEqual([]));
test('catches bad records', () => {
  const bad = structuredClone(DATA);
  bad.spells.push({ ...bad.spells[0] });                 // duplicate id
  bad.spells[1].level = 10;                              // out of range
  bad.spells[2].classes = ['necromancer' as any];        // unknown class
  bad.features[0].name = '';                             // empty name
  const errs = validateDataset(bad);
  expect(errs.some(e => e.includes('duplicate'))).toBe(true);
  expect(errs.some(e => e.includes('level'))).toBe(true);
  expect(errs.some(e => e.includes('necromancer'))).toBe(true);
  expect(errs.some(e => e.includes('name'))).toBe(true);
});

test('v2 fixtures are valid', () => expect(validateDataset(DATA)).toEqual([]));
test('catches bad v2 records', () => {
  const bad = structuredClone(DATA);
  bad.subclasses[0].cls = 'necromancer' as any;
  bad.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants[0].spell = 'no-such-spell';
  bad.features.find(f => f.id === 'fighting-style-protection')!.id = 'protection';   // must start with group id
  bad.features.find(f => f.id === 'weapon-bond')!.source.id = 'no-such-subclass';
  bad.optionGroups[0].picks = [1, 0, ...Array(18).fill(1)];                           // must not decrease
  bad.features.find(f => f.id === 'action-surge')!.scaling![0].values = ['1'];         // must have 20
  bad.classes[0].options = ['no-such-group'];
  const errs = validateDataset(bad).join('\n');
  for (const s of ['necromancer', 'no-such-spell', '"protection"', 'no-such-subclass', 'picks', 'scaling', 'no-such-group'])
    expect(errs).toContain(s);
});
test('grant needs exactly one of spell/choose', () => {
  const bad = structuredClone(DATA);
  bad.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants[0].choose = { lists: ['wizard'], level: 1, count: 1 };
  expect(validateDataset(bad).join('\n')).toContain('exactly one');
});

test('textSource required', () => {
  const bad = structuredClone(DATA); delete (bad.spells[0] as any).textSource;
  expect(validateDataset(bad).join('\n')).toContain('textSource');
});
