import type { ClassId, EditStep, Route } from './data/types';
import { CLASS_IDS } from './data/validate';

const START: Route = { page: 'start' };
const isClass = (s: string | undefined): s is ClassId => !!s && CLASS_IDS.includes(s);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const parseSub = (s: string | undefined) => (s === undefined || KEBAB.test(s) ? { ok: true, sub: s } : { ok: false, sub: undefined });
const STEPS: EditStep[] = ['basics', 'classes', 'options', 'feats', 'spells'];
const parseLevel = (s: string | undefined) => (s !== undefined && /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 20 ? +s : null);

export function parseHash(hash: string): Route {
  try {
    if (!hash.startsWith('#/')) return START;
    const [path, query = ''] = hash.slice(2).split('?');
    const p = path.split('/').map(decodeURIComponent);
    const section = new URLSearchParams(query).get('s') || undefined;
    switch (p[0]) {
      case 'settings':
        return p.length === 1 ? { page: 'settings' } : START;
      case 'level':
        return p.length === 2 && isClass(p[1]) ? { page: 'level', cls: p[1] } : START;
      case 'subclass': {
        const level = parseLevel(p[2]);
        return p.length === 3 && isClass(p[1]) && level ? { page: 'subclass', cls: p[1], level } : START;
      }
      case 'menu': {
        const level = parseLevel(p[2]);
        const { ok, sub } = parseSub(p[3]);
        if (p.length > 4 || !ok || !isClass(p[1]) || !level) return START;
        return sub ? { page: 'menu', cls: p[1], level, sub } : { page: 'menu', cls: p[1], level };
      }
      case 'spells':
      case 'actions': {
        const level = parseLevel(p[2]);
        const { ok, sub } = parseSub(p[3]);
        if (p.length > 4 || !ok || !isClass(p[1]) || !level) return START;
        return { page: p[0], cls: p[1], level, ...(sub && { sub }), ...(section && { section }) };
      }
      case 'card': {
        const level = parseLevel(p[4]);
        const { ok, sub } = parseSub(p[5]);
        if (p.length > 6 || !ok || (p[1] !== 'spell' && p[1] !== 'feature') || !p[2] || !isClass(p[3]) || !level) return START;
        return { page: 'card', kind: p[1], id: p[2], cls: p[3], level, ...(sub && { sub }) };
      }
      case 'me': {
        const sec = section && { section };
        if (p.length === 1) return { page: 'me' };
        if (p.length === 2 && (p[1] === 'spells' || p[1] === 'actions')) return { page: p[1] === 'spells' ? 'me-spells' : 'me-actions', ...sec };
        if (p.length === 4 && p[1] === 'card' && (p[2] === 'spell' || p[2] === 'feature') && p[3]) return { page: 'me-card', kind: p[2], id: p[3], ...sec };
        return START;
      }
      case 'edit':
        return p.length === 2 && STEPS.includes(p[1] as EditStep) ? { page: 'edit', step: p[1] as EditStep } : START;
      default:
        return START;
    }
  } catch {
    return START;
  }
}

export function toHash(r: Route): string {
  const e = encodeURIComponent;
  switch (r.page) {
    case 'start': return '#/';
    case 'settings': return '#/settings';
    case 'level': return `#/level/${r.cls}`;
    case 'subclass': return `#/subclass/${r.cls}/${r.level}`;
    case 'menu': return `#/menu/${r.cls}/${r.level}${r.sub ? `/${r.sub}` : ''}`;
    case 'spells':
    case 'actions':
      return `#/${r.page}/${r.cls}/${r.level}${r.sub ? `/${r.sub}` : ''}${r.section ? `?s=${e(r.section)}` : ''}`;
    case 'card': return `#/card/${r.kind}/${e(r.id)}/${r.cls}/${r.level}${r.sub ? `/${r.sub}` : ''}`;
    case 'me': return '#/me';
    case 'me-spells': return `#/me/spells${r.section ? `?s=${e(r.section)}` : ''}`;
    case 'me-actions': return `#/me/actions${r.section ? `?s=${e(r.section)}` : ''}`;
    case 'me-card': return `#/me/card/${r.kind}/${e(r.id)}${r.section ? `?s=${e(r.section)}` : ''}`;
    case 'edit': return `#/edit/${r.step}`;
  }
}
