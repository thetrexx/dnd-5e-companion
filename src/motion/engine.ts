import type { Gen, Part, Rnd, Shape, Timing } from './types';
import { f1 } from './parts';
import { range } from './rand';

const NS = 'http://www.w3.org/2000/svg';
export interface Rendered { part: Part; el: SVGElement; len?: number }
// over: an unmasked layer for sparks; without it sparks are dropped
export interface LoopOptions { animate: boolean; alive(): boolean; rnd?: Rnd; startDelay?: number; signal?: AbortSignal; gate?(sig?: AbortSignal): Promise<void>; over?: SVGSVGElement }

function el(tag: string, attrs: Record<string, string | number>, parent: Element, cls?: string): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (cls) e.setAttribute('class', cls);
  parent.appendChild(e);
  return e;
}
// outer group places the part, inner .pop group is what animates
function group(svg: Element, transform: string, shapes: Shape[], scale?: number): SVGElement {
  const g = el('g', { class: 'pop' }, el('g', { transform }, svg));
  const box = scale === undefined ? g : el('g', { transform: `scale(${scale})` }, g);
  for (const s of shapes) el(s.tag, s.attrs, box, s.cls);
  return g;
}
// a spin's group is listed before its children; sparks go to `over`, or nowhere without one
export function renderParts(svg: SVGSVGElement, parts: Part[], over?: SVGSVGElement): Rendered[] {
  const out: Rendered[] = [];
  const put = (parent: Element, ps: Part[]) => {
    for (const part of ps) {
      if (part.kind === 'spin') { const g = el('g', {}, parent); out.push({ part, el: g }); put(g, part.parts); }
      else if (part.kind === 'spark') { if (over) out.push({ part, el: el('circle', { cx: f1(part.x), cy: f1(part.y), r: f1(part.r) }, over, 'spark') }); }
      else out.push({ part, el:
        part.kind === 'line' ? el('path', { d: part.d }, parent, part.cls)
        : part.kind === 'pop' ? group(parent, `translate(${f1(part.x)} ${f1(part.y)}) rotate(${part.rot.toFixed(0)})`, part.shapes, part.scale)
        : group(parent, `translate(${f1(part.x)} ${f1(part.y)})`, part.shapes) });
    }
  };
  put(svg, parts);
  return out;
}

const canAnimate = () => typeof Element.prototype.animate === 'function'
  && typeof (document.createElementNS(NS, 'path') as SVGPathElement).getTotalLength === 'function';

function arm(rs: Rendered[], still: boolean): void {
  for (const r of rs) {
    if (r.part.kind === 'line') {
      const path = r.el as SVGPathElement;
      if (typeof path.getTotalLength !== 'function') continue;
      const L = r.len = path.getTotalLength();
      path.style.strokeDasharray = `${L} ${L + 1}`;
      path.style.strokeDashoffset = still ? '0' : `${L}`;
    } else if (!still && r.part.kind !== 'spin') r.el.style.opacity = '0';
  }
}

// resolves once start() calls done or the signal aborts, whichever is first; start's cleanup always runs
function wait(sig: AbortSignal | undefined, start: (done: () => void) => () => void): Promise<void> {
  return new Promise(res => {
    if (sig?.aborted) return res();
    let undo = () => {};
    const done = () => { undo(); sig?.removeEventListener('abort', done); res(); };
    sig?.addEventListener('abort', done);
    undo = start(done);
  });
}
const sleep = (ms: number, sig?: AbortSignal) => wait(sig, done => { const t = setTimeout(done, ms); return () => clearTimeout(t); });
const visible = (sig?: AbortSignal) => wait(sig, done => {
  if (!document.hidden) { done(); return () => {}; }
  const on = () => { if (!document.hidden) done(); };
  document.addEventListener('visibilitychange', on);
  return () => document.removeEventListener('visibilitychange', on);
});
// a gate that holds until el is on screen; without IntersectionObserver it never holds
export const onScreen = (el: Element) => (sig?: AbortSignal) => wait(sig, done => {
  if (typeof IntersectionObserver !== 'function') { done(); return () => {}; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) done(); });
  io.observe(el);
  return () => io.disconnect();
});
const settle = (as: Animation[], sig?: AbortSignal) => wait(sig, done => {
  void Promise.all(as.map(a => a.finished.catch(() => {}))).then(done);
  return () => {};
});

// one grow / hold / wither loop; T holds the timings, alive() lets a newer loop take over
export async function runLoop(host: Element, svg: SVGSVGElement, gen: Gen, T: Timing, o: LoopOptions): Promise<void> {
  const rnd = o.rnd ?? Math.random, still = !o.animate || !canAnimate(), sig = o.signal;
  // alive() is polled between phases; the signal also cuts every wait short
  const alive = () => !sig?.aborted && o.alive();
  if (sig?.aborted) return;
  const draw = () => {
    const { width: W, height: H } = host.getBoundingClientRect(), box = `0 0 ${W} ${H}`;
    svg.setAttribute('viewBox', box);
    svg.replaceChildren();
    o.over?.setAttribute('viewBox', box);
    o.over?.replaceChildren();
    // the still frame shows no sparks
    const rs = renderParts(svg, gen(W, H, rnd), still ? undefined : o.over);
    arm(rs, still);
    return rs;
  };
  if (still) { draw(); return; }
  if (o.startDelay) await sleep(o.startDelay, sig);
  let live: Animation[] = [];
  const stop = () => { for (const a of live) a.cancel(); live = []; };
  try {
    while (alive()) {
      // o.gate holds each new cycle (a row off screen waits to scroll into view)
      if (o.gate) await o.gate(sig);
      await visible(sig);
      if (!alive()) return;
      stop();
      const rs = draw();
      let end = 0;
      // a spin's group only turns; its children grow on their own, so it adds nothing to `end`
      const grow = rs.flatMap(({ part: p, el: e, len: L = 0 }) => {
        if (p.kind === 'spin' || p.kind === 'spark') return [];
        const delay = p.at * T.G;
        if (p.kind === 'line') {
          end = Math.max(end, delay + p.dur);
          return [e.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
            { duration: p.dur, delay, easing: p.dur >= T.G * .7 ? 'linear' : 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' })];
        }
        if (p.kind === 'move') { end = Math.max(end, delay + p.dur); return [e.animate(p.frames, { duration: p.dur, delay, fill: 'forwards' })]; }
        end = Math.max(end, delay + T.POP);
        return [e.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: T.POP, delay, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' })];
      });
      // spins turn through the whole cycle and sparks fly when they fly: neither is waited for
      const total = end + T.HOLD + T.WITHER + 1500;
      const side = rs.flatMap(({ part: p, el: e }) => {
        if (p.kind === 'spark') return [e.animate(p.frames, { duration: p.dur, delay: p.at * T.G, easing: 'linear', fill: 'forwards' })];
        if (p.kind !== 'spin') return [];
        e.style.transformBox = 'view-box';
        e.style.transformOrigin = `${p.cx}px ${p.cy}px`;
        return [e.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${p.deg}deg)` }], { duration: total, fill: 'forwards' })];
      });
      const hold = svg.animate([], { duration: end + T.HOLD });
      live = [...grow, ...side, hold];
      await settle([...grow, hold], sig);
      if (!alive()) return;
      // wither: a second wave erases everything in the order it grew (movers have already played out)
      const wither = rs.flatMap(({ part: p, el: e, len: L = 0 }) => {
        if (p.kind === 'move' || p.kind === 'spin' || p.kind === 'spark') return [];
        const delay = p.at * T.WITHER;
        if (p.kind === 'line') return [e.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -L }], { duration: p.dur * .8, delay, easing: 'ease-in', fill: 'forwards' })];
        return [e.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: T.POP * .8, delay, fill: 'forwards' })];
      });
      const pause = svg.animate([], { duration: range(rnd, 400, 1200) });
      live = [...grow, ...side, ...wither, pause];
      await settle([...wither, pause], sig);
    }
  } finally { stop(); }
}
