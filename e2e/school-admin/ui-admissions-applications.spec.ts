import { test, expect, type Browser, type Page } from '@playwright/test';
import { switchSchoolType, fillDateOfBirth, fillPhone } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: Public admission link → Applications inbox → Approve & Admit
 * Framed around real school-ops: parent applies from shared link; office places into class arm.
 */

type Finding = { severity: string; area: string; note: string };
const findings: Finding[] = [];
function note(severity: string, area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

const SCHOOL_ID = 'cmrw9slsw0005qoy0d7sn6nbn';
const stamp = Date.now();
const APPLICANT = {
  first: 'Chiamaka',
  last: `App${String(stamp).slice(-6)}`,
  email: `remyarinze+e2e-app-${stamp}@gmail.com`,
  phone: `801${String(4000000 + (stamp % 1000000)).slice(-7)}`,
  parentPhone: `809${String(4000000 + (stamp % 1000000)).slice(-7)}`,
  parentEmail: `remyarinze+e2e-app-parent-${stamp}@gmail.com`,
};

test.describe('QA: admissions link + applications', () => {
  test.describe.configure({ mode: 'serial', timeout: 12 * 60_000 });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const existingPath = path.join(outDir, '2026-07-23-calendar-admissions-findings.json');
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    } catch {
      existing = {};
    }
    fs.writeFileSync(
      existingPath,
      JSON.stringify(
        { ...existing, generatedAt: new Date().toISOString(), admissions: findings, applicant: APPLICANT },
        null,
        2,
      ),
    );
  });

  test('admin can copy admission link from Applications', async ({ page }) => {
    await page.goto('/dashboard/school/applications');
    await expect(page.getByRole('heading', { name: /student applications|applications/i }).first()).toBeVisible({
      timeout: 30_000,
    });

    const copyBtn = page.getByRole('button', { name: /copy admission link|share admission|admission link/i });
    await expect(copyBtn).toBeVisible({ timeout: 15_000 });
    await copyBtn.click();

    await expect(page.getByText(/share admission link|admission url/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const urlInput = page.locator('input[readonly], input').filter({ hasNot: page.locator('[type=hidden]') }).first();
    // Prefer the admission URL field by value
    const admissionInput = page.locator(`input[value*="/admission/${SCHOOL_ID}"]`);
    await expect(admissionInput).toBeVisible({ timeout: 10_000 });
    const linkValue = await admissionInput.inputValue();
    expect(linkValue).toContain(`/admission/${SCHOOL_ID}`);
    note('pass', 'Share link', `Admission URL exposed: ${linkValue}`);
    void urlInput;

    // Real-world: permanent link with no open/close window
    note(
      'minor',
      'Ops gap',
      'Admission link is permanent schoolId URL — no season open/close or expiry (schools often need intake windows)',
    );

    await page.getByRole('button', { name: /close|done|cancel/i }).first().click().catch(() => page.keyboard.press('Escape'));
  });

  test('parent submits public admission application (unauthenticated)', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`/admission/${SCHOOL_ID}`);
    await expect(page.getByText(/student admission form/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/agora e2e demo academy/i)).toBeVisible({ timeout: 20_000 });
    note('pass', 'Public page', 'Branded public admission form loads without login');

    // No OTP on apply — note for ops
    note(
      'minor',
      'Ops gap',
      'Public apply has no email/phone OTP verification — spam and fake applications possible',
    );

    await page.getByLabel(/first name/i).fill(APPLICANT.first);
    await page.getByLabel(/last name/i).fill(APPLICANT.last);
    await page.locator('label', { hasText: /^Gender/i }).locator('..').locator('select').selectOption('FEMALE');
    await fillDateOfBirth(page, 2013, 'May', 14);
    await page.getByLabel(/nationality/i).fill('Nigerian');
    await page.getByLabel(/state of origin/i).fill('Lagos');
    await page.getByRole('textbox', { name: /^email address \*/i }).fill(APPLICANT.email);
    await fillPhone(page, 'Phone Number', APPLICANT.phone);
    await page.getByLabel(/^home address/i).fill('12 Admiralty Way, Lekki');

    await page.getByLabel(/^parent full name/i).fill('Ngozi Guardian');
    await page.getByLabel(/^relationship/i).fill('Mother');
    await fillPhone(page, 'Parent Phone Number', APPLICANT.parentPhone);
    await page.getByRole('textbox', { name: /^parent email address/i }).fill(APPLICANT.parentEmail);

    // Public form does not ask preferred class — admin decides on approve
    note(
      'info',
      'Ops',
      'Public form does not collect preferred class/arm — office assigns on approve (common NG private-school pattern)',
    );

    const applyPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/public/schools/${SCHOOL_ID}/apply`) && r.request().method() === 'POST',
      { timeout: 90_000 },
    );

    await page.getByRole('button', { name: /submit application/i }).click();
    const applyRes = await applyPromise;
    const body = await applyRes.json().catch(() => ({}));
    note(
      applyRes.ok() ? 'pass' : 'blocker',
      'Public apply API',
      `POST apply → ${applyRes.status()} ${JSON.stringify(body).slice(0, 200)}`,
    );
    expect(applyRes.ok()).toBeTruthy();

    await expect(page.getByText(/application submitted/i).first()).toBeVisible({ timeout: 20_000 });
    note('pass', 'Public apply', `Application submitted for ${APPLICANT.email}`);

    await context.close();
  });

  test('admin approves application into a Secondary class arm', async ({ page }) => {
    await page.goto('/dashboard/school/applications');
    await expect(page.getByRole('heading', { name: /student applications|applications/i }).first()).toBeVisible({
      timeout: 30_000,
    });
    await switchSchoolType(page, 'SECONDARY');
    await page.goto('/dashboard/school/applications');

    // Find applicant row
    const row = page.locator('div, tr, li').filter({ hasText: APPLICANT.email }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    note('pass', 'Inbox', 'Pending application appears in Incoming Applications');

    // Expand if needed
    await row.click();
    const approveBtn = page.getByRole('button', { name: /approve application/i });
    await expect(approveBtn.first()).toBeVisible({ timeout: 15_000 });
    await approveBtn.first().click();

    const modal = page.locator('div').filter({ hasText: /approve student application/i }).last();
    await expect(page.getByText(/approve student application/i).first()).toBeVisible({ timeout: 15_000 });

    // Academic year — match current Nigerian year in July
    const yearInput = page.getByPlaceholder(/2024\/2025|e\.g/i);
    await yearInput.fill('2025/2026');

    // Class levels should now be real school levels (JSS 1 …) not Basic/JSS1
    const levelSelect = page.locator('label', { hasText: /class level/i }).locator('..').locator('select');
    await expect(levelSelect).toBeVisible();
    const levelOptions = await levelSelect.locator('option').allTextContents();
    note('info', 'Approve levels', `Level options: ${levelOptions.filter((o) => o.trim()).join(', ')}`);

    const hasJss1 = levelOptions.some((o) => /jss\s*1/i.test(o));
    const hasBasic = levelOptions.some((o) => /basic\s*1/i.test(o));
    if (hasBasic && !hasJss1) {
      note('major', 'Ops bug', 'Approve still offers Basic 1 labels — mismatch with Primary 1 / JSS 1 arms');
    } else if (hasJss1) {
      note('pass', 'Approve levels', 'Class levels match school arms (e.g. JSS 1)');
    }

    // Prefer JSS 1 if present
    const jssOpt = levelOptions.find((o) => o.trim().toLowerCase() === 'jss 1');
    if (jssOpt) {
      await levelSelect.selectOption({ label: jssOpt.trim() });
    } else {
      const firstReal = levelOptions.find((o) => o.trim() && !/select/i.test(o));
      if (firstReal) await levelSelect.selectOption({ label: firstReal.trim() });
    }

    const armSelect = page.locator('label', { hasText: /class arm/i }).locator('..').locator('select');
    const armOptions = await armSelect.locator('option').allTextContents();
    note('info', 'Approve arms', `Arm options: ${armOptions.filter((o) => o.trim()).join(', ')}`);
    const armReal = armOptions.find((o) => /jss\s*1\s*a/i.test(o) || (o.trim() && !/no specific|select/i.test(o)));
    if (armReal) {
      await armSelect.selectOption({ label: armReal.trim() });
      note('pass', 'Approve arm', `Selected arm "${armReal.trim()}" — student will land in timetable/attendance class`);
    } else {
      note(
        'major',
        'Ops gap',
        'No matching class arm after level select — approving without arm leaves student off class rolls',
      );
    }

    const approvePromise = page.waitForResponse(
      (r) =>
        r.url().includes('/admissions/applications/') &&
        r.url().includes('/approve') &&
        r.request().method() === 'POST',
      { timeout: 90_000 },
    );

    await page.getByRole('button', { name: /approve & admit/i }).click();
    const approveRes = await approvePromise;
    const approveBody = await approveRes.json().catch(() => ({}));
    note(
      approveRes.ok() ? 'pass' : 'blocker',
      'Approve API',
      `POST approve → ${approveRes.status()} ${JSON.stringify(approveBody).slice(0, 240)}`,
    );
    expect(approveRes.ok()).toBeTruthy();

    await expect(page.getByText(/application approved and student admitted/i).first()).toBeVisible({
      timeout: 20_000,
    });
    note('pass', 'Approve', 'Student admitted from application');
  });

  test('admitted student appears on Students list', async ({ page }) => {
    await page.goto('/dashboard/school/students');
    await expect(page.getByRole('heading', { name: /^students$/i })).toBeVisible({ timeout: 30_000 });
    await switchSchoolType(page, 'SECONDARY');
    await page.goto('/dashboard/school/students');

    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(APPLICANT.last);
      await page.waitForTimeout(800);
    }

    await expect(page.getByText(APPLICANT.last).first()).toBeVisible({ timeout: 30_000 });
    note('pass', 'Roster', `Admitted applicant ${APPLICANT.first} ${APPLICANT.last} visible on Students`);

    // Activation email is best-effort
    note(
      'info',
      'Ops',
      'Student account is SHADOW until password activation email is used — office should confirm parent received login mail',
    );
  });

  test('decline path: second application can be declined', async ({ browser, page }) => {
    const stamp2 = Date.now() + 1;
    const email2 = `remyarinze+e2e-app-decl-${stamp2}@gmail.com`;
    const phone2 = `801${String(5000000 + (stamp2 % 1000000)).slice(-7)}`;
    const parentPhone2 = `809${String(5000000 + (stamp2 % 1000000)).slice(-7)}`;

    const ctx = await browser.newContext();
    const pub = await ctx.newPage();
    await pub.goto(`/admission/${SCHOOL_ID}`);
    await expect(pub.getByText(/student admission form/i)).toBeVisible({ timeout: 30_000 });
    await pub.getByLabel(/first name/i).fill('Declined');
    await pub.getByLabel(/last name/i).fill(`Cand${String(stamp2).slice(-4)}`);
    await pub.locator('label', { hasText: /^Gender/i }).locator('..').locator('select').selectOption('MALE');
    await fillDateOfBirth(pub, 2014, 'Jan', 8);
    await pub.getByLabel(/nationality/i).fill('Nigerian');
    await pub.getByLabel(/state of origin/i).fill('Abia');
    await pub.getByRole('textbox', { name: /^email address \*/i }).fill(email2);
    await fillPhone(pub, 'Phone Number', phone2);
    await pub.getByLabel(/^parent full name/i).fill('Decline Parent');
    await pub.getByLabel(/^relationship/i).fill('Father');
    await fillPhone(pub, 'Parent Phone Number', parentPhone2);
    await pub.getByRole('textbox', { name: /^parent email address/i }).fill(`remyarinze+e2e-decl-parent-${stamp2}@gmail.com`);

    await Promise.all([
      pub.waitForResponse((r) => r.url().includes('/apply') && r.request().method() === 'POST'),
      pub.getByRole('button', { name: /submit application/i }).click(),
    ]);
    await expect(pub.getByText(/application submitted/i).first()).toBeVisible({ timeout: 20_000 });
    await ctx.close();

    await page.goto('/dashboard/school/applications');
    await switchSchoolType(page, 'SECONDARY');
    await page.goto('/dashboard/school/applications');

    const row = page.locator('div, tr, li').filter({ hasText: email2 }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();

    page.once('dialog', async (d) => {
      note('minor', 'Decline UX', `Decline uses native confirm(): "${d.message().slice(0, 80)}"`);
      await d.accept();
    });

    const declineBtn = page.getByRole('button', { name: /^decline$/i });
    await expect(declineBtn.first()).toBeVisible({ timeout: 15_000 });

    const rejectPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/applications/') &&
        r.url().includes('/reject') &&
        r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await declineBtn.first().click();
    const rejectRes = await rejectPromise;
    note(rejectRes.ok() ? 'pass' : 'blocker', 'Decline API', `POST reject → ${rejectRes.status()}`);
    expect(rejectRes.ok()).toBeTruthy();

    await expect(page.getByText(/application declined/i).first()).toBeVisible({ timeout: 15_000 });
    note('pass', 'Decline', 'Application declined and removed from pending inbox');
  });
});
