import { ERR_NEWER, ERR_NOT_CHARACTER, parseCharacter } from '../../src/character/parse';
import { deleteCharacter, loadCharacter, saveCharacter } from '../../src/character/store';
import type { Character } from '../../src/character/types';

afterEach(() => { vi.restoreAllMocks(); deleteCharacter(); localStorage.clear(); });

const lyra = { v: 1, name: 'Lyra', race: 'tiefling', classes: [{ cls: 'sorcerer', level: 5, sub: 'draconic-bloodline' }],
  options: ['metamagic-quickened-spell', 'metamagic-twinned-spell', 'draconic-ancestry-red'], feats: [],
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' }, { id: 'shield', cls: 'sorcerer' }] };

test('a valid character round-trips', () => expect(parseCharacter(lyra)).toEqual({ ok: true, ch: lyra, dropped: [] }));
test('not a character', () => {
  for (const raw of [null, 'x', 42, {}, { v: 'one' }]) expect(parseCharacter(raw)).toEqual({ ok: false, error: ERR_NOT_CHARACTER });
});
test('newer version', () => expect(parseCharacter({ ...lyra, v: 2 })).toEqual({ ok: false, error: ERR_NEWER }));
test('unknown content is dropped and listed', () => {
  const r = parseCharacter({ ...lyra, race: 'kender', spells: [...lyra.spells, { id: 'old-spell', cls: 'sorcerer' }], options: ['metamagic-gone'] });
  expect(r.ok && r.ch.race).toBeUndefined();
  expect(r.ok && r.dropped).toEqual(['race "kender"', 'option "metamagic-gone"', 'spell "old-spell"']);
});
test('clamps and cleans', () => {
  const r = parseCharacter({ ...lyra, name: '  x  ', classes: [{ cls: 'sorcerer', level: 99, sub: 'life-domain', mod: 50 }, { cls: 'sorcerer', level: 2 }] });
  expect(r.ok && r.ch.name).toBe('x');
  expect(r.ok && r.ch.classes).toEqual([{ cls: 'sorcerer', level: 20 }]);
});
test('spell needs a class the character has, or a grant key', () => {
  const r = parseCharacter({ ...lyra, spells: [{ id: 'cure-wounds', cls: 'cleric' }, { id: 'thaumaturgy', grant: 'race:tiefling:0' }, { id: 'light' }] });
  expect(r.ok && r.ch.spells).toEqual([{ id: 'thaumaturgy', grant: 'race:tiefling:0' }]);
});
test('store survives blocked storage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadCharacter()).toBeNull();
  expect(saveCharacter(lyra as Character)).toBe(false);
  expect(() => deleteCharacter()).not.toThrow();
});
test('blocked storage keeps the character for this session', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  expect(saveCharacter(lyra as Character)).toBe(false);
  expect(loadCharacter()).toEqual(lyra);
  deleteCharacter();
  expect(loadCharacter()).toBeNull();
});
test('store round-trips', () => { saveCharacter(lyra as Character); expect(loadCharacter()).toEqual(lyra); deleteCharacter(); expect(loadCharacter()).toBeNull(); });
