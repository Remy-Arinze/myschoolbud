import { test, expect, type Page, type Response } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { askLois, openLois } from '../helpers/lois-chat';
import { switchSchoolType } from '../helpers/ui';

/**
 * Teacher-dashboard pass for a real school week: scheme of work, reports,
 * and curated quiz / assignment / exam. Records what the UI and the API do.
 */

type Severity = 'pass' | 'info' | 'minor' | 'major' | 'blocker';
type Finding = { severity: Severity; area: string; note: string; teacher?: string };

const findingsFile = path.resolve(__dirname, '../../../qa-reports/_teacher-school-pass.jsonl');
const reportFile = path.resolve(__dirname, '../../../qa-reports/2026-09-22-teacher-school-pass.md');

const AUTH = {
  adaeze: path.resolve(__dirname, '../.auth/beulah-teacher-adaeze.json'),
  femi: path.resolve(__dirname, '../.auth/beulah-teacher-femi.json'),
  abubakar: path.resolve(__dirname, '../.auth/beulah-teacher-abubakar.json'),
};

function note(severity: Severity, area: string, message: string, teacher?: string) {
  const finding: Finding = { severity, area, note: message, teacher };
  fs.mkdirSync(path.dirname(findingsFile), { recursive: true });
  fs.appendFileSync(findingsFile, `${JSON.stringify(finding)}\n`);
  console.log(`[QA:${severity}]${teacher ? ` [${teacher}]` : ''} ${area} — ${message}`);
}

function excerpt(text: string, n = 280) {
  return text.replace(/\s+/g, ' ').trim().slice(0, n);
}

function watchPage(page: Page, teacher: string) {
  page.on('pageerror', (err) => note('major', 'Page error', err.message.slice(0, 300), teacher));
  page.on('response', async (res: Response) => {
    const url = res.url();
    const interesting =
      /\/scheme-of-work|\/schemes|\/curriculum|\/assessments/.test(url) &&
      res.request().resourceType() === 'fetch';
    if (!interesting || res.status() < 400) return;
    note('major', 'API', `${res.status()} ${res.request().method()} ${url.split('?')[0].slice(-120)}`, teacher);
  });
}

async function settle(page: Page) {
  await expect(page.getByText(/^Compiling/)).toHaveCount(0, { timeout: 120_000 });
}

async function openAdminClass(page: Page, className: string, schoolType: 'PRIMARY' | 'SECONDARY') {
  await page.goto('/dashboard/school/courses');
  await expect(page.getByRole('heading', { name: /classes|courses/i }).first()).toBeVisible({ timeout: 45_000 });
  await switchSchoolType(page, schoolType);
  await settle(page);
  const title = page.locator('h3').filter({ hasText: new RegExp(`^${className}$`) }).first();
  await expect(title).toBeVisible({ timeout: 30_000 });
  await title.click();
  const opened = await page
    .waitForURL(/\/dashboard\/school\/courses\/[^/?#]+/, { timeout: 15_000, waitUntil: 'commit' })
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    await title.locator('xpath=ancestor::*[contains(@class,"cursor-pointer")][1]').click();
    await page.waitForURL(/\/dashboard\/school\/courses\/[^/?#]+/, { timeout: 30_000, waitUntil: 'commit' });
  }
  await expect(page.getByRole('heading', { name: className, level: 1 })).toBeVisible({ timeout: 30_000 });
}

async function openTeacherClass(page: Page, className: string) {
  await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
  await settle(page);
  if (!/\/classes\/[^/?#]+/.test(page.url())) {
    await expect
      .poll(async () => (await page.locator('main').innerText()) || '', { timeout: 40_000 })
      .toMatch(new RegExp(className, 'i'));
    await page.getByText(className, { exact: true }).first().click();
    await page.waitForURL(/\/dashboard\/teacher\/classes\/[^/?#]+/, { timeout: 30_000 });
  }
  await settle(page);
}

async function pickDueDate(page: Page) {
  const already = page.getByRole('button', { name: /[A-Z][a-z]{2} \d{1,2}, \d{4}/ }).first();
  if (await already.isVisible({ timeout: 3_000 }).catch(() => false)) return;
  const trigger = page.getByRole('button', { name: /select date/i }).first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /choose date/i });
  await expect(dialog).toBeVisible({ timeout: 8_000 });
  const day = dialog.locator('button.rdp-day:not(.rdp-day_disabled):not(.rdp-day_outside)').last();
  await expect(day).toBeVisible({ timeout: 8_000 });
  await day.click();
}

async function publishFromEditor(
  page: Page,
  teacher: string,
  opts: { title: string; className: string; subjectName: string; expectedType: string },
) {
  await expect(page.getByRole('heading', { name: /review & save assessment|create new assessment/i })).toBeVisible({
    timeout: 30_000,
  });
  const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^Quiz$/ }) });
  if (await typeSelect.count()) {
    note('pass', 'Assessment type', 'Editor exposes Quiz, Assignment, and Exam', teacher);
  } else {
    note(
      'major',
      'Assessment type',
      'The full-screen editor has no Quiz / Assignment / Exam control. Type is whatever the page defaulted to.',
      teacher,
    );
  }

  await page.getByPlaceholder(/chemistry quiz/i).fill(opts.title);
  const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: opts.className }) }).first();
  if (await classSelect.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await classSelect.selectOption({ label: opts.className });
  } else {
    note('major', 'Assessment editor', `Class select has no ${opts.className}`, teacher);
    return;
  }
  const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: opts.subjectName }) });
  if (await subjectSelect.count()) {
    await subjectSelect.first().selectOption({ label: opts.subjectName });
  }
  await pickDueDate(page);

  const match = page.getByRole('button', { name: /match score/i });
  if (await match.isVisible({ timeout: 2_000 }).catch(() => false)) await match.click();

  const publish = page.getByRole('button', { name: /publish now/i });
  if (await publish.isDisabled()) {
    note('major', 'Publish', `Publish Now stayed disabled for ${opts.expectedType}`, teacher);
    return;
  }

  const posted = page.waitForRequest(
    (req) => req.method() === 'POST' && /\/assessments$/.test(new URL(req.url()).pathname),
    { timeout: 30_000 },
  );
  await publish.click();
  await page.getByRole('button', { name: /^continue$/i }).click();
  const req = await posted.catch(() => null);
  if (!req) {
    note('blocker', 'Publish', `No assessment POST for ${opts.title}`, teacher);
    return;
  }
  let sentType = '';
  try {
    sentType = String(req.postDataJSON()?.type || '');
  } catch {
    sentType = '';
  }
  note(
    sentType === opts.expectedType ? 'pass' : 'major',
    'Publish API',
    `Asked for ${opts.expectedType}. Backend received type "${sentType || 'missing'}" for "${opts.title}".`,
    teacher,
  );
  await expect(page.getByText(/assessment published/i)).toBeVisible({ timeout: 25_000 });
}

test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

test.beforeAll(() => {
  fs.mkdirSync(path.dirname(findingsFile), { recursive: true });
  fs.writeFileSync(findingsFile, '');
});

test.afterAll(() => {
  const findings: Finding[] = fs
    .readFileSync(findingsFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Finding);
  const lines = [
    '# Teacher school pass — 2026-09-22',
    '',
    'Playwright against the local Beulah app. Curriculum is read from the school admin class page. Scheme of work, reports, the assessment type, and Lois exam and scheme gates are walked as the teacher.',
    '',
    '| Severity | Teacher | Area | Note |',
    '| --- | --- | --- | --- |',
    ...findings.map((f) => `| ${f.severity} | ${f.teacher || '—'} | ${f.area} | ${f.note.replace(/\|/g, '/')} |`),
    '',
  ];
  fs.writeFileSync(reportFile, lines.join('\n'));
  console.log(`[QA] report ${reportFile}`);
});

test('admin curriculum for Primary 1 A and JSS 2 A', async ({ page }) => {
  watchPage(page, 'admin');
  for (const [className, schoolType] of [
    ['Primary 1 A', 'PRIMARY'],
    ['JSS 2 A', 'SECONDARY'],
  ] as const) {
    await openAdminClass(page, className, schoolType);
    await page.getByRole('button', { name: 'Curriculum', exact: true }).click();
    await expect(page.getByText(/timetable discovery/i)).toHaveCount(0, { timeout: 40_000 });
    const body = ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' ');
    const published = body.match(/Published\s+(\d+)/i)?.[1];
    const unset = body.match(/Unset\s+(\d+)/i)?.[1];
    const total = body.match(/Total Subjects\s+(\d+)/i)?.[1];
    if (/no timetable|hasn't generated|not been set up|couldn't load curriculum/i.test(body) && !total) {
      note('major', 'Curriculum', `${className}: ${excerpt(body, 220)}`, 'admin');
    } else {
      note(
        unset && Number(unset) > 0 ? 'major' : 'pass',
        'Curriculum',
        `${className}: ${total || '?'} subjects, ${published || '?'} published, ${unset || '?'} unset.`,
        'admin',
      );
    }
    const subjectNames = await page.locator('main h3, main h4').allInnerTexts();
    if (subjectNames.length) {
      note('info', 'Curriculum subjects', `${className}: ${subjectNames.slice(0, 12).join(', ')}`, 'admin');
    }
  }
});

test.describe('Adaeze — primary form class', () => {
  test.use({ storageState: AUTH.adaeze });

  test('scheme, reports, and the assessment editor', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH.adaeze), 'Missing Adaeze auth');
    watchPage(page, 'adaeze');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'PRIMARY'));
    await openTeacherClass(page, 'Primary 1 A');
    await expect(page.getByText(/primary 1/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Scheme of Work', exact: true }).click();
    await expect(page.getByText(/retrieving your tailored scheme/i)).toHaveCount(0, { timeout: 40_000 });
    const scheme = ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' ');
    if (/no active scheme of work/i.test(scheme)) {
      note('major', 'Scheme of work', `Primary 1 A has no published scheme. ${excerpt(scheme, 180)}`, 'adaeze');
    } else if (/weekly roadmap|scheme of work/i.test(scheme)) {
      const subjects = await page.locator('select option').allInnerTexts().catch(() => []);
      note(
        'pass',
        'Scheme of work',
        subjects.length
          ? `Primary 1 A scheme is up. Subjects: ${subjects.join(', ')}`
          : `Primary 1 A scheme is up. ${excerpt(scheme, 180)}`,
        'adaeze',
      );
    } else {
      note('major', 'Scheme of work', excerpt(scheme, 220), 'adaeze');
    }

    const reports = page.getByRole('button', { name: 'Reports', exact: true });
    if (await reports.isVisible().catch(() => false)) {
      await reports.click();
      await expect(page.getByTestId('form-reports-summary')).toBeVisible({ timeout: 20_000 });
      const summary = await page.getByTestId('form-reports-summary').innerText();
      note('pass', 'Reports', excerpt(summary, 180), 'adaeze');
    } else {
      note('major', 'Reports', 'Primary form teacher has no Reports tab', 'adaeze');
    }

    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    const create = page.getByRole('button', { name: /create assessment/i });
    if (!(await create.isVisible({ timeout: 15_000 }).catch(() => false))) {
      note('major', 'Assessments', 'Create Assessment is hidden on Primary 1 A', 'adaeze');
      return;
    }
    await settle(page);
    await create.click();
    await page.waitForURL(/\/assessments\/new/, { timeout: 30_000, waitUntil: 'commit' });
    await expect(page.getByText(/compiling/i)).toHaveCount(0, { timeout: 120_000 });
    const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^Exam$/ }) });
    note(
      (await typeSelect.count()) ? 'pass' : 'major',
      'Assessment type',
      (await typeSelect.count())
        ? 'Manual editor can choose Quiz, Assignment, or Exam'
        : 'Manual Create Assessment opens an editor with no Quiz / Assignment / Exam choice',
      'adaeze',
    );
  });
});

test.describe('Femi — form class with no periods', () => {
  test.use({ storageState: AUTH.femi });

  test('scheme and reports still open', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH.femi), 'Missing Femi auth');
    watchPage(page, 'femi');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));
    await openTeacherClass(page, 'Primary 2 A');
    await expect(page).toHaveURL(/\/classes\/[^/?#]+/);
    await expect(page.getByText(/primary 2/i).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Scheme of Work', exact: true }).click();
    await expect(page.getByText(/retrieving your tailored scheme/i)).toHaveCount(0, { timeout: 40_000 });
    const scheme = ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' ');
    note(
      /no active scheme of work/i.test(scheme) ? 'major' : 'pass',
      'Scheme of work',
      excerpt(scheme, 220),
      'femi',
    );

    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByTestId('form-reports-summary')).toBeVisible({ timeout: 20_000 });
    note('pass', 'Reports', excerpt(await page.getByTestId('form-reports-summary').innerText(), 160), 'femi');
  });
});

test.describe('Abubakar — secondary form and English', () => {
  test.use({ storageState: AUTH.abubakar });

  test('scheme, reports, exam refusal, and one Ask Lois', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH.abubakar), 'Missing Abubakar auth');
    watchPage(page, 'abubakar');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));
    await openTeacherClass(page, 'JSS 2 A');
    await expect(page.getByRole('heading', { name: /JSS 2 A/i }).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Scheme of Work', exact: true }).click();
    await expect(page.getByText(/retrieving your tailored scheme/i)).toHaveCount(0, { timeout: 40_000 });
    const scheme = ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' ');
    const subjects = await page.locator('select option').allInnerTexts().catch(() => []);
    if (/no active scheme of work/i.test(scheme)) {
      note('major', 'Scheme of work', 'JSS 2 A English has no published scheme for this term.', 'abubakar');
    } else {
      note(
        'pass',
        'Scheme of work',
        subjects.length ? `Subjects on the scheme: ${subjects.join(', ')}` : excerpt(scheme, 200),
        'abubakar',
      );
    }

    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(page.getByTestId('form-reports-summary')).toBeVisible({ timeout: 20_000 });
    const summary = await page.getByTestId('form-reports-summary').innerText();
    note(/gradebook is empty/i.test(summary) ? 'info' : 'pass', 'Reports', excerpt(summary, 180), 'abubakar');

    const loisButtons = page.getByRole('button', { name: /ask lois|lois briefing/i });
    await expect(loisButtons).toHaveCount(1, { timeout: 20_000 });
    note('pass', 'Ask Lois', 'The class page has one Ask Lois control', 'abubakar');

    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    await settle(page);
    await page.getByRole('button', { name: /create assessment/i }).click();
    await page.waitForURL(/\/assessments\/new/, { timeout: 20_000, waitUntil: 'commit' });
    const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^Quiz$/ }) });
    await expect(typeSelect).toBeVisible({ timeout: 20_000 });
    await expect(typeSelect.locator('option', { hasText: /^Assignment$/ })).toHaveCount(1);
    await expect(typeSelect.locator('option', { hasText: /^Exam$/ })).toHaveCount(1);
    note('pass', 'Assessment type', 'Editor shows Quiz, Assignment, and Exam', 'abubakar');

    const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'JSS 2 A' }) }).first();
    if ((await classSelect.inputValue()) !== (await classSelect.locator('option', { hasText: 'JSS 2 A' }).getAttribute('value'))) {
      await classSelect.selectOption({ label: 'JSS 2 A' });
    }
    const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'English Language' }) }).first();
    await expect(subjectSelect).toBeVisible({ timeout: 20_000 });
    await subjectSelect.selectOption({ label: 'English Language' });
    await typeSelect.selectOption({ label: 'Exam' });
    await expect(page.getByText(/exam timetable is not published yet/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /publish now/i })).toBeDisabled();
    note('pass', 'Exam timetable', 'Exam stays unpublished until a slot exists for this class and subject', 'abubakar');

    await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await openTeacherClass(page, 'JSS 2 A');
    await openLois(page);
    const examReply = await askLois(
      page,
      'Create a formal end-of-term exam for my JSS 2 A English Language class. Topic comprehension. Exactly 3 multiple choice questions.',
      180_000,
    );
    const examCard = page.getByRole('button', { name: /edit in full screen/i });
    const examRefused = /exam timetable/i.test(examReply) && /publish/i.test(examReply);
    const examDumped = /\b[A-D]\)/.test(examReply) || /correct answer/i.test(examReply);
    note(
      examRefused && !examDumped && (await examCard.count()) === 0 ? 'pass' : 'major',
      'Lois exam',
      excerpt(examReply, 220),
      'abubakar',
    );

    const quizReply = await askLois(
      page,
      'Create a short quiz, not an exam, for my JSS 2 A English Language class. Topic nouns. Exactly 3 multiple choice questions.',
      180_000,
    );
    const quizCard = page.getByRole('button', { name: /edit in full screen/i });
    const quizQuiet = /scheme of work[\s\S]{0,120}is not published/i.test(quizReply);
    const quizDumped = /\b[A-D]\)/.test(quizReply) || /correct answer/i.test(quizReply);
    note(
      quizQuiet && !quizDumped && (await quizCard.count()) === 0 ? 'pass' : 'major',
      'Lois scheme',
      excerpt(quizReply, 220),
      'abubakar',
    );
  });
});
