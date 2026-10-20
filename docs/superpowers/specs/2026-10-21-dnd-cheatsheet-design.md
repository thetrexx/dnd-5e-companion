# D&D 5e Action & Spell Cheat Sheet: Design

Date: 2026-10-21
Status: draft for review

## 1. Intent

The owner is about to DM D&D 5e (2014 Player's Handbook rules) for the first time. The players are new and keep forgetting how their class plays: what actions they have, what their spells do, what a spell costs and needs. Printed spell cards were considered and rejected: too costly and slow to make for a rotating group of players.

The answer is a free website the players open on their own phones (mixed iOS and Android) during combat. It is a cheat sheet, not a character sheet: the paper sheet stays the source of truth for HP, slots, inventory and everything else. The site answers one question fast: "what can I do on my turn, and what does it do?"

The look matters to the owner. It should feel like Baldur's Gate 3 in Faerûn: dark, gold, BG3 icons, BG3-style tooltips, with subtle animated class themes. The owner approved every visual decision below against live mockups (see section 13).

## 2. Goals, non-goals, anti-goals

**Goals**
- A player finds any action or spell they can use in a few taps and reads a clear card for it.
- Works on any modern phone browser, iOS Safari and Android Chrome included. No install needed.
- Optional saved character, so a player sees only their own spells and actions.
- Multiclass characters are fully supported.
- The theme lives in one file per theme, so new themes are cheap to add and players can switch between them.

**Non-goals**
- Not a character sheet. No HP, no spell slot tracking, no inventory, no dice roller. The owner removed a spell slot display explicitly: players track slots on paper.
- No accounts, no cloud sync, no backend.
- No 2024 rules. Content is 2014 Player's Handbook only.
- No content from books other than the 2014 Player's Handbook.

**Anti-goals** (would make it a failure even if it works)
- Slow or janky on a mid-range phone during a session.
- Animations that make text hard to read or pull attention from the content.
- Mixing rules editions on a card.
- Anything that sends a player to log in, sign up or install.

## 3. Constraints

- **Hosting:** GitHub Pages, from a public repo. Static files only. Hosting must stay free.
- **Storage:** the browser's local storage only.
- **Connectivity:** players have internet at the table. Offline support is not required.
- **Content source:** the owner's PDF of the 2014 Player's Handbook, at `C:\Users\trexx\Desktop\DnD5E PlayersHandbook.pdf` (confirmed by the owner; `DnD5E.pdf` next to it is the Dungeon Master's Guide and is not a source).
- **Legal posture:** publishing Player's Handbook text outside the SRD is redistribution of WotC IP. The owner was told this, including that the realistic worst case is a DMCA takedown of the repo, and chose to accept the risk. The site must be free, non-commercial and carry WotC's Fan Content Policy notice (section 11).

## 4. Content and data

### 4.1 Extraction

All rules text is extracted **once** from the PDF into data files that ship with the site. Nothing is fetched or parsed from the PDF at runtime. The extraction can be scripted, manual or mixed. The output is what matters, and it must be checked by hand against the book. Only the SRD 5.1 is free to publish; the owner accepted the risk for the rest.

Scope:
- **All 361 Player's Handbook spells**, including the 45 that are not in SRD 5.1. Spells with a wizard's name in the PHB (e.g. "Tasha's Hideous Laughter") keep the PHB name.
- **Class spell lists** for Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard, plus the Eldritch Knight and Arcane Trickster restrictions (wizard list, limited by school as the PHB states).
- **All 12 classes and all PHB subclasses.** Only features a player *uses* on their turn are needed: anything that costs an action, bonus action or reaction, or is a toggle/resource they spend (Rage, Wild Shape, Font of Magic, Metamagic, Channel Divinity, Lay on Hands, Ki abilities, Action Surge, Second Wind, Cunning Action, Sneak Attack, Bardic Inspiration, Divine Smite, etc.). Passive features are out of scope.
- **Class tables** needed for counts: cantrips known, spells known, highest spell level by class level, for every class and level 1 to 20, plus the prepared-spell formulas.
- **Class options a player chooses** (owner's decision: picked in the editor, so the Actions page shows only what the character has): Eldritch Invocations, Pact Boon, Metamagic, Battle Master maneuvers, Way of the Four Elements disciplines, Fighting Styles, Hunter choices, Totem Warrior animals, Circle of the Land terrain, Draconic ancestry, Favored Enemy and Natural Explorer, Ranger and Beast Master companion basics, and any other PHB "choose one" feature that changes what a player can do on their turn. Each option needs its prerequisites (class level, Pact Boon, etc.) and how many may be chosen at each level.
- **Subclass bonus spells:** Cleric domain spells, Paladin oath spells, Circle of the Land circle spells, Warlock patron expanded spells. Domain, oath and circle spells are added automatically from the subclass and don't count toward the prepared limit. Patron spells widen the Warlock's list to pick from.
- **Spells from outside the class list:** Bard Magical Secrets (any class list), Warlock Mystic Arcanum (levels 6 to 9, one each, beyond the normal table), Book of Ancient Secrets rituals, and the free-school picks for Eldritch Knight and Arcane Trickster.
- **Races and subraces** (owner's decision): every PHB race and subrace, with the traits a player uses on their turn (e.g. Dragonborn Breath Weapon and its damage type by ancestry, Half-Orc Relentless Endurance and Savage Attacks, Halfling Lucky) and racial spells (e.g. Tiefling Infernal Legacy, Drow Magic, High Elf cantrip, Forest Gnome Minor Illusion), including the character level each racial spell unlocks at.
- **Feats** (*my call*: the owner said yes to race actions when asked about races and feats together; confirm): every PHB feat that grants an action, bonus action, reaction or spells (e.g. Polearm Master, Sentinel, War Caster, Shield Master, Great Weapon Master, Magic Initiate, Ritual Caster).
- **Generic combat options** from the PHB combat chapter. Actions: Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object, plus the Attack variants Grapple and Shove. Bonus action: the two-weapon fighting off-hand attack. Reaction: Opportunity Attack.
- **Spell component rules** for the Verbal, Somatic and Material explainers.

### 4.2 Spell record

Each spell needs at least: name, level, school, casting time, range, components (V, S, M with the material text, gold cost and whether it is consumed), duration, concentration, ritual, description, "At Higher Levels" text, classes, PHB page.

Derived fields for the card, filled during extraction:
- **Cost type:** action, bonus action, reaction (with trigger) or longer casting time.
- **Damage or healing summary,** where the spell has one: dice expression and type (e.g. "3 darts × 1d4+1 Force"), and a min~max range (e.g. "6~15 Damage"). Spells without a fixed number get no damage line.
- **Resolution:** attack roll, saving throw (which ability) or automatic hit.
- **Upcast** in one short line where possible, e.g. "+1 dart per slot level above 1st".

### 4.3 Class features

Each usable feature: name, class, subclass (if any), level gained, cost type, resource spent and amount (e.g. 1 Ki point), uses and recharge (short/long rest) where fixed, description, PHB page. Features that scale with level (Rage damage, Sneak Attack dice, Martial Arts die) show the value for the character's level when a character is loaded.

### 4.4 Icons

- **Spells and features:** BG3 icons, **linked live from bg3.wiki** (owner's decision), not copied into the repo. The wiki allows embedding from other sites (tested: no hotlink block, `Access-Control-Allow-Origin: *` on its API). Resolve each name to an image URL once, at build/extraction time, using the MediaWiki API, and store the URL in the data. Do not call the wiki API from players' phones.
  - Names don't always match. Known cases: BG3 uses British spelling ("Mage Armour"), and some files carry a suffix ("Shield_spell_Icon.webp"). Keep an alias table.
  - Coverage: 210 of 361 PHB spells match by exact name. Expect about 40% to need the fallback.
- **Fallback:** an icon from game-icons.net (CC BY 3.0). These may be copied into the repo as SVG (the license allows it with credit).
- **Menu row icons** (all from bg3.wiki): Actions = `Action_Icon.png` (green circle), Bonus Actions = `Bonus_Action_Icon.png` (orange triangle), Reactions = `Reaction_Icon.png`, `<Class> Actions` = `Class_<Class>_Hotbar_Icon.png`, switching to the subclass hotbar icon (`Class_<Class>_<Subclass>_Hotbar_Icon.png`) when a subclass is set, Cantrips = `Class_<Class>_Plain_Icon.png`, spell levels = `Spell_Slot_Icon.png` with the level number drawn on top. Warlock levels use `Warlock_Spell_Slot_Icon.webp`.
- **Component icons** (game-icons.net): Verbal = `lorc/shouting`, Somatic = `lorc/magic-palm`, Material = `lorc/swap-bag`.

## 5. Screens and flow

### 5.1 Start screen
Grid of the 12 classes plus a highlighted **My Character Sheet** entry.
- Picking a plain class asks for a level, then opens that class's menu with **every** spell and feature the class can use (no character saved).
- **My Character Sheet** opens the character editor, or the saved character's menu if one exists.

### 5.2 Character editor
Fields: name; race and subrace; one or more classes, each with its level and subclass; the class options the player has chosen (section 4.1), offered only once their level and prerequisites allow them; feats; the spellcasting ability modifier for each prepared-caster class (Cleric, Druid, Paladin, Wizard). The app computes cantrips known, spells known or prepared, and the highest spell level for each class from the PHB tables and shows them as guidance. The player then ticks the spells they have, per class.
- Subclass bonus spells (domain, oath, circle) are ticked automatically and marked "always prepared". They don't count toward the limit.
- Racial spells are added automatically from race and character level.
- Spells gained from feats (Magic Initiate, Ritual Caster) are picked in the feat's own step.
- An "Add a spell from another list" option covers Magical Secrets, Mystic Arcanum and the Eldritch Knight / Arcane Trickster free picks. Each added spell is stored with the class that granted it.
- The editor is a step-by-step form (race, classes, options, feats, spells) rather than one long page (*my call*: there are now many fields).
- One saved character per device (*my call*: the request was for "their character"; multiple characters can come later).
- Over-limit picks show a gentle warning but are allowed (*my call*: house rules and feats exist, and the paper sheet is the authority).
- Wizard: the player ticks their **prepared** spells, limited by INT + wizard level (*my call*: the spellbook itself is not modelled).

### 5.3 Main menu
Header: the character name in the title font, between an ornament and its mirror image, with gold lines running out to the screen edges. Class and levels under it (e.g. "Sorcerer 3 / Druid 2").

Rows, top to bottom, each with an icon (section 4.4) and its label only. No right-hand hint text (owner removed "everyone", feature names and "N known"):
1. Actions
2. Bonus Actions
3. Reactions
4. `<Class> Actions`, one row per class
5. `<Race> Actions` (e.g. "Dragonborn Actions") when the race has any, then `Feats` when the character has feats with actions (*my call* on placement and labels). Gold wash, no motif. Icon: the bg3.wiki race or feat icon if one exists, otherwise a game-icons.net fallback.
6. The **MAGIC** separator: ☙ MAGIC ❧ with gold lines to the edges
7. Cantrips, then Level 1 to Level 9 spells, ordered by spell level, then by class within a level, e.g. "Level 1 Sorcerer Spells", "Level 1 Druid Spells", "Level 2 Sorcerer Spells". A single-class character drops the class name ("Level 1 Spells"). Levels the character can't cast yet are shown dimmed.

Rows are **shortcuts**: each one opens the Actions page or the Spells page scrolled to its section.

### 5.4 Actions page
One scrolling page of icon grids with separators: Actions, Bonus Actions, Reactions, then one section per class (and subclass) with that class's usable features and chosen options, then the race section, then feats. No spells appear here, not even reaction spells such as Shield. No filter toggle.
- With no character (a plain class was picked), class sections show every feature and every choosable option up to the chosen level, and no race or feat sections.

### 5.5 Spells page
One scrolling page: Cantrips, then Level 1, Level 2 and so on, one section per class at each level for multiclass characters. Section separators: ☙ `Level 1` `Sorcerer` ❧, with the level in gold and the class name in its class colour. Header (back link, page title, toggle) stays fixed while the list scrolls. No actions appear here.
- **No character:** every spell on the class list.
- **Character with spells picked:** only the character's spells. Sections where they have nothing are hidden.
- **Toggle**, top right, only when a character has picked spells: **My spells / All**. In All, every class spell is shown. The character's own spells get a gold ring. Levels they can't reach yet are dimmed with a note such as "Unlocks at Sorcerer 5".
- Jumping from a menu shortcut to a section that My spells hides switches the toggle to All.
- Spells granted by a subclass, by Magical Secrets or similar sit in the section of the class that granted them, with a small tag naming the source ("Domain", "Magical Secrets"). Racial spells and feat spells get their own sections after the class sections at each level ("Cantrips · Tiefling", "Level 1 · Magic Initiate"), in gold with no class motif (*my call*).

### 5.6 Spell card
BG3 tooltip style, opened by tapping an icon on either page. Top to bottom:
- Spell name (title font), "Level 1 Evocation Spell", icon top right.
- Damage line and dice summary when the spell has one ("6~15 Damage", "3 darts × 1d4+1 Force").
- Divider: ornament U+E001 (EB Garamond), a line, and the same ornament mirrored. The divider stays inside the card's text margins.
- Description (light body font), then "❦ *At Higher Levels.* …" when present.
- Tags line: range, duration, and attack/save/auto-hit. Concentration and ritual appear here too when they apply.
- **Component icons:** Verbal, Somatic, Material as 48 px round icons on pure black circles. Components a spell doesn't use are dimmed. Tapping one opens a short explainer under the row (tap again to close). The Material explainer lists the actual item, its gold cost, whether it is consumed, and whether a component pouch or focus can replace it.
- Cost bar: ● Action / ▲ Bonus Action / reaction, plus the slot level.
- Feature cards (from the Actions page) use the same layout minus the spell-only parts, showing the resource spent and uses/recharge instead.

### 5.7 Settings
Reached from the start screen and the menu.
- **Theme:** list of installed themes (one at launch: Faerûn).
- **Animation strength:** Off, Faint, Medium (default), Strong. Off is forced when the phone has reduced motion turned on.
- **Backup code:** export the saved character as a text code; import a code to restore it.
- **About:** credits and notices (section 11).
- Tip shown once to iPhone users: add the site to the home screen so iOS doesn't wipe saved data (see 9).

## 6. Multiclassing rules (PHB chapter 6)

- Spells **available** to each class are worked out as if single-classed at that class's level (Druid 2 reaches level 1 druid spells only, Sorcerer 3 reaches level 2).
- Cantrips known, spells known and prepared are per class, as if single-classed.
- Spell slots are not shown anywhere, so the Multiclass Spellcaster table is not needed for display.
- Eldritch Knight and Arcane Trickster count as wizard-list casters for the spell rows. Their rows are labelled with their own class ("Level 1 Fighter Spells") and use the Wizard Weave motif in Wizard colours, as agreed with the owner when the motifs were approved.

## 7. Visual design

The approved mockup (section 13) is the reference for every value below. Where this text and the mockup disagree, follow the mockup and flag it.

### 7.1 Base look
Dark warm background, gold accent, rows as dark panels with a faint gold wash for everything above the MAGIC separator. All text gets a soft drop shadow (`0 1px 2px` dark plus an `8px` dark glow).

### 7.2 Class colours
| Class | Colour |
|---|---|
| Barbarian | #b5532a |
| Bard | #b0408a |
| Cleric | #8f9aa8 |
| Druid | #4fa846 |
| Fighter | #7a6248 |
| Monk | #2a9a9a |
| Paladin | #c9a227 |
| Ranger | #5e7a3a |
| Rogue | #4b4a5e |
| Sorcerer | #c8323c |
| Warlock | #7b47b8 |
| Wizard | #3a6fc4 |

### 7.3 Animated spell rows
Every spell row (cantrips and spell levels) carries a faint wash in its class colour plus a **procedural line-art motif** that grows in, holds, then withers away in the order it grew, roughly every 10 seconds. A new random pattern is drawn every cycle. Each row starts at a random offset, so rows never pulse in sync. The motif fades out towards the right so the text stays readable.

| Class | Row motif |
|---|---|
| Sorcerer | Smoke wisps curling at the ends, embers along them |
| Wizard | Crossing lattice of thin threads (the Weave), small circle-and-triangle sigils |
| Druid | Vine with spiral tendrils, leaves and small blossoms ("Floral Growth") |
| Warlock | An eye opens, tentacles reach out from it |
| Cleric | Rays fanning from the left edge, halo rings, sparkles at the tips |
| Paladin | A horizontal blade of light, mirrored heraldic scrolls, diamonds |
| Bard | Wavy five-line music staff with notes landing on it |
| Ranger | Faint trail with paw prints, grass at the bottom edge |

Non-spell rows (Actions, Bonus Actions, Reactions, class actions) only get the gold wash, no motif.

### 7.4 Animated backgrounds
The page background runs the same idea for the current class: bigger, about 3× slower, much fainter, living at the screen edges with the centre faded out.
- **Which class:** on the menu, the class with the most levels (a tie goes to the class taken first). Inside a class's section or card, that class. With no character, the "No class" background.
- **Per class:**

| Class | Background |
|---|---|
| Sorcerer | Smoke columns rising with embers, **plus a vein of blood flowing left to right** across the lower third (Perlin-noise streaks, darker edges, brighter core) with tumbling blood cells riding it; the vein gathers, flows and thins over ~15 s |
| Wizard | A full **D&D dice set** (d4, d6, d8, d12, d20) inscribing itself across the top, long Weave threads below. **No pentagrams or hexagrams:** the owner ruled these out explicitly |
| Druid | Vines climbing from the bottom edge and curling over |
| Warlock | A large eye with slit pupil and lashes in a top corner, **plus Perlin-noise mist** gathering from the bottom, drifting up and evaporating into holes (~17 s cycle) |
| Cleric | Rays falling from above, halo rings at the top |
| Paladin | Heraldic frame: lines down both side edges with mirrored scrolls and diamonds |
| Bard | Two music staves sweeping diagonally across the lower screen |
| Ranger | Paw prints wandering up from the bottom, grass along the bottom edge |
| Barbarian | Jagged branching cracks from the bottom corners, three claw marks in a top corner |
| Fighter | Crossed swords behind a heater shield in a lower corner, **plus arrows flying across on an arc** from either side |
| Monk | An ensō brush circle in a top corner with wisps that draw a **fist outline** inside it, ki currents and drifting petals below |
| Rogue | Crescent moon, daggers thrown along dotted arcs, **plus coin pouches, daggers and coins tumbling from the top** |
| No class | Faint gold contour lines like an old map, a compass star |

### 7.5 Animation rules
- Strength setting scales all opacities. Medium is the approved default.
- Line art: SVG paths drawn with stroke-dash animation through the Web Animations API, so pausing and the strength setting work through one place.
- Noise layers (warlock mist, sorcerer blood): a 2D canvas at 1/4 to 1/5 resolution, scaled up and blurred, about 25 frames per second, roughly 1 ms per frame. Pause when the tab is hidden.
- Reduced motion or Off: draw one static, fully grown frame of each motif and skip the noise layers' motion.
- Must stay smooth on a mid-range phone with a full menu of animated rows on screen.

### 7.6 Fonts
| Role | Font | Notes |
|---|---|---|
| Most text (rows, labels, card stats) | Inknut Antiqua Medium | OFL |
| Long text (spell descriptions) | Inknut Antiqua Light | OFL |
| Digits 0 to 9 in every font above and the title font | Noto Serif Medium / Light | OFL. Inknut and IM Fell only have old-style numbers where 1 reads as I. Ship only the digits, layered with `unicode-range` |
| Titles: character name, MAGIC and section separators, page titles, spell names | IM Fell English | OFL |
| Ornaments | EB Garamond (☙ ❦ ❧, U+E001, U+E002) and Noto Sans Symbols 2 (U+1F650 to U+1F667) | OFL, subset to the glyphs used |

All fonts are subset to the characters used and served as WOFF2. The subset files from the mockups are in `docs/superpowers/mockups/` (Latin subsets). The source TTFs are on the owner's Desktop (`InknutAntiqua-Medium.ttf`, `InknutAntiqua-Light.ttf`, `NotoSerif-Medium.ttf`, `NotoSerif-Light.ttf`); IM Fell English, EB Garamond and Noto Sans Symbols 2 come from the google/fonts repo. Ship each font's OFL license text with the site.

**Do not use** 1756 Dutch or IM Fell Flowers: both were tried and rejected over their licenses.

## 8. Theme architecture

- One file per theme, e.g. `themes/faerun.css`, defining CSS custom properties on `:root[data-theme="…"]`. **No colour, font or effect strength anywhere else in the code.**
- Tokens cover: base colours (background, surface, border, text, dim text, accent), text shadow, row wash strength, every class's colour, motif line colour and extra colours (druid leaf and bloom, warlock mist, sorcerer blood, blood highlight and cells…), per-class row and background opacities, and the four font roles plus the ornament font.
- SVG motifs read colours through CSS. Canvas layers read their colours from the computed theme tokens when they start, and restart when the theme changes.
- Adding a theme = copy the file, change values, register it in one list. The Settings menu shows that list.

## 9. Storage and backup

- Saved in local storage: the character (race, subrace, classes, levels, subclasses, chosen options, feats, modifiers, picked spells and where each came from), the chosen theme, the animation strength, and the My/All toggle state.
- iOS Safari deletes a site's local storage after 7 days of browser use without visiting it; sessions are weekly or less. Two mitigations: the home-screen tip, and the backup code.
- Backup code: a compact text encoding of the character (e.g. JSON, compressed, base64url) that a player can copy and paste. Import validates it and shows a clear error on a bad code.
- Every read and write of storage is wrapped so a blocked or empty storage never breaks the page.
- Version the saved data so later releases can migrate it.

## 10. Hosting and repo

- Repo: `D:\GitHub\dnd-cheatsheet` (*my call* on the name), pushed to the owner's GitHub and served with GitHub Pages.
- Static site. A build step is fine (e.g. for subsetting fonts or bundling data) as long as the published output is static files.
- Add a web app manifest and icons so "Add to Home Screen" gives a proper app icon and name.

## 11. Credits and notices (About screen)

- "Unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC."
- SRD 5.1 attribution under CC BY 4.0 for SRD content.
- Spell and class icons from Baldur's Gate 3 © Larian Studios, via bg3.wiki.
- game-icons.net icons, CC BY 3.0, with the authors' names (e.g. Lorc).
- Font credits: Inknut Antiqua, Noto Serif, Noto Sans Symbols 2, IM Fell English, EB Garamond (all OFL).
- No WotC logos or trademarks as branding.

## 12. Left to the builder

- Framework or none, file structure, build tooling, test approach.
- How the PDF extraction is done, as long as the output is correct and hand-checked.
- The exact data schema, beyond the fields in section 4.
- Fallback icon choice per spell or feature.
- Exact animation timings and counts, within the look of the mockup.
- Navigation mechanics (history, back button, deep links).

## 13. Reference mockups

`docs/superpowers/mockups/final.html` is the last approved mockup. It contains the working prototypes of every row motif, every class background, both noise layers, the fonts and ornaments, the menu with icons, the scrolling Spells page with the toggle, and the spell card with component explainers. It is a fragment written for the brainstorming preview server (it expects to be wrapped in a page and loads fonts from `/files/`), so treat it as reference code, not product code. Its colours, timings and generator code can be lifted directly.
