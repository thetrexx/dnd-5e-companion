import type { SubclassDef } from '../data/types';

const LABEL = { domain: 'Domain', oath: 'Oath', circle: 'Circle', patron: 'Patron' } as const;

/** Source label of a subclass's bonus spells: the kind's name, or the subclass name for 'subclass'. */
export function bonusLabel(kind: NonNullable<SubclassDef['bonusSpells']>['kind'], sub: SubclassDef): string {
  return kind === 'subclass' ? sub.name : LABEL[kind];
}
