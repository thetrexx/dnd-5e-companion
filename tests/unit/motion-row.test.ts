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
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('artificer: a train of turning gears with brass hubs (seed %i)', seed => {
    const parts = ROW_MOTIFS.artificer!(320, 38, seeded(seed));
    const spins = parts.flatMap(p => p.kind === 'spin' ? [p] : []);
    expect(spins.length).toBeGreaterThan(0);
    for (const s of spins) {
      expect(Number.isFinite(s.cx) && Number.isFinite(s.cy) && Number.isFinite(s.deg) && s.deg !== 0).toBe(true);
      const lines = s.parts.flatMap(p => p.kind === 'line' ? [p] : []);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) { expect(l.at).toBeGreaterThanOrEqual(0); expect(l.at).toBeLessThanOrEqual(1); }
      expect(lines.some(l => l.cls === 'acc')).toBe(true);
      expect(s.parts.some(p => p.kind === 'pop' && p.shapes.some(sh => sh.cls === 'accf'))).toBe(true);
    }
    for (const p of flat(parts)) if (p.kind === 'line') expect(p.d).not.toMatch(/NaN/);
    // meshed neighbours turn opposite ways, the smaller one faster
    for (let i = 1; i < parts.length; i++) {
      const a = parts[i - 1]!, b = parts[i]!;
      if (a.kind === 'spin' && b.kind === 'spin') expect(Math.sign(b.deg)).toBe(-Math.sign(a.deg));
    }
    // at most one hammer and one pair of goggles: the only top-level lines besides the faint shaft
    expect(parts.filter(p => p.kind === 'line' && p.cls !== 'thin faint').length).toBeLessThanOrEqual(2);
  });
});
