import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { switchSchoolType } from '../helpers/ui';

/**
 * Assign secondary form teachers from the school admin class page, then
 * confirm the teacher dashboard. Does not seed the assignment.
 */

const abubakarAuth = path.resolve(__dirname, '../.auth/beulah-teacher-abubakar.json');

test.describe.configure({ mode: 'serial', timeout: 240_000 });

async function openSecondaryClass(page: Page, className: string) {
  await page.goto('/dashboard/school/courses');
  await expect(page.getByRole('heading', { name: /classes|courses/i }).first()).toBeVisible({
    timeout: 45_000,
  });
  await switchSchoolType(page, 'SECONDARY');
  await expect(page.getByText(/^Compiling/)).toHaveCount(0, { timeout: 120_000 });
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

async function openTeachers(page: Page) {
  await page.getByRole('button', { name: 'Teachers', exact: true }).click();
  await expect(page.getByRole('heading', { name: /assigned teachers/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/loading subject teachers/i)).toHaveCount(0, { timeout: 30_000 });
}

async function assignFormTeacher(page: Page, teacherName: string) {
  const assign = page.getByRole('button', { name: /assign form teacher/i });
  if (!(await assign.isVisible().catch(() => false))) return;

  await assign.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/select form teacher/i)).toBeVisible({ timeout: 20_000 });
  const search = dialog.getByPlaceholder(/search teachers/i);
  await search.fill(teacherName);
  const choice = dialog
    .getByText(new RegExp(teacherName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    .first();
  await expect(choice).toBeVisible({ timeout: 20_000 });
  await choice.click();
  await dialog.getByRole('button', { name: /^confirm$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText(/assigned to/i)).toBeVisible({ timeout: 15_000 });
}

test.describe('Secondary form teachers', () => {
  test('admin assigns a subject teacher as form teacher of JSS 2 A and another arm', async ({ page }) => {
    await openSecondaryClass(page, 'JSS 2 A');
    await openTeachers(page);

    const english = page.locator('p').filter({ hasText: /english language/i }).first();
    await expect(english).toBeVisible({ timeout: 20_000 });
    const englishRow = english.locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    const jss2Teacher = (await englishRow.locator('a').first().innerText()).replace(/\s+/g, ' ').trim();
    expect(jss2Teacher.length).toBeGreaterThan(3);

    await assignFormTeacher(page, jss2Teacher);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a').filter({ hasText: jss2Teacher }).first()).toBeVisible();
    await expect(page.getByText(/no form teacher assigned/i)).toHaveCount(0);
    await openTeachers(page);
    await expect(page.locator('p').filter({ hasText: /english language/i }).first()).toBeVisible();
    await expect(page.getByText('Form', { exact: true }).first()).toBeVisible();

    await page.goto('/dashboard/school/courses');
    await switchSchoolType(page, 'SECONDARY');
    await expect(page.getByText(/loading classes/i)).toHaveCount(0, { timeout: 40_000 });
    const headings = page.locator('h3');
    await expect(headings.first()).toBeVisible({ timeout: 20_000 });
    const count = await headings.count();
    let secondClass = '';
    for (let i = 0; i < count; i++) {
      const name = (await headings.nth(i).innerText()).trim();
      if (name === 'JSS 2 A') continue;
      const card = headings.nth(i).locator('xpath=ancestor::*[contains(@class,"cursor-pointer")][1]');
      const text = ((await card.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
      if (!/[1-9]\d* student/i.test(text)) continue;
      if (!/no form teacher assigned/i.test(text)) continue;
      secondClass = name;
      break;
    }
    if (secondClass) {
      await openSecondaryClass(page, secondClass);
      await openTeachers(page);
      const nameLink = page
        .getByRole('heading', { name: /assigned teachers/i })
        .locator('xpath=following::a[starts-with(@href,"/dashboard/school/staff/")][1]');
      await expect(nameLink).toBeVisible({ timeout: 20_000 });
      const secondTeacher = (await nameLink.innerText()).replace(/\s+/g, ' ').trim();
      expect(secondTeacher.length).toBeGreaterThan(3);

      await assignFormTeacher(page, secondTeacher);
      await expect(page.locator('a').filter({ hasText: secondTeacher }).first()).toBeVisible();
      await expect(page.getByText(/no form teacher assigned/i)).toHaveCount(0);
      await openTeachers(page);
      await expect(page.getByText('Form', { exact: true }).first()).toBeVisible();
    }
  });
});

test.describe('JSS 2 A form teacher dashboard', () => {
  test.use({ storageState: abubakarAuth });

  test('sees My Form and still teaches other classes', async ({ page }) => {
    test.skip(!fs.existsSync(abubakarAuth), 'Missing beulah-teacher-abubakar.json');
    await page.addInitScript(() => {
      localStorage.setItem('selectedSchoolType', 'SECONDARY');
    });
    await page.goto('/dashboard/teacher/overview');
    await expect(page).toHaveURL(/\/dashboard\/teacher/, { timeout: 45_000 });
    await expect(page.getByText(/^Compiling/)).toHaveCount(0, { timeout: 120_000 });

    const myForm = page.getByRole('link', { name: /^My Form/ });
    await expect(myForm.first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('a[href="/dashboard/teacher/classes"]')).toBeVisible();

    await myForm.first().click();
    await page.waitForURL(/\/dashboard\/teacher\/classes\/[^/?#]+/, { timeout: 30_000 });
    await expect(page.getByText('My Form', { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Form Management')).toBeVisible();
    await expect(page.getByText(/\d+ students · \d+ assessments · \d+ grades/)).toBeVisible();

    await page.goto('/dashboard/teacher/classes');
    await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/?$/, { timeout: 20_000 });
    await expect
      .poll(async () => (await page.locator('main').innerText()) || '', { timeout: 40_000 })
      .toMatch(/JSS 2 A/i);
    const classList = await page.locator('main').innerText();
    expect(classList).toMatch(/JSS 2 B/i);

    await page.getByText('JSS 2 A', { exact: true }).first().click();
    await page.waitForURL(/\/dashboard\/teacher\/classes\/[^/?#]+/, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    await expect(page.getByRole('button', { name: /create assessment/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    const summary = page.getByTestId('form-reports-summary');
    await expect(summary).toBeVisible({ timeout: 20_000 });
    await expect(summary.getByText(/students enrolled/i)).toBeVisible();
    await expect(summary.getByText(/exam average/i)).toBeVisible();
    await expect(summary.getByText(/assessment average/i)).toBeVisible();
    await expect(page.getByText(/gradebook is empty|class findings/i)).toBeVisible();
  });
});
