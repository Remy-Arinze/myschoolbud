'use client';

import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  useGetStaffListQuery,
  useAssignTeacherToClassMutation,
  useGetClassesQuery,
  StaffListItem,
} from '@/lib/store/api/schoolAdminApi';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Loader2, Search, User, CheckCircle } from 'lucide-react';

interface AssignTeacherToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classId: string;
  className: string;
  schoolType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY';
  existingTeachers: Array<{ teacherId: string; subject: string | null; isPrimary: boolean }>;
  onSuccess?: () => void;
}

export function AssignTeacherToClassModal({
  isOpen,
  onClose,
  schoolId,
  classId,
  className,
  schoolType,
  existingTeachers,
  onSuccess,
}: AssignTeacherToClassModalProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<StaffListItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch teachers
  const staffSearch = searchQuery.trim().split(/\s+/)[0] || undefined;
  const { data: staffResponse, isLoading: isLoadingStaff } = useGetStaffListQuery(
    { schoolType, search: staffSearch, limit: 100 },
    { skip: !isOpen }
  );

  // Fetch all PRIMARY classes to get already-assigned teachers (only for PRIMARY schools)
  const { data: allClassesResponse, isLoading: isLoadingClasses } = useGetClassesQuery(
    { schoolId, type: 'PRIMARY' },
    { skip: !isOpen || schoolType !== 'PRIMARY' }
  );

  const [assignTeacher, { isLoading: isAssigning }] = useAssignTeacherToClassMutation();

  // Filter to only show teachers
  const teachers = useMemo(() => {
    const allStaff: StaffListItem[] = staffResponse?.data?.items || [];
    return allStaff.filter((s: StaffListItem) => s.type === 'teacher');
  }, [staffResponse]);

  // Get teacher IDs who are already assigned as form teachers in OTHER PRIMARY classes
  const teachersAssignedToOtherClasses = useMemo(() => {
    if (schoolType !== 'PRIMARY' || !allClassesResponse?.data) return new Set<string>();
    
    const assignedIds = new Set<string>();
    allClassesResponse.data.forEach((cls) => {
      if (cls.id === classId) return;
      cls.teachers?.forEach((teacher) => {
        if (teacher.isPrimary) {
          assignedIds.add(teacher.teacherId);
        }
      });
    });
    
    return assignedIds;
  }, [schoolType, allClassesResponse, classId]);

  // Filter teachers by search and matching schoolType
  const filteredTeachers = useMemo(() => {
    let result = teachers;

    // Filter by school type (double check on frontend)
    result = result.filter((t: StaffListItem) => t.schoolType === schoolType || !t.schoolType);

    // For PRIMARY schools, exclude teachers who are already form teachers in other classes
    if (schoolType === 'PRIMARY') {
      result = result.filter((t: StaffListItem) => !teachersAssignedToOtherClasses.has(t.id));
    }

    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
      result = result.filter((t: StaffListItem) => {
        const haystack = `${t.firstName} ${t.lastName} ${t.email || ''}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      });
    }

    return result;
  }, [teachers, searchQuery, schoolType, teachersAssignedToOtherClasses]);

  // Check if teacher is already assigned as a lead in this same class
  const isTeacherAlreadyFormTeacher = useMemo(() => {
    if (!selectedTeacher) return false;
    return existingTeachers.some(
      (t) => t.teacherId === selectedTeacher.id && t.isPrimary
    );
  }, [selectedTeacher, existingTeachers]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTeacher(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelectTeacher = (teacher: StaffListItem) => {
    setSelectedTeacher(teacher);
  };

  const handleAssign = async () => {
    if (!selectedTeacher) return;

    try {
      await assignTeacher({
        schoolId,
        classId,
        assignment: {
          teacherId: selectedTeacher.id,
          isPrimary: true, // Assigning as the main Form/Primary teacher
          subject: undefined
        },
      }).unwrap();

      toast.success(`${selectedTeacher.firstName} ${selectedTeacher.lastName} assigned to ${className}`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign teacher');
    }
  };

  const canAssign = useMemo(() => {
    if (!selectedTeacher) return false;
    if (isTeacherAlreadyFormTeacher) return false;
    return true;
  }, [selectedTeacher, isTeacherAlreadyFormTeacher]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schoolType === 'PRIMARY' ? 'Assign class teacher' : 'Assign form teacher'}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-heading text-[length:var(--text-body)] text-light-text-primary dark:text-dark-text-primary">
            {selectedTeacher
              ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
              : 'Select a teacher'}
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={handleAssign}
            disabled={!canAssign || isAssigning}
            className="h-9 shrink-0 px-4"
          >
            {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="font-heading text-[length:var(--text-body)] text-light-text-secondary dark:text-dark-text-secondary">
          Choose the {schoolType === 'PRIMARY' ? 'class' : 'form'} teacher for {className}.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-text-muted dark:text-dark-text-muted" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-light-border bg-light-bg py-2 pl-9 pr-3 font-heading text-[length:var(--text-body)] text-light-text-primary focus:border-[#2490FD] focus:outline-none dark:border-dark-border dark:bg-dark-bg dark:text-dark-text-primary"
          />
        </div>
        <p className="font-heading text-[length:var(--text-small)] text-light-text-muted dark:text-dark-text-muted">
          Select {schoolType === 'PRIMARY' ? 'primary' : 'form'} teacher
        </p>
        <div className="max-h-[360px] space-y-1 overflow-y-auto scrollbar-hide">
          {(isLoadingStaff || (schoolType === 'PRIMARY' && isLoadingClasses)) ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#2490FD]" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-light-border py-8 text-center dark:border-dark-border">
              <User className="mx-auto mb-2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
              <p className="font-heading text-[length:var(--text-body)] text-light-text-secondary dark:text-dark-text-secondary">
                No matching teachers found
              </p>
            </div>
          ) : (
            filteredTeachers.map((teacher) => {
              const isSelected = selectedTeacher?.id === teacher.id;
              const isAssignedToThisClass = existingTeachers.some(
                (t) => t.teacherId === teacher.id && t.isPrimary
              );
              return (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => handleSelectTeacher(teacher)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    isSelected
                      ? 'border-[#2490FD] bg-[#2490FD]/10'
                      : 'border-light-border bg-light-card hover:bg-light-surface dark:border-dark-border dark:bg-dark-card dark:hover:bg-dark-surface'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-heading text-[length:var(--text-body)] font-medium text-light-text-primary dark:text-dark-text-primary">
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    <span className="block truncate font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                      {teacher.subject || 'No subject listed'}
                    </span>
                  </span>
                  {isAssignedToThisClass && (
                    <span className="inline-flex shrink-0 items-center gap-1 font-heading text-[length:var(--text-small)] text-light-text-secondary dark:text-dark-text-secondary">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Already form teacher
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {isTeacherAlreadyFormTeacher && (
          <p className="font-heading text-[length:var(--text-small)] text-red-600 dark:text-red-400">
            This teacher already leads {className}.
          </p>
        )}
      </div>
    </Modal>
  );
}
