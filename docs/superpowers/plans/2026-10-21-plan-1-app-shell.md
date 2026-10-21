# Plan 1: App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, themed, static phone site where a player picks a class and level, then browses that class's actions and spells on scrolling pages and opens BG3-style cards, running on a small hand-made fixture data set.

**Architecture:** Vite + Preact + TypeScript single-page app with hash routing, published to GitHub Pages as static files. All game content is JSON under `data/`, typed and validated at build and test time. Screen logic (which rows, which sections, what the card says) lives in pure functions under `src/logic/` so it is unit-tested without a browser; Preact components under `src/ui/` only render it. Every colour, font and strength lives in `src/styles/themes/faerun.css`.

**Tech Stack:** Vite 8, Preact 11, TypeScript 7 (strict), Vitest + @testing-library/preact + jsdom, Playwright (Chromium, phone viewport), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md`. Visual reference: `docs/superpowers/mockups/final.html` (lift colours, sizes and CSS from it).

**Roadmap (later plans, not this one):**
- Plan 2, Content: extract the full PHB into the `data/` schema defined here, resolve bg3.wiki icon URLs, hand-check tooling.
- Plan 3, Characters: step-by-step editor (race, classes, options, feats, spells), rules engine for counts and multiclass, storage + backup code, My/All toggle.
- Plan 4, Motion: row motifs, class backgrounds, mist and blood noise layers, strength setting wired to them, reduced motion.

## Global Constraints

- Static output only; GitHub Pages; Vite `base: './'`; hash routes, so reloads and deep links never hit the server.
- 2014 Player's Handbook rules only. No 2024 wording anywhere.
- No colour, font family or effect strength outside `src/styles/themes/*.css` (enforced by a test in Task 2).
- Font roles: body `Inknut Antiqua` 500, long text `Inknut Antiqua` 300, digits 0-9 from `Noto Serif` (500/300) via `unicode-range: U+0030-0039` declared after Inknut, titles `IM Fell English`, ornaments EB Garamond (U+2619, U+2766-2767, U+E001-E002) + Noto Sans Symbols 2 (U+1F650-1F667). WOFF2 only. Ship each OFL licence text.
- Never use 1756 Dutch or IM Fell Flowers. No pentagram or hexagram shapes anywhere.
- All text has the theme's soft drop shadow (`--text-shadow`).
- Layout works from 320 px wide with no horizontal page scroll.
- Spell and feature icons are linked from bg3.wiki; fallbacks are self-hosted game-icons.net SVGs.
- No spell slot display anywhere.
- About text includes verbatim: "Unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."

## Review Focus

1. Local storage blocked or throwing (Safari private mode, cleared site data): the app still loads with default settings and never shows an error. Pinned in Task 8.
2. A bg3.wiki image that fails to load (wiki down, hotlink blocked, wrong URL): the fallback icon appears in the same box; the grid does not reflow. Pinned in Task 6.
3. A 320 px wide phone with the longest names ("Mordenkainen's Magnificent Mansion", "Expeditious Retreat"): names wrap inside their cell, no horizontal scroll. Pinned in Task 7.
4. Reloading or opening a deep link (`#/spells/wizard/3?s=lvl-1`), or an unknown/garbled hash: the right page renders, and garbage falls back to the start screen. Pinned in Task 3.
5. A class with no spellcasting (Fighter, Barbarian): the menu has no MAGIC separator and no spell rows, and `#/spells/fighter/5` shows an empty-state message, not a crash. Pinned in Task 5.

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html
.github/workflows/deploy.yml          build + deploy to Pages on push to main
public/fonts/*.woff2, public/fonts/OFL-*.txt
public/icons/fallback/*.svg           game-icons.net: shouting, magic-palm, swap-bag, generic spell, generic action
public/manifest.webmanifest, public/app-icon-192.png, public/app-icon-512.png
data/classes.json, data/spells.json, data/features.json      fixture content (Plan 2 replaces)
src/main.tsx                          mount, apply stored theme
src/app.tsx                           route → screen switch
src/router.ts                         parse/format hash routes
src/data/types.ts                     content types
src/data/validate.ts                  dataset validator
src/data/index.ts                     typed, validated dataset export
src/logic/rules.ts                    class table lookups
src/logic/menu.ts                     menu rows for a view
src/logic/sections.ts                 spell and action page sections
src/logic/card.ts                     card text: level line, damage line, tags, cost bar, component explainers
src/settings/storage.ts               safe local storage
src/settings/settings.ts              versioned settings (theme, strength, tips seen)
src/theme/themes.ts                   theme registry + applyTheme
src/styles/themes/faerun.css          the only place with colours/fonts/strengths
src/styles/fonts.css, src/styles/base.css
src/ui/Separator.tsx, src/ui/Icon.tsx, src/ui/IconGrid.tsx, src/ui/ComponentIcons.tsx
src/ui/screens/Start.tsx, LevelPicker.tsx, Menu.tsx, SpellsPage.tsx, ActionsPage.tsx, Card.tsx, Settings.tsx
tests/unit/*.test.ts(x), tests/e2e/*.spec.ts
```

---

### Task 1: Scaffold, build and deploy

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `src/main.tsx`, `src/app.tsx`, `.github/workflows/deploy.yml`, `.gitignore`, `tests/unit/smoke.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `npm run dev`, `npm run build` (output `dist/`), `npm test` (Vitest), `npm run e2e` (Playwright against `vite preview`). `App(): JSX.Element` in `src/app.tsx`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/smoke.test.ts
import { render } from '@testing-library/preact';
import { App } from '../../src/app';
test('app renders', () => { const { container } = render(<App />); expect(container.textContent).not.toBe(''); });
```
```ts
// tests/e2e/smoke.spec.ts
test('home loads on a phone', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Spellbook & Steel');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test` then `npm run e2e`. Expected: FAIL (no App / no page).

- [ ] **Step 3: Set up the project**

Vite `base: './'`, Preact preset, TS strict, Vitest env `jsdom`. Playwright: one project, Chromium, `viewport {width: 390, height: 844}`, `isMobile: true`, `webServer: npm run build && npm run preview`. `index.html` title `Spellbook & Steel` (*working title; owner may rename*), `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. `App` renders a placeholder `<main>`. Deploy workflow: on push to `main`, `npm ci && npm run build`, upload `dist/` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npm run e2e`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + Preact app with tests and Pages deploy"
```

---

### Task 2: Theme file, fonts, theme registry

**Files:**
- Create: `src/styles/themes/faerun.css`, `src/styles/fonts.css`, `src/styles/base.css`, `src/theme/themes.ts`, `public/fonts/*`, `tests/unit/themes.test.ts`, `tests/unit/no-stray-colours.test.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: `THEMES: {id: string; name: string}[]` (one entry `{id: 'faerun', name: 'Faerûn'}`), `applyTheme(id: string): string` (sets `document.documentElement.dataset.theme`, returns the id applied, falls back to `'faerun'` for unknown ids). CSS tokens (names fixed, later plans rely on them): `--bg --surface --border --text --text-dim --accent --text-shadow --row-wash --font-body --font-desc --font-title --font-orn`, and per class `--{class}` `--{class}-line` `--{class}-row-o` `--{class}-bg-o` for the 12 classes (`barbarian bard cleric druid fighter monk paladin ranger rogue sorcerer warlock wizard`), plus `--druid-leaf --druid-bloom --warlock-mist --sorcerer-blood --sorcerer-blood-hi --sorcerer-cell`.

- [ ] **Step 1: Write the failing tests**

```ts
// themes.test.ts
test('applyTheme sets data-theme', () => { expect(applyTheme('faerun')).toBe('faerun'); expect(document.documentElement.dataset.theme).toBe('faerun'); });
test('unknown theme falls back', () => { expect(applyTheme('nope')).toBe('faerun'); });
// no-stray-colours.test.ts: glob src/**/*.{ts,tsx,css} excluding src/styles/themes/**;
// fail on /#[0-9a-f]{3,8}\b/i, /\brgba?\(/, /\bhsla?\(/ ; list offending file:line in the message
```

- [ ] **Step 2: Run to verify they fail** — Run: `npm test`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

Copy the seven WOFF2 files from `docs/superpowers/mockups/` (already subset) into `public/fonts/`, and add the OFL text for each family (Inknut Antiqua, Noto Serif, Noto Sans Symbols 2, EB Garamond from the google/fonts repo; IM Fell from `OFL-IMFell.txt`). Write `fonts.css` with the `@font-face` rules from the mockup (Noto digit faces declared after Inknut faces; same digit faces added to the `IM Fell English` family). `faerun.css` holds every token above on `:root[data-theme="faerun"]`; values from spec 7.1/7.2 and the mockup (`--bg:#1b1712`, `--surface:#231e17`, `--border:#3a3226`, `--text:#e9dfc9`, `--text-dim:#a89c84`, `--accent:#d9b45f`, `--text-shadow:0 1px 2px rgb(0 0 0/.85),0 0 8px rgb(0 0 0/.55)`, class colours from spec 7.2, line colours from the mockup's `.p-*` rules). `base.css` uses only `var(--…)`. `main.tsx` calls `applyTheme(stored theme or 'faerun')`.

- [ ] **Step 4: Run to verify they pass** — Run: `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: Faerun theme tokens, fonts and theme registry"`

---

### Task 3: Content types, validator, fixtures, router

**Files:**
- Create: `src/data/types.ts`, `src/data/validate.ts`, `src/data/index.ts`, `data/classes.json`, `data/spells.json`, `data/features.json`, `src/router.ts`, `tests/unit/validate.test.ts`, `tests/unit/router.test.ts`

**Interfaces:**
- Produces (exact; Plan 2 fills this schema):

```ts
export type ClassId = 'barbarian'|'bard'|'cleric'|'druid'|'fighter'|'monk'|'paladin'|'ranger'|'rogue'|'sorcerer'|'warlock'|'wizard';
export type Cost = 'action'|'bonus'|'reaction'|'other';
export type Ability = 'str'|'dex'|'con'|'int'|'wis'|'cha';
export interface Spell {
  id: string; name: string; level: number /*0-9*/; school: string;
  cast: { cost: Cost; text: string; trigger?: string };
  range: string; duration: string; concentration: boolean; ritual: boolean;
  components: { v: boolean; s: boolean; m?: { text: string; costGp?: number; consumed: boolean } };
  description: string[]; higherLevels?: string; classes: ClassId[]; page: number;
  icon?: string;
  summary?: { damage?: { dice: string; count?: number; type: string; healing?: boolean }; resolution: 'attack'|'save'|'auto'|'none'; save?: Ability; upcast?: string };
}
export interface Feature {
  id: string; name: string; source: { kind: 'generic'|'class'|'subclass'|'race'|'feat'; id: string };
  level: number; cost: Cost|'free'; resource?: string; uses?: string;
  description: string[]; page: number; icon?: string;
}
export interface ClassDef {
  id: ClassId; name: string; caster: 'full'|'half'|'third'|'pact'|'none';
  cantripsKnown?: number[] /*index = level-1, length 20*/; maxSpellLevel?: number[] /*length 20*/;
  hotbarIcon: string; plainIcon: string;
}
export interface Dataset { classes: ClassDef[]; spells: Spell[]; features: Feature[] }
export function validateDataset(d: Dataset): string[];   // empty array = valid
export const DATA: Dataset;                              // src/data/index.ts, throws at import if invalid
export type Route =
  | { page: 'start' } | { page: 'level'; cls: ClassId } | { page: 'settings' }
  | { page: 'menu'; cls: ClassId; level: number }
  | { page: 'spells'|'actions'; cls: ClassId; level: number; section?: string }
  | { page: 'card'; kind: 'spell'|'feature'; id: string; cls: ClassId; level: number };
export function parseHash(hash: string): Route;  export function toHash(r: Route): string;
```

Hash formats: `#/`, `#/level/wizard`, `#/settings`, `#/menu/wizard/3`, `#/spells/wizard/3?s=lvl-1`, `#/actions/wizard/3?s=bonus`, `#/card/spell/magic-missile/wizard/3`.

- [ ] **Step 1: Write the failing tests**

```ts
test('fixtures are valid', () => expect(validateDataset(DATA)).toEqual([]));
test('catches bad records', () => {
  const bad = structuredClone(DATA);
  bad.spells.push({ ...bad.spells[0] });                 // duplicate id
  bad.spells[1].level = 10;                              // out of range
  bad.spells[2].classes = ['necromancer' as any];        // unknown class
  bad.features[0].name = '';                             // empty name
  const errs = validateDataset(bad);
  expect(errs.some(e => e.includes('duplicate'))).toBe(true);
  expect(errs.some(e => e.includes('level'))).toBe(true);
  expect(errs.some(e => e.includes('necromancer'))).toBe(true);
  expect(errs.some(e => e.includes('name'))).toBe(true);
});
test.each(['#/', '#/level/wizard', '#/menu/wizard/3', '#/spells/wizard/3?s=lvl-1', '#/actions/fighter/5?s=bonus', '#/card/spell/magic-missile/wizard/3', '#/settings'])
  ('round-trips %s', h => expect(toHash(parseHash(h))).toBe(h));
test.each(['', '#', '#/menu/necromancer/3', '#/menu/wizard/0', '#/menu/wizard/21', '#/spells/wizard/abc', '#/%%%'])
  ('garbage %s falls back to start', h => expect(parseHash(h)).toEqual({ page: 'start' }));
```

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL.

- [ ] **Step 3: Implement** types, validator (one message per problem, naming the record id and field), router, and fixtures. Fixtures (PHB-accurate text, typed by hand): classes `wizard`, `sorcerer`, `druid`, `fighter` (full 20-level `cantripsKnown`/`maxSpellLevel` for the three casters; fighter `caster:'none'`); spells Fire Bolt, Ray of Frost, Guidance, Produce Flame, Shillelagh, Magic Missile, Shield, Burning Hands, Cure Wounds, Thunderwave, Mage Armor, Misty Step, Fireball (bg3.wiki icon URLs from the mockup; leave Mage Armor's icon out to exercise the fallback); features: all generic actions/bonus/reaction from spec 4.1, plus Arcane Recovery (wizard 1), Font of Magic (sorcerer 2), Wild Shape (druid 2), Second Wind (fighter 1), Action Surge (fighter 2).

- [ ] **Step 4: Run to verify they pass** — `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat: content schema, validator, fixtures and hash router"`

---

### Task 4: Card logic

**Files:**
- Create: `src/logic/card.ts`, `tests/unit/card.test.ts`

**Interfaces:**
- Produces: `levelLine(s: Spell): string`; `damageLine(s: Spell): {headline: string; detail: string} | null`; `tags(s: Spell): string[]`; `costBar(s: Spell): {cost: Cost; label: string; slot?: string}`; `componentInfo(s: Spell): {v: Explainer|null; s: Explainer|null; m: Explainer|null}` where `Explainer = {title: string; body: string}`; `diceRange(dice: string): {min: number; max: number}`.

- [ ] **Step 1: Write the failing tests**

```ts
const mm = DATA.spells.find(s => s.id === 'magic-missile')!;
expect(levelLine(mm)).toBe('Level 1 Evocation Spell');
expect(levelLine(DATA.spells.find(s => s.id === 'fire-bolt')!)).toBe('Evocation Cantrip');
expect(diceRange('1d4+1')).toEqual({ min: 2, max: 5 });
expect(diceRange('8d6')).toEqual({ min: 8, max: 48 });
expect(damageLine(mm)).toEqual({ headline: '6~15 Damage', detail: '3 darts × 1d4+1 Force' });
expect(damageLine(DATA.spells.find(s => s.id === 'cure-wounds')!)!.headline).toMatch(/Healing$/);
expect(damageLine(DATA.spells.find(s => s.id === 'shield')!)).toBeNull();
expect(tags(mm)).toEqual(['120 ft', 'Instantaneous', 'Auto-hit']);
expect(tags(DATA.spells.find(s => s.id === 'thunderwave')!)).toContain('CON save');
expect(costBar(DATA.spells.find(s => s.id === 'shield')!)).toMatchObject({ cost: 'reaction', slot: 'Level 1 Spell Slot' });
expect(costBar(DATA.spells.find(s => s.id === 'fire-bolt')!).slot).toBeUndefined();
const fb = componentInfo(DATA.spells.find(s => s.id === 'fireball')!);
expect(fb.m!.body).toContain('bat guano');
expect(componentInfo(mm).m).toBeNull();
```
Explainer copy (exact, from the approved mockup): Verbal body `You must chant mystic words out loud. You can't cast it while gagged, unable to speak, or inside a Silence spell.`; Somatic body `You must make gestures with at least one free hand. Holding a sword and a shield? Stow one first.` Material body: the material text, then `Costs N gp.` when priced, `The spell consumes it.` when consumed, else `A component pouch or spellcasting focus can stand in for it.` (PHB p. 203).

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** in `src/logic/card.ts`. Concentration and Ritual are appended to `tags` when true.
- [ ] **Step 4: Run to verify they pass** — `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: spell card text logic"`

---

### Task 5: Menu and page sections logic

**Files:**
- Create: `src/logic/rules.ts`, `src/logic/menu.ts`, `src/logic/sections.ts`, `tests/unit/menu.test.ts`, `tests/unit/sections.test.ts`

**Interfaces:**
- Consumes: `DATA`, types from Task 3.
- Produces:
```ts
export function maxSpellLevel(c: ClassDef, level: number): number;            // 0 = no spells
export interface MenuRow { kind: 'actions'|'bonus'|'reactions'|'class'|'cantrips'|'spells'|'separator';
  label: string; icon: {type: 'img'; src: string} | {type: 'slot'; level: number};
  target?: Route; dimmed?: boolean; motif?: ClassId }
export function menuRows(cls: ClassId, level: number): MenuRow[];
export interface Section { id: string; title: string; subtitle?: string; motif?: ClassId; locked?: string; items: (Spell|Feature)[] }
export function spellSections(cls: ClassId, level: number): Section[];
export function actionSections(cls: ClassId, level: number): Section[];
```
Section ids: `cantrips`, `lvl-1` … `lvl-9`; `actions`, `bonus`, `reactions`, `class`.

- [ ] **Step 1: Write the failing tests**

```ts
const rows = menuRows('wizard', 3).map(r => r.label);
expect(rows).toEqual(['Actions','Bonus Actions','Reactions','Wizard Actions','MAGIC','Cantrips','Level 1 Spells','Level 2 Spells','Level 3 Spells','Level 4 Spells','Level 5 Spells','Level 6 Spells','Level 7 Spells','Level 8 Spells','Level 9 Spells']);
expect(menuRows('wizard', 3).find(r => r.label === 'Level 3 Spells')!.dimmed).toBe(true);
expect(menuRows('wizard', 3).find(r => r.label === 'Level 2 Spells')!.dimmed).toBeFalsy();
expect(menuRows('wizard', 3)[0].icon).toEqual({ type: 'img', src: expect.stringContaining('Action_Icon.png') });
expect(menuRows('wizard', 3).find(r => r.label === 'Level 1 Spells')!.icon).toEqual({ type: 'slot', level: 1 });
expect(menuRows('wizard', 3).find(r => r.label === 'Level 1 Spells')!.target).toEqual({ page: 'spells', cls: 'wizard', level: 3, section: 'lvl-1' });
expect(menuRows('wizard', 3).every(r => !('hint' in r))).toBe(true);
expect(menuRows('fighter', 5).map(r => r.label)).toEqual(['Actions','Bonus Actions','Reactions','Fighter Actions']);
const sp = spellSections('wizard', 3);
expect(sp.map(s => s.id)).toEqual(['cantrips','lvl-1','lvl-2','lvl-3']);   // only levels with fixture spells
expect(sp.find(s => s.id === 'lvl-3')!.locked).toBe('Unlocks at Wizard 5');
expect(sp.flatMap(s => s.items).every(i => (i as Spell).classes.includes('wizard'))).toBe(true);
expect(spellSections('fighter', 5)).toEqual([]);
const ac = actionSections('fighter', 1);
expect(ac.map(s => s.id)).toEqual(['actions','bonus','reactions','class']);
expect(ac.find(s => s.id === 'class')!.items.map(i => i.name)).toEqual(['Second Wind']);   // Action Surge is level 2
expect(ac.flatMap(s => s.items).some(i => 'school' in i)).toBe(false);                     // no spells on the Actions page
```
Rows carry no hint text (owner's decision). Rows from `Level (max+1)` upward are dimmed. Separator row label is `MAGIC`. Icons: Action/Bonus/Reaction BG3 URLs from spec 4.4; class row `hotbarIcon`; cantrips `plainIcon`.

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run to verify they pass** — `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: menu rows and page sections"`

---

### Task 6: Shared UI pieces

**Files:**
- Create: `src/ui/Separator.tsx`, `src/ui/Icon.tsx`, `src/ui/IconGrid.tsx`, `src/ui/ComponentIcons.tsx`, `public/icons/fallback/*.svg`, `tests/unit/ui.test.tsx`

**Interfaces:**
- Produces: `Separator(p: {label?: string; sub?: string; ornament: string; full?: boolean; color?: string})` (ornament, line(s), label, mirrored ornament; `full` stretches lines to the screen edges, otherwise they stay inside the parent's padding); `Icon(p: {src?: string; fallback: 'spell'|'action'; alt: string; size: number})`; `IconGrid(p: {items: (Spell|Feature)[]; onPick(id: string): void})`; `ComponentIcons(p: {spell: Spell})`.

- [ ] **Step 1: Write the failing tests**

```ts
// Icon: fallback on error, same box size
const { getByRole } = render(<Icon src="https://bg3.wiki/x.webp" fallback="spell" alt="X" size={50} />);
fireEvent.error(getByRole('img'));
expect(getByRole('img').getAttribute('src')).toContain('/icons/fallback/spell.svg');
expect(getByRole('img').getAttribute('width')).toBe('50');
// Icon with no src renders the fallback directly
// ComponentIcons: tap toggles explainer, Material dimmed when absent
const r = render(<ComponentIcons spell={mm} />);
fireEvent.click(r.getByText('Verbal'));  expect(r.getByText(/chant mystic words/)).toBeTruthy();
fireEvent.click(r.getByText('Verbal'));  expect(r.queryByText(/chant mystic words/)).toBeNull();
expect(r.getByText('Material').closest('[aria-disabled="true"]')).toBeTruthy();
```

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Download `lorc/shouting`, `lorc/magic-palm`, `lorc/swap-bag` and two generic fallbacks (e.g. `lorc/spell-book`, `lorc/crossed-swords`) as SVG into `public/icons/fallback/`, recoloured with `currentColor`. Component circles are 48 px on pure black (`--comp-bg` token), as approved. Only one explainer open at a time.
- [ ] **Step 4: Run to verify they pass** — `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: separators, icons with fallback, component icons"`

---

### Task 7: Screens: start, level, menu, spells, actions, card

**Files:**
- Create: `src/ui/screens/Start.tsx`, `LevelPicker.tsx`, `Menu.tsx`, `SpellsPage.tsx`, `ActionsPage.tsx`, `Card.tsx`, `tests/e2e/browse.spec.ts`
- Modify: `src/app.tsx` (route switch on `parseHash(location.hash)`, listens to `hashchange`)

**Interfaces:**
- Consumes: Tasks 3-6.
- Produces: one screen component per `Route.page`.

- [ ] **Step 1: Write the failing e2e tests** (390×844, plus one at 320×640)

```ts
test('browse a wizard', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Wizard').click();
  await page.getByRole('button', { name: '3' }).click();
  await expect(page).toHaveURL(/#\/menu\/wizard\/3$/);
  await page.getByText('Level 1 Spells').click();
  await expect(page).toHaveURL(/#\/spells\/wizard\/3\?s=lvl-1$/);
  await expect(page.locator('#lvl-1')).toBeInViewport();
  await page.getByText('Magic Missile').click();
  await expect(page.getByText('6~15 Damage')).toBeVisible();
  await expect(page.getByText('Level 1 Evocation Spell')).toBeVisible();
});
test('deep link renders after reload', async ({ page }) => {
  await page.goto('./#/actions/fighter/2?s=class');
  await expect(page.getByText('Action Surge')).toBeVisible();
});
test('non-caster has no magic', async ({ page }) => {
  await page.goto('./#/menu/fighter/5');
  await expect(page.getByText('MAGIC')).toHaveCount(0);
  await page.goto('./#/spells/fighter/5');
  await expect(page.getByText('Fighters don\'t cast spells')).toBeVisible();
});
test('320px: long names wrap, no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('./#/spells/wizard/5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('bg3 icon failure shows fallback', async ({ page }) => {
  await page.route('https://bg3.wiki/**', r => r.abort());
  await page.goto('./#/spells/wizard/3');
  await expect(page.locator('img[src*="/icons/fallback/"]').first()).toBeVisible();
});
```

- [ ] **Step 2: Run to verify they fail** — `npm run e2e`. Expected: FAIL.
- [ ] **Step 3: Implement the screens** matching the mockup.
  - Start: grid of the 12 classes (only fixture classes enabled; the rest shown but disabled until Plan 2) plus a "My Character Sheet" tile that is disabled with "Coming soon" until Plan 3.
  - Level picker: buttons 1 to 20.
  - Menu: name-header style separator showing the class name (character name arrives in Plan 3) with ornament U+1F65A, `full` lines. Rows from `menuRows`, with a ☙ MAGIC ❧ `full` separator row.
  - Spells and Actions pages: fixed header (back to menu, title), then sections with `Separator` (☙ ❧, level in gold, class name in its colour), an `IconGrid`, and locked sections dimmed with their note. Scroll to `section` on load and when it changes; a section id with no section opens the page at the top. Empty state for non-casters: `Fighters don't cast spells` (pattern `<Class>s don't cast spells`).
  - Card: layout from spec 5.6 and the mockup. The divider uses U+E001 + mirrored U+E001 with inset lines. "❦ *At Higher Levels.*" prefix. `ComponentIcons`, then the cost bar. Feature cards use the same frame: name, `<Source> Feature · Level N`, description, then a cost bar showing the cost plus `resource`/`uses` when set (e.g. "▲ Bonus Action · 1/short rest").
- [ ] **Step 4: Run to verify they pass** — `npm run e2e && npm test`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: start, menu, spells, actions and card screens"`

---

### Task 8: Settings: storage, theme, strength, About, home-screen tip

**Files:**
- Create: `src/settings/storage.ts`, `src/settings/settings.ts`, `src/ui/screens/Settings.tsx`, `public/manifest.webmanifest`, `public/app-icon-192.png`, `public/app-icon-512.png`, `tests/unit/settings.test.ts`, `tests/e2e/settings.spec.ts`
- Modify: `src/main.tsx`, `index.html` (manifest link, `apple-touch-icon`, `theme-color`)

**Interfaces:**
- Produces:
```ts
export function readJSON<T>(key: string, fallback: T): T;   // never throws
export function writeJSON(key: string, value: unknown): boolean; // false when storage is unavailable
export type Strength = 'off'|'faint'|'medium'|'strong';
export interface Settings { v: 1; theme: string; strength: Strength; iosTipSeen: boolean }
export const DEFAULT_SETTINGS: Settings; // { v:1, theme:'faerun', strength:'medium', iosTipSeen:false }
export function loadSettings(): Settings; export function saveSettings(s: Settings): void;
export function effectiveStrength(s: Settings, prefersReducedMotion: boolean): Strength; // 'off' when reduced motion
```
Storage key: `dndcs.settings`.

- [ ] **Step 1: Write the failing tests**

```ts
test('storage that throws gives defaults', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});
test('corrupt JSON gives defaults', () => { localStorage.setItem('dndcs.settings', '{oops'); expect(loadSettings()).toEqual(DEFAULT_SETTINGS); });
test('unknown theme in storage falls back', () => { localStorage.setItem('dndcs.settings', JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'gone' })); expect(loadSettings().theme).toBe('faerun'); });
test('reduced motion forces off', () => expect(effectiveStrength({ ...DEFAULT_SETTINGS, strength: 'strong' }, true)).toBe('off'));
test('round trip', () => { saveSettings({ ...DEFAULT_SETTINGS, strength: 'faint' }); expect(loadSettings().strength).toBe('faint'); });
```
```ts
// e2e: settings persist across reload; About shows the Fan Content notice verbatim
await page.goto('./#/settings'); await page.getByText('Faint').click(); await page.reload();
await expect(page.getByRole('radio', { name: 'Faint' })).toBeChecked();
await expect(page.getByText('Unofficial Fan Content permitted under the Fan Content Policy.', { exact: false })).toBeVisible();
```

- [ ] **Step 2: Run to verify they fail** — `npm test && npm run e2e`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Settings screen sections: Theme (radio list from `THEMES`), Animation (Off/Faint/Medium/Strong radios). Strength is stored now and wired to motion in Plan 4. Backup code shows "Available once you create a character" until Plan 3. About has the credits list from spec 11 verbatim.
  - Strength sets `data-strength` on `<html>` so later CSS can read it.
  - The home-screen tip shows once on iOS Safari when not running standalone (`navigator.standalone !== true`), then sets `iosTipSeen`.
  - Manifest: name `Spellbook & Steel`, `display: standalone`, `start_url: './'`, colours from theme tokens copied as literals (the manifest is exempt from the colour test).
  - Settings are reachable from Start and Menu via a gear button.
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: settings, safe storage, About, manifest"`

---

### Task 9: Deploy and verify on real phones

**Files:**
- Modify: `README.md` (create: what it is, `npm` scripts, how to deploy)

- [ ] **Step 1: Push and enable Pages.** Ask the owner to create the GitHub repo `dnd-5e-companion` and enable Pages with source "GitHub Actions". Then add the remote and push `main`.
- [ ] **Step 2: Verify the workflow.** Run: `gh run watch`. Expected: the deploy job succeeds and prints the Pages URL.
- [ ] **Step 3: Verify the live site.** Open the Pages URL with Playwright at 390×844. Expected: the browse flow from Task 7 passes against the live URL, fonts load (`document.fonts.check('16px "IM Fell English"')` is true) and bg3.wiki icons render.
- [ ] **Step 4: Owner check.** Ask the owner to open the URL on an iPhone and an Android phone, add it to the home screen, and confirm fonts, icons and text shadow look right.
- [ ] **Step 5: Commit** — `git commit -m "docs: README with scripts and deploy notes"`
