import { DATA } from '../../data';
import { optionSlots } from '../../character/options';
import { Separator } from '../Separator';
import { GrantPicker } from './GrantPicker';
import { PickList } from './PickList';
import type { StepProps } from './Editor';

export function StepOptions(p: StepProps) {
  const { ch, update } = p;
  const slots = optionSlots(ch);
  const toggle = (id: string) => update({ ...ch, options: ch.options.includes(id) ? ch.options.filter((o) => o !== id) : [...ch.options, id] });
  return (
    <div class="step">
      {!slots.length && <p class="note">Nothing to choose yet.</p>}
      {slots.map((s) => {
        const n = s.chosen.length;
        const cls = s.cls && ch.classes.length > 1 ? ` · ${DATA.classes.find((c) => c.id === s.cls)?.name}` : '';
        return (
          <div key={`${s.group.id}:${s.cls ?? ''}`}>
            <Separator ornament="☙" label={`${s.group.name}${cls}`} full />
            <p class={n > s.count ? 'warn' : 'note'}>{n} of {s.count} chosen{n > s.count ? ' (more than usual)' : ''}</p>
            <PickList items={s.choices.map((f) => ({ id: f.id, label: f.name, note: f.prereq?.text }))} picked={ch.options} onToggle={toggle} />
          </div>
        );
      })}
      <GrantPicker {...p} step="options" />
    </div>
  );
}
