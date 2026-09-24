import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { askLois, openLois } from '../helpers/lois-chat';

/**
 * Beulah teacher-dashboard QA.
 * Personas minted by backend/scripts/mint-beulah-teacher-auth.ts:
 * - Adaeze Okeke: Primary 1 A form teacher, full multi-subject timetable
 * - Femi Adebayo: Primary 2 A form teacher, no timetable periods
 * - Abubakar Adebayo: Secondary English across JSS arms, Monday 09:00 double-booked
 */

type Severity = 'pass' | 'info' | 'minor' | 'major' | 'blocker';
type Finding = { severity: Severity; area: string; note: string; teacher?: string };

const findingsFile = path.resolve(__dirname, '../../../qa-reports/_teacher-qa-findings.jsonl');

function note(severity: Severity, area: string, message: string, teacher?: string) {
  const finding: Finding = { severity, area, note: message, teacher };
  fs.mkdirSync(path.dirname(findingsFile), { recursive: true });
  fs.appendFileSync(findingsFile, `${JSON.stringify(finding)}\n`);
  console.log(`[QA:${severity}]${teacher ? ` [${teacher}]` : ''} ${area} — ${message}`);
}

function excerpt(text: string, n = 240) {
  return text.replace(/\s+/g, ' ').trim().slice(0, n);
}

const AUTH = {
  adaeze: path.resolve(__dirname, '../.auth/beulah-teacher-adaeze.json'),
  femi: path.resolve(__dirname, '../.auth/beulah-teacher-femi.json'),
  abubakar: path.resolve(__dirname, '../.auth/beulah-teacher-abubakar.json'),
};

function watchPage(page: Page, teacher: string) {
  page.on('pageerror', (err) => {
    const message = `${teacher}: ${err.message}`.slice(0, 400);
    note('major', 'Page error', message, teacher);
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    const url = res.url();
    if (!/localhost|127\.0\.0\.1/.test(url)) return;
    note('info', 'HTTP', `${res.status()} ${url.replace(/\?.*$/, '')}`, teacher);
  });
}

async function waitForMain(page: Page, teacher: string, area: string) {
  const started = Date.now();
  let body = '';
  await expect
    .poll(
      async () => {
        const spinning = await page.locator('.animate-spin').count();
        body = ((await page.locator('main').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
        if (spinning > 0) return '';
        if (/^loading\b/i.test(body) || body.length < 12) return '';
        return body;
      },
      { timeout: 90_000, intervals: [500, 1000, 2000] },
    )
    .not.toBe('')
    .catch(() => undefined);
  const elapsed = Date.now() - started;
  if (!body || /^loading\b/i.test(body) || body.length < 12) {
    note('blocker', area, `Main content still empty after ${Math.round(elapsed / 1000)}s`, teacher);
    return '';
  }
  note('info', area, `Loaded in ${Math.round(elapsed / 1000)}s — ${excerpt(body, 360)}`, teacher);
  return body;
}

async function shellReady(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\/teacher/, { timeout: 45_000 });
  await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
  await expect(page.locator('a[href="/dashboard/teacher/overview"]')).toBeVisible({ timeout: 30_000 });
}

async function gotoTeacher(page: Page, href: string) {
  await page.goto(href, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
}

async function clickNav(page: Page, href: string, teacher: string, label: string) {
  const link = page.locator(`a[href="${href}"]`).first();
  if (!(await link.isVisible({ timeout: 8_000 }).catch(() => false))) {
    note('major', 'Nav', `Missing sidebar link ${label} (${href})`, teacher);
    return false;
  }
  await link.click();
  const escaped = href.replace(/\//g, '\\/');
  const moved = await page
    .waitForURL(new RegExp(escaped), { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!moved) {
    note('minor', 'Nav', `Sidebar click on ${label} stayed on ${page.url()}. Opening the route directly.`, teacher);
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(new RegExp(escaped), { timeout: 20_000 });
  }
  note('pass', 'Nav', `Reached ${label}`, teacher);
  await waitForMain(page, teacher, label);
  return true;
}

async function pickDueDate(page: Page, teacher: string) {
  const trigger = page.getByRole('button', { name: /select date/i }).first();
  if (!(await trigger.isVisible({ timeout: 8_000 }).catch(() => false))) {
    note('major', 'Assessment editor', 'Due date control not found', teacher);
    return false;
  }
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /choose date/i });
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  const day = dialog.locator('button.rdp-day:not(.rdp-day_disabled):not(.rdp-day_outside)').last();
  if (await day.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await day.click();
    note('pass', 'Assessment editor', 'Due date set to a later day this month', teacher);
    return true;
  }
  note('major', 'Assessment editor', 'Could not pick an enabled due date in the calendar', teacher);
  return false;
}

async function curateAndPublish(
  page: Page,
  teacher: string,
  opts: { prompt: string; className: string; subjectName: string },
) {
  await gotoTeacher(page, '/dashboard/teacher/overview');
  await shellReady(page);
  const ready = await waitForMain(page, teacher, 'Lois');
  if (!ready) return;

  const loisButton = page.getByRole('button', { name: /ask lois|lois briefing/i }).first();
  if (!(await loisButton.isVisible({ timeout: 20_000 }).catch(() => false))) {
    const composer = page.getByPlaceholder(/ask lois anything|ask a follow-up/i);
    if (!(await composer.isVisible().catch(() => false))) {
      note('blocker', 'Lois', 'Ask Lois is not available on the teacher overview', teacher);
      return;
    }
  }

  await openLois(page);
  note('pass', 'Lois', 'Chat opened from teacher overview', teacher);

  const reply = await askLois(page, opts.prompt, 180_000);
  note('info', 'Lois reply', excerpt(reply), teacher);

  const edit = page.getByRole('button', { name: /edit in full screen/i }).first();
  if (!(await edit.isVisible({ timeout: 20_000 }).catch(() => false))) {
    note('major', 'Lois assessment', 'Curation reply did not produce an Edit in Full Screen card', teacher);
    return;
  }
  const cardText = await page.locator('.lois-panel').last().innerText();
  const questions = cardText.match(/(\d+)\s+questions total/i)?.[1] ?? '?';
  note('pass', 'Lois assessment', `Editor card ready with ${questions} questions`, teacher);

  await expect(page.getByText(/compiling|rendering/i)).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
  await edit.click();
  const opened = await page
    .waitForURL(/\/dashboard\/teacher\/assessments\/new/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    note(
      'major',
      'Lois assessment',
      `Edit in Full Screen did not open the editor. Stayed on ${page.url()}`,
      teacher,
    );
    await edit.click({ force: true });
    const retried = await page
      .waitForURL(/\/dashboard\/teacher\/assessments\/new/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!retried) return;
  }
  await expect(page.getByRole('heading', { name: /review & save assessment/i })).toBeVisible({
    timeout: 30_000,
  });

  const questionCount = await page.getByRole('heading', { name: /questions \(/i }).innerText().catch(() => '');
  if (/questions \(0\)/i.test(questionCount)) {
    note('blocker', 'Assessment editor', 'Lois card opened the editor with zero questions', teacher);
    return;
  }
  note('pass', 'Assessment editor', `Opened full editor ${questionCount}`, teacher);

  const title = `QA ${teacher} ${new Date().toISOString().slice(0, 16)}`;
  const titleInput = page.getByPlaceholder(/chemistry quiz/i);
  await titleInput.fill(title);

  const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: opts.className }) }).first();
  if (await classSelect.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await classSelect.selectOption({ label: opts.className });
    note('pass', 'Assessment editor', `Class set to ${opts.className}`, teacher);
  } else {
    note('major', 'Assessment editor', `Class select missing option ${opts.className}`, teacher);
    return;
  }

  const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: opts.subjectName }) });
  const chosenSubject = page.getByText(/selected subject/i).or(page.getByText(opts.subjectName, { exact: true }));
  await expect
    .poll(async () => (await subjectSelect.count()) + (await chosenSubject.count()), { timeout: 20_000 })
    .toBeGreaterThan(0)
    .catch(() => undefined);
  if (await subjectSelect.count()) {
    await subjectSelect.first().scrollIntoViewIfNeeded();
    await subjectSelect.first().selectOption({ label: opts.subjectName });
    note('pass', 'Assessment editor', `Subject set to ${opts.subjectName}`, teacher);
  } else if (await chosenSubject.count()) {
    await chosenSubject.first().scrollIntoViewIfNeeded();
    note('pass', 'Assessment editor', `Subject already chosen for ${opts.subjectName}`, teacher);
  } else {
    note('major', 'Assessment editor', `Could not assign subject ${opts.subjectName}`, teacher);
    return;
  }

  await pickDueDate(page, teacher);

  const match = page.getByRole('button', { name: /match score/i });
  if (await match.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await match.click();
    note('info', 'Assessment editor', 'Clicked Match Score because points did not add up', teacher);
  }

  const publish = page.getByRole('button', { name: /publish now/i });
  await expect(publish).toBeVisible();
  if (await publish.isDisabled()) {
    note('major', 'Publish', 'Publish Now stayed disabled after class, subject, and due date', teacher);
    const draft = page.getByRole('button', { name: /save as draft/i });
    if (await draft.isEnabled().catch(() => false)) {
      await draft.click();
      await page.getByRole('button', { name: /^continue$/i }).click();
      note('info', 'Publish', 'Saved as draft because publish was blocked', teacher);
    }
    return;
  }

  await publish.click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  const published = page.getByText(/assessment published/i);
  const failed = page.getByText(/failed|error|must match/i);
  const landed = page.waitForURL(/\/dashboard\/teacher\/classes\//, { timeout: 25_000 }).then(() => 'class').catch(() => '');
  const toast = published.waitFor({ timeout: 25_000 }).then(() => 'toast').catch(() => '');
  const outcome = await Promise.race([landed, toast]);
  if (outcome) {
    note('pass', 'Publish', `Published "${title}" (${outcome})`, teacher);
    if (!page.url().includes('/classes/')) {
      await page.goto(page.url());
    }
    const assessments = page.getByRole('button', { name: 'Assessments', exact: true });
    if (await assessments.isVisible({ timeout: 15_000 }).catch(() => false)) {
      await assessments.click();
      const listed = page.getByText(title);
      if (await listed.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
        note('pass', 'Publish', 'Published assessment appears on the class Assessments tab', teacher);
      } else {
        note('major', 'Publish', 'Publish reported success but the title is not on the class Assessments tab', teacher);
      }
    }
  } else {
    const failText = (await failed.first().innerText().catch(() => '')) || 'no toast and no class redirect';
    note('blocker', 'Publish', `Publish did not complete: ${excerpt(failText)}`, teacher);
  }
}

function writeReport() {
  const outDir = path.resolve(__dirname, '../../../qa-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const findings: Finding[] = fs.existsSync(findingsFile)
    ? fs
        .readFileSync(findingsFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Finding)
    : [];
  const pageErrors = findings.filter((f) => f.area === 'Page error').map((f) => f.note);
  const file = path.join(outDir, '2026-09-22-beulah-teacher-dashboard-qa-report.md');
  const lines = [
    '# Beulah teacher dashboard QA — 2026-09-22',
    '',
    'Playwright pass against the running local app, signed in as Beulah High School teachers. School admin was used only to confirm how classes, staff, and the timetable are presented.',
    '',
    '## Personas',
    '',
    '| Teacher | Role in this pass | Why |',
    '| --- | --- | --- |',
    '| Adaeze Okeke | Primary form teacher | Primary 1 A, timetable covers every primary subject |',
    '| Femi Adebayo | Primary form teacher with an empty timetable | Primary 2 A has students and a class teacher, and no lesson periods |',
    '| Abubakar Adebayo | Secondary subject teacher | English on four JSS arms, including a Monday 09:00 clash between JSS 2 A and JSS 2 B |',
    '',
    'No Beulah secondary teacher has `isFormTeacher` set. Secondary arms also have no class teacher on the arm record.',
    '',
    '## Findings',
    '',
    '| Severity | Teacher | Area | Note |',
    '| --- | --- | --- | --- |',
    ...findings.map(
      (f) => `| ${f.severity} | ${f.teacher || '—'} | ${f.area} | ${f.note.replace(/\|/g, '/')} |`,
    ),
    '',
    '## Page errors',
    '',
    pageErrors.length ? pageErrors.map((e) => `- ${e}`).join('\n') : 'None captured.',
    '',
  ];
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`[QA] report ${file}`);
}

test.describe('Beulah teacher dashboard QA', () => {
  test.describe.configure({ timeout: 20 * 60_000 });

  test.afterAll(() => {
    writeReport();
  });

  test('school admin shows staff, classes, and timetable context', async ({ page }) => {
    watchPage(page, 'admin');
    await page.goto('/dashboard/school/overview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/beulah/i).first()).toBeVisible({ timeout: 60_000 });
    note('pass', 'Admin', 'School overview loads for Beulah', 'admin');

    await page.goto('/dashboard/school/staff', { waitUntil: 'domcontentloaded' });
    const primaryStaff = await waitForMain(page, 'admin', 'Admin staff');
    if (/form teacher/i.test(primaryStaff)) {
      note('pass', 'Admin staff', 'Staff surface mentions form teacher', 'admin');
    } else if (primaryStaff) {
      note('info', 'Admin staff', 'Primary staff list does not mention form teacher', 'admin');
    }

    const typeTrigger = page.getByRole('button', { name: /primary|secondary/i }).first();
    if (await page.getByText(/school type/i).first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await typeTrigger.click();
      const secondary = page.getByRole('button', { name: /^secondary$/i });
      if (await secondary.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await secondary.click();
        await page.waitForTimeout(1500);
        await waitForMain(page, 'admin', 'Admin staff secondary');
        const search = page.locator('main').getByPlaceholder(/search/i).first();
        if (await search.isVisible().catch(() => false)) {
          await search.fill('Abubakar');
          await page.waitForTimeout(1200);
          const filtered = excerpt(await page.locator('main').innerText(), 400);
          note(
            /abubakar/i.test(filtered) ? 'pass' : 'major',
            'Admin staff',
            /abubakar/i.test(filtered)
              ? 'Secondary staff search finds Abubakar Adebayo'
              : `Secondary search for Abubakar did not show him. ${filtered}`,
            'admin',
          );
        }
      } else {
        note('info', 'Admin staff', 'School type control is visible but Secondary could not be selected', 'admin');
      }
    } else {
      note('info', 'Admin staff', 'No school type switcher on the staff page', 'admin');
    }

    await page.goto('/dashboard/school/courses', { waitUntil: 'domcontentloaded' });
    const classesBody = await waitForMain(page, 'admin', 'Admin classes');
    note(
      /primary|jss|ss /i.test(classesBody) ? 'pass' : 'major',
      'Admin classes',
      /primary|jss|ss /i.test(classesBody) ? 'Classes page lists levels' : 'Classes page did not list Primary or JSS levels',
      'admin',
    );

    await page.goto('/dashboard/school/timetables', { waitUntil: 'domcontentloaded' });
    const timetableText = await waitForMain(page, 'admin', 'Admin timetable');
    note(
      /timetable/i.test(timetableText) ? 'pass' : 'major',
      'Admin timetable',
      /timetable/i.test(timetableText) ? 'Timetables page has content' : 'Timetables page did not render a timetable',
      'admin',
    );
  });

  test.describe('Primary form teacher — Adaeze Okeke', () => {
    test.use({ storageState: AUTH.adaeze });

    test('routes, form class, timetable, and Lois publish', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.adaeze), 'Missing beulah-teacher-adaeze.json');
      const teacher = 'adaeze';
      watchPage(page, teacher);

      await gotoTeacher(page, '/dashboard/teacher/overview');
      await shellReady(page);
      const overviewText = await waitForMain(page, teacher, 'Overview');
      note(/adaeze/i.test(overviewText) ? 'pass' : 'major', 'Overview', /adaeze/i.test(overviewText) ? 'Welcome names Adaeze' : 'Overview loaded without the teacher name', teacher);

      const myClass = page.locator('a[href^="/dashboard/teacher/classes/"]').filter({ hasText: /my class/i });
      if (await myClass.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
        note('pass', 'Form teacher', 'Sidebar shows My Class', teacher);
      } else {
        note('major', 'Form teacher', 'Primary form teacher has no My Class shortcut', teacher);
      }
      const classesList = page.locator('a[href="/dashboard/teacher/classes"]');
      if (await classesList.isVisible().catch(() => false)) {
        note('minor', 'Form teacher', 'Primary sidebar still shows the Classes list as well as My Class', teacher);
      }

      if (/english language|mathematics/i.test(overviewText)) {
        note('pass', 'Overview schedule', 'Today or week schedule shows taught subjects', teacher);
      } else {
        note('info', 'Overview schedule', excerpt(overviewText, 300), teacher);
      }

      await clickNav(page, '/dashboard/teacher/notifications', teacher, 'Notifications');
      await clickNav(page, '/dashboard/teacher/timetables', teacher, 'Timetables');
      const timetableText = await page.locator('main').innerText();
      if (/english language/i.test(timetableText) && /mathematics/i.test(timetableText)) {
        note('pass', 'Timetable', 'Primary timetable lists multiple subjects', teacher);
      } else {
        note('major', 'Timetable', `Expected multi-subject primary grid. Saw: ${excerpt(timetableText, 240)}`, teacher);
      }
      if (/primary 1/i.test(timetableText)) {
        note('pass', 'Timetable', 'Grid names Primary 1', teacher);
      }

      await clickNav(page, '/dashboard/teacher/calendar', teacher, 'Calendar');
      const calendarOk =
        (await page.locator('.rbc-calendar, [class*="rbc-"]').first().isVisible({ timeout: 15_000 }).catch(() => false)) ||
        (await page.getByText(/today|month|agenda/i).first().isVisible().catch(() => false));
      note(calendarOk ? 'pass' : 'major', 'Calendar', calendarOk ? 'Calendar UI rendered' : 'Calendar route loaded without a calendar', teacher);

      await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 20_000 });
      note('pass', 'My Class', 'Classes route redirects into the form class', teacher);
      await expect(page.getByText(/primary 1/i).first()).toBeVisible({ timeout: 20_000 });

      for (const tab of ['Overview', 'Timetable', 'Students', 'Grades', 'Assessments', 'Roll Call', 'Scheme of Work', 'Resources']) {
        const button = page.getByRole('button', { name: tab, exact: true });
        if (!(await button.isVisible({ timeout: 8_000 }).catch(() => false))) {
          note('major', 'Class tabs', `Missing tab ${tab}`, teacher);
          continue;
        }
        await button.click();
        await page.waitForTimeout(400);
        const body = await page.locator('main').innerText();
        if (/something went wrong/i.test(body)) {
          note('blocker', 'Class tabs', `${tab} hit the error boundary`, teacher);
          continue;
        }
        if (tab === 'Roll Call' && /coming soon/i.test(body)) {
          note('info', 'Class tabs', 'Roll Call is still a coming-soon overlay', teacher);
        } else if (tab === 'Students') {
          const count = body.match(/students\s*\((\d+)\)/i)?.[1];
          note(count && Number(count) > 0 ? 'pass' : 'major', 'Students', count ? `Roster shows ${count} students` : 'Students tab has no count', teacher);
        } else {
          note('pass', 'Class tabs', `${tab} opened`, teacher);
        }
      }

      await curateAndPublish(page, teacher, {
        prompt:
          'Create a short formal assessment for my Primary 1 class. Subject English Language, topic nouns, exactly 3 multiple choice questions, easy. I need the assessment editor so I can publish it.',
        className: 'Primary 1 A',
        subjectName: 'English Language',
      });
    });
  });

  test.describe('Primary form teacher, empty timetable — Femi Adebayo', () => {
    test.use({ storageState: AUTH.femi });

    test('form class still opens when the week grid is empty', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.femi), 'Missing beulah-teacher-femi.json');
      const teacher = 'femi';
      watchPage(page, teacher);

      await gotoTeacher(page, '/dashboard/teacher/overview');
      await shellReady(page);
      const overviewText = await waitForMain(page, teacher, 'Overview');
      note(/femi/i.test(overviewText) ? 'pass' : 'major', 'Overview', /femi/i.test(overviewText) ? 'Welcome names Femi' : 'Overview loaded without the teacher name', teacher);

      const myClass = page.locator('a[href^="/dashboard/teacher/classes/"]').filter({ hasText: /my class/i });
      note(
        (await myClass.first().isVisible({ timeout: 8_000 }).catch(() => false)) ? 'pass' : 'major',
        'Form teacher',
        (await myClass.count()) > 0 ? 'My Class shortcut is present without a timetable' : 'No My Class shortcut',
        teacher,
      );

      note('info', 'Overview schedule', excerpt(overviewText, 320), teacher);

      await clickNav(page, '/dashboard/teacher/timetables', teacher, 'Timetables');
      const timetableText = await page.locator('main').innerText();
      const hasLessons = /english|mathematics|basic science|social studies/i.test(timetableText);
      if (hasLessons) {
        note('info', 'Timetable', `Unexpected lessons on an empty-seed teacher: ${excerpt(timetableText, 200)}`, teacher);
      } else if (/no period|no lesson|nothing scheduled|empty/i.test(timetableText)) {
        note('pass', 'Timetable', 'Empty timetable explains that there are no lessons', teacher);
      } else {
        note('minor', 'Timetable', `Blank grid with no empty-state explanation. Saw: ${excerpt(timetableText, 220)}`, teacher);
      }

      await page.evaluate(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));
      await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 20_000 });
      await expect(page.getByText(/primary 2/i).first()).toBeVisible({ timeout: 20_000 });
      note('pass', 'My Class', 'Redirects into Primary 2 even when the switcher is Secondary', teacher);
      await page.getByRole('button', { name: 'Students', exact: true }).click();
      const body = await page.locator('main').innerText();
      const count = body.match(/students\s*\((\d+)\)/i)?.[1];
      note(count && Number(count) > 0 ? 'pass' : 'major', 'Students', count ? `Primary 2 roster shows ${count}` : 'No student count on Primary 2', teacher);

      await clickNav(page, '/dashboard/teacher/calendar', teacher, 'Calendar');
      await clickNav(page, '/dashboard/teacher/notifications', teacher, 'Notifications');
    });
  });

  test.describe('Secondary multi-class teacher — Abubakar Adebayo', () => {
    test.use({ storageState: AUTH.abubakar });

    test('several classes, one subject, clash, and Lois publish', async ({ page }) => {
      test.skip(!fs.existsSync(AUTH.abubakar), 'Missing beulah-teacher-abubakar.json');
      const teacher = 'abubakar';
      watchPage(page, teacher);

      await gotoTeacher(page, '/dashboard/teacher/overview');
      await shellReady(page);
      const overviewText = await waitForMain(page, teacher, 'Overview');
      note(/abubakar/i.test(overviewText) ? 'pass' : 'major', 'Overview', /abubakar/i.test(overviewText) ? 'Welcome names Abubakar' : 'Overview loaded without the teacher name', teacher);

      const myClass = page.getByRole('link', { name: /my class/i });
      if (await myClass.isVisible({ timeout: 4_000 }).catch(() => false)) {
        note('info', 'Form teacher', 'Secondary subject teacher unexpectedly has a My Class shortcut', teacher);
      } else {
        note('pass', 'Form teacher', 'No My Class shortcut, which matches a non-form subject teacher', teacher);
      }

      const classesLink = page.locator('a[href="/dashboard/teacher/classes"]');
      note(
        (await classesLink.isVisible().catch(() => false)) ? 'pass' : 'major',
        'Nav',
        (await classesLink.isVisible().catch(() => false)) ? 'Classes list is in the sidebar' : 'Classes link missing',
        teacher,
      );

      await clickNav(page, '/dashboard/teacher/timetables', teacher, 'Timetables');
      const timetableText = await page.locator('main').innerText();
      const classesSeen = ['JSS 1 B', 'JSS 2 A', 'JSS 2 B', 'JSS 2 C'].filter((name) =>
        timetableText.toLowerCase().includes(name.toLowerCase()),
      );
      note(
        classesSeen.length >= 3 ? 'pass' : 'major',
        'Timetable',
        `English grid names ${classesSeen.join(', ') || 'none of the expected arms'}`,
        teacher,
      );
      if (!/english language/i.test(timetableText)) {
        note('major', 'Timetable', 'English Language is not visible on the teacher timetable', teacher);
      } else {
        note('pass', 'Timetable', 'Subject shown is English Language', teacher);
      }
      if (/clash|conflict/i.test(timetableText)) {
        note('pass', 'Timetable clash', 'UI marks the overlapping Monday periods', teacher);
      } else {
        note(
          'major',
          'Timetable clash',
          'Monday 09:00 is double-booked for JSS 2 A and JSS 2 B in the data, and the teacher grid does not say clash or conflict',
          teacher,
        );
      }

      await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
      await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/?$/, { timeout: 20_000 });
      await expect
        .poll(async () => ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' '), {
          timeout: 40_000,
        })
        .not.toMatch(/loading classes/i);
      const classText = await page.locator('main').innerText();
      note('info', 'Classes', excerpt(classText, 500), teacher);
      for (const name of ['JSS 2 A', 'JSS 2 B', 'JSS 1 B']) {
        if (classText.toLowerCase().includes(name.toLowerCase())) {
          note('pass', 'Classes', `Lists ${name}`, teacher);
        } else {
          note('major', 'Classes', `Missing ${name} from the classes list`, teacher);
        }
      }
      if (/form teacher/i.test(classText)) {
        note('info', 'Form teacher', 'Classes list mentions form teacher', teacher);
      } else {
        note('info', 'Form teacher', 'No form-teacher badge on the secondary class cards', teacher);
      }

      const jss2 = page.getByText(/JSS 2 A/i).first();
      await jss2.click();
      await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 20_000 });
      note('pass', 'Classes', 'Opened JSS 2 A', teacher);

      await page.getByRole('button', { name: 'Students', exact: true }).click();
      const studentsBody = await page.locator('main').innerText();
      const count = studentsBody.match(/students\s*\((\d+)\)/i)?.[1];
      note(
        count && Number(count) > 0 ? 'pass' : 'major',
        'Students',
        count ? `JSS 2 A shows ${count} students` : 'JSS 2 A students tab has no count',
        teacher,
      );

      await page.getByRole('button', { name: 'Timetable', exact: true }).click();
      const classTimetable = await page.locator('main').innerText();
      note(
        /english language/i.test(classTimetable) ? 'pass' : 'minor',
        'Class timetable',
        /english language/i.test(classTimetable)
          ? 'Class timetable tab shows English'
          : `Class timetable tab: ${excerpt(classTimetable, 180)}`,
        teacher,
      );

      await page.getByRole('button', { name: 'Grades', exact: true }).click();
      const gradesBody = await page.locator('main').innerText();
      note('info', 'Grades', excerpt(gradesBody, 220), teacher);

      await curateAndPublish(page, teacher, {
        prompt:
          'Create a short formal assessment for JSS 2 A. Subject English Language, topic subject-verb agreement, exactly 3 multiple choice questions, medium difficulty. I need the assessment editor so I can publish it to that class.',
        className: 'JSS 2 A',
        subjectName: 'English Language',
      });
    });
  });
});
