import { expect, type Page } from '@playwright/test';

/**
 * Switch school type via localStorage + reload (matches SchoolTypeSwitcher persistence),
 * then verify the UI reflects the type.
 */
export async function switchSchoolType(page: Page, type: 'PRIMARY' | 'SECONDARY') {
  await page.evaluate((t) => {
    localStorage.setItem('selectedSchoolType', t);
  }, type);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  // Sidebar may take a moment after auth rehydrate
  await expect(page.getByText('School type', { exact: true })).toBeVisible({ timeout: 30_000 });

  const label = type === 'PRIMARY' ? 'Primary' : 'Secondary';
  // Trigger button near School type should show the selected label
  await expect(
    page.getByText('School type', { exact: true }).locator('xpath=following::button[1]'),
  ).toContainText(label, { timeout: 20_000 });
}

export async function fillDateOfBirth(page: Page, year: number, monthLabel: string, day: number) {
  await fillDatePicker(page, /date of birth/i, year, monthLabel, day);
}

/** Fill a DatePicker by its button accessible name / label (e.g. Start Date, End Date). */
export async function fillDatePicker(
  page: Page,
  triggerName: string | RegExp,
  year: number,
  monthLabel: string,
  day: number,
) {
  await page.getByRole('button', { name: triggerName }).click();
  const dialog = page.getByRole('dialog', { name: /choose date/i });
  await expect(dialog).toBeVisible();

  const monthSelect = dialog.getByLabel(/month/i);
  const yearSelect = dialog.getByLabel(/year/i);
  await expect(monthSelect).toBeVisible();
  await expect(yearSelect).toBeVisible();

  const monthOptions = await monthSelect.locator('option').allTextContents();
  const monthMatch =
    monthOptions.find((o) => o.trim().toLowerCase() === monthLabel.trim().toLowerCase()) ||
    monthOptions.find((o) => o.trim().toLowerCase().startsWith(monthLabel.trim().toLowerCase()));
  if (!monthMatch) {
    throw new Error(`Month "${monthLabel}" not found in date picker options: ${monthOptions.join(', ')}`);
  }

  await yearSelect.selectOption({ label: String(year) });
  await monthSelect.selectOption({ label: monthMatch.trim() });

  await dialog.getByRole('gridcell', { name: String(day), exact: true }).first().click();
  await expect(dialog).toBeHidden({ timeout: 5_000 });
}

export async function fillPhone(page: Page, labelText: string, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, '');
  // Prefer exact label start so "Phone" does not grab "Parent Phone"
  const label = page.locator('label').filter({ hasText: new RegExp(`^${labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first();
  const wrapper = label.locator('xpath=ancestor::div[contains(@class,"phone-input-wrapper") or contains(@class,"w-full")][1]');
  const tel = wrapper
    .locator('input.react-international-phone-input, input[type="tel"]')
    .first()
    .or(label.locator('..').locator('input.react-international-phone-input, input[type="tel"], input').first());

  await expect(tel).toBeVisible({ timeout: 10_000 });
  await tel.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await tel.pressSequentially(digits, { delay: 20 });
  await tel.blur();

  // react-international-phone formats with spaces; assert by digits only.
  // Avoid national numbers that start with another country dial code (e.g. 81 → Japan).
  await expect
    .poll(async () => (await tel.inputValue()).replace(/\D/g, ''))
    .toMatch(new RegExp(`${digits.slice(-6)}$`));
}
