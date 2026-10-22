import { cleanup, fireEvent, render } from '@testing-library/preact';
import { App } from '../../src/app';
import { deleteCharacter, loadCharacter, saveCharacter } from '../../src/character/store';
import { emptyCharacter } from '../../src/character/types';
import { Editor } from '../../src/ui/editor/Editor';
import { PickList } from '../../src/ui/editor/PickList';

Element.prototype.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
beforeEach(() => { localStorage.clear(); location.hash = ''; });
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
  expect(loadCharacter()).toMatchObject({ classes: [{ cls: 'wizard', level: 2, sub: 'school-of-evocation' }], spells: [] });
  expect(r.getByText('Character level 2')).toBeTruthy();
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
