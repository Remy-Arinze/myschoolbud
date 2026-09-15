import { expect, type Page } from '@playwright/test';

export function loisPanel(page: Page) {
  return page.locator('.lois-panel').last();
}

export async function openLois(page: Page) {
  await expect(page.getByText(/^compiling/i)).toHaveCount(0, { timeout: 180_000 });
  await expect(page.getByText(/loading your dashboard/i)).toHaveCount(0, { timeout: 90_000 });
  const composer = page.getByPlaceholder(/ask lois anything|ask a follow-up/i);
  if (!(await composer.isVisible().catch(() => false))) {
    const cta = page.getByRole('button', { name: /ask lois|lois briefing/i }).first();
    await expect(cta).toBeVisible({ timeout: 60_000 });
    await cta.click();
    if (!(await composer.isVisible().catch(() => false))) {
      await page.waitForTimeout(800);
      await cta.click({ force: true }).catch(() => undefined);
    }
  }
  await expect(composer).toBeVisible({ timeout: 40_000 });

  // Unread insights open a briefing, not a blank thread. Start a new chat for stretch QA.
  const followUp = page.getByPlaceholder(/ask a follow-up/i);
  if (await followUp.isVisible().catch(() => false)) {
    const newChat = loisPanel(page).getByRole('button', { name: /new chat/i }).first();
    await expect(newChat).toBeVisible({ timeout: 10_000 });
    await newChat.click();
    await expect(page.getByPlaceholder(/ask lois anything/i)).toBeVisible({ timeout: 15_000 });
  }

  // Let greeting / screen-focus effects settle so they do not wipe the first turn.
  await expect(loisPanel(page).getByText(/how can i help/i).first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  return loisPanel(page);
}

function isLoisChrome(text: string): boolean {
  return /how can i help/i.test(text) && /lois can make mistakes/i.test(text);
}

export async function waitForLoisIdle(page: Page, timeoutMs = 120_000) {
  const send = page.getByRole('button', { name: /^send$/i });
  const stop = page.getByRole('button', { name: /^stop$/i });
  const input = page.getByPlaceholder(/ask lois anything|ask a follow-up/i);

  await stop.isVisible({ timeout: Math.min(25_000, timeoutMs) }).catch(() => false);

  await expect
    .poll(
      async () => {
        const stopping = await stop.isVisible().catch(() => false);
        const sending = await send.isVisible().catch(() => false);
        const disabled = await input.isDisabled().catch(() => true);
        return !stopping && sending && !disabled;
      },
      { timeout: timeoutMs, intervals: [500, 1000, 1500] },
    )
    .toBe(true);
}

export async function lastAssistantText(page: Page): Promise<string> {
  const panel = loisPanel(page);
  // Assistant turns render through LoisMarkdown (`.lois-md`); user turns still use pre-wrap.
  const markdown = panel.locator('.lois-md');
  const mdCount = await markdown.count();
  if (mdCount > 0) {
    return ((await markdown.nth(mdCount - 1).innerText()) || '').trim();
  }
  const bubbles = panel.locator('.flex-row:not(.flex-row-reverse) .whitespace-pre-wrap');
  const count = await bubbles.count();
  if (count === 0) {
    const fallback = ((await panel.innerText().catch(() => '')) || '').trim();
    return isLoisChrome(fallback) ? '' : fallback;
  }
  return ((await bubbles.nth(count - 1).innerText()) || '').trim();
}

export async function askLois(page: Page, prompt: string, timeoutMs = 120_000): Promise<string> {
  const panel = loisPanel(page);
  const input = panel.getByPlaceholder(/ask lois anything|ask a follow-up/i);
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toBeEnabled();
  await input.click({ force: true });
  await input.fill(prompt);
  await expect(input).toHaveValue(prompt);

  const send = panel.getByRole('button', { name: /^send$/i });
  await expect(send).toBeEnabled();
  await send.click({ force: true });

  // Composer still holds the text until React clears it — require the user bubble.
  const userBubble = panel.locator('.flex-row-reverse .whitespace-pre-wrap').filter({ hasText: prompt });
  await expect(userBubble.first()).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(/how can i help,/i)).toHaveCount(0, { timeout: 15_000 });

  await waitForLoisIdle(page, timeoutMs);

  await expect
    .poll(async () => lastAssistantText(page), {
      timeout: Math.max(30_000, Math.min(timeoutMs, 60_000)),
      intervals: [500, 1000],
    })
    .not.toMatch(/^\s*$|how can i help,/i);

  return lastAssistantText(page);
}

export async function hasTimetablePreview(page: Page): Promise<boolean> {
  const apply = loisPanel(page).getByRole('button', { name: /^apply$/i });
  const preview = loisPanel(page).getByText(/preview only|not saved until you apply/i);
  return (await apply.first().isVisible().catch(() => false)) || (await preview.first().isVisible().catch(() => false));
}

export async function timetableApplyCount(page: Page): Promise<number> {
  return loisPanel(page).getByRole('button', { name: /^apply$/i }).count();
}

export async function cancelLoisPreviews(page: Page): Promise<number> {
  const panel = loisPanel(page);
  let cancelled = 0;
  for (let i = 0; i < 6; i += 1) {
    const buttons = panel.getByRole('button', { name: /^cancel$/i });
    const n = await buttons.count();
    let clicked = false;
    for (let j = 0; j < n; j += 1) {
      const btn = buttons.nth(j);
      if ((await btn.isVisible().catch(() => false)) && (await btn.isEnabled().catch(() => false))) {
        try {
          await btn.click({ timeout: 8_000 });
        } catch {
          continue;
        }
        cancelled += 1;
        clicked = true;
        await page.waitForTimeout(500);
        break;
      }
    }
    if (!clicked) break;
  }
  return cancelled;
}

export function looksLikeInternalId(text: string): boolean {
  return /\bcmt[a-z0-9]{20,}\b/i.test(text) || /\bpaste this id\b/i.test(text);
}

/** Role enums, snake_case keys, and tool names the facing agent must not speak. */
export function looksLikeBackendWording(text: string): boolean {
  return (
    /\b(?:SCHOOL_ADMIN|SUPER_ADMIN)\b/.test(text) ||
    /\b(?:school_owner|head_teacher)\b/.test(text) ||
    /\b(?:adminRole|userRole|UserRole|contextRole)\b/.test(text) ||
    /\b(?:list_students|list_staff|get_school_overview|list_lois_insights)\b/.test(text)
  );
}

export function refusedCapability(text: string): boolean {
  return /can(?:not|'t)|unable to|don't have a (?:tool|way)|use the (?:school administration )?dashboard|staff page|fees page|applications page|not sent|wasn't sent|was not sent/i.test(
    text,
  );
}

export function framedAsPermissionError(text: string): boolean {
  return /beyond my (?:permissions|access)|don'?t have permission|do not have permission|outside my permissions/i.test(
    text,
  );
}

export function looksLikeFullRecipe(text: string): boolean {
  const steps = /parboil|tomato paste|cups of (?:rice|water)|stir-fry the stew|\b(?:heat|boil|fry|simmer)\b/i.test(
    text,
  );
  return steps && (text.length > 500 || /1\.\s|step\s*1/i.test(text));
}

/** Raw tool payload leaked into the chat (ids, JSON keys). */
export function looksLikeToolJsonDump(text: string): boolean {
  return (
    /"studentId"\s*:/.test(text) ||
    /"guardians"\s*:\s*\[/.test(text) ||
    /"classId"\s*:/.test(text) ||
    (/[{[]/.test(text) && /\bcmt[a-z0-9]{20,}\b/.test(text))
  );
}

/** Owner was sent to the dashboard instead of a tool-backed answer. */
export function dashboardBrushOff(text: string): boolean {
  return /don'?t have (?:access|the information)|do not have access|cannot provide (?:that|this) directly|i currently don'?t have access|check the (?:fees|admissions|academic|curriculum|dashboard)/i.test(
    text,
  );
}

const TOOL_NOUN_HINTS = [
  'Fees',
  'Students',
  'Staff',
  'Applications',
  'Attendance',
  'Academic risk',
  'Class performance',
  'Scheme of work',
  'Insights',
  'Timetable preview',
  'Timetable',
  'Quiz',
  'Lesson plan',
  'Knowledge',
  'Guardians',
  'Calendar',
  'School snapshot',
  'Who teaches',
  'Parent draft',
  'Now in class',
];

export async function loisPanelText(page: Page): Promise<string> {
  return ((await loisPanel(page).innerText().catch(() => '')) || '').trim();
}

/** Tool-card nouns that appeared in the panel after a turn. */
export function toolCardHintsGained(before: string, after: string): string[] {
  return TOOL_NOUN_HINTS.filter((noun) => {
    const re = new RegExp(noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return re.test(after) && (!re.test(before) || after.split(noun).length > before.split(noun).length);
  });
}
