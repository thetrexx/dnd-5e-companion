# Plan 3: Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player saves their own character (race, classes, options, feats, spells) and the menu, Actions page and Spells page show only what that character has, with a My/All toggle and a copy-paste backup code.

**Architecture:** A new `src/character/` module holds the character model, its parser (shared by local storage and the backup code), the rules derived from it (casting info, option slots, spell grants) and the views that turn it into the same `Section`/`MenuRow` shapes the plain-class pages already use. New `#/me…` routes render the character pages through the existing screens, refactored to take a back link and a pick handler instead of `cls/level/sub`. A step-by-step editor at `#/edit/<step>` writes the character to local storage on every change.

**Tech Stack:** Preact 11, TypeScript 7, Vite 8, Vitest 5 (jsdom), Playwright. Browser `CompressionStream('deflate-raw')` for the backup code. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` (sections 4.1, 5.1 to 5.5, 5.7, 6, 9). Earlier plans: `docs/superpowers/plans/2026-10-21-plan-1-app-shell.md`, `docs/superpowers/plans/2026-10-21-plan-2-content.md`.

## Global Constraints

- Not a character sheet: no HP, no spell slots, no inventory, no dice. The paper sheet is the authority.
- No accounts, no backend. Local storage only. Every storage read and write is wrapped so blocked or empty storage never breaks a page (`src/settings/storage.ts`).
- One saved character per device.
- Over-limit picks (spells, options) show a gentle warning but are allowed. Multiclass prerequisites are not enforced.
- Wizard: the player ticks **prepared** spells, limit INT modifier + wizard level. The spellbook is not modelled.
- Prepared limit: ability modifier + class level (Paladin: + half paladin level, rounded down), minimum 1.
- Multiclass: per class, spells available, cantrips known and spells known/prepared are worked out as if single-classed at that class's level.
- Subclass bonus spells (domain, oath, circle) are added automatically, marked "always prepared", and never count toward a limit. Patron spells only widen the Warlock's list.
- Racial spells are added automatically from race and **character** level.
- Saved data is versioned: `v: 1`. The backup code is compressed JSON (deflate-raw) in base64url, with **name-based ids** (spell, class, option ids as in `data/`), copied and pasted, never typed.
- Colours only in `src/styles/themes/*.css`; other CSS uses tokens (a unit test fails otherwise). New tokens go in `src/styles/themes/faerun.css`.
- All UI copy in plain English, no rules text from the PHB or SRD.
- Phone first: every new screen fits 320 px wide with no horizontal scroll.
- Node 22+. `npm test`, `npm run build` and `npm run e2e` must pass before each commit that touches `src/`.

## Review Focus

1. **A pasted backup code with line breaks, spaces or a missing tail** (chat apps wrap long text): whitespace is ignored; a cut-off code gives the "damaged" message, never a crash. Tests in Task 4.
2. **A saved character that names content no longer in `data/`** (renamed spell, removed option): it still loads, the unknown entries are dropped and listed. Tests in Task 3.
3. **Blocked local storage** (Safari private mode, quota full): the editor keeps working for the session and says the character can't be saved. Tests in Tasks 3 and 12.
4. **A multiclass with a non-caster first** (Fighter 2 / Wizard 3) and **a race spell on a non-caster** (Tiefling Barbarian): the menu shows only the caster's spell rows plus the race spell row; the Spells page is reachable. Tests in Tasks 8 and 9.
5. **`#/me…` with no character or a character with no class** (editor abandoned half way, storage wiped): the app opens the editor instead of crashing. Tests in Task 11.

---

## File Structure

**Create**
- `src/character/types.ts`: `Character`, `CharClass`, `CharSpell`, `emptyCharacter()`.
- `src/character/parse.ts`: `parseCharacter()`, the single sanitiser for storage and backup codes.
- `src/character/store.ts`: load/save/delete in local storage.
- `src/character/code.ts`: backup code encode/decode.
- `src/character/derive.ts`: levels, race chain, casting info, pick counts, pickable spells.
- `src/character/grants.ts`: grant sources, choosable grant slots, automatic spells.
- `src/character/options.ts`: option slots and `prune()`.
- `src/character/view.ts`: character spell sections, action sections, menu rows.
- `src/ui/MenuView.tsx`: menu layout shared by plain and character menus.
- `src/ui/screens/me/MeMenu.tsx`, `MeSpells.tsx`, `MeActions.tsx`, `MeCard.tsx`.
- `src/ui/editor/Editor.tsx`, `StepBasics.tsx`, `StepClasses.tsx`, `StepOptions.tsx`, `StepFeats.tsx`, `StepSpells.tsx`, `GrantPicker.tsx`, `PickList.tsx`.
- `src/ui/BackupCode.tsx`.
- Tests: `tests/unit/character-parse.test.ts`, `character-code.test.ts`, `character-derive.test.ts`, `character-grants.test.ts`, `character-view.test.ts`, `me-screens.test.tsx`, `editor.test.tsx`, `backup.test.tsx`; `tests/e2e/character.spec.ts`.

**Modify**
- `data/features/rogue.json`, `monk.json`, `barbarian.json`, `data/subclasses.json`: parked spell grants (Task 1).
- `src/data/validate.ts`: parked validator gaps (Task 1).
- `src/data/types.ts`: new routes, `EditStep`.
- `src/logic/rules.ts`, `src/logic/sections.ts`, `src/logic/menu.ts`: shared `listSpells`, `Section.mine`, optional menu icon src, EK/AT row ceiling.
- `src/router.ts`, `src/app.tsx`, `src/settings/settings.ts`, `src/settings/storage.ts`.
- `src/ui/IconGrid.tsx`, `src/ui/screens/SectionPage.tsx`, `SpellsPage.tsx`, `ActionsPage.tsx`, `Menu.tsx`, `Card.tsx`, `Start.tsx`, `Settings.tsx`.
- `src/styles/screens.css`, `src/styles/components.css`, `src/styles/themes/faerun.css`.
- `README.md`.

---

### Task 1: Parked content: spell grants and validator gaps

Parked from Plan 2. Facts must be checked against the book page images (PHB page = PDF page − 1) before writing; never write rules text, only ids and levels.

**Files:**
- Modify: `data/features/rogue.json` (`mage-hand-legerdemain`), `data/features/monk.json` (`shadow-arts`), `data/features/barbarian.json` (`spirit-seeker`, `spirit-walker`), `data/subclasses.json` (`nature-domain`, `circle-of-the-land`), `src/data/validate.ts`
- Test: `tests/unit/subclasses-content.test.ts`, `tests/unit/validate.test.ts`

**Interfaces:**
- Produces: `Feature.spells` grants on four subclass features and two `choose` grants in `bonusSpells.grants`; later tasks read them through `grantSources()` (Task 6).

- [ ] **Step 1: Write the failing tests**

In `tests/unit/subclasses-content.test.ts`:

```ts
const feature = (id: string) => DATA.features.find(f => f.id === id)!;
test('parked subclass spell grants', () => {
  expect(feature('mage-hand-legerdemain').spells).toEqual([{ spell: 'mage-hand', atLevel: 3 }]);
  expect(feature('shadow-arts').spells!.map(g => g.spell)).toEqual(['minor-illusion', 'darkness', 'darkvision', 'pass-without-trace', 'silence']);
  expect(feature('shadow-arts').spells!.every(g => g.atLevel === 3)).toBe(true);
  expect(feature('spirit-seeker').spells!.map(g => g.spell)).toEqual(['beast-sense', 'speak-with-animals']);
  expect(feature('spirit-walker').spells).toEqual([expect.objectContaining({ spell: 'commune-with-nature', atLevel: 10 })]);
  const sub = (id: string) => DATA.subclasses.find(s => s.id === id)!;
  expect(sub('nature-domain').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 1 });
  expect(sub('circle-of-the-land').bonusSpells!.grants).toContainEqual({ choose: { lists: ['druid'], level: 0, count: 1 }, atLevel: 2 });
});
```

Shadow Arts spells other than Minor Illusion carry `uses: "2 ki points"`; Spirit Seeker and Spirit Walker spells carry `uses: "Ritual only"`.

In `tests/unit/validate.test.ts`, three cases on a cloned valid dataset (follow the file's existing clone pattern):
- a class with `caster: 'full'` and no `spellAbility` gives `class "<id>": spellAbility required for a caster`;
- a grant `option` naming a non-option feature (e.g. `second-wind`) gives `<at>: grant option "second-wind" is not an option`;
- a class listing an option group owned by another class (put `metamagic` in fighter's `options`) gives `class "fighter": option group "metamagic" is owned by class "sorcerer"`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/unit/subclasses-content.test.ts tests/unit/validate.test.ts`
Expected: FAIL on the new tests only.

- [ ] **Step 3: Add the grants to the JSON files and the three checks to `validateDataset`**

The `prereq.option` check gets the same "is not an option" rule as `grant.option`. Ownership: a group in `class.options` must have `owner {kind:'class', id: class.id}`; in `subclass.options`, `owner {kind:'subclass', id}`; in `race.options`, `owner {kind:'race', id}`.

- [ ] **Step 4: Run all unit tests**

Run: `npm test`
Expected: PASS (the live dataset passes the stricter validator).

- [ ] **Step 5: Commit**

```bash
git add data src/data/validate.ts tests/unit
git commit -m "feat: parked subclass spell grants and validator checks"
```

---

### Task 2: Shared spell list and EK/AT menu ceiling

**Files:**
- Modify: `src/logic/rules.ts`, `src/logic/sections.ts`, `src/logic/menu.ts`
- Test: `tests/unit/menu.test.ts`, `tests/unit/sections.test.ts`

**Interfaces:**
- Produces: `listSpells(c: ClassDef, s?: SubclassDef): Spell[]` in `src/logic/rules.ts`: the class list, or for a subclass caster (`c.caster === 'none' && s?.casting`) the `casting.list` spells limited to `casting.schools` for levels ≥ 1 (cantrips unlimited). Same filter `spellSections` uses today; `spellSections` now calls it.
- Produces: `ceilingOf(table?: number[]): number` in `rules.ts` = highest value in the table, 0 when absent.
- Produces: `MenuRow.icon` img variant becomes `{ type: 'img'; src?: string }`.

- [ ] **Step 1: Write the failing test** (append to `tests/unit/menu.test.ts`)

```ts
test('subclass casters stop at their highest spell level', () => {
  const ek = menuRows('fighter', 3, 'eldritch-knight').filter(r => r.kind === 'spells');
  expect(ek.map(r => r.label).at(-1)).toBe('Level 4 Spells');
  expect(menuRows('rogue', 20, 'arcane-trickster').filter(r => r.kind === 'spells')).toHaveLength(4);
  expect(menuRows('wizard', 1).filter(r => r.kind === 'spells')).toHaveLength(9);
});
```

And in `tests/unit/sections.test.ts`: `listSpells` for `fighter` + `eldritch-knight` equals the items of `spellSections('fighter', 20, 'eldritch-knight')` minus nothing (no bonus spells), and `listSpells(wizard)` contains `fireball`.

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/menu.test.ts tests/unit/sections.test.ts`
- [ ] **Step 3: Implement** `listSpells`, `ceilingOf`; loop the menu's spell rows to `cast ? ceilingOf(cast.maxSpellLevel) : 9`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "fix: subclass casters show spell rows up to their ceiling"`

---

### Task 3: Character model, parser, storage

**Files:**
- Create: `src/character/types.ts`, `src/character/parse.ts`, `src/character/store.ts`
- Modify: `src/settings/storage.ts`
- Test: `tests/unit/character-parse.test.ts`

**Interfaces:**
- Produces (`types.ts`):

```ts
export interface CharClass { cls: ClassId; level: number; sub?: string; mod?: number }
/** Exactly one of cls / grant. cls: picked from that class's list (extra: from another list, e.g. Magical Secrets). grant: a GrantSlot key (Task 6). */
export interface CharSpell { id: string; cls?: ClassId; extra?: true; grant?: string }
export interface Character { v: 1; name: string; race?: string; classes: CharClass[]; options: string[]; feats: string[]; spells: CharSpell[] }
export function emptyCharacter(): Character
```

`race` is the most specific race id chosen (a subrace id implies its parent). `classes` is in the order taken; index 0 is the starting class.

- Produces (`parse.ts`):

```ts
export type ParseResult = { ok: true; ch: Character; dropped: string[] } | { ok: false; error: string };
export const ERR_NOT_CHARACTER = "This doesn't look like a saved character.";
export const ERR_NEWER = 'This character comes from a newer version of the site. Reload the page and try again.';
export function parseCharacter(raw: unknown): ParseResult
```

Rules: not an object or no numeric `v` → `ERR_NOT_CHARACTER`; `v > 1` → `ERR_NEWER` (future versions add a migration step here, keyed by `v`). `name`: string, trimmed, max 60 chars, else `''`. Unknown race, class, subclass (or subclass of another class), option feature (must be `source.kind === 'option'`), feat or spell ids are dropped and named in `dropped` (e.g. `spell "old-spell"`). Duplicate classes keep the first. `level` integer clamped to 1-20; `mod` kept only when an integer -5 to 10. A spell entry needs exactly one of `cls` (a class the character has) or `grant` (matching `/^[a-z]+:[a-z0-9-]+:\d+$/`); duplicates (same id and same `cls`/`grant`) collapse.

- Produces (`store.ts`): `CHARACTER_KEY = 'dndcs.character'`; `loadCharacter(): Character | null` (null when missing or unparsable); `saveCharacter(ch: Character): boolean` (false when storage refuses); `deleteCharacter(): void`.
- Produces (`storage.ts`): `removeKey(key: string): void`, wrapped like the others.

- [ ] **Step 1: Write the failing tests**

```ts
const lyra = { v: 1, name: 'Lyra', race: 'tiefling', classes: [{ cls: 'sorcerer', level: 5, sub: 'draconic-bloodline' }],
  options: ['metamagic-quickened-spell', 'metamagic-twinned-spell', 'draconic-ancestry-red'], feats: [],
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' }, { id: 'shield', cls: 'sorcerer' }] };

test('a valid character round-trips', () => expect(parseCharacter(lyra)).toEqual({ ok: true, ch: lyra, dropped: [] }));
test('not a character', () => {
  for (const raw of [null, 'x', 42, {}, { v: 'one' }]) expect(parseCharacter(raw)).toEqual({ ok: false, error: ERR_NOT_CHARACTER });
});
test('newer version', () => expect(parseCharacter({ ...lyra, v: 2 })).toEqual({ ok: false, error: ERR_NEWER }));
test('unknown content is dropped and listed', () => {
  const r = parseCharacter({ ...lyra, race: 'kender', spells: [...lyra.spells, { id: 'old-spell', cls: 'sorcerer' }], options: ['metamagic-gone'] });
  expect(r.ok && r.ch.race).toBeUndefined();
  expect(r.ok && r.dropped).toEqual(['race "kender"', 'option "metamagic-gone"', 'spell "old-spell"']);
});
test('clamps and cleans', () => {
  const r = parseCharacter({ ...lyra, name: '  x  ', classes: [{ cls: 'sorcerer', level: 99, sub: 'life-domain', mod: 50 }, { cls: 'sorcerer', level: 2 }] });
  expect(r.ok && r.ch.name).toBe('x');
  expect(r.ok && r.ch.classes).toEqual([{ cls: 'sorcerer', level: 20 }]);
});
test('spell needs a class the character has, or a grant key', () => {
  const r = parseCharacter({ ...lyra, spells: [{ id: 'cure-wounds', cls: 'cleric' }, { id: 'thaumaturgy', grant: 'race:tiefling:0' }, { id: 'light' }] });
  expect(r.ok && r.ch.spells).toEqual([{ id: 'thaumaturgy', grant: 'race:tiefling:0' }]);
});
test('store survives blocked storage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  expect(loadCharacter()).toBeNull();
  expect(saveCharacter(lyra as Character)).toBe(false);
  expect(() => deleteCharacter()).not.toThrow();
});
test('store round-trips', () => { saveCharacter(lyra as Character); expect(loadCharacter()).toEqual(lyra); deleteCharacter(); expect(loadCharacter()).toBeNull(); });
```

(`afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); })` as in `settings.test.ts`.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-parse.test.ts`
- [ ] **Step 3: Implement** the three files and `removeKey`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: versioned character model, parser and storage"`

---

### Task 4: Backup code

**Files:**
- Create: `src/character/code.ts`
- Test: `tests/unit/character-code.test.ts`

**Interfaces:**
- Consumes: `parseCharacter`, `ParseResult` (Task 3).
- Produces:

```ts
export const ERR_NOT_CODE = "That isn't a Spellbook & Steel backup code.";
export const ERR_DAMAGED = 'This code is damaged or cut short. Copy the whole code and try again.';
export async function encodeCharacter(ch: Character): Promise<string>
export async function decodeCharacter(code: string): Promise<ParseResult>
```

Format: `SS1-` + base64url(deflate-raw(JSON)). When `CompressionStream` is missing, `encodeCharacter` writes `SS0-` + base64url(JSON); `decodeCharacter` reads both. Decode strips all whitespace first; a wrong or missing prefix gives `ERR_NOT_CODE`; base64, inflate or JSON failure gives `ERR_DAMAGED`; then `parseCharacter`. Compress/decompress by writing the bytes to the stream's writer and reading `new Response(stream.readable).arrayBuffer()`. JSON omits `undefined` fields (plain `JSON.stringify`).

- [ ] **Step 1: Write the failing tests** (file starts with `// @vitest-environment node`)

```ts
test('round trip', async () => expect(await decodeCharacter(await encodeCharacter(lyra))).toEqual({ ok: true, ch: lyra, dropped: [] }));
test('a level 5 sorcerer fits in 400 characters', async () => {
  const full = { ...lyra, spells: ['fire-bolt', 'mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'shield', 'magic-missile', 'chromatic-orb', 'misty-step', 'scorching-ray', 'fireball'].map(id => ({ id, cls: 'sorcerer' as const })) };
  const code = await encodeCharacter(full);
  expect(code).toMatch(/^SS1-[A-Za-z0-9_-]+$/);
  expect(code.length).toBeLessThan(400);
});
test('whitespace and line breaks are ignored', async () => {
  const code = await encodeCharacter(lyra);
  const wrapped = ` ${code.slice(0, 20)}\n${code.slice(20, 40)} \r\n${code.slice(40)}\n`;
  expect((await decodeCharacter(wrapped)).ok).toBe(true);
});
test('not a code', async () => {
  for (const s of ['', 'hello', 'SS9-abc']) expect(await decodeCharacter(s)).toEqual({ ok: false, error: ERR_NOT_CODE });
});
test('cut short or garbled', async () => {
  const code = await encodeCharacter(lyra);
  for (const s of [code.slice(0, code.length - 10), 'SS1-@@@@', 'SS1-AAAA'])
    expect(await decodeCharacter(s)).toEqual({ ok: false, error: ERR_DAMAGED });
});
test('uncompressed fallback', async () => {
  vi.stubGlobal('CompressionStream', undefined);
  const code = await encodeCharacter(lyra);
  vi.unstubAllGlobals();
  expect(code.startsWith('SS0-')).toBe(true);
  expect((await decodeCharacter(code)).ok).toBe(true);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-code.test.ts`
- [ ] **Step 3: Implement** `code.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: compressed copy-paste backup code"`

---

### Task 5: Derived rules

**Files:**
- Create: `src/character/derive.ts`
- Test: `tests/unit/character-derive.test.ts`

**Interfaces:**
- Consumes: `listSpells`, `ceilingOf` (Task 2), `effectiveSub` (`src/logic/subclass.ts`).
- Produces:

```ts
export function totalLevel(ch: Character): number
export function raceChain(id?: string): RaceDef[]            // [base] or [base, subrace]; [] for none/unknown
export function classLine(ch: Character): string             // "Sorcerer 3 / Druid 2"
export interface CastingInfo {
  list: ClassId; schools?: string[]; ability: Ability; pact: boolean;
  cantrips: number; known?: number; prepared?: number; maxLevel: number; ceiling: number;
}
export function castingInfo(cc: CharClass): CastingInfo | null   // null: this class can't cast (incl. EK/AT below 3 or without the subclass)
export function pickCounts(ch: Character, cls: ClassId): { cantrips: number; spells: number }
export interface Pickable { spell: Spell; tag?: string }
export function pickableSpells(cc: CharClass): Pickable[]
export function featureLevel(ch: Character, f: Feature): number
```

- `castingInfo`: class casters from `ClassDef`; EK/AT from `SubclassDef.casting` through `effectiveSub`. `prepared` only for classes with `prepared`: `max(1, (mod ?? 0) + (half ? floor(level / 2) : level))`. `known` from the `spellsKnown` table. `maxLevel` = table value at the level; `ceiling = ceilingOf(table)`. `pact = caster === 'pact'`. Ability from `spellAbility` or `casting.ability`.
- `pickCounts`: picks with `cls === cls` (extras included). Spells exclude Warlock spells of level 6+ (Mystic Arcanum is outside the known count).
- `pickableSpells`: `listSpells(c, s)`; for EK/AT add the rest of the wizard list tagged `Any school`; add the subclass `patron` bonus spells tagged `Patron`; keep `spell.level <= maxLevel`; order by level then name; no duplicates.
- `featureLevel`: class/subclass features use the owning class's level; option features use the level of the class that owns the option group (via `OptionGroup.owner`, subclass owners resolve to their class); race, feat and generic features use `totalLevel`.

- [ ] **Step 1: Write the failing tests**

```ts
const ch = (classes: CharClass[], extra: Partial<Character> = {}): Character => ({ ...emptyCharacter(), classes, ...extra });

test('levels and class line', () => {
  const c = ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2 }]);
  expect(totalLevel(c)).toBe(5);
  expect(classLine(c)).toBe('Sorcerer 3 / Druid 2');
});
test('race chain', () => {
  expect(raceChain('drow').map(r => r.id)).toEqual(['elf', 'drow']);
  expect(raceChain('tiefling').map(r => r.id)).toEqual(['tiefling']);
  expect(raceChain(undefined)).toEqual([]);
});
test('casting info per class as if single-classed', () => {
  expect(castingInfo({ cls: 'sorcerer', level: 5 })).toMatchObject({ list: 'sorcerer', cantrips: 5, known: 6, maxLevel: 3, ceiling: 9, ability: 'cha' });
  expect(castingInfo({ cls: 'druid', level: 2, mod: 3 })).toMatchObject({ prepared: 5, maxLevel: 1 });
  expect(castingInfo({ cls: 'paladin', level: 5, mod: 3 })).toMatchObject({ prepared: 5, maxLevel: 2, ceiling: 5 });
  expect(castingInfo({ cls: 'paladin', level: 1, mod: -1 })).toMatchObject({ prepared: 1, maxLevel: 0 });
  expect(castingInfo({ cls: 'fighter', level: 3 })).toBeNull();
  expect(castingInfo({ cls: 'fighter', level: 3, sub: 'eldritch-knight' })).toMatchObject({ list: 'wizard', schools: ['Abjuration', 'Evocation'], cantrips: 2, known: 3, maxLevel: 1, ceiling: 4 });
  expect(castingInfo({ cls: 'warlock', level: 1 })).toMatchObject({ pact: true });
});
test('pickable spells', () => {
  const ek = pickableSpells({ cls: 'fighter', level: 3, sub: 'eldritch-knight' });
  expect(ek.find(p => p.spell.id === 'shield')!.tag).toBeUndefined();
  expect(ek.find(p => p.spell.id === 'charm-person')!.tag).toBe('Any school');
  expect(ek.every(p => p.spell.level <= 1)).toBe(true);
  expect(pickableSpells({ cls: 'warlock', level: 1, sub: 'the-fiend' }).find(p => p.spell.id === 'burning-hands')!.tag).toBe('Patron');
});
test('pick counts skip Mystic Arcanum', () => {
  const c = ch([{ cls: 'warlock', level: 11 }], { spells: [{ id: 'eldritch-blast', cls: 'warlock' }, { id: 'hex', cls: 'warlock' }, { id: 'mass-suggestion', cls: 'warlock' }] });
  expect(pickCounts(c, 'warlock')).toEqual({ cantrips: 1, spells: 1 });
});
test('feature level', () => {
  const c = ch([{ cls: 'fighter', level: 2 }, { cls: 'sorcerer', level: 3 }], { race: 'dragonborn' });
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(featureLevel(c, f('action-surge'))).toBe(2);
  expect(featureLevel(c, f('metamagic-quickened-spell'))).toBe(3);
  expect(featureLevel(c, f('breath-weapon'))).toBe(5);
});
```

(Check `mass-suggestion` is level 6 on the warlock list; if not, use another level 6 warlock spell.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-derive.test.ts`
- [ ] **Step 3: Implement** `derive.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: derived character rules"`

---

### Task 6: Option slots, grant slots, automatic spells, prune

**Files:**
- Create: `src/character/options.ts`, `src/character/grants.ts`
- Test: `tests/unit/character-grants.test.ts`

**Interfaces:**
- Consumes: Tasks 3 and 5.
- Produces (`options.ts`):

```ts
export interface OptionSlot { group: OptionGroup; cls?: ClassId; level: number; count: number; choices: Feature[]; chosen: string[] }
export function optionSlots(ch: Character): OptionSlot[]
export function prune(ch: Character): Character
```

`optionSlots` order: for each class in order, the class's `options` groups then its effective subclass's `options` groups; then the race chain's groups (`cls` undefined, `level = totalLevel`). `count = picks[level-1]` plus every `bonus` whose `subclass` is the effective subclass and `atLevel <= level`; slots with `count === 0` are left out. `choices`: option features of `from ?? id`, limited by `only`, with `prereq.level <= level` and `prereq.option` (when set) in `ch.options`. `chosen` = `ch.options` that are in `choices`.

`prune` removes: `sub` that isn't a subclass of its class; options whose group (`from ?? id`) is not the source of any group the character owns (ownership only, never level, so lowering a level never deletes picks); spells whose `cls` the character lacks; spells whose `grant` key is not in `grantSlots(ch)` (locked slots count). Returns the same object when nothing changed.

- Produces (`grants.ts`):

```ts
export interface GrantSource {
  key: string;            // 'race:<raceId>' | 'feat:<featId>' | 'feature:<featureId>' | 'sub:<subclassId>'
  title: string;          // race, feat, feature or bonus label ('Domain', 'Oath', 'Circle')
  cls?: ClassId;          // owning class for feature and sub sources
  level: number;          // the level grants compare atLevel against (class level, or total level for race/feat)
  grants: { grant: SpellGrant; index: number }[];   // index in the source's original grant array
  step: EditStep;         // where the editor offers its choices: race basics, feat feats, option options, class/subclass/sub spells
}
export function grantSources(ch: Character): GrantSource[]
export interface GrantSlot { key: string; source: GrantSource; choose: NonNullable<SpellGrant['choose']>; unlocked: boolean; candidates: Spell[] }
export function grantSlots(ch: Character): GrantSlot[]
export interface AutoSpell { spell: Spell; source: GrantSource; unlocked: boolean; atLevel: number; uses?: string }
export function autoSpells(ch: Character): AutoSpell[]
```

Sources, in order: race chain (base first), feats in `ch.feats` order, chosen option features with `spells`, owned class and subclass features with `spells` (any level), effective subclass `bonusSpells` except `patron` (grants with an `option` not in `ch.options` are skipped, keeping original indexes). Sources with no grants are left out. Slot key = `${source.key}:${index}`. `unlocked = grant.atLevel <= source.level`. Candidates: spells with `level === choose.level`, sharing a class with `choose.lists`, `ritual` when `choose.ritual`, school in `choose.schools` when set; ordered by name. `autoSpells` = every fixed (`spell`) grant.

- [ ] **Step 1: Write the failing tests**

```ts
test('option slots with counts and prerequisites', () => {
  const c = ch([{ cls: 'warlock', level: 5 }], { options: ['pact-boon-pact-of-the-tome'] });
  const inv = optionSlots(c).find(s => s.group.id === 'eldritch-invocations')!;
  expect(inv.count).toBe(3);
  expect(inv.choices.every(f => (f.prereq?.level ?? 1) <= 5)).toBe(true);
  expect(optionSlots(ch([{ cls: 'fighter', level: 10, sub: 'champion' }])).find(s => s.group.id === 'fighting-style')!.count).toBe(2);
  expect(optionSlots(ch([{ cls: 'wizard', level: 3 }], { race: 'dragonborn' })).map(s => s.group.id)).toEqual(['draconic-ancestry']);
  expect(optionSlots(ch([{ cls: 'sorcerer', level: 2 }])).some(s => s.group.id === 'metamagic')).toBe(false);
});
test('grant slots: race, feat, option, subclass', () => {
  const c = ch([{ cls: 'warlock', level: 3 }, { cls: 'cleric', level: 1, sub: 'nature-domain' }],
    { race: 'high-elf', feats: ['magic-initiate'], options: ['pact-boon-pact-of-the-tome'] });
  expect(grantSlots(c).map(s => [s.key, s.source.step, s.choose.count])).toEqual([
    ['race:high-elf:0', 'basics', 1],
    ['feat:magic-initiate:0', 'feats', 2], ['feat:magic-initiate:1', 'feats', 1],
    ['feature:pact-boon-pact-of-the-tome:0', 'options', 3],
    ['sub:nature-domain:10', 'spells', 1],
  ]);
  expect(grantSlots(c)[0].candidates.every(s => s.level === 0 && s.classes.includes('wizard'))).toBe(true);
});
test('automatic spells unlock by the right level', () => {
  const tief = autoSpells(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }));
  expect(tief.map(a => [a.spell.id, a.unlocked])).toEqual([['thaumaturgy', true], ['hellish-rebuke', true], ['darkness', false]]);
  const land = autoSpells(ch([{ cls: 'druid', level: 3, sub: 'circle-of-the-land' }], { options: ['land-terrain-arctic'] }));
  expect(land.map(a => a.spell.id)).toContain('hold-person');
  expect(land.every(a => a.source.key === 'sub:circle-of-the-land')).toBe(true);
  expect(autoSpells(ch([{ cls: 'warlock', level: 1, sub: 'the-fiend' }]))).toEqual([]);
});
test('prune drops orphaned picks but keeps level-locked ones', () => {
  const c = ch([{ cls: 'warlock', level: 2 }], { options: ['eldritch-invocations-thirsting-blade', 'metamagic-twinned-spell'],
    spells: [{ id: 'cure-wounds', cls: 'cleric' }, { id: 'light', grant: 'race:high-elf:0' }, { id: 'hex', cls: 'warlock' }] });
  const p = prune(c);
  expect(p.options).toEqual(['eldritch-invocations-thirsting-blade']);
  expect(p.spells).toEqual([{ id: 'hex', cls: 'warlock' }]);
  expect(prune(p)).toBe(p);
});
```

(The grant index for Nature Domain is whatever index the Task 1 entry got; read it from the data in the test if it isn't 10.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-grants.test.ts`
- [ ] **Step 3: Implement** `options.ts` and `grants.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: option slots, spell grants and prune"`

---

### Task 7: Character spell sections

**Files:**
- Create: `src/character/view.ts` (spell part)
- Modify: `src/logic/sections.ts` (`Section.mine?: string[]`), `src/settings/settings.ts` (`SpellView` type only)
- Test: `tests/unit/character-view.test.ts`

**Interfaces:**
- Consumes: Tasks 5 and 6.
- Produces: `export type SpellView = 'mine' | 'all'` in `settings.ts`; in `view.ts`:

```ts
export function hasPickedSpells(ch: Character): boolean      // ch.spells.length > 0
export function charSpellSections(ch: Character, view: SpellView): Section[]
```

Placement of every spell, as an entry `{ spell, place, tag?, mine, locked }`:
- **Class place** (a class with `castingInfo`): its `CharSpell` picks with `cls` (tag `Magical Secrets` for a bard extra, `Other list` for other extras, `Any school` for EK/AT off-school picks); picked grant spells and automatic spells whose source has a `cls` that casts (tag = source title, e.g. `Domain`, `Pact of the Tome`, `Mage Hand Legerdemain`); in `all` view also `pickableSpells` up to the ceiling (not mine). Spells of level above `maxLevel` make the section `locked = "Unlocks at <Class> <n>"` (first level in the table reaching it).
- **Source place** (everything else: race, feat, features of a class that doesn't cast): picked grant spells and automatic spells of that source; title = source title; `locked` when every entry is locked: `Unlocks at character level <n>` for race/feat, `Unlocks at <Class> <n>` for features.
- `mine` = picked, or automatic and unlocked. `mine` view keeps only mine entries; `all` view keeps everything and sets `section.mine` to the ids that are mine.
- Order: spell level 0 to 9, then class places in class order, then source places in `grantSources` order. Empty sections are left out.
- Section: `id = <cantrips|lvl-N>-<placeKey>` with placeKey = class id, or source key with `:` replaced by `-` (`race-tiefling`, `feat-magic-initiate`, `feature-shadow-arts`); `title` = `Cantrips` / `Level N`; `subtitle` = class name or source title; `motif` = list class for class places, none for source places.
- Duplicate spell in one place: one item, mine if any entry is mine, first tag wins.

- [ ] **Step 1: Write the failing tests**

```ts
const lyra = ch([{ cls: 'sorcerer', level: 5, sub: 'draconic-bloodline' }], { race: 'tiefling',
  spells: [{ id: 'fire-bolt', cls: 'sorcerer' }, { id: 'shield', cls: 'sorcerer' }, { id: 'fireball', cls: 'sorcerer' }] });

test('mine view: picks plus unlocked racial spells', () => {
  const s = charSpellSections(lyra, 'mine');
  expect(s.map(x => x.id)).toEqual(['cantrips-sorcerer', 'cantrips-race-tiefling', 'lvl-1-sorcerer', 'lvl-1-race-tiefling', 'lvl-2-race-tiefling', 'lvl-3-sorcerer']);
  expect(s.find(x => x.id === 'cantrips-race-tiefling')).toMatchObject({ title: 'Cantrips', subtitle: 'Tiefling', motif: undefined });
  expect(s.find(x => x.id === 'lvl-1-sorcerer')!.items.map(i => i.id)).toEqual(['shield']);
  expect(s.every(x => x.mine === undefined)).toBe(true);
});
test('all view rings the character spells and locks unreachable levels', () => {
  const s = charSpellSections(lyra, 'all');
  const l1 = s.find(x => x.id === 'lvl-1-sorcerer')!;
  expect(l1.items.length).toBeGreaterThan(10);
  expect(l1.mine).toEqual(['shield']);
  expect(s.find(x => x.id === 'lvl-4-sorcerer')!.locked).toBe('Unlocks at Sorcerer 7');
});
test('multiclass orders by level then class', () => {
  const c = ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2, mod: 3 }],
    { spells: [{ id: 'shield', cls: 'sorcerer' }, { id: 'cure-wounds', cls: 'druid' }, { id: 'guidance', cls: 'druid' }] });
  expect(charSpellSections(c, 'mine').map(x => x.id)).toEqual(['cantrips-druid', 'lvl-1-sorcerer', 'lvl-1-druid']);
});
test('domain spells are always prepared and tagged', () => {
  const c = ch([{ cls: 'cleric', level: 1, sub: 'life-domain', mod: 3 }], { spells: [{ id: 'guidance', cls: 'cleric' }] });
  const l1 = charSpellSections(c, 'mine').find(x => x.id === 'lvl-1-cleric')!;
  expect(l1.items.map(i => i.id)).toEqual(['bless', 'cure-wounds']);
  expect(l1.tags).toEqual({ bless: 'Domain', 'cure-wounds': 'Domain' });
});
test('non-caster: race and feature spells get their own sections', () => {
  const c = ch([{ cls: 'monk', level: 3, sub: 'way-of-shadow' }], { race: 'tiefling' });
  const ids = charSpellSections(c, 'mine').map(x => x.id);
  expect(ids).toContain('cantrips-feature-shadow-arts');
  expect(ids).toContain('lvl-2-feature-shadow-arts');
  expect(ids.some(i => i.endsWith('-monk'))).toBe(false);
  const dark = charSpellSections(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }), 'all').find(x => x.id === 'lvl-2-race-tiefling')!;
  expect(dark.locked).toBe('Unlocks at character level 5');
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-view.test.ts`
- [ ] **Step 3: Implement** the spell part of `view.ts`.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: character spell sections with My and All views"`

---

### Task 8: Character action sections and menu rows

**Files:**
- Modify: `src/character/view.ts`
- Test: `tests/unit/character-view.test.ts`

**Interfaces:**
- Consumes: Tasks 5 to 7; `MenuRow`, icon constants from `src/logic/menu.ts`.
- Produces:

```ts
export function charActionSections(ch: Character): Section[]
export function charMenuRows(ch: Character): MenuRow[]
```

Routes used as targets come from Task 9: `{ page: 'me-actions'; section }`, `{ page: 'me-spells'; section }`.

`charActionSections`: `actions`, `bonus`, `reactions` (generic, as plain mode); per class: `class-<cls>` (title `<Class> Actions`, motif cls, non-passive class features with `level <= class level`), `subclass-<cls>` (effective subclass, same filter, only when non-empty), then each of that class's option slots as `opt-<group.id>` with the chosen non-passive options whose `prereq.level <= level` (only when non-empty); `race` (title `<Base race> Actions`, non-passive race features of the chain plus chosen non-passive race-owned options; only when non-empty); `feats` (title `Feats`, non-passive features of chosen feats; only when non-empty).

`charMenuRows`:
1. `Actions`, `Bonus Actions`, `Reactions` (as plain mode, targets `me-actions`).
2. One `<Class> Actions` row per class, icon subclass or class hotbar icon, target the first non-empty `class-`/`subclass-`/`opt-` section of that class (fallback `class-<cls>`).
3. `<Base race> Actions` when the `race` section exists (icon race icon), then `Feats` when `feats` exists. No motif.
4. When `charSpellSections(ch, 'all')` is non-empty: the `MAGIC` separator. Then for n = 0 to 9, for each casting class with `n <= ceiling` or a mine spell at level n: label `Cantrips` / `Level n Spells` when exactly one class casts, else `<Class> Cantrips` / `Level n <Class> Spells`; icon as plain mode (Warlock slot icon for pact); `dimmed` when n > maxLevel (cantrips: when `cantrips === 0`); motif = list class; target `lvl-n-<cls>` / `cantrips-<cls>`.
5. One row per source place that has sections: label `<Source title> Spells` (e.g. `Tiefling Spells`, `Shadow Arts Spells`), icon the race or feat icon (or none), target its first section, no motif (*my call*: the spec lists class spell rows only; without these rows a non-caster could not reach racial spells).

- [ ] **Step 1: Write the failing tests**

```ts
test('character action sections', () => {
  const c = ch([{ cls: 'fighter', level: 3, sub: 'battle-master' }, { cls: 'sorcerer', level: 3 }],
    { race: 'dragonborn', feats: ['sentinel'], options: ['fighting-style-defense', 'maneuvers-trip-attack', 'metamagic-quickened-spell', 'draconic-ancestry-red'] });
  const ids = charActionSections(c).map(s => s.id);
  expect(ids).toEqual(['actions', 'bonus', 'reactions', 'class-fighter', 'subclass-fighter', 'opt-maneuvers', 'class-sorcerer', 'opt-metamagic', 'race', 'feats']);
  expect(charActionSections(c).find(s => s.id === 'race')!.title).toBe('Dragonborn Actions');
  expect(charActionSections(c).find(s => s.id === 'opt-metamagic')!.items.map(i => i.id)).toEqual(['metamagic-quickened-spell']);
});
test('single-class menu', () => {
  const rows = charMenuRows(lyra);
  expect(rows.map(r => r.label).slice(0, 8)).toEqual(['Actions', 'Bonus Actions', 'Reactions', 'Sorcerer Actions', 'MAGIC', 'Cantrips', 'Level 1 Spells', 'Level 2 Spells']);
  expect(rows.find(r => r.label === 'Level 4 Spells')!.dimmed).toBe(true);
  expect(rows.find(r => r.label === 'Level 1 Spells')!.target).toEqual({ page: 'me-spells', section: 'lvl-1-sorcerer' });
  expect(rows.at(-1)).toMatchObject({ label: 'Tiefling Spells', target: { page: 'me-spells', section: 'cantrips-race-tiefling' } });
});
test('multiclass menu with a non-caster first', () => {
  const rows = charMenuRows(ch([{ cls: 'fighter', level: 2 }, { cls: 'wizard', level: 3, mod: 3 }]));
  expect(rows.filter(r => r.kind === 'class').map(r => r.label)).toEqual(['Fighter Actions', 'Wizard Actions']);
  expect(rows.filter(r => r.kind === 'spells').every(r => r.motif === 'wizard')).toBe(true);
  expect(rows.find(r => r.kind === 'cantrips')!.label).toBe('Cantrips');
  const two = charMenuRows(ch([{ cls: 'sorcerer', level: 3 }, { cls: 'druid', level: 2 }]));
  expect(two.filter(r => r.kind === 'spells').slice(0, 2).map(r => r.label)).toEqual(['Level 1 Sorcerer Spells', 'Level 1 Druid Spells']);
});
test('non-caster with racial spells gets a spells row', () => {
  const rows = charMenuRows(ch([{ cls: 'barbarian', level: 3 }], { race: 'tiefling' }));
  expect(rows.map(r => r.label)).toEqual(['Actions', 'Bonus Actions', 'Reactions', 'Barbarian Actions', 'MAGIC', 'Tiefling Spells']);
});
```

(Check `maneuvers-trip-attack` exists; use any maneuver id otherwise.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/character-view.test.ts`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: character actions and menu rows"`

---

### Task 9: Routes and the spell view setting

**Files:**
- Modify: `src/data/types.ts`, `src/router.ts`, `src/settings/settings.ts`
- Test: `tests/unit/router.test.ts`, `tests/unit/settings.test.ts`

**Interfaces:**
- Produces in `types.ts`:

```ts
export type EditStep = 'basics' | 'classes' | 'options' | 'feats' | 'spells';
// added to Route:
| { page: 'me' }
| { page: 'me-spells' | 'me-actions'; section?: string }
| { page: 'me-card'; kind: 'spell' | 'feature'; id: string; section?: string }
| { page: 'edit'; step: EditStep }
```

Hashes: `#/me`, `#/me/spells?s=<section>`, `#/me/actions?s=<section>`, `#/me/card/<kind>/<id>?s=<section>`, `#/edit/<step>`. Unknown step or extra segments fall back to start.
- Produces in `settings.ts`: `Settings.spellView: SpellView`, default `'mine'`; an invalid stored value falls back to `'mine'`. `v` stays 1 (an added field with a default needs no migration).

- [ ] **Step 1: Write the failing tests**

```ts
test.each(['#/me', '#/me/spells', '#/me/spells?s=lvl-1-sorcerer', '#/me/actions?s=class-fighter', '#/me/card/spell/fire-bolt?s=cantrips-sorcerer', '#/me/card/feature/second-wind', '#/edit/basics', '#/edit/spells'])
  ('round-trips %s', h => expect(toHash(parseHash(h))).toBe(h));
test.each(['#/edit/nope', '#/edit', '#/me/x', '#/me/card/spell', '#/me/card/thing/x'])('bad %s falls back', h => expect(parseHash(h)).toEqual({ page: 'start' }));
```

Settings: `loadSettings().spellView` is `'mine'` by default, `'all'` after saving it, `'mine'` when stored as `'everything'`.

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/router.test.ts tests/unit/settings.test.ts`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: character and editor routes, spell view setting"`

---

### Task 10: Shared screens take a back link and pick handler

A refactor so the character pages reuse the plain-class screens. Plain-class behaviour must not change: every existing unit and e2e test passes untouched.

**Files:**
- Create: `src/ui/MenuView.tsx`
- Modify: `src/ui/IconGrid.tsx`, `src/ui/screens/SectionPage.tsx`, `SpellsPage.tsx`, `ActionsPage.tsx`, `Menu.tsx`, `Card.tsx`, `src/styles/components.css`, `src/styles/themes/faerun.css`
- Test: `tests/unit/screens.test.tsx`, `tests/unit/ui.test.tsx`

**Interfaces:**
- Produces:

```ts
// IconGrid: new optional prop; ringed items get class "ic mine"
IconGrid(p: { items: (Spell | Feature)[]; tags?: Record<string, string>; ringed?: string[]; onPick(id: string): void })
// SectionPage: no more cls/level/sub/kind
SectionPage(p: { title: string; back: { href: string; label: string }; section?: string; sections: Section[];
  empty?: string; head?: ComponentChildren; onPick(id: string, section: string): void })
// MenuView: the body of today's Menu
MenuView(p: { title: string; subline: string; back: { href: string; label: string }; rows: MenuRow[]; extra?: ComponentChildren })
// Card: optional back override
Card(p: { kind: 'spell' | 'feature'; id: string; cls: ClassId; level: number; sub?: string; back?: string })
```

`SectionPage` passes `section.mine` to `IconGrid` as `ringed`; `head` renders inside the fixed header, right side (the My/All toggle goes there). `Card` source labels for race and feat features use `DATA.races` / `DATA.feats` names instead of the capitalised id. Ring: `.ic.mine img{box-shadow:var(--mine-ring)}` with `--mine-ring` defined in `faerun.css` (gold, 2 px, plus a soft glow).

- [ ] **Step 1: Write the failing tests**

```ts
test('IconGrid rings the given ids', () => {
  const items = [DATA.spells.find(s => s.id === 'shield')!, DATA.spells.find(s => s.id === 'sleep')!];
  const r = render(<IconGrid items={items} ringed={['shield']} onPick={() => {}} />);
  expect([...r.container.querySelectorAll('.ic')].map(b => b.classList.contains('mine'))).toEqual([true, false]);
});
test('Card names the race on race features', () => {
  const r = render(<Card kind="feature" id="breath-weapon" cls="fighter" level={1} />);
  expect(r.container.querySelector('.card-sub')!.textContent).toContain('Dragonborn Feature');
});
test('Card back override', () => {
  const r = render(<Card kind="spell" id="shield" cls="wizard" level={3} back="#/me/spells?s=lvl-1-wizard" />);
  expect(r.container.querySelector('.back')!.getAttribute('href')).toBe('#/me/spells?s=lvl-1-wizard');
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/screens.test.tsx tests/unit/ui.test.tsx`
- [ ] **Step 3: Implement** the refactor. Plain `SpellsPage`/`ActionsPage` build `back` (`‹ Menu` to the plain menu) and an `onPick` that opens the plain card route; plain `Menu` renders `MenuView` with title class name, subline `Level N · Subclass`, back `‹ Level`.
- [ ] **Step 4: Run** `npm test && npm run build && npm run e2e` — all PASS.
- [ ] **Step 5: Commit** — `git commit -m "refactor: screens take back links and pick handlers"`

---

### Task 11: Character pages and start tile

**Files:**
- Create: `src/ui/screens/me/MeMenu.tsx`, `MeSpells.tsx`, `MeActions.tsx`, `MeCard.tsx`
- Modify: `src/app.tsx`, `src/ui/screens/Start.tsx`, `src/styles/screens.css`
- Test: `tests/unit/me-screens.test.tsx`

**Interfaces:**
- Consumes: Tasks 3, 5 to 10.
- Produces: `MeMenu(p: { ch: Character })`, `MeSpells(p: { ch: Character; section?: string })`, `MeActions(p: { ch: Character; section?: string })`, `MeCard(p: { ch: Character; kind: 'spell' | 'feature'; id: string; section?: string })`.

Behaviour:
- `App`: for `me`, `me-spells`, `me-actions`, `me-card`, read `loadCharacter()`; when it is null or has no class, render `<Editor step={ch ? 'classes' : 'basics'} />` (Editor comes in Task 12; until then render `Start`, and switch in Task 12). `edit` routes render the Editor.
- `MeMenu`: `MenuView` with title `ch.name || 'My Character'`, subline `classLine(ch)`, back `‹ Home` to `#/`, rows `charMenuRows(ch)`, `extra` = a `Edit character` link to `#/edit/basics`.
- `MeSpells`: title `Spells`, back `‹ Menu` to `#/me`. View = settings `spellView`, forced to `'all'` (and no toggle) when `!hasPickedSpells(ch)`. Toggle in `head`: two buttons `My spells` and `All` with `aria-pressed`; a press saves `spellView`. When `section` is given, the view is `mine`, and no mine section has that id while an `all` section does, switch to `all` and save it (spec 5.5). `onPick` opens `#/me/card/spell/<id>?s=<section>`.
- `MeActions`: title `Actions`, sections `charActionSections(ch)`, `onPick` opens `#/me/card/feature/<id>?s=<section>`.
- `MeCard`: renders `Card` with `back` = `#/me/spells?s=…` or `#/me/actions?s=…`; for a feature, `cls`/`sub` of the owning class (class/subclass source, or the class of the option slot holding it; else the first class) and `level = featureLevel(ch, f)`.
- `Start`: the `My Character Sheet` tile is enabled; its small line is the character name, or `Create your character`. Tap: `#/me` when a character with a class exists, else `#/edit/basics`.

- [ ] **Step 1: Write the failing tests**

```ts
beforeEach(() => { localStorage.clear(); location.hash = ''; });
test('menu shows name, class line and character rows', () => {
  const r = render(<MeMenu ch={lyra} />);
  expect(r.container.textContent).toContain('Lyra');
  expect(r.container.textContent).toContain('Sorcerer 5');
  expect(r.getByText('Tiefling Spells')).toBeTruthy();
  expect(r.getByText('Edit character').getAttribute('href')).toBe('#/edit/basics');
});
test('My/All toggle filters and persists', () => {
  const r = render(<MeSpells ch={lyra} />);
  expect(r.container.querySelectorAll('.ic.mine')).toHaveLength(0);
  fireEvent.click(r.getByRole('button', { name: 'All' }));
  expect(r.container.querySelectorAll('.ic.mine').length).toBeGreaterThan(0);
  expect(loadSettings().spellView).toBe('all');
});
test('jumping to a section My hides switches to All', () => {
  render(<MeSpells ch={lyra} section="lvl-2-sorcerer" />);
  expect(loadSettings().spellView).toBe('all');
});
test('no picked spells: all spells, no toggle', () => {
  const r = render(<MeSpells ch={{ ...lyra, spells: [] }} />);
  expect(r.queryByRole('button', { name: 'All' })).toBeNull();
  expect(r.container.querySelectorAll('.ic').length).toBeGreaterThan(20);
});
test('card back link and feature level', () => {
  const r = render(<MeCard ch={lyra} kind="feature" id="font-of-magic" section="class-sorcerer" />);
  expect(r.container.querySelector('.back')!.getAttribute('href')).toBe('#/me/actions?s=class-sorcerer');
});
test('start tile', () => {
  const r = render(<Start />);
  expect(r.getByText('Create your character')).toBeTruthy();
  fireEvent.click(r.getByText('My Character Sheet'));
  expect(location.hash).toBe('#/edit/basics');
  saveCharacter(lyra);
  const r2 = render(<Start />);
  fireEvent.click(r2.getAllByText('My Character Sheet').at(-1)!);
  expect(location.hash).toBe('#/me');
});
test('me routes without a character never crash', () => {
  location.hash = '#/me/spells';
  expect(() => render(<App />)).not.toThrow();
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/me-screens.test.tsx`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: character menu, spells, actions and cards"`

---

### Task 12: Editor shell, basics and classes steps

**Files:**
- Create: `src/ui/editor/Editor.tsx`, `StepBasics.tsx`, `StepClasses.tsx`, `PickList.tsx`
- Modify: `src/app.tsx`, `src/styles/screens.css`, `src/styles/themes/faerun.css` (a `--warn` token if none fits)
- Test: `tests/unit/editor.test.tsx`

**Interfaces:**
- Consumes: Tasks 3, 5, 6.
- Produces:

```ts
export const EDIT_STEPS: { step: EditStep; label: string }[]   // Race & name, Classes, Options, Feats, Spells
Editor(p: { step: EditStep })
export interface StepProps { ch: Character; update(next: Character): void }
StepBasics(p: StepProps); StepClasses(p: StepProps)
PickList(p: { items: { id: string; label: string; note?: string }[]; picked: string[]; onToggle(id: string): void })   // toggle rows, aria-pressed
```

`Editor`: holds `ch` in state from `loadCharacter() ?? emptyCharacter()`; `update(next)` runs `prune`, sets state and `saveCharacter`; when saving fails it shows `This browser won't keep your character. Make a backup code in Settings.` Layout: back `‹ Home`, title `My Character`, a row of the five step links (`#/edit/<step>`, current one marked `aria-current="step"`), the step body, then `‹ Back` / `Next ›` buttons; on `spells` the next button reads `Done` and goes to `#/me`, disabled with the note `Add a class first` while there is no class. Steps not yet built (Task 13, 14) render a placeholder paragraph.

`StepBasics`: name input (max 60); race `<select>` of base races (`parent` unset) plus `No race`; subrace `<select>` when the race has subraces (with `No subrace`); changing the base race clears the subrace. Below, `GrantPicker` for `basics` slots (Task 13; placeholder until then). At the bottom a `Delete character` button that needs a second tap (`Tap again to delete`) and then calls `deleteCharacter()` and goes to `#/`.

`StepClasses`: one block per class: name, level `<select>` 1-20, subclass `<select>` (`No <subclassLabel>` + that class's subclasses) shown once `level >= subclassLevel`, `Remove` button. Then a `<select>` of classes not taken plus `Add class` (adds at level 1). Footer `Character level N`; above 20 a warning `Character level can't go above 20.`; a hint `List the class you started with first.`

- [ ] **Step 1: Write the failing tests**

```ts
test('editing saves on every change', () => {
  const r = render(<Editor step="basics" />);
  fireEvent.input(r.getByLabelText('Name'), { target: { value: 'Lyra' } });
  fireEvent.change(r.getByLabelText('Race'), { target: { value: 'elf' } });
  fireEvent.change(r.getByLabelText('Subrace'), { target: { value: 'drow' } });
  expect(loadCharacter()).toMatchObject({ name: 'Lyra', race: 'drow' });
});
test('classes: add, level, subclass, remove prunes spells', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1 }], spells: [{ id: 'guidance', cls: 'cleric' }] });
  const r = render(<Editor step="classes" />);
  fireEvent.change(r.getByLabelText('Add a class'), { target: { value: 'wizard' } });
  fireEvent.click(r.getByText('Add class'));
  fireEvent.change(r.getByLabelText('Wizard level'), { target: { value: '2' } });
  fireEvent.change(r.getByLabelText('Wizard Arcane Tradition'), { target: { value: 'school-of-evocation' } });
  fireEvent.click(r.getAllByText('Remove')[0]);
  expect(loadCharacter()).toMatchObject({ classes: [{ cls: 'wizard', level: 2, sub: 'school-of-evocation' }], spells: [] });
  expect(r.getByText('Character level 2')).toBeTruthy();
});
test('done needs a class', () => {
  const r = render(<Editor step="spells" />);
  expect(r.getByRole('button', { name: 'Done' })).toHaveProperty('disabled', true);
  expect(r.getByText('Add a class first')).toBeTruthy();
});
test('blocked storage: editor still works and says so', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const r = render(<Editor step="basics" />);
  fireEvent.input(r.getByLabelText('Name'), { target: { value: 'Lyra' } });
  expect((r.getByLabelText('Name') as HTMLInputElement).value).toBe('Lyra');
  expect(r.getByText(/won't keep your character/)).toBeTruthy();
});
test('delete needs two taps', () => {
  saveCharacter({ ...emptyCharacter(), name: 'Lyra' });
  const r = render(<Editor step="basics" />);
  fireEvent.click(r.getByText('Delete character'));
  expect(loadCharacter()).not.toBeNull();
  fireEvent.click(r.getByText('Tap again to delete'));
  expect(loadCharacter()).toBeNull();
});
```

(Use the class's `subclassLabel` in the subclass select's label; check the wizard's label in `data/classes.json`.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/editor.test.tsx`
- [ ] **Step 3: Implement**; wire `edit` routes and the no-character fallback in `App`.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: character editor with race and class steps"`

---

### Task 13: Options and feats steps, grant picker

**Files:**
- Create: `src/ui/editor/StepOptions.tsx`, `StepFeats.tsx`, `GrantPicker.tsx`
- Modify: `src/ui/editor/Editor.tsx`, `StepBasics.tsx`
- Test: `tests/unit/editor.test.tsx`

**Interfaces:**
- Consumes: `optionSlots`, `grantSlots`, `PickList`, `IconGrid` (`ringed`).
- Produces: `StepOptions(p: StepProps)`, `StepFeats(p: StepProps)`, `GrantPicker(p: StepProps & { step: EditStep })`.

`StepOptions`: per slot a separator titled with the group name (plus ` · <Class>` when the character has 2+ classes), a count line `N of M chosen` (`more than usual` warning when N > M), and a `PickList` of its choices (note = `prereq.text`). Toggling adds or removes the feature id in `ch.options`. No slots: `Nothing to choose yet.` Then `GrantPicker step="options"`.

`StepFeats`: `PickList` of every feat (note = `prereq`), then `GrantPicker step="feats"`.

`GrantPicker`: for each `grantSlots(ch)` slot with `source.step === step`: heading `<source title>: choose <count> <cantrip(s)|level N spell(s)>` plus ` (rituals)` when `ritual`; locked slots show only `Unlocks at …` (character level for race/feat, `<Class> N` otherwise); unlocked slots show `N of M chosen` and an `IconGrid` of the candidates with the picked ones ringed; a tap toggles `{ id, grant: slot.key }`. The picker doesn't enforce Magic Initiate's single list or Spell Sniper's attack-roll limit (gentle, paper wins).

- [ ] **Step 1: Write the failing tests**

```ts
test('options step picks metamagic', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'sorcerer', level: 3 }] });
  const r = render(<Editor step="options" />);
  expect(r.getByText('0 of 2 chosen')).toBeTruthy();
  for (const n of ['Quickened Spell', 'Twinned Spell', 'Subtle Spell']) fireEvent.click(r.getByText(n));
  expect(loadCharacter()!.options).toHaveLength(3);
  expect(r.getByText(/more than usual/)).toBeTruthy();
});
test('feat with a spell choice', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="feats" />);
  fireEvent.click(r.getByText('Magic Initiate'));
  fireEvent.click(r.getAllByText('Fire Bolt')[0]);
  expect(loadCharacter()!.spells).toEqual([{ id: 'fire-bolt', grant: 'feat:magic-initiate:0' }]);
  fireEvent.click(r.getByText('Magic Initiate'));
  expect(loadCharacter()!.spells).toEqual([]);   // pruned with the feat
});
test('high elf cantrip in the basics step; locked slots say when', () => {
  saveCharacter({ ...emptyCharacter(), race: 'high-elf', classes: [{ cls: 'fighter', level: 1 }] });
  const r = render(<Editor step="basics" />);
  fireEvent.click(r.getByText('Light'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'light', grant: 'race:high-elf:0' }]);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/editor.test.tsx`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: editor options, feats and spell choices"`

---

### Task 14: Spells step

**Files:**
- Create: `src/ui/editor/StepSpells.tsx`
- Modify: `src/ui/editor/Editor.tsx`, `src/styles/screens.css`
- Test: `tests/unit/editor.test.tsx`

**Interfaces:**
- Consumes: `castingInfo`, `pickCounts`, `pickableSpells`, `autoSpells`, `GrantPicker`.
- Produces: `StepSpells(p: StepProps)`.

Per casting class, in class order, a separator with the class name, then:
- prepared casters: a number input labelled `<ABILITY> modifier` (e.g. `WIS modifier`, -5 to 10) writing `CharClass.mod`;
- a guidance line: `Cantrips N of C · Spells N of K known` (or `… of P prepared`) `· up to level L`; each over-limit count gets `more than usual`;
- the class's unlocked automatic spells in an `Always prepared` grid, ringed, not toggleable;
- the pickable spells grouped by level (`Cantrips`, `Level 1` … up to `maxLevel`), `IconGrid` with tags from `Pickable.tag`, picked ringed, tap toggles `{ id, cls }`;
- `Add a spell from another list`: a search input; up to 20 spells whose name contains the text (case-insensitive) and that aren't on this class's pickable list; tap adds `{ id, cls, extra: true }`; the class's extras show above the search, tap removes.

No casting class: `None of your classes cast spells.` Then `GrantPicker step="spells"` (Nature Domain and Land cantrips).

- [ ] **Step 1: Write the failing tests**

```ts
test('spells step: guidance, picks and always prepared', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'life-domain' }] });
  const r = render(<Editor step="spells" />);
  fireEvent.input(r.getByLabelText('WIS modifier'), { target: { value: '3' } });
  expect(r.getByText(/Spells 0 of 4 prepared/)).toBeTruthy();
  expect(r.getByText('Always prepared')).toBeTruthy();
  fireEvent.click(r.getAllByText('Guidance')[0]);
  expect(loadCharacter()!.spells).toEqual([{ id: 'guidance', cls: 'cleric' }]);
  expect(loadCharacter()!.classes[0].mod).toBe(3);
});
test('another list', () => {
  saveCharacter({ ...emptyCharacter(), classes: [{ cls: 'bard', level: 10 }] });
  const r = render(<Editor step="spells" />);
  fireEvent.input(r.getByLabelText('Add a spell from another list'), { target: { value: 'fireb' } });
  fireEvent.click(r.getByText('Fireball'));
  expect(loadCharacter()!.spells).toEqual([{ id: 'fireball', cls: 'bard', extra: true }]);
});
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/editor.test.tsx`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: editor spells step"`

---

### Task 15: Backup code in Settings

**Files:**
- Create: `src/ui/BackupCode.tsx`
- Modify: `src/ui/screens/Settings.tsx`, `src/styles/screens.css`
- Test: `tests/unit/backup.test.tsx`

**Interfaces:**
- Consumes: `encodeCharacter`, `decodeCharacter`, `loadCharacter`, `saveCharacter`.
- Produces: `BackupCode()`, rendered under the `Backup code` separator in place of today's note.

Behaviour:
- **Export** (only when a character with a class exists): button `Make backup code`; then a read-only textarea with the code (selected on focus) and a `Copy` button (`navigator.clipboard.writeText`; on failure select the text and show `Select the code and copy it`); after copying, `Copied`. A note: `Keep it in your notes or send it to yourself. Paste it here to restore.`
- **Import** (always, so a wiped phone can restore): textarea labelled `Paste a backup code`, button `Restore`. When a character exists, the first press shows `This replaces <name>. Press Restore again.` and the second press restores. Errors show in a `role="alert"` line with the exact message from `decodeCharacter`. Success: `Restored <name>.`, plus `Skipped, no longer in the app: …` when `dropped` is not empty, plus a link `Open character` to `#/me`.
- No character: export part replaced by `Create a character first, or restore one below.`

- [ ] **Step 1: Write the failing tests**

```ts
test('export then import round trip', async () => {
  saveCharacter(lyra);
  const r = render(<BackupCode />);
  fireEvent.click(r.getByText('Make backup code'));
  const code = await waitFor(() => (r.getByLabelText('Backup code') as HTMLTextAreaElement).value);
  expect(code).toMatch(/^SS1-/);
  localStorage.clear();
  const r2 = render(<BackupCode />);
  fireEvent.input(r2.getByLabelText('Paste a backup code'), { target: { value: code } });
  fireEvent.click(r2.getByText('Restore'));
  await waitFor(() => expect(r2.getByText('Restored Lyra.')).toBeTruthy());
  expect(loadCharacter()).toEqual(lyra);
});
test('bad code shows the error', async () => {
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: 'hello' } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => expect(r.getByRole('alert').textContent).toBe(ERR_NOT_CODE));
});
test('restoring over a character asks twice', async () => {
  saveCharacter({ ...lyra, name: 'Old' });
  const code = await encodeCharacter(lyra);
  const r = render(<BackupCode />);
  fireEvent.input(r.getByLabelText('Paste a backup code'), { target: { value: code } });
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => r.getByText('This replaces Old. Press Restore again.'));
  expect(loadCharacter()!.name).toBe('Old');
  fireEvent.click(r.getByText('Restore'));
  await waitFor(() => expect(loadCharacter()!.name).toBe('Lyra'));
});
```

(If jsdom lacks `CompressionStream`, the codes are `SS0-`; assert `/^SS[01]-/` in that case and note it in the commit.)

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run tests/unit/backup.test.tsx`
- [ ] **Step 3: Implement**.
- [ ] **Step 4: Run** `npm test && npm run build` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: backup code export and restore in settings"`

---

### Task 16: End-to-end flow and docs

**Files:**
- Create: `tests/e2e/character.spec.ts`
- Modify: `README.md`

- [ ] **Step 1: Write the e2e tests** (Playwright, mobile viewport as configured)

1. **Create and use:** `./` → tap `My Character Sheet` → name `Lyra`, race `Tiefling` → `Next ›` → add `Sorcerer`, level `5`, subclass `Draconic Bloodline` → `Next ›` → pick `Quickened Spell`, `Twinned Spell`, an ancestry → `Next ›` → `Next ›` → pick `Fire Bolt`, `Shield`, `Fireball` → `Done`. Expect `#/me`, heading text `Lyra`, `Sorcerer 5`, rows `Sorcerer Actions` and `Tiefling Spells`. Tap `Level 1 Spells`: only `Shield` in the Level 1 Sorcerer section; tap `All`: `Magic Missile` visible and `Shield` has class `mine`. Reload: still `All`, character still there.
2. **Backup:** with the character saved, Settings → `Make backup code` → read the textarea → clear storage through `page.evaluate(() => localStorage.clear())` → reload Settings → paste → `Restore` → `Open character` shows `Lyra`.
3. **320 px:** at width 320 the editor's five steps, `#/me` and `#/me/spells` have no horizontal scroll (same check as `subclass.spec.ts`).
4. **No character:** `./#/me/spells` with empty storage shows the editor's `Race & name` step.

- [ ] **Step 2: Run** `npm run e2e` — PASS. Fix any failure at its cause in the owning file.
- [ ] **Step 3: Update `README.md`**: drop "Character import … still being built" from the WIP note (motion is still in progress), and add a short **Your character** section: create it from `My Character Sheet`, it lives in this browser only, and the backup code in Settings moves or restores it.
- [ ] **Step 4: Run everything** — `npm test && npm run build && npm run e2e` — PASS.
- [ ] **Step 5: Commit** — `git commit -m "test: character flow end to end; docs: README characters"`
