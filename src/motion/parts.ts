import type { Part, Rnd, Shape } from './types';
import { circ, toD, type Pt } from './geom';

export const f1 = (n: number) => n.toFixed(1);
export const r1 = (n: number) => +n.toFixed(1);
export const line = (shape: string | Pt[], at: number, dur: number, cls?: string): Part =>
  ({ kind: 'line', d: typeof shape === 'string' ? shape : toD(shape), at, dur, cls });
export const pop = (x: number, y: number, rot: number, at: number, shapes: Shape[], scale?: number): Part =>
  scale === undefined ? { kind: 'pop', x, y, rot, at, shapes } : { kind: 'pop', x, y, rot, scale, at, shapes };
// a small shape that travels along keyframes (falling loot, flying arrows)
export const mover = (x: number, y: number, at: number, dur: number, frames: Keyframe[], shapes: Shape[]): Part =>
  ({ kind: 'move', x, y, at, dur, frames, shapes });
// parts that turn `deg` degrees about (cx, cy) over the whole cycle
export const spin = (cx: number, cy: number, deg: number, parts: Part[]): Part => ({ kind: 'spin', cx, cy, deg, parts });
// a dot on the spark layer, flying along its keyframes
export const spark = (x: number, y: number, r: number, at: number, dur: number, frames: Keyframe[]): Part =>
  ({ kind: 'spark', x, y, r, at, dur, frames });
export const shape = (tag: Shape['tag'], attrs: Shape['attrs'], cls?: string): Shape => cls ? { tag, attrs, cls } : { tag, attrs };
export const sign = (rnd: Rnd) => rnd() < .5 ? 1 : -1;

// gear outline: `teeth` teeth of height `tooth` on a circle of radius r, from and back to its leftmost point
export function gearPts(cx: number, cy: number, r: number, teeth: number, tooth: number): Pt[] {
  const Ro = r + tooth, s = Math.PI * 2 / teeth, pts: Pt[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = Math.PI + i * s;
    for (const [f, rad] of [[0, r], [.38, r], [.5, Ro], [.82, Ro], [.94, r]]) pts.push([cx + Math.cos(a + f * s) * rad, cy + Math.sin(a + f * s) * rad]);
  }
  pts.push([cx - r, cy]);
  return pts;
}
// a turning gear: outline, then a brass hub ring and hub dot; dir is +1 or -1, small gears turn faster
export function gear(cx: number, cy: number, r: number, at: number, dir: number, o: { tooth?: number; dur?: number; dense?: number } = {}): Part {
  const { tooth = 1.6, dur = 1100, dense = 1.3 } = o, teeth = Math.max(8, Math.round(r * dense / 2) * 2);
  return spin(cx, cy, dir * 700 / r, [
    line(gearPts(cx, cy, r, teeth, tooth), at, dur),
    line(circ(cx, cy, r1(r * .4)), at + .1, dur * .45, 'acc'),
    pop(cx, cy, 0, at + .14, [shape('circle', { r: r1(Math.max(.9, r * .1)) }, 'accf')]),
  ]);
}
// hammer outline of size s around the origin, handle along +x, head at the far end
export const hammerLocal = (s: number): Pt[] =>
  [[-s * .5, 0], [s * .25, 0], [s * .25, -s * .38], [s * .5, -s * .38], [s * .5, s * .3], [s * .42, s * .38], [s * .25, s * .38], [s * .25, 0]];
// goggles centred on (cx, cy): two lenses of radius r, a bridge, a strap stub either side
export function gogglesD(cx: number, cy: number, r: number, strap: number): string {
  const L = cx - 2 * r - r * .3, Lr = cx - r * .3, Rl = cx + r * .3, Rr = cx + 2 * r + r * .3, a = `A${f1(r)} ${f1(r)} 0 1 1`;
  return `M${f1(L - strap)} ${f1(cy)}L${f1(L)} ${f1(cy)}${a} ${f1(Lr)} ${f1(cy)}${a} ${f1(L)} ${f1(cy)}`
    + `M${f1(Lr)} ${f1(cy)}Q${f1(cx)} ${f1(cy - r * .6)} ${f1(Rl)} ${f1(cy)}${a} ${f1(Rr)} ${f1(cy)}${a} ${f1(Rl)} ${f1(cy)}`
    + `M${f1(Rr)} ${f1(cy)}L${f1(Rr + strap)} ${f1(cy)}`;
}
