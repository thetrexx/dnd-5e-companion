import { DATA } from '../../src/data';
import type { ClassId } from '../../src/data/types';
import { bonusLabel } from '../../src/logic/bonus';
import { extraListTag, listSpells } from '../../src/logic/rules';
import { effectiveSub, subclassesAt } from '../../src/logic/subclass';

test('effectiveSub needs an existing subclass of the class at or above its level', () => {
  expect(effectiveSub('wizard', 1, 'school-of-evocation')).toBeUndefined();
  expect(effectiveSub('druid', 5, 'school-of-evocation')).toBeUndefined();
  expect(effectiveSub('wizard', 2, 'school-of-evocation')?.id).toBe('school-of-evocation');
  expect(effectiveSub('wizard', 3, 'school-of-evocation')?.id).toBe('school-of-evocation');
  expect(effectiveSub('wizard', 3, undefined)).toBeUndefined();
  expect(effectiveSub('wizard', 3, 'nope')).toBeUndefined();
});

test('subclassesAt lists the class subclasses once the level is reached', () => {
  expect(subclassesAt('fighter', 2)).toEqual([]);
  expect(subclassesAt('fighter', 3).map(s => s.id)).toEqual(['champion', 'battle-master', 'eldritch-knight', 'arcane-archer', 'cavalier', 'samurai']);
  expect(subclassesAt('wizard', 1)).toEqual([]);
  expect(subclassesAt('warlock', 1).map(s => s.id)).toEqual(['the-archfey', 'the-fiend', 'the-great-old-one', 'the-hexblade']);
});

test('colliding wild magic ids', () => {
  expect(effectiveSub('barbarian', 3, 'wild-magic')).toBeUndefined();
  expect(effectiveSub('sorcerer', 1, 'wild-magic')?.id).toBe('wild-magic');
  expect(effectiveSub('barbarian', 3, 'path-of-wild-magic')?.id).toBe('path-of-wild-magic');
});

const sorc = () => DATA.classes.find(c => c.id === 'sorcerer')!;
const widened = () => ({ ...DATA.subclasses.find(s => s.id === 'wild-magic')!, extraLists: ['cleric'] as ClassId[] });

test('extra lists widen the class list', () => {
  const ids = listSpells(sorc(), widened()).map(s => s.id);
  expect(ids).toContain('cure-wounds');            // cleric only
  expect(ids).toContain('fire-bolt');              // sorcerer
  expect(new Set(ids).size).toBe(ids.length);      // no duplicates
  expect(listSpells(sorc()).map(s => s.id)).not.toContain('cure-wounds');
});

test('extraListTag names the extra list only for spells off the class list', () => {
  const sp = (id: string) => DATA.spells.find(s => s.id === id)!;
  expect(extraListTag(sorc(), widened(), sp('cure-wounds'))).toBe('Cleric list');
  expect(extraListTag(sorc(), widened(), sp('fire-bolt'))).toBeUndefined();
  expect(extraListTag(sorc(), undefined, sp('cure-wounds'))).toBeUndefined();
});

test('subclass casters ignore extra lists', () => {
  const fighter = DATA.classes.find(c => c.id === 'fighter')!;
  const ek = DATA.subclasses.find(s => s.id === 'eldritch-knight')!;
  expect(listSpells(fighter, { ...ek, extraLists: ['cleric'] }).map(s => s.id)).toEqual(listSpells(fighter, ek).map(s => s.id));
});

test('bonusLabel', () => {
  const sub = DATA.subclasses.find(s => s.id === 'swarmkeeper')!;
  expect(bonusLabel('subclass', sub)).toBe('Swarmkeeper');
  expect(bonusLabel('domain', sub)).toBe('Domain');
  expect(bonusLabel('patron', sub)).toBe('Patron');
});
