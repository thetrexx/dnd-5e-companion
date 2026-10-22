import { seeded } from '../../src/motion/rand';
import { DIE, circ, curl, toD, wander } from '../../src/motion/geom';

test('seeded random is deterministic and in range', () => {
  const a = seeded(42), b = seeded(42);
  const xs = Array.from({ length: 50 }, () => a());
  expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
  expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
  expect(seeded(1)()).not.toBe(seeded(2)());
});
test('toD and circ', () => {
  expect(toD([[0, 0], [1.25, 2]])).toBe('M0.0 0.0L1.3 2.0');
  expect(circ(10, 10, 5)).toMatch(/^M15\.0 10\.0A5 5 0 1 1 5\.0 10\.0A/);
});
test('curl tightens and stops', () => {
  const c = curl(0, 0, 0, 1, 8);
  expect(c.length).toBeGreaterThan(10);
  expect(c.length).toBeLessThanOrEqual(121);
});
test('wander stays inside the row height band', () => {
  const w = wander(seeded(3), -4, 20, 0, 300, 40, { turb: .22 });
  expect(w.pts.every(([, y]) => y > -10 && y < 50)).toBe(true);
});
test('dice are closed line art, no star polygons', () => {
  for (const k of ['d4', 'd6', 'd8', 'd12', 'd20'] as const) {
    const shapes = DIE[k](0, 0, 10, 0);
    expect(shapes.length).toBeGreaterThan(1);
    const outline = shapes[0];
    expect(outline[0][0]).toBeCloseTo(outline.at(-1)![0]);
  }
});
