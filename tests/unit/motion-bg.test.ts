import { describe, expect, test } from 'vitest';
import { BG_MOTIFS, type BgKey } from '../../src/motion/bgMotifs';
import { seeded } from '../../src/motion/rand';

const KEYS: BgKey[] = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'none'];
describe('background motifs', () => {
  test('a background for every class and for no class', () => expect(Object.keys(BG_MOTIFS).sort()).toEqual([...KEYS].sort()));
  test.each(KEYS)('%s: valid parts on a 390x844 screen', k => {
    const parts = BG_MOTIFS[k](390, 844, seeded(11));
    expect(parts.length).toBeGreaterThan(2);
    for (const p of parts) {
      expect(p.at).toBeGreaterThanOrEqual(0);
      expect(p.at).toBeLessThanOrEqual(1);
      if (p.kind === 'line') expect(p.d).not.toMatch(/NaN|Infinity/);
      if (p.kind === 'move') expect(p.frames.length).toBeGreaterThan(1);
    }
  });
  test('wizard background: five dice outlines, threads, no star', () => {
    const lines = BG_MOTIFS.wizard(390, 844, seeded(3)).filter(p => p.kind === 'line');
    expect(lines.length).toBeGreaterThanOrEqual(5 + 6);
  });
  test('fighter shoots arrows, rogue drops loot', () => {
    expect(BG_MOTIFS.fighter(390, 844, seeded(4)).filter(p => p.kind === 'move')).toHaveLength(3);
    expect(BG_MOTIFS.rogue(390, 844, seeded(4)).filter(p => p.kind === 'move')).toHaveLength(8);
  });
});
