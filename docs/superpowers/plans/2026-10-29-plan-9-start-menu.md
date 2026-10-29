# Plan 9: Start Menu Redesign and Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the start screen as one full-width column of class buttons (A–Z, Artificer first). Each class button has twin-strand ribbons plus its class animation, and Barbarian gets a new blood-spray motif. My Character Sheet becomes a gold button with a shine and the person_edit icon. The app is renamed "D&D 5E Cheat Sheet".

**Architecture:**
- **Pure geometry in `src/motion/`:**
  - the strand shape (`strands.ts`);
  - the Barbarian blood spray and the per-class menu motif choice (`menuMotifs.ts`);
  - one small engine addition, a still-frame offset on `move` parts.
- **Rendering in `src/ui/`:**
  - `Strands.tsx` draws two SVG ribbons per button. One shared, throttled `requestAnimationFrame` loop (`src/motion/strandLoop.ts`) drives them, and they pause off screen.
  - The existing `RowMotif` draws the class animation, with two new optional props.
- `Start.tsx` and its CSS are rewritten; nothing else on other screens changes.

**Tech Stack:** Preact + TypeScript + Vite, Vitest (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-start-menu-redesign-design.md`. It extends `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` (base spec; section 7.5 = motion modes).

**Mockup (approved look, reference code):** `docs/superpowers/mockups/start-menu.html`, phone "E2". Lift from it:
- `ribbon()`, for the strand geometry;
- `STYLES.twin` with the E config `{ pa: .22, pb: .1, edge: .85, floor: .75 }`;
- `bloodSpray()`;
- the `.mb.me` CSS, for the My Character Sheet look;
- `PERSON_EDIT`, the icon path. Copy it character for character.

Everything else in that file is a rejected alternative. To run the mockup, see spec section 9.

## Global Constraints

- **Colours only from theme tokens** in `src/styles/themes/faerun.css`. `tests/unit/no-stray-colours.test.ts` fails on any `#hex`, `rgb(`, `rgba(`, `hsl(` under `src/` outside `src/styles/themes/`, and that includes `#000` in a mask. The strength scale is always read as `var(--motion-i, 1)`, never `var(--motion-i)` (same test file).
- **Motion modes**, from base spec 7.5 and spec section 6. `motionMode()` in `src/motion/mode.ts` returns one of:
  - `'animated'`: everything moves.
  - `'static'` (reduced motion): strands drawn once and still; class animation as one still frame; no shine.
  - `'off'`: strands drawn once and still; **no** class animation layer (`svg.fx-row` absent); no shine.
- **Approved values** (spec sections 3–5):
  - class buttons: 17px text, 38px icon, about 58px tall, about 4px apart;
  - My Character Sheet: about 74px tall, about 10px below it; lines at accent colour .75 opacity; wash about 8% accent; shine peak about .28, every ~4.8 s, sweep about 1.5 s;
  - strands: A peak .22 in `--<cls>`, B peak .10 in `--<cls>-line`, edge .85, thickness floor .75, blur stdDeviation 2.2, `mix-blend-mode: screen`;
  - blood spray: in `--sorcerer-blood-hi`.
- **Saved data unchanged:** backup prefixes `SS1-`/`SS0-`, storage keys `dndcs.*`, every id. `tests/unit/character-code.test.ts` (frozen codes) must stay green in every task.
- **Other screens unchanged.** `RowMotif`'s new props are optional and default to today's behaviour. `Menu` rows are untouched.
- **Size:** built JS ≤ 450 KB gzipped (today about 241 KB).
- **Git:** work in worktree `.worktrees/plan-9-start-menu` on branch `plan-9-start-menu`. Ask the owner before merging or pushing; a push to main deploys.

## Review Focus

1. **Window resize or phone rotation** while on the start screen. The strands redraw at the new width, with the wavelength unchanged in px. Pinned in Task 4.
2. **A wide window** (1280×800 desktop). The strands reach past the column, fade out before the window edge, and the page never scrolls sideways. Pinned in Task 7.
3. **Leaving the start screen.** Every strand subscription and motif loop stops on unmount, and no `requestAnimationFrame` callback runs afterwards. Pinned in Task 4.
4. **A long character name** (40 characters) in the My Character Sheet subtitle wraps inside the button at 320px without sideways scroll. Pinned in Task 7.
5. **Switching Animation to Off in Settings, then back to the start screen.** Strands are still there (static), class animations and the shine are gone; Medium brings them back. Pinned in Task 5 (unit) and Task 7 (e2e).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/motion/types.ts`, `src/motion/parts.ts`, `src/motion/engine.ts` | `move` parts gain optional `still` (static-mode keyframe) |
| `src/motion/menuMotifs.ts` (new) | `bloodSpray` generator; `menuMotif(cls)`, `menuTone(cls)` |
| `src/motion/strands.ts` (new) | pure strand geometry: `makeStrands`, `strandAt`, `strandD`, `strandStops` |
| `src/motion/strandLoop.ts` (new) | one shared, throttled rAF loop for all strands |
| `src/ui/Strands.tsx` (new) | the strand SVG per button; modes, off-screen pause, resize |
| `src/ui/PersonEditIcon.tsx` (new) | inline Material Symbols `person_edit` |
| `src/ui/RowMotif.tsx` | optional `gen` and `tone` props |
| `src/ui/screens/Start.tsx`, `src/styles/screens.css`, `src/styles/motion.css`, `src/styles/themes/faerun.css` | the new start screen and its tokens |
| `src/data/index.ts`, `src/ui/editor/StepClasses.tsx` | `classesAZ()`; editor class step A–Z |
| `index.html`, `public/manifest.webmanifest`, `src/character/code.ts`, `README.md` | rename, Material Symbols credit |
| `tests/unit/motion-engine.test.ts`, `tests/unit/motion-menu.test.ts` (new), `tests/unit/motion-strands.test.ts` (new), `tests/unit/motion-ui.test.tsx`, `tests/unit/screens.test.tsx`, `tests/unit/editor.test.tsx`, `tests/unit/character-code.test.ts` | unit tests |
| `tests/e2e/start.spec.ts` (new), `tests/e2e/artificer.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/settings.spec.ts` | e2e |

---

### Task 1: Still-frame offset for `move` parts

**Files:** Modify `src/motion/types.ts`, `src/motion/parts.ts`, `src/motion/engine.ts`. Test: `tests/unit/motion-engine.test.ts`.

**Interfaces:**
- Produces: in `Part`, the `move` variant gains `still?: number`. It is an offset in [0, 1] into `frames`; only the static frame uses it. Signature: `mover(x, y, at, dur, frames, shapes, still?: number): Part`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/motion-engine.test.ts`. Use a one-part generator `() => [mover(0, 0, 0, 1000, frames, [shape('circle', { r: 2 })], .45)]`, where `frames` are 11 keyframes with `offset: k/10` and `transform: \`translate(${k * 10}px, 0px)\``, plus opacity 0 at the ends and 1 in between:
  - `'static frame: a mover with still shows its nearest keyframe'`. Run `runLoop` with `animate: false`. The `g.pop` gets `style.transform === 'translate(40px, 0px)'` (offset .4 is nearest .45; on a tie take the lower offset) and `style.opacity === '1'`.
  - `'static frame: a mover without still stays at its start'`. The same mover with `still` omitted leaves `style.transform === ''`.
  - `'animated: still is ignored'`. With `animate: true`, the `g.pop` has `style.transform === ''` after `draw`, and it is animated with its frames as before.
- [ ] **Step 2: Run** `npx vitest run tests/unit/motion-engine.test.ts`. Expected: the first test FAILS (transform empty).
- [ ] **Step 3: Implement.** Add the type field and the `mover` parameter, and leave the key out when it is undefined, as `pop` does with `scale`. In `engine.ts` `arm(rs, still)`, when `still` is true and the part is a `move` with `still` set, copy `transform` and `opacity` from the frame whose `offset` is nearest. Frames without an explicit `offset` count as evenly spaced.
- [ ] **Step 4: Run** `npx vitest run tests/unit/motion-engine.test.ts tests/unit/motion-bg.test.ts tests/unit/motion-row.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(motion): still-frame offset for move parts"`.

### Task 2: Blood spray and the menu motif choice

**Files:** Create `src/motion/menuMotifs.ts`, `tests/unit/motion-menu.test.ts`.

**Interfaces:**
- Consumes: `mover(..., still)` (Task 1); `ROW_MOTIFS` (`rowMotifs.ts`); `BG_MOTIFS` (`bgMotifs.ts`); `ROW_TIMING` (`types.ts`).
- Produces:
  - `export const bloodSpray: Gen`;
  - `export function menuMotif(cls: ClassId): Gen`: `barbarian` → `bloodSpray`; otherwise `ROW_MOTIFS[cls] ?? BG_MOTIFS[cls]`;
  - `export function menuTone(cls: ClassId): string`: the CSS token for the motif colour, `'--barbarian-blood'` for barbarian, else `` `--${cls}-line` ``.

- [ ] **Step 1: Write the failing tests** in `tests/unit/motion-menu.test.ts`:
  - `'menuMotif: barbarian sprays blood, fighter/monk/rogue use their background, casters their row motif'`. Expect `menuMotif('barbarian') === bloodSpray`, `menuMotif(c) === BG_MOTIFS[c]` for `fighter`, `monk`, `rogue`, and `menuMotif(c) === ROW_MOTIFS[c]` for the other 9.
  - `'menuTone: blood for barbarian, line colour otherwise'`.
  - `test.each([1..8])('bloodSpray (seed %i): 28 drops cross the button left to right', ...)`, at `W = 358, H = 58`:
    - exactly 28 `move` parts;
    - each starts at `x < 0` and has `still === .45`;
    - `8500 <= dur <= 12500`;
    - 11 frames, offsets `k/10`, first and last opacity 0;
    - the last frame's translate x plus the part's x is greater than W;
    - no `NaN` or `Infinity` anywhere (`JSON.stringify` check).
  - `'bloodSpray: 7 big drops leave 3 faint spatter dots each'`. There are 21 `pop` parts, each a single `circle` with class `'fill faint'`.
  - `'bloodSpray: deterministic per seed, new pattern per cycle'`, in the same form as `tests/unit/motion-row.test.ts`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/motion-menu.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `bloodSpray` by porting the mockup's `bloodSpray()`, using `rnd` for every random value and the helpers `range`, `mover`, `pop`, `shape`. Values are as in the mockup:
  - `y0 = H·R(.4,.6)`.
  - 28 drops. The first 7 are big:
    - radius: big `R(3.2,5)`, small `R(1.1,2.4)`;
    - `at`: big `R(0,.35)`, small `R(0,.6)`;
    - `dur`: big `R(10500,12500)`, small `R(8500,11000)`;
    - start and travel: `x0 = −R(10,30)`, `dx = W + 60`;
    - `spread`: big `R(−.18,.18)·H`, small `R(−.45,.45)·H`;
    - `sag = R(.04,.2)·H`, `wob = R(0,6.28)`.
  - Spatter: 3 per big drop. Each is at `t = R(.25,.75)`, has radius `r·R(.35,.6)`, a y jitter of `R(−4,4)`, and `at = at_drop + t·dur/ROW_TIMING.G`.
  - The frame formula and the teardrop path are the part the signature does not fix:

```ts
// drop k of 10, t = k/10
const x = dx * t, y = spread * t + sag * t * t + Math.sin(t * 7 + wob) * r * .6;
const ang = Math.atan2(spread + 2 * sag * t, dx) * 180 / Math.PI;
const st = 1 + (big ? 1.1 : .6) * Math.sin(Math.PI * Math.min(1, t * 1.4));
const opacity = t < .06 ? t / .06 : t > .82 ? (1 - t) / .18 : 1;
// transform: `translate(${x}px, ${y}px) rotate(${ang}deg) scale(${st}, ${1 / Math.sqrt(st)})`, numbers to 1-2 decimals
// teardrop (class 'fill'): M r 0 C r 1.15r -.8r .85r -3.2r 0 C -.8r -.85r r -1.15r r 0 Z
```
- [ ] **Step 4: Run** `npx vitest run tests/unit/motion-menu.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(motion): barbarian blood spray and menu motif choice"`.

### Task 3: Strand geometry

**Files:** Create `src/motion/strands.ts`, `tests/unit/motion-strands.test.ts`.

**Interfaces:**
- Produces:
  - `export interface Strand { p: number; amp: number; k: number; sp: number; ph: number; k2: number; sp2: number; ph2: number; w: number; pinch: number; floor: number }`
  - `export const STRAND_SPAN = 390` (px one wave pattern spans; it fixes the wavelength), `STRAND_HOLD = 120`, `STRAND_FADE = 120`.
  - `export function makeStrands(rnd: Rnd): [Strand, Strand]`. A is `{ p: 1.1, amp: .2, k: 1.05, sp: R(.5,.75), ph: R(0,6), k2: .9, sp2: sp, ph2: R(0,6), w: .17, pinch: .25, floor: .75 }`. B is `{ ...A, sp: −A.sp·.9, ph: A.ph + π, ph2: R(0,6), w: .13 }`.
  - `export function strandAt(x: number, W: number, H: number, col: number, t: number, s: Strand): { cy: number; half: number }`. Here `x` is px in the layer, `W` the layer width, `col` the content column width centred in W, and `t` seconds.
  - `export function strandD(W: number, H: number, col: number, t: number, s: Strand): string`. It is a closed band from x = 0 to x = W, sampled every 7px or less (at least 8 points), with 1-decimal numbers.
  - `export function strandStops(col: number, edge?: number): [offset: number, factor: number][]`. These are gradient stops over the span from `cl − 240` to `cl + col + 240`, where `cl = (W − col)/2`; `edge` defaults to .85.
- `strandAt` must give the mockup's `ribbon()` exactly when `W = col = STRAND_SPAN`:

```ts
const cl = (W - col) / 2, u = Math.min(1, Math.max(0, (x - cl) / col)), q = (x - cl) / STRAND_SPAN;
const env = s.floor + (1 - s.floor) * Math.pow(Math.sin(Math.PI * u), s.p);
const cy = H / 2 + s.amp * H * Math.sin(s.k * 2 * Math.PI * q + t * s.sp + s.ph) * (.35 + .65 * env);
const half = s.w * H * env * (s.pinch + (1 - s.pinch) * Math.abs(Math.cos(s.k2 * 2 * Math.PI * q - t * s.sp2 + s.ph2)));
```
- Stops for span `S = col + 480`, as (offset, factor of peak): `0→0`, `120/S→edge`, `240/S→edge`, `(240 + .225·col)/S→(edge+1)/2`, `.5→1`, then the mirror of those.

- [ ] **Step 1: Write the failing tests** in `tests/unit/motion-strands.test.ts`:
  - `'makeStrands: approved shapes, strands move against each other'`. B.sp has the opposite sign to A.sp, `B.ph === A.ph + Math.PI`, widths are `.17`/`.13`, floor is `.75`, and the result is deterministic per seed.
  - `'strandD on a 390 phone: edge to edge, finite, within the approved thickness'`, at `W = col = 390, H = 74`. The path starts at x `0.0`, reaches `390.0`, and contains no `NaN`. For x in 0..390, `half <= .17·74` and `half >= .17·74·.75·.25 − 1e-9`.
  - `'wavelength is fixed in px: a wide window shows the same waves at the same column position'`. `strandAt(cl + 100, 1280, 74, 480, 3, A).cy` equals `strandAt(100, 480, 74, 480, 3, A).cy`, with `cl = 400`.
  - `'outside the column the strand keeps its edge thickness'`. On a 1280-wide layer, `half` at x = 50 (outside the column) equals what the same formula gives at u = 0, at the same phase.
  - `'strandStops: fade to zero 240px past the column, full strength at the centre'`. For `strandStops(480)`: offsets ascend inside [0, 1]; the factors are symmetric; the first and last factor is 0; the factor is 1 at offset .5; offsets `120/960` and `240/960` have factor `.85`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/motion-strands.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `src/motion/strands.ts`. It is pure and has no DOM.
- [ ] **Step 4: Run** `npx vitest run tests/unit/motion-strands.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(motion): twin-strand geometry"`.

### Task 4: Strands on screen: shared loop and component

**Files:** Create `src/motion/strandLoop.ts`, `src/ui/Strands.tsx`. Modify `src/styles/motion.css`, `src/styles/themes/faerun.css`. Test: `tests/unit/motion-ui.test.tsx` (new `describe('strands')`).

**Interfaces:**
- Consumes: Task 3 exports; `watchScreen` (`engine.ts`); `motionMode` (`mode.ts`); `useResized` (`useResized.ts`).
- Produces:
  - `export const STRAND_FPS = 30; export function onStrandFrame(cb: (t: number) => void): () => void`. This is one `requestAnimationFrame` loop shared by all callbacks. It calls each callback with `t` in seconds at most `STRAND_FPS` times a second, stops requesting frames when the last callback unsubscribes, and the returned function unsubscribes. A hidden tab needs no extra code, because rAF does not fire while hidden.
  - `export function Strands(p: { cls: ClassId }): JSX.Element`. It renders `<svg class="strands" aria-hidden="true">` holding:
    - `<defs>`: two `linearGradient`s with `gradientUnits="userSpaceOnUse"`, from x `cl − 240` to `cl + col + 240`, with stops from `strandStops(col)`. A's stops are in `var(--<cls>)`, B's in `var(--<cls>-line)`. Stop opacity is the factor times `var(--strand-a-o)` or `var(--strand-b-o)` times `var(--motion-i, 1)`.
    - One `feGaussianBlur` filter, `stdDeviation="2.2"`.
    - Two `path`s.
  - Sizes come from the DOM. `W` and `H` are the svg's own rect. `col` is the width of the closest `.screen`, or W when there is none or it measures 0. When W or H is 0 (no layout, as in jsdom without stubs), draw nothing and don't subscribe.
  - It always draws at `t = 0` on mount and on `useResized(true)`. Only in `'animated'` mode does it subscribe to `onStrandFrame`, and only while `watchScreen` reports it on screen; without IntersectionObserver it subscribes at once. It unsubscribes on unmount.
- CSS (`motion.css`): `.strands` is `position:absolute`, `top:-8px`, `height:calc(100% + 16px)`, `z-index:0`, `pointer-events:none`. It spans the window width centred on the button (for example `left:calc(50% - 50vw); width:100vw`). It must not cause horizontal overflow; if `100vw` overflows next to a desktop scrollbar, clip it (for example `overflow-x:clip` on `.start`). `.strands path{mix-blend-mode:screen}`.
- Tokens (`faerun.css`): `--strand-a-o:.22; --strand-b-o:.1;`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/motion-ui.test.tsx`, `describe('strands')`. Stub `requestAnimationFrame` and `cancelAnimationFrame` with a manual queue. Stub `getBoundingClientRect` so the svg measures 390×74 and the `.screen` measures 390 wide:
  - `'animated: strands draw, then animate through the shared loop'`. Render `<Strands cls="bard" />` inside a `div.screen`. Two paths have non-empty `d`. After running one queued frame more than 34 ms later, `d` has changed.
  - `'the loop throttles to 30 updates a second'`. Two frames 10 ms apart update the paths once.
  - `'unmount stops the loop'`. After unmount, the rAF queue is empty and no callback runs.
  - `'reduced motion: drawn once, never animated'`, with `matchMedia` stubbed to match. Paths have `d`, and `requestAnimationFrame` is never called.
  - `'Animation Off: strands still drawn, never animated'`.
  - `'a resize redraws the strands after a short pause'`, in the form of the existing row-motif resize test.
  - `'stop colours and strength come from tokens'`. A stop's `style` contains `var(--bard)` or `var(--bard-line)`, `var(--strand-a-o)` or `var(--strand-b-o)`, and `var(--motion-i, 1)`.
  - `'no layout: nothing drawn, no loop'`. With the rects left at 0, the paths have no `d` and `requestAnimationFrame` is never called.
- [ ] **Step 2: Run** `npx vitest run tests/unit/motion-ui.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `strandLoop.ts`, `Strands.tsx`, the CSS and the tokens.
- [ ] **Step 4: Run** `npx vitest run tests/unit/motion-ui.test.tsx tests/unit/no-stray-colours.test.ts tests/unit/themes.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(ui): twin strands with a shared throttled loop"`.

### Task 5: The new start screen

**Files:**
- Create `src/ui/PersonEditIcon.tsx`.
- Modify:
  - `src/ui/screens/Start.tsx`, `src/ui/RowMotif.tsx`, `src/data/index.ts`, `src/ui/editor/StepClasses.tsx`;
  - `src/styles/screens.css` (replace the `.tiles` and `.tile` rules, lines 9–16), `src/styles/themes/faerun.css`;
  - `README.md` (credits line).
- Test: `tests/unit/screens.test.tsx`, `tests/unit/editor.test.tsx`, `tests/unit/motion-ui.test.tsx`.

**Interfaces:**
- Consumes: `Strands` (Task 4); `menuMotif` and `menuTone` (Task 2).
- Produces:
  - `export function classesAZ(): ClassDef[]`, in `src/data/index.ts`: `DATA.classes` sorted by `name`.
  - `RowMotif(p: { cls: ClassId; gen?: Gen; tone?: string })`. `gen` overrides `ROW_MOTIFS[cls]`, and `tone` is the token used for `--fx-c` (default `` `--${cls}-line` ``).
  - `PersonEditIcon(p: { class?: string })`: `<svg viewBox="0 -960 960 960" aria-hidden="true" fill="currentColor"><path d=…/></svg>`, with `d` copied exactly from `PERSON_EDIT` in the mockup.
- Markup and class names (tests and e2e rely on them):
  - `.start-title` reads "D&D 5E Cheat Sheet".
  - `div.start-list` holds the buttons.
  - `button.start-me` comes first. It gets an extra `shine` class only when `motionMode() === 'animated'`, and holds `PersonEditIcon` plus `.start-me-text`, a `<span>` "My Character Sheet" and a `<small>` subtitle. The subtitle logic is today's: `ch?.name || (ready ? classLine(ch) : 'Create your character')`.
  - Then one `button.start-cls` per `classesAZ()` entry. Each holds `<Strands cls>` and `<RowMotif cls gen={menuMotif(cls)} tone={menuTone(cls)} />`, then `span.start-cls-l` with `<Icon src={c.plainIcon} fallback="spell" size={38} />` and the name.
  - Taps navigate as today.
- CSS: use the approved values in Global Constraints. The class animation mask on start buttons fades both ends, `.start-cls .fx-row{mask:var(--start-motif-mask)}`. The My Character Sheet button gets top and bottom gold lines that fade at both ends, a wash that fades toward both sides, and the `shine` sweep. Lift the mockup's `.mb.me` rules, with colours swapped for tokens.
- Tokens (`faerun.css`):
  - `--barbarian-blood:var(--sorcerer-blood-hi)`;
  - `--start-motif-mask:linear-gradient(90deg,transparent 2%,#000 24%,#000 76%,transparent 98%)`;
  - `--me-line:var(--accent)`, `--me-line-o:.75`, `--me-wash:color-mix(in srgb,var(--accent) 8%,transparent)`;
  - `--me-shine:#fff0cd`, which CSS uses at about 28% peak through `color-mix`.
- `StepClasses`: `free` comes from `classesAZ()`.
- README credits: add "The My Character Sheet icon is Material Symbols `person_edit` by Google (Apache License 2.0)."

- [ ] **Step 1: Write the failing tests.**
  - In `tests/unit/screens.test.tsx`, replace the two Start tests:
    - `'Start lists 13 classes A-Z, Artificer first, Artificer with its own icon'`. The names of `.start-list > button.start-cls` equal `['Artificer','Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard']`, and the first `img` src is `icons/class-artificer.svg`.
    - `'Start class icon falls back on error'`, with the new selector `.start-cls img`.
    - `'My Character Sheet: person_edit icon, no strands, today's subtitle'`. Inside `button.start-me`: `svg path` `d` starts with `M493.33-226.67Z`, there is no `svg.strands`, and `small` reads `Create your character`.
    - `'every class button has strands and a motif layer; Barbarian bleeds blood red'`. 13 `svg.strands` and 13 `svg.fx-row`; the barbarian `fx-row` style contains `--barbarian-blood`.
  - In `tests/unit/motion-ui.test.tsx`:
    - `'start, Animation Off: strands stay, no class animation, no shine'`: 13 `svg.strands`, 0 `svg.fx-row`, and `button.start-me` lacks `shine`.
    - `'start, reduced motion: no shine'`.
  - In `tests/unit/editor.test.tsx`: `'class step offers classes A-Z'`. The first option of the add-class select is Artificer and the options are in A–Z order.
- [ ] **Step 2: Run** `npx vitest run tests/unit/screens.test.tsx tests/unit/motion-ui.test.tsx tests/unit/editor.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the files above. Remove the old `.tiles`/`.tile` rules and their 13th-tile centring rule.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including `no-stray-colours` and the frozen-code tests.
- [ ] **Step 5: Look at it.** Run `npm run dev` and capture real-browser screenshots at 390×844 (a real-time capture, not virtual time; motion loops stall headless virtual time). Compare with mockup phone E2 side by side, and fix visible differences in spacing, strength or the shine.
- [ ] **Step 6: Commit** with `git commit -m "feat(ui): one-column start menu with strands and a gold character sheet"`.

### Task 6: Rename to "D&D 5E Cheat Sheet"

**Files:** Modify `index.html`, `public/manifest.webmanifest`, `src/character/code.ts`, `README.md` (heading), `tests/e2e/smoke.spec.ts`, `tests/e2e/settings.spec.ts`. Test: `tests/unit/character-code.test.ts`, new `tests/unit/manifest.test.ts`.

- [ ] **Step 1: Write the failing tests.**
  - `tests/unit/character-code.test.ts`: `expect(ERR_NOT_CODE).toBe("That isn't a D&D 5E Cheat Sheet backup code.")`.
  - `tests/unit/manifest.test.ts`: reading `public/manifest.webmanifest` gives `name === 'D&D 5E Cheat Sheet'` and `short_name === 'D&D 5E'`, and `index.html` contains `<title>D&amp;D 5E Cheat Sheet</title>`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/character-code.test.ts tests/unit/manifest.test.ts`. Expected: FAIL.
- [ ] **Step 3: Rename** in the files above. Update the e2e expectations to the new title and heading. The README heading becomes `# D&D 5E Cheat Sheet — a D&D 5e companion`. Leave `SS1-`/`SS0-`, `dndcs.*` and everything under `docs/` alone. Afterwards, `git grep -n "Spellbook"` outside `docs/` must find nothing.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "chore: rename the app to D&D 5E Cheat Sheet"`.

### Task 7: End to end, performance and release check

**Files:** Create `tests/e2e/start.spec.ts`. Modify `tests/e2e/artificer.spec.ts` (its first test now expects Artificer first).

- [ ] **Step 1: Write the e2e tests** in `tests/e2e/start.spec.ts`:
  - `'320px: 13 classes A-Z, no sideways scroll, Artificer opens its level picker'`. Move the old artificer start test here, with Artificer as `.start-cls` first.
  - `'1280px: strands span past the column, no sideways scroll'`. Each `svg.strands` is at least as wide as the column plus 480px (or the window), and `document.documentElement.scrollWidth <= innerWidth`.
  - `'reduced motion: strands still, no shine animation'`, using `page.emulateMedia({ reducedMotion: 'reduce' })`. Strand `d` is unchanged after 1 s, and `getAnimations()` on `button.start-me` is empty.
  - `'Off then Medium: class animations and shine go and come back, strands stay'`.
  - `'a 40-character name wraps inside My Character Sheet at 320px'`. Save the character through the editor or storage, then check the subtitle box's `scrollWidth <= clientWidth` and no sideways page scroll.
  - Add the start screen to the existing `motion.spec.ts` console-error sweep.
- [ ] **Step 2: Run** `npm run e2e`. Expected: PASS.
- [ ] **Step 3: Measure performance** once; this is not committed as a test. Use a Playwright script in the scratchpad that opens the start screen at 390×844 and turns on CDP `Emulation.setCPUThrottlingRate { rate: 4 }`. Over 5 s it counts `requestAnimationFrame` callbacks and `PerformanceObserver('longtask')` entries. Expected: about 30 fps or better and no long tasks from the strand loop. If it misses, give way in spec order:
  1. a lower `STRAND_FPS` (not below 20);
  2. fewer points per path (14px spacing);
  3. drop the `screen` blend;
  4. only then the blur.

  Record the numbers for the final report.
- [ ] **Step 4: Release checks.** `npm test` and `npm run e2e` pass, and `npm run build` passes with gzipped JS ≤ 450 KB (record the number).
- [ ] **Step 5: Commit** with `git commit -m "test: start menu end to end"`.
