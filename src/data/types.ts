export type ClassId = 'barbarian'|'bard'|'cleric'|'druid'|'fighter'|'monk'|'paladin'|'ranger'|'rogue'|'sorcerer'|'warlock'|'wizard';
export type Cost = 'action'|'bonus'|'reaction'|'other';
export type Ability = 'str'|'dex'|'con'|'int'|'wis'|'cha';
export interface Spell {
  id: string; name: string; level: number /*0-9*/; school: string;
  cast: { cost: Cost; text: string; trigger?: string };
  range: string; duration: string; concentration: boolean; ritual: boolean;
  components: { v: boolean; s: boolean; m?: { text: string; costGp?: number; consumed: boolean } };
  description: string[]; higherLevels?: string; classes: ClassId[]; page: number;
  icon?: string;
  summary?: { damage?: { dice: string; count?: number; unit?: string; type: string; healing?: boolean }; resolution: 'attack'|'save'|'auto'|'none'; save?: Ability; upcast?: string };
}
export interface Feature {
  id: string; name: string; source: { kind: 'generic'|'class'|'subclass'|'race'|'feat'; id: string };
  level: number; cost: Cost|'free'; resource?: string; uses?: string;
  description: string[]; page: number; icon?: string;
}
export interface ClassDef {
  id: ClassId; name: string; caster: 'full'|'half'|'third'|'pact'|'none';
  cantripsKnown?: number[] /*index = level-1, length 20*/; maxSpellLevel?: number[] /*length 20*/;
  hotbarIcon: string; plainIcon: string;
}
export interface Dataset { classes: ClassDef[]; spells: Spell[]; features: Feature[] }
export type Route =
  | { page: 'start' } | { page: 'level'; cls: ClassId } | { page: 'settings' }
  | { page: 'menu'; cls: ClassId; level: number }
  | { page: 'spells'|'actions'; cls: ClassId; level: number; section?: string }
  | { page: 'card'; kind: 'spell'|'feature'; id: string; cls: ClassId; level: number };
