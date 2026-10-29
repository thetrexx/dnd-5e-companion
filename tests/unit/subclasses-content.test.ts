import { DATA } from '../../src/data';
import { autoSpells } from '../../src/character/grants';
import { emptyCharacter } from '../../src/character/types';
import type { Character } from '../../src/character/types';
import { optionSlots } from '../../src/character/options';
import { pickableSpells } from '../../src/character/derive';
import { charSpellSections } from '../../src/character/view';
import { actionSections, spellSections } from '../../src/logic/sections';

const sub = (id: string) => DATA.subclasses.find(x => x.id === id)!;
const A = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk'];

test('19 PHB subclasses A', () => expect(DATA.subclasses.filter(s => A.includes(s.cls) && !s.book)).toHaveLength(19));
test('domain spells', () => {
  const life = sub('life-domain').bonusSpells!;
  expect(life.kind).toBe('domain');
  expect(life.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['bless', 'cure-wounds']);
  for (const d of DATA.subclasses.filter(s => s.cls === 'cleric')) {
    expect(d.bonusSpells!.grants.filter(g => g.spell).map(g => g.atLevel).sort()).toEqual([1, 1, 3, 3, 5, 5, 7, 7, 9, 9]);
  }
});
test('land circle spells per terrain', () => {
  const g = sub('circle-of-the-land').bonusSpells!.grants;
  expect(g.filter(x => x.option === 'land-terrain-arctic').map(x => x.spell).sort())
    .toEqual(['cone-of-cold', 'freedom-of-movement', 'hold-person', 'ice-storm', 'sleet-storm', 'slow', 'commune-with-nature', 'spike-growth'].sort());
  for (const t of ['arctic', 'coast', 'desert', 'forest', 'grassland', 'mountain', 'swamp', 'underdark']) {
    expect(g.filter(x => x.option === `land-terrain-${t}`), t).toHaveLength(8);
    const f = DATA.features.find(x => x.id === `land-terrain-${t}`)!;
    expect(f.level).toBe(2);
    expect(f.cost).toBe('passive');
  }
});
test('EK casting', () => expect(sub('eldritch-knight').casting).toMatchObject({ list: 'wizard', schools: ['Abjuration', 'Evocation'], ability: 'int' }));
test('subclass features', () => {
  for (const id of ['frenzy', 'combat-inspiration', 'preserve-life', 'wrath-of-the-storm', 'combat-wild-shape', 'weapon-bond', 'shadow-step', 'open-hand-technique', 'superiority-dice'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('domain channel divinity options cost a Channel Divinity', () => {
  expect(DATA.features.find(x => x.id === 'preserve-life')!.resource).toBe('1 Channel Divinity');
  expect(DATA.features.find(x => x.id === 'guided-strike')!.resource).toBe('1 Channel Divinity');
});

test('108 subclasses', () => expect(DATA.subclasses).toHaveLength(108));
test('oath and patron spells', () => {
  expect(sub('oath-of-vengeance').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['bane', 'hunters-mark']);
  expect(sub('the-fiend').bonusSpells).toMatchObject({ kind: 'patron' });
  expect(sub('the-fiend').bonusSpells!.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['burning-hands', 'command']);
});
test('AT casting', () => expect(sub('arcane-trickster').casting).toMatchObject({ list: 'wizard', schools: ['Enchantment', 'Illusion'] }));
test('subclass features B', () => {
  for (const id of ['sacred-weapon', 'vow-of-enmity', 'rangers-companion', 'fast-hands', 'assassinate', 'tides-of-chaos',
    'dark-ones-blessing', 'fey-presence', 'portent', 'arcane-ward'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});

const feature = (id: string) => DATA.features.find(f => f.id === id)!;
test('parked subclass spell grants', () => {
  expect(feature('mage-hand-legerdemain').spells).toEqual([{ spell: 'mage-hand', atLevel: 3 }]);
  expect(feature('shadow-arts').spells!.map(g => g.spell)).toEqual(['minor-illusion', 'darkness', 'darkvision', 'pass-without-trace', 'silence']);
  expect(feature('shadow-arts').spells!.every(g => g.atLevel === 3)).toBe(true);
  expect(feature('shadow-arts').spells!.filter(g => g.spell !== 'minor-illusion').every(g => g.uses === '2 ki points')).toBe(true);
  expect(feature('spirit-seeker').spells!.map(g => g.spell)).toEqual(['beast-sense', 'speak-with-animals']);
  expect(feature('spirit-seeker').spells!.every(g => g.uses === 'Ritual only')).toBe(true);
  expect(feature('spirit-walker').spells).toEqual([expect.objectContaining({ spell: 'commune-with-nature', atLevel: 10, uses: 'Ritual only' })]);
  expect(sub('nature-domain').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 1 });
  expect(sub('circle-of-the-land').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 2 });
});

const XGE = ['college-of-glamour', 'college-of-swords', 'arcane-archer', 'way-of-the-drunken-master', 'gloom-stalker', 'swashbuckler', 'shadow-magic', 'storm-sorcery', 'the-hexblade'];
test('xanathar subclasses', () => { for (const id of XGE) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('every xanathar feature names its book', () => {
  const ids = new Set(XGE);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.filter(f => f.source.kind === 'option').length).toBe(10); // 8 arcane shots + 2 lore cantrips
  for (const f of fs) expect(f.book, f.id).toBe('xge');
});
test('arcane archer lore cantrip is gated by its option', () => {
  const aa = sub('arcane-archer');
  expect(aa.options).toContain('arcane-archer-lore');
  expect(DATA.optionGroups.find(g => g.id === 'arcane-archer-lore')!.owner).toEqual({ kind: 'subclass', id: 'arcane-archer' });
  expect(aa.bonusSpells!.kind).toBe('subclass');
  for (const c of ['prestidigitation', 'druidcraft']) {
    expect(aa.bonusSpells!.grants).toContainEqual({ spell: c, atLevel: 3, option: `arcane-archer-lore-${c}` });
    expect(feature(`arcane-archer-lore-${c}`)).toMatchObject({ cost: 'passive', book: 'xge', page: 28, level: 3 });
  }
});
test('storm guide rain is an action, wind a bonus action', () => {
  expect(feature('storm-guide-rain').cost).toBe('action');
  expect(feature('storm-guide-wind').cost).toBe('bonus');
  expect(DATA.features.find(f => f.id === 'storm-guide')).toBeUndefined();
});
test('shadow magic darkness costs sorcery points', () =>
  expect(DATA.features.flatMap(f => f.source.id === 'shadow-magic' ? f.spells ?? [] : []).find(g => g.spell === 'darkness')!.uses).toMatch(/2 sorcery points/i));
test('hexblade patron spells', () => expect(sub('the-hexblade').bonusSpells).toMatchObject({ kind: 'patron' }));
test('gloom stalker magic', () => expect(sub('gloom-stalker').bonusSpells).toMatchObject({ kind: 'subclass' }));
test('swords styles share the fighting style pool', () => expect(DATA.optionGroups.find(g => g.id === 'fighting-style-swords')).toMatchObject({ from: 'fighting-style', owner: { kind: 'subclass', id: 'college-of-swords' } }));
test('must-have features', () => {
  for (const id of ['hexblades-curse', 'hound-of-ill-omen', 'tempestuous-magic', 'blade-flourish', 'tipsy-sway', 'dread-ambusher', 'arcane-shot', 'mantle-of-inspiration'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});

const OTHER: [string, string][] = [['path-of-wild-magic', 'tce'], ['circle-of-spores', 'tce'], ['circle-of-stars', 'tce'], ['swarmkeeper', 'tce'], ['bladesinging', 'tce'], ['death-domain', 'dmg'], ['oathbreaker', 'dmg'], ['oath-of-the-crown', 'scag'], ['path-of-giants', 'bgg']];
test('other BG3 subclasses', () => { for (const [id, book] of OTHER) expect(sub(id), id).toMatchObject({ book }); });
test('death domain reaper: a necromancy cantrip pick plus its targeting card', () => {
  expect(sub('death-domain').bonusSpells!.grants.find(g => g.choose)).toMatchObject({ choose: { level: 0, count: 1, schools: ['Necromancy'] }, atLevel: 1 });
  expect(feature('reaper')).toMatchObject({ source: { kind: 'subclass', id: 'death-domain' }, level: 1, book: 'dmg', page: 96 });
});
test('giants power cantrip follows the chosen option', () => {
  const c = { ...emptyCharacter(), classes: [{ cls: 'barbarian' as const, level: 3, sub: 'path-of-giants' }], options: ['giants-power-druidcraft'] };
  const ids = autoSpells(c).map(a => a.spell.id);
  expect(ids).toContain('druidcraft');
  expect(ids).not.toContain('thaumaturgy');
});
test('level 3 free riders: giants havoc and fancy footwork', () => {
  expect(feature('giants-havoc')).toMatchObject({ source: { kind: 'subclass', id: 'path-of-giants' }, level: 3, cost: 'free', book: 'bgg', page: 11 });
  expect(feature('fancy-footwork')).toMatchObject({ source: { kind: 'subclass', id: 'swashbuckler' }, level: 3, cost: 'free', book: 'xge', page: 47 });
});
test('swarmkeeper mage hand only if not already known', () =>
  expect(sub('swarmkeeper').bonusSpells!.grants.find(g => g.spell === 'mage-hand')!.uses).toMatch(/already know/i));

const T5 = ['path-of-the-ancestral-guardian', 'path-of-the-storm-herald', 'path-of-the-zealot', 'college-of-whispers', 'forge-domain', 'grave-domain', 'circle-of-dreams', 'circle-of-the-shepherd'];
test('xanathar subclasses (task 5)', () => { for (const id of T5) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('every new feature and option names its book', () => {
  const ids = new Set(T5);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  for (const f of DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id))))
    expect(f.book, f.id).toBe('xge');
});
test('grave domain spells', () => expect(sub('grave-domain').bonusSpells).toMatchObject({ kind: 'domain' }));
test('task 5 must-have features', () => {
  for (const id of ['ancestral-protectors', 'spirit-shield', 'consult-the-spirits', 'vengeful-ancestors', 'divine-fury', 'zealous-presence',
    'psychic-blades', 'words-of-terror', 'mantle-of-whispers', 'shadow-lore', 'blessing-of-the-forge', 'artisans-blessing', 'forge-domain-divine-strike',
    'circle-of-mortality', 'path-to-the-grave', 'sentinel-at-deaths-door', 'balm-of-the-summer-court', 'hidden-paths', 'walker-in-dreams',
    'spirit-totem', 'faithful-summons'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('storm herald picks one storm aura environment', () => {
  expect(sub('path-of-the-storm-herald').options).toEqual(['storm-aura']);
  const g = DATA.optionGroups.find(x => x.id === 'storm-aura')!;
  expect(g.owner).toEqual({ kind: 'subclass', id: 'path-of-the-storm-herald' });
  expect([g.picks[1], g.picks[2], g.picks[19]]).toEqual([0, 1, 1]);
  for (const e of ['desert', 'sea', 'tundra']) expect(feature(`storm-aura-${e}`), e).toMatchObject({ level: 3, book: 'xge', page: 10 });
});
test('storm herald raging storm: desert and sea are level 14 reactions gated by the chosen environment', () => {
  for (const e of ['desert', 'sea']) {
    expect(feature(`raging-storm-${e}`), e).toMatchObject({
      source: { kind: 'subclass', id: 'path-of-the-storm-herald' }, level: 14, cost: 'reaction', book: 'xge', page: 11,
      prereq: { option: `storm-aura-${e}` },
    });
    expect(feature(`raging-storm-${e}`).trigger, e).toBeTruthy();
    // the bonus-action aura card no longer carries the reaction
    expect(feature(`storm-aura-${e}`).description.join(' '), e).not.toMatch(/Raging Storm|reaction/);
  }
  // tundra's raging storm rides on the aura itself, not a reaction
  expect(DATA.features.find(f => f.id === 'raging-storm-tundra')).toBeUndefined();
  expect(feature('storm-aura-tundra').description.join(' ')).toMatch(/Raging Storm/);
});
test('class browse: a level 14 storm herald lists both raging storm reactions (no environment chosen)', () => {
  const ids = (level: number) => actionSections('barbarian', level, 'path-of-the-storm-herald').find(s => s.id === 'subclass')?.items.map(i => i.id) ?? [];
  expect(ids(14)).toEqual(expect.arrayContaining(['raging-storm-desert', 'raging-storm-sea']));
  expect(ids(13)).not.toContain('raging-storm-desert');
});
test('forge and grave domain spells', () => {
  expect(sub('forge-domain').bonusSpells!.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['identify', 'searing-smite']);
  expect(sub('grave-domain').bonusSpells!.grants.filter(g => g.atLevel === 9).map(g => g.spell).sort()).toEqual(['antilife-shell', 'raise-dead']);
  expect(feature('circle-of-mortality').spells).toEqual([expect.objectContaining({ spell: 'spare-the-dying', atLevel: 1 })]);
});

const T6 = ['cavalier', 'samurai', 'way-of-the-kensei', 'way-of-the-sun-soul', 'oath-of-conquest', 'oath-of-redemption', 'horizon-walker', 'monster-slayer'];
test('xanathar subclasses (task 6)', () => { for (const id of T6) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('every task 6 feature names its book', () => {
  const ids = new Set(T6);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.length).toBeGreaterThan(0);
  for (const f of fs) expect(f.book, f.id).toBe('xge');
});
test('task 6 must-have features', () => {
  for (const id of ['unwavering-mark', 'warding-maneuver', 'hold-the-line', 'ferocious-charger', 'vigilant-defender',
    'fighting-spirit', 'tireless-spirit', 'rapid-strike', 'strength-before-death',
    'agile-parry', 'kenseis-shot', 'deft-strike', 'sharpen-the-blade', 'unerring-accuracy',
    'radiant-sun-bolt', 'searing-arc-strike', 'searing-sunburst', 'sun-shield',
    'conquering-presence', 'oath-of-conquest-guided-strike', 'aura-of-conquest', 'scornful-rebuke', 'invincible-conqueror',
    'emissary-of-peace', 'rebuke-the-violent', 'aura-of-the-guardian', 'protective-spirit', 'emissary-of-redemption',
    'detect-portal', 'planar-warrior', 'ethereal-step', 'distant-strike', 'spectral-defense',
    'hunters-sense', 'slayers-prey', 'supernatural-defense', 'magic-users-nemesis', 'slayers-counter'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('task 6 usable reactions are reaction cards', () => {
  for (const id of ['warding-maneuver', 'hold-the-line', 'vigilant-defender', 'strength-before-death', 'sun-shield', 'rebuke-the-violent',
    'aura-of-the-guardian', 'spectral-defense', 'magic-users-nemesis', 'slayers-counter'])
    expect(feature(id).cost, id).toBe('reaction');
});
test('conquest guided strike is prefixed; war domain keeps its id', () => {
  expect(feature('guided-strike').source).toEqual({ kind: 'subclass', id: 'war-domain' });
  expect(feature('oath-of-conquest-guided-strike')).toMatchObject({ name: 'Guided Strike', source: { kind: 'subclass', id: 'oath-of-conquest' }, resource: '1 Channel Divinity', page: 38 });
});
test('conquest and redemption oath spells', () => {
  expect(sub('oath-of-conquest').bonusSpells).toMatchObject({ kind: 'oath' });
  expect(sub('oath-of-conquest').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['armor-of-agathys', 'command']);
  expect(sub('oath-of-redemption').bonusSpells).toMatchObject({ kind: 'oath' });
  expect(sub('oath-of-redemption').bonusSpells!.grants.filter(g => g.atLevel === 13).map(g => g.spell).sort()).toEqual(['otilukes-resilient-sphere', 'stoneskin']);
  for (const id of ['oath-of-conquest', 'oath-of-redemption'])
    expect(sub(id).bonusSpells!.grants.map(g => g.atLevel).sort((a, b) => a - b), id).toEqual([3, 3, 5, 5, 9, 9, 13, 13, 17, 17]);
});
test('horizon walker and monster slayer magic', () => {
  expect(sub('horizon-walker').bonusSpells).toMatchObject({ kind: 'subclass' });
  expect(sub('horizon-walker').bonusSpells!.grants.map(g => g.spell)).toEqual(['protection-from-evil-and-good', 'misty-step', 'haste', 'banishment', 'teleportation-circle']);
  expect(sub('monster-slayer').bonusSpells).toMatchObject({ kind: 'subclass' });
  expect(sub('monster-slayer').bonusSpells!.grants.map(g => g.spell)).toEqual(['protection-from-evil-and-good', 'zone-of-truth', 'magic-circle', 'banishment', 'hold-monster']);
});
test('sun soul: burning hands costs ki; sunburst is its own card', () => {
  expect(feature('searing-arc-strike').spells).toEqual([expect.objectContaining({ spell: 'burning-hands', atLevel: 6 })]);
  expect(feature('searing-arc-strike').spells![0].uses).toMatch(/2 ki points/i);
  expect(feature('searing-sunburst')).toMatchObject({ cost: 'action', level: 11, page: 35 });
  expect(feature('ethereal-step').spells).toEqual([expect.objectContaining({ spell: 'etherealness', atLevel: 7 })]);
});
test('kensei weapons are described, not an option group', () => {
  expect(sub('way-of-the-kensei').options).toEqual([]);
  expect(feature('kenseis-shot')).toMatchObject({ cost: 'bonus', level: 3, page: 34 });
});

const T7 = ['inquisitive', 'mastermind', 'scout', 'divine-soul', 'the-celestial', 'war-magic'];
test('xanathar subclasses (task 7)', () => { for (const id of T7) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('every task 7 feature and option names its book', () => {
  const ids = new Set(T7);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.filter(f => f.source.kind === 'option').length).toBe(5); // the five Divine Magic affinities
  for (const f of fs) expect(f.book, f.id).toBe('xge');
});
test('task 7 must-have features', () => {
  for (const id of ['eye-for-detail', 'insightful-fighting', 'unerring-eye', 'eye-for-weakness',
    'master-of-tactics', 'insightful-manipulator', 'misdirection',
    'skirmisher', 'ambush-master', 'sudden-strike',
    'favored-by-the-gods', 'empowered-healing', 'otherworldly-wings', 'unearthly-recovery',
    'the-celestial-bonus-cantrips', 'healing-light', 'radiant-soul', 'celestial-resilience', 'searing-vengeance',
    'arcane-deflection', 'power-surge', 'deflecting-shroud'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('task 7 usable reactions are reaction cards', () => {
  for (const id of ['misdirection', 'skirmisher', 'arcane-deflection']) {
    expect(feature(id).cost, id).toBe('reaction');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('task 7 riders are free cards with a trigger', () => {
  for (const id of ['eye-for-weakness', 'ambush-master', 'favored-by-the-gods', 'empowered-healing', 'radiant-soul', 'celestial-resilience', 'searing-vengeance', 'power-surge', 'deflecting-shroud']) {
    expect(feature(id).cost, id).toBe('free');
    expect(feature(id).trigger, id).toBeTruthy();
  }
  expect(feature('favored-by-the-gods')).toMatchObject({ source: { kind: 'subclass', id: 'divine-soul' }, level: 1, page: 50 });
});
test('divine soul affinity picks one bonus spell', () => {
  expect(sub('divine-soul').options).toEqual(['divine-magic-affinity']);
  const g = DATA.optionGroups.find(x => x.id === 'divine-magic-affinity')!;
  expect(g.owner).toEqual({ kind: 'subclass', id: 'divine-soul' });
  expect(g.picks).toEqual(Array(20).fill(1));
  const b = sub('divine-soul').bonusSpells!;
  expect(b.kind).toBe('subclass');
  const pairs: [string, string][] = [['good', 'cure-wounds'], ['evil', 'inflict-wounds'], ['law', 'bless'], ['chaos', 'bane'], ['neutrality', 'protection-from-evil-and-good']];
  expect(b.grants).toHaveLength(5);
  for (const [a, spell] of pairs) {
    expect(b.grants).toContainEqual({ spell, atLevel: 1, option: `divine-magic-affinity-${a}` });
    expect(feature(`divine-magic-affinity-${a}`)).toMatchObject({ cost: 'passive', book: 'xge', page: 50, level: 1 });
  }
});
test('divine soul widens to the cleric list', () => {
  expect(sub('divine-soul').extraLists).toEqual(['cleric']);
  const lvl1 = spellSections('sorcerer', 1, 'divine-soul').find(s => s.id === 'lvl-1')!;
  expect(lvl1.items.map(s => s.id)).toContain('cure-wounds');
  expect(lvl1.tags!['bless']).toBeDefined();               // 'Cleric list' or the affinity tag
  expect(lvl1.items.map(s => s.id)).toContain('guiding-bolt');
  expect(lvl1.tags!['guiding-bolt']).toBe('Cleric list');  // cleric only, not an affinity spell
  expect(spellSections('sorcerer', 1).find(s => s.id === 'lvl-1')!.items.map(s => s.id)).not.toContain('cure-wounds');
  expect(spellSections('sorcerer', 1).find(s => s.id === 'lvl-1')!.items.map(s => s.id)).not.toContain('guiding-bolt');
});
test('ambush master: initiative advantage every time, the exposed target in the first round', () => {
  expect(feature('ambush-master').uses).toBeUndefined();
  expect(feature('ambush-master').trigger).toMatch(/initiative/i);
  expect(feature('ambush-master').trigger).toMatch(/first round/i);
});
test('celestial resilience is a rest card', () => {
  expect(feature('celestial-resilience')).toMatchObject({ source: { kind: 'subclass', id: 'the-celestial' }, level: 10, cost: 'free', page: 55, book: 'xge' });
  expect(feature('celestial-resilience').trigger).toMatch(/rest/i);
  expect(DATA.features.find(f => f.id === 'bonus-cantrips')).toBeUndefined();
});
test('celestial patron spells and bonus cantrips', () => {
  const b = sub('the-celestial').bonusSpells!;
  expect(b.kind).toBe('patron');
  expect(b.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['cure-wounds', 'guiding-bolt']);
  expect(b.grants.filter(g => g.atLevel === 9).map(g => g.spell).sort()).toEqual(['flame-strike', 'greater-restoration']);
  expect(b.grants.map(g => g.atLevel).sort((x, y) => x - y)).toEqual([1, 1, 3, 3, 5, 5, 7, 7, 9, 9]);
  expect(feature('the-celestial-bonus-cantrips')).toMatchObject({ source: { kind: 'subclass', id: 'the-celestial' }, level: 1, page: 54 });
  expect(feature('the-celestial-bonus-cantrips').spells).toEqual([{ spell: 'light', atLevel: 1 }, { spell: 'sacred-flame', atLevel: 1 }]);
  const c = { ...emptyCharacter(), classes: [{ cls: 'warlock' as const, level: 1, sub: 'the-celestial' }] };
  const ids = autoSpells(c).map(a => a.spell.id);
  expect(ids).toEqual(expect.arrayContaining(['light', 'sacred-flame']));
  expect(ids).not.toContain('cure-wounds');
});
test('healing light pool is 1 + warlock level', () => {
  const pool = feature('healing-light').scaling!.find(s => /pool/i.test(s.label))!;
  expect([pool.values[0], pool.values[19]]).toEqual(['2', '21']);
  expect(feature('healing-light')).toMatchObject({ cost: 'bonus', level: 1, page: 54 });
});

// Plan 7 (batch 3), Task 7: Tasha's subclasses, barbarian to druid
const TCE7 = ['path-of-the-beast', 'college-of-creation', 'college-of-eloquence', 'order-domain', 'peace-domain', 'twilight-domain', 'circle-of-wildfire'];
test('tasha subclasses (task 7)', () => { for (const id of TCE7) expect(sub(id), id).toMatchObject({ book: 'tce' }); });
test('every tasha task 7 feature and option names its book', () => {
  const ids = new Set(TCE7);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.length).toBeGreaterThan(0);
  for (const f of fs) expect(f.book, f.id).toBe('tce');
  for (const id of TCE7) expect(sub(id).options, id).toEqual([]);
});
test('twilight domain spells', () => expect(sub('twilight-domain').bonusSpells).toMatchObject({ kind: 'domain' }));
test('tasha task 7 domain and circle spell tables', () => {
  const at = (id: string, lvl: number) => sub(id).bonusSpells!.grants.filter(g => g.atLevel === lvl).map(g => g.spell).sort();
  expect(sub('order-domain').bonusSpells!.kind).toBe('domain');
  expect(sub('peace-domain').bonusSpells!.kind).toBe('domain');
  expect(sub('circle-of-wildfire').bonusSpells!.kind).toBe('circle');
  expect(at('order-domain', 1)).toEqual(['command', 'heroism']);
  expect(at('order-domain', 5)).toEqual(['mass-healing-word', 'slow']);
  expect(at('order-domain', 9)).toEqual(['commune', 'dominate-person']);
  expect(at('peace-domain', 7)).toEqual(['aura-of-purity', 'otilukes-resilient-sphere']);
  expect(at('peace-domain', 9)).toEqual(['greater-restoration', 'rarys-telepathic-bond']);
  expect(at('twilight-domain', 5)).toEqual(['aura-of-vitality', 'leomunds-tiny-hut']);
  expect(at('twilight-domain', 9)).toEqual(['circle-of-power', 'mislead']);
  expect(at('circle-of-wildfire', 2)).toEqual(['burning-hands', 'cure-wounds']);
  expect(at('circle-of-wildfire', 3)).toEqual(['flaming-sphere', 'scorching-ray']);
  expect(at('circle-of-wildfire', 9)).toEqual(['flame-strike', 'mass-cure-wounds']);
  expect(sub('circle-of-wildfire').bonusSpells!.grants.map(g => g.atLevel).sort((a, b) => a - b)).toEqual([2, 2, 3, 3, 5, 5, 7, 7, 9, 9]);
});
test('tasha task 7 must-have features', () => {
  for (const id of ['form-of-the-beast', 'form-of-the-beast-tail', 'bestial-soul', 'infectious-fury', 'call-the-hunt',
    'mote-of-potential', 'performance-of-creation', 'animating-performance',
    'unsettling-words', 'universal-speech', 'infectious-inspiration',
    'voice-of-authority', 'orders-demand', 'embodiment-of-the-law', 'order-domain-divine-strike', 'orders-wrath',
    'emboldening-bond', 'balm-of-peace', 'protective-bond',
    'eyes-of-night', 'vigilant-blessing', 'twilight-sanctuary', 'steps-of-night', 'twilight-domain-divine-strike',
    'summon-wildfire-spirit', 'enhanced-bond', 'cauterizing-flames', 'blazing-revival'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('tasha task 7 reactions are reaction cards with a trigger', () => {
  for (const id of ['form-of-the-beast-tail', 'infectious-inspiration', 'protective-bond', 'cauterizing-flames']) {
    expect(feature(id).cost, id).toBe('reaction');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('tasha task 7 channel divinity options cost a Channel Divinity', () => {
  for (const id of ['orders-demand', 'balm-of-peace', 'twilight-sanctuary'])
    expect(feature(id), id).toMatchObject({ cost: 'action', resource: '1 Channel Divinity', level: 2 });
});
test('order and twilight divine strike: prefixed ids, hidden by blessed strikes', () => {
  expect(feature('order-domain-divine-strike')).toMatchObject({ name: 'Divine Strike', level: 8, cost: 'free', page: 32, source: { kind: 'subclass', id: 'order-domain' } });
  expect(feature('twilight-domain-divine-strike')).toMatchObject({ name: 'Divine Strike', level: 8, cost: 'free', page: 35, source: { kind: 'subclass', id: 'twilight-domain' } });
  const bs = feature('optional-cleric-blessed-strikes').replaces!;
  expect(bs).toContain('order-domain-divine-strike');
  expect(bs).toContain('twilight-domain-divine-strike');
});
test('tasha summons cite their stat block page', () => {
  expect(feature('animating-performance')).toMatchObject({ cost: 'action', level: 6, page: 29 });
  expect(feature('animating-performance').description.join(' ')).toContain("Stat block: Tasha's p. 29");
  expect(feature('summon-wildfire-spirit')).toMatchObject({ cost: 'action', level: 2, page: 40, resource: '1 Wild Shape use' });
  expect(feature('summon-wildfire-spirit').description.join(' ')).toContain("Stat block: Tasha's p. 40");
});
test('blazing revival is a free once-per-long-rest trigger', () => {
  expect(feature('blazing-revival')).toMatchObject({ cost: 'free', uses: 'Once per long rest', level: 14, page: 40 });
  expect(feature('blazing-revival').trigger).toMatch(/0 hit points/i);
});
test('tasha task 7 riders are free cards with a trigger', () => {
  for (const id of ['form-of-the-beast', 'infectious-fury', 'call-the-hunt', 'mote-of-potential', 'voice-of-authority',
    'embodiment-of-the-law', 'orders-wrath', 'enhanced-bond']) {
    expect(feature(id).cost, id).toBe('free');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});

// Plan 7 (batch 3), Task 8: Tasha's subclasses, fighter to ranger
const TCE8 = ['psi-warrior', 'rune-knight', 'way-of-mercy', 'way-of-the-astral-self', 'oath-of-glory', 'oath-of-the-watchers', 'fey-wanderer'];
test('tasha subclasses (task 8)', () => { for (const id of TCE8) expect(sub(id), id).toMatchObject({ book: 'tce' }); });
test('every tasha task 8 feature and option names its book', () => {
  const ids = new Set(TCE8);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  expect([...groups]).toEqual(['runes']);
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.length).toBeGreaterThan(0);
  for (const f of fs) expect(f.book, f.id).toBe('tce');
  for (const id of TCE8) expect(sub(id).options, id).toEqual(id === 'rune-knight' ? ['runes'] : []);
});
test('tasha task 8 oath and fey wanderer spell tables', () => {
  const at = (id: string, lvl: number) => sub(id).bonusSpells!.grants.filter(g => g.atLevel === lvl).map(g => g.spell).sort();
  const levels = (id: string) => sub(id).bonusSpells!.grants.map(g => g.atLevel).sort((a, b) => a - b);
  expect(sub('oath-of-glory').bonusSpells!.kind).toBe('oath');
  expect(sub('oath-of-the-watchers').bonusSpells!.kind).toBe('oath');
  expect(sub('fey-wanderer').bonusSpells!.kind).toBe('subclass');
  expect(at('oath-of-glory', 3)).toEqual(['guiding-bolt', 'heroism']);
  expect(at('oath-of-glory', 5)).toEqual(['enhance-ability', 'magic-weapon']);
  expect(at('oath-of-glory', 9)).toEqual(['haste', 'protection-from-energy']);
  expect(at('oath-of-glory', 13)).toEqual(['compulsion', 'freedom-of-movement']);
  expect(at('oath-of-glory', 17)).toEqual(['commune', 'flame-strike']);
  expect(at('oath-of-the-watchers', 3)).toEqual(['alarm', 'detect-magic']);
  expect(at('oath-of-the-watchers', 5)).toEqual(['moonbeam', 'see-invisibility']);
  expect(at('oath-of-the-watchers', 9)).toEqual(['counterspell', 'nondetection']);
  expect(at('oath-of-the-watchers', 13)).toEqual(['aura-of-purity', 'banishment']);
  expect(at('oath-of-the-watchers', 17)).toEqual(['hold-monster', 'scrying']);
  expect(levels('oath-of-glory')).toEqual([3, 3, 5, 5, 9, 9, 13, 13, 17, 17]);
  expect(levels('oath-of-the-watchers')).toEqual([3, 3, 5, 5, 9, 9, 13, 13, 17, 17]);
  expect(sub('fey-wanderer').bonusSpells!.grants.map(g => [g.atLevel, g.spell]))
    .toEqual([[3, 'charm-person'], [5, 'misty-step'], [9, 'dispel-magic'], [13, 'dimension-door'], [17, 'mislead']]);
});
test('tasha task 8 must-have features', () => {
  for (const id of ['psi-warrior-psionic-power', 'psi-warrior-psionic-regain', 'protective-field', 'psionic-strike', 'telekinetic-movement',
    'psi-powered-leap', 'guarded-mind', 'bulwark-of-force', 'telekinetic-master', 'telekinetic-master-attack',
    'rune-carver', 'giants-might', 'runic-shield',
    'hand-of-healing', 'hand-of-harm', 'hand-of-ultimate-mercy',
    'arms-of-the-astral-self', 'visage-of-the-astral-self', 'body-of-the-astral-self', 'body-of-the-astral-self-deflect-energy', 'awakened-astral-self',
    'peerless-athlete', 'inspiring-smite', 'glorious-defense', 'living-legend',
    'watchers-will', 'abjure-the-extraplanar', 'vigilant-rebuke', 'mortal-bulwark',
    'dreadful-strikes', 'beguiling-twist', 'fey-reinforcements', 'misty-wanderer'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('psionic energy dice: a pool card with count and die size, and every power names the resource', () => {
  const pool = feature('psi-warrior-psionic-power');
  expect(pool).toMatchObject({ level: 3, page: 43, source: { kind: 'subclass', id: 'psi-warrior' } });
  const die = pool.scaling!.find(s => s.label === 'Die size')!.values;
  expect([die[2], die[3], die[4], die[9], die[10], die[15], die[16], die[19]]).toEqual(['d6', 'd6', 'd8', 'd8', 'd10', 'd10', 'd12', 'd12']);
  const count = pool.scaling!.find(s => s.label === 'Psionic Energy dice')!.values;
  expect([count[2], count[4], count[8], count[12], count[16]]).toEqual(['4', '6', '8', '10', '12']);
  for (const id of ['protective-field', 'psionic-strike', 'telekinetic-movement', 'psi-powered-leap', 'guarded-mind', 'bulwark-of-force', 'telekinetic-master'])
    expect(feature(id).resource, id).toMatch(/^1 Psionic Energy die/);
  expect(feature('psi-warrior-psionic-regain')).toMatchObject({ cost: 'bonus', uses: 'Once per short or long rest' });
  expect(feature('protective-field')).toMatchObject({ cost: 'reaction', level: 3 });
  expect(feature('telekinetic-master').spells).toEqual([expect.objectContaining({ spell: 'telekinesis', atLevel: 18 })]);
});
test('runes slot: 2 picks at fighter 3, hill rune only from 7', () => {
  const runes = DATA.optionGroups.find(g => g.id === 'runes')!;
  expect(runes.owner).toEqual({ kind: 'subclass', id: 'rune-knight' });
  expect(runes.picks).toEqual([0, 0, 2, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5]);
  const rk = (level: number) => ({ ...emptyCharacter(), classes: [{ cls: 'fighter', level, sub: 'rune-knight' }] }) as Character;
  const at3 = optionSlots(rk(3)).find(s => s.group.id === 'runes')!;
  expect(at3.count).toBe(2);
  expect(at3.choices.map(f => f.id).sort()).toEqual(['runes-cloud-rune', 'runes-fire-rune', 'runes-frost-rune', 'runes-stone-rune']);
  const at7 = optionSlots(rk(7)).find(s => s.group.id === 'runes')!;
  expect(at7.count).toBe(3);
  expect(at7.choices.map(f => f.id)).toEqual(expect.arrayContaining(['runes-hill-rune', 'runes-storm-rune']));
  for (const id of ['runes-hill-rune', 'runes-storm-rune']) expect(feature(id).prereq, id).toEqual({ level: 7 });
});
test('rune invoke costs', () => {
  const cost = (id: string) => feature(`runes-${id}-rune`).cost;
  expect([cost('cloud'), cost('fire'), cost('frost'), cost('stone'), cost('hill'), cost('storm')])
    .toEqual(['reaction', 'free', 'bonus', 'reaction', 'bonus', 'bonus']);
  for (const id of ['cloud', 'fire', 'frost', 'stone', 'hill', 'storm'])
    expect(feature(`runes-${id}-rune`).uses, id).toMatch(/short or long rest/);
});
test('tasha task 8 reactions are reaction cards with a trigger', () => {
  for (const id of ['protective-field', 'runic-shield', 'runes-cloud-rune', 'runes-stone-rune', 'body-of-the-astral-self-deflect-energy',
    'glorious-defense', 'vigilant-rebuke', 'beguiling-twist']) {
    expect(feature(id).cost, id).toBe('reaction');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('vigilant rebuke prints no use limit', () => {
  expect(feature('vigilant-rebuke')).toMatchObject({ cost: 'reaction', level: 15, page: 55 });
  expect(feature('vigilant-rebuke').uses).toBeUndefined();
});
test('tasha task 8 channel divinity options cost a Channel Divinity', () => {
  for (const [id, cost] of [['peerless-athlete', 'bonus'], ['inspiring-smite', 'bonus'], ['watchers-will', 'action'], ['abjure-the-extraplanar', 'action']])
    expect(feature(id), id).toMatchObject({ cost, resource: '1 Channel Divinity', level: 3 });
});
test('fey wanderer feature spells are fixed grants with uses', () => {
  expect(feature('fey-reinforcements')).toMatchObject({ level: 11, page: 59 });
  expect(feature('fey-reinforcements').spells).toEqual([expect.objectContaining({ spell: 'summon-fey', atLevel: 11, uses: expect.any(String) })]);
  expect(feature('misty-wanderer')).toMatchObject({ level: 15, page: 59 });
  expect(feature('misty-wanderer').spells).toEqual([expect.objectContaining({ spell: 'misty-step', atLevel: 15, uses: expect.any(String) })]);
});
test('tasha task 8 riders are free cards with a trigger', () => {
  for (const id of ['psionic-strike', 'guarded-mind', 'runes-fire-rune', 'hand-of-harm', 'body-of-the-astral-self', 'dreadful-strikes']) {
    expect(feature(id).cost, id).toBe('free');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('scaling dice: giants might and dreadful strikes', () => {
  const v = (id: string, label: string) => feature(id).scaling!.find(s => s.label === label)!.values;
  const gm = v('giants-might', 'Extra damage');
  expect([gm[2], gm[8], gm[9], gm[16], gm[17]]).toEqual(['1d6', '1d6', '1d8', '1d8', '1d10']);
  const ds = v('dreadful-strikes', 'Psychic damage');
  expect([ds[1], ds[2], ds[9], ds[10]]).toEqual(['', '1d4', '1d4', '1d6']);
});

// Plan 7 (batch 3), Task 9: Tasha's subclasses, rogue to wizard
const TCE9 = ['phantom', 'soulknife', 'aberrant-mind', 'clockwork-soul', 'the-fathomless', 'the-genie', 'order-of-scribes'];
test('tasha subclasses (task 9)', () => { for (const id of TCE9) expect(sub(id), id).toMatchObject({ book: 'tce' }); });
test('every tasha task 9 feature and option names its book', () => {
  const ids = new Set(TCE9);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  expect([...groups]).toEqual(['genie-kind']);
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  expect(fs.length).toBeGreaterThan(0);
  for (const f of fs) expect(f.book, f.id).toBe('tce');
  for (const id of TCE9) expect(sub(id).options, id).toEqual(id === 'the-genie' ? ['genie-kind'] : []);
});
test('tasha task 9 sorcerer spell tables', () => {
  const pairs = (id: string) => sub(id).bonusSpells!.grants.map(g => [g.atLevel, g.spell]);
  expect(sub('aberrant-mind').bonusSpells!.kind).toBe('subclass');
  expect(sub('clockwork-soul').bonusSpells!.kind).toBe('subclass');
  expect(pairs('aberrant-mind')).toEqual([[1, 'arms-of-hadar'], [1, 'dissonant-whispers'], [1, 'mind-sliver'], [3, 'calm-emotions'], [3, 'detect-thoughts'],
    [5, 'hunger-of-hadar'], [5, 'sending'], [7, 'evards-black-tentacles'], [7, 'summon-aberration'], [9, 'rarys-telepathic-bond'], [9, 'telekinesis']]);
  expect(pairs('clockwork-soul')).toEqual([[1, 'alarm'], [1, 'protection-from-evil-and-good'], [3, 'aid'], [3, 'lesser-restoration'],
    [5, 'dispel-magic'], [5, 'protection-from-energy'], [7, 'freedom-of-movement'], [7, 'summon-construct'], [9, 'greater-restoration'], [9, 'wall-of-force']]);
});
test('tasha task 9 patron spell tables', () => {
  const pairs = (id: string, option?: string) => sub(id).bonusSpells!.grants.filter(g => g.option === option).map(g => [g.atLevel, g.spell]);
  expect(sub('the-fathomless').bonusSpells!.kind).toBe('patron');
  expect(sub('the-genie').bonusSpells!.kind).toBe('patron');
  expect(pairs('the-fathomless')).toEqual([[1, 'create-or-destroy-water'], [1, 'thunderwave'], [3, 'gust-of-wind'], [3, 'silence'],
    [5, 'lightning-bolt'], [5, 'sleet-storm'], [7, 'control-water'], [7, 'summon-elemental'], [9, 'bigbys-hand'], [9, 'cone-of-cold']]);
  expect(pairs('the-genie')).toEqual([[1, 'detect-evil-and-good'], [3, 'phantasmal-force'], [5, 'create-food-and-water'], [7, 'phantasmal-killer'], [9, 'creation'], [17, 'wish']]);
  const kind = (k: string) => pairs('the-genie', `genie-kind-${k}`).map(p => p[1]);
  expect(kind('dao')).toEqual(['sanctuary', 'spike-growth', 'meld-into-stone', 'stone-shape', 'wall-of-stone']);
  expect(kind('djinni')).toEqual(['thunderwave', 'gust-of-wind', 'wind-wall', 'greater-invisibility', 'seeming']);
  expect(kind('efreeti')).toEqual(['burning-hands', 'scorching-ray', 'fireball', 'fire-shield', 'flame-strike']);
  expect(kind('marid')).toEqual(['fog-cloud', 'blur', 'sleet-storm', 'control-water', 'cone-of-cold']);
  for (const k of ['dao', 'djinni', 'efreeti', 'marid'])
    expect(pairs('the-genie', `genie-kind-${k}`).map(p => p[0]), k).toEqual([1, 3, 5, 7, 9]);
  expect(sub('the-genie').bonusSpells!.grants).toHaveLength(26);
});
test('genie kind: one pick from warlock 1, four kinds', () => {
  const g = DATA.optionGroups.find(x => x.id === 'genie-kind')!;
  expect(g.owner).toEqual({ kind: 'subclass', id: 'the-genie' });
  expect(g.picks).toEqual(Array(20).fill(1));
  const opts = DATA.features.filter(f => f.source.kind === 'option' && f.source.id === 'genie-kind');
  expect(opts.map(f => [f.id, f.name])).toEqual([['genie-kind-dao', 'Dao'], ['genie-kind-djinni', 'Djinni'], ['genie-kind-efreeti', 'Efreeti'], ['genie-kind-marid', 'Marid']]);
  for (const f of opts) expect(f, f.id).toMatchObject({ level: 1, page: 73, cost: 'passive' });
});
test('genie spells follow the kind', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 5, sub: 'the-genie' }], options: ['genie-kind-dao'] } as Character;
  const ids = pickableSpells(ch.classes[0], false, ch.options).map(p => p.spell.id);
  expect(ids).toContain('spike-growth');
  expect(ids).toContain('phantasmal-force');
  expect(ids).not.toContain('scorching-ray');
  expect(pickableSpells(ch.classes[0], false, ch.options).find(p => p.spell.id === 'spike-growth')!.tag).toBe('Patron');
  // no kind chosen yet: only the shared genie spells
  const none = pickableSpells(ch.classes[0]).map(p => p.spell.id);
  expect(none).toContain('phantasmal-force');
  expect(none).not.toContain('spike-growth');
});
test('genie: the all view lists the chosen kind only; browse lists every kind, tagged', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 5, sub: 'the-genie' }], options: ['genie-kind-dao'] } as Character;
  const ids = charSpellSections(ch, 'all').flatMap(s => s.items.map(i => i.id));
  expect(ids).toContain('spike-growth');
  expect(ids).toContain('phantasmal-force');
  expect(ids).not.toContain('scorching-ray');
  const browse = spellSections('warlock', 5, 'the-genie');
  const lvl2 = browse.find(s => s.id === 'lvl-2')!;
  expect(lvl2.tags!['scorching-ray']).toBe('Patron · Efreeti');
  expect(lvl2.tags!['spike-growth']).toBe('Patron · Dao');
  expect(lvl2.tags!['phantasmal-force']).toBe('Patron');
});
test('tasha task 9 must-have features', () => {
  for (const id of ['whispers-of-the-dead', 'wails-from-the-grave', 'tokens-of-the-departed', 'tokens-of-the-departed-question', 'ghost-walk',
    'soulknife-psionic-power', 'soulknife-psionic-regain', 'psi-bolstered-knack', 'psychic-whispers', 'soulknife-psychic-blades', 'soulknife-psychic-blades-bonus',
    'homing-strikes', 'psychic-teleportation', 'psychic-veil', 'rend-mind',
    'telepathic-speech', 'psionic-sorcery', 'revelation-in-flesh', 'warping-implosion',
    'restore-balance', 'bastion-of-law', 'trance-of-order', 'clockwork-cavalcade',
    'tentacle-of-the-deeps', 'tentacle-of-the-deeps-move', 'guardian-coil', 'grasping-tentacles', 'fathomless-plunge',
    'genies-wrath', 'bottled-respite', 'bottled-respite-leave', 'elemental-gift', 'limited-wish',
    'wizardly-quill', 'awakened-spellbook', 'awakened-spellbook-ritual', 'manifest-mind', 'manifest-mind-move', 'manifest-mind-cast', 'master-scrivener', 'one-with-the-word'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
test('soulknife psionic energy dice: same pool shape as psi warrior', () => {
  const pool = feature('soulknife-psionic-power');
  expect(pool).toMatchObject({ level: 3, page: 64, source: { kind: 'subclass', id: 'soulknife' } });
  expect(pool.scaling).toEqual(feature('psi-warrior-psionic-power').scaling);
  for (const id of ['psi-bolstered-knack', 'psychic-whispers', 'homing-strikes', 'psychic-teleportation', 'psychic-veil'])
    expect(feature(id).resource, id).toMatch(/^1 Psionic Energy die/);
  expect(feature('rend-mind').resource).toMatch(/^3 Psionic Energy dice/);
  expect(feature('soulknife-psionic-regain')).toMatchObject({ cost: 'bonus', uses: 'Once per short or long rest' });
  expect(feature('psychic-teleportation')).toMatchObject({ cost: 'bonus', level: 9, page: 65 });
  expect(feature('soulknife-psychic-blades-bonus')).toMatchObject({ cost: 'bonus', level: 3 });
});
test('tasha task 9 costs, uses and pages', () => {
  const m = (id: string, x: object) => expect(feature(id), id).toMatchObject(x);
  m('wails-from-the-grave', { cost: 'free', level: 3, page: 62, uses: 'Proficiency bonus per long rest' });
  m('ghost-walk', { cost: 'bonus', level: 13, page: 63 });
  m('telepathic-speech', { cost: 'bonus', level: 1, page: 67 });
  m('revelation-in-flesh', { cost: 'bonus', level: 14, page: 68 });
  m('warping-implosion', { cost: 'action', level: 18, page: 68, uses: 'Once per long rest', resource: '5 sorcery points (after the free use)' });
  m('restore-balance', { cost: 'reaction', level: 1, page: 69, uses: 'Proficiency bonus per long rest' });
  m('bastion-of-law', { cost: 'action', level: 6, page: 69 });
  m('trance-of-order', { cost: 'bonus', level: 14, page: 69, uses: 'Once per long rest', resource: '5 sorcery points (after the free use)' });
  m('clockwork-cavalcade', { cost: 'action', level: 18, page: 69, uses: 'Once per long rest', resource: '7 sorcery points (after the free use)' });
  m('tentacle-of-the-deeps', { cost: 'bonus', level: 1, page: 72, uses: 'Proficiency bonus per long rest' });
  m('guardian-coil', { cost: 'reaction', level: 6, page: 73 });
  m('fathomless-plunge', { cost: 'action', level: 14, page: 73, uses: 'Once per short or long rest' });
  m('genies-wrath', { cost: 'free', level: 1, page: 74, uses: 'Once on each of your turns' });
  m('bottled-respite', { cost: 'action', level: 1, page: 74, uses: 'Once per long rest' });
  m('elemental-gift', { cost: 'bonus', level: 6, page: 75, uses: 'Proficiency bonus per long rest' });
  m('limited-wish', { cost: 'action', level: 14, page: 75 });
  m('wizardly-quill', { cost: 'bonus', level: 2, page: 77 });
  m('manifest-mind', { cost: 'bonus', level: 6, page: 78, uses: 'Once per long rest, or spend a spell slot of any level' });
  m('manifest-mind-cast', { cost: 'free', level: 6, page: 78, uses: 'Proficiency bonus per long rest' });
  m('one-with-the-word', { cost: 'reaction', level: 14, page: 78, uses: 'Once per long rest' });
});
test('genies wrath names every kind and its damage type', () => {
  const text = feature('genies-wrath').description.join(' ');
  for (const t of ['Dao', 'bludgeoning', 'Djinni', 'thunder', 'Efreeti', 'fire', 'Marid', 'cold']) expect(text, t).toContain(t);
});
test('grasping tentacles is a fixed grant with uses', () => {
  expect(feature('grasping-tentacles')).toMatchObject({ level: 10, page: 73 });
  expect(feature('grasping-tentacles').spells).toEqual([expect.objectContaining({ spell: 'evards-black-tentacles', atLevel: 10, uses: expect.any(String) })]);
});
test('tasha task 9 reactions are reaction cards with a trigger', () => {
  for (const id of ['tokens-of-the-departed', 'restore-balance', 'guardian-coil', 'one-with-the-word']) {
    expect(feature(id).cost, id).toBe('reaction');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('tasha task 9 riders are free cards with a trigger', () => {
  for (const id of ['whispers-of-the-dead', 'wails-from-the-grave', 'psi-bolstered-knack', 'soulknife-psychic-blades', 'homing-strikes', 'rend-mind',
    'psionic-sorcery', 'genies-wrath', 'awakened-spellbook', 'awakened-spellbook-ritual', 'manifest-mind-cast']) {
    expect(feature(id).cost, id).toBe('free');
    expect(feature(id).trigger, id).toBeTruthy();
  }
});
test('scaling dice: wails, tentacle and guardian coil', () => {
  const v = (id: string, label: string) => feature(id).scaling!.find(s => s.label === label)!.values;
  const w = v('wails-from-the-grave', 'Necrotic damage');
  expect([w[1], w[2], w[3], w[4], w[8], w[12], w[16], w[19]]).toEqual(['', '1d6', '1d6', '2d6', '3d6', '4d6', '5d6', '5d6']);
  const t = v('tentacle-of-the-deeps', 'Cold damage');
  expect([t[0], t[8], t[9], t[19]]).toEqual(['1d8', '1d8', '2d8', '2d8']);
  const g = v('guardian-coil', 'Damage reduced');
  expect([g[4], g[5], g[8], g[9]]).toEqual(['', '1d8', '1d8', '2d8']);
});

// Plan 8 (batch 4), Task 3: Alchemist and Armorer (Tasha's pp. 14-17)
const ART3 = ['alchemist', 'armorer'];
test('alchemist and armorer: artificer subclasses from tasha', () => {
  expect(sub('alchemist')).toMatchObject({ cls: 'artificer', name: 'Alchemist', page: 14, book: 'tce', options: [] });
  expect(sub('armorer')).toMatchObject({ cls: 'artificer', name: 'Armorer', page: 15, book: 'tce', options: ['armor-model'] });
  const ids = new Set(ART3);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  expect([...groups]).toEqual(['armor-model']);
  const fs = DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id)));
  for (const f of fs) expect(f.book, f.id).toBe('tce');
});
test('alchemist and armorer spell tables', () => {
  const pairs = (id: string) => sub(id).bonusSpells!.grants.map(g => [g.atLevel, g.spell]);
  for (const id of ART3) expect(sub(id).bonusSpells!.kind, id).toBe('subclass');
  expect(pairs('alchemist')).toEqual([[3, 'healing-word'], [3, 'ray-of-sickness'], [5, 'flaming-sphere'], [5, 'melfs-acid-arrow'],
    [9, 'gaseous-form'], [9, 'mass-healing-word'], [13, 'blight'], [13, 'death-ward'], [17, 'cloudkill'], [17, 'raise-dead']]);
  expect(pairs('armorer')).toEqual([[3, 'magic-missile'], [3, 'thunderwave'], [5, 'mirror-image'], [5, 'shatter'],
    [9, 'hypnotic-pattern'], [9, 'lightning-bolt'], [13, 'fire-shield'], [13, 'greater-invisibility'], [17, 'passwall'], [17, 'wall-of-force']]);
});
test('alchemist features', () => {
  const m = (id: string, x: object) => expect(feature(id), id).toMatchObject({ source: { kind: 'subclass', id: 'alchemist' }, book: 'tce', ...x });
  m('experimental-elixir', { level: 3, cost: 'action', page: 14 });
  m('alchemical-savant', { level: 5, cost: 'free', page: 15 });
  m('restorative-reagents', { level: 9, cost: 'action', page: 15 });
  m('chemical-mastery', { level: 15, cost: 'action', page: 15 });
  expect(feature('alchemical-savant').trigger).toBeTruthy();
  const free = feature('experimental-elixir').scaling!.find(s => /elixir/i.test(s.label))!.values;
  expect([free[2], free[4], free[5], free[13], free[14], free[19]]).toEqual(['1', '1', '2', '2', '3', '3']);
  const text = feature('experimental-elixir').description.join(' ');
  for (const e of ['Healing', 'Swiftness', 'Resilience', 'Boldness', 'Flight', 'Transformation', '2d4', '10 ft', '+1 AC', 'd4', 'alter self']) expect(text, e).toContain(e);
  expect(feature('restorative-reagents').spells).toEqual([{ spell: 'lesser-restoration', atLevel: 9, uses: 'Intelligence modifier (minimum 1) per long rest, no slot' }]);
  expect(feature('restorative-reagents').description.join(' ')).toContain('2d6');
  expect(feature('chemical-mastery').spells).toEqual([
    { spell: 'greater-restoration', atLevel: 15, uses: 'Once per long rest, no slot' },
    { spell: 'heal', atLevel: 15, uses: 'Once per long rest, no slot' }]);
});
test('armor model: one pick from artificer 3, two passive models', () => {
  const g = DATA.optionGroups.find(x => x.id === 'armor-model')!;
  expect(g).toMatchObject({ name: 'Armor Model', owner: { kind: 'subclass', id: 'armorer' } });
  expect(g.picks).toEqual([0, 0, ...Array(18).fill(1)]);
  const opts = DATA.features.filter(f => f.source.kind === 'option' && f.source.id === 'armor-model');
  expect(opts.map(f => [f.id, f.name])).toEqual([['armor-model-guardian', 'Guardian'], ['armor-model-infiltrator', 'Infiltrator']]);
  for (const f of opts) expect(f, f.id).toMatchObject({ level: 3, page: 16, cost: 'passive', book: 'tce' });
  const ch = { ...emptyCharacter(), classes: [{ cls: 'artificer', level: 3, sub: 'armorer' }] } as Character;
  expect(optionSlots(ch).find(s => s.group.id === 'armor-model')!.count).toBe(1);
});
test('armorer features gated by the model', () => {
  const m = (id: string, x: object) => expect(feature(id), id).toMatchObject({ source: { kind: 'subclass', id: 'armorer' }, book: 'tce', ...x });
  m('arcane-armor', { level: 3, cost: 'action', page: 15 });
  expect(feature('arcane-armor').prereq).toBeUndefined();
  const guardian = { prereq: { option: 'armor-model-guardian' } };
  const infiltrator = { prereq: { option: 'armor-model-infiltrator' } };
  m('thunder-gauntlets', { level: 3, cost: 'action', page: 16, ...guardian });
  m('defensive-field', { level: 3, cost: 'bonus', page: 16, uses: 'Proficiency bonus per long rest', ...guardian });
  m('perfected-armor-guardian', { level: 15, cost: 'reaction', page: 17, uses: 'Proficiency bonus per long rest', ...guardian });
  m('lightning-launcher', { level: 3, cost: 'action', page: 16, ...infiltrator });
  m('perfected-armor-infiltrator', { level: 15, cost: 'free', page: 17, ...infiltrator });
  expect(feature('perfected-armor-guardian').trigger).toBeTruthy();
  expect(feature('perfected-armor-infiltrator').trigger).toBeTruthy();
  const hp = feature('defensive-field').scaling!.find(s => /temporary/i.test(s.label))!.values;
  expect(hp).toEqual(Array.from({ length: 20 }, (_, i) => i < 2 ? '' : String(i + 1)));
  expect(feature('thunder-gauntlets').description.join(' ')).toContain('1d8 thunder');
  expect(feature('lightning-launcher').description.join(' ')).toContain('90/300 ft');
  expect(feature('lightning-launcher').description.join(' ')).toContain('1d6 lightning');
});

// Plan 8 (batch 4), Task 4: Artillerist and Battle Smith (Tasha's pp. 17-20)
test('tasha artificer subclasses', () => {
  for (const id of ['alchemist', 'armorer', 'artillerist', 'battle-smith'])
    expect(sub(id), id).toMatchObject({ cls: 'artificer', book: 'tce', bonusSpells: { kind: 'subclass' } });
  expect(DATA.subclasses).toHaveLength(108);
  expect(sub('artillerist')).toMatchObject({ name: 'Artillerist', page: 17, options: [] });
  expect(sub('battle-smith')).toMatchObject({ name: 'Battle Smith', page: 18, options: [] });
});
test('battle smith 3 grants heroism and shield', () => {
  expect(sub('battle-smith').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['heroism', 'shield']);
});
test('artillerist and battle smith spell tables', () => {
  const pairs = (id: string) => sub(id).bonusSpells!.grants.map(g => [g.atLevel, g.spell]);
  expect(pairs('artillerist')).toEqual([[3, 'shield'], [3, 'thunderwave'], [5, 'scorching-ray'], [5, 'shatter'],
    [9, 'fireball'], [9, 'wind-wall'], [13, 'ice-storm'], [13, 'wall-of-fire'], [17, 'cone-of-cold'], [17, 'wall-of-force']]);
  expect(pairs('battle-smith')).toEqual([[3, 'heroism'], [3, 'shield'], [5, 'branding-smite'], [5, 'warding-bond'],
    [9, 'aura-of-vitality'], [9, 'conjure-barrage'], [13, 'aura-of-purity'], [13, 'fire-shield'], [17, 'banishing-smite'], [17, 'mass-cure-wounds']]);
});
test('artillerist features', () => {
  const m = (id: string, x: object) => expect(feature(id), id).toMatchObject({ source: { kind: 'subclass', id: 'artillerist' }, book: 'tce', textSource: 'summary', ...x });
  m('eldritch-cannon', { level: 3, cost: 'action', page: 17 });
  m('eldritch-cannon-activate', { level: 3, cost: 'bonus', page: 18 });
  m('arcane-firearm', { level: 5, cost: 'free', page: 18 });
  m('explosive-cannon', { level: 9, cost: 'action', page: 18 });
  expect(feature('arcane-firearm').trigger).toBeTruthy();
  const make = feature('eldritch-cannon').description.join(' ');
  for (const s of ['AC 18', 'Flamethrower', 'Force Ballista', 'Protector', '60 ft', '1 hour']) expect(make, s).toContain(s);
  const act = feature('eldritch-cannon-activate');
  const dice = act.scaling!.find(s => /damage/i.test(s.label))!.values;
  expect([dice[2], dice[7], dice[8], dice[19]]).toEqual(['2d8', '2d8', '3d8', '3d8']);
  const text = act.description.join(' ');
  for (const s of ['Flamethrower', 'Force Ballista', 'Protector', '120 ft', '15-ft cone', '1d8', 'both']) expect(text, s).toContain(s);
  expect(feature('explosive-cannon').description.join(' ')).toContain('3d8 force');
});
test('battle smith features', () => {
  const m = (id: string, x: object) => expect(feature(id), id).toMatchObject({ source: { kind: 'subclass', id: 'battle-smith' }, book: 'tce', textSource: 'summary', ...x });
  m('steel-defender', { level: 3, cost: 'bonus', page: 19 });
  m('arcane-jolt', { level: 9, cost: 'free', page: 20, uses: 'Intelligence modifier (minimum 1) per long rest' });
  const sd = feature('steel-defender').description;
  expect(sd).toContain("Stat block: Tasha's p. 19.");
  expect(sd.join(' ')).toContain('+2 AC');
  expect(sd.join(' ')).toContain('1d4 + your Intelligence modifier');
  expect(feature('arcane-jolt').trigger).toBeTruthy();
  const jolt = feature('arcane-jolt').scaling!.find(s => /2d6|jolt|damage|healing/i.test(s.label))!.values;
  expect([jolt[7], jolt[8], jolt[13], jolt[14], jolt[19]]).toEqual(['', '2d6', '2d6', '4d6', '4d6']);
});

test('scag martial subclasses', () => {
  for (const [id, cls] of [['path-of-the-battlerager', 'barbarian'], ['purple-dragon-knight', 'fighter'], ['way-of-the-long-death', 'monk']] as const)
    expect(sub(id), id).toMatchObject({ cls, book: 'scag' });
  expect(DATA.subclasses).toHaveLength(108);
  expect(DATA.features.find(f => f.id === 'inspiring-surge')!.scaling![0]!.values[16]).toBe('2');
  expect(DATA.features.find(f => f.id === 'way-of-the-long-death-touch-of-death')).toMatchObject({ level: 3, cost: 'free', source: { kind: 'subclass', id: 'way-of-the-long-death' } });
});
