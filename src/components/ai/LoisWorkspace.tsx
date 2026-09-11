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
  insightId?: string;
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
  hide: () => void;
  close: () => void;
  seedPrompt: string | null;
  consumeSeedPrompt: () => string | null;
  askLois: (prompt?: string) => void;
  briefingOpen: boolean;
  briefingInsightId: string | null;
  openBriefing: (insightId?: string) => void;
  clearBriefing: () => void;
};

const LoisWorkspaceContext = createContext<LoisWorkspaceValue | null>(null);

export function LoisWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [focus, setFocus] = useState<LoisPageContext | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingInsightId, setBriefingInsightId] = useState<string | null>(null);

  const hide = useCallback(() => {
    setIsOpen(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setBriefingOpen(false);
    setBriefingInsightId(null);
    setSeedPrompt(null);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    if (open) setIsOpen(true);
    else hide();
  }, [hide]);

  const consumeSeedPrompt = useCallback(() => {
    const next = seedPrompt;
    setSeedPrompt(null);
    return next;
  }, [seedPrompt]);

  const askLois = useCallback((prompt?: string) => {
    if (prompt) setSeedPrompt(prompt);
    setIsOpen(true);
  }, []);

  const openBriefing = useCallback((insightId?: string) => {
    setBriefingOpen(true);
    setBriefingInsightId(insightId ?? null);
    setIsOpen(true);
  }, []);

  const clearBriefing = useCallback(() => {
    setBriefingOpen(false);
    setBriefingInsightId(null);
  }, []);

  const value = useMemo(
    () => ({
      focus,
      setFocus,
      isOpen,
      setOpen,
      hide,
      close,
      seedPrompt,
      consumeSeedPrompt,
      askLois,
      briefingOpen,
      briefingInsightId,
      openBriefing,
      clearBriefing,
    }),
    [focus, isOpen, setOpen, hide, close, seedPrompt, consumeSeedPrompt, askLois, briefingOpen, briefingInsightId, openBriefing, clearBriefing],
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
