import { describe, expect, test } from 'vitest';
import { seeded } from '../../src/motion/rand';
import { STRAND_TILE, makeStrands, strandAt, strandMask, strandOutline, strandSpeed, strandStops } from '../../src/motion/strands';

describe('strands', () => {
  test('makeStrands: approved shapes, strands move against each other', () => {
    const [a, b] = makeStrands(seeded(3));
    expect(Math.sign(b.sp)).toBe(-Math.sign(a.sp));
    expect(b.ph).toBe(a.ph + Math.PI);
    expect([a.w, b.w]).toEqual([.17, .13]);
    expect(makeStrands(seeded(3))).toEqual([a, b]);
    expect(makeStrands(seeded(4))).not.toEqual([a, b]);
  });
  test('a strand repeats every tile, so a strip one tile wider than the window slides without a seam', () => {
    const [a, b] = makeStrands(seeded(1));
    for (const s of [a, b]) for (const x of [0, 37, 200, 390]) {
      expect(strandAt(x + STRAND_TILE, 74, s).cy).toBeCloseTo(strandAt(x, 74, s).cy, 9);
      expect(strandAt(x + STRAND_TILE, 74, s).half).toBeCloseTo(strandAt(x, 74, s).half, 9);
    }
  });
  test('even thickness: within the approved width everywhere, never thinner than its pinch', () => {
    const [a] = makeStrands(seeded(1));
    for (let x = 0; x <= STRAND_TILE; x++) {
      const { half } = strandAt(x, 74, a);
      expect(half).toBeLessThanOrEqual(.17 * 74);
      expect(half).toBeGreaterThanOrEqual(.17 * 74 * .88 * .25 - 1e-9);
    }
  });
  test('strandOutline covers the strip past both ends, finite, top above bottom', () => {
    const [a] = makeStrands(seeded(1));
    const pts = strandOutline(390 + STRAND_TILE, 74, a);
    expect(pts[0]!.x).toBeLessThan(0);
    expect(pts[pts.length - 1]!.x).toBeGreaterThan(390 + STRAND_TILE);
    for (const p of pts) {
      expect(Number.isFinite(p.top) && Number.isFinite(p.bot)).toBe(true);
      expect(p.top).toBeLessThan(p.bot);
    }
  });
  test('strandSpeed: the two strands slide opposite ways, the second a little slower', () => {
    const [a, b] = makeStrands(seeded(2));
    expect(Math.sign(strandSpeed(a))).toBe(-Math.sign(strandSpeed(b)));
    expect(Math.abs(strandSpeed(b))).toBeCloseTo(Math.abs(strandSpeed(a)) * .9, 9);
    expect(strandSpeed(a)).toBeCloseTo(a.sp * STRAND_TILE / (2 * Math.PI), 9);
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
  test('strandMask: the stops in px across the window, gone 240px past the column, full at its centre', () => {
    const m = strandMask(1280, 480);
    expect(m.startsWith('linear-gradient(90deg,')).toBe(true);
    const stops = [...m.matchAll(/black (\d+)%,transparent\) (-?\d+)px/g)].map(s => [+s[2]!, +s[1]!]);
    expect(stops).toHaveLength(strandStops(480).length);
    expect(stops[0]).toEqual([400 - 240, 0]);
    expect(stops[stops.length - 1]).toEqual([400 + 480 + 240, 0]);
    expect(stops.find(([x]) => x === 640)![1]).toBe(100);
  });
});
