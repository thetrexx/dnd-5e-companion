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
  await page.goto('./#/spells/wizard/5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('bg3 icon failure shows fallback', async ({ page }) => {
  await page.route('https://bg3.wiki/**', r => r.abort());
  await page.goto('./#/spells/wizard/3');
  await expect(page.locator('img[src*="/icons/fallback/"]').first()).toBeVisible();
});
