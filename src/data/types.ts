export type BookId = 'phb' | 'xge' | 'tce' | 'scag' | 'dmg' | 'bgg';
export type ClassId = 'barbarian'|'bard'|'cleric'|'druid'|'fighter'|'monk'|'paladin'|'ranger'|'rogue'|'sorcerer'|'warlock'|'wizard';
/** Every card is our own words; the book holds the full rules. */
export type TextSource = 'summary';
export type Cost = 'action'|'bonus'|'reaction'|'other';
export type Ability = 'str'|'dex'|'con'|'int'|'wis'|'cha';
export interface Spell {
  id: string; name: string; level: number /*0-9*/; school: string;
  cast: { cost: Cost; text: string; trigger?: string };
  range: string; duration: string; concentration: boolean; ritual: boolean;
  components: { v: boolean; s: boolean; m?: { text: string; costGp?: number; consumed: boolean } };
  description: string[]; higherLevels?: string; classes: ClassId[]; page: number; book?: BookId;
  /** Tasha's expanded lists ("Additional <Class> Spells") of classes not already in `classes` */
  optionalLists?: ClassId[];
  icon?: string; textSource: TextSource;
  summary?: { damage?: { dice: string; count?: number; unit?: string; type: string; healing?: boolean; plusMod?: boolean }; resolution: 'attack'|'save'|'auto'|'none'; save?: Ability; upcast?: string };
}
export type FeatureCost = Cost|'free'|'passive';
export interface Scaling { label: string; values: string[] /*20, index = level-1; '' = not yet*/ }
export interface SpellGrant {
  spell?: string;
  choose?: { lists: ClassId[]; level: number; count: number; ritual?: boolean; schools?: string[] };
  atLevel: number;                                  // class level (subclass) or character level (race, feat)
  ability?: Ability; uses?: string;
  option?: string;                                  // only with this option chosen (Land terrain)
}
export interface Feature {
  id: string; name: string;
  source: { kind: 'generic'|'class'|'subclass'|'option'|'race'|'feat'; id: string };
  level: number; cost: FeatureCost; trigger?: string; resource?: string; uses?: string;
  scaling?: Scaling[];
  prereq?: { level?: number; option?: string; text?: string };
  spells?: SpellGrant[];
  description: string[]; page: number; book?: BookId; icon?: string; textSource: TextSource;
  /** a Tasha's optional class feature, or a Tasha's option in an existing pool: tagged "Optional" */
  optional?: true;
  /** feature ids or option group ids hidden while this option is chosen */
  replaces?: string[];
  /** ticked, this class's optional list spells join its list */
  expandsList?: ClassId;
}
export interface ClassDef {
  id: ClassId; name: string; caster: 'full'|'half'|'third'|'pact'|'none';
  cantripsKnown?: number[] /*index = level-1, length 20*/; maxSpellLevel?: number[] /*length 20*/; spellsKnown?: number[];
  spellAbility?: Ability; prepared?: { half: boolean };
  subclassLevel: number; subclassLabel: string;
  options: string[];
  hotbarIcon: string; plainIcon: string;
}
export interface SubclassDef {
  id: string; cls: ClassId; name: string; page: number; book?: BookId; hotbarIcon?: string;
  bonusSpells?: { kind: 'domain'|'oath'|'circle'|'patron'|'subclass'; grants: SpellGrant[] };
  /** class spell lists this subclass may also pick from (Divine Soul: ['cleric']) */
  extraLists?: ClassId[];
  casting?: { list: ClassId; schools: string[]; ability: Ability;
              cantripsKnown: number[]; spellsKnown: number[]; maxSpellLevel: number[] };
  options: string[];
}
export interface OptionGroup {
  id: string; name: string; owner: { kind: 'class'|'subclass'|'race'|'feat'; id: string };
  picks: number[];
  from?: string; only?: string[];
  reuse?: true; // a pick counted in another slot of the same pool may also fill this one
  bonus?: { subclass: string; atLevel: number; count: number }[];
  /** tick-any: no count limit, the player ticks what their DM allows */
  optional?: true;
}
export interface RaceDef { id: string; name: string; parent?: string; page: number; book?: BookId; icon?: string; spells: SpellGrant[]; options: string[] }
export interface FeatDef { id: string; name: string; prereq?: string; page: number; book?: BookId; icon?: string; description: string[]; spells: SpellGrant[]; options?: string[]; textSource: TextSource }
export interface Dataset {
  classes: ClassDef[]; subclasses: SubclassDef[]; optionGroups: OptionGroup[];
  races: RaceDef[]; feats: FeatDef[]; spells: Spell[]; features: Feature[];
}
export type Route =
  | { page: 'start' } | { page: 'level'; cls: ClassId } | { page: 'settings' }
  | { page: 'subclass'; cls: ClassId; level: number }
  | { page: 'menu'; cls: ClassId; level: number; sub?: string }
  | { page: 'spells'|'actions'; cls: ClassId; level: number; sub?: string; section?: string }
  | { page: 'card'; kind: 'spell'|'feature'; id: string; cls: ClassId; level: number; sub?: string }
  | { page: 'me' }
  | { page: 'me-spells'|'me-actions'; section?: string }
  | { page: 'me-card'; kind: 'spell'|'feature'; id: string; section?: string }
  | { page: 'edit'; step: EditStep };
export type EditStep = 'basics' | 'classes' | 'options' | 'feats' | 'spells';
