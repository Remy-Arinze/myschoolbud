import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { loginAsSchoolAdmin } from './helpers/auth';

const authFile = path.join(__dirname, '.auth/school-admin.json');

setup('authenticate as school admin', async ({ page }) => {
  await loginAsSchoolAdmin(page);
  await expect(page).toHaveURL(/\/dashboard\/school/);
  await page.context().storageState({ path: authFile });
});
