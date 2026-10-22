import { charActionSections, charMenuRows, charSpellSections } from '../../src/character/view';
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
test('character action sections', () => {
  const c = ch([{ cls: 'fighter', level: 3, sub: 'battle-master' }, { cls: 'sorcerer', level: 3 }],
    { race: 'dragonborn', feats: ['sentinel'], options: ['fighting-style-defense', 'maneuvers-trip-attack', 'metamagic-quickened-spell', 'draconic-ancestry-red'] });
  const ids = charActionSections(c).map(s => s.id);
  expect(ids).toEqual(['actions', 'bonus', 'reactions', 'class-fighter', 'subclass-fighter', 'opt-maneuvers', 'class-sorcerer', 'opt-metamagic', 'race', 'feats']);
  expect(charActionSections(c).find(s => s.id === 'race')!.title).toBe('Dragonborn Actions');
  expect(charActionSections(c).find(s => s.id === 'opt-metamagic')!.items.map(i => i.id)).toEqual(['metamagic-quickened-spell']);
});
test('single-class menu', () => {
  const rows = charMenuRows(lyra);
  expect(rows.map(r => r.label).slice(0, 8)).toEqual(['Actions', 'Bonus Actions', 'Reactions', 'Sorcerer Actions', 'MAGIC', 'Cantrips', 'Level 1 Spells', 'Level 2 Spells']);
  expect(rows.find(r => r.label === 'Level 4 Spells')!.dimmed).toBe(true);
  expect(rows.find(r => r.label === 'Level 1 Spells')!.target).toEqual({ page: 'me-spells', section: 'lvl-1-sorcerer' });
  expect(rows.at(-1)).toMatchObject({ label: 'Tiefling Spells', target: { page: 'me-spells', section: 'cantrips-race-tiefling' } });
});
test('multiclass menu with a non-caster first', () => {
  const rows = charMenuRows(ch([{ cls: 'fighter', level: 2 }, { cls: 'wizard', level: 3, mod: 3 }]));
  expect(rows.filter(r => r.kind === 'class').map(r => r.label)).toEqual(['Fighter Actions', 'Wizard Actions']);
  expect(rows.filter(r => r.kind === 'spells').every(r => r.motif === 'wizard')).toBe(true);
  expect(rows.find(r => r.kind === 'cantrips')!.label).toBe('Cantrips');
  const two = charMenuRows(ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2 }]));
  expect(two.filter(r => r.kind === 'spells').slice(0, 2).map(r => r.label)).toEqual(['Level 1 Sorcerer Spells', 'Level 1 Druid Spells']);
});
test('non-caster with racial spells gets a spells row', () => {
  const rows = charMenuRows(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }));
  expect(rows.map(r => r.label)).toEqual(['Actions', 'Bonus Actions', 'Reactions', 'Barbarian Actions', 'MAGIC', 'Tiefling Spells']);
});
