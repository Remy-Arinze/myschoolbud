import { test, expect } from '@playwright/test';

test.describe('School admin dashboard', () => {
  test('is authenticated on the school dashboard', async ({ page }) => {
    await page.goto('/dashboard/school');
    await expect(page).toHaveURL(/\/dashboard\/school/);
    await expect(page.getByText(/access denied/i)).toHaveCount(0);
  });

  test('overview page loads', async ({ page }) => {
    await page.goto('/dashboard/school/overview');
    await expect(page).toHaveURL(/\/dashboard\/school\/overview/);
    await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/access denied/i)).toHaveCount(0);
  });

  test('can open core sidebar pages', async ({ page }) => {
    const routes = [
      '/dashboard/school/students',
      '/dashboard/school/staff',
      '/dashboard/school/courses',
      '/dashboard/school/subjects',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/')));
      await expect(page.getByText(/access denied/i)).toHaveCount(0);
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 20_000 });
    }
  });
});
