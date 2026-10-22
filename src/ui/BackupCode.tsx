import { useRef, useState } from 'preact/hooks';
import { decodeCharacter, encodeCharacter } from '../character/code';
import { loadCharacter, saveCharacter } from '../character/store';

type Done = { name: string; dropped: string[] };

export function BackupCode() {
  const [ch, setCh] = useState(loadCharacter);
  const [code, setCode] = useState('');
  const [exportErr, setExportErr] = useState('');
  const [copy, setCopy] = useState('');
  const [paste, setPaste] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const out = useRef<HTMLTextAreaElement>(null);

  async function make() {
    setCopy(''); setExportErr('');
    try { setCode(await encodeCharacter(ch!)); } catch { setExportErr("This browser can't make a backup code."); }
  }
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopy('Copied');
    } catch {
      out.current?.select();
      setCopy('Select the code and copy it');
    }
  }
  async function restore() {
    setDone(null); setErr('');
    if (ch && !confirm) { setConfirm(true); return; }
    const r = await decodeCharacter(paste);
    if (!r.ok) { setConfirm(false); setErr(r.error); return; }
    if (!saveCharacter(r.ch)) { setConfirm(false); setErr("This browser won't keep your character."); return; }
    setConfirm(false); setCh(r.ch); setCode(''); setPaste('');
    setDone({ name: r.ch.name, dropped: r.dropped });
  }

  return (
    <div class="backup">
      {ch && ch.classes.length > 0 ? (
        <div>
          <button type="button" class="btn" onClick={make}>Make backup code</button>
          {exportErr && <p class="warn" role="alert">{exportErr}</p>}
          {code && (
            <div>
              <label class="field">Backup code
                <textarea ref={out} class="code" readOnly rows={5} value={code} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
              </label>
              <button type="button" class="btn" onClick={copyCode}>Copy</button>
              {copy && <span class="hint" role="status"> {copy}</span>}
            </div>
          )}
          <p class="note">Keep it in your notes or send it to yourself. Paste it here to restore.</p>
        </div>
      ) : <p class="note">Create a character first, or restore one below.</p>}

      <label class="field">Paste a backup code
        <textarea class="code" rows={4} value={paste} onInput={(e) => { setPaste((e.currentTarget as HTMLTextAreaElement).value); setConfirm(false); }} />
      </label>
      <button type="button" class="btn" onClick={restore}>Restore</button>
      {confirm && ch && <p class="warn">This replaces {ch.name}. Press Restore again.</p>}
      {err && <p class="warn" role="alert">{err}</p>}
      {done && (
        <div>
          <p class="note">Restored {done.name}.</p>
          {done.dropped.length > 0 && <p class="note">Skipped, no longer in the app: {done.dropped.join(', ')}</p>}
          <a href="#/me">Open character</a>
        </div>
      )}
    </div>
  );
}
