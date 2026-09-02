'use client';

import { useEffect } from 'react';
import { LoisPageContext, useLoisWorkspaceOptional } from './LoisWorkspace';

/** Binds the current dashboard page as Lois screen focus (school admin). */
export function LoisFocus({ context }: { context: LoisPageContext | null }) {
  const workspace = useLoisWorkspaceOptional();

  useEffect(() => {
    if (!workspace) return;
    workspace.setFocus(context);
    return () => workspace.setFocus(null);
  }, [
    workspace,
    context?.type,
    context?.schoolId,
    context?.studentId,
    context?.classId,
    context?.classArmId,
    context?.teacherId,
    context?.schemeId,
    context?.label,
    context?.weekNumber,
  ]);

  return null;
}
