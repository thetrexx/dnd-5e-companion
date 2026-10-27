# Plan 5, Batch 1: BG3 Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 18 BG3 subclasses that are not in the PHB, with a book name on every card, and fix the two old issues that more content makes worse.

**Architecture:** Content stays in `data/*.json`, validated at load by `src/data/validate.ts`. A new optional `book` field on records drives the card's "Full rules" line. The extraction scripts learn to read page images and OCR from six PDFs instead of one. Two logic fixes: option slots that share a pool stop double-counting, and spell grant cost notes (`uses`) show as tags.

**Tech Stack:** Preact + TypeScript + Vite, Vitest (unit), Playwright (e2e), Node 24 scripts with poppler (`pdfimages`, `pdftotext`).

**Spec:** `docs/superpowers/specs/2026-10-27-more-books-design.md` (extends `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md`).

## Global Constraints

- 2014 rules only. No 2024 wording.
- **Own words only.** Every card's text is our summary; no book sentence is copied. No run of 8 or more consecutive words may match the page (`check:ocr` enforces it). Never write out official rules text in files, tool inputs, messages or reports; quote at most a few words to identify a passage. Card style, text format, id rules and the in-scope feature rule are as in `docs/superpowers/plans/2026-10-21-plan-2-content.md` (Amendment 2 and Global Constraints).
- **Facts from the page image, never from memory.** Names, numbers, levels, dice, ranges, durations and pages must match the book. Memory-written cards were about 40% wrong in Plan 2.
- **Books** live in `C:\Users\trexx\Desktop\T-ReXx\d&d\` (override with `BOOK_DIR`). PDFs, page images and OCR text are never committed; they live in `.cache/<book id>/` (git-ignored).
- **Book ids and card labels:** `phb` PHB, `xge` Xanathar's, `tce` Tasha's, `scag` SCAG, `dmg` DMG, `bgg` Giants. A record with no `book` is PHB.
- **Card line:** `Full rules: <label> p. <page>`, e.g. `Full rules: Xanathar's p. 50`.
- **Reprints:** use the newest printing (spec section 3). For this batch: Circle of Spores and Bladesinging from Tasha's.
- **Summons:** a feature that summons a creature says what the feature does plus where the stats are, e.g. "Uses the specter stats (Monster Manual)". No stat blocks.
- **Ids never change.** Existing ids are untouched; new ids must not collide (the barbarian subclass is `path-of-wild-magic`, because `wild-magic` is the sorcerer's).
- **Tests** reference real ids. A task that grows content updates any count-based assertion it breaks and says so in its report.
- **Size:** the built JS stays at or under 450 KB gzipped.

## Review Focus

1. **Existing saved characters and backup codes** keep loading unchanged after the new content lands. Pinned in Task 2 (a code made before any change still parses to the same character).
2. **Fighter + Paladin (or + College of Swords bard) with fighting styles:** each slot counts only its own pick, the same style can't be counted twice, and a Dragonborn draconic sorcerer can use one ancestry for both slots. Pinned in Task 4.
3. **Old links with a colliding subclass id:** `#/menu/barbarian/3/wild-magic` (the sorcerer's subclass on a barbarian) renders the barbarian menu without a subclass, and `#/menu/sorcerer/1/wild-magic` still works. Pinned in Task 6.
4. **Records with no `book`** still end with `Full rules: PHB p. N`. Pinned in Task 2.
5. **A book with no text layer** (Giants) never passes `check:ocr` silently; each of its records fails with "no text layer" until listed in `ocr-accept.json`. Pinned in Task 1.

---

## File Structure

```
scripts/extract/config.ts       BOOKS table: pdf path, page offset, cache dir, text layer (Task 1)
scripts/extract/pages.ts        extractPage(page, book), pageRef() (Task 1)
scripts/extract/check-ocr.ts    reads each record's book (Task 1)
scripts/extract/README.md       multi-book usage (Task 1)
src/data/types.ts               BookId, book fields, 'subclass' bonus kind (Tasks 2, 3)
src/data/validate.ts            book and bonus kind checks (Tasks 2, 3)
src/logic/card.ts               bookRef() (Task 2)
src/ui/screens/Card.tsx         uses bookRef (Task 2)
src/logic/sections.ts           browse-view tags with uses, feature spell grants (Task 3)
src/character/grants.ts         'subclass' bonus title (Task 3)
src/character/view.ts           character-view tags with uses (Task 3)
src/character/options.ts        pool-aware slot assignment (Task 4)
src/ui/editor/StepOptions.tsx   per-slot picks, taken notes (Task 4)
src/ui/editor/PickList.tsx      disabled items (Task 4)
data/subclasses.json, data/options.json, data/features/<class>.json   new content (Tasks 5, 6)
scripts/extract/icon-aliases.json, scripts/extract/ocr-accept.json    (Tasks 5, 6)
tests/unit/...                  per task
tests/e2e/books.spec.ts         (Task 7)
```

---

### Task 1: Multi-book extraction tooling

**Files:**
- Modify: `scripts/extract/config.ts`, `scripts/extract/pages.ts`, `scripts/extract/check-ocr.ts`, `scripts/extract/spell-facts.ts` (import rename only), `scripts/extract/README.md`
- Test: `tests/unit/pages.test.ts`

**Interfaces:**
- Produces:

```ts
// config.ts
export type BookId = 'phb' | 'xge' | 'tce' | 'scag' | 'dmg' | 'bgg';   // re-exported from src/data/types.ts in Task 2; define here first, Task 2 moves it
export const BOOK_DIR: string;      // process.env.BOOK_DIR ?? 'C:/Users/trexx/Desktop/T-ReXx/d&d'
export const BOOKS: Record<BookId, { pdf: string; offset: number; cache: string; textLayer: boolean }>;
// pages.ts
export function pageRef(page: number, book?: BookId): { pdf: string; pdfPage: number; png: string; txt: string };
export function extractPage(page: number, book?: BookId): void;   // book defaults to 'phb'
```

- **BOOKS** (offset: pdf page = book page + offset; measured 2026-10-27):

  | id | file in BOOK_DIR | offset | cache | textLayer |
  |---|---|---|---|---|
  | phb | `PDF 5E Player's Handbook.pdf` (`PHB_PDF` env still overrides) | 1 | `.cache/phb` | true |
  | xge | `PDF 5E Xanathar's Guide to Everything.pdf` | 1 | `.cache/xge` | true |
  | tce | `PDF 5E Tashas_Cauldron_of_Everything.pdf` | 1 | `.cache/tce` | true |
  | scag | `PDF 5E Sword Coast Adventurer's Guide.pdf` | 1 | `.cache/scag` | true |
  | dmg | `PDF 5E Dungeon Master's Guide.pdf` | 4 | `.cache/dmg` | true |
  | bgg | `PDF 5E Glory of the Giants.pdf` | measure it (step 3) | `.cache/bgg` | false |

  The old default PHB path (`C:/Users/trexx/Desktop/DnD5E PlayersHandbook.pdf`) no longer exists; the new file has the same offset (checked: PDF page 243 is Fireball's page).
- **`extractPage`** writes `p<page>.png` and `p<page>.txt` in the book's cache. For a book with `textLayer: false` it writes an empty `.txt`.
- **CLI:** `npm run extract:pages -- <from> <to> [book]` (book defaults to `phb`).
- **`check:ocr`:** each record's pages come from `rec.book ?? 'phb'`. A record whose book has `textLayer: false` fails with the reason `no text layer` (acceptable only through `ocr-accept.json`, with a reason saying its facts were checked against the page image).

- [ ] **Step 1: Write the failing tests** in `tests/unit/pages.test.ts`

```ts
import { pageRef } from '../../scripts/extract/pages';
import { BOOKS } from '../../scripts/extract/config';
test('phb page ref keeps the old cache and offset', () =>
  expect(pageRef(242)).toMatchObject({ pdfPage: 243, png: '.cache/phb/p242.png', txt: '.cache/phb/p242.txt' }));
test('dmg offset', () => expect(pageRef(97, 'dmg')).toMatchObject({ pdfPage: 101, png: '.cache/dmg/p97.png' }));
test('xge page ref', () => expect(pageRef(50, 'xge').pdf).toMatch(/Xanathar's Guide to Everything\.pdf$/));
test('giants has no text layer', () => expect(BOOKS.bgg.textLayer).toBe(false));
```

- [ ] **Step 2: Run to verify they fail** — `npx vitest run tests/unit/pages.test.ts`. Expected: FAIL (`pageRef` not exported).
- [ ] **Step 3: Implement** config, `pageRef`, `extractPage(page, book)`, the CLI book argument and `check:ocr`'s per-record book. Measure the Giants offset: render a few page images (`npm run extract:pages -- 20 30 bgg`) and compare the printed page number with the PDF page; record it in `BOOKS.bgg.offset` with a comment.
- [ ] **Step 4: Run to verify** — `npx vitest run tests/unit/pages.test.ts` PASS; `npm run check:ocr -- spells` gives the same result as before this task (PHB unaffected); `npm run extract:pages -- 50 50 xge` writes `.cache/xge/p50.png` and a non-empty `.cache/xge/p50.txt`.
- [ ] **Step 5: Update `scripts/extract/README.md`** (books table, the book argument, Giants has no text layer).
- [ ] **Step 6: Commit** — `git commit -m "feat: extraction reads six books"`

---

### Task 2: Book field and the card's book line

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/logic/card.ts`, `src/ui/screens/Card.tsx`, `scripts/extract/config.ts` (import `BookId` from types)
- Create: `tests/unit/fixtures/code-before-books.txt`
- Test: `tests/unit/card.test.ts`, `tests/unit/validate.test.ts`, `tests/unit/character-code.test.ts`, `tests/unit/screens.test.tsx`

**Interfaces:**
- Consumes: Task 1's `BookId` (moves into `src/data/types.ts`; `config.ts` imports it type-only).
- Produces:

```ts
// types.ts
export type BookId = 'phb' | 'xge' | 'tce' | 'scag' | 'dmg' | 'bgg';
// Spell, Feature, SubclassDef, RaceDef, FeatDef gain:  book?: BookId   (absent = PHB)
// card.ts
export const BOOK_LABEL: Record<BookId, string>;   // { phb: 'PHB', xge: "Xanathar's", tce: "Tasha's", scag: 'SCAG', dmg: 'DMG', bgg: 'Giants' }
export function bookRef(r: { book?: BookId; page: number }): string;   // 'Full rules: Xanathar\'s p. 50'
```

- **Validator:** `book`, when present, must be one of the six ids; the error reads `<kind> "<id>": book "<x>" is not valid`.
- **Card.tsx:** the `card-ref` line renders `bookRef(spell ?? feature)`.

- [ ] **Step 1: Freeze a backup code from before any change.** On a clean checkout of this task's starting commit, encode a multiclass character that has options, feats and spells (e.g. Dragonborn Sorcerer 5 Draconic Bloodline / Fighter 2 with Defense, War Caster, some picked and granted spells) with the existing `SS1-` encoder, and save the code to `tests/unit/fixtures/code-before-books.txt` together with the character's JSON as `code-before-books.json`.
- [ ] **Step 2: Write the failing tests**

```ts
// card.test.ts
test('book line', () => {
  expect(bookRef({ page: 241 })).toBe('Full rules: PHB p. 241');
  expect(bookRef({ book: 'xge', page: 50 })).toBe("Full rules: Xanathar's p. 50");
  expect(bookRef({ book: 'bgg', page: 23 })).toBe('Full rules: Giants p. 23');
});
// validate.test.ts: a feature with book 'xgte' gives 'feature "<id>": book "xgte" is not valid'
// character-code.test.ts
test('a code from before the new books still restores the same character', () => {
  const r = decodeCharacter(readFileSync('tests/unit/fixtures/code-before-books.txt', 'utf8').trim());
  expect(r.ok && r.ch).toEqual(JSON.parse(readFileSync('tests/unit/fixtures/code-before-books.json', 'utf8')));
  expect(r.ok && r.dropped).toEqual([]);
});
// screens.test.tsx: the Fireball card still shows 'Full rules: PHB p. 241'
```

  Use the decoder's real exported name from `src/character/code.ts`.
- [ ] **Step 3: Run to verify they fail.** Expected: FAIL on `bookRef` and the validator test; the code test passes already (it guards later tasks).
- [ ] **Step 4: Implement** types, validator, `BOOK_LABEL`, `bookRef`, Card.
- [ ] **Step 5: Run to verify** — `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat: book field and book name on cards"`

---

### Task 3: Subclass spell kind, feature spells in the browse view, cost notes

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `src/logic/sections.ts`, `src/character/grants.ts`, `src/character/view.ts`
- Test: `tests/unit/sections.test.ts`, `tests/unit/character-view.test.ts`

**Interfaces:**
- Produces:
  - `SubclassDef.bonusSpells.kind` gains `'subclass'`: spells a subclass always has that don't count toward the limit and have no PHB label (Gloom Stalker Magic, Swarmkeeper Magic). Its tag and grant-source title are the **subclass name** ("Swarmkeeper"). The other kinds keep Domain / Oath / Circle / Patron.
  - `export function joinTag(...parts: (string | undefined)[]): string | undefined` in `src/logic/sections.ts`: the non-empty parts joined with `' · '`, or `undefined`.
- **Cost notes:** wherever a spell tag is built from a grant that has `uses`, the tag becomes `joinTag(<source tag>, grant.uses)`:
  - browse view (`spellSections`): bonus-spell grants, and the feature grants below;
  - character view (`spellLayout`): picked grant spells and `autoSpells` (the `AutoSpell.uses` already loaded). A standalone place (race, feat, a feature of a non-caster class) has no source tag, so its tag is the `uses` text alone.
- **Feature spells in the browse view** (*plan's call*: without it, Shadow Magic's Darkness and Circle of Stars' Guiding Bolt would be invisible until a character is saved): `spellSections(cls, level, sub)` also lists each fixed-spell grant (`spell` set, no `option`) of the class's features and the effective subclass's features, tagged `joinTag(<feature name>, uses)`, in the section of that spell's level. Like bonus spells, every grant is listed regardless of `atLevel`; level locking stays per section. Non-caster classes still get no MAGIC rows (unchanged `menuRows`).

- [ ] **Step 1: Write the failing tests**

```ts
// sections.test.ts
test('joinTag', () => { expect(joinTag('Domain', undefined)).toBe('Domain'); expect(joinTag(undefined, 'Ritual only')).toBe('Ritual only'); expect(joinTag()).toBeUndefined(); });
// character-view.test.ts: a Barbarian 3 Path of the Totem Warrior character's Speak with Animals entry is tagged 'Ritual only'
// (find the section that contains 'speak-with-animals' and assert sec.tags['speak-with-animals'] === 'Ritual only')
```

  Task 6 adds the Swarmkeeper and Circle of Stars assertions (`'Swarmkeeper'`, `'Star Map · …'`) once that content exists. Do not add fake records to `data/`.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Implement** the kind (types, validator `BONUS_KINDS`, `BONUS_TITLE`/`BONUS_TAG` lookups that fall back to the subclass name), `joinTag`, the tag changes and the browse-view feature grants.
- [ ] **Step 4: Run to verify** — `npm test && npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: spell cost notes as tags, subclass spell kind"`

---

### Task 4: Shared option pools count once

**Files:**
- Modify: `src/data/types.ts`, `src/data/validate.ts`, `data/options.json`, `src/character/options.ts`, `src/ui/editor/StepOptions.tsx`, `src/ui/editor/PickList.tsx`
- Test: `tests/unit/character-derive.test.ts` (or a new `tests/unit/character-options.test.ts`), `tests/unit/editor.test.tsx`

**Interfaces:**
- Produces:

```ts
// types.ts — OptionGroup gains
reuse?: true;   // a pick counted in another slot of the same pool may also fill this one (draconic ancestry)
// options.ts — OptionSlot gains
taken: string[];   // ids of this slot's choices already counted in another slot of the same pool
```

- **Pool:** `group.from ?? group.id`. Slots in the same pool share one list of picks (`ch.options` stays a flat id list, so saved data does not change).
- **Assignment** (deterministic; slot order is `optionSlots`' existing order):

```
for each pool:
  for each id in ch.options that some slot of the pool offers (in ch.options order):
    put it in the first offering slot whose chosen.length < count
    if none has room, put it in the first offering slot (an over-pick, shown as today)
  then for each slot with group.reuse and room: add ids assigned elsewhere in the pool that it offers, in order, until full
  taken = ids assigned to other slots of the pool that this slot offers and did not take
```

- **Data:** set `"reuse": true` on `draconic-ancestry-sorcerer` only. Fighting styles never reuse (a style can't be taken twice).
- **Editor:** each slot's PickList shows as pressed only `slot.chosen`. Items in `slot.taken` show the note `Chosen for <Class or Race name>` and are disabled (`PickItem.disabled?: boolean`, rendered as `disabled` on the button). Pressing a chosen item removes it from `ch.options` (unchanged behaviour).

- [ ] **Step 1: Write the failing tests**

```ts
const ch = (o: Partial<Character>): Character => ({ ...emptyCharacter(), ...o });
const fp = ch({ classes: [{ cls: 'fighter', level: 1 }, { cls: 'paladin', level: 2 }], options: ['fighting-style-defense'] });
test('one style counts once', () => {
  const [f, p] = optionSlots(fp);
  expect(f.chosen).toEqual(['fighting-style-defense']);
  expect(p.chosen).toEqual([]);
  expect(p.taken).toEqual(['fighting-style-defense']);
});
test('two styles fill one slot each', () => {
  const s = optionSlots({ ...fp, options: ['fighting-style-defense', 'fighting-style-dueling'] });
  expect(s.map(x => x.chosen)).toEqual([['fighting-style-defense'], ['fighting-style-dueling']]);
});
test('one ancestry may fill race and sorcerer slots', () => {
  const s = optionSlots(ch({ race: 'dragonborn', classes: [{ cls: 'sorcerer', level: 1, sub: 'draconic-bloodline' }], options: ['draconic-ancestry-red'] }));
  expect(s.map(x => x.chosen)).toEqual([['draconic-ancestry-red'], ['draconic-ancestry-red']]);
});
// editor.test.tsx: in the Fighter 1 / Paladin 2 editor with Defense chosen, the paladin list's Defense button is disabled and says 'Chosen for Fighter'; the counts read '1 of 1 chosen' and '0 of 1 chosen'
```

  Match the race and option ids to the real data (`draconic-ancestry-red`, `dragonborn`) and the slot order `optionSlots` really returns; adjust the destructuring, not the behaviour.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL (`taken` undefined; paladin slot counts Defense).
- [ ] **Step 3: Implement** the type, validator (`reuse` must be `true` when present), data flag, assignment in `optionSlots`, PickList `disabled`, StepOptions notes.
- [ ] **Step 4: Run to verify** — `npm test && npm run e2e`. Expected: PASS, including the Task 2 backup-code test.
- [ ] **Step 5: Commit** — `git commit -m "fix: shared option lists count each pick once"`

---

### Task 5: Xanathar's BG3 subclasses (9)

**Files:**
- Modify: `data/subclasses.json`, `data/options.json`, `data/classes.json` (class `options` lists, if a subclass group is added), `data/features/{bard,fighter,monk,ranger,rogue,sorcerer,warlock}.json`, `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json`
- Test: `tests/unit/subclasses-content.test.ts`

**Interfaces:**
- Consumes: Task 2 `book`, Task 3 `'subclass'` bonus kind and `uses` tags, Task 4 pools.
- Produces: 9 subclasses, every record with `"book": "xge"`.

| Class | Subclass | id | Starts on page (confirm on the image) |
|---|---|---|---|
| Bard | College of Glamour | `college-of-glamour` | 14 |
| Bard | College of Swords | `college-of-swords` | 15 |
| Fighter | Arcane Archer | `arcane-archer` | 28 |
| Monk | Way of the Drunken Master | `way-of-the-drunken-master` | 33 |
| Ranger | Gloom Stalker | `gloom-stalker` | 41 |
| Rogue | Swashbuckler | `swashbuckler` | 47 |
| Sorcerer | Shadow Magic | `shadow-magic` | 50 |
| Sorcerer | Storm Sorcery | `storm-sorcery` | 51 |
| Warlock | The Hexblade | `the-hexblade` | 55 |

- **Modelling decisions:**
  - **Gloom Stalker Magic:** `bonusSpells.kind: 'subclass'`.
  - **Hexblade expanded spells:** `bonusSpells.kind: 'patron'`.
  - **College of Swords' fighting style:** option group `fighting-style-swords` with `from: 'fighting-style'` and `only` the two styles the book allows, owned by the subclass. It joins the fighting-style pool from Task 4.
  - **Arcane Shot options:** option group `arcane-shot` owned by `arcane-archer`, `picks` from the book's table of known options. One option feature per shot, ids `arcane-shot-<name>`.
  - **Spell grants with a cost** carry it in `uses`. Example: Eyes of the Dark's Darkness carries `"2 sorcery points"`. Glamour's Command, if it is a grant, carries its cost the same way.
  - **Summons** follow the Global Constraint. Hound of Ill Omen uses the dire wolf stats, and Accursed Specter uses the specter stats, both from the Monster Manual.
  - **No new spells are expected.** If a grant names a spell missing from `data/spells.json`, stop and report it rather than adding it.
- **Icons:** run `npm run extract:icons`. The BG3 hotbar icons exist for all 9; add `icon-aliases.json` entries where BG3's file name differs (e.g. no "Way of the" prefix).

- [ ] **Step 1: Write the failing tests**

```ts
const XGE = ['college-of-glamour', 'college-of-swords', 'arcane-archer', 'way-of-the-drunken-master', 'gloom-stalker', 'swashbuckler', 'shadow-magic', 'storm-sorcery', 'the-hexblade'];
test('xanathar subclasses', () => { for (const id of XGE) expect(sub(id), id).toMatchObject({ book: 'xge' }); });
test('every xanathar feature names its book', () => {
  const ids = new Set(XGE);
  for (const f of DATA.features.filter(x => x.source.kind === 'subclass' && ids.has(x.source.id))) expect(f.book, f.id).toBe('xge');
});
test('shadow magic darkness costs sorcery points', () =>
  expect(DATA.features.flatMap(f => f.source.id === 'shadow-magic' ? f.spells ?? [] : []).find(g => g.spell === 'darkness')!.uses).toMatch(/2 sorcery points/i));
test('hexblade patron spells', () => expect(sub('the-hexblade').bonusSpells).toMatchObject({ kind: 'patron' }));
test('gloom stalker magic', () => expect(sub('gloom-stalker').bonusSpells).toMatchObject({ kind: 'subclass' }));
test('swords styles share the fighting style pool', () => expect(DATA.optionGroups.find(g => g.id === 'fighting-style-swords')).toMatchObject({ from: 'fighting-style', owner: { kind: 'subclass', id: 'college-of-swords' } }));
test('must-have features', () => {
  for (const id of ['hexblades-curse', 'hound-of-ill-omen', 'tempestuous-magic', 'blade-flourish', 'tipsy-sway', 'dread-ambusher', 'arcane-shot', 'mantle-of-inspiration'])
    expect(DATA.features.find(x => x.id === id), id).toBeTruthy();
});
// update the subclass count assertion to 49 and note it in the report
```

  These ids come from memory, not the book. If the book names a feature differently, use the book's name. If a listed feature is passive under the in-scope rule, drop it from the test. Either way, say so in the report.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pages.** Run `npm run extract:pages -- 12 57 xge`.
- [ ] **Step 4: Write the records** from the page images, in our own words.
- [ ] **Step 5: Run to verify.** Run `npm test && npm run check:ocr -- features && npm run check:ocr -- subclasses && npm run check:ocr -- options`. Expected: PASS. Any failure must have a reasoned entry in `ocr-accept.json`.
- [ ] **Step 6: Commit** — `git commit -m "feat: Xanathar's BG3 subclasses"`

The reviewer compares at least 10 random records against the page images, and spot-checks that no book sentence is copied.

---

### Task 6: The other 9 BG3 subclasses (Tasha's, DMG, SCAG, Giants)

**Files:**
- Modify: `data/subclasses.json`, `data/options.json`, `data/features/{barbarian,cleric,druid,paladin,ranger,wizard}.json`, `scripts/extract/icon-aliases.json`, `scripts/extract/ocr-accept.json`
- Test: `tests/unit/subclasses-content.test.ts`, `tests/unit/sections.test.ts`, `tests/unit/subclass.test.ts`

**Interfaces:**
- Consumes: as Task 5.
- Produces: 9 subclasses. Total: 58.

| Class | Subclass | id | Book | Starts on page |
|---|---|---|---|---|
| Barbarian | Path of Wild Magic | `path-of-wild-magic` | tce | 25 |
| Druid | Circle of Spores | `circle-of-spores` | tce | 36 |
| Druid | Circle of Stars | `circle-of-stars` | tce | 38 |
| Ranger | Swarmkeeper | `swarmkeeper` | tce | 59 |
| Wizard | Bladesinging | `bladesinging` | tce | 76 |
| Cleric | Death Domain | `death-domain` | dmg | 96 |
| Paladin | Oathbreaker | `oathbreaker` | dmg | 97 |
| Paladin | Oath of the Crown | `oath-of-the-crown` | scag | 132 |
| Barbarian | Path of Giants | `path-of-giants` | bgg | find it (Task 1 offset) |

Confirm every starting page on the page image.

- **Modelling decisions:**
  - Bonus spell kinds:
    - `circle-of-spores`: `circle`
    - `swarmkeeper`: `subclass`
    - `death-domain`: `domain`
    - `oathbreaker` and `oath-of-the-crown`: `oath`
  - **Death Domain's Reaper** is a `choose` grant: level 0, school Necromancy, from any class list.
  - **Circle of Stars' Star Map spells** are fixed grants on its feature, with the free-cast limit in `uses`. **Starry Form**'s three constellations are paragraphs of one feature, not picks.
  - **Path of Giants' cantrip choice** is an option group of two option features. Each option carries its spell grant, like Land terrain.
  - **Path of Giants has no OCR text.** Every one of its records goes in `ocr-accept.json` with the reason "Giants PDF has no text layer; facts checked against page image". The reviewer checks all of them against the images, not a sample.
  - **No new spells are expected.** The same stop rule as Task 5 applies.
- **Icons:** as Task 5.

- [ ] **Step 1: Write the failing tests**

```ts
const OTHER: [string, string][] = [['path-of-wild-magic', 'tce'], ['circle-of-spores', 'tce'], ['circle-of-stars', 'tce'], ['swarmkeeper', 'tce'], ['bladesinging', 'tce'], ['death-domain', 'dmg'], ['oathbreaker', 'dmg'], ['oath-of-the-crown', 'scag'], ['path-of-giants', 'bgg']];
test('other BG3 subclasses', () => { for (const [id, book] of OTHER) expect(sub(id), id).toMatchObject({ book }); });
test('58 subclasses', () => expect(DATA.subclasses).toHaveLength(58));
test('swarmkeeper spells tagged with the subclass name', () => {
  const s = spellSections('ranger', 3, 'swarmkeeper').find(x => x.id === 'lvl-1')!;
  expect(s.tags!['faerie-fire']).toBe('Swarmkeeper');
});
test('star map guiding bolt shows its limit', () =>
  expect(spellSections('druid', 2, 'circle-of-stars').find(x => x.id === 'lvl-1')!.tags!['guiding-bolt']).toMatch(/^Star Map · /));
// subclass.test.ts
test('colliding wild magic ids', () => {
  expect(effectiveSub('barbarian', 3, 'wild-magic')).toBeUndefined();
  expect(effectiveSub('sorcerer', 1, 'wild-magic')?.id).toBe('wild-magic');
  expect(effectiveSub('barbarian', 3, 'path-of-wild-magic')?.id).toBe('path-of-wild-magic');
});
```

- [ ] **Step 2: Run to verify they fail.** Expected: FAIL.
- [ ] **Step 3: Extract pages and write the records.** Extract each book's pages with `npm run extract:pages -- <from> <to> <book>`. Then write the records from the page images.
- [ ] **Step 4: Run to verify.** Run `npm test && npm run check:ocr -- features && npm run check:ocr -- subclasses && npm run check:ocr -- options`. Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: Tasha's, DMG, SCAG and Giants BG3 subclasses"`

---

### Task 7: End to end, docs and release check

**Files:**
- Create: `tests/e2e/books.spec.ts`
- Modify: `README.md`, `docs/superpowers/specs/2026-10-21-dnd-cheatsheet-design.md` (one line under "Non-goals" pointing to the more-books spec)

- [ ] **Step 1: Write the e2e tests**
  - **Browse view:** go to Start, then Sorcerer, Level 3, Shadow Magic, then Spells. The Level 2 section shows Darkness with the tag `Eyes of the Dark · 2 sorcery points`. Use the feature name the data really has. Opening Darkness shows `Full rules: PHB p. …`. Opening the Hound of Ill Omen card from Actions shows `Full rules: Xanathar's p. `.
  - **Old link:** `#/menu/barbarian/3/wild-magic` shows the Barbarian menu without a subclass, and no error.
  - **Editor:** create a Fighter 1 / Paladin 2 character and choose Defense for the Fighter. The Paladin's Defense is disabled and labelled `Chosen for Fighter`.
- [ ] **Step 2: Run** — `npm run e2e`. Expected: PASS.
- [ ] **Step 3: Whole-content checks.** Each must pass:
  - `npm test`
  - `npm run check:ocr` with every kind
  - `npm run build`
  - The total gzipped JS in `dist/assets` is at or under 450 KB.
- [ ] **Step 4: Docs.**
  - README: name the six books.
  - Base spec: under Non-goals, add one line: "Superseded for books by `2026-10-27-more-books-design.md`".
- [ ] **Step 5: Commit** — `git commit -m "test: BG3 subclasses end to end; docs: books"`
