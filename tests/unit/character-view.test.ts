import { charActionSections, charMenuRows, charSpellSections } from '../../src/character/view';
import { pickableSpells } from '../../src/character/derive';
import { hasExpandedList } from '../../src/character/options';
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
test('a grant with uses carries the cost note as its tag', () => {
  const c = ch([{ cls: 'barbarian', level: 3, sub: 'path-of-the-totem-warrior' }]);
  const sec = charSpellSections(c, 'mine').find(s => s.items.some(i => i.id === 'speak-with-animals'))!;
  expect(sec.tags!['speak-with-animals']).toBe('Ritual only');
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
test('mystic arcanum: tagged, and a level with a pick of its own is not dimmed', () => {
  // Warlock 11: level 6 arcanum reached; a level 7 pick is over the limit but still the character's own
  const c = ch([{ cls: 'warlock', level: 11 }], { spells: [{ id: 'eyebite', cls: 'warlock' }, { id: 'finger-of-death', cls: 'warlock' },
    { id: 'chain-lightning', cls: 'warlock', extra: true }, { id: 'fireball', cls: 'warlock', extra: true }] });
  const s = charSpellSections(c, 'mine');
  expect(s.find(x => x.id === 'lvl-6-warlock')!.tags).toEqual({ eyebite: 'Mystic Arcanum', 'chain-lightning': 'Mystic Arcanum' });
  expect(s.find(x => x.id === 'lvl-3-warlock')!.tags).toEqual({ fireball: 'Other list' });
  const dim = (label: string) => charMenuRows(c).find(r => r.label === label)!.dimmed;
  expect([dim('Level 6 Spells'), dim('Level 7 Spells'), dim('Level 8 Spells')]).toEqual([false, false, true]);
});
test('a spell source not reached yet has a dimmed row', () => {
  const rows = charMenuRows(ch([{ cls: 'barbarian', level: 3, sub: 'path-of-the-totem-warrior' }]));
  expect(rows.find(r => r.label === 'Spirit Walker Spells')!.dimmed).toBe(true);
  const tief = charMenuRows(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }));
  expect(tief.find(r => r.label === 'Tiefling Spells')!.dimmed).toBe(false);
});
test('a granted cantrip lights the Cantrips row of a class with none', () => {
  expect(charMenuRows(ch([{ cls: 'ranger', level: 3, sub: 'swarmkeeper' }])).find(r => r.kind === 'cantrips')!.dimmed).toBe(false);
  expect(charMenuRows(ch([{ cls: 'ranger', level: 3, sub: 'hunter' }])).find(r => r.kind === 'cantrips')!.dimmed).toBe(true);
});
test('all view: a Divine Soul affinity spell keeps its bonus-spell tag over the extra-list tag', () => {
  const good = ch([{ cls: 'sorcerer', level: 1, sub: 'divine-soul' }], { options: ['divine-magic-affinity-good'] });
  const all = charSpellSections(good, 'all').find(x => x.id === 'lvl-1-sorcerer')!;
  expect(all.tags!['cure-wounds']).toBe('Divine Soul');
  expect(all.tags!['guiding-bolt']).toBe('Cleric list');
  expect(charSpellSections(good, 'mine').find(x => x.id === 'lvl-1-sorcerer')!.tags!['cure-wounds']).toBe('Divine Soul');
  const law = ch([{ cls: 'sorcerer', level: 1, sub: 'divine-soul' }], { options: ['divine-magic-affinity-law'] });
  expect(charSpellSections(law, 'all').find(x => x.id === 'lvl-1-sorcerer')!.tags!['bless']).toBe('Divine Soul');
});
test('a picked extra-list spell that is also the affinity spell keeps the bonus-spell tag', () => {
  const c = ch([{ cls: 'sorcerer', level: 1, sub: 'divine-soul' }], { options: ['divine-magic-affinity-good'], spells: [{ id: 'cure-wounds', cls: 'sorcerer' }] });
  for (const v of ['mine', 'all'] as const) expect(charSpellSections(c, v).find(x => x.id === 'lvl-1-sorcerer')!.tags!['cure-wounds'], v).toBe('Divine Soul');
});
test('storm herald: only the chosen environment raging storm reaction shows, from level 14', () => {
  const herald = (level: number, env: string) => ch([{ cls: 'barbarian', level, sub: 'path-of-the-storm-herald' }], { options: [`storm-aura-${env}`] });
  const sub = (c: Character) => charActionSections(c).find(s => s.id === 'subclass-barbarian')?.items.map(i => i.id) ?? [];
  expect(sub(herald(14, 'desert'))).toContain('raging-storm-desert');
  expect(sub(herald(14, 'desert'))).not.toContain('raging-storm-sea');
  expect(sub(herald(14, 'sea'))).toContain('raging-storm-sea');
  expect(sub(herald(14, 'sea'))).not.toContain('raging-storm-desert');
  expect(sub(herald(14, 'tundra')).filter(id => id.startsWith('raging-storm'))).toEqual([]);
  expect(sub(herald(13, 'desert'))).not.toContain('raging-storm-desert');
  expect(charActionSections(herald(14, 'desert')).find(s => s.id === 'opt-storm-aura')!.items.map(i => i.id)).toEqual(['storm-aura-desert']);
});
test('all view: domain spells keep the Domain tag', () => {
  const c = ch([{ cls: 'cleric', level: 1, sub: 'life-domain', mod: 3 }]);
  const l1 = charSpellSections(c, 'all').find(x => x.id === 'lvl-1-cleric')!;
  expect(l1.tags!['bless']).toBe('Domain');
  expect(l1.tags!['guiding-bolt']).toBeUndefined();
});

test('armor model gates its features', () => {
  const armorer = (options: string[], level = 3) => ch([{ cls: 'artificer', level, sub: 'armorer' }], { options });
  const ids = (c: Character) => charActionSections(c).flatMap(s => s.items.map(i => i.id));
  const g = ids(armorer(['armor-model-guardian']));
  expect(g).toEqual(expect.arrayContaining(['thunder-gauntlets', 'defensive-field', 'arcane-armor']));
  expect(g).not.toContain('lightning-launcher');
  // switching the model swaps them
  const i = ids(armorer(['armor-model-infiltrator']));
  expect(i).toContain('lightning-launcher');
  expect(i).not.toContain('thunder-gauntlets');
  expect(i).not.toContain('defensive-field');
  // no model chosen: neither model's cards
  expect(ids(armorer([])).filter(x => ['thunder-gauntlets', 'defensive-field', 'lightning-launcher'].includes(x))).toEqual([]);
  // perfected armor follows the model, from 15
  expect(ids(armorer(['armor-model-guardian'], 15))).toContain('perfected-armor-guardian');
  expect(ids(armorer(['armor-model-guardian'], 15))).not.toContain('perfected-armor-infiltrator');
  expect(ids(armorer(['armor-model-guardian'], 14))).not.toContain('perfected-armor-guardian');
});
test('alchemist 15: heal on its level 6 spells page, tagged with its uses, and the row lit', () => {
  const c = ch([{ cls: 'artificer', level: 15, sub: 'alchemist', mod: 3 }]);
  const l6 = charSpellSections(c, 'mine').find(s => s.id === 'lvl-6-artificer')!;
  expect(l6.items.map(i => i.id)).toEqual(['heal']);
  expect(l6.tags!['heal']).toBe('Chemical Mastery · Once per long rest, no slot');
  expect(charMenuRows(c).find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(false);
  expect(charMenuRows(ch([{ cls: 'artificer', level: 15, sub: 'armorer', mod: 3 }])).find(r => r.label === 'Level 6 Spells')).toBeUndefined();
});

const ranger = (lvl: number, options: string[] = [], sub?: string) =>
  ch([{ cls: 'ranger', level: lvl, ...(sub && { sub }) }], { options });
test('chosen optional features join the class section, tagged', () => {
  const sec = charActionSections(ranger(5, ['favored-enemy-undead', 'optional-ranger-favored-foe'])).find(s => s.id === 'class-ranger')!;
  expect(sec.items.map(f => f.id)).toContain('optional-ranger-favored-foe');
  expect(sec.tags!['optional-ranger-favored-foe']).toBe('Optional');
  expect(charActionSections(ranger(5)).find(s => s.id === 'class-ranger')!.items.map(f => f.id)).not.toContain('optional-ranger-favored-foe');
  expect(charActionSections(ranger(5)).map(s => s.id)).not.toContain('opt-optional-ranger');
});
test('replaced class feature hides', () => {
  const ids = (c: Character) => charActionSections(c).flatMap(s => s.items.map(f => f.id));
  expect(ids(ranger(10))).toContain('hide-in-plain-sight');
  expect(ids(ranger(10, ['optional-ranger-natures-veil']))).not.toContain('hide-in-plain-sight');
  expect(ids(ranger(10, ['optional-ranger-natures-veil']))).toContain('optional-ranger-natures-veil');
  expect(ids(ranger(10))).not.toContain('deft-explorer-tireless');
  expect(ids(ranger(10, ['optional-ranger-deft-explorer']))).toContain('deft-explorer-tireless');
  const bm = charActionSections(ranger(3, ['optional-beast-master-primal-companion'], 'beast-master')).find(s => s.id === 'subclass-ranger')!;
  expect(bm.items.map(f => f.id)).toEqual(['optional-beast-master-primal-companion']);
  expect(bm.tags).toEqual({ 'optional-beast-master-primal-companion': 'Optional' });
});
test('primal awareness spells come with the tick', () => {
  const names = (c: Character) => charSpellSections(c, 'mine').flatMap(s => s.items.map(i => i.id));
  expect(names(ranger(5))).not.toContain('beast-sense');
  expect(names(ranger(5, ['optional-ranger-primal-awareness']))).toEqual(expect.arrayContaining(['speak-with-animals', 'beast-sense']));
});
test('character needs the tick', () => {
  const cc = { cls: 'cleric', level: 5 } as CharClass;
  expect(pickableSpells(cc).map(p => p.spell.id)).not.toContain('aura-of-vitality');
  expect(pickableSpells(cc, true).find(p => p.spell.id === 'aura-of-vitality')!.tag).toBe('Optional');
});
test('hasExpandedList follows the tick and its level', () => {
  expect(hasExpandedList(ch([{ cls: 'cleric', level: 5 }]), 'cleric')).toBe(false);
  expect(hasExpandedList(ch([{ cls: 'cleric', level: 5 }], { options: ['optional-cleric-additional-spells'] }), 'cleric')).toBe(true);
  expect(hasExpandedList(ch([{ cls: 'paladin', level: 1 }], { options: ['optional-paladin-additional-spells'] }), 'paladin')).toBe(false);
});
test('picked expanded spell keeps its tag after unticking', () => {
  const c = { ...emptyCharacter(), classes: [{ cls: 'cleric', level: 5 }], spells: [{ id: 'aura-of-vitality', cls: 'cleric' }] } as Character;
  const l3 = charSpellSections(c, 'mine').find(s => s.id === 'lvl-3-cleric')!;
  expect(l3.tags!['aura-of-vitality']).toBe('Optional');
});
test('a pick no longer on any of the character\'s lists is tagged Off list', () => {
  // picked as an efreeti genie, then the genie kind changed to dao
  const c = ch([{ cls: 'warlock', level: 5, sub: 'the-genie' }], { options: ['genie-kind-dao'],
    spells: [{ id: 'fireball', cls: 'warlock' }, { id: 'spike-growth', cls: 'warlock' }] });
  const tags = (id: string) => charSpellSections(c, 'mine').find(s => s.id === id)!.tags!;
  expect(tags('lvl-3-warlock')['fireball']).toBe('Off list');
  expect(tags('lvl-2-warlock')['spike-growth']).toBe('Patron');
});
test('all view adds the expanded list only with the tick', () => {
  const ids = (c: Character) => charSpellSections(c, 'all').flatMap(s => s.items.map(i => i.id));
  expect(ids(ch([{ cls: 'cleric', level: 5 }]))).not.toContain('aura-of-vitality');
  const ticked = ch([{ cls: 'cleric', level: 5 }], { options: ['optional-cleric-additional-spells'] });
  expect(ids(ticked)).toContain('aura-of-vitality');
  expect(charSpellSections(ticked, 'all').find(s => s.id === 'lvl-3-cleric')!.tags!['aura-of-vitality']).toBe('Optional');
});
