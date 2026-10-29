import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test("browse: Battle Smith Steel Defender card cites Tasha's p. 19", async ({ page }) => {
  await page.goto('./');
  await page.getByText('Artificer', { exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: /Battle Smith/ }).click();
  await expect(page).toHaveURL(/#\/menu\/artificer\/3\/battle-smith$/);
  await page.getByRole('link', { name: /Actions/ }).first().click();
  const sd = page.getByRole('button', { name: /Steel Defender/ });
  await expect(sd).toBeVisible();
  await sd.click();
  const card = page.locator('.card');
  await expect(card).toBeVisible();
  await expect(card.getByText("Full rules: Tasha's p. 19")).toBeVisible();
  await expect(card.getByText(/Stat block: Tasha's p\. 19/)).toBeVisible();
});

async function newArtificer(page: Page, level: string) {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Tink');
  await page.getByLabel(/^Race/).selectOption({ label: 'Human' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByLabel('Add a class').selectOption({ label: 'Artificer' });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel('Artificer level').selectOption(level);
}

test('editor: Artificer 2 options step has Artificer Infusions with 4 picks', async ({ page }) => {
  await newArtificer(page, '2');
  await page.getByRole('button', { name: 'Next ›' }).click();
  const head = page.locator('.sep-label', { hasText: 'Artificer Infusions' });
  await expect(head).toBeVisible();
  await expect(page.getByText('0 of 4 chosen', { exact: true })).toBeVisible();
});

test('editor: Armorer 3 with Guardian sees Defensive Field, not Lightning Launcher', async ({ page }) => {
  await newArtificer(page, '3');
  await page.getByLabel(/^Artificer (?!level)/).selectOption({ label: 'Armorer' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  const guardian = page.getByRole('button', { name: /^Guardian/ });
  await guardian.click();
  await expect(guardian).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('link', { name: /Artificer Actions/ }).click();
  await expect(page.getByRole('button', { name: /Defensive Field/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Lightning Launcher/ })).toHaveCount(0);
});
