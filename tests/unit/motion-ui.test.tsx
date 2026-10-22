import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { Menu } from '../../src/ui/screens/Menu';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { motionMode } from '../../src/motion/mode';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/settings/settings';
import { Background } from '../../src/ui/Background';
import { App } from '../../src/app';

const proto = SVGElement.prototype as unknown as Record<string, unknown>;
const eproto = Element.prototype as unknown as Record<string, unknown>;
const TOKENS = ['--warlock-mist', '--sorcerer-blood', '--sorcerer-blood-hi'];
const fakeCtx = () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() });
beforeEach(() => {
  proto.getTotalLength = () => 100;
  eproto.animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() }));
  // jsdom has no canvas
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); location.hash = '';
  for (const t of TOKENS) document.documentElement.style.removeProperty(t);
  delete proto.getTotalLength; delete eproto.animate; delete eproto.scrollTo;
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

describe('backgrounds', () => {
  // never finishes: a background loop (no start delay) holds on its first frame instead of spinning through microtasks
  beforeEach(() => { eproto.animate = vi.fn(() => ({ finished: new Promise(() => {}), cancel: vi.fn() })); });
  test('warlock background has mist, sorcerer has blood and cells, others neither', () => {
    expect(render(<Background kind="warlock" theme="faerun" />).container.querySelector('canvas.fx-mist')).toBeTruthy();
    const s = render(<Background kind="sorcerer" theme="faerun" />).container;
    expect(s.querySelector('canvas.fx-blood') && s.querySelector('svg.fx-cells')).toBeTruthy();
    expect(render(<Background kind="cleric" theme="faerun" />).container.querySelector('canvas')).toBeNull();
  });
  test('background layer: hidden, coloured by class, drawn by the loop', async () => {
    const c = render(<Background kind="cleric" theme="faerun" />).container;
    expect(c.querySelector('.fx-bg-wrap')!.getAttribute('aria-hidden')).toBe('true');
    const svg = c.querySelector('svg.fx-bg')!;
    expect(svg.getAttribute('style')).toContain('--fx-c: var(--cleric-line)');
    expect(svg.getAttribute('style')).toContain('--fx-o: var(--cleric-bg-o)');
    await waitFor(() => expect(svg.querySelector('path')).toBeTruthy());
    expect(render(<Background kind="none" theme="faerun" />).container.querySelector('svg.fx-bg')!.getAttribute('style')).toContain('--fx-c: var(--none-line)');
  });
  test('mist paints once its colour token resolves', () => {
    const ctx = fakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.documentElement.style.setProperty('--warlock-mist', '#a77be0');
    render(<Background kind="warlock" theme="faerun" />);
    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
  });
  test('Animation: Off renders no background layers', () => {
    saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
    const c = render(<Background kind="sorcerer" theme="faerun" />).container;
    expect(c.querySelector('svg, canvas')).toBeNull();
    expect(Element.prototype.animate).not.toHaveBeenCalled();
  });
  test('background persists across navigation within a class, restarts for another class', async () => {
    eproto.scrollTo = () => {}; // jsdom has no scrolling
    location.hash = '#/menu/bard/3';
    const r = render(<App />);
    const bg = r.container.querySelector('svg.fx-bg')!;
    expect(bg.getAttribute('style')).toContain('--bard-line');
    location.hash = '#/spells/bard/3';
    await waitFor(() => expect(r.container.querySelector('.screen.fixed')).toBeTruthy());
    expect(r.container.querySelector('svg.fx-bg')).toBe(bg);
    expect(bg.isConnected).toBe(true);
    location.hash = '#/menu/wizard/3';
    await waitFor(() => expect(r.container.querySelector('svg.fx-bg')!.getAttribute('style')).toContain('--wizard-line'));
    expect(bg.isConnected).toBe(false);
  });
  test('changing kind tears down the old layers', async () => {
    const frames: FrameRequestCallback[] = [], ctx = fakeCtx();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
    document.documentElement.style.setProperty('--sorcerer-blood', '#96121e');
    document.documentElement.style.setProperty('--sorcerer-blood-hi', '#c8323c');
    const run = (t: number) => frames.splice(0).forEach(f => f(t));
    const r = render(<Background key="sorcerer" kind="sorcerer" theme="faerun" />);
    const bg = r.container.querySelector('svg.fx-bg')!, cells = r.container.querySelector('svg.fx-cells')!;
    run(0); run(100);
    expect(ctx.putImageData).toHaveBeenCalled();
    expect(cells.querySelectorAll('g')).toHaveLength(7);
    r.rerender(<Background key="cleric" kind="cleric" theme="faerun" />);
    expect(bg.isConnected).toBe(false);
    expect(r.container.querySelector('canvas, svg.fx-cells')).toBeNull();
    await waitFor(() => expect(cells.children).toHaveLength(0));
    const painted = ctx.putImageData.mock.calls.length;
    run(200); run(300); run(400);
    expect(ctx.putImageData).toHaveBeenCalledTimes(painted);
  });
  test('choosing Off in Settings removes the background at once, Medium brings it back', async () => {
    location.hash = '#/settings';
    const r = render(<App />);
    expect(r.container.querySelector('svg.fx-bg')).toBeTruthy();
    const calls = vi.mocked(Element.prototype.animate).mock.calls.length;
    fireEvent.click(r.getByLabelText('Off'));
    await waitFor(() => expect(r.container.querySelector('svg.fx-bg')).toBeNull());
    await new Promise(res => setTimeout(res, 50)); // deferred effect cleanups run
    expect(Element.prototype.animate).toHaveBeenCalledTimes(calls);
    fireEvent.click(r.getByLabelText('Medium'));
    await waitFor(() => expect(r.container.querySelector('svg.fx-bg')).toBeTruthy());
  });
});
