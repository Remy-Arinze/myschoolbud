/** Mirrors the backend `AdminAccessTier` enum. */
export type AdminAccessTier = 'PRINCIPAL' | 'STAFF';

/**
 * The ONLY authority check. Principal-level admins bypass the permission tables.
 *
 * Read the stored tier, never the title. A title is free text a school types, so
 * inferring authority from it meant "Head Teacher" granted everything while
 * "Headteacher" granted nothing.
 */
export function hasPrincipalAccess(
  admin: { accessTier?: AdminAccessTier | string | null } | null | undefined,
): boolean {
  return admin?.accessTier === 'PRINCIPAL';
}

/**
 * Titles that read as principal-level to a human.
 *
 * NOT an authority list — mirrors the backend list for display and for hinting
 * in the Add Admin form. For "can this person do X", use {@link hasPrincipalAccess}.
 *
 * Role naming convention: Use underscores for multi-word roles (e.g., 'school_owner', 'head_teacher')
 */
export const PRINCIPAL_ROLES = [
  'principal',
  'school_principal',
  'head_teacher',
  'headmaster',
  'headmistress',
  'school_owner',
] as const;

export type PrincipalRole = typeof PRINCIPAL_ROLES[number];

/**
 * Does this title read as principal-level? A HINT, not an authority check —
 * use {@link hasPrincipalAccess} for that.
 *
 * Spaces become underscores so "School Owner" matches school_owner, but
 * "Vice Principal" does not match principal, and neither does "Headteacher".
 */
export function isPrincipalRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase().trim().replace(/\s+/g, '_');
  return PRINCIPAL_ROLES.some((principalRole) => normalizedRole === principalRole);
}

/**
 * Check if the role is the registered school account (school owner).
 * Use this when you need to distinguish the school owner from other principal-level roles.
 *
 * @param role - The role string to check (can be null/undefined)
 * @returns true if the role is exactly 'school_owner' (case-insensitive)
 */
export function isSchoolOwnerRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return canonicalizeUniqueTitle(role) === 'school_owner';
}

export function normalizeRoleKey(role: string): string {
  return role.toLowerCase().trim().replace(/\s+/g, '_');
}

/** Canonical unique-seat title. `school_principal` is the same job as `principal`. */
export function canonicalizeUniqueTitle(role: string): string {
  const key = normalizeRoleKey(role);
  if (key === 'school_principal') return 'principal';
  return key;
}

export const UNIQUE_ADMIN_TITLES = [
  'school_owner',
  'principal',
  'head_teacher',
  'headmaster',
  'headmistress',
] as const;

export function uniqueTitleDisplayName(role: string): string {
  switch (canonicalizeUniqueTitle(role)) {
    case 'school_owner':
      return 'School Owner';
    case 'principal':
      return 'Principal';
    case 'head_teacher':
      return 'Head Teacher';
    case 'headmaster':
      return 'Headmaster';
    case 'headmistress':
      return 'Headmistress';
    default:
      return role.trim();
  }
}

/**
 * Titles a human would read as principal-level, spelled any which way.
 *
 * Deliberately fuzzier than {@link isPrincipalRole}: strips every separator, so
 * "Headteacher", "head-teacher" and "Head Teacher" all land together. Used only
 * to prompt ("did you mean to grant full access?") — it must never grant.
 */
const PRINCIPALISH_COMPACT = new Set([
  'principal',
  'schoolprincipal',
  'headteacher',
  'headmaster',
  'headmistress',
  'schoolowner',
  'proprietor',
  'proprietress',
  'hm',
]);

export function looksLikePrincipalTitle(role: string | null | undefined): boolean {
  if (!role) return false;
  return PRINCIPALISH_COMPACT.has(role.toLowerCase().replace(/[^a-z0-9]/g, ''));
}

export function takenUniqueTitleMessage(
  role: string,
  existingRoles: Array<string | null | undefined>,
): string | null {
  const canonical = canonicalizeUniqueTitle(role);
  if (!(UNIQUE_ADMIN_TITLES as readonly string[]).includes(canonical)) {
    return null;
  }
  const taken = existingRoles.some(
    (existing) => existing && canonicalizeUniqueTitle(existing) === canonical,
  );
  if (!taken) return null;
  return `This school already has a ${uniqueTitleDisplayName(role)}.`;
}
