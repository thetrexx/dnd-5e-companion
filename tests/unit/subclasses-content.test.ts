import { DATA } from '../../src/data';
import { autoSpells } from '../../src/character/grants';
import { emptyCharacter } from '../../src/character/types';

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

test('66 subclasses', () => expect(DATA.subclasses).toHaveLength(66));
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
test('forge and grave domain spells', () => {
  expect(sub('forge-domain').bonusSpells!.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['identify', 'searing-smite']);
  expect(sub('grave-domain').bonusSpells!.grants.filter(g => g.atLevel === 9).map(g => g.spell).sort()).toEqual(['antilife-shell', 'raise-dead']);
  expect(feature('circle-of-mortality').spells).toEqual([expect.objectContaining({ spell: 'spare-the-dying', atLevel: 1 })]);
});
