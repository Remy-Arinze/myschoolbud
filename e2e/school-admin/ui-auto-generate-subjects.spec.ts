import { test, expect } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';

/**
 * UI E2E: Auto-Generate subjects from the Agora subject bank
 * for Primary and Secondary on the E2E demo school.
 */
test.describe('UI: auto-generate subjects from bank', () => {
  test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 });

  async function autoGenerateForType(page: import('@playwright/test').Page, type: 'PRIMARY' | 'SECONDARY') {
    await page.goto('/dashboard/school/subjects');
    await expect(page.getByRole('heading', { name: /subjects|courses/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await switchSchoolType(page, type);
    await expect(
      page.getByText(new RegExp(`manage subjects for ${type.toLowerCase()}`, 'i')),
    ).toBeVisible({ timeout: 20_000 });

    await page
      .waitForResponse(
        (r) =>
          r.url().includes('/timetable/subjects') &&
          r.request().method() === 'GET' &&
          r.ok(),
        { timeout: 30_000 },
      )
      .catch(() => null);

    const autoGenerateBtn = page.getByRole('button', { name: /auto-generate/i });
    await expect(autoGenerateBtn).toBeVisible({ timeout: 15_000 });
    await autoGenerateBtn.click();

    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /auto-generate subjects/i });
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByText(/standard .+ subjects/i)).toBeVisible();

    const generateResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/timetable/subjects/auto-generate') &&
        res.request().method() === 'POST',
      { timeout: 60_000 },
    );

    await modal.getByRole('button', { name: /generate subjects/i }).click();

    const generateResponse = await generateResponsePromise;
    expect(generateResponse.ok()).toBeTruthy();
    const body = await generateResponse.json();
    const data = body?.data ?? body;
    console.log(`[${type}] auto-generate result:`, data);

    await expect(modal).toBeHidden({ timeout: 30_000 });

    // Toast confirms creation or that standards already exist
    await expect(
      page.getByText(/created \d+ subjects|already exist|no subjects to generate/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Spot-check a bank subject that should appear for this type
    const spotCheck = type === 'PRIMARY' ? 'Basic Science' : 'Physics';
    await expect(page.getByText(spotCheck, { exact: true }).first()).toBeVisible({
      timeout: 20_000,
    });

    return data as { created?: number; skipped?: number };
  }

  test('auto-generates secondary subjects from Agora bank', async ({ page }) => {
    const result = await autoGenerateForType(page, 'SECONDARY');
    expect((result.created ?? 0) + (result.skipped ?? 0)).toBeGreaterThan(0);
  });

  test('auto-generates primary subjects from Agora bank', async ({ page }) => {
    const result = await autoGenerateForType(page, 'PRIMARY');
    expect((result.created ?? 0) + (result.skipped ?? 0)).toBeGreaterThan(0);
  });
});
