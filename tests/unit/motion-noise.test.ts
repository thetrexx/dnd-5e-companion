import { expect, test } from 'vitest';
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
test('mist is transparent at envelope 0 and uses the theme colour', () => {
  const { fbm } = makeNoise(seeded(1)), px = new Uint8ClampedArray(20 * 20 * 4);
  paintMist(px, 20, 20, 3, 0, fbm, [1, 2, 3]);
  expect(Math.max(...px.filter((_, i) => i % 4 === 3))).toBe(0);
  paintMist(px, 20, 20, 3, 1, fbm, [1, 2, 3]);
  expect(Math.max(...px.filter((_, i) => i % 4 === 3))).toBeGreaterThan(0);
  expect([px[0], px[1], px[2]]).toEqual([1, 2, 3]);
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
