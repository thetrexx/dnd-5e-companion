import { useState } from 'preact/hooks';
import { THEMES, applyTheme } from '../../theme/themes';
import { STRENGTHS, applyStrength, loadSettings, reducedMotion, saveSettings } from '../../settings/settings';
import type { Settings as SettingsData } from '../../settings/settings';
import { Separator } from '../Separator';

const ORN = '☙';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function goBack() {
  if (history.length > 1) history.back();
  else location.hash = '#/';
}

export function Settings() {
  const [s, setS] = useState(loadSettings);
  const update = (next: SettingsData) => { setS(next); saveSettings(next); };
  return (
    <div class="screen settings">
      <a class="back" href="#/" onClick={(e) => { e.preventDefault(); goBack(); }}>‹ Back</a>
      <h1 class="page-title">Settings</h1>

      <Separator ornament={ORN} label="Theme" full />
      <div class="radios" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => (
          <label key={t.id} class="radio">
            <input type="radio" name="theme" checked={s.theme === t.id}
              onChange={() => { applyTheme(t.id); update({ ...s, theme: t.id }); }} />
            <span>{t.name}</span>
          </label>
        ))}
      </div>

      <Separator ornament={ORN} label="Animation" full />
      <div class="radios" role="radiogroup" aria-label="Animation">
        {STRENGTHS.map((st) => (
          <label key={st} class="radio">
            <input type="radio" name="strength" checked={s.strength === st}
              onChange={() => { const next = { ...s, strength: st }; applyStrength(next); update(next); }} />
            <span>{cap(st)}</span>
          </label>
        ))}
      </div>
      {reducedMotion() && <p class="hint">Your phone's reduced-motion setting turns animations off.</p>}

      <Separator ornament={ORN} label="Backup code" full />
      <p class="note">Available once you create a character.</p>

      <Separator ornament={ORN} label="About" full />
      <div class="about">
        <p>Unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</p>
        <p>Includes material from the System Reference Document 5.1 by Wizards of the Coast LLC, licensed under CC BY 4.0.</p>
        <p>Spell, class and action icons from Baldur's Gate 3 © Larian Studios, via bg3.wiki.</p>
        <p>Fallback and component icons by Lorc, game-icons.net, CC BY 3.0.</p>
        <p>Fonts: Inknut Antiqua, Noto Serif, Noto Sans Symbols 2, IM Fell English, EB Garamond — SIL Open Font License.</p>
      </div>
    </div>
  );
}
