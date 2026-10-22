import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function fresh(page: Page, hash = './') {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto(hash);
  if (hash !== './') await page.reload();
}

async function createLyra(page: Page) {
  await fresh(page);
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Lyra');
  await page.getByLabel(/^Race/).selectOption({ label: 'Tiefling' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByLabel('Add a class').selectOption({ label: 'Sorcerer' });
  await page.getByRole('button', { name: 'Add class' }).click();
  await page.getByLabel('Sorcerer level').selectOption('5');
  await page.getByLabel(/^Sorcerer (?!level)/).selectOption({ label: 'Draconic Bloodline' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  for (const n of [/Quickened Spell/, /Twinned Spell/, /^Red Dragon/]) {
    const row = page.getByRole('button', { name: n });
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Next ›' }).click();
  await page.getByRole('button', { name: 'Next ›' }).click();
  for (const s of ['Fire Bolt', 'Shield', 'Fireball']) await page.getByRole('button', { name: s, exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
}

test('create a character and use it', async ({ page }) => {
  await createLyra(page);
  await expect(page).toHaveURL(/#\/me$/);
  await expect(page.getByText('Lyra', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Sorcerer 5').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Sorcerer Actions/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Tiefling Spells/ })).toBeVisible();
  await page.getByRole('link', { name: /Level 1 Spells/ }).click();
  const sec = page.locator('#lvl-1-sorcerer');
  const btn = (n: string) => sec.getByRole('button', { name: n, exact: true });
  await expect(btn('Shield')).toBeVisible();
  await expect(btn('Fire Bolt')).toHaveCount(0);
  await expect(btn('Fireball')).toHaveCount(0);
  await expect(btn('Magic Missile')).toHaveCount(0);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(btn('Magic Missile')).toBeVisible();
  await expect(btn('Shield')).toHaveClass(/mine/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(btn('Shield')).toHaveClass(/mine/);
  await page.goto('./#/me');
  await expect(page.getByText('Lyra', { exact: true }).first()).toBeVisible();
});

test('backup code restores the character', async ({ page }) => {
  await createLyra(page);
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Make backup code' }).click();
  await expect(page.getByLabel('Backup code', { exact: true })).not.toHaveValue('');
  const code = await page.getByLabel('Backup code', { exact: true }).inputValue();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByLabel('Paste a backup code').fill(code);
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.getByRole('link', { name: 'Open character' }).click();
  await expect(page.getByText('Lyra', { exact: true }).first()).toBeVisible();
});

test('320px: editor steps and character pages fit', async ({ page }) => {
  await createLyra(page);
  await page.setViewportSize({ width: 320, height: 640 });
  const fits = async (what: string) =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), what).toBe(true);
  const steps: [string, string][] = [['basics', 'Race & name'], ['classes', 'Classes'], ['options', 'Options'], ['feats', 'Feats'], ['spells', 'Spells']];
  for (const [step, label] of steps) {
    await page.goto(`./#/edit/${step}`);
    await expect(page.locator('.steps a[aria-current="step"]')).toHaveText(label);
    await fits(step);
  }
  await page.goto('./#/me');
  await expect(page.getByText('Lyra', { exact: true }).first()).toBeVisible();
  await fits('me');
  await page.goto('./#/me/spells');
  await expect(page.getByRole('button', { name: 'My spells' })).toBeVisible();
  await expect(page.locator('section.sec').first()).toBeVisible();
  await fits('me/spells');
});

test('no character: spells page shows the editor', async ({ page }) => {
  await fresh(page, './#/me/spells');
  await expect(page.locator('.steps a[aria-current="step"]')).toHaveText('Race & name');
  await expect(page.getByLabel('Name')).toBeVisible();
});
