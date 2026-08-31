import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { openClassCurriculumTab, importAgoraPackForSubject } from '../helpers/curriculum-import';

/**
 * Bulk QA: Import more Agora curricula for Primary 1 A and JSS 1 A via UI.
 * Uses Standard (Get Agora) path — no AI credits.
 */

type ResultRow = {
  classLabel: string;
  subject: string;
  status: 'imported' | 'skipped' | 'failed';
  error?: string;
};

const results: ResultRow[] = [];
const reportPath = path.resolve(
  __dirname,
  '../../../qa-reports/2026-07-23-curriculum-bulk-import-findings.json',
);

/** Primary 1 packs seeded for E2E (Mathematics already imported in prior run). */
const PRIMARY_1_SUBJECTS = [
  'English Language',
  'Basic Science',
  'Civic Education',
  'Social Studies',
  'Physical & Health Education',
  'Cultural & Creative Arts',
  'Basic Technology',
  'Nigerian Language',
  'Religious Knowledge Studies',
  'Mathematics', // skip if already done
];

/** JSS 1 packs that match seeded Agora library (timetable-linked subjects). */
const JSS_1_SUBJECTS = [
  'Civic Education',
  'Christian Religious Studies',
  'Computer Science',
  'Agricultural Science',
  'History',
  'Geography',
  'Literature in English',
  'Fine Arts',
  'Music',
  'Biology',
  'Economics',
  'Commerce',
  'Physics',
  'Government',
  'Food & Nutrition',
  'Technical Drawing',
  'Further Mathematics',
];

test.describe('QA: Bulk Agora curriculum import — Primary 1 & JSS 1', () => {
  test.describe.configure({ mode: 'serial', timeout: 45 * 60_000 });

  test.afterAll(() => {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          imported: results.filter((r) => r.status === 'imported').length,
          skipped: results.filter((r) => r.status === 'skipped').length,
          failed: results.filter((r) => r.status === 'failed').length,
          results,
        },
        null,
        2,
      ),
    );
    console.log(`[QA] Wrote bulk import findings → ${reportPath}`);
  });

  test('imports multiple Primary 1 A subjects from Agora', async ({ page }) => {
    await openClassCurriculumTab(page, 'PRIMARY', /Primary\s*1\s*A/i);

    let imported = 0;
    for (const subject of PRIMARY_1_SUBJECTS) {
      const card = page.locator('div.cursor-pointer').filter({ hasText: new RegExp(subject, 'i') }).first();
      const visible = await card.isVisible().catch(() => false);
      if (!visible) {
        results.push({
          classLabel: 'Primary 1 A',
          subject,
          status: 'skipped',
          error: 'Subject not on curriculum list (no timetable link)',
        });
        console.log(`[QA:skip] Primary 1 A — ${subject} (not listed)`);
        continue;
      }

      try {
        const status = await importAgoraPackForSubject(page, subject);
        results.push({ classLabel: 'Primary 1 A', subject, status });
        console.log(`[QA:${status}] Primary 1 A — ${subject}`);
        if (status === 'imported') imported += 1;
      } catch (err: any) {
        results.push({
          classLabel: 'Primary 1 A',
          subject,
          status: 'failed',
          error: String(err?.message || err).slice(0, 240),
        });
        console.log(`[QA:failed] Primary 1 A — ${subject}: ${err?.message || err}`);
        // Dismiss any open modal so next subject can proceed
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
        // Re-ensure we're on curriculum list
        const heading = page.getByRole('heading', { name: /class curriculum/i });
        if (!(await heading.isVisible().catch(() => false))) {
          await openClassCurriculumTab(page, 'PRIMARY', /Primary\s*1\s*A/i);
        }
      }
    }

    expect(imported, 'Expected at least one new Primary 1 A import').toBeGreaterThanOrEqual(1);
  });

  test('imports multiple JSS 1 A subjects from Agora', async ({ page }) => {
    await openClassCurriculumTab(page, 'SECONDARY', /JSS\s*1\s*A/i);

    let imported = 0;
    for (const subject of JSS_1_SUBJECTS) {
      const card = page.locator('div.cursor-pointer').filter({ hasText: new RegExp(subject, 'i') }).first();
      const visible = await card.isVisible().catch(() => false);
      if (!visible) {
        results.push({
          classLabel: 'JSS 1 A',
          subject,
          status: 'skipped',
          error: 'Subject not on curriculum list (no timetable link)',
        });
        console.log(`[QA:skip] JSS 1 A — ${subject} (not listed)`);
        continue;
      }

      try {
        const status = await importAgoraPackForSubject(page, subject);
        results.push({ classLabel: 'JSS 1 A', subject, status });
        console.log(`[QA:${status}] JSS 1 A — ${subject}`);
        if (status === 'imported') imported += 1;
      } catch (err: any) {
        results.push({
          classLabel: 'JSS 1 A',
          subject,
          status: 'failed',
          error: String(err?.message || err).slice(0, 240),
        });
        console.log(`[QA:failed] JSS 1 A — ${subject}: ${err?.message || err}`);
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(500);
        const heading = page.getByRole('heading', { name: /class curriculum/i });
        if (!(await heading.isVisible().catch(() => false))) {
          await openClassCurriculumTab(page, 'SECONDARY', /JSS\s*1\s*A/i);
        }
      }
    }

    expect(imported, 'Expected at least one new JSS 1 A import').toBeGreaterThanOrEqual(1);
  });
});
