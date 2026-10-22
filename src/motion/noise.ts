import type { Rnd } from './types';
import { range } from './rand';

export type Rgb = [number, number, number];
export function parseRgb(css: string): Rgb | null {
  const s = css.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) return [...m[1]].map(c => parseInt(c + c, 16)) as Rgb;
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) return [0, 2, 4].map(i => parseInt(m![1].slice(i, i + 2), 16)) as Rgb;
  m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

// Perlin noise for the warlock mist; the permutation comes from the injected random
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10), lerp = (t: number, a: number, b: number) => a + t * (b - a);
const grad = (h: number, x: number, y: number) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
export function makeNoise(rnd: Rnd): { perlin(x: number, y: number): number; fbm(x: number, y: number): number } {
  const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const PERM = p.concat(p);
  function perlin(x: number, y: number): number {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y), a = PERM[X] + Y, b = PERM[X + 1] + Y;
    return lerp(v, lerp(u, grad(PERM[a], x, y), grad(PERM[b], x - 1, y)), lerp(u, grad(PERM[a + 1], x, y - 1), grad(PERM[b + 1], x - 1, y - 1)));
  }
  const fbm = (x: number, y: number) => perlin(x, y) * .6 + perlin(x * 2.1, y * 2.1) * .28 + perlin(x * 4.3, y * 4.3) * .12;
  return { perlin, fbm };
}

// gather / hang / fade envelope of a noise layer, smoothstepped
export function envelope(phase: number): number {
  const env = phase < .35 ? phase / .35 : phase < .6 ? 1 : Math.max(0, 1 - (phase - .6) / .32);
  return env * env * (3 - 2 * env);
}

type Fbm = (x: number, y: number) => number;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Warlock: mist gathers from the bottom, hangs, then evaporates into holes; k zooms the noise when the canvas is coarser than usual
export function paintMist(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, fbm: Fbm, rgb: Rgb, k = 1): void {
  if (e <= 0) { for (let o = 3; o < w * h * 4; o += 4) px[o] = 0; return; }
  const thr = 1.02 - e * .7, [r, g, b] = rgb;
  for (let j = 0; j < h; j++) {
    const yy = j / h, wgt = .2 + .8 * clamp01((yy - .3) / .7);
    // noise never tops 1, so a row whose densest pixel stays under the threshold is clear (the top band always)
    if (1.55 * wgt <= thr) { for (let o = j * w * 4 + 3; o < (j + 1) * w * 4; o += 4) px[o] = 0; continue; }
    for (let i = 0; i < w; i++) {
      const nx = i * k / 12, ny = j * k / 12, n = fbm(nx + t * .04, ny + t * .1) * .65 + fbm(nx * 1.6 - t * .06, ny * 1.6 + t * .05) * .35, dens = (n + .55) * wgt,
        a = clamp01((dens - thr) / .45), o = (j * w + i) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a * a * 230;
    }
  }
}

// Sorcerer: a vein of blood streams left to right across the lower screen, streaky noise stretched along the flow
export const veinY = (x: number, t: number, W: number, H: number): number =>
  H * .66 + Math.sin(x / W * 5.2 + t * .35) * H * .035 + Math.sin(x / W * 11 + t * .6) * H * .012;
export function paintBlood(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, W: number, H: number, fbm: Fbm, base: Rgb, hi: Rgb): void {
  const sx = W / w, sy = H / h, bw = H * .065, thr = 1.05 - e * .6;
  for (let i = 0; i < w; i++) {
    const X = i * sx, yc = veinY(X, t, W, H);
    for (let j = 0; j < h; j++) {
      const Y = j * sy, o = (j * w + i) * 4, dy = (Y - yc) / bw, wgt = Math.exp(-dy * dy);
      if (wgt < .02) { px[o + 3] = 0; continue; }
      const n = fbm(X / 70 - t * .45, Y / 22) * .7 + fbm(X / 30 - t * .8, Y / 12) * .3, dens = (n + .6) * wgt,
        a = clamp01((dens - thr) / .4), k = Math.min(1, Math.max(0, n) * 1.4);
      px[o] = base[0] + (hi[0] - base[0]) * k; px[o + 1] = base[1] + (hi[1] - base[1]) * k; px[o + 2] = base[2] + (hi[2] - base[2]) * k; px[o + 3] = a * 215;
    }
  }
}

// blood cells riding the vein, tumbling as they go
export interface Cell { x: number; off: number; v: number; spin: number; vs: number }
export function makeCells(rnd: Rnd, W: number, n: number): Cell[] {
  return [...Array(n)].map(() => ({ x: range(rnd, 0, W), off: range(rnd, -1, 1), v: range(rnd, 28, 48), spin: range(rnd, 0, 360), vs: range(rnd, -60, 60) }));
}
export function stepCells(cells: Cell[], dt: number, t: number, W: number, H: number): { x: number; y: number; rot: number; sy: number }[] {
  return cells.map(c => {
    c.x += c.v * dt; if (c.x > W + 10) c.x = -10;
    c.spin += c.vs * dt;
    return { x: c.x, y: veinY(c.x, t, W, H) + c.off * H * .03, rot: c.spin | 0, sy: .55 + .45 * Math.abs(Math.cos(c.spin / 40)) };
  });
}
