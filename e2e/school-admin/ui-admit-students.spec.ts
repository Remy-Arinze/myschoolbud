import { test, expect } from '@playwright/test';
import { switchSchoolType, fillDateOfBirth, fillPhone } from '../helpers/ui';

/**
 * UI E2E: admit one extra student into every class arm (PRIMARY + SECONDARY)
 * via Students → Add Student modal, asserting the admit API succeeds.
 */
test.describe('UI: admit more students per class', () => {
  test.describe.configure({ mode: 'serial', timeout: 20 * 60_000 });

  for (const schoolType of ['PRIMARY', 'SECONDARY'] as const) {
    test(`adds one more student to each ${schoolType} class via UI`, async ({ page }) => {
      await page.goto('/dashboard/school/students');
      // Page shell can render before heading text; use actionable UI signal instead.
      await expect(page.getByRole('button', { name: /add student/i })).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(/loading students/i)).toHaveCount(0, { timeout: 45_000 });

      await switchSchoolType(page, schoolType);
      await page.goto('/dashboard/school/students');
      await expect(page.getByRole('button', { name: /add student/i })).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/loading students/i)).toHaveCount(0, { timeout: 45_000 });

      // Open modal once to discover class arm options for this type
      await page.getByRole('button', { name: /add student/i }).click();
      await expect(page.getByText(/classarm/i).first()).toBeVisible({ timeout: 20_000 });

      const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select ClassArm' }) }).first();
      await expect(classSelect).toBeVisible({ timeout: 20_000 });

      const options = await classSelect.locator('option').evaluateAll((opts) =>
        opts
          .map((o) => ({ value: (o as HTMLOptionElement).value, label: o.textContent?.trim() || '' }))
          .filter((o) => o.value),
      );

      expect(options.length).toBeGreaterThan(0);

      // Close modal before looping
      await page.getByRole('button', { name: /^cancel$/i }).click();

      const runSalt = Date.now() % 1_000_000;
      let index = 0;
      for (const opt of options) {
        index += 1;
        const slug =
          schoolType === 'PRIMARY'
            ? `pri${opt.label.match(/\d+/)?.[0] || index}a`
            : opt.label.replace(/\s+/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `remyarinze+e2e-ui-${slug}-${runSalt}@gmail.com`;
        // Keep NG mobiles unique across PRIMARY/SECONDARY runs (avoid 409 phone conflicts)
        const phoneBase = (schoolType === 'PRIMARY' ? 2100000 : 3100000) + runSalt;
        const studentPhone = `801${String(phoneBase + index).slice(-7)}`;
        const parentPhone = `809${String(phoneBase + index).slice(-7)}`;

        await page.getByRole('button', { name: /add student/i }).click();
        await expect(page.getByRole('button', { name: /submit application/i })).toBeVisible({
          timeout: 15_000,
        });

        await page.getByLabel(/first name/i).fill(index % 2 === 0 ? 'Ngozi' : 'Emeka');
        await page.getByLabel(/last name/i).fill(`Ui${slug}`);

        const dobYear = schoolType === 'PRIMARY' ? 2016 : 2012;
        await fillDateOfBirth(page, dobYear, 'Mar', 10);

        await page.locator('label', { hasText: /^Gender/i }).locator('xpath=..').locator('select').selectOption({ label: 'Female' });

        await page.getByLabel(/^Email/i).fill(email);
        await fillPhone(page, 'Phone', studentPhone);

        await page.getByLabel(/^State/i).fill('Lagos');

        const armSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select ClassArm' }) }).first();
        await armSelect.selectOption(opt.value);

        await page.getByLabel(/Parent\/Guardian Name/i).fill('Remy Parent');
        await page.getByLabel(/^Relationship/i).fill('Guardian');
        await fillPhone(page, 'Parent Phone', parentPhone);
        await page.getByLabel(/Parent Email/i).fill(`remyarinze+e2e-parent-${slug}@gmail.com`);

        const [res] = await Promise.all([
          page.waitForResponse(
            (r) =>
              r.url().includes('/students/admit') &&
              r.request().method() === 'POST',
            { timeout: 60_000 },
          ),
          page.getByRole('button', { name: /submit application/i }).click(),
        ]);

        if (!res.ok()) {
          const body = await res.text().catch(() => '');
          // Idempotent re-runs: email/phone already admitted
          if (res.status() === 409 && /already exists|duplicate|conflict/i.test(body)) {
            await page.getByRole('button', { name: /^cancel$/i }).click().catch(() => {});
            await expect(page.getByRole('button', { name: /add student/i })).toBeVisible({
              timeout: 15_000,
            });
            continue;
          }
          throw new Error(`admit failed for ${email}: ${res.status()} ${body.slice(0, 300)}`);
        }

        // Modal should close or show success; either way student email usable later
        await expect(page.getByRole('button', { name: /add student/i })).toBeVisible({
          timeout: 30_000,
        });
      }
    });
  }
});
