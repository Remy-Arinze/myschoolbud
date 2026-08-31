import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: Teacher dashboard (Primary + Secondary)
 * Uses minted storageState from backend/scripts/mint-e2e-teacher-auth.ts
 */

type Finding = { severity: string; area: string; note: string; teacher?: string };
const findings: Finding[] = [];
function note(severity: string, area: string, message: string, teacher?: string) {
  findings.push({ severity, area, note: message, teacher });
  console.log(`[QA:${severity}]${teacher ? ` [${teacher}]` : ''} ${area} — ${message}`);
}

const AUTH = {
  primary: path.resolve(__dirname, '../.auth/teacher-primary.json'),
  secondary: path.resolve(__dirname, '../.auth/teacher-secondary.json'),
};

async function expectTeacherShell(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/teacher/, { timeout: 30_000 });
  await expect(page.locator('a[href="/dashboard/teacher/overview"]')).toBeVisible({
    timeout: 30_000,
  });
}

async function smokeNav(page: Page, teacher: 'primary' | 'secondary') {
  const nav = [
    { href: '/dashboard/teacher/overview', label: 'Overview' },
    { href: '/dashboard/teacher/timetables', label: 'Timetables' },
    { href: '/dashboard/teacher/classes', label: 'Classes' },
    { href: '/dashboard/teacher/calendar', label: 'Calendar' },
  ];

  for (const item of nav) {
    const link = page.locator(`a[href="${item.href}"]`).first();
    if (!(await link.isVisible({ timeout: 8_000 }).catch(() => false))) {
      note('major', 'Nav', `Missing sidebar link ${item.label} (${item.href})`, teacher);
      continue;
    }
    await link.click();
    await expect(page).toHaveURL(new RegExp(item.href.replace(/\//g, '\\/')), { timeout: 20_000 });
    note('pass', 'Nav', `Reached ${item.href}`, teacher);
  }
}

test.describe('QA: teacher dashboard — Primary (Ada)', () => {
  test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 });
  const teacher = 'primary' as const;

  test.use({ storageState: AUTH.primary });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const existingPath = path.join(outDir, '2026-07-23-teacher-dashboard-findings.json');
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch {
      existing = {};
    }
    fs.writeFileSync(
      existingPath,
      JSON.stringify(
        {
          ...existing,
          generatedAt: new Date().toISOString(),
          primary: findings.filter((f) => f.teacher === 'primary' || !f.teacher),
        },
        null,
        2,
      ),
    );
  });

  test('overview loads with teacher identity and schedule sections', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH.primary), 'Missing teacher-primary.json — run mint-e2e-teacher-auth.ts');

    await page.goto('/dashboard/teacher/overview');
    await expectTeacherShell(page);

    await expect(page.getByText(/ada|primary/i).first()).toBeVisible({ timeout: 20_000 });
    note('pass', 'Overview', 'Primary teacher identity visible', teacher);

    // Schedule / classes blocks (labels vary)
    const hasSchedule =
      (await page.getByText(/today|this week|schedule|upcoming/i).first().isVisible({ timeout: 10_000 }).catch(() => false)) ||
      (await page.getByText(/my (primary )?class/i).first().isVisible({ timeout: 5_000 }).catch(() => false));
    if (hasSchedule) {
      note('pass', 'Overview', 'Schedule or form/primary class section present', teacher);
    } else {
      note('minor', 'Overview', 'No obvious today/week schedule copy — may be empty timetable day', teacher);
    }

    // Primary shortcut label
    const myClass = page.getByRole('link', { name: /my class/i }).or(page.getByText(/^my class$/i));
    if (await myClass.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      note('pass', 'Form shortcut', 'Primary shows My Class shortcut', teacher);
    } else {
      note('info', 'Form shortcut', 'My Class shortcut not in sidebar (may only appear when form teacher)', teacher);
    }
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard/teacher/overview');
    await expectTeacherShell(page);
    await smokeNav(page, teacher);
  });

  test('classes list → open class → students / grades / roll-call tabs', async ({ page }) => {
    await page.goto('/dashboard/teacher/classes');
    await expect(page.getByRole('heading', { name: /my classes|classes/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const empty = page.getByText(/no classes found/i);
    if (await empty.isVisible({ timeout: 8_000 }).catch(() => false)) {
      note('blocker', 'Classes', 'Primary teacher has zero assigned classes', teacher);
      return;
    }

    // Prefer My Class deep-link; fallback to class card heading click
    const myClass = page.locator('a[href^="/dashboard/teacher/classes/"]').first();
    if (await myClass.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await myClass.click();
    } else {
      await page.getByRole('heading', { name: /primary|jss|ss /i }).first().click();
    }
    await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 20_000 });
    note('pass', 'Classes', 'Opened class detail', teacher);

    for (const tab of [
      { name: 'Students', expect: /students|no students|roster|amaka|tunde/i },
      { name: 'Grades', expect: /grades|enter grades|no grades|assessment|score/i },
      { name: 'Roll Call', expect: /roll call|attendance|present|absent|mark|student/i },
    ]) {
      const tabBtn = page.getByRole('button', { name: tab.name, exact: true });
      await expect(tabBtn).toBeVisible({ timeout: 10_000 });
      await tabBtn.click();
      await expect(page.getByText(tab.expect).first()).toBeVisible({ timeout: 15_000 });
      note('pass', 'Class tab', `Tab OK: ${tab.name}`, teacher);
    }

    await page.getByRole('button', { name: 'Students', exact: true }).click();
    const studentRow = page.getByText(/amaka|tunde|primary/i).first();
    if (await studentRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      note('pass', 'Student roster', 'Students visible on class roster', teacher);
    } else {
      note('info', 'Student roster', 'Roster tab open but names not matched', teacher);
    }
  });

  test('timetable and calendar pages load', async ({ page }) => {
    await page.goto('/dashboard/teacher/timetables');
    await expect(page.getByRole('heading', { name: /timetable/i }).first()).toBeVisible({ timeout: 30_000 });
    note('pass', 'Timetable', 'Teacher timetable page loads', teacher);

    await page.goto('/dashboard/teacher/calendar');
    // Regression: missing Loader2 import crashed this page with error boundary
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0, { timeout: 5_000 });
    await expect(page).toHaveURL(/\/dashboard\/teacher\/calendar/, { timeout: 15_000 });
    const calendarOk =
      (await page.getByText(/loading calendar|today|month|week|agenda|google calendar/i).first().isVisible({
        timeout: 20_000,
      }).catch(() => false)) ||
      (await page.locator('.rbc-calendar, [class*="rbc-"]').first().isVisible({ timeout: 10_000 }).catch(() => false));
    if (calendarOk) {
      note('pass', 'Calendar', 'Teacher calendar page loads without error boundary', teacher);
    } else {
      note('major', 'Calendar', 'Calendar URL ok but no recognizable calendar UI', teacher);
    }
  });
});

test.describe('QA: teacher dashboard — Secondary (Chidi)', () => {
  test.describe.configure({ mode: 'serial', timeout: 10 * 60_000 });
  const teacher = 'secondary' as const;

  test.use({ storageState: AUTH.secondary });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const existingPath = path.join(outDir, '2026-07-23-teacher-dashboard-findings.json');
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch {
      existing = {};
    }
    const primaryFindings = (existing.primary as Finding[]) || [];
    fs.writeFileSync(
      existingPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          primary: primaryFindings,
          secondary: findings.filter((f) => f.teacher === 'secondary'),
        },
        null,
        2,
      ),
    );
  });

  test('overview + form shortcut labeling', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH.secondary), 'Missing teacher-secondary.json — run mint-e2e-teacher-auth.ts');

    await page.goto('/dashboard/teacher/overview');
    await expectTeacherShell(page);
    await expect(page.getByText(/chidi|secondary/i).first()).toBeVisible({ timeout: 20_000 });
    note('pass', 'Overview', 'Secondary teacher identity visible', teacher);

    const myForm = page.getByRole('link', { name: /my form/i });
    if (await myForm.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      note('pass', 'Form shortcut', 'Secondary shows My Form shortcut', teacher);
    } else {
      note(
        'info',
        'Form shortcut',
        'My Form not shown — Chidi may be subject-only without form assignment',
        teacher,
      );
    }
  });

  test('sidebar + classes hub tabs', async ({ page }) => {
    await page.goto('/dashboard/teacher/overview');
    await expectTeacherShell(page);
    await smokeNav(page, teacher);

    await page.goto('/dashboard/teacher/classes');
    await expect(page.getByRole('heading', { name: /my classes|classes/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    if (await page.getByText(/no classes found/i).isVisible({ timeout: 8_000 }).catch(() => false)) {
      note(
        'major',
        'Classes',
        'Secondary teacher has no classes — check timetable/subject assignment scripts',
        teacher,
      );
      return;
    }

    await page.getByRole('heading', { level: 3 }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 20_000 });
    note('pass', 'Classes', 'Opened secondary class detail', teacher);

    await expect(page.getByRole('button', { name: 'Students', exact: true })).toBeVisible({
      timeout: 20_000,
    });

    for (const name of ['Overview', 'Timetable', 'Students', 'Grades', 'Assessments', 'Roll Call']) {
      const tab = page.getByRole('button', { name, exact: true });
      if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await tab.click();
        note('pass', 'Class tab', `Secondary tab available: ${name}`, teacher);
      } else {
        note('minor', 'Class tab', `Tab not found: ${name}`, teacher);
      }
    }
  });
});
