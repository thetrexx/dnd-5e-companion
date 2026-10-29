import type { Rnd } from './types';
import { range } from './rand';
import { f1 } from './parts';

// twin-strand ribbons for the start menu; pure geometry, no DOM
export interface Strand { p: number; amp: number; k: number; sp: number; ph: number; k2: number; sp2: number; ph2: number; w: number; pinch: number; floor: number }

export const STRAND_SPAN = 390; // px one wave pattern spans: fixes the wavelength
export const STRAND_HOLD = 120;
export const STRAND_FADE = 120;

export function makeStrands(rnd: Rnd): [Strand, Strand] {
  const sp = range(rnd, .5, .75);
  const a: Strand = { p: 1.1, amp: .2, k: 1.05, sp, ph: range(rnd, 0, 6), k2: .9, sp2: sp, ph2: range(rnd, 0, 6), w: .17, pinch: .25, floor: .75 };
  const b: Strand = { ...a, sp: -a.sp * .9, ph: a.ph + Math.PI, ph2: range(rnd, 0, 6), w: .13 };
  return [a, b];
}

// x px in the layer, W layer width, col content column centred in W, t seconds
export function strandAt(x: number, W: number, H: number, col: number, t: number, s: Strand): { cy: number; half: number } {
  const cl = (W - col) / 2, u = Math.min(1, Math.max(0, (x - cl) / col)), q = (x - cl) / STRAND_SPAN;
  const env = s.floor + (1 - s.floor) * Math.pow(Math.sin(Math.PI * u), s.p);
  const cy = H / 2 + s.amp * H * Math.sin(s.k * 2 * Math.PI * q + t * s.sp + s.ph) * (.35 + .65 * env);
  const half = s.w * H * env * (s.pinch + (1 - s.pinch) * Math.abs(Math.cos(s.k2 * 2 * Math.PI * q - t * s.sp2 + s.ph2)));
  return { cy, half };
}

export function strandD(W: number, H: number, col: number, t: number, s: Strand): string {
  const n = Math.max(8, Math.ceil(W / 7));
  const pts = Array.from({ length: n + 1 }, (_, i) => { const x = W * i / n; return { x, ...strandAt(x, W, H, col, t, s) }; });
  const top = pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p.x)},${f1(p.cy - p.half)}`);
  const bot = pts.reverse().map(p => `L${f1(p.x)},${f1(p.cy + p.half)}`);
  return `${top.join(' ')} ${bot.join(' ')} Z`;
}

// gradient stops over cl-240 .. cl+col+240, as [offset, factor of peak]
export function strandStops(col: number, edge = .85): [number, number][] {
  const S = col + 480;
  const half: [number, number][] = [[0, 0], [120 / S, edge], [240 / S, edge], [(240 + .225 * col) / S, (edge + 1) / 2]];
  return [...half, [.5, 1], ...half.map(([o, f]): [number, number] => [1 - o, f]).reverse()];
}
