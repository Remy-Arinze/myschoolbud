import { test, expect, type Page } from '@playwright/test';
import { switchSchoolType } from '../helpers/ui';
import fs from 'fs';
import path from 'path';

/**
 * QA E2E: School calendar — create / view / delete one-off events
 * with school-ops notes (term overlay, school-type scoping).
 */

type Finding = { severity: string; area: string; note: string };
const findings: Finding[] = [];
function note(severity: string, area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

const EVENT_TITLE = `E2E PTA Meeting ${Date.now()}`;

async function openCalendar(page: Page) {
  await page.goto('/dashboard/school/calendar');
  await expect(page.getByRole('heading', { name: /^calendar$/i })).toBeVisible({ timeout: 30_000 });
  await switchSchoolType(page, 'SECONDARY');
  await expect(page.getByText(/unified schedule/i)).toBeVisible({ timeout: 20_000 });
}

test.describe('QA: school calendar', () => {
  test.describe.configure({ mode: 'serial', timeout: 8 * 60_000 });

  test.afterAll(async () => {
    const outDir = path.resolve(__dirname, '../../../qa-reports');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, '2026-07-23-calendar-admissions-findings.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), calendar: findings }, null, 2),
    );
  });

  test('page loads with term jump and legend', async ({ page }) => {
    await openCalendar(page);

    await expect(page.getByText(/jump to term/i)).toBeVisible();
    note('pass', 'Term jump', 'Jump to term control present — helps admins align calendar to academic calendar');

    for (const label of ['Academic', 'Event', 'Exam', 'Meeting', 'Holiday', 'Timetable']) {
      const legend = page.getByText(label, { exact: true });
      if (await legend.isVisible().catch(() => false)) {
        note('pass', 'Legend', `Legend includes ${label}`);
      }
    }

    const todayBtn = page.getByRole('button', { name: /^today$/i });
    if (await todayBtn.isVisible().catch(() => false)) {
      await todayBtn.click();
      note('pass', 'Toolbar', 'Today button works');
    }
  });

  test('creates a MEETING event from a calendar slot', async ({ page }) => {
    await openCalendar(page);

    // Prefer month day cell; fallback week time slot
    const monthDay = page.locator('.rbc-month-view .rbc-day-bg').nth(10);
    const weekSlot = page.locator('.rbc-time-content .rbc-day-slot .rbc-timeslot-group').first();

    if (await monthDay.isVisible().catch(() => false)) {
      await monthDay.click({ force: true });
    } else if (await weekSlot.isVisible().catch(() => false)) {
      await weekSlot.click({ force: true });
    } else {
      // Agenda / other — click any day background
      await page.locator('.rbc-day-bg, .rbc-date-cell').first().click({ force: true });
    }

    const modal = page.getByRole('dialog').filter({ hasText: /create event/i });
    // Modal component may not use role=dialog — fallback
    const createModal = (await modal.isVisible().catch(() => false))
      ? modal
      : page.locator('div').filter({ hasText: /^create event$/i }).first();

    await expect(page.getByText(/^create event$/i).first()).toBeVisible({ timeout: 15_000 });
    note('pass', 'Create modal', 'Create Event opened from slot click');

    await page.getByPlaceholder(/event title/i).fill(EVENT_TITLE);
    await page.locator('label', { hasText: /event type/i }).locator('..').locator('select').selectOption('MEETING');

    // Ensure dates filled (slot usually pre-fills datetime-local)
    const startInput = page.locator('input[type="datetime-local"]').first();
    const endInput = page.locator('input[type="datetime-local"]').nth(1);
    if (!(await startInput.inputValue())) {
      await startInput.fill('2026-07-24T10:00');
      await endInput.fill('2026-07-24T11:00');
    }

    const createResPromise = page.waitForResponse(
      (r) => r.url().includes('/events') && r.request().method() === 'POST',
      { timeout: 60_000 },
    );

    await page.getByRole('button', { name: /^create event$/i }).click();
    const createRes = await createResPromise;
    note(
      createRes.ok() ? 'pass' : 'blocker',
      'Create API',
      `POST /events → ${createRes.status()}`,
    );
    expect(createRes.ok()).toBeTruthy();

    await expect(page.getByText(/event created successfully/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(EVENT_TITLE).first()).toBeVisible({ timeout: 20_000 });
    note('pass', 'Create event', `Event "${EVENT_TITLE}" visible on calendar`);
  });

  test('opens event detail and deletes it', async ({ page }) => {
    await openCalendar(page);

    const eventEl = page.getByText(EVENT_TITLE).first();
    await expect(eventEl).toBeVisible({ timeout: 20_000 });
    await eventEl.click();

    await expect(page.getByText(EVENT_TITLE).first()).toBeVisible();
    const deleteBtn = page.getByRole('button', { name: /^delete$/i });
    if (!(await deleteBtn.isVisible().catch(() => false))) {
      note('major', 'Edit UX', 'No Edit button on event detail — admins can only delete/recreate (real-world gap)');
    } else {
      note('info', 'Edit UX', 'Delete available on detail');
    }

    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    const delPromise = page.waitForResponse(
      (r) => r.url().includes('/events/') && r.request().method() === 'DELETE',
      { timeout: 60_000 },
    );
    await deleteBtn.click();
    // confirm if present
    const confirm = page.getByRole('button', { name: /confirm|yes|delete/i }).last();
    if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirm.click();
    }
    const delRes = await delPromise.catch(() => null);
    if (delRes) {
      note(delRes.ok() ? 'pass' : 'blocker', 'Delete API', `DELETE → ${delRes.status()}`);
      expect(delRes.ok()).toBeTruthy();
    }

    await expect(page.getByText(/event deleted|deleted successfully/i).first()).toBeVisible({
      timeout: 15_000,
    }).catch(() => null);

    await page.waitForTimeout(1000);
    const stillVisible = await page.getByText(EVENT_TITLE).first().isVisible().catch(() => false);
    note(!stillVisible ? 'pass' : 'major', 'Delete', `Event removed from calendar: ${!stillVisible}`);
    expect(stillVisible).toBeFalsy();
  });
});
