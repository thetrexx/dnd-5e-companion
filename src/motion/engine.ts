import type { Gen, Part, Rnd, Shape, Timing } from './types';
import { f1 } from './parts';
import { range } from './rand';

const NS = 'http://www.w3.org/2000/svg';
export interface Rendered { part: Part; el: SVGElement; len?: number }
export interface LoopOptions { animate: boolean; alive(): boolean; rnd?: Rnd; startDelay?: number; signal?: AbortSignal }

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
export function renderParts(svg: SVGSVGElement, parts: Part[]): Rendered[] {
  return parts.map(part => ({ part, el:
    part.kind === 'line' ? el('path', { d: part.d }, svg, part.cls)
    : part.kind === 'pop' ? group(svg, `translate(${f1(part.x)} ${f1(part.y)}) rotate(${part.rot.toFixed(0)})`, part.shapes, part.scale)
    : group(svg, `translate(${f1(part.x)} ${f1(part.y)})`, part.shapes) }));
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
    } else if (!still) r.el.style.opacity = '0';
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
    const { width: W, height: H } = host.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const rs = renderParts(svg, gen(W, H, rnd));
    arm(rs, still);
    return rs;
  };
  if (still) { draw(); return; }
  if (o.startDelay) await sleep(o.startDelay, sig);
  let live: Animation[] = [];
  const stop = () => { for (const a of live) a.cancel(); live = []; };
  try {
    while (alive()) {
      await visible(sig);
      if (!alive()) return;
      stop();
      const rs = draw();
      let end = 0;
      const grow = rs.map(({ part: p, el: e, len: L = 0 }) => {
        const delay = p.at * T.G;
        if (p.kind === 'line') {
          end = Math.max(end, delay + p.dur);
          return e.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
            { duration: p.dur, delay, easing: p.dur >= T.G * .7 ? 'linear' : 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
        }
        if (p.kind === 'move') { end = Math.max(end, delay + p.dur); return e.animate(p.frames, { duration: p.dur, delay, fill: 'forwards' }); }
        end = Math.max(end, delay + T.POP);
        return e.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: T.POP, delay, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' });
      });
      live = [...grow, svg.animate([], { duration: end + T.HOLD })];
      await settle(live, sig);
      if (!alive()) return;
      // wither: a second wave erases everything in the order it grew (movers have already played out)
      const wither = rs.flatMap(({ part: p, el: e, len: L = 0 }) => {
        const delay = p.at * T.WITHER;
        if (p.kind === 'line') return [e.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -L }], { duration: p.dur * .8, delay, easing: 'ease-in', fill: 'forwards' })];
        if (p.kind === 'move') return [];
        return [e.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: T.POP * .8, delay, fill: 'forwards' })];
      });
      const pause = svg.animate([], { duration: range(rnd, 400, 1200) });
      live = [...grow, ...wither, pause];
      await settle([...wither, pause], sig);
    }
  } finally { stop(); }
}
