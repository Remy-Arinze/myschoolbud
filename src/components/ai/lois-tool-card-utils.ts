/** Card title noun — shorter than the SSE display name for entity-scoped tools. */
export const TOOL_CARD_NOUN: Record<string, string> = {
  propose_timetable: 'Timetable preview',
  propose_scheme: 'Scheme of work',
  generate_quiz: 'Quiz',
  generate_assessment: 'Assessment',
  generate_lesson_plan: 'Lesson plan',
  inspect_scheduling_context: 'Scheduling',
  inspect_curriculum_options: 'Curriculum',
  list_classes: 'Classes',
  get_timetable: 'Timetable',
  who_teaches: 'Who teaches',
  get_now_in_class: 'Now in class',
  get_scheme_of_work: 'Scheme of work',
  get_student_overview: 'Student',
  get_class_performance: 'Class performance',
  list_students: 'Students',
  get_guardians: 'Guardians',
  get_calendar: 'Calendar',
  list_staff: 'Staff',
  list_fee_debtors: 'Fees',
  list_admissions: 'Applications',
  get_school_stats: 'School snapshot',
  get_attendance_summary: 'Attendance',
  get_academic_risk_summary: 'Academic risk',
  draft_parent_message: 'Parent draft',
  list_lois_insights: 'Insights',
  search_semantic: 'Knowledge',
};

export const PLAN_TOOLS = new Set(['propose_timetable', 'propose_scheme']);
export const GENERATE_TOOLS = new Set([
  'generate_quiz',
  'generate_assessment',
  'generate_lesson_plan',
]);
export const QUIET_TOOLS = new Set([
  'inspect_scheduling_context',
  'inspect_curriculum_options',
  'list_classes',
  'apply_pending_plans',
]);
export const LABELED_LOOKUP_TOOLS = new Set([
  'get_timetable',
  'who_teaches',
  'get_now_in_class',
  'get_scheme_of_work',
  'get_student_overview',
  'get_class_performance',
  'list_students',
  'get_guardians',
  'get_calendar',
  'list_staff',
  'list_fee_debtors',
  'list_admissions',
  'get_school_stats',
  'get_attendance_summary',
  'get_academic_risk_summary',
  'draft_parent_message',
  'list_lois_insights',
  'search_semantic',
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function deriveEntityLabel(
  toolName: string | undefined,
  args?: Record<string, unknown> | null,
  result?: unknown,
): string | undefined {
  if (!toolName) return undefined;
  const rec = asRecord(result) || {};
  const a = args || {};
  const classish =
    str(rec.classLabel) || str(rec.className) || str(a.classQuery) || str(a.classLabel);

  if (
    toolName === 'propose_timetable' ||
    toolName === 'propose_scheme' ||
    toolName === 'inspect_scheduling_context' ||
    toolName === 'inspect_curriculum_options' ||
    toolName === 'get_now_in_class' ||
    toolName === 'who_teaches' ||
    toolName === 'get_class_performance'
  ) {
    return classish || str(a.subject);
  }

  if (toolName === 'get_timetable') {
    const day = str(rec.dayOfWeek) || str(a.day);
    if (classish && day) return `${classish} · ${day}`;
    return classish || day;
  }

  if (toolName === 'get_scheme_of_work') {
    const schemes = Array.isArray(rec.schemes) ? rec.schemes : [];
    const first = asRecord(schemes[0]);
    const subject = (first && str(first.subject)) || str(a.subject);
    const level = first ? str(first.classLevel) : undefined;
    const bits = [level || classish, subject].filter(Boolean);
    return bits.length ? bits.join(' · ') : classish;
  }

  if (toolName === 'get_student_overview' || toolName === 'get_guardians') {
    return str(rec.studentName) || str(rec.name);
  }

  if (toolName === 'list_students') {
    return classish || str(a.query);
  }

  if (toolName === 'list_classes') {
    return str(a.query) || str(rec.query);
  }

  if (GENERATE_TOOLS.has(toolName)) {
    const topic = str(rec.title) || str(rec.topic) || str(a.topic);
    const subject = str(a.subject);
    const grade = str(a.gradeLevel);
    const head = topic || subject;
    if (head && grade && head !== grade) return `${head} · ${grade}`;
    return head || grade;
  }

  return classish || str(rec.title) || str(rec.name) || str(a.topic) || str(a.query);
}

export function toolCardNoun(toolName?: string, fallback?: string): string {
  if (toolName && TOOL_CARD_NOUN[toolName]) return TOOL_CARD_NOUN[toolName];
  return fallback || (toolName ? toolName.replace(/_/g, ' ') : 'Tool');
}

export function toolCardTitle(params: {
  toolName?: string;
  toolDisplayName?: string;
  entityLabel?: string;
  args?: Record<string, unknown> | null;
  result?: unknown;
}): string {
  const entity =
    params.entityLabel || deriveEntityLabel(params.toolName, params.args, params.result);
  const noun = toolCardNoun(params.toolName, params.toolDisplayName);
  return entity ? `${noun} — ${entity}` : noun;
}

export function quietChipTitle(params: {
  toolName?: string;
  entityLabel?: string;
  args?: Record<string, unknown> | null;
  result?: unknown;
}): string {
  const rec = asRecord(params.result) || {};
  const entity =
    params.entityLabel || deriveEntityLabel(params.toolName, params.args, params.result);
  const err = str(rec.error);

  if (params.toolName === 'inspect_scheduling_context') {
    if (err) return entity ? `Could not inspect ${entity} — ${err}` : err;
    if (rec.hasExistingTimetable) {
      return entity ? `Checked ${entity} — timetable exists` : 'Checked timetable — already exists';
    }
    return entity ? `Checked ${entity} — no timetable yet` : 'Checked class — no timetable yet';
  }

  if (params.toolName === 'inspect_curriculum_options') {
    if (err) return entity ? `Could not inspect curriculum for ${entity}` : 'Could not inspect curriculum';
    return entity ? `Checked curriculum for ${entity}` : 'Checked curriculum options';
  }

  if (params.toolName === 'list_classes') {
    if (err) return err;
    const message = str(rec.message);
    if (message) return message;
    const count = typeof rec.count === 'number' ? rec.count : undefined;
    if (entity && count != null) return `Found ${count} class${count === 1 ? '' : 'es'} matching ${entity}`;
    if (count != null) return `Found ${count} class${count === 1 ? '' : 'es'}`;
    return entity ? `Classes — ${entity}` : 'Classes';
  }

  if (params.toolName === 'apply_pending_plans') {
    if (err) return err;
    const message = str(rec.message);
    if (message) return message;
    const applied = Array.isArray(rec.applied) ? rec.applied.length : 0;
    if (applied) return `Saved ${applied} preview${applied === 1 ? '' : 's'}`;
    return 'No pending previews to apply';
  }

  return toolCardTitle(params);
}

export function quietChipFacts(
  toolName: string | undefined,
  result: unknown,
): string[] {
  const rec = asRecord(result);
  if (!rec) return [];
  const err = str(rec.error);
  if (err) return [err];
  const facts: string[] = [];

  if (toolName === 'inspect_scheduling_context') {
    if (typeof rec.periodCount === 'number') {
      facts.push(`${rec.periodCount} period${rec.periodCount === 1 ? '' : 's'} on the grid`);
    }
    const subjects = Array.isArray(rec.subjects) ? rec.subjects : [];
    if (subjects.length) facts.push(`${subjects.length} subjects`);
    const missing = Array.isArray(rec.subjectsWithoutTeachers) ? rec.subjectsWithoutTeachers : [];
    if (missing.length) {
      const names = missing
        .map((s) => (asRecord(s) ? str(asRecord(s)!.name) : undefined))
        .filter(Boolean)
        .slice(0, 4);
      if (names.length) facts.push(`No teacher: ${names.join(', ')}`);
    }
  }

  if (toolName === 'inspect_curriculum_options') {
    facts.push(rec.timetableExists ? 'Timetable exists' : 'No timetable yet');
    if (typeof rec.instructionalWeeks === 'number') {
      facts.push(`${rec.instructionalWeeks} teachable weeks`);
    }
    const gaps = asRecord(rec.gaps);
    const withoutScheme = gaps && Array.isArray(gaps.subjectsOnTimetableWithoutScheme)
      ? gaps.subjectsOnTimetableWithoutScheme.length
      : 0;
    if (withoutScheme) facts.push(`${withoutScheme} grid subject${withoutScheme === 1 ? '' : 's'} without a scheme`);
  }

  if (toolName === 'list_classes') {
    const classes = Array.isArray(rec.classes) ? rec.classes : [];
    const labels = classes
      .map((c) => (asRecord(c) ? str(asRecord(c)!.label) : undefined))
      .filter(Boolean)
      .slice(0, 6);
    if (labels.length) facts.push(labels.join(', '));
  }

  if (toolName === 'apply_pending_plans') {
    const applied = Array.isArray(rec.applied) ? rec.applied : [];
    const labels = applied
      .map((row) => (asRecord(row) ? str(asRecord(row)!.classLabel) : undefined))
      .filter(Boolean);
    if (labels.length) facts.push(labels.join(', '));
    const failed = Array.isArray(rec.failed) ? rec.failed : [];
    for (const row of failed.slice(0, 4)) {
      const recRow = asRecord(row);
      const label = recRow ? str(recRow.classLabel) : undefined;
      const error = recRow ? str(recRow.error) : undefined;
      if (label && error) facts.push(`${label}: ${error}`);
    }
  }

  return facts;
}
