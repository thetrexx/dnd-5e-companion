import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test('browse: Ranger Actions shows Favored Foe tagged Optional', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Ranger').click();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByText('Actions', { exact: true }).first().click();
  const foe = page.getByRole('button', { name: /Favored Foe/ });
  await expect(foe).toBeVisible();
  await expect(foe.getByText('Optional', { exact: true })).toBeVisible();
});

test("card: Booming Blade shows its Tasha's page", async ({ page }) => {
  await page.goto('./#/spells/wizard/1');
  await page.getByText('Booming Blade', { exact: true }).first().click();
  await expect(page.getByText("Full rules: Tasha's p. 106")).toBeVisible();
});

async function newCharacter(page: Page, cls: string, level: string) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Tash');
  await page.getByLabel(/^Race/).selectOption({ label: 'Human' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByLabel('Add a class').selectOption({ label: cls });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel(`${cls} level`).selectOption(level);
}

test('editor: Favored Foe replaces Favored Enemy', async ({ page }) => {
  await newCharacter(page, 'Ranger', '1');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await expect(page.locator('.sep-label', { hasText: 'Favored Enemy' })).toBeVisible();
  const foe = page.getByRole('button', { name: /^Favored Foe/ });
  await foe.click();
  await expect(foe).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.sep-label', { hasText: 'Favored Enemy' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('link', { name: /Ranger Actions/ }).click();
  await expect(page.getByRole('button', { name: /Favored Foe/ })).toBeVisible();
});

test('editor: Aura of Vitality needs Additional Cleric Spells', async ({ page }) => {
  await newCharacter(page, 'Cleric', '5');
  const cleric = page.getByLabel(/^Cleric (?!level)/);
  await cleric.selectOption({ index: 1 });
  const next = () => page.getByRole('button', { name: 'Next ›' }).click();
  const back = () => page.getByRole('button', { name: '‹ Back' }).click();
  const aura = page.getByRole('button', { name: /^Aura of Vitality/ });
  await next(); // options, nothing ticked
  await next();
  await next();
  await expect(page.getByRole('heading', { name: 'Level 3' })).toBeVisible();
  await expect(aura).toHaveCount(0);
  await back();
  await back();
  await page.getByRole('button', { name: /^Additional Cleric Spells/ }).click();
  await next();
  await next();
  await expect(aura).toBeVisible();
});
