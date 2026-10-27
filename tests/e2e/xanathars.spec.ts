import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test('browse: Divine Soul sorcerer spell list', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Sorcerer').click();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: /Divine Soul/ }).click();
  await expect(page).toHaveURL(/#\/menu\/sorcerer\/1\/divine-soul$/);
  await page.getByText('Level 1 Spells').click();
  await expect(page).toHaveURL(/#\/spells\/sorcerer\/1\/divine-soul/);
  const lvl1 = page.locator('#lvl-1');
  await expect(lvl1.getByText('Cure Wounds', { exact: true })).toBeVisible();
  await expect(lvl1.getByText('Cleric list').first()).toBeVisible();
});

test("card: Toll the Dead shows its Xanathar's page", async ({ page }) => {
  await page.goto('./#/spells/wizard/1');
  await page.getByText('Toll the Dead', { exact: true }).first().click();
  await expect(page.getByText("Full rules: Xanathar's p. 169")).toBeVisible();
});

async function warlock5(page: Page, pact: string) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Vex');
  await page.getByLabel(/^Race/).selectOption({ label: 'Human' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByLabel('Add a class').selectOption({ label: 'Warlock' });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel('Warlock level').selectOption('5');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: new RegExp(`^${pact}`) }).click();
}

test('editor: Eldritch Smite needs Pact of the Blade', async ({ page }) => {
  await warlock5(page, 'Pact of the Blade');
  await expect(page.getByRole('button', { name: /^Eldritch Smite/ })).toBeVisible();
  await warlock5(page, 'Pact of the Chain');
  await expect(page.getByRole('button', { name: /^Eldritch Smite/ })).toHaveCount(0);
});
