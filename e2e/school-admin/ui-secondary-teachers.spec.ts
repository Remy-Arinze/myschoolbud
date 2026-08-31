import { test, expect } from '@playwright/test';
import { switchSchoolType, fillPhone } from '../helpers/ui';

const SUBJECTS = [
  { name: 'Mathematics', code: 'E2E-MATH' },
  { name: 'English Language', code: 'E2E-ENG' },
];

/**
 * UI E2E: create secondary subjects via Add Subject, then add multiple teachers
 * sharing those subjects (for later timetable multi-teacher assignment).
 */
test.describe('UI: secondary multi-teacher per subject', () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test('creates secondary subjects via Add Subject UI', async ({ page }) => {
    await page.goto('/dashboard/school/subjects');
    await expect(page.getByRole('heading', { name: /subjects|courses/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await switchSchoolType(page, 'SECONDARY');
    await expect(page.getByText(/manage subjects for secondary/i)).toBeVisible({ timeout: 20_000 });
    // Wait for subject list fetch so skip checks are not racing load
    await page
      .waitForResponse(
        (r) =>
          r.url().includes('/timetable/subjects') &&
          r.request().method() === 'GET' &&
          r.ok(),
        { timeout: 30_000 },
      )
      .catch(() => null);
    await expect(page.getByRole('button', { name: /add subject/i })).toBeVisible();

    for (const subject of SUBJECTS) {
      // Prefer code chip — unique even when list is dense
      const existingByCode = page.getByText(subject.code, { exact: true }).first();
      const existingByName = page.getByText(subject.name, { exact: true }).first();
      if (
        (await existingByCode.isVisible().catch(() => false)) ||
        (await existingByName.isVisible().catch(() => false))
      ) {
        continue;
      }

      await page.getByRole('button', { name: /add subject/i }).click();
      const modal = page.locator('div.fixed.inset-0').filter({ hasText: /create subject/i });
      await expect(modal).toBeVisible({ timeout: 15_000 });

      // Combobox: type custom subject name (Agora bank empty → custom subject)
      const nameInput = modal.getByPlaceholder(/search bud library subjects/i);
      await expect(nameInput).toBeVisible();
      await nameInput.fill(subject.name);

      // Combobox offers "Use custom: ..." when bank has no match
      const useCustom = page.getByRole('button', { name: new RegExp(`use custom:.*${subject.name}`, 'i') });
      if (await useCustom.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await useCustom.click();
      }

      await expect(modal.getByText(/matching agora subject not found/i)).toBeVisible({
        timeout: 10_000,
      });

      const codeInput = modal.getByPlaceholder(/e\.g\., MATH/i);
      await codeInput.fill(subject.code);

      const createResponsePromise = page.waitForResponse(
        (res) =>
          res.url().includes('/timetable/subjects') &&
          res.request().method() === 'POST' &&
          !res.url().includes('auto-generate') &&
          !res.url().includes('class-assignments'),
        { timeout: 60_000 },
      );

      await modal.getByRole('button', { name: /^create$/i }).click();

      // Custom subject warning when Agora bank is empty
      const continueAnyway = page.getByRole('button', { name: /continue anyway/i });
      if (await continueAnyway.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await continueAnyway.click();
      }

      const res = await createResponsePromise;
      // 400 "already exists" is fine for idempotent re-runs
      if (!res.ok()) {
        const body = await res.text().catch(() => '');
        if (res.status() === 400 && /already exists/i.test(body)) {
          await page.keyboard.press('Escape');
          await expect(page.getByText(subject.name, { exact: true }).first()).toBeVisible({
            timeout: 15_000,
          });
          continue;
        }
        throw new Error(`create subject ${subject.name} failed: ${res.status()} ${body.slice(0, 300)}`);
      }
      await expect(page.getByText(subject.name, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  test('adds multiple secondary teachers on shared subjects via UI', async ({ page }) => {
    await page.goto('/dashboard/school/staff');
    await expect(page.getByRole('heading', { name: /staff/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await switchSchoolType(page, 'SECONDARY');

    const teachers = [
      { first: 'Ifeanyi', last: 'MathOne', email: 'remyarinze+e2e-t-math1@gmail.com', phone: '8012001001', subject: 'Mathematics' },
      { first: 'Blessing', last: 'MathTwo', email: 'remyarinze+e2e-t-math2@gmail.com', phone: '8012001002', subject: 'Mathematics' },
      { first: 'Kelechi', last: 'EngOne', email: 'remyarinze+e2e-t-eng1@gmail.com', phone: '8012001003', subject: 'English Language' },
      { first: 'Funke', last: 'EngTwo', email: 'remyarinze+e2e-t-eng2@gmail.com', phone: '8012001004', subject: 'English Language' },
    ];

    for (const t of teachers) {
      // Skip if this teacher already exists on the staff list
      await page.goto('/dashboard/school/staff');
      await switchSchoolType(page, 'SECONDARY');
      if (await page.getByText(t.email, { exact: false }).first().isVisible().catch(() => false)) {
        continue;
      }

      await page.goto('/dashboard/school/staff/add');
      await expect(page.getByText(/staff type/i)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/no subjects found for your secondary/i)).toHaveCount(0, {
        timeout: 20_000,
      });

      await page.getByRole('button', { name: /teacher|teaching staff/i }).first().click();

      await page.getByLabel(/first name/i).fill(t.first);
      await page.getByLabel(/last name/i).fill(t.last);
      await page.getByLabel(/^email/i).fill(t.email);
      await fillPhone(page, 'Phone', t.phone);

      const subjectTrigger = page.locator('[data-subject-multiselect]').getByText(/select subjects/i).first();
      await subjectTrigger.click();
      const panel = page.locator('[data-subject-multiselect]');
      await expect(panel.getByText(t.subject, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
      await panel.getByText(t.subject, { exact: false }).first().click();
      await expect(panel.getByText(/1 subject selected/i)).toBeVisible({ timeout: 5_000 });
      // Click outside to close dropdown (Escape can blur/cancel oddly)
      await page.getByRole('heading', { name: /add new staff/i }).click();

      const continueBtn = page.locator('form').getByRole('button', { name: /^continue$/i });
      await expect(continueBtn).toBeEnabled({ timeout: 10_000 });

      const [res] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            r.url().includes('/schools/') &&
            r.url().includes('/teachers') &&
            !r.url().includes('/subjects') &&
            !r.url().includes('/image'),
          { timeout: 90_000 },
        ),
        continueBtn.click(),
      ]);

      if (!res.ok()) {
        const body = await res.text().catch(() => '');
        throw new Error(`add teacher failed for ${t.email}: ${res.status()} ${body.slice(0, 300)}`);
      }
      await expect(page).toHaveURL(/\/dashboard\/school\/staff\/?$/, { timeout: 30_000 });
    }
  });
});
