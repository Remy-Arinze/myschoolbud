# Teacher Dashboard — E2E Test Checklist

Track progress top to bottom. Mark items `[x]` when the spec passes reliably in CI/local.

**Auth setup (run once):**
```bash
cd backend && npx tsx scripts/mint-e2e-teacher-auth.ts
cd backend && npx tsx scripts/mint-e2e-student-auth.ts
```

**Run teacher E2E suite:**
```bash
cd frontend && npx playwright test e2e/teacher --project=teacher
```

---

## Legend

| Status | Meaning |
|--------|---------|
| `[x]` | Covered by an existing passing spec |
| `[ ]` | Not yet covered — build next |
| `[~]` | Partial / smoke only — needs full workflow spec |

---

## A. Foundation (shell & navigation)

- [x] **A1** Overview loads with teacher identity and schedule sections — `ui-teacher-dashboard.spec.ts`
- [x] **A2** Sidebar navigation: Overview, Timetables, Classes, Calendar — `ui-teacher-dashboard.spec.ts`
- [x] **A3** Primary teacher: classes list → open class detail — `ui-teacher-dashboard.spec.ts`
- [x] **A4** Timetable page loads — `ui-teacher-dashboard.spec.ts`
- [x] **A5** Calendar page loads without error boundary — `ui-teacher-calendar.spec.ts`
- [x] **A5b** Term ↔ timetable sync: overdue ACTIVE term hides live schedule on overview/timetables — `ui-term-calendar-timetable-sync.spec.ts`
- [ ] **A6** Notifications page loads (`/dashboard/teacher/notifications`)
- [ ] **A7** History page loads (`/dashboard/teacher/history`)
- [ ] **A8** Teacher billing strip visible / correct state when subscription active
- [ ] **A9** Secondary teacher (Chidi): overview + form-class shortcut labeling — partial in `ui-teacher-dashboard.spec.ts`; expand coverage

---

## B. Class hub — tabs (per assigned class)

### B1. Overview tab
- [x] **B1.1** Overview tab loads (implicit in class open)
- [x] **B1.2** Stats cards show assessments / resources counts — `ui-teacher-class-overview.spec.ts`
- [x] **B1.3** “Next in curriculum” chip shows correct week/topic — `ui-teacher-class-overview.spec.ts`
- [x] **B1.4** Quick actions: Manage Assessments, Take Roll Call links work — `ui-teacher-class-overview.spec.ts`

### B2. Students tab
- [x] **B2.1** Students tab loads with roster — `ui-teacher-dashboard.spec.ts`
- [ ] **B2.2** Search/filter students (if UI exists)
- [ ] **B2.3** Click student → teacher student profile (`/dashboard/teacher/students/[id]`)

### B3. Grades tab
- [~] **B3.1** Grades tab loads — `ui-teacher-dashboard.spec.ts` (smoke only)
- [x] **B3.2** Bulk grade entry modal → save CA/Exam scores for multiple students — `ui-teacher-grades.spec.ts`
- [x] **B3.3** Publish individual grade → status updates to published — `ui-teacher-grades.spec.ts`
- [x] **B3.4** Delete grade (confirm modal) — `ui-teacher-grades.spec.ts`
- [x] **B3.5** Filter by grade type (CA / Assignment / Exam) — `ui-teacher-grades.spec.ts`
- [x] **B3.6** Filter by sequence — `ui-teacher-grades.spec.ts`
- [x] **B3.7** Student-centric cards expand → per-assessment scores visible — `ui-teacher-grades.spec.ts`
- [x] **B3.8** Assessment publish grade syncs to Grades tab (cross-feature) — `ui-teacher-grades.spec.ts`

### B4. Assessments tab
- [x] **B4.1** Manual MCQ create → publish → student submit → teacher sees submission — `ui-teacher-assessments.spec.ts`
- [x] **B4.2** Past-due strict → student sees “Submission Window Closed” — `ui-assessment-deadlines.spec.ts`
- [x] **B4.3** Late submission flags + penalty deduction on grade screen — `ui-assessment-late-grading.spec.ts`
- [ ] **B4.4** Create assessment from class **modal** (`CreateAssessmentModal`) not only full `/assessments/new` page
- [ ] **B4.5** Timed exam: teacher sets duration + auto-submit from create UI → student timer works
- [ ] **B4.6** Integrity check enabled → student fullscreen / violation logging
- [ ] **B4.7** Allow late after due + penalty points configured on create form
- [ ] **B4.8** Allow late after timer + penalty points configured on create form
- [ ] **B4.9** Term filter on class Assessments tab — draft/published appears after save
- [ ] **B4.10** Teacher assessment detail → open grade screen → publish MCQ grade
- [ ] **B4.11** Essay / short-answer: Lois AI suggest → apply → publish grade
- [ ] **B4.12** AI assessment create flow (`source=ai` or modal AI helper) — may need mocked AI / credits
- [ ] **B4.13** Delete assessment with zero submissions
- [ ] **B4.14** Delete assessment with submissions → blocked with message

### B5. Scheme of Work tab
- [~] **B5.1** SoW tab loads + API smoke — `ui-teacher-curriculum-sow.spec.ts`
- [x] **B5.2** Mark week **delivered** (on-time path) — `ui-teacher-sow-delivery.spec.ts`
- [~] **B5.3** Mark week delivered **late** with catch-up reason — `ui-teacher-sow-delivery.spec.ts` (skips if no undelivered past weeks)
- [~] **B5.4** Upload delivery notes / proof file — `ui-teacher-sow-delivery.spec.ts` (skips without Cloudinary)
- [x] **B5.5** Confidence score displays after delivery — `ui-teacher-sow-delivery.spec.ts`
- [~] **B5.6** Cannot mark future week before window opens — `ui-teacher-sow-delivery.spec.ts` (skips at end-of-term / no upcoming weeks)
- [x] **B5.7** Delivered week shows correct status on revisit — `ui-teacher-sow-delivery.spec.ts`

### B6. Timetable tab (class-scoped)
- [~] **B6.1** Tab loads — partial via dashboard smoke
- [ ] **B6.2** Term selector switches timetable data
- [ ] **B6.3** Periods match admin-configured timetable (needs seeded data)

### B7. Resources tab
- [ ] **B7.1** Resources tab loads
- [ ] **B7.2** List shows uploaded resources
- [ ] **B7.3** Download resource works
- [ ] **B7.4** Empty state when no resources

### B8. Roll Call tab
- [~] **B8.1** Tab loads — `ui-teacher-dashboard.spec.ts` (smoke only)
- [ ] **B8.2** Mark attendance present/absent (blocked until “Coming Soon” removed)
- [ ] **B8.3** Daily roll call saves and reflects on revisit

---

## C. Standalone assessment pages

- [x] **C1** `/dashboard/teacher/assessments/new` — manual publish — `ui-teacher-assessments.spec.ts`
- [ ] **C2** `/dashboard/teacher/assessments/new?source=ai` — AI prefill path
- [ ] **C3** `/dashboard/teacher/assessments/[id]` — submission list + late badges on rows
- [ ] **C4** `/dashboard/teacher/assessments/[id]/grade/[studentId]` — integrity report panel when `hasIntegrity`
- [ ] **C5** Grading: waive all late deductions → final score = question total

---

## D. API / integration scripts (fast regression, no browser)

- [x] **D1** Due date + timer enforcement — `backend/scripts/test-assessment-deadlines.ts`
- [x] **D2** Late penalty suggest + grade + waive — `backend/scripts/test-assessment-late-penalties.ts`
- [x] **D3** Deadline util unit tests — `backend/src/assessments/assessment-deadline.util.spec.ts`
- [ ] **D4** Grade publish API → Grade model + student visibility
- [ ] **D5** SoW week delivery API — confidence + window rules

---

## E. Cross-role flows (teacher + student)

- [x] **E1** Teacher publish assessment → student submit → teacher review — `ui-teacher-assessments.spec.ts`
- [ ] **E2** Teacher publish grade on assessment → student sees score on overview
- [ ] **E3** Teacher publish CA grade → student/parent gradebook entry
- [ ] **E4** Real-time notification on new submission (teacher notifications UI)

---

## F. Secondary school teacher (Chidi)

- [~] **F1** Overview + sidebar — partial in `ui-teacher-dashboard.spec.ts`
- [ ] **F2** Multiple assigned classes in Classes hub
- [ ] **F3** Subject-only teacher cannot grade all subjects
- [ ] **F4** Form teacher sees form class + subject classes

---

## G. Plugins & extras

- [ ] **G1** `/dashboard/teacher/plugins` — plugin list loads
- [ ] **G2** Agora AI plugin page loads and accepts input
- [ ] **G3** Roll Call plugin page loads

---

## Recommended build order (one spec at a time)

| Order | ID | Spec file to create / extend |
|-------|-----|------------------------------|
| 1 | B3.2–B3.8 | `ui-teacher-grades.spec.ts` |
| 2 | B5.2–B5.7 | `ui-teacher-sow-delivery.spec.ts` |
| 3 | B4.5–B4.8 | `ui-assessment-timed-create.spec.ts` |
| 4 | B3.8 / E2 | `ui-assessment-grade-sync.spec.ts` |
| 5 | B4.4 | `ui-assessment-modal-create.spec.ts` |
| 6 | B4.11 | `ui-assessment-ai-grading.spec.ts` |
| 7 | B4.12 | `ui-assessment-ai-create.spec.ts` |
| 8 | B7.1–B7.4 | `ui-teacher-resources.spec.ts` |
| 9 | B2.3 | `ui-teacher-student-profile.spec.ts` |
| 10 | E4 / A6 | `ui-teacher-notifications.spec.ts` |

---

## Notes / blockers

- **Roll Call (B8.2+):** UI still shows “Coming Soon” overlay — defer full E2E until feature ships.
- **AI flows (B4.12, C2):** Need AI credits or backend mock; consider API-level test first.
- **Timetable (B6.3):** Depends on school-admin timetable E2E seed data.
- **Auth cookies:** Playwright `storageState` may need `expires` on cookies for `request` fixture; use `fetch` in setup steps (pattern in `ui-assessment-late-grading.spec.ts`).

---

*Last updated: 2026-08-03*
