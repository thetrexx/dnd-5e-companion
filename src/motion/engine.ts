import type { Gen, Part, Rnd, Shape, Timing } from './types';
import { f1 } from './parts';
import { range } from './rand';

const NS = 'http://www.w3.org/2000/svg';
export interface Rendered { part: Part; el: SVGElement; len?: number }
// over: an unmasked layer for sparks; without it sparks are dropped
// seen: reports the host going off and on screen (returns an unsubscribe); the running cycle pauses while off
export interface LoopOptions {
  animate: boolean; alive(): boolean; rnd?: Rnd; startDelay?: number; signal?: AbortSignal;
  gate?(sig?: AbortSignal): Promise<void>; over?: SVGSVGElement; seen?(on: (shown: boolean) => void): () => void;
}

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

export const canAnimate = () => typeof Element.prototype.animate === 'function'
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
    else if (still && r.part.kind === 'move' && r.part.still !== undefined) {
      const f = nearest(r.part.frames, r.part.still);
      if (f?.transform != null) r.el.style.transform = String(f.transform);
      if (f?.opacity != null) r.el.style.opacity = String(f.opacity);
    }
    // shown whole: a part that was hidden for its grow (a turn cut short) appears at once
    else if (still) r.el.style.opacity = '';
  }
}
// the keyframe whose offset is closest to `at` (the lower one on a tie); frames without an offset are evenly spaced
function nearest(frames: Keyframe[], at: number): Keyframe | undefined {
  let best: Keyframe | undefined, gap = Infinity;
  frames.forEach((f, i) => {
    const d = Math.abs((f.offset ?? (frames.length > 1 ? i / (frames.length - 1) : 0)) - at);
    if (d < gap - 1e-9) { best = f; gap = d; }
  });
  return best;
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
// reports el going on and off screen until unsubscribed; without IntersectionObserver it reports nothing
export const watchScreen = (el: Element) => (on: (shown: boolean) => void) => {
  if (typeof IntersectionObserver !== 'function') return () => {};
  const io = new IntersectionObserver(es => { const e = es[es.length - 1]; if (e) on(e.isIntersecting); });
  io.observe(el);
  return () => io.disconnect();
};
const settle = (as: Animation[], sig?: AbortSignal) => wait(sig, done => {
  void Promise.all(as.map(a => a.finished.catch(() => {}))).then(done);
  return () => {};
});

// the drawing for the host's current size; sparks go to over, and the still frame shows none
function drawParts(host: Element, svg: SVGSVGElement, gen: Gen, rnd: Rnd, still: boolean, over?: SVGSVGElement): Rendered[] {
  const { width: W, height: H } = host.getBoundingClientRect(), box = `0 0 ${W} ${H}`;
  svg.setAttribute('viewBox', box);
  svg.replaceChildren();
  over?.setAttribute('viewBox', box);
  over?.replaceChildren();
  const rs = renderParts(svg, gen(W, H, rnd), still ? undefined : over);
  arm(rs, still);
  return rs;
}
// the grow wave; end is when its last part is done
function growAnims(rs: Rendered[], T: Timing): { anims: Animation[]; end: number } {
  let end = 0;
  // a spin's group only turns; its children grow on their own, so it adds nothing to `end`
  const anims = rs.flatMap(({ part: p, el: e, len: L = 0 }) => {
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
  return { anims, end };
}
// spins turn for `turn` ms and sparks fly when they fly: neither is waited for
function sideAnims(rs: Rendered[], T: Timing, turn: number): Animation[] {
  return rs.flatMap(({ part: p, el: e }) => {
    if (p.kind === 'spark') return [e.animate(p.frames, { duration: p.dur, delay: p.at * T.G, easing: 'linear', fill: 'forwards' })];
    if (p.kind !== 'spin') return [];
    e.style.transformBox = 'view-box';
    e.style.transformOrigin = `${p.cx}px ${p.cy}px`;
    return [e.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${p.deg}deg)` }], { duration: turn, fill: 'forwards' })];
  });
}
// the wither wave: it erases everything in the order it grew (movers have already played out)
function witherAnims(rs: Rendered[], T: Timing): Animation[] {
  return rs.flatMap(({ part: p, el: e, len: L = 0 }) => {
    if (p.kind === 'move' || p.kind === 'spin' || p.kind === 'spark') return [];
    const delay = p.at * T.WITHER;
    if (p.kind === 'line') return [e.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -L }], { duration: p.dur * .8, delay, easing: 'ease-in', fill: 'forwards' })];
    return [e.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: T.POP * .8, delay, fill: 'forwards' })];
  });
}

// a drawing on screen and the finished animations that hold it drawn
export interface Drawing { rs: Rendered[]; anims: Animation[] }
export function drawStill(host: Element, svg: SVGSVGElement, gen: Gen, rnd: Rnd = Math.random): Drawing {
  return { rs: drawParts(host, svg, gen, rnd, true), anims: [] };
}
// one turn of a drawing that otherwise stands still: it withers, and a new one grows in its place and stays.
// Aborted (its row left the screen or the page), whatever is drawn shows whole and still at once
export async function playTurn(host: Element, svg: SVGSVGElement, gen: Gen, T: Timing, d: Drawing, o: { signal: AbortSignal; rnd?: Rnd }): Promise<Drawing> {
  const rnd = o.rnd ?? Math.random, sig = o.signal;
  if (sig.aborted) return d;
  const wither = [...witherAnims(d.rs, T), svg.animate([], { duration: range(rnd, 400, 1200) })];
  await settle(wither, sig);
  // cut short, the wither lets go and the old drawing (held by its own animations, if any) is whole again
  if (sig.aborted) { for (const a of wither) a.cancel(); return d; }
  for (const a of [...d.anims, ...wither]) a.cancel();
  const rs = drawParts(host, svg, gen, rnd, false), { anims: grow, end } = growAnims(rs, T);
  const anims = [...grow, ...sideAnims(rs, T, end)];
  await settle(grow, sig);
  if (sig.aborted) { for (const a of anims) a.cancel(); arm(rs, true); return { rs, anims: [] }; }
  return { rs, anims };
}

// one grow / hold / wither loop; T holds the timings, alive() lets a newer loop take over
export async function runLoop(host: Element, svg: SVGSVGElement, gen: Gen, T: Timing, o: LoopOptions): Promise<void> {
  const rnd = o.rnd ?? Math.random, still = !o.animate || !canAnimate(), sig = o.signal;
  // alive() is polled between phases; the signal also cuts every wait short
  const alive = () => !sig?.aborted && o.alive();
  if (sig?.aborted) return;
  const draw = () => drawParts(host, svg, gen, rnd, still, o.over);
  if (still) { draw(); return; }
  if (o.startDelay) await sleep(o.startDelay, sig);
  if (sig?.aborted) return;
  let live: Animation[] = [], off = false, held: Animation[] = [];
  const stop = () => { for (const a of live) a.cancel(); live = []; held = []; };
  // off screen: pause what is running (paused animations never finish, so the loop waits);
  // back on: play only those, since playing a finished animation would replay it
  const freeze = () => { for (const a of live) if (a.playState === 'running') { a.pause(); held.push(a); } };
  const thaw = () => { for (const a of held) if (a.playState === 'paused') a.play(); held = []; };
  const unwatch = o.seen?.(shown => {
    if (shown === !off) return;
    off = !shown;
    if (off) freeze(); else thaw();
  }) ?? (() => {});
  // the signal unsubscribes at once, not only once the loop unwinds
  sig?.addEventListener('abort', unwatch);
  try {
    while (alive()) {
      // o.gate holds each new cycle (a row off screen waits to scroll into view)
      if (o.gate) await o.gate(sig);
      await visible(sig);
      if (!alive()) return;
      stop();
      const rs = draw(), { anims: grow, end } = growAnims(rs, T);
      // spins turn through the whole cycle
      const side = sideAnims(rs, T, end + T.HOLD + T.WITHER + 1500);
      const hold = svg.animate([], { duration: end + T.HOLD });
      live = [...grow, ...side, hold];
      if (off) freeze();
      await settle([...grow, hold], sig);
      if (!alive()) return;
      const wither = witherAnims(rs, T);
      const pause = svg.animate([], { duration: range(rnd, 400, 1200) });
      live = [...grow, ...side, ...wither, pause];
      // the row may have left between the grow ending and the wither starting
      if (off) freeze();
      await settle([...wither, pause], sig);
    }
  } finally { stop(); unwatch(); sig?.removeEventListener('abort', unwatch); }
}
