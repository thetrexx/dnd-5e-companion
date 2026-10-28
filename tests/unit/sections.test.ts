import type { Feature, Spell } from '../../src/data/types';
import { DATA } from '../../src/data';
import { listSpells } from '../../src/logic/rules';
import { spellSections, actionSections, joinTag } from '../../src/logic/sections';

test('joinTag', () => {
  expect(joinTag('Domain', undefined)).toBe('Domain');
  expect(joinTag(undefined, 'Ritual only')).toBe('Ritual only');
  expect(joinTag('Domain', '')).toBe('Domain');
  expect(joinTag('Star Map', 'Free cast')).toBe('Star Map · Free cast');
  expect(joinTag()).toBeUndefined();
});
test('browse view lists the effective subclass feature spells, tagged with the feature name', () => {
  const cantrips = spellSections('rogue', 3, 'arcane-trickster').find(s => s.id === 'cantrips')!;
  expect(cantrips.tags!['mage-hand']).toBe('Mage Hand Legerdemain');
});
test('non-casters get no spell sections from feature spells', () => {
  expect(spellSections('barbarian', 3, 'path-of-the-totem-warrior')).toEqual([]);
  expect(spellSections('monk', 3, 'way-of-shadow')).toEqual([]);
});

test('wizard spell sections', () => {
  const sp = spellSections('wizard', 3);
  expect(sp.map(s => s.id)).toEqual(['cantrips','lvl-1','lvl-2','lvl-3','lvl-4','lvl-5','lvl-6','lvl-7','lvl-8','lvl-9']);
  expect(sp.find(s => s.id === 'lvl-3')!.locked).toBe('Unlocks at Wizard 5');
  expect(sp.find(s => s.id === 'lvl-2')!.locked).toBeUndefined();
  expect(sp.find(s => s.id === 'lvl-2')!.subtitle).toBe('Wizard');
  // the rest come from the expanded list, tagged Optional
  for (const s of sp) for (const i of s.items as Spell[]) if (!i.classes.includes('wizard')) {
    expect(i.optionalLists).toContain('wizard');
    expect(s.tags![i.id]).toBe('Optional');
  }
});

test('fighter has no spell sections', () => {
  expect(spellSections('fighter', 5)).toEqual([]);
});

test('fighter 1 action sections', () => {
  const ac = actionSections('fighter', 1);
  expect(ac.map(s => s.id)).toEqual(['actions','bonus','reactions','class','opt-fighting-style']);
  expect(ac.find(s => s.id === 'class')!.title).toBe('Fighter Actions');
  expect(ac.find(s => s.id === 'class')!.items.map(i => i.name)).toEqual(['Second Wind']);
  expect(ac.flatMap(s => s.items).some(i => 'school' in i)).toBe(false);
});

test('subclass spell sections', () => {
  const ekSp = spellSections('fighter', 3, 'eldritch-knight').flatMap(s => s.items) as Spell[];
  expect(ekSp.length).toBeGreaterThan(0);
  expect(ekSp.filter(s => s.level > 0).every(s => ['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
  // cantrips have no school limit
  expect(ekSp.some(s => s.level === 0 && !['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
  const land = spellSections('druid', 3, 'circle-of-the-land').find(s => s.id === 'lvl-2')!;
  expect(land.items.some(i => i.id === 'hold-person')).toBe(true);
  expect(land.items.filter(i => i.id === 'hold-person')).toHaveLength(1);
  expect(land.tags?.['hold-person']).toBe('Circle · Arctic');
  // only the expanded list's spells carry a tag
  expect(Object.values(spellSections('druid', 3).find(s => s.id === 'lvl-2')!.tags!).every(t => t === 'Optional')).toBe(true);
});

test('option and subclass action sections', () => {
  const fa = actionSections('fighter', 1);
  expect(fa.find(s => s.id === 'opt-fighting-style')!.items.map(i => i.id)).toEqual(['fighting-style-interception', 'fighting-style-protection', 'fighting-style-superior-technique']);
  expect(fa.find(s => s.id === 'opt-fighting-style')!.tags).toEqual({ 'fighting-style-interception': 'Optional', 'fighting-style-superior-technique': 'Optional' });
  expect(fa.find(s => s.id === 'opt-fighting-style')!.title).toBe('Fighting Style');
  expect(actionSections('fighter', 3, 'eldritch-knight').find(s => s.id === 'subclass')!.items.map(i => i.id)).toContain('weapon-bond');
  expect(actionSections('fighter', 3).some(s => s.id === 'subclass')).toBe(false);
  expect(actionSections('fighter', 3, 'champion').some(s => s.id === 'subclass')).toBe(false);
  expect(actionSections('druid', 3, 'circle-of-the-land').some(s => s.id === 'opt-land-terrain')).toBe(false);
});
test('monk ki pool shows on the actions page', () => {
  const ki = actionSections('monk', 5).find(s => s.id === 'class')!.items.find(i => i.id === 'ki') as Feature | undefined;
  expect(ki).toBeTruthy();
  expect(ki!.scaling!.find(s => s.label === 'Ki Points')!.values[4]).toBe('5');
});

test('locked spell levels list future subclass grants', () => {
  const lvl3 = spellSections('cleric', 1, 'life-domain').find(s => s.id === 'lvl-3')!;
  expect(lvl3.locked).toBeTruthy();
  expect(lvl3.items.map(i => i.id)).toContain('beacon-of-hope');
  expect(lvl3.tags?.['beacon-of-hope']).toBe('Domain');
});

test('land tag joins every terrain granting a spell', () => {
  const l2 = spellSections('druid', 3, 'circle-of-the-land').find(s => s.id === 'lvl-2')!;
  expect(l2.tags?.['spike-growth']).toBe('Circle · Arctic, Mountain');
  expect(l2.tags?.['hold-person']).toBe('Circle · Arctic');
});

test('arcane trickster cantrips include mage hand', () => {
  const at = spellSections('rogue', 3, 'arcane-trickster');
  expect(at.find(s => s.id === 'cantrips')!.items.map(i => i.id)).toContain('mage-hand');
  expect(at.filter(s => s.id !== 'cantrips').flatMap(s => s.items as Spell[]).every(s => ['Enchantment', 'Illusion'].includes(s.school))).toBe(true);
});

test('subclass casters omit spell levels they never reach', () => {
  const ek = spellSections('fighter', 3, 'eldritch-knight');
  expect(ek.map(s => s.id)).toEqual(['cantrips', 'lvl-1', 'lvl-2', 'lvl-3', 'lvl-4']);
  expect(ek.find(s => s.id === 'lvl-4')!.locked).toBe('Unlocks at Fighter 19');
  expect(spellSections('rogue', 20, 'arcane-trickster').some(s => s.id === 'lvl-5')).toBe(false);
});

test('listSpells: subclass caster list matches its spell sections', () => {
  const cls = (id: string) => DATA.classes.find(c => c.id === id)!;
  const ek = DATA.subclasses.find(s => s.id === 'eldritch-knight')!;
  const fromSections = spellSections('fighter', 20, 'eldritch-knight').flatMap(s => s.items.map(i => i.id));
  // sections drop levels above the subclass ceiling; listSpells keeps the whole filtered list
  expect(listSpells(cls('fighter'), ek).filter(s => s.level <= 4).map(s => s.id).sort()).toEqual([...new Set(fromSections)].sort());
  expect(listSpells(cls('wizard')).map(s => s.id)).toContain('fireball');
});

test('swarmkeeper spells tagged with the subclass name', () => {
  const s = spellSections('ranger', 3, 'swarmkeeper').find(x => x.id === 'lvl-1')!;
  expect(s.tags!['faerie-fire']).toBe('Swarmkeeper');
});
test('star map guiding bolt shows its limit', () =>
  expect(spellSections('druid', 2, 'circle-of-stars').find(x => x.id === 'lvl-1')!.tags!['guiding-bolt']).toMatch(/^Star Map · /));

test('browse shows optional features in the class section, tagged', () => {
  const sec = actionSections('ranger', 10).find(s => s.id === 'class')!;
  expect(sec.items.map(f => f.id)).toEqual(expect.arrayContaining(['optional-ranger-favored-foe', 'hide-in-plain-sight', 'optional-ranger-natures-veil', 'deft-explorer-tireless']));
  expect(sec.items.map(f => f.id)).not.toContain('optional-ranger-deft-explorer');   // passive
  expect(sec.tags!['optional-ranger-favored-foe']).toBe('Optional');
  expect(sec.tags!['deft-explorer-tireless']).toBe('Optional');
  expect(sec.tags!['hide-in-plain-sight']).toBeUndefined();
  expect(actionSections('ranger', 10).map(s => s.id)).not.toContain('opt-optional-ranger');
  expect(actionSections('ranger', 5).find(s => s.id === 'class')!.items.map(f => f.id)).not.toContain('optional-ranger-natures-veil');
});
test('browse shows both armor models', () => {
  const sub = (level: number) => actionSections('artificer', level, 'armorer').find(s => s.id === 'subclass')!.items.map(i => i.id);
  expect(sub(3)).toEqual(expect.arrayContaining(['arcane-armor', 'thunder-gauntlets', 'defensive-field', 'lightning-launcher']));
  expect(sub(15)).toEqual(expect.arrayContaining(['perfected-armor-guardian', 'perfected-armor-infiltrator']));
  // the model picks themselves are passive
  expect(actionSections('artificer', 3, 'armorer').flatMap(s => s.items.map(i => i.id))).not.toContain('armor-model-guardian');
});
test('alchemist browse: heal on level 6, tagged with chemical mastery', () => {
  const l6 = spellSections('artificer', 15, 'alchemist').find(s => s.id === 'lvl-6')!;
  expect(l6.items.map(s => s.id)).toEqual(['heal']);
  expect(l6.tags!['heal']).toBe('Chemical Mastery · Once per long rest, no slot');
  expect(l6.locked).toBeUndefined();
});
// a card is locked when its section is, unless it is one of the section's open (already granted) items
const cardLocked = (sec: { locked?: string; open?: string[] }, id: string) => !!sec.locked && !sec.open?.includes(id);
test('alchemist 15, level 5: chemical mastery greater restoration open, list spells still locked', () => {
  const l5 = spellSections('artificer', 15, 'alchemist').find(s => s.id === 'lvl-5')!;
  expect(l5.items.map(s => s.id)).toEqual(expect.arrayContaining(['greater-restoration', 'animate-objects']));
  expect(cardLocked(l5, 'greater-restoration')).toBe(false);
  expect(cardLocked(l5, 'animate-objects')).toBe(true);
  expect(l5.locked).toBe('Unlocks at Artificer 17');
});
test('alchemist 3, level 6: heal locked until the grant, not the class table', () => {
  const l6 = spellSections('artificer', 3, 'alchemist').find(s => s.id === 'lvl-6')!;
  expect(cardLocked(l6, 'heal')).toBe(true);
  expect(l6.locked).toBe('Unlocks at Artificer 15');
});
test('alchemist 15, level 6: heal open', () => {
  const l6 = spellSections('artificer', 15, 'alchemist').find(s => s.id === 'lvl-6')!;
  expect(cardLocked(l6, 'heal')).toBe(false);
});
test('horizon walker level 7: etherealness locked until ethereal step, then open', () => {
  const l7 = (level: number) => spellSections('ranger', level, 'horizon-walker').find(s => s.id === 'lvl-7')!;
  expect(cardLocked(l7(7), 'etherealness')).toBe(false);
  expect(cardLocked(l7(3), 'etherealness')).toBe(true);
  expect(l7(3).locked).toBe('Unlocks at Ranger 7');
});
test('primal companion is a beast master option', () => {
  const sec = actionSections('ranger', 3, 'beast-master').find(s => s.id === 'subclass')!;
  expect(sec.tags!['optional-beast-master-primal-companion']).toBe('Optional');
  expect(sec.items.map(f => f.id)).toContain('rangers-companion');
});
test('browse shows expanded spells tagged Optional', () => {
  const l3 = spellSections('cleric', 5).find(x => x.id === 'lvl-3')!;
  expect(l3.items.map(s => s.id)).toContain('aura-of-vitality');
  expect(l3.tags!['aura-of-vitality']).toBe('Optional');
  // a base-list spell keeps no tag
  expect(l3.tags?.['revivify']).toBeUndefined();
});
test('browse lists the fixed spells of optional options, tagged Optional', () => {
  const l1 = spellSections('ranger', 5).find(x => x.id === 'lvl-1')!;
  expect(l1.items.map(s => s.id)).toContain('speak-with-animals');
  expect(l1.tags!['speak-with-animals']).toContain('Optional');
});
