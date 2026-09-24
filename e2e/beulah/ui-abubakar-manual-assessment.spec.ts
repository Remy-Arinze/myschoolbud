import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Abubakar Adebayo (Beulah, JSS 2 A English) creates a manual quiz and publishes it.
 * Manual creation does not read the scheme of work. An exam still waits on a published timetable slot.
 * Late submission after the due date is stored on the assessment.
 */

const AUTH = path.resolve(__dirname, '../.auth/beulah-teacher-abubakar.json');

async function settle(page: Page) {
  await expect(page.getByText(/^Compiling/)).toHaveCount(0, { timeout: 120_000 });
}

async function openJss2A(page: Page) {
  await page.goto('/dashboard/teacher/classes', { waitUntil: 'domcontentloaded' });
  await settle(page);
  await expect
    .poll(async () => (await page.locator('main').innerText()) || '', { timeout: 40_000 })
    .toMatch(/JSS 2 A/i);
  await page.getByText('JSS 2 A', { exact: true }).first().click();
  await page.waitForURL(/\/dashboard\/teacher\/classes\/[^/?#]+/, { timeout: 30_000 });
  await settle(page);
  return page.url().match(/\/classes\/([^/?#]+)/)?.[1] ?? '';
}

async function pickDueDate(page: Page) {
  const dueSection = page.locator('label', { hasText: /due date/i }).locator('..');
  await dueSection.getByRole('button').first().click();
  await page.locator('.rdp-day:not(.rdp-day_disabled)').last().click();
}

async function fillQuestion(page: Page, text: string, typeLabel: string) {
  const box = page.getByPlaceholder(/type your question/i).last();
  await box.fill(text);
  const card = box.locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
  await card.getByRole('button', { name: typeLabel, exact: true }).click();
}

test.describe('Abubakar manual assessment publish', () => {
  test.use({ storageState: AUTH });
  test.describe.configure({ timeout: 8 * 60_000 });

  test('publishes a quiz with late submission and no scheme link', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing beulah-teacher-abubakar.json');

    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));

    let schemeStatus: number | null = null;
    page.on('response', (res) => {
      if (res.request().resourceType() !== 'fetch') return;
      if (/scheme-of-work|\/schemes/.test(res.url())) schemeStatus = res.status();
    });

    const classId = await openJss2A(page);
    expect(classId).toBeTruthy();

    await page.getByRole('button', { name: 'Scheme of Work', exact: true }).click();
    await expect(page.getByText(/retrieving your tailored scheme/i)).toHaveCount(0, { timeout: 40_000 });
    const schemeText = ((await page.locator('main').innerText()) || '').replace(/\s+/g, ' ');
    const schemePublished = !/no active scheme of work/i.test(schemeText);

    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    await settle(page);
    await page.getByRole('button', { name: /create assessment/i }).click();
    await page.waitForURL(/\/assessments\/new\?source=manual/, { timeout: 20_000 });

    await expect(page.getByRole('heading', { name: /create new assessment/i })).toBeVisible();
    await expect(page.getByText(/scheme of work/i)).toHaveCount(0);
    await expect(page.getByText(/curriculum/i)).toHaveCount(0);

    const typeSelect = page.locator('#assessment-type');
    await expect(typeSelect).toBeVisible();
    const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'JSS 2 A' }) }).first();
    await classSelect.selectOption({ label: 'JSS 2 A' });
    const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'English Language' }) }).first();
    await expect(subjectSelect).toBeVisible({ timeout: 20_000 });
    await subjectSelect.selectOption({ label: 'English Language' });

    await typeSelect.selectOption({ label: 'Exam' });
    const examBlocked = page.getByText(/exam timetable is not published yet/i);
    if (await examBlocked.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(page.getByRole('button', { name: /publish now/i })).toBeDisabled();
    }
    await typeSelect.selectOption({ label: 'Quiz' });
    await expect(examBlocked).toHaveCount(0);

    const title = `JSS 2 A English quiz ${Date.now()}`;
    await page.getByPlaceholder('e.g. Chemistry Quiz').fill(title);
    await pickDueDate(page);

    const lateRow = page.getByText('Allow late after due date', { exact: true }).locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await lateRow.getByRole('button').click();
    const penalty = page.getByRole('spinbutton');
    await expect(penalty).toBeVisible();
    await penalty.fill('5');

    await page.getByPlaceholder(/type your question/i).fill('Which word is a noun?');
    await page.getByRole('button', { name: /^multiple choice$/i }).click();
    const options = ['Lagos', 'Run', 'Quickly', 'Blue'];
    for (let i = 0; i < options.length; i++) {
      await page.getByPlaceholder(`Option ${i + 1}`).fill(options[i]);
    }
    await page.locator('input[type="radio"]').nth(0).check();

    const termSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /select term/i }) }).last();
    if (!(await termSelect.inputValue())) {
      await termSelect.selectOption({ index: 1 });
    }

    const createResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        /\/classes\/[^/]+\/assessments$/.test(res.url()) &&
        res.status() >= 200 &&
        res.status() < 300,
    );

    await page.getByRole('button', { name: /publish now/i }).click();
    await expect(page.getByRole('heading', { name: /publish assessment/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();

    const res = await createResponse;
    const payload = res.request().postDataJSON() as Record<string, unknown>;
    const body = await res.json();
    const saved = body?.data;

    expect(payload.type).toBe('QUIZ');
    expect(payload.allowLateSubmissionAfterDue).toBe(true);
    expect(payload.lateDuePenaltyPoints).toBe(5);
    expect(payload.schemeOfWorkId ?? null).toBeNull();
    expect(payload.weekIds ?? []).toEqual([]);

    expect(saved?.id).toBeTruthy();
    expect(saved?.status).toBe('PUBLISHED');
    expect(saved?.type).toBe('QUIZ');
    expect(saved?.termId).toBeTruthy();
    expect(saved?.subject?.name || saved?.subjectId).toBeTruthy();
    expect(saved?.allowLateSubmissionAfterDue).toBe(true);
    expect(Number(saved?.lateDuePenaltyPoints)).toBe(5);
    expect(saved?.schemeOfWorkId ?? null).toBeNull();
    expect(saved?.weekIds ?? []).toEqual([]);

    await page.goto(`/dashboard/teacher/assessments/${saved.id}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/published/i).first()).toBeVisible();

    test.info().annotations.push({
      type: 'scheme',
      description: schemePublished
        ? `Scheme of work is published for this class (API ${schemeStatus ?? 'n/a'}). The manual quiz was still saved with no scheme or week link.`
        : `No active scheme of work (API ${schemeStatus ?? 'n/a'}). The manual quiz published anyway, because that gate applies to Lois, not this editor.`,
    });
  });

  test('publishes an assignment that closes at the due date', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing beulah-teacher-abubakar.json');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));

    const classId = await openJss2A(page);
    expect(classId).toBeTruthy();
    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    await settle(page);
    await page.getByRole('button', { name: /create assessment/i }).click();
    await page.waitForURL(/\/assessments\/new\?source=manual/, { timeout: 20_000 });

    const title = `JSS 2 A English assignment ${Date.now()}`;
    await page.getByPlaceholder('e.g. Chemistry Quiz').fill(title);
    await page.locator('#assessment-type').selectOption({ label: 'Assignment' });
    await pickDueDate(page);
    await expect(page.getByText('Allow late after due date', { exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton')).toHaveCount(0);

    const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'JSS 2 A' }) }).first();
    await classSelect.selectOption({ label: 'JSS 2 A' });
    const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'English Language' }) }).first();
    await expect(subjectSelect).toBeVisible({ timeout: 20_000 });
    await subjectSelect.selectOption({ label: 'English Language' });

    await page.getByPlaceholder(/type your question/i).fill('Write one sentence using a noun.');
    await page.getByRole('button', { name: /^short answer$/i }).click();

    const termSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /select term/i }) }).last();
    if (!(await termSelect.inputValue())) {
      await termSelect.selectOption({ index: 1 });
    }

    const createResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        /\/classes\/[^/]+\/assessments$/.test(res.url()) &&
        res.status() >= 200 &&
        res.status() < 300,
    );

    await page.getByRole('button', { name: /publish now/i }).click();
    await expect(page.getByRole('heading', { name: /publish assessment/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();

    const res = await createResponse;
    const payload = res.request().postDataJSON() as Record<string, unknown>;
    const saved = (await res.json())?.data;

    expect(payload.type).toBe('ASSIGNMENT');
    expect(payload.allowLateSubmissionAfterDue).toBe(false);
    expect(payload.lateDuePenaltyPoints ?? 0).toBe(0);
    expect(payload.schemeOfWorkId ?? null).toBeNull();
    expect(payload.weekIds ?? []).toEqual([]);

    expect(saved?.status).toBe('PUBLISHED');
    expect(saved?.type).toBe('ASSIGNMENT');
    expect(saved?.dueDate).toBeTruthy();
    expect(saved?.allowLateSubmissionAfterDue).toBe(false);
    expect(Number(saved?.lateDuePenaltyPoints ?? 0)).toBe(0);
    expect(saved?.schemeOfWorkId ?? null).toBeNull();

    await page.goto(`/dashboard/teacher/assessments/${saved.id}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/published/i).first()).toBeVisible();
  });

  test('publishes a strict assignment that still keeps a late penalty and instructions', async ({ page }) => {
    test.skip(!fs.existsSync(AUTH), 'Missing beulah-teacher-abubakar.json');
    await page.addInitScript(() => localStorage.setItem('selectedSchoolType', 'SECONDARY'));

    const classId = await openJss2A(page);
    expect(classId).toBeTruthy();
    await page.getByRole('button', { name: 'Assessments', exact: true }).click();
    await settle(page);
    await page.getByRole('button', { name: /create assessment/i }).click();
    await page.waitForURL(/\/assessments\/new\?source=manual/, { timeout: 20_000 });

    const title = `JSS 2 A strict assignment ${Date.now()}`;
    const instructions =
      'Answer in full sentences. A noun names a person, place, or thing. Do not start this after the due date.';
    await page.getByPlaceholder('e.g. Chemistry Quiz').fill(title);
    await page.locator('#assessment-type').selectOption({ label: 'Assignment' });
    await page.getByPlaceholder('Provide instructions...').fill(instructions);
    await pickDueDate(page);

    const lateRow = page
      .getByText('Allow late after due date', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await lateRow.getByRole('button').click();
    const penalty = page.getByRole('spinbutton');
    await expect(penalty).toBeVisible();
    await penalty.fill('8');
    await lateRow.getByRole('button').click();
    await expect(page.getByText('Late due penalty (points)')).toHaveCount(0);
    await expect(page.getByRole('spinbutton')).toHaveCount(0);

    const classSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'JSS 2 A' }) }).first();
    await classSelect.selectOption({ label: 'JSS 2 A' });
    const subjectSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'English Language' }) }).first();
    await expect(subjectSelect).toBeVisible({ timeout: 20_000 });
    await subjectSelect.selectOption({ label: 'English Language' });

    const shortAnswer = 'Write one sentence using a noun.';
    const multipleChoice = 'Which of these words is a noun?';
    const essay = 'Explain the difference between a common noun and a proper noun.';
    await fillQuestion(page, shortAnswer, 'SHORT ANSWER');
    await page.getByRole('button', { name: /add question/i }).click();
    await fillQuestion(page, multipleChoice, 'MULTIPLE CHOICE');
    const choices = ['Lagos', 'Run', 'Quickly', 'Blue'];
    for (let i = 0; i < choices.length; i++) {
      await page.getByPlaceholder(`Option ${i + 1}`).fill(choices[i]);
    }
    await page.locator('input[type="radio"]').nth(0).check();
    await page.getByRole('button', { name: /add question/i }).click();
    await fillQuestion(page, essay, 'ESSAY');
    await page.getByPlaceholder('Correct answer/Rubric...').last().fill('A common noun is general. A proper noun names a specific person or place.');

    const termSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /select term/i }) }).last();
    if (!(await termSelect.inputValue())) {
      await termSelect.selectOption({ index: 1 });
    }

    const createResponse = page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        /\/classes\/[^/]+\/assessments$/.test(res.url()) &&
        res.status() >= 200 &&
        res.status() < 300,
    );

    await page.getByRole('button', { name: /publish now/i }).click();
    await expect(page.getByRole('heading', { name: /publish assessment/i })).toBeVisible();
    await page.getByRole('button', { name: /^continue$/i }).click();

    const res = await createResponse;
    const payload = res.request().postDataJSON() as Record<string, unknown>;
    const saved = (await res.json())?.data;

    const sentQuestions = payload.questions as Array<{ type: string; text: string; options?: string[] }>;
    expect(sentQuestions.map((question) => question.type)).toEqual(['SHORT_ANSWER', 'MULTIPLE_CHOICE', 'ESSAY']);
    expect(sentQuestions.map((question) => question.text)).toEqual([shortAnswer, multipleChoice, essay]);
    expect(sentQuestions[1].options).toEqual(['Lagos', 'Run', 'Quickly', 'Blue']);
    expect(payload.type).toBe('ASSIGNMENT');
    expect(payload.allowLateSubmissionAfterDue).toBe(false);
    expect(payload.lateDuePenaltyPoints).toBe(8);
    expect(payload.description).toBe(instructions);
    expect(saved?.status).toBe('PUBLISHED');
    expect(saved?.allowLateSubmissionAfterDue).toBe(false);
    expect(Number(saved?.lateDuePenaltyPoints)).toBe(8);
    expect(saved?.description).toBe(instructions);

    const detailResponse = page.waitForResponse(
      (detail) =>
        detail.request().method() === 'GET' &&
        detail.url().includes(`/schools/`) &&
        detail.url().includes(`/assessments/${saved.id}`) &&
        detail.ok(),
    );
    await page.goto(`/dashboard/teacher/assessments/${saved.id}`);
    const detail = (await (await detailResponse).json())?.data;
    expect(detail?.allowLateSubmissionAfterDue).toBe(false);
    expect(Number(detail?.lateDuePenaltyPoints)).toBe(8);
    expect(detail?.description).toBe(instructions);
    expect(detail?.status).toBe('PUBLISHED');
    const savedQuestions = (detail?.questions || []) as Array<{ type: string; text: string }>;
    expect(savedQuestions.map((question) => question.type)).toEqual(['SHORT_ANSWER', 'MULTIPLE_CHOICE', 'ESSAY']);

    await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(instructions)).toBeVisible();
    await expect(page.getByText(/published/i).first()).toBeVisible();
    await page.getByRole('button', { name: /^questions$/i }).click();
    await expect(page.getByText(shortAnswer)).toBeVisible();
    await expect(page.getByText(multipleChoice)).toBeVisible();
    await expect(page.getByText(essay)).toBeVisible();
    await expect(page.getByText('SHORT ANSWER', { exact: true })).toBeVisible();
    await expect(page.getByText('MULTIPLE CHOICE', { exact: true })).toBeVisible();
    await expect(page.getByText('ESSAY', { exact: true })).toBeVisible();
  });
});
