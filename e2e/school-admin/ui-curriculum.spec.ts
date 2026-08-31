import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: School-admin curriculum / scheme-of-work setup flow.
 * Dependency for teacher curriculum/SoW testing.
 *
 * Journey:
 *  Classes → open class with timetable → Curriculum tab → Setup subject
 *  → Standard (Agora get) and/or Custom (generate yourself)
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const reportPath = path.resolve(__dirname, '../../../qa-reports/2026-07-23-curriculum-qa-findings.json');

function note(severity: Finding['severity'], area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

async function openClassCurriculum(page: Page, type: 'PRIMARY' | 'SECONDARY', classLabel: RegExp) {
  await page.goto('/dashboard/school/courses');
  await expect(page.getByRole('heading', { name: /classes|courses/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await switchSchoolType(page, type);

  await page
    .waitForResponse(
      (r) =>
        r.url().includes('/classes') &&
        r.request().method() === 'GET' &&
        !r.url().includes('/timetable'),
      { timeout: 45_000 },
    )
    .catch(() => null);

  // Prefer the clickable class card (not edit/delete icons)
  const classCard = page
    .locator('div.cursor-pointer, [class*="cursor-pointer"]')
    .filter({ hasText: classLabel })
    .first();
  await expect(classCard).toBeVisible({ timeout: 30_000 });

  await Promise.all([
    page.waitForURL(/\/dashboard\/school\/courses\/[^/]+/, { timeout: 20_000 }),
    classCard.click(),
  ]);

  const curriculumTab = page.getByRole('button', { name: /^curriculum$/i }).or(
    page.getByRole('tab', { name: /^curriculum$/i }),
  );
  // Tabs may be button-like links
  const tab = page.locator('button, a, [role="tab"]').filter({ hasText: /^Curriculum$/i }).first();
  await expect(tab).toBeVisible({ timeout: 20_000 });
  await tab.click();

  note('pass', 'Navigation', `Opened ${type} class curriculum tab`);
}

test.describe('QA: school admin curriculum flow', () => {
  test.describe.configure({ mode: 'serial', timeout: 8 * 60_000 });

  test.afterAll(() => {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));
    console.log(`[QA] Wrote findings → ${reportPath}`);
  });

  test('PRIMARY: curriculum tab reflects timetable subjects and opens setup', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    await openClassCurriculum(page, 'PRIMARY', /Primary\s*1\s*A/i);

    // Either subjects list or No Timetable message
    const noTt = page.getByRole('heading', { name: /no timetable set up/i });
    const classCurriculum = page.getByRole('heading', { name: /class curriculum/i });
    const emptyTerm = page.getByText(/no active term/i);

    await expect
      .poll(async () => {
        if (await noTt.isVisible().catch(() => false)) return 'no-timetable';
        if (await classCurriculum.isVisible().catch(() => false)) return 'subjects';
        if (await emptyTerm.isVisible().catch(() => false)) return 'no-term';
        return 'loading';
      }, { timeout: 45_000 })
      .not.toBe('loading');

    if (await noTt.isVisible().catch(() => false)) {
      note('blocker', 'Prerequisite', 'PRIMARY class shows No Timetable — curriculum subjects cannot load');
      await expect(page.getByRole('link', { name: /go to timetables/i })).toBeVisible();
      return;
    }
    if (await emptyTerm.isVisible().catch(() => false)) {
      note('blocker', 'Prerequisite', 'No active term — curriculum tab blocked');
      return;
    }

    await expect(classCurriculum).toBeVisible();
    note('pass', 'Subject discovery', 'Class Curriculum header visible (timetable subjects discovered)');

    // Stats panel
    const totalLabel = page.getByText(/total subjects/i).first();
    await expect(totalLabel).toBeVisible();

    // Open first unset / any subject card
    const initialize = page.getByText(/set up curriculum/i).first();
    const changeBtn = page.getByRole('button', { name: /^change$/i }).first();
    if (await initialize.isVisible().catch(() => false)) {
      await initialize.click({ force: true });
    } else if (await changeBtn.isVisible().catch(() => false)) {
      note('info', 'State', 'Subjects already have schemes — opening Change/setup');
      await changeBtn.click();
    } else {
      // Click first subject card area
      const card = page.locator('div.cursor-pointer').filter({ hasText: /not set up|imported from (agora|bud library)|published|bud library curriculum|agora curriculum/i }).first();
      await card.click();
    }

    // Setup modal
    const setupHeading = page.getByText(/term outlining/i).first();
    await expect(setupHeading).toBeVisible({ timeout: 15_000 });
    note('pass', 'Setup modal', 'Curriculum setup modal opened');

    // Standard (Agora) tab
    const standardTab = page.getByRole('button', { name: /^(bud library|standard)$/i });
    await expect(standardTab).toBeVisible();
    await standardTab.click();

    const libraryRes = await page
      .waitForResponse(
        (r) => r.url().includes('/curriculum/agora-library') && r.request().method() === 'GET',
        { timeout: 30_000 },
      )
      .catch(() => null);

    if (libraryRes) {
      const body = await libraryRes.json().catch(() => null);
      const items = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      note(
        items.length > 0 ? 'pass' : 'blocker',
        'Agora library',
        `GET agora-library → ${libraryRes.status()}, items=${items.length}`,
      );
    } else {
      note('major', 'Agora library', 'Did not observe agora-library response');
    }

    const noTemplates = page.getByText(/no templates available/i);
    const masterHeading = page.getByRole('heading', { name: /select master curriculum/i });
    await expect(masterHeading).toBeVisible({ timeout: 20_000 });

    if (await noTemplates.isVisible().catch(() => false)) {
      note(
        'blocker',
        'Get curriculum',
        'Empty Agora library for this subject/grade — school cannot "get" a curriculum until Super Admin publishes packs',
      );
    } else {
      // Try select first template via preview → Import → Use Template
      const firstCard = page.locator('div.cursor-pointer').filter({ hasText: /v\d/i }).first();
      await firstCard.click();
      const importBtn = page.getByRole('button', { name: /^import$/i });
      await expect(importBtn).toBeVisible({ timeout: 20_000 });
      await importBtn.click();

      const useTemplate = page.getByRole('button', { name: /use template/i });
      await expect(useTemplate).toBeVisible({ timeout: 10_000 });

      const disabled = await useTemplate.isDisabled();
      if (disabled) {
        note(
          'major',
          'Get curriculum UX',
          'Use Template is disabled (likely creditsRemaining < 50 gate applied to free Agora path)',
        );
      } else {
        const setupResPromise = page.waitForResponse(
          (r) =>
            r.url().includes('/curriculum/schemes/setup') && r.request().method() === 'POST',
          { timeout: 60_000 },
        );
        await useTemplate.click();
        const setupRes = await setupResPromise;
        note(
          setupRes.ok() ? 'pass' : 'blocker',
          'Agora setup',
          `POST schemes/setup → ${setupRes.status()} ${await setupRes.text().then((t) => t.slice(0, 200))}`,
        );
        if (setupRes.ok()) {
          await expect(page.getByText(/curriculum setup complete|imported from (agora|bud library)|bud library curriculum|agora curriculum|published/i).first()).toBeVisible({
            timeout: 30_000,
          });
        }
      }
    }

    // Custom tab usability — always exercise even when Agora library is empty
    const customTab = page.getByRole('button', { name: /^custom$/i });
    await customTab.click();
    await expect(page.getByText(/upload|document|vault|compile|scan|private/i).first()).toBeVisible({
      timeout: 15_000,
    });
    note('pass', 'Custom path', 'Custom (generate yourself) tab renders');

    // Soft check: Use Template / compile button credit gate on Custom
    const compileBtn = page.getByRole('button', { name: /compile academic year|scan & split|use template/i }).first();
    if (await compileBtn.isVisible().catch(() => false)) {
      const disabledCustom = await compileBtn.isDisabled();
      note(
        'info',
        'Custom CTA',
        `Custom primary CTA visible, disabled=${disabledCustom}`,
      );
    }

    const lowCredits = page.getByText(/need .*credits|insufficient|at least 50/i);
    if (await lowCredits.first().isVisible().catch(() => false)) {
      note('info', 'Credits', `Credit messaging visible: ${(await lowCredits.first().innerText()).slice(0, 120)}`);
    }

    // Close modal
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('button').filter({ has: page.locator('svg') }).first().click().catch(() => {});

    if (pageErrors.length) {
      note('major', 'Runtime', pageErrors.slice(0, 3).join(' | '));
    }

    // Soft assert: no crash
    expect(pageErrors.some((e) => e.includes('Rendered more hooks'))).toBe(false);
  });

  test('SECONDARY: curriculum tab reachable for JSS 1 A', async ({ page }) => {
    await openClassCurriculum(page, 'SECONDARY', /JSS\s*1\s*A/i);

    const noTt = page.getByRole('heading', { name: /no timetable set up/i });
    const classCurriculum = page.getByRole('heading', { name: /class curriculum/i });
    const emptyTerm = page.getByText(/no active term/i);

    await expect
      .poll(async () => {
        if (await noTt.isVisible().catch(() => false)) return 'no-timetable';
        if (await classCurriculum.isVisible().catch(() => false)) return 'subjects';
        if (await emptyTerm.isVisible().catch(() => false)) return 'no-term';
        return 'loading';
      }, { timeout: 45_000 })
      .not.toBe('loading');

    if (await emptyTerm.isVisible().catch(() => false)) {
      note('blocker', 'Secondary session', 'SECONDARY curriculum blocked — no active term for secondary type');
      return;
    }
    if (await noTt.isVisible().catch(() => false)) {
      note('blocker', 'Secondary timetable', 'JSS 1 A has no timetable subjects for curriculum');
      return;
    }

    await expect(classCurriculum).toBeVisible();
    note('pass', 'Secondary', 'JSS 1 A Class Curriculum subjects visible');
  });
});
