import type { EditStep } from '../../data/types';
import { grantSlots, unlockText } from '../../character/grants';
import { Separator } from '../Separator';
import { IconGrid } from '../IconGrid';
import type { StepProps } from './Editor';

const plural = (n: number, one: string) => (n === 1 ? one : `${one}s`);

export function GrantPicker({ ch, update, step }: StepProps & { step: EditStep }) {
  const slots = grantSlots(ch).filter((s) => s.source.step === step);
  if (!slots.length) return null;
  return (
    <>
      {slots.map((s) => {
        const { source, choose: c } = s;
        const picked = ch.spells.filter((x) => x.grant === s.key).map((x) => x.id);
        const what = c.level === 0 ? plural(c.count, 'cantrip') : `level ${c.level} ${plural(c.count, 'spell')}`;
        const at = source.grants.find((g) => `${source.key}:${g.index}` === s.key)?.grant.atLevel ?? 1;
        const toggle = (id: string) => update({
          ...ch,
          spells: picked.includes(id)
            ? ch.spells.filter((x) => !(x.id === id && x.grant === s.key))
            : [...ch.spells, { id, grant: s.key }],
        });
        return (
          <div key={s.key} class="grant">
            <Separator ornament="☙" label={`${source.title}: choose ${c.count} ${what}${c.ritual ? ' (rituals)' : ''}`} />
            {!s.unlocked ? <p class="note">{unlockText(source, at)}</p> : (
              <>
                <p class={picked.length > c.count ? 'warn' : 'note'}>
                  {picked.length} of {c.count} chosen{picked.length > c.count ? ' (more than usual)' : ''}
                </p>
                <IconGrid items={s.candidates} ringed={picked} onPick={toggle} />
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
