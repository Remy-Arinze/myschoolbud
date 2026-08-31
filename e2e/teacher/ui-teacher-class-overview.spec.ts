import { test, expect } from '@playwright/test';
import fs from 'fs';
import { TEACHER_AUTH, openPrimaryClass, goToClassTab } from '../helpers/teacher-class';

/**
 * E2E: Class hub → Overview tab (stats, curriculum chip, quick actions).
 */

test.describe.serial('E2E: class overview tab', () => {
  test.describe.configure({ timeout: 8 * 60_000 });
  test.use({ storageState: TEACHER_AUTH });

  test('stats cards and quick actions on overview', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    await openPrimaryClass(page);

    await expect(page.getByText('Class Enrollment').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Total Resources').first()).toBeVisible();
    await expect(page.getByText('Assessments').first()).toBeVisible();

    const enrollmentCard = page.locator('text=Class Enrollment').locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
    await expect(enrollmentCard.getByText(/^\d+$/).first()).toBeVisible();

    const resourcesCard = page.locator('text=Total Resources').locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
    await expect(resourcesCard.getByText(/^\d+$/).first()).toBeVisible();

    const assessmentsCard = page.locator('text=Assessments').locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
    await expect(assessmentsCard.getByText(/^\d+$/).first()).toBeVisible();

    const curriculumSection = page.getByRole('heading', { name: /next in curriculum/i }).locator('xpath=ancestor::div[contains(@class,"rounded")][1]');
    await expect(curriculumSection).toBeVisible();

    const startTeaching = curriculumSection.getByRole('button', { name: /start teaching|continue teaching/i });
    const viewPlan = curriculumSection.getByRole('button', { name: /view teaching plan/i });

    if (await startTeaching.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expect(curriculumSection.getByText(/^Week \d+/i)).toBeVisible();
      await expect(curriculumSection.locator('h4')).toBeVisible();
    } else {
      await expect(viewPlan).toBeVisible();
    }

    await page.getByRole('button', { name: /manage assessments/i }).click();
    await expect(page.getByRole('heading', { name: /^assessments$/i })).toBeVisible({ timeout: 15_000 });

    await goToClassTab(page, 'Overview');

    const rollCallBtn = page.getByRole('button', { name: /take daily roll call/i });
    if (await rollCallBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rollCallBtn.click();
      await expect(page.getByText(/roll call|attendance|present|absent|mark/i).first()).toBeVisible({
        timeout: 15_000,
      });
    }

    await goToClassTab(page, 'Overview');
    const teachingBtn = curriculumSection.getByRole('button', { name: /start teaching|continue teaching|view teaching plan/i });
    await teachingBtn.click();
    await expect(page.getByText(/scheme of work|weekly roadmap|term completion/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
