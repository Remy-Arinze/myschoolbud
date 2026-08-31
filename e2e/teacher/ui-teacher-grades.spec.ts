import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  TEACHER_AUTH,
  ASSESSMENT_FIXTURE,
  GRADES_FIXTURE,
  API,
  openPrimaryClass,
  goToClassTab,
  dismissLoisIfOpen,
  getAuthFromStorage,
} from '../helpers/teacher-class';

/**
 * E2E: Class hub → Grades tab (bulk entry, publish, delete, filters, assessment sync).
 */

type GradesFixture = {
  assessmentName: string;
  gradeType: string;
  sequence: number;
  classId: string;
  createdAt: string;
};

function writeGradesFixture(data: GradesFixture) {
  fs.writeFileSync(GRADES_FIXTURE, JSON.stringify(data, null, 2));
}

async function expandStudentGrades(page: import('@playwright/test').Page, assessmentName: string) {
  const studentCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /amaka|tunde|primary/i }).first();
  await expect(studentCard).toBeVisible({ timeout: 15_000 });
  if (!(await page.getByText(assessmentName).first().isVisible().catch(() => false))) {
    await studentCard.click();
  }
  await expect(page.getByText(assessmentName).first()).toBeVisible({ timeout: 15_000 });
}

test.describe.serial('E2E: class grades tab', () => {
  test.describe.configure({ timeout: 12 * 60_000 });
  test.use({ storageState: TEACHER_AUTH });

  const assessmentName = `E2E Bulk CA ${Date.now()}`;
  let classId = '';
  let sequence = 1;

  test('bulk grade entry saves draft CA scores', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');

    classId = await openPrimaryClass(page);
    test.skip(!classId, 'Could not open primary class');

    await goToClassTab(page, 'Grades');
    await expect(page.getByRole('heading', { name: /^grades$/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    await dismissLoisIfOpen(page);

    await page.getByRole('button', { name: /bulk entry|enter grades/i }).first().click();
    const bulkDialog = page.getByRole('dialog', { name: /bulk grade entry/i });
    await expect(bulkDialog).toBeVisible({ timeout: 10_000 });
    await dismissLoisIfOpen(page);

    const subjectCombo = bulkDialog.getByRole('combobox', { name: /^subject/i });
    await subjectCombo.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await bulkDialog.getByPlaceholder(/ca1|assignment 1|first term exam/i).fill(assessmentName);

    const sequenceInput = bulkDialog.locator('input[type="number"]').nth(1);
    if (await sequenceInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const seqVal = await sequenceInput.inputValue();
      if (seqVal) sequence = parseInt(seqVal, 10) || 1;
    }

    const scoreInputs = bulkDialog.locator('table tbody input[type="number"]');
    const count = await scoreInputs.count();
    test.skip(count === 0, 'No students in bulk grade table');

    for (let i = 0; i < Math.min(count, 1); i++) {
      await scoreInputs.nth(i).fill(String(70 + i * 5));
    }

    const saveBtn = bulkDialog.getByRole('button', { name: /save \d+ grade/i });
    await expect(saveBtn).toBeEnabled();

    const [bulkResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          r.url().includes('/grades/classes/') &&
          r.url().includes('/bulk'),
      ),
      saveBtn.click(),
    ]);
    expect(bulkResponse.ok(), `Bulk grades failed: ${await bulkResponse.text()}`).toBeTruthy();

    await expect(bulkDialog).toHaveCount(0, { timeout: 15_000 });

    writeGradesFixture({
      assessmentName,
      gradeType: 'CA',
      sequence,
      classId,
      createdAt: new Date().toISOString(),
    });
  });

  test('publish draft grade and filter by type / sequence', async ({ page }) => {
    test.skip(!fs.existsSync(GRADES_FIXTURE), 'Bulk entry step did not run');

    const fixture = JSON.parse(fs.readFileSync(GRADES_FIXTURE, 'utf8')) as GradesFixture;
    classId = fixture.classId;

    await page.goto(`/dashboard/teacher/classes/${classId}?tab=grades`);
    await goToClassTab(page, 'Grades');
    await dismissLoisIfOpen(page);

    await expandStudentGrades(page, fixture.assessmentName);
    await expect(page.getByText(/^draft$/i).first()).toBeVisible({ timeout: 10_000 });

    const [publishResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          r.url().includes('/grades/') &&
          r.status() >= 200 &&
          r.status() < 300,
      ),
      page.getByRole('button', { name: /^publish$/i }).first().click(),
    ]);

    expect(publishResponse.ok()).toBeTruthy();
    await expect(page.getByText(/^published$/i).first()).toBeVisible({ timeout: 10_000 });

    const typeFilter = page.locator('select').filter({ has: page.locator('option', { hasText: 'CA' }) }).first();
    await typeFilter.selectOption('CA');
    await expandStudentGrades(page, fixture.assessmentName);

    await typeFilter.selectOption('EXAM');
    await expect(page.getByText(fixture.assessmentName)).toHaveCount(0, { timeout: 5_000 });

    await typeFilter.selectOption('CA');
    await expandStudentGrades(page, fixture.assessmentName);

    const seqFilter = page.locator('select').filter({ has: page.locator('option', { hasText: 'All Seq' }) });
    if (await seqFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await seqFilter.selectOption(String(fixture.sequence));
      await expandStudentGrades(page, fixture.assessmentName);
    }
  });

  test('delete grade via confirm modal', async ({ page }) => {
    test.skip(!fs.existsSync(GRADES_FIXTURE), 'Bulk entry step did not run');

    const fixture = JSON.parse(fs.readFileSync(GRADES_FIXTURE, 'utf8')) as GradesFixture;

    await page.goto(`/dashboard/teacher/classes/${fixture.classId}?tab=grades`);
    await goToClassTab(page, 'Grades');
    await dismissLoisIfOpen(page);

    await expandStudentGrades(page, fixture.assessmentName);

    await page.getByRole('button', { name: /delete grade/i }).first().click();

    await expect(page.getByRole('heading', { name: /delete grade/i })).toBeVisible();

    const [deleteResponse] = await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === 'DELETE' && r.url().includes('/grades/'),
      ),
      page.getByRole('button', { name: /^delete$/i }).click(),
    ]);
    expect(deleteResponse.ok(), `Delete failed: ${await deleteResponse.text()}`).toBeTruthy();

    await page.reload();
    await goToClassTab(page, 'Grades');
    await dismissLoisIfOpen(page);

    const studentCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /amaka|tunde|primary/i }).first();
    await studentCard.click();
    await expect(
      page.getByRole('heading', { name: 'Assessment Details' }).locator('..').getByText(fixture.assessmentName),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test('assessment publish grade appears on grades tab', async ({ page }) => {
    test.skip(!fs.existsSync(TEACHER_AUTH), 'Run mint-e2e-teacher-auth.ts first');
    test.skip(!fs.existsSync(ASSESSMENT_FIXTURE), 'Run ui-teacher-assessments.spec.ts first');

    const teacher = getAuthFromStorage(TEACHER_AUTH);
    const base = JSON.parse(fs.readFileSync(ASSESSMENT_FIXTURE, 'utf8'));

    const detailRes = await fetch(`${API}/schools/${teacher.schoolId}/assessments/${base.assessmentId}`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    });
    const detail = await detailRes.json();
    const submission = detail?.data?.submissions?.[0];
    test.skip(!submission?.id, 'No student submission on fixture assessment — run full assessment lifecycle first');

    const gradeRes = await fetch(
      `${API}/schools/${teacher.schoolId}/assessments/submissions/${submission.id}/grade`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacher.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalScore: 10,
          questionScores: {},
        }),
      },
    );
    expect(gradeRes.ok).toBeTruthy();

    await page.goto(`/dashboard/teacher/classes/${base.classId}?tab=grades`);
    await goToClassTab(page, 'Grades');
    await dismissLoisIfOpen(page);

    await expandStudentGrades(page, base.title);
    await expect(page.getByText(/^published$/i).first()).toBeVisible();
  });
});
