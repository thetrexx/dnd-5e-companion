import { DATA } from '../../src/data';
import { autoSpells, grantSlots, grantSources } from '../../src/character/grants';
import { emptyCharacter, type Character } from '../../src/character/types';

const r = (id: string) => DATA.races.find(x => x.id === id)!;
test('races', () => {
  expect(DATA.races).toHaveLength(31);   // 19 PHB + Custom Lineage + 11 SCAG/DMG
  expect(r('drow').parent).toBe('elf');
  expect(r('tiefling').spells.map(x => [x.spell, x.atLevel])).toEqual([['thaumaturgy', 1], ['hellish-rebuke', 3], ['darkness', 5]]);
  expect(r('drow').spells.map(x => [x.spell, x.atLevel])).toEqual([['dancing-lights', 1], ['faerie-fire', 3], ['darkness', 5]]);
  expect(r('high-elf').spells[0].choose).toMatchObject({ lists: ['wizard'], level: 0, count: 1 });
  expect(r('forest-gnome').spells[0].spell).toBe('minor-illusion');
});
test('racial features', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(f('breath-weapon').scaling![0].values).toEqual([...Array(5).fill('2d6'), ...Array(5).fill('3d6'), ...Array(5).fill('4d6'), ...Array(5).fill('5d6')]);
  for (const id of ['lucky', 'relentless-endurance', 'savage-attacks']) expect(f(id), id).toBeTruthy();
  expect(DATA.features.filter(x => x.source.kind === 'option' && x.source.id === 'draconic-ancestry')).toHaveLength(10);
  expect(DATA.optionGroups.find(g => g.id === 'draconic-ancestry-sorcerer')!.from).toBe('draconic-ancestry');
  expect(DATA.subclasses.find(s => s.id === 'draconic-bloodline')!.options).toContain('draconic-ancestry-sorcerer');
});
test('feats', () => {
  for (const id of ['polearm-master', 'sentinel', 'war-caster', 'shield-master', 'great-weapon-master', 'magic-initiate', 'ritual-caster', 'mage-slayer', 'spell-sniper', 'lucky'])
    expect(DATA.feats.find(x => x.id === id), id).toBeTruthy();
  expect(DATA.feats.find(x => x.id === 'magic-initiate')!.spells.map(g => g.choose?.count)).toEqual([2, 1]);
  expect(DATA.features.find(x => x.source.kind === 'feat' && x.source.id === 'sentinel')?.cost).toBe('reaction');
});

test('racial trait cards', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect([f('mask-of-the-wild'), f('naturally-stealthy'), f('halfling-nimbleness')].map(x => [x.source.id, x.cost, x.page]))
    .toEqual([['wood-elf', 'free', 24], ['lightfoot-halfling', 'free', 28], ['halfling', 'free', 28]]);
});

test('feat details', () => {
  const d = (id: string) => DATA.feats.find(x => x.id === id)!.description.join(' ');
  expect(d('tavern-brawler')).toContain('+1 to Strength or Constitution');
  expect(d('ritual-caster')).toContain('book in your hand');
  expect(d('shield-master')).toContain("aren't incapacitated");
  expect(DATA.features.find(x => x.id === 'shield-master-evade')!.description.join(' ')).toContain('not incapacitated');
});

test('totemic attunement summary is not a bonus action', () => {
  const t = DATA.features.find(x => x.id === 'totemic-attunement')!;
  expect(t.cost).toBe(DATA.features.find(x => x.id === 'totem-spirit')!.cost);
  expect(t.cost).not.toBe('bonus');
});

test('opportunity attack has a trigger', () => {
  expect(DATA.features.find(x => x.id === 'opportunity-attack')!.trigger).toMatch(/hostile creature .*sight.* reach/);
});

test('xanathar racial feats', () => {
  for (const id of ['bountiful-luck', 'dragon-fear', 'drow-high-magic', 'dwarven-fortitude', 'fade-away', 'fey-teleportation', 'flames-of-phlegethos', 'orcish-fury', 'second-chance', 'wood-elf-magic'])
    expect(DATA.feats.find(f => f.id === id), id).toMatchObject({ book: 'xge' });
  for (const id of ['elven-accuracy', 'prodigy', 'squat-nimbleness', 'infernal-constitution', 'dragon-hide'])
    expect(DATA.feats.find(f => f.id === id), id).toBeUndefined();
  expect(DATA.feats.filter(f => f.book === 'xge')).toHaveLength(10);
});
test('fey teleportation grants misty step', () =>
  expect(DATA.feats.find(f => f.id === 'fey-teleportation')!.spells.map(g => g.spell)).toContain('misty-step'));
test('xanathar feat spells and cards', () => {
  const spells = (id: string) => DATA.feats.find(f => f.id === id)!.spells.map(g => [g.spell ?? g.choose?.lists.join(), g.ability, g.uses !== undefined]);
  expect(spells('drow-high-magic')).toEqual([['detect-magic', 'cha', true], ['levitate', 'cha', true], ['dispel-magic', 'cha', true]]);
  expect(spells('wood-elf-magic')).toEqual([['druid', 'wis', false], ['longstrider', 'wis', true], ['pass-without-trace', 'wis', true]]);
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect([f('bountiful-luck'), f('fade-away'), f('second-chance'), f('orcish-fury-reprisal')].map(x => [x.source.kind, x.cost, x.book]))
    .toEqual(Array(4).fill(['feat', 'reaction', 'xge']));
  expect(f('dragon-fear').source.id).toBe('dragon-fear');
});

// Task 10: Tasha's feats and Custom Lineage
test('tasha feats', () => {
  for (const id of ['chef', 'crusher', 'eldritch-adept', 'fey-touched', 'fighting-initiate', 'metamagic-adept', 'piercer', 'poisoner', 'shadow-touched', 'slasher', 'telekinetic', 'telepathic'])
    expect(DATA.feats.find(f => f.id === id), id).toMatchObject({ book: 'tce' });
  for (const id of ['gunner', 'skill-expert']) expect(DATA.feats.find(f => f.id === id), id).toBeUndefined();
});
// Plan 8 Task 1: Artificer Initiate (Tasha's p. 79)
test('artificer initiate', () => {
  const ai = DATA.feats.find(f => f.id === 'artificer-initiate')!;
  expect(ai).toMatchObject({ book: 'tce', page: 79 });
  expect(ai.prereq).toBeUndefined();
  expect(ai.spells).toEqual([
    { choose: { lists: ['artificer'], level: 0, count: 1 }, atLevel: 1, ability: 'int' },
    { choose: { lists: ['artificer'], level: 1, count: 1 }, atLevel: 1, ability: 'int', uses:DATA.feats.find(f => f.id === 'fey-touched')!.spells[1].uses },
  ]);
  expect(DATA.features.find(x => x.id === 'artificer-initiate')).toMatchObject({ source: { kind: 'feat', id: 'artificer-initiate' }, book: 'tce', page: 79 });
  expect(DATA.feats).toHaveLength(52);
  const ch = { ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }], feats: ['artificer-initiate'] } as Character;
  const ids = (k: string) => grantSlots(ch).find(s => s.key === k)!.candidates.map(s => s.id);
  expect(ids('feat:artificer-initiate:0')).toEqual(expect.arrayContaining(['guidance', 'thorn-whip', 'booming-blade']));
  expect(ids('feat:artificer-initiate:0')).not.toContain('eldritch-blast');
  expect(ids('feat:artificer-initiate:1')).toEqual(expect.arrayContaining(['cure-wounds', 'tashas-caustic-brew']));
  expect(ids('feat:artificer-initiate:1')).not.toContain('magic-missile');
});
test('any-class feat choices include the artificer list; class-named ones do not', () => {
  const lists = (id: string) => DATA.feats.find(f => f.id === id)!.spells.filter(g => g.choose).map(g => g.choose!.lists);
  for (const id of ['fey-touched', 'shadow-touched']) expect(lists(id)[0], id).toContain('artificer');
  for (const id of ['magic-initiate', 'ritual-caster', 'spell-sniper', 'wood-elf-magic'])
    for (const l of lists(id)) expect(l, id).not.toContain('artificer');
});
test('fey touched grants misty step and a choice', () => {
  const ft = DATA.feats.find(f => f.id === 'fey-touched')!;
  expect(ft.spells.map(g => g.spell)).toContain('misty-step');
  expect(ft.spells.find(g => g.choose)!.choose).toMatchObject({ level: 1, schools: expect.arrayContaining(['Divination', 'Enchantment']) });
});
test('tasha feat spells carry their uses', () => {
  const spells = (id: string) => DATA.feats.find(f => f.id === id)!.spells.map(g => [g.spell ?? g.choose?.schools?.join(), g.uses !== undefined]);
  expect(spells('fey-touched')).toEqual([['misty-step', true], ['Divination,Enchantment', true]]);
  expect(spells('shadow-touched')).toEqual([['invisibility', true], ['Illusion,Necromancy', true]]);
  expect(spells('telepathic')).toEqual([['detect-thoughts', true]]);
  expect(spells('telekinetic')).toEqual([['mage-hand', true]]);
  const lists = DATA.feats.find(f => f.id === 'shadow-touched')!.spells[1].choose!.lists;
  expect(lists).toEqual(DATA.feats.find(f => f.id === 'fey-touched')!.spells[1].choose!.lists);
  expect(lists).toHaveLength(9);
});
test('tasha feat cards', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  for (const id of ['crusher', 'piercer', 'slasher']) expect(f(id), id).toMatchObject({ source: { kind: 'feat', id }, cost: 'free', uses: 'Once per turn', book: 'tce' });
  expect(f('poisoner')).toMatchObject({ cost: 'bonus', book: 'tce', page: 80 });
  expect(f('telekinetic')).toMatchObject({ cost: 'bonus', book: 'tce', page: 81 });
  expect(f('chef')).toMatchObject({ cost: 'other', book: 'tce', page: 79 });
  expect(f('chef-treat')).toMatchObject({ source: { kind: 'feat', id: 'chef' }, cost: 'bonus', book: 'tce', page: 79 });
  expect(f('metamagic-adept')).toMatchObject({ cost: 'free', resource: expect.stringMatching(/2 sorcery points/), book: 'tce', page: 80 });
});
test('custom lineage', () => expect(DATA.races.find(r => r.id === 'custom-lineage')).toMatchObject({ book: 'tce', page: 8, spells: [], options: [] }));

// Plan 10 Task 1: SCAG and DMG races, variants, Svirfneblin Magic
const spellsOf = (race: string) => grantSources({ ...emptyCharacter(), race, classes: [{ cls: 'fighter', level: 5 }] } as Character)
  .filter(s => s.key.startsWith('race:')).flatMap(s => s.grants.map(g => g.grant.spell));
test('plain tiefling keeps infernal legacy', () => {
  expect(spellsOf('tiefling').sort()).toEqual(['darkness', 'hellish-rebuke', 'thaumaturgy']);
});
test('tiefling variants replace infernal legacy', () => {
  expect(spellsOf('tiefling-devils-tongue').sort()).toEqual(['charm-person', 'enthrall', 'vicious-mockery']);
  expect(spellsOf('tiefling-hellfire').sort()).toEqual(['burning-hands', 'darkness', 'thaumaturgy']);
  expect(spellsOf('tiefling-winged')).toEqual([]);
});
test('half-elf variants add elf magic', () => {
  expect(spellsOf('half-elf')).toEqual([]);
  expect(spellsOf('half-elf-drow-magic').sort()).toEqual(['dancing-lights', 'darkness', 'faerie-fire']);
  expect(spellsOf('half-elf-mask-of-the-wild')).toEqual([]);
});
test('batch 5 races', () => {
  expect(DATA.races).toHaveLength(31);
  expect(DATA.races.find(r => r.id === 'aasimar')).toMatchObject({ book: 'dmg', page: 286 });
  expect(DATA.races.find(r => r.id === 'aasimar')!.parent).toBeUndefined();
  expect(DATA.races.find(r => r.id === 'duergar')).toMatchObject({ parent: 'dwarf', book: 'scag', page: 104 });
  expect(DATA.feats.find(f => f.id === 'svirfneblin-magic')).toMatchObject({ book: 'scag', page: 115 });
  expect(DATA.feats).toHaveLength(52);
});
test('duergar magic unlocks by level', () => {
  const at = (level: number) => autoSpells({ ...emptyCharacter(), race: 'duergar', classes: [{ cls: 'fighter', level }] } as Character)
    .map(a => [a.spell.id, a.unlocked]);
  expect(at(2)).toEqual([['enlarge-reduce', false], ['invisibility', false]]);
  expect(at(3)).toEqual([['enlarge-reduce', true], ['invisibility', false]]);
});
test('eladrin and aasimar spells', () => {
  expect(r('eladrin').spells).toEqual([{ spell: 'misty-step', atLevel: 1, uses: 'Once per short or long rest, no slot' }]);
  expect(r('aasimar').spells.map(g => [g.spell, g.atLevel, g.ability])).toEqual([['light', 1, 'cha'], ['lesser-restoration', 3, 'cha'], ['daylight', 5, 'cha']]);
  expect(r('aasimar').icon).toBe('icons/fallback/aasimar.svg');
  for (const id of ['svirfneblin', 'ghostwise-halfling', 'half-elf-mask-of-the-wild', 'tiefling-winged']) expect(r(id).spells, id).toEqual([]);
  expect(r('half-elf-cantrip').spells[0].choose).toMatchObject({ lists: ['wizard'], level: 0, count: 1 });
});
test('half-elf mask of the wild card is PHB', () => {
  const m = DATA.features.find(x => x.id === 'half-elf-mask-of-the-wild')!;
  expect(m).toMatchObject({ source: { kind: 'race', id: 'half-elf-mask-of-the-wild' }, cost: 'free', page: 24 });
  expect(m.book).toBeUndefined();
});
test('svirfneblin magic', () => {
  const f = DATA.feats.find(x => x.id === 'svirfneblin-magic')!;
  expect(f.prereq).toBe('Gnome (deep gnome)');
  expect(f.spells.map(g => [g.spell, g.ability, g.uses])).toEqual([
    ['nondetection', 'int', 'At will, on yourself only, no slot'],
    ['blindness-deafness', 'int', 'Once per long rest, no slot'],
    ['blur', 'int', 'Once per long rest, no slot'],
    ['disguise-self', 'int', 'Once per long rest, no slot'],
  ]);
  expect(DATA.features.find(x => x.source.kind === 'feat' && x.source.id === 'svirfneblin-magic')).toBeUndefined();
});
