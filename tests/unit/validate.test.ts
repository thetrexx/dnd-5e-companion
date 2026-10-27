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

test('a feature with an unknown book is rejected', () => {
  const bad = structuredClone(DATA); (bad.features[0] as any).book = 'xgte';
  expect(validateDataset(bad)).toContain(`feature "${bad.features[0].id}": book "xgte" is not valid`);
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
test('extraLists must be other classes', () => {
  for (const [lists, msg] of [[['sorcerer'], "extraLists can't include its own class"], [['nope'], 'extraLists has unknown class "nope"']] as const) {
    const bad = structuredClone(DATA);
    bad.subclasses.find(s => s.id === 'wild-magic')!.extraLists = [...lists] as any;
    expect(validateDataset(bad)).toContain(`subclass "wild-magic": ${msg}`);
  }
});
test('option group must be owned by the listing class', () => {
  const bad = structuredClone(DATA);
  bad.classes.find(c => c.id === 'fighter')!.options.push('metamagic');
  expect(validateDataset(bad)).toContain('class "fighter": option group "metamagic" is owned by class "sorcerer"');
});

test('optional features', () => {
  const bad = structuredClone(DATA);
  delete (bad.features.find(f => f.id === 'optional-ranger-favored-foe') as any).optional;
  bad.features.find(f => f.id === 'optional-ranger-natures-veil')!.prereq = { level: 3 };
  bad.features.find(f => f.id === 'optional-ranger-deft-explorer')!.replaces = ['no-such-feature'];
  bad.features.find(f => f.id === 'hide-in-plain-sight')!.expandsList = 'ranger';
  const errs = validateDataset(bad).join('\n');
  expect(errs).toContain('"optional-ranger-favored-foe": an option of an optional group must be optional');
  expect(errs).toContain('"optional-ranger-natures-veil": prereq.level must equal level');
  expect(errs).toContain('no-such-feature');
  expect(errs).toContain('"hide-in-plain-sight": expandsList');
  const ok = structuredClone(DATA);
  ok.features.find(f => f.id === 'optional-ranger-deft-explorer')!.expandsList = 'ranger';
  expect(validateDataset(ok)).toEqual([]);
  ok.features.find(f => f.id === 'optional-ranger-deft-explorer')!.expandsList = 'druid';
  expect(validateDataset(ok).join('\n')).toContain('expandsList');
});
test('optionalLists: known classes, none already on the base list', () => {
  const bad = structuredClone(DATA);
  bad.spells.find(s => s.id === 'aura-of-vitality')!.optionalLists = ['paladin'];
  bad.spells.find(s => s.id === 'sunbeam')!.optionalLists = ['necromancer' as any];
  bad.spells.find(s => s.id === 'sunburst')!.optionalLists = [];
  const errs = validateDataset(bad).join('\n');
  expect(errs).toContain('"aura-of-vitality": optionalLists repeats base class "paladin"');
  expect(errs).toContain('necromancer');
  expect(errs).toContain('"sunburst": optionalLists must be a non-empty array');
});
