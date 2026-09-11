import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  askLois,
  cancelLoisPreviews,
  framedAsPermissionError,
  hasTimetablePreview,
  looksLikeFullRecipe,
  looksLikeInternalId,
  openLois,
  refusedCapability,
  timetableApplyCount,
} from '../helpers/lois-chat';

/**
 * Headed school-admin Lois stress QA on Beulah High School (Arinze / remyarinze+beuadmin).
 * One long conversation: compound asks, pronouns, desk hops. Does not Apply unless E2E_LOIS_APPLY=1.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const APPLY = process.env.E2E_LOIS_APPLY === '1';
const CONTENT_DIR = path.resolve(__dirname, '../../../content/screenshots/lois');
const contentManifest: Array<{ file: string; title: string; caption: string }> = [];
let shotIndex = 0;

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

function duplicatedParagraph(text: string): boolean {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60);
  return paras.some((p, i) => paras.slice(i + 1).some((q) => q === p || q.includes(p)));
}

function lagosYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d);
}

function mondayOfWeek(ymd: string): string {
  const [y, m, day] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day));
  const dow = dt.getUTCDay();
  const back = dow === 0 ? 6 : dow - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, day] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
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
    if (part.re.test(reply)) {
      note('pass', area, `${part.label}: ${excerpt(reply)}`);
    } else {
      note(part.severity || 'major', area, `Missing ${part.label}: ${excerpt(reply)}`);
    }
  }
}

async function scoreReply(
  area: string,
  reply: string,
  checks: { must?: RegExp[]; mustNotId?: boolean; refuse?: boolean },
) {
  if (!reply) {
    note('blocker', area, 'Empty Lois reply');
    expect(reply, `${area} should not be empty`).toBeTruthy();
    return;
  }

  if (checks.mustNotId && looksLikeInternalId(reply)) {
    note('major', area, `Leaked internal id: ${excerpt(reply)}`);
  } else if (checks.mustNotId) {
    note('pass', area, 'No internal ids');
  }

  if (checks.refuse) {
    if (framedAsPermissionError(reply)) {
      note('major', area, `Framed as a permission error: ${excerpt(reply)}`);
    } else if (duplicatedParagraph(reply)) {
      note('major', area, `Duplicated refusal: ${excerpt(reply)}`);
    } else if (refusedCapability(reply)) {
      note('pass', area, `Refused as expected: ${excerpt(reply)}`);
    } else {
      note('major', area, `Did not clearly refuse: ${excerpt(reply)}`);
    }
  }

  for (const re of checks.must || []) {
    if (re.test(reply)) {
      note('pass', area, `Matched ${re}: ${excerpt(reply)}`);
    } else {
      note('major', area, `Missing ${re}: ${excerpt(reply)}`);
    }
  }
}

test.describe.configure({ mode: 'serial', timeout: 45 * 60 * 1000 });

test.describe('Lois school admin — Beulah High School', () => {
  test.afterEach(async ({}, testInfo) => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    const dest = path.join(CONTENT_DIR, 'lois-school-admin.webm');
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
      if (!contentManifest.some((m) => m.file === 'lois-school-admin.webm')) {
        contentManifest.push({
          file: 'lois-school-admin.webm',
          title: 'Lois school-admin stretch',
          caption:
            'Compound briefing, follow-ups, fees, admissions, academic, refused writes, dual timetable preview.',
        });
      }
      console.log(`[content] copied video → ${dest}`);
    }
    fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), JSON.stringify(contentManifest, null, 2));
  });

  test('morning briefing through dual timetable preview', async ({ page }) => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    for (const name of fs.readdirSync(CONTENT_DIR)) {
      if (/\.(png|webm)$/i.test(name)) fs.unlinkSync(path.join(CONTENT_DIR, name));
    }

    await page.goto('/dashboard/school');
    await expect(page).toHaveURL(/\/dashboard\/school/);
    await expect(page.getByText(/access denied/i)).toHaveCount(0);
    await expect(page.getByText(/beulah/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /ask lois/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/loading dashboard data/i)).toHaveCount(0, { timeout: 90_000 });
    note('pass', 'Session', 'Logged in as Beulah school admin');

    await openLois(page);
    note('pass', 'Open', 'Lois composer is reachable');
    await capture(page, 'lois-open', 'Ask Lois', 'School admin opens Lois from the Beulah dashboard.');

    // 1. Compound morning briefing — stats + this week + named holiday
    const briefing = await askLois(
      page,
      'Morning Lois. Snapshot please: how many students, teachers, and class arms do we have, what is happening this week, and are we closed on Independence Day?',
      150_000,
    );
    await scoreReply('T1 briefing', briefing, { mustNotId: true, must: [/\d+/, /teacher/i] });
    cover('T1 briefing', briefing, [
      { label: 'student count (~26)', re: /\b26\b|twenty[- ]?six/i },
      { label: 'teacher count (~86)', re: /\b86\b|eighty[- ]?six/i },
      { label: 'class arms not zero', re: /class arm|\b(?:[1-9]\d?)\s+class/i },
    ]);
    if (/\b0\s+class(?:es)?\b|classes:\s*0|no classes/i.test(briefing)) {
      note('major', 'T1 briefing', `Reported 0 classes: ${excerpt(briefing)}`);
    }
    const today = lagosYmd();
    const weekFrom = mondayOfWeek(today);
    const weekTo = addDaysYmd(weekFrom, 6);
    const claimsIndependenceIsThisWeek =
      /independence[^.!\n]{0,40}this week|this week[^.!\n]{0,40}independence/i.test(briefing) &&
      !/not this week|is not this week|outside this week/i.test(briefing);
    if (claimsIndependenceIsThisWeek && ('2026-10-01' < weekFrom || '2026-10-01' > weekTo)) {
      note('major', 'T1 briefing', `Independence Day treated as this week (${weekFrom}–${weekTo}): ${excerpt(briefing)}`);
    } else {
      note('pass', 'T1 briefing', `Calendar window ${weekFrom}–${weekTo}`);
    }
    if (/independence|1(?:st)?\s+oct|october\s+1/i.test(briefing)) {
      note('pass', 'T1 briefing', `Addressed Independence Day: ${excerpt(briefing)}`);
    } else {
      note('info', 'T1 briefing', `Did not mention Independence Day in the same reply: ${excerpt(briefing)}`);
    }
    await capture(page, 'morning-briefing', 'Morning briefing', 'Compound ask: headcount, this week, Independence Day.');

    // 2. People cluster — staff, her class, another arm
    const people = await askLois(
      page,
      "Who is Adaeze Okeke, who is in her class, and who is enrolled in JSS 1 A?",
      150_000,
    );
    await scoreReply('T2 people', people, { mustNotId: true, must: [/adaeze/i] });
    cover('T2 people', people, [
      { label: 'Adaeze as teacher/staff', re: /teacher|staff|primary/i },
      { label: 'Primary 1 students (Chiamaka or Ibrahim)', re: /chiamaka|ibrahim|okafor|musa|primary\s*1/i },
      { label: 'JSS 1 A students (Chioma or Kelechi)', re: /chioma|kelechi|nnamani|okonkwo/i },
    ]);
    await capture(page, 'people-cluster', 'People cluster', 'Adaeze, her Primary 1 class, and the JSS 1 A roster.');

    // 3. Pronoun follow-up on Chioma — overview, guardian, fees, draft
    const chioma = await askLois(
      page,
      "Tell me more about Chioma — her class, her guardians, and whether she owes fees. Then draft a short note to her father about outstanding fees. Do not send it.",
      150_000,
    );
    await scoreReply('T3 Chioma', chioma, { mustNotId: true, must: [/chioma/i] });
    cover('T3 Chioma', chioma, [
      { label: 'JSS 1 context', re: /jss\s*1/i },
      { label: 'guardian (Obinna / father)', re: /obinna|father|guardian|parent/i },
      { label: 'draft not sent', re: /draft|not sent|wasn't sent|was not sent|copy/i },
    ]);
    if (/i (have|just) sent|message has been sent|emailed her father/i.test(chioma)) {
      note('blocker', 'T3 Chioma', `Claimed to send a parent message: ${excerpt(chioma)}`);
    }
    await capture(page, 'chioma-followup', 'Chioma follow-up', 'Pronoun follow-up: class, guardian, fees, unsent draft.');

    // 4. Finance + admissions in one breath (desk hop)
    const moneyInbox = await askLois(
      page,
      'Who still owes school fees, and do we have any pending admission applications?',
      150_000,
    );
    await scoreReply('T4 fees+admissions', moneyInbox, { mustNotId: true });
    const hasFees = /fee|owing|outstanding|debt|₦|naira|paid up|no one owes/i.test(moneyInbox);
    const hasApps = /application|pending|admission|inbox|applicant/i.test(moneyInbox);
    if (hasFees) note('pass', 'T4 fees+admissions', `Touched fees: ${excerpt(moneyInbox)}`);
    else note('major', 'T4 fees+admissions', `Did not cover outstanding fees: ${excerpt(moneyInbox)}`);
    if (hasApps) note('pass', 'T4 fees+admissions', `Touched admissions: ${excerpt(moneyInbox)}`);
    else note('info', 'T4 fees+admissions', `Did not cover applications in the same turn: ${excerpt(moneyInbox)}`);
    await capture(page, 'fees-admissions', 'Fees and admissions', 'Who owes, and the applications inbox.');

    if (!hasApps) {
      const appsOnly = await askLois(page, 'And the pending applications — how many, and who are they?');
      await scoreReply('T4b admissions follow-up', appsOnly, { mustNotId: true });
      cover('T4b admissions follow-up', appsOnly, [
        { label: 'admissions/applications', re: /application|pending|admission|none|no pending/i },
      ]);
      await capture(page, 'admissions-followup', 'Admissions follow-up', 'Pending applications after the fees desk.');
    }

    // 5. Academic cluster
    const academic = await askLois(
      page,
      'Any students at academic risk? How is JSS 1 performing, and do we have a scheme of work for JSS 1 Mathematics?',
      150_000,
    );
    await scoreReply('T5 academic', academic, { mustNotId: true });
    cover('T5 academic', academic, [
      { label: 'risk or performance', re: /risk|average|performance|below|grade|no published|threshold/i },
      { label: 'JSS 1', re: /jss\s*1/i },
      { label: 'scheme of work / maths', re: /scheme|mathematics|maths|week|topic|not published|no scheme/i },
    ]);
    await capture(page, 'academic-cluster', 'Academic cluster', 'Risk, JSS 1 performance, and the Maths scheme.');

    // 6. Three writes in one ask — all must be refused
    const writes = await askLois(
      page,
      'Hire Chinedu Okeke as a Secondary Mathematics teacher, record that Chioma Nnamani paid ₦50,000, and approve any pending applications.',
      150_000,
    );
    await scoreReply('T6 cannot-do bundle', writes, { mustNotId: true, refuse: true });
    if (/i('ve| have) added|chinedu is (now |)on|hired chinedu/i.test(writes)) {
      note('blocker', 'T6 cannot-do bundle', `Claimed to hire: ${excerpt(writes)}`);
    }
    if (/recorded (the )?payment|payment (is|has been) recorded|₦50,000 (has been )?received/i.test(writes)) {
      note('blocker', 'T6 cannot-do bundle', `Claimed to take a fee: ${excerpt(writes)}`);
    }
    if (/i('ve| have) approved|applications? (have been|are now) approved/i.test(writes) && !/cannot|can't|do not approve/i.test(writes)) {
      note('blocker', 'T6 cannot-do bundle', `Claimed to approve applications: ${excerpt(writes)}`);
    }
    cover('T6 cannot-do bundle', writes, [
      { label: 'hire/staff', re: /staff|teacher|hire|add/i, severity: 'info' },
      { label: 'fees', re: /fee|payment|₦|naira/i, severity: 'info' },
      { label: 'applications', re: /application|admit|approve/i, severity: 'info' },
    ]);
    await capture(page, 'cannot-do-bundle', 'Cannot-do bundle', 'Hire, take a fee, and approve applications in one ask.');

    // 7. Off-topic jammed with a school follow-up
    const mixed = await askLois(
      page,
      'Give me a jollof rice recipe, then tell me who teaches Mathematics in JSS 1 and what JSS 1 A has on Thursday.',
      150_000,
    );
    await scoreReply('T7 mixed', mixed, { mustNotId: true });
    if (looksLikeFullRecipe(mixed)) {
      note('major', 'T7 mixed', `Gave a full recipe: ${excerpt(mixed)}`);
    } else {
      note('pass', 'T7 mixed', `Did not dump a full recipe: ${excerpt(mixed)}`);
    }
    if (/jollof|tomato|parboil/i.test(mixed) && !/teacher|mathematics|thursday|timetable|jss/i.test(mixed)) {
      note('major', 'T7 mixed', `Stayed on the recipe and dropped the school ask: ${excerpt(mixed)}`);
    } else if (/teacher|mathematics|thursday|timetable|jss/i.test(mixed)) {
      note('pass', 'T7 mixed', `Covered the school follow-up: ${excerpt(mixed)}`);
    } else {
      note('major', 'T7 mixed', `Lost the school follow-up: ${excerpt(mixed)}`);
    }
    await capture(page, 'mixed-offtopic', 'Off-topic plus school', 'Jollof jammed with JSS 1 Maths and Thursday timetable.');

    // 8. Pronoun / memory check across the thread
    const memory = await askLois(
      page,
      "Quick recap: how many students did you say we have, and which class is Adaeze's?",
    );
    await scoreReply('T8 memory', memory, { mustNotId: true });
    cover('T8 memory', memory, [
      { label: '26 students (or earlier count)', re: /\b26\b|twenty[- ]?six|student/i },
      { label: "Adaeze's Primary 1", re: /primary\s*1|adaeze/i },
    ]);
    await capture(page, 'thread-memory', 'Thread memory', 'Recap of headcount and Adaeze’s class from earlier turns.');

    // 9. Dual-arm timetable preview — do not apply
    const generate = await askLois(
      page,
      'Generate timetable previews for JSS 1 A and JSS 2 A. Do not apply them — preview only.',
      180_000,
    );
    await scoreReply('T9 dual timetable', generate, { mustNotId: true });
    const preview = await hasTimetablePreview(page);
    const applyCount = await timetableApplyCount(page);
    if (preview) {
      note('pass', 'T9 dual timetable', `Preview card shown (${applyCount} Apply): ${excerpt(generate)}`);
    } else {
      note('major', 'T9 dual timetable', `No Apply/preview card: ${excerpt(generate)}`);
    }
    if (applyCount >= 2 || (/jss\s*1\s*a/i.test(generate) && /jss\s*2\s*a/i.test(generate))) {
      note('pass', 'T9 dual timetable', `Covered both named arms: ${excerpt(generate)}`);
    } else {
      note('major', 'T9 dual timetable', `Did not clearly preview both JSS 1 A and JSS 2 A: ${excerpt(generate)}`);
    }
    if (
      /\b(?:it's |it is )?(?:now )?saved\b|\bhas been applied\b|it's live|it is live/i.test(generate) &&
      !/not saved|preview only/i.test(generate)
    ) {
      note('major', 'T9 dual timetable', `Claimed saved before Apply: ${excerpt(generate)}`);
    }
    await capture(
      page,
      'dual-timetable-preview',
      'Dual timetable preview',
      'Lois proposes JSS 1 A and JSS 2 A timetables without saving.',
    );

    if (preview && !APPLY) {
      const cancelled = await cancelLoisPreviews(page);
      if (cancelled > 0) {
        note('pass', 'T9 cancel', `Cancelled ${cancelled} timetable preview(s) (did not apply)`);
      } else {
        note('info', 'T9 cancel', 'No Cancel button — left preview unapplied');
      }
      await capture(page, 'timetable-cancelled', 'Previews cancelled', 'Admin cancelled the timetable cards.');
    }

    // 10. Pedagogy after operations — still Lois, still Beulah
    const quiz = await askLois(
      page,
      'Make a short 5-question multiple-choice quiz for JSS 1 Mathematics on whole numbers. Keep it for Beulah, not a generic worksheet dump.',
      150_000,
    );
    await scoreReply('T10 quiz', quiz, { mustNotId: true });
    cover('T10 quiz', quiz, [
      { label: 'quiz/questions', re: /question|quiz|option|multiple[- ]choice|answer/i },
      { label: 'maths / whole numbers', re: /math|whole number|numeration|place value|addition|number/i },
    ]);
    if (/i am (now )?(a )?different|my name is (?!lois)/i.test(quiz)) {
      note('major', 'T10 quiz', `Broke Lois identity: ${excerpt(quiz)}`);
    }
    await capture(page, 'jss1-maths-quiz', 'JSS 1 Maths quiz', 'Pedagogy desk after a long operations thread.');

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
    `# Lois school-admin stretch QA — Beulah High School (${stamp})`,
    '',
    'Logged in as `remyarinze+beuadmin@gmail.com` (Arinze Obasi). Headed Playwright. Compound prompts, follow-ups, and desk hops. Timetable Apply skipped unless `E2E_LOIS_APPLY=1`.',
    '',
    `Findings: **${majors} major**, ${findings.filter((f) => f.severity === 'blocker').length} blocker, ${findings.filter((f) => f.severity === 'pass').length} pass.`,
    '',
    '| Severity | Area | Note |',
    '| --- | --- | --- |',
    ...findings.map((f) => `| ${f.severity} | ${f.area} | ${f.note.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
  const file = path.join(outDir, `${stamp}-lois-beulah-admin-qa-report.md`);
  fs.writeFileSync(file, body);
  console.log(`[QA] Wrote ${file}`);
}
