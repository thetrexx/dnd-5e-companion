import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { onScreen, renderParts, runLoop, watchScreen } from '../../src/motion/engine';
import { ROW_MOTIFS } from '../../src/motion/rowMotifs';
import { seeded } from '../../src/motion/rand';
import { mover, shape } from '../../src/motion/parts';
import { ROW_TIMING, type Part } from '../../src/motion/types';

const NS = 'http://www.w3.org/2000/svg';
const proto = SVGElement.prototype as unknown as Record<string, unknown>;
const eproto = Element.prototype as unknown as Record<string, unknown>;
const mkSvg = () => document.createElementNS(NS, 'svg') as SVGSVGElement;
let host: HTMLElement, svg: SVGSVGElement, cancels: ReturnType<typeof vi.fn>[];

beforeEach(() => {
  host = document.createElement('div');
  host.getBoundingClientRect = () => ({ width: 320, height: 38 }) as DOMRect;
  svg = mkSvg();
  cancels = [];
  proto.getTotalLength = () => 100;
  eproto.animate = vi.fn(() => { const cancel = vi.fn(); cancels.push(cancel); return { finished: Promise.resolve(), cancel }; });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete proto.getTotalLength;
  delete eproto.animate;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});

test('static frame when animation is off', async () => {
  const anim = vi.spyOn(Element.prototype, 'animate');
  await runLoop(host, svg, ROW_MOTIFS.wizard!, ROW_TIMING, { animate: false, alive: () => true, rnd: seeded(1) });
  expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  expect([...svg.querySelectorAll('path')].every(p => (p as SVGPathElement).style.strokeDashoffset === '0' || !p.style.strokeDasharray)).toBe(true);
  expect([...svg.querySelectorAll<SVGGElement>('g.pop')].every(g => g.style.opacity === '')).toBe(true);
  expect(svg.getAttribute('viewBox')).toBe('0 0 320 38');
  expect(anim).not.toHaveBeenCalled();
});
test('no Web Animations: falls back to the static frame', async () => {
  delete eproto.animate;
  await runLoop(host, svg, ROW_MOTIFS.wizard!, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(1) });
  expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
});
test('no getTotalLength: static frame without dashes', async () => {
  delete proto.getTotalLength;
  await runLoop(host, svg, ROW_MOTIFS.wizard!, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(1) });
  expect(Element.prototype.animate).not.toHaveBeenCalled();
  expect([...svg.querySelectorAll('path')].every(p => !p.style.strokeDasharray)).toBe(true);
});
test('animated: grows then withers, stops when not alive', async () => {
  let cycles = 0;
  await runLoop(host, svg, (W, H, r) => { cycles++; return ROW_MOTIFS.bard!(W, H, r); }, ROW_TIMING,
    { animate: true, alive: () => cycles < 2, rnd: seeded(2) });
  expect(cycles).toBe(2);
  expect(Element.prototype.animate).toHaveBeenCalled();
});
test('arms and animates lines from L to 0, then 0 to -L', async () => {
  let n = 0;
  await runLoop(host, svg, () => [{ kind: 'line', d: 'M0 0L5 5', at: 0, dur: 1000 }], ROW_TIMING,
    { animate: true, alive: () => n++ < 3, rnd: seeded(3) });
  const path = svg.querySelector('path')!;
  expect(path.style.strokeDasharray).toBe('100 101');
  expect(path.style.strokeDashoffset).toBe('100');
  const calls = vi.mocked(Element.prototype.animate).mock.calls;
  expect(calls[0]![0]).toEqual([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }]);
  expect(calls[0]![1]).toMatchObject({ duration: 1000, delay: 0, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  expect(calls.some(([k]) => JSON.stringify(k) === JSON.stringify([{ strokeDashoffset: 0 }, { strokeDashoffset: -100 }]))).toBe(true);
});
test('cancels running animations once not alive', async () => {
  let n = 0;
  await runLoop(host, svg, () => [{ kind: 'pop', x: 1, y: 2, rot: 0, at: 0, shapes: [{ tag: 'circle', attrs: { r: 1 } }] }], ROW_TIMING,
    { animate: true, alive: () => n++ < 2, rnd: seeded(3) });
  expect(svg.querySelector<SVGGElement>('g.pop')!.style.opacity).toBe('0');
  expect(cancels.length).toBeGreaterThan(0);
  expect(cancels.every(c => c.mock.calls.length === 1)).toBe(true);
});
test('waits while the tab is hidden', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  let cycles = 0;
  const p = runLoop(host, svg, () => { cycles++; return []; }, ROW_TIMING, { animate: true, alive: () => cycles < 1, rnd: seeded(2) });
  await new Promise(r => setTimeout(r, 20));
  expect(cycles).toBe(0);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  await p;
  expect(cycles).toBe(1);
});
test('startDelay waits before the first cycle', async () => {
  let cycles = 0;
  const p = runLoop(host, svg, () => { cycles++; return []; }, ROW_TIMING, { animate: true, alive: () => cycles < 1, rnd: seeded(2), startDelay: 30 });
  await new Promise(r => setTimeout(r, 5));
  expect(cycles).toBe(0);
  await p;
  expect(cycles).toBe(1);
});
test('renderParts builds paths and pop groups with classes', () => {
  const r = renderParts(svg, [{ kind: 'line', d: 'M0 0L5 5', at: 0, dur: 100, cls: 'thin' },
    { kind: 'pop', x: 1, y: 2, rot: 0, at: .5, shapes: [{ tag: 'circle', attrs: { r: 1 }, cls: 'fill' }] }]);
  expect(r).toHaveLength(2);
  expect(svg.querySelector('path.thin')).toBeTruthy();
  expect(svg.querySelector('g.pop circle.fill')).toBeTruthy();
});
test('renderParts: pop transform and scale, move group, shape attrs', () => {
  const r = renderParts(svg, [
    { kind: 'pop', x: 1.25, y: 2, rot: 30, scale: 2, at: 0, shapes: [{ tag: 'ellipse', attrs: { rx: 2.2, ry: 1.6, transform: 'rotate(-20)' } }] },
    { kind: 'move', x: 3, y: 4, at: .1, dur: 500, frames: [{ opacity: 0 }, { opacity: 1 }], shapes: [{ tag: 'path', attrs: { d: 'M0 0L1 1' }, cls: 'fill' }] },
  ]);
  const [pop, move] = [...svg.children] as SVGGElement[];
  expect(pop!.getAttribute('transform')).toBe('translate(1.3 2.0) rotate(30)');
  const scaled = pop!.querySelector('g.pop > g')!;
  expect(scaled.getAttribute('transform')).toBe('scale(2)');
  const ell = scaled.querySelector('ellipse')!;
  expect([ell.getAttribute('rx'), ell.getAttribute('ry'), ell.getAttribute('transform')]).toEqual(['2.2', '1.6', 'rotate(-20)']);
  expect(ell.hasAttribute('class')).toBe(false);
  expect(move!.getAttribute('transform')).toBe('translate(3.0 4.0)');
  expect(move!.querySelector('g.pop > path.fill')!.getAttribute('d')).toBe('M0 0L1 1');
  expect(r[0]!.el).toBe(pop!.querySelector('g.pop'));
  expect(r[1]!.el).toBe(move!.querySelector('g.pop'));
});
const SPIN: Part = { kind: 'spin', cx: 5, cy: 6, deg: 90, parts: [
  { kind: 'line', d: 'M0 0L5 5', at: 0, dur: 1000 },
  { kind: 'pop', x: 5, y: 6, rot: 0, at: .1, shapes: [{ tag: 'circle', attrs: { r: 1 }, cls: 'accf' }] },
] };
const SPARK: Part = { kind: 'spark', x: 10, y: 12, r: 1.2, at: 1.2, dur: 900, frames: [{ opacity: 0 }, { opacity: 1 }] };
const kf = (k: unknown) => JSON.stringify(k);
test('renderParts: a spin puts its children inside one group', () => {
  const r = renderParts(svg, [SPIN]);
  expect(svg.children).toHaveLength(1);
  const g = svg.children[0]!;
  expect(g.tagName).toBe('g');
  expect(g.querySelector(':scope > path')!.getAttribute('d')).toBe('M0 0L5 5');
  expect(g.querySelector('g.pop circle.accf')).toBeTruthy();
  expect(r.map(x => x.part.kind)).toEqual(['spin', 'line', 'pop']);
  expect(r[0]!.el).toBe(g);
});
test('still: a spin is drawn but never turns, sparks are not rendered', async () => {
  const over = mkSvg(), anim = vi.spyOn(Element.prototype, 'animate');
  over.appendChild(document.createElementNS(NS, 'circle'));
  await runLoop(host, svg, () => [SPIN, SPARK], ROW_TIMING, { animate: false, alive: () => true, rnd: seeded(1), over });
  expect(anim).not.toHaveBeenCalled();
  const g = svg.children[0] as SVGGElement;
  expect(g.querySelector('path')).toBeTruthy();
  expect(g.style.opacity).toBe('');
  expect(g.style.transformOrigin).toBe('');
  expect(svg.querySelector('circle:not(.accf)')).toBeNull();
  expect(over.querySelector('circle')).toBeNull();
});
test('animated: a spin turns over the whole cycle and adds nothing to the grow time', async () => {
  let n = 0;
  await runLoop(host, svg, () => [SPIN], ROW_TIMING, { animate: true, alive: () => n++ < 3, rnd: seeded(1) });
  const g = svg.children[0] as SVGGElement, calls = vi.mocked(Element.prototype.animate).mock.calls;
  expect(g.style.opacity).toBe('');
  expect(g.style.transformBox).toBe('view-box');
  expect(g.style.transformOrigin).toBe('5px 6px');
  const turn = calls.find(([k]) => kf(k).includes('rotate'))!;
  expect(turn[0]).toEqual([{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }]);
  // the line child ends at 1000; the hold follows it
  const { HOLD, WITHER } = ROW_TIMING;
  expect(turn[1]).toMatchObject({ duration: 1000 + HOLD + WITHER + 1500 });
  expect(calls.some(([k, o]) => kf(k) === '[]' && (o as KeyframeAnimationOptions).duration === 1000 + HOLD)).toBe(true);
  // children grow and wither like top-level parts
  expect(calls.some(([k]) => kf(k) === kf([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }]))).toBe(true);
  expect(calls.some(([k]) => kf(k) === kf([{ strokeDashoffset: 0 }, { strokeDashoffset: -100 }]))).toBe(true);
});
test('animated: sparks land in o.over and play their frames', async () => {
  const over = mkSvg();
  let n = 0;
  await runLoop(host, svg, () => [SPARK], ROW_TIMING, { animate: true, alive: () => n++ < 3, rnd: seeded(1), over });
  const c = over.querySelector('circle.spark')!;
  expect(c).toBeTruthy();
  expect([c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r')]).toEqual(['10.0', '12.0', '1.2']);
  expect(svg.querySelector('circle')).toBeNull();
  expect(over.getAttribute('viewBox')).toBe('0 0 320 38');
  const calls = vi.mocked(Element.prototype.animate).mock.calls;
  expect(calls.find(([k]) => kf(k) === kf(SPARK.kind === 'spark' && SPARK.frames))![1]).toMatchObject({ duration: 900, delay: 1.2 * ROW_TIMING.G });
});
test('animated: without o.over, sparks are dropped', async () => {
  let n = 0;
  await runLoop(host, svg, () => [SPARK], ROW_TIMING, { animate: true, alive: () => n++ < 3, rnd: seeded(1) });
  expect(svg.querySelector('circle')).toBeNull();
});
test('abort mid-grow cancels running animations and returns promptly', async () => {
  const pending: ReturnType<typeof vi.fn>[] = [];
  eproto.animate = vi.fn(() => {
    let fail = (_: unknown) => {};
    const finished = new Promise((_, rej) => { fail = rej; });
    const cancel = vi.fn(() => fail(new DOMException('cancelled', 'AbortError')));
    pending.push(cancel);
    return { finished, cancel };
  });
  const ac = new AbortController();
  const p = runLoop(host, svg, ROW_MOTIFS.bard!, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(2), signal: ac.signal });
  await new Promise(r => setTimeout(r, 5));
  expect(pending.length).toBeGreaterThan(0);
  ac.abort();
  await p;
  expect(pending.every(c => c.mock.calls.length === 1)).toBe(true);
});
test('abort while hidden removes the visibility listener and never draws', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  const off = vi.spyOn(document, 'removeEventListener');
  const gen = vi.fn(() => []);
  const ac = new AbortController();
  const p = runLoop(host, svg, gen, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(2), signal: ac.signal });
  await new Promise(r => setTimeout(r, 5));
  ac.abort();
  await p;
  expect(off).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  await new Promise(r => setTimeout(r, 5));
  expect(gen).not.toHaveBeenCalled();
});
test('abort during startDelay clears the timer and never calls gen', async () => {
  const clear = vi.spyOn(globalThis, 'clearTimeout');
  const gen = vi.fn(() => []);
  const ac = new AbortController();
  const p = runLoop(host, svg, gen, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(2), startDelay: 60000, signal: ac.signal });
  await new Promise(r => setTimeout(r, 5));
  ac.abort();
  await p;
  expect(clear).toHaveBeenCalled();
  expect(gen).not.toHaveBeenCalled();
});
test('already-aborted signal returns before drawing', async () => {
  const gen = vi.fn(() => []);
  await runLoop(host, svg, gen, ROW_TIMING, { animate: true, alive: () => true, signal: AbortSignal.abort() });
  expect(gen).not.toHaveBeenCalled();
  expect(Element.prototype.animate).not.toHaveBeenCalled();
});

// a stand-in IntersectionObserver: tests fire its callback by hand
class FakeIO {
  static all: FakeIO[] = [];
  observe = vi.fn(); disconnect = vi.fn();
  constructor(public cb: (es: { isIntersecting: boolean }[]) => void) { FakeIO.all.push(this); }
}
test('gate: no new cycle while off screen, the cycle runs once on screen', async () => {
  FakeIO.all = []; vi.stubGlobal('IntersectionObserver', FakeIO);
  let cycles = 0;
  const p = runLoop(host, svg, () => { cycles++; return []; }, ROW_TIMING, { animate: true, alive: () => cycles < 1, rnd: seeded(2), gate: onScreen(host) });
  await new Promise(r => setTimeout(r, 10));
  const [io] = FakeIO.all;
  expect(io!.observe).toHaveBeenCalledWith(host);
  io!.cb([{ isIntersecting: false }]);
  await new Promise(r => setTimeout(r, 10));
  expect(cycles).toBe(0);
  io!.cb([{ isIntersecting: true }]);
  await p;
  expect(cycles).toBe(1);
  expect(io!.disconnect).toHaveBeenCalled();
});
test('gate: abort while off screen disconnects the observer and never draws', async () => {
  FakeIO.all = []; vi.stubGlobal('IntersectionObserver', FakeIO);
  const gen = vi.fn(() => []), ac = new AbortController();
  const p = runLoop(host, svg, gen, ROW_TIMING, { animate: true, alive: () => true, rnd: seeded(2), signal: ac.signal, gate: onScreen(host) });
  await new Promise(r => setTimeout(r, 10));
  ac.abort();
  await p;
  expect(FakeIO.all[0]!.disconnect).toHaveBeenCalled();
  expect(gen).not.toHaveBeenCalled();
});
test('onScreen without IntersectionObserver lets the cycle run at once', async () => {
  vi.stubGlobal('IntersectionObserver', undefined);
  await onScreen(host)();
});

// a stand-in Animation: ends when told, records pause and play
const mkAnim = () => {
  let res = () => {};
  const a = {
    playState: 'running' as AnimationPlayState,
    finished: new Promise<void>(r => { res = r; }),
    end: () => { a.playState = 'finished'; res(); },
    cancel: vi.fn(() => { a.playState = 'idle'; }),
    pause: vi.fn(() => { a.playState = 'paused'; }),
    play: vi.fn(() => { a.playState = 'running'; }),
  };
  return a;
};
test('seen: off screen pauses what runs (and what starts while off), on screen plays only those', async () => {
  const anims: ReturnType<typeof mkAnim>[] = [];
  eproto.animate = vi.fn(() => { const a = mkAnim(); anims.push(a); return a; });
  let set = (_: boolean) => {};
  const unwatch = vi.fn(), ac = new AbortController();
  const p = runLoop(host, svg, () => [{ kind: 'line', d: 'M0 0L5 5', at: 0, dur: 1000 }], ROW_TIMING,
    { animate: true, alive: () => true, rnd: seeded(3), signal: ac.signal, seen: cb => { set = cb; return unwatch; } });
  await new Promise(r => setTimeout(r, 5));
  expect(anims).toHaveLength(2);
  const [grow, hold] = anims as [ReturnType<typeof mkAnim>, ReturnType<typeof mkAnim>];
  // off mid-hold: the hold pauses, the finished grow is left alone
  grow.end();
  set(false);
  expect(hold.pause).toHaveBeenCalledTimes(1);
  expect(grow.pause).not.toHaveBeenCalled();
  set(true);
  expect(hold.play).toHaveBeenCalledTimes(1);
  expect(grow.play).not.toHaveBeenCalled(); // playing a finished animation would replay it
  // the hold ends just as the row leaves: the wither it starts begins paused
  hold.end();
  set(false);
  await new Promise(r => setTimeout(r, 5));
  const later = anims.slice(2);
  expect(later.length).toBeGreaterThan(0);
  expect(later.every(a => a.playState === 'paused')).toBe(true);
  set(true);
  expect(later.every(a => a.play.mock.calls.length === 1)).toBe(true);
  expect(hold.play).toHaveBeenCalledTimes(1);
  ac.abort();
  expect(unwatch).toHaveBeenCalled(); // at once, not after the loop unwinds
  await p;
});
test('seen: a cycle that starts while already off screen starts fully paused, then plays on screen', async () => {
  const anims: ReturnType<typeof mkAnim>[] = [];
  eproto.animate = vi.fn(() => { const a = mkAnim(); anims.push(a); return a; });
  let set = (_: boolean) => {}, open = () => {};
  const gate = () => new Promise<void>(r => { open = r; });
  const ac = new AbortController();
  const p = runLoop(host, svg, () => [{ kind: 'line', d: 'M0 0L5 5', at: 0, dur: 1000 }, SPIN, SPARK], ROW_TIMING,
    { animate: true, alive: () => true, rnd: seeded(3), signal: ac.signal, gate, over: mkSvg(), seen: cb => { set = cb; return () => {}; } });
  await new Promise(r => setTimeout(r, 5));
  set(false); // off before the first cycle is allowed to start
  expect(anims).toHaveLength(0);
  open();
  await new Promise(r => setTimeout(r, 5));
  // grow (line, spin's pop), side (spin, spark) and the hold timer: all created, all paused
  expect(anims.length).toBeGreaterThanOrEqual(5);
  expect(anims.every(a => a.pause.mock.calls.length === 1 && a.playState === 'paused')).toBe(true);
  expect(anims.every(a => a.play.mock.calls.length === 0)).toBe(true);
  set(true);
  expect(anims.every(a => a.play.mock.calls.length === 1 && a.playState === 'running')).toBe(true);
  ac.abort();
  await p;
});
test('watchScreen reports on and off screen, and disconnects', () => {
  FakeIO.all = []; vi.stubGlobal('IntersectionObserver', FakeIO);
  const seen: boolean[] = [];
  const unwatch = watchScreen(host)(on => seen.push(on));
  const [io] = FakeIO.all;
  expect(io!.observe).toHaveBeenCalledWith(host);
  io!.cb([{ isIntersecting: true }]); io!.cb([{ isIntersecting: false }]);
  expect(seen).toEqual([true, false]);
  unwatch();
  expect(io!.disconnect).toHaveBeenCalled();
  vi.stubGlobal('IntersectionObserver', undefined);
  expect(() => watchScreen(host)(() => {})()).not.toThrow();
});

const FLY: Keyframe[] = Array.from({ length: 11 }, (_, k) => ({ offset: k / 10, transform: `translate(${k * 10}px, 0px)`, opacity: k === 0 || k === 10 ? 0 : 1 }));
const flier = (still?: number) => () => [mover(0, 0, 0, 1000, FLY, [shape('circle', { r: 2 })], still)];
test('static frame: a mover with still shows its nearest keyframe', async () => {
  await runLoop(host, svg, flier(.45), ROW_TIMING, { animate: false, alive: () => true, rnd: seeded(1) });
  const g = svg.querySelector<SVGGElement>('g.pop')!;
  expect(g.style.transform).toBe('translate(40px, 0px)');
  expect(g.style.opacity).toBe('1');
});
test('static frame: a mover without still stays at its start', async () => {
  await runLoop(host, svg, flier(), ROW_TIMING, { animate: false, alive: () => true, rnd: seeded(1) });
  expect(svg.querySelector<SVGGElement>('g.pop')!.style.transform).toBe('');
});
test('animated: still is ignored', async () => {
  let n = 0;
  await runLoop(host, svg, flier(.45), ROW_TIMING, { animate: true, alive: () => n++ < 3, rnd: seeded(1) });
  expect(svg.querySelector<SVGGElement>('g.pop')!.style.transform).toBe('');
  expect(vi.mocked(Element.prototype.animate).mock.calls.some(([k]) => kf(k) === kf(FLY))).toBe(true);
});
