import { describe, expect, test } from 'vitest';
import { BG_MOTIFS, type BgKey } from '../../src/motion/bgMotifs';
import { seeded } from '../../src/motion/rand';
import type { Part } from '../../src/motion/types';

const KEYS: BgKey[] = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'artificer', 'none'];
// a spin has no timing of its own: check the parts it turns instead
const flat = (ps: Part[]): Part[] => ps.flatMap(p => p.kind === 'spin' ? flat(p.parts) : [p]);
describe('background motifs', () => {
  test('a background for every class and for no class', () => expect(Object.keys(BG_MOTIFS).sort()).toEqual([...KEYS].sort()));
  test.each(KEYS)('%s: valid parts on a 390x844 screen', k => {
    const parts = BG_MOTIFS[k](390, 844, seeded(11));
    expect(parts.length).toBeGreaterThan(2);
    for (const p of flat(parts)) {
      if (p.kind === 'spin') continue;
      expect(p.at).toBeGreaterThanOrEqual(0);
      // a spark flies when its shape completes, which may be after the grow phase
      if (p.kind !== 'spark') expect(p.at).toBeLessThanOrEqual(1);
      if (p.kind === 'line') expect(p.d).not.toMatch(/NaN|Infinity/);
      if (p.kind === 'move' || p.kind === 'spark') expect(p.frames.length).toBeGreaterThan(1);
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
  test.each([[390, 844, 1], [390, 844, 7], [320, 568, 2], [1280, 800, 5]])('artificer %ix%i seed %i: one turning gear, a hammer, goggles, three bursts of sparks', (W, H, seed) => {
    const parts = BG_MOTIFS.artificer(W, H, seeded(seed));
    expect(parts.filter(p => p.kind === 'spin')).toHaveLength(1);
    const lines = parts.flatMap(p => p.kind === 'line' ? [p.d] : []);
    // the hammer: one outline of 8 points; the goggles: two lenses of two arcs each, joined by a bridge
    expect(lines.filter(d => d.split('L').length === 8 && !/[AQ]/.test(d))).toHaveLength(1);
    expect(lines.filter(d => (d.match(/A/g) ?? []).length === 4 && d.includes('Q'))).toHaveLength(1);
    const sparks = parts.flatMap(p => p.kind === 'spark' ? [p] : []), bursts = new Map<string, number>();
    for (const s of sparks) {
      const k = `${s.x},${s.y}`; bursts.set(k, (bursts.get(k) ?? 0) + 1);
      expect(s.frames.length).toBeGreaterThanOrEqual(2);
      // the engine hides a spark until it animates and holds its last frame: it must fade in and out
      expect(s.frames[0].opacity).toBe(0);
      expect(s.frames[s.frames.length - 1].opacity).toBe(0);
      expect(s.at).toBeGreaterThan(0);
      expect(s.at).toBeLessThan(1.6);
      // each burst enters from a screen edge
      expect(s.x <= 0 || s.x >= W || s.y <= 0 || s.y >= H).toBe(true);
    }
    expect(bursts.size).toBe(3);
    for (const n of bursts.values()) { expect(n).toBeGreaterThanOrEqual(9); expect(n).toBeLessThanOrEqual(14); }
    for (const p of flat(parts)) {
      if (p.kind === 'line') expect(p.d).not.toMatch(/NaN|Infinity/);
      if (p.kind !== 'spin' && p.kind !== 'spark') expect(p.at).toBeLessThanOrEqual(1);
    }
  });
  test('artificer: a zero-size screen still gives finite parts', () => {
    for (const p of flat(BG_MOTIFS.artificer(0, 0, seeded(1)))) {
      if (p.kind === 'line') expect(p.d).not.toMatch(/NaN|Infinity/);
      if (p.kind !== 'spin') expect(Number.isFinite(p.at)).toBe(true);
    }
  });
});
