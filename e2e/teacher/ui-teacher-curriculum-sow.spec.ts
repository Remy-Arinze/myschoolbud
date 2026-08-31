import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * QA: Teacher class → Scheme of Work + Curriculum tabs (Ada Primary).
 * Captures empty states and API payloads for diagnosis.
 */

const AUTH = path.resolve(__dirname, '../.auth/teacher-primary.json');
const OUT = path.resolve(__dirname, '../../../qa-reports/2026-07-23-teacher-curriculum-sow-findings.json');

type Finding = {
  severity: 'blocker' | 'major' | 'minor' | 'pass' | 'info';
  area: string;
  note: string;
  evidence?: unknown;
};

const findings: Finding[] = [];
function note(severity: Finding['severity'], area: string, message: string, evidence?: unknown) {
  findings.push({ severity, area, note: message, evidence });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

test.describe('QA: Ada Primary — class SoW + Curriculum', () => {
  test.describe.configure({ mode: 'serial', timeout: 6 * 60_000 });
  test.use({ storageState: AUTH });

  test.afterAll(() => {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(
      OUT,
      JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2),
    );
    console.log(`[QA] Wrote ${OUT}`);
  });

  test('Scheme of Work and Curriculum tabs for assigned class', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing teacher-primary.json');

    const apiHits: Array<{ url: string; status: number; body: unknown }> = [];
    page.on('response', async (res) => {
      const url = res.url();
      if (
        !url.includes('/curriculum') &&
        !url.includes('/scheme-of-work') &&
        !url.includes('/schemes') &&
        !url.includes('/my-classes') &&
        !url.includes('/classes/')
      ) {
        return;
      }
      if (res.request().method() !== 'GET') return;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }
      apiHits.push({ url, status: res.status(), body });
    });

    await page.goto('/dashboard/teacher/classes');
    await expect(page).toHaveURL(/\/dashboard\/teacher\/classes/, { timeout: 30_000 });
    note('pass', 'Classes list', 'Teacher classes page loaded');

    // Prefer Primary 1 if present
    const classCard = page
      .locator('a, button, [role="button"], div')
      .filter({ hasText: /Primary\s*1/i })
      .first();
    const anyClass = page.locator('a[href*="/dashboard/teacher/classes/"]').first();

    let opened = false;
    if (await classCard.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await classCard.click();
      opened = true;
      note('info', 'Class open', 'Clicked Primary 1 class entry');
    } else if (await anyClass.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const href = await anyClass.getAttribute('href');
      note('major', 'Class open', `Primary 1 not listed; opening ${href}`);
      await anyClass.click();
      opened = true;
    }

    if (!opened) {
      // Cards may not be links — click first class card title
      const card = page.locator('text=/Primary|JSS|Class/i').first();
      if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await card.click();
        opened = true;
      }
    }

    await page.waitForURL(/\/dashboard\/teacher\/classes\/.+/, { timeout: 30_000 }).catch(() => null);
    const classUrl = page.url();
    note(classUrl.includes('/classes/') ? 'pass' : 'blocker', 'Class detail', `URL: ${classUrl}`);

    // Scheme of Work tab
    const sowTab = page.getByRole('button', { name: /scheme of work/i }).or(
      page.getByText(/^Scheme of Work$/i),
    );
    await expect(sowTab.first()).toBeVisible({ timeout: 20_000 });
    await sowTab.first().click();
    await page.waitForTimeout(2500);

    const sowEmpty = page.getByText(/no active scheme of work/i);
    const sowWeeks = page.locator('text=/Week\\s*\\d+/i');
    const sowEmptyVisible = await sowEmpty.isVisible().catch(() => false);
    const weekCount = await sowWeeks.count();
    if (sowEmptyVisible || weekCount === 0) {
      note('blocker', 'Scheme of Work', 'Empty / no weeks shown for teacher class', {
        emptyCopy: sowEmptyVisible,
        weekCount,
      });
    } else {
      note('pass', 'Scheme of Work', `Showing ${weekCount} week markers`);
    }
    await page.screenshot({
      path: path.resolve(__dirname, '../../../qa-reports/screenshots/teacher-sow-tab.png'),
      fullPage: true,
    });

    // Curriculum tab
    const currTab = page.getByRole('button', { name: /^Curriculum$/i }).or(
      page.getByText(/^Curriculum$/i),
    );
    await currTab.first().click();
    await page.waitForTimeout(2500);

    const currEmpty = page.getByText(/no curriculum found/i);
    const currEmptyVisible = await currEmpty.isVisible().catch(() => false);
    if (currEmptyVisible) {
      note('blocker', 'Curriculum', 'Shows "No Curriculum Found" empty state');
    } else {
      note('pass', 'Curriculum', 'Curriculum items rendered');
    }
    await page.screenshot({
      path: path.resolve(__dirname, '../../../qa-reports/screenshots/teacher-curriculum-tab.png'),
      fullPage: true,
    });

    // Summarize relevant API hits
    const relevant = apiHits.filter(
      (h) =>
        h.url.includes('scheme-of-work') ||
        h.url.includes('/curriculum') ||
        h.url.includes('schemes'),
    );
    for (const hit of relevant) {
      const data = (hit.body as any)?.data;
      const itemCount = Array.isArray(data?.items)
        ? data.items.length
        : Array.isArray(data?.weeks)
          ? data.weeks.length
          : Array.isArray(data)
            ? data.length
            : data
              ? 1
              : 0;
      note(
        hit.status >= 400 ? 'blocker' : itemCount === 0 || data == null ? 'major' : 'pass',
        'API',
        `${hit.status} ${hit.url.replace(/^https?:\/\/[^/]+/, '')} → items/weeks=${itemCount}`,
        {
          status: hit.status,
          path: hit.url.replace(/^https?:\/\/[^/]+/, ''),
          success: (hit.body as any)?.success,
          message: (hit.body as any)?.message,
          dataPreview:
            data == null
              ? null
              : Array.isArray(data)
                ? { length: data.length }
                : {
                    id: data.id,
                    status: data.status,
                    items: data.items?.length,
                    weeks: data.weeks?.length,
                    subject: data.subject,
                  },
        },
      );
    }

    // Soft assertion: keep run green so findings JSON is always written
    note('info', 'Summary', `${findings.filter((f) => f.severity === 'blocker').length} blockers, ${findings.filter((f) => f.severity === 'major').length} majors`);
  });
});
