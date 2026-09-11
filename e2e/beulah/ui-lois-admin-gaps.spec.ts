import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  askLois,
  dashboardBrushOff,
  looksLikeInternalId,
  looksLikeToolJsonDump,
  openLois,
} from '../helpers/lois-chat';

/**
 * Headed gap hunt: school-admin reads Lois should answer from tools, not dashboard brush-off.
 * Beulah High School (Arinze). Record stills + video. Do not Apply timetables.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const CONTENT_DIR = path.resolve(__dirname, '../../../content/screenshots/lois-gaps');
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

function excerpt(text: string, n = 320) {
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

async function scoreDesk(
  page: Page,
  area: string,
  reply: string,
  opts: { must?: RegExp[]; allowEmptyTools?: boolean } = {},
) {
  if (!reply) {
    note('blocker', area, 'Empty Lois reply');
    expect(reply).toBeTruthy();
    return;
  }
  if (looksLikeInternalId(reply) || looksLikeToolJsonDump(reply)) {
    note('major', area, `Leaked id or JSON: ${excerpt(reply)}`);
  }
  const panel = ((await page.locator('.lois-panel').last().innerText().catch(() => '')) || '');
  if (looksLikeToolJsonDump(panel)) {
    note('major', area, `Tool card shows raw JSON: ${excerpt(panel)}`);
  }
  if (dashboardBrushOff(reply)) {
    note('major', area, `Dashboard brush-off instead of a tool answer: ${excerpt(reply)}`);
  }
  for (const re of opts.must || []) {
    if (re.test(reply)) note('pass', area, `Matched ${re}: ${excerpt(reply)}`);
    else note('major', area, `Missing ${re}: ${excerpt(reply)}`);
  }
}

test.describe.configure({ mode: 'serial', timeout: 35 * 60 * 1000 });

test.describe('Lois admin gaps — Beulah High School', () => {
  test.afterEach(async ({}, testInfo) => {
    writeReport();
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    const dest = path.join(CONTENT_DIR, 'lois-admin-gaps.webm');
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
      if (!contentManifest.some((m) => m.file === 'lois-admin-gaps.webm')) {
        contentManifest.push({
          file: 'lois-admin-gaps.webm',
          title: 'Lois admin gap hunt',
          caption: 'Fees, admissions, academic, scheme, attendance, insights, calendar, roster, guardians.',
        });
      }
      console.log(`[content] copied video → ${dest}`);
    }
    fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), JSON.stringify(contentManifest, null, 2));
  });

  test('reads a school owner should get from tools', async ({ page }) => {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
    for (const name of fs.readdirSync(CONTENT_DIR)) {
      if (/\.(png|webm)$/i.test(name)) fs.unlinkSync(path.join(CONTENT_DIR, name));
    }

    await page.goto('/dashboard/school');
    await expect(page).toHaveURL(/\/dashboard\/school/);
    await expect(page.getByText(/beulah/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /ask lois/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/loading dashboard data/i)).toHaveCount(0, { timeout: 90_000 });
    note('pass', 'Session', 'Logged in as Beulah school admin');

    await openLois(page);
    await capture(page, 'open', 'Ask Lois', 'Owner opens Lois for a gap-hunt conversation.');

    const week = await askLois(
      page,
      "What's happening this week, and are we closed on Independence Day?",
      150_000,
    );
    await scoreDesk(page, 'G1 calendar', week);
    cover('G1 calendar', week, [
      { label: 'this week window or no events this week', re: /this week|no calendar events/i },
      { label: 'Independence Day / 1 Oct as its own date', re: /independence|1(?:st)?\s+oct|october/i },
    ]);
    if (/independence[^.!\n]{0,40}this week|this week[^.!\n]{0,40}independence/i.test(week) && !/not this week|is not this week/i.test(week)) {
      note('major', 'G1 calendar', `May still fold Independence Day into this week: ${excerpt(week)}`);
    }
    await capture(page, 'calendar', 'This week vs Independence Day', 'Compound calendar ask after the named-date fix.');

    const fees = await askLois(
      page,
      'Who still owes school fees? Name the students and what they owe if you have it.',
      150_000,
    );
    await scoreDesk(page, 'G2 fees', fees);
    if (
      /₦|naira|owing|outstanding|debt|no one owes|nobody owes|paid up|no unpaid|bursary|not fully (?:built|in use)/i.test(
        fees,
      ) &&
      !dashboardBrushOff(fees)
    ) {
      note('pass', 'G2 fees', `Tool-backed fees answer: ${excerpt(fees)}`);
    } else {
      note('major', 'G2 fees', `Did not list debtors from tools: ${excerpt(fees)}`);
    }
    await capture(page, 'fees', 'Outstanding fees', 'Owner asks who owes.');

    const apps = await askLois(
      page,
      'Do we have pending admission applications? How many, and who are they?',
      150_000,
    );
    await scoreDesk(page, 'G3 admissions', apps);
    if (/pending|application|applicant|inbox|none|no pending/i.test(apps) && !dashboardBrushOff(apps)) {
      note('pass', 'G3 admissions', excerpt(apps));
    } else {
      note('major', 'G3 admissions', `Did not summarise the inbox: ${excerpt(apps)}`);
    }
    await capture(page, 'admissions', 'Pending applications', 'Owner asks for the admissions inbox.');

    const risk = await askLois(
      page,
      'Which students are academically at risk right now?',
      150_000,
    );
    await scoreDesk(page, 'G4 risk', risk);
    if (/risk|below|threshold|average|no published|nobody|none/i.test(risk) && !dashboardBrushOff(risk)) {
      note('pass', 'G4 risk', excerpt(risk));
    } else {
      note('major', 'G4 risk', `Did not quote academic risk from tools: ${excerpt(risk)}`);
    }
    await capture(page, 'academic-risk', 'Academic risk', 'Owner asks who is at risk.');

    const jssPerf = await askLois(page, 'How is JSS 1 performing this term? Class averages if you have them.');
    await scoreDesk(page, 'G5 JSS 1 performance', jssPerf);
    cover('G5 JSS 1 performance', jssPerf, [
      { label: 'JSS 1', re: /jss\s*1/i },
      { label: 'performance figures or none published', re: /%|average|below|no published|no grades|threshold/i },
    ]);
    await capture(page, 'jss1-performance', 'JSS 1 performance', 'Class performance for JSS 1.');

    const scheme = await askLois(
      page,
      'Do we have a published scheme of work for JSS 1 Mathematics? What are the first weeks about?',
      150_000,
    );
    await scoreDesk(page, 'G6 scheme', scheme);
    if (/scheme|week|topic|not published|no scheme|mathematics/i.test(scheme) && !dashboardBrushOff(scheme)) {
      note('pass', 'G6 scheme', excerpt(scheme));
    } else {
      note('major', 'G6 scheme', `Did not read the scheme from tools: ${excerpt(scheme)}`);
    }
    await capture(page, 'scheme', 'JSS 1 Maths scheme', 'Published scheme of work lookup.');

    const attendance = await askLois(page, 'What does attendance look like in JSS 1 A over the last two weeks?');
    await scoreDesk(page, 'G7 attendance', attendance);
    if (/present|absent|late|attendance|no records|not fully in use|no marks were taken|0/i.test(attendance) && !dashboardBrushOff(attendance)) {
      note('pass', 'G7 attendance', excerpt(attendance));
    } else {
      note('major', 'G7 attendance', `Did not quote attendance: ${excerpt(attendance)}`);
    }
    await capture(page, 'attendance', 'JSS 1 A attendance', 'Attendance summary for one arm.');

    const insights = await askLois(page, 'What have you already noticed about this school? Any insights I should look at?');
    await scoreDesk(page, 'G8 insights', insights);
    if (/agricultural|week 1|not delivered|meaning of agriculture|sow_gap|scheme of work/i.test(insights) && !dashboardBrushOff(insights)) {
      note('pass', 'G8 insights', excerpt(insights));
    } else {
      note('major', 'G8 insights', `Did not quote the filed Lois-noticed briefing: ${excerpt(insights)}`);
    }
    await capture(page, 'insights', 'Lois insights', 'Filed briefing / what Lois noticed.');

    const thursday = await askLois(
      page,
      'What does JSS 1 A already have on Thursday? Do not generate a new timetable — just read what is saved.',
      150_000,
    );
    await scoreDesk(page, 'G9 Thursday', thursday);
    if (/i('ll| will) (check|find out|look)/i.test(thursday) && thursday.length < 280) {
      note('major', 'G9 Thursday', `Stopped at I'll check: ${excerpt(thursday)}`);
    } else if (/thursday|period|no (saved )?period|no timetable|english|mathematics|free/i.test(thursday)) {
      note('pass', 'G9 Thursday', excerpt(thursday));
    } else {
      note('major', 'G9 Thursday', `Did not read Thursday: ${excerpt(thursday)}`);
    }
    await capture(page, 'thursday', 'JSS 1 A Thursday', 'Read existing timetable, not generate.');

    const roster = await askLois(
      page,
      "Name every student in Adaeze Okeke's class, and name every student in JSS 1 A.",
      150_000,
    );
    await scoreDesk(page, 'G10 roster names', roster);
    cover('G10 roster names', roster, [
      { label: 'Primary 1 names (Chiamaka or Ibrahim)', re: /chiamaka|ibrahim|okafor|musa/i },
      { label: 'JSS 1 A names (Chioma or Kelechi)', re: /chioma|kelechi|nnamani|okonkwo/i },
    ]);
    await capture(page, 'rosters', 'Named rosters', 'Adaeze’s class and JSS 1 A by name.');

    const guardians = await askLois(page, "Who are Chioma Nnamani's parents or guardians? Phone if you have it.");
    await scoreDesk(page, 'G11 guardians', guardians);
    cover('G11 guardians', guardians, [
      { label: 'Obinna / father', re: /obinna|father|guardian|parent/i },
    ]);
    await capture(page, 'guardians', 'Chioma guardians', 'Guardian lookup — must not show JSON.');

    const now = await askLois(page, "What's happening in Primary 1 A right now?");
    await scoreDesk(page, 'G12 now in class', now);
    if (/class teacher|adaeze|period|free|no current|right now|primary\s*1/i.test(now) && !dashboardBrushOff(now)) {
      note('pass', 'G12 now in class', excerpt(now));
    } else {
      note('major', 'G12 now in class', excerpt(now));
    }
    await capture(page, 'now-in-class', 'Primary 1 A now', 'Live timetable / class teacher for Primary 1 A.');

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
    `# Lois school-admin gap hunt — Beulah High School (${stamp})`,
    '',
    'Owner `remyarinze+beuadmin@gmail.com`. Headed Playwright. These are **reads a school admin should get from tools**. Majors are candidates to fix — Playwright only fails on blockers.',
    '',
    `**${majors} major**, ${findings.filter((f) => f.severity === 'blocker').length} blocker, ${findings.filter((f) => f.severity === 'pass').length} pass.`,
    '',
    '| Severity | Area | Note |',
    '| --- | --- | --- |',
    ...findings.map((f) => `| ${f.severity} | ${f.area} | ${f.note.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
  const file = path.join(outDir, `${stamp}-lois-beulah-admin-gaps-qa-report.md`);
  fs.writeFileSync(file, body);
  console.log(`[QA] Wrote ${file}`);
}
