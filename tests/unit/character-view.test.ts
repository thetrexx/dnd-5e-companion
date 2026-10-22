import { charSpellSections } from '../../src/character/view';
import { emptyCharacter } from '../../src/character/types';
import type { CharClass, Character } from '../../src/character/types';

const ch = (classes: CharClass[], extra: Partial<Character> = {}): Character => ({ ...emptyCharacter(), classes, ...extra });

const lyra = ch([{ cls: 'sorcerer', level: 5, sub: 'draconic-bloodline' }], { race: 'tiefling',
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' }, { id: 'shield', cls: 'sorcerer' }, { id: 'fireball', cls: 'sorcerer' }] });

test('mine view: picks plus unlocked racial spells', () => {
  const s = charSpellSections(lyra, 'mine');
  expect(s.map(x => x.id)).toEqual(['cantrips-sorcerer', 'cantrips-race-tiefling', 'lvl-1-sorcerer', 'lvl-1-race-tiefling', 'lvl-2-race-tiefling', 'lvl-3-sorcerer']);
  expect(s.find(x => x.id === 'cantrips-race-tiefling')).toMatchObject({ title: 'Cantrips', subtitle: 'Tiefling', motif: undefined });
  expect(s.find(x => x.id === 'lvl-1-sorcerer')!.items.map(i => i.id)).toEqual(['shield']);
  expect(s.every(x => x.mine === undefined)).toBe(true);
});
test('all view rings the character spells and locks unreachable levels', () => {
  const s = charSpellSections(lyra, 'all');
  const l1 = s.find(x => x.id === 'lvl-1-sorcerer')!;
  expect(l1.items.length).toBeGreaterThan(10);
  expect(l1.mine).toEqual(['shield']);
  expect(s.find(x => x.id === 'lvl-4-sorcerer')!.locked).toBe('Unlocks at Sorcerer 7');
});
test('multiclass orders by level then class', () => {
  const c = ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2, mod: 3 }],
    { spells: [{ id: 'shield', cls: 'sorcerer' }, { id: 'cure-wounds', cls: 'druid' }, { id: 'guidance', cls: 'druid' }] });
  expect(charSpellSections(c, 'mine').map(x => x.id)).toEqual(['cantrips-druid', 'lvl-1-sorcerer', 'lvl-1-druid']);
});
test('domain spells are always prepared and tagged', () => {
  const c = ch([{ cls: 'cleric', level: 1, sub: 'life-domain', mod: 3 }], { spells: [{ id: 'guidance', cls: 'cleric' }] });
  const l1 = charSpellSections(c, 'mine').find(x => x.id === 'lvl-1-cleric')!;
  expect(l1.items.map(i => i.id)).toEqual(['bless', 'cure-wounds']);
  expect(l1.tags).toEqual({ bless: 'Domain', 'cure-wounds': 'Domain' });
});
test('non-caster: race and feature spells get their own sections', () => {
  const c = ch([{ cls: 'monk', level: 3, sub: 'way-of-shadow' }], { race: 'tiefling' });
  const ids = charSpellSections(c, 'mine').map(x => x.id);
  expect(ids).toContain('cantrips-feature-shadow-arts');
  expect(ids).toContain('lvl-2-feature-shadow-arts');
  expect(ids.some(i => i.endsWith('-monk'))).toBe(false);
  const dark = charSpellSections(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }), 'all').find(x => x.id === 'lvl-2-race-tiefling')!;
  expect(dark.locked).toBe('Unlocks at character level 5');
});
