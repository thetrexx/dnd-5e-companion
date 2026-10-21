import type { Route } from '../../src/data/types';
import { parseHash, toHash } from '../../src/router';

test.each(['#/', '#/level/wizard', '#/menu/wizard/3', '#/spells/wizard/3?s=lvl-1', '#/actions/fighter/5?s=bonus', '#/card/spell/magic-missile/wizard/3', '#/settings',
  '#/subclass/cleric/5', '#/menu/cleric/5/life-domain', '#/spells/cleric/5/life-domain?s=lvl-1', '#/actions/fighter/3/eldritch-knight?s=subclass', '#/card/spell/bless/cleric/5/life-domain'])
  ('round-trips %s', h => expect(toHash(parseHash(h))).toBe(h));
test.each(['', '#', '#/menu/necromancer/3', '#/menu/wizard/0', '#/menu/wizard/21', '#/spells/wizard/abc', '#/%%%'])
  ('garbage %s falls back to start', h => expect(parseHash(h)).toEqual({ page: 'start' }));

test('subclass segment', () => {
  expect(parseHash('#/menu/cleric/5/life-domain')).toEqual({ page: 'menu', cls: 'cleric', level: 5, sub: 'life-domain' });
  expect(parseHash('#/subclass/cleric/5')).toEqual({ page: 'subclass', cls: 'cleric', level: 5 });
  expect(parseHash('#/menu/wizard/3')).toEqual({ page: 'menu', cls: 'wizard', level: 3 });
  expect(parseHash('#/menu/wizard/3/Bad_Sub')).toEqual({ page: 'start' });
  expect(parseHash('#/card/spell/bless/cleric/5/Bad_Sub')).toEqual({ page: 'start' });
  for (const r of [{ page: 'card', kind: 'spell', id: 'bless', cls: 'cleric', level: 5, sub: 'life-domain' }, { page: 'subclass', cls: 'wizard', level: 2 }] as Route[])
    expect(parseHash(toHash(r))).toEqual(r);
});