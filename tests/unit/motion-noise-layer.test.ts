import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { runNoise, type NoiseOptions } from '../../src/motion/noiseLayer';

let frames: ((t: number) => void)[] = [], ctx: unknown;
const fake = () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() });
const setHidden = (v: boolean) => Object.defineProperty(document, 'hidden', { configurable: true, get: () => v });
const raf = vi.fn((cb: (t: number) => void) => frames.push(cb));
const caf = vi.fn();
// run the next queued frame at time t
const step = (t: number) => { const f = frames.shift(); f?.(t); };

function setup(w = 400, h = 800) {
  const host = document.createElement('div'), cv = document.createElement('canvas');
  host.appendChild(cv);
  host.getBoundingClientRect = () => ({ width: w, height: h }) as DOMRect;
  return { host, cv };
}
const opts = (o: Partial<NoiseOptions> = {}) => ({ scale: 4, period: 1000, animate: true, alive: () => true, paint: vi.fn(), ...o } as NoiseOptions & { paint: ReturnType<typeof vi.fn> });

beforeEach(() => {
  frames = []; ctx = fake(); raf.mockClear(); caf.mockClear(); setHidden(false);
  vi.stubGlobal('requestAnimationFrame', raf);
  vi.stubGlobal('cancelAnimationFrame', caf);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ctx) as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setHidden(false); });

test('null 2D context: no crash, no frames', () => {
  ctx = null;
  const { host, cv } = setup(), stop = runNoise(cv, host, opts());
  expect(typeof stop).toBe('function');
  stop(); stop();
  expect(raf).not.toHaveBeenCalled();
});

test('getContext throwing: no-op stop', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('Not implemented'); });
  const { host, cv } = setup(), stop = runNoise(cv, host, opts());
  stop();
  expect(raf).not.toHaveBeenCalled();
});

test('static: paints once with e = 1', () => {
  const tick = vi.fn(), o = opts({ animate: false, tick }), { host, cv } = setup();
  runNoise(cv, host, o);
  expect(o.paint).toHaveBeenCalledTimes(1);
  expect((o.paint as ReturnType<typeof vi.fn>).mock.calls[0].slice(3)).toEqual([0, 1, 400, 800]);
  expect(tick).toHaveBeenCalledWith(0, 1, 0);
  expect(raf).not.toHaveBeenCalled();
});

test('throttles to 25 fps', () => {
  const o = opts(), { host, cv } = setup();
  runNoise(cv, host, o);
  for (const t of [0, 10, 20, 45, 50, 95]) step(t);
  expect(o.paint).toHaveBeenCalledTimes(3);
  expect(o.paint.mock.calls.map((c: number[]) => c[3])).toEqual([0, .045, .095]);
});

test('tick gets dt since the previous painted frame', () => {
  const tick = vi.fn(), { host, cv } = setup();
  runNoise(cv, host, opts({ tick }));
  for (const t of [0, 10, 50]) step(t);
  expect(tick.mock.calls.map(c => c[2])).toEqual([0, .05]);
});

test('e follows the envelope over the period', () => {
  const o = opts(), { host, cv } = setup();
  runNoise(cv, host, o);
  step(0); step(450);
  expect(o.paint.mock.calls.map((c: number[]) => c[4])).toEqual([0, 1]);
});

test('hidden time is excluded and nothing paints while hidden; stop cancels', () => {
  const o = opts(), { host, cv } = setup(), stop = runNoise(cv, host, o);
  step(0);
  setHidden(true); step(100); step(5000);
  expect(o.paint).toHaveBeenCalledTimes(1);
  setHidden(false); step(5100);
  expect(o.paint.mock.calls[1][3]).toBeCloseTo(.1, 5); // 5100 - 5000 hidden since 100
  stop(); stop();
  expect(caf).toHaveBeenCalledTimes(1);
  step(5200);
  expect(o.paint).toHaveBeenCalledTimes(2);
});

test('long gap between frames (rAF suspended in hidden tab) is not elapsed time', () => {
  const o = opts(), { host, cv } = setup();
  runNoise(cv, host, o);
  step(0); step(45); step(60045);
  const t = o.paint.mock.calls.map((c: number[]) => c[3]);
  expect(t[2]).toBeGreaterThanOrEqual(.045);
  expect(t[2]).toBeLessThan(.045 + .1);
});

test('hidden before the first painted frame: no negative elapsed', () => {
  const o = opts(), { host, cv } = setup();
  runNoise(cv, host, o);
  setHidden(true); step(100); setHidden(false); step(5000);
  expect(o.paint.mock.calls[0][3]).toBe(0);
});

test('zero-size host still gets a 1x1 canvas', () => {
  const { host, cv } = setup(0, 0);
  runNoise(cv, host, opts());
  expect([cv.width, cv.height]).toEqual([1, 1]);
});

test('alive() false ends the loop without painting', () => {
  let live = true;
  const o = opts({ alive: () => live }), { host, cv } = setup();
  runNoise(cv, host, o);
  step(0); live = false; step(100);
  expect(o.paint).toHaveBeenCalledTimes(1);
  expect(frames.length).toBe(0);
});

test('canvas is 1/scale of the host', () => {
  const o = opts({ scale: 5 }), { host, cv } = setup(400, 800);
  runNoise(cv, host, o);
  expect([cv.width, cv.height]).toEqual([80, 160]);
});
