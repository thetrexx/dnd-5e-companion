import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { Menu } from '../../src/ui/screens/Menu';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { motionMode } from '../../src/motion/mode';
import { DEFAULT_SETTINGS, saveSettings } from '../../src/settings/settings';
import { Background } from '../../src/ui/Background';
import { App } from '../../src/app';
import { STRAND_TILE, strandMask } from '../../src/motion/strands';
import { Strands } from '../../src/ui/Strands';
import { Start } from '../../src/ui/screens/Start';

const proto = SVGElement.prototype as unknown as Record<string, unknown>;
const eproto = Element.prototype as unknown as Record<string, unknown>;
const TOKENS = ['--warlock-mist', '--sorcerer-blood', '--sorcerer-blood-hi', '--mist-blur'];
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
test('rows off screen take no turn until they scroll into view', async () => {
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
// every animate call with its row, on fake time
const rowAnims = () => {
  const log: { row: Element | null; a: TimedAnim }[] = [];
  eproto.animate = vi.fn(function (this: Element, _k: unknown, o?: KeyframeAnimationOptions) {
    const a = new TimedAnim(o); log.push({ row: this.closest('a.row'), a }); return a;
  });
  return log;
};
const playing = (log: { row: Element | null; a: TimedAnim }[]) => new Set(log.filter(x => x.a.playState === 'running').map(x => x.row));
// every row animating at once was too slow on phones: they stand still and take turns
test('spell rows stand drawn and still, then take turns one at a time down the list', async () => {
  vi.useFakeTimers();
  const log = rowAnims();
  const r = render(<Menu cls="wizard" level={3} />);
  const rows = [...r.container.querySelectorAll('a.row')].filter(a => a.querySelector('svg.fx-row'));
  expect(rows).toHaveLength(10);
  expect(rows.every(a => a.querySelector('svg.fx-row path'))).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(log).toHaveLength(0);
  const order: Element[] = [];
  for (let t = 0; t < 240; t++) {
    await vi.advanceTimersByTimeAsync(500);
    const now = playing(log);
    expect(now.size).toBeLessThanOrEqual(1);
    for (const row of now) if (row && order[order.length - 1] !== row) order.push(row);
  }
  expect(order.slice(0, 11)).toEqual([...rows, rows[0]]);
  act(() => { r.unmount(); }); // inside act, so the deferred effect cleanups run
  await vi.advanceTimersByTimeAsync(0);
  expect(log.every(x => x.a.playState !== 'running')).toBe(true);
});
test('a row that scrolls off mid-turn shows its drawing whole at once, and the next row on screen goes', async () => {
  vi.useFakeTimers();
  const cbs = new Map<Element, (es: { isIntersecting: boolean }[]) => void>();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(public cb: (es: { isIntersecting: boolean }[]) => void) {}
    observe(el: Element) { cbs.set(el, this.cb); } disconnect() {}
  });
  const log = rowAnims();
  const r = render(<Menu cls="wizard" level={3} />);
  const rows = [...r.container.querySelectorAll('a.row')].filter(a => a.querySelector('svg.fx-row'));
  rows.forEach(row => cbs.get(row)!([{ isIntersecting: true }]));
  await vi.advanceTimersByTimeAsync(1300);
  expect([...playing(log)]).toEqual([rows[0]]);
  cbs.get(rows[0]!)!([{ isIntersecting: false }]);
  await vi.advanceTimersByTimeAsync(0);
  expect(log.filter(x => x.row === rows[0]).every(x => x.a.playState !== 'running')).toBe(true);
  expect([...rows[0]!.querySelectorAll<SVGPathElement>('svg.fx-row path')].every(p => p.style.strokeDashoffset === '0')).toBe(true);
  await vi.advanceTimersByTimeAsync(400);
  expect([...playing(log)]).toEqual([rows[1]]);
  act(() => { r.unmount(); });
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
  // blurring the full-screen layer every frame was slow on phones: the small canvas is blurred before it is scaled up
  test('mist and blood blur their small canvas, not the screen-sized layer', () => {
    const ctx = { ...fakeCtx(), filter: 'none', clearRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.documentElement.style.setProperty('--warlock-mist', '#a77be0');
    document.documentElement.style.setProperty('--mist-blur', '5px');
    const cv = render(<Background kind="warlock" theme="faerun" />).container.querySelector<HTMLCanvasElement>('canvas.fx-mist')!;
    expect(ctx.filter).toBe('blur(1px)'); // 5px over a canvas 5 times coarser than the screen
    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
    expect(cv.style.filter).toBe('');
    const css = readFileSync('src/styles/motion.css', 'utf8');
    expect(css).not.toMatch(/\.fx-mist\{[^}]*filter/);
    expect(css).not.toMatch(/\.fx-blood\{[^}]*filter/);
  });
  test('no canvas filters (older Safari): the browser blurs the layer instead', () => {
    const ctx = fakeCtx();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.documentElement.style.setProperty('--warlock-mist', '#a77be0');
    document.documentElement.style.setProperty('--mist-blur', '5px');
    const cv = render(<Background kind="warlock" theme="faerun" />).container.querySelector<HTMLCanvasElement>('canvas.fx-mist')!;
    expect(cv.style.filter).toBe('blur(5px)');
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

describe('strands', () => {
  const rects = (box: [number, number], screen: number) => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const [w, h] = this.matches('.strands') ? box : this.matches('.screen') ? [screen, 0] : [0, 0];
    return { width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) };
  });
  // a pen per canvas that records what it was painted with
  let pens: { fill: string; filter: string; fills: number }[];
  const view = () => render(<div class="screen"><Strands cls="bard" /></div>);
  const canvases = (c: Element) => [...c.querySelectorAll<HTMLCanvasElement>('.strands canvas')];
  const slide = (cv: Element) => [...cv.classList].filter(k => k === 'strand-l' || k === 'strand-r');
  const secs = (cv: Element) => +/animation-duration:\s*([\d.]+)s/.exec(cv.getAttribute('style') ?? '')![1]!;
  beforeEach(() => {
    pens = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      const pen = { fill: '', filter: '', fills: 0 };
      pens.push(pen);
      return {
        scale: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(), fill: () => { pen.fills++; },
        set fillStyle(v: string) { pen.fill = v; }, set filter(v: string) { pen.filter = v; },
      } as unknown as CanvasRenderingContext2D;
    });
    document.documentElement.style.setProperty('--bard', 'tan');
    document.documentElement.style.setProperty('--bard-line', 'teal');
    rects([390, 74], 390);
  });
  afterEach(() => { for (const t of ['--bard', '--bard-line']) document.documentElement.style.removeProperty(t); });
  // redrawing the blurred strands every frame was too slow on phones: each is painted once and slid by CSS
  test('animated: each strand painted once, into a half-resolution strip one tile wider, then slid', () => {
    const c = view().container, [a, b] = canvases(c);
    expect(pens.map(p => p.fills)).toEqual([1, 1]);
    expect([a!.width, a!.height]).toEqual([Math.ceil((390 + STRAND_TILE) / 2), 37]);
    expect(pens[0]!.filter).toBe('blur(1.1px)');
    expect(slide(a!)).toHaveLength(1); expect(slide(b!)).toHaveLength(1);
    expect(slide(a!)).not.toEqual(slide(b!));
    expect(secs(b!)).toBeCloseTo(secs(a!) / .9, 0);
    expect(Element.prototype.animate).not.toHaveBeenCalled();
  });
  test('reduced motion: painted once, never slid', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const cs = canvases(view().container);
    expect(pens.map(p => p.fills)).toEqual([1, 1]);
    expect(cs.flatMap(slide)).toEqual([]);
  });
  test('Animation Off: strands still painted, never slid', () => {
    saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
    const cs = canvases(view().container);
    expect(pens.map(p => p.fills)).toEqual([1, 1]);
    expect(cs.flatMap(slide)).toEqual([]);
  });
  test('a resize repaints the strands after a short pause', async () => {
    vi.useFakeTimers();
    const c = view().container;
    expect(pens).toHaveLength(2);
    rects([300, 74], 300);
    vi.stubGlobal('innerWidth', innerWidth - 300);
    dispatchEvent(new Event('resize'));
    await pass(200);
    expect(pens).toHaveLength(2);
    await pass(100);
    expect(pens).toHaveLength(4);
    expect(canvases(c)[0]!.width).toBe(Math.ceil((300 + STRAND_TILE) / 2));
  });
  test('colours come from tokens, strength from the strand classes', () => {
    const [a, b] = canvases(view().container);
    expect(pens.map(p => p.fill)).toEqual(['tan', 'teal']);
    expect(a!.classList.contains('strand-a')).toBe(true);
    expect(b!.classList.contains('strand-b')).toBe(true);
    const css = readFileSync('src/styles/motion.css', 'utf8');
    expect(css).toContain('.strand-a{opacity:calc(var(--strand-a-o) * var(--motion-i, 1))}');
    expect(css).toContain('.strand-b{opacity:calc(var(--strand-b-o) * var(--motion-i, 1))}');
  });
  test('the fade is a still mask on the frame, from the measured window and column', () => {
    rects([1280, 74], 480);
    const el = view().container.querySelector<HTMLElement>('.strands')!;
    expect(el.style.getPropertyValue('--strand-mask')).toBe(strandMask(1280, 480));
    expect(el.style.getPropertyValue('--strand-tile')).toBe(`${STRAND_TILE}px`);
  });
  test('no layout: nothing painted', () => {
    rects([0, 0], 0);
    expect(canvases(view().container)).toHaveLength(2);
    expect(pens).toEqual([]);
  });
});

describe('start', () => {
  const me = (c: Element) => c.querySelector('button.start-me')!;
  // thirteen animated class rows were too slow on phones: the start menu shows each one's still frame
  test('start, animated: class art holds still, while a spell list animates', async () => {
    vi.useFakeTimers();
    const c = render(<Start />).container;
    await pass(5000);
    expect(c.querySelectorAll('svg.fx-row')).toHaveLength(13);
    expect(me(c).classList.contains('shine')).toBe(true);
    expect(Element.prototype.animate).not.toHaveBeenCalled();
    cleanup();
    render(<Menu cls="wizard" level={3} />);
    await pass(5000);
    expect(Element.prototype.animate).toHaveBeenCalled();
  });
  test('start, Animation Off: strands stay, no class animation, no shine', () => {
    saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
    const c = render(<Start />).container;
    expect(c.querySelectorAll('.strands')).toHaveLength(13);
    expect(c.querySelectorAll('svg.fx-row')).toHaveLength(0);
    expect(me(c).classList.contains('shine')).toBe(false);
  });
  test('start, reduced motion: no shine', () => {
    expect(me(render(<Start />).container).classList.contains('shine')).toBe(true);
    cleanup();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const c = render(<Start />).container;
    expect(me(c).classList.contains('shine')).toBe(false);
    expect(c.querySelectorAll('.strands')).toHaveLength(13);
  });
});
