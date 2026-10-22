import type { ClassId } from '../data/types';
import { ROW_TIMING, type Gen, type Part, type Shape } from './types';
import { range } from './rand';
import { circ, curl, heading, wander, type Pt } from './geom';
import { f1, line, pop, r1, shape, sign } from './parts';

const G = ROW_TIMING.G;

export const ROW_MOTIFS: Partial<Record<ClassId, Gen>> = {
  // Druid: a vine creeps in, tendrils curl off it, leaves and blossoms open
  druid(W, H, rnd) {
    const P: Part[] = [], w = wander(rnd, -4, H * range(rnd, .35, .65), range(rnd, -.2, .2), W * .82, H, { turb: .22 }), n = w.pts.length;
    P.push(line(w.pts, 0, G, 'thick')); let side = sign(rnd);
    for (let i = Math.floor(range(rnd, 6, 14)); i < n; i += Math.floor(range(rnd, 9, 19))) {
      const [x, y] = w.pts[i], h = heading(w.pts, i), t = i / n; side *= -1;
      const c = curl(x, y, h + side * range(rnd, .8, 1.3), side, range(rnd, 5, 10)); P.push(line(c, t, 900));
      if (rnd() < .45) P.push(line(curl(x, y, h - side * range(rnd, .5, .9), -side, range(rnd, 3, 5)), t, 900));
      P.push(pop(x, y, (h - side * range(rnd, .6, 1.1)) * 57.3, t, [shape('path', { d: 'M0 0Q3.5 -2.6 7 0Q3.5 2.6 0 0' }, 'leaf')]));
      if (rnd() < .5) {
        const e = c[c.length - 1], petals: Shape[] = [];
        for (let k = 0; k < 5; k++) petals.push(shape('circle', { cx: r1(Math.cos(k * 1.2566) * 1.6), cy: r1(Math.sin(k * 1.2566) * 1.6), r: 1.1 }, 'bloom'));
        P.push(pop(e[0], e[1], 0, Math.min(1, t + .18), petals));
      }
    }
    return P;
  },

  // Sorcerer: wisps of smoke drift across and curl at the ends, embers flicker along them
  sorcerer(W, H, rnd) {
    const P: Part[] = [];
    for (let k = 0; k < 3; k++) {
      const at = k * .12;
      const w = wander(rnd, range(rnd, -14, -2), H * range(rnd, .25, .75), range(rnd, -.15, .15), W * range(rnd, .45, .75), H, { turb: .04, wave: .07, freq: range(rnd, .05, .09) });
      const pts = w.pts.concat(curl(w.x, w.y, w.h, sign(rnd), range(rnd, 4, 7)).slice(1)); P.push(line(pts, at, G * .75, 'thick'));
      for (let j = 0; j < 3; j++) {
        const i = Math.floor(range(rnd, .2, 1) * (w.pts.length - 1)), p = w.pts[i];
        const x = p[0] + range(rnd, -3, 3), y = p[1] + range(rnd, -6, 6);
        P.push(pop(x, y, 0, at + i / pts.length * .75, [shape('circle', { r: r1(range(rnd, .6, 1.2)) }, 'fill')]));
      }
    }
    return P;
  },

  // Wizard: threads of the Weave cross into a lattice, sigils inscribe themselves on it
  wizard(W, H, rnd) {
    const P: Part[] = [], a = range(rnd, .24, .34), dx = H / Math.tan(a); let i = 0;
    for (let x0 = -dx; x0 < W * .75; x0 += range(rnd, 16, 26), i++) {
      const pts: Pt[] = i % 2 ? [[x0, -2], [x0 + dx, H + 2]] : [[x0 + dx, -2], [x0, H + 2]];
      P.push(line(pts, Math.max(0, (x0 + dx) / (W * .75 + dx)) * .8, 1100, 'thin'));
    }
    for (let k = 0; k < 3; k++) {
      const cx = range(rnd, .08, .6) * W, cy = H * range(rnd, .35, .65), r = range(rnd, 3.5, 5), at = cx / W * .8 + .1;
      P.push(line(circ(cx, cy, r), at, 700));
      P.push(line([0, 1, 2, 3].map((j): Pt => [cx + Math.cos(j * 2.094 - 1.571) * r * .62, cy + Math.sin(j * 2.094 - 1.571) * r * .62]), at + .08, 500, 'thin'));
    }
    return P;
  },

  // Warlock: an eye opens, tentacles reach out from it
  warlock(W, H, rnd) {
    const P: Part[] = [], ex = range(rnd, 10, 18), ey = H * range(rnd, .4, .6);
    P.push(line(`M${f1(ex - 6)} ${f1(ey)}Q${f1(ex)} ${f1(ey - 5)} ${f1(ex + 6)} ${f1(ey)}Q${f1(ex)} ${f1(ey + 5)} ${f1(ex - 6)} ${f1(ey)}`, 0, 800));
    P.push(pop(ex, ey, 0, .12, [shape('circle', { r: 1.6 }, 'fill')]));
    for (let k = 0; k < 3; k++) {
      const at = .15 + k * .06, w = wander(rnd, ex + 6, ey, range(rnd, -.6, .6), W * range(rnd, .35, .62), H, { turb: .04, wave: .09, freq: .1 });
      const pts = w.pts.concat(curl(w.x, w.y, w.h, sign(rnd), range(rnd, 3, 5)).slice(1));
      P.push(line(pts.slice(0, Math.floor(pts.length * .45)), at, G * .7 * .45, 'thicker'));
      P.push(line(pts, at, G * .7, 'thin'));
      for (let j = 1; j < 4; j++) { const i = Math.floor(pts.length * j * .15), p = pts[i]; P.push(pop(p[0], p[1], 0, at + i / pts.length * .7, [shape('circle', { r: .8 }, 'fill')])); }
    }
    return P;
  },

  // Cleric: rays of light fan out from the edge, halos ring the source, sparkles at the tips
  cleric(W, H, rnd) {
    const P: Part[] = [], cx = -4, cy = H * range(rnd, .4, .6);
    for (let j = 0; j < 3; j++) P.push(line(circ(cx, cy, 14 + j * 11), .2 + j * .1, 1200, 'thin'));
    for (let k = 0; k < 10; k++) {
      const a = -.7 + k * .155 + range(rnd, -.05, .05), len = range(rnd, 40, W * .6), at = k * .04, c = Math.cos(a), s = Math.sin(a);
      P.push(line([[cx + c * 6, cy + s * 6], [cx + c * len, cy + s * len]], at, 1200, 'thin'));
      const tx = cx + c * len, ty = cy + s * len;
      if (ty > 3 && ty < H - 3 && rnd() < .6) P.push(pop(tx, ty, 0, at + .32, [shape('path', { d: 'M0 -3L.7 -.7L3 0L.7 .7L0 3L-.7 .7L-3 0L-.7 -.7Z' }, 'fill')]));
    }
    return P;
  },

  // Paladin: a blade of light, mirrored heraldic scrolls, diamonds where they meet
  paladin(W, H, rnd) {
    const P: Part[] = [], y = H / 2, end = W * .75; P.push(line([[-2, y], [end, y]], 0, G * .7, 'thick'));
    for (let x = range(rnd, 14, 24); x < W * .7; x += range(rnd, 28, 40)) {
      const at = x / end * .7, r = range(rnd, 4, 7), h = range(rnd, .8, 1.2);
      P.push(line(curl(x, y, -h, 1, r), at, 900)); P.push(line(curl(x, y, h, -1, r), at, 900));
      P.push(pop(x, y, 0, at + .04, [shape('path', { d: 'M0 -2.5L2 0L0 2.5L-2 0Z' }, 'fill')]));
    }
    return P;
  },

  // Bard: a five-line staff waves in, notes land on it
  bard(W, H, rnd) {
    const P: Part[] = [], ph = range(rnd, 0, 6), amp = range(rnd, 1.5, 3), fr = range(rnd, .03, .05), gap = 3.6, y0 = H / 2 - 2 * gap, end = W * .75;
    const yAt = (x: number, j: number) => y0 + j * gap + Math.sin(x * fr + ph) * amp;
    for (let j = 0; j < 5; j++) { const pts: Pt[] = []; for (let x = -2; x <= end; x += 3) pts.push([x, yAt(x, j)]); P.push(line(pts, j * .03, G * .7, 'thin')); }
    for (let x = range(rnd, 18, 30); x < W * .7; x += range(rnd, 16, 28)) {
      const j = Math.floor(range(rnd, 0, 9)) / 2, up = j > 2;
      P.push(pop(x, yAt(x, j), 0, x / end * .7 + .05, [shape('ellipse', { rx: 2.2, ry: 1.6, transform: 'rotate(-20)' }, 'fill'), shape('path', { d: up ? 'M-2 .5V8' : 'M2 -.5V-8' })]));
    }
    return P;
  },

  // Ranger: a faint trail with paw prints walking along it, grass springing up
  ranger(W, H, rnd) {
    const P: Part[] = [], w = wander(rnd, -4, H * range(rnd, .35, .65), range(rnd, -.2, .2), W * .75, H, { turb: .12 }), n = w.pts.length;
    P.push(line(w.pts, 0, G * .7, 'thin faint')); let side = 1;
    for (let i = 6; i < n; i += 9) {
      const [x, y] = w.pts[i], h = heading(w.pts, i); side *= -1;
      const toes = ([[2.3, -1.7], [2.9, -.55], [2.9, .6], [2.3, 1.75]] as Pt[]).map(([cx, cy]) => shape('circle', { cx, cy, r: .6 }, 'fill'));
      P.push(pop(x - Math.sin(h) * 3 * side, y + Math.cos(h) * 3 * side, h * 57.3, i / n * .7, [shape('ellipse', { rx: 1.6, ry: 1.3 }, 'fill'), ...toes]));
    }
    for (let k = 0; k < 4; k++) {
      const x = range(rnd, .05, .65) * W, at = x / W * .7;
      for (const b of [-1, 0, 1]) P.push(line(`M${f1(x + b * 1.5)} ${H}Q${f1(x + b * 2)} ${f1(H - 4)} ${f1(x + b * 4 + range(rnd, -1, 1))} ${f1(H - range(rnd, 6, 9))}`, at, 700, 'thin'));
    }
    return P;
  },
};
