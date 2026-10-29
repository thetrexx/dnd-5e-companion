# Start Menu Redesign and Rename: Design

Date: 2026-10-29
Status: draft for review
Extends: `2026-10-21-dnd-cheatsheet-design.md` (the "base spec") and `2026-10-27-more-books-design.md`. Everything there still holds unless this document says otherwise.

## 1. Intent

The start screen is the first thing every player sees. Today it is a two-column grid of outlined tiles, with the Artificer (added in batch 4) sitting alone and centred in a last row. The owner wants the menu to feel as alive as the class pages: each class button should carry the same moving line art the class shows on its own spell list, set on a soft coloured ribbon instead of a hard outline. The app is also renamed, from "Spellbook & Steel" to **"D&D 5E Cheat Sheet"**, because the audience has widened to any 2014 5e player (more-books spec, section 1) and the new name says what the app is.

Every look decision below was made by the owner against live mockups on 2026-10-29. The approved mockup is `docs/superpowers/mockups/start-menu.html` (section 9 explains how to run it).

## 2. Goals, non-goals, anti-goals

**Goals**
- One full-width column of buttons, classes in A–Z order (Artificer first).
- Each class button: a "twin strands" ribbon flare in the class colours plus the class's own line-art animation.
- My Character Sheet stands apart: no ribbon, gold lines, a gold-bar shine, an icon.
- The rename, everywhere the app names itself.

**Non-goals**
- No change to any other screen's look. The strands are a start-menu thing only; spell-list rows keep their current outlined style.
- No change to what the buttons do or where they go.
- No new theme. There is one theme (`faerun`); new tokens go into it.

**Anti-goals**
- A busy screen. The owner's first reaction to the strands was "too strong, the whole screen looks too busy"; the approved strength (B3) is about a quarter of the first try. Anything that brightens the menu again (stronger strands, brighter motifs, extra effects) misses the point.
- Breaking saved characters or backup codes. They must keep working across the rename.

## 3. Layout

- The settings gear stays where it is (top right).
- Title: "D&D 5E Cheat Sheet", same font, size, colour and position as the current title.
- Under it, **My Character Sheet** (section 5), then the 13 class buttons in one column, A–Z: Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard.
- Class buttons span the content width. The class icon and name sit **centred** together: **17px text, 38px icon**, button about 58px tall, about 4px between buttons (mockup values; the builder may adjust a few px for touch-target comfort).
- No outline, no tile background. The ribbon and the animation are the button's whole shape.
- The list is taller than a phone screen; it scrolls, as today.

## 4. Class buttons

Each class button has three layers, back to front: the strands, the class animation, then icon and name.

### 4.1 Twin strands (the ribbon flare)

Two soft ribbons wave across the button, drifting against each other, slightly brighter where they cross (option "B3" in the session; generator `STYLES.twin` with the `e1`/`e2` config in the mockup).

- **Shape:** each strand is a band whose centre line is a slow sine wave and whose thickness pinches and swells, as if the ribbon twists. The bands run the **full screen width and off both edges**: the strand layer bleeds past the screen's side padding to the screen edges, and a little above and below the button, so the strands never end in a hard cut.
- **Colour:** strand A uses the class colour (`--<class>`), strand B the class line colour (`--<class>-line`). Both blend with `screen` and are softly blurred.
- **Strength:** very dim. Approved values: strand A peak opacity .22, strand B .10, staying at about 85% of that out to the edges (nearly even across the width). Thickness never drops below 75% of its middle value.
- **Motion:** the waves drift slowly (about 0.5–0.75 radians per second, random per button, the two strands moving in opposite directions). Each button starts at a random phase, so neighbours never move in step.
- Exact mockup parameters are in `ribbon()` and `STYLES.twin` in the mockup; treat them as the approved look.
- **Wider windows** (phone landscape, tablet, desktop; the screen column is capped at 480px). *My call:* the strand layer spans the whole window width. The wavelength is fixed in px, matching the mockup's 390px phone, so the waves don't stretch flat on wide screens. Out to about 120px past each column edge the strands keep their approved strength, then fade to zero over the next 120px or so. On a phone, where the window is barely wider than the column, they simply run off the edges as approved. Desktop gets no hard cut and no 13 bands across the whole monitor. The page must still never scroll sideways (existing 320px e2e check).

### 4.2 The class animation

The class's line art, drawn with the existing motion engine (`runLoop`, `ROW_TIMING`) and the class line colour and row opacity (`--<class>-line`, `--<class>-row-o`), as on its spell list. One difference from spell rows: the art **fades out at both ends** of the button (spell rows fade only on the right), so it sits centred like the strands.

Which art each class uses:
- **Artificer, Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Warlock, Wizard:** their existing row motif (`ROW_MOTIFS`).
- **Fighter, Monk, Rogue:** they have no spell rows, so no row motif. The button runs their **background** motif (`BG_MOTIFS`) at row size and row timing. Owner approved how this looks in the mockup, including shapes that are cut off at the button edges.
- **Barbarian:** a new **blood spray** motif (section 4.3), replacing the background art the owner rejected for this button.

### 4.3 Barbarian blood spray

A slow-motion spray of blood drifts across the button from left to right (`bloodSpray()` in the mockup). Approved look:
- About 28 drops start just off the left edge at staggered times. About 7 are big (radius 3.2–5) and stay near the centre line. The rest are small (radius 1.1–2.4) and scatter wider up and down.
- Each drop is a teardrop pointing along its path. It stretches as it flies (big drops more), sags a little as if under gravity, and wobbles slightly. It fades in at the start and out near the right edge.
- Slow: one drop takes 8.5–12.5 s to cross.
- Each big drop leaves about 3 small spatter dots that pop in where it has just passed. They are faint, and they wither with the cycle like other popped parts.
- **Colour: blood red**, the existing `--sorcerer-blood-hi` (`#c8323c`), not the Barbarian orange (owner chose option "E2"). The builder may add a Barbarian-named token pointing at the same colour.
- It uses the engine's existing part kinds (`move` for drops, `pop` for spatter). Like every generator, it is pure and seedable.
- **Still frame** (reduced motion). The engine's static mode draws a `move` part at its start position, and every drop starts off the left edge, so the still frame would show only faint dots. *My call:* add an optional field to `move` parts, a keyframe offset that the static mode uses instead of the start (for example `still: .45`). The blood spray sets it, so its still frame shows the drops mid-flight. Movers that don't set it render exactly as today, so other screens' still frames don't change.

## 5. My Character Sheet

The one button without a ribbon. It should read like a gold bar catching the light.
- **Lines:** one thin gold line along the top edge and one along the bottom, each fading out at both ends (accent colour, about .75 opacity). No side lines.
- **Wash:** a very faint gold fill between the lines, also fading out toward both sides, so the button never reads as a box.
- **Shine:** a soft, slanted band of pale gold light sweeps left to right across the button, about every 5 s (the sweep takes about 1.5 s, then a rest), clipped to the button.
- **Icon:** Material Symbols Outlined **`person_edit`** (fill 0, weight 400, grade 0, optical size 40), chosen by the owner. It sits left of the text, in the cream text colour (*my call*). The SVG path is inlined in the mockup. Material Symbols are Apache 2.0, so add a line to the README credits.
- **Text:** "My Character Sheet", with the same subtitle as today: "Create your character", the character's name, or the class line when there is no name. The two lines are left-aligned next to the icon, and the group is centred in the button.
- It sits above the classes with a little extra space below it, and is a bit taller than a class button (about 74px in the mockup).
- Tapping it does what it does today.

## 6. Motion settings

Base spec 7.5 still rules: Animation "Off" removes the moving patterns (old phones, battery), and the phone's reduced-motion setting shows them still.
- **Animated:** everything above.
- **Reduced motion:** the strands drawn once, standing still; each class animation as one still frame (the engine's existing static mode); no shine.
- **Off** (*my call*): the strands stay, standing still, because without them the class buttons would have no shape at all. No class animation, no shine.
- The motion strength setting (faint, medium, strong) scales the strands' opacity like it scales the other motifs (`--motion-i`). *My call.*
- Strands and class animations pause while off screen, and while the tab is hidden, like spell rows today (the off-screen pause shipped in `183694f`). The start screen has 13 buttons and most phones show only part of the list at once.
- **Performance bar** (*my call*; the base spec says "smooth on a mid-range phone"). In Chrome DevTools with the CPU throttled 4x, at a 390×844 viewport scrolled so the most buttons are on screen, the strands must hold about 30 fps or better, with no long tasks from the strand loop. Measure early, before polishing. If the mockup's approach misses the bar, give way in this order:
  1. Update the strands at a lower rate (they are slow, so 20–30 updates a second is enough).
  2. Use fewer points per strand path.
  3. Drop the `screen` blend.
  4. Only then touch the blur, which is most of the soft look.

## 7. Rename

"Spellbook & Steel" becomes **"D&D 5E Cheat Sheet"** everywhere the app names itself:
- the start screen title and the page `<title>`;
- the web manifest `name`, plus `short_name` **"D&D 5E"** (*my call*: home-screen labels truncate around 12 characters);
- the backup-code error text (`ERR_NOT_CODE` in `src/character/code.ts`): "That isn't a D&D 5E Cheat Sheet backup code.";
- the README heading;
- e2e tests that look for the old name.

**Kept as is:** backup-code prefixes (`SS1-`, `SS0-`), storage keys (`dndcs.*`), the repo name and the URL. Old codes and saved characters must keep working.

Old plans and specs in `docs/` keep the old name; they are history.

## 8. A–Z everywhere classes are listed

Artificer goes first because the menu is alphabetical (owner). The editor's class step (`StepClasses`, which lists `DATA.classes` in file order, with Artificer last) follows the same A–Z order (*my call*).

## 9. The mockup

`docs/superpowers/mockups/start-menu.html` is a full HTML page, made for the brainstorming preview server. It loads, from `/files/`:
- the app's fonts;
- `faerun.css` and `motion.css`, copies of `src/styles/themes/faerun.css` and `src/styles/motion.css`;
- `mx.js`, a bundle of the real motion code, built from `docs/superpowers/mockups/start-menu-mx-entry.ts` with `node node_modules/rolldown/bin/cli.mjs <entry> --format iife --file <dir>/mx.js`;
- `class-artificer.svg` from `public/icons/`.

It shows the two E phones; E2 is the approved one. Treat it as reference code: its generators (`ribbon`, `STYLES.twin`, `bloodSpray`) and the My Character Sheet CSS can be lifted. Its other options (`silk`, `flare`, the `short` and `big` modifiers) are rejected alternatives.

## 10. Left to the builder

- How the strands are rendered (SVG paths updated per frame as in the mockup, or something cheaper) and how they share a frame loop. It must look the same, and must hold up on an old phone with 13 buttons on screen.
- Where the menu's per-class art choice lives (for example, a menu motif map that falls back from `ROW_MOTIFS` to `BG_MOTIFS`, with the blood spray for Barbarian).
- Token names for the strand opacities, the shine and the button gold lines.
- Exact sizes and spacing within the mockup's look.
- Test coverage: the existing patterns (seeded generator unit tests, e2e for the start screen) are the model.
