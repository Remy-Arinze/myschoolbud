import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: more Secondary timetables + Edit Timetable (add period row, change subject, save)
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

const SECONDARY_CLASSES = ['JSS 2 A', 'JSS 3 A', 'SS 1 A', 'SS 2 A', 'SS 3 A'] as const;
/** Already created in prior suite — use for edit flow */
const EDIT_TARGET = 'JSS 1 A';

async function openSecondaryTimetables(page: Page) {
  await page.goto('/dashboard/school/timetables');
  await expect(page.getByRole('heading', { name: /timetables/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await switchSchoolType(page, 'SECONDARY');
  await expect(page.getByText(/manage class schedules and timetables for secondary/i)).toBeVisible({
    timeout: 20_000,
  });
  await page
    .waitForResponse(
      (r) =>
        r.url().includes('/classes') &&
        !r.url().includes('/timetable') &&
        r.request().method() === 'GET',
      { timeout: 45_000 },
    )
    .catch(() => null);
}

async function selectRadixOption(page: Page, modal: ReturnType<Page['locator']>, label: RegExp | string, optionLabel: string) {
  const trigger = modal.getByRole('combobox', { name: label });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
  const listbox = page.getByRole('listbox');
  await expect(listbox).toBeVisible({ timeout: 10_000 });
  await listbox.getByRole('option', { name: optionLabel, exact: true }).click();
}

async function findClassCard(page: Page, classLabel: string) {
  // Avoid substring traps (e.g. "SS 1 A" matching inside "JSS 1 A")
  return page
    .locator('.cursor-pointer')
    .filter({ has: page.getByText(classLabel, { exact: true }) })
    .filter({ hasText: /\d+\s+periods/i })
    .first();
}

async function createShell(page: Page, classLabel: string) {
  const createBtn = page.getByRole('button', { name: /create timetable|^create$/i }).first();
  await expect(createBtn).toBeVisible({ timeout: 15_000 });
  await createBtn.click();

  const modal = page.locator('div.fixed.inset-0').filter({ hasText: /create new timetable/i });
  await expect(modal).toBeVisible({ timeout: 10_000 });

  if (await modal.getByText(/loading classes/i).isVisible().catch(() => false)) {
    await expect(modal.getByText(/loading classes/i)).toBeHidden({ timeout: 30_000 });
  }
  if (await modal.getByText(/no classes available/i).isVisible().catch(() => false)) {
    throw new Error(`No classes available when creating ${classLabel}`);
  }

  await selectRadixOption(page, modal, /select class/i, classLabel);

  const createResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes('/timetable/master-schedule') && res.request().method() === 'POST',
    { timeout: 90_000 },
  );
  await modal.getByRole('button', { name: /^create$/i }).click();
  const res = await createResponsePromise;
  const body = await res.json().catch(() => ({}));
  note(
    res.ok() ? 'pass' : 'blocker',
    'Create',
    `${classLabel}: ${res.status()} ${JSON.stringify(body?.data ?? body).slice(0, 200)}`,
  );
  expect(res.ok()).toBeTruthy();
  await expect(page.getByText(/timetable created successfully/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(modal).toBeHidden({ timeout: 15_000 });
}

async function openClassCard(page: Page, classLabel: string) {
  const card = await findClassCard(page, classLabel);
  // If shell just created, card may exist without going through findClassCard periods filter yet
  const fallback = page
    .locator('.cursor-pointer')
    .filter({ has: page.getByText(classLabel, { exact: true }) })
    .first();
  const target = (await card.isVisible().catch(() => false)) ? card : fallback;
  await expect(target).toBeVisible({ timeout: 20_000 });
  await target.getByRole('button', { name: /view timetable/i }).click();
  await expect(page.getByText(new RegExp(`timetable for ${classLabel}`, 'i')).first()).toBeVisible({
    timeout: 20_000,
  });
}

async function autoFillSecondary(page: Page) {
  const autoFill = page.getByRole('button', { name: /auto-fill timetable/i });
  await expect(autoFill).toBeVisible({ timeout: 15_000 });
  await autoFill.click();
  const confirm = page.locator('div.fixed.inset-0').filter({ hasText: /auto-fill timetable/i });
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  await confirm.getByRole('button', { name: /^generate$/i }).click();

  const preview = page.locator('div.fixed.inset-0').filter({ hasText: /timetable preview/i });
  await expect(preview).toBeVisible({ timeout: 60_000 });
  await preview.getByRole('button', { name: /apply timetable/i }).click();
  await expect(preview).toBeHidden({ timeout: 120_000 });
  note('pass', 'Auto-Fill', 'Preview applied successfully');
}

test.describe('QA: more Secondary timetables + edit', () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, '2026-07-23-timetable-edit-findings.json');
    fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
    console.log(`Wrote findings → ${outPath}`);
  });

  test('creates shells (+ auto-fill) for remaining Secondary classes', async ({ page }) => {
    await openSecondaryTimetables(page);

    for (const classLabel of SECONDARY_CLASSES) {
      const existingCard = await findClassCard(page, classLabel);

      if (await existingCard.isVisible().catch(() => false)) {
        const periods = await existingCard.getByText(/\d+\s+periods/i).textContent();
        note('info', 'Create skip', `${classLabel} already has timetable (${periods?.trim()})`);
        continue;
      }

      await createShell(page, classLabel);
      await openClassCard(page, classLabel);

      // Auto-fill a mix: JSS 2 and SS 1 fully; leave others as empty shells for edit/manual QA
      if (classLabel === 'JSS 2 A' || classLabel === 'SS 1 A') {
        await autoFillSecondary(page);
        const grid = page.locator('table').filter({ hasText: /monday|time/i }).first();
        const hasSubject = await grid
          .getByText(/mathematics|english|biology|physics/i)
          .first()
          .isVisible()
          .catch(() => false);
        note(
          hasSubject ? 'pass' : 'major',
          'Auto-Fill verify',
          `${classLabel} grid has subjects: ${hasSubject}`,
        );
        expect(hasSubject).toBeTruthy();
      } else {
        note('info', 'Shell only', `${classLabel} left as empty LESSON shell (no auto-fill)`);
      }

      // Collapse builder by clicking card again (deselect) so list stays usable
      const card = page
        .locator('.cursor-pointer')
        .filter({ has: page.getByText(classLabel, { exact: true }) })
        .first();
      await card.click();
    }

    // Count secondary timetable cards by unique class titles
    const titles = ['JSS 1 A', 'JSS 2 A', 'JSS 3 A', 'SS 1 A', 'SS 2 A', 'SS 3 A'];
    let withPeriods = 0;
    for (const t of titles) {
      if (await (await findClassCard(page, t)).isVisible().catch(() => false)) withPeriods++;
    }
    note('pass', 'Coverage', `Secondary classes with timetable cards: ${withPeriods}/${titles.length}`);
    expect(withPeriods).toBeGreaterThanOrEqual(5);
  });

  test('edits JSS 1 A: change subject, add period row, save', async ({ page }) => {
    await openSecondaryTimetables(page);

    // Ensure edit target exists
    const targetCard = await findClassCard(page, EDIT_TARGET);
    if (!(await targetCard.isVisible().catch(() => false))) {
      await createShell(page, EDIT_TARGET);
      await openClassCard(page, EDIT_TARGET);
      await autoFillSecondary(page);
    } else {
      await openClassCard(page, EDIT_TARGET);
    }

    // Open Edit Timetable modal
    const editBtn = page.getByRole('button', { name: /edit timetable/i });
    await expect(editBtn).toBeVisible({ timeout: 15_000 });
    await editBtn.click();

    const editModal = page.locator('div.fixed.inset-0').filter({ hasText: /^edit timetable|edit timetable/i });
    await expect(editModal.getByRole('heading', { name: /edit timetable/i })).toBeVisible({
      timeout: 15_000,
    });
    note('pass', 'Edit modal', 'Edit Timetable overlay opened');

    // Count native subject selects before add
    const selectsBefore = await editModal.locator('select').count();
    note('info', 'Edit modal', `Subject selects before add: ${selectsBefore}`);

    // Change first Monday (or first) lesson cell to a different subject if possible
    const firstSelect = editModal.locator('select').first();
    await expect(firstSelect).toBeVisible();
    const options = await firstSelect.locator('option').allTextContents();
    const nonFree = options.filter((o) => !/free period/i.test(o) && o.trim());
    if (nonFree.length >= 2) {
      const current = await firstSelect.inputValue();
      const alt = await firstSelect.locator('option').nth(2).getAttribute('value');
      if (alt && alt !== current && alt !== 'FREE_PERIOD') {
        await firstSelect.selectOption(alt);
        note('pass', 'Edit cell', `Changed a cell subject via native select (value=${alt})`);
      } else {
        await firstSelect.selectOption({ label: nonFree[0] });
        note('info', 'Edit cell', `Selected subject option "${nonFree[0]}"`);
      }
    } else {
      note('minor', 'Edit cell', 'Fewer than 2 subject options — unexpected for Secondary');
    }

    // Add Period Row
    const addRowBtn = editModal.getByRole('button', { name: /add period row/i });
    await expect(addRowBtn).toBeVisible();
    await addRowBtn.click();
    const selectsAfter = await editModal.locator('select').count();
    note(
      selectsAfter > selectsBefore ? 'pass' : 'major',
      'Add Period Row',
      `Selects ${selectsBefore} → ${selectsAfter} (expect +5 for Mon–Fri)`,
    );
    expect(selectsAfter).toBeGreaterThan(selectsBefore);

    // Assign Mathematics on the last row's first day select (new row)
    const lastSelect = editModal.locator('select').nth(selectsAfter - 5); // first day of last row
    const mathOption = lastSelect.locator('option').filter({ hasText: /mathematics/i }).first();
    if (await mathOption.count()) {
      const mathValue = await mathOption.getAttribute('value');
      if (mathValue) {
        await lastSelect.selectOption(mathValue);
        note('pass', 'Add Period Row', 'Assigned Mathematics on new period row (Monday)');
      }
    } else {
      // pick any non-free
      const any = await lastSelect.locator('option').nth(1).getAttribute('value');
      if (any) await lastSelect.selectOption(any);
      note('info', 'Add Period Row', 'Assigned first available subject on new row');
    }

    // Save Changes
    const savePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/timetable/') &&
        res.url().includes('/replace') &&
        res.request().method() === 'PUT',
      { timeout: 90_000 },
    );
    await editModal.getByRole('button', { name: /save changes/i }).click();

    // Validation errors?
    const validation = editModal.getByText(/please fix the following issues/i);
    if (await validation.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const errs = await editModal.locator('li').allTextContents();
      note('blocker', 'Save validation', errs.join(' | '));
      throw new Error(`Save blocked by validation: ${errs.join('; ')}`);
    }

    const saveRes = await savePromise;
    const saveBody = await saveRes.json().catch(() => ({}));
    note(
      saveRes.ok() ? 'pass' : 'blocker',
      'Save API',
      `PUT replace → ${saveRes.status()} ${JSON.stringify(saveBody).slice(0, 220)}`,
    );
    expect(saveRes.ok()).toBeTruthy();

    await expect(page.getByText(/timetable saved successfully/i).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(editModal.getByRole('heading', { name: /edit timetable/i })).toBeHidden({
      timeout: 15_000,
    });
    note('pass', 'Edit flow', 'Edit modal closed after successful save');

    // Period count on card should increase (new row = +5 periods ideally)
    const card = await findClassCard(page, EDIT_TARGET);
    const periodsText = await card.getByText(/\d+\s+periods/i).textContent();
    note('info', 'After save', `${EDIT_TARGET}: ${periodsText?.trim()}`);
  });

  test('edit Cancel with dirty state prompts discard (usability)', async ({ page }) => {
    await openSecondaryTimetables(page);
    await openClassCard(page, EDIT_TARGET);

    await page.getByRole('button', { name: /edit timetable/i }).click();
    const editModal = page.locator('div.fixed.inset-0').filter({ hasText: /edit timetable/i });
    await expect(editModal.getByRole('heading', { name: /edit timetable/i })).toBeVisible({
      timeout: 15_000,
    });

    await editModal.getByRole('button', { name: /add period row/i }).click();
    await editModal.getByRole('button', { name: /^cancel$/i }).click();

    const discard = page.getByRole('heading', { name: /discard changes\?/i });
    await expect(discard).toBeVisible({ timeout: 10_000 });
    note('pass', 'Dirty cancel', 'Unsaved-changes confirm appeared on Cancel');
    await page.getByRole('button', { name: /^discard changes$/i }).click();
    await expect(editModal.getByRole('heading', { name: /edit timetable/i })).toBeHidden({
      timeout: 15_000,
    });
    note('pass', 'Dirty cancel', 'Discard closed edit modal');
  });
});
