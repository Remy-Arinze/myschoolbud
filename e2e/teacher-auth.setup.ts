import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { loginAsTeacher } from './helpers/auth';

/**
 * UI login as Primary teacher (Ada). Paste OTP into e2e/.otp when prompted.
 * Saves: e2e/.auth/teacher-primary.json
 */
const authFile = path.join(__dirname, '.auth/teacher-primary.json');

setup('authenticate as primary teacher via UI', async ({ page }) => {
  console.log(
    '\n[e2e] Teacher UI login\n' +
      '      Email:    remyarinze+e2e-t-pri@gmail.com\n' +
      '      Password: Test1234!\n' +
      '      Paste 6-digit OTP into: frontend/e2e/.otp\n',
  );

  await loginAsTeacher(page, 'primary');
  await expect(page).toHaveURL(/\/dashboard\/teacher/);
  await page.context().storageState({ path: authFile });
  console.log(`[e2e] Saved teacher session → ${authFile}`);
});
