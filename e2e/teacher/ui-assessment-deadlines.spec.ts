import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * UI checks for hardened due-date enforcement.
 * API scenarios: backend/scripts/test-assessment-deadlines.ts
 */

const AUTH = {
  teacher: path.resolve(__dirname, '../.auth/teacher-primary.json'),
  student: path.resolve(__dirname, '../.auth/student-primary1a.json'),
};

const FIXTURE = path.resolve(__dirname, '../.assessment-e2e-fixture.json');
const DEADLINE_FIXTURE = path.resolve(__dirname, '../.assessment-deadline-fixture.json');
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

test.describe.serial('Assessment deadline UI', () => {
  test.describe('teacher creates past-due assessment via API', () => {
    test('creates strict past-due published assessment', async () => {
      test.skip(!fs.existsSync(AUTH.teacher), 'Run mint-e2e-teacher-auth.ts');
      test.skip(!fs.existsSync(FIXTURE), 'Need classId fixture from teacher assessments E2E');

      const teacher = getAuth(AUTH.teacher);
      const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
      const classId = fixture.classId as string;

      const templateRes = await fetch(
        `${API}/schools/${teacher.schoolId}/assessments/${fixture.assessmentId}`,
        { headers: { Authorization: `Bearer ${teacher.token}` } },
      );
      const templateBody = await templateRes.json();
      const subjectId = templateBody?.data?.subjectId as string;
      const termId = templateBody?.data?.termId as string;
      test.skip(!subjectId || !termId, 'Need subject and term from existing assessment fixture');

      const title = `E2E Closed Window ${Date.now()}`;
      const createRes = await fetch(
        `${API}/schools/${teacher.schoolId}/classes/${classId}/assessments`,
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
            maxScore: 1,
            status: 'PUBLISHED',
            allowLateSubmissionAfterDue: false,
            questions: [
              {
                text: 'UI deadline test',
                type: 'MULTIPLE_CHOICE',
                options: ['Yes', 'No'],
                correctAnswer: 'Yes',
                points: 1,
                order: 0,
              },
            ],
          }),
        },
      );
      expect(createRes.ok).toBeTruthy();
      const assessmentId = (await createRes.json())?.data?.id as string;
      fs.writeFileSync(DEADLINE_FIXTURE, JSON.stringify({ title, assessmentId }, null, 2));
    });
  });

  test.describe('student blocked from starting', () => {
    test.use({ storageState: AUTH.student });

    test('sees submission window closed', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.student), 'Run mint-e2e-student-auth.ts');
      test.skip(!fs.existsSync(DEADLINE_FIXTURE), 'Teacher API setup did not run');

      const { title, assessmentId } = JSON.parse(fs.readFileSync(DEADLINE_FIXTURE, 'utf8'));

      await page.goto(`/dashboard/student/assessments/${assessmentId}`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('heading', { name: /submission window closed/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /launch assessment/i })).toHaveCount(0);
    });
  });
});
