# Spellbook & Steel — a D&D 5e companion

> **Work in progress.** Only a few classes and sample spells are in so far. Full Player's Handbook content, character import and the animated class backgrounds are still being built.

A phone-first cheat sheet for D&D 5e (2014 Player's Handbook rules). Players pick their class and level and get quick access to their actions, reactions, cantrips and spells, each with a BG3-style card showing the description, cost, components and dice. The paper character sheet stays the source of truth; this is only a lookup.

Live site: https://thetrexx.github.io/dnd-5e-companion/

On a phone, open the link and use "Add to Home Screen" so it opens full-screen like an app.

## Development

Requires Node 22 or newer.

```bash
npm ci          # install dependencies
npm run dev     # local dev server
npm test        # unit tests (Vitest)
npm run e2e     # browser tests (Playwright, mobile viewport)
npm run build   # type-check and build into dist/
npm run preview # serve the built site
```

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`: it installs dependencies, runs the unit tests, builds, and publishes `dist/` to GitHub Pages. The repo's Pages source must be set to "GitHub Actions". The build uses relative paths (`base: './'`) and hash routing, so it works from any sub-path.

## Themes

Colours live only in `src/styles/themes/`. To add a theme, copy `faerun.css` to a new file, change the selector and the tokens, and add the theme to `THEMES` in `src/theme/themes.ts` so it shows in Settings. A unit test fails if a colour is written anywhere else under `src/`.

## Credits

Spell icons are hotlinked from [bg3.wiki](https://bg3.wiki/). Fallback icons are from [game-icons.net](https://game-icons.net/) by Lorc (CC BY 3.0, see `public/icons/fallback/CREDITS.txt`). Fonts (Inknut Antiqua, IM Fell English, Noto Serif, EB Garamond, Noto Sans Symbols 2) are under the SIL Open Font License. Design docs are in `docs/superpowers/`.
