import { useState } from 'preact/hooks';
import type { EditStep } from '../../data/types';
import { prune } from '../../character/options';
import { loadCharacter, saveCharacter } from '../../character/store';
import { emptyCharacter } from '../../character/types';
import type { Character } from '../../character/types';
import { StepBasics } from './StepBasics';
import { StepClasses } from './StepClasses';

export const EDIT_STEPS: { step: EditStep; label: string }[] = [
  { step: 'basics', label: 'Race & name' },
  { step: 'classes', label: 'Classes' },
  { step: 'options', label: 'Options' },
  { step: 'feats', label: 'Feats' },
  { step: 'spells', label: 'Spells' },
];

export interface StepProps { ch: Character; update(next: Character): void }

const SOON = <p class="note">Coming in the next update.</p>;

export function Editor(p: { step: EditStep }) {
  const [ch, setCh] = useState<Character>(() => loadCharacter() ?? emptyCharacter());
  const [failed, setFailed] = useState(false);
  const update = (next: Character) => {
    const n = prune(next);
    setCh(n);
    setFailed(!saveCharacter(n));
  };
  const i = EDIT_STEPS.findIndex((s) => s.step === p.step);
  const last = i === EDIT_STEPS.length - 1;
  const go = (h: string) => { location.hash = h; };
  const noClass = ch.classes.length === 0;
  const props = { ch, update };
  return (
    <div class="screen editor">
      <a class="back" href="#/">‹ Home</a>
      <h1 class="page-title">My Character</h1>
      <nav class="steps" aria-label="Steps">
        {EDIT_STEPS.map((s) => (
          <a key={s.step} href={`#/edit/${s.step}`} aria-current={s.step === p.step ? 'step' : undefined}>{s.label}</a>
        ))}
      </nav>
      {failed && <p class="warn">This browser won't keep your character. Make a backup code in Settings.</p>}
      {p.step === 'basics' && <StepBasics {...props} />}
      {p.step === 'classes' && <StepClasses {...props} />}
      {(p.step === 'options' || p.step === 'feats' || p.step === 'spells') && SOON}
      <div class="step-nav">
        <button type="button" class="btn" disabled={i <= 0} onClick={() => go(`#/edit/${EDIT_STEPS[i - 1].step}`)}>‹ Back</button>
        {last
          ? <button type="button" class="btn" disabled={noClass} onClick={() => go('#/me')}>Done</button>
          : <button type="button" class="btn" onClick={() => go(`#/edit/${EDIT_STEPS[i + 1].step}`)}>Next ›</button>}
      </div>
      {last && noClass && <p class="note">Add a class first</p>}
    </div>
  );
}
