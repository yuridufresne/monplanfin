import { test, expect } from '@playwright/test';

test('page accueil charge', async ({ page }) => {
  await page.goto('https://mon-plan-fina.base44.app/');
  await expect(page).toHaveTitle(/MonPlanFin|Base44/);
});

test('page confidentialité accessible', async ({ page }) => {
  await page.goto('https://mon-plan-fina.base44.app/confidentialite');
  await expect(page.locator('h1')).toContainText('confidentialité');
});
