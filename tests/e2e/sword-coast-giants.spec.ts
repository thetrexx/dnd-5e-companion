import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function startEditor(page: Page, race: string) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Batch');
  await page.getByLabel(/^Race/).selectOption({ label: race });
}

async function addClass(page: Page, cls: string, level: string) {
  await page.getByLabel('Add a class').selectOption({ label: cls });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel(`${cls} level`).selectOption(level);
}

test("editor: Tiefling Devil's Tongue 5 lists Vicious Mockery, not Hellish Rebuke", async ({ page }) => {
  await startEditor(page, 'Tiefling');
  await page.getByLabel(/^Subrace/).selectOption({ label: "Devil's Tongue variant" });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await addClass(page, 'Fighter', '5');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('link', { name: /Devil's Tongue variant Spells/ }).click();
  await expect(page.getByRole('button', { name: /Vicious Mockery/ })).toBeVisible();
  await page.goto('./#/me/spells');
  await expect(page.getByRole('button', { name: /Vicious Mockery/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hellish Rebuke/ })).toHaveCount(0);
});

test('editor: Fighter 4 with Strike of the Giants and Fire Strike sees Fire Strike', async ({ page }) => {
  await startEditor(page, 'Human');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await addClass(page, 'Fighter', '4');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  const feat = page.getByRole('button', { name: /^Strike of the Giants/ });
  await feat.click();
  await expect(feat).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Options', exact: true }).click();
  await expect(page.locator('.sep-label', { hasText: 'Giant Strike' })).toBeVisible();
  const fire = page.getByRole('button', { name: /^Fire Strike/ });
  await fire.click();
  await expect(fire).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Spells', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('link', { name: /Fighter Actions/ }).click();
  await expect(page.getByRole('button', { name: /Fire Strike/ })).toBeVisible();
});

test('browse: Cleric 17 Arcana Domain Arcane Abjuration cites SCAG p. 125', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Cleric', { exact: true }).click();
  await page.getByRole('button', { name: '17', exact: true }).click();
  await page.getByRole('button', { name: /Arcana Domain/ }).click();
  await page.getByRole('link', { name: /Actions/ }).first().click();
  const row = page.getByRole('button', { name: /Arcane Abjuration/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator('.card').getByText(/Full rules: SCAG p\. 125$/)).toBeVisible();
});
