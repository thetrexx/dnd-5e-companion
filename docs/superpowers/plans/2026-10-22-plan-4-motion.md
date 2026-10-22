# Plan 4: Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spell rows and page backgrounds get the approved procedural line-art motifs (grow, hold, wither, redraw), plus the Warlock mist and Sorcerer blood noise layers, all scaled by the animation strength setting, static under the phone's reduced-motion setting, and switched off entirely by Animation: Off.

**Architecture:** Pure, seedable generators in `src/motion/` turn a width, height and random source into a list of drawable parts (data only, no DOM), so they unit-test without a browser. One engine renders parts to SVG and runs the grow / hold / wither loop through the Web Animations API; one runner draws noise fields onto a low-resolution canvas. Two Preact components use them: `RowMotif` inside menu spell rows and `Background` behind every screen. Colours, opacities and the strength scale live only in the theme file.

**Tech Stack:** Preact 11, TypeScript 7, Vite 8, Vitest 5 (jsdom), Playwright. SVG + Web Animations API, 2D canvas. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` sections 7.3, 7.4, 7.5, 8 and 13. **Reference code:** `docs/superpowers/mockups/final.html` (approved mockup; its generators, timings and colours may be lifted directly, line ranges below).

## Global Constraints

- Every spell row (cantrips and spell levels) on the menu carries a faint wash in its class colour plus a procedural motif that grows in, holds, then withers in the order it grew, roughly every 10 seconds; a new random pattern every cycle; each row starts at a random offset; the motif fades out towards the right so text stays readable.
- Non-spell rows (Actions, Bonus Actions, Reactions, class actions, race, feats) get the gold wash only, no motif.
- Eldritch Knight and Arcane Trickster spell rows use the Wizard motif (`MenuRow.motif` already holds the list class).
- Backgrounds: same idea for the current class, bigger, about 3× slower, much fainter, at the screen edges with the centre faded out.
- Line art: SVG paths drawn with stroke-dash animation through the Web Animations API.
- Noise layers (warlock mist, sorcerer blood): 2D canvas at 1/4 to 1/5 resolution, scaled up and blurred, about 25 frames per second, roughly 1 ms per frame. Pause when the tab is hidden.
- **Animation: Off (owner decision, 2026-10-22): no patterns at all.** No motif SVGs, no background SVG, no canvases, no timers or animation frames: nothing to draw, for old phones and battery life. The static class-colour washes on rows stay.
- **Phone reduced-motion setting with Strength not Off** (spec 7.5): draw one static, fully grown frame of each motif and of the noise layers; no motion.
- Three modes, one source: `motionMode(): 'off' | 'static' | 'animated'` — `'off'` when the saved strength is `off`; else `'static'` when the phone prefers reduced motion; else `'animated'`.
- Strength setting scales all opacities (Faint, Medium = approved default, Strong). (`effectiveStrength` still reports `off` under reduced motion for the `data-strength` attribute; motion code uses `motionMode` instead.)
- **No colour, font or effect strength anywhere except `src/styles/themes/*.css`** (unit test `no-stray-colours` enforces colours). Canvas layers read colours from computed theme tokens when they start, and restart when the theme changes.
- **No pentagrams or hexagrams / star sigils anywhere** (owner ruled them out). Wizard background is the D&D dice set (d4, d6, d8, d12, d20) plus Weave threads.
- Animations must never make text hard to read, and must stay smooth on a mid-range phone with a full menu of animated rows. Motion layers never take pointer events.
- Node 22+. Tasks 1-6 run `npm test` and `npm run build`; Tasks 7-10 also run `npm run e2e`.

## Timings and values (from the mockup, binding)

- Row loop: grow `G = 3600` ms, hold `1600`, wither `3000`, pop `600`; first start after a random 0-3500 ms; pause between cycles random 400-1200 ms.
- Background loop: grow `7000`, hold `4000`, wither `6000`, pop `1400`.
- Strength scale `--motion-i`: Faint `.6`, Medium `1`, Strong `1.6`. `data-strength="off"` (saved Off, or reduced motion) uses `1` so the static frame under reduced motion shows at the approved Medium strength and the row washes keep their normal colour; with saved Off no motif is rendered anyway.
- Noise: mist canvas scale 5, period 17000 ms; blood canvas scale 4, period 15000 ms; frame gap 40 ms (25 fps); envelope gather 0-.35, hang .35-.6, fade .6-.92 of the period, smoothstepped. 7 blood cells.
- Layer opacities (× `--motion-i`): mist `.42` blur `5px`, blood `.5` blur `3px`, cells `.55`. Row motif opacity = `--<cls>-row-o`; background = `--<cls>-bg-o` (existing tokens); "No class" background colour `--accent`, opacity `.2`.
- Row motif mask: `linear-gradient(90deg,#000 40%,transparent 92%)`. Background mask: `radial-gradient(ellipse 70% 60% at 50% 50%,#0006 30%,#000 100%)`. Stroke widths: row thin .7 / normal 1 / thick 1.6 / thicker 2.6; background thin .8 / 1 / 1.6 / 3; `.faint` opacity .45 (row) / .5 (background).

## Review Focus

1. **Browsers without canvas or Web Animations** (jsdom, very old WebViews, `getContext('2d')` returning null, missing `Element.animate`): no crash; motifs fall back to the static frame, noise layers are skipped. Tests in Tasks 5 and 6.
2. **Navigating away mid-animation** (menu to card, card back, theme change): loops stop, no timers or rAF callbacks keep running against removed elements, no console errors. Tests in Tasks 5, 6, 8 and 9.
3. **Reduced motion on the phone with Strength left at Medium**: everything static, no running animations at all; **Animation: Off**: no motif or background layers in the page at all. Tests in Tasks 5, 8, 9 and 10.
4. **Hidden tab** (player switches app mid-session): noise layers stop drawing and row loops don't start new cycles while `document.hidden`. Tests in Tasks 5 and 6.
5. **Readability**: motif layers sit under the row text, fade out to the right, never catch taps; a dimmed row stays dimmed. Tests in Tasks 8 and 10.

---

## File Structure

**Create**
- `src/motion/types.ts`: `Rnd`, `Shape`, `Part`, `Gen`, `Timing`, `ROW_TIMING`, `BG_TIMING`.
- `src/motion/rand.ts`: `seeded(seed)`, `range(rnd, a, b)`.
- `src/motion/geom.ts`: path and shape helpers shared by all generators.
- `src/motion/rowMotifs.ts`: the 8 spell-row generators.
- `src/motion/bgMotifs.ts`: the 12 class backgrounds plus "No class".
- `src/motion/noise.ts`: Perlin/fbm, envelope, mist and blood field painters, blood-cell stepper, colour parsing.
- `src/motion/engine.ts`: render parts to SVG, the grow / hold / wither loop, static frame.
- `src/motion/noiseLayer.ts`: canvas runner.
- `src/motion/mode.ts`: `motionMode()` (reads settings + reduced motion), `themeRgb(token)`.
- `src/ui/RowMotif.tsx`, `src/ui/Background.tsx`.
- `src/logic/background.ts`: `backgroundClass(route, ch)`.
- `src/styles/motion.css`: structural CSS for motif layers (no colours, no strengths).
- Tests: `tests/unit/motion-geom.test.ts`, `motion-row.test.ts`, `motion-bg.test.ts`, `motion-noise.test.ts`, `motion-engine.test.ts`, `motion-noise-layer.test.ts`, `motion-ui.test.tsx`, `background.test.ts`; `tests/e2e/motion.spec.ts`.

**Modify**
- `src/styles/themes/faerun.css` (strength scale and motion tokens), `src/main.tsx` (import `motion.css`), `src/ui/MenuView.tsx` (motif + wash scaled by strength), `src/app.tsx` (Background behind every screen), `src/ui/screens/Settings.tsx` (only if a theme/strength change must restart layers; see Task 9), `README.md`.

---

### Task 1: Motion types, seeded random, geometry helpers

**Files:**
- Create: `src/motion/types.ts`, `src/motion/rand.ts`, `src/motion/geom.ts`
- Test: `tests/unit/motion-geom.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
export type Rnd = () => number;                       // [0, 1)
export interface Shape { tag: 'path' | 'circle' | 'ellipse'; attrs: Record<string, string | number>; cls?: string }
export type Part =
  | { kind: 'line'; d: string; at: number; dur: number; cls?: string }          // at: fraction of the grow phase
  | { kind: 'pop'; x: number; y: number; rot: number; scale?: number; at: number; shapes: Shape[] }
  | { kind: 'move'; x: number; y: number; at: number; dur: number; frames: Keyframe[]; shapes: Shape[] };
export type Gen = (W: number, H: number, rnd: Rnd) => Part[];
export interface Timing { G: number; HOLD: number; WITHER: number; POP: number }
export const ROW_TIMING: Timing;   // { G: 3600, HOLD: 1600, WITHER: 3000, POP: 600 }
export const BG_TIMING: Timing;    // { G: 7000, HOLD: 4000, WITHER: 6000, POP: 1400 }
```

- Produces (`rand.ts`): `seeded(seed: number): Rnd` (mulberry32), `range(rnd: Rnd, a: number, b: number): number`.
- Produces (`geom.ts`), ported from `final.html` 311-327, 438-456, 509-515, each taking `rnd` where the mockup used `Math.random`: `type Pt = [number, number]`; `toD(pts: Pt[]): string` (one decimal); `circ(cx, cy, r): string`; `curl(x, y, h, dir, r): Pt[]`; `wander(rnd, x, y, h, len, H, o?): { pts: Pt[]; h: number; x: number; y: number }`; `walk(rnd, x, y, h0, len, o?)` same return; `heading(pts, i): number`; `xf(pts, cx, cy, a, s): Pt[]`; `ring(n, r, off): Pt[]`; `DIE: Record<'d4'|'d6'|'d8'|'d12'|'d20', (cx, cy, r, a) => Pt[][]>`; `sword(x, y, a, L, s): Pt[][]`; `FIST: Pt[][]`; `UP = -Math.PI / 2`.

- [ ] **Step 1: Write the failing tests**

```ts
test('seeded random is deterministic and in range', () => {
  const a = seeded(42), b = seeded(42);
  const xs = Array.from({ length: 50 }, () => a());
  expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
  expect(xs.every(x => x >= 0 && x < 1)).toBe(true);
  expect(seeded(1)()).not.toBe(seeded(2)());
});
test('toD and circ', () => {
  expect(toD([[0, 0], [1.25, 2]])).toBe('M0.0 0.0L1.3 2.0');
  expect(circ(10, 10, 5)).toMatch(/^M15\.0 10\.0A5 5 0 1 1 5\.0 10\.0A/);
});
test('curl tightens and stops', () => {
  const c = curl(0, 0, 0, 1, 8);
  expect(c.length).toBeGreaterThan(10);
  expect(c.length).toBeLessThanOrEqual(121);
});
test('wander stays inside the row height band', () => {
  const w = wander(seeded(3), -4, 20, 0, 300, 40, { turb: .22 });
  expect(w.pts.every(([, y]) => y > -10 && y < 50)).toBe(true);
});
test('dice are closed line art, no star polygons', () => {
  for (const k of ['d4', 'd6', 'd8', 'd12', 'd20'] as const) {
    const shapes = DIE[k](0, 0, 10, 0);
    expect(shapes.length).toBeGreaterThan(1);
    const outline = shapes[0];
    expect(outline[0][0]).toBeCloseTo(outline.at(-1)![0]);
  }
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-geom.test.ts`
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: motion types, seeded random and geometry"`

---

### Task 2: Spell-row motif generators

**Files:**
- Create: `src/motion/rowMotifs.ts`
- Test: `tests/unit/motion-row.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `ROW_MOTIFS: Partial<Record<ClassId, Gen>>` with exactly the 8 casters `sorcerer`, `wizard`, `druid`, `warlock`, `cleric`, `paladin`, `bard`, `ranger`.

Port `GEN` from `final.html` 329-399 (`sor`, `wiz`, `dru`, `war`, `cle`, `pal`, `bar`, `ran`) to return data `Part`s: `line(...)` becomes `{ kind: 'line', d, at, dur, cls }`; `pop(...)` becomes `{ kind: 'pop', x, y, rot, at, shapes }` with the shape the mockup drew (`leaf` path, `bloom` circles, `fill` circles/ellipses/paths). Durations that the mockup expressed through `G` use `ROW_TIMING.G`. Shape classes stay `thick`, `thicker`, `thin`, `faint`, `fill`, `leaf`, `bloom`.

- [ ] **Step 1: Write the failing tests**

```ts
const KEYS = ['sorcerer', 'wizard', 'druid', 'warlock', 'cleric', 'paladin', 'bard', 'ranger'] as const;
test('one generator per spellcasting class', () => {
  expect(Object.keys(ROW_MOTIFS).sort()).toEqual([...KEYS].sort());
});
test.each(KEYS)('%s: valid parts inside a 320x38 row', k => {
  const parts = ROW_MOTIFS[k]!(320, 38, seeded(7));
  expect(parts.length).toBeGreaterThan(2);
  for (const p of parts) {
    expect(p.at).toBeGreaterThanOrEqual(0);
    expect(p.at).toBeLessThanOrEqual(1);
    if (p.kind === 'line') { expect(p.d).toMatch(/^M/); expect(p.d).not.toMatch(/NaN|Infinity/); expect(p.dur).toBeGreaterThan(0); }
    else { expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(p.shapes.length).toBeGreaterThan(0); }
  }
});
test.each(KEYS)('%s: deterministic per seed, new pattern per cycle', k => {
  expect(ROW_MOTIFS[k]!(320, 38, seeded(1))).toEqual(ROW_MOTIFS[k]!(320, 38, seeded(1)));
  expect(ROW_MOTIFS[k]!(320, 38, seeded(1))).not.toEqual(ROW_MOTIFS[k]!(320, 38, seeded(2)));
});
test('druid draws leaves and blossoms', () => {
  const cls = ROW_MOTIFS.druid!(320, 38, seeded(5)).flatMap(p => p.kind === 'line' ? [] : p.shapes.map(s => s.cls));
  expect(cls).toContain('leaf');
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-row.test.ts`
- [ ] **Step 3: Implement** `rowMotifs.ts`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: spell-row motif generators"`

---

### Task 3: Background generators

**Files:**
- Create: `src/motion/bgMotifs.ts`
- Test: `tests/unit/motion-bg.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `export type BgKey = ClassId | 'none'`; `BG_MOTIFS: Record<BgKey, Gen>`.

Port `BG` from `final.html` 517-637 (`dru`, `sor`, `wiz`, `war`, `bbn`, `ftr`, `mnk`, `rog`, `cle`, `pal`, `bar`, `ran`, `gold`) mapped to `druid`, `sorcerer`, `wizard`, `warlock`, `barbarian`, `fighter`, `monk`, `rogue`, `cleric`, `paladin`, `bard`, `ranger`, `none`. `big(g, k)` becomes `Part.pop.scale = k`; `mover(...)` becomes a `move` part (arrows, falling loot). Durations from `BGT` use `BG_TIMING`. Keep the mockup's comment line per generator.

- [ ] **Step 1: Write the failing tests**

```ts
const KEYS: BgKey[] = ['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard','none'];
test('a background for every class and for no class', () => expect(Object.keys(BG_MOTIFS).sort()).toEqual([...KEYS].sort()));
test.each(KEYS)('%s: valid parts on a 390x844 screen', k => {
  const parts = BG_MOTIFS[k](390, 844, seeded(11));
  expect(parts.length).toBeGreaterThan(2);
  for (const p of parts) {
    expect(p.at).toBeGreaterThanOrEqual(0);
    expect(p.at).toBeLessThanOrEqual(1);
    if (p.kind === 'line') expect(p.d).not.toMatch(/NaN|Infinity/);
    if (p.kind === 'move') expect(p.frames.length).toBeGreaterThan(1);
  }
});
test('wizard background: five dice outlines, threads, no star', () => {
  const lines = BG_MOTIFS.wizard(390, 844, seeded(3)).filter(p => p.kind === 'line');
  expect(lines.length).toBeGreaterThanOrEqual(5 + 6);
});
test('fighter shoots arrows, rogue drops loot', () => {
  expect(BG_MOTIFS.fighter(390, 844, seeded(4)).filter(p => p.kind === 'move')).toHaveLength(3);
  expect(BG_MOTIFS.rogue(390, 844, seeded(4)).filter(p => p.kind === 'move')).toHaveLength(8);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-bg.test.ts`
- [ ] **Step 3: Implement** `bgMotifs.ts`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: class background generators"`

---

### Task 4: Noise fields

**Files:**
- Create: `src/motion/noise.ts`
- Test: `tests/unit/motion-noise.test.ts`

**Interfaces:**
- Consumes: `Rnd`, `seeded` (Task 1).
- Produces:

```ts
export type Rgb = [number, number, number];
export function parseRgb(css: string): Rgb | null;              // '#a77be0', '#abc', 'rgb(1, 2, 3)'; null otherwise
export function makeNoise(rnd: Rnd): { perlin(x: number, y: number): number; fbm(x: number, y: number): number };
export function envelope(phase: number): number;                // 0..1, gather .35 / hang to .6 / fade to .92, smoothstep
export function veinY(x: number, t: number, W: number, H: number): number;
export function paintMist(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, fbm: (x: number, y: number) => number, rgb: Rgb): void;
export function paintBlood(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, W: number, H: number, fbm: (x: number, y: number) => number, base: Rgb, hi: Rgb): void;
export interface Cell { x: number; off: number; v: number; spin: number; vs: number }
export function makeCells(rnd: Rnd, W: number, n: number): Cell[];
export function stepCells(cells: Cell[], dt: number, t: number, W: number, H: number): { x: number; y: number; rot: number; sy: number }[];
```

Port from `final.html` 458-498. `paintMist` uses `rgb` where the mockup hard-coded `167,123,224`; `paintBlood` blends from `base` towards `hi` by `min(1, hi-factor)` where the mockup added fixed offsets. Cells wrap from `W + 10` to `-10`.

- [ ] **Step 1: Write the failing tests**

```ts
test('parseRgb', () => {
  expect(parseRgb('#a77be0')).toEqual([167, 123, 224]);
  expect(parseRgb(' #abc ')).toEqual([170, 187, 204]);
  expect(parseRgb('rgb(150, 18, 30)')).toEqual([150, 18, 30]);
  expect(parseRgb('nope')).toBeNull();
});
test('envelope gathers, hangs, fades', () => {
  expect(envelope(0)).toBe(0);
  expect(envelope(.45)).toBe(1);
  expect(envelope(.95)).toBe(0);
  expect(envelope(.2)).toBeGreaterThan(0);
  expect(envelope(.2)).toBeLessThan(1);
});
test('mist is transparent at envelope 0 and uses the theme colour', () => {
  const { fbm } = makeNoise(seeded(1)), px = new Uint8ClampedArray(20 * 20 * 4);
  paintMist(px, 20, 20, 3, 0, fbm, [1, 2, 3]);
  expect(Math.max(...px.filter((_, i) => i % 4 === 3))).toBe(0);
  paintMist(px, 20, 20, 3, 1, fbm, [1, 2, 3]);
  expect(Math.max(...px.filter((_, i) => i % 4 === 3))).toBeGreaterThan(0);
  expect([px[0], px[1], px[2]]).toEqual([1, 2, 3]);
});
test('blood stays near the vein in the lower third', () => {
  const { fbm } = makeNoise(seeded(2)), w = 40, h = 80, px = new Uint8ClampedArray(w * h * 4);
  paintBlood(px, w, h, 1, 1, 160, 320, fbm, [150, 18, 30], [200, 50, 60]);
  for (let j = 0; j < h * .4; j++) for (let i = 0; i < w; i++) expect(px[(j * w + i) * 4 + 3]).toBe(0);
});
test('cells ride left to right and wrap', () => {
  const cells = makeCells(seeded(3), 300, 7);
  expect(cells).toHaveLength(7);
  const x0 = cells[0].x;
  stepCells(cells, .5, 1, 300, 600);
  expect(cells[0].x).toBeGreaterThan(x0 - 1e-9);
  cells[0].x = 312; stepCells(cells, 0, 1, 300, 600);
  expect(cells[0].x).toBe(-10);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-noise.test.ts`
- [ ] **Step 3: Implement** `noise.ts`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: mist and blood noise fields"`

---

### Task 5: SVG engine

**Files:**
- Create: `src/motion/engine.ts`
- Test: `tests/unit/motion-engine.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces:

```ts
export function renderParts(svg: SVGSVGElement, parts: Part[]): Rendered[];   // builds DOM, returns handles
export interface Rendered { part: Part; el: SVGElement; len?: number }
export interface LoopOptions { animate: boolean; alive(): boolean; rnd?: Rnd; startDelay?: number }
export function runLoop(host: Element, svg: SVGSVGElement, gen: Gen, T: Timing, o: LoopOptions): Promise<void>;
```

Behaviour (port `arm` and `loop`, `final.html` 401-428):
- Each cycle: read the host's size, set `viewBox`, replace the SVG's children with `renderParts(gen(W, H, rnd))`, then arm: lines get `stroke-dasharray: L L+1` and `stroke-dashoffset` L (static mode: 0); pops/moves start at opacity 0 (static mode: untouched, fully shown).
- `animate: false`, or `Element.prototype.animate` / `getTotalLength` missing: draw one static fully grown frame and return.
- Otherwise grow (line dashoffset L to 0, easing linear when `dur >= .7 G` else `cubic-bezier(.2,.7,.3,1)`; pop opacity/scale 0 to 1 with `cubic-bezier(.3,1.4,.5,1)`; move along its frames), hold `T.HOLD`, wither in grow order (dashoffset 0 to -L, `ease-in`, `dur × .8`; pops shrink to .6 and fade, `T.POP × .8`), wait 400-1200 ms, repeat with a new pattern.
- `alive()` is checked before every phase; once false, cancel running animations and return. Before starting a new cycle, wait while `document.hidden` (resume on `visibilitychange`).
- `startDelay` (ms) waits before the first cycle.

- [ ] **Step 1: Write the failing tests** (jsdom: stub `SVGElement.prototype.getTotalLength = () => 100` and `Element.prototype.animate` with a fake returning `{ finished: Promise.resolve(), cancel: vi.fn() }`; restore after each test)

```ts
test('static frame when animation is off', async () => {
  const anim = vi.spyOn(Element.prototype, 'animate');
  const svg = mkSvg();
  await runLoop(host, svg, ROW_MOTIFS.wizard!, ROW_TIMING, { animate: false, alive: () => true, rnd: seeded(1) });
  expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  expect([...svg.querySelectorAll('path')].every(p => (p as SVGPathElement).style.strokeDashoffset === '0' || !p.style.strokeDasharray)).toBe(true);
  expect(anim).not.toHaveBeenCalled();
});
test('no Web Animations: falls back to the static frame', async () => { /* delete Element.prototype.animate; runLoop with animate:true resolves and paths exist */ });
test('animated: grows then withers, stops when not alive', async () => {
  let cycles = 0;
  await runLoop(host, svg, (W, H, r) => { cycles++; return ROW_MOTIFS.bard!(W, H, r); }, ROW_TIMING,
    { animate: true, alive: () => cycles < 2, rnd: seeded(2) });
  expect(cycles).toBe(2);
  expect(Element.prototype.animate).toHaveBeenCalled();
});
test('waits while the tab is hidden', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  let cycles = 0;
  const p = runLoop(host, svg, (W, H, r) => { cycles++; return []; }, ROW_TIMING, { animate: true, alive: () => cycles < 1, rnd: seeded(2) });
  await new Promise(r => setTimeout(r, 20));
  expect(cycles).toBe(0);
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  document.dispatchEvent(new Event('visibilitychange'));
  await p;
  expect(cycles).toBe(1);
});
test('renderParts builds paths and pop groups with classes', () => {
  const r = renderParts(svg, [{ kind: 'line', d: 'M0 0L5 5', at: 0, dur: 100, cls: 'thin' },
    { kind: 'pop', x: 1, y: 2, rot: 0, at: .5, shapes: [{ tag: 'circle', attrs: { r: 1 }, cls: 'fill' }] }]);
  expect(r).toHaveLength(2);
  expect(svg.querySelector('path.thin')).toBeTruthy();
  expect(svg.querySelector('g.pop circle.fill')).toBeTruthy();
});
```

(Use fake timers or `startDelay: 0` and short real waits so the suite stays fast; the pause between cycles may be injected as a tiny value through the timing in tests, e.g. a `Timing` with all zeros.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-engine.test.ts`
- [ ] **Step 3: Implement** `engine.ts`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS, output free of unhandled-rejection noise.
- [ ] **Step 5: Commit** — `git commit -m "feat: grow, hold and wither engine"`

---

### Task 6: Noise layer runner

**Files:**
- Create: `src/motion/noiseLayer.ts`
- Test: `tests/unit/motion-noise-layer.test.ts`

**Interfaces:**
- Consumes: Task 4, `Rnd`.
- Produces:

```ts
export interface NoiseOptions {
  scale: number; period: number; animate: boolean; alive(): boolean;
  paint(px: Uint8ClampedArray, w: number, h: number, t: number, e: number, W: number, H: number): void;
  tick?(t: number, e: number, dt: number): void;
}
export function runNoise(cv: HTMLCanvasElement, host: Element, o: NoiseOptions): () => void;   // returns stop()
```

Behaviour (port `noiseLayer`, `final.html` 466-477): canvas size `ceil(W/scale) × ceil(H/scale)`; `getContext('2d')` null: return a no-op stop. `animate: false`: paint once at `t = 0`, `e = 1` and return. Otherwise `requestAnimationFrame` loop drawing at most every 40 ms, `e = envelope((elapsed % period) / period)`, time excludes hidden periods (no draw while `document.hidden`). `stop()` or `alive()` false ends the loop (cancel the pending frame).

- [ ] **Step 1: Write the failing tests** (stub `HTMLCanvasElement.prototype.getContext` with a fake 2D context `{ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn() }`; drive frames with a stubbed `requestAnimationFrame`)

```ts
test('null 2D context: no crash, no frames', () => { /* getContext returns null; runNoise returns a function; rAF never called */ });
test('static: paints once with e = 1', () => { /* animate:false; paint called once with t 0, e 1; rAF not called */ });
test('throttles to 25 fps', () => { /* frames at 0,10,20,45,50,95 ms -> paint called at 0,45,95 */ });
test('skips frames while hidden and stops on stop()', () => { /* hidden -> no paint; stop() -> cancelAnimationFrame called, no more paints */ });
test('canvas is 1/scale of the host', () => { /* host 400x800, scale 5 -> canvas 80x160 */ });
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-noise-layer.test.ts`
- [ ] **Step 3: Implement** `noiseLayer.ts`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: low-resolution noise layer runner"`

---

### Task 7: Motion tokens and structural CSS

**Files:**
- Create: `src/styles/motion.css`, `src/motion/mode.ts`
- Modify: `src/styles/themes/faerun.css`, `src/main.tsx`
- Test: `tests/unit/themes.test.ts` (extend), `tests/unit/motion-ui.test.tsx` (mode part)

**Interfaces:**
- Produces (`mode.ts`): `export type MotionMode = 'off' | 'static' | 'animated'`; `motionMode(): MotionMode` (`loadSettings().strength === 'off'` gives `'off'`; else `reducedMotion()` gives `'static'`; else `'animated'`); `themeRgb(token: string): Rgb | null` (reads `getComputedStyle(document.documentElement).getPropertyValue(token)` through `parseRgb`).
- Produces (tokens in `faerun.css`): `--motion-i` per strength via `:root[data-theme="faerun"][data-strength="off|faint|medium|strong"]` = `1 / .6 / 1 / 1.6`; `--mist-o: .42`, `--mist-blur: 5px`, `--blood-o: .5`, `--blood-blur: 3px`, `--cells-o: .55`, `--none-line: var(--accent)`, `--none-bg-o: .2`, `--sorcerer-cell-core: #6a0d17`; `--row-motif-mask` and `--bg-motif-mask` (the two mask gradients from "Timings and values"; masks use alpha, not colour, but keep them as tokens so the theme owns them).
- Produces (`motion.css`, structural only): `.fx-row` (absolute, inset 0, `z-index:0`, `pointer-events:none`, `color: var(--fx-c)`, `opacity: calc(var(--motion-i) * var(--fx-o))`, mask `var(--row-motif-mask)`); `.fx-bg` (fixed, inset 0, `z-index:-1`, pointer-events none, mask `var(--bg-motif-mask)`, opacity `calc(var(--motion-i) * var(--fx-o))`); `.fx-mist` / `.fx-blood` canvas (fixed, inset `-12px`, blur and opacity from the tokens × `--motion-i`); `.fx-cells`; path rules (`fill:none; stroke:currentColor; stroke-linecap:round; stroke-linejoin:round`), stroke widths and `.faint` per the table, `.fill{fill:currentColor;stroke:none}`, `.leaf{fill:var(--druid-leaf)}`, `.bloom{fill:var(--druid-bloom)}`, `.pop{transform-box:fill-box;transform-origin:center}`. Row content (`.rl`) gets `position:relative; z-index:1` so text sits above the motif.

- [ ] **Step 1: Write the failing tests**

```ts
test('theme defines the motion tokens for every strength', () => {
  const css = readFileSync('src/styles/themes/faerun.css', 'utf8');
  for (const s of ['off', 'faint', 'medium', 'strong']) expect(css).toMatch(new RegExp(`data-strength="${s}"\\][^}]*--motion-i`));
  for (const t of ['--mist-o', '--blood-o', '--cells-o', '--sorcerer-cell-core', '--row-motif-mask', '--bg-motif-mask', '--none-bg-o']) expect(css).toContain(t);
});
test('motionMode: Off wins, reduced motion is static, otherwise animated', () => {
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' }); expect(motionMode()).toBe('off');
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'faint' }); expect(motionMode()).toBe('animated');
  vi.stubGlobal('matchMedia', () => ({ matches: true })); expect(motionMode()).toBe('static');
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' }); expect(motionMode()).toBe('off');
});
```

The existing `no-stray-colours` test must still pass with `motion.css` added.

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/themes.test.ts tests/unit/motion-ui.test.tsx`
- [ ] **Step 3: Implement** tokens, `motion.css` (imported in `main.tsx` after `screens.css`), `mode.ts`.
- [ ] **Step 4: Run** `npm test && npm run build && npm run e2e` — PASS (no visual change yet).
- [ ] **Step 5: Commit** — `git commit -m "feat: motion tokens and layer styles"`

---

### Task 8: Animated spell rows

**Files:**
- Create: `src/ui/RowMotif.tsx`
- Modify: `src/ui/MenuView.tsx`
- Test: `tests/unit/motion-ui.test.tsx`

**Interfaces:**
- Consumes: `ROW_MOTIFS`, `runLoop`, `ROW_TIMING`, `motionMode`.
- Produces: `RowMotif(p: { cls: ClassId })` — renders `<svg class="fx-row" aria-hidden="true" style="--fx-c: var(--<cls>-line); --fx-o: var(--<cls>-row-o)">`, starts `runLoop(parent row, svg, ROW_MOTIFS[cls], ROW_TIMING, { animate: mode === 'animated', alive, startDelay: random 0-3500 })` in an effect, and sets `alive` false on unmount. Renders nothing (no SVG, no effect work) for a class without a row motif or when `motionMode()` is `'off'`.

`MenuView`: rows with `r.motif` (cantrips and spell-level rows; character source rows have none) render `<RowMotif cls={r.motif} />` as the row's first child. The wash multiplies by `var(--motion-i)`: `calc(var(--<cls>-row-o) * var(--row-motif-scale) * var(--motion-i))` for motif rows, `calc(var(--row-wash) * var(--motion-i))` for the gold wash. A dimmed row keeps its row opacity (the motif inherits it).

- [ ] **Step 1: Write the failing tests**

```ts
test('spell rows get a motif layer, other rows do not', () => {
  const r = render(<Menu cls="sorcerer" level={5} />);
  const rows = [...r.container.querySelectorAll('a.row')];
  const withFx = rows.filter(a => a.querySelector('svg.fx-row'));
  expect(withFx.map(a => a.textContent)).toEqual(['Cantrips', ...Array.from({ length: 9 }, (_, i) => `Level ${i + 1} Spells`)]);
  expect(rows.find(a => a.textContent === 'Actions')!.querySelector('svg')).toBeNull();
  expect(withFx[0].querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
});
test('Eldritch Knight rows use the wizard motif', () => {
  const r = render(<Menu cls="fighter" level={3} sub="eldritch-knight" />);
  expect(r.container.querySelector('svg.fx-row')!.getAttribute('style')).toContain('--wizard-line');
});
test('reduced motion: static frame, no animations', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const anim = vi.spyOn(Element.prototype, 'animate');
  const r = render(<Menu cls="wizard" level={3} />);
  await waitFor(() => expect(r.container.querySelector('svg.fx-row path')).toBeTruthy());
  expect(anim).not.toHaveBeenCalled();
});
test('Animation: Off renders no motif layers at all', () => {
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
  const anim = vi.spyOn(Element.prototype, 'animate');
  const r = render(<Menu cls="wizard" level={3} />);
  expect(r.container.querySelector('svg.fx-row')).toBeNull();
  expect(anim).not.toHaveBeenCalled();
});
test('unmount stops the loop', async () => { /* render, unmount, advance timers past startDelay: renderParts not called again / no errors */ });
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/motion-ui.test.tsx`
- [ ] **Step 3: Implement** `RowMotif` and the `MenuView` changes.
- [ ] **Step 4: Run** `npm test && npm run build && npm run e2e` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: animated spell rows"`

---

### Task 9: Animated backgrounds

**Files:**
- Create: `src/logic/background.ts`, `src/ui/Background.tsx`
- Modify: `src/app.tsx`
- Test: `tests/unit/background.test.ts`, `tests/unit/motion-ui.test.tsx`

**Interfaces:**
- Consumes: `BG_MOTIFS`, `BgKey`, `runLoop`, `BG_TIMING`, `runNoise`, `makeNoise`, `paintMist`, `paintBlood`, `makeCells`, `stepCells`, `themeRgb`, `motionMode`, `Route`, `Character`, `optionSlots`, `DATA`.
- Produces: `backgroundClass(r: Route, ch: Character | null): BgKey`; `Background(p: { kind: BgKey; theme: string })`.

`backgroundClass` rules (spec 7.4):
- plain-class routes (`level`, `subclass`, `menu`, `spells`, `actions`, `card`): `r.cls` (*my call*: a picked class is "inside a class").
- `me`: the class with the most levels; a tie goes to the class taken first (lower index).
- `me-spells` / `me-actions` / `me-card` with a `section`: the class the section belongs to (`cantrips-<cls>`, `lvl-N-<cls>`, `class-<cls>`, `subclass-<cls>`, or `opt-<group>` resolved to the class owning that option slot); a race/feat/source section or no section: the menu's class. `me-card` for a feature without section: the class owning the feature (class/subclass source, or option slot), else the menu's class.
- everything else (`start`, `settings`, `edit`) and no character: `'none'`.

`Background`: renders nothing at all when `motionMode()` is `'off'`. Otherwise it renders `<div class="fx-bg-wrap" aria-hidden="true">` holding, for `sorcerer`, a `canvas.fx-blood` and `svg.fx-cells`; for `warlock`, a `canvas.fx-mist`; then `svg.fx-bg` with `--fx-c: var(--<kind>-line)` and `--fx-o: var(--<kind>-bg-o)` (`none`: `--none-line`, `--none-bg-o`). Starts `runLoop(document.documentElement-sized wrapper, svg, BG_MOTIFS[kind], BG_TIMING, { animate: mode === 'animated', alive })`; for the noise layers `runNoise` with scale 5 / period 17000 (mist, colour `themeRgb('--warlock-mist')`) or scale 4 / period 15000 (blood, `--sorcerer-blood`, `--sorcerer-blood-hi`; 7 cells drawn as two ellipses each in `--sorcerer-cell` / `--sorcerer-cell-core` via CSS classes, moved each tick with opacity `e × .85`). If a colour token is missing, skip that noise layer. Everything restarts when `kind`, `theme` or the motion mode changes (key the component on all three) and stops on unmount.

`App`: render `<Background kind={backgroundClass(r, ch)} theme={settings.theme} />` once, as the first child of a fragment wrapping whatever screen the route renders, so it persists across navigation and only restarts when its key changes. Load the character only once per render.

- [ ] **Step 1: Write the failing tests**

```ts
// background.test.ts
const ch = (classes: CharClass[]) => ({ ...emptyCharacter(), classes });
test('plain class routes use that class', () => {
  expect(backgroundClass({ page: 'menu', cls: 'bard', level: 3 }, null)).toBe('bard');
  expect(backgroundClass({ page: 'card', kind: 'spell', id: 'sleep', cls: 'wizard', level: 1 }, null)).toBe('wizard');
});
test('character menu: most levels, tie to the first class', () => {
  expect(backgroundClass({ page: 'me' }, ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 5 }]))).toBe('druid');
  expect(backgroundClass({ page: 'me' }, ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 3 }]))).toBe('sorcerer');
});
test('inside a class section, that class', () => {
  const c = ch([{ cls: 'sorcerer', level: 5 }, { cls: 'druid', level: 2 }]);
  expect(backgroundClass({ page: 'me-spells', section: 'lvl-1-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-actions', section: 'class-druid' }, c)).toBe('druid');
  expect(backgroundClass({ page: 'me-spells', section: 'cantrips-race-tiefling' }, c)).toBe('sorcerer');
});
test('no class screens', () => {
  for (const r of [{ page: 'start' }, { page: 'settings' }, { page: 'edit', step: 'basics' }] as Route[]) expect(backgroundClass(r, null)).toBe('none');
});
// motion-ui.test.tsx
test('warlock background has mist, sorcerer has blood and cells, others neither', () => {
  expect(render(<Background kind="warlock" theme="faerun" />).container.querySelector('canvas.fx-mist')).toBeTruthy();
  const s = render(<Background kind="sorcerer" theme="faerun" />).container;
  expect(s.querySelector('canvas.fx-blood') && s.querySelector('svg.fx-cells')).toBeTruthy();
  expect(render(<Background kind="cleric" theme="faerun" />).container.querySelector('canvas')).toBeNull();
});
test('Animation: Off renders no background layers', () => {
  saveSettings({ ...DEFAULT_SETTINGS, strength: 'off' });
  const c = render(<Background kind="sorcerer" theme="faerun" />).container;
  expect(c.querySelector('svg, canvas')).toBeNull();
});
test('background persists across navigation within a class', async () => { /* render <App/> at #/menu/bard/3, change hash to #/spells/bard/3: the same svg.fx-bg element is still in the document */ });
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/background.test.ts tests/unit/motion-ui.test.tsx`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build && npm run e2e` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: animated class backgrounds with mist and blood"`

---

### Task 10: End-to-end checks and docs

**Files:**
- Create: `tests/e2e/motion.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the e2e tests**

1. **Rows animate:** `./#/menu/sorcerer/5`: every spell row has `svg.fx-row`, and within 6 s at least one of them has a `path`; `document.getAnimations().length > 0`; the Actions row has no `svg`. Tapping `Level 1 Spells` still navigates (motif never catches the tap).
2. **Background:** `./#/menu/warlock/5` shows `svg.fx-bg` and `canvas.fx-mist`; `./#/menu/sorcerer/5` shows `canvas.fx-blood`; `./` shows `svg.fx-bg` and no canvas.
3. **Reduced motion:** `page.emulateMedia({ reducedMotion: 'reduce' })`, `./#/menu/wizard/5`: `svg.fx-row path` present, `document.getAnimations().length === 0` after 2 s.
4. **Off:** set Animation to `Off` in Settings, open `./#/menu/druid/5`: no `svg.fx-row`, no `svg.fx-bg`, no `canvas` in the page, and `document.getAnimations().length === 0`; switching back to Medium and reopening the menu brings the motifs back.
5. **No console errors** while navigating menu, spells page, a card and back (collect `page.on('console')` errors and `pageerror`).
6. **320 px:** `./#/menu/bard/20` has no horizontal scroll (same check as `subclass.spec.ts`).

- [ ] **Step 2: Run** `npm run e2e` — PASS. Fix any failure at its cause in the owning file.
- [ ] **Step 3: Update `README.md`**: drop the "animated class backgrounds are still being built" part of the WIP note; one line under a short **Motion** heading: the Animation setting (Faint, Medium, Strong; Off removes the patterns entirely to save battery), and that the phone's reduced-motion setting shows them still.
- [ ] **Step 3b: Settings hint**: in `src/ui/screens/Settings.tsx` change "Your phone's reduced-motion setting turns animations off." to "Your phone's reduced-motion setting keeps the patterns still." (update any test asserting the old text).
- [ ] **Step 4: Run everything** — `npm test && npm run build && npm run e2e` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "test: motion end to end; docs: README motion"`
