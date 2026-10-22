import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { ERR_NOT_CODE, encodeCharacter } from '../../src/character/code';
import { deleteCharacter, loadCharacter, saveCharacter } from '../../src/character/store';
import { emptyCharacter } from '../../src/character/types';
import { BackupCode } from '../../src/ui/BackupCode';

const lyra = { ...emptyCharacter(), name: 'Lyra', race: 'tiefling', classes: [{ cls: 'sorcerer' as const, level: 5, sub: 'draconic-bloodline' }],
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' as const }, { id: 'shield', cls: 'sorcerer' as const }] };

beforeEach(() => { cleanup(); deleteCharacter(); localStorage.clear(); });
test('export then import round trip', async () => {
  saveCharacter(lyra);
  const r = render(<BackupCode />);
  fireEvent.click(r.getByText('Make backup code'));
  const code = await waitFor(() => {
    const v = (r.getByLabelText('Backup code') as HTMLTextAreaElement).value;
    expect(v).toBeTruthy();
    return v;
  });
  expect(code).toMatch(/^SS[01]-/);
  fireEvent.click(r.getByText('Copy')); // no clipboard in jsdom: must not throw
  await waitFor(() => r.getByText('Select the code and copy it'));
  deleteCharacter();
  r.unmount();
  const r2 = render(<BackupCode />);
  fireEvent.input(r2.getByLabelText('Paste a backup code'), { target: { value: code } });
  fireEvent.click(r2.getByText('Restore'));
  await waitFor(() => expect(r2.getByText('Restored Lyra.')).toBeTruthy());
  expect(r2.getByText('Open character').getAttribute('href')).toBe('#/me');
  expect(loadCharacter()).toEqual(lyra);
});
test('no character: export replaced by hint', () => {
  const r = render(<BackupCode />);
  expect(r.queryByText('Make backup code')).toBeNull();
  expect(r.getByText('Create a character first, or restore one below.')).toBeTruthy();
});
test('bad code shows the error', async () => {
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: 'hello' } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => expect(r.getByRole('alert').textContent).toBe(ERR_NOT_CODE));
});
test('restoring over a character asks twice', async () => {
  saveCharacter({ ...lyra, name: 'Old' });
  const code = await encodeCharacter(lyra);
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: code } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText('This replaces Old. Press Restore again.'));
  expect(loadCharacter()!.name).toBe('Old');
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => expect(loadCharacter()!.name).toBe('Lyra'));
});
test('a bad code over a character errors at once, without asking', async () => {
  saveCharacter(lyra);
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: 'hello' } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => expect(r.getByRole('alert').textContent).toBe(ERR_NOT_CODE));
  expect(r.queryByText(/This replaces/)).toBeNull();
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: 'hello!' } });
  expect(r.queryByRole('alert')).toBeNull();
});
test('the confirmed restore uses the confirmed code; editing asks again', async () => {
  saveCharacter({ ...lyra, name: '' });
  const a = await encodeCharacter({ ...lyra, name: '' });
  const b = await encodeCharacter({ ...lyra, name: 'Bria' });
  const r = render(<BackupCode />);
  const box = r.getByLabelText('Paste a backup code');
  fireEvent.input(box, { target: { value: b } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText('This replaces your character. Press Restore again.'));
  fireEvent.input(box, { target: { value: a } });
  expect(r.queryByText(/This replaces/)).toBeNull();
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText(/This replaces/));
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText('Restored your character.'));
  expect(loadCharacter()!.name).toBe('');
});
test('restore drops picks the character cannot own', async () => {
  const code = await encodeCharacter({ ...lyra, options: ['maneuvers-trip-attack', 'metamagic-quickened-spell'] });
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: code } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText('Restored Lyra.'));
  expect(loadCharacter()!.options).toEqual(['metamagic-quickened-spell']);
});
