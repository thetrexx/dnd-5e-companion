import { fireEvent, render } from '@testing-library/preact';
import { DATA } from '../../src/data';
import { Icon } from '../../src/ui/Icon';
import { IconGrid } from '../../src/ui/IconGrid';
import { ComponentIcons } from '../../src/ui/ComponentIcons';
import { Separator } from '../../src/ui/Separator';

const mm = DATA.spells.find((s) => s.id === 'magic-missile')!;

test('Icon falls back on error, same box size', () => {
  const { getByRole } = render(<Icon src="https://bg3.wiki/x.webp" fallback="spell" alt="X" size={50} />);
  fireEvent.error(getByRole('img'));
  expect(getByRole('img').getAttribute('src')).toContain('/icons/fallback/spell.svg');
  expect(getByRole('img').getAttribute('width')).toBe('50');
});

test('Icon with no src renders the fallback directly', () => {
  const { getByRole } = render(<Icon fallback="action" alt="Y" size={40} />);
  expect(getByRole('img').getAttribute('src')).toContain('/icons/fallback/action.svg');
  expect(getByRole('img').getAttribute('height')).toBe('40');
});

test('ComponentIcons: tap toggles explainer, Material dimmed when absent', () => {
  const r = render(<ComponentIcons spell={mm} />);
  fireEvent.click(r.getByRole('button', { name: 'Verbal' }));
  expect(r.getByText(/chant mystic words/)).toBeTruthy();
  expect(r.container.querySelector('.comp-explain b')!.textContent).toBe('Verbal');
  fireEvent.click(r.getByRole('button', { name: 'Verbal' }));
  expect(r.queryByText(/chant mystic words/)).toBeNull();
  expect(r.getByText('Material').closest('[aria-disabled="true"]')).toBeTruthy();
});

test('ComponentIcons: only one explainer open at a time', () => {
  const r = render(<ComponentIcons spell={mm} />);
  fireEvent.click(r.getByRole('button', { name: 'Verbal' }));
  fireEvent.click(r.getByRole('button', { name: 'Somatic' }));
  expect(r.queryByText(/chant mystic words/)).toBeNull();
  expect(r.getByText(/free hand/)).toBeTruthy();
});

test('IconGrid picks by id', () => {
  const picked: string[] = [];
  const r = render(<IconGrid items={[mm]} onPick={(id) => picked.push(id)} />);
  fireEvent.click(r.getByText(mm.name));
  expect(picked).toEqual([mm.id]);
});

test('Separator shows label, sub in colour, mirrored ornament', () => {
  const r = render(<Separator ornament="X" label="Wizard" sub="Cantrips" color="red" full />);
  expect(r.getByText('Wizard')).toBeTruthy();
  expect((r.getByText('Cantrips') as HTMLElement).style.color).toBe('red');
  expect(r.container.querySelectorAll('.orn').length).toBe(2);
  expect(r.container.querySelector('.sep-full')).toBeTruthy();
  const orns = r.container.querySelectorAll('.orn');
  expect(orns[0].classList.contains('flip')).toBe(false);
  expect(orns[1].classList.contains('flip')).toBe(true);
});
