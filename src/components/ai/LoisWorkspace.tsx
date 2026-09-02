'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type LoisPageContext = {
  type: 'school' | 'student' | 'class' | 'scheme' | 'timetable' | 'staff' | 'assessment' | 'generic';
  schoolId: string;
  studentId?: string;
  classId?: string;
  classArmId?: string;
  teacherId?: string;
  schemeId?: string;
  assessmentId?: string;
  weekNumber?: number;
  label: string;
  path?: string;
};

export type LoisSource = {
  kind: 'tool' | 'rag';
  tool?: string;
  type?: string;
  label: string;
  href?: string;
  relevance?: number;
};

type LoisWorkspaceValue = {
  focus: LoisPageContext | null;
  setFocus: (ctx: LoisPageContext | null) => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  seedPrompt: string | null;
  consumeSeedPrompt: () => string | null;
  askLois: (prompt?: string) => void;
};

const LoisWorkspaceContext = createContext<LoisWorkspaceValue | null>(null);

export function LoisWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [focus, setFocus] = useState<LoisPageContext | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);

  const consumeSeedPrompt = useCallback(() => {
    const next = seedPrompt;
    setSeedPrompt(null);
    return next;
  }, [seedPrompt]);

  const askLois = useCallback((prompt?: string) => {
    if (prompt) setSeedPrompt(prompt);
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ focus, setFocus, isOpen, setOpen, seedPrompt, consumeSeedPrompt, askLois }),
    [focus, isOpen, seedPrompt, consumeSeedPrompt, askLois],
  );

  return <LoisWorkspaceContext.Provider value={value}>{children}</LoisWorkspaceContext.Provider>;
}

export function useLoisWorkspace() {
  const ctx = useContext(LoisWorkspaceContext);
  if (!ctx) {
    throw new Error('useLoisWorkspace must be used within LoisWorkspaceProvider');
  }
  return ctx;
}

export function useLoisWorkspaceOptional() {
  return useContext(LoisWorkspaceContext);
}
