# Plan 6, Batch 2: The Rest of Xanathar's Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add everything a player picks from Xanathar's Guide to Everything that batch 1 didn't: its 22 other subclasses, all its spells and their class-list entries, its racial feats and its new Eldritch Invocations.

**Architecture:** Same pipeline as Plan 2 and batch 1. Spell facts are written into `scripts/extract/spell-nonsrd.json` with `book: "xge"` and an explicit page. Their own-words text goes in `spell-summaries.json` and their class lists in `spell-lists.json`, and `build:spells` merges them into `data/spells.json`. Everything else is hand-written in `data/*.json` from the page images. One small code change: a subclass can widen its class's spell list (Divine Soul uses the cleric list).

**Tech Stack:** Preact + TypeScript + Vite, Vitest, Playwright, Node 24 scripts with poppler.

**Spec:** `docs/superpowers/specs/2026-10-27-more-books-design.md` (section 4, batch 2), which extends `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md`.

## Global Constraints

The Global Constraints of `docs/superpowers/plans/2026-10-27-plan-5-batch-1-bg3-parity.md` apply unchanged:
- own words only;
- facts from the page image;
- book ids and labels;
- ids never change;
- summons rule;
- size ≤ 450 KB gzipped.

Also:
- **Xanathar's pages:** `npm run extract:pages -- <from> <to> xge` renders readable PNGs with pdftoppm. Book page = PDF page − 1. Chapter 3 (spells) starts on p. 147. The class spell lists are on pp. 147-149 and the spell descriptions on pp. 150 onward. The racial feats are on pp. 73-75 and the Eldritch Invocations on pp. 56-57.
- **Every new record carries `"book": "xge"`**, spells included.
- **Spell card style** is Amendment 2 of `docs/superpowers/plans/2026-10-21-plan-2-content.md`: 25-90 words, second person, digits, feet as "ft".
- **The in-scope rule for feats is unchanged** from base spec 4.1. Only feats that grant an action, bonus action or reaction, spend a resource or have limited uses, or grant spells are included. Passive feats are left out, and the report lists them.
- **Bonus spell modelling:**
  - Domain spells use kind `domain`, oath spells `oath`, and patron expanded lists `patron`.
  - Ranger "<Subclass> Magic" lists use `subclass`.
  - A choice between fixed spells uses an option group with option-gated grants. Examples are Land terrain, Arcane Archer Lore and the Divine Soul affinity.
  - A feature's own spell (Sun Soul's Searing Sunburst, the Celestial bonus cantrips) is a fixed grant on that feature, with any cost in `uses`.
- **No new spells from other books.** If a subclass grant names a spell missing from `data/spells.json` after Tasks 2-4, stop and report.

## Review Focus

1. **Divine Soul.** A Divine Soul sorcerer can pick from the cleric list in the editor and sees cleric spells in the browse view. A plain sorcerer sees neither. Pinned in Task 1.
2. **Bad damage dice.** A new spell with a damage summary must never crash its card. Every spell's `summary.damage.dice` parses with `diceRange`. Pinned in Task 2, and re-run by Tasks 3-4.
3. **New spells in choice grants.** New spells reach existing choice grants without data edits. Death Domain's Reaper offers Toll the Dead, and Ritual Caster / Book of Ancient Secrets offer Xanathar's rituals (e.g. Ceremony). Pinned in Task 4.
4. **Invocation prerequisites.** An invocation that needs a pact boon is offered only when that boon is chosen, like the PHB ones. Pinned in Task 8.
5. **Old saved characters.** A character saved before batch 2 still loads unchanged. Guarded by the existing frozen-code test (`tests/unit/character-code.test.ts`), which every task runs.

---

## File Structure

```
src/data/types.ts, src/data/validate.ts      SubclassDef.extraLists (Task 1)
src/logic/rules.ts                           listSpells() unions extraLists (Task 1)
src/logic/bonus.ts                           one shared bonus-kind label map (Task 1, replaces BONUS_TAG / BONUS_TITLE)
scripts/extract/spell-nonsrd.json            + Xanathar's spell facts (Tasks 2-4)
scripts/extract/spell-summaries.json         + their own-words text (Tasks 2-4)
scripts/extract/spell-lists.json             + their class-list entries (Tasks 2-4)
scripts/extract/spell-icons.json, icon-aliases.json   (Tasks 2-4)
data/spells.json                             built by `npm run build:spells`, never hand-edited
data/subclasses.json, data/options.json, data/features/<class>.json   (Tasks 5-8)
data/feats.json, data/features/feats.json    racial feats (Task 8)
tests/unit/spells-content.test.ts, subclasses-content.test.ts, races-feats-content.test.ts, options-content.test.ts
```

---

### Task 1: Subclass list widening and one bonus-label map

**Files:**
- Create: `src/logic/bonus.ts`
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/logic/rules.ts`, `src/logic/sections.ts`, `src/character/grants.ts`
- Test: `tests/unit/subclass.test.ts`, `tests/unit/sections.test.ts`, `tests/unit/editor.test.tsx`

**Interfaces:**
- Produces:

```ts
// types.ts — SubclassDef gains
extraLists?: ClassId[];   // class spell lists this subclass may also pick from (Divine Soul: ['cleric'])
// bonus.ts
export function bonusLabel(kind: NonNullable<SubclassDef['bonusSpells']>['kind'], sub: SubclassDef): string;
// 'Domain' | 'Oath' | 'Circle' | 'Patron' | sub.name for 'subclass'
```

- **`listSpells(c, s)`:** for a class caster, returns the class list plus every spell on any of `s.extraLists`, without duplicates and sorted the way the existing list is. A subclass caster (Eldritch Knight, Arcane Trickster) is unchanged.
- **Tags:** spells that come only from an extra list carry the tag `<Class> list` (e.g. `Cleric list`) in the browse view (`spellSections`) and in the character view (`classPlace`, where today they would read "Other list").
- **Bonus labels:** `sections.ts` (`BONUS_TAG`) and `grants.ts` (`BONUS_TITLE`) both switch to `bonusLabel`, so labels live in one place.
- **Validator:** every `extraLists` entry is a class id, and a subclass can't list its own class.
- **Test-only subclass:** until Task 7 adds `divine-soul`, test with an in-test copy of `wild-magic` that has `extraLists: ['cleric']`, passed through the function under test. Do not add fake records to `data/`.

- [ ] **Step 1: Write the failing tests**

```ts
test('extra lists widen the class list', () => {
  const sorc = DATA.classes.find(c => c.id === 'sorcerer')!;
  const ds = { ...DATA.subclasses.find(s => s.id === 'wild-magic')!, extraLists: ['cleric'] as ClassId[] };
  const ids = listSpells(sorc, ds).map(s => s.id);
  expect(ids).toContain('cure-wounds');            // cleric only
  expect(ids).toContain('fire-bolt');              // sorcerer
  expect(new Set(ids).size).toBe(ids.length);      // no duplicates
  expect(listSpells(sorc).map(s => s.id)).not.toContain('cure-wounds');
});
test('bonusLabel', () => {
  const sub = DATA.subclasses.find(s => s.id === 'swarmkeeper')!;
  expect(bonusLabel('subclass', sub)).toBe('Swarmkeeper');
  expect(bonusLabel('domain', sub)).toBe('Domain');
});
// validate.test.ts: extraLists ['sorcerer'] on a sorcerer subclass, and ['nope'], each give an error
```

  Task 7 adds the browse-view and editor assertions for the real `divine-soul`.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** the type, validator, `listSpells` union, tags, `bonus.ts`, and the two call-site switches.
- [ ] **Step 4: Run to verify** — `npm test && npm run build && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: subclasses can widen a spell list; one bonus label map"`

---

### Tasks 2-4: Xanathar's spells, in three level bands

| Task | Levels | Commit message |
|---|---|---|
| 2 | cantrips and 1st | `feat: Xanathar's spells, cantrips and level 1` |
| 3 | 2nd to 4th | `feat: Xanathar's spells, levels 2-4` |
| 4 | 5th to 9th | `feat: Xanathar's spells, levels 5-9` |

**Files (each task):**
- Modify: `scripts/extract/spell-nonsrd.json`, `scripts/extract/spell-summaries.json`, `scripts/extract/spell-lists.json`, `scripts/extract/spell-icons.json`, `scripts/extract/icon-aliases.json`, `data/spells.json` (built), `scripts/extract/ocr-accept.json` (only with reasons)
- Test: `tests/unit/spells-content.test.ts`

**Interfaces:**
- Consumes: the batch 1 `book` field on `Spell` (`SpellFacts` carries it through `build:spells`).
- Produces: every Xanathar's spell of the band in `data/spells.json`, on the class lists the book gives (pp. 147-149), with `book: "xge"` and its page.

**Per spell:**
- **Facts entry** in `spell-nonsrd.json`, shaped like the existing ones:
  - `id`, `name`, `level`, `school`;
  - `cast` (cost, text, and the trigger for reactions);
  - `range`, `duration`, `concentration`, `ritual`;
  - `components`, with `m.costGp` and `consumed` where the book gives them;
  - `page`, `book: "xge"` and `classes: []`. `classes` gets filled from `spell-lists.json`.
  - `summary`: resolution, save, damage and upcast. Damage `dice` must be a plain `NdM` or `NdM+K` that `diceRange` parses.
- **Summary** in `spell-summaries.json`: `description`, plus `higherLevels` and `material` where the book has them.
- **List names:** the book's spell names, added to each class in `spell-lists.json`.
- **Spells named after a wizard** keep the book name, e.g. "Melf's Minute Meteors" becomes `melfs-minute-meteors`.
- **Pipeline order:** `npm run extract:facts` → `npm run extract:lists` → `npm run extract:icons` → `npm run build:spells`. Never edit `data/spells.json` by hand.
- **Count assertions:** each task updates `every PHB spell is built` into a total count. 361 plus the spells added so far, and the report states the number.

- [ ] **Step 1: Write the failing tests** (Task 2's version; Tasks 3 and 4 swap in their band's ids)

```ts
const xge = DATA.spells.filter(s => s.book === 'xge');
test('xanathar band built', () => {
  // Task 3 ids: 'dragons-breath', 'shadow-blade', 'catnap', 'thunder-step', 'summon-greater-demon', 'sickening-radiance'
  // Task 4 ids: 'synaptic-static', 'steel-wind-strike', 'mass-polymorph', 'psychic-scream'
  for (const id of ['toll-the-dead', 'ice-knife', 'catapult', 'chaos-bolt', 'absorb-elements', 'word-of-radiance'])
    expect(DATA.spells.find(s => s.id === id), id).toMatchObject({ book: 'xge', textSource: 'summary' });
});
test('every spell damage line parses', () => {
  for (const s of DATA.spells) if (s.summary?.damage) expect(() => diceRange(s.summary!.damage!.dice), s.id).not.toThrow();
});
test('xanathar spells are on class lists', () => { for (const s of xge) expect(s.classes.length, s.id).toBeGreaterThan(0); });
test('toll the dead facts', () => expect(DATA.spells.find(s => s.id === 'toll-the-dead')).toMatchObject({ level: 0, school: 'Necromancy', summary: { resolution: 'save', save: 'wis' } }));
```

  - The listed ids come from memory, not the book. Use the book's names, and confirm every fact on the page.
  - A listed spell that turns out to be in another band moves to that band's test.
  - Task 4 adds Review Focus 3:

```ts
test('new spells reach choice grants', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'cleric', level: 1, sub: 'death-domain' }] } as Character;
  expect(grantSlots(ch).find(s => s.key.startsWith('sub:death-domain'))!.candidates.map(s => s.id)).toContain('toll-the-dead');
});
// and: a ritual-only choose grant (Ritual Caster or Book of Ancient Secrets) lists 'ceremony'
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pages.** Run `npm run extract:pages -- 147 172 xge` (Task 2 does this once; later tasks reuse the cache). Confirm the last spell page on the image.
- [ ] **Step 4: Write facts, summaries and list entries** for the band from the page images. Then run the pipeline.
- [ ] **Step 5: Run to verify.** Run `npm test && npm run check:ocr -- spells && npm run build`. Expected: PASS. Any check:ocr failure must have a reasoned entry in `ocr-accept.json`.
- [ ] **Step 6: Commit** with the band's message.

Each task's reviewer checks at least 10 spells of the band against the page images, including every spell with a damage line in a random sample.

---

### Tasks 5-7: Xanathar's subclasses (22), in three groups

| Task | Subclasses (id) | Start pages (confirm on the image) | Commit message |
|---|---|---|---|
| 5 | `path-of-the-ancestral-guardian` 9, `path-of-the-storm-herald` 10, `path-of-the-zealot` 11, `college-of-whispers` 16, `forge-domain` 18, `grave-domain` 19, `circle-of-dreams` 22, `circle-of-the-shepherd` 23 | as listed | `feat: Xanathar's subclasses, barbarian to druid` |
| 6 | `cavalier` 30, `samurai` 31, `way-of-the-kensei` 34, `way-of-the-sun-soul` 35, `oath-of-conquest` 37, `oath-of-redemption` 38, `horizon-walker` 42, `monster-slayer` 43 | as listed | `feat: Xanathar's subclasses, fighter to ranger` |
| 7 | `inquisitive` 45, `mastermind` 46, `scout` 47, `divine-soul` 50, `the-celestial` 54, `war-magic` 59 | as listed | `feat: Xanathar's subclasses, rogue to wizard` |

The start pages come from memory. The first page image of each subclass decides. The page shown on the card is the page of each feature's own heading.

**Files (each task):** `data/subclasses.json`, `data/options.json`, `data/classes.json` (only if a class `options` list changes), `data/features/<class>.json`, `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json` (only with reasons). Test: `tests/unit/subclasses-content.test.ts`.

**Interfaces:**
- Consumes: Task 1 `extraLists` and `bonusLabel`. Tasks 2-4 spells are not expected to be needed (all known subclass grants are PHB spells).
- Produces: subclass records with `book: "xge"`. Total subclasses: 66 after Task 5, 74 after Task 6, 80 after Task 7.

**Modelling decisions:**
- **Grave and Forge:** `domain`.
- **Conquest and Redemption:** `oath`.
- **Horizon Walker and Monster Slayer:** `subclass` ("… Magic" lists).
- **The Celestial:** `patron` for the expanded list. Its bonus cantrips are fixed grants on the feature that gives them.
- **Divine Soul:**
  - `extraLists: ['cleric']`.
  - The Divine Magic affinity is an option group `divine-magic-affinity` with one passive option per affinity and option-gated grants on `bonusSpells` (kind `subclass`).
  - Favored by the Gods is a usable feature.
- **Way of the Sun Soul:** Searing Sunburst and Searing Arc Strike follow the book. A spell cast with ki is a fixed grant with its ki cost in `uses`.
- **Choices the player makes once** (e.g. Kensei weapons, Storm Herald environment, Ancestral Guardian…) become option groups only where the choice changes what the player does on their turn. Otherwise the choice goes in the feature's description.
- **Summons** follow the Global Constraint, e.g. Circle of the Shepherd's spirit totems and Oath of Redemption have none, but check.

- [ ] **Step 1: Write the failing tests** (Task 5's version; Tasks 6-7 use their ids and counts)

```ts
const T5 = ['path-of-the-ancestral-guardian', 'path-of-the-storm-herald', 'path-of-the-zealot', 'college-of-whispers', 'forge-domain', 'grave-domain', 'circle-of-dreams', 'circle-of-the-shepherd'];
test('xanathar subclasses (task 5)', () => { for (const id of T5) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('66 subclasses', () => expect(DATA.subclasses).toHaveLength(66));
test('every new feature and option names its book', () => {
  const ids = new Set(T5);
  const groups = new Set(DATA.optionGroups.filter(g => g.owner.kind === 'subclass' && ids.has(g.owner.id)).map(g => g.id));
  for (const f of DATA.features.filter(x => (x.source.kind === 'subclass' && ids.has(x.source.id)) || (x.source.kind === 'option' && groups.has(x.source.id))))
    expect(f.book, f.id).toBe('xge');
});
test('grave domain spells', () => expect(sub('grave-domain').bonusSpells).toMatchObject({ kind: 'domain' }));
// Task 7 adds:
test('divine soul widens to the cleric list', () => {
  expect(sub('divine-soul').extraLists).toEqual(['cleric']);
  const lvl1 = spellSections('sorcerer', 1, 'divine-soul').find(s => s.id === 'lvl-1')!;
  expect(lvl1.items.map(s => s.id)).toContain('cure-wounds');
  expect(lvl1.tags!['bless']).toBeDefined();               // 'Cleric list' or the affinity tag
  expect(spellSections('sorcerer', 1).find(s => s.id === 'lvl-1')!.items.map(s => s.id)).not.toContain('cure-wounds');
});
// Task 7 also adds an editor test: a Divine Soul sorcerer's spells step offers Cure Wounds.
```

  If a subclass's feature names make good must-have ids, add them. As in batch 1, the book's name wins, and passive features are dropped from tests. Say so in the report.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract the group's pages and write the records** from the images.
- [ ] **Step 4: Run to verify.** Run `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** with the group's message.

Each task's reviewer checks at least 10 records against the page images, plus every option group's `picks` and every bonus-spell table.

---

### Task 8: Racial feats and Eldritch Invocations

**Files:** `data/feats.json`, `data/features/feats.json`, `data/features/warlock.json`, `data/options.json` (only if a new group is needed), `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json`. Test: `tests/unit/races-feats-content.test.ts`, `tests/unit/options-content.test.ts`.

**Interfaces:**
- Produces:
  - The in-scope racial feats of pp. 73-75, as `FeatDef` plus their usable features. `prereq` holds the book's race prerequisite as text. Feat spells are grants (e.g. Fey Teleportation's Misty Step, Wood Elf Magic, Drow High Magic).
  - Every new Eldritch Invocation of pp. 56-57 as an option feature of `eldritch-invocations`, with id `eldritch-invocations-<name>`. Each carries `prereq.level`, `prereq.option` (pact boon) and `prereq.text` as the book gives them. Spell-granting invocations carry fixed grants with `uses`.
- **Leave out these feats** under the in-scope rule, and name them in the report: Elven Accuracy, Prodigy, Squat Nimbleness, Infernal Constitution and Dragon Hide. Dragon Hide is the exception if its claws count as an attack the player chooses to make; decide from the page and say why.

- [ ] **Step 1: Write the failing tests**

```ts
test('xanathar racial feats', () => {
  for (const id of ['bountiful-luck', 'dragon-fear', 'drow-high-magic', 'fade-away', 'fey-teleportation', 'second-chance', 'wood-elf-magic'])
    expect(DATA.feats.find(f => f.id === id), id).toMatchObject({ book: 'xge' });
});
test('fey teleportation grants misty step', () =>
  expect(DATA.feats.find(f => f.id === 'fey-teleportation')!.spells.map(g => g.spell)).toContain('misty-step'));
test('xanathar invocations need their pact', () => {
  const inv = DATA.features.filter(f => f.source.id === 'eldritch-invocations' && f.book === 'xge');
  expect(inv.length).toBeGreaterThanOrEqual(10);
  const blade = inv.filter(f => f.prereq?.option === 'pact-boon-pact-of-the-blade');
  expect(blade.length).toBeGreaterThan(0);
  const ch = { ...emptyCharacter(), classes: [{ cls: 'warlock', level: 12 }], options: ['pact-boon-pact-of-the-chain'] } as Character;
  const offered = optionSlots(ch).find(s => s.group.id === 'eldritch-invocations')!.choices.map(f => f.id);
  for (const f of blade) expect(offered, f.id).not.toContain(f.id);
});
```

  - These ids come from memory. Use the book's names.
  - Use the real pact-boon option ids from `data/features/warlock.json`.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pp. 56-57 and 73-75 and write the records.**
- [ ] **Step 4: Run to verify.** Run `npm test && npm run check:ocr -- feats && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Xanathar's racial feats and invocations"`

---

### Task 9: End to end and release check

**Files:** Create `tests/e2e/xanathars.spec.ts`. Modify `README.md` (counts).

- [ ] **Step 1: Write the e2e tests.**
  - **Browse:** Sorcerer, Level 1, Divine Soul, Spells. Level 1 shows Cure Wounds.
  - **Card:** opening Toll the Dead ends with `Full rules: Xanathar's p. <its page>`.
  - **Editor:** a Warlock 5 with Pact of the Blade is offered an Xanathar's blade-pact invocation. With Pact of the Chain, it isn't.
- [ ] **Step 2: Run** — `npm run e2e`. Expected: PASS.
- [ ] **Step 3: Run the whole-content checks.** Each must pass:
  - `npm test`
  - `npm run check:ocr` for every kind
  - `npm run build`
  - Total gzipped JS in `dist/assets` is at or under 450 KB. Record the number.
- [ ] **Step 4: Update the README counts:** subclasses, spells and feats.
- [ ] **Step 5: Commit** — `git commit -m "test: Xanathar's end to end; docs: counts"`
