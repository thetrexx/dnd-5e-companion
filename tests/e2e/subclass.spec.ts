import { test, expect } from '@playwright/test';

test('level then subclass then menu', async ({ page }) => {
  await page.goto('./#/level/fighter');
  await page.getByRole('button', { name: '3', exact: true }).click();
  await expect(page).toHaveURL(/#\/subclass\/fighter\/3$/);
  await page.getByRole('button', { name: /Eldritch Knight/ }).click();
  await expect(page).toHaveURL(/#\/menu\/fighter\/3\/eldritch-knight$/);
  await expect(page.getByText('MAGIC')).toBeVisible();
});
test('no subclass skips', async ({ page }) => {
  await page.goto('./#/subclass/fighter/3');
  await page.getByRole('button', { name: 'No subclass' }).click();
  await expect(page).toHaveURL(/#\/menu\/fighter\/3$/);
});
test('level below subclass skips the picker', async ({ page }) => {
  await page.goto('./#/level/wizard');
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page).toHaveURL(/#\/menu\/wizard\/1$/);
});
test('invalid subclass is dropped, not fatal', async ({ page }) => {
  await page.goto('./#/menu/wizard/1/school-of-evocation');
  await expect(page.getByRole('link', { name: /Wizard Actions/ })).toBeVisible();
});
test('320px: tagged spells and the picker fit', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const hash of ['./#/spells/druid/3/circle-of-the-land?s=lvl-2', './#/subclass/fighter/3']) {
    await page.goto(hash);
    await expect(page.locator('.grid, .rows').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), hash).toBe(true);
  }
  await page.goto('./#/spells/druid/3/circle-of-the-land?s=lvl-2');
  await expect(page.getByText('Circle · Arctic', { exact: true }).first()).toBeVisible();
});
