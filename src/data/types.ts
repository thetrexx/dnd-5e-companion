export type ClassId = 'barbarian'|'bard'|'cleric'|'druid'|'fighter'|'monk'|'paladin'|'ranger'|'rogue'|'sorcerer'|'warlock'|'wizard';
/** 'srd': word-for-word SRD 5.1 text. 'summary': our own words; the book holds the full rules. */
export type TextSource = 'srd'|'summary';
export type Cost = 'action'|'bonus'|'reaction'|'other';
export type Ability = 'str'|'dex'|'con'|'int'|'wis'|'cha';
export interface Spell {
  id: string; name: string; level: number /*0-9*/; school: string;
  cast: { cost: Cost; text: string; trigger?: string };
  range: string; duration: string; concentration: boolean; ritual: boolean;
  components: { v: boolean; s: boolean; m?: { text: string; costGp?: number; consumed: boolean } };
  description: string[]; higherLevels?: string; classes: ClassId[]; page: number;
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
  description: string[]; page: number; icon?: string; textSource: TextSource;
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
  id: string; cls: ClassId; name: string; page: number; hotbarIcon?: string;
  bonusSpells?: { kind: 'domain'|'oath'|'circle'|'patron'; grants: SpellGrant[] };
  casting?: { list: ClassId; schools: string[]; ability: Ability;
              cantripsKnown: number[]; spellsKnown: number[]; maxSpellLevel: number[] };
  options: string[];
}
export interface OptionGroup {
  id: string; name: string; owner: { kind: 'class'|'subclass'|'race'; id: string };
  picks: number[];
  from?: string; only?: string[];
  bonus?: { subclass: string; atLevel: number; count: number }[];
}
export interface RaceDef { id: string; name: string; parent?: string; page: number; icon?: string; spells: SpellGrant[]; options: string[] }
export interface FeatDef { id: string; name: string; prereq?: string; page: number; icon?: string; description: string[]; spells: SpellGrant[]; textSource: TextSource }
export interface Dataset {
  classes: ClassDef[]; subclasses: SubclassDef[]; optionGroups: OptionGroup[];
  races: RaceDef[]; feats: FeatDef[]; spells: Spell[]; features: Feature[];
}
export type Route =
  | { page: 'start' } | { page: 'level'; cls: ClassId } | { page: 'settings' }
  | { page: 'subclass'; cls: ClassId; level: number }
  | { page: 'menu'; cls: ClassId; level: number; sub?: string }
  | { page: 'spells'|'actions'; cls: ClassId; level: number; sub?: string; section?: string }
  | { page: 'card'; kind: 'spell'|'feature'; id: string; cls: ClassId; level: number; sub?: string };
