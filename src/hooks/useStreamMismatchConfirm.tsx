'use client';

import { useCallback, useState } from 'react';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  buildStreamMismatchWarning,
  streamFromClassLevel,
  subjectOfferedInStream,
  subjectStreamFromSchoolSubject,
  type LevelStream,
  type StreamMismatchWarning,
} from '@/lib/utils/subject-level-stream';

type SchoolSubjectLike = {
  id?: string;
  name: string;
  code?: string | null;
  agoraLevelStreams?: string[] | null;
  levelStream?: string | null;
  classLevelName?: string | null;
  classLevel?: { name?: string } | null;
};

export function useStreamMismatchConfirm(opts: {
  classStream: LevelStream | null;
  classLevelName: string;
}) {
  const [pending, setPending] = useState<{
    warning: StreamMismatchWarning;
    onConfirm: () => void;
  } | null>(null);

  const confirmIfNeeded = useCallback(
    (subject: SchoolSubjectLike | undefined, onConfirm: () => void) => {
      if (!subject || !opts.classStream) {
        onConfirm();
        return;
      }
      const subjectStream = subjectStreamFromSchoolSubject(subject);
      if (subjectOfferedInStream(subjectStream, opts.classStream)) {
        onConfirm();
        return;
      }
      const warning = buildStreamMismatchWarning({
        subjectName: subject.name,
        subjectStream,
        classLevelName: opts.classLevelName,
        classStream: opts.classStream,
      });
      if (!warning) {
        onConfirm();
        return;
      }
      setPending({ warning, onConfirm });
    },
    [opts.classLevelName, opts.classStream],
  );

  const mismatchModal = (
    <ConfirmModal
      isOpen={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => {
        pending?.onConfirm();
      }}
      title={pending?.warning.title ?? ''}
      message={pending?.warning.message ?? ''}
      confirmText={pending?.warning.confirmText ?? 'Add anyway'}
      cancelText="Cancel"
      variant="warning"
    />
  );

  return { confirmIfNeeded, mismatchModal };
}

export function classStreamFromClass(cls?: {
  classLevel?: string | null;
  name?: string | null;
} | null): LevelStream | null {
  if (!cls) return null;
  return streamFromClassLevel({ name: cls.classLevel || cls.name });
}
