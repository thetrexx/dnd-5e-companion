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
  expect(subclassesAt('fighter', 3).map(s => s.id)).toEqual(['champion', 'battle-master', 'eldritch-knight', 'arcane-archer']);
  expect(subclassesAt('wizard', 1)).toEqual([]);
  expect(subclassesAt('warlock', 1).map(s => s.id)).toEqual(['the-archfey', 'the-fiend', 'the-great-old-one', 'the-hexblade']);
});