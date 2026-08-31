export type TermEditFocus = 'dates' | 'halfTerm' | 'midterm' | 'exam';

export const getSchoolTypeLabel = (type: string) => {
  switch (type) {
    case 'PRIMARY':
      return 'Primary School';
    case 'SECONDARY':
      return 'Secondary School';
    case 'TERTIARY':
      return 'University/Polytechnic';
    default:
      return type;
  }
};

export const getTermLabel = (schoolType?: string | null) =>
  schoolType === 'TERTIARY' ? 'Semester' : 'Term';

export function formatShortDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRange(start?: string | null, end?: string | null) {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  if (startLabel && endLabel) return `${startLabel} — ${endLabel}`;
  if (startLabel) return `${startLabel} — …`;
  if (endLabel) return `… — ${endLabel}`;
  return null;
}

export function parseTermEditFocus(value: string | null): TermEditFocus {
  if (value === 'midterm') return 'midterm';
  if (value === 'exam') return 'exam';
  if (value === 'halfTerm') return 'halfTerm';
  return 'dates';
}
