import { DATA } from '../../src/data';
import { actionSections } from '../../src/logic/sections';
import { optionSlots } from '../../src/character/options';
import { emptyCharacter } from '../../src/character/types';
import type { Character } from '../../src/character/types';

const g = (id: string) => DATA.optionGroups.find(x => x.id === id)!;
const opts = (id: string) => DATA.features.filter(f => f.source.kind === 'option' && f.source.id === id);
test('groups', () => {
  expect(g('eldritch-invocations').picks).toEqual([0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8]);
  expect(g('pact-boon').picks).toEqual([0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
  expect(g('metamagic').picks).toEqual([0,0,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4,4,4]);
  expect(opts('metamagic')).toHaveLength(8);
  expect(opts('maneuvers')).toHaveLength(16);
  expect(opts('fighting-style')).toHaveLength(6);
  expect(g('fighting-style-paladin').only!.sort()).toEqual(['fighting-style-defense', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting', 'fighting-style-protection']);
  expect(DATA.features.find(f => f.id === 'eldritch-invocations-agonizing-blast')!.prereq?.text).toMatch(/eldritch blast/i);
  expect(DATA.features.find(f => f.id === 'eldritch-invocations-thirsting-blade')!.prereq).toMatchObject({ level: 5, option: 'pact-boon-pact-of-the-blade' });
  expect(DATA.features.find(f => f.id === 'maneuvers-riposte')!.cost).toBe('reaction');
});
test('browse shows usable options only', () => {
  const ids = actionSections('warlock', 2).find(s => s.id === 'opt-eldritch-invocations')!.items.map(i => i.id);
  expect(ids).not.toContain('eldritch-invocations-thirsting-blade');     // needs level 5
});
test('group sizes and ownership', () => {
  expect(opts('eldritch-invocations')).toHaveLength(46);
  expect(opts('pact-boon')).toHaveLength(3);
  expect(opts('elemental-disciplines')).toHaveLength(16);
  for (const id of ['totem-spirit', 'aspect-of-the-beast', 'totemic-attunement']) expect(opts(id)).toHaveLength(3);
  expect(opts('favored-enemy')).toHaveLength(14);
  expect(opts('natural-explorer')).toHaveLength(8);
  expect(g('favored-enemy').picks[13]).toBe(3);
  expect(g('fighting-style-ranger').from).toBe('fighting-style');
  expect(g('maneuvers').picks).toEqual([0,0,3,3,3,3,5,5,5,7,7,7,7,7,9,9,9,9,9,9]);
});
test('costs and grants', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(f('maneuvers-riposte').resource).toBe('1 superiority die');
  expect(f('metamagic-quickened-spell').resource).toMatch(/2 sorcery points/);
  expect(f('elemental-disciplines-fist-of-four-thunders').spells).toEqual([{ spell: 'thunderwave', atLevel: 3 }]);
  const book = f('eldritch-invocations-book-of-ancient-secrets');
  expect(book.prereq?.option).toBe('pact-boon-pact-of-the-tome');
  expect(book.spells![0].choose).toMatchObject({ level: 1, count: 2, ritual: true });
  expect(book.spells![0].choose!.lists).toHaveLength(8);
  expect(f('eldritch-invocations-armor-of-shadows').spells![0].spell).toBe('mage-armor');
  for (const x of DATA.features.filter(y => y.source.kind === 'option')) expect(x.textSource, x.id).toBe('summary');
});
test('class and subclass hooks', () => {
  const c = (id: string) => DATA.classes.find(x => x.id === id)!.options;
  const s = (id: string) => DATA.subclasses.find(x => x.id === id)!.options;
  expect(c('warlock')).toEqual(['eldritch-invocations', 'pact-boon']);
  expect(c('sorcerer')).toEqual(['metamagic']);
  expect(c('paladin')).toEqual(['fighting-style-paladin']);
  expect(c('ranger')).toEqual(expect.arrayContaining(['fighting-style-ranger', 'favored-enemy', 'natural-explorer']));
  expect(s('battle-master')).toEqual(['maneuvers']);
  expect(s('way-of-the-four-elements')).toEqual(['elemental-disciplines']);
  expect(s('path-of-the-totem-warrior')).toEqual(['totem-spirit', 'aspect-of-the-beast', 'totemic-attunement']);
});
test('option choices are sorted by name in the editor and the browse view', () => {
  const sorted = (names: string[]) => [...names].sort((a, b) => a.localeCompare(b, 'en'));
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 20 }], options: ['pact-boon-pact-of-the-blade'] } as Character;
  const editor = optionSlots(ch).find(s => s.group.id === 'eldritch-invocations')!.choices.map(f => f.name);
  expect(editor).toEqual(sorted(editor));
  const smite = editor.indexOf('Eldritch Smite');
  expect(editor.slice(smite - 1, smite + 2)).toEqual(['Eldritch Sight', 'Eldritch Smite', 'Eldritch Spear']);
  const browse = actionSections('warlock', 20).find(s => s.id === 'opt-eldritch-invocations')!.items.map(i => i.name);
  expect(browse).toEqual(sorted(browse));
  expect(browse.indexOf('Eldritch Smite')).toBe(browse.indexOf('Eldritch Sight') + 1);
});
test('xanathar invocations need their pact', () => {
  const inv = DATA.features.filter(f => f.source.id === 'eldritch-invocations' && f.book === 'xge');
  expect(inv).toHaveLength(14);
  const blade = inv.filter(f => f.prereq?.option === 'pact-boon-pact-of-the-blade');
  expect(blade.map(f => f.id).sort()).toEqual(['eldritch-invocations-eldritch-smite', 'eldritch-invocations-improved-pact-weapon']);
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 12 }], options: ['pact-boon-pact-of-the-chain'] } as Character;
  const offered = optionSlots(ch).find(s => s.group.id === 'eldritch-invocations')!.choices.map(f => f.id);
  for (const f of blade) expect(offered, f.id).not.toContain(f.id);
  expect(offered).toContain('eldritch-invocations-gift-of-the-ever-living-ones');
  expect(offered).not.toContain('eldritch-invocations-shroud-of-shadow');   // needs level 15
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(f('eldritch-invocations-maddening-hex').prereq).toMatchObject({ level: 5, text: expect.stringMatching(/hex/i) });
  expect(f('eldritch-invocations-tricksters-escape').spells).toEqual([expect.objectContaining({ spell: 'freedom-of-movement', atLevel: 7, uses: expect.any(String) })]);
});
