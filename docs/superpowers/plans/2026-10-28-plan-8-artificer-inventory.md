# Tasha's Cauldron of Everything (TCE): Artificer inventory for batch 4

Source: page images `.cache/tce/p9.png`-`p23.png` and `p79.png` (book page numbers, each confirmed by its footer). Names, levels, pages, numbers, costs and short labels only; no rules text.
Cost key: **A** = action, **BA** = bonus action, **R** = reaction, **P** = passive, **free** = no action (a trigger or rider), **rest** = only changes at a rest or level-up (rebuild-only).
Abbreviations: PB = proficiency bonus, SR/LR = short/long rest, Int = Intelligence modifier, lvl = artificer level.
"In scope" = something a player uses on a turn, or a pick. P / rest-only rows stay out of the app.

---

## 0. Page map (pp. 9-23, plus 79)

| Page | Contents |
|---|---|
| 9 | Artificer intro, Artificers in Many Worlds, Creating an Artificer (flavor only) |
| 10 | **The Artificer table**; Quick Build; Hit Points; Proficiencies; Starting Equipment; Multiclassing sidebar; firearms note |
| 11 | Class Features: Magical Tinkering; Spellcasting (Tools Required, Cantrips, Preparing and Casting); Magic of Artifice sidebar (flavor) |
| 12 | Spellcasting Ability; Ritual Casting; **Artificer Spell List**; Infuse Item (Infusions Known, Infusing an Item) |
| 13 | Infuse Item cont.; Artificer Specialist; The Right Tool for the Job; ASI; Tool Expertise; Flash of Genius; Magic Item Adept; Spell-Storing Item |
| 14 | Spell-Storing Item cont.; Magic Item Savant; Magic Item Master; Soul of Artifice; Artificer Specialists; **Alchemist** (Tool Proficiency, Alchemist Spells, Experimental Elixir, elixir table d6 1-4) |
| 15 | Elixir table d6 5-6; Alchemical Savant; Restorative Reagents; Chemical Mastery; **Armorer** (Tools of the Trade, Armorer Spells, Arcane Armor) |
| 16 | Art; Arcane Armor cont.; Armor Model (Guardian, Infiltrator); Extra Attack |
| 17 | Armor Modifications; Perfected Armor; **Artillerist** (Tool Proficiency, Artillerist Spells, Eldritch Cannon) |
| 18 | Eldritch Cannons table; Arcane Firearm; Explosive Cannon; Fortified Position; **Battle Smith** heading + quote only |
| 19 | Battle Smith intro; Tool Proficiency; Battle Smith Spells; Battle Ready; Steel Defender; **Steel Defender stat block** |
| 20 | Extra Attack; Arcane Jolt; Improved Defender; **Artificer Infusions** intro; Arcane Propulsion Armor; Armor of Magical Strength |
| 21 | Art; Boots of the Winding Path; Enhanced Arcane Focus; Enhanced Defense; Enhanced Weapon; Helm of Awareness; Homunculus Servant |
| 22 | **Homunculus Servant stat block**; Mind Sharpener; Radiant Weapon; Repeating Shot; Replicate Magic Item |
| 23 | Replicable Items tables (2nd/6th/10th/14th); Repulsion Shield; Resistant Armor; Returning Weapon; Spell-Refueling Ring |
| 79 | Feats: Artificer Initiate (first feat on the page) |

Note: plan 7 listed "Battle Smith 18"; only the heading is on 18, all features are 19-20.

---

## 1. Class basics (p10)

| Field | Value |
|---|---|
| Hit die | d8 (HP at 1st: 8 + Con; later 1d8 or 5 + Con) |
| Saving throws | Constitution, Intelligence |
| Armor | light, medium, shields |
| Weapons | simple (plus firearms if the DM uses them) |
| Tools | thieves' tools, tinker's tools, one artisan's tools |
| Skills | 2 of Arcana, History, Investigation, Medicine, Nature, Perception, Sleight of Hand |
| Subclass | at 3 ("Artificer Specialist"); features again at 5, 9, 15 |
| Multiclass prerequisite | Int 13 |
| Multiclass proficiencies | light armor, medium armor, shields, thieves' tools, tinker's tools |
| Multiclass slots | add half artificer levels, **rounded up** |

`data/classes.json` does **not** store hit die, saves or proficiencies for any class. Its fields are: `id, name, caster, hotbarIcon, plainIcon, cantripsKnown[20], maxSpellLevel[20], spellsKnown[20]?, spellAbility, prepared{half}?, subclassLevel, subclassLabel, options[]`. Proposed record:

- `caster: "half"`, `spellAbility: "int"`, `prepared: {"half": true}` (same formula shape as paladin), `subclassLevel: 3`, `subclassLabel: "Artificer Specialist"`
- `cantripsKnown`: `[2,2,2,2,2,2,2,2,2,3,3,3,3,4,4,4,4,4,4,4]`
- `maxSpellLevel`: `[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5]`
- options: an infusions group with `picks` = Infusions Known: `[0,4,4,4,4,6,6,6,6,8,8,8,8,10,10,10,10,12,12,12]`
- `ClassId` union in `src/data/types.ts` and spell `classes` need `artificer` added; no spell in `data/spells.json` lists `artificer` today.

---

## 2. The Artificer table (p10)

| Lvl | PB | Features | Inf. known | Infused items | Cantrips | 1st | 2nd | 3rd | 4th | 5th |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | +2 | Magical Tinkering, Spellcasting | - | - | 2 | 2 | - | - | - | - |
| 2 | +2 | Infuse Item | 4 | 2 | 2 | 2 | - | - | - | - |
| 3 | +2 | Artificer Specialist, The Right Tool for the Job | 4 | 2 | 2 | 3 | - | - | - | - |
| 4 | +2 | Ability Score Improvement | 4 | 2 | 2 | 3 | - | - | - | - |
| 5 | +3 | Artificer Specialist feature | 4 | 2 | 2 | 4 | 2 | - | - | - |
| 6 | +3 | Tool Expertise | 6 | 3 | 2 | 4 | 2 | - | - | - |
| 7 | +3 | Flash of Genius | 6 | 3 | 2 | 4 | 3 | - | - | - |
| 8 | +3 | Ability Score Improvement | 6 | 3 | 2 | 4 | 3 | - | - | - |
| 9 | +4 | Artificer Specialist feature | 6 | 3 | 2 | 4 | 3 | 2 | - | - |
| 10 | +4 | Magic Item Adept | 8 | 4 | 3 | 4 | 3 | 2 | - | - |
| 11 | +4 | Spell-Storing Item | 8 | 4 | 3 | 4 | 3 | 3 | - | - |
| 12 | +4 | Ability Score Improvement | 8 | 4 | 3 | 4 | 3 | 3 | - | - |
| 13 | +5 | - | 8 | 4 | 3 | 4 | 3 | 3 | 1 | - |
| 14 | +5 | Magic Item Savant | 10 | 5 | 4 | 4 | 3 | 3 | 1 | - |
| 15 | +5 | Artificer Specialist feature | 10 | 5 | 4 | 4 | 3 | 3 | 2 | - |
| 16 | +5 | Ability Score Improvement | 10 | 5 | 4 | 4 | 3 | 3 | 2 | - |
| 17 | +6 | - | 10 | 5 | 4 | 4 | 3 | 3 | 3 | 1 |
| 18 | +6 | Magic Item Master | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 1 |
| 19 | +6 | Ability Score Improvement | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 2 |
| 20 | +6 | Soul of Artifice | 12 | 6 | 4 | 4 | 3 | 3 | 3 | 2 |

---

## 3. Spellcasting facts (pp. 11-12)

- Ability: **Intelligence** (save DC 8 + PB + Int; attack PB + Int).
- Prepared spells: **Int + half artificer level, rounded down, minimum 1**. Must be of a level you have slots for. Change list on LR (1 minute per spell level per spell).
- Max spell level rises at 1 (1st), 5 (2nd), 9 (3rd), 13 (4th), 17 (5th). Slots start at level 1 (unlike paladin/ranger).
- Slots regained on LR.
- Cantrips: 2 at 1, 3 at 10, 4 at 14. May swap one artificer cantrip on each level gained.
- Ritual casting: **yes**, ritual-tagged spell that you have prepared.
- Focus (required, "Tools Required"): thieves' tools or any artisan's tools in hand for every artificer spell; must be proficient. From 2nd level, any item bearing one of your infusions also works. Subclass foci: Arcane Armor (Armorer), arcane firearm (Artillerist).
- Multiclass: half artificer levels **rounded up** toward the multiclass slot table (prepared count rounds **down**: two different roundings).

---

## 4. Class features (in scope: 5)

| Feature | Lvl | Page | Cost | Uses / scaling | In app? |
|---|---|---|---|---|---|
| Magical Tinkering | 1 | 11 | A (touch Tiny nonmagical object; end early = A) | 4 property choices: light / recorded message / odor or sound / static image; max objects = Int (min 1); needs thieves' or artisan's tools | yes |
| Spellcasting | 1 | 11-12 | - | see section 3 | spell system |
| Infuse Item | 2 | 12-13 | rest (LR) | Infusions Known / Infused Items columns; may swap one known infusion per level; ends Int days (min 1) after your death | yes (picks) |
| Artificer Specialist | 3 | 13 | - | subclass choice | subclass |
| The Right Tool for the Job | 3 | 13 | rest (1 hour, can coincide with a rest) | create one set of artisan's tools | no |
| Ability Score Improvement | 4, 8, 12, 16, 19 | 13 | rest | | no |
| Tool Expertise | 6 | 13 | P | double PB on tool checks | no |
| Flash of Genius | 7 | 13 | R | self or creature seen within 30 ft makes a check or save: add Int; Int/LR (min 1) | yes |
| Magic Item Adept | 10 | 13 | P | attune 4 items; common/uncommon crafting quarter time, half gold | no |
| Spell-Storing Item | 11 | 13-14 | rest (LR store); holder uses **A** to produce the spell | 1st/2nd-level artificer spell with 1-action cast time, need not be prepared; weapon or focus item; uses = 2x Int (min 2); uses caster's ability mod; holder concentrates if needed | yes |
| Magic Item Savant | 14 | 14 | P | attune 5; ignore class/race/spell/level requirements on items | no |
| Magic Item Master | 18 | 14 | P | attune 6 | no |
| Soul of Artifice | 20 | 14 | P + R | +1 to all saves per attuned item (P); R when dropped to 0 HP and not killed: end one infusion, drop to 1 HP instead | yes (R part) |

---

## 5. Artificer spell list (p12): 95 spells

Marks as printed: `*` = Tasha's ch. 3, `**` = Xanathar's, `(ritual)` as printed. All 95 ids exist in `data/spells.json` (checked by script); every printed level matches the data.

**Cantrips (23):** acid-splash, booming-blade*, create-bonfire**, dancing-lights, fire-bolt, frostbite**, green-flame-blade*, guidance, light, lightning-lure*, mage-hand, magic-stone**, mending, message, poison-spray, prestidigitation, ray-of-frost, resistance, shocking-grasp, spare-the-dying, sword-burst*, thorn-whip, thunderclap**

**1st (18):** absorb-elements**, alarm (ritual), catapult**, cure-wounds, detect-magic (ritual), disguise-self, expeditious-retreat, faerie-fire, false-life, feather-fall, grease, identify (ritual), jump, longstrider, purify-food-and-drink, sanctuary, snare**, tashas-caustic-brew*

**2nd (21):** aid, alter-self, arcane-lock, blur, continual-flame, darkvision, enhance-ability, enlarge-reduce, heat-metal, invisibility, lesser-restoration, levitate, magic-mouth (ritual), magic-weapon, protection-from-poison, pyrotechnics**, rope-trick, see-invisibility, skywrite** (ritual), spider-climb, web

**3rd (15):** blink, catnap**, create-food-and-water, dispel-magic, elemental-weapon, flame-arrows**, fly, glyph-of-warding, haste, intellect-fortress*, protection-from-energy, revivify, tiny-servant**, water-breathing (ritual), water-walk (ritual)

**4th (11):** arcane-eye, elemental-bane**, fabricate, freedom-of-movement, leomunds-secret-chest, mordenkainens-faithful-hound, mordenkainens-private-sanctum, otilukes-resilient-sphere, stone-shape, stoneskin, summon-construct*

**5th (7):** animate-objects, bigbys-hand, creation, greater-restoration, skill-empowerment**, transmute-rock**, wall-of-stone

Id note: "Enlarge/reduce" slugs to `enlarge-reduce` (slash to hyphen), which is the existing id.
Data note: the list prints no ritual tag on Purify Food and Drink, but `data/spells.json` has `ritual: true` (PHB). Ritual casting follows the spell's own tag, so no change needed.

---

## 6. Subclasses (subclass features in scope: 12, plus 4 always-prepared spell tables)

All four "X Spells" features: 3rd level, always prepared, don't count against prepared total. Every id below exists in `data/spells.json`.

### Alchemist (pp. 14-15)
Spells (p14): 3 healing-word, ray-of-sickness; 5 flaming-sphere, melfs-acid-arrow; 9 gaseous-form, mass-healing-word; 13 blight, death-ward; 17 cloudkill, raise-dead.

| Feature | Lvl | Page | Cost | Note | In app? |
|---|---|---|---|---|---|
| Tool Proficiency | 3 | 14 | P | alchemist's supplies (or another artisan's tool) | no |
| Alchemist Spells | 3 | 14 | P | table above | spell system |
| Experimental Elixir | 3 | 14-15 | rest + A | 1 random elixir free on LR (2 at 6, 3 at 15); extra ones = A + any 1st+ slot, effect chosen; drink or feed to an incapacitated creature = A; lasts until drunk or end of next LR; needs alchemist's supplies | yes |
| Alchemical Savant | 5 | 15 | free (rider) | spell cast via alchemist's supplies: +Int (min +1) to one healing roll or acid/fire/necrotic/poison damage roll | yes |
| Restorative Reagents | 9 | 15 | free rider + A | elixir drinker gains 2d6 + Int temp HP (min 1); lesser-restoration with no slot, unprepared, Int/LR (min 1), via supplies | yes |
| Chemical Mastery | 15 | 15 | P + A | resist acid and poison, immune poisoned (P); greater-restoration and heal each 1/LR, no slot, no prep, no material, via supplies | yes |

Experimental Elixir options (d6, pp. 14-15): 1 Healing (2d4 + Int HP); 2 Swiftness (+10 ft walk, 1 hr); 3 Resilience (+1 AC, 10 min); 4 Boldness (+d4 to attacks and saves, 1 min); 5 Flight (fly 10 ft, 10 min); 6 Transformation (as alter-self, 10 min).

### Armorer (pp. 15-17)
Spells (p15): 3 magic-missile, thunderwave; 5 mirror-image, shatter; 9 hypnotic-pattern, lightning-bolt; 13 fire-shield, greater-invisibility; 17 passwall, wall-of-force.

| Feature | Lvl | Page | Cost | Note | In app? |
|---|---|---|---|---|---|
| Tools of the Trade | 3 | 15 | P | heavy armor; smith's tools (or another artisan's tool) | no |
| Armorer Spells | 3 | 15 | P | table above | spell system |
| Arcane Armor | 3 | 15-16 | A (create, smith's tools in hand); BA helmet on/off; A don/doff | no Str requirement; spellcasting focus; can't be removed against your will; replaces missing limbs | yes (setup) |
| Armor Model | 3 | 16 | rest (swap on SR/LR with smith's tools) | pick Guardian or Infiltrator; model weapon uses Int for attack and damage | yes (pick) |
| Extra Attack | 5 | 16 | P | 2 attacks per Attack action | no |
| Armor Modifications | 9 | 17 | P / rest | armor counts as 4 items for infusions (chest, boots, helmet, special weapon); +2 infused items, armor parts only | no |
| Perfected Armor | 15 | 17 | R (Guardian) / free (Infiltrator) | see models | yes |

Armor models (p16; 15th-level upgrades p17):
- **Guardian**: Thunder Gauntlets (simple melee, 1d8 thunder, hit target has disadvantage on attacks vs others until your next turn; A via Attack); Defensive Field (BA, temp HP = artificer level, PB/LR). Perfected: R when a Huge-or-smaller creature ends its turn within 30 ft: Str save vs spell DC or pulled up to 30 ft; melee attack if pulled within 5 ft; PB/LR.
- **Infiltrator**: Lightning Launcher (simple ranged, 90/300 ft, 1d6 lightning; +1d6 lightning 1/turn on hit; A via Attack); Powered Steps (+5 ft walk, P); Dampening Field (advantage on Stealth, P). Perfected: target damaged by the launcher glimmers until your next turn (dim light 5 ft, disadvantage attacking you, next attack on it has advantage and +1d6 lightning).

### Artillerist (pp. 17-18)
Spells (p17): 3 shield, thunderwave; 5 scorching-ray, shatter; 9 fireball, wind-wall; 13 ice-storm, wall-of-fire; 17 cone-of-cold, wall-of-force.

| Feature | Lvl | Page | Cost | Note | In app? |
|---|---|---|---|---|---|
| Tool Proficiency | 3 | 17 | P | woodcarver's tools (or another artisan's tool) | no |
| Artillerist Spells | 3 | 17 | P | table above | spell system |
| Eldritch Cannon | 3 | 17-18 | A create; BA activate (within 60 ft, + move 15 ft if legged); A dismiss | 1/LR free, else spend a spell slot; woodcarver's or smith's tools; Small or Tiny, within 5 ft; one at a time; AC 18, HP 5x lvl, immune poison/psychic, ability scores 10; mending heals 2d6; lasts 1 hr | yes |
| Arcane Firearm | 5 | 18 | rest (LR, carve wand/staff/rod) + free rider | focus; +1d8 to one damage roll of an artificer spell cast through it | yes (rider) |
| Explosive Cannon | 9 | 18 | P + A | cannon damage +1d8 (P); A detonate within 60 ft: 20 ft, Dex save, 3d8 force, half on save, cannon destroyed | yes |
| Fortified Position | 15 | 18 | P | half cover for you and allies within 10 ft of a cannon; two cannons (one action, not one slot), one BA activates both | no (modifies cannon) |

Eldritch Cannon types (table p18, choose at creation): **Flamethrower** (15-ft cone, Dex save, 2d8 fire, half on save, ignites unattended objects); **Force Ballista** (ranged spell attack, 120 ft, 2d8 force, push 5 ft); **Protector** (itself + chosen creatures within 10 ft gain 1d8 + Int temp HP, min +1).
Stat block: none. Cannon stats are in the feature text (p17) and the activation table (p18).

### Battle Smith (pp. 18-20)
Spells (p19): 3 heroism, shield; 5 branding-smite, warding-bond; 9 aura-of-vitality, conjure-barrage; 13 aura-of-purity, fire-shield; 17 banishing-smite, mass-cure-wounds.

| Feature | Lvl | Page | Cost | Note | In app? |
|---|---|---|---|---|---|
| Tool Proficiency | 3 | 19 | P | smith's tools (or another artisan's tool) | no |
| Battle Smith Spells | 3 | 19 | P | table above | spell system |
| Battle Ready | 3 | 19 | P | martial weapons; Int for attack and damage with magic weapons | no |
| Steel Defender | 3 | 19 | BA command (else it Dodges); A revive | acts right after you; revive: smith's tools, within 5 ft, spend 1st+ slot, died within 1 hr, back in 1 min at full HP; new one at end of LR (old one perishes) | yes |
| Extra Attack | 5 | 20 | P | | no |
| Arcane Jolt | 9 | 20 | free (on a magic-weapon hit or a defender hit) | +2d6 force, or heal 2d6 to a creature/object within 30 ft of the target; Int/LR (min 1); max 1/turn | yes |
| Improved Defender | 15 | 20 | P | Jolt 4d6; defender +2 AC; Deflect Attack deals 1d4 + Int force | no (modifies others) |

Stat block: **Steel Defender, Tasha's p. 19** (Medium construct; AC 15; HP 2 + Int + 5x lvl, d8 hit dice = lvl; speed 40; Vigilant; Force-Empowered Rend: spell attack, reach 5, 1d8 + PB force; Repair 3/day: 2d8 + PB; reaction Deflect Attack within 5 ft).

---

## 7. Infusions (pp. 20-23): 16

Item prereq is the object you infuse. "Wearer action" = what the holder spends to use it. No level prereq = available from 2nd.

| Infusion | Page | Lvl prereq | Item | Wearer cost | Attune | Short label |
|---|---|---|---|---|---|---|
| Arcane Propulsion Armor | 20 | 14 | suit of armor | P + A (Attack) | yes | +5 ft speed; gauntlets 1d8 force, thrown 20/60, return; can't be removed; replaces limbs |
| Armor of Magical Strength | 20 | - | suit of armor | free + R | yes | 6 charges (1d6 at dawn): +Int to Str check/save; R avoid prone |
| Boots of the Winding Path | 21 | 6 | pair of boots | BA | yes | teleport 15 ft to a space occupied this turn |
| Enhanced Arcane Focus | 21 | - | rod, staff or wand | P | yes | +1 spell attack (+2 at lvl 10), ignore half cover |
| Enhanced Defense | 21 | - | armor or shield | P | no | +1 AC (+2 at lvl 10) |
| Enhanced Weapon | 21 | - | simple or martial weapon | P | no | +1 attack/damage (+2 at lvl 10) |
| Helm of Awareness | 21 | 10 | helmet | P | yes | advantage on initiative; can't be surprised |
| Homunculus Servant | 21-22 | - | gem or crystal worth 100+ gp | BA command (artificer) | no | creature; Force Strike ranged 30 ft 1d4 + PB force; R Channel Magic (touch spell, within 120 ft) |
| Mind Sharpener | 22 | - | suit of armor or robes | R | no | 4 charges (1d4 at dawn): turn a failed concentration save into a success |
| Radiant Weapon | 22 | 6 | simple or martial weapon | BA (light) + R | yes | +1; light 30/30 toggle; 4 charges (1d4 at dawn): R when hit, attacker Con save or blinded |
| Repeating Shot | 22 | - | simple/martial weapon with ammunition | P | yes | +1 ranged; ignore loading; makes own ammo |
| Replicate Magic Item | 22-23 | per table (2/6/10/14) | per item | per item | per item | learnable more than once; or any common item except potions/scrolls |
| Repulsion Shield | 23 | 6 | shield | P + R | yes | +1 AC; 4 charges (1d4 at dawn): R after melee hit, push attacker 15 ft |
| Resistant Armor | 23 | 6 | suit of armor | P | yes | resistance to one chosen type: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, thunder |
| Returning Weapon | 23 | - | simple/martial weapon with thrown | P | no | +1; returns after ranged attack |
| Spell-Refueling Ring | 23 | 6 | ring | A | yes | recover one expended slot of 3rd level or lower; 1/dawn |

Attunement "no" for Homunculus Servant and Mind Sharpener = none printed on their item line.
Stat block: **Homunculus Servant, Tasha's p. 22** (Tiny construct; AC 13; HP 1 + Int + lvl, d4 hit dice = lvl; speed 20, fly 30; Evasion).

Infusion levels for `picks` gating: 2 (base), 6 (Boots of the Winding Path, Radiant Weapon, Repulsion Shield, Resistant Armor, Spell-Refueling Ring), 10 (Helm of Awareness), 14 (Arcane Propulsion Armor).

### Replicable Items (p23), names only
Items needing attunement are marked (att.).
- **2nd level (8):** Alchemy jug, Bag of holding, Cap of water breathing, Goggles of night, Rope of climbing, Sending stones, Wand of magic detection, Wand of secrets. None need attunement.
- **6th level (8):** Boots of elvenkind, Cloak of elvenkind (att.), Cloak of the manta ray, Eyes of charming (att.), Gloves of thievery, Lantern of revealing, Pipes of haunting, Ring of water walking.
- **10th level (21):** Boots of striding and springing, Boots of the winterlands, Bracers of archery, Brooch of shielding, Cloak of protection, Eyes of the eagle, Gauntlets of ogre power, Gloves of missile snaring, Gloves of swimming and climbing, Hat of disguise, Headband of intellect, Helm of telepathy, Medallion of thoughts, Necklace of adaptation, Periapt of wound closure, Pipes of the sewers, Quiver of Ehlonna, Ring of jumping, Ring of mind shielding, Slippers of spider climbing, Winged boots. All (att.) except Quiver of Ehlonna.
- **14th level (12):** Amulet of health, Belt of hill giant strength, Boots of levitation, Boots of speed, Bracers of defense, Cloak of the bat, Dimensional shackles, Gem of seeing, Horn of blasting, Ring of free action, Ring of protection, Ring of the ram. All (att.) except Dimensional shackles and Horn of blasting.

---

## 8. Artificer Initiate feat (p79)

- Prerequisite: **none printed**.
- 1 cantrip + 1 1st-level spell from the artificer list; Int is the casting ability.
- The 1st-level spell: once with no slot, regained on LR; can also be cast with any slots.
- 1 artisan's tools proficiency; that tool works as a focus for any Int-based spell.
- Not in `data/feats.json` yet (no "artificer" anywhere under `data/`).

---

## 9. Notes for the planner

- **Infusions behave like invocations:** a known-count `picks` array (section 1), level-gated entries, swap one per level. Unlike invocations, most are **passive item bonuses**; only Boots of the Winding Path (BA), Radiant Weapon (BA/R), Repulsion Shield (R), Mind Sharpener (R), Armor of Magical Strength (R/free), Spell-Refueling Ring (A), Arcane Propulsion Armor (attack) and Homunculus Servant (BA command, creature) give the player something to do.
- **Replicate Magic Item** can be learned multiple times (each pick = a different item). The only infusion that breaks "one pick each"; its item list is gated by the four level tables. Probably needs a reuse/multi-pick option or should be kept as a single generic entry.
- **Half caster that rounds up for slots and starts at level 1.** `maxSpellLevel` is `[1,1,1,1,2,...]`, not paladin's `[0,1,1,1,2,...]`. Prepared count rounds down (`prepared.half: true` already does `floor(level/2)`, min 1). The app tracks max spell level, not slot counts, so the rounding-up only matters if multiclass slot math is ever added.
- **Cantrips on a half caster:** paladin/ranger have all-zero `cantripsKnown`; artificer has 2-4. Check that nothing assumes `caster: "half"` means no cantrips.
- **Chemical Mastery grants Heal, a 6th-level spell**, above the artificer max of 5th. A no-slot, 1/LR cast; the app's spell filter by `maxSpellLevel` may hide it.
- **Feature-granted spell casts** with their own uses: Restorative Reagents (lesser restoration, Int/LR), Chemical Mastery (greater restoration, heal, 1/LR each). They likely fit whatever the app already uses for feat spells cast 1/LR without a slot (not checked).
- **Three companions/constructs:** Steel Defender (stat block p19), Homunculus Servant (stat block p22, an infusion pick, so any subclass), Eldritch Cannon (no stat block; text p17 + table p18). Both stat-block creatures use "BA command, otherwise Dodge"; same pattern as Wildfire Spirit / Dancing Item in batch 3.
- **Subclass choices that work like picks:** Armor Model (Guardian/Infiltrator, swap on any rest), Eldritch Cannon type (chosen each time you create one, not a fixed pick), Experimental Elixir (random on LR, chosen when paid for with a slot).
- **Spell attack / Int-for-weapons:** Armor Model weapons and Battle Ready both make weapon attacks use Int. Steel Defender and Homunculus attack with your spell attack modifier.
- **Spell-Storing Item** gives a *different creature* an action; the player's card is the store step (LR) plus the uses count.
- Spell list: 95 spells, all ids present; no data gaps. Subclass spell tables: 40 entries (35 distinct ids: thunderwave, shatter, wall-of-force, shield and fire-shield each appear in two subclasses), all present.
