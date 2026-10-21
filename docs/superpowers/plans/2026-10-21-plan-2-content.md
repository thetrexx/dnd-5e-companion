# Plan 2: Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every class, subclass, class option, race, feat and all 361 spells from the 2014 Player's Handbook are in `data/`, checked against the book, with bg3.wiki icons. The plain-class browse flow covers all 12 classes and asks for a subclass after the level.

**Architecture:** Content is transcribed once from the owner's scanned PHB into JSON under `data/`. Two sources feed it: the page images, read by the implementer, and the free SRD 5.1 JSON (dnd5eapi), which seeds the 316 spells it covers. The scan's own text layer is badly OCR'd ("Vou hurl a mote of /ire"), so it is never used as text. A tolerant checker compares every record against it and flags wrong words, wrong numbers and dropped sentences. Extraction scripts live in `scripts/extract/` and run on the owner's machine only. The app keeps reading the same typed, validated JSON. Logic in `src/logic/` gains the subclass and option sections, and screens only render them.

**Tech Stack:** As Plan 1 (Vite 8, Preact 11, TypeScript 7, Vitest 5, Playwright). Extraction uses Node 24 running `.ts` files directly (type stripping), plus poppler's `pdfimages` and `pdftotext` (already on the owner's PATH). The dnd5eapi REST API (`https://www.dnd5eapi.co/api/2014/spells`) and the bg3.wiki MediaWiki API (`https://bg3.wiki/w/api.php`) are called at extraction time only.

**Spec:** `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` (sections 4, 5.1, 5.3-5.6, 6). Plan 1 (`docs/superpowers/plans/2026-10-21-plan-1-app-shell.md`) defines the current schema and screens.

**Owner decision (2026-10-21):** a plain class with no saved character asks for the level, then for a subclass ("No subclass" allowed) when the class has one at that level. The menu, actions and spells then show that subclass only, including its domain, oath, circle or patron spells.

## Amendment (2026-10-21, owner decision): text sources

Task 4's first run was stopped by the API content filter while copying PHB text. The owner chose: **SRD text word for word, everything else in our own words.** This amendment overrides any task text below that says "verbatim", "transcribe" or "PHB wording wins".

- **`textSource`:** every Spell, Feature and FeatDef gains a required `textSource: 'srd' | 'summary'`.
- **SRD entries (`'srd'`):**
  - Text is the SRD 5.1 text from dnd5eapi, mapped by script. This covers spells, class and subclass features (`/api/2014/features`, `/subclasses`), racial traits (`/traits`, `/races`, `/subraces`) and the one SRD feat (`/feats`).
  - Never hand-retyped.
  - Where SRD wording differs from the PHB, the SRD wording stays. Only facts must match the book.
  - The PHB name is still used where the SRD renamed a spell ("Tasha's Hideous Laughter").
- **Summary entries (`'summary'`):** everything not in the SRD.
  - `description` is 1-4 short paragraphs **in our own words**, written from the page image. They cover every mechanic a player needs at the table: cost, range, targets, duration, damage dice and type, save or attack, scaling, limits and recharge.
  - Never copy the book's sentences: no run of 8 or more consecutive words may match the book.
  - `higherLevels` follows the same rule.
  - Names, numbers, levels, dice, ranges, durations and page numbers must match the book exactly.
- **Checker (new Task 3b, before Task 4 resumes):**
  - `compareToOcr` gains `longestSharedRun(text, ocr): number`, the longest run of consecutive normalized words shared with the OCR.
  - `check:ocr` applies two modes by `textSource`:
    - `srd`: today's checks. Failures caused purely by SRD-vs-PHB wording are accepted with the reason "SRD wording", after confirming the numbers match.
    - `summary`: every number-bearing token must appear in the page's OCR (facts match), and `longestSharedRun < 8` (own words). Coverage and reverse are not used.
- **Card:** a `summary` card ends with the line `Full rules: PHB p. <page>` (theme tokens only).
- **Content tasks (4-11):**
  - Import every SRD entry by script from dnd5eapi (cache in `.cache/srd/`).
  - Write summaries for the rest from the page images.
  - Task 1's hand-written fixtures (`fighting-style-*`, `land-terrain-*`, `weapon-bond`, `hold-person`) are re-sourced: SRD ones from the API, `weapon-bond` as a summary.
  - The reviewer of each content task checks at least 10 random records against the page images for facts, and spot-checks that summaries don't copy book sentences.
- Implementers never output long stretches of book text in their messages or reports. They quote at most a few words to identify a passage.

## Global Constraints

- 2014 PHB only. Text sources per the Amendment above; facts (names, numbers, levels, dice, ranges, durations, pages) from the owner's PDF at `C:\Users\trexx\Desktop\DnD5E PlayersHandbook.pdf`. No 2024 wording, no other books.
- **Page numbers:** book page = PDF page − 1 (PHB p242 is PDF page 243). `page` fields hold book pages.
- The PDF, page images and OCR text are never committed. They live in `.cache/phb/` (git-ignored).
- **Text format:**
  - `description` is plain-text paragraphs, one per book paragraph. No markdown, no HTML.
  - Table rows become one paragraph each: `"<roll or label>: <text>"` (e.g. `"1: The creature uses all its movement to move in a random direction."`).
  - Bullets become paragraphs starting `"• "`.
  - Bold or italic lead-ins stay as plain text (`"Bright Light. …"`).
  - "At Higher Levels" text goes in `higherLevels`, without the label.
- **In-scope features:** a class, subclass, race or feat feature goes in `data/features/` only when a player uses it:
  - it costs an action, bonus action or reaction;
  - or it spends a resource or has limited uses;
  - or it is a once-per-turn rider the player chooses to apply (Sneak Attack, Divine Smite, Savage Attacks).
  
  Always-on passives are left out, except **options**: every option in a group is recorded so the Plan 3 editor can offer it, and passive ones get `cost: 'passive'`. The Actions page never shows `passive` items.
- **ids:**
  - kebab-case, with apostrophes dropped (`tashas-hideous-laughter`).
  - Option feature ids are always `<group id>-<option>` (`land-terrain-arctic`, `metamagic-quickened-spell`).
  - Other feature ids are the kebab name with any `Channel Divinity:` prefix removed. When two collide, the later one gets its source id as a prefix.
- **Spell names** are the PHB names ("Tasha's Hideous Laughter", not the SRD's "Hideous Laughter").
- **Checking:** every content task ends with `npm run check:ocr` passing for its records (or each failure listed in `scripts/extract/ocr-accept.json` with a reason). Its reviewer also compares at least 10 random records against the page images.
- **Icons:** the app never calls bg3.wiki's API. Icon URLs are stored in the data. A record without an icon renders a self-hosted fallback.
- **Size:** the built JS stays at or under 450 KB gzipped in total (checked in Task 13).
- **Tests:** they reference real PHB ids (fire-bolt, eldritch-knight, land-terrain-arctic) so they survive fixtures being replaced. A task that grows content updates any count-based assertion it breaks and says so in its report.

## Review Focus

1. **Spells that span a column or page, or carry a table** (Confusion, Prismatic Spray, Reincarnate): the whole text is present, nothing dropped at the break. Pinned by the checker's reverse coverage (Task 3) and a Confusion test (Task 5).
2. **Old or odd links:**
   - `#/menu/wizard/3` (no subclass) still works.
   - `#/menu/wizard/1/school-of-evocation` (subclass not reached yet, since Wizard subclasses start at level 2) and `#/menu/cleric/5/school-of-evocation` (subclass of another class) render the page without the subclass. Never the start screen, never a crash.
   
   Pinned in Task 2.
3. **Subclass casters:** Fighter Eldritch Knight and Rogue Arcane Trickster at level 3+ get MAGIC rows with wizard-list spells of their allowed schools. A plain Fighter gets none. Pinned in Task 2.
4. **Warlock Mystic Arcanum:** at warlock 11, level 6 spells are not dimmed. Level 7 stays dimmed until 13, level 8 until 15, level 9 until 17. Pinned in Task 6.
5. **Missing icons:** the 40% of spells with no bg3.wiki icon show their school's fallback icon, not dozens of identical generic icons. Pinned in Task 12.

---

## File Structure

```
data/classes.json            12 classes: caster type, tables, subclass label, option groups
data/subclasses.json         40 PHB subclasses: bonus spells, subclass casting (EK/AT)
data/options.json            option groups (invocations, metamagic, maneuvers, …)
data/races.json              races and subraces with racial spells
data/feats.json              feats that grant actions or spells
data/spells.json             361 spells
data/features/generic.json   combat actions (moved from features.json)
data/features/<class>.json   class, subclass and option features of that class (12 files)
data/features/races.json     racial features
data/features/feats.json     feat features
src/data/types.ts            schema v2 (Task 1)
src/data/validate.ts         validator with cross-reference checks
src/data/index.ts            loads all of the above (features via import.meta.glob)
src/logic/subclass.ts        effectiveSub(), subclass casting helpers
src/ui/screens/SubclassPicker.tsx
scripts/extract/config.ts    PDF path, page offset, cache dir
scripts/extract/pages.ts     CLI: page images + OCR text into .cache/phb/
scripts/extract/ocr.ts       normalizeOcr, compareToOcr (pure, tested)
scripts/extract/check-ocr.ts CLI: checks data records against OCR, writes .cache/ocr-report.md
scripts/extract/ocr-accept.json
scripts/extract/srd-spells.ts   CLI + mapSrdSpell (pure, tested)
scripts/extract/phb-names.json  SRD index → PHB name
scripts/extract/spell-lists.json  PHB class spell lists (p207-211), names per class
scripts/extract/apply-spell-lists.ts
scripts/extract/icons.ts     CLI + iconCandidates (pure, tested)
scripts/extract/icon-aliases.json
public/icons/fallback/school-*.svg   8 game-icons.net school icons
```

---

### Task 1: Schema v2, validator, fixtures

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/data/index.ts`, `src/logic/card.ts`, `data/classes.json`
- Create: `data/subclasses.json`, `data/options.json`, `data/races.json`, `data/feats.json`, `data/features/generic.json`, `data/features/wizard.json`, `data/features/sorcerer.json`, `data/features/druid.json`, `data/features/fighter.json`
- Delete: `data/features.json` (records move into `data/features/*.json` by source)
- Test: `tests/unit/validate.test.ts`, `tests/unit/card.test.ts`

**Interfaces:**
- Produces (exact; every later task fills this):

```ts
export type Cost = 'action'|'bonus'|'reaction'|'other';
export type FeatureCost = Cost|'free'|'passive';
export interface Scaling { label: string; values: string[] /*20, index = level-1; '' = not yet*/ }
export interface SpellGrant {
  spell?: string;                                   // spell id, or…
  choose?: { lists: ClassId[]; level: number; count: number; ritual?: boolean; schools?: string[] };
  atLevel: number;                                  // class level (subclass) or character level (race, feat)
  ability?: Ability; uses?: string;
  option?: string;                                  // only with this option chosen (Land terrain)
}
// Spell.summary.damage gains: plusMod?: boolean    (dice + spellcasting modifier, e.g. Cure Wounds)
export interface Feature {
  id: string; name: string;
  source: { kind: 'generic'|'class'|'subclass'|'option'|'race'|'feat'; id: string };
  level: number; cost: FeatureCost; trigger?: string; resource?: string; uses?: string;
  scaling?: Scaling[];
  prereq?: { level?: number; option?: string; text?: string };   // option features only
  spells?: SpellGrant[];                                          // e.g. invocations that cast a spell
  description: string[]; page: number; icon?: string;
}
export interface ClassDef {
  id: ClassId; name: string; caster: 'full'|'half'|'third'|'pact'|'none';
  cantripsKnown?: number[]; maxSpellLevel?: number[]; spellsKnown?: number[];   // 20 entries each
  spellAbility?: Ability; prepared?: { half: boolean };   // prepared = mod + level (half: mod + level/2, min 1)
  subclassLevel: number; subclassLabel: string;            // e.g. 1, "Divine Domain"
  options: string[];                                       // option group ids
  hotbarIcon: string; plainIcon: string;
}
export interface SubclassDef {
  id: string; cls: ClassId; name: string; page: number; hotbarIcon?: string;
  bonusSpells?: { kind: 'domain'|'oath'|'circle'|'patron'; grants: SpellGrant[] };
  casting?: { list: ClassId; schools: string[]; ability: Ability;
              cantripsKnown: number[]; spellsKnown: number[]; maxSpellLevel: number[] };
  options: string[];
}
export interface OptionGroup {
  id: string; name: string; owner: { kind: 'class'|'subclass'|'race'; id: string };
  picks: number[];                                  // 20: total chosen by that level
  from?: string; only?: string[];                   // reuse another group's options (subset)
  bonus?: { subclass: string; atLevel: number; count: number }[];   // e.g. Champion's extra style
}
export interface RaceDef { id: string; name: string; parent?: string; page: number; icon?: string; spells: SpellGrant[]; options: string[] }
export interface FeatDef { id: string; name: string; prereq?: string; page: number; icon?: string; description: string[]; spells: SpellGrant[] }
export interface Dataset {
  classes: ClassDef[]; subclasses: SubclassDef[]; optionGroups: OptionGroup[];
  races: RaceDef[]; feats: FeatDef[]; spells: Spell[]; features: Feature[];
}
```

- **Fixtures:** they let Task 2 be tested and are replaced by real content in later tasks.
  - The four existing classes gain `subclassLevel`, `subclassLabel` and `options`.
  - Fighter has `options: ['fighting-style']`.
  - `subclasses.json` holds:
    - `school-of-evocation` (wizard)
    - `champion` (fighter)
    - `eldritch-knight` (fighter), with casting: wizard list, schools Abjuration + Evocation, INT, and the PHB EK tables
    - `circle-of-the-land` (druid), with `options: ['land-terrain']` and circle grants `hold-person`@3 for `land-terrain-arctic`
  - `options.json` holds `fighting-style` (owner fighter, picks 1 from level 1) and `land-terrain` (owner circle-of-the-land, picks 1 from level 2).
  - The feature files hold the 19 existing features plus:
    - `fighting-style-protection` (reaction, with trigger)
    - `fighting-style-defense` (passive)
    - `land-terrain-arctic` and `land-terrain-coast` (passive)
    - `weapon-bond` (eldritch-knight, `other`)
    - `action-surge` gains `scaling: [{ label: 'Uses', values: ['', '1'×15, '2'×3] }]`, with index 1 = level 2.
    - `hold-person` added to `spells.json` if missing (PHB p251).

- [ ] **Step 1: Write the failing tests**

```ts
test('v2 fixtures are valid', () => expect(validateDataset(DATA)).toEqual([]));
test('catches bad v2 records', () => {
  const bad = structuredClone(DATA);
  bad.subclasses[0].cls = 'necromancer' as any;
  bad.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants[0].spell = 'no-such-spell';
  bad.features.find(f => f.id === 'fighting-style-protection')!.id = 'protection';   // must start with group id
  bad.features.find(f => f.id === 'weapon-bond')!.source.id = 'no-such-subclass';
  bad.optionGroups[0].picks = [1, 0, ...Array(18).fill(1)];                           // must not decrease
  bad.features.find(f => f.id === 'action-surge')!.scaling![0].values = ['1'];         // must have 20
  bad.classes[0].options = ['no-such-group'];
  const errs = validateDataset(bad).join('\n');
  for (const s of ['necromancer', 'no-such-spell', '"protection"', 'no-such-subclass', 'picks', 'scaling', 'no-such-group'])
    expect(errs).toContain(s);
});
test('grant needs exactly one of spell/choose', () => {
  const bad = structuredClone(DATA);
  bad.subclasses.find(s => s.id === 'circle-of-the-land')!.bonusSpells!.grants[0].choose = { lists: ['wizard'], level: 1, count: 1 };
  expect(validateDataset(bad).join('\n')).toContain('exactly one');
});
// card.test.ts
test('plusMod healing', () => {
  const s = { ...spell('fire-bolt'), summary: { resolution: 'none', damage: { dice: '1d8', type: 'Healing', healing: true, plusMod: true } } } as Spell;
  expect(damageLine(s)).toEqual({ headline: '1~8 + Mod Healing', detail: '1d8 + Mod Healing' });
});
```

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL (type errors, missing files).
- [ ] **Step 3: Implement.**
  - The validator keeps every Plan 1 rule and adds cross-reference checks:
    - every referenced id exists (spell, subclass, group, option feature, race, feat, class);
    - `Feature.source` kinds resolve;
    - option feature ids start with `<group>-`;
    - `picks` and `scaling` have 20 entries, and `picks` never decreases;
    - `casting` tables have 20 entries;
    - a grant has exactly one of `spell` / `choose`, with `atLevel` 1-20 and `choose.level` 0-9;
    - `only` ⊆ the `from` group's options;
    - `parent` race exists;
    - `cost` is in `FeatureCost`.
  - Error messages quote the offending id.
  - `index.ts` loads `data/features/*.json` with `import.meta.glob(…, { eager: true, import: 'default' })` and concatenates them sorted by file name.
  - `damageLine` with `plusMod` appends ` + Mod` after the range and after the dice.
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: content schema v2 with subclasses, options, races, feats"`

---

### Task 2: Subclass step and subclass-aware sections

**Files:**
- Create: `src/logic/subclass.ts`, `src/ui/screens/SubclassPicker.tsx`, `tests/e2e/subclass.spec.ts`
- Modify: `src/data/types.ts` (Route), `src/router.ts`, `src/app.tsx`, `src/logic/menu.ts`, `src/logic/sections.ts`, `src/ui/IconGrid.tsx`, `src/ui/screens/{LevelPicker,Menu,SectionPage,SpellsPage,ActionsPage,Card}.tsx`, `src/styles/screens.css`
- Test: `tests/unit/router.test.ts`, `tests/unit/menu.test.ts`, `tests/unit/sections.test.ts`, `tests/unit/screens.test.tsx`

**Interfaces:**
- Consumes: Task 1 schema.
- Produces:

```ts
// Route: menu, spells, actions and card gain `sub?: string`; new { page: 'subclass'; cls: ClassId; level: number }
// Hashes: #/subclass/cleric/5   #/menu/cleric/5/life-domain   #/spells/cleric/5/life-domain?s=lvl-1
//         #/actions/fighter/3/eldritch-knight?s=subclass      #/card/spell/bless/cleric/5/life-domain
export function effectiveSub(cls: ClassId, level: number, sub?: string): SubclassDef | undefined; // undefined unless it exists, belongs to cls and level >= subclassLevel
export function subclassesAt(cls: ClassId, level: number): SubclassDef[];
export function menuRows(cls: ClassId, level: number, sub?: string): MenuRow[];
export function spellSections(cls: ClassId, level: number, sub?: string): Section[];
export function actionSections(cls: ClassId, level: number, sub?: string): Section[];
// Section gains: tags?: Record<string, string>   (item id → small source tag, e.g. 'Domain', 'Circle · Arctic')
```

- **Behaviour:**
  - **Level picker:** picking level n goes to `#/subclass/<cls>/<n>` when `subclassesAt` is non-empty, otherwise straight to the menu.
  - **Subclass picker:** a back link to the level picker; the class name as title; hint `Pick a <subclassLabel>`; one button per subclass (hotbar icon or class hotbar icon, then the name); and a last button `No subclass`.
  - **Menu header:** under the class name, show `Level <n>` plus ` · <Subclass name>` when set. The `<Class> Actions` row uses the subclass `hotbarIcon` when present.
  - **Subclass casting** (EK/AT, class `caster: 'none'`): the MAGIC separator and rows come from `casting.maxSpellLevel` and `casting.cantripsKnown`. Rows are labelled `Cantrips` and `Level n Spells`, with `motif: 'wizard'`.
  - **Spell sections:**
    - Items are the class list, or for subclass casting the `casting.list` spells whose school is in `casting.schools`.
    - Then add the subclass's `bonusSpells` spells (deduplicated), each tagged `Domain` / `Oath` / `Circle` / `Patron`. The tag applies even when the spell is already on the class list. A Land grant tagged with an option reads `Circle · <option name>`, and in browse mode all terrains are shown.
  - **Warlock slot icon:** Warlock spell-level rows use `https://bg3.wiki/w/images/6/6c/Warlock_Spell_Slot_Icon.webp` instead of the normal slot icon (spec 4.4). `MenuRow.icon` `{ type: 'slot' }` gains `warlock?: boolean`.
    - Locking is unchanged.
  - **Action sections:** Actions, Bonus Actions, Reactions, then the class section (class features at or below level, not `passive`). Then a `subclass` section titled with the subclass name (motif = class). Then one `opt-<group id>` section per option group owned by the class or the subclass whose `picks[level-1] > 0`, titled with the group name. Each of these holds the group's option features with `cost !== 'passive'` and `prereq.level ≤ level`. The subclass and option sections are omitted when empty.
  - **Grid:** `IconGrid` shows `tags[item.id]` as a small second caption line (theme tokens only).
  - **Feature card:**
    - Shows `trigger` on reactions, as spells do.
    - Shows one line per `scaling` entry for the route's level, as `<label>: <value>`, and skips `''`.
    - The source label is the subclass name for subclass features and the group name for option features.
    - The back link targets `subclass` or `opt-<group>`.
  - **Bad subclass:** every screen uses `effectiveSub`, and every link it builds carries `sub` only when it is valid. An invalid `sub` is silently dropped.

- [ ] **Step 1: Write the failing tests**

```ts
// router
expect(parseHash('#/menu/cleric/5/life-domain')).toEqual({ page: 'menu', cls: 'cleric', level: 5, sub: 'life-domain' });
expect(parseHash('#/subclass/cleric/5')).toEqual({ page: 'subclass', cls: 'cleric', level: 5 });
expect(parseHash('#/menu/wizard/3')).toEqual({ page: 'menu', cls: 'wizard', level: 3 });
expect(parseHash('#/menu/wizard/3/Bad_Sub')).toEqual({ page: 'start' });          // not kebab
for (const r of [{ page: 'card', kind: 'spell', id: 'bless', cls: 'cleric', level: 5, sub: 'life-domain' }, { page: 'subclass', cls: 'wizard', level: 2 }] as Route[])
  expect(parseHash(toHash(r))).toEqual(r);
// subclass
expect(effectiveSub('wizard', 1, 'school-of-evocation')).toBeUndefined();
expect(effectiveSub('druid', 5, 'school-of-evocation')).toBeUndefined();
expect(effectiveSub('wizard', 2, 'school-of-evocation')?.id).toBe('school-of-evocation');
// menu
expect(menuRows('fighter', 3).some(r => r.kind === 'separator')).toBe(false);
const ek = menuRows('fighter', 3, 'eldritch-knight');
expect(ek.find(r => r.kind === 'spells' && r.label === 'Level 1 Spells')).toMatchObject({ dimmed: false, motif: 'wizard' });
expect(ek.find(r => r.label === 'Level 2 Spells')?.dimmed).toBe(true);
// sections
const ekSp = spellSections('fighter', 3, 'eldritch-knight').flatMap(s => s.items) as Spell[];
expect(ekSp.length).toBeGreaterThan(0);
expect(ekSp.every(s => ['Abjuration', 'Evocation'].includes(s.school))).toBe(true);
const land = spellSections('druid', 3, 'circle-of-the-land').find(s => s.id === 'lvl-2')!;
expect(land.items.some(i => i.id === 'hold-person')).toBe(true);
expect(land.tags?.['hold-person']).toBe('Circle · Arctic');          // hold-person is also on the druid list
expect(menuRows('warlock', 1).find(r => r.kind === 'spells')!.icon).toMatchObject({ type: 'slot', warlock: true });   // needs a fixture warlock class, added in this task
const fa = actionSections('fighter', 1);
expect(fa.find(s => s.id === 'opt-fighting-style')!.items.map(i => i.id)).toEqual(['fighting-style-protection']);
expect(actionSections('fighter', 3, 'eldritch-knight').find(s => s.id === 'subclass')!.items.map(i => i.id)).toContain('weapon-bond');
expect(actionSections('fighter', 3).some(s => s.id === 'subclass')).toBe(false);
// screens: Card for action-surge at level 17 shows "Uses: 2"; at level 1 shows no Uses line
```

```ts
// tests/e2e/subclass.spec.ts
test('level then subclass then menu', async ({ page }) => {
  await page.goto('./#/level/fighter');
  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page).toHaveURL(/#\/subclass\/fighter\/3$/);
  await page.getByRole('button', { name: /Eldritch Knight/ }).click();
  await expect(page).toHaveURL(/#\/menu\/fighter\/3\/eldritch-knight$/);
  await expect(page.getByText('MAGIC')).toBeVisible();
});
test('no subclass skips', async ({ page }) => {
  await page.goto('./#/subclass/fighter/3');
  await page.getByRole('button', { name: 'No subclass' }).click();
  await expect(page).toHaveURL(/#\/menu\/fighter\/3$/);
});
test('level below subclass skips the picker', async ({ page }) => {
  await page.goto('./#/level/wizard');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page).toHaveURL(/#\/menu\/wizard\/1$/);
});
test('invalid subclass is dropped, not fatal', async ({ page }) => {
  await page.goto('./#/menu/wizard/1/school-of-evocation');
  await expect(page.getByRole('link', { name: /Wizard Actions/ })).toBeVisible();
});
```

- [ ] **Step 2: Run to verify they fail** — `npm test && npm run e2e`. Expected: FAIL.
- [ ] **Step 3: Implement** as described under Behaviour. The parser accepts an optional 4th path segment (6th for card) only if it is kebab-case. Validity against data is checked in `effectiveSub`, not the router.
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: subclass step, subclass and option sections, scaling on feature cards"`

---

### Task 3: Extraction tooling and OCR checker

**Files:**
- Create: `scripts/extract/config.ts`, `scripts/extract/pages.ts`, `scripts/extract/ocr.ts`, `scripts/extract/check-ocr.ts`, `scripts/extract/ocr-accept.json` (`{}`), `tests/unit/ocr.test.ts`, `tests/unit/fixtures/ocr-fire-bolt.txt`
- Modify: `package.json` (scripts), `.gitignore` (`.cache/`)

**Interfaces:**
- Produces:

```ts
// config.ts
export const PHB_PDF = process.env.PHB_PDF ?? 'C:/Users/trexx/Desktop/DnD5E PlayersHandbook.pdf';
export const PAGE_OFFSET = 1;                 // pdf page = book page + 1
export const CACHE = '.cache/phb';            // p242.png, p242.txt (book page numbers)
// ocr.ts
export function normalizeOcr(s: string): string;
export function compareToOcr(text: string, ocr: string, span?: { from: string; to?: string }):
  { coverage: number; reverse?: number; missingNumbers: string[]; missingExcerpts: string[] };
```

- **npm scripts:**
  - `extract:pages`: `node scripts/extract/pages.ts <from> <to>`. It writes `.cache/phb/p<N>.png` (`pdfimages -png -f N+1 -l N+1`) and `p<N>.txt` (`pdftotext -f N+1 -l N+1`, raw mode). It skips files that already exist and exits with a clear message if poppler is missing.
  - `check:ocr`: `node scripts/extract/check-ocr.ts [spells|features|subclasses|races|feats|options]`.
- **`normalizeOcr`** is applied identically to both sides:
  1. Lowercase.
  2. `u` → `ll`, `rn` → `m`.
  3. Each of `c e` → `e`; each of `i l 1 | ! / f` → `l`; `5 s` → `s`; `y v` → `v`; `0 o` → `o`.
  4. Drop everything outside `[a-z0-9]`.
- **`compareToOcr`:**
  - `coverage` is the share of the text's normalized 8-character shingles found in the normalized OCR.
  - `missingNumbers` lists number-bearing tokens of the text (`/\d[\dd]*\w*/`, e.g. `1d10`, `120`, `5th`) whose normalized form is absent from the OCR.
  - `missingExcerpts` gives up to 3 original-text snippets of 6 or more words whose shingles are all missing.
  - With `span`, the OCR is cut from the normalized `from` heading to the normalized `to` heading. `reverse` is the share of that cut's shingles found in the text.
- **`check-ocr.ts`:**
  - Spells: the comparison text is rebuilt book-style (name, school line, the four header lines, description, "At Higher Levels." + text). The OCR is pages `page` and `page + 1`, with span from this spell's name to the next spell's name in alphabetical order.
  - Other kinds: the comparison text is name + description, with no span.
  - A record fails on `coverage < 0.92`, any `missingNumbers`, or `reverse < 0.85`.
  - It writes `.cache/ocr-report.md` (failures first, with excerpts) and exits 1 when a failure isn't in `ocr-accept.json` (`{ "<kind>:<id>": "reason" }`).
- **Tsconfig:** scripts import each other with `.ts` extensions. Tests import `ocr.ts` directly. Make `npm run build`'s `tsc --noEmit` either type-check `scripts/` (`allowImportingTsExtensions`) or exclude it, and say which in the report.

- [ ] **Step 1: Write the failing tests** — `tests/unit/fixtures/ocr-fire-bolt.txt` is this exact OCR (from PDF page 243):

```
FIRE BOLT Evoeation eantrip
Casting Time: I aetion Range: 120 feet Components: V, 5 Duration: Instantaneous
Vou hurl a mote of /ire at a ereature or objeet within range. Make a ranged spell attaek against the targel. On a hit, the target takes IdlO /ire damage. A flammable objeet hit by this spell ignites if it isn't being worn or earried.
This spell's damage inereases by IdlO when you reaeh 5th levei (2dlO), 11th levei (3d 10), and 17th levei (4dlO).

FIRE SHIELD 4th./evel evoeation
```

```ts
const ocr = readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8');
const real = 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn\'t being worn or carried.';
test('clean transcription passes', () => {
  const r = compareToOcr(real, ocr);
  expect(r.coverage).toBeGreaterThanOrEqual(0.92); expect(r.missingNumbers).toEqual([]);
});
test('wrong number is caught', () => expect(compareToOcr(real.replace('1d10', '1d12'), ocr).missingNumbers).toEqual(['1d12']));
test('wrong words are caught', () => expect(compareToOcr(real.replace('a creature or object', 'an ally or enemy'), ocr).coverage).toBeLessThan(0.92));
test('dropped sentence is caught by reverse', () => {
  const r = compareToOcr(real.replace(/ A flammable.*$/, ''), ocr, { from: 'FIRE BOLT', to: 'FIRE SHIELD' });
  expect(r.reverse!).toBeLessThan(0.85);
});
test('normalize', () => expect(normalizeOcr('Vou /ire IdlO')).toBe(normalizeOcr('You fire 1d10')));
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run tests/unit/ocr.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `config.ts`, `ocr.ts`, `pages.ts`, `check-ocr.ts` and the npm scripts. If the thresholds don't separate the cases above, tune them and say so in the report; the tests decide. Note that the dropped-sentence case uses the full Fire Bolt paragraph plus its cantrip-scaling paragraph from the book as `text` when building the reverse span.
- [ ] **Step 4: Run to verify they pass** — `npm test`, then `npm run extract:pages -- 242 242 && npm run check:ocr -- spells`. Expected: unit tests PASS. The check runs over the fixture spells, and its report lists any that fail; fixture failures are fixed in Task 4/5, not here.
- [ ] **Step 5: Commit** — `git commit -m "feat: PHB page extraction and OCR cross-check tooling"`

---

### Task 3b: textSource, summary-mode checker, PHB reference line

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `scripts/extract/ocr.ts`, `scripts/extract/check-ocr.ts`, `src/ui/screens/Card.tsx`, `src/styles/screens.css`, `data/spells.json`, `data/features/*.json`, `data/feats.json`
- Test: `tests/unit/ocr.test.ts`, `tests/unit/validate.test.ts`, `tests/unit/screens.test.tsx`

**Interfaces:**
- Produces:

```ts
// types.ts: Spell, Feature, FeatDef gain  textSource: 'srd' | 'summary'
// ocr.ts
export function longestSharedRun(text: string, ocr: string): number;     // consecutive normalized words shared
export function judgeRecord(source: 'srd' | 'summary', text: string, ocr: string, span?: { from: string; to?: string }):
  { pass: boolean; reasons: string[] };
// srd: coverage >= 0.92, no missingNumbers, reverse >= 0.85 (span end missing is its own reason)
// summary: no missingNumbers, longestSharedRun < 8
```

- **Words:** split each side on whitespace and normalize each word with `normalizeOcr`, dropping empty words.
- **check-ocr.ts** uses `judgeRecord` for every record and prints the mode next to each failure.
- **Card:** a record with `textSource: 'summary'` ends with `Full rules: PHB p. <page>` in a small dim line.
- **Fixture re-sourcing:**
  - Spells and generic/class fixture features that came from dnd5eapi get `'srd'`.
  - `fighting-style-protection` and `fighting-style-defense` take their text from dnd5eapi (`/api/2014/features/fighting-style-protection`, `…-defense`) and get `'srd'`.
  - `land-terrain-arctic`, `land-terrain-coast` and `weapon-bond` get own-words summaries and `'summary'`.

- [ ] **Step 1: Write the failing tests**

```ts
const ocr = readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8');
test('copied text has a long shared run', () =>
  expect(longestSharedRun('You hurl a mote of fire at a creature or object within range.', ocr)).toBeGreaterThanOrEqual(8));
test('own words stay short', () =>
  expect(longestSharedRun('Ranged spell attack out to 120 feet; a hit deals 1d10 fire, and unattended flammable objects catch fire.', ocr)).toBeLessThan(8));
test('summary mode: wrong number fails, own words pass', () => {
  const own = 'Ranged spell attack out to 120 feet; a hit deals 1d10 fire, and unattended flammable objects catch fire.';
  expect(judgeRecord('summary', own, ocr).pass).toBe(true);
  expect(judgeRecord('summary', own.replace('1d10', '1d12'), ocr).reasons.join()).toContain('1d12');
  expect(judgeRecord('summary', 'You hurl a mote of fire at a creature or object within range.', ocr).pass).toBe(false);
});
// validate.test.ts
test('textSource required', () => {
  const bad = structuredClone(DATA); delete (bad.spells[0] as any).textSource;
  expect(validateDataset(bad).join('
')).toContain('textSource');
});
// screens.test.tsx: Card for feature weapon-bond (fighter 3, eldritch-knight) shows "Full rules: PHB p. 75"; Card for spell fire-bolt shows no "Full rules"
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run build && npm run check:ocr -- features`. Expected: unit tests PASS; the feature check passes for the re-sourced fixtures, or their failures are accepted with reasons.
- [ ] **Step 5: Commit** — `git commit -m "feat: text sources (SRD or own-words summary), summary checker, PHB reference line"`

---

### Task 4: Spells from the SRD, PHB names, pages and class lists

**Files:**
- Create: `scripts/extract/srd-spells.ts`, `scripts/extract/phb-names.json`, `scripts/extract/spell-lists.json`, `scripts/extract/apply-spell-lists.ts`, `tests/unit/srd-spells.test.ts`, `tests/unit/fixtures/srd-{fireball,cure-wounds,confusion,shield}.json` (recorded API responses)
- Modify: `data/spells.json`, `package.json` (`extract:srd`, `extract:lists`)

**Interfaces:**
- Consumes: Task 3 `CACHE`, the OCR page texts.
- Produces:

```ts
export function mapSrdSpell(api: SrdSpell, phbNames: Record<string, string>): Spell;   // page 0 until located
export function findSpellPage(name: string, pages: Map<number, string>): number | null; // book page whose OCR has the heading
export function phbId(name: string): string;                                             // "Tasha's Hideous Laughter" → "tashas-hideous-laughter"
```

- **SRD mapping rules:**
  - `id = phbId(name)`, where `name = phbNames[index] ?? api.name`.
  - **`cast`:**
    - `cost` is action, bonus or reaction from `casting_time` ("1 action", "1 bonus action", "1 reaction"), and `other` for anything else.
    - `text` = `casting_time`.
    - The SRD has no triggers, so reaction spells get `trigger` copied from the PHB casting-time line.
  - **Components:** `components.m.text` = `material`. `costGp` comes from `/(\d[\d,]*)\s*gp/`. `consumed` = `/consume/i`.
  - **Description:** `desc` is converted per Global Constraints: markdown tables become row paragraphs, `- ` becomes `• `, `*`/`**` are stripped. `higherLevels` = `higher_level.join(' ')`.
  - **`summary`:**
    - `damage.dice` = `damage_at_slot_level[level]`, or `damage_at_character_level["1"]` for cantrips. A `+ MOD` is removed and sets `plusMod`.
    - `healing` from `heal_at_slot_level`.
    - `resolution`: `save` when `dc` exists (`save` = `dc.dc_type.index`), else `attack` when `attack_type` exists, else `none`.
    - `upcast` from `higher_level` when it matches `increases by (\S+) for each slot level above (\w+)`, written as `+<dice> per slot level above <ord>`.
    - When `dice` fails the card's dice regex, `damage` is dropped and the id is logged.
  - **Merge:** `extract:srd` fetches all SRD spells (one list call plus one call per spell, sequential, cached in `.cache/srd/`). It merges into `data/spells.json` and **never overwrites an existing id**.
  - **`phb-names.json`:** maps every SRD spell whose SRD name differs from the PHB (the wizard-named spells, e.g. `hideous-laughter` → `Tasha's Hideous Laughter`, `acid-arrow` → `Melf's Acid Arrow`). Complete it by comparing the SRD list with the PHB's own spell list pages.
- **Pages:** run `extract:pages -- 207 289`, then fill `page` with `findSpellPage`. That function matches the normalized name at the start of an OCR line, followed by the school or level line. Hand-fix any `null`.
- **`spell-lists.json`:** transcribed from the page images of PHB p207-211, as `{ "bard": ["Animal Friendship", …], … }` for the 8 casting classes, using PHB names. `extract:lists` sets every spell's `classes` from it, warns about names on the lists that have no spell record yet (expected until Task 5), and fails on names it can't match at all.
- **Checking:** run `check:ocr -- spells`. Fix every record whose facts (numbers, page, header fields) differ from the PHB. SRD wording stays as the SRD has it (Amendment).

- [ ] **Step 1: Write the failing tests**

```ts
const names = JSON.parse(readFileSync('scripts/extract/phb-names.json', 'utf8'));
const fx = (n: string) => JSON.parse(readFileSync(`tests/unit/fixtures/srd-${n}.json`, 'utf8'));
test('fireball', () => expect(mapSrdSpell(fx('fireball'), names)).toMatchObject({
  id: 'fireball', level: 3, school: 'Evocation', cast: { cost: 'action', text: '1 action' }, range: '150 feet',
  components: { v: true, s: true, m: { text: 'A tiny ball of bat guano and sulfur', consumed: false } },
  summary: { damage: { dice: '8d6', type: 'Fire' }, resolution: 'save', save: 'dex', upcast: '+1d6 per slot level above 3rd' },
}));
test('cure wounds plusMod', () => expect(mapSrdSpell(fx('cure-wounds'), names).summary?.damage).toMatchObject({ dice: '1d8', healing: true, plusMod: true }));
test('confusion table rows', () => {
  const d = mapSrdSpell(fx('confusion'), names).description;
  expect(d.some(p => p.startsWith('1: '))).toBe(true); expect(d.some(p => p.startsWith('9-10: '))).toBe(true);
  expect(d.join(' ')).not.toMatch(/[|*]/);
});
test('shield is a reaction', () => expect(mapSrdSpell(fx('shield'), names).cast.cost).toBe('reaction'));
test('phb names', () => expect(phbId("Tasha's Hideous Laughter")).toBe('tashas-hideous-laughter'));
test('findSpellPage', () => expect(findSpellPage('Fire Bolt', new Map([[241, 'x'], [242, readFileSync('tests/unit/fixtures/ocr-fire-bolt.txt', 'utf8')]]))).toBe(242));
```

```ts
// validate.test.ts additions (real content from here on)
test('class lists', () => {
  const s = (id: string) => DATA.spells.find(x => x.id === id)!;
  expect(s('shield').classes.sort()).toEqual(['sorcerer', 'wizard']);
  expect(s('cure-wounds').classes.sort()).toEqual(['bard', 'cleric', 'druid', 'paladin', 'ranger']);
  expect(s('fireball').page).toBe(241);
});
```

- [ ] **Step 2: Run to verify they fail** — `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the mapping and scripts. Run `extract:srd`, `extract:pages -- 207 289`, transcribe `spell-lists.json`, run `extract:lists`, fix pages and PHB wording until `check:ocr -- spells` passes for every record present.
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run check:ocr -- spells`. Expected: PASS. The report lists only accepted entries, each with a reason.
- [ ] **Step 5: Commit** — `git commit -m "feat: SRD spells with PHB names, pages and class lists"`

---

### Task 5: The 45 non-SRD spells and card summaries for all 361

**Files:**
- Modify: `data/spells.json`, `scripts/extract/ocr-accept.json` (if needed)
- Test: `tests/unit/spells-content.test.ts`

**Interfaces:**
- Consumes: Task 4 tooling, `spell-lists.json`.
- Produces: `data/spells.json` with exactly 361 records, all fields complete.

- **Transcription:** transcribe every PHB spell that has no record yet from the page images (`.cache/phb/p<N>.png`), with all fields. Then rerun `extract:lists` so it reports no missing names.
- **Hand-review the derived fields for all 361 spells:**
  - **`summary.damage`** only when the spell deals or heals a fixed dice amount.
    - Multi-projectile spells get `count` + `unit`: Magic Missile 3 darts of `1d4+1`; Scorching Ray 3 rays of `2d6`; Eldritch Blast 1 beam of `1d10` at character level 1.
  - **`resolution`:**
    - `auto` for automatic hits (Magic Missile).
    - `save` + ability whenever the text calls for a saving throw.
    - `attack` for spell attacks.
    - `none` otherwise.
  - **`upcast`:** one short line when "At Higher Levels" has a simple pattern, otherwise omitted.
  - **`cast.trigger`:** the trigger text for every reaction spell.
- **Spells with no summary:** spells that neither damage nor heal get `summary: { resolution }` only when a save or attack applies, and no `summary` otherwise.

- [ ] **Step 1: Write the failing tests**

```ts
const s = (id: string) => DATA.spells.find(x => x.id === id)!;
test('361 spells, each on a class list', () => {
  expect(DATA.spells).toHaveLength(361);
  expect(DATA.spells.filter(x => x.classes.length === 0).map(x => x.id)).toEqual([]);
});
test('non-SRD spells present', () => {
  for (const id of ['hex', 'hunters-mark', 'armor-of-agathys', 'arms-of-hadar', 'hail-of-thorns', 'ensnaring-strike',
    'witch-bolt', 'compelled-duel', 'searing-smite', 'branding-smite', 'crusaders-mantle', 'friends', 'chromatic-orb'])
    expect(s(id), id).toBeTruthy();
});
test('summaries', () => {
  expect(s('magic-missile').summary).toMatchObject({ resolution: 'auto', damage: { dice: '1d4+1', count: 3, unit: 'darts', type: 'Force' } });
  expect(s('hex').cast.cost).toBe('bonus');
  expect(s('hellish-rebuke').cast).toMatchObject({ cost: 'reaction', trigger: expect.stringContaining('damaged by a creature') });
  expect(s('tashas-hideous-laughter').summary).toMatchObject({ resolution: 'save', save: 'wis' });
  expect(s('fireball').summary?.damage?.dice).toBe('8d6');
});
test('confusion keeps its whole table', () => {
  const d = s('confusion').description.join('\n');
  for (const row of ['1: ', '2-6: ', '7-8: ', '9-10: ']) expect(d).toContain(row);
});
test('every spell has a page and text', () => {
  expect(DATA.spells.filter(x => x.page < 1 || x.description.length === 0).map(x => x.id)).toEqual([]);
});
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run tests/unit/spells-content.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** (transcribe, review summaries).
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run check:ocr -- spells`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: all 361 PHB spells with card summaries"`

---

### Task 6: All 12 classes, their tables, and martial and half-caster class features

**Files:**
- Modify: `data/classes.json`, `data/features/fighter.json`
- Create: `data/features/{barbarian,monk,rogue,paladin,ranger}.json`
- Test: `tests/unit/classes-content.test.ts`

**Interfaces:**
- Consumes: Task 1 `ClassDef`, `Feature`, `Scaling`.
- Produces: 12 `ClassDef` records and the class (non-subclass) features of barbarian, fighter, monk, paladin, ranger, rogue.

- **Class pages:**

  | Class | Pages | Class | Pages | Class | Pages |
  |---|---|---|---|---|---|
  | Barbarian | 46-50 | Bard | 51-55 | Cleric | 56-63 |
  | Druid | 64-69 | Fighter | 70-75 | Monk | 76-81 |
  | Paladin | 82-88 | Ranger | 89-93 | Rogue | 94-98 |
  | Sorcerer | 99-104 | Warlock | 105-111 | Wizard | 112-119 |

- **Class records:**
  - Tables come from each class table.
  - `subclassLevel`/`subclassLabel`:

    | Class | Level | Label |
    |---|---|---|
    | barbarian | 3 | Primal Path |
    | bard | 3 | Bard College |
    | cleric | 1 | Divine Domain |
    | druid | 2 | Druid Circle |
    | fighter | 3 | Martial Archetype |
    | monk | 3 | Monastic Tradition |
    | paladin | 3 | Sacred Oath |
    | ranger | 3 | Ranger Archetype |
    | rogue | 3 | Roguish Archetype |
    | sorcerer | 1 | Sorcerous Origin |
    | warlock | 1 | Otherworldly Patron |
    | wizard | 2 | Arcane Tradition |

  - `prepared`: `{ half: false }` for cleric, druid and wizard; `{ half: true }` for paladin.
  - `spellsKnown` for bard, ranger, sorcerer and warlock.
  - `caster`: paladin and ranger `half` (no spells at level 1); warlock `pact`.
  - **Warlock `maxSpellLevel` counts Mystic Arcanum:** `[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9]`.
  - **Icons:**
    - `hotbarIcon` = `https://bg3.wiki/w/images/…/Class_<Class>_Hotbar_Icon.png`
    - `plainIcon` = `…/Class_<Class>_Plain_Icon.png`
    - Resolve the hashed paths with the MediaWiki API (`action=query&prop=imageinfo&iiprop=url&titles=File:…`).
  - `options` stays `[]` until Task 10, except fighter keeps `fighting-style`.
- **Features:** follow the in-scope rule. Magical Secrets, Mystic Arcanum and the EK/AT any-school picks are editor rules for Plan 3, so they are not features here. Anything that scales by level gets `scaling` (Rage damage and uses, Sneak Attack dice, Martial Arts die, Ki points, Lay on Hands pool, Action Surge and Indomitable uses).
- **The Start screen enables all 12 classes** (it already enables any class present in the data, so confirm this in the report).

- [ ] **Step 1: Write the failing tests**

```ts
const c = (id: string) => DATA.classes.find(x => x.id === id)!;
const f = (id: string) => DATA.features.find(x => x.id === id);
test('12 classes', () => expect(DATA.classes.map(x => x.id).sort()).toEqual([...CLASS_IDS].sort()));
test('tables', () => {
  expect(c('warlock').maxSpellLevel).toEqual([1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9]);
  expect(c('paladin').maxSpellLevel![0]).toBe(0); expect(c('paladin').maxSpellLevel![1]).toBe(1);
  expect(c('sorcerer').spellsKnown![0]).toBe(2); expect(c('bard').cantripsKnown![0]).toBe(2);
  expect(c('cleric')).toMatchObject({ subclassLevel: 1, subclassLabel: 'Divine Domain', prepared: { half: false }, spellAbility: 'wis' });
});
test('warlock arcanum dimming', () => {
  const dim = (lvl: number, n: number) => menuRows('warlock', lvl).find(r => r.label === `Level ${n} Spells`)!.dimmed;
  expect(dim(11, 6)).toBe(false); expect(dim(11, 7)).toBe(true); expect(dim(13, 7)).toBe(false);
  expect(dim(15, 8)).toBe(false); expect(dim(16, 9)).toBe(true); expect(dim(17, 9)).toBe(false);
});
test('must-have martial features', () => {
  for (const id of ['rage', 'reckless-attack', 'second-wind', 'action-surge', 'indomitable', 'flurry-of-blows',
    'patient-defense', 'step-of-the-wind', 'deflect-missiles', 'stunning-strike', 'lay-on-hands', 'divine-sense',
    'divine-smite', 'sneak-attack', 'cunning-action', 'uncanny-dodge']) expect(f(id), id).toBeTruthy();
  expect(f('rage')!.scaling!.find(s => s.label === 'Rage Damage')!.values[8]).toBe('+3');
  expect(f('sneak-attack')!.scaling![0].values[4]).toBe('3d6');
  expect(f('uncanny-dodge')).toMatchObject({ cost: 'reaction', level: 5 });
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** (transcribe from page images; `extract:pages -- 45 119` first).
- [ ] **Step 4: Run to verify they pass** — `npm test && npm run check:ocr -- features && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: all 12 classes and martial class features"`

---

### Task 7: Full-caster class features

**Files:**
- Modify: `data/features/{wizard,sorcerer,druid}.json`
- Create: `data/features/{bard,cleric,warlock}.json`
- Test: `tests/unit/classes-content.test.ts`

**Interfaces:**
- Consumes: Task 6 class records.
- Produces: the class (non-subclass) features of bard, cleric, druid, sorcerer, warlock, wizard.

- [ ] **Step 1: Write the failing tests**

```ts
test('must-have caster features', () => {
  for (const id of ['bardic-inspiration', 'countercharm', 'song-of-rest', 'turn-undead', 'divine-intervention',
    'wild-shape', 'font-of-magic', 'arcane-recovery', 'eldritch-master']) expect(f(id), id).toBeTruthy();
  expect(f('bardic-inspiration')!.scaling!.find(s => s.label === 'Die')!.values).toEqual(
    ['d6','d6','d6','d6','d8','d8','d8','d8','d8','d10','d10','d10','d10','d10','d12','d12','d12','d12','d12','d12']);
  expect(f('bardic-inspiration')!.cost).toBe('bonus');
  expect(f('wild-shape')!.scaling!.find(s => s.label === 'Max CR')!.values[7]).toBe('1');
});
```

- [ ] **Step 2-4:** as Task 6. Run `npm test && npm run check:ocr -- features`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: full-caster class features"`

---

### Task 8: Subclasses A (barbarian, bard, cleric, druid, fighter, monk)

**Files:**
- Modify: `data/subclasses.json`, `data/options.json` (`land-terrain`), `data/features/{barbarian,bard,cleric,druid,fighter,monk}.json`
- Test: `tests/unit/subclasses-content.test.ts`

**Interfaces:**
- Produces 19 subclasses with these exact ids:
  - barbarian: `path-of-the-berserker`, `path-of-the-totem-warrior`
  - bard: `college-of-lore`, `college-of-valor`
  - cleric: `knowledge-domain`, `life-domain`, `light-domain`, `nature-domain`, `tempest-domain`, `trickery-domain`, `war-domain`
  - druid: `circle-of-the-land`, `circle-of-the-moon`
  - fighter: `champion`, `battle-master`, `eldritch-knight`
  - monk: `way-of-the-open-hand`, `way-of-shadow`, `way-of-the-four-elements`

  Each comes with its in-scope features.
- **Bonus spells:**
  - Cleric `bonusSpells.kind: 'domain'`, with grants at cleric levels 1, 3, 5, 7, 9.
  - Circle of the Land `kind: 'circle'`, with grants at druid levels 3, 5, 7, 9 per terrain (`option: 'land-terrain-<terrain>'`).
  - `land-terrain` has its 8 terrain options as passive features: arctic, coast, desert, forest, grassland, mountain, swamp, underdark.
- **Casting:** Eldritch Knight `casting` from the PHB EK table (p75), schools Abjuration and Evocation.
- **Domain Channel Divinity options** (Preserve Life, Guided Strike, …) are subclass features with `resource: '1 Channel Divinity'`.

- [ ] **Step 1: Write the failing tests**

```ts
const sub = (id: string) => DATA.subclasses.find(x => x.id === id)!;
test('19 subclasses A', () => expect(DATA.subclasses.filter(s => ['barbarian','bard','cleric','druid','fighter','monk'].includes(s.cls))).toHaveLength(19));
test('domain spells', () => {
  const life = sub('life-domain').bonusSpells!;
  expect(life.kind).toBe('domain');
  expect(life.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['bless', 'cure-wounds']);
});
test('land circle spells per terrain', () => {
  expect(sub('circle-of-the-land').bonusSpells!.grants.filter(g => g.option === 'land-terrain-arctic').map(g => g.spell).sort())
    .toEqual(['cone-of-cold', 'freedom-of-movement', 'hold-person', 'ice-storm', 'sleet-storm', 'slow', 'commune-with-nature', 'spike-growth'].sort());
});
test('EK casting', () => expect(sub('eldritch-knight').casting).toMatchObject({ list: 'wizard', schools: ['Abjuration', 'Evocation'], ability: 'int' }));
test('subclass features', () => {
  for (const id of ['frenzy', 'combat-inspiration', 'preserve-life', 'wrath-of-the-storm', 'combat-wild-shape', 'weapon-bond', 'shadow-step', 'open-hand-technique'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
```

The arctic list must match PHB p68 exactly. If the test's list disagrees with the book, the book wins: fix the test and note it in the report.

- [ ] **Step 2-4:** `npm run extract:pages -- 45 81` (cached), transcribe, then `npm test && npm run check:ocr -- subclasses && npm run check:ocr -- features`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: subclasses for barbarian, bard, cleric, druid, fighter, monk"`

---

### Task 9: Subclasses B (paladin, ranger, rogue, sorcerer, warlock, wizard)

**Files:**
- Modify: `data/subclasses.json`, `data/features/{paladin,ranger,rogue,sorcerer,warlock,wizard}.json`
- Test: `tests/unit/subclasses-content.test.ts`

**Interfaces:**
- Produces 21 subclasses with these exact ids:
  - paladin: `oath-of-devotion`, `oath-of-the-ancients`, `oath-of-vengeance`
  - ranger: `hunter`, `beast-master`
  - rogue: `thief`, `assassin`, `arcane-trickster`
  - sorcerer: `draconic-bloodline`, `wild-magic`
  - warlock: `the-archfey`, `the-fiend`, `the-great-old-one`
  - wizard: `school-of-abjuration`, `school-of-conjuration`, `school-of-divination`, `school-of-enchantment`, `school-of-evocation`, `school-of-illusion`, `school-of-necromancy`, `school-of-transmutation`
- **Bonus spells:**
  - Paladin `kind: 'oath'`, with grants at paladin levels 3, 5, 9, 13, 17.
  - Warlock `kind: 'patron'`, with grants at warlock levels 1, 3, 5, 7, 9. These are expanded-list spells, not always prepared.
- **Casting:** Arcane Trickster `casting` from the AT table (p98), schools Enchantment and Illusion.
- **Beast Master:** "Ranger's Companion" and the companion commands are subclass features (companion stat blocks are out of scope).

- [ ] **Step 1: Write the failing tests**

```ts
test('40 subclasses', () => expect(DATA.subclasses).toHaveLength(40));
test('oath and patron spells', () => {
  expect(sub('oath-of-vengeance').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['bane', 'hunters-mark']);
  expect(sub('the-fiend').bonusSpells).toMatchObject({ kind: 'patron' });
  expect(sub('the-fiend').bonusSpells!.grants.filter(g => g.atLevel === 1).map(g => g.spell).sort()).toEqual(['burning-hands', 'command']);
});
test('AT casting', () => expect(sub('arcane-trickster').casting).toMatchObject({ list: 'wizard', schools: ['Enchantment', 'Illusion'] }));
test('subclass features B', () => {
  for (const id of ['sacred-weapon', 'vow-of-enmity', 'rangers-companion', 'fast-hands', 'assassinate', 'tides-of-chaos',
    'dark-ones-blessing', 'fey-presence', 'portent', 'arcane-ward'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
```

- [ ] **Step 2-4:** `npm test && npm run check:ocr -- subclasses && npm run check:ocr -- features`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: subclasses for paladin, ranger, rogue, sorcerer, warlock, wizard"`

---

### Task 10: Class option groups

**Files:**
- Modify: `data/options.json`, `data/classes.json` (`options`), `data/subclasses.json` (`options`), `data/features/<class>.json`
- Test: `tests/unit/options-content.test.ts`

**Interfaces:**
- **Produces** these groups, with picks as totals by level (index = level − 1):

  | Group | Owner | Picks (total by level) | Options |
  |---|---|---|---|
  | `eldritch-invocations` | warlock | 0, 2 from 2, 3 from 5, 4 from 7, 5 from 9, 6 from 12, 7 from 15, 8 from 18 | the PHB invocations, with `prereq` (level, pact boon option, or cantrip text) |
  | `pact-boon` | warlock | 1 from 3 | chain, blade, tome |
  | `metamagic` | sorcerer | 2 from 3, 3 from 10, 4 from 17 | the 8 PHB options |
  | `fighting-style` | fighter | 1 from 1; `bonus: [{ subclass: 'champion', atLevel: 10, count: 1 }]` | the 6 PHB styles |
  | `fighting-style-paladin` | paladin | 1 from 2; `from: 'fighting-style'` | `only` = defense, dueling, great-weapon-fighting, protection |
  | `fighting-style-ranger` | ranger | 1 from 2; `from: 'fighting-style'` | `only` = archery, defense, dueling, two-weapon-fighting |
  | `maneuvers` | battle-master | 3 from 3, 5 from 7, 7 from 10, 9 from 15 | the 16 PHB maneuvers |
  | `elemental-disciplines` | way-of-the-four-elements | 1 from 3, 2 from 6, 3 from 11, 4 from 17 | the PHB disciplines; Elemental Attunement is a subclass feature, not an option |
  | `hunters-prey` | hunter | 1 from 3 | |
  | `defensive-tactics` | hunter | 1 from 7 | |
  | `multiattack` | hunter | 1 from 11 | |
  | `superior-hunters-defense` | hunter | 1 from 15 | |
  | `totem-spirit` | path-of-the-totem-warrior | 1 from 3 | bear, eagle, wolf |
  | `aspect-of-the-beast` | path-of-the-totem-warrior | 1 from 6 | bear, eagle, wolf |
  | `totemic-attunement` | path-of-the-totem-warrior | 1 from 14 | bear, eagle, wolf |
  | `draconic-ancestry-sorcerer` | draconic-bloodline | 1 from 1; `from: 'draconic-ancestry'` | Task 11 creates `draconic-ancestry` |
  | `favored-enemy` | ranger | 1 from 1, 2 from 6, 3 from 14 | the 14 creature-type choices, passive |
  | `natural-explorer` | ranger | 1 from 1, 2 from 6, 3 from 10 | the 8 terrains, passive |

- **Ordering:** `draconic-ancestry-sorcerer` is added in Task 11 if `draconic-ancestry` doesn't exist yet. The validator forbids dangling `from`.
- **Invocation spells:** invocations that let you cast a spell (Armor of Shadows, Misty Visions, One with Shadows, …) carry `spells: [{ spell, atLevel }]`.
- **Pact of the Tome:** Book of Ancient Secrets is an invocation with `prereq.option: 'pact-boon-pact-of-the-tome'` and `spells: [{ choose: { lists: [...all 8 casters], level: 1, count: 2, ritual: true }, atLevel: 1 }]`.

- [ ] **Step 1: Write the failing tests**

```ts
const g = (id: string) => DATA.optionGroups.find(x => x.id === id)!;
const opts = (id: string) => DATA.features.filter(f => f.source.kind === 'option' && f.source.id === id);
test('groups', () => {
  expect(g('eldritch-invocations').picks).toEqual([0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8]);
  expect(g('metamagic').picks).toEqual([0,0,2,2,2,2,2,2,2,3,3,3,3,3,3,3,4,4,4,4]);
  expect(opts('metamagic')).toHaveLength(8);
  expect(opts('maneuvers')).toHaveLength(16);
  expect(opts('fighting-style')).toHaveLength(6);
  expect(g('fighting-style-paladin').only!.sort()).toEqual(['fighting-style-defense', 'fighting-style-dueling', 'fighting-style-great-weapon-fighting', 'fighting-style-protection']);
  expect(DATA.features.find(f => f.id === 'eldritch-invocations-agonizing-blast')!.prereq?.text).toMatch(/eldritch blast/i);
  expect(DATA.features.find(f => f.id === 'eldritch-invocations-thirsting-blade')!.prereq).toMatchObject({ level: 5, option: 'pact-boon-pact-of-the-blade' });
  expect(DATA.features.find(f => f.id === 'maneuvers-riposte')!.cost).toBe('reaction');
});
test('browse shows usable options only', () => {
  const ids = actionSections('warlock', 2).find(s => s.id === 'opt-eldritch-invocations')!.items.map(i => i.id);
  expect(ids).not.toContain('eldritch-invocations-thirsting-blade');     // needs level 5
});
```

- [ ] **Step 2-4:** `npm test && npm run check:ocr -- features`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: class option groups (invocations, metamagic, maneuvers, styles, …)"`

---

### Task 11: Races and feats

**Files:**
- Modify: `data/races.json`, `data/feats.json`, `data/options.json`
- Create: `data/features/races.json`, `data/features/feats.json`
- Test: `tests/unit/races-feats-content.test.ts`

**Interfaces:**
- **Race ids** (PHB p17-43):
  - Races: `dwarf`, `elf`, `halfling`, `human`, `dragonborn`, `gnome`, `half-elf`, `half-orc`, `tiefling`.
  - Subraces (`parent` set): `hill-dwarf`, `mountain-dwarf`, `high-elf`, `wood-elf`, `drow`, `lightfoot-halfling`, `stout-halfling`, `variant-human`, `forest-gnome`, `rock-gnome`.
- **Racial spells:** `atLevel` = character level.
- **`draconic-ancestry`:** owner `dragonborn`, picks 1 from 1, with the 10 dragon colours as passive options. Each description gives the damage type and the breath area and save from the PHB table.
- **Racial features:** they follow the in-scope rule (`source.kind: 'race'`, `source.id` = race or subrace id).
- **Feats** (PHB p165-170): only feats that grant an action, bonus action, reaction or spells.
  - `FeatDef.description` = the full feat text.
  - Each action, bonus action or reaction the feat grants is also a `Feature` with `source.kind: 'feat'`.
  - Spell feats carry `spells` grants:
    - Magic Initiate: choose 2 cantrips + 1 level-1 spell from one of bard, cleric, druid, sorcerer, warlock, wizard.
    - Ritual Caster: choose 2 level-1 rituals from one of the same six lists.
    - Spell Sniper: 1 attack cantrip.
  - The Plan 3 editor enforces the "one list" rule. Here, `lists` names the allowed lists.

- [ ] **Step 1: Write the failing tests**

```ts
const r = (id: string) => DATA.races.find(x => x.id === id)!;
test('races', () => {
  expect(DATA.races).toHaveLength(19);
  expect(r('drow').parent).toBe('elf');
  expect(r('tiefling').spells.map(x => [x.spell, x.atLevel])).toEqual([['thaumaturgy', 1], ['hellish-rebuke', 3], ['darkness', 5]]);
  expect(r('drow').spells.map(x => [x.spell, x.atLevel])).toEqual([['dancing-lights', 1], ['faerie-fire', 3], ['darkness', 5]]);
  expect(r('high-elf').spells[0].choose).toMatchObject({ lists: ['wizard'], level: 0, count: 1 });
  expect(r('forest-gnome').spells[0].spell).toBe('minor-illusion');
});
test('racial features', () => {
  const f = (id: string) => DATA.features.find(x => x.id === id)!;
  expect(f('breath-weapon').scaling![0].values).toEqual([...Array(5).fill('2d6'), ...Array(5).fill('3d6'), ...Array(5).fill('4d6'), ...Array(5).fill('5d6')]);
  for (const id of ['lucky', 'relentless-endurance', 'savage-attacks']) expect(f(id), id).toBeTruthy();
  expect(DATA.features.filter(x => x.source.kind === 'option' && x.source.id === 'draconic-ancestry')).toHaveLength(10);
});
test('feats', () => {
  for (const id of ['polearm-master', 'sentinel', 'war-caster', 'shield-master', 'great-weapon-master', 'magic-initiate', 'ritual-caster', 'mage-slayer', 'spell-sniper', 'lucky'])
    expect(DATA.feats.find(x => x.id === id), id).toBeTruthy();
  expect(DATA.feats.find(x => x.id === 'magic-initiate')!.spells.map(g => g.choose?.count)).toEqual([2, 1]);
  expect(DATA.features.find(x => x.source.kind === 'feat' && x.source.id === 'sentinel')?.cost).toBe('reaction');
});
```

Ids that collide get the source prefix per the Global Constraints. The halfling's `lucky` and the feat `lucky` are different records: the race feature is `lucky`, and the feat's feature, if it needs one, is `lucky-feat`. Report the final ids.

- [ ] **Step 2-4:** `npm run extract:pages -- 17 43 && npm run extract:pages -- 165 170`, transcribe, then `npm test && npm run check:ocr -- races && npm run check:ocr -- feats && npm run check:ocr -- features`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: races, subraces and feats"`

---

### Task 12: Icons

**Files:**
- Create: `scripts/extract/icons.ts`, `scripts/extract/icon-aliases.json`, `public/icons/fallback/school-{abjuration,conjuration,divination,enchantment,evocation,illusion,necromancy,transmutation}.svg`, `tests/unit/icons.test.ts`
- Modify: `public/icons/fallback/CREDITS.txt`, `src/ui/Icon.tsx`, `src/ui/IconGrid.tsx`, `src/ui/screens/Card.tsx`, all data files (`icon` / `hotbarIcon` fields), `package.json` (`extract:icons`)

**Interfaces:**
- Produces:

```ts
export function iconCandidates(name: string): string[];   // File: titles to try, in order
// Icon.tsx: FallbackName gains `school-${lowercase school}`; Icon's fallback prop accepts FallbackName
export function spellFallback(s: Spell): FallbackName;     // 'school-evocation' etc.
```

- **`iconCandidates("Mage Armor")`**, in order:
  1. `File:Mage_Armor_Icon.webp`, `File:Mage_Armor_Icon.png`
  2. British spellings (armor→armour, color→colour, center→centre, defense→defence), each as webp and png
  3. `File:<Name>_spell_Icon.webp`

  Apostrophes are kept and spaces become `_`.
- **`icon-aliases.json`:** `{ "<record id>": "File:<exact title>" | null }`, where `null` means use the fallback. It wins over the candidates.
- **`extract:icons`:**
  - Covers spells, features, subclasses (`Class_<Class>_<Subclass words>_Hotbar_Icon.png`), races and feats.
  - Queries `bg3.wiki/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=…` in batches of 50 with a 1 s pause between batches and a `User-Agent` naming the project repo.
  - Only fills `icon` where it is missing, and never overwrites one.
  - Prints coverage per kind.
- **Fallbacks:** the 8 school icons come from game-icons.net (pick one per school). CREDITS.txt gets each icon's author and name. `IconGrid` and `Card` use `spellFallback` for spells.

- [ ] **Step 1: Write the failing tests**

```ts
test('candidates', () => {
  const c = iconCandidates('Mage Armor');
  expect(c.slice(0, 2)).toEqual(['File:Mage_Armor_Icon.webp', 'File:Mage_Armor_Icon.png']);
  expect(c).toContain('File:Mage_Armour_Icon.webp');
  expect(iconCandidates('Shield')).toContain('File:Shield_spell_Icon.webp');
});
test('school fallback', () => {
  expect(spellFallback(DATA.spells.find(s => s.id === 'fireball')!)).toBe('school-evocation');
  for (const sc of ['abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation'])
    expect(existsSync(`public/icons/fallback/school-${sc}.svg`), sc).toBe(true);
});
test('icon coverage', () => {
  const withIcon = DATA.spells.filter(s => s.icon?.startsWith('https://bg3.wiki/w/images/')).length;
  expect(withIcon).toBeGreaterThanOrEqual(200);
  expect(DATA.subclasses.filter(s => s.hotbarIcon && !s.hotbarIcon.startsWith('https://bg3.wiki/')).map(s => s.id)).toEqual([]);
});
```

The e2e test `bg3 icon failure shows fallback` is extended: a blocked Fireball icon shows `school-evocation.svg`.

- [ ] **Step 2-4:** `npm run extract:icons`, then `npm test && npm run e2e`. Expected: PASS. The report gives coverage numbers per kind.
- [ ] **Step 5: Commit** — `git commit -m "feat: bg3.wiki icons for all content, school fallbacks"`

---

### Task 13: Whole-content verification and release

**Files:**
- Modify: `README.md` (WIP note: update what is in so far), `docs/superpowers/plans/2026-10-21-plan-2-content.md` (tick boxes)

- [ ] **Step 1: Full checks.**
  - Run `npm test && npm run e2e && npm run build && npm run check:ocr`. Expected: PASS, and the OCR report has only accepted entries.
  - Run `gzip -c dist/assets/*.js | wc -c`. Expected: ≤ 460800 bytes (450 KB). If it is over, move the content JSON into a lazily imported chunk (`import('./content')`), with the app showing the existing Start screen while it loads, and record it in the report.
- [ ] **Step 2: Spot-check sheet for the owner.** Write `.cache/spot-check.md` listing 15 random records (5 spells, 5 features, 2 subclasses, 2 races, 1 feat). Each entry gives the record's book page and its deep link on the local preview, so the owner can compare against the book.
- [ ] **Step 3: Owner check, merge and push.** These are outward-facing, so ask first. Ask the owner to spot-check the sheet, then merge to `main` and push (which deploys). After the deploy, run the Plan 1 live check (Playwright against `https://thetrexx.github.io/dnd-5e-companion/`, fonts and bg3 icons) on `#/spells/wizard/5` and `#/actions/cleric/5/life-domain`.
- [ ] **Step 4: Commit** — `git commit -m "docs: README progress after Plan 2"`
