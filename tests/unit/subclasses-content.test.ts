import { DATA } from '../../src/data';

const sub = (id: string) => DATA.subclasses.find(x => x.id === id)!;
const A = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk'];

test('19 subclasses A', () => expect(DATA.subclasses.filter(s => A.includes(s.cls))).toHaveLength(19));
test('domain spells', () => {
  const life = sub('life-domain').bonusSpells!;
  expect(life.kind).toBe('domain');
  expect(life.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['bless', 'cure-wounds']);
  for (const d of DATA.subclasses.filter(s => s.cls === 'cleric')) {
    expect(d.bonusSpells!.grants.filter(g => g.spell).map(g => g.atLevel).sort()).toEqual([1, 1, 3, 3, 5, 5, 7, 7, 9, 9]);
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

test('40 subclasses', () => expect(DATA.subclasses).toHaveLength(40));
test('oath and patron spells', () => {
  expect(sub('oath-of-vengeance').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['bane', 'hunters-mark']);
  expect(sub('the-fiend').bonusSpells).toMatchObject({ kind: 'patron' });
  expect(sub('the-fiend').bonusSpells!.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['burning-hands', 'command']);
});
test('AT casting', () => expect(sub('arcane-trickster').casting).toMatchObject({ list: 'wizard', schools: ['Enchantment', 'Illusion'] }));
test('subclass features B', () => {
  for (const id of ['sacred-weapon', 'vow-of-enmity', 'rangers-companion', 'fast-hands', 'assassinate', 'tides-of-chaos',
    'dark-ones-blessing', 'fey-presence', 'portent', 'arcane-ward'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});

const feature = (id: string) => DATA.features.find(f => f.id === id)!;
test('parked subclass spell grants', () => {
  expect(feature('mage-hand-legerdemain').spells).toEqual([{ spell: 'mage-hand', atLevel: 3 }]);
  expect(feature('shadow-arts').spells!.map(g => g.spell)).toEqual(['minor-illusion', 'darkness', 'darkvision', 'pass-without-trace', 'silence']);
  expect(feature('shadow-arts').spells!.every(g => g.atLevel === 3)).toBe(true);
  expect(feature('shadow-arts').spells!.filter(g => g.spell !== 'minor-illusion').every(g => g.uses === '2 ki points')).toBe(true);
  expect(feature('spirit-seeker').spells!.map(g => g.spell)).toEqual(['beast-sense', 'speak-with-animals']);
  expect(feature('spirit-seeker').spells!.every(g => g.uses === 'Ritual only')).toBe(true);
  expect(feature('spirit-walker').spells).toEqual([expect.objectContaining({ spell: 'commune-with-nature', atLevel: 10, uses: 'Ritual only' })]);
  expect(sub('nature-domain').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 1 });
  expect(sub('circle-of-the-land').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 2 });
});
