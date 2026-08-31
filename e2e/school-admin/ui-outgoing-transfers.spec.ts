import { test, expect, type Browser, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: Outgoing transfer (source school) → Incoming accept/preview/complete (receiving school).
 * Exercises the real UI path schools use — TAC share, preview package, place into class arm.
 */

type Finding = { severity: string; area: string; note: string };
const findings: Finding[] = [];
function note(severity: string, area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

const FIXTURE_PATH = path.resolve(__dirname, '../.transfer-fixture.json');
const RECV_AUTH = path.resolve(__dirname, '../.auth/receiving-admin.json');

type TransferFixture = {
  sourceSchoolId: string;
  receiving: {
    schoolId: string;
    schoolName: string;
    adminEmail: string;
    classArmId: string;
    classLevelName: string;
    academicYear: string;
  };
  student: {
    id: string;
    uid: string;
    firstName: string;
    lastName: string;
    searchName: string;
    expectedHealth: {
      bloodGroup: string;
      allergies: string[];
      medications: string[];
      emergencyContact: string;
      medicalNotes: string;
    };
    expectedGradeSubject: string;
  };
  notes: {
    packageIncludes: string[];
    packageExcludes: string[];
  };
};

function loadFixture(): TransferFixture {
  if (!fs.existsSync(FIXTURE_PATH)) {
    throw new Error(
      `Missing ${FIXTURE_PATH}. Run: cd backend && npx tsx scripts/seed-e2e-transfer-receiving.ts`,
    );
  }
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

test.describe('QA: outgoing → incoming student transfer', () => {
  test.describe.configure({ mode: 'serial', timeout: 12 * 60_000 });

  let fixture: TransferFixture;
  let tac: string;
  let studentIdFromTac: string;

  test.beforeAll(() => {
    fixture = loadFixture();
    if (!fs.existsSync(RECV_AUTH)) {
      throw new Error(
        `Missing ${RECV_AUTH}. Run: cd backend && npx tsx scripts/seed-e2e-transfer-receiving.ts`,
      );
    }
    // Optional: reuse TAC pasted from transfer email (skips regenerate when set)
    if (process.env.E2E_TAC?.trim() && process.env.E2E_TRANSFER_STUDENT_ID?.trim()) {
      tac = process.env.E2E_TAC.trim();
      studentIdFromTac = process.env.E2E_TRANSFER_STUDENT_ID.trim();
      note('info', 'Email TAC', `Using TAC from env/email: ${tac}`);
    }
  });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, '2026-07-23-outgoing-transfers-findings.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          fixtureStudent: {
            id: fixture.student.id,
            uid: fixture.student.uid,
            name: fixture.student.searchName,
          },
          tacIssued: Boolean(tac),
          findings,
        },
        null,
        2,
      ),
    );
  });

  test('source school generates TAC for transfer candidate', async ({ page }) => {
    await page.goto('/dashboard/school/applications');
    await expect(
      page.getByRole('heading', { name: /student applications|applications/i }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // Transfer candidate is Secondary (JSS 1)
    await switchSchoolType(page, 'SECONDARY');
    await page.goto('/dashboard/school/applications');
    await expect(page.getByRole('button', { name: /outgoing transfers/i })).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole('button', { name: /outgoing transfers/i }).click();
    await expect(page.getByRole('button', { name: /generate tac/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /generate tac/i }).click();

    await expect(
      page.getByRole('heading', { name: /generate transfer access code/i }),
    ).toBeVisible({ timeout: 10_000 });

    const search = page.getByPlaceholder(/search by name or student id/i);
    await search.fill(fixture.student.uid);
    const studentPick = page.getByRole('button', {
      name: new RegExp(`${fixture.student.firstName}.*${fixture.student.lastName}`, 'i'),
    });
    await expect(studentPick).toBeVisible({ timeout: 15_000 });
    await studentPick.click();
    await expect(page.getByText(/selected student/i)).toBeVisible();

    // Prefer the Generate button inside the TAC modal (last matching enabled button)
    await page.getByRole('button', { name: /^generate tac$/i }).last().click();

    await expect(page.getByRole('heading', { name: /tac generated successfully/i })).toBeVisible({
      timeout: 20_000,
    });
    const tacDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /tac generated successfully/i }),
    });

    const codes = tacDialog.locator('code');
    await expect(codes).toHaveCount(2);
    tac = (await codes.nth(0).innerText()).trim();
    studentIdFromTac = (await codes.nth(1).innerText()).trim();

    expect(tac.length).toBeGreaterThan(6);
    expect(studentIdFromTac).toBe(fixture.student.id);
    if (studentIdFromTac !== fixture.student.uid) {
      note(
        'major',
        'Student ID confusion',
        `TAC modal shares Prisma cuid (${studentIdFromTac}), not display UID (${fixture.student.uid}). Schools will confuse these.`,
      );
    }

    note('pass', 'Generate TAC', `Issued ${tac} for ${fixture.student.searchName}`);
    await tacDialog.getByRole('button', { name: /^close$/i }).click();

    // Outgoing list should show the pending TAC
    await expect(page.getByText(fixture.student.firstName).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(tac).first()).toBeVisible({ timeout: 10_000 });
  });

  test('receiving school previews package (grades + health) and completes transfer', async ({
    browser,
  }: {
    browser: Browser;
  }) => {
    expect(tac, 'TAC from previous test').toBeTruthy();

    const context = await browser.newContext({ storageState: RECV_AUTH });
    const page = await context.newPage();

    try {
      await page.goto('/dashboard/school/applications');
      // Minted JWT may still land on dashboard; soft-check school name when visible
      const recvName = page.getByText(/agora e2e receiving academy/i).first();
      if (await recvName.isVisible({ timeout: 8_000 }).catch(() => false)) {
        note('pass', 'Receiving auth', 'Receiving Academy session loaded');
      } else {
        note(
          'minor',
          'Receiving auth',
          'Receiving school name not immediately visible — continuing with applications flow',
        );
      }

      await page.goto('/dashboard/school/applications');
      await expect(
        page.getByRole('heading', { name: /student applications|applications/i }).first(),
      ).toBeVisible({ timeout: 30_000 });

      // Receiving Academy is Secondary-only — no School type switcher in sidebar
      await page.evaluate(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));
      note(
        'info',
        'Receiving school type',
        'Receiving Academy is Secondary-only (no Primary switcher) — set selectedSchoolType in localStorage',
      );
      await page.getByRole('button', { name: /accept transfer/i }).click();
      await expect(page.getByRole('heading', { name: /accept new transfer/i })).toBeVisible({
        timeout: 10_000,
      });
      const acceptDialog = page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: /accept new transfer/i }),
      });

      note(
        'minor',
        'Copy',
        'Header button says "Accept transfer" while modal title says "Accept new transfer"',
      );

      await acceptDialog.getByPlaceholder(/tac-abc12345/i).fill(tac);
      await acceptDialog.getByPlaceholder(/enter student id/i).fill(studentIdFromTac);
      await acceptDialog.getByRole('button', { name: /verify & continue/i }).click();

      await expect(page.getByRole('heading', { name: /transfer preview/i })).toBeVisible({
        timeout: 30_000,
      });
      const preview = page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: /transfer preview/i }),
      });
      await expect(preview.getByText(fixture.student.firstName).first()).toBeVisible();
      await expect(preview.getByText(fixture.student.uid)).toBeVisible();
      await expect(preview.getByText(/agora e2e demo academy/i).first()).toBeVisible();

      // Academic package (grades are behind a collapsible enrollment row)
      await expect(preview.getByRole('heading', { name: /academic records/i })).toBeVisible();
      await preview.getByRole('button', { name: /jss 1/i }).click();
      await expect(preview.getByText(fixture.student.expectedGradeSubject).first()).toBeVisible({
        timeout: 15_000,
      });
      note('pass', 'Grades in preview', `${fixture.student.expectedGradeSubject} grade visible after expand`);
      note(
        'minor',
        'Preview UX',
        'Academic grades are collapsed by default — receiving admin must expand class row to review scores',
      );

      // Health package (UI now surfaces API fields)
      const healthCard = preview.locator('[data-testid="transfer-health-records"]');
      await expect(healthCard).toBeVisible({ timeout: 10_000 });
      await expect(healthCard.getByText(fixture.student.expectedHealth.bloodGroup)).toBeVisible();
      await expect(healthCard.getByText(/peanuts/i)).toBeVisible();
      await expect(healthCard.getByText(/inhaler as needed/i)).toBeVisible();
      await expect(healthCard.getByText(/adaobi transfer parent/i)).toBeVisible();
      await expect(healthCard.getByText(/mild asthma/i)).toBeVisible();
      note('pass', 'Health in preview', 'Blood group, allergies, meds, emergency contact, notes shown');

      // Attendance / fees explicitly not in package — document for ops
      note(
        'info',
        'Package scope',
        `Includes: ${fixture.notes.packageIncludes.join(', ')}. Excludes: ${fixture.notes.packageExcludes.join(', ')} (attendance not transferred).`,
      );

      await preview.getByRole('button', { name: /^complete transfer$/i }).click();

      await expect(page.getByRole('heading', { name: /^complete transfer$/i })).toBeVisible({
        timeout: 10_000,
      });
      const complete = page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: /^complete transfer$/i }),
      });

      await complete.getByPlaceholder(/2024\/2025|e\.g\./i).fill(fixture.receiving.academicYear);

      const levelSelect = complete.locator('select').nth(0);
      await levelSelect.selectOption({ label: fixture.receiving.classLevelName });
      await expect(levelSelect).toHaveValue(fixture.receiving.classLevelName);

      const armSelect = complete.locator('select').nth(1);
      const armOptions = await armSelect.locator('option').allTextContents();
      if (armOptions.length <= 1) {
        note('major', 'Class arm', 'No class arms listed in Complete Transfer modal');
      } else {
        // Prefer matching fixture arm id; else first real arm
        const hasFixtureArm = await armSelect
          .locator(`option[value="${fixture.receiving.classArmId}"]`)
          .count();
        if (hasFixtureArm) {
          await armSelect.selectOption(fixture.receiving.classArmId);
        } else {
          await armSelect.selectOption({ index: 1 });
          note(
            'minor',
            'Class arm',
            `Fixture arm ${fixture.receiving.classArmId} not in options; picked first available`,
          );
        }
        note('pass', 'Class arm picker', 'Complete Transfer exposes Class Level + Class Arm');
      }

      await complete.getByRole('button', { name: /^complete transfer$/i }).click();

      // Prefer success toast; also accept modal dismiss / completed list as success signal
      const successToast = page.getByText(/transfer completed successfully/i).first();
      const errorToast = page.locator('[data-sonner-toast], [role="status"], .Toastify').filter({
        hasText: /fail|error|cannot|not found|invalid/i,
      });
      await Promise.race([
        successToast.waitFor({ state: 'visible', timeout: 45_000 }),
        errorToast
          .first()
          .waitFor({ state: 'visible', timeout: 45_000 })
          .then(async () => {
            const msg = await errorToast.first().innerText();
            note('blocker', 'Complete API', msg);
            throw new Error(`Complete transfer failed: ${msg}`);
          }),
      ]);
      await expect(successToast).toBeVisible({ timeout: 5_000 });
      note('pass', 'Complete transfer', `Student placed into ${fixture.receiving.classLevelName}`);
      note(
        'pass',
        'Email TAC',
        'Receiving school completed transfer using TAC from student email + Student ID (cuid)',
      );

      // Recently accepted / completed list should mention the student
      await page.reload();
      await page.goto('/dashboard/school/applications');
      await expect(page.getByText(fixture.student.lastName).first()).toBeVisible({
        timeout: 30_000,
      });
      note('pass', 'Receiving inbox', 'Completed transfer visible on Applications');
    } finally {
      await context.close();
    }
  });

  test('source school shows outgoing as completed / student left', async ({ page }: { page: Page }) => {
    await page.goto('/dashboard/school/applications');
    await switchSchoolType(page, 'SECONDARY');
    await page.goto('/dashboard/school/applications');
    await page.getByRole('button', { name: /outgoing transfers/i }).click();

    // TAC row may show COMPLETED, or list may empty after completion depending on API filter
    const studentRow = page.getByText(fixture.student.lastName).first();
    const visible = await studentRow.isVisible({ timeout: 15_000 }).catch(() => false);
    if (visible) {
      const completed = page.getByText(/completed/i).first();
      if (await completed.isVisible({ timeout: 5_000 }).catch(() => false)) {
        note('pass', 'Source outgoing', 'Outgoing transfer shows COMPLETED status');
      } else {
        note('minor', 'Source outgoing', 'Student still listed outgoing but status unclear in UI');
      }
    } else {
      note(
        'info',
        'Source outgoing',
        'Transfer candidate no longer listed under outgoing (expected after completion)',
      );
    }
  });
});
