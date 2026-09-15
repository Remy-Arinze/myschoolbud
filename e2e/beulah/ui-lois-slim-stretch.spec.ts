import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { SLIM_STRETCH_CATALOG } from '../../../backend/src/ai/lois-slim-stretch.catalog';
import {
  askLois,
  cancelLoisPreviews,
  dashboardBrushOff,
  framedAsPermissionError,
  hasTimetablePreview,
  looksLikeBackendWording,
  looksLikeFullRecipe,
  looksLikeInternalId,
  looksLikeToolJsonDump,
  loisPanelText,
  openLois,
  refusedCapability,
  toolCardHintsGained,
} from '../helpers/lois-chat';

/**
 * Headed slim-supervisor stretch on Beulah High School.
 * Prompts are paraphrases that miss coded regex desks (see lois-slim-stretch.catalog).
 * One long conversation: greetings, paraphrases, multi-task, capability, RAG, off-topic, clarify, recap.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const CONTENT_DIR = path.resolve(__dirname, '../../../content/screenshots/lois-slim');
const contentManifest: Array<{ file: string; title: string; caption: string }> = [];
let shotIndex = 0;

function catalogPrompt(id: string): string {
  const row = SLIM_STRETCH_CATALOG.find((r) => r.id === id);
  if (!row) throw new Error(`Missing stretch catalog id ${id}`);
  return row.prompt;
}

async function capture(page: Page, slug: string, title: string, caption: string) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  shotIndex += 1;
  const file = `${String(shotIndex).padStart(2, '0')}-${slug}.png`;
  await page.screenshot({ path: path.join(CONTENT_DIR, file) });
  contentManifest.push({ file, title, caption });
  console.log(`[content] ${file}`);
}

function note(severity: Finding['severity'], area: string, message: string) {
  findings.push({ severity, area, note: message });
  console.log(`[QA:${severity}] ${area} — ${message}`);
}

function excerpt(text: string, n = 280) {
  return text.replace(/\s+/g, ' ').trim().slice(0, n);
}

function cover(
  area: string,
  reply: string,
  parts: Array<{ label: string; re: RegExp; severity?: Finding['severity'] }>,
) {
  for (const part of parts) {
    if (part.re.test(reply)) note('pass', area, `${part.label}: ${excerpt(reply)}`);
    else note(part.severity || 'major', area, `Missing ${part.label}: ${excerpt(reply)}`);
  }
}

async function scoreReply(
  page: Page,
  area: string,
  reply: string,
  checks: { must?: RegExp[]; mustNotId?: boolean; refuse?: boolean } = {},
) {
  if (!reply) {
    note('blocker', area, 'Empty Lois reply');
    expect(reply, `${area} should not be empty`).toBeTruthy();
    return;
  }

  if (checks.mustNotId !== false) {
    if (looksLikeInternalId(reply) || looksLikeToolJsonDump(reply)) {
      note('major', area, `Leaked id or JSON: ${excerpt(reply)}`);
    } else {
      note('pass', area, 'No internal ids');
    }
  }

  if (looksLikeBackendWording(reply)) {
    note('major', area, `Backend wording leaked: ${excerpt(reply)}`);
  }

  if (dashboardBrushOff(reply)) {
    note('major', area, `Dashboard brush-off instead of a tool answer: ${excerpt(reply)}`);
  }

  if (checks.refuse) {
    if (framedAsPermissionError(reply)) {
      note('major', area, `Framed as a permission error: ${excerpt(reply)}`);
    } else if (refusedCapability(reply)) {
      note('pass', area, `Refused as expected: ${excerpt(reply)}`);
    } else {
      note('major', area, `Did not clearly refuse: ${excerpt(reply)}`);
    }
  }

  for (const re of checks.must || []) {
    if (re.test(reply)) note('pass', area, `Matched ${re}: ${excerpt(reply)}`);
    else note('major', area, `Missing ${re}: ${excerpt(reply)}`);
  }
}

async function askStretch(
  page: Page,
  id: string,
  timeoutMs = 150_000,
): Promise<{ reply: string; tools: string[] }> {
  const prompt = catalogPrompt(id);
  const before = await loisPanelText(page);
  const reply = await askLois(page, prompt, timeoutMs);
  const after = await loisPanelText(page);
  const tools = toolCardHintsGained(before, after);
  if (tools.length) note('info', id, `Tool cards: ${tools.join(', ')}`);
  else note('info', id, 'No new tool-card nouns visible');
  return { reply, tools };
}

test.describe.configure({ mode: 'serial', timeout: 55 * 60 * 1000 });

test.describe('Lois slim-supervisor stretch — Beulah High School', () => {
  test.afterEach(async ({}, testInfo) => {
    writeReport();
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    const dest = path.join(CONTENT_DIR, 'lois-slim-stretch.webm');
    const attached = testInfo.attachments.find((a) => a.contentType === 'video/webm' && a.path);
    const resultsDir = path.resolve(__dirname, '../../test-results');
    let src = attached?.path;
    if (!src || !fs.existsSync(src)) {
      const found = fs.existsSync(resultsDir)
        ? fs
            .readdirSync(resultsDir, { recursive: true })
            .map((f) => path.join(resultsDir, String(f)))
            .find((f) => f.endsWith('.webm') && fs.existsSync(f))
        : undefined;
      src = found;
    }
    if (src && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      if (!contentManifest.some((m) => m.file === 'lois-slim-stretch.webm')) {
        contentManifest.push({
          file: 'lois-slim-stretch.webm',
          title: 'Lois slim-supervisor stretch',
          caption:
            'Paraphrases that miss coded desks: finance, roster, admissions, academic, pedagogy, multi-task, capability, RAG, off-topic, clarify.',
        });
      }
      console.log(`[content] copied video → ${dest}`);
    }
    fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), JSON.stringify(contentManifest, null, 2));
  });

  test('paraphrases, multi-task, and assistant fallbacks', async ({ page }) => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    for (const name of fs.readdirSync(CONTENT_DIR)) {
      if (/\.(png|webm)$/i.test(name)) fs.unlinkSync(path.join(CONTENT_DIR, name));
    }

    await page.goto('/dashboard/school', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/school/);
    await expect(page.getByText(/access denied/i)).toHaveCount(0);
    await expect(page.getByText(/^Loading\.\.\.$/)).toHaveCount(0, { timeout: 180_000 });
    await expect(page.getByText(/verifying permissions/i)).toHaveCount(0, { timeout: 90_000 });
    await expect(page.getByText(/beulah/i).first()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('button', { name: /ask lois/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/loading dashboard data/i)).toHaveCount(0, { timeout: 90_000 });
    await page.getByText(/^compiling/i).waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => undefined);
    note('pass', 'Session', 'Logged in as Beulah school admin');

    await openLois(page);
    await capture(page, 'open', 'Ask Lois', 'Slim-supervisor stretch conversation.');

    const hello = await askStretch(page, 'S0-hello', 60_000);
    await scoreReply(page, 'S0 hello', hello.reply, { must: [/lois|help|beulah/i] });
    await capture(page, 'hello', 'Hey Lois', 'Small-talk greeting — should skip slim.');

    const identity = await askStretch(page, 'S1-identity', 60_000);
    await scoreReply(page, 'S1 identity', identity.reply, {
      must: [/lois|school|fees|class|timetable|student/i],
    });
    await capture(page, 'identity', 'What can you do', 'Assistant identity without a desk.');

    const debt = await askStretch(page, 'S2-debt-paraphrase');
    await scoreReply(page, 'S2 debt paraphrase', debt.reply);
    cover('S2 debt paraphrase', debt.reply, [
      { label: 'fees/debt/paid', re: /debt|owing|outstanding|fee|₦|naira|paid|bursar|no one/i },
      { label: 'JSS 1', re: /jss\s*1/i, severity: 'info' },
    ]);
    await capture(page, 'debt-paraphrase', 'People in debt', 'Finance paraphrase that misses who-owes regex.');

    const samePrimary = await askStretch(page, 'S3-anaphora-same-for');
    await scoreReply(page, 'S3 same for Primary 1', samePrimary.reply);
    cover('S3 same for Primary 1', samePrimary.reply, [
      { label: 'Primary 1 or fees follow-up', re: /primary\s*1|fee|debt|owing|paid|bursar/i },
    ]);
    await capture(page, 'same-primary', 'Same for Primary 1', 'Anaphora after a slim finance turn.');

    const children = await askStretch(page, 'S4-children-names');
    await scoreReply(page, 'S4 children names', children.reply);
    cover('S4 children names', children.reply, [
      { label: 'Chioma or Kelechi', re: /chioma|kelechi|nnamani|okonkwo/i },
    ]);
    await capture(page, 'children-names', 'Children in JSS 1 A', 'Roster paraphrase — children, not class list.');

    const waiting = await askStretch(page, 'S5-admissions-paraphrase');
    await scoreReply(page, 'S5 admissions paraphrase', waiting.reply);
    cover('S5 admissions paraphrase', waiting.reply, [
      { label: 'applications/joiners/none', re: /application|applicant|admission|pending|inbox|no one|none|waiting/i },
    ]);
    await capture(page, 'waiting-to-join', 'Waiting to join', 'Admissions paraphrase that misses inbox regex.');

    const struggling = await askStretch(page, 'S6-struggling');
    await scoreReply(page, 'S6 struggling', struggling.reply);
    cover('S6 struggling', struggling.reply, [
      { label: 'risk/grades/no data', re: /risk|struggling|below|average|grade|performance|no (?:published|grade|data)|threshold/i },
    ]);
    await capture(page, 'struggling', 'Kids struggling', 'Academic paraphrase — struggling, not at-risk.');

    const flagged = await askStretch(page, 'S7-flagged-issues');
    await scoreReply(page, 'S7 flagged issues', flagged.reply);
    if (/agricultural|week 1|not delivered|meaning of agriculture|scheme of work|insight/i.test(flagged.reply)) {
      note('pass', 'S7 flagged issues', excerpt(flagged.reply));
    } else {
      note('major', 'S7 flagged issues', `Did not surface filed issues: ${excerpt(flagged.reply)}`);
    }
    await capture(page, 'flagged', 'Flagged issues', 'Insights paraphrase that misses "what have you noticed".');

    const quiz = await askStretch(page, 'S8-revision-questions', 180_000);
    await scoreReply(page, 'S8 revision questions', quiz.reply);
    cover('S8 revision questions', quiz.reply, [
      { label: 'questions/quiz', re: /question|quiz|option|answer|revision/i },
      { label: 'fractions / maths', re: /fraction|math|numerator|denominator|half|quarter/i },
    ]);
    await capture(page, 'revision', 'Revision questions', 'Pedagogy paraphrase — whip up questions, not generate quiz.');

    const thursday = await askStretch(page, 'S9-thursday-board', 180_000);
    await scoreReply(page, 'S9 Thursday board', thursday.reply);
    if (/thursday|period|assembly|no (saved )?period|no timetable|english|mathematics|geography|commerce/i.test(thursday.reply)) {
      note('pass', 'S9 Thursday board', excerpt(thursday.reply));
    } else {
      note('major', 'S9 Thursday board', `Did not read Thursday: ${excerpt(thursday.reply)}`);
    }
    if (await hasTimetablePreview(page)) {
      note('major', 'S9 Thursday board', 'Showed an Apply/preview card on a read-only paraphrase');
    }
    await capture(page, 'thursday-board', 'On the board Thursday', 'Timetable read paraphrase — board, not generate.');

    const triple = await askStretch(page, 'S10-triple-paraphrase', 180_000);
    await scoreReply(page, 'S10 triple paraphrase', triple.reply);
    cover('S10 triple paraphrase', triple.reply, [
      { label: 'payments/debt', re: /pay|debt|owing|fee|outstanding|bursar|no unpaid|no one/i },
      { label: 'children names', re: /chioma|kelechi|nnamani|okonkwo|student|pupil|child/i },
      { label: 'struggling/risk', re: /risk|struggling|below|average|grade|performance|no (?:published|grade|data)/i },
    ]);
    await capture(page, 'triple', 'Triple paraphrase', 'Three slim desks in one sentence with no coded verbs.');

    const typos = await askStretch(page, 'S11-typos');
    await scoreReply(page, 'S11 typos', typos.reply);
    cover('S11 typos', typos.reply, [
      { label: 'fees despite typos', re: /fee|owing|debt|paid|bursar|outstanding|₦|naira/i },
    ]);
    await capture(page, 'typos', 'Typos', 'who stil ows fess — slim must still land finance.');

    const pta = await askStretch(page, 'S12-pta-prep', 180_000);
    await scoreReply(page, 'S12 PTA prep', pta.reply);
    cover('S12 PTA prep', pta.reply, [
      { label: 'who has not paid', re: /pay|fee|debt|owing|outstanding|bursar/i },
      { label: 'falling behind', re: /behind|risk|struggling|grade|average|performance|no (?:published|grade|data)/i },
    ]);
    await capture(page, 'pta', 'PTA prep', 'Assistant-style dual brief: money plus academics.');

    const payroll = await askStretch(page, 'S13-payroll');
    await scoreReply(page, 'S13 payroll', payroll.reply, { refuse: true });
    if (/i('ve| have) added|chinedu is (now |)on|hired chinedu|on the payroll/i.test(payroll.reply) && !/can't|cannot|don't/i.test(payroll.reply)) {
      note('blocker', 'S13 payroll', `Claimed to hire: ${excerpt(payroll.reply)}`);
    }
    await capture(page, 'payroll', 'Payroll paraphrase', 'Capability write with no hire/staff regex.');

    const draft = await askStretch(page, 'S14-draft-message');
    await scoreReply(page, 'S14 draft message', draft.reply);
    if (/i (have|just) sent|message has been sent|whatsapp|emailed/i.test(draft.reply) && !/not sent|didn't send|do not send|won't send|draft/i.test(draft.reply)) {
      note('blocker', 'S14 draft message', `Claimed to send: ${excerpt(draft.reply)}`);
    }
    cover('S14 draft message', draft.reply, [
      { label: 'draft / not sent', re: /draft|not sent|wasn't sent|will not send|won't send|copy/i },
      { label: 'Obinna or father', re: /obinna|father|guardian|parent|chioma/i, severity: 'info' },
    ]);
    await capture(page, 'draft-message', 'Draft to father', 'Message-on-phone paraphrase should draft, not send.');

    const policy = await askStretch(page, 'S15-late-policy');
    await scoreReply(page, 'S15 late policy', policy.reply);
    cover('S15 late policy', policy.reply, [
      { label: 'late / policy / handbook / none', re: /late|polic|handbook|document|not (?:in|on) (?:the )?(?:handbook|documents)|no (?:uploaded|matching)|coming/i },
    ]);
    await capture(page, 'late-policy', 'Late-coming policy', 'Slim RAG path — handbook, not a live roster.');

    writeReport();
    const blockers = findings.filter((f) => f.severity === 'blocker');
    expect(blockers, blockers.map((b) => b.note).join('; ')).toHaveLength(0);
  });

  test('off-topic, timetable paraphrase, compare, recap', async ({ page }) => {
    await page.goto('/dashboard/school', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page).toHaveURL(/\/dashboard\/school/);
    await expect(page.getByText(/^Loading\.\.\.$/)).toHaveCount(0, { timeout: 180_000 });
    await expect(page.getByText(/beulah/i).first()).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('button', { name: /ask lois|lois briefing/i })).toBeVisible({ timeout: 30_000 });
    note('pass', 'Session (further)', 'Logged in as Beulah school admin');

    await openLois(page);
    await capture(page, 'further-open', 'Ask Lois', 'Further slim stretch: off-topic, generate, recap.');

    const jollof = await askStretch(page, 'S16-jollof');
    await scoreReply(page, 'S16 jollof', jollof.reply);
    if (looksLikeFullRecipe(jollof.reply)) {
      note('major', 'S16 jollof', `Gave a full recipe: ${excerpt(jollof.reply)}`);
    } else {
      note('pass', 'S16 jollof', `Stayed off-topic without a recipe dump: ${excerpt(jollof.reply)}`);
    }
    await capture(page, 'jollof', 'Jollof only', 'Pure off-topic — slim should refuse recipes.');

    const mixed = await askStretch(page, 'S17-mixed', 180_000);
    await scoreReply(page, 'S17 mixed', mixed.reply);
    if (looksLikeFullRecipe(mixed.reply)) {
      note('major', 'S17 mixed', `Recipe drowned the school ask: ${excerpt(mixed.reply)}`);
    }
    cover('S17 mixed', mixed.reply, [
      { label: 'children or Chioma', re: /chioma|kelechi|nnamani|okonkwo|student|pupil|child/i },
      { label: 'debt/fees', re: /debt|owing|fee|paid|bursar|outstanding/i },
    ]);
    await capture(page, 'mixed', 'Jollof later plus school', 'Off-topic jammed with two slim school desks.');

    const noClass = await askStretch(page, 'S18-schedule-no-class');
    await scoreReply(page, 'S18 schedule no class', noClass.reply);
    if (/\bwhich class|which (?:level|arm)|for which/i.test(noClass.reply)) {
      note('pass', 'S18 schedule no class', `Asked which class: ${excerpt(noClass.reply)}`);
    } else if (await hasTimetablePreview(page)) {
      note('major', 'S18 schedule no class', `Generated without a class: ${excerpt(noClass.reply)}`);
    } else {
      note('info', 'S18 schedule no class', excerpt(noClass.reply));
    }
    await capture(page, 'schedule-clarify', 'Weekly schedule', 'Generate paraphrase with no class named.');

    const slot = await askStretch(page, 'S19-slot-jss1a', 180_000);
    await scoreReply(page, 'S19 slot JSS 1 A', slot.reply);
    const previewAfterSlot = await hasTimetablePreview(page);
    if (previewAfterSlot || /jss\s*1\s*a|preview|period|timetable|schedule/i.test(slot.reply)) {
      note('pass', 'S19 slot JSS 1 A', excerpt(slot.reply));
    } else {
      note('major', 'S19 slot JSS 1 A', `Did not resume the schedule job: ${excerpt(slot.reply)}`);
    }
    await capture(page, 'slot-jss1a', 'JSS 1 A slot fill', 'Short class token after slim clarify.');

    const sameJss2 = await askStretch(page, 'S20-same-jss2a', 180_000);
    await scoreReply(page, 'S20 same for JSS 2 A', sameJss2.reply);
    if (/jss\s*2/i.test(sameJss2.reply) || (await hasTimetablePreview(page))) {
      note('pass', 'S20 same for JSS 2 A', excerpt(sameJss2.reply));
    } else {
      note('major', 'S20 same for JSS 2 A', `Did not continue the schedule job: ${excerpt(sameJss2.reply)}`);
    }
    if (previewAfterSlot || (await hasTimetablePreview(page))) {
      try {
        const cancelled = await cancelLoisPreviews(page);
        if (cancelled > 0) note('pass', 'S20 cancel', `Cancelled ${cancelled} preview(s)`);
        else note('info', 'S20 cancel', 'No Cancel button — left preview unapplied');
      } catch {
        note('info', 'S20 cancel', 'Cancel click timed out — left preview unapplied');
      }
    }
    await capture(page, 'same-jss2a', 'Same for JSS 2 A', 'Anaphora on a slim-started curator job.');

    const oct1 = await askStretch(page, 'S21-october-first');
    await scoreReply(page, 'S21 October 1st', oct1.reply);
    cover('S21 October 1st', oct1.reply, [
      { label: 'Independence / 1 Oct / holiday / closed', re: /independence|1(?:st)?\s+oct|october|holiday|closed|open/i },
    ]);
    await capture(page, 'october-first', 'October 1st', 'Calendar paraphrase — shutting, not Independence Day this week.');

    const compare = await askStretch(page, 'S22-compare', 180_000);
    await scoreReply(page, 'S22 compare', compare.reply);
    cover('S22 compare', compare.reply, [
      { label: 'Primary 1', re: /primary\s*1|chiamaka|ibrahim/i },
      { label: 'JSS 1 A', re: /jss\s*1|chioma|kelechi/i },
      { label: 'counts or debt', re: /\b\d+\b|debt|owing|fee|paid|child|student/i },
    ]);
    await capture(page, 'compare', 'Compare classes', 'Two classes, two slim desks, assistant comparison.');

    const thanks = await askStretch(page, 'S23-thanks', 60_000);
    await scoreReply(page, 'S23 thanks', thanks.reply, { must: [/welcome|here if|anytime|help/i] });
    await capture(page, 'thanks', 'Thanks', 'Small-talk after a long thread.');

    const recap = await askStretch(page, 'S24-recap');
    await scoreReply(page, 'S24 recap', recap.reply);
    cover('S24 recap', recap.reply, [
      { label: 'JSS 1 A names from earlier', re: /chioma|kelechi|nnamani|okonkwo/i },
    ]);
    await capture(page, 'recap', 'Remind me', 'Thread memory after slim hops.');

    writeReport();
    const blockers = findings.filter((f) => f.severity === 'blocker');
    expect(blockers, blockers.map((b) => b.note).join('; ')).toHaveLength(0);
  });
});

function writeReport() {
  const outDir = path.resolve(__dirname, '../../../qa-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const majors = findings.filter((f) => f.severity === 'major').length;
  const body = [
    `# Lois slim-supervisor stretch QA — Beulah High School (${stamp})`,
    '',
    'Logged in as `remyarinze+beuadmin@gmail.com` (Arinze Obasi). Headed Playwright.',
    'Every school prompt is a paraphrase that **misses coded regex desks**, so routing must fall through to the slim supervisor (or small-talk / anaphora / slot-fill).',
    '',
    `Findings: **${majors} major**, ${findings.filter((f) => f.severity === 'blocker').length} blocker, ${findings.filter((f) => f.severity === 'pass').length} pass, ${findings.filter((f) => f.severity === 'info').length} info.`,
    '',
    '| Severity | Area | Note |',
    '| --- | --- | --- |',
    ...findings.map((f) => `| ${f.severity} | ${f.area} | ${f.note.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
  const file = path.join(outDir, `${stamp}-lois-beulah-slim-stretch-qa-report.md`);
  fs.writeFileSync(file, body);
  console.log(`[QA] Wrote ${file}`);
}
