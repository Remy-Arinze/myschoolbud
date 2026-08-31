import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: Import Agora curriculum for Primary 1 A (Get / Standard path).
 * Prefers Mathematics, then English, then any unset subject.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const reportPath = path.resolve(
  __dirname,
  '../../../qa-reports/2026-07-23-curriculum-primary1a-import-findings.json',
);

function note(severity: Finding['severity'], area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

const SUBJECT_PRIORITY = [/mathematics/i, /english/i, /basic science/i];

async function openPrimary1ACurriculum(page: Page) {
  await page.goto('/dashboard/school/courses');
  await expect(page.getByRole('heading', { name: /classes|courses/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await switchSchoolType(page, 'PRIMARY');

  await page
    .waitForResponse(
      (r) =>
        r.url().includes('/classes') &&
        r.request().method() === 'GET' &&
        !r.url().includes('/timetable'),
      { timeout: 45_000 },
    )
    .catch(() => null);

  const classCard = page
    .locator('div.cursor-pointer, [class*="cursor-pointer"]')
    .filter({ hasText: /Primary\s*1\s*A/i })
    .first();
  await expect(classCard).toBeVisible({ timeout: 30_000 });

  await Promise.all([
    page.waitForURL(/\/dashboard\/school\/courses\/[^/]+/, { timeout: 20_000 }),
    classCard.click(),
  ]);

  const tab = page.locator('button, a, [role="tab"]').filter({ hasText: /^Curriculum$/i }).first();
  await expect(tab).toBeVisible({ timeout: 20_000 });
  await tab.click();

  await expect(page.getByRole('heading', { name: /class curriculum/i })).toBeVisible({
    timeout: 45_000,
  });
  note('pass', 'Navigation', 'Opened Primary 1 A → Curriculum');
}

async function pickSubjectCard(page: Page) {
  // Prefer an unset subject in priority order
  for (const name of SUBJECT_PRIORITY) {
    const card = page
      .locator('div.cursor-pointer')
      .filter({ hasText: name })
      .filter({ hasText: /set up curriculum|not set up/i })
      .first();
    if (await card.isVisible().catch(() => false)) {
      const label = (await card.locator('h3').first().innerText().catch(() => name.source)) || name.source;
      note('info', 'Subject', `Importing unset subject: ${label}`);
      await card.click();
      return label;
    }
  }

  // Any unset
  const anyUnset = page
    .locator('div.cursor-pointer')
    .filter({ hasText: /set up curriculum/i })
    .first();
  if (await anyUnset.isVisible().catch(() => false)) {
    const label = await anyUnset.locator('h3').first().innerText();
    note('info', 'Subject', `Importing unset subject: ${label}`);
    await anyUnset.click();
    return label;
  }

  // Already imported — use Change on Mathematics / first published
  for (const name of SUBJECT_PRIORITY) {
    const card = page.locator('div.cursor-pointer').filter({ hasText: name }).first();
    if (await card.isVisible().catch(() => false)) {
      const change = card.getByRole('button', { name: /^change$/i });
      if (await change.isVisible().catch(() => false)) {
        note('info', 'Subject', `Re-importing via Change (${name.source})`);
        page.once('dialog', (d) => d.accept().catch(() => {}));
        await change.click();
        return name.source;
      }
      await card.click();
      // If detail modal, look for change/setup
      const setupChange = page.getByRole('button', { name: /^change$/i }).first();
      if (await setupChange.isVisible().catch(() => false)) {
        await setupChange.click();
      }
      return name.source;
    }
  }

  throw new Error('No Primary 1 A subject card found to import');
}

test.describe('QA: Primary 1 A Agora import', () => {
  test.describe.configure({ mode: 'serial', timeout: 6 * 60_000 });

  test.afterAll(() => {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2),
    );
    console.log(`[QA] Wrote findings → ${reportPath}`);
  });

  test('imports Standard Agora pack for a Primary 1 A subject', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openPrimary1ACurriculum(page);

    const subjectLabel = await pickSubjectCard(page);

    // Library fetch starts as soon as Standard (default) tab mounts — listen before assert
    const libraryResPromise = page.waitForResponse(
      (r) => r.url().includes('/curriculum/agora-library') && r.request().method() === 'GET',
      { timeout: 30_000 },
    );

    await expect(page.getByText(/term outlining/i).first()).toBeVisible({ timeout: 15_000 });
    note('pass', 'Setup modal', `Setup opened for ${subjectLabel}`);

    // Ensure Standard tab is active (default, but click if needed)
    await page.getByRole('button', { name: /^(bud library|standard)$/i }).click();

    const libraryRes = await libraryResPromise.catch(() => null);
    let items: unknown[] = [];
    if (libraryRes) {
      const libraryBody = await libraryRes.json().catch(() => null);
      items = Array.isArray(libraryBody?.data)
        ? libraryBody.data
        : Array.isArray(libraryBody)
          ? libraryBody
          : [];
      note(
        items.length > 0 ? 'pass' : 'blocker',
        'Agora library',
        `GET agora-library → ${libraryRes.status()}, items=${items.length}, url=${libraryRes.url()}`,
      );
    } else {
      note('info', 'Agora library', 'No network observe (likely RTK cache); asserting UI templates instead');
    }

    await expect(page.getByRole('heading', { name: /select master curriculum/i })).toBeVisible({
      timeout: 20_000,
    });

    const noTemplates = page.getByText(/no templates available/i);
    const hasTemplates = !(await noTemplates.isVisible().catch(() => false));
    if (!hasTemplates && items.length === 0) {
      note('blocker', 'Get curriculum', 'No Agora templates for this Primary 1 subject/grade');
      // Dump page text for diagnosis
      const modalText = await page.locator('div.fixed.inset-0').last().innerText().catch(() => '');
      note('info', 'Modal dump', modalText.slice(0, 400).replace(/\s+/g, ' '));
    }
    expect(hasTemplates || items.length > 0, 'Expected seeded Primary_1 packs in library').toBeTruthy();
    await expect(noTemplates).toHaveCount(0);

    // Open first template → preview → Import
    const templateCard = page
      .locator('div.cursor-pointer')
      .filter({ hasText: /v\d/i })
      .first();
    await expect(templateCard).toBeVisible({ timeout: 15_000 });
    await templateCard.click();

    const importBtn = page.getByRole('button', { name: /^import$/i });
    await expect(importBtn).toBeVisible({ timeout: 25_000 });
    note('pass', 'Preview', 'Agora preview modal opened with Import CTA');
    await importBtn.click();

    // Accept overwrite dialog if re-importing
    page.once('dialog', async (d) => {
      note('info', 'Overwrite', d.message().slice(0, 120));
      await d.accept();
    });

    const useTemplate = page.getByRole('button', { name: /use template/i });
    await expect(useTemplate).toBeVisible({ timeout: 10_000 });
    await expect(useTemplate).toBeEnabled({ timeout: 5_000 });

    const setupResPromise = page.waitForResponse(
      (r) => r.url().includes('/curriculum/schemes/setup') && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await useTemplate.click();

    const setupRes = await setupResPromise;
    const setupText = await setupRes.text().catch(() => '');
    note(
      setupRes.ok() ? 'pass' : 'blocker',
      'Import API',
      `POST schemes/setup → ${setupRes.status()} ${setupText.slice(0, 220)}`,
    );
    expect(setupRes.ok(), `schemes/setup failed: ${setupText.slice(0, 300)}`).toBeTruthy();

    await expect(
      page.getByText(/curriculum setup complete|curriculum replaced|imported from (agora|bud library)|bud library curriculum|agora curriculum|published/i).first(),
    ).toBeVisible({ timeout: 30_000 });
    note('pass', 'Import UI', 'Success toast / published state visible');

    // Back on list: subject should show imported/published
    await expect(page.getByRole('heading', { name: /class curriculum/i })).toBeVisible({
      timeout: 20_000,
    });

    const publishedStat = page.getByText(/^published$/i).first();
    await expect(publishedStat).toBeVisible();

    // Subject card should no longer say set up for that subject if we can find it
    const subjectCard = page.locator('div.cursor-pointer').filter({ hasText: new RegExp(subjectLabel, 'i') }).first();
    if (await subjectCard.isVisible().catch(() => false)) {
      await expect
        .poll(async () => (await subjectCard.innerText()).replace(/\s+/g, ' '), { timeout: 15_000 })
        .toMatch(/imported from (agora|bud library)|bud library curriculum|agora curriculum|published|review/i);
      note('pass', 'Card state', `${subjectLabel} card shows imported/published state`);
    }

    expect(pageErrors.filter((e) => /hooks|is not defined/i.test(e))).toHaveLength(0);
  });
});
