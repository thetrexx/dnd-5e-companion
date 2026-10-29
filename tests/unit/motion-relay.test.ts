import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { joinRelay } from '../../src/motion/relay';

let els: HTMLElement[], leaves: (() => void)[];
const rows = (n: number) => { const r = Array.from({ length: n }, () => document.body.appendChild(document.createElement('div'))); els.push(...r); return r; };
// a turn that lasts ms of fake time, or until its signal aborts
const turnOf = (log: number[], i: number, ms = 1000, on?: { now: number; most: number }) => (sig: AbortSignal) => new Promise<void>(res => {
  log.push(i);
  if (on) on.most = Math.max(on.most, ++on.now);
  const end = () => { clearTimeout(t); if (on) on.now--; res(); };
  const t = setTimeout(end, ms);
  sig.addEventListener('abort', end);
});
beforeEach(() => { vi.useFakeTimers(); els = []; leaves = []; });
afterEach(async () => {
  leaves.forEach(l => l());
  await vi.advanceTimersByTimeAsync(0);
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers(); vi.unstubAllGlobals();
  els.forEach(e => e.remove());
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
});

test('one turn at a time, down the list in page order, wrapping round', async () => {
  const log: number[] = [], on = { now: 0, most: 0 };
  const r = rows(3);
  // joined bottom first: the order still follows the page
  leaves = [2, 1, 0].map(i => joinRelay(r[i]!, turnOf(log, i, 1000, on)));
  await vi.advanceTimersByTimeAsync(1000);
  expect(log).toEqual([]); // a moment of stillness first
  await vi.advanceTimersByTimeAsync(5000);
  expect(log.slice(0, 4)).toEqual([0, 1, 2, 0]);
  expect(on.most).toBe(1);
});
test('rows off screen are skipped; a row that leaves the screen ends its turn at once', async () => {
  const cbs = new Map<Element, (es: { isIntersecting: boolean }[]) => void>();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(public cb: (es: { isIntersecting: boolean }[]) => void) {}
    observe(el: Element) { cbs.set(el, this.cb); } disconnect() {}
  });
  const r = rows(3), log: number[] = [], show = (i: number, v: boolean) => cbs.get(r[i]!)!([{ isIntersecting: v }]);
  leaves = r.map((el, i) => joinRelay(el, turnOf(log, i, 60000)));
  show(1, true); show(2, true);
  await vi.advanceTimersByTimeAsync(1500);
  expect(log).toEqual([1]);
  show(1, false);
  await vi.advanceTimersByTimeAsync(500);
  expect(log).toEqual([1, 2]);
});
test('nothing on screen, or a hidden page: no turn until that changes', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const log: number[] = [];
  leaves = [joinRelay(rows(1)[0]!, turnOf(log, 0))];
  await vi.advanceTimersByTimeAsync(10000);
  expect(log).toEqual([]);
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  leaves.push(joinRelay(rows(1)[0]!, turnOf(log, 1)));
  await vi.advanceTimersByTimeAsync(10000);
  expect(log).toEqual([]);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(100);
  expect(log).toEqual([1]);
});
test('everyone leaving mid-turn ends the turn and the relay; a new list starts afresh', async () => {
  const log: number[] = [];
  leaves = rows(2).map((el, i) => joinRelay(el, turnOf(log, i, 60000)));
  await vi.advanceTimersByTimeAsync(1500);
  expect(log).toEqual([0]);
  leaves.forEach(l => l()); leaves = [];
  await vi.advanceTimersByTimeAsync(0);
  expect(vi.getTimerCount()).toBe(0);
  leaves = [joinRelay(rows(1)[0]!, turnOf(log, 9))];
  await vi.advanceTimersByTimeAsync(1500);
  expect(log).toEqual([0, 9]);
});
