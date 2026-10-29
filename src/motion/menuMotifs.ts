import type { ClassId } from '../data/types';
import { ROW_TIMING, type Gen, type Part } from './types';
import { range } from './rand';
import { f1, mover, pop, r1, shape } from './parts';
import { ROW_MOTIFS } from './rowMotifs';
import { BG_MOTIFS } from './bgMotifs';

const f2 = (n: number) => n.toFixed(2);

// Barbarian: a slow-motion spray of blood crossing the button left to right; big drops stretch into
// teardrops, small ones scatter wider, and each big drop leaves spatter marks where it passes
export const bloodSpray: Gen = (W, H, rnd) => {
  const P: Part[] = [], y0 = H * range(rnd, .4, .6), G = ROW_TIMING.G;
  const drop = (r: number) => `M ${r} 0 C ${r} ${r * 1.15} ${-r * .8} ${r * .85} ${-r * 3.2} 0 C ${-r * .8} ${-r * .85} ${r} ${-r * 1.15} ${r} 0 Z`;
  for (let i = 0; i < 28; i++) {
    const big = i < 7, r = big ? range(rnd, 3.2, 5) : range(rnd, 1.1, 2.4), at = big ? range(rnd, 0, .35) : range(rnd, 0, .6);
    const dur = big ? range(rnd, 10500, 12500) : range(rnd, 8500, 11000), x0 = -range(rnd, 10, 30), dx = W + 60;
    const spread = (big ? range(rnd, -.18, .18) : range(rnd, -.45, .45)) * H, sag = range(rnd, .04, .2) * H, wob = range(rnd, 0, 6.28), frames: Keyframe[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, x = dx * t, y = spread * t + sag * t * t + Math.sin(t * 7 + wob) * r * .6;
      const ang = Math.atan2(spread + 2 * sag * t, dx) * 180 / Math.PI;
      const st = 1 + (big ? 1.1 : .6) * Math.sin(Math.PI * Math.min(1, t * 1.4));
      const opacity = t < .06 ? t / .06 : t > .82 ? (1 - t) / .18 : 1;
      frames.push({ offset: t, opacity, transform: `translate(${f1(x)}px, ${f1(y)}px) rotate(${f1(ang)}deg) scale(${f2(st)}, ${f2(1 / Math.sqrt(st))})` });
    }
    P.push(mover(x0, y0, at, dur, frames, [shape('path', { d: drop(r) }, 'fill')], .45));
    if (big) for (let s = 0; s < 3; s++) {
      const t = range(rnd, .25, .75), sx = x0 + dx * t, sy = y0 + spread * t + sag * t * t + range(rnd, -4, 4);
      P.push(pop(sx, sy, 0, at + t * dur / G, [shape('circle', { cx: 0, cy: 0, r: r1(r * range(rnd, .35, .6)) }, 'fill faint')]));
    }
  }
  return P;
};

// the motif a class's start-screen button runs: blood for the barbarian, else its row or background art
export const menuMotif = (cls: ClassId): Gen => cls === 'barbarian' ? bloodSpray : (ROW_MOTIFS[cls] ?? BG_MOTIFS[cls])!;

// the CSS token (no var()) for that motif's colour
export const menuTone = (cls: ClassId): string => cls === 'barbarian' ? '--barbarian-blood' : `--${cls}-line`;
