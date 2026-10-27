# Plan 7, Batch 3: The Rest of Tasha's Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everything a player picks from Tasha's Cauldron of Everything that isn't live yet, except the Artificer:
- its 21 other subclasses and its 21 spells;
- its optional class features, including the expanded spell lists;
- its feats and Custom Lineage.

**Architecture:**
- **Content:** same pipeline as batch 2. Spell facts go in `scripts/extract/spell-nonsrd.json` with `book: "tce"`, and everything else is hand-written in `data/*.json` from the page images.
- **Optional class features:** new code, built on option groups so the editor, backup codes and `prune` work unchanged.
  - Each class gets a tick-any option group `optional-<class>`. Ticking a feature there can hide the features or option groups it replaces.
  - New options in existing pools (fighting styles, maneuvers, Metamagic, invocations, a pact boon) carry an `optional` flag that shows as an "Optional" tag.
  - Expanded spell lists are a per-spell `optionalLists` field, switched on by one ticked option per class.
- **Feats that pick options** (Fighting Initiate, Eldritch Adept, Metamagic Adept, and Martial Adept retrofitted) get feat-owned option groups.

**Tech Stack:** Preact + TypeScript + Vite, Vitest, Playwright, Node 24 scripts with poppler.

**Spec:** `docs/superpowers/specs/2026-10-27-more-books-design.md`: section 4 (batch 3), section 5 (data changes) and section 6 (optional class features). It extends `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md`.

**Inventory:** `docs/superpowers/plans/2026-10-27-plan-7-tce-inventory.md`. It was read off the page images on 2026-10-27 and lists names, levels, pages, costs and replacements, with no rules text. Use it to find things. The page image still decides every fact on a card.

## Global Constraints

The Global Constraints of `docs/superpowers/plans/2026-10-27-plan-5-batch-1-bg3-parity.md` apply unchanged:
- own words only;
- facts come from the page image;
- book ids and card labels;
- ids never change;
- summons rule;
- size ≤ 450 KB gzipped.

The batch 2 constraints on spell card style, the in-scope feat rule and bonus-spell modelling also apply (`docs/superpowers/plans/2026-10-27-plan-6-batch-2-xanathars.md`).

Also:
- **Tasha's pages:** `npm run extract:pages -- <from> <to> tce`. Book page = PDF page − 1. The OCR is noisy: digits split ("1 6") and letters swap. Use it to locate things only.
- **Every new record carries `"book": "tce"`**, the four SCAG cantrips included (Booming Blade, Green-Flame Blade, Lightning Lure, Sword Burst; reprint rule).
- **Tasha's summons:** "Stat block: Tasha's p. N" on the card. The pages are in the inventory: summon spells pp. 109-114, Dancing Item p. 29, Wildfire Spirit p. 40, Primal Companion beasts p. 61.
- **No Artificer.** Artificer Initiate (feat) waits for batch 4, which brings the artificer spell list. The artificer column of the p. 105 table is ignored.
- **In-scope rule for optional features:** same as for features. Rebuild-only features stay out, and the report names them:
  - Primal Knowledge;
  - Bardic Versatility, Cantrip Versatility, Martial Versatility, Sorcerous Versatility, Eldritch Versatility;
  - Spellcasting Focus, Dedicated Weapon and Cantrip Formulas.
  The expanded-list features are passive, but they are kept, because ticking them changes what the app shows.
- **Feats out of scope:** Gunner and Skill Expert (passive). Crusher, Piercer and Slasher are in, as once-per-turn riders, the same as the PHB's Savage Attacker.
- **Ids:**
  - Optional group: `optional-<class>`. A subclass optional group is `optional-<subclass id>`.
  - Its options: `optional-<class>-<name slug>`, e.g. `optional-ranger-favored-foe`.
  - New pool options follow their pool: `fighting-style-blind-fighting`, `maneuvers-ambush`, `metamagic-seeking-spell`, `eldritch-invocations-eldritch-mind`, `pact-boon-pact-of-the-talisman`.
  - Spells: name slug, e.g. `tashas-caustic-brew`, `green-flame-blade`.
- **Tag text** is exactly `Optional` (row tag, option note, card sub line).

## Review Focus

1. **Old saved characters.** A ranger saved before batch 3, with Favored Enemy and Natural Explorer picks, loads unchanged and shows both slots and picks. Nothing optional is ticked by default. Pinned in Task 1, and guarded by the frozen-code test in `tests/unit/character-code.test.ts`, which every task runs.
2. **Untick restores.** Ticking Favored Foe hides the Favored Enemy slot and its cards. Unticking it brings both back with the old picks, because `ch.options` still holds them. Pinned in Task 1.
3. **Blessed Strikes hides every Divine Strike,** including the ones added in this batch (Order, Twilight). Pinned in Task 6. Task 7 re-runs that test after adding the domains.
4. **Expanded lists stay optional.**
   - With no character, an expanded-list spell shows tagged Optional.
   - A saved character without the tick neither sees it nor is offered it.
   - A spell picked while ticked keeps its Optional tag after unticking, and isn't silently dropped.
   - Pinned in Task 4.
5. **Genie spells follow the genie kind.** A Dao warlock is offered the Dao spells and the shared Genie spells, never the Efreeti ones. Patron grants honour `option` the way domain grants already do. Pinned in Task 9.
6. **Feat slots share pools.** A Fighter with Fighting Initiate can't count one style for both slots. A Warlock with Eldritch Adept draws from the same invocation pool. Pinned in Task 2.

---

## File Structure

```
src/data/types.ts, src/data/validate.ts     Feature.optional / replaces / expandsList, OptionGroup.optional,
                                            OptionGroup.owner.kind 'feat', Spell.optionalLists (Tasks 1, 2, 4)
src/character/options.ts                    optional slots, replaced(), feat-owned slots, prune (Tasks 1, 2)
src/logic/sections.ts                       browse: optional items join class/subclass sections, Optional tags (Tasks 1, 4)
src/character/view.ts                       character: same, minus replaced features; feat option actions (Tasks 1, 2, 4)
src/logic/rules.ts, src/character/derive.ts listSpells / pickableSpells with expanded lists; patron options (Tasks 4, 9)
src/ui/screens/Card.tsx                     source, section and "Optional" sub line for optional features (Task 1)
src/ui/editor/StepOptions.tsx               tick-any slot, Optional notes, feat owner names (Tasks 1, 2)
scripts/extract/spell-lists-optional.json   expanded lists, same shape as spell-lists.json (Task 4)
scripts/extract/apply-spell-lists.ts        writes optionalLists into the facts (Task 4)
data/features/<class>.json, data/options.json, data/subclasses.json, data/feats.json, data/features/feats.json, data/races.json
```

---

### Task 1: Optional class features, with the Ranger's as first content

**Files:**
- Modify:
  - `src/data/types.ts`, `src/data/validate.ts`
  - `src/character/options.ts`, `src/character/view.ts`
  - `src/logic/sections.ts`
  - `src/ui/screens/Card.tsx`, `src/ui/editor/StepOptions.tsx`
  - `data/options.json`, `data/classes.json` (ranger `options`), `data/subclasses.json` (beast-master `options`)
  - `data/features/ranger.json`
- Test: `tests/unit/options-content.test.ts`, `tests/unit/sections.test.ts`, `tests/unit/character-view.test.ts`, `tests/unit/editor.test.tsx`, `tests/unit/validate.test.ts`, `tests/unit/screens.test.tsx`

**Interfaces:**
- Produces:

```ts
// types.ts
interface Feature {
  optional?: true;        // Tasha's optional class feature, or a Tasha's option in an existing pool: shows "Optional"
  replaces?: string[];    // feature ids or option group ids hidden while this option is chosen
  expandsList?: ClassId;  // Task 4: ticked, this class's optionalLists spells join its list
}
interface OptionGroup { optional?: true }   // tick-any: no count limit, the player ticks what their DM allows
// options.ts
export function replaced(ch: Character): Set<string>;   // union of `replaces` of every chosen option
```

- **`optionSlots`:**
  - An optional group's slot gets `count = choices.length` and exists only when `choices.length > 0`.
  - A slot whose `group.id` is in `replaced(ch)` is dropped, after `assign`.
- **Browse view (`actionSections`):**
  - An optional group gets no section of its own. Its non-passive options, reached by `prereq.level`, join the class section (class-owned group) or the subclass section (subclass-owned group).
  - Every item with `optional: true` in any section gets the tag `Optional`. That covers class features gated on an optional option too, e.g. Tireless.
  - Replaced features still show; with no character, everything shows.
- **Character view (`classActions`):** chosen optional options join the class or subclass section, tagged `Optional`. Features whose id is in `replaced(ch)` are dropped.
- **Card:** for an option of an optional group:
  - the source label is the owner class or subclass name;
  - the back section is `class` or `subclass`;
  - `card-sub` ends with ` · Optional`, plus `, replaces <names>` when `replaces` is set. Names are resolved from features, else option groups.
  - Any other `optional` feature also gets ` · Optional`.
- **Editor (`StepOptions`):**
  - An optional slot shows the separator label `Optional Features` (`· <Class>` when multiclassed) and the note `Tick the ones your DM allows.` instead of "n of m chosen".
  - An option's note is `joinTag(replaces ? 'Replaces <names>' : undefined, prereq.text)`.
  - In other slots, an `optional` option's note is `joinTag('Optional', prereq.text)`.
- **Validator:**
  - every option of an optional group has `optional: true`, and `prereq.level` equal to its `level`;
  - every `replaces` id is an existing feature or option group;
  - `expandsList` appears only on an option of the optional group owned by that class.
- **Ranger content** (inventory section 2, pp. 56-57 and 61). Group `optional-ranger`, class-owned, `picks` all 1, `optional: true`:
  - `optional-ranger-favored-foe`: level 1, free, replaces `["favored-enemy"]`, with scaling for the die.
  - `optional-ranger-deft-explorer`: level 1, passive, replaces `["natural-explorer"]`. Add a class feature `deft-explorer-tireless`: level 10, action, `optional: true`, `prereq.option: "optional-ranger-deft-explorer"`.
  - `optional-ranger-primal-awareness`: level 3, replaces `["primeval-awareness"]`. It has fixed grants of its five spells at 3/5/9/13/17, with `uses` per the page.
  - `optional-ranger-natures-veil`: level 10, bonus, replaces `["hide-in-plain-sight"]`.
  - Group `optional-beast-master`, owned by the beast-master subclass, with `optional-beast-master-primal-companion`: level 3, replaces `["rangers-companion", "companion-commands"]`, stat block Tasha's p. 61.

- [ ] **Step 1: Write the failing tests**

```ts
const ranger = (lvl: number, options: string[] = [], sub?: string) =>
  ({ ...emptyCharacter(), classes: [{ cls: 'ranger', level: lvl, ...(sub && { sub }) }], options }) as Character;
test('old ranger keeps favored enemy (no tick)', () => {
  const ch = ranger(5, ['favored-enemy-undead']);
  expect(optionSlots(ch).map(s => s.group.id)).toEqual(expect.arrayContaining(['favored-enemy', 'natural-explorer', 'optional-ranger']));
  expect(optionSlots(ch).find(s => s.group.id === 'favored-enemy')!.chosen).toEqual(['favored-enemy-undead']);
});
test('favored foe replaces favored enemy, untick restores', () => {
  const on = ranger(5, ['favored-enemy-undead', 'optional-ranger-favored-foe']);
  expect(optionSlots(on).map(s => s.group.id)).not.toContain('favored-enemy');
  expect(charActionSections(on).find(s => s.id === 'class-ranger')!.items.map(f => f.id)).toContain('optional-ranger-favored-foe');
  expect(optionSlots(ranger(5, ['favored-enemy-undead'])).find(s => s.group.id === 'favored-enemy')!.chosen).toEqual(['favored-enemy-undead']);
});
test('replaced class feature hides', () => {
  const ids = (ch: Character) => charActionSections(ch).flatMap(s => s.items.map(f => f.id));
  expect(ids(ranger(10))).toContain('hide-in-plain-sight');
  expect(ids(ranger(10, ['optional-ranger-natures-veil']))).not.toContain('hide-in-plain-sight');
  expect(ids(ranger(10))).not.toContain('deft-explorer-tireless');
  expect(ids(ranger(10, ['optional-ranger-deft-explorer']))).toContain('deft-explorer-tireless');
});
test('optional slot counts every choice reached', () => {
  const s = optionSlots(ranger(3)).find(x => x.group.id === 'optional-ranger')!;
  expect(s.count).toBe(s.choices.length);
  expect(s.choices.map(f => f.id)).not.toContain('optional-ranger-natures-veil');   // level 10
});
test('browse shows optional features in the class section, tagged', () => {
  const sec = actionSections('ranger', 10).find(s => s.id === 'class')!;
  expect(sec.items.map(f => f.id)).toEqual(expect.arrayContaining(['optional-ranger-favored-foe', 'hide-in-plain-sight', 'optional-ranger-natures-veil']));
  expect(sec.tags!['optional-ranger-favored-foe']).toBe('Optional');
  expect(actionSections('ranger', 10).map(s => s.id)).not.toContain('opt-optional-ranger');
});
test('primal companion is a beast master option', () => {
  const sec = actionSections('ranger', 3, 'beast-master').find(s => s.id === 'subclass')!;
  expect(sec.tags!['optional-beast-master-primal-companion']).toBe('Optional');
});
// validate.test.ts: an optional-group option without optional:true, a replaces id that doesn't exist,
//   and expandsList on a class feature each give an error
// screens.test.tsx: the Favored Foe card's sub line reads 'Ranger Feature · Level 1 · Optional, replaces Favored Enemy'
// editor.test.tsx: a ranger 1's options step shows 'Optional Features' with 'Tick the ones your DM allows.';
//   ticking Favored Foe removes the 'Favored Enemy' separator
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run tests/unit`. Expected: FAIL.
- [ ] **Step 3: Implement** the types, validator, `replaced`, slot changes, the two section builders, the card and the editor step. Then write the Ranger records from pp. 56-57 and 61.
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- features && npm run build && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Tasha's optional class features (engine, ranger)"`

---

### Task 2: Feat-owned option groups

**Files:**
- Modify:
  - `src/data/types.ts`, `src/data/validate.ts`
  - `src/character/options.ts`, `src/character/view.ts`, `src/character/derive.ts`, `src/character/grants.ts`
  - `src/ui/editor/StepOptions.tsx`
  - `data/options.json`, `data/feats.json`
- Test: `tests/unit/options-content.test.ts`, `tests/unit/character-view.test.ts`, `tests/unit/editor.test.tsx`

**Interfaces:**
- Produces:
  - `OptionGroup.owner.kind` gains `'feat'`, and `FeatDef` gains `options?: string[]`.
  - `optionSlots` adds each chosen feat's groups at total level, with `cls` undefined.
  - `prune` treats a chosen feat's groups as owned.
  - `featureLevel` and `owningClass` treat a feat-owned pool as total level with no class.
- **Character view:** chosen non-passive options of feat-owned slots join the `feats` section, not the race section. `otherActions` today puts every class-less slot under race, so split slots by `group.owner.kind`.
- **Editor:** a feat-owned slot's separator reads `<Group name> · <Feat name>`. `ownerName` resolves feats, so "Chosen for Martial Adept" works.
- **Retrofit Martial Adept:**
  - Its group is `martial-adept`, with `from: "maneuvers"` and `picks` 2 at every level.
  - `martial-adept` gets `options: ["martial-adept"]`.
  - Its description stays.

- [ ] **Step 1: Write the failing tests**

```ts
test('martial adept picks two maneuvers from the shared pool', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'fighter', level: 3, sub: 'battle-master' }], feats: ['martial-adept'],
    options: ['maneuvers-parry', 'maneuvers-riposte', 'maneuvers-rally', 'maneuvers-trip-attack', 'maneuvers-feinting-attack'] } as Character;
  const slots = optionSlots(ch).filter(s => (s.group.from ?? s.group.id) === 'maneuvers');
  expect(slots.map(s => s.count).sort()).toEqual([2, 3]);
  expect(slots.flatMap(s => s.chosen).sort()).toEqual([...ch.options].sort());   // each counted once
  expect(charActionSections(ch).find(s => s.id === 'feats')!.items.map(f => f.id)).toEqual(expect.arrayContaining(['martial-adept']));
});
test('feat slot leaves with the feat', () =>
  expect(prune({ ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], options: ['maneuvers-parry'] } as Character).options).toEqual([]));
// editor.test.tsx: a wizard 4 with Martial Adept sees a 'Maneuvers · Martial Adept' separator in the options step
```

  Task 10 adds the Fighting Initiate and Eldritch Adept cases (Review Focus 6).
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run to verify** — `npm test && npm run build && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: feats can own option groups; Martial Adept picks maneuvers"`

---

### Task 3: Tasha's spells (21)

**Files:**
- Modify:
  - `scripts/extract/spell-nonsrd.json`, `spell-summaries.json`, `spell-lists.json`, `spell-icons.json`, `icon-aliases.json`
  - `scripts/extract/ocr-accept.json` (only with reasons)
  - `data/spells.json` (built)
- Test: `tests/unit/spells-content.test.ts`

**Interfaces:**
- Produces all 21 spells of the inventory's section 3 (pp. 106-116), each:
  - with `book: "tce"` and on the class lists of the p. 105 table, Artificer left out;
  - shaped like the batch 2 spells, with the same pipeline order and never a hand edit of `data/spells.json`.
- **Summon spells:** the description names the variants and ends `Stat block: Tasha's p. N`.
- **Total spells:** 477.

- [ ] **Step 1: Write the failing tests**

```ts
const tce = DATA.spells.filter(s => s.book === 'tce');
test('21 tasha spells', () => { expect(tce).toHaveLength(21); expect(DATA.spells).toHaveLength(477); });
test('scag cantrips cite tasha', () => {
  for (const id of ['booming-blade', 'green-flame-blade', 'lightning-lure', 'sword-burst'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'tce', level: 0 });
});
test('summons name their stat block', () => {
  for (const s of tce.filter(x => x.id.startsWith('summon-'))) expect(s.description.join(' '), s.id).toMatch(/Stat block: Tasha's p\. \d+/);
});
test('tasha lists', () => {
  expect(DATA.spells.find(s => s.id === 'summon-beast')!.classes.sort()).toEqual(['druid', 'ranger']);
  expect(DATA.spells.find(s => s.id === 'spirit-shroud')!.classes.sort()).toEqual(['cleric', 'paladin', 'warlock', 'wizard']);
});
// the existing 'every spell damage line parses' test covers the new damage lines
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pp. 105-116, then write facts, summaries and list entries** from the images and run the pipeline.
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- spells && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Tasha's spells"`

The reviewer checks at least 10 spells against the page images, including every spell with a damage line.

---

### Task 4: Expanded spell lists

**Files:**
- Create: `scripts/extract/spell-lists-optional.json`
- Modify:
  - `scripts/extract/apply-spell-lists.ts`, `scripts/extract/build-spells.ts` (only if it drops unknown keys)
  - `scripts/extract/spell-facts.json`, `data/spells.json` (built)
  - `src/data/types.ts`, `src/data/validate.ts`
  - `src/logic/rules.ts`, `src/logic/sections.ts`
  - `src/character/derive.ts`, `src/character/options.ts`, `src/character/view.ts`
  - `src/ui/editor/StepSpells.tsx`
  - `data/options.json`, `data/classes.json`, `data/features/<class>.json`
- Test: `tests/unit/spells-content.test.ts`, `tests/unit/sections.test.ts`, `tests/unit/character-view.test.ts`, `tests/unit/editor.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`expandsList`, optional groups) and Task 3 (spells).
- Produces:

```ts
interface Spell { optionalLists?: ClassId[] }   // expanded-list classes not already in `classes`
export function listSpells(c: ClassDef, s?: SubclassDef, expanded?: boolean): Spell[];   // rules.ts
export function hasExpandedList(ch: Character, cls: ClassId): boolean;                   // options.ts
export function pickableSpells(cc: CharClass, expanded?: boolean): Pickable[];           // derive.ts
```

- **`spell-lists-optional.json`** holds the eight lists of the inventory's section 2: bard p. 27, cleric p. 30, druid p. 35, paladin p. 52, ranger p. 57, sorcerer p. 65, warlock p. 70, wizard p. 75. Confirm each on its image. Same shape and names as `spell-lists.json`.
- **`extract:lists`** writes `optionalLists` without the classes already in `classes`, and omits the key when empty. An unknown name fails the run, as now.
- **Tags:**
  - In the browse view, `spellSections` passes `expanded = true` and tags spells that come only from `optionalLists` with `Optional`.
  - In the character view, a class place is expanded when `hasExpandedList`. A picked spell of that class that is on its `optionalLists` is tagged `Optional`, whether or not the list is ticked.
- **Editor:** the spells step passes `hasExpandedList(ch, cc.cls)`.
- **Choose grants** (Magic Initiate, Magical Secrets…) keep using base lists only.
- **One optional option per class:** `optional-<class>-additional-spells`, named `Additional <Class> Spells`.
  - It is passive, `expandsList: "<class>"`, at the level the book gives (paladin and ranger 2, the others 1).
  - Bard, cleric, druid, paladin, sorcerer, warlock and wizard gain an `optional-<class>` group. Ranger has one from Task 1.

- [ ] **Step 1: Write the failing tests**

```ts
test('expanded list is optional data', () => {
  const s = DATA.spells.find(x => x.id === 'aura-of-vitality')!;
  expect(s.optionalLists).toEqual(expect.arrayContaining(['cleric', 'druid']));
  expect(s.classes).not.toContain('cleric');
});
test('browse shows expanded spells tagged Optional', () => {
  const l3 = spellSections('cleric', 5).find(x => x.id === 'lvl-3')!;
  expect(l3.items.map(s => s.id)).toContain('aura-of-vitality');
  expect(l3.tags!['aura-of-vitality']).toBe('Optional');
});
test('character needs the tick', () => {
  const cc = { cls: 'cleric', level: 5 } as CharClass;
  expect(pickableSpells(cc).map(p => p.spell.id)).not.toContain('aura-of-vitality');
  expect(pickableSpells(cc, true).find(p => p.spell.id === 'aura-of-vitality')!.tag).toBe('Optional');
});
test('picked expanded spell keeps its tag after unticking', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'cleric', level: 5 }], spells: [{ id: 'aura-of-vitality', cls: 'cleric' }] } as Character;
  const l3 = charSpellSections(ch, 'mine').find(s => s.id === 'lvl-3-cleric')!;
  expect(l3.tags!['aura-of-vitality']).toBe('Optional');
});
// editor.test.tsx: a cleric 5's spells step offers Aura of Vitality only after ticking Additional Cleric Spells
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** the pipeline field and code. Write the eight lists from the images and the eight options, then run `extract:lists` and `build:spells`.
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- features && npm run build && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Tasha's expanded spell lists as optional features"`

---

### Tasks 5-6: The other optional class features and new pool options

| Task | Content (inventory section 2) | Commit message |
|---|---|---|
| 5 | Barbarian (Instinctive Pounce), Bard (Magical Inspiration), Fighter (5 styles, 7 maneuvers), Paladin (Harness Divine Power; styles Blessed Warrior, Blind Fighting, Interception), Ranger (styles Blind Fighting, Druidic Warrior, Thrown Weapon Fighting), Rogue (Steady Aim) | `feat: Tasha's optional features, martial classes and fighting styles` |
| 6 | Cleric (Harness Divine Power, Blessed Strikes), Druid (Wild Companion), Monk (Ki-Fueled Attack, Quickened Healing, Focused Aim), Sorcerer (Magical Guidance; Seeking Spell, Transmuted Spell), Warlock (Pact of the Talisman; 8 invocations) | `feat: Tasha's optional features, casters and monk` |

**Files (each task):**
- Modify:
  - `data/options.json`, `data/classes.json`, `data/features/<class>.json`
  - `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json` (only with reasons)
- Test: `tests/unit/options-content.test.ts`, `tests/unit/classes-content.test.ts`

**Modelling decisions:**
- **Features added to a class** (Instinctive Pounce, Harness Divine Power, Steady Aim…) are options of `optional-<class>`. Create the group where Task 4 didn't.
- **New pool options** are option features of the existing pool with `optional: true`. They aren't ticked separately, because choosing one is the opt-in.
- **Fighting styles:**
  - All seven go in pool `fighting-style`.
  - Group `fighting-style` (fighter) gains an `only` list: its 6 PHB styles plus Blind Fighting, Interception, Superior Technique, Thrown Weapon Fighting and Unarmed Fighting.
  - `fighting-style-paladin` adds Blessed Warrior, Blind Fighting and Interception. `fighting-style-ranger` adds Blind Fighting, Druidic Warrior and Thrown Weapon Fighting.
  - `fighting-style-swords` is unchanged.
- **Blessed Warrior and Druidic Warrior** each carry a choose grant of 2 cantrips (cleric list with `cha`, druid list with `wis`).
- **Superior Technique:** its card says to pick one maneuver and gain one d6 superiority die. There is no maneuver slot for it.
- **Blessed Strikes** has `replaces` set to every cleric subclass feature named "Divine Strike". Task 7 appends Order and Twilight to it.
- **Pact of the Talisman** is a `pact-boon` option.
- **Talisman invocations** use `prereq.option: "pact-boon-pact-of-the-talisman"`. Far Scribe and Gift of the Protectors use the Tome boon. Invocation levels go in `prereq.level`.
- **Spell-granting invocations** (Far Scribe's sending, Undying Servitude's animate dead) carry fixed grants with `uses`.
- **Wild Companion** carries a fixed grant of `find-familiar`, whose `uses` names the Wild Shape cost.

- [ ] **Step 1: Write the failing tests** (Task 5's version; Task 6 tests its own ids the same way)

```ts
const f = (id: string) => DATA.features.find(x => x.id === id)!;
test('task 5 optional features', () => {
  for (const id of ['optional-barbarian-instinctive-pounce', 'optional-bard-magical-inspiration', 'optional-paladin-harness-divine-power', 'optional-rogue-steady-aim'])
    expect(f(id), id).toMatchObject({ book: 'tce', optional: true });
});
test('styles land on the right classes', () => {
  const offered = (cls: ClassId) => optionSlots({ ...emptyCharacter(), classes: [{ cls, level: 2 }] } as Character)
    .find(s => (s.group.from ?? s.group.id) === 'fighting-style')!.choices.map(x => x.id);
  expect(offered('fighter')).toContain('fighting-style-superior-technique');
  expect(offered('fighter')).not.toContain('fighting-style-blessed-warrior');
  expect(offered('paladin')).toContain('fighting-style-blessed-warrior');
  expect(offered('ranger')).toContain('fighting-style-druidic-warrior');
  expect(offered('ranger')).not.toContain('fighting-style-interception');
});
test('seven new maneuvers', () => expect(poolOptions('maneuvers').filter(x => x.book === 'tce')).toHaveLength(7));
// Task 6:
test('blessed strikes replaces every divine strike', () => {
  const ds = DATA.features.filter(x => x.name === 'Divine Strike' && x.source.kind === 'subclass').map(x => x.id);
  expect(f('optional-cleric-blessed-strikes').replaces!.sort()).toEqual(ds.sort());
});
test('talisman invocations need the talisman', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 12 }], options: ['pact-boon-pact-of-the-blade'] } as Character;
  const offered = optionSlots(ch).find(s => s.group.id === 'eldritch-invocations')!.choices.map(x => x.id);
  expect(offered).not.toContain('eldritch-invocations-rebuke-of-the-talisman');
  expect(offered).toContain('eldritch-invocations-eldritch-mind');
});
```

  The ids come from the inventory. The book's name wins.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract the pages and write the records** from the images.
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** with the task's message.

The reviewer checks at least 10 records against the page images, plus every `only` list and `replaces` list.

---

### Tasks 7-9: Tasha's subclasses (21), in three groups

| Task | Subclasses (id, start page) | Total after | Commit message |
|---|---|---|---|
| 7 | `path-of-the-beast` 24, `college-of-creation` 28, `college-of-eloquence` 29, `order-domain` 31, `peace-domain` 32, `twilight-domain` 34, `circle-of-wildfire` 39 | 87 | `feat: Tasha's subclasses, barbarian to druid` |
| 8 | `psi-warrior` 42, `rune-knight` 44, `way-of-mercy` 49, `way-of-the-astral-self` 50, `oath-of-glory` 53, `oath-of-the-watchers` 54, `fey-wanderer` 58 | 94 | `feat: Tasha's subclasses, fighter to ranger` |
| 9 | `phantom` 62, `soulknife` 63, `aberrant-mind` 66, `clockwork-soul` 68, `the-fathomless` 72, `the-genie` 73, `order-of-scribes` 77 | 101 | `feat: Tasha's subclasses, rogue to wizard` |

**Files (each task):**
- Modify:
  - `data/subclasses.json`, `data/options.json`, `data/features/<class>.json`
  - `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json` (only with reasons)
  - Task 9 also changes `src/character/view.ts`, `src/character/derive.ts` and `src/logic/sections.ts` (patron options).
- Test: `tests/unit/subclasses-content.test.ts`

**Modelling decisions** (features, levels and costs are in the inventory, section 1):
- **Bonus spell kinds:**
  - Order, Peace and Twilight: `domain`.
  - Wildfire: `circle`.
  - Glory and Watchers: `oath`.
  - Fey Wanderer, Aberrant Mind and Clockwork Soul: `subclass`.
  - Fathomless and Genie: `patron`.
- **Divine Strike:** Order and Twilight each have a `<subclass>-divine-strike` feature. Add both ids to Blessed Strikes' `replaces`. Task 6's test then covers them.
- **Rune Knight:**
  - Option group `runes`, with `picks` from the Rune Carver table (2 at 3, 3 at 7, 4 at 10, 5 at 15).
  - Hill Rune and Storm Rune need `prereq.level: 7`.
  - Each rune's invoke cost is its feature cost.
- **Psionic Energy dice** (Psi Warrior, Soulknife): `resource` on each power, with a scaling row for the die size (d6/d8/d10/d12 at 3/5/11/17) on the Psionic Power feature.
- **Genie:**
  - Option group `genie-kind` (Dao, Djinni, Efreeti, Marid; 1 pick at level 1).
  - Patron grants of one kind carry `option: "genie-kind-<kind>"`; the shared Genie spells carry none.
  - Code change: `classPlace` and `pickableSpells` skip a patron grant whose `option` isn't chosen.
  - The browse view keeps listing all of them, tagged with the kind name, the way `spellSections` already does for option-gated grants.
- **Feature spells:** Fey Reinforcements (`summon-fey`), Misty Wanderer (`misty-step`) and Grasping Tentacles (`evards-black-tentacles`) are fixed grants on their feature, with `uses`.
- **Summons:** Dancing Item (Tasha's p. 29) and Wildfire Spirit (Tasha's p. 40).
- **Missing costs:**
  - Blazing Revival is `free`, with a trigger and `uses` "Once per long rest".
  - Vigilant Rebuke is a `reaction` with no `uses`.
  - Say so in the report.

- [ ] **Step 1: Write the failing tests** (Task 7's version; Tasks 8-9 use their ids and totals)

```ts
const T7 = ['path-of-the-beast', 'college-of-creation', 'college-of-eloquence', 'order-domain', 'peace-domain', 'twilight-domain', 'circle-of-wildfire'];
test('tasha subclasses (task 7)', () => { for (const id of T7) expect(sub(id), id).toMatchObject({ book: 'tce' }); });
test('87 subclasses', () => expect(DATA.subclasses).toHaveLength(87));
test('every new feature and option names its book', () => { /* as batch 2 Task 5, with 'tce' */ });
test('twilight domain spells', () => expect(sub('twilight-domain').bonusSpells).toMatchObject({ kind: 'domain' }));
// Task 8: runes slot has 2 picks at fighter 3, and Hill Rune is not offered before 7
// Task 9 (Review Focus 5):
test('genie spells follow the kind', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 5, sub: 'the-genie' }], options: ['genie-kind-dao'] } as Character;
  const ids = pickableSpells(ch.classes[0], false, ch.options).map(p => p.spell.id);
  // spell ids below are from the inventory; confirm on p. 73
  expect(ids).toContain('spike-growth');
  expect(ids).toContain('phantasmal-force');
  expect(ids).not.toContain('scorching-ray');
});
```

  Task 9 widens the Task 4 signature to `pickableSpells(cc: CharClass, expanded = false, options: string[] = []): Pickable[]`, and the spells step passes `ch.options`.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract the group's pages and write the records** from the images.
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** with the group's message.

The reviewer checks at least 10 records against the page images, plus every option group's `picks` and every bonus-spell table.

---

### Task 10: Tasha's feats and Custom Lineage

**Files:**
- Modify:
  - `data/feats.json`, `data/features/feats.json`, `data/options.json`, `data/races.json`
  - `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json`
- Test: `tests/unit/races-feats-content.test.ts`, `tests/unit/options-content.test.ts`

**Interfaces:**
- Consumes: Task 2 (feat-owned groups) and Tasks 5-6 (Tasha's styles, Metamagic and invocations).
- **Feats** (pp. 79-81), with `book: "tce"`:
  - Chef, Crusher, Eldritch Adept, Fey Touched, Fighting Initiate, Metamagic Adept, Piercer, Poisoner, Shadow Touched, Slasher, Telekinetic, Telepathic.
  - That makes 42 feats in total.
  - Left out: Gunner, Skill Expert, and Artificer Initiate (batch 4).
- **Feat option groups:**
  - `fighting-initiate`: `from: "fighting-style"`, `only` = the fighter group's list, 1 pick.
  - `eldritch-adept`: `from: "eldritch-invocations"`, `only` = the invocations with no `prereq`, 1 pick.
  - `metamagic-adept`: `from: "metamagic"`, 2 picks.
- **Feat spells:**
  - Fey Touched: `misty-step`, plus a choose grant of a 1st-level divination or enchantment spell from all class lists.
  - Shadow Touched: `invisibility`, plus a 1st-level illusion or necromancy spell.
  - Telepathic: `detect-thoughts`.
  - Telekinetic: `mage-hand`.
  - Each carries `uses` per the page.
- **Custom Lineage:** `custom-lineage`, page 8, `book: "tce"`, no spells, no options. A player with it picks its feat in the Feats step.

- [ ] **Step 1: Write the failing tests**

```ts
test('tasha feats', () => {
  for (const id of ['chef', 'crusher', 'eldritch-adept', 'fey-touched', 'fighting-initiate', 'metamagic-adept', 'piercer', 'poisoner', 'shadow-touched', 'slasher', 'telekinetic', 'telepathic'])
    expect(DATA.feats.find(f => f.id === id), id).toMatchObject({ book: 'tce' });
  expect(DATA.feats).toHaveLength(42);
});
test('fey touched grants misty step and a choice', () => {
  const ft = DATA.feats.find(f => f.id === 'fey-touched')!;
  expect(ft.spells.map(g => g.spell)).toContain('misty-step');
  expect(ft.spells.find(g => g.choose)!.choose).toMatchObject({ level: 1, schools: expect.arrayContaining(['Divination', 'Enchantment']) });
});
test('fighting initiate shares the fighter pool', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'fighter', level: 1 }], feats: ['fighting-initiate'], options: ['fighting-style-defense'] } as Character;
  const slots = optionSlots(ch).filter(s => (s.group.from ?? s.group.id) === 'fighting-style');
  expect(slots).toHaveLength(2);
  expect(slots.flatMap(s => s.chosen)).toEqual(['fighting-style-defense']);   // counted once
  expect(slots.find(s => s.group.id === 'fighting-initiate')!.choices.map(f => f.id)).not.toContain('fighting-style-blessed-warrior');
});
test('eldritch adept offers only invocations with no prerequisite', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'wizard', level: 4 }], feats: ['eldritch-adept'] } as Character;
  for (const f of optionSlots(ch).find(s => s.group.id === 'eldritch-adept')!.choices) expect(f.prereq, f.id).toBeUndefined();
});
test('custom lineage', () => expect(DATA.races.find(r => r.id === 'custom-lineage')).toMatchObject({ book: 'tce', page: 8 }));
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pp. 7-8 and 79-81 and write the records.**
- [ ] **Step 4: Run to verify** — `npm test && npm run check:ocr -- feats && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Tasha's feats and Custom Lineage"`

---

### Task 11: End to end and release check

**Files:** Create `tests/e2e/tashas.spec.ts`. Modify `README.md` (counts).

- [ ] **Step 1: Write the e2e tests.**
  - **Browse:** Ranger, Level 1, Actions. The Ranger Actions section shows Favored Foe tagged `Optional`.
  - **Card:** opening Booming Blade ends with `Full rules: Tasha's p. 106`.
  - **Editor:**
    - A Ranger 1's options step shows the Favored Enemy separator.
    - Ticking Favored Foe removes it.
    - The character's Ranger Actions show Favored Foe.
  - **Expanded list:** a Cleric 5's spells step offers Aura of Vitality only after Additional Cleric Spells is ticked.
- [ ] **Step 2: Run** — `npm run e2e`. Expected: PASS.
- [ ] **Step 3: Run the whole-content checks.** Each must pass:
  - `npm test`
  - `npm run check:ocr` for every kind
  - `npm run build`
  - Total gzipped JS in `dist/assets` is at or under 450 KB. Record the number.
- [ ] **Step 4: Update the README counts:** 101 subclasses, 477 spells, 42 feats, and the Tasha's optional features.
- [ ] **Step 5: Commit** — `git commit -m "test: Tasha's end to end; docs: counts"`
