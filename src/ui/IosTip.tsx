import { useState } from 'preact/hooks';
import { loadSettings, saveSettings } from '../settings/settings';

export function shouldShowIosTip(): boolean {
  const ios = /iPhone|iPad/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone && !loadSettings().iosTipSeen;
}

export function IosTip() {
  const [show, setShow] = useState(shouldShowIosTip);
  if (!show) return null;
  return (
    <div class="ios-tip" role="note">
      <span>Tip: tap Share → Add to Home Screen so your iPhone keeps your saved data.</span>
      <button type="button" aria-label="Dismiss" onClick={() => { saveSettings({ ...loadSettings(), iosTipSeen: true }); setShow(false); }}>✕</button>
    </div>
  );
}
