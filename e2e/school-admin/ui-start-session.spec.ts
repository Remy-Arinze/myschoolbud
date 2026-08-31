import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType, fillDatePicker } from '../helpers/ui';

async function dismissSessionInfoModal(page: Page) {
  const welcome = page.getByRole('heading', { name: /welcome to the session wizard/i });
  if (!(await welcome.isVisible().catch(() => false))) return;

  // Prefer header X (always visible); Got it may be below the fold
  const closeX = page
    .locator('div.fixed.inset-0')
    .filter({ has: welcome })
    .locator('button')
    .first();
  const gotIt = page.getByRole('button', { name: /got it/i });

  for (let i = 0; i < 5; i++) {
    if (!(await welcome.isVisible().catch(() => false))) return;

    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.scrollIntoViewIfNeeded().catch(() => undefined);
      await gotIt.click({ force: true });
    } else if (await closeX.isVisible().catch(() => false)) {
      await closeX.click({ force: true });
    } else {
      // Backdrop click / Escape
      await page.locator('div[role="presentation"].fixed.inset-0').click({ force: true }).catch(() => undefined);
      await page.keyboard.press('Escape');
    }

    await welcome.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => undefined);
  }
}

/**
 * UI E2E: start an academic session + Term 1 via Session Wizard
 * for PRIMARY and SECONDARY (school-type-scoped).
 */
test.describe('UI: start academic session', () => {
  test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 });

  for (const schoolType of ['PRIMARY', 'SECONDARY'] as const) {
    test(`starts ${schoolType} session via Session Wizard`, async ({ page }) => {
      const sessionName = '2025/2026';

      await page.goto('/dashboard/school/overview');
      await expect(page.getByText(/welcome back/i).first()).toBeVisible({ timeout: 30_000 });
      await switchSchoolType(page, schoolType);

      // If already active, dashboard shows End Term — nothing to do
      const endTermBtn = page.getByRole('button', { name: /end term/i });
      if (await endTermBtn.isVisible().catch(() => false)) {
        test.info().annotations.push({
          type: 'note',
          description: `${schoolType} already has an active session/term`,
        });
        return;
      }

      // Prefer dashboard CTA, else go direct
      const startBtn = page.getByRole('button', { name: /start session|start term/i }).first();
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
      } else {
        await page.goto('/dashboard/school/settings/session');
      }

      await expect(page.getByRole('heading', { name: /start new term/i })).toBeVisible({
        timeout: 30_000,
      });

      await dismissSessionInfoModal(page);

      // Step 1 — New Session + name
      await dismissSessionInfoModal(page);
      await page.getByRole('button', { name: /new session/i }).click({ force: true });
      const nameBox = page.getByPlaceholder('2025/2026');
      await expect(nameBox).toBeVisible({ timeout: 10_000 });
      await nameBox.fill(sessionName);

      await dismissSessionInfoModal(page);
      await page.getByRole('button', { name: /^next$/i }).click();

      // Step 2 — dates (must span 10–12 months; include "today" Jul 2026)
      await expect(page.getByText(/session period|set dates/i).first()).toBeVisible({
        timeout: 15_000,
      });
      await dismissSessionInfoModal(page);

      await fillDatePicker(page, /start date/i, 2025, 'Sep', 1);
      await dismissSessionInfoModal(page);
      await fillDatePicker(page, /end date/i, 2026, 'Aug', 31);

      await expect(page.getByText(/session duration is valid/i)).toBeVisible({
        timeout: 10_000,
      });

      // Default: starting Term 1, auto-split term dates
      await dismissSessionInfoModal(page);
      const startOrNext = page.getByRole('button', { name: /^(next|start term)$/i });
      await expect(startOrNext).toBeEnabled({ timeout: 10_000 });
      await startOrNext.click();

      // Step 3 — migration (NEW_SESSION always shows this)
      const migrationHeading = page.getByText(/student migration/i);
      if (await migrationHeading.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await dismissSessionInfoModal(page);
        await page.getByRole('button', { name: /yes - carry over/i }).click();

        const startResponse = page.waitForResponse(
          (res) =>
            res.url().includes('/sessions/start-term') &&
            res.request().method() === 'POST',
          { timeout: 90_000 },
        );

        await page.getByRole('button', { name: /^start term$/i }).click();
        const res = await startResponse;
        if (!res.ok()) {
          const body = await res.text().catch(() => '');
          throw new Error(`start-term failed for ${schoolType}: ${res.status()} ${body.slice(0, 400)}`);
        }
      } else {
        await expect(page).toHaveURL(/\/dashboard\/school\/overview/, { timeout: 60_000 });
      }

      await expect(page).toHaveURL(/\/dashboard\/school\/overview/, { timeout: 60_000 });
      await switchSchoolType(page, schoolType);
      await expect(page.getByRole('button', { name: /end term/i })).toBeVisible({
        timeout: 30_000,
      });
    });
  }
});
