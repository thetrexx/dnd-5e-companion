import type { Part, Rnd, Shape } from './types';
import { circ, toD, type Pt } from './geom';

export const f1 = (n: number) => n.toFixed(1);
export const r1 = (n: number) => +n.toFixed(1);
export const line = (shape: string | Pt[], at: number, dur: number, cls?: string): Part =>
  ({ kind: 'line', d: typeof shape === 'string' ? shape : toD(shape), at, dur, cls });
export const pop = (x: number, y: number, rot: number, at: number, shapes: Shape[], scale?: number): Part =>
  scale === undefined ? { kind: 'pop', x, y, rot, at, shapes } : { kind: 'pop', x, y, rot, scale, at, shapes };
// a small shape that travels along keyframes (falling loot, flying arrows)
export const mover = (x: number, y: number, at: number, dur: number, frames: Keyframe[], shapes: Shape[], still?: number): Part =>
  still === undefined ? { kind: 'move', x, y, at, dur, frames, shapes } : { kind: 'move', x, y, at, dur, frames, shapes, still };
// parts that turn `deg` degrees about (cx, cy) over the whole cycle
export const spin = (cx: number, cy: number, deg: number, parts: Part[]): Part => ({ kind: 'spin', cx, cy, deg, parts });
// a dot on the spark layer, flying along its keyframes
export const spark = (x: number, y: number, r: number, at: number, dur: number, frames: Keyframe[]): Part =>
  ({ kind: 'spark', x, y, r, at, dur, frames });
export const shape = (tag: Shape['tag'], attrs: Shape['attrs'], cls?: string): Shape => cls ? { tag, attrs, cls } : { tag, attrs };
export const sign = (rnd: Rnd) => rnd() < .5 ? 1 : -1;

// gear outline: `teeth` teeth of height `tooth` on a circle of radius r, from and back to its leftmost point;
// a0 turns the whole outline (and so its start point) by a0 radians
export function gearPts(cx: number, cy: number, r: number, teeth: number, tooth: number, a0 = 0): Pt[] {
  const Ro = r + tooth, s = Math.PI * 2 / teeth, pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = Math.PI + a0 + i * s;
    for (const [f, rad] of [[0, r], [.38, r], [.5, Ro], [.82, Ro], [.94, r]]) pts.push([cx + Math.cos(a + f * s) * rad, cy + Math.sin(a + f * s) * rad]);
  }
  pts.push(a0 ? [cx - Math.cos(a0) * r, cy - Math.sin(a0) * r] : [cx - r, cy]);
  return pts;
}
// a turning gear: outline, then a brass hub ring and hub dot; dir is +1 or -1, small gears turn faster
export const GEAR_TOOTH = 1.6;
export function gear(cx: number, cy: number, r: number, at: number, dir: number, o: { tooth?: number; dur?: number; dense?: number; a0?: number } = {}): Part {
  const { tooth = GEAR_TOOTH, dur = 1100, dense = 1.3, a0 = 0 } = o, teeth = Math.max(8, Math.round(r * dense / 2) * 2);
  return spin(cx, cy, dir * 700 / r, [
    line(gearPts(cx, cy, r, teeth, tooth, a0), at, dur),
    line(circ(cx, cy, r1(r * .4)), at + .1, dur * .45, 'acc'),
    pop(cx, cy, 0, at + .14, [shape('circle', { r: r1(Math.max(.9, r * .1)) }, 'accf')]),
  ]);
}
// hammer outline of size s around the origin, handle along +x, head at the far end
export const hammerLocal = (s: number): Pt[] =>
  [[-s * .5, 0], [s * .25, 0], [s * .25, -s * .38], [s * .5, -s * .38], [s * .5, s * .3], [s * .42, s * .38], [s * .25, s * .38], [s * .25, 0]];
// goggles centred on (cx, cy): two lenses of radius r, a bridge, a strap stub either side;
// rot turns them about the centre (circular arcs stay arcs, so only the end points turn)
export function gogglesD(cx: number, cy: number, r: number, strap: number, rot = 0): string {
  const c = Math.cos(rot), s = Math.sin(rot), p = (u: number, v = 0) => rot ? `${f1(cx + u * c - v * s)} ${f1(cy + u * s + v * c)}` : `${f1(cx + u)} ${f1(cy + v)}`;
  const L = -2 * r - r * .3, Lr = -r * .3, Rl = r * .3, Rr = 2 * r + r * .3, a = `A${f1(r)} ${f1(r)} 0 1 1`;
  return `M${p(L - strap)}L${p(L)}${a} ${p(Lr)}${a} ${p(L)}`
    + `M${p(Lr)}Q${p(0, -r * .6)} ${p(Rl)}${a} ${p(Rr)}${a} ${p(Rl)}`
    + `M${p(Rr)}L${p(Rr + strap)}`;
}
