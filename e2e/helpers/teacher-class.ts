import { expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const TEACHER_AUTH = path.resolve(__dirname, '../.auth/teacher-primary.json');
export const STUDENT_AUTH = path.resolve(__dirname, '../.auth/student-primary1a.json');
export const ASSESSMENT_FIXTURE = path.resolve(__dirname, '../.assessment-e2e-fixture.json');
export const GRADES_FIXTURE = path.resolve(__dirname, '../.grades-e2e-fixture.json');
export const API = process.env.API_URL || 'http://localhost:4000';

export function getAuthFromStorage(fileName: string) {
  const raw = JSON.parse(fs.readFileSync(fileName, 'utf8'));
  const persist = JSON.parse(
    raw.origins[0].localStorage.find((x: { name: string }) => x.name === 'persist:auth').value,
  );
  return {
    token: JSON.parse(persist.token) as string,
    schoolId: JSON.parse(persist.tenantId) as string,
  };
}

export async function openPrimaryClass(page: Page) {
  await page.goto('/dashboard/teacher/overview');
  await expect(page).toHaveURL(/\/dashboard\/teacher/, { timeout: 30_000 });

  const myClassLink = page.getByRole('link', { name: /^my class$/i });
  if (await myClassLink.isVisible({ timeout: 15_000 }).catch(() => false)) {
    const href = await myClassLink.getAttribute('href');
    await myClassLink.click();
    await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 30_000 });
    const classId = page.url().match(/\/classes\/([^/?#]+)/)?.[1] ?? href?.split('/').pop() ?? '';
    return classId;
  }

  await page.goto('/dashboard/teacher/classes');
  const classLink = page.locator('a[href*="/dashboard/teacher/classes/"]').first();
  await expect(classLink).toBeVisible({ timeout: 20_000 });
  const href = await classLink.getAttribute('href');
  await classLink.click();
  await expect(page).toHaveURL(/\/dashboard\/teacher\/classes\/[^/]+/, { timeout: 30_000 });
  const classId = page.url().match(/\/classes\/([^/?#]+)/)?.[1] ?? href?.split('/').pop() ?? '';
  return classId;
}

export async function goToClassTab(page: Page, tabName: string) {
  const tabBtn = page.getByRole('button', { name: tabName, exact: true });
  await expect(tabBtn).toBeVisible({ timeout: 15_000 });
  await tabBtn.click();
}

/** Close Lois chat panel if it steals focus from modals. */
export async function dismissLoisIfOpen(page: Page) {
  for (let i = 0; i < 3; i++) {
    const loisPanel = page.getByText(/how can i help|authenticated:/i).first();
    if (!(await loisPanel.isVisible({ timeout: 500 }).catch(() => false))) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}
