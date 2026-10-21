export function Separator(p: { label?: string; sub?: string; ornament: string; full?: boolean; color?: string }) {
  return (
    <div class={`sep${p.full ? ' sep-full' : ''}`} style={p.color ? { '--sep-color': p.color } : undefined}>
      <span class="orn" aria-hidden="true">{p.ornament}</span>
      <span class="ln" />
      {p.label && <span class="sep-label">{p.label}</span>}
      {p.sub && <span class="sep-sub" style={p.color ? { color: p.color } : undefined}>{p.sub}</span>}
      <span class="ln" />
      <span class="orn flip" aria-hidden="true">{p.ornament}</span>
    </div>
  );
}
