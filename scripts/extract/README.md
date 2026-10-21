# Extraction scripts

These scripts run on the owner's machine only. They need Node 24 (it runs the `.ts` files directly), poppler (`pdfimages`, `pdftotext`) on the PATH, and the scanned PHB at `PHB_PDF` (see `config.ts`). Their caches live in `.cache/`, which git ignores.

The app reads only `data/*.json`. Every card's text is written in our own words, never copied from the book or the SRD.

## Sources of truth

- **Spells:** `spell-facts.json` (with `spell-overrides.json`) holds the facts, `spell-summaries.json` holds our text and `spell-icons.json` holds the icons. `build:spells` combines them into `data/spells.json`, so never edit `data/spells.json` by hand.
- **Features, feats, races, subclasses, options:** the JSON under `data/` is the source. Edit it directly. No script regenerates it, though `extract:icons` fills in missing `icon` fields.

## Scripts, in rerun order

| Step | Command | What it does |
| --- | --- | --- |
| 1 | `npm run extract:pages -- <from> <to>` | Writes `.cache/phb/p<page>.png` (the page image) and `p<page>.txt` (the scan's poor OCR text layer) for book pages. Other scripts call it for any page they need. |
| 2 | `npm run extract:srd` | `fetch-srd.ts` fills `.cache/srd/` from dnd5eapi (`https://www.dnd5eapi.co/api/2014/spells`): `_list.json` plus one file per SRD spell. It fetches one request at a time and skips files already cached. **Run it before `extract:facts`.** |
| 3 | `npm run extract:facts` | `spell-facts.ts` builds `spell-facts.json` from the structured SRD fields (it never reads SRD prose), `spell-nonsrd.json` (the PHB spells the SRD lacks) and `spell-overrides.json`. In an override, `null` deletes a key. It keeps the class lists already in the file and finds each spell's page in the OCR text. |
| 4 | `npm run extract:lists` | `apply-spell-lists.ts` writes the class lists from `spell-lists.json` into `spell-facts.json`. |
| 5 | `npm run extract:icons` | `icons.ts` resolves bg3.wiki icons for spells (`spell-icons.json`) and for the records under `data/`. Its lookups are cached in `.cache/icons.json`, and `icon-aliases.json` maps names that differ. |
| 6 | `npm run build:spells` | `build-spells.ts` merges facts, summaries and icons into `data/spells.json`. |
| 7 | `npm run check:ocr -- [spells\|features\|feats]` | `check-ocr.ts` compares every card with its page's OCR text. It fails a card when a number on the card isn't in the book, or when any field (description, higher levels, material, triggers, prerequisite text, resource, uses) shares 8 or more consecutive words with the page. Words of 4+ letters still match across one misread letter. `ocr-accept.json` lists reviewed exceptions, and the report goes to `.cache/ocr-report.md`. |

`ocr.ts` (the matching logic), `pages.ts` (page extraction) and `config.ts` (paths) are shared modules. `npm run build` type-checks this folder.
