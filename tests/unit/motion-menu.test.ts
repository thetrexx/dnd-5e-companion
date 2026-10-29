import { describe, expect, test } from 'vitest';
import { bloodSpray, menuMotif, menuTone } from '../../src/motion/menuMotifs';
import { ROW_MOTIFS } from '../../src/motion/rowMotifs';
import { BG_MOTIFS } from '../../src/motion/bgMotifs';
import { seeded } from '../../src/motion/rand';
import type { ClassId } from '../../src/data/types';

const W = 358, H = 58;
const moves = (seed: number) => bloodSpray(W, H, seeded(seed)).flatMap(p => p.kind === 'move' ? [p] : []);

describe('menu motifs', () => {
  test('menuMotif: barbarian sprays blood, fighter/monk/rogue use their background, casters their row motif', () => {
    expect(menuMotif('barbarian')).toBe(bloodSpray);
    for (const c of ['fighter', 'monk', 'rogue'] as ClassId[]) expect(menuMotif(c)).toBe(BG_MOTIFS[c]);
    for (const c of ['sorcerer', 'wizard', 'druid', 'warlock', 'cleric', 'paladin', 'bard', 'ranger', 'artificer'] as ClassId[]) expect(menuMotif(c)).toBe(ROW_MOTIFS[c]);
  });
  test('menuTone: blood for barbarian, line colour otherwise', () => {
    expect(menuTone('barbarian')).toBe('--barbarian-blood');
    expect(menuTone('wizard')).toBe('--wizard-line');
    expect(menuTone('fighter')).toBe('--fighter-line');
  });
  test.each([1, 2, 3, 4, 5, 6, 7, 8])('bloodSpray (seed %i): 28 drops cross the button left to right', seed => {
    const m = moves(seed);
    expect(m).toHaveLength(28);
    for (const p of m) {
      expect(p.x).toBeLessThan(0);
      expect(p.still).toBe(.45);
      expect(p.dur).toBeGreaterThanOrEqual(8500);
      expect(p.dur).toBeLessThanOrEqual(12500);
      expect(p.frames).toHaveLength(11);
      p.frames.forEach((f, k) => expect(f.offset).toBeCloseTo(k / 10, 9));
      expect(p.frames[0].opacity).toBe(0);
      expect(p.frames[10].opacity).toBe(0);
      const tx = +/translate\((-?[\d.]+)px/.exec(String(p.frames[10].transform))![1];
      expect(p.x + tx).toBeGreaterThan(W);
    }
    expect(JSON.stringify(bloodSpray(W, H, seeded(seed)))).not.toMatch(/NaN|Infinity/);
  });
  test('bloodSpray: 7 big drops leave 3 faint spatter dots each', () => {
    const pops = bloodSpray(W, H, seeded(3)).flatMap(p => p.kind === 'pop' ? [p] : []);
    expect(pops).toHaveLength(21);
    for (const p of pops) {
      expect(p.shapes).toHaveLength(1);
      expect(p.shapes[0].tag).toBe('circle');
      expect(p.shapes[0].cls).toBe('fill faint');
    }
  });
  test('bloodSpray: deterministic per seed, new pattern per cycle', () => {
    expect(bloodSpray(W, H, seeded(1))).toEqual(bloodSpray(W, H, seeded(1)));
    expect(bloodSpray(W, H, seeded(1))).not.toEqual(bloodSpray(W, H, seeded(2)));
  });
});
