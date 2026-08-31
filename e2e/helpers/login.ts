import { expect, type Page } from '@playwright/test';
import { waitForLoginOtp } from './otp';

export async function loginWithOtp(
  page: Page,
  email: string,
  password: string,
  expectedUrl: RegExp,
) {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();

  const emailInput = page.locator('#email-input');
  const passwordInput = page.locator('#password-input');

  await emailInput.click();
  await emailInput.fill('');
  await emailInput.pressSequentially(email, { delay: 15 });
  await expect(emailInput).toHaveValue(email);

  await passwordInput.click();
  await passwordInput.fill('');
  await passwordInput.pressSequentially(password, { delay: 15 });
  await expect(passwordInput).toHaveValue(password);

  const signIn = page.getByRole('button', { name: /sign in/i });
  await expect(signIn).toBeEnabled({ timeout: 10_000 });

  const loginResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/auth/login') && res.request().method() === 'POST',
    { timeout: 90_000 },
  );

  await signIn.click();

  const loginResponse = await loginResponsePromise;
  const status = loginResponse.status();
  let bodyText = '';
  try {
    bodyText = await loginResponse.text();
  } catch {
    bodyText = '';
  }
  console.log(`[e2e] POST /auth/login → ${status} ${bodyText.slice(0, 300)}`);

  if (status >= 400) {
    throw new Error(`Login API failed (${status}): ${bodyText.slice(0, 500)}`);
  }

  // OTP step — email send can be slow
  await expect(page.getByRole('heading', { name: /verification required/i })).toBeVisible({
    timeout: 60_000,
  });

  const otp = await waitForLoginOtp(email);

  const inputs = page.locator('input[inputmode="numeric"]');
  await expect(inputs).toHaveCount(6);
  // Clear any leftover digits, then type one-by-one.
  // OtpVerification auto-submits when all 6 digits are filled — do not click Verify.
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).click();
    await inputs.nth(i).fill('');
  }

  const navigationPromise = page.waitForURL(expectedUrl, { timeout: 60_000 });
  const otpError = page.getByText(/invalid otp|already been used|expired|verification failed/i);

  for (let i = 0; i < otp.length; i++) {
    await inputs.nth(i).click();
    await inputs.nth(i).pressSequentially(otp[i], { delay: 40 });
  }

  await Promise.race([
    navigationPromise,
    otpError.waitFor({ state: 'visible', timeout: 60_000 }).then(async () => {
      throw new Error(`OTP rejected: ${await otpError.innerText()}`);
    }),
  ]);
  await expect(page).toHaveURL(expectedUrl);
}
