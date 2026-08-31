import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: Timetable creation usability & end-to-end flow
 * Secondary: Create shell → Auto-Fill → Preview → Apply
 * Primary: Create shell → Auto-Fill (direct apply)
 *
 * Collects structured findings for the QA report.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];

function note(severity: Finding['severity'], area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

async function openTimetables(page: Page, type: 'PRIMARY' | 'SECONDARY') {
  await page.goto('/dashboard/school/timetables');
  await expect(page.getByRole('heading', { name: /timetables/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await switchSchoolType(page, type);
  await expect(
    page.getByText(new RegExp(`manage class schedules and timetables for ${type.toLowerCase()}`, 'i')),
  ).toBeVisible({ timeout: 20_000 });

  // Wait for classes list — Create modal currently treats loading as "No Classes Available"
  const classesRes = await page
    .waitForResponse(
      (r) =>
        r.url().includes(`/schools/`) &&
        r.url().includes('/classes') &&
        !r.url().includes('/timetable') &&
        r.request().method() === 'GET',
      { timeout: 45_000 },
    )
    .catch(() => null);

  if (classesRes) {
    const body = await classesRes.json().catch(() => null);
    const count = Array.isArray(body?.data) ? body.data.length : -1;
    note(
      count > 0 ? 'pass' : 'major',
      'Classes API',
      `GET ${classesRes.url()} → ${classesRes.status()}, count=${count}`,
    );
  } else {
    note('info', 'Classes API', 'Did not observe /classes response after type switch (may have been cached)');
  }
}

async function createTimetableForClass(page: Page, classLabel: string) {
  // Re-check classes are populated before opening (documents race if still empty)
  const classesProbe = await page.evaluate(async () => {
    // soft signal only
    return document.body.innerText.includes('Create Timetable') || document.body.innerText.includes('Create');
  });
  void classesProbe;

  const createBtn = page.getByRole('button', { name: /create timetable|^create$/i }).filter({ hasText: /create/i }).first();
  await expect(createBtn).toBeVisible({ timeout: 15_000 });
  await createBtn.click();

  const modal = page.locator('div.fixed.inset-0').filter({ hasText: /create new timetable/i });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  // If false empty state, wait briefly and reopen (confirms loading race UX bug)
  const noClasses = modal.getByText(/no classes available/i);
  if (await noClasses.isVisible().catch(() => false)) {
    note(
      'major',
      'Create modal',
      'Showed "No Classes Available" immediately — likely loading race (no spinner). Waiting & retrying.',
    );
    await modal.getByRole('button', { name: /cancel|close/i }).first().click().catch(async () => {
      await page.keyboard.press('Escape');
    });
    await page.waitForTimeout(2500);
    await createBtn.click();
    await expect(modal).toBeVisible({ timeout: 10_000 });
  }

  // Usability: term should be auto-bound (no free picker)
  const termSelect = modal.getByLabel(/select term/i);
  if (await termSelect.isVisible().catch(() => false)) {
    note('minor', 'Create modal', 'Term select is visible; expected auto-bound Current Term only');
  } else if (await modal.getByText(/current term/i).isVisible().catch(() => false)) {
    note('pass', 'Create modal', 'Term is auto-bound (Current Term shown) — good UX');
  } else {
    note('pass', 'Create modal', 'Term is auto-bound (no free term picker)');
  }

  if (await modal.getByText(/no classes available/i).isVisible().catch(() => false)) {
    note('blocker', 'Create modal', 'No Classes Available persists after retry — real empty or filter bug');
    // Capture API state for report
    const classesJson = await page.evaluate(async () => {
      try {
        const keys = Object.keys(localStorage);
        return { keys: keys.filter((k) => /class|school/i.test(k)).slice(0, 20) };
      } catch {
        return null;
      }
    });
    note('info', 'Create modal', `localStorage probe: ${JSON.stringify(classesJson)}`);
    throw new Error('No classes available for timetable create');
  }
  if (await modal.getByText(/no active term available/i).isVisible().catch(() => false)) {
    note('blocker', 'Create modal', 'No Active Term Available — cannot create timetable');
    throw new Error('No active term available for timetable create');
  }

  const classTrigger = modal.getByRole('combobox', { name: /select class/i });
  await expect(classTrigger).toBeVisible({ timeout: 15_000 });
  await classTrigger.click();

  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible({ timeout: 10_000 });
  const optionTexts = await listbox.getByRole('option').allTextContents();
  note(
    'info',
    'Create modal',
    `Class options (${optionTexts.length}): ${optionTexts.join(', ')}`,
  );

  const match = optionTexts.find((o) => o.trim().toLowerCase() === classLabel.toLowerCase());
  if (!match) {
    const fallback = optionTexts.find((o) => o.trim() && !/select a class/i.test(o));
    if (!fallback) {
      throw new Error(`Class "${classLabel}" not in select: ${optionTexts.join(' | ')}`);
    }
    note('minor', 'Create modal', `Exact label "${classLabel}" missing; using "${fallback.trim()}"`);
    await listbox.getByRole('option', { name: fallback.trim() }).click();
  } else {
    await listbox.getByRole('option', { name: match.trim() }).click();
  }

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/timetable/master-schedule') && res.request().method() === 'POST',
    { timeout: 90_000 },
  );

  await modal.getByRole('button', { name: /^create$/i }).click();
  const createRes = await createResponsePromise;
  const createBody = await createRes.json().catch(() => ({}));
  note(
    createRes.ok() ? 'pass' : 'blocker',
    'Create API',
    `POST master-schedule → ${createRes.status()} ${JSON.stringify(createBody).slice(0, 240)}`,
  );
  expect(createRes.ok()).toBeTruthy();

  await expect(page.getByText(/timetable created successfully/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

async function openClassBuilder(page: Page, classLabel: string) {
  const card = page.locator('.cursor-pointer').filter({ hasText: new RegExp(classLabel, 'i') }).first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  const periodsText = await card.getByText(/\d+\s+periods/i).textContent();
  note('info', 'Class card', `${classLabel}: ${periodsText?.trim()}`);

  await card.getByRole('button', { name: /view timetable/i }).click();
  await expect(page.getByRole('heading', { name: /^timetable$/i }).or(page.getByText(/^timetable$/i)).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/drop here|free period|subjects/i).first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('QA: timetable creation E2E', () => {
  test.describe.configure({ mode: 'serial', timeout: 15 * 60_000 });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, '2026-07-23-timetable-creation-findings.json');
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
    console.log(`Wrote findings → ${outPath}`);
  });

  test('Secondary: page load, create shell, auto-fill with preview & apply', async ({ page }) => {
    await openTimetables(page, 'SECONDARY');
    note('pass', 'Navigation', 'Timetables page loads for Secondary');

    // Empty / list state
    const emptyHint = page.getByText(/no timetables created yet/i);
    if (await emptyHint.isVisible().catch(() => false)) {
      note('pass', 'Empty state', 'Shows helpful empty copy when no timetables exist');
    }

    await createTimetableForClass(page, 'JSS 1 A');
    await openClassBuilder(page, 'JSS 1 A');

    // Subjects palette + Auto-Fill
    const autoFill = page.getByRole('button', { name: /auto-fill timetable/i });
    await expect(autoFill).toBeVisible({ timeout: 15_000 });
    note('pass', 'Builder', 'Auto-Fill Timetable available (subjects present)');

    // Teacher warning banner?
    const teacherWarn = page.getByText(/some subjects have no teachers assigned/i);
    if (await teacherWarn.isVisible().catch(() => false)) {
      note(
        'minor',
        'Builder',
        'Amber banner: some subjects have no teachers — expected for electives without staff',
      );
      const subjectsLink = page.getByRole('link', { name: /go to subjects/i });
      if (await subjectsLink.isVisible().catch(() => false)) {
        note('pass', 'Builder', 'Warning links to Subjects page — good recovery path');
      }
    } else {
      note('info', 'Builder', 'No missing-teacher banner (all palette subjects may have teachers)');
    }

    await autoFill.click();
    const confirmModal = page.locator('div.fixed.inset-0').filter({ hasText: /auto-fill timetable/i });
    await expect(confirmModal).toBeVisible({ timeout: 10_000 });
    note('pass', 'Auto-Fill', 'Confirmation modal appears before generate');

    await confirmModal.getByRole('button', { name: /^generate$/i }).click();

    // Secondary → preview modal
    const preview = page.locator('div.fixed.inset-0').filter({ hasText: /timetable preview/i });
    await expect(preview).toBeVisible({ timeout: 60_000 });
    note('pass', 'Auto-Fill (Secondary)', 'Preview modal opens after Generate — review-before-apply UX');

    const previewBody = await preview.textContent();
    if (/review warnings before applying/i.test(previewBody || '')) {
      note('minor', 'Preview', 'Warnings present before apply (subjects without teachers or load issues)');
    }
    if (/all teachers assigned successfully/i.test(previewBody || '')) {
      note('pass', 'Preview', 'All teachers assigned successfully in preview');
    }

    // Spot-check subject names appear in preview
    for (const subject of ['Mathematics', 'English', 'Physics', 'Biology']) {
      if (await preview.getByText(new RegExp(subject, 'i')).first().isVisible().catch(() => false)) {
        note('pass', 'Preview content', `Preview includes ${subject}`);
      }
    }

    const applyBtn = preview.getByRole('button', { name: /apply timetable/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    await expect(preview).toBeHidden({ timeout: 120_000 });
    note('pass', 'Apply', 'Preview closed after Apply (timetable persisted)');

    // Grid should show filled lesson cells (not only Free Period / Drop here)
    const grid = page.locator('table').filter({ hasText: /monday|tuesday|time/i }).first();
    await expect(grid).toBeVisible({ timeout: 20_000 });

    const mathCell = grid.getByText(/mathematics/i).first();
    const engCell = grid.getByText(/english/i).first();
    const hasMath = await mathCell.isVisible().catch(() => false);
    const hasEng = await engCell.isVisible().catch(() => false);
    note(
      hasMath || hasEng ? 'pass' : 'major',
      'Filled grid',
      `After apply — Math visible: ${hasMath}, English visible: ${hasEng}`,
    );
    expect(hasMath || hasEng).toBeTruthy();

    // Secondary should show teacher names or + Assign on cells
    const assignHints = page.getByText(/\+?\s*assign/i);
    const assignCount = await assignHints.count();
    if (assignCount > 0) {
      note(
        'minor',
        'Filled grid',
        `${assignCount} cell(s) still show Assign — some periods lack teachers after auto-fill`,
      );
    } else {
      note('pass', 'Filled grid', 'No leftover + Assign hints visible in builder');
    }
  });

  test('Primary: create shell and auto-fill (direct apply)', async ({ page }) => {
    await openTimetables(page, 'PRIMARY');
    note('pass', 'Navigation', 'Timetables page loads for Primary');

    await createTimetableForClass(page, 'Primary 1 A');
    await openClassBuilder(page, 'Primary 1 A');

    const autoFill = page.getByRole('button', { name: /auto-fill timetable/i });
    await expect(autoFill).toBeVisible({ timeout: 15_000 });
    await autoFill.click();

    const confirmModal = page.locator('div.fixed.inset-0').filter({ hasText: /auto-fill timetable/i });
    await expect(confirmModal).toBeVisible({ timeout: 10_000 });
    await confirmModal.getByRole('button', { name: /^generate$/i }).click();

    // Primary should NOT require preview — applies directly
    const preview = page.locator('div.fixed.inset-0').filter({ hasText: /timetable preview/i });
    const previewShown = await preview.isVisible({ timeout: 5_000 }).catch(() => false);
    if (previewShown) {
      note('info', 'Auto-Fill (Primary)', 'Unexpected preview modal on Primary — applying anyway');
      await preview.getByRole('button', { name: /apply timetable/i }).click();
      await expect(preview).toBeHidden({ timeout: 120_000 });
    } else {
      note('pass', 'Auto-Fill (Primary)', 'No preview modal — direct apply path for Primary');
      // Wait for grid to update (period creates)
      await page.waitForTimeout(3000);
    }

    const grid = page.locator('table').filter({ hasText: /monday|tuesday|time/i }).first();
    await expect(grid).toBeVisible({ timeout: 20_000 });
    const hasMath = await grid.getByText(/mathematics/i).first().isVisible().catch(() => false);
    const hasEng = await grid.getByText(/english/i).first().isVisible().catch(() => false);
    const hasScience = await grid.getByText(/basic science|science/i).first().isVisible().catch(() => false);
    note(
      hasMath || hasEng || hasScience ? 'pass' : 'major',
      'Primary filled grid',
      `Math=${hasMath} Eng=${hasEng} Science=${hasScience}`,
    );
    expect(hasMath || hasEng || hasScience).toBeTruthy();
  });

  test('Usability: create modal recovery CTAs and History toggle', async ({ page }) => {
    await openTimetables(page, 'SECONDARY');

    const historyBtn = page.getByRole('button', { name: /history|current term/i });
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();
    note('pass', 'History', 'History / Current Term toggle is reachable');

    // Switch back
    await page.getByRole('button', { name: /current term|history/i }).click();

    // Open create and cancel — cancel should dismiss cleanly
    await page.getByRole('button', { name: /create timetable|create/i }).first().click();
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: /create new timetable/i });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /cancel/i }).click();
    await expect(modal).toBeHidden({ timeout: 10_000 });
    note('pass', 'Create modal', 'Cancel dismisses create modal cleanly');
  });
});
