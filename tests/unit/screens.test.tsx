import { fireEvent, render } from '@testing-library/preact';
import { DATA } from '../../src/data';
import { Card } from '../../src/ui/screens/Card';
import { Menu } from '../../src/ui/screens/Menu';
import { SubclassPicker } from '../../src/ui/screens/SubclassPicker';
import { Start } from '../../src/ui/screens/Start';
import { Separator } from '../../src/ui/Separator';

const spell = (id: string) => DATA.spells.find((s) => s.id === id)!;

test('Card shows the spell icon top right', () => {
  const mm = spell('magic-missile');
  expect(mm.icon).toBeTruthy();
  const r = render(<Card kind="spell" id="magic-missile" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-icon img')!.getAttribute('src')).toBe(mm.icon);
});

test('Card falls back when the spell has no icon', () => {
  expect(spell('mage-armor').icon).toBeUndefined();
  const r = render(<Card kind="spell" id="mage-armor" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-icon img')!.getAttribute('src')).toContain('/icons/fallback/spell.svg');
});

test('Card shows the reaction trigger with the cost', () => {
  const r = render(<Card kind="spell" id="shield" cls="wizard" level={3} />);
  expect(r.container.querySelector('.card-cost')!.textContent)
    .toContain('Reaction, which you take when you are hit by an attack or targeted by the magic missile spell');
});

test('Card divider uses the card separator variant', () => {
  const r = render(<Card kind="spell" id="magic-missile" cls="wizard" level={3} />);
  expect(r.container.querySelector('.sep.sep-card')).toBeTruthy();
  expect(render(<Separator ornament="X" full />).container.querySelector('.sep-card')).toBeNull();
});

test('Menu subline names level and subclass', () => {
  expect(render(<Menu cls="wizard" level={3} />).container.querySelector('.hint')!.textContent).toBe('Level 3');
  expect(render(<Menu cls="wizard" level={3} sub="school-of-evocation" />).container.querySelector('.hint')!.textContent).toBe('Level 3 · School of Evocation');
  expect(render(<Menu cls="wizard" level={1} sub="school-of-evocation" />).container.querySelector('.hint')!.textContent).toBe('Level 1');
});

test('Card shows scaling for the route level', () => {
  const hi = render(<Card kind="feature" id="action-surge" cls="fighter" level={17} />);
  expect(hi.container.textContent).toContain('Uses: 2');
  const lo = render(<Card kind="feature" id="action-surge" cls="fighter" level={1} />);
  expect(lo.container.textContent).not.toContain('Uses:');
});

test('Card shows the reaction trigger on features and labels option sources', () => {
  const r = render(<Card kind="feature" id="fighting-style-protection" cls="fighter" level={1} />);
  expect(r.container.querySelector('.card-cost')!.textContent).toContain('Reaction, A creature you can see attacks');
  expect(r.container.querySelector('.card-sub')!.textContent).toContain('Fighting Style');
  expect(r.container.querySelector('a.back')!.getAttribute('href')).toBe('#/actions/fighter/1?s=opt-fighting-style');
});

test('SubclassPicker lists subclasses and No subclass', () => {
  const r = render(<SubclassPicker cls="fighter" level={3} />);
  expect(r.container.querySelector('.page-title')!.textContent).toBe('Fighter');
  expect(r.container.querySelector('.hint')!.textContent).toBe('Pick a Martial Archetype');
  expect([...r.container.querySelectorAll('button')].map(b => b.textContent)).toEqual(['Champion', 'Eldritch Knight', 'No subclass']);
});

test('Menu row icons and slot icon survive a failed load', () => {
  const r = render(<Menu cls="wizard" level={3} />);
  const ri = r.container.querySelector('img.ri')!;
  fireEvent.error(ri);
  expect(r.container.querySelector('img.ri')!.getAttribute('src')).toContain('/icons/fallback/');
  const before = r.container.querySelectorAll('.slot img').length;
  fireEvent.error(r.container.querySelector('.slot img')!);
  expect(r.container.querySelectorAll('.slot img').length).toBe(before - 1);
  expect(r.container.querySelector('.slot b')).toBeTruthy();
});

test('Start tile icon falls back on error', () => {
  const r = render(<Start />);
  const img = r.container.querySelector('.tile img')!;
  fireEvent.error(img);
  expect(r.container.querySelector('.tile img')!.getAttribute('src')).toContain('/icons/fallback/');
});
