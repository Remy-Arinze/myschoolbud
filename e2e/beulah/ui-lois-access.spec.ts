import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  askLois,
  framedAsPermissionError,
  hasTimetablePreview,
  looksLikeBackendWording,
  looksLikeInternalId,
  looksLikeToolJsonDump,
  openLois,
} from '../helpers/lois-chat';

/**
 * Headed permission matrix on Beulah High School.
 * Owner grants screen access (View / Edit / Full Control) to a VP-style admin,
 * then bursar / empty clerk / VP are checked for nav, deep links, WRITE buttons, and Lois desks.
 */

type Finding = {
  severity: 'pass' | 'info' | 'minor' | 'major' | 'blocker';
  area: string;
  note: string;
};

const findings: Finding[] = [];
const CONTENT_DIR = path.resolve(__dirname, '../../../content/screenshots/lois-access');
const AUTH_DIR = path.resolve(__dirname, '../.auth');
const contentManifest: Array<{ file: string; title: string; caption: string }> = [];
let shotIndex = 0;

const ROSTER_LEAK_RE = /ibrahim|chiamaka|chioma|kelechi|nnamani|okonkwo/i;
const FEE_HIT_RE = /naira|₦|owing|owes|debt|unpaid|fee|bursar|no unpaid/i;

async function capture(page: Page, slug: string, title: string, caption: string) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  shotIndex += 1;
  const file = `${String(shotIndex).padStart(2, '0')}-${slug}.png`;
  await page.screenshot({ path: path.join(CONTENT_DIR, file), timeout: 8_000 }).catch(() => undefined);
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

/**
 * Watch the API from the browser's side. A screen that never finishes is
 * almost always one request that never came back — this names it.
 */
const instrumented = new WeakSet<Page>();
const SLOW_REQUEST_MS = 8_000;

function apiPath(url: string) {
  return url.replace(/^https?:\/\/[^/]+/, '').slice(0, 90);
}

function instrumentNetwork(page: Page) {
  if (instrumented.has(page)) return;
  instrumented.add(page);
  const started = new Map<unknown, number>();
  // Long-lived streams are supposed to stay open — they are not stalls.
  const watched = (url: string) => /\/\/[^/]*:4000\//.test(url) && !/\/stream|\/ai\//.test(url);

  page.on('request', (req) => {
    if (watched(req.url())) started.set(req, Date.now());
  });
  page.on('requestfinished', (req) => {
    const startedAt = started.get(req);
    started.delete(req);
    if (startedAt === undefined) return;
    const ms = Date.now() - startedAt;
    if (ms >= SLOW_REQUEST_MS) note('info', 'Network slow', `${ms}ms ${req.method()} ${apiPath(req.url())}`);
  });
  page.on('requestfailed', (req) => {
    const startedAt = started.get(req);
    started.delete(req);
    if (startedAt === undefined) return;
    const ms = Date.now() - startedAt;
    const reason = req.failure()?.errorText || 'failed';
    // Leaving a page cancels its in-flight calls — that is navigation, not a fault.
    const severity = reason.includes('ERR_ABORTED') ? 'info' : 'major';
    note(severity, 'Network failed', `${reason} after ${ms}ms ${apiPath(req.url())}`);
  });
}

function schoolNavLink(page: Page, label: string) {
  return page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') });
}

function schoolNavHref(page: Page, href: string) {
  return page.locator(`a[href="${href}"], a[href^="${href}?"]`);
}

async function visibleSchoolNavHrefs(page: Page): Promise<string> {
  try {
    const hrefs = await page.locator('a[href^="/dashboard/school"]').evaluateAll((els) =>
      els
        .map((el) => (el as HTMLAnchorElement).getAttribute('href') || '')
        .filter(Boolean),
    );
    return [...new Set(hrefs)].join(', ') || '(none)';
  } catch {
    return '(navigating)';
  }
}

async function dismissUpdateBanner(page: Page) {
  const refresh = page.getByRole('button', { name: /refresh now/i });
  if (await refresh.isVisible().catch(() => false)) {
    await refresh.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForTimeout(1500);
  }
}

async function waitSidebar(page: Page) {
  await page
    .locator('a.sidebar-link-item, a[href^="/dashboard/school/"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => undefined);

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const hrefs = await visibleSchoolNavHrefs(page);
    if (
      hrefs.includes('/courses') ||
      hrefs.includes('/timetables') ||
      hrefs.includes('/settings') ||
      hrefs.includes('/students') ||
      hrefs.includes('/staff')
    ) {
      return;
    }
    await page.waitForTimeout(500);
  }
}

async function waitShell(page: Page) {
  await waitCompile(page);
  await dismissUpdateBanner(page);
  await waitSidebar(page);
  const lois = page.getByRole('button', { name: /ask lois|lois briefing/i });
  if (!(await lois.isVisible().catch(() => false))) {
    await dismissUpdateBanner(page);
  }
  await expect(lois).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 30_000 });
}

async function assertNav(page: Page, area: string, label: string, shouldSee: boolean, href?: string) {
  await waitSidebar(page);
  const link = href ? schoolNavHref(page, href) : schoolNavLink(page, label);
  const count = await link.count();
  const visible = count > 0 && (await link.first().isVisible().catch(() => false));
  if (shouldSee && visible) note('pass', area, `Nav shows ${label}`);
  else if (!shouldSee && !visible) note('pass', area, `Nav hides ${label}`);
  else if (shouldSee) {
    note('major', area, `Nav missing ${label}. Visible school hrefs: ${await visibleSchoolNavHrefs(page)}`);
  } else note('major', area, `Nav leaked ${label}`);
}

function looksLikeGeneratedQuiz(text: string) {
  const t = text.replace(/\s+/g, ' ');
  const hasMcq = /multiple-?choice|\bMCQs?\b/i.test(t);
  const hasOptions = /\b[A-D][).]/.test(t);
  return (hasMcq && hasOptions && t.length > 280) || (/\bQuestion\s*1\b/i.test(t) && hasOptions);
}

async function assertWriteControl(page: Page, area: string, name: RegExp, shouldSee: boolean) {
  // Never judge a WRITE control on a page that has not finished rendering —
  // an unfinished screen hides every button and would read as a denial.
  await waitCompile(page);
  if (await accessUnavailable(page)) {
    note('major', area, `Could not judge ${name}: access never loaded`);
    return;
  }
  const btn = page.getByRole('button', { name });
  if (shouldSee) {
    await expect(btn.first()).toBeVisible({ timeout: 30_000 }).catch(() => undefined);
  }
  const visible = (await btn.count()) > 0 && (await btn.first().isVisible().catch(() => false));
  if (shouldSee && visible) note('pass', area, `WRITE control visible: ${name}`);
  else if (!shouldSee && !visible) note('pass', area, `WRITE control hidden: ${name}`);
  else if (shouldSee) note('major', area, `WRITE control missing: ${name}`);
  else note('major', area, `WRITE control leaked on read-only access: ${name}`);
}

/** The shell gave up on the permission table. Terminal state — stop waiting. */
async function accessUnavailable(page: Page) {
  return page.getByText(/we couldn'?t load your access/i).isVisible().catch(() => false);
}

async function waitCompile(page: Page) {
  await expect(page.getByText(/^compiling/i)).toHaveCount(0, { timeout: 300_000 }).catch(() => undefined);
  await expect(page.getByText(/^rendering/i)).toHaveCount(0, { timeout: 120_000 }).catch(() => undefined);
  // A blank page is quiet too. Wait for the shell to exist before believing
  // anything we see, or a slow chunk load reads as a settled screen.
  await page
    .getByRole('button', { name: /logout/i })
    .waitFor({ state: 'visible', timeout: 150_000 })
    .catch(() => undefined);

  // Even then the gate mounts a beat later, so one quiet look is not proof.
  let quiet = 0;
  for (let i = 0; i < 90; i += 1) {
    if (await accessUnavailable(page)) return;
    const verifying = await page.getByText(/verifying permissions|loading access|opening your pages/i).isVisible().catch(() => false);
    const loading = await page.getByText(/loading your dashboard|loading dashboard data|loading classes|loading staff/i).isVisible().catch(() => false);
    if (!verifying && !loading) {
      quiet += 1;
      if (quiet >= 4) return;
    } else {
      quiet = 0;
    }
    await page.waitForTimeout(1000);
  }
}

async function bootRole(page: Page, area: string) {
  instrumentNetwork(page);
  await page.goto('/dashboard/school', { waitUntil: 'domcontentloaded', timeout: 180_000 });
  await expect(page).toHaveURL(/\/dashboard\/school/);
  await waitShell(page);
  if (await accessUnavailable(page)) {
    note('blocker', area, 'Permission table never loaded — shell showed "We couldn\'t load your access"');
  }
  if (await page.getByText(/verifying permissions/i).isVisible().catch(() => false)) {
    note('major', area, 'Stuck on Verifying permissions after landing');
  }
  if (await page.getByText(/loading access/i).isVisible().catch(() => false)) {
    note('info', area, 'Still showing Loading access after shell wait');
  }
  note('pass', area, `Landed ${page.url()}`);
}

async function gotoPath(page: Page, href: string) {
  await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 180_000 });
  await waitCompile(page);
  // Dev builds compile a route on first visit, which can outlast a minute.
  await expect(page.getByRole('button', { name: /logout/i })).toBeVisible({ timeout: 150_000 });
}

async function deniedOn(page: Page) {
  // The denial now names the resource and level the way Lois does
  // ("You need Students access"), so match that as well as the old wording.
  return page
    .getByRole('heading', { name: /you need .* access|this page isn'?t in your role|access denied/i })
    .isVisible()
    .catch(() => false);
}

async function assertDenied(page: Page, area: string, href: string, shouldDeny: boolean) {
  try {
    await gotoPath(page, href);
  } catch (err) {
    note('major', area, `Navigation hung on ${href}: ${excerpt(String(err))}`);
    await capture(page, href.replace(/\W+/g, '-').replace(/^-|-$/g, '').slice(0, 40), href, `${area} hung`);
    return;
  }
    if (await accessUnavailable(page)) {
      note('blocker', area, `Access table never loaded on ${href} — cannot tell allowed from denied`);
      await capture(page, href.replace(/\W+/g, '-').replace(/^-|-$/g, '').slice(0, 40), href, `${area} access unavailable`);
      return;
    }
    if (await page.getByText(/verifying permissions/i).isVisible().catch(() => false)) {
      note('major', area, `Stuck on Verifying permissions after ${href}`);
    }
    if (await page.getByText(/loading access/i).isVisible().catch(() => false)) {
      note('major', area, `Stuck on Loading access after ${href}`);
    }
  const denied = await deniedOn(page);
  if (shouldDeny && denied) note('pass', area, `Access Denied on ${href}`);
  else if (!shouldDeny && !denied) note('pass', area, `Opened ${href}`);
  else if (shouldDeny) note('major', area, `Reached ${href} without Access Denied`);
  else note('major', area, `Access Denied on ${href} unexpectedly: ${excerpt(await page.locator('main').innerText().catch(() => ''))}`);
  await capture(page, href.replace(/\W+/g, '-').replace(/^-|-$/g, '').slice(0, 40), href, area);
}

async function scoreLois(page: Page, area: string, reply: string, opts: { mustNotRoster?: boolean; mustNotFees?: boolean } = {}) {
  if (!reply) {
    note('blocker', area, 'Empty Lois reply');
    return;
  }
  if (/could not finish this reply|connection to ai failed|check your connection/i.test(reply)) {
    note('major', area, `Lois stream failed: ${excerpt(reply)}`);
    return;
  }
  if (looksLikeInternalId(reply) || looksLikeToolJsonDump(reply)) {
    note('major', area, `Leaked id or JSON: ${excerpt(reply)}`);
  }
  if (looksLikeBackendWording(reply)) {
    note('major', area, `Backend wording leaked: ${excerpt(reply)}`);
  }
  if (framedAsPermissionError(reply)) {
    note('info', area, `Framed as permission: ${excerpt(reply)}`);
  }
  if (opts.mustNotRoster && ROSTER_LEAK_RE.test(reply)) {
    note('major', area, `Roster leak: ${excerpt(reply)}`);
  }
  if (opts.mustNotFees && /₦\s*\d|[0-9]{3,}\s*naira/i.test(reply) && ROSTER_LEAK_RE.test(reply)) {
    note('major', area, `Fee names leaked: ${excerpt(reply)}`);
  }
  note('info', area, excerpt(reply));
}

async function ensureSchoolType(page: Page, label: string) {
  const trigger = page.locator('button.school-type-trigger');
  if (!(await trigger.isVisible().catch(() => false))) return;
  const current = ((await trigger.innerText().catch(() => '')) || '').toLowerCase();
  if (current.includes(label.toLowerCase())) return;
  await trigger.click();
  const option = page.locator('button.school-type-option').filter({ hasText: new RegExp(`^${label}$`, 'i') });
  if (await option.first().isVisible().catch(() => false)) {
    await option.first().click();
    await page.waitForTimeout(800);
  }
}

async function openExistingVpPermissions(page: Page): Promise<boolean> {
  await gotoPath(page, '/dashboard/school/staff');
  await expect(page.getByText(/loading staff/i)).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
  await ensureSchoolType(page, 'Primary');
  await expect(page.getByText(/loading staff/i)).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
  const search = page.getByPlaceholder(/search staff/i);
  if (await search.isVisible().catch(() => false)) {
    await search.fill('Vice');
    await page.waitForTimeout(800);
  }
  await waitCompile(page);
  const vpCard = page.getByText(/beulah\s+vice/i).first();
  if (!(await vpCard.isVisible().catch(() => false))) {
    note('major', 'Owner VP assignment', 'Could not find Beulah Vice on Staff list');
    return false;
  }
  await vpCard.click();
  await page.waitForURL(/\/dashboard\/school\/staff\/[^/?#]+/, { timeout: 60_000 });
  await waitCompile(page);
  await expect(page.getByRole('heading', { name: /beulah\s+vice/i })).toBeVisible({ timeout: 60_000 });
  const permsTab = page.getByRole('button', { name: /^permissions$/i });
  await expect(permsTab).toBeVisible({ timeout: 20_000 });
  await permsTab.click();
  await page.waitForTimeout(600);
  const manage = page.getByRole('button', { name: /manage permissions/i });
  if (!(await manage.isVisible().catch(() => false))) {
    note('major', 'Owner VP assignment', 'Manage Permissions button missing');
    return false;
  }
  await manage.click();
  await expect(page.getByText(/^classes$/i).first()).toBeVisible({ timeout: 20_000 });
  return true;
}

function classesCard(page: Page) {
  // One shared label map now, so both the picker and the profile say "Classes"
  // where they used to disagree ("Class Management" vs "Classes"). The card
  // leads with an emoji, so match the title element rather than the text start.
  return page
    .locator('div')
    .filter({ has: page.getByText('Classes', { exact: true }) })
    .filter({ has: page.locator('input[type="checkbox"]') })
    .last();
}

async function setClassPermissionLevel(page: Page, level: 'view' | 'edit' | 'full') {
  const card = classesCard(page);
  await expect(card).toBeVisible({ timeout: 15_000 });

  const viewBox = card.locator('label').filter({ hasText: /^View$/ }).locator('input[type="checkbox"]');
  const editBox = card.locator('label').filter({ hasText: /^Edit$/ }).locator('input[type="checkbox"]');
  const fullBox = card.locator('label').filter({ hasText: /full control/i }).locator('input[type="checkbox"]');

  const setBox = async (box: ReturnType<typeof card.locator>, want: boolean) => {
    if (!(await box.count())) return;
    const checked = await box.isChecked().catch(() => false);
    if (checked !== want) {
      await box.locator('xpath=ancestor::label[1]').click();
      await page.waitForTimeout(200);
    }
  };

  if (level === 'view') {
    await setBox(fullBox, false);
    await setBox(editBox, false);
    await setBox(viewBox, true);
  } else if (level === 'edit') {
    await setBox(fullBox, false);
    await setBox(editBox, true);
  } else {
    await setBox(fullBox, true);
  }

  await saveAccess(page);
}

/**
 * Save, and clear the removal confirmation if one appears.
 *
 * Taking access away now asks a second time and lists what is going, because
 * the save replaces every row and the person losing it may be mid-task.
 */
async function saveAccess(page: Page) {
  await page.getByRole('button', { name: /^save access$/i }).click();
  const confirm = page.getByRole('button', { name: /^remove and save$/i });
  if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const listed = await page.locator('main, [role="dialog"]').innerText().catch(() => '');
    if (/removing /i.test(listed)) {
      note('pass', 'Removal diff', 'Save named what was being removed before committing');
    } else {
      note('minor', 'Removal diff', 'Confirmation appeared without naming the removals');
    }
    await confirm.click();
  }
  await page.waitForTimeout(1200);
}

const API_BASE = process.env.E2E_API_URL || 'http://localhost:4000';

type StoredSession = { token: string; user: Record<string, any> };

/**
 * The stored session for a Beulah role.
 *
 * Some of these checks are about state the UI deliberately will not let you
 * reach by clicking — a title renamed behind someone's back, a lone ADMIN row
 * with no READ beneath it. Reading the minted session lets a test set that up
 * as the owner and put it back afterwards.
 */
function storedSession(file: string): StoredSession | null {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(AUTH_DIR, file), 'utf-8'));
    const entry = state.origins?.[0]?.localStorage?.find(
      (e: { name: string }) => e.name === 'persist:auth',
    );
    if (!entry) return null;
    const persisted = JSON.parse(entry.value);
    return { token: JSON.parse(persisted.token), user: JSON.parse(persisted.user) };
  } catch {
    return null;
  }
}

/** The VP's seeded access, restored after any test that moves it. */
const VP_SEEDED_ACCESS = [
  { resource: 'CLASSES', type: 'READ' },
  { resource: 'GRADES', type: 'READ' },
  { resource: 'CURRICULUM', type: 'READ' },
  { resource: 'TIMETABLES', type: 'READ' },
];

function writeReport() {
  const outDir = path.resolve(__dirname, '../../../qa-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const majors = findings.filter((f) => f.severity === 'major').length;
  const body = [
    `# Lois access QA — Beulah High School (${stamp})`,
    '',
    'Owner grant UI (View/Edit/Full Control) + bursar (SETTINGS READ) + empty clerk + VP (Primary, class/timetable/curriculum READ). Headed Playwright.',
    '',
    `Findings: **${majors} major**, ${findings.filter((f) => f.severity === 'blocker').length} blocker, ${findings.filter((f) => f.severity === 'pass').length} pass, ${findings.filter((f) => f.severity === 'info').length} info.`,
    '',
    '| Severity | Area | Note |',
    '| --- | --- | --- |',
    ...findings.map((f) => `| ${f.severity} | ${f.area} | ${f.note.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
  const file = path.join(outDir, `${stamp}-lois-beulah-access-qa-report.md`);
  fs.writeFileSync(file, body);
  console.log(`[QA] Wrote ${file}`);
}

test.describe.configure({ timeout: 40 * 60 * 1000 });

test.afterEach(async ({}, testInfo) => {
  writeReport();
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.writeFileSync(path.join(CONTENT_DIR, 'manifest.json'), JSON.stringify(contentManifest, null, 2));
  const attached = testInfo.attachments.find((a) => a.contentType === 'video/webm' && a.path);
  if (attached?.path && fs.existsSync(attached.path)) {
    const dest = path.join(CONTENT_DIR, `${testInfo.title.replace(/\W+/g, '-').slice(0, 40)}.webm`);
    fs.copyFileSync(attached.path, dest);
  }
});

test.describe('Beulah owner — grant VP-style screen access', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('Add Admin permission picker + existing VP assignment', async ({ page }) => {
    await bootRole(page, 'Owner boot');
    await capture(page, 'owner-home', 'Owner home', 'School owner with principal full access.');

    await assertNav(page, 'Owner nav', 'Staff', true, '/dashboard/school/staff');
    await assertNav(page, 'Owner nav', 'Students', true, '/dashboard/school/students');
    await assertNav(page, 'Owner nav', 'Settings', true, '/dashboard/school/settings/profile');

    try {
      await gotoPath(page, '/dashboard/school/courses');
      await assertWriteControl(page, 'Owner classes WRITE', /add class|add course/i, true);
      await capture(page, 'owner-classes-write', 'Owner classes', 'Principal must see Add Class.');
    } catch (err) {
      note('major', 'Owner classes WRITE', `Could not open classes: ${excerpt(String(err))}`);
      await capture(page, 'owner-classes-hung', 'Owner classes hung', String(err));
    }

    try {
    await gotoPath(page, '/dashboard/school/staff/add');
    const adminType = page.getByRole('button', { name: /administrator/i }).first();
    await expect(adminType).toBeVisible({ timeout: 60_000 });
    await adminType.click();
    await expect(page.getByText(/admin staff \(vp, bursar/i)).toBeVisible({ timeout: 15_000 });

    // The role is a template-seeded combobox now, not free text, so the title
    // and the access bundle are picked together.
    const roleInput = page.getByPlaceholder(/pick a role, or type your own title/i);
    await expect(roleInput).toBeVisible({ timeout: 15_000 });
    await roleInput.fill('Vice');
    const vpTemplate = page.getByRole('button', { name: /vice principal/i }).first();
    if (await vpTemplate.isVisible({ timeout: 4_000 }).catch(() => false)) {
      await vpTemplate.click();
      note('pass', 'Owner grant UI', 'Role combobox offered a Vice Principal template');
    } else {
      note('major', 'Owner grant UI', 'Role combobox offered no Vice Principal template');
      await roleInput.fill('Vice Principal');
    }

    const permHeader = page.getByText(/dashboard permissions/i).first();
    await expect(permHeader).toBeVisible({ timeout: 15_000 });
    await permHeader.click();
    await expect(page.getByText(/view\s*=\s*can see this screen/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/edit\s*=\s*can add/i)).toBeVisible();
    await expect(page.getByText(/full control\s*=\s*can delete/i)).toBeVisible();
    note('pass', 'Owner grant UI', 'Permission picker shows View / Edit / Full Control');

    // The picker now speaks the sidebar's vocabulary, so these are the same
    // words the granted admin will read in their own nav.
    const body = ((await page.locator('main').innerText().catch(() => '')) || '').toLowerCase();
    for (const label of ['settings', 'classes', 'timetables']) {
      if (body.includes(label)) note('pass', 'Owner grant UI', `${label} is in the Add Admin picker`);
      else note('major', 'Owner grant UI', `${label} missing from the Add Admin picker`);
    }

    const classRow = page.getByText(/^Classes$/).first();
    if (await classRow.isVisible().catch(() => false)) {
      await classRow.click();
      const editToggle = page.getByRole('button', { name: /^edit$/i }).first();
      if (await editToggle.isVisible().catch(() => false)) {
        await editToggle.click();
        note('pass', 'Owner grant UI', 'Toggled Classes Edit (WRITE) on a new VP form');
      } else {
        note('minor', 'Owner grant UI', 'Could not find the Edit toggle on Classes');
      }
    }

    // The form should show the owner the dashboard they are about to create,
    // not just the checkboxes they ticked.
    const preview = page.getByRole('heading', { name: /will see/i }).first();
    if (await preview.isVisible({ timeout: 5_000 }).catch(() => false)) {
      note('pass', 'Owner grant UI', 'Add Admin previews the resulting sidebar beside the picker');
    } else {
      note('minor', 'Owner grant UI', 'No resulting-sidebar preview on the Add Admin form');
    }

    await capture(page, 'owner-add-admin-perms', 'Add Admin permissions', 'View / Edit / Full Control picker for a VP.');

    await gotoPath(page, '/dashboard/school/staff');
    await expect(page.getByText(/loading staff/i)).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
    await ensureSchoolType(page, 'Primary');
    await expect(page.getByText(/loading staff/i)).toHaveCount(0, { timeout: 30_000 }).catch(() => undefined);
    const search = page.getByPlaceholder(/search staff/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill('Vice');
      await page.waitForTimeout(800);
    }
    const vpCard = page.getByText(/beulah\s+vice/i).first();
    if (!(await vpCard.isVisible().catch(() => false))) {
      note('major', 'Owner VP assignment', 'Could not find Beulah Vice on Staff list');
      await capture(page, 'owner-staff-missing-vp', 'Staff list', 'VP not listed.');
      writeReport();
      return;
    }
    await vpCard.click();
    await page.waitForURL(/\/dashboard\/school\/staff\/[^/?#]+/, { timeout: 60_000 });
    await waitCompile(page);
    await expect(page.getByRole('heading', { name: /beulah\s+vice/i })).toBeVisible({ timeout: 60_000 });

    const permsTab = page.getByRole('button', { name: /^permissions$/i });
    await expect(permsTab).toBeVisible({ timeout: 20_000 });
    await permsTab.click();
    // The list loads over the network — read it only once it has actually landed,
    // otherwise an unfinished tab reads as "this VP has nothing".
    await expect
      .poll(
        async () => {
          const text = ((await page.locator('main').innerText().catch(() => '')) || '').toLowerCase();
          return /\bview\b|no permissions assigned|couldn'?t load this list/.test(text);
        },
        { timeout: 60_000, intervals: [500, 1000] },
      )
      .toBe(true)
      .catch(() => undefined);
    const assigned = ((await page.locator('main').innerText().catch(() => '')) || '').toLowerCase();
    // Profile and picker read from one label map now, so these are the same
    // words the owner saw on the grant form.
    for (const label of ['classes', 'grades', 'curriculum', 'timetables']) {
      if (assigned.includes(label)) {
        note('pass', 'Owner VP assignment', `VP profile lists ${label}`);
      } else {
        note('major', 'Owner VP assignment', `VP profile missing ${label}: ${excerpt(assigned)}`);
      }
    }
    if (/full control|\bedit\b/.test(assigned)) {
      note('info', 'Owner VP assignment', 'VP profile shows an edit/full-control level (seed is view-only)');
    } else if (/\bview\b/.test(assigned)) {
      note('pass', 'Owner VP assignment', 'VP assigned levels are View only on listed screens');
    }
    await capture(page, 'owner-vp-assigned', 'VP assigned permissions', 'Current VP screen access.');

    const manage = page.getByRole('button', { name: /manage permissions/i });
    if (await manage.isVisible().catch(() => false)) {
      await manage.click();
      await expect(page.getByText(/^Settings$/).first()).toBeVisible({ timeout: 20_000 });
      note('pass', 'Owner VP assignment', 'Manage access modal includes Settings (catalog API)');
      if (await page.getByRole('heading', { name: /will see/i }).first().isVisible().catch(() => false)) {
        note('pass', 'Owner VP assignment', 'Manage access shows the resulting dashboard beside the picker');
      } else {
        note('minor', 'Owner VP assignment', 'Manage access has no resulting-dashboard preview');
      }
      await capture(page, 'owner-vp-modal', 'Manage access', 'Principal can change VP screen access later.');
      await page.getByRole('button', { name: /^cancel$/i }).click().catch(() => undefined);
    } else {
      note('major', 'Owner VP assignment', 'Manage Permissions button missing for school owner');
    }
    } catch (err) {
      note('major', 'Owner grant UI', `Grant flow aborted: ${excerpt(String(err))}`);
      await capture(page, 'owner-grant-aborted', 'Owner grant aborted', String(err));
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Beulah bursar — SETTINGS READ', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-bursar.json') });

  test('nav, deep links, Lois fees vs roster', async ({ page }) => {
    await bootRole(page, 'Bursar boot');
    await capture(page, 'bursar-home', 'Bursar home', 'First landing after /dashboard/school.');

    await assertNav(page, 'Bursar nav', 'Overview', false, '/dashboard/school/overview');
    await assertNav(page, 'Bursar nav', 'Students', false, '/dashboard/school/students');
    await assertNav(page, 'Bursar nav', 'Staff', false, '/dashboard/school/staff');
    await assertNav(page, 'Bursar nav', 'Classes', false, '/dashboard/school/courses');
    await assertNav(page, 'Bursar nav', 'Timetables', false, '/dashboard/school/timetables');
    await assertNav(page, 'Bursar nav', 'Applications', false, '/dashboard/school/applications');
    await assertNav(page, 'Bursar nav', 'Subscription', false, '/dashboard/school/subscription');
    await assertNav(page, 'Bursar nav', 'Settings', true, '/dashboard/school/settings/profile');

    await assertDenied(page, 'Bursar students', '/dashboard/school/students', true);
    await assertDenied(page, 'Bursar overview', '/dashboard/school/overview', true);
    await assertDenied(page, 'Bursar settings URL', '/dashboard/school/settings/profile', false);
    await assertDenied(page, 'Bursar applications URL', '/dashboard/school/applications', true);

    await bootRole(page, 'Bursar Lois boot');
    await openLois(page);
    await capture(page, 'bursar-lois', 'Bursar Lois', 'Ask Lois as bursar.');

    const fees = await askLois(page, 'Who still owes in JSS 1?', 150_000);
    await scoreLois(page, 'Bursar Lois fees', fees);
    if (FEE_HIT_RE.test(fees)) note('pass', 'Bursar Lois fees', `Quoted fees: ${excerpt(fees)}`);
    else note('major', 'Bursar Lois fees', `Did not answer fees: ${excerpt(fees)}`);
    await capture(page, 'bursar-fees', 'Bursar fees', 'SETTINGS READ should reach list_fee_debtors.');

    const roster = await askLois(page, 'Who sits in Primary 1?', 120_000);
    await scoreLois(page, 'Bursar Lois roster', roster, { mustNotRoster: true });
    if (ROSTER_LEAK_RE.test(roster)) {
      note('major', 'Bursar Lois roster', `Named pupils without Students: ${excerpt(roster)}`);
    } else {
      note('pass', 'Bursar Lois roster', `No Primary 1 names: ${excerpt(roster)}`);
    }
    await capture(page, 'bursar-roster', 'Bursar roster refuse', 'Must not list Ibrahim/Chiamaka.');

    const quiz = await askLois(page, 'Cook ten MCQs on fractions for Primary 1.', 90_000);
    await scoreLois(page, 'Bursar Lois quiz', quiz);
    if (looksLikeGeneratedQuiz(quiz)) {
      note('major', 'Bursar Lois quiz', `Generated MCQs without Curriculum: ${excerpt(quiz)}`);
    } else {
      note('pass', 'Bursar Lois quiz', `Did not cook MCQs: ${excerpt(quiz)}`);
    }

    const tt = await askLois(page, 'Generate a timetable for JSS 2 A.', 150_000);
    await scoreLois(page, 'Bursar Lois timetable', tt);
    if (await hasTimetablePreview(page)) {
      note('major', 'Bursar Lois timetable', 'Showed Apply/preview without Timetables write');
    } else {
      note('pass', 'Bursar Lois timetable', `No apply card: ${excerpt(tt)}`);
    }
    await capture(page, 'bursar-timetable', 'Bursar timetable', 'Curator must stay compiled out.');

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Beulah empty-permission clerk', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-empty.json') });

  test('empty nav, denied pages, Lois must not leak school data', async ({ page }) => {
    await bootRole(page, 'Empty boot');
    await capture(page, 'empty-home', 'Empty home', 'Zero staffPermission rows.');

    await assertNav(page, 'Empty nav', 'Overview', false, '/dashboard/school/overview');
    await assertNav(page, 'Empty nav', 'Students', false, '/dashboard/school/students');
    await assertNav(page, 'Empty nav', 'Staff', false, '/dashboard/school/staff');
    await assertNav(page, 'Empty nav', 'Classes', false, '/dashboard/school/courses');
    await assertNav(page, 'Empty nav', 'Timetables', false, '/dashboard/school/timetables');
    await assertNav(page, 'Empty nav', 'Settings', false, '/dashboard/school/settings/profile');
    await assertNav(page, 'Empty nav', 'Subscription', false, '/dashboard/school/subscription');

    await assertDenied(page, 'Empty overview', '/dashboard/school/overview', true);
    await assertDenied(page, 'Empty students', '/dashboard/school/students', true);
    await assertDenied(page, 'Empty settings', '/dashboard/school/settings/profile', true);

    await bootRole(page, 'Empty Lois boot');
    await openLois(page);
    const pupils = await askLois(page, 'Who sits in Primary 1?', 120_000);
    await scoreLois(page, 'Empty Lois pupils', pupils, { mustNotRoster: true });
    if (ROSTER_LEAK_RE.test(pupils)) {
      note('major', 'Empty Lois pupils', `Leaked roster with no desks: ${excerpt(pupils)}`);
    } else {
      note('pass', 'Empty Lois pupils', `No pupil names: ${excerpt(pupils)}`);
    }
    await capture(page, 'empty-pupils', 'Empty Lois pupils', 'No operations desk.');

    const fees = await askLois(page, 'Who still owes school fees?', 120_000);
    await scoreLois(page, 'Empty Lois fees', fees, { mustNotFees: true });
    if (/₦\s*\d/.test(fees) && ROSTER_LEAK_RE.test(fees)) {
      note('major', 'Empty Lois fees', `Leaked debtors: ${excerpt(fees)}`);
    } else {
      note('pass', 'Empty Lois fees', `No debtor dump: ${excerpt(fees)}`);
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Beulah VP — Primary lock', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-vp.json') });

  test('nav, school-type lock, Lois desks vs forbidden tools', async ({ page }) => {
    await bootRole(page, 'VP boot');
    await capture(page, 'vp-home', 'VP home', 'vice_principal locked to PRIMARY.');

    await assertNav(page, 'VP nav', 'Overview', false, '/dashboard/school/overview');
    await assertNav(page, 'VP nav', 'Students', false, '/dashboard/school/students');
    await assertNav(page, 'VP nav', 'Staff', false, '/dashboard/school/staff');
    await assertNav(page, 'VP nav', 'Classes', true, '/dashboard/school/courses');
    await assertNav(page, 'VP nav', 'Timetables', true, '/dashboard/school/timetables');
    await assertNav(page, 'VP nav', 'Applications', false, '/dashboard/school/applications');
    await assertNav(page, 'VP nav', 'Subscription', false, '/dashboard/school/subscription');
    await assertNav(page, 'VP nav', 'Settings', false, '/dashboard/school/settings/profile');

    const locked = page.getByText(/school type/i);
    if (!(await locked.first().isVisible().catch(() => false))) {
      note('major', 'VP school type', 'School type lock control missing (sidebar may still be empty)');
    } else {
      note('pass', 'VP school type', 'School type control visible');
      const primaryLock = page.getByText(/^primary$/i);
      if (await primaryLock.first().isVisible().catch(() => false)) {
        note('pass', 'VP school type', 'Shows Primary');
      } else {
        note('major', 'VP school type', 'Primary lock label missing');
      }
      const secondaryOption = page.getByRole('button', { name: /^secondary$/i });
      if ((await secondaryOption.count()) > 0 && (await secondaryOption.first().isVisible().catch(() => false))) {
        note('major', 'VP school type', 'Secondary switcher is clickable — VP should be locked');
      } else {
        note('pass', 'VP school type', 'No Secondary switcher option');
      }
    }
    await capture(page, 'vp-lock', 'VP school type', 'Locked to Primary.');

    await assertDenied(page, 'VP overview', '/dashboard/school/overview', true);
    await assertDenied(page, 'VP students', '/dashboard/school/students', true);
    await assertDenied(page, 'VP classes', '/dashboard/school/courses', false);
    await assertWriteControl(page, 'VP classes WRITE', /add class|add course/i, false);
    await assertWriteControl(page, 'VP classes WRITE', /auto-generate/i, false);
    await capture(page, 'vp-classes-readonly', 'VP classes', 'CLASSES READ must hide Add Class / Auto-Generate.');

    await assertDenied(page, 'VP timetables', '/dashboard/school/timetables', false);
    await assertWriteControl(page, 'VP timetables WRITE', /create timetable/i, false);
    await capture(page, 'vp-timetables-readonly', 'VP timetables', 'TIMETABLES READ must hide Create Timetable.');

    await assertDenied(page, 'VP applications URL', '/dashboard/school/applications', true);

    try {
    await bootRole(page, 'VP Lois boot');
    await openLois(page);

    const roster = await askLois(page, 'Who sits in Primary 1?', 120_000);
    await scoreLois(page, 'VP Lois roster', roster, { mustNotRoster: true });
    if (ROSTER_LEAK_RE.test(roster)) {
      note('major', 'VP Lois roster', `Named pupils without Students: ${excerpt(roster)}`);
    } else {
      note('pass', 'VP Lois roster', `No Primary 1 names: ${excerpt(roster)}`);
    }
    await capture(page, 'vp-roster', 'VP roster', 'CLASSES without STUDENTS must not list pupils.');

    const monday = await askLois(page, 'What periods does Primary 1 have on Monday?', 180_000);
    await scoreLois(page, 'VP Lois Monday', monday);
    if (/monday|period|assembly|timetable|math|english|no (saved )?period|no timetable/i.test(monday)) {
      note('pass', 'VP Lois Monday', `Timetable read: ${excerpt(monday)}`);
    } else {
      note('major', 'VP Lois Monday', `No timetable answer: ${excerpt(monday)}`);
    }
    if (await hasTimetablePreview(page)) {
      note('major', 'VP Lois Monday', 'Showed Apply on a read-only periods ask');
    }

    const genTt = await askLois(page, 'Generate a timetable for Primary 1 A.', 150_000);
    await scoreLois(page, 'VP Lois generate TT', genTt);
    if (await hasTimetablePreview(page)) {
      note('major', 'VP Lois generate TT', 'Showed Apply/preview without Timetables write');
    } else if (/apply|propose|i can generate|i'll generate/i.test(genTt) && !/don't have|do not have|need .*edit|write access|cannot/i.test(genTt)) {
      note('major', 'VP Lois generate TT', `Offered a write without WRITE: ${excerpt(genTt)}`);
    } else {
      note('pass', 'VP Lois generate TT', `Did not apply a timetable on READ: ${excerpt(genTt)}`);
    }

    const fees = await askLois(page, 'Who still owes in JSS 1?', 120_000);
    await scoreLois(page, 'VP Lois fees', fees, { mustNotFees: true });
    if (FEE_HIT_RE.test(fees) && /₦|[0-9]{3,}/.test(fees) && !/can't|cannot|don't|do not|permission|not available|don't have/i.test(fees)) {
      note('major', 'VP Lois fees', `Answered fees without SETTINGS: ${excerpt(fees)}`);
    } else {
      note('pass', 'VP Lois fees', `Did not dump debtors: ${excerpt(fees)}`);
    }

    const jss = await askLois(page, 'Who is lagging in JSS 2 Maths?', 180_000);
    await scoreLois(page, 'VP Lois JSS2', jss);
    if (/jss\s*2/i.test(jss) && /below|lagging|threshold|grade|no published|gradebook/i.test(jss)) {
      note(
        'info',
        'VP Lois JSS2',
        `Academic desk answered a Secondary class while locked to Primary: ${excerpt(jss)}`,
      );
    }
    await capture(page, 'vp-jss2', 'VP JSS 2 lagging', 'School-type lock vs Lois tools.');
    } catch (err) {
      note('major', 'VP Lois', `Lois turn hung: ${excerpt(String(err))}`);
      await capture(page, 'vp-lois-hung', 'VP Lois hung', String(err));
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Owner grants VP Classes Edit (WRITE)', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('set Class Management to Create & Edit', async ({ page }) => {
    await bootRole(page, 'Owner WRITE grant');
    if (!(await openExistingVpPermissions(page))) {
      writeReport();
      return;
    }
    await setClassPermissionLevel(page, 'edit');
    note('pass', 'Owner WRITE grant', 'Saved Class Management as Create & Edit for Beulah Vice');
    await capture(page, 'owner-vp-classes-edit', 'VP Classes Edit', 'Owner set Classes WRITE.');
    writeReport();
  });
});

test.describe('Beulah VP — Classes WRITE', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-vp.json') });

  test('Add Class appears after Edit grant', async ({ page }) => {
    await bootRole(page, 'VP WRITE boot');
    await assertDenied(page, 'VP WRITE classes', '/dashboard/school/courses', false);
    await assertWriteControl(page, 'VP WRITE classes', /add class|add course/i, true);
    await capture(page, 'vp-classes-write', 'VP classes after Edit', 'WRITE should show Add Class.');
    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Owner grants VP Classes Full Control', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('set Class Management to Full Control', async ({ page }) => {
    await bootRole(page, 'Owner ADMIN grant');
    if (!(await openExistingVpPermissions(page))) {
      writeReport();
      return;
    }
    await setClassPermissionLevel(page, 'full');
    note('pass', 'Owner ADMIN grant', 'Saved Class Management as Full Control for Beulah Vice');
    await capture(page, 'owner-vp-classes-full', 'VP Classes Full Control', 'Owner set Classes ADMIN.');
    writeReport();
  });
});

test.describe('Beulah VP — Classes ADMIN', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-vp.json') });

  test('Add Class remains after Full Control', async ({ page }) => {
    await bootRole(page, 'VP ADMIN boot');
    await assertDenied(page, 'VP ADMIN classes', '/dashboard/school/courses', false);
    await assertWriteControl(page, 'VP ADMIN classes', /add class|add course/i, true);
    await capture(page, 'vp-classes-admin', 'VP classes after Full Control', 'ADMIN includes Edit, so Add Class stays.');
    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Owner restores VP Classes View', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('restore Class Management to View Only', async ({ page }) => {
    await bootRole(page, 'Owner restore VIEW');
    if (!(await openExistingVpPermissions(page))) {
      writeReport();
      return;
    }
    await setClassPermissionLevel(page, 'view');
    note('pass', 'Owner restore VIEW', 'Restored Classes to View');
    await capture(page, 'owner-vp-classes-view', 'VP Classes View restored', 'Back to READ so Beulah Vice stays as seeded.');
    writeReport();
  });
});

test.describe('Beulah VP — renamed "Headteacher"', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-vp.json') });

  test('a principal-sounding title grants nothing', async ({ page, request }) => {
    const owner = storedSession('beulah-admin.json');
    const vp = storedSession('beulah-vp.json');
    if (!owner || !vp) {
      note('major', 'Title rename', 'Could not read the minted owner/VP sessions');
      writeReport();
      return;
    }
    const schoolId = owner.user.schoolId;
    const vpId = vp.user.profileId;
    const asOwner = { Authorization: `Bearer ${owner.token}` };
    const adminUrl = `${API_BASE}/schools/${schoolId}/admins/${vpId}`;

    // "Headteacher" is the exact spelling the old role-string check missed: no
    // separator, so it never normalised to head_teacher and never matched the
    // principal list. Under the tier it is simply a label, which is the point.
    const renamed = await request.patch(adminUrl, { headers: asOwner, data: { role: 'Headteacher' } });
    if (!renamed.ok()) {
      note('major', 'Title rename', `Could not rename the VP: ${renamed.status()} ${excerpt(await renamed.text())}`);
      writeReport();
      return;
    }

    try {
      const after = await request.get(`${adminUrl}/permissions`, { headers: asOwner });
      const tier = (await after.json().catch(() => ({})))?.data?.accessTier;
      if (tier === 'STAFF') {
        note('pass', 'Title rename', 'Renaming to Headteacher left the admin on STAFF tier');
      } else {
        note('blocker', 'Title rename', `Renaming to Headteacher moved the tier to ${tier}`);
      }

      await bootRole(page, 'Renamed VP boot');
      await assertNav(page, 'Renamed VP nav', 'Settings', false, '/dashboard/school/settings/profile');
      await assertNav(page, 'Renamed VP nav', 'Staff', false, '/dashboard/school/staff');
      await assertNav(page, 'Renamed VP nav', 'Subscription', false, '/dashboard/school/subscription');
      await assertDenied(page, 'Renamed VP deep link', '/dashboard/school/staff', true);
      await assertDenied(page, 'Renamed VP deep link', '/dashboard/school/subscription', true);
      await capture(page, 'vp-renamed-headteacher', 'VP renamed Headteacher', 'The title changed; the dashboard did not.');
    } finally {
      await request.patch(adminUrl, { headers: asOwner, data: { role: 'vice_principal' } });
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Owner — demoting a principal must say what they keep', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('promote the VP, then step them down onto a template', async ({ page, request }) => {
    const owner = storedSession('beulah-admin.json');
    const vp = storedSession('beulah-vp.json');
    if (!owner || !vp) {
      note('major', 'Access tier', 'Could not read the minted owner/VP sessions');
      writeReport();
      return;
    }
    const schoolId = owner.user.schoolId;
    const vpId = vp.user.profileId;
    const asOwner = { Authorization: `Bearer ${owner.token}` };
    const tierUrl = `${API_BASE}/schools/${schoolId}/admins/${vpId}/access-tier`;

    const promoted = await request.patch(tierUrl, {
      headers: asOwner,
      data: { accessTier: 'PRINCIPAL' },
    });
    if (!promoted.ok()) {
      note('major', 'Access tier', `Could not promote the VP: ${promoted.status()} ${excerpt(await promoted.text())}`);
      writeReport();
      return;
    }
    note('pass', 'Access tier', 'Owner promoted the VP to principal-level access');

    try {
      // The whole reason this endpoint exists: a bare demotion would leave
      // someone signed in with nothing on their dashboard.
      const bare = await request.patch(tierUrl, { headers: asOwner, data: { accessTier: 'STAFF' } });
      if (bare.status() === 400) {
        note('pass', 'Access tier', 'Demotion with no replacement access was refused');
      } else {
        note('blocker', 'Access tier', `Demotion with no replacement returned ${bare.status()} instead of 400`);
      }

      await bootRole(page, 'Owner tier UI');
      await gotoPath(page, '/dashboard/school/staff');
      await expect(page.getByText(/loading staff/i)).toHaveCount(0, { timeout: 60_000 }).catch(() => undefined);
      const search = page.getByPlaceholder(/search staff/i);
      if (await search.isVisible().catch(() => false)) {
        await search.fill('Vice');
        await page.waitForTimeout(800);
      }

      const tierButton = page.getByRole('button', { name: /remove principal-level access/i }).first();
      if (await tierButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await tierButton.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10_000 });

        const wording = ((await dialog.innerText().catch(() => '')) || '').toLowerCase();
        if (/empty dashboard|bypasses permissions/.test(wording)) {
          note('pass', 'Access tier UI', 'Demotion dialog spells out what the person loses');
        } else {
          note('minor', 'Access tier UI', `Demotion dialog did not state the consequence: ${excerpt(wording)}`);
        }

        const confirmButton = dialog.getByRole('button', { name: /remove and apply access/i }).first();
        if (await confirmButton.isDisabled().catch(() => false)) {
          note('pass', 'Access tier UI', 'Confirm stays disabled until a replacement is chosen');
        } else {
          note('major', 'Access tier UI', 'Confirm was clickable before any replacement access was chosen');
        }

        const template = dialog.getByRole('button', { name: /front desk/i }).first();
        if (await template.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await template.click();
          if (await dialog.getByRole('heading', { name: /will see/i }).isVisible().catch(() => false)) {
            note('pass', 'Access tier UI', 'Picking a template previews the dashboard they land on');
          } else {
            note('minor', 'Access tier UI', 'No preview after picking the replacement template');
          }
          await capture(page, 'owner-demote-replacement', 'Demotion replacement', 'Stepping a principal down onto a named bundle.');
          await confirmButton.click();
          await page.waitForTimeout(2000);
        } else {
          note('major', 'Access tier UI', 'Demotion dialog offered no role templates to land on');
        }
      } else {
        note('major', 'Access tier UI', 'No remove-principal-access control on the staff list');
      }
    } finally {
      // Put the VP back exactly as seeded, tier and rows, whatever happened above.
      const restored = await request.patch(tierUrl, {
        headers: asOwner,
        data: { accessTier: 'STAFF', role: 'vice_principal', permissions: VP_SEEDED_ACCESS },
      });
      if (restored.ok()) {
        note('pass', 'Access tier', 'VP restored to staff tier with the seeded four screens');
      } else if (restored.status() === 400) {
        // Already STAFF because the UI demotion landed — just reset the rows.
        const catalog = await request.get(`${API_BASE}/schools/${schoolId}/permissions`, { headers: asOwner });
        const rows: Array<{ id: string; resource: string; type: string }> =
          (await catalog.json().catch(() => ({})))?.data ?? [];
        const ids = VP_SEEDED_ACCESS.map(
          (want) => rows.find((r) => r.resource === want.resource && r.type === want.type)?.id,
        ).filter(Boolean);
        await request.post(`${API_BASE}/schools/${schoolId}/admins/${vpId}/permissions`, {
          headers: asOwner,
          data: { permissionIds: ids },
        });
        note('pass', 'Access tier', 'UI demotion landed; VP rows reset to the seeded four');
      }
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Owner — role templates on the Add Admin form', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-admin.json') });

  test('picking Bursar fills the access for you', async ({ page }) => {
    await bootRole(page, 'Template boot');
    await gotoPath(page, '/dashboard/school/staff/add');

    const adminType = page.getByRole('button', { name: /administrator/i }).first();
    await expect(adminType).toBeVisible({ timeout: 60_000 });
    await adminType.click();

    const roleInput = page.getByPlaceholder(/pick a role, or type your own title/i);
    await expect(roleInput).toBeVisible({ timeout: 15_000 });

    // Everything a new admin needs except the access itself. Nothing is granted
    // until the school says so, so this form must still refuse to submit.
    await page.getByLabel('First Name *').fill('Template');
    await page.getByLabel('Last Name *').fill('Probe');
    await page.getByLabel('Email *').fill('template.probe@example.test');
    await page.getByLabel('Phone *').fill('2348090100009');
    await roleInput.fill('Bursar');

    const submit = page.getByRole('button', { name: /continue/i }).last();
    if (await submit.isDisabled().catch(() => false)) {
      note('pass', 'Templates', 'Submit is blocked while no access has been chosen');
    } else {
      note('major', 'Templates', 'Add Admin was submittable with no access chosen');
    }

    const bursar = page.getByRole('button', { name: /^Bursar/ }).first();
    if (!(await bursar.isVisible({ timeout: 5_000 }).catch(() => false))) {
      note('major', 'Templates', 'No Bursar template offered in the role combobox');
      writeReport();
      return;
    }
    await bursar.click();
    await page.waitForTimeout(600);

    const permHeader = page.getByText(/dashboard permissions/i).first();
    await expect(permHeader).toBeVisible({ timeout: 15_000 });
    const count = await page.getByText(/\d+ selected/).first().innerText().catch(() => '0 selected');
    if (/^(0|1) selected/.test(count)) {
      note('major', 'Templates', `Bursar template granted nothing: ${count}`);
    } else {
      note('pass', 'Templates', `Bursar template filled the picker (${count})`);
    }
    if (await submit.isEnabled().catch(() => false)) {
      note('pass', 'Templates', 'Choosing a template is enough to submit — no tick-box archaeology');
    } else {
      note('major', 'Templates', 'Submit still blocked after applying a template');
    }

    const previewText = ((await page.locator('main').innerText().catch(() => '')) || '').toLowerCase();
    for (const screen of ['students', 'applications']) {
      if (previewText.includes(screen)) note('pass', 'Templates', `Preview lists ${screen} for a Bursar`);
      else note('minor', 'Templates', `Preview did not list ${screen} for a Bursar`);
    }
    if (/staff/.test(previewText) && /full control/.test(previewText)) {
      note('minor', 'Templates', 'Bursar preview mentions full control — check the built-in bundle');
    }

    await capture(page, 'owner-template-bursar', 'Bursar template applied', 'A named bundle instead of eighteen tick-boxes.');
    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});

test.describe('Beulah VP — a lone Full Control row', () => {
  test.use({ storageState: path.join(AUTH_DIR, 'beulah-vp.json') });

  test('ADMIN with no READ beneath it still opens the screen', async ({ page, request }) => {
    const owner = storedSession('beulah-admin.json');
    const vp = storedSession('beulah-vp.json');
    if (!owner || !vp) {
      note('major', 'ADMIN-only row', 'Could not read the minted owner/VP sessions');
      writeReport();
      return;
    }
    const schoolId = owner.user.schoolId;
    const vpId = vp.user.profileId;
    const asOwner = { Authorization: `Bearer ${owner.token}` };
    const permsUrl = `${API_BASE}/schools/${schoolId}/admins/${vpId}/permissions`;

    const catalog = await request.get(`${API_BASE}/schools/${schoolId}/permissions`, { headers: asOwner });
    const rows: Array<{ id: string; resource: string; type: string }> =
      (await catalog.json().catch(() => ({})))?.data ?? [];
    const idFor = (resource: string, type: string) =>
      rows.find((r) => r.resource === resource && r.type === type)?.id;

    const seeded = VP_SEEDED_ACCESS.map((w) => idFor(w.resource, w.type)).filter(Boolean) as string[];
    const studentsAdmin = idFor('STUDENTS', 'ADMIN');
    if (!studentsAdmin || seeded.length !== VP_SEEDED_ACCESS.length) {
      note('major', 'ADMIN-only row', 'Permission catalog did not contain the rows this check needs');
      writeReport();
      return;
    }

    // Full Control with no View row under it. The levels are a hierarchy, not a
    // set of independent switches, so this has to open the screen — otherwise a
    // school that grants only the top level locks the person out of it.
    const granted = await request.post(permsUrl, {
      headers: asOwner,
      data: { permissionIds: [...seeded, studentsAdmin] },
    });
    if (!granted.ok()) {
      note('major', 'ADMIN-only row', `Could not grant STUDENTS:ADMIN: ${granted.status()} ${excerpt(await granted.text())}`);
      writeReport();
      return;
    }

    try {
      await bootRole(page, 'ADMIN-only boot');
      await assertNav(page, 'ADMIN-only nav', 'Students', true, '/dashboard/school/students');
      await assertDenied(page, 'ADMIN-only deep link', '/dashboard/school/students', false);
      await assertWriteControl(page, 'ADMIN-only write', /add student|new student/i, true);
      await capture(page, 'vp-students-admin-only', 'Students via Full Control only', 'ADMIN implies View, so the screen opens.');
    } finally {
      await request.post(permsUrl, { headers: asOwner, data: { permissionIds: seeded } });
    }

    writeReport();
    expect(findings.filter((f) => f.severity === 'blocker')).toHaveLength(0);
  });
});
