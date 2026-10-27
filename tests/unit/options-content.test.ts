import { DATA, poolOptions } from '../../src/data';
import { actionSections } from '../../src/logic/sections';
import { optionSlots, prune, replaced } from '../../src/character/options';
import { charActionSections } from '../../src/character/view';
import { grantSlots } from '../../src/character/grants';
import { emptyCharacter } from '../../src/character/types';
import type { Character } from '../../src/character/types';
import type { ClassId } from '../../src/data/types';

const g = (id: string) => DATA.optionGroups.find(x => x.id === id)!;
const opts = (id: string) => DATA.features.filter(f => f.source.kind === 'option' && f.source.id === id);
test('groups', () => {
  expect(g('eldritch-invocations').picks).toEqual([0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8]);
  expect(g('pact-boon').picks).toEqual([0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);
  expect(g('metamagic').picks).toEqual([0,0,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4,4,4]);
  expect(opts('metamagic')).toHaveLength(8);
  expect(opts('maneuvers')).toHaveLength(23);   // 16 PHB + 7 Tasha's
  expect(opts('fighting-style')).toHaveLength(13);   // 6 PHB + 7 Tasha's
  expect(g('fighting-style-paladin').only!.slice().sort()).toEqual(['fighting-style-blessed-warrior', 'fighting-style-blind-fighting', 'fighting-style-defense', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting', 'fighting-style-interception', 'fighting-style-protection']);
  expect(g('fighting-style-ranger').only!.slice().sort()).toEqual(['fighting-style-archery', 'fighting-style-blind-fighting', 'fighting-style-defense', 'fighting-style-druidic-warrior', 'fighting-style-dueling', 'fighting-style-thrown-weapon-fighting', 'fighting-style-two-weapon-fighting']);
  expect(g('fighting-style').only!.slice().sort()).toEqual(['fighting-style-archery', 'fighting-style-blind-fighting', 'fighting-style-defense', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting', 'fighting-style-interception', 'fighting-style-protection', 'fighting-style-superior-technique', 'fighting-style-thrown-weapon-fighting', 'fighting-style-two-weapon-fighting', 'fighting-style-unarmed-fighting']);
  expect(g('fighting-style-swords').only!.slice().sort()).toEqual(['fighting-style-dueling', 'fighting-style-two-weapon-fighting']);
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
  expect(c('warlock')).toEqual(['eldritch-invocations', 'pact-boon', 'optional-warlock']);
  expect(c('sorcerer')).toEqual(['metamagic', 'optional-sorcerer']);
  expect(c('paladin')).toEqual(['fighting-style-paladin', 'optional-paladin']);
  expect(c('barbarian')).toEqual(['optional-barbarian']);
  expect(c('rogue')).toEqual(['optional-rogue']);
  expect(c('fighter')).toEqual(['fighting-style']);
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

const ranger = (lvl: number, options: string[] = [], sub?: string) =>
  ({ ...emptyCharacter(), classes: [{ cls: 'ranger', level: lvl, ...(sub && { sub }) }], options }) as Character;
test('old ranger keeps favored enemy (no tick)', () => {
  const ch = ranger(5, ['favored-enemy-undead']);
  expect(optionSlots(ch).map(s => s.group.id)).toEqual(expect.arrayContaining(['favored-enemy', 'natural-explorer', 'optional-ranger']));
  expect(optionSlots(ch).find(s => s.group.id === 'favored-enemy')!.chosen).toEqual(['favored-enemy-undead']);
});
test('favored foe replaces favored enemy, untick restores', () => {
  const on = ranger(5, ['favored-enemy-undead', 'optional-ranger-favored-foe']);
  expect(optionSlots(on).map(s => s.group.id)).not.toContain('favored-enemy');
  expect(replaced(on)).toEqual(new Set(['favored-enemy']));
  expect(optionSlots(ranger(5, ['favored-enemy-undead'])).find(s => s.group.id === 'favored-enemy')!.chosen).toEqual(['favored-enemy-undead']);
});
test('optional slot counts every choice reached', () => {
  const s = optionSlots(ranger(3)).find(x => x.group.id === 'optional-ranger')!;
  expect(s.count).toBe(s.choices.length);
  expect(s.choices.map(f => f.id)).not.toContain('optional-ranger-natures-veil');   // level 10
  expect(optionSlots(ranger(3, [], 'beast-master')).find(x => x.group.id === 'optional-beast-master')!.choices.map(f => f.id))
    .toEqual(['optional-beast-master-primal-companion']);
});
test('ranger optional features', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(g('optional-ranger')).toMatchObject({ owner: { kind: 'class', id: 'ranger' }, optional: true });
  expect(g('optional-beast-master')).toMatchObject({ owner: { kind: 'subclass', id: 'beast-master' }, optional: true });
  expect(opts('optional-ranger').map(x => x.id).sort()).toEqual(['optional-ranger-additional-spells', 'optional-ranger-deft-explorer', 'optional-ranger-favored-foe', 'optional-ranger-natures-veil', 'optional-ranger-primal-awareness']);
  expect(f('optional-ranger-favored-foe')).toMatchObject({ level: 1, cost: 'free', replaces: ['favored-enemy'], book: 'tce', page: 56, optional: true });
  expect(f('optional-ranger-favored-foe').scaling![0].values.filter((v, i) => [0, 5, 13].includes(i))).toEqual(['1d4', '1d6', '1d8']);
  expect(f('optional-ranger-deft-explorer')).toMatchObject({ level: 1, cost: 'passive', replaces: ['natural-explorer'] });
  expect(f('deft-explorer-tireless')).toMatchObject({ level: 10, cost: 'action', optional: true, prereq: { option: 'optional-ranger-deft-explorer' } });
  expect(f('optional-ranger-primal-awareness').spells!.map(s => [s.spell, s.atLevel])).toEqual([
    ['speak-with-animals', 3], ['beast-sense', 5], ['speak-with-plants', 9], ['locate-creature', 13], ['commune-with-nature', 17]]);
  expect(f('optional-ranger-primal-awareness').replaces).toEqual(['primeval-awareness']);
  expect(f('optional-ranger-natures-veil')).toMatchObject({ level: 10, cost: 'bonus', replaces: ['hide-in-plain-sight'], page: 57 });
  expect(f('optional-beast-master-primal-companion')).toMatchObject({ level: 3, replaces: ['rangers-companion', 'companion-commands'], page: 61 });
  expect(f('optional-beast-master-primal-companion').description.join(' ')).toContain("Stat block: Tasha's p. 61");
});

test('martial adept picks two maneuvers from the shared pool', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'fighter', level: 3, sub: 'battle-master' }], feats: ['martial-adept'],
    options: ['maneuvers-parry', 'maneuvers-riposte', 'maneuvers-rally', 'maneuvers-trip-attack', 'maneuvers-feinting-attack'] } as Character;
  const slots = optionSlots(ch).filter(s => (s.group.from ?? s.group.id) === 'maneuvers');
  expect(slots.map(s => s.count).sort()).toEqual([2, 3]);
  expect(slots.flatMap(s => s.chosen).sort()).toEqual([...ch.options].sort());   // each counted once
  expect(charActionSections(ch).find(s => s.id === 'feats')!.items.map(f => f.id)).toEqual(expect.arrayContaining(['martial-adept']));
});
test('martial adept maneuver cards join the feats section, not race', () => {
  const ch = { ...emptyCharacter(), race: 'human', classes: [{ cls: 'wizard', level: 4 }], feats: ['martial-adept'], options: ['maneuvers-parry', 'maneuvers-riposte'] } as Character;
  const secs = charActionSections(ch);
  expect(secs.find(s => s.id === 'feats')!.items.map(f => f.id)).toEqual(expect.arrayContaining(['maneuvers-parry', 'maneuvers-riposte']));
  expect(secs.find(s => s.id === 'race')?.items.map(f => f.id) ?? []).not.toContain('maneuvers-parry');
});
test('martial adept group shape', () => {
  expect(g('martial-adept')).toMatchObject({ owner: { kind: 'feat', id: 'martial-adept' }, from: 'maneuvers' });
  expect(g('martial-adept').picks).toEqual(Array(20).fill(2));
  expect(DATA.feats.find(f => f.id === 'martial-adept')!.options).toEqual(['martial-adept']);
});
test('feat slot leaves with the feat', () =>
  expect(prune({ ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], options: ['maneuvers-parry'] } as Character).options).toEqual([]));
test('feat slot is kept while the feat stays', () =>
  expect(prune({ ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], feats: ['martial-adept'], options: ['maneuvers-parry'] } as Character).options).toEqual(['maneuvers-parry']));

// Task 5: Tasha's optional features of the martial classes, new fighting styles and maneuvers
const f = (id: string) => DATA.features.find(x => x.id === id)!;
test('task 5 optional features', () => {
  for (const id of ['optional-barbarian-instinctive-pounce', 'optional-bard-magical-inspiration', 'optional-paladin-harness-divine-power', 'optional-rogue-steady-aim'])
    expect(f(id), id).toMatchObject({ book: 'tce', optional: true });
});
test('styles land on the right classes', () => {
  const offered = (cls: ClassId) => optionSlots({ ...emptyCharacter(), classes: [{ cls, level: 2 }] } as Character)
    .find(s => (s.group.from ?? s.group.id) === 'fighting-style')!.choices.map(x => x.id);
  expect(offered('fighter')).toContain('fighting-style-superior-technique');
  expect(offered('fighter')).not.toContain('fighting-style-blessed-warrior');
  expect(offered('paladin')).toContain('fighting-style-blessed-warrior');
  expect(offered('ranger')).toContain('fighting-style-druidic-warrior');
  expect(offered('ranger')).not.toContain('fighting-style-interception');
});
test('seven new maneuvers', () => expect(poolOptions('maneuvers').filter(x => x.book === 'tce')).toHaveLength(7));
test('new pool options are tagged optional', () => {
  const tce = [...poolOptions('fighting-style'), ...poolOptions('maneuvers')].filter(x => x.book === 'tce');
  expect(tce).toHaveLength(14);
  for (const x of tce) expect(x.optional, x.id).toBe(true);
  expect(poolOptions('maneuvers').filter(x => x.book === 'tce').map(x => x.id).sort()).toEqual(['maneuvers-ambush', 'maneuvers-bait-and-switch',
    'maneuvers-brace', 'maneuvers-commanding-presence', 'maneuvers-grappling-strike', 'maneuvers-quick-toss', 'maneuvers-tactical-assessment']);
  const adept = { ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], feats: ['martial-adept'] } as Character;
  expect(optionSlots(adept).find(s => s.group.id === 'martial-adept')!.choices.map(x => x.id)).toContain('maneuvers-brace');
});
test('warrior styles grant two cantrips', () => {
  expect(f('fighting-style-blessed-warrior').spells).toEqual([{ choose: { lists: ['cleric'], level: 0, count: 2 }, atLevel: 1, ability: 'cha' }]);
  expect(f('fighting-style-druidic-warrior').spells).toEqual([{ choose: { lists: ['druid'], level: 0, count: 2 }, atLevel: 1, ability: 'wis' }]);
});
test('barbarian and rogue optional groups', () => {
  for (const cls of ['barbarian', 'rogue'])
    expect(g(`optional-${cls}`)).toMatchObject({ name: 'Optional Features', owner: { kind: 'class', id: cls }, optional: true });
  expect(opts('optional-barbarian').map(x => x.id)).toEqual(['optional-barbarian-instinctive-pounce']);
  expect(opts('optional-rogue').map(x => x.id)).toEqual(['optional-rogue-steady-aim']);
  expect(f('optional-barbarian-instinctive-pounce')).toMatchObject({ level: 7, prereq: { level: 7 }, page: 24 });
  expect(f('optional-rogue-steady-aim')).toMatchObject({ level: 3, cost: 'bonus', prereq: { level: 3 }, page: 62 });
  expect(f('optional-bard-magical-inspiration')).toMatchObject({ level: 2, prereq: { level: 2 }, page: 27 });
  expect(f('optional-paladin-harness-divine-power')).toMatchObject({ level: 3, cost: 'bonus', prereq: { level: 3 }, page: 53 });
  const ch = { ...emptyCharacter(), classes: [{ cls: 'barbarian', level: 6 }] } as Character;
  expect(optionSlots(ch).find(s => s.group.id === 'optional-barbarian')).toBeUndefined();   // nothing reached before 7
});
test('blessed warrior cantrips are offered once picked, also to a fighter/paladin', () => {
  const slot = (classes: Character['classes']) => grantSlots({ ...emptyCharacter(), classes, options: ['fighting-style-blessed-warrior'] } as Character)
    .find(s => s.key.startsWith('feature:fighting-style-blessed-warrior'));
  expect(slot([{ cls: 'paladin', level: 2 }])).toMatchObject({ unlocked: true, choose: { lists: ['cleric'], count: 2 } });
  expect(slot([{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }])).toMatchObject({ unlocked: true });
});
