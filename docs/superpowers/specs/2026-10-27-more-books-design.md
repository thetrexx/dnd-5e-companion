# More Books: Design

Date: 2026-10-27
Status: draft for review
Extends: `2026-10-21-dnd-cheatsheet-design.md` (the "base spec"). Everything there still holds unless this document says otherwise.

## 1. Intent

The app covers the 2014 Player's Handbook only. The owner's players know Baldur's Gate 3, and asked where subclasses like Shadow Magic sorcerer are; those come from other books. The owner has since shown the app to friends and colleagues outside their table, and they want it too. So the audience is now any 2014-rules 5e player, and the principle (owner, 2026-10-27) is: **cover as much as we can, for as many use cases as we can, without going ridiculous.**

The first milestone is **parity with BG3's subclass list**, because that is what the owner's own players expect. After that, everything else in the books, batch by batch.

## 2. Goals, non-goals, anti-goals

**Goals**
- Every subclass in BG3 is in the app (batch 1).
- Eventually, every player character option in the five new books (section 3): subclasses, the Artificer class, spells, Tasha's optional class features, feats, races and subraces.
- Each card says which book and page holds the full rules.
- Saved characters and backup codes from the current release keep working.

**Non-goals**
- **No book filter** (owner, 2026-10-27). Everything always shows. A player's DM approves their character; the app doesn't police which books a table allows.
- **No DM-side material:** magic items, traps, downtime, sidekicks, group patrons, encounter tables, tool proficiencies.
- **No stat blocks** (owner, 2026-10-27). A feature or spell that summons a creature gets a normal card saying what the feature does, plus where its stats are: "Uses the dire wolf stats (Monster Manual)", or "Stat block: Tasha's p. 110" when the book prints its own. No new card layout, and no Monster Manual needed. Existing PHB summons (Find Familiar, Find Steed, the Beast Master companion) already work this way.
- **Replicate Magic Item** (Artificer infusion) is one card listing the item names it can make. The items get no cards of their own, in line with "no magic items" (*my call*).
- **No 2024 rules** (owner, 2026-10-27, unchanged from the base spec).
- No Guildmasters' Guide to Ravnica: Tasha's reprints both of its subclasses (Circle of Spores, Order Domain). The owner's Ravnica PDF is 60 pages and looks partial anyway.

**Anti-goals**
- Any book's own wording on a card. Same rule as the base spec (section 3 there): our own words only, facts from the book.
- Facts written from memory. Memory-written cards were about 40% wrong during Plan 2. Every card is written with its book page open.
- New content that breaks an existing saved character or backup code.
- A pick list that becomes unusable because it doubled in length (section 8).

## 3. Sources

All on the owner's machine in `C:\Users\trexx\Desktop\T-ReXx\d&d\`. All are scans with an OCR text layer, like the PHB: read facts from the page images, use the OCR only as a cross-check (base spec 4.1, `scripts/extract/README.md`).

| Book | File | Card label | Notes |
|---|---|---|---|
| Player's Handbook | `PDF 5E Player's Handbook.pdf` | PHB | Already in. (The base spec names an older path; this is the same book.) |
| Xanathar's Guide to Everything | `PDF 5E Xanathar's Guide to Everything.pdf` | Xanathar's | 196 pages, decent OCR |
| Tasha's Cauldron of Everything | `PDF 5E Tashas_Cauldron_of_Everything.pdf` | Tasha's | 194 pages, noisy OCR (digits split: "1 6") |
| Sword Coast Adventurer's Guide | `PDF 5E Sword Coast Adventurer's Guide.pdf` | SCAG | 161 pages |
| Dungeon Master's Guide | `PDF 5E Dungeon Master's Guide.pdf` | DMG | Only Death Domain, Oathbreaker and the Aasimar / Eladrin player options |
| Bigby Presents: Glory of the Giants | `PDF 5E Glory of the Giants.pdf` | Giants | Path of Giants and the giant feats |

PDF page and book page differ by a per-book offset; the builder works each out once.

**Reprints:** when the same option is printed in more than one of these books, use the **newest** printing and cite it (*my call*). Examples: Bladesinging, Circle of Spores, Order Domain, and the SCAG cantrips (Booming Blade, Green-Flame Blade, Lightning Lure, Sword Burst) come from Tasha's; Swashbuckler, Mastermind, Storm Sorcery and Sun Soul come from Xanathar's.

## 4. Scope and batches

Each batch is a release: built, tested, merged, live. Order agreed with the owner: BG3 parity first, then book by book.

**Batch 1: BG3 parity, 18 subclasses** (list checked against bg3.wiki's Classes page on 2026-10-27).

| Class | Subclass | Book |
|---|---|---|
| Barbarian | Path of Wild Magic | Tasha's |
| Barbarian | Path of Giants | Giants |
| Bard | College of Glamour | Xanathar's |
| Bard | College of Swords | Xanathar's |
| Cleric | Death Domain | DMG |
| Druid | Circle of Spores | Tasha's |
| Druid | Circle of Stars | Tasha's |
| Fighter | Arcane Archer | Xanathar's |
| Monk | Way of the Drunken Master | Xanathar's |
| Paladin | Oath of the Crown | SCAG |
| Paladin | Oathbreaker | DMG |
| Ranger | Gloom Stalker | Xanathar's |
| Ranger | Swarmkeeper | Tasha's |
| Rogue | Swashbuckler | Xanathar's |
| Sorcerer | Shadow Magic | Xanathar's |
| Sorcerer | Storm Sorcery | Xanathar's |
| Warlock | The Hexblade | Xanathar's |
| Wizard | Bladesinging | Tasha's |

Each comes with its usable features, its choosable options (e.g. Arcane Shots, Circle of Stars' Starry Form constellations), and its subclass spells. A first look suggests every subclass spell in this batch is already a PHB spell (Death Domain's Reaper cantrip choice, Giants' Druidcraft/Thaumaturgy, Hexblade and Swarmkeeper expanded lists); the builder confirms, and adds any missing spell in this batch.

**Batch 2: the rest of Xanathar's.** 22 subclasses, about 95 spells, the racial feats.

**Batch 3: the rest of Tasha's, without the Artificer.** 23 subclasses, about 21 spells (the four SCAG cantrips are among them), feats, the optional class features (section 6), the expanded class spell lists, Custom Lineage.

**Batch 4: the Artificer.** Class, its 4 subclasses, infusions, spell list, class tables, and its look (section 7). Split from batch 3 because it is the only new class and the only new visuals (*my call*).

**Batch 5: the rest of SCAG, DMG and Giants.** SCAG: Path of the Battlerager, Arcana Domain, Purple Dragon Knight, Way of the Long Death, The Undying; its subraces and variants (Duergar, Svirfneblin, Ghostwise halfling, half-elf and tiefling variants) and the Svirfneblin Magic feat. DMG: Aasimar and the Eladrin elf variant. Giants: the giant feats.

The subclass counts in batches 2, 3 and 5 come from the contents pages and memory; the builder checks each against its book before planning that batch.

What gets included per class or race follows the base spec's rule: only what a player **uses** on their turn (actions, bonus actions, reactions, resources and toggles they spend) plus the options they pick. Passive features stay out.

## 5. Data changes

- **Book on every record.** Spells, features, subclasses, feats, races and options gain a book field. Existing records are PHB. The card's last line becomes "Full rules: Xanathar's p. 50", using the card labels in section 3 (*my call*: players won't know "XGE" or "TCE").
- **Stable ids.** Saved characters and backup codes reference records by name-based ids (owner decision 2026-10-22). New ids must not collide with existing ones or with each other, since several new options reuse names: Barbarian Path of Wild Magic next to the Wild Magic sorcerer; the Tasha's fighting styles next to the PHB ones. Existing ids never change.
- **Optional tag.** Tasha's optional class features and expanded-list spells carry a flag that shows as an "Optional" tag on the card and in the row (section 6).
- **Spell facts.** None of the new spells are in SRD 5.1, so all their facts come from the books. The existing pipeline (`spell-nonsrd.json`, `spell-summaries.json`, `build:spells`, `check:ocr`) is extended to read pages from several books; `scripts/extract/config.ts` currently knows one PDF.
- **Subclass spells.** The base spec's bonus spell kinds (domain, oath, circle, patron) gain the new ones these books use: always-prepared subclass spells for half- and full casters (Gloom Stalker, Swarmkeeper, Aberrant Mind, Clockwork Soul and others), the Divine Soul affinity spell, and Artificer specialist spells. They behave like domain spells: added automatically, not counted against the limit.
- **Icons.** Same rule as the base spec 4.4: bg3.wiki first (the 18 BG3 subclasses have hotbar icons there), game-icons.net as fallback. Expect most new spells and non-BG3 subclasses to need the fallback.

## 6. Tasha's optional class features

*My calls, confirmed in principle by the owner ("your calls are good").*
- They appear like normal features and options, tagged "Optional".
- **No character:** the class view shows all of them alongside the features they would replace or add to.
- **Saved character:** the editor offers them in the options step, like invocations; the player ticks the ones their DM allows. Unticked optional features don't show. A replacement (e.g. Favored Foe for Favored Enemy) shows instead of the feature it replaces once ticked.
- Each class's **expanded spell list** is one optional feature. Ticked, its spells join that class's list; with no character, they show on the Spells page with the Optional tag.

## 7. The Artificer's look

Approved by the owner on 2026-10-27 against live mockups: `docs/superpowers/mockups/artificer-look.html` (colour and row pattern) and `artificer-bg.html` (background). Like `final.html`, they are fragments for the brainstorming preview server and load fonts from `/files/`; treat them as reference code. Their generator code can be lifted.

**Colour: silver and brass** (option B in `artificer-look.html`). New theme tokens alongside the other classes: class colour `#a7acb2`, line `#d8dde2`, accent `#d9a441` (gear hubs, goggle lens glints), row opacity .5, background opacity .26. Spark colours `#ffd27a` with a `#ffb347` glow. The Cleric's grey-silver sits close to the base silver; the brass accent is what tells them apart.

**Changed 2026-10-29 (owner):** the spell rows now use option A, the tinker's line (one wire draws a gear, a hammer and goggles in a random order; the gears stay still). Live at 18f3770. The original choice follows.

**Spell-row motif: Gear train** (option B). A faint shaft line across the row; a chain of meshing gears of random sizes draws in left to right, each gear turning slowly in the opposite direction to its neighbour (speed inversely proportional to its radius); now and then the chain breaks for a hammer or a pair of goggles, each at most once per row. Gears carry a brass hub ring and dot.

**Background: Tinker's line with sparks from the screen edges** (option A in `artificer-bg.html`). One line runs around the screen edges, inside the faded centre, starting at a random point and direction. Along it, it draws a large gear (which turns), a hammer and a pair of goggles, in random order. When each shape completes, a shower of sparks shoots in from a random side of the screen, arcing under gravity and fading in about a second. The sparks sit on their own layer above the background mask, so they aren't dimmed with the centre fade. Background timing as the other classes (`BG_TIMING`).

**Engine additions** this needs: a "spin" part (a group rotating for the whole cycle) and spark bursts timed to a shape's completion; the existing "move" part may cover sparks. Off and reduced motion follow base spec 7.5: one static frame, no spin, no sparks.

**Class icon:** BG3 has no Artificer. Use a game-icons.net gear-and-tool icon (*my call*, base spec 4.4 fallback rule), tinted to fit next to the BG3 class icons.

**Start screen:** the grid gains a 13th class. Placement is left to the builder, within the approved look.

## 8. Fixes pulled into this project

Two items from the owner's still-open list get worse with more content, so they are fixed here (*my call*), in batch 1:
1. **Shared option lists double-count.** Fighter and Paladin share `fighting-style`; Dragonborn and Draconic Bloodline share `draconic-ancestry`; both slots show "2 of 1 chosen". Tasha's adds fighting styles to more classes and Artificer infusions are another shared-shape list.
2. **Spell cost notes aren't shown.** Grant notes like "2 sorcery points" are loaded but never displayed. Many new subclass spells depend on them (e.g. Shadow Magic's Darkness for 2 sorcery points).

Also *my call*: with roughly 110 subclasses, check that the subclass pick screen and the editor's subclass step stay quick to scan on a phone. If a class's list gets long, the builder may group or sort it, within the approved look.

## 9. Left to the builder

- The data schema details for book, optional and the new spell grant kinds.
- How multi-book extraction is scripted, as long as every card is checked against its page.
- Per-book page offsets.
- Exact generator parameters and timings for the Artificer motifs, within the mockups' look.
- Where Artificer sits on the start screen.
- Which game-icons.net icons are used as fallbacks.
- Splitting a batch further if it turns out large.
