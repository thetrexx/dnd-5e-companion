import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderParts, runLoop } from '../../src/motion/engine';
import { ROW_MOTIFS } from '../../src/motion/rowMotifs';
import { seeded } from '../../src/motion/rand';
import { ROW_TIMING } from '../../src/motion/types';

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
