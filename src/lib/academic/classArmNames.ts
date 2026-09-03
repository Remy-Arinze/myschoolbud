const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const MAX_CLASS_ARMS = 8;

/** Build default arm names (A, B, C…) padded from school settings when present. */
export function buildDefaultArmNames(count: number, preferred?: string[]): string[] {
  const n = Math.min(Math.max(Math.round(count) || 1, 1), MAX_CLASS_ARMS);
  const fromSettings = (preferred ?? []).map((s) => s.trim()).filter(Boolean);
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    const candidate = fromSettings[i] || LETTERS[i] || `Arm ${i + 1}`;
    names.push(candidate);
  }
  return names;
}

export function resizeArmNames(names: string[], count: number, preferred?: string[]): string[] {
  const defaults = buildDefaultArmNames(count, preferred);
  const next = names.slice(0, count);
  while (next.length < count) {
    next.push(defaults[next.length] || '');
  }
  return next;
}
