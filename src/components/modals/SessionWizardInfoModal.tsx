'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Info, BookOpen, Calendar, Users, GraduationCap } from 'lucide-react';
import type { SchoolType } from '@/lib/store/api/schoolAdminApi';
import { getPromotionExamples } from '@/lib/utils/terminology';

const HIDE_INTRO_KEY = 'agora_session_wizard_hide_intro';

export function isSessionWizardIntroHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(HIDE_INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionWizardIntroHidden(hidden: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (hidden) localStorage.setItem(HIDE_INTRO_KEY, '1');
    else localStorage.removeItem(HIDE_INTRO_KEY);
  } catch {
    // ignore quota / private mode
  }
}

interface SessionWizardInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolType?: SchoolType | null;
}

export function SessionWizardInfoModal({ isOpen, onClose, schoolType = null }: SessionWizardInfoModalProps) {
  const promotionExamples = getPromotionExamples(schoolType);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (isOpen) setDontShowAgain(isSessionWizardIntroHidden());
  }, [isOpen]);

  const handleClose = () => {
    setSessionWizardIntroHidden(dontShowAgain);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Welcome to the Session Wizard"
      size="lg"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
              What is the Session Wizard?
            </h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              The Session Wizard helps you transition your school from &quot;Holiday&quot; to &quot;Active Term&quot; by managing academic sessions and terms. 
              This is the operational heartbeat of your school system.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                New Session (September)
              </h4>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Start a new academic year. This will <strong>promote students</strong> to the next level
                (e.g., {promotionExamples.levelTransition}). {promotionExamples.finalYearLabel === 'final-year'
                  ? 'Final year students will be marked as ALUMNI.'
                  : `${promotionExamples.finalYearLabel} students will be marked as ALUMNI.`}{' '}
                A session must span at least 10 months.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                New Term (January/April)
              </h4>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Start a new term within the current academic year. You can choose to <strong>carry over</strong> students 
                (keep them in the same ClassArm) or <strong>promote</strong> them to the next level.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                Student Migration
              </h4>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                The wizard automatically handles student enrollment migration based on your choice. 
                You can only have <strong>one active session</strong> at a time.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                Important Notes:
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>An academic session must span at least 10 months (approximately one year)</li>
                <li>Only one session can be active at a time</li>
                <li>When you start a new session, the previous one is automatically completed</li>
                <li>Student migration happens automatically based on your selection</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
          <label className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary cursor-pointer select-none">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(!!checked)}
            />
            Don&apos;t show this again
          </label>
          <Button variant="primary" onClick={handleClose}>
            Got it, let&apos;s start
          </Button>
        </div>
      </div>
    </Modal>
  );
}

