import { DATA } from '../../src/data';

const r = (id: string) => DATA.races.find(x => x.id === id)!;
test('races', () => {
  expect(DATA.races).toHaveLength(19);
  expect(r('drow').parent).toBe('elf');
  expect(r('tiefling').spells.map(x => [x.spell, x.atLevel])).toEqual([['thaumaturgy', 1], ['hellish-rebuke', 3], ['darkness', 5]]);
  expect(r('drow').spells.map(x => [x.spell, x.atLevel])).toEqual([['dancing-lights', 1], ['faerie-fire', 3], ['darkness', 5]]);
  expect(r('high-elf').spells[0].choose).toMatchObject({ lists: ['wizard'], level: 0, count: 1 });
  expect(r('forest-gnome').spells[0].spell).toBe('minor-illusion');
});
test('racial features', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(f('breath-weapon').scaling![0].values).toEqual([...Array(5).fill('2d6'), ...Array(5).fill('3d6'), ...Array(5).fill('4d6'), ...Array(5).fill('5d6')]);
  for (const id of ['lucky', 'relentless-endurance', 'savage-attacks']) expect(f(id), id).toBeTruthy();
  expect(DATA.features.filter(x => x.source.kind === 'option' && x.source.id === 'draconic-ancestry')).toHaveLength(10);
  expect(DATA.optionGroups.find(g => g.id === 'draconic-ancestry-sorcerer')!.from).toBe('draconic-ancestry');
  expect(DATA.subclasses.find(s => s.id === 'draconic-bloodline')!.options).toContain('draconic-ancestry-sorcerer');
});
test('feats', () => {
  for (const id of ['polearm-master', 'sentinel', 'war-caster', 'shield-master', 'great-weapon-master', 'magic-initiate', 'ritual-caster', 'mage-slayer', 'spell-sniper', 'lucky'])
    expect(DATA.feats.find(x => x.id === id), id).toBeTruthy();
  expect(DATA.feats.find(x => x.id === 'magic-initiate')!.spells.map(g => g.choose?.count)).toEqual([2, 1]);
  expect(DATA.features.find(x => x.source.kind === 'feat' && x.source.id === 'sentinel')?.cost).toBe('reaction');
});
