import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * E2E UI: teacher grading screen shows late badges + deduction controls.
 * Prerequisite: base assessment fixture from ui-teacher-assessments.spec.ts
 */

const AUTH = {
  teacher: path.resolve(__dirname, '../.auth/teacher-primary.json'),
  student: path.resolve(__dirname, '../.auth/student-primary1a.json'),
};

const BASE_FIXTURE = path.resolve(__dirname, '../.assessment-e2e-fixture.json');
const LATE_FIXTURE = path.resolve(__dirname, '../.assessment-late-grading-fixture.json');
const API = process.env.API_URL || 'http://localhost:4000';

function getAuth(fileName: string) {
  const raw = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  const persist = JSON.parse(
    raw.origins[0].localStorage.find((x: { name: string }) => x.name === 'persist:auth').value,
  );
  return {
    token: JSON.parse(persist.token) as string,
    schoolId: JSON.parse(persist.tenantId) as string,
  };
}

function yesterdayIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

test.describe.serial('E2E: late penalty grading', () => {
  test.describe.configure({ timeout: 10 * 60_000 });

  test('API setup: late submission with suggested deduction', async () => {
    test.skip(!fs.existsSync(AUTH.teacher), 'Run mint-e2e-teacher-auth.ts');
    test.skip(!fs.existsSync(AUTH.student), 'Run mint-e2e-student-auth.ts');
    test.skip(!fs.existsSync(BASE_FIXTURE), 'Need base assessment fixture');

    const teacher = getAuth(AUTH.teacher);
    const student = getAuth(AUTH.student);
    const base = JSON.parse(fs.readFileSync(BASE_FIXTURE, 'utf8'));

    const templateRes = await fetch(
      `${API}/schools/${teacher.schoolId}/assessments/${base.assessmentId}`,
      { headers: { Authorization: `Bearer ${teacher.token}` } },
    );
    const template = await templateRes.json();
    const subjectId = template?.data?.subjectId;
    const termId = template?.data?.termId;
    test.skip(!subjectId || !termId, 'Need subject/term from template');

    const title = `E2E Late UI ${Date.now()}`;
    const createRes = await fetch(
      `${API}/schools/${teacher.schoolId}/classes/${base.classId}/assessments`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${teacher.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          type: 'QUIZ',
          subjectId,
          termId,
          dueDate: yesterdayIso(),
          maxScore: 10,
          status: 'PUBLISHED',
          allowLateSubmissionAfterDue: true,
          lateDuePenaltyPoints: 5,
          questions: [
            {
              text: 'What is 2+2?',
              type: 'MULTIPLE_CHOICE',
              options: ['4', '5'],
              correctAnswer: '4',
              points: 10,
              order: 0,
            },
          ],
        }),
      },
    );
    expect(createRes.ok).toBeTruthy();
    const assessmentId = (await createRes.json())?.data?.id as string;

    const detailRes = await fetch(
      `${API}/schools/${teacher.schoolId}/assessments/${assessmentId}`,
      { headers: { Authorization: `Bearer ${teacher.token}` } },
    );
    const questionId = (await detailRes.json())?.data?.questions?.[0]?.id as string;

    const startRes = await fetch(
      `${API}/schools/${student.schoolId}/assessments/${assessmentId}/start`,
      { method: 'POST', headers: { Authorization: `Bearer ${student.token}` } },
    );
    expect(startRes.ok).toBeTruthy();
    const sessionToken = (await startRes.json())?.data?.examSessionToken as string;

    const submitRes = await fetch(
      `${API}/schools/${student.schoolId}/assessments/${assessmentId}/submit`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${student.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examSessionToken: sessionToken,
          answers: [{ questionId, selectedOption: '4' }],
        }),
      },
    );
    expect(submitRes.ok).toBeTruthy();
    const submission = (await submitRes.json())?.data;
    expect(submission.isLateDue).toBe(true);
    expect(Number(submission.lateDueDeduction)).toBe(5);

    fs.writeFileSync(
      LATE_FIXTURE,
      JSON.stringify(
        {
          title,
          assessmentId,
          submissionId: submission.id,
          studentId: submission.studentId,
          expectedRaw: 10,
          expectedPenalty: 5,
          expectedFinalWithPenalty: 5,
        },
        null,
        2,
      ),
    );
  });

  test.describe('teacher grading UI', () => {
    test.use({
      storageState: AUTH.teacher,
      viewport: { width: 390, height: 844 },
    });

    test('shows late badges, deduction controls, and publishes adjusted score', async ({ page }) => {
      test.skip(!fs.existsSync(LATE_FIXTURE), 'API setup step did not run');
      const fx = JSON.parse(fs.readFileSync(LATE_FIXTURE, 'utf8'));

      await page.goto(
        `/dashboard/teacher/assessments/${fx.assessmentId}/grade/${fx.studentId}`,
      );
      await expect(page.getByRole('heading', { name: /grading:/i })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(fx.title)).toBeVisible();
      await expect(page.getByText(/late due/i).first()).toBeVisible();
      await expect(page.getByText(/question total/i).first()).toBeVisible();

      const deductCheckbox = page.getByLabel(/deduct points for late due-date submission/i).first();
      await expect(deductCheckbox).toBeChecked();

      await deductCheckbox.uncheck();
      await deductCheckbox.check();

      const publishBtn = page.getByRole('button', { name: /^publish$/i }).first();
      await publishBtn.scrollIntoViewIfNeeded();

      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            r.url().includes('/assessments/submissions/') &&
            r.url().includes('/grade') &&
            r.status() >= 200 &&
            r.status() < 300,
          { timeout: 60_000 },
        ),
        publishBtn.click(),
      ]);

      const teacher = getAuth(AUTH.teacher);
      const verifyRes = await fetch(
        `${API}/schools/${teacher.schoolId}/assessments/submissions/${fx.submissionId}`,
        { headers: { Authorization: `Bearer ${teacher.token}` } },
      );
      const verified = await verifyRes.json();
      expect(Number(verified?.data?.totalScore)).toBe(fx.expectedFinalWithPenalty);
      expect(Number(verified?.data?.lateDueDeduction)).toBe(fx.expectedPenalty);
      expect(verified?.data?.status).toBe('GRADED');
    });
  });
});
