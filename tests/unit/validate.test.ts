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

test('a spell with textSource srd is rejected', () => {
  const bad = structuredClone(DATA); (bad.spells[0] as any).textSource = 'srd';
  expect(validateDataset(bad).join('\n')).toContain('textSource');
});

test('class lists', () => {
  const s = (id: string) => DATA.spells.find(x => x.id === id)!;
  expect(s('shield').classes.sort()).toEqual(['sorcerer', 'wizard']);
  expect(s('cure-wounds').classes.sort()).toEqual(['bard', 'cleric', 'druid', 'paladin', 'ranger']);
  expect(s('fireball').page).toBe(241);
});
test('a feature with textSource srd is rejected', () => {
  const bad = structuredClone(DATA); (bad.features[0] as any).textSource = 'srd';
  expect(validateDataset(bad).join('\n')).toContain('textSource');
});

test('caster class needs spellAbility', () => {
  const bad = structuredClone(DATA);
  const c = bad.classes.find(x => x.caster === 'full')!;
  delete c.spellAbility;
  expect(validateDataset(bad)).toContain(`class "${c.id}": spellAbility required for a caster`);
});
test('grant option must be an option feature', () => {
  const bad = structuredClone(DATA);
  bad.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants[0].option = 'second-wind';
  expect(validateDataset(bad)).toContain('subclass "circle-of-the-land": grant option "second-wind" is not an option');
});
test('prereq option must be an option feature', () => {
  const bad = structuredClone(DATA);
  bad.features.find(f => f.prereq?.option)!.prereq!.option = 'second-wind';
  expect(validateDataset(bad).join('\n')).toContain('prereq option "second-wind" is not an option');
});
test('option group must be owned by the listing class', () => {
  const bad = structuredClone(DATA);
  bad.classes.find(c => c.id === 'fighter')!.options.push('metamagic');
  expect(validateDataset(bad)).toContain('class "fighter": option group "metamagic" is owned by class "sorcerer"');
});
