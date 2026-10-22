import { cleanup, render, waitFor } from '@testing-library/preact';
import { Menu } from '../../src/ui/screens/Menu';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { motionMode } from '../../src/motion/mode';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/settings/settings';

const proto = SVGElement.prototype as unknown as Record<string, unknown>;
const eproto = Element.prototype as unknown as Record<string, unknown>;
beforeEach(() => {
  proto.getTotalLength = () => 100;
  eproto.animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
  delete proto.getTotalLength; delete eproto.animate;
});

test('motionMode: Off wins, reduced motion is static, otherwise animated', () => {
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' }); expect(motionMode()).toBe('off');
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'faint' }); expect(motionMode()).toBe('animated');
  vi.stubGlobal('matchMedia', () => ({ matches: true })); expect(motionMode()).toBe('static');
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' }); expect(motionMode()).toBe('off');
});

test('spell rows get a motif layer, other rows do not', () => {
  const r = render(<Menu cls="sorcerer" level={5} />);
  const rows = [...r.container.querySelectorAll('a.row')];
  const withFx = rows.filter(a => a.querySelector('svg.fx-row'));
  expect(withFx.map(a => a.querySelector('.rl > span:last-child')!.textContent)).toEqual(['Cantrips', ...Array.from({ length: 9 }, (_, i) => `Level ${i + 1} Spells`)]);
  expect(rows.find(a => a.textContent === 'Actions')!.querySelector('svg')).toBeNull();
  expect(withFx[0].querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
});
test('Eldritch Knight rows use the wizard motif', () => {
  const r = render(<Menu cls="fighter" level={3} sub="eldritch-knight" />);
  expect(r.container.querySelector('svg.fx-row')!.getAttribute('style')).toContain('--wizard-line');
});
test('reduced motion: static frame, no animations', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const r = render(<Menu cls="wizard" level={3} />);
  await waitFor(() => expect(r.container.querySelector('svg.fx-row path')).toBeTruthy());
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});
test('Animation: Off renders no motif layers at all', () => {
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
  const r = render(<Menu cls="wizard" level={3} />);
  expect(r.container.querySelector('svg.fx-row')).toBeNull();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});
test('unmount stops the loop before its start delay ends', async () => {
  vi.useFakeTimers();
  const r = render(<Menu cls="wizard" level={3} />);
  r.unmount();
  await vi.advanceTimersByTimeAsync(5000);
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
