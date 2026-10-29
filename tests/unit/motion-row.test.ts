import { describe, expect, test } from 'vitest';
import { ROW_MOTIFS } from '../../src/motion/rowMotifs';
import { seeded } from '../../src/motion/rand';
import type { Part } from '../../src/motion/types';

const KEYS = ['sorcerer', 'wizard', 'druid', 'warlock', 'cleric', 'paladin', 'bard', 'ranger', 'artificer'] as const;
// a spin has no timing of its own: check the parts it turns instead
const flat = (ps: Part[]): Part[] => ps.flatMap(p => p.kind === 'spin' ? flat(p.parts) : [p]);
describe('row motifs', () => {
  test('one generator per spellcasting class', () => {
    expect(Object.keys(ROW_MOTIFS).sort()).toEqual([...KEYS].sort());
  });
  test.each(KEYS)('%s: valid parts inside a 320x38 row', k => {
    const parts = ROW_MOTIFS[k]!(320, 38, seeded(7));
    expect(parts.length).toBeGreaterThan(2);
    for (const p of flat(parts)) {
      if (p.kind === 'spin') continue;
      expect(p.at).toBeGreaterThanOrEqual(0);
      expect(p.at).toBeLessThanOrEqual(1);
      if (p.kind === 'line') { expect(p.d).toMatch(/^M/); expect(p.d).not.toMatch(/NaN|Infinity/); expect(p.dur).toBeGreaterThan(0); }
      else if (p.kind === 'pop') { expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(p.shapes.length).toBeGreaterThan(0); }
    }
  });
  test.each(KEYS)('%s: deterministic per seed, new pattern per cycle', k => {
    expect(ROW_MOTIFS[k]!(320, 38, seeded(1))).toEqual(ROW_MOTIFS[k]!(320, 38, seeded(1)));
    expect(ROW_MOTIFS[k]!(320, 38, seeded(1))).not.toEqual(ROW_MOTIFS[k]!(320, 38, seeded(2)));
  });
  test('druid draws leaves and blossoms', () => {
    const cls = ROW_MOTIFS.druid!(320, 38, seeded(5)).flatMap(p => p.kind === 'pop' ? p.shapes.map(s => s.cls) : []);
    expect(cls).toContain('leaf');
  });
  // every straight-segment path (wires, gear outlines, the hammer) stays inside the row, top to bottom
  test.each([[358, 44], [320, 38], [280, 38]].flatMap(([W, H]) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => [W!, H!, s])))('artificer %ix%i: the tinker\'s line stays inside the row (seed %i)', (W, H, seed) => {
    const polys = ROW_MOTIFS.artificer!(W, H, seeded(seed)).flatMap(p => p.kind === 'line' && !/[AQ]/.test(p.d) ? [p.d] : []);
    expect(polys.length).toBeGreaterThan(4);
    for (const d of polys) {
      const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => +m[2]!);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(H);
    }
  });
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('artificer: one line draws a gear (maybe a second meshing one), a hammer and goggles, none turning (seed %i)', seed => {
    const parts = ROW_MOTIFS.artificer!(320, 38, seeded(seed));
    expect(parts.some(p => p.kind === 'spin')).toBe(false);
    const hubs = parts.filter(p => p.kind === 'pop' && p.shapes.some(s => s.cls === 'accf'));
    expect([1, 2]).toContain(hubs.length);
    expect(parts.filter(p => p.kind === 'line' && p.cls === 'acc').length).toBe(hubs.length);   // a brass hub ring per gear
    expect(parts.filter(p => p.kind === 'pop' && p.shapes.some(s => s.cls === 'acc')).length).toBe(2);   // a glint per goggle lens
    // four wire runs, a silver outline per gear, the hammer and the goggles
    expect(parts.filter(p => p.kind === 'line' && p.cls !== 'acc').length).toBe(4 + hubs.length + 2);
  });
  test('artificer: the gear, hammer and goggles come in a new order from cycle to cycle', () => {
    // the gear's hub is the first brass dot; where it sits along the row tells which of the three slots it took
    const slot = (seed: number) => { const { x } = ROW_MOTIFS.artificer!(320, 38, seeded(seed)).find(p => p.kind === 'pop' && p.shapes.some(s => s.cls === 'accf')) as { x: number }; return x < 320 * .25 ? 0 : x < 320 * .5 ? 1 : 2; };
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(slot)).size).toBe(3);
  });
});
