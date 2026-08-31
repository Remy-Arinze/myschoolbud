import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { TEACHER_AUTH, openPrimaryClass, goToClassTab, dismissLoisIfOpen } from '../helpers/teacher-class';

/**
 * E2E: Class hub → Scheme of Work delivery workflows.
 */

const FIXTURE_DIR = path.resolve(__dirname, '../.sow-e2e-fixture');
const NOTE = `E2E delivery note ${Date.now()}`;

test.describe.serial('E2E: scheme of work delivery', () => {
  test.describe.configure({ timeout: 10 * 60_000 });
  test.use({ storageState: TEACHER_AUTH });

  test('future week cannot be marked delivered before window', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    await openPrimaryClass(page);
    await dismissLoisIfOpen(page);
    await goToClassTab(page, 'Scheme of Work');

    await expect(page.getByText(/weekly roadmap|scheme of work/i).first()).toBeVisible({ timeout: 30_000 });

    const upcoming = page.getByText(/^Upcoming$/i).first();
    test.skip(!(await upcoming.isVisible({ timeout: 5_000 }).catch(() => false)), 'No upcoming weeks in scheme');

    const upcomingCard = upcoming.locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(upcomingCard.getByRole('button', { name: /mark delivered/i })).toHaveCount(0);
    await expect(upcomingCard.getByRole('button', { name: /plan ahead|hide plan/i })).toBeVisible();
  });

  test('mark current week delivered on-time with note and confidence', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    await openPrimaryClass(page);
    await dismissLoisIfOpen(page);
    await goToClassTab(page, 'Scheme of Work');

    await expect(page.getByText(/this week/i).first()).toBeVisible({ timeout: 30_000 });

    const currentWeekCard = page.getByText(/^This week$/i).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');

    const clearBtn = currentWeekCard.getByRole('button', { name: /^clear$/i });
    if (await clearBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await clearBtn.click();
      await expect(page.getByText(/delivery cleared|cleared/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => null);
      await page.waitForTimeout(1500);
    }

    await currentWeekCard.getByRole('button', { name: /mark delivered/i }).click();
    await expect(page.getByRole('heading', { name: /mark week \d+ delivered/i })).toBeVisible();

    await page.getByPlaceholder(/what did you cover/i).fill(NOTE);
    await dismissLoisIfOpen(page);

    const deliveryDialog = page.getByRole('dialog', { name: /mark week \d+ delivered/i });
    await deliveryDialog.getByRole('button', { name: /confirm delivery/i }).click();
    await expect(deliveryDialog).toHaveCount(0, { timeout: 20_000 });

    await expect(currentWeekCard.getByText(/^Completed$/i)).toBeVisible({ timeout: 15_000 });
    await expect(currentWeekCard.getByText(/\d+%/)).toBeVisible();
  });

  test('mark past week late with catch-up reason', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    await openPrimaryClass(page);
    await dismissLoisIfOpen(page);
    await goToClassTab(page, 'Scheme of Work');

    const showPast = page.getByRole('button', { name: /show past weeks/i });
    if (await showPast.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await showPast.click();
    }

    const catchUpBtn = page.getByRole('button', { name: /^catch up$/i }).first();
    test.skip(!(await catchUpBtn.isVisible({ timeout: 8_000 }).catch(() => false)), 'No undelivered past weeks');

    await catchUpBtn.click();
    await expect(page.getByRole('heading', { name: /mark week \d+ delivered/i })).toBeVisible();

    await page.getByRole('button', { name: /catch-up lesson/i }).click();
    await page.getByPlaceholder(/what did you cover/i).fill(`Catch-up: ${NOTE}`);

    const deliveryDialog = page.getByRole('dialog', { name: /mark week \d+ delivered/i });
    await dismissLoisIfOpen(page);
    await deliveryDialog.getByRole('button', { name: /confirm delivery/i }).click();
    await expect(deliveryDialog).toHaveCount(0, { timeout: 20_000 });

    await expect(page.getByText(/^Completed$/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('upload delivery proof file on expanded week', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    const proofPath = path.join(FIXTURE_DIR, 'lesson-note.png');
    fs.writeFileSync(
      proofPath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    );

    await openPrimaryClass(page);
    await dismissLoisIfOpen(page);
    await goToClassTab(page, 'Scheme of Work');

    const currentWeekCard = page.getByText(/^This week$/i).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await currentWeekCard.click();

    const uploadLabel = currentWeekCard.getByText(/upload lesson note/i);
    await expect(uploadLabel).toBeVisible({ timeout: 10_000 });

    const fileInput = currentWeekCard.locator('input[type="file"]').first();
    const uploadResponse = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().includes('/scheme-of-work/week/') &&
        r.url().includes('/lesson-note'),
    );

    await fileInput.setInputFiles(proofPath);
    const res = await uploadResponse;
    test.skip(!res.ok(), 'Lesson note upload requires Cloudinary — skipped in local env');

    await expect(page.getByText(/lesson note uploaded|confidence updated/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('delivered week shows status on revisit', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    await openPrimaryClass(page);
    await dismissLoisIfOpen(page);
    await goToClassTab(page, 'Scheme of Work');

    const currentWeekCard = page.getByText(/^This week$/i).locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]');
    await expect(currentWeekCard.getByText(/^Completed$/i)).toBeVisible({ timeout: 20_000 });
    await expect(currentWeekCard.getByRole('button', { name: /^clear$/i })).toBeVisible();

    await page.reload();
    await goToClassTab(page, 'Scheme of Work');
    await expect(currentWeekCard.getByText(/^Completed$/i)).toBeVisible({ timeout: 20_000 });
  });
});
