import type { Rnd } from './types';
import { range } from './rand';

// twin-strand ribbons for the start menu; pure geometry, no DOM
export interface Strand { amp: number; sp: number; ph: number; ph2: number; w: number; pinch: number }

export const STRAND_SPAN = 390; // px one wave pattern spans: fixes the wavelength
// a strand repeats every tile (one wave, two twists), so a strip one tile wider than the window can slide forever
export const STRAND_TILE = STRAND_SPAN / 1.05;
const ENV = .88; // even thickness across the window: the strip slides, so it cannot swell at the centre

export function makeStrands(rnd: Rnd): [Strand, Strand] {
  const sp = range(rnd, .5, .75);
  const a: Strand = { amp: .2, sp, ph: range(rnd, 0, 6), ph2: range(rnd, 0, 6), w: .17, pinch: .25 };
  const b: Strand = { ...a, sp: -a.sp * .9, ph: a.ph + Math.PI, ph2: range(rnd, 0, 6), w: .13 };
  return [a, b];
}

// x px along the strip (0 is a tile start), H strip height
export function strandAt(x: number, H: number, s: Strand): { cy: number; half: number } {
  const q = 2 * Math.PI * x / STRAND_TILE;
  const cy = H / 2 + s.amp * H * Math.sin(q + s.ph) * (.35 + .65 * ENV);
  const half = s.w * H * ENV * (s.pinch + (1 - s.pinch) * Math.abs(Math.cos(q + s.ph2)));
  return { cy, half };
}

// top and bottom edge every 6px, from just before 0 to just past w, so the blur never fades the strip's ends
export function strandOutline(w: number, H: number, s: Strand): { x: number; top: number; bot: number }[] {
  const pts = [];
  for (let x = -6; x < w + 12; x += 6) { const { cy, half } = strandAt(x, H, s); pts.push({ x, top: cy - half, bot: cy + half }); }
  return pts;
}

// px per second the strip slides; positive slides left
export const strandSpeed = (s: Strand) => s.sp * STRAND_TILE / (2 * Math.PI);

// gradient stops over cl-240 .. cl+col+240, as [offset, factor of peak]
export function strandStops(col: number, edge = .85): [number, number][] {
  const S = col + 480;
  const half: [number, number][] = [[0, 0], [120 / S, edge], [240 / S, edge], [(240 + .225 * col) / S, (edge + 1) / 2]];
  return [...half, [.5, 1], ...half.map(([o, f]): [number, number] => [1 - o, f]).reverse()];
}

// the strength fade across a W px window with col centred in it, as a CSS mask (only its alpha counts)
export function strandMask(W: number, col: number): string {
  const x0 = (W - col) / 2 - 240, S = col + 480;
  const stops = strandStops(col).map(([o, f]) => `color-mix(in srgb,black ${Math.round(f * 100)}%,transparent) ${(x0 + o * S).toFixed(0)}px`);
  return `linear-gradient(90deg,${stops.join(',')})`;
}
