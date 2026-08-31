import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * E2E: Teacher creates/publishes assessment (manual, no AI) → student submits → teacher sees submission.
 *
 * Setup:
 *   cd backend && npx tsx scripts/mint-e2e-teacher-auth.ts
 *   cd backend && npx tsx scripts/mint-e2e-student-auth.ts
 */

const AUTH = {
  teacher: path.resolve(__dirname, '../.auth/teacher-primary.json'),
  student: path.resolve(__dirname, '../.auth/student-primary1a.json'),
};

const FIXTURE = path.resolve(__dirname, '../.assessment-e2e-fixture.json');

type AssessmentFixture = {
  title: string;
  assessmentId: string;
  classId: string;
  correctOption: string;
  createdAt: string;
};

function readFixture(): AssessmentFixture | null {
  try {
    return JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  } catch {
    return null;
  }
}

function writeFixture(data: AssessmentFixture) {
  fs.writeFileSync(FIXTURE, JSON.stringify(data, null, 2));
}

async function openPrimaryClass(page: Page) {
  await page.goto('/dashboard/teacher/overview');
  await expect(page).toHaveURL(/\/dashboard\/teacher/, { timeout: 30_000 });

  const myClassLink = page.getByRole('link', { name: /^my class$/i });
  await expect(myClassLink).toBeVisible({ timeout: 30_000 });
  const href = await myClassLink.getAttribute('href');
  await myClassLink.click();

  await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 30_000 });
  const classId = page.url().match(/\/classes\/([^/?#]+)/)?.[1] ?? href?.split('/').pop() ?? '';
  return classId;
}

async function pickDueDate(page: Page) {
  const dueSection = page.locator('label', { hasText: /due date/i }).locator('..');
  const trigger = dueSection.getByRole('button').first();
  await trigger.click();
  await page.locator('.rdp-day:not(.rdp-day_disabled)').first().click();
}

async function fillMcqQuestion(page: Page, questionText: string, options: string[], correctIndex: number) {
  const questionArea = page.getByPlaceholder(/type your question/i);
  await expect(questionArea).toBeVisible({ timeout: 10_000 });
  await questionArea.fill(questionText);

  await page.getByRole('button', { name: /^multiple choice$/i }).click();

  for (let i = 0; i < options.length; i++) {
    await page.getByPlaceholder(`Option ${i + 1}`).fill(options[i]);
  }

  const radios = page.locator('input[type="radio"]');
  await radios.nth(correctIndex).check();
}

test.describe.serial('E2E: assessment lifecycle (teacher → student → teacher)', () => {
  test.describe.configure({ timeout: 10 * 60_000 });

  test.describe('teacher publishes manual MCQ', () => {
    test.use({ storageState: AUTH.teacher });

    test('creates and publishes assessment without AI', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.teacher), 'Run mint-e2e-teacher-auth.ts first');

      const classId = await openPrimaryClass(page);
      test.skip(!classId, 'Could not open primary class');

      await page.getByRole('button', { name: /^assessments$/i }).click();
      await page.getByRole('button', { name: /create assessment|create first assessment/i }).first().click();

      await expect(page).toHaveURL(new RegExp(`/dashboard/teacher/assessments/new.*classId=${classId}`));
      await expect(page.getByRole('heading', { name: /create new assessment/i })).toBeVisible();

      const title = `E2E Quiz ${Date.now()}`;
      const correctOption = 'Sunlight';

      await page.getByPlaceholder('e.g. Chemistry Quiz').fill(title);
      await pickDueDate(page);
      await fillMcqQuestion(
        page,
        'What is the main source of heat and light for Earth?',
        ['Sunlight', 'Moonlight', 'Wind', 'Rain'],
        0,
      );

      const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /select subject/i }) });
      if (await subjectSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const count = await subjectSelect.locator('option:not([value=""])').count();
        test.skip(count === 0, 'No subjects — run assign-e2e-teachers-to-subjects.ts');
        await subjectSelect.selectOption({ index: 1 });
      }

      const termSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /select term|term/i }) }).last();
      if (!(await termSelect.inputValue())) {
        const count = await termSelect.locator('option:not([value=""])').count();
        test.skip(count === 0, 'No term — run start-e2e-sessions.ts');
        await termSelect.selectOption({ index: 1 });
      }

      const createResponse = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          /\/classes\/[^/]+\/assessments/.test(r.url()) &&
          r.status() >= 200 &&
          r.status() < 300,
      );

      await page.getByRole('button', { name: /publish now/i }).click();
      await expect(page.getByRole('heading', { name: /publish assessment/i })).toBeVisible();
      await page.getByRole('button', { name: /^continue$/i }).click();

      const res = await createResponse;
      const body = await res.json();
      const assessmentId = body?.data?.id as string;
      expect(assessmentId).toBeTruthy();

      await expect(page).toHaveURL(new RegExp(`/dashboard/teacher/classes/${classId}`), { timeout: 30_000 });

      writeFixture({
        title,
        assessmentId,
        classId,
        correctOption,
        createdAt: new Date().toISOString(),
      });

      await page.goto(`/dashboard/teacher/assessments/${assessmentId}`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/published/i).first()).toBeVisible();
    });
  });

  test.describe('student submits published assessment', () => {
    test.use({ storageState: AUTH.student });

    test('completes MCQ and submits', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.student), 'Run mint-e2e-student-auth.ts first');

      const fixture = readFixture();
      test.skip(!fixture?.assessmentId, 'Teacher publish step did not run');

      await page.goto(`/dashboard/student/assessments/${fixture.assessmentId}`);
      await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible({ timeout: 30_000 });

      const startResponse = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().includes('/start') &&
          r.status() >= 200 &&
          r.status() < 300,
      );

      await page.getByRole('button', { name: /launch assessment/i }).click();
      await startResponse;
      await page.waitForLoadState('networkidle');

      const optionButton = page.getByRole('button', { name: new RegExp(fixture.correctOption, 'i') });
      await expect(optionButton).toBeVisible({ timeout: 20_000 });
      await optionButton.click();

      const submitResponse = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().includes('/submit') &&
          r.status() >= 200 &&
          r.status() < 300,
      );

      await page.getByRole('button', { name: /submit assessment/i }).click();
      const submitRes = await submitResponse;
      expect(submitRes.ok()).toBeTruthy();
    });
  });

  test.describe('teacher reviews submission', () => {
    test.use({ storageState: AUTH.teacher });

    test('sees student submission on assessment detail', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.teacher), 'Run mint-e2e-teacher-auth.ts first');

      const fixture = readFixture();
      test.skip(!fixture?.assessmentId, 'Teacher publish step did not run');

      await page.goto(`/dashboard/teacher/assessments/${fixture.assessmentId}`);
      await expect(page.getByRole('heading', { name: fixture.title })).toBeVisible({ timeout: 30_000 });

      await expect(page.getByText(/total submissions:\s*1/i)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/amaka|primary/i).first()).toBeVisible({ timeout: 15_000 });
    });
  });
});
