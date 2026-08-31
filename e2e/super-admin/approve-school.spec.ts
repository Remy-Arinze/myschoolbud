import { test, expect } from '@playwright/test';
import { loginWithOtp } from '../helpers/login';

/**
 * Approves "Agora E2E Demo Academy" from the super-admin pending schools page.
 * Requires SUPER ADMIN credentials + OTP pasted into e2e/.otp
 */
test('super admin approves E2E school registration', async ({ page }) => {
  const email = process.env.E2E_SUPER_ADMIN_EMAIL || 'agoraschoolspace@gmail.com';
  const password = process.env.E2E_SUPER_ADMIN_PASSWORD || 'Test1234!';

  await loginWithOtp(page, email, password, /\/dashboard\/super-admin/);

  await page.goto('/dashboard/super-admin/schools/pending');
  await expect(page.getByText(/pending|unapproved|applications/i).first()).toBeVisible({
    timeout: 20_000,
  });

  const schoolCard = page.getByText('Agora E2E Demo Academy').locator('..').locator('..').locator('..');
  await expect(page.getByText('Agora E2E Demo Academy')).toBeVisible({ timeout: 15_000 });

  // Click Approve on the card that contains this school name
  const card = page.locator('div').filter({ hasText: 'Agora E2E Demo Academy' }).filter({
    has: page.getByRole('button', { name: /approve school/i }),
  }).first();

  await card.getByRole('button', { name: /approve school/i }).click();

  // School should leave pending list (or show success toast / empty state)
  await expect(page.getByText('Agora E2E Demo Academy')).toHaveCount(0, { timeout: 20_000 });
});
