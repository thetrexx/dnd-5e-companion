import type { ClassId } from '../data/types';
import { BG_TIMING, type Gen, type Part, type Shape } from './types';
import { range } from './rand';
import { DIE, FIST, UP, circ, curl, heading, sword, toD, walk, xf, type Pt } from './geom';
import { f1, gear, gogglesD, hammerLocal, line, mover, pop, r1, shape, sign, spark } from './parts';

export type BgKey = ClassId | 'none';
const B = BG_TIMING.G;
const clamp = (at: number) => Math.min(1, at);
const DIAMOND = 'M0 -2.5L2 0L0 2.5L-2 0Z';
const SPARKLE = 'M0 -3L.7 -.7L3 0L.7 .7L0 3L-.7 .7L-3 0L-.7 -.7Z';
const TOES: Pt[] = [[2.3, -1.7], [2.9, -.55], [2.9, .6], [2.3, 1.75]];

export const BG_MOTIFS: Record<BgKey, Gen> = {
  // Druid: vines climb from the bottom edge and curl over
  druid(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [];
    for (let k = 0; k < 3; k++) {
      const x0 = W * (k === 1 ? R(.4, .6) : k ? R(.82, .98) : R(.02, .18)), w = walk(rnd, x0, H + 4, UP + R(-.25, .25), H * R(.35, .6), { turb: .06, wave: .012 }), n = w.pts.length, at = k * .1;
      P.push(line(w.pts.concat(curl(w.x, w.y, w.h, sign(rnd), R(10, 16)).slice(1)), at, B * .8, 'thick')); let side = 1;
      for (let i = Math.floor(R(15, 25)); i < n; i += Math.floor(R(16, 30))) {
        const [x, y] = w.pts[i], h = heading(w.pts, i), t = clamp(at + i / n * .8); side *= -1;
        const c = curl(x, y, h + side * R(.8, 1.2), side, R(8, 14)); P.push(line(c, t, 1600));
        P.push(pop(x, y, (h - side * .9) * 57.3, t, [shape('path', { d: 'M0 0Q3.5 -2.6 7 0Q3.5 2.6 0 0' }, 'leaf')], 2));
        if (rnd() < .5) {
          const e = c[c.length - 1], petals: Shape[] = [];
          for (let j = 0; j < 5; j++) petals.push(shape('circle', { cx: f1(Math.cos(j * 1.2566) * 1.6), cy: f1(Math.sin(j * 1.2566) * 1.6), r: 1.1 }, 'bloom'));
          P.push(pop(e[0], e[1], 0, clamp(t + .1), petals, 2));
        }
      }
    }
    return P;
  },

  // Sorcerer: smoke rises from the bottom in slow columns, embers float up with it
  sorcerer(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [];
    for (let k = 0; k < 4; k++) {
      const at = k * .08, w = walk(rnd, W * R(.05, .95), H + 4, UP, H * R(.4, .75), { turb: .03, wave: .035, freq: R(.02, .035) });
      P.push(line(w.pts.concat(curl(w.x, w.y, w.h, sign(rnd), R(10, 18)).slice(1)), at, B * .8, 'thick'));
      for (let j = 0; j < 4; j++) {
        const i = Math.floor(R(.1, 1) * (w.pts.length - 1)), p = w.pts[i];
        P.push(pop(p[0] + R(-10, 10), p[1] + R(-10, 10), 0, clamp(at + i / w.pts.length * .8), [shape('circle', { r: f1(R(1, 2)) }, 'fill')]));
      }
    }
    return P;
  },

  // Wizard: a D&D dice set (d4 d6 d8 d12 d20) inscribes itself across the top, long threads of the Weave cross the lower screen
  wizard(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], r = Math.min(W * .075, 34), y = H * R(.09, .13);
    (['d4', 'd6', 'd8', 'd12', 'd20'] as const).forEach((k, i) => {
      const cx = W * (.13 + i * .185) + R(-4, 4), cy = y + R(-6, 6) + (i % 2 ? r * .5 : 0), a = R(-.25, .25), at = i * .1;
      DIE[k](cx, cy, r, a).forEach((sh, j) => P.push(line(sh, at + (j ? .06 : 0), j ? 1200 : 1800, j ? 'thin' : undefined)));
    });
    for (let k = 0; k < 6; k++) {
      const y0 = H * R(.55, 1), a = R(-.5, -.2) * (k % 2 ? 1 : -1), L = W * 1.4;
      P.push(line([[-10, y0], [-10 + Math.cos(a) * L, y0 + Math.sin(a) * L]], .4 + k * .05, 3000, 'thin'));
    }
    return P;
  },

  // Warlock: the patron's eye opens in a top corner (the mist below it is a separate noise layer)
  warlock(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], ex = W * R(.15, .3), ey = H * R(.08, .15), s = W * .12;
    P.push(line(`M${f1(ex - s)} ${f1(ey)}Q${f1(ex)} ${f1(ey - s * .8)} ${f1(ex + s)} ${f1(ey)}Q${f1(ex)} ${f1(ey + s * .8)} ${f1(ex - s)} ${f1(ey)}`, 0, 2400));
    P.push(line(circ(ex, ey, s * .3), .15, 1800, 'thin'));
    P.push(pop(ex, ey, 0, .25, [shape('path', { d: `M0 ${f1(-s * .22)}Q${f1(s * .07)} 0 0 ${f1(s * .22)}Q${f1(-s * .07)} 0 0 ${f1(-s * .22)}Z` }, 'fill')]));
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI * .85 + k * Math.PI * .7 / 6, r0 = s * .95, r1 = s * R(1.25, 1.5);
      P.push(line([[ex + Math.cos(a) * r0, ey + Math.sin(a) * r0 * .7], [ex + Math.cos(a) * r1, ey + Math.sin(a) * r1 * .75]], .3 + k * .03, 900, 'thin'));
    }
    return P;
  },

  // Barbarian: the ground cracks open from the bottom, claw marks rake across a corner
  barbarian(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [];
    const crack = (x: number, y: number, h: number, len: number, at: number, depth: number) => {
      const pts: Pt[] = [[x, y]]; let d = 0;
      while (d < len) {
        h += R(-.55, .55) * .6; const st = R(6, 11); x += Math.cos(h) * st; y += Math.sin(h) * st; d += st; pts.push([x, y]);
        if (depth < 2 && rnd() < .18) crack(x, y, h + R(.5, .9) * sign(rnd), len * R(.3, .5), clamp(at + d / len * .5), depth + 1);
      }
      P.push(line(pts, at, B * .5 * (len / (H * .4)), depth ? 'thin' : 'thick'));
    };
    crack(-4, H * R(.85, .95), -.5, H * R(.35, .5), 0, 0); crack(W + 4, H * R(.8, .95), -Math.PI + .5, H * R(.35, .5), .05, 0); crack(W * R(.35, .65), H + 4, -Math.PI / 2 + R(-.3, .3), H * R(.25, .35), .1, 0);
    const cx = W * R(.62, .8), cy = H * R(.1, .18), a = R(.9, 1.2);
    for (let k = -1; k <= 1; k++) {
      const ox = Math.cos(a + Math.PI / 2) * k * 9, oy = Math.sin(a + Math.PI / 2) * k * 9, len = W * R(.22, .3), pts: Pt[] = [];
      for (let t = 0; t <= 1; t += .05) pts.push([cx + ox + Math.cos(a) * len * (t - .5) + Math.sin(t * Math.PI) * 4, cy + oy + Math.sin(a) * len * (t - .5)]);
      P.push(line(pts.slice(0, 12), .45 + (k + 1) * .04, 700, 'thicker')); P.push(line(pts, .45 + (k + 1) * .04, 1000, 'thin'));
    }
    return P;
  },

  // Fighter: crossed swords behind a heater shield, rising in the lower corner
  fighter(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], cx = W * R(.62, .75), cy = H * R(.8, .87), L = W * .42, sc = W / 280;
    for (const [a, at] of [[-2.25, 0], [-.89, .08]]) {
      const s = sword(cx - Math.cos(a) * L * .45, cy - Math.sin(a) * L * .45, a, L, sc); s.forEach((sh, j) => P.push(line(sh, at + j * .08, j ? 900 : 2600, j ? 'thin' : undefined)));
    }
    const sh = xf([[-14, -16], [14, -16], [14, -2], [0, 18], [-14, -2], [-14, -16]], cx, cy + 4 * sc, 0, 1.5 * sc); P.push(line(sh, .35, 2200, 'thick'));
    P.push(line(xf([[-9, -6], [0, 3], [9, -6]], cx, cy + 4 * sc, 0, 1.5 * sc), .5, 900, 'thin'));
    P.push(line(xf([[-9, 2], [0, 11], [9, 2]], cx, cy + 4 * sc, 0, 1.5 * sc), .55, 900, 'thin'));
    // a few arrows loosed across the screen on a gentle arc, either direction
    for (let k = 0; k < 3; k++) {
      const s = sign(rnd), y = H * R(.2, .6), D = W + 80, lift = R(20, 50), th = R(10, 18), dur = R(2200, 3200);
      const face = (attrs: Shape['attrs']): Shape['attrs'] => s > 0 ? attrs : { ...attrs, transform: 'rotate(180)' };
      P.push(mover(s > 0 ? -40 : W + 40, y, .15 + k * .25, dur, [{ transform: `translate(0px,0px) rotate(${f1(-th * s)}deg)`, opacity: 0 }, { opacity: 1, offset: .08 },
        { transform: `translate(${f1(s * D / 2)}px,${f1(-lift)}px) rotate(0deg)`, offset: .5 }, { opacity: 1, offset: .92 }, { transform: `translate(${f1(s * D)}px,0px) rotate(${f1(th * s)}deg)`, opacity: 0 }],
        [shape('path', face({ d: 'M-14 0L14 0' })), shape('path', face({ d: 'M14 -2.6L19 0L14 2.6Z' }), 'fill'), shape('path', face({ d: 'M-14 0L-18 -3M-11 0L-15 -3M-14 0L-18 3M-11 0L-15 3' }))]));
    }
    return P;
  },

  // Monk: an enso brush circle closes in a top corner, currents of ki flow across the lower screen
  monk(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], cx = W * R(.68, .8), cy = H * R(.12, .17), r = W * R(.15, .19), a0 = R(0, 6);
    const arc = (span: number, rr: number) => { const pts: Pt[] = []; for (let t = 0; t <= span; t += .05) pts.push([cx + Math.cos(a0 + t) * rr, cy + Math.sin(a0 + t) * rr]); return pts; };
    P.push(line(arc(5.6, r), 0, 3000, 'thicker')); P.push(line(arc(5.95, r * 1.04), .03, 3200, 'thin'));
    // wisps leave the ring and draw the outline of a fist inside it
    const rot = R(-.15, .15);
    FIST.forEach((poly, k) => {
      const pts = xf(poly, cx, cy, rot, r * .6), [sx, sy] = pts[0], a = R(0, 6.28), ax = cx + Math.cos(a) * r, ay = cy + Math.sin(a) * r,
        mx = (ax + sx) / 2 + R(-.4, .4) * r, my = (ay + sy) / 2 + R(-.4, .4) * r, wisp: Pt[] = [];
      for (let t = 0; t <= 1.001; t += .08) wisp.push([(1 - t) * (1 - t) * ax + 2 * (1 - t) * t * mx + t * t * sx, (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * my + t * t * sy]);
      const at = .3 + k * .06; P.push(line(wisp, at, 1200, 'thin')); P.push(line(pts, at + .15, 1600, 'thick'));
    });
    for (let k = 0; k < 4; k++) {
      const y0 = H * (.6 + k * .09), amp = R(6, 14), fr = R(.012, .02), ph = R(0, 6), pts: Pt[] = [];
      for (let x = -4; x <= W + 4; x += 4) pts.push([x, y0 + Math.sin(x * fr + ph) * amp]);
      P.push(line(pts, .15 + k * .07, B * .6, 'thin'));
      for (let j = 0; j < 2; j++) { const x = R(.15, .9) * W; P.push(pop(x, y0 + Math.sin(x * fr + ph) * amp - R(4, 10), R(0, 180), .15 + k * .07 + x / W * .6, [shape('ellipse', { rx: 2.6, ry: 1.2 }, 'fill')])); }
    }
    return P;
  },

  // Rogue: a crescent moon rises, thrown daggers streak in and stick at the edges
  rogue(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], cx = W * R(.15, .25), cy = H * R(.1, .14), r = W * .09, cres: Pt[] = [];
    for (let t = .35; t <= 5.93; t += .12) cres.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    for (let t = 5.6; t >= .68; t -= .12) cres.push([cx + r * .42 + Math.cos(t) * r * .82, cy + Math.sin(t) * r * .82]);
    cres.push(cres[0]); P.push(line(cres, 0, 2600));
    for (let k = 0; k < 3; k++) {
      const y0 = H * R(.45, .95), sx = -10, ex = W - R(8, 16), ey = y0 + R(-60, 20), my = Math.min(y0, ey) - R(30, 70), at = .25 + k * .15, sc = W / 280;
      const q = (t: number): Pt => [(1 - t) * (1 - t) * sx + 2 * (1 - t) * t * (sx + ex) / 2 + t * t * ex, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * ey];
      for (let j = 0; j < 12; j++) { const t = j / 12, [x, y] = q(t); P.push(pop(x, y, 0, at + t * .25, [shape('circle', { r: .9 }, 'fill')])); }
      const [x1, y1] = q(.97), [x2, y2] = q(1), a = Math.atan2(y2 - y1, x2 - x1);
      sword(x2 - Math.cos(a) * 22 * sc, y2 - Math.sin(a) * 22 * sc, a, 22 * sc, sc * .6).forEach(sh => P.push(line(sh, at + .26, 500, 'thin')));
    }
    // loot tumbling down: coin pouches, daggers and loose coins
    for (let k = 0; k < 8; k++) {
      const kind = k < 3 ? 'pouch' : k < 6 ? 'dagger' : 'coin', dur = R(3800, 6000), spin = R(-220, 220);
      const x = R(.08, .92) * W, at = R(0, .85), drift = R(-20, 20);
      const shapes: Shape[] = kind === 'pouch'
        ? [shape('path', { d: 'M-5 -2Q-9 7 0 8Q9 7 5 -2Z' }), shape('path', { d: 'M-4 -2L4 -2M-3 -2L-5 -6M3 -2L5 -6M0 -2L0 -6' }), shape('circle', { cx: 0, cy: 3.5, r: 1.3 }, 'fill')]
        : kind === 'dagger' ? sword(-10, 0, 0, 20, .6).map(pts => shape('path', { d: toD(pts) }))
        : [shape('circle', { r: 3 }), shape('circle', { r: 1.6 })];
      P.push(mover(x, -24, at, dur, [{ transform: 'translate(0px,0px) rotate(0deg)', opacity: 0, easing: 'cubic-bezier(.45,0,.9,.6)' }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .82 },
        { transform: `translate(${f1(drift)}px,${f1(H + 48)}px) rotate(${spin | 0}deg)`, opacity: 0 }], shapes));
    }
    return P;
  },

  // Cleric: light falls from above, rays fan down from the top, halos ring the source
  cleric(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], cx = W * R(.35, .65), cy = -10;
    for (let j = 0; j < 3; j++) P.push(line(circ(cx, cy, W * (.16 + j * .1)), .15 + j * .1, 2600, 'thin'));
    for (let k = 0; k < 11; k++) {
      const a = Math.PI / 2 + (-.55 + k * .11) + R(-.03, .03), len = H * R(.35, .8), c = Math.cos(a), s = Math.sin(a), at = k * .04;
      P.push(line([[cx + c * 20, cy + s * 20], [cx + c * len, cy + s * len]], at, 2600, 'thin'));
      if (rnd() < .5) P.push(pop(cx + c * len, cy + s * len, 0, at + .35, [shape('path', { d: SPARKLE }, 'fill')], 1.8));
    }
    return P;
  },

  // Paladin: a heraldic frame, lines of light down both edges, mirrored scrolls turning inward
  paladin(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], m = 12;
    for (const side of [0, 1]) {
      const x = side ? W - m : m, dir = side ? -1 : 1; P.push(line([[x, H + 2], [x, -2]], side * .05, B * .7, 'thick'));
      for (let y = H - R(40, 70); y > 30; y -= R(70, 110)) {
        const at = side * .05 + (1 - y / H) * .7, r = R(9, 14);
        P.push(line(curl(x, y, dir > 0 ? -.5 : Math.PI + .5, dir, r), at, 1600)); P.push(line(curl(x, y, dir > 0 ? .5 : Math.PI - .5, -dir, r), at, 1600));
        P.push(pop(x, y, 0, at + .04, [shape('path', { d: DIAMOND }, 'fill')], 1.8));
      }
    }
    return P;
  },

  // Bard: two staves sweep diagonally across the lower screen, notes land on them
  bard(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [];
    for (let s = 0; s < 2; s++) {
      const ph = R(0, 6), amp = R(6, 12), fr = R(.012, .02), gap = 6, y0 = H * (s ? R(.78, .88) : R(.55, .65)), tilt = R(-.25, -.1), at0 = s * .15;
      const yAt = (x: number, j: number) => y0 + x * tilt + j * gap + Math.sin(x * fr + ph) * amp;
      for (let j = 0; j < 5; j++) { const pts: Pt[] = []; for (let x = -4; x <= W + 4; x += 4) pts.push([x, yAt(x, j)]); P.push(line(pts, at0 + j * .02, B * .7, 'thin')); }
      for (let x = R(20, 40); x < W - 10; x += R(28, 48)) {
        const j = Math.floor(R(0, 9)) / 2, up = j > 2;
        P.push(pop(x, yAt(x, j), 0, at0 + x / W * .7 + .05, [shape('ellipse', { rx: 2.2, ry: 1.6, transform: 'rotate(-20)' }, 'fill'), shape('path', { d: up ? 'M-2 .5V8' : 'M2 -.5V-8' })], 1.6));
      }
    }
    return P;
  },

  // Ranger: tracks wander up from the bottom, grass grows along the bottom edge
  ranger(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], w = walk(rnd, W * R(.2, .8), H + 4, UP + R(-.3, .3), H * R(.5, .75), { turb: .05, wave: .02 }), n = w.pts.length;
    P.push(line(w.pts, 0, B * .7, 'thin faint')); let side = 1;
    for (let i = 6; i < n; i += 8) {
      const [x, y] = w.pts[i], h = heading(w.pts, i); side *= -1;
      P.push(pop(x - Math.sin(h) * 6 * side, y + Math.cos(h) * 6 * side, h * 57.3, i / n * .7,
        [shape('ellipse', { rx: 1.6, ry: 1.3 }, 'fill'), ...TOES.map(([tx, ty]) => shape('circle', { cx: tx, cy: ty, r: .6 }, 'fill'))], 2));
    }
    for (let x = R(4, 14); x < W; x += R(14, 30)) {
      const at = x / W * .6;
      for (const b of [-1, 0, 1]) P.push(line(`M${f1(x + b * 3)} ${H + 1}Q${f1(x + b * 4)} ${f1(H - 8)} ${f1(x + b * 8 + R(-2, 2))} ${f1(H - R(12, 22))}`, at, 1400, 'thin'));
    }
    return P;
  },

  // Artificer: a tinker's line runs round the screen edges and draws a turning gear, a hammer and goggles on its way;
  // as each shape completes, a burst of sparks flies in from a random screen edge (they land on the unmasked spark layer)
  artificer(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [], i = Math.min(W, H) * .1, at = (ms: number) => ms / B;
    const corners: Pt[] = [[i, i], [W - i, i], [W - i, H - i], [i, H - i]];
    const lens = corners.map((c, k) => Math.hypot(corners[(k + 1) % 4][0] - c[0], corners[(k + 1) % 4][1] - c[1])), per = lens.reduce((a, b) => a + b);
    // the point a fraction t of the way round the loop
    const on = (t: number): Pt => {
      let d = (((t % 1) + 1) % 1) * per;
      for (let k = 0; k < 4; k++) {
        if (d <= lens[k]) { const [ax, ay] = corners[k], [bx, by] = corners[(k + 1) % 4], u = lens[k] ? d / lens[k] : 0; return [ax + (bx - ax) * u, ay + (by - ay) * u]; }
        d -= lens[k];
      }
      return corners[0];
    };
    const t0 = R(0, 1), dir = sign(rnd), span = .78, order = ['gear', 'hammer', 'goggles'];
    for (let k = 2; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const slots = [.12, .45, .78].map(f => t0 + dir * span * f);
    const dirAt = (t: number) => { const [ax, ay] = on(t - dir * .01), [bx, by] = on(t + dir * .01); return Math.atan2(by - ay, bx - ax); };
    // the wire draws a whole loop in WIRE ms whatever the screen size; the timings below keep every start inside the grow phase
    const WIRE = 4400, wire = (from: Pt, to: Pt, tA: number, tB: number, keep: (p: Pt) => boolean): Pt[] => {
      const pts: Pt[] = [from];
      for (let k = 1; k < 40; k++) { const p = on(tA + (tB - tA) * k / 40); if (keep(p)) pts.push([p[0] + R(-2, 2), p[1] + R(-2, 2)]); }
      pts.push(to);
      return pts;
    };
    // sparks shoot in from one screen edge, arc under gravity and fade in about a second
    const burst = (ms: number) => {
      const side = Math.floor(R(0, 4)), u = R(.15, .85), [ox, oy] = ([[u * W, -4], [W + 4, u * H], [u * W, H + 4], [-4, u * H]] as Pt[])[side];
      const base = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][side];
      for (let k = 0, n = Math.round(R(9, 14)); k < n; k++) {
        const a = base + R(-.75, .75), sp = R(160, 300), dur = R(700, 1300), t = dur / 1000, frames: Keyframe[] = [];
        for (let s = 0; s <= 6; s++) {
          const tt = t * s / 6;
          frames.push({ transform: `translate(${f1(Math.cos(a) * sp * tt)}px,${f1(Math.sin(a) * sp * tt + 130 * tt * tt)}px)`, opacity: s ? r1(1 - s / 6) : 0 });
        }
        P.push(spark(ox, oy, r1(R(.9, 1.7)), at(ms + R(0, 180)), Math.round(dur), frames));
      }
    };
    let prevT = t0 - dir * .06, prevExit = on(prevT), prevC: Pt | null = null, prevExt = 0, clock = 0;
    order.forEach((kind, k) => {
      const t = slots[k], c = on(t), h = dirAt(t), loc = (u: number, v = 0) => xf([[u, v]], c[0], c[1], h, 1)[0];
      let ext: number, entry: Pt, exit: Pt, draw: (start: number) => number;
      if (kind === 'gear') {
        const r = R(30, 40); ext = r + 8; entry = loc(-r); exit = loc(r);
        // built already turned to the wire's heading, so the outline starts where the wire meets it
        draw = (start) => { P.push(gear(c[0], c[1], r, at(start), 1, { tooth: 5, dur: 1800, dense: .55, a0: h })); return 1800; };
      } else if (kind === 'hammer') {
        const s = R(70, 90), outline = xf(hammerLocal(s), c[0], c[1], h, 1); ext = s * .55; entry = outline[0]; exit = loc(s * .5);
        draw = (start) => { P.push(line(outline, at(start), 1500)); return 1500; };
      } else {
        const r = R(15, 19); ext = 2.6 * r + 14; entry = loc(-2.3 * r - 14); exit = loc(2.3 * r + 14);
        draw = (start) => {
          P.push(line(gogglesD(c[0], c[1], r, 14, h), at(start), 1750));
          // a glint on each lens
          for (const lx of [-1.3 * r, 1.3 * r]) {
            const [x, y] = loc(lx);
            P.push(pop(x, y, h * 57.3, at(start + 1550), [shape('path', { d: `M${f1(-r * .45)} ${f1(-r * .1)}A${f1(r * .5)} ${f1(r * .5)} 0 0 1 ${f1(r * .1)} ${f1(-r * .5)}` }, 'acc')]));
          }
          return 1750;
        };
      }
      const pc = prevC, pe = prevExt, wd = WIRE * Math.abs(t - prevT);
      const keep = (p: Pt) => Math.hypot(p[0] - c[0], p[1] - c[1]) > ext && (!pc || Math.hypot(p[0] - pc[0], p[1] - pc[1]) > pe);
      P.push(line(wire(prevExit, entry, prevT, t, keep), at(clock), wd)); clock += wd * .92;
      burst(clock + draw(clock));
      clock += kind === 'gear' ? 1350 : kind === 'hammer' ? 1200 : 1400;
      prevC = c; prevExt = ext; prevExit = exit; prevT = t;
    });
    const endT = t0 + dir * (span + .1), last = on(prevT);
    P.push(line(wire(prevExit, on(endT), prevT, endT, p => Math.hypot(p[0] - last[0], p[1] - last[1]) > prevExt), at(clock), WIRE * Math.abs(endT - prevT)));
    return P;
  },

  // No spellcasting class: faint gold contour lines, like an old map of the Sword Coast
  none(W, H, rnd) {
    const R = (a: number, b: number) => range(rnd, a, b), P: Part[] = [];
    for (let k = 0; k < 7; k++) {
      const top = k < 3, y0 = top ? H * (.06 + k * .05) : H * (.72 + (k - 3) * .07), w = walk(rnd, -6, y0, R(-.1, .1), W + 20, { turb: .04, wave: .015, freq: .02, pull: .08 });
      P.push(line(w.pts, k * .06, B * .6, 'thin'));
    }
    const cx = W * .82, cy = H * .88; P.push(line(circ(cx, cy, 16), .5, 1800, 'thin'));
    P.push(pop(cx, cy, 0, .6, [shape('path', { d: 'M0 -12L2 -2L12 0L2 2L0 12L-2 2L-12 0L-2 -2Z' }, 'fill')]));
    return P;
  },
};
