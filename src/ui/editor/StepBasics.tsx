import { useState } from 'preact/hooks';
import { DATA } from '../../data';
import { deleteCharacter } from '../../character/store';
import { raceChain } from '../../character/derive';
import { Separator } from '../Separator';
import { GrantPicker } from './GrantPicker';
import type { StepProps } from './Editor';

const ORN = '☙';

export function StepBasics({ ch, update }: StepProps) {
  const [sure, setSure] = useState(false);
  const bases = DATA.races.filter((r) => !r.parent);
  const chain = raceChain(ch.race);
  const base = chain[0]?.id ?? '';
  const subs = DATA.races.filter((r) => r.parent === base);
  return (
    <div class="step">
      <Separator ornament={ORN} label="Race & name" full />
      <label class="field">Name
        <input type="text" maxLength={60} value={ch.name} onInput={(e) => update({ ...ch, name: (e.currentTarget as HTMLInputElement).value })} />
      </label>
      <label class="field">Race
        <select value={base} onChange={(e) => update({ ...ch, race: (e.currentTarget as HTMLSelectElement).value || undefined })}>
          <option value="">No race</option>
          {bases.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      {subs.length > 0 && (
        <label class="field">Subrace
          <select value={chain[1]?.id ?? ''} onChange={(e) => update({ ...ch, race: (e.currentTarget as HTMLSelectElement).value || base })}>
            <option value="">No subrace</option>
            {subs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </label>
      )}
      <GrantPicker ch={ch} update={update} step="basics" />
      <Separator ornament={ORN} full />
      <button type="button" class={`danger${sure ? ' sure' : ''}`}
        onClick={() => { if (!sure) return setSure(true); deleteCharacter(); location.hash = '#/'; }}>
        {sure ? 'Tap again to delete' : 'Delete character'}
      </button>
    </div>
  );
}
