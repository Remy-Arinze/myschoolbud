import { Eye, Edit, Settings, type LucideIcon } from 'lucide-react';
import { PermissionResource, PermissionType } from '@/lib/store/api/schoolAdminApi';

/**
 * One vocabulary for access levels and resources.
 *
 * Before this existed the same three levels were called View/Edit/Full Control
 * in the create picker, View Only/Create & Edit/Full Control in the assignment
 * modal, and Read/Write/Admin on the staff profile — so a school could be told
 * three different things about one grant. Resource labels drifted the same way
 * ("Class Management" in the picker, "Classes" on the profile).
 */

export interface PermissionTypeInfo {
  /** The label, everywhere. */
  label: string;
  /** What it means in terms of what the person can do. */
  description: string;
  icon: LucideIcon;
  /** Text colour when this level is shown or selected. */
  text: string;
  /** Background for chips and selected states. */
  bg: string;
  /** Border for selected states. */
  border: string;
}

/**
 * Levels are colour-coded as well as icon-coded: blue view, green edit, purple
 * full control. The create picker used to render all three in blue, leaving the
 * icon as the only difference between "can look" and "can delete".
 */
export const PERMISSION_TYPE_INFO: Record<PermissionType, PermissionTypeInfo> = {
  [PermissionType.READ]: {
    label: 'View',
    description: 'Can see this screen on their dashboard',
    icon: Eye,
    text: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-500',
  },
  [PermissionType.WRITE]: {
    label: 'Edit',
    description: 'Can add and change things here (includes View)',
    icon: Edit,
    text: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-500',
  },
  [PermissionType.ADMIN]: {
    label: 'Full Control',
    description: 'Can delete and manage everything here (includes Edit and View)',
    icon: Settings,
    text: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-500',
  },
};

/**
 * What granting a resource actually does to the other person's dashboard.
 *
 * Only nine resources put an item in the sidebar. The rest gate actions inside
 * screens the sidebar already shows, or gate nothing a staff-level admin can
 * reach. Ticking one of those and watching the preview not move reads as a
 * broken picker, so every row states which kind it is.
 */
export type ResourceVisibility =
  /** Puts an item in their sidebar. */
  | 'screen'
  /** No sidebar item of its own; controls what they can do inside other screens. */
  | 'inline'
  /** Principal-level only, so granting it to a staff administrator changes nothing. */
  | 'principal';

export interface PermissionResourceInfo {
  /** The name of the screen, matching what the sidebar calls it. */
  label: string;
  description: string;
  /** Emoji, matching how resources are already illustrated in the picker. */
  icon: string;
  visibility: ResourceVisibility;
  /** Said out loud in the picker when the grant does not do the obvious thing. */
  note?: string;
}

export const PERMISSION_RESOURCE_INFO: Record<PermissionResource, PermissionResourceInfo> = {
  OVERVIEW: {
    label: 'Overview',
    description: 'The dashboard home with school-wide numbers.',
    icon: '📊',
    visibility: 'screen',
  },
  ANALYTICS: {
    label: 'Analytics & Reports',
    description: 'Performance analytics and exportable reports.',
    icon: '📈',
    visibility: 'inline',
  },
  SUBSCRIPTIONS: {
    label: 'Subscription & Billing',
    description: 'Plan, invoices, and payment details.',
    icon: '💳',
    visibility: 'principal',
    note: 'Billing is principal-level only. Ticking this will not put it on a staff administrator\u2019s dashboard.',
  },
  STUDENTS: {
    label: 'Students',
    description: 'Student records, profiles, and guardians.',
    icon: '👨‍🎓',
    visibility: 'screen',
  },
  STAFF: {
    label: 'Staff',
    description: 'Teachers, administrators, and their access.',
    icon: '👥',
    visibility: 'screen',
  },
  CLASSES: {
    label: 'Classes',
    description: 'Class structures, arms, and assignments.',
    icon: '🏫',
    visibility: 'screen',
  },
  SUBJECTS: {
    label: 'Subjects',
    description: 'Subjects and which teacher takes them.',
    icon: '📚',
    visibility: 'screen',
  },
  TIMETABLES: {
    label: 'Timetables',
    description: 'Period scheduling and timetable publishing.',
    icon: '📅',
    visibility: 'screen',
  },
  CALENDAR: {
    label: 'Calendar',
    description: 'Term dates, holidays, and calendar events.',
    icon: '🗓️',
    visibility: 'screen',
  },
  ADMISSIONS: {
    label: 'Applications',
    description: 'Admission applications and their decisions.',
    icon: '📝',
    visibility: 'screen',
  },
  SESSIONS: {
    label: 'Sessions & Terms',
    description: 'Academic sessions, terms, and promotions.',
    icon: '🎓',
    visibility: 'inline',
  },
  EVENTS: {
    label: 'Events',
    description: 'School events and announcements.',
    icon: '🎉',
    visibility: 'inline',
  },
  GRADES: {
    label: 'Grades & Assessments',
    description: 'Assessment results and reported grades.',
    icon: '💯',
    visibility: 'inline',
  },
  CURRICULUM: {
    label: 'Academics & Curriculum',
    description: 'Curricula, schemes of work, and lesson planning.',
    icon: '📖',
    visibility: 'inline',
  },
  SCHEME_OF_WORK: {
    label: 'Scheme of Work',
    description: 'Week-by-week teaching plans.',
    icon: '📋',
    visibility: 'inline',
  },
  RESOURCES: {
    label: 'Class Resources',
    description: 'Teaching materials shared with classes.',
    icon: '📁',
    visibility: 'inline',
  },
  TRANSFERS: {
    label: 'Transfers',
    description: 'Students moving in from or out to other schools.',
    icon: '🔄',
    visibility: 'inline',
  },
  INTEGRATIONS: {
    label: 'Integrations',
    description: 'Connections to outside systems.',
    icon: '🔗',
    visibility: 'inline',
    note: 'The marketplace has no sidebar entry yet, so they will need a direct link.',
  },
  SETTINGS: {
    label: 'Settings',
    description: 'School policies, structure, and platform configuration.',
    icon: '⚙️',
    visibility: 'screen',
  },
};

/**
 * The resources a school can grant, in the order the sidebar shows them.
 *
 * SCHEME_OF_WORK is deliberately absent: it is granted as part of CURRICULUM,
 * and listing it separately invites a school to grant lesson planning without
 * the curriculum it hangs off.
 */
export const ALL_PERMISSION_RESOURCES: PermissionResource[] = [
  PermissionResource.OVERVIEW,
  PermissionResource.ANALYTICS,
  PermissionResource.SUBSCRIPTIONS,
  PermissionResource.STUDENTS,
  PermissionResource.STAFF,
  PermissionResource.CLASSES,
  PermissionResource.SUBJECTS,
  PermissionResource.TIMETABLES,
  PermissionResource.CALENDAR,
  PermissionResource.ADMISSIONS,
  PermissionResource.SESSIONS,
  PermissionResource.EVENTS,
  PermissionResource.GRADES,
  PermissionResource.CURRICULUM,
  PermissionResource.RESOURCES,
  PermissionResource.TRANSFERS,
  PermissionResource.INTEGRATIONS,
  PermissionResource.SETTINGS,
];

export const ALL_PERMISSION_TYPES: PermissionType[] = [
  PermissionType.READ,
  PermissionType.WRITE,
  PermissionType.ADMIN,
];

/**
 * Every built-in role grants Overview at view level, and a dashboard with no
 * home screen is not a dashboard. It is pinned above the groups rather than
 * buried as the first of eighteen equal-looking rows.
 */
export const BASELINE_RESOURCE = PermissionResource.OVERVIEW;

export interface PermissionDomain {
  key: string;
  label: string;
  description: string;
  resources: PermissionResource[];
}

/**
 * Eighteen flat rows is where people stop reading, so the picker is chunked the
 * way a school thinks about itself rather than the way the enum is declared.
 * {@link BASELINE_RESOURCE} is deliberately absent — it sits above the groups.
 */
export const PERMISSION_DOMAINS: PermissionDomain[] = [
  {
    key: 'people',
    label: 'People',
    description: 'Who is enrolled, who works here, and who is joining or leaving.',
    resources: [
      PermissionResource.STUDENTS,
      PermissionResource.STAFF,
      PermissionResource.ADMISSIONS,
      PermissionResource.TRANSFERS,
    ],
  },
  {
    key: 'teaching',
    label: 'Teaching & learning',
    description: 'Classes, what is taught in them, and how it is assessed.',
    resources: [
      PermissionResource.CLASSES,
      PermissionResource.SUBJECTS,
      PermissionResource.CURRICULUM,
      PermissionResource.GRADES,
      PermissionResource.RESOURCES,
    ],
  },
  {
    key: 'operations',
    label: 'Running the school',
    description: 'The shape of the school day, term and year.',
    resources: [
      PermissionResource.TIMETABLES,
      PermissionResource.CALENDAR,
      PermissionResource.EVENTS,
      PermissionResource.SESSIONS,
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    description: 'Reporting, configuration and the school account itself.',
    resources: [
      PermissionResource.ANALYTICS,
      PermissionResource.SETTINGS,
      PermissionResource.INTEGRATIONS,
      PermissionResource.SUBSCRIPTIONS,
    ],
  },
];

/**
 * Grants that are worth saying out loud before they are made.
 *
 * Shown only once the level is selected, so the picker stays quiet until there
 * is something to warn about.
 */
export const PERMISSION_CONSEQUENCES: Partial<
  Record<PermissionResource, Partial<Record<PermissionType, string>>>
> = {
  [PermissionResource.STAFF]: {
    [PermissionType.WRITE]: 'Can add staff and edit their profiles.',
    [PermissionType.ADMIN]: 'Can invite and remove colleagues, and change what they can see — including you.',
  },
  [PermissionResource.STUDENTS]: {
    [PermissionType.ADMIN]: 'Can permanently delete student records.',
  },
  [PermissionResource.SETTINGS]: {
    [PermissionType.WRITE]: 'Can change grading policy, term dates and the structure of the school.',
  },
  [PermissionResource.GRADES]: {
    [PermissionType.WRITE]: 'Can enter and change results that appear on report cards.',
  },
};

export function permissionConsequence(
  resource: PermissionResource | string,
  type: PermissionType | string,
): string | undefined {
  return PERMISSION_CONSEQUENCES[resource as PermissionResource]?.[type as PermissionType];
}

/**
 * Access that is usually useless on its own.
 *
 * Suggestions, not dependencies: a school may have a reason to grant grades
 * without the class list, so these are offered and never applied silently. The
 * one true dependency — curriculum needing its scheme of work — is handled in
 * the picker's toggle instead, because splitting those two grants nothing.
 */
export const PERMISSION_COMPANIONS: Array<{
  /** Fires when this grant is present. */
  when: { resource: PermissionResource; type: PermissionType };
  /** And any of these are missing. */
  suggest: Array<{ resource: PermissionResource; type: PermissionType }>;
}> = [
  {
    when: { resource: PermissionResource.GRADES, type: PermissionType.READ },
    suggest: [
      { resource: PermissionResource.CLASSES, type: PermissionType.READ },
      { resource: PermissionResource.STUDENTS, type: PermissionType.READ },
    ],
  },
  {
    when: { resource: PermissionResource.ADMISSIONS, type: PermissionType.WRITE },
    suggest: [{ resource: PermissionResource.STUDENTS, type: PermissionType.READ }],
  },
  {
    when: { resource: PermissionResource.TRANSFERS, type: PermissionType.READ },
    suggest: [{ resource: PermissionResource.STUDENTS, type: PermissionType.READ }],
  },
  {
    when: { resource: PermissionResource.TIMETABLES, type: PermissionType.WRITE },
    suggest: [
      { resource: PermissionResource.CLASSES, type: PermissionType.READ },
      { resource: PermissionResource.SUBJECTS, type: PermissionType.READ },
      { resource: PermissionResource.STAFF, type: PermissionType.READ },
    ],
  },
  {
    when: { resource: PermissionResource.CURRICULUM, type: PermissionType.READ },
    suggest: [{ resource: PermissionResource.SUBJECTS, type: PermissionType.READ }],
  },
  {
    when: { resource: PermissionResource.RESOURCES, type: PermissionType.READ },
    suggest: [{ resource: PermissionResource.CLASSES, type: PermissionType.READ }],
  },
];

/** A resource/level pair in whatever shape the caller happens to hold it. */
export interface PermissionPair {
  resource: string;
  type: string;
}

/** View is implied by Edit, which is implied by Full Control — as at the guard. */
export function grants(held: Set<string>, resource: string, type: string): boolean {
  if (held.has(`${resource}:${type}`)) return true;
  if (type === PermissionType.READ) {
    return (
      held.has(`${resource}:${PermissionType.WRITE}`) ||
      held.has(`${resource}:${PermissionType.ADMIN}`)
    );
  }
  if (type === PermissionType.WRITE) {
    return held.has(`${resource}:${PermissionType.ADMIN}`);
  }
  return false;
}

/**
 * The companion access a selection is missing, de-duplicated and ready to add.
 */
export function missingCompanions(permissions: PermissionPair[]): PermissionPair[] {
  const held = new Set(permissions.map((p) => `${p.resource}:${p.type}`));
  const missing = new Map<string, PermissionPair>();

  PERMISSION_COMPANIONS.forEach(({ when, suggest }) => {
    if (!grants(held, when.resource, when.type)) return;
    suggest.forEach((pair) => {
      if (grants(held, pair.resource, pair.type)) return;
      missing.set(`${pair.resource}:${pair.type}`, pair);
    });
  });

  return Array.from(missing.values());
}

/**
 * Granted resources that will not show up as a sidebar item.
 *
 * The preview lists the nav it is building, which silently ignores over half
 * the picker. These are the grants that still do something — inside other
 * screens — and they are named so that every tick visibly changes something.
 */
export function inlineGrants(permissions: PermissionPair[]): PermissionResource[] {
  const held = new Set(permissions.map((p) => `${p.resource}:${p.type}`));
  return ALL_PERMISSION_RESOURCES.filter((resource) => {
    const info = PERMISSION_RESOURCE_INFO[resource];
    if (!info || info.visibility !== 'inline') return false;
    return grants(held, resource, PermissionType.READ);
  });
}

/** Granted resources that do nothing at all for a staff-level administrator. */
export function inertGrants(permissions: PermissionPair[]): PermissionResource[] {
  const held = new Set(permissions.map((p) => `${p.resource}:${p.type}`));
  return ALL_PERMISSION_RESOURCES.filter((resource) => {
    const info = PERMISSION_RESOURCE_INFO[resource];
    if (!info || info.visibility !== 'principal') return false;
    return grants(held, resource, PermissionType.READ);
  });
}

/** The screen's name, for sentences like "You need Students (view) access". */
export function resourceLabel(resource: PermissionResource | string): string {
  return PERMISSION_RESOURCE_INFO[resource as PermissionResource]?.label ?? String(resource);
}

/** The level's name, lowercased for use inside a sentence. */
export function typeLabel(type: PermissionType | string): string {
  return PERMISSION_TYPE_INFO[type as PermissionType]?.label ?? String(type);
}
