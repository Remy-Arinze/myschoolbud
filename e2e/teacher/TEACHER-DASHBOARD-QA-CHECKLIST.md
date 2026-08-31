# Teacher Dashboard — E2E QA Checklist

Work through items **top to bottom**. Mark status as you go: `[ ]` pending · `[~]` in progress · `[x]` done · `[-]` blocked/skipped.

**Auth setup (run once before UI tests):**
```bash
cd backend && npx tsx scripts/mint-e2e-teacher-auth.ts
cd backend && npx tsx scripts/mint-e2e-student-auth.ts
```

**Run a spec:**
```bash
cd frontend && npx playwright test e2e/teacher/<spec-file>.spec.ts --project=teacher
```

---

## A. Foundation (smoke — mostly done)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| A1 | [x] | Overview + nav | Teacher shell loads; sidebar links work (Overview, Timetables, Classes, Calendar) | `ui-teacher-dashboard.spec.ts` |
| A2 | [x] | Primary vs Secondary | Ada Primary + Chidi Secondary overview labels | `ui-teacher-dashboard.spec.ts` |
| A3 | [x] | Calendar | Page loads without error boundary | `ui-teacher-calendar.spec.ts` |
| A4 | [x] | Timetable page | Teacher timetable route loads | `ui-teacher-dashboard.spec.ts` |

---

## B. Class hub — core tabs

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| B1 | [x] | Open class | My Class → class detail URL | `ui-teacher-dashboard.spec.ts` |
| B2 | [x] | Students tab | Roster loads; student names visible | `ui-teacher-dashboard.spec.ts` |
| B3 | [~] | Grades tab | Tab loads only — **needs full workflow** (see C1–C5) | `ui-teacher-dashboard.spec.ts` |
| B4 | [~] | Roll Call tab | Tab loads — UI still "Coming Soon"; full flow blocked | `ui-teacher-dashboard.spec.ts` |
| B5 | [ ] | Overview tab | Stats cards, next curriculum week chip, quick action links | *new spec* |
| B6 | [ ] | Timetable tab (class) | Term selector; periods grid for class | *new spec* |
| B7 | [ ] | Resources tab | List resources; download; empty state | *new spec* |
| B8 | [~] | Scheme of Work tab | Tab smoke only — **needs delivery flow** (see D1–D4) | `ui-teacher-curriculum-sow.spec.ts` |
| B9 | [~] | Assessments tab (class) | Create button navigates; term filter shows drafts | partial — see E-series |

---

## C. Grades workflow (high priority)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| C1 | [ ] | Bulk grade entry | Open modal → enter scores for multiple students → save | *new: `ui-teacher-grades.spec.ts`* |
| C2 | [ ] | Single grade entry | Add/edit one grade for one student | *new spec* |
| C3 | [ ] | Publish grade | Unpublished → publish → status updates | *new spec* |
| C4 | [ ] | Delete grade | Delete with confirm; removed from list | *new spec* |
| C5 | [ ] | Grade filters | Filter by CA / Exam / Assignment / sequence | *new spec* |
| C6 | [ ] | Assessment → Grades sync | Publish assessment grade → appears on student Grades tab | *new spec* |
| C7 | [ ] | Student grade expand | Expand student card; see individual assessment rows | *new spec* |

---

## D. Scheme of Work — week delivery (high priority)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| D1 | [ ] | Mark week delivered | Teacher marks current/past week delivered with reason | *new: `ui-teacher-sow-delivery.spec.ts`* |
| D2 | [ ] | Notes upload | Upload delivery proof file on mark delivered | *new spec* |
| D3 | [ ] | Confidence score | Confidence chip updates after delivery | *new spec* |
| D4 | [ ] | Catch-up path | Late week delivery with catch-up reason | *new spec* |
| D5 | [ ] | Week window gate | Cannot mark future week before window opens | *new spec* |

---

## E. Assessments (partially done — finish gaps)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| E1 | [x] | Manual MCQ lifecycle | Teacher publish → student submit → teacher sees submission | `ui-teacher-assessments.spec.ts` |
| E2 | [x] | Due date enforcement | Past-due strict → student "Submission Window Closed" | `ui-assessment-deadlines.spec.ts` |
| E3 | [x] | Timer enforcement (API) | Block late submit; allow auto-submit | `backend/scripts/test-assessment-deadlines.ts` |
| E4 | [x] | Late penalties | Flags, suggested deduction, teacher waive/apply on grade | `ui-assessment-late-grading.spec.ts` + `test-assessment-late-penalties.ts` |
| E5 | [ ] | Timed exam (full UI) | Teacher sets timer + auto-submit on create page → student countdown | *new spec* |
| E6 | [ ] | Integrity exam (UI) | Teacher enables integrity → student fullscreen/violation logging | *new spec* |
| E7 | [ ] | Essay / short answer grading | Lois AI suggest → apply → publish final score | *new spec* |
| E8 | [ ] | Create from class modal | `CreateAssessmentModal` path (not only `/assessments/new`) | *new spec* |
| E9 | [ ] | AI assessment create | AI generate questions → publish (mock AI or seeded credits) | *new spec* |
| E10 | [ ] | Assessments term filter | Published draft visible on class Assessments tab after create | *new spec* |
| E11 | [ ] | Delete assessment | Delete with no submissions; block delete with submissions | *new spec* |
| E12 | [ ] | Grade MCQ from UI | Teacher opens grade page → publish (non-late path) | *extend `ui-teacher-assessments.spec.ts`* |

---

## F. Student & notifications (medium priority)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| F1 | [ ] | Student profile | Class roster → `/dashboard/teacher/students/[id]` loads | *new spec* |
| F2 | [ ] | Submission notification | Teacher notified when student submits assessment | *new spec* |
| F3 | [ ] | Notifications center | `/dashboard/teacher/notifications` loads; mark read | *new spec* |
| F4 | [ ] | Grade published to student | After publish, student sees grade (cross-role) | *new spec* |

---

## G. Secondary teacher (medium priority)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| G1 | [~] | Secondary overview | Form shortcut labeling | `ui-teacher-dashboard.spec.ts` (secondary block) |
| G2 | [ ] | Multi-class hub | Chidi sees multiple classes (not only My Class) | *new spec* |
| G3 | [ ] | Subject teacher permissions | Can grade only assigned subjects | *new spec* |
| G4 | [ ] | Form teacher permissions | Form class vs subject class behavior | *new spec* |

---

## H. Plugins & misc (lower priority / blocked)

| # | Status | Area | What to verify | Spec / script |
|---|--------|------|----------------|---------------|
| H1 | [-] | Roll Call (full) | Mark present/absent — **blocked until "Coming Soon" removed** | — |
| H2 | [ ] | Plugins hub | `/dashboard/teacher/plugins` loads | *new spec* |
| H3 | [ ] | Agora AI plugin | Fullscreen AI chat page loads | *new spec* |
| H4 | [ ] | History page | `/dashboard/teacher/history` loads | *new spec* |
| H5 | [ ] | Billing strip | Teacher billing strip when subscription restricted | *new spec* |

---

## Recommended order (do one after another)

1. **C1–C7** — Grades (biggest daily teacher gap)
2. **D1–D5** — Scheme of Work delivery
3. **E5–E6** — Timed + integrity exams (UI)
4. **E12, E10** — Assessment polish (grade UI + term filter)
5. **E7–E9** — AI paths (when credits/mocks ready)
6. **B5–B7** — Remaining class tabs
7. **F1–F4** — Notifications + cross-role
8. **G2–G4** — Secondary teacher depth
9. **H2–H5** — Plugins & misc

---

## Progress log

| Date | Item | Result | Notes |
|------|------|--------|-------|
| 2026-08-03 | E1–E4, A1–A4, B1–B2 | Pass | 7 Playwright + 19 API + 16 unit tests green |
| | | | |

---

## Key files reference

| Purpose | Path |
|---------|------|
| Class hub (all tabs) | `frontend/src/app/dashboard/teacher/classes/[id]/page.tsx` |
| Create assessment (manual) | `frontend/src/app/dashboard/teacher/assessments/new/page.tsx` |
| Create assessment (modal) | `frontend/src/components/modals/CreateAssessmentModal.tsx` |
| Grade submission | `frontend/src/app/dashboard/teacher/assessments/[id]/grade/[studentId]/page.tsx` |
| SoW delivery UI | `frontend/src/components/scheme-of-work/SchemeOfWorkView.tsx` |
| Deadline logic | `backend/src/assessments/assessment-deadline.util.ts` |
| Late penalty UI | `frontend/src/components/assessments/GradingLatePanel.tsx` |
