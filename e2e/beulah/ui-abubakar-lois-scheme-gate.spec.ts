import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { askLois, openLois } from '../helpers/lois-chat';

/**
 * When Lois cannot draft an assessment because the scheme is unpublished,
 * the tool result points the teacher at manual creation and this class's assessments tab.
 */

const AUTH = path.resolve(__dirname, '../.auth/beulah-teacher-abubakar.json');

async function settle(page: Page) {
  await expect(page.getByText(/^Compiling/)).toHaveCount(0, { timeout: 120_000 });
}

test.describe('Abubakar Lois scheme gate', () => {
  test.use({ storageState: AUTH });
  test.describe.configure({ timeout: 8 * 60_000 });

  test('refers a blocked assessment to the class assessments tab', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing beulah-teacher-abubakar.json');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));

    const streams: Promise<string>[] = [];
    page.on('response', (res) => {
      if (res.request().method() !== 'POST' || !/\/ai\/chat\/stream/.test(res.url())) return;
      streams.push(res.text().catch(() => ''));
    });

    await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await expect
      .poll(async () => (await page.locator('main').innerText()) || '', { timeout: 40_000 })
      .toMatch(/JSS 2 A/i);
    await page.getByText('JSS 2 A', { exact: true }).first().click();
    await page.waitForURL(/\/dashboard\/teacher\/classes\/([^/?#]+)/, { timeout: 30_000 });
    const classId = page.url().match(/\/classes\/([^/?#]+)/)?.[1] ?? '';
    expect(classId).toBeTruthy();

    await openLois(page);
    const reply = await askLois(
      page,
      'Create a short assignment, not an exam, for my JSS 2 A English Language class. Topic nouns. Exactly 3 short questions.',
      180_000,
    );
    const stream = (await Promise.all(streams)).join('\n');

    expect(stream).toContain('"reason":"scheme_unpublished"');
    expect(stream).toContain(`/dashboard/teacher/classes/${classId}?tab=assessments`);
    expect(stream).toContain(`source=manual`);
    expect(stream).toContain(`classId=${classId}`);

    expect(reply).toMatch(/scheme of work/i);
    expect(reply).toMatch(/not published|isn['’]t published|unpublished/i);
    expect(reply).toMatch(/manual/i);
    expect(reply).not.toMatch(/\b[A-D]\)/);
    expect(reply).not.toContain(classId);

    const card = page.getByTestId('lois-scheme-manual');
    await expect(card).toBeVisible();
    await expect(card.getByText(/manual assessment creation/i)).toBeVisible();
    const assessments = page.getByTestId('lois-class-assessments-link');
    await expect(assessments).toHaveAttribute('href', `/dashboard/teacher/classes/${classId}?tab=assessments`);
    await expect(page.getByTestId('lois-manual-assessment-link')).toHaveAttribute(
      'href',
      `/dashboard/teacher/assessments/new?source=manual&classId=${classId}`,
    );
    await expect(page.getByRole('button', { name: /edit in full screen/i })).toHaveCount(0);

    await assessments.click();
    await page.waitForURL(new RegExp(`/dashboard/teacher/classes/${classId}\\?tab=assessments`), { timeout: 20_000 });
    await expect(page.getByRole('button', { name: /create assessment/i })).toBeVisible({ timeout: 20_000 });
  });
});
