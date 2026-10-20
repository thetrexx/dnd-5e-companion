import { parseHash, toHash } from '../../src/router';

test.each(['#/', '#/level/wizard', '#/menu/wizard/3', '#/spells/wizard/3?s=lvl-1', '#/actions/fighter/5?s=bonus', '#/card/spell/magic-missile/wizard/3', '#/settings'])
  ('round-trips %s', h => expect(toHash(parseHash(h))).toBe(h));
test.each(['', '#', '#/menu/necromancer/3', '#/menu/wizard/0', '#/menu/wizard/21', '#/spells/wizard/abc', '#/%%%'])
  ('garbage %s falls back to start', h => expect(parseHash(h)).toEqual({ page: 'start' }));
