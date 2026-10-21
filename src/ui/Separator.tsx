export function Separator(p: { label?: string; sub?: string; ornament: string; full?: boolean; color?: string }) {
  const tint = p.color ? { color: p.color } : undefined;
  return (
    <div class={`sep${p.full ? ' sep-full' : ''}`}>
      <span class="orn" aria-hidden="true" style={tint}>{p.ornament}</span>
      <span class="ln" style={tint} />
      {p.label && <span class="sep-label">{p.label}</span>}
      {p.sub && <span class="sep-sub" style={tint}>{p.sub}</span>}
      <span class="ln" style={tint} />
      <span class="orn flip" aria-hidden="true" style={tint}>{p.ornament}</span>
    </div>
  );
}
