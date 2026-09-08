export type LevelStream = 'JUNIOR' | 'SENIOR' | 'ALL';

const JUNIOR_SECONDARY_CODES = new Set([
  'BSC', 'SST', 'CCA', 'PHE', 'BTC', 'NLG', 'RKS', 'HOM',
]);

const SENIOR_SECONDARY_CODES = new Set([
  'PHY', 'CHM', 'BIO', 'LIT', 'GEO', 'HIS', 'ECO', 'GOV',
  'FMT', 'ACC', 'COM', 'TDR', 'FNT',
]);

export function inferLevelStream(opts: {
  levelStream?: string | null;
  classLevelCode?: string | null;
  classLevelName?: string | null;
  code?: string | null;
}): LevelStream {
  const stored = (opts.levelStream || '').toUpperCase();
  if (stored === 'JUNIOR' || stored === 'SENIOR' || stored === 'ALL') {
    return stored;
  }

  const fromClass = streamFromClassLevel({
    code: opts.classLevelCode,
    name: opts.classLevelName,
  });
  if (fromClass) return fromClass;

  const subjectCode = (opts.code || '').toUpperCase();
  if (JUNIOR_SECONDARY_CODES.has(subjectCode)) return 'JUNIOR';
  if (SENIOR_SECONDARY_CODES.has(subjectCode)) return 'SENIOR';
  return 'ALL';
}

export function subjectOfferedInStream(subjectStream: LevelStream, target: LevelStream): boolean {
  if (target === 'ALL' || subjectStream === 'ALL') return true;
  return subjectStream === target;
}

export function streamFromClassLevelCode(code?: string | null): LevelStream | null {
  const c = (code || '').toUpperCase();
  if (c.startsWith('JSS')) return 'JUNIOR';
  if (c.startsWith('SS') && !c.startsWith('JSS')) return 'SENIOR';
  return null;
}

export function streamFromClassLevel(opts: {
  code?: string | null;
  name?: string | null;
}): LevelStream | null {
  const fromCode = streamFromClassLevelCode(opts.code);
  if (fromCode) return fromCode;

  const name = (opts.name || '').toUpperCase();
  if (!name) return null;
  if (name.includes('JSS') || name.includes('JUNIOR')) return 'JUNIOR';
  if (/(^|\s)SS\s*[1-3]/.test(name) || name.includes('SENIOR')) return 'SENIOR';
  return null;
}

export function streamFromAgoraLevelStreams(streams?: string[] | null): LevelStream | null {
  if (!streams?.length) return null;
  const upper = streams.map((s) => s.toUpperCase());
  const hasJunior = upper.includes('JUNIOR');
  const hasSenior = upper.includes('SENIOR');
  if (hasJunior && hasSenior) return 'ALL';
  if (hasJunior) return 'JUNIOR';
  if (hasSenior) return 'SENIOR';
  return null;
}

export function resolveSchoolSubjectStream(opts: {
  agoraLevelStreams?: string[] | null;
  levelStream?: string | null;
  classLevelCode?: string | null;
  classLevelName?: string | null;
  code?: string | null;
}): LevelStream {
  const fromCatalog = streamFromAgoraLevelStreams(opts.agoraLevelStreams);
  if (fromCatalog) return fromCatalog;
  return inferLevelStream(opts);
}

export function subjectStreamFromSchoolSubject(subject: {
  agoraLevelStreams?: string[] | null;
  levelStream?: string | null;
  classLevelName?: string | null;
  classLevel?: { name?: string } | null;
  code?: string | null;
}): LevelStream {
  return resolveSchoolSubjectStream({
    agoraLevelStreams: subject.agoraLevelStreams,
    levelStream: subject.levelStream,
    classLevelName: subject.classLevelName || subject.classLevel?.name,
    code: subject.code,
  });
}

export function streamChipLabel(stream: LevelStream): 'JSS' | 'SS' | null {
  if (stream === 'JUNIOR') return 'JSS';
  if (stream === 'SENIOR') return 'SS';
  return null;
}

export type StreamMismatchWarning = {
  title: string;
  message: string;
  confirmText: string;
};

export function buildStreamMismatchWarning(opts: {
  subjectName: string;
  subjectStream: LevelStream;
  classLevelName: string;
  classStream: LevelStream;
}): StreamMismatchWarning | null {
  if (subjectOfferedInStream(opts.subjectStream, opts.classStream)) return null;
  if (opts.subjectStream === 'ALL' || opts.classStream === 'ALL') return null;

  const subjectList = opts.subjectStream === 'JUNIOR' ? 'junior secondary' : 'senior secondary';
  const subjectTag = opts.subjectStream === 'JUNIOR' ? 'JSS' : 'SS';
  const classList = opts.classStream === 'JUNIOR' ? 'junior secondary' : 'senior secondary';

  return {
    title: 'This subject is not usually taught here',
    message: `${opts.subjectName} is a ${subjectList} (${subjectTag}) subject. ${opts.classLevelName} follows the ${classList} list, so it is not normally on this timetable. Add it anyway if this class is an exception.`,
    confirmText: `Add ${opts.subjectName} anyway`,
  };
}
