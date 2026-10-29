import { describe, expect, test } from 'vitest';
import { seeded } from '../../src/motion/rand';
import { STRAND_SPAN, makeStrands, strandAt, strandD, strandStops } from '../../src/motion/strands';

describe('strands', () => {
  test('makeStrands: approved shapes, strands move against each other', () => {
    const [a, b] = makeStrands(seeded(3));
    expect(Math.sign(b.sp)).toBe(-Math.sign(a.sp));
    expect(b.ph).toBe(a.ph + Math.PI);
    expect([a.w, b.w]).toEqual([.17, .13]);
    expect([a.floor, b.floor]).toEqual([.75, .75]);
    expect(makeStrands(seeded(3))).toEqual([a, b]);
    expect(makeStrands(seeded(4))).not.toEqual([a, b]);
  });
  test('strandD on a 390 phone: edge to edge, finite, within the approved thickness', () => {
    const [a] = makeStrands(seeded(1));
    const d = strandD(390, 74, 390, 2, a);
    expect(d).toMatch(/^M0\.0[ ,]/);
    expect(d).toContain('390.0');
    expect(d).not.toMatch(/NaN|Infinity/);
    for (let x = 0; x <= 390; x++) {
      const { half } = strandAt(x, 390, 74, 390, 2, a);
      expect(half).toBeLessThanOrEqual(.17 * 74);
      expect(half).toBeGreaterThanOrEqual(.17 * 74 * .75 * .25 - 1e-9);
    }
  });
  test('wavelength is fixed in px: a wide window shows the same waves at the same column position', () => {
    const [a] = makeStrands(seeded(1));
    expect(strandAt(400 + 100, 1280, 74, 480, 3, a).cy).toBeCloseTo(strandAt(100, 480, 74, 480, 3, a).cy, 9);
  });
  test('outside the column the strand keeps its edge thickness', () => {
    const [a] = makeStrands(seeded(1));
    const t = 3, q = (50 - 400) / STRAND_SPAN;
    const want = a.w * 74 * a.floor * (a.pinch + (1 - a.pinch) * Math.abs(Math.cos(a.k2 * 2 * Math.PI * q - t * a.sp2 + a.ph2)));
    expect(strandAt(50, 1280, 74, 480, t, a).half).toBeCloseTo(want, 9);
  });
  test('strandStops: fade to zero 240px past the column, full strength at the centre', () => {
    const st = strandStops(480);
    const offs = st.map(s => s[0]);
    expect(offs).toEqual([...offs].sort((x, y) => x - y));
    expect(offs[0]).toBeGreaterThanOrEqual(0);
    expect(offs[offs.length - 1]).toBeLessThanOrEqual(1);
    st.forEach(([o, f], i) => {
      const [mo, mf] = st[st.length - 1 - i]!;
      expect(o + mo).toBeCloseTo(1, 9);
      expect(f).toBeCloseTo(mf, 9);
    });
    expect(st[0]![1]).toBe(0);
    expect(st[st.length - 1]![1]).toBe(0);
    expect(st.find(s => s[0] === .5)![1]).toBe(1);
    expect(st.find(s => Math.abs(s[0] - 120 / 960) < 1e-9)![1]).toBe(.85);
    expect(st.find(s => Math.abs(s[0] - 240 / 960) < 1e-9)![1]).toBe(.85);
  });
});
