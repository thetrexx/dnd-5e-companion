import { DATA } from '../../data';
import { Separator } from '../Separator';
import { GrantPicker } from './GrantPicker';
import { PickList } from './PickList';
import type { StepProps } from './Editor';

export function StepFeats(p: StepProps) {
  const { ch, update } = p;
  const toggle = (id: string) => update({ ...ch, feats: ch.feats.includes(id) ? ch.feats.filter((f) => f !== id) : [...ch.feats, id] });
  return (
    <div class="step">
      <Separator ornament="☙" label="Feats" full />
      <PickList items={DATA.feats.map((f) => ({ id: f.id, label: f.name, note: f.prereq }))} picked={ch.feats} onToggle={toggle} />
      <GrantPicker {...p} step="feats" />
    </div>
  );
}
