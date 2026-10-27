import { castingInfo, classLine, featureLevel, pickableSpells, pickCounts, raceChain, totalLevel } from '../../src/character/derive';
import { emptyCharacter } from '../../src/character/types';
import type { CharClass, Character } from '../../src/character/types';
import { DATA } from '../../src/data';

const ch = (classes: CharClass[], extra: Partial<Character> = {}): Character => ({ ...emptyCharacter(), classes, ...extra });

test('levels and class line', () => {
  const c = ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2 }]);
  expect(totalLevel(c)).toBe(5);
  expect(classLine(c)).toBe('Sorcerer 3 / Druid 2');
});
test('race chain', () => {
  expect(raceChain('drow').map(r => r.id)).toEqual(['elf', 'drow']);
  expect(raceChain('tiefling').map(r => r.id)).toEqual(['tiefling']);
  expect(raceChain(undefined)).toEqual([]);
  expect(raceChain('kender')).toEqual([]);
});
test('casting info per class as if single-classed', () => {
  expect(castingInfo({ cls: 'sorcerer', level: 5 })).toMatchObject({ list: 'sorcerer', cantrips: 5, known: 6, maxLevel: 3, ceiling: 9, ability: 'cha' });
  expect(castingInfo({ cls: 'druid', level: 2, mod: 3 })).toMatchObject({ prepared: 5, maxLevel: 1 });
  expect(castingInfo({ cls: 'paladin', level: 5, mod: 3 })).toMatchObject({ prepared: 5, maxLevel: 2, ceiling: 5 });
  expect(castingInfo({ cls: 'paladin', level: 1, mod: -1 })).toMatchObject({ prepared: 1, maxLevel: 0 });
  expect(castingInfo({ cls: 'fighter', level: 3 })).toBeNull();
  expect(castingInfo({ cls: 'fighter', level: 3, sub: 'eldritch-knight' })).toMatchObject({ list: 'wizard', schools: ['Abjuration', 'Evocation'], cantrips: 2, known: 3, maxLevel: 1, ceiling: 4 });
  expect(castingInfo({ cls: 'warlock', level: 1 })).toMatchObject({ pact: true });
});
test('pickable spells', () => {
  const ek = pickableSpells({ cls: 'fighter', level: 3, sub: 'eldritch-knight' });
  expect(ek.find(p => p.spell.id === 'shield')!.tag).toBeUndefined();
  expect(ek.find(p => p.spell.id === 'charm-person')!.tag).toBe('Any school');
  expect(ek.every(p => p.spell.level <= 1)).toBe(true);
  expect(pickableSpells({ cls: 'warlock', level: 1, sub: 'the-fiend' }).find(p => p.spell.id === 'burning-hands')!.tag).toBe('Patron');
});
test('pickable spells: extra-list spells carry their list tag', () => {
  const ds = pickableSpells({ cls: 'sorcerer', level: 1, sub: 'divine-soul' });
  expect(ds.find(p => p.spell.id === 'guiding-bolt')!.tag).toBe('Cleric list');
  expect(ds.find(p => p.spell.id === 'magic-missile')!.tag).toBeUndefined();
});
test('pick counts skip Mystic Arcanum', () => {
  const c = ch([{ cls: 'warlock', level: 11 }], { spells: [{ id: 'eldritch-blast', cls: 'warlock' }, { id: 'hex', cls: 'warlock' }, { id: 'mass-suggestion', cls: 'warlock' }] });
  expect(pickCounts(c, 'warlock')).toEqual({ cantrips: 1, spells: 1 });
});
test('feature level', () => {
  const c = ch([{ cls: 'fighter', level: 2 }, { cls: 'sorcerer', level: 3 }], { race: 'dragonborn' });
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(featureLevel(c, f('action-surge'))).toBe(2);
  expect(featureLevel(c, f('metamagic-quickened-spell'))).toBe(3);
  expect(featureLevel(c, f('breath-weapon'))).toBe(5);
});
