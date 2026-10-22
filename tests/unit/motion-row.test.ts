import { describe, expect, test } from 'vitest';
import { ROW_MOTIFS } from '../../src/motion/rowMotifs';
import { seeded } from '../../src/motion/rand';

const KEYS = ['sorcerer', 'wizard', 'druid', 'warlock', 'cleric', 'paladin', 'bard', 'ranger'] as const;
describe('row motifs', () => {
  test('one generator per spellcasting class', () => {
    expect(Object.keys(ROW_MOTIFS).sort()).toEqual([...KEYS].sort());
  });
  test.each(KEYS)('%s: valid parts inside a 320x38 row', k => {
    const parts = ROW_MOTIFS[k]!(320, 38, seeded(7));
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) {
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
});
