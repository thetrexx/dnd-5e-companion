import { THEMES, applyTheme } from '../../src/theme/themes';

test('applyTheme sets data-theme', () => {
  expect(applyTheme('faerun')).toBe('faerun');
  expect(document.documentElement.dataset.theme).toBe('faerun');
});
test('unknown theme falls back', () => {
  expect(applyTheme('nope')).toBe('faerun');
  expect(document.documentElement.dataset.theme).toBe('faerun');
});
test('registry lists faerun', () => {
  expect(THEMES).toEqual([{ id: 'faerun', name: 'Faerûn' }]);
});
