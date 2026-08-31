import { expect, type Page } from '@playwright/test';
import { switchSchoolType } from './ui';

/**
 * Open a class curriculum tab for the given school type + class label.
 */
export async function openClassCurriculumTab(
  page: Page,
  type: 'PRIMARY' | 'SECONDARY',
  classLabel: RegExp,
) {
  await page.goto('/dashboard/school/courses');
  await expect(page.getByRole('heading', { name: /classes|courses/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  await switchSchoolType(page, type);

  await page
    .waitForResponse(
      (r) =>
        r.url().includes('/classes') &&
        r.request().method() === 'GET' &&
        !r.url().includes('/timetable'),
      { timeout: 45_000 },
    )
    .catch(() => null);

  const classTitle = page.locator('h3').filter({ hasText: classLabel }).first();
  await expect(classTitle).toBeVisible({ timeout: 30_000 });

  await classTitle.click();
  await page.waitForURL(/\/dashboard\/school\/courses\/[^/?#]+/, {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });

  const tab = page.locator('button, a, [role="tab"]').filter({ hasText: /^Curriculum$/i }).first();
  await expect(tab).toBeVisible({ timeout: 20_000 });
  await tab.click();

  await expect(page.getByRole('heading', { name: /class curriculum/i })).toBeVisible({
    timeout: 45_000,
  });
}

/**
 * Import Agora Standard pack for one subject card on the curriculum list.
 * Skips if already published/imported (returns 'skipped').
 */
export async function importAgoraPackForSubject(
  page: Page,
  subjectName: string | RegExp,
): Promise<'imported' | 'skipped'> {
  const nameRe =
    typeof subjectName === 'string'
      ? new RegExp(subjectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : subjectName;

  const card = page.locator('div.cursor-pointer').filter({ hasText: nameRe }).first();
  await expect(card, `Subject card for ${nameRe}`).toBeVisible({ timeout: 20_000 });

  const cardText = (await card.innerText()).replace(/\s+/g, ' ');
  if (/imported from (agora|bud library)|bud library curriculum|agora curriculum|published|review/i.test(cardText) && !/set up curriculum/i.test(cardText)) {
    // Prefer Change only when we explicitly want re-import; for bulk import, skip done ones
    if (!/set up curriculum|not set up/i.test(cardText)) {
      return 'skipped';
    }
  }

  const setupBtn = card.getByRole('button', { name: /set up curriculum|change/i }).first();
  if (await setupBtn.isVisible().catch(() => false)) {
    const isChange = /change/i.test((await setupBtn.innerText().catch(() => '')) || '');
    if (isChange) {
      page.once('dialog', (d) => d.accept().catch(() => {}));
    }
    await setupBtn.click();
  } else {
    await card.click();
  }

  await expect(page.getByText(/term outlining/i).first()).toBeVisible({ timeout: 20_000 });

  const libraryResPromise = page.waitForResponse(
    (r) => r.url().includes('/curriculum/agora-library') && r.request().method() === 'GET',
    { timeout: 25_000 },
  );

  await page.getByRole('button', { name: /^(bud library|standard)$/i }).click().catch(() => {});

  await libraryResPromise.catch(() => null);

  await expect(page.getByRole('heading', { name: /select master curriculum/i })).toBeVisible({
    timeout: 25_000,
  });

  const noTemplates = page.getByText(/no templates available/i);
  if (await noTemplates.isVisible().catch(() => false)) {
    // Close modal and skip
    const close = page.getByRole('button', { name: /close|cancel|×/i }).first();
    if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    else await page.keyboard.press('Escape');
    throw new Error(`No Agora templates for subject matching ${nameRe}`);
  }

  const templateCard = page
    .locator('div.cursor-pointer')
    .filter({ hasText: /v\d/i })
    .first();
  await expect(templateCard).toBeVisible({ timeout: 15_000 });
  await templateCard.click();

  const importBtn = page.getByRole('button', { name: /^import$/i });
  await expect(importBtn).toBeVisible({ timeout: 25_000 });
  await importBtn.click();

  page.once('dialog', async (d) => {
    await d.accept().catch(() => {});
  });

  const useTemplate = page.getByRole('button', { name: /use template/i });
  await expect(useTemplate).toBeVisible({ timeout: 10_000 });
  await expect(useTemplate).toBeEnabled({ timeout: 5_000 });

  const setupResPromise = page.waitForResponse(
    (r) => r.url().includes('/curriculum/schemes/setup') && r.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await useTemplate.click();

  const setupRes = await setupResPromise;
  const setupText = await setupRes.text().catch(() => '');
  expect(setupRes.ok(), `schemes/setup failed: ${setupText.slice(0, 300)}`).toBeTruthy();

  await expect(
    page
      .getByText(
        /curriculum setup complete|curriculum replaced|imported from (agora|bud library)|bud library curriculum|agora curriculum|published/i,
      )
      .first(),
  ).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole('heading', { name: /class curriculum/i })).toBeVisible({
    timeout: 20_000,
  });

  return 'imported';
}
