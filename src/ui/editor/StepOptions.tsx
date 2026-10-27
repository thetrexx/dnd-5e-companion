import { DATA } from '../../data';
import { optionSlots, type OptionSlot } from '../../character/options';
import { Separator } from '../Separator';
import { GrantPicker } from './GrantPicker';
import { PickList } from './PickList';
import type { StepProps } from './Editor';

const ownerName = (s: OptionSlot) => s.cls ? DATA.classes.find((c) => c.id === s.cls)?.name : DATA.races.find((r) => r.id === s.group.owner.id)?.name ?? DATA.races.find((r) => r.parent === undefined && s.group.owner.kind === 'race')?.name;
const takenBy = (slots: OptionSlot[], me: OptionSlot, id: string) => {
  const pool = me.group.from ?? me.group.id;
  const home = slots.find((o) => o !== me && (o.group.from ?? o.group.id) === pool && o.chosen.includes(id));
  return (home && ownerName(home)) ?? 'another slot';
};

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
            <PickList
              items={s.choices.map((f) => { const t = s.taken.includes(f.id); return { id: f.id, label: f.name, note: t ? `Chosen for ${takenBy(slots, s, f.id)}` : f.prereq?.text, disabled: t }; })}
              picked={s.chosen}
              onToggle={toggle}
            />
          </div>
        );
      })}
      <GrantPicker {...p} step="options" />
    </div>
  );
}
