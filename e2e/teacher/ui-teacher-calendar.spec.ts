import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH = path.resolve(__dirname, '../.auth/teacher-primary.json');

test.describe('QA: teacher calendar route', () => {
  test.use({ storageState: AUTH });

  test('calendar loads without error boundary or hooks crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await page.goto('/dashboard/teacher/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /^calendar$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.rbc-calendar').first()).toBeVisible({ timeout: 20_000 });

    const hooksCrash = pageErrors.some(
      (e) =>
        e.includes('Rendered more hooks') ||
        e.includes('change in the order of Hooks') ||
        e.includes('Loader2 is not defined'),
    );
    expect(hooksCrash, `Unexpected page errors: ${pageErrors.join('\n')}`).toBe(false);
  });
});
