import { DATA } from '../../src/data';

const sub = (id: string) => DATA.subclasses.find(x => x.id === id)!;
const A = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk'];

test('19 subclasses A', () => expect(DATA.subclasses.filter(s => A.includes(s.cls))).toHaveLength(19));
test('domain spells', () => {
  const life = sub('life-domain').bonusSpells!;
  expect(life.kind).toBe('domain');
  expect(life.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['bless', 'cure-wounds']);
  for (const d of DATA.subclasses.filter(s => s.cls === 'cleric')) {
    expect(d.bonusSpells!.grants.map(g => g.atLevel).sort()).toEqual([1, 1, 3, 3, 5, 5, 7, 7, 9, 9]);
  }
});
test('land circle spells per terrain', () => {
  const g = sub('circle-of-the-land').bonusSpells!.grants;
  expect(g.filter(x => x.option === 'land-terrain-arctic').map(x => x.spell).sort())
    .toEqual(['cone-of-cold', 'freedom-of-movement', 'hold-person', 'ice-storm', 'sleet-storm', 'slow', 'commune-with-nature', 'spike-growth'].sort());
  for (const t of ['arctic', 'coast', 'desert', 'forest', 'grassland', 'mountain', 'swamp', 'underdark']) {
    expect(g.filter(x => x.option === `land-terrain-${t}`), t).toHaveLength(8);
    const f = DATA.features.find(x => x.id === `land-terrain-${t}`)!;
    expect(f.level).toBe(2);
    expect(f.cost).toBe('passive');
  }
});
test('EK casting', () => expect(sub('eldritch-knight').casting).toMatchObject({ list: 'wizard', schools: ['Abjuration', 'Evocation'], ability: 'int' }));
test('subclass features', () => {
  for (const id of ['frenzy', 'combat-inspiration', 'preserve-life', 'wrath-of-the-storm', 'combat-wild-shape', 'weapon-bond', 'shadow-step', 'open-hand-technique', 'superiority-dice'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('domain channel divinity options cost a Channel Divinity', () => {
  expect(DATA.features.find(x => x.id === 'preserve-life')!.resource).toBe('1 Channel Divinity');
  expect(DATA.features.find(x => x.id === 'guided-strike')!.resource).toBe('1 Channel Divinity');
});
