import { expect, test, vi } from 'vitest';
import { seeded } from '../../src/motion/rand';
import { envelope, makeCells, makeNoise, paintBlood, paintMist, parseRgb, stepCells } from '../../src/motion/noise';

test('parseRgb', () => {
  expect(parseRgb('#a77be0')).toEqual([167, 123, 224]);
  expect(parseRgb(' #abc ')).toEqual([170, 187, 204]);
  expect(parseRgb('rgb(150, 18, 30)')).toEqual([150, 18, 30]);
  expect(parseRgb('nope')).toBeNull();
});
test('envelope gathers, hangs, fades', () => {
  expect(envelope(0)).toBe(0);
  expect(envelope(.45)).toBe(1);
  expect(envelope(.95)).toBe(0);
  expect(envelope(.2)).toBeGreaterThan(0);
  expect(envelope(.2)).toBeLessThan(1);
});
const alphas = (px: Uint8ClampedArray) => px.filter((_, i) => i % 4 === 3);
test('mist is transparent at envelope 0 and uses the theme colour', () => {
  const { fbm } = makeNoise(seeded(1)), px = new Uint8ClampedArray(20 * 20 * 4);
  paintMist(px, 20, 20, 3, 0, fbm, [1, 2, 3]);
  expect(Math.max(...alphas(px))).toBe(0);
  paintMist(px, 20, 20, 3, 1, fbm, [1, 2, 3]);
  expect(Math.max(...alphas(px))).toBeGreaterThan(0);
  const o = alphas(px).findIndex(a => a > 0) * 4;
  expect([px[o], px[o + 1], px[o + 2]]).toEqual([1, 2, 3]);
});
// the mist as first written: every pixel, every frame
function mistRef(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, fbm: (x: number, y: number) => number, k = 1): void {
  const thr = 1.02 - e * .7, c = (v: number) => Math.max(0, Math.min(1, v));
  for (let j = 0; j < h; j++) {
    const wgt = .2 + .8 * c((j / h - .3) / .7);
    for (let i = 0; i < w; i++) {
      const nx = i * k / 12, ny = j * k / 12, n = fbm(nx + t * .04, ny + t * .1) * .65 + fbm(nx * 1.6 - t * .06, ny * 1.6 + t * .05) * .35;
      const a = c(((n + .55) * wgt - thr) / .45);
      px[(j * w + i) * 4 + 3] = a * a * 230;
    }
  }
}
test('mist paints the same as the full loop, for any envelope and zoom', () => {
  const { fbm } = makeNoise(seeded(4)), w = 40, h = 60;
  for (const [e, k] of [[.2, 1], [.6, 1], [1, 1], [1, 1.8]]) {
    const a = new Uint8ClampedArray(w * h * 4), b = new Uint8ClampedArray(w * h * 4);
    paintMist(a, w, h, 7, e, fbm, [9, 8, 7], k); mistRef(b, w, h, 7, e, fbm, k);
    expect(alphas(a)).toEqual(alphas(b));
  }
});
test('mist at envelope 0 clears alpha without sampling noise', () => {
  const fbm = vi.fn(() => 1), px = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  paintMist(px, 20, 20, 3, 0, fbm, [1, 2, 3]);
  expect(fbm).not.toHaveBeenCalled();
  expect(Math.max(...alphas(px))).toBe(0);
});
test('mist never samples noise in the top band, which stays transparent', () => {
  const ys: number[] = [], fbm = vi.fn((_x: number, y: number) => { ys.push(y); return 1; }), w = 20, h = 40, px = new Uint8ClampedArray(w * h * 4).fill(255);
  paintMist(px, w, h, 0, 1, fbm, [1, 2, 3]);
  expect(Math.min(...ys)).toBeGreaterThanOrEqual(h * .3 / 12);
  for (let j = 0; j < h * .3; j++) for (let i = 0; i < w; i++) expect(px[(j * w + i) * 4 + 3]).toBe(0);
});
test('blood stays near the vein in the lower third', () => {
  const { fbm } = makeNoise(seeded(2)), w = 40, h = 80, px = new Uint8ClampedArray(w * h * 4);
  paintBlood(px, w, h, 1, 1, 160, 320, fbm, [150, 18, 30], [200, 50, 60]);
  for (let j = 0; j < h * .4; j++) for (let i = 0; i < w; i++) expect(px[(j * w + i) * 4 + 3]).toBe(0);
});
test('cells ride left to right and wrap', () => {
  const cells = makeCells(seeded(3), 300, 7);
  expect(cells).toHaveLength(7);
  const x0 = cells[0].x;
  stepCells(cells, .5, 1, 300, 600);
  expect(cells[0].x).toBeGreaterThan(x0 - 1e-9);
  cells[0].x = 312; stepCells(cells, 0, 1, 300, 600);
  expect(cells[0].x).toBe(-10);
});
