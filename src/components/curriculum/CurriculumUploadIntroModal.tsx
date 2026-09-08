'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

const HIDE_INTRO_KEY = 'agora_curriculum_upload_hide_intro';

export function isCurriculumUploadIntroHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HIDE_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setCurriculumUploadIntroHidden(hidden: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (hidden) localStorage.setItem(HIDE_INTRO_KEY, '1');
    else localStorage.removeItem(HIDE_INTRO_KEY);
  } catch {
    // ignore quota / private mode
  }
}

const STEPS = [
  {
    title: 'One subject, real text',
    body: 'Keep one subject per file. Use selectable text — not a scan or screenshot. PDF or Word works best.',
  },
  {
    title: 'Label the grade clearly',
    body: 'Use headings exactly like JSS 1, SS 2, or Primary 3. Several grades in one file are fine if each grade has its own heading.',
  },
  {
    title: 'Weeks as a teaching order',
    body: 'Number weeks in order. For each week include Subtopics, Learning outcomes, and a short Student-friendly line. Add Activities, Resources, and Assessment when you can.',
  },
  {
    title: 'Name revision and exam weeks',
    body: 'Put Revision or Examination in those week titles so they can be pinned. The calendar assigns dates; week numbers are only a teaching order.',
  },
];

interface CurriculumUploadIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CurriculumUploadIntroModal({ isOpen, onClose }: CurriculumUploadIntroModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) setDontShowAgain(isCurriculumUploadIntroHidden());
  }, [isOpen]);

  const handleClose = () => {
    setCurriculumUploadIntroHidden(dontShowAgain);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="How to upload a curriculum"
      size="md"
      elevated
    >
      <div className="space-y-5">
        <p className="text-light-text-secondary dark:text-dark-text-secondary leading-relaxed" style={{ fontSize: 'var(--text-body)' }}>
          Upload a PDF or Word file with selectable text. A clear structure helps Lois turn it into a week-by-week scheme for this subject.
        </p>

        <ol className="space-y-3.5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="mt-0.5 shrink-0 tabular-nums text-light-text-muted dark:text-dark-text-muted"
                style={{ fontSize: 'var(--text-tiny)' }}
              >
                {i + 1}.
              </span>
              <div className="min-w-0">
                <p className="font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                  {step.title}
                </p>
                <p className="mt-0.5 text-light-text-secondary dark:text-dark-text-secondary leading-relaxed" style={{ fontSize: 'var(--text-small)' }}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-lg border border-light-border dark:border-dark-border bg-light-surface/60 dark:bg-dark-surface/40 px-3.5 py-3">
          <p className="text-light-text-muted dark:text-dark-text-muted mb-2 uppercase tracking-wide" style={{ fontSize: 'var(--text-tiny)' }}>
            Example
          </p>
          <pre className="text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap font-mono leading-relaxed" style={{ fontSize: 'var(--text-tiny)' }}>
{`# Grade: JSS 1
## Term: 1
### Week 1 — Whole numbers 1 to 20
Subtopics: Counting objects; Number names
Learning outcomes: Count objects up to 20
Student-friendly: I can count to 20 and write the numbers`}
          </pre>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary cursor-pointer select-none" style={{ fontSize: 'var(--text-small)' }}>
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            Don&apos;t show this again
          </label>
          <Button variant="primary" onClick={handleClose}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}
