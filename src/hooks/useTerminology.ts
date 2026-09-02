'use client';

import { useMemo } from 'react';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { getTerminology, type Terminology } from '@/lib/utils/terminology';

export function useTerminology(): Terminology {
  const { currentType } = useSchoolType();
  const { policies } = useRuntimePolicies();

  return useMemo(
    () => getTerminology(currentType, policies.terminologyOverrides),
    [currentType, policies.terminologyOverrides],
  );
}
