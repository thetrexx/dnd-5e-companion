import { DATA } from '../../data';
import type { ClassId, Cost, Feature, FeatureCost } from '../../data/types';
import { bookRef, costBar, damageLine, levelLine, replacedNames, tags } from '../../logic/card';
import { effectiveSub } from '../../logic/subclass';
import { toHash } from '../../router';
import { ComponentIcons } from '../ComponentIcons';
import { Icon, spellFallback } from '../Icon';
import { Separator } from '../Separator';

const SYMBOL: Record<FeatureCost, { sym: string; token: string }> = {
  action: { sym: '●', token: '--cost-action' },
  bonus: { sym: '▲', token: '--cost-bonus' },
  reaction: { sym: '◆', token: '--cost-reaction' },
  other: { sym: '○', token: '--cost-action' },
  free: { sym: '○', token: '--cost-action' },
  passive: { sym: '○', token: '--cost-action' },
};
const COST_LABEL: Record<FeatureCost, string> = {
  action: 'Action', bonus: 'Bonus Action', reaction: 'Reaction', other: 'Other', free: 'Free', passive: 'Passive',
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function CostItem(p: { cost: FeatureCost; label: string }) {
  const s = SYMBOL[p.cost];
  return <span><span style={{ color: `var(${s.token})` }}>{s.sym}</span> {p.label}</span>;
}

/** The group that lists this option for the current class or subclass. A group reusing another group's options (from/only) wins over the source group. */
function optionGroupId(f: Feature, cls: ClassId, sub?: string): string {
  const own = DATA.optionGroups.filter((g) =>
    ((g.owner.kind === 'class' && g.owner.id === cls) || (g.owner.kind === 'subclass' && g.owner.id === sub))
    && (g.from ?? g.id) === f.source.id && (!g.only || g.only.includes(f.id)));
  return own.find((g) => g.from)?.id ?? own[0]?.id ?? f.source.id;
}

/** The owner of an optional group (Tasha's optional features), whose section and name its options take. */
const optionalOwner = (f: Feature, group: string) => {
  const g = f.source.kind === 'option' ? DATA.optionGroups.find((x) => x.id === group) : undefined;
  return g?.optional ? g.owner : undefined;
};

function featureSection(f: Feature, group: string): string {
  const owner = optionalOwner(f, group);
  if (owner) return owner.kind === 'subclass' ? 'subclass' : 'class';
  if (f.source.kind === 'subclass') return 'subclass';
  if (f.source.kind === 'option') return `opt-${group}`;
  if (f.source.kind !== 'generic') return 'class';
  return f.cost === 'bonus' ? 'bonus' : f.cost === 'reaction' ? 'reactions' : 'actions';
}

/** ' · Optional', plus what it replaces, by feature name else option group name. */
function optionalNote(f: Feature): string {
  if (!f.optional) return '';
  return ` · Optional${f.replaces?.length ? `, replaces ${replacedNames(f.replaces)}` : ''}`;
}

function sourceLabel(f: Feature, group: string): string {
  const owner = optionalOwner(f, group);
  const kind = owner?.kind ?? f.source.kind;
  const id = owner?.id ?? (kind === 'option' ? group : f.source.id);
  if (kind === 'generic') return 'General';
  if (kind === 'subclass') return DATA.subclasses.find((s) => s.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  if (kind === 'option') return DATA.optionGroups.find((g) => g.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  if (kind === 'race') return DATA.races.find((r) => r.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  if (kind === 'feat') return DATA.feats.find((x) => x.id === id)?.name ?? cap(id.replace(/-/g, ' '));
  return cap(id.replace(/-/g, ' '));
}

export function Card(p: { kind: 'spell' | 'feature'; id: string; cls: ClassId; level: number; sub?: string; back?: string }) {
  const spell = p.kind === 'spell' ? DATA.spells.find((s) => s.id === p.id) : undefined;
  const feature = p.kind === 'feature' ? DATA.features.find((f) => f.id === p.id) : undefined;
  const page = p.kind === 'spell' ? 'spells' : 'actions';
  const sub = effectiveSub(p.cls, p.level, p.sub)?.id;
  const group = feature ? optionGroupId(feature, p.cls, sub) : '';
  const section = spell ? (spell.level === 0 ? 'cantrips' : `lvl-${spell.level}`) : feature ? featureSection(feature, group) : undefined;
  const back = p.back ?? toHash({ page, cls: p.cls, level: p.level, ...(sub && { sub }), section });
  const head = (
    <header class="fixed-head">
      <a class="back" href={back}>‹ {cap(page)}</a>
    </header>
  );
  if (!spell && !feature) {
    return <div class="screen fixed">{head}<div class="scroller"><p class="empty">Nothing found</p></div></div>;
  }
  const dmg = spell ? damageLine(spell) : null;
  const bar = spell ? costBar(spell) : null;
  const source = feature ? sourceLabel(feature, group) : '';
  const extra = feature ? [feature.resource, feature.uses].filter(Boolean).join(' · ') : '';
  const scaling = (feature?.scaling ?? []).map((s) => ({ label: s.label, value: s.values[p.level - 1] })).filter((s) => s.value);
  const featureLabel = feature
    ? COST_LABEL[feature.cost] + (feature.trigger ? `, ${feature.trigger}` : '') + (extra ? ` · ${extra}` : '')
    : '';
  return (
    <div class="screen fixed">
      {head}
      <div class="scroller">
        <article class="card">
          <div class="card-icon"><Icon src={(spell ?? feature)!.icon} fallback={spell ? spellFallback(spell) : 'action'} alt="" size={54} /></div>
          <h1 class="card-title">{spell ? spell.name : feature!.name}</h1>
          <div class="card-sub">{spell ? levelLine(spell) : `${source} Feature · Level ${feature!.level}${optionalNote(feature!)}`}</div>
          {dmg && <div class="card-dmg">{dmg.headline}</div>}
          {dmg && <div class="card-dmg-detail">{dmg.detail}</div>}
          <Separator ornament={''} card />
          <div class="card-desc">
            {(spell ? spell.description : feature!.description).map((t, i) => <p key={i}>{t}</p>)}
            {spell?.higherLevels && <p><span class="orn">{'❦'}</span> <i>At Higher Levels.</i> {spell.higherLevels}</p>}
          </div>
          {scaling.length > 0 && (
            <div class="card-scaling">{scaling.map((s) => <div key={s.label}>{s.label}: {s.value}</div>)}</div>
          )}
          {spell && <div class="card-tags">{tags(spell).map((t) => <span key={t}>{t}</span>)}</div>}
          {spell && <ComponentIcons spell={spell} />}
          <div class="card-cost">
            {bar && <CostItem cost={bar.cost} label={bar.trigger ? `${bar.label}, ${bar.trigger}` : bar.label} />}
            {bar?.slot && <span><span style={{ color: 'var(--cost-slot)' }}>■</span> {bar.slot}</span>}
            {feature && <CostItem cost={feature.cost} label={featureLabel} />}
          </div>
          {(spell ?? feature)!.textSource === 'summary' && <div class="card-ref">{bookRef((spell ?? feature)!)}</div>}
        </article>
      </div>
    </div>
  );
}
