export interface PickItem { id: string; label: string; note?: string; disabled?: boolean }

export function PickList(p: { items: PickItem[]; picked: string[]; onToggle(id: string): void }) {
  return (
    <div class="picklist">
      {p.items.map((it) => (
        <button key={it.id} type="button" disabled={it.disabled} class="pick-row" aria-pressed={p.picked.includes(it.id)} onClick={() => p.onToggle(it.id)}>
          <span class="pick-label">{it.label}</span>
          {it.note && <span class="pick-note">{it.note}</span>}
        </button>
      ))}
    </div>
  );
}
