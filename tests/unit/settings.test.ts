import { DEFAULT_SETTINGS, effectiveStrength, loadSettings, saveSettings } from '../../src/settings/settings';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

test('storage that throws gives defaults', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});
test('corrupt JSON gives defaults', () => { localStorage.setItem('dndcs.settings', '{oops'); expect(loadSettings()).toEqual(DEFAULT_SETTINGS); });
test('unknown theme in storage falls back', () => { localStorage.setItem('dndcs.settings', JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'gone' })); expect(loadSettings().theme).toBe('faerun'); });
test('reduced motion forces off', () => expect(effectiveStrength({ ...DEFAULT_SETTINGS, strength: 'strong' }, true)).toBe('off'));
test('round trip', () => { saveSettings({ ...DEFAULT_SETTINGS, strength: 'faint' }); expect(loadSettings().strength).toBe('faint'); });
test('writes never throw when storage is full', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
});

test('spellView defaults to mine, round trips, bad value falls back', () => {
  expect(loadSettings().spellView).toBe('mine');
  saveSettings({ ...DEFAULT_SETTINGS, spellView: 'all' });
  expect(loadSettings().spellView).toBe('all');
  localStorage.setItem('dndcs.settings', JSON.stringify({ ...DEFAULT_SETTINGS, spellView: 'everything' }));
  expect(loadSettings().spellView).toBe('mine');
});
