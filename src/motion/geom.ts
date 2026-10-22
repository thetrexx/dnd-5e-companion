import type { Rnd } from './types';
import { range } from './rand';

export type Pt = [number, number];
interface Path { pts: Pt[]; h: number; x: number; y: number }
const f1 = (n: number) => n.toFixed(1);
export const toD = (pts: Pt[]): string => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
export const circ = (cx: number, cy: number, r: number): string =>
  `M${f1(cx + r)} ${f1(cy)}A${r} ${r} 0 1 1 ${f1(cx - r)} ${f1(cy)}A${r} ${r} 0 1 1 ${f1(cx + r)} ${f1(cy)}`;

// a tendril that tightens into a spiral
export function curl(x: number, y: number, h: number, dir: number, r: number): Pt[] {
  const pts: Pt[] = [[x, y]];
  for (let i = 0; i < 120 && r > .7; i++) { h += dir * .8 / r; x += Math.cos(h) * .8; y += Math.sin(h) * .8; pts.push([x, y]); r *= .955; }
  return pts;
}
// a meandering path that stays inside the row
export function wander(rnd: Rnd, x: number, y: number, h: number, len: number, H: number,
  o: { turb?: number; wave?: number; freq?: number; ph?: number; st?: number } = {}): Path {
  const { turb = .18, wave = 0, freq = .1, ph = range(rnd, 0, 6), st = 1.4 } = o;
  const pts: Pt[] = [[x, y]];
  for (let s = 0; s < len; s += st) {
    h += range(rnd, -turb, turb) + Math.sin(s * freq + ph) * wave;
    if (y < H * .25) h += .1;
    if (y > H * .75) h -= .1;
    h = Math.max(-.9, Math.min(.9, h));
    x += Math.cos(h) * st; y += Math.sin(h) * st; pts.push([x, y]);
  }
  return { pts, h, x, y };
}
// walk: a path that keeps drifting back toward a base heading h0
export function walk(rnd: Rnd, x: number, y: number, h0: number, len: number,
  o: { turb?: number; wave?: number; freq?: number; ph?: number; pull?: number; st?: number } = {}): Path {
  const { turb = .08, wave = 0, freq = .03, ph = range(rnd, 0, 6), pull = .06, st = 2 } = o;
  let h = h0;
  const pts: Pt[] = [[x, y]];
  for (let s = 0; s < len; s += st) {
    h += range(rnd, -turb, turb) + Math.sin(s * freq + ph) * wave + (h0 - h) * pull;
    x += Math.cos(h) * st; y += Math.sin(h) * st; pts.push([x, y]);
  }
  return { pts, h, x, y };
}
export const heading = (pts: Pt[], i: number): number => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};
export const UP = -Math.PI / 2;
// rotate + scale a local shape into place
export const xf = (pts: Pt[], cx: number, cy: number, a: number, s: number): Pt[] =>
  pts.map(([x, y]): Pt => [cx + (x * Math.cos(a) - y * Math.sin(a)) * s, cy + (x * Math.sin(a) + y * Math.cos(a)) * s]);
export const ring = (n: number, r: number, off: number): Pt[] =>
  [...Array(n + 1)].map((_, i): Pt => { const a = off + i * 2 * Math.PI / n; return [Math.cos(a) * r, Math.sin(a) * r]; });

// line-art dice: first shape is the outline, the rest are the facet lines
export const DIE: Record<'d4' | 'd6' | 'd8' | 'd12' | 'd20', (cx: number, cy: number, r: number, a: number) => Pt[][]> = {
  d4: (cx, cy, r, a) => { const T = ring(3, r, -Math.PI / 2), m: Pt = [r * .12, r * .5]; return [xf(T, cx, cy, a, 1), xf([T[0], m], cx, cy, a, 1), xf([T[1], m, T[2]], cx, cy, a, 1)]; },
  d6: (cx, cy, r, a) => { const Hx = ring(6, r, -Math.PI / 2); return [xf(Hx, cx, cy, a, 1), xf([Hx[0], [0, 0], Hx[2]], cx, cy, a, 1), xf([[0, 0], Hx[4]], cx, cy, a, 1)]; },
  d8: (cx, cy, r, a) => { const O: Pt[] = [[0, -r], [r * .85, 0], [0, r], [-r * .85, 0], [0, -r]], m: Pt = [r * .18, r * .08]; return [xf(O, cx, cy, a, 1), xf([O[3], m, O[1]], cx, cy, a, 1), xf([O[0], m, O[2]], cx, cy, a, 1)]; },
  d12: (cx, cy, r, a) => {
    const D = ring(10, r, -Math.PI / 2), Pn = ring(5, r * .52, -Math.PI / 2), out = [xf(D, cx, cy, a, 1), xf(Pn, cx, cy, a, 1)];
    for (let i = 0; i < 5; i++) out.push(xf([Pn[i], D[i * 2]], cx, cy, a, 1));
    return out;
  },
  d20: (cx, cy, r, a) => {
    const Hx = ring(6, r, -Math.PI / 2), T = ring(3, r * .55, -Math.PI / 2), out = [xf(Hx, cx, cy, a, 1), xf(T, cx, cy, a, 1)];
    for (let i = 0; i < 3; i++) { const h = i * 2; out.push(xf([Hx[(h + 5) % 6], T[i], Hx[h], T[i], Hx[h + 1]], cx, cy, a, 1)); }
    return out;
  },
};
// line-art sword pointing along angle a: blade, guard, grip + pommel
export const sword = (x: number, y: number, a: number, L: number, s: number): Pt[][] => [
  xf([[0, -2.2], [L * .86, -2.2], [L, 0], [L * .86, 2.2], [0, 2.2], [0, -2.2]], x, y, a, 1),
  xf([[0, -8 * s], [0, 8 * s]], x, y, a, 1),
  xf([[0, 0], [-11 * s, 0]], x, y, a, 1),
  xf(ring(8, 2.4 * s, 0).map(([u, v]): Pt => [u - 13.4 * s, v]), x, y, a, 1),
];
// fist outline in a unit box: knuckles, finger lines, thumb, wrist crease
export const FIST: Pt[][] = (() => {
  const P: Pt[][] = [], out: Pt[] = [[-.55, .95], [-.72, .35], [-.8, -.3]];
  for (let i = 0; i < 4; i++) { const xc = -.6 + .4 * i; for (let t = Math.PI; t <= 2 * Math.PI + .01; t += Math.PI / 8) out.push([xc + Math.cos(t) * .2, -.3 + Math.sin(t) * .2]); }
  out.push([.78, .2], [.55, .95]); P.push(out);
  for (const x of [-.4, 0, .4]) P.push([[x, -.3], [x, -.02]]);
  const th: Pt[] = []; for (let t = 0; t <= 1.001; t += .1) th.push([-.78 + t * 1.1, .06 + Math.sin(t * Math.PI) * .22]);
  th.push([.36, 0], [.2, -.06]); P.push(th);
  P.push([[-.5, .62], [.45, .62]]);
  return P;
})();
