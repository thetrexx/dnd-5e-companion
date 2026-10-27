import { test, expect } from '@playwright/test';

test('browse: Shadow Magic sorcerer, cross-book tags and book lines', async ({ page }) => {
  await page.goto('./');
  await page.getByText('Sorcerer').click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: /Shadow Magic/ }).click();
  await expect(page).toHaveURL(/#\/menu\/sorcerer\/3\/shadow-magic$/);
  await page.getByText('Level 2 Spells').click();
  await expect(page).toHaveURL(/#\/spells\/sorcerer\/3\/shadow-magic/);
  const lvl2 = page.locator('#lvl-2');
  await expect(lvl2.getByText('Eyes of the Dark · 2 sorcery points or a slot')).toBeVisible();
  await lvl2.getByText('Darkness', { exact: true }).click();
  await expect(page.getByText('Full rules: PHB p. 230')).toBeVisible();

  await page.goto('./#/actions/sorcerer/6/shadow-magic');
  await page.getByText('Hound of Ill Omen').first().click();
  await expect(page.getByText("Full rules: Xanathar's p. 51")).toBeVisible();
});

test('old wild-magic barbarian link drops the subclass quietly', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/menu/barbarian/3/wild-magic');
  await expect(page.getByRole('link', { name: /Barbarian Actions/ })).toBeVisible();
  await expect(page.getByText(/wild magic/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('editor: a fighting style taken by one class is disabled for the other', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /My Character Sheet/ }).click();
  await page.getByLabel('Name').fill('Tess');
  await page.getByLabel(/^Race/).selectOption({ label: 'Human' });
  await page.getByRole('button', { name: 'Next ›' }).click();
  for (const c of ['Fighter', 'Paladin']) {
    await page.getByLabel('Add a class').selectOption({ label: c });
    await page.getByRole('button', { name: 'Add class' }).click();
  }
  await page.getByLabel('Fighter level').selectOption('1');
  await page.getByLabel('Paladin level').selectOption('2');
  await page.getByRole('button', { name: 'Next ›' }).click();
  const defense = page.getByRole('button', { name: /^Defense/ });
  await expect(defense).toHaveCount(2);
  await defense.first().click();
  await expect(defense.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(defense.nth(1)).toBeDisabled();
  await expect(defense.nth(1)).toContainText('Chosen for Fighter');
});
