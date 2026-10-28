# Plan 8, Batch 4: The Artificer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Artificer as the 13th class:
- its class record, spell list, class features and infusions;
- its 4 subclasses (Alchemist, Armorer, Artillerist, Battle Smith) with their specialist spells;
- the Artificer Initiate feat;
- its look: silver-and-brass colours, a gear-train spell-row motif, and a tinker's-line background with sparks.

**Architecture:**
- **Content:** same pipeline as batches 2-3. The class, subclasses, options and features are hand-written in `data/*.json` from the page images. The spell list goes in `scripts/extract/spell-lists.json` and reaches `data/spells.json` only through `extract:lists` + `build:spells`. All 95 artificer spells already exist, so no new spell records.
- **Infusions** are an option pool like Eldritch Invocations. **Armor Model** is a subclass-owned pool like Battle Master maneuvers. Model-specific features are gated with `prereq.option`, the way `deft-explorer-tireless` is.
- **Specialist spells** use the existing `bonusSpells.kind: "subclass"` (auto-granted, not counted, tagged with the subclass name).
- **Motion:** the engine gains two part kinds. `spin` is a group that turns for the whole cycle. `spark` is a short burst rendered on an unmasked layer above the background. Both are generator data like the existing parts. The generators are lifted from the approved mockups.

**Tech Stack:** Preact + TypeScript + Vite, Vitest, Playwright, Node 24 scripts with poppler.

**Spec:** `docs/superpowers/specs/2026-10-27-more-books-design.md`: section 4 (batch 4), section 5 (data changes) and section 7 (the Artificer's look). It extends `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` (base spec; section 7.5 = motion modes).

**Inventory:** `docs/superpowers/plans/2026-10-28-plan-8-artificer-inventory.md`. It was read off the page images on 2026-10-28 and lists the class table, spell list (with ids), features, infusions, subclass tables and stat-block pages, with no rules text. Use it to find things. The page image still decides every fact on a card.

**Mockups (approved look, reference code):** `docs/superpowers/mockups/artificer-look.html` (colour, option B; row motif, option B "Gear train") and `docs/superpowers/mockups/artificer-bg.html` (background, option A "Tinker's line", sparks from the screen edges). Their generator code (`gearPts`, `gear`, `hammerLocal`, `gogglesD`, `rowTrain`, `sparks`, `bgTinker`) can be lifted and adapted to the app's pure `Gen = (W, H, rnd) => Part[]` shape (no DOM, no `Math.random`: use `rnd`).

## Global Constraints

The Global Constraints of `docs/superpowers/plans/2026-10-27-plan-5-batch-1-bg3-parity.md` apply unchanged:
- own words only (no run of 8+ words matching the page; `check:ocr` enforces it; never write out rules text in files, messages or reports);
- facts come from the page image, never from memory;
- book ids and card labels (`Full rules: Tasha's p. N`);
- ids never change;
- summons rule;
- size ≤ 450 KB gzipped.

The batch 2 constraints on spell card style, the in-scope feat rule and bonus-spell modelling also apply (`docs/superpowers/plans/2026-10-27-plan-6-batch-2-xanathars.md`).

Also:
- **Tasha's pages:** `npm run extract:pages -- <from> <to> tce`. Book page = PDF page − 1. Pages 9-23 and 79 are in `.cache/tce/` already (git-ignored; re-extract if missing). The OCR is noisy; use it to locate things only.
- **Every new record carries `"book": "tce"`.**
- **Never hand-edit `data/spells.json`.** Rerun order: `npm run extract:lists`, `npm run extract:icons`, `npm run build:spells`, `npm run check:ocr`.
- **Stat blocks:** Steel Defender → "Stat block: Tasha's p. 19"; Homunculus Servant → "Stat block: Tasha's p. 22". The Eldritch Cannon has no stat block; its card carries the few numbers a player needs (AC, HP, range), from pp. 17-18.
- **In scope:** what a player uses on a turn, plus picks (base spec rule). Out (passive or rebuild-only): The Right Tool for the Job, Tool Expertise, Magic Item Adept, Magic Item Savant, Magic Item Master, every Tool Proficiency / Tools of the Trade, Battle Ready, Extra Attack, Armor Modifications, Fortified Position, Improved Defender (its numbers go into the scaling of the cards it changes), and Infuse Item itself (its picks are the infusions). Each implementer's report names what it left out.
- **Ids** (name slugs; checked for collisions by the validator):
  - class `artificer`; subclasses `alchemist`, `armorer`, `artillerist`, `battle-smith`;
  - option groups `infusions` (class-owned) and `armor-model` (owned by `armorer`); options `infusions-<slug>` (e.g. `infusions-enhanced-defense`, `infusions-replicate-magic-item`) and `armor-model-guardian`, `armor-model-infiltrator`;
  - features: name slug (e.g. `flash-of-genius`, `steel-defender`, `arcane-jolt`); if a slug already exists, prefix `artificer-`;
  - feat `artificer-initiate`.
- **Colours** come only from theme tokens in `src/styles/themes/faerun.css` (`tests/unit/no-stray-colours.test.ts` fails on any colour literal under `src/` outside `src/styles/themes/`). Exact values (spec section 7): `--artificer:#a7acb2`, `--artificer-line:#d8dde2`, `--artificer-row-o:.5`, `--artificer-bg-o:.26`, `--artificer-accent:#d9a441`, `--artificer-spark:#ffd27a`, `--artificer-spark-glow:#ffb347`.
- **Motion modes** (base spec 7.5): Off renders no motif; reduced motion renders one static frame: no spin, no sparks.

## Review Focus

1. **Old saved characters and codes load unchanged.** No existing id changes. The frozen-code test in `tests/unit/character-code.test.ts` runs in every task.
2. **A half caster that casts at level 1.** An Artificer 1 has 2 cantrips and 1st-level spells (paladin and ranger have neither at 1). The menu lights Cantrips and Level 1. The editor's prepared limit is Int + half the level rounded down, minimum 1 (Int +3 at level 1 → 3; level 5 → 5). Pinned in Task 1.
3. **Heal above the artificer's ceiling.** An Alchemist 15 gets Heal (6th level) from Chemical Mastery. It shows on the character's Level 6 Spells page, and that menu row is lit, not dimmed, the same way a granted cantrip lights the Cantrips row. Pinned in Task 3.
4. **Armor model gating.** A Guardian Armorer sees Thunder Gauntlets and Defensive Field and never the Infiltrator's Lightning Launcher. Switching the model swaps them. With no character, browse shows both models' features. Pinned in Task 3.
5. **Motion modes and colours.** With reduced motion, the Artificer row and background draw one still frame with no running spin animation and no sparks. Off draws nothing. The spark layer is not under the background mask. No colour literal leaves the theme file. Pinned in Tasks 5-6.
6. **The 13-tile start screen** fits at 320 px with no horizontal scroll, and the 12 PHB tiles keep their places. Pinned in Task 1 (unit) and Task 7 (e2e).

---

## File Structure

```
src/data/types.ts, src/data/validate.ts        'artificer' in ClassId / CLASS_IDS (Task 1)
data/classes.json                               artificer record (Task 1)
scripts/extract/spell-lists.json                artificer list, 95 names (Task 1) -> data/spells.json via build
data/feats.json, data/features/feats.json       artificer-initiate; artificer added to any-class feat lists (Task 1)
public/icons/class-artificer.svg (+ CREDITS)    class icon, game-icons.net, colours baked in (Task 1)
src/ui/screens/Start.tsx, src/styles/screens.css 13th tile (Task 1)
src/styles/themes/faerun.css                    artificer tokens (Task 1)
data/options.json                               infusions (Task 2), armor-model (Task 3)
data/features/artificer.json                    class features + infusions (Task 2), subclass features (Tasks 3-4)
data/subclasses.json                            4 subclasses (Tasks 3-4)
src/logic/menu.ts                               spell-level rows lit by granted spells (Task 3)
src/motion/types.ts, parts.ts, engine.ts        'spin' and 'spark' parts (Task 5)
src/motion/rowMotifs.ts                         artificer gear train (Task 5)
src/motion/bgMotifs.ts, src/ui/Background.tsx   tinker's line + spark layer (Task 1 placeholder, Task 6 real)
src/styles/motion.css                           .acc / .accf / .spark / .fx-sparks (Tasks 5-6)
tests/e2e/artificer.spec.ts, README.md          (Task 7)
```

---

### Task 1: The class, its spell list, its icon and tile, and Artificer Initiate

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `data/classes.json`, `scripts/extract/spell-lists.json` (then rebuild `data/spells.json`), `data/feats.json`, `data/features/feats.json`, `src/styles/themes/faerun.css`, `src/ui/screens/Start.tsx`, `src/styles/screens.css`, `src/motion/bgMotifs.ts` (placeholder entry), `public/icons/fallback/CREDITS.txt`, `tests/e2e/browse.spec.ts` (its "unknown class" test uses `artificer` as the bogus id: change it to another unknown id)
- Create: `public/icons/class-artificer.svg`
- Test: `tests/unit/classes-content.test.ts`, `tests/unit/spells-content.test.ts`, `tests/unit/spell-facts.test.ts`, `tests/unit/races-feats-content.test.ts`, `tests/unit/menu.test.ts`, `tests/unit/editor.test.tsx`, `tests/unit/screens.test.tsx`, `tests/unit/themes.test.ts`, `tests/unit/motion-bg.test.ts`

**Interfaces:**
- Produces: `ClassId` includes `'artificer'`. `CLASS_IDS` gets `'artificer'` **appended last** (not alphabetical). That keeps the 12 PHB tiles where players know them, and puts Artificer last in the editor's class list too. `classes.json` gets the record appended last.
- **Class record** (values from the inventory section 1, checked against the p. 10 table image):
  - `caster: "half"`, `spellAbility: "int"`, `prepared: {"half": true}`, `subclassLevel: 3`, `subclassLabel: "Artificer Specialist"`, `options: ["infusions"]` (the group arrives in Task 2; until then leave `options: []` and add it in Task 2);
  - `cantripsKnown: [2,2,2,2,2,2,2,2,2,3,3,3,3,4,4,4,4,4,4,4]`;
  - `maxSpellLevel: [1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5]`;
  - `hotbarIcon` and `plainIcon`: `"icons/class-artificer.svg"` (relative; the app's base is `./`).
  - The existing prepared formula (`src/character/derive.ts`: Int + `floor(level/2)`, min 1) matches the book. No code change.
- **Spell list:** an `"artificer"` key in `scripts/extract/spell-lists.json` with the 95 spells of inventory section 5, written in that file's display-name style. Then run `extract:lists`, `extract:icons`, `build:spells`. Spell count stays 477.
- **Artificer Initiate** (p. 79; inventory section 8): `book: "tce"`, no prereq, `spells`:
  - `{"choose": {"lists": ["artificer"], "level": 0, "count": 1}, "atLevel": 1}`;
  - `{"choose": {"lists": ["artificer"], "level": 1, "count": 1}, "atLevel": 1, "uses": <once per long rest without a slot, as Fey Touched words it>}`.
  - A feat card in `data/features/feats.json` in the style of the other feat cards. Feats total 43.
- **Any-class feat grants:** a feat `choose` grant whose page puts no class limit on the spell (check each against its page; Fey Touched and Shadow Touched at least) gets `"artificer"` added to its `lists`. Grants whose page names classes (Magic Initiate, Ritual Caster, Spell Sniper) stay as they are.
- **Theme:** the seven tokens of Global Constraints in `faerun.css`, on the artificer line in the existing style; add them to the token list in `themes.test.ts`.
- **Icon:** a gear-and-tool icon from game-icons.net (e.g. Lorc's "gear-hammer"; any CC BY 3.0 gear-and-tool glyph), black background removed, glyph in `#d8dde2` with brass `#d9a441` details baked into the SVG, the same way the fallback icons are prepared (see `public/icons/fallback/CREDITS.txt`). Add a CREDITS line.
- **Start screen:** the 13th tile is centred on its own last row at normal tile width (not full width). Make it CSS-only in `screens.css`, e.g. `.tiles > .tile:nth-child(13)` placed on both columns with `justify-self: center` and the width of one column.
- **Placeholder background:** `BG_MOTIFS.artificer` returns `BG_MOTIFS.none(W, H, rnd)` until Task 6. TypeScript requires the key.

- [ ] **Step 1: Write the failing tests**

```ts
// classes-content
test('13 classes, artificer last', () => {
  expect(DATA.classes.map(c => c.id)).toEqual(CLASS_IDS);
  expect(CLASS_IDS.at(-1)).toBe('artificer');
  expect(DATA.classes.find(c => c.id === 'artificer')).toMatchObject({ caster: 'half', spellAbility: 'int', subclassLevel: 3 });
});
// spells-content
test('artificer list', () => {
  expect(DATA.spells.filter(s => s.classes.includes('artificer'))).toHaveLength(95);
  expect(f('cure-wounds').classes).toContain('artificer');
  expect(f('tashas-caustic-brew').classes).toContain('artificer');
  expect(f('fireball').classes).not.toContain('artificer');
});
// menu: Review Focus 2
test('artificer 1 casts', () => {
  const rows = menuRows('artificer', 1);
  expect(rows.find(r => r.kind === 'cantrips')!.dimmed).toBe(false);
  expect(rows.find(r => r.label === 'Level 1 Spells')!.dimmed).toBe(false);
  expect(rows.find(r => r.label === 'Level 2 Spells')!.dimmed).toBe(true);
});
// races-feats-content: the batch 3 assertion that artificer-initiate is undefined flips
test('artificer initiate', () => {
  expect(DATA.feats.find(f => f.id === 'artificer-initiate')).toMatchObject({ book: 'tce', page: 79 });
  expect(DATA.feats).toHaveLength(43);
});
```

Also:
- an editor test: Artificer 1 with Int modifier 3 shows a prepared limit of 3; at level 5, 5;
- a screens test: the start screen renders 13 tiles, the last is Artificer, the first is still Barbarian;
- `motion-bg.test.ts`: add `'artificer'` to `KEYS`.

- [ ] **Step 2: Run to verify they fail.** `npx vitest run tests/unit/classes-content.test.ts tests/unit/spells-content.test.ts tests/unit/menu.test.ts tests/unit/races-feats-content.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the type, record, list, feat, tokens, icon, tile and placeholder above.
- [ ] **Step 4: Verify** — `npm test && npm run check:ocr -- feats && npm run build && npm run e2e`. Expected: PASS. Update count-based assertions you break (`cure-wounds` classes in `spell-facts.test.ts`, feat totals) and list them in the report.
- [ ] **Step 5: Commit** — `git commit -m "feat: artificer class, spell list and Artificer Initiate"`

---

### Task 2: Class features and infusions

**Files:**
- Create: `data/features/artificer.json`
- Modify: `data/options.json`, `data/classes.json` (artificer `options: ["infusions"]`), `scripts/extract/icon-aliases.json` and `scripts/extract/ocr-accept.json` only if needed (with reasons)
- Test: `tests/unit/options-content.test.ts`, `tests/unit/classes-content.test.ts`

**Interfaces:**
- Consumes: Task 1's class record.
- **Group** `infusions`: `{"id": "infusions", "name": "Artificer Infusions", "owner": {"kind": "class", "id": "artificer"}, "picks": [0,4,4,4,4,6,6,6,6,8,8,8,8,10,10,10,10,12,12,12]}` (Infusions Known column, p. 10).
- **16 options** (inventory section 7, pp. 20-23), `source: {"kind": "option", "id": "infusions"}`. Each has `level` 2 or its prerequisite level (6, 10, 14) and `prereq.text` with the item it goes on. `cost` is what the holder spends: bonus for Boots of the Winding Path, reaction for Mind Sharpener and Repulsion Shield, action for Spell-Refueling Ring, bonus for the Homunculus Servant command; otherwise the page decides, and pure item bonuses are `passive`. Cards carry `uses` for charges where the page gives them.
  - **Replicate Magic Item** is one option, `infusions-replicate-magic-item`. Its card lists the replicable item names per artificer level (2/6/10/14), names only, from the p. 23 tables, and says it can be learned more than once. The editor counts it once (known gap, my call).
  - **Homunculus Servant:** "Stat block: Tasha's p. 22".
- **Class features** (`source: {"kind": "class", "id": "artificer"}`), each from its page:
  - `magical-tinkering`: level 1, action (p. 11);
  - `flash-of-genius`: level 7, reaction, uses = Int modifier (min 1) per long rest (p. 13);
  - `spell-storing-item`: level 11, action (the holder produces the spell); uses = twice Int (min 2) per long rest store (pp. 13-14);
  - `soul-of-artifice`: level 20, reaction (the drop-to-0 part), with the passive save bonus as one description line (p. 14).

- [ ] **Step 1: Write the failing tests**

```ts
test('infusions', () => {
  const g = DATA.options.find(o => o.id === 'infusions')!;
  expect(g.picks).toEqual([0,4,4,4,4,6,6,6,6,8,8,8,8,10,10,10,10,12,12,12]);
  expect(poolOptions('infusions')).toHaveLength(16);
  expect(DATA.features.find(f => f.id === 'infusions-boots-of-the-winding-path')).toMatchObject({ level: 6, cost: 'bonus', book: 'tce' });
});
test('artificer 2 offers level-2 infusions only', () => {
  const ch = { ...emptyCharacter(), classes: [{ cls: 'artificer', level: 2 }] } as Character;
  const slot = optionSlots(ch).find(s => s.group.id === 'infusions')!;
  expect(slot.count).toBe(4);
  for (const f of slot.choices) expect(f.level, f.id).toBe(2);
});
test('artificer class features', () => {
  for (const [id, level, cost] of [['magical-tinkering', 1, 'action'], ['flash-of-genius', 7, 'reaction'], ['spell-storing-item', 11, 'action'], ['soul-of-artifice', 20, 'reaction']] as const)
    expect(DATA.features.find(f => f.id === id), id).toMatchObject({ level, cost, book: 'tce', source: { kind: 'class', id: 'artificer' } });
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Write the records** from the page images (pp. 11-14, 20-23).
- [ ] **Step 4: Verify** — `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: artificer class features and infusions"`

---

### Task 3: Alchemist and Armorer

**Files:**
- Modify: `data/subclasses.json`, `data/options.json`, `data/features/artificer.json`, `src/logic/menu.ts`
- Test: `tests/unit/subclasses-content.test.ts`, `tests/unit/menu.test.ts`, `tests/unit/character-view.test.ts`, `tests/unit/sections.test.ts`

**Interfaces:**
- Consumes: Task 2's `data/features/artificer.json`.
- **Subclasses:** `alchemist` (page 14) and `armorer` (page 15), `cls: "artificer"`, `book: "tce"`, `bonusSpells: {"kind": "subclass", "grants": [...]}` at artificer levels 3/5/9/13/17 with the spells of inventory section 6.
- **Alchemist features** (pp. 14-15):
  - `experimental-elixir`: level 3, action, with a scaling row for free elixirs per long rest (1 / 2 at 6 / 3 at 15) and the six effects as description lines (numbers from the table);
  - `alchemical-savant`: level 5, free (a rider on a spell cast through alchemist's supplies);
  - `restorative-reagents`: level 9, action, `spells: [{"spell": "lesser-restoration", "atLevel": 9, "uses": <Int modifier (min 1) per long rest, no slot>}]`; the temporary-HP rider for elixirs is a description line;
  - `chemical-mastery`: level 15, action, `spells` granting `greater-restoration` and `heal` at 15, each `uses` once per long rest with no slot; the resistances are one description line.
- **Armorer:**
  - `arcane-armor`: level 3, action (p. 15-16);
  - group `armor-model`: `{"id": "armor-model", "name": "Armor Model", "owner": {"kind": "subclass", "id": "armorer"}, "picks": [0,0,1,1,...,1]}`, listed in the subclass's `options`. Options `armor-model-guardian` and `armor-model-infiltrator`, level 3, passive, each describing its model in a line or two (p. 16);
  - model features gated by `prereq: {"option": "armor-model-guardian" | "armor-model-infiltrator"}`, the way `deft-explorer-tireless` is gated:
    - Guardian: `thunder-gauntlets` (level 3, action), `defensive-field` (level 3, bonus, uses = proficiency bonus per long rest, scaling temp HP = artificer level), `perfected-armor-guardian` (level 15, reaction, uses = proficiency bonus per long rest);
    - Infiltrator: `lightning-launcher` (level 3, action, with the once-per-turn extra die as a line), `perfected-armor-infiltrator` (level 15, free).
- **Menu (`menuRows` in `src/logic/menu.ts`):** a `Level N Spells` row is lit when `n <= max` **or** the subclass or a class/subclass feature grants a spell of level `n` by this level. Same rule as the existing `granted` check for cantrips; generalise it to a per-level check. Chemical Mastery's Heal (level 6) lights Level 6 for an Alchemist 15. Write it so non-artificer classes are unaffected unless they have such a grant.

- [ ] **Step 1: Write the failing tests**

```ts
test('alchemist 15 has heal on level 6', () => {
  expect(menuRows('artificer', 15, 'alchemist').find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(false);
  expect(menuRows('artificer', 15, 'armorer').find(r => r.label === 'Level 6 Spells')!.dimmed).toBe(true);
});
test('armor model gates its features', () => {
  const g = { ...emptyCharacter(), classes: [{ cls: 'artificer', level: 3, sub: 'armorer' }], options: ['armor-model-guardian'] } as Character;
  const ids = classActions(g).flatMap(s => s.items.map(i => i.id));
  expect(ids).toContain('defensive-field');
  expect(ids).not.toContain('lightning-launcher');
});
test('browse shows both models', () => {
  const ids = actionSections('artificer', 3, 'armorer').flatMap(s => s.items.map(i => i.id));
  expect(ids).toEqual(expect.arrayContaining(['thunder-gauntlets', 'lightning-launcher']));
});
```

Use the real helper names and character shapes from the existing tests (`classActions` and `actionSections` are the existing view functions; check their signatures). Also add a character-view test that an Alchemist 15's Level 6 spells include `heal`, tagged with the feature's uses. The subclass count goes to 103.

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Write the records and the menu change.**
- [ ] **Step 4: Verify** — `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: alchemist and armorer"`

---

### Task 4: Artillerist and Battle Smith

**Files:**
- Modify: `data/subclasses.json`, `data/features/artificer.json`
- Test: `tests/unit/subclasses-content.test.ts`

**Interfaces:**
- **Subclasses:** `artillerist` (page 17) and `battle-smith` (page 18, features on pp. 19-20), as in Task 3. Subclasses total 105.
- **Artillerist** (pp. 17-18):
  - `eldritch-cannon`: level 3, action (create; once per long rest free, else a spell slot), with the cannon's AC/HP/range facts and its three types in a line each;
  - `eldritch-cannon-activate`: level 3, bonus, one line per type with its damage or temp HP, a scaling row for the damage dice that Explosive Cannon raises at 9, and at 15 the note that one bonus action activates both cannons (Fortified Position's only active part);
  - `arcane-firearm`: level 5, free (rider);
  - `explosive-cannon`: level 9, action (detonate).
- **Battle Smith** (pp. 19-20):
  - `steel-defender`: level 3, bonus (command), "Stat block: Tasha's p. 19", the revive action as a description line, and Improved Defender's changes at 15 (its AC bonus and Deflect Attack damage) as one line;
  - `arcane-jolt`: level 9, free, uses = Int modifier (min 1) per long rest, scaling dice 2d6 / 4d6 at 15 (Improved Defender).

- [ ] **Step 1: Write the failing tests**

```ts
test('tasha artificer subclasses', () => {
  for (const id of ['alchemist', 'armorer', 'artillerist', 'battle-smith'])
    expect(sub(id), id).toMatchObject({ cls: 'artificer', book: 'tce', bonusSpells: { kind: 'subclass' } });
  expect(DATA.subclasses).toHaveLength(105);
});
test('battle smith 3 grants heroism and shield', () => {
  expect(sub('battle-smith').bonusSpells!.grants.filter(g => g.atLevel === 3).map(g => g.spell).sort()).toEqual(['heroism', 'shield']);
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Write the records** from the page images.
- [ ] **Step 4: Verify** — `npm test && npm run check:ocr -- features && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: artillerist and battle smith"`

---

### Task 5: Spin and spark parts, and the gear-train row motif

**Files:**
- Modify: `src/motion/types.ts`, `src/motion/parts.ts`, `src/motion/engine.ts`, `src/motion/rowMotifs.ts`, `src/styles/motion.css`
- Test: `tests/unit/motion-engine.test.ts`, `tests/unit/motion-row.test.ts`

**Interfaces:**
- Produces (in `types.ts`):

```ts
export type Part =
  | /* existing line, pop, move */
  | { kind: 'spin'; cx: number; cy: number; deg: number; parts: Part[] }
    // children render inside one <g> that turns `deg` degrees about (cx, cy) over the whole cycle
  | { kind: 'spark'; x: number; y: number; r: number; at: number; dur: number; frames: Keyframe[] };
    // a dot on the spark layer (Task 6); `at` is a fraction of the grow phase and may exceed 1
```

- **Engine (`runLoop`, `renderParts`):**
  - `spin`: renders its children in a group. Its children grow and wither like top-level parts. In animated mode the group rotates for the cycle's total length (`transformBox: 'view-box'`, origin at `cx cy`), as the mockup's `loop` does. It adds nothing to the grow `end` by itself.
  - `spark`: rendered into `o.over` (a second `SVGSVGElement`, new optional runLoop option) and animated with its `frames`, delay `at * T.G`. With no `o.over`, sparks are dropped. In still mode (reduced motion), spin never animates and sparks are never rendered.
- **Row motif:** `ROW_MOTIFS.artificer`, the mockup's `rowTrain` ported to `Gen`:
  - a faint shaft line;
  - gears of random size meshing left to right, alternating direction, speed inversely proportional to radius (`deg = dir * 700 / r` as in the mockup);
  - at most one hammer and one pair of goggles per row;
  - each gear's hub ring uses class `acc` and its hub dot `accf`.
- **CSS (`motion.css`):** `.acc { stroke: var(--artificer-accent) }` and `.accf { fill: var(--artificer-accent); stroke: none }`, scoped so other classes' motifs are unaffected (they don't use these classes).

- [ ] **Step 1: Write the failing tests**
  - `motion-row.test.ts`: add `'artificer'` to `KEYS`; the artificer generator returns at least one `spin` part, every spin has at least one `line` child, every `at` of a line inside a spin is in `[0, 1]`, and no number in any `d` is NaN.
  - `motion-engine.test.ts`:
    - `renderParts` puts a spin's children inside one `<g>`.
    - With `animate: false`, a spin group gets no `animate` call and a spark is not rendered.
    - With `o.over` given and animation on, a spark circle lands in `o.over`, not in the main svg.
- [ ] **Step 2: Run to verify they fail.** `npx vitest run tests/unit/motion-engine.test.ts tests/unit/motion-row.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the parts, the engine branches and the generator.
- [ ] **Step 4: Verify** — `npm test && npm run build`. Expected: PASS. Then look at it in a real browser: Artificer 5 menu, the spell rows, one screenshot at 390 px. Gears turn, hubs are brass, nothing overflows the row. Attach the screenshot path to the report.
- [ ] **Step 5: Commit** — `git commit -m "feat: spin and spark motion parts; artificer gear-train rows"`

---

### Task 6: The tinker's-line background with sparks

**Files:**
- Modify: `src/motion/bgMotifs.ts`, `src/ui/Background.tsx`, `src/styles/motion.css`
- Test: `tests/unit/motion-bg.test.ts`, `tests/unit/motion-ui.test.tsx`

**Interfaces:**
- Consumes: Task 5's `spin` and `spark` parts and `o.over`.
- **Generator `BG_MOTIFS.artificer`:** the mockup's `bgTinker` in its "edge" spark mode, ported to `Gen`:
  - one wire around the screen edges inside the faded centre, from a random point and direction;
  - a large turning gear (a `spin`), a hammer and goggles in random order;
  - after each shape completes, one burst of 9-14 sparks enters from a random screen edge, arcs under gravity and fades in about a second (`spark` parts, `at` = the shape's completion time / `BG_TIMING.G`).
  - Rotations used for placing shapes along the wire are baked into coordinates. Circular arcs stay valid under rotation, so only the endpoints rotate.
- **Background (`Background.tsx`):** when the background key is `artificer`, render an extra `<svg class="fx-sparks">` in the background wrapper and pass it as `o.over`. Render it the way the sorcerer's `svg.fx-cells` is rendered: fixed and unmasked.
- **CSS:** `.fx-sparks` positioned like `.fx-cells` (fixed, inset 0, behind content, no mask), opacity scaled by `--motion-i`. `.spark { fill: var(--artificer-spark); stroke: none; filter: drop-shadow(0 0 2px var(--artificer-spark-glow)); opacity: 0 }`.

- [ ] **Step 1: Write the failing tests**
  - `motion-bg.test.ts`: the artificer generator returns exactly one top-level `spin`, a hammer and goggles among its lines, and 3 bursts of 9-14 `spark` parts, each spark with ≥ 2 frames.
  - `motion-ui.test.tsx`:
    - on an Artificer page, `.fx-sparks` exists and is not inside the masked `.fx-bg`;
    - with reduced motion it holds no spark circle;
    - with Off, no background svg renders.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement.** Replace Task 1's placeholder.
- [ ] **Step 4: Verify** — `npm test && npm run build && npm run e2e`. Expected: PASS. Then a real-browser check on the Artificer menu at 390 px over one full cycle (about 20 s): the wire runs the edges, the gear turns, sparks fly in after each shape and are not dimmed by the centre fade. Use the CDP real-time screenshot approach from the motion work, not headless virtual time (it stalls on the animation loop). Attach 2-3 screenshot paths.
- [ ] **Step 5: Commit** — `git commit -m "feat: artificer tinker's-line background with sparks"`

---

### Task 7: End to end and release check

**Files:** Create `tests/e2e/artificer.spec.ts`. Modify `tests/e2e/motion.spec.ts`, `README.md`.

- [ ] **Step 1: Write the e2e tests.**
  - **Start:** 13 tiles at 320 px, no horizontal scroll; Artificer is the last tile and opens its level picker.
  - **Browse:** Artificer 3, Battle Smith, Actions: Steel Defender's card ends with `Full rules: Tasha's p. 19` and mentions `Stat block: Tasha's p. 19`.
  - **Editor:**
    - an Artificer 2's options step shows Artificer Infusions with 4 picks;
    - an Armorer 3 who picks Guardian sees Defensive Field and not Lightning Launcher on the character's Artificer Actions.
  - **Motion (`motion.spec.ts`):** the Artificer menu at 320 px fits with the motion layers on, and Off removes them, like the existing classes' checks.
- [ ] **Step 2: Run** — `npm run e2e`. Expected: PASS.
- [ ] **Step 3: Run the whole-content checks.** Each must pass: `npm test`; `npm run check:ocr` for every kind; `npm run build`, with gzipped JS ≤ 450 KB (record the number).
- [ ] **Step 4: Update README counts:** 13 classes (12 + Artificer), 105 subclasses, 477 spells, 43 feats, artificer infusions.
- [ ] **Step 5: Commit** — `git commit -m "test: artificer end to end; docs: counts"`
