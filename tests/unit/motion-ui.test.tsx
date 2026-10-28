import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { Menu } from '../../src/ui/screens/Menu';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { motionMode } from '../../src/motion/mode';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/settings/settings';
import { Background } from '../../src/ui/Background';
import { App } from '../../src/app';

const proto = SVGElement.prototype as unknown as Record<string, unknown>;
const eproto = Element.prototype as unknown as Record<string, unknown>;
const TOKENS = ['--warlock-mist', '--sorcerer-blood', '--sorcerer-blood-hi'];
// let fake time pass inside act, so re-renders it triggers are applied
const pass = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const fakeCtx = () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() });
beforeEach(() => {
  proto.getTotalLength = () => 100;
  // never finishes: with no IntersectionObserver in jsdom, a loop whose cycles finished at once would spin
  // through microtasks without yielding (and grow the mock's call log) once its start delay ends
  eproto.animate = vi.fn(() => ({ finished: new Promise(() => {}), cancel: vi.fn() }));
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
  // inside act, so the deferred effect cleanups run (abort the loop) before any start delay can end
  act(() => { r.unmount(); });
  await vi.advanceTimersByTimeAsync(5000);
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
test('reduced motion: a resize redraws the row motifs after a short pause', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const r = render(<Menu cls="wizard" level={3} />);
  const first = r.container.querySelector('svg.fx-row path')!;
  expect(first).toBeTruthy();
  vi.stubGlobal('innerWidth', innerHeight); vi.stubGlobal('innerHeight', 1024); // rotated
  dispatchEvent(new Event('orientationchange'));
  await pass(200);
  expect(first.isConnected).toBe(true);
  await pass(100);
  expect(first.isConnected).toBe(false);
  expect(r.container.querySelector('svg.fx-row path')).toBeTruthy();
});
test('rows off screen hold their next cycle until they scroll into view', async () => {
  vi.useFakeTimers();
  const ios: { cb(es: { isIntersecting: boolean }[]): void; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = vi.fn(); constructor(public cb: () => void) { ios.push(this); } });
  const r = render(<Menu cls="wizard" level={3} />);
  await vi.advanceTimersByTimeAsync(4000);
  expect(ios.length).toBeGreaterThan(0);
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  ios.forEach(io => io.cb([{ isIntersecting: true }]));
  await vi.advanceTimersByTimeAsync(0);
  expect(Element.prototype.animate).toHaveBeenCalled();
  act(() => { r.unmount(); }); // inside act, so the deferred effect cleanups run
  expect(ios.every(io => io.disconnect.mock.calls.length > 0)).toBe(true);
});
// a stand-in Animation on fake time: ends after delay + duration of playing time, holds while paused
class TimedAnim {
  playState: AnimationPlayState = 'running';
  finished: Promise<void>; left: number; since = 0; t?: ReturnType<typeof setTimeout>; res = () => {};
  pause = vi.fn(() => { clearTimeout(this.t); this.left -= Date.now() - this.since; this.playState = 'paused'; });
  play = vi.fn(() => { this.playState = 'running'; this.arm(); });
  cancel = vi.fn(() => { clearTimeout(this.t); this.playState = 'idle'; });
  constructor(o?: KeyframeAnimationOptions) {
    // jsdom rows measure 0 wide, which leaves some motif timings NaN: give those a second
    const t = Number(o?.delay ?? 0) + Number(o?.duration ?? 0);
    this.left = Number.isFinite(t) ? t : 1000;
    this.finished = new Promise(r => { this.res = r; });
    this.arm();
  }
  arm() { this.since = Date.now(); this.t = setTimeout(() => { this.playState = 'finished'; this.res(); }, this.left); }
}
test('a row scrolled off screen pauses its running cycle and resumes it on return', async () => {
  vi.useFakeTimers();
  const ios: { cb(es: { isIntersecting: boolean }[]): void; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = vi.fn(); constructor(public cb: () => void) { ios.push(this); } });
  const anims: TimedAnim[] = [];
  eproto.animate = vi.fn((_k: unknown, o?: KeyframeAnimationOptions) => { const a = new TimedAnim(o); anims.push(a); return a; });
  const r = render(<Menu cls="wizard" level={3} />);
  await vi.advanceTimersByTimeAsync(4000);
  ios.forEach(io => io.cb([{ isIntersecting: true }]));
  await vi.advanceTimersByTimeAsync(0);
  const started = anims.length;
  expect(started).toBeGreaterThan(0);
  ios.forEach(io => io.cb([{ isIntersecting: false }]));
  expect(anims.every(a => a.pause.mock.calls.length === 1)).toBe(true);
  // off screen: nothing ends, so no wither and no next cycle
  await vi.advanceTimersByTimeAsync(60000);
  expect(anims).toHaveLength(started);
  ios.forEach(io => io.cb([{ isIntersecting: true }]));
  expect(anims.every(a => a.play.mock.calls.length === 1)).toBe(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(anims.length).toBeGreaterThan(started);
  act(() => { r.unmount(); }); // inside act, so the deferred effect cleanups run
  expect(ios.every(io => io.disconnect.mock.calls.length > 0)).toBe(true);
});
test('reduced motion: no screen watching for a still row', async () => {
  const io = vi.fn();
  vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = vi.fn(); constructor() { io(); } });
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const r = render(<Menu cls="wizard" level={3} />);
  await waitFor(() => expect(r.container.querySelector('svg.fx-row path')).toBeTruthy());
  expect(io).not.toHaveBeenCalled();
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
  test('a resize restarts the background after a short pause', async () => {
    vi.useFakeTimers();
    const r = render(<Background kind="cleric" theme="faerun" />), c = r.container;
    await pass(0);
    const first = c.querySelector('svg.fx-bg path')!;
    expect(first).toBeTruthy();
    // a phone's address bar sliding away: small height change, no restart
    vi.stubGlobal('innerHeight', innerHeight - 60); dispatchEvent(new Event('resize'));
    await pass(300);
    expect(first.isConnected).toBe(true);
    vi.stubGlobal('innerWidth', innerWidth - 300); dispatchEvent(new Event('resize')); dispatchEvent(new Event('resize'));
    await pass(200);
    expect(first.isConnected).toBe(true);
    await pass(100);
    expect(first.isConnected).toBe(false);
    expect(c.querySelector('svg.fx-bg path')).toBeTruthy();
    act(() => { r.unmount(); }); // inside act, so the deferred effect cleanups run
    expect(vi.getTimerCount()).toBe(0);
  });
  test('artificer page: an unmasked spark layer beside the background, sparks drawn into it', async () => {
    eproto.scrollTo = () => {}; // jsdom has no scrolling
    location.hash = '#/menu/artificer/5';
    const c = render(<App />).container, sparks = c.querySelector('svg.fx-sparks')!;
    expect(sparks).toBeTruthy();
    expect(sparks.closest('.fx-bg')).toBeNull();
    expect(sparks.parentElement!.classList.contains('fx-bg-wrap')).toBe(true);
    await waitFor(() => expect(sparks.querySelector('circle.spark')).toBeTruthy());
    expect(c.querySelector('svg.fx-bg circle.spark')).toBeNull();
    expect(render(<Background kind="cleric" theme="faerun" />).container.querySelector('svg.fx-sparks')).toBeNull();
  });
  test('artificer, reduced motion: a still frame with no sparks', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const c = render(<Background kind="artificer" theme="faerun" />).container;
    await waitFor(() => expect(c.querySelector('svg.fx-bg path')).toBeTruthy());
    expect(c.querySelector('svg.fx-sparks')).toBeTruthy();
    expect(c.querySelector('circle.spark')).toBeNull();
    expect(Element.prototype.animate).not.toHaveBeenCalled();
  });
  test('artificer, Animation Off: no background svg at all', () => {
    saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
    const c = render(<Background kind="artificer" theme="faerun" />).container;
    expect(c.querySelector('svg, canvas')).toBeNull();
    expect(Element.prototype.animate).not.toHaveBeenCalled();
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
