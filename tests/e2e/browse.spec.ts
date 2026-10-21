import { test, expect } from '@playwright/test';

test('browse a wizard', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Wizard').click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page).toHaveURL(/#\/menu\/wizard\/3$/);
  await page.getByText('Level 1 Spells').click();
  await expect(page).toHaveURL(/#\/spells\/wizard\/3\?s=lvl-1$/);
  await expect(page.locator('#lvl-1')).toBeInViewport();
  await page.getByText('Magic Missile').click();
  await expect(page.getByText('6~15 Damage')).toBeVisible();
  await expect(page.getByText('Level 1 Evocation Spell')).toBeVisible();
});
test('deep link renders after reload', async ({ page }) => {
  await page.goto('./#/actions/fighter/2?s=class');
  await expect(page.getByText('Action Surge')).toBeVisible();
});
test('non-caster has no magic', async ({ page }) => {
  await page.goto('./#/menu/fighter/5');
  await expect(page.getByText('MAGIC')).toHaveCount(0);
  await page.goto('./#/spells/fighter/5');
  await expect(page.getByText('Fighters don\'t cast spells')).toBeVisible();
});
test('320px: long names wrap, no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const hash of ['./#/spells/wizard/5', './#/card/spell/magic-missile/wizard/5']) {
    await page.goto(hash);
    await expect(page.locator('.grid, .card').first()).toBeVisible();
    const m = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth <= innerWidth,
      grid: [...document.querySelectorAll('.grid')].every((g) => g.scrollWidth <= g.clientWidth),
      ic: [...document.querySelectorAll('.ic')].every((e) => e.scrollWidth <= e.clientWidth),
      card: [...document.querySelectorAll('.card')].every((e) => e.scrollWidth <= e.clientWidth),
    }));
    expect(m, hash).toEqual({ doc: true, grid: true, ic: true, card: true });
  }
});
test('bg3 icon failure shows fallback', async ({ page }) => {
  await page.route('https://bg3.wiki/**', r => r.abort());
  await page.goto('./#/spells/wizard/3');
  const img = page.locator('.ic', { hasText: 'Magic Missile' }).locator('img');
  await expect(img).toHaveAttribute('src', /\/icons\/fallback\//);
  const srcs = await page.locator('.ic img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  expect(srcs.every((s) => s!.includes('/icons/fallback/'))).toBe(true);
});
test('class missing from data falls back to start', async ({ page }) => {
  await page.goto('./#/menu/cleric/3');
  await expect(page.getByText('My Character Sheet')).toBeVisible();
});
