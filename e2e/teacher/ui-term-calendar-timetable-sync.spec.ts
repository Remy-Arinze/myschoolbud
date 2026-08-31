import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getAuthFromStorage, API } from '../helpers/teacher-class';

const AUTH = path.resolve(__dirname, '../.auth/teacher-primary.json');

interface ActiveSessionResponse {
  data?: {
    term?: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: string;
      daysRemaining?: number;
      isPastEndDate?: boolean;
      isOperationallyActive?: boolean;
    };
  };
}

function localDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

test.describe('QA: term ↔ calendar ↔ timetable sync', () => {
  test.describe.configure({ timeout: 5 * 60_000 });
  test.use({ storageState: AUTH });

  test('teacher schedule respects active term date range', async ({ page, request }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing teacher-primary.json — run mint-e2e-teacher-auth.ts');

    const { token, schoolId } = getAuthFromStorage(AUTH);

    const res = await request.get(
      `${API}/schools/${schoolId}/sessions/active?schoolType=PRIMARY`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as ActiveSessionResponse;
    const term = body.data?.term;
    expect(term, 'E2E school should have an active term').toBeTruthy();

    const daysRemaining = term!.daysRemaining ?? localDaysRemaining(term!.endDate);
    const isPastEnd = term!.isPastEndDate ?? daysRemaining < 0;
    const isOperational =
      term!.isOperationallyActive ?? (term!.status === 'ACTIVE' && !isPastEnd && daysRemaining >= 0);

    await page.goto('/dashboard/teacher/overview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({
      timeout: 30_000,
    });

    if (isPastEnd && term!.status === 'ACTIVE') {
      // Overdue ACTIVE term — must not show live "Coming Up" lessons
      await expect(page.getByText(/has ended — no classes are scheduled/i)).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByText(/^Coming Up$/i)).toHaveCount(0);
      await expect(page.getByText(/overdue by \d+ day/i)).toBeVisible();

      await expect(page.getByText(/^0 lessons$/)).toBeVisible({ timeout: 10_000 });

      await page.goto('/dashboard/teacher/timetables', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/live timetable is hidden/i)).toBeVisible({ timeout: 15_000 });
    } else if (isOperational) {
      // In-session term — schedule sections should load without end-of-term banner
      await expect(page.getByText(/has ended — no classes are scheduled/i)).toHaveCount(0);
      await expect(page.getByText(/Today'?s Schedule/i)).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: `Term state: status=${term!.status}, daysRemaining=${daysRemaining} — skipped strict overdue/in-session UI branch`,
      });
    }
  });

  test('teacher calendar loads when term is past end date', async ({ page, request }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing teacher-primary.json');

    const { token, schoolId } = getAuthFromStorage(AUTH);
    const res = await request.get(
      `${API}/schools/${schoolId}/sessions/active?schoolType=PRIMARY`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await res.json()) as ActiveSessionResponse;
    const term = body.data?.term;
    test.skip(!term, 'No active term');

    const isPastEnd = term.isPastEndDate ?? localDaysRemaining(term.endDate) < 0;
    test.skip(!isPastEnd || term.status !== 'ACTIVE', 'Term is in session — calendar overdue check N/A');

    await page.goto('/dashboard/teacher/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /^calendar$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.rbc-calendar').first()).toBeVisible({ timeout: 20_000 });
  });
});
