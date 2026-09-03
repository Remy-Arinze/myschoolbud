import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { useAutoGenerateSubjectsMutation } from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from './useSchoolType';
import toast from 'react-hot-toast';

interface AutoGenerateResult {
  created: number;
  skipped: number;
}

interface UseAutoGenerateSubjectsReturn {
  isGenerating: boolean;
  showConfirmModal: boolean;
  openConfirmModal: () => void;
  closeConfirmModal: () => void;
  handleAutoGenerate: (agoraSubjectIds: string[]) => Promise<void>;
  canAutoGenerate: boolean;
  schoolTypeLabel: string;
}

/**
 * Hook to manage auto-generation of standard subjects
 * Separates business logic from UI
 */
export function useAutoGenerateSubjects(): UseAutoGenerateSubjectsReturn {
  const user = useSelector((state: RootState) => state.auth.user);
  const { currentType } = useSchoolType();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [autoGenerateMutation, { isLoading: isGenerating }] = useAutoGenerateSubjectsMutation();

  const canAutoGenerate = currentType === 'PRIMARY' || currentType === 'SECONDARY';
  
  const schoolTypeLabel = currentType === 'PRIMARY' ? 'Primary School' : 
                          currentType === 'SECONDARY' ? 'Secondary School' : 
                          currentType || 'School';

  const openConfirmModal = useCallback(() => {
    if (!canAutoGenerate) {
      toast.error('Auto-generate is only available for Primary and Secondary schools');
      return;
    }
    setShowConfirmModal(true);
  }, [canAutoGenerate]);

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleAutoGenerate = useCallback(async (agoraSubjectIds: string[]) => {
    if (!user?.schoolId || !currentType || !canAutoGenerate) {
      toast.error('Unable to generate subjects. Please try again.');
      return;
    }
    if (!agoraSubjectIds.length) {
      toast.error('Select at least one subject to generate.');
      return;
    }

    try {
      const result = await autoGenerateMutation({
        schoolId: user.schoolId,
        schoolType: currentType as 'PRIMARY' | 'SECONDARY',
        agoraSubjectIds,
      }).unwrap();

      const data = result.data as AutoGenerateResult;
      
      if (data.created > 0) {
        toast.success(`Created ${data.created} subjects${data.skipped > 0 ? `, ${data.skipped} already existed` : ''}`);
      } else if (data.skipped > 0) {
        toast.success(`All ${data.skipped} standard subjects already exist`);
      } else {
        toast.success('No subjects to generate');
      }
      
      setShowConfirmModal(false);
    } catch (error: any) {
      console.error('Failed to auto-generate subjects:', error);
      toast.error(error?.data?.message || 'Failed to generate subjects. Please try again.');
    }
  }, [user?.schoolId, currentType, canAutoGenerate, autoGenerateMutation]);

  return {
    isGenerating,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleAutoGenerate,
    canAutoGenerate,
    schoolTypeLabel,
  };
}
