import { DATA } from '../../../data';
import type { ClassId, Feature } from '../../../data/types';
import { featureLevel } from '../../../character/derive';
import { optionSlots } from '../../../character/options';
import type { Character } from '../../../character/types';
import { toHash } from '../../../router';
import { Card } from '../Card';

/** The class a feature belongs to: its source class or subclass, the class of the option slot holding it, else the first. */
function ownerClass(ch: Character, f: Feature): ClassId {
  const { kind, id } = f.source;
  const first = ch.classes[0].cls;
  if (kind === 'class') return ch.classes.some((c) => c.cls === id) ? id as ClassId : first;
  if (kind === 'subclass') return DATA.subclasses.find((s) => s.id === id)?.cls ?? first;
  if (kind === 'option') return optionSlots(ch).find((s) => s.cls && s.chosen.includes(f.id) && (s.group.from ?? s.group.id) === id)?.cls ?? first;
  return first;
}

export function MeCard(p: { ch: Character; kind: 'spell' | 'feature'; id: string; section?: string }) {
  const f = p.kind === 'feature' ? DATA.features.find((x) => x.id === p.id) : undefined;
  const cls = f ? ownerClass(p.ch, f) : p.ch.classes[0].cls;
  const cc = p.ch.classes.find((c) => c.cls === cls) ?? p.ch.classes[0];
  const back = toHash({ page: p.kind === 'spell' ? 'me-spells' : 'me-actions', section: p.section });
  return <Card kind={p.kind} id={p.id} cls={cls} level={f ? featureLevel(p.ch, f) : cc.level} sub={cc.sub} back={back} />;
}
