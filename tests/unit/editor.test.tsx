import { cleanup, fireEvent, render } from '@testing-library/preact';
import { App } from '../../src/app';
import { deleteCharacter, loadCharacter, saveCharacter } from '../../src/character/store';
import { emptyCharacter } from '../../src/character/types';
import { Editor } from '../../src/ui/editor/Editor';
import { PickList } from '../../src/ui/editor/PickList';

Element.prototype.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
beforeEach(() => { deleteCharacter(); localStorage.clear(); location.hash = ''; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('editing saves on every change', () => {
  const r = render(<Editor step="basics" />);
  fireEvent.input(r.getByLabelText('Name'), { target: { value: 'Lyra' } });
  fireEvent.change(r.getByLabelText('Race'), { target: { value: 'elf' } });
  fireEvent.change(r.getByLabelText('Subrace'), { target: { value: 'drow' } });
  expect(loadCharacter()).toMatchObject({ name: 'Lyra', race: 'drow' });
});
test('changing the base race clears the subrace', () => {
  saveCharacter({ ...emptyCharacter(), race: 'drow' });
  const r = render(<Editor step="basics" />);
  fireEvent.change(r.getByLabelText('Race'), { target: { value: 'dwarf' } });
  expect(loadCharacter()?.race).toBe('dwarf');
});
test('classes: add, level, subclass, remove prunes spells', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1 }], spells: [{ id: 'guidance', cls: 'cleric' }] });
  const r = render(<Editor step="classes" />);
  fireEvent.change(r.getByLabelText('Add a class'), { target: { value: 'wizard' } });
  fireEvent.click(r.getByText('Add class'));
  fireEvent.change(r.getByLabelText('Wizard level'), { target: { value: '2' } });
  fireEvent.change(r.getByLabelText('Wizard Arcane Tradition'), { target: { value: 'school-of-evocation' } });
  fireEvent.click(r.getAllByText('Remove')[0]);
  expect(loadCharacter()!.classes).toHaveLength(2);
  fireEvent.click(r.getByText('Tap again to remove'));
  expect(loadCharacter()).toMatchObject({ classes: [{ cls: 'wizard', level: 2, sub: 'school-of-evocation' }], spells: [] });
  expect(r.getByText('Character level 2')).toBeTruthy();
});
test('class step offers classes A-Z', () => {
  const r = render(<Editor step="classes" />);
  const names = [...(r.getByLabelText('Add a class') as HTMLSelectElement).options].map(o => o.textContent!);
  expect(names[0]).toBe('Artificer');
  expect(names).toHaveLength(13);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
});
test('level above 20 warns', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 20 }] });
  const r = render(<Editor step="classes" />);
  fireEvent.change(r.getByLabelText('Add a class'), { target: { value: 'wizard' } });
  fireEvent.click(r.getByText('Add class'));
  expect(r.getByText("Character level can't go above 20.")).toBeTruthy();
});
test('done needs a class', () => {
  const r = render(<Editor step="spells" />);
  expect(r.getByRole('button', { name: 'Done' })).toHaveProperty('disabled', true);
  expect(r.getByText('Add a class first')).toBeTruthy();
});
test('step links mark the current step', () => {
  const r = render(<Editor step="classes" />);
  expect(r.getByRole('link', { name: 'Classes' }).getAttribute('aria-current')).toBe('step');
  expect(r.getByRole('link', { name: 'Options' }).getAttribute('href')).toBe('#/edit/options');
});
test('blocked storage: editor still works and says so', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const r = render(<Editor step="basics" />);
  fireEvent.input(r.getByLabelText('Name'), { target: { value: 'Lyra' } });
  expect((r.getByLabelText('Name') as HTMLInputElement).value).toBe('Lyra');
  expect(r.getByText(/won't keep your character/)).toBeTruthy();
});
test('delete needs two taps', () => {
  saveCharacter({ ...emptyCharacter(), name: 'Lyra' });
  const r = render(<Editor step="basics" />);
  fireEvent.click(r.getByText('Delete character'));
  expect(loadCharacter()).not.toBeNull();
  fireEvent.click(r.getByText('Tap again to delete'));
  expect(loadCharacter()).toBeNull();
  expect(location.hash).toBe('#/');
});
test('PickList toggles', () => {
  const on: string[] = [];
  const r = render(<PickList items={[{ id: 'a', label: 'Alpha', note: 'n' }, { id: 'b', label: 'Beta' }]} picked={['a']} onToggle={(id) => on.push(id)} />);
  expect(r.getByText('Alpha').closest('button')?.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(r.getByText('Beta'));
  expect(on).toEqual(['b']);
});
test('app routes: me without a class opens the editor', () => {
  deleteCharacter();
  location.hash = '#/me';
  expect(render(<App />).getByLabelText('Name')).toBeTruthy();
  cleanup();
  saveCharacter({ ...emptyCharacter(), name: 'X' });
  expect(render(<App />).getByLabelText('Add a class')).toBeTruthy();
});

test('options step picks metamagic', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'sorcerer', level: 3 }] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('0 of 2 chosen')).toBeTruthy();
  for (const n of ['Quickened Spell', 'Twinned Spell', 'Subtle Spell']) fireEvent.click(r.getByText(n));
  expect(loadCharacter()!.options).toHaveLength(3);
  expect(r.getByText(/more than usual/)).toBeTruthy();
});
test('feat with a spell choice', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="feats" />);
  fireEvent.click(r.getByText('Magic Initiate'));
  fireEvent.click(r.getAllByText('Fire Bolt')[0]);
  expect(loadCharacter()!.spells).toEqual([{ id: 'fire-bolt', grant: 'feat:magic-initiate:0' }]);
  fireEvent.click(r.getByText('Magic Initiate'));
  expect(loadCharacter()!.spells).toEqual([]);
});
test('high elf cantrip in the basics step', () => {
  saveCharacter({ ...emptyCharacter(), race: 'high-elf', classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="basics" />);
  fireEvent.click(r.getByText('Light'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'light', grant: 'race:high-elf:0' }]);
});
test('spells step: guidance, picks and always prepared', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'life-domain' }] });
  const r = render(<Editor step="spells" />);
  fireEvent.input(r.getByLabelText('WIS modifier'), { target: { value: '3' } });
  expect(r.getByText(/Spells 0 of 4 prepared/)).toBeTruthy();
  expect(r.getByText('Always prepared')).toBeTruthy();
  fireEvent.click(r.getAllByText('Guidance')[0]);
  expect(loadCharacter()!.spells).toEqual([{ id: 'guidance', cls: 'cleric' }]);
  expect(loadCharacter()!.classes[0].mod).toBe(3);
});
test('spells step: another list', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'bard', level: 10 }] });
  const r = render(<Editor step="spells" />);
  fireEvent.input(r.getByLabelText('Add a spell from another list'), { target: { value: 'fireb' } });
  fireEvent.click(r.getByText('Fireball'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'fireball', cls: 'bard', extra: true }]);
});
test('spells step: over the limit and non-casters', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="spells" />);
  expect(r.getByText('None of your classes cast spells.')).toBeTruthy();
  cleanup();
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'bard', level: 1 }], spells: [{ id: 'light', cls: 'bard' }, { id: 'mage-hand', cls: 'bard' }, { id: 'vicious-mockery', cls: 'bard' }] });
  const r2 = render(<Editor step="spells" />);
  expect(r2.getByText(/Cantrips 3 of 2 more than usual/)).toBeTruthy();
});
test('a choice not reached yet says when it unlocks', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'warlock', level: 2 }], options: ['pact-boon-pact-of-the-tome'] });
  expect(render(<Editor step="options" />).getByText('Unlocks at Warlock 3')).toBeTruthy();
});
test('spells step: no cantrips and no spells yet', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'paladin', level: 1 }] });
  const r = render(<Editor step="spells" />);
  expect(r.getByText('Spells start at Paladin 2')).toBeTruthy();
  expect(r.queryByText(/Cantrips|up to level/)).toBeNull();
  cleanup();
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'paladin', level: 2 }] });
  expect(render(<Editor step="spells" />).getByText(/^Spells 0 of 1 prepared · up to level 1$/)).toBeTruthy();
});
test('spells step: an artificer prepares Int + half its level, rounded down, from level 1', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'artificer', level: 1 }] });
  const r = render(<Editor step="spells" />);
  fireEvent.input(r.getByLabelText('INT modifier'), { target: { value: '3' } });
  expect(r.getByText('Cantrips 0 of 2 · Spells 0 of 3 prepared · up to level 1')).toBeTruthy();
  cleanup();
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'artificer', level: 5, mod: 3 }] });
  expect(render(<Editor step="spells" />).getByText('Cantrips 0 of 2 · Spells 0 of 5 prepared · up to level 2')).toBeTruthy();
});
test('spells step: modifier is a whole number from -5 to 10', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1 }] });
  const r = render(<Editor step="spells" />);
  const mod = () => loadCharacter()!.classes[0].mod;
  const set = (v: string) => fireEvent.input(r.getByLabelText('WIS modifier'), { target: { value: v } });
  set('12'); expect(mod()).toBe(10);
  set('-7'); expect(mod()).toBe(-5);
  set('2.6'); expect(mod()).toBe(3);
  set(''); expect(mod()).toBeUndefined();
});
test('spells step: always prepared spells are not offered again', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'life-domain' }] });
  const r = render(<Editor step="spells" />);
  expect(r.getAllByText('Bless')).toHaveLength(1);
  expect(r.getAllByText('Cure Wounds')).toHaveLength(1);
  expect(r.getAllByText('Healing Word')).toHaveLength(1);
  cleanup();
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'life-domain' }], spells: [{ id: 'bless', cls: 'cleric' }] });
  const r2 = render(<Editor step="spells" />);
  fireEvent.click(r2.getAllByText('Bless')[1]);
  expect(loadCharacter()!.spells).toEqual([]);
});

test('spells step: a divine soul sorcerer is offered cleric spells', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'sorcerer', level: 1, sub: 'divine-soul' }] });
  const r = render(<Editor step="spells" />);
  fireEvent.click(r.getAllByText('Cure Wounds')[0]);
  expect(loadCharacter()!.spells).toEqual([{ id: 'cure-wounds', cls: 'sorcerer' }]);
  cleanup();
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'sorcerer', level: 1 }] });
  expect(render(<Editor step="spells" />).queryByText('Cure Wounds')).toBeNull();
});

test('a shared fighting style is chosen once and disabled in the other slot', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }], options: ['fighting-style-defense'] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('1 of 1 chosen')).toBeTruthy();
  expect(r.getByText('0 of 1 chosen')).toBeTruthy();
  expect(r.getByText('Chosen for Fighter')).toBeTruthy();
  const defense = r.getAllByText('Defense').map((e) => e.closest('button')!);
  expect(defense.map((b) => b.disabled)).toEqual([false, true]);
});
test('a legal build never reads as an over-pick', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }], options: ['fighting-style-defense', 'fighting-style-two-weapon-fighting'] });
  const r = render(<Editor step="options" />);
  expect(r.getAllByText('1 of 1 chosen')).toHaveLength(2);
  expect(r.queryByText(/more than usual/)).toBeNull();
  expect(r.getByText('Chosen for Paladin')).toBeTruthy();
});

test('options step: optional features are ticked, and a replacement hides the old slot', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'ranger', level: 1 }] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('Optional Features')).toBeTruthy();
  expect(r.getByText('Tick the ones your DM allows.')).toBeTruthy();
  expect(r.getByText('Replaces Favored Enemy')).toBeTruthy();
  expect(r.getByText('Favored Enemy')).toBeTruthy();
  fireEvent.click(r.getByText('Favored Foe'));
  expect(loadCharacter()!.options).toEqual(['optional-ranger-favored-foe']);
  expect(r.queryByText('Favored Enemy')).toBeNull();
  expect(r.getByText('Natural Explorer')).toBeTruthy();
  fireEvent.click(r.getByText('Favored Foe'));
  expect(r.getByText('Favored Enemy')).toBeTruthy();
});
test('options step: a Tasha\'s option in a normal slot carries the Optional note', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="options" />);
  const row = (name: string) => r.getByText(name).closest('button')!;
  expect(row('Blind Fighting').querySelector('.pick-note')!.textContent).toBe('Optional');
  expect(row('Defense').querySelector('.pick-note')).toBeNull();
});
test('options step: Blessed Strikes notes Divine Strike once', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 8 }] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('Replaces Divine Strike')).toBeTruthy();
});
test('options step: a subclass optional slot names the subclass', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'ranger', level: 3, sub: 'beast-master' }] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('Optional Features')).toBeTruthy();
  expect(r.getByText('Optional Features · Beast Master')).toBeTruthy();
});
test('options step: a feat-owned slot names its feat', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], feats: ['martial-adept'] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('Maneuvers · Martial Adept')).toBeTruthy();
  expect(r.getByText('0 of 2 chosen')).toBeTruthy();
});
test('options step: a maneuver taken by a battle master slot reads Chosen for its owner', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 3, sub: 'battle-master' }], feats: ['martial-adept'], options: ['maneuvers-parry', 'maneuvers-riposte', 'maneuvers-rally'] });
  const r = render(<Editor step="options" />);
  expect(r.getAllByText('Chosen for Fighter').length).toBeGreaterThan(0);
});
test('options step: superior technique opens its maneuver slot, and its pick reads Chosen for Superior Technique', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 3, sub: 'battle-master' }],
    options: ['fighting-style-superior-technique', 'maneuvers-parry', 'maneuvers-riposte', 'maneuvers-rally', 'maneuvers-trip-attack'] });
  const r = render(<Editor step="options" />);
  expect(r.getAllByText('1 of 1 chosen')).toHaveLength(2);   // the fighting style, and its maneuver
  expect(r.getByText('Chosen for Superior Technique')).toBeTruthy();
});
test('spells step: a cleric 5 is offered Aura of Vitality only after ticking Additional Cleric Spells', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 5 }] });
  const before = render(<Editor step="spells" />);
  expect(before.queryByText('Aura of Vitality')).toBeNull();
  cleanup();
  const opts = render(<Editor step="options" />);
  fireEvent.click(opts.getByText('Additional Cleric Spells'));
  expect(loadCharacter()!.options).toEqual(['optional-cleric-additional-spells']);
  cleanup();
  const after = render(<Editor step="spells" />);
  expect(after.getByText('Aura of Vitality')).toBeTruthy();
});
test('spells step: a dao genie warlock is offered dao and genie spells, never efreeti ones', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'warlock', level: 5, sub: 'the-genie' }], options: ['genie-kind-dao'] });
  const r = render(<Editor step="spells" />);
  expect(r.getByText('Spike Growth')).toBeTruthy();
  expect(r.getByText('Phantasmal Force')).toBeTruthy();
  expect(r.queryByText('Scorching Ray')).toBeNull();
  expect(r.queryByText('Burning Hands')).toBeNull();
  expect(r.queryByText('Fireball')).toBeNull();
});
test('spells step: an expanded-list pick stays, tagged Optional, after unticking the list, and can be unpicked', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 5 }], options: ['optional-cleric-additional-spells'] });
  const picks = render(<Editor step="spells" />);
  fireEvent.click(picks.getByText('Aura of Vitality'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'aura-of-vitality', cls: 'cleric' }]);
  cleanup();
  const opts = render(<Editor step="options" />);
  fireEvent.click(opts.getByText('Additional Cleric Spells'));
  expect(loadCharacter()!.options).toEqual([]);
  cleanup();
  const r = render(<Editor step="spells" />);
  const btn = r.getByText('Aura of Vitality').closest('button')!;
  expect(btn.className).toContain('mine');
  expect(btn.querySelector('.ic-tag')!.textContent).toBe('Optional');
  // the search doesn't offer it again as a spell from another list
  fireEvent.input(r.getByLabelText('Add a spell from another list'), { target: { value: 'Aura of Vitality' } });
  expect(r.getAllByText('Aura of Vitality')).toHaveLength(1);
  fireEvent.click(btn);
  expect(loadCharacter()!.spells).toEqual([]);
});
test('spells step: a genie pick of another kind stays, tagged Off list, and can be unpicked', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'warlock', level: 5, sub: 'the-genie' }], options: ['genie-kind-efreeti'] });
  const picks = render(<Editor step="spells" />);
  fireEvent.click(picks.getByText('Fireball'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'fireball', cls: 'warlock' }]);
  cleanup();
  saveCharacter({ ...loadCharacter()!, options: ['genie-kind-dao'] });
  const r = render(<Editor step="spells" />);
  const btn = r.getByText('Fireball').closest('button')!;
  expect(btn.className).toContain('mine');
  expect(btn.querySelector('.ic-tag')!.textContent).toBe('Off list');
  fireEvent.input(r.getByLabelText('Add a spell from another list'), { target: { value: 'Fireball' } });
  expect(r.getAllByText('Fireball')).toHaveLength(1);
  fireEvent.click(btn);
  expect(loadCharacter()!.spells).toEqual([]);
});
