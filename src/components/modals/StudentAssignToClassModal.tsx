'use client';

import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  useGetStudentsQuery,
  useReassignStudentMutation,
  StudentWithEnrollment,
} from '@/lib/store/api/schoolAdminApi';
import { useCurrentAdminPermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import { Loader2, Search, User, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentAssignToClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  targetClassId: string;
  targetClassArmId: string;
  targetClassName: string;
  targetLevelName: string;
  academicYear: string;
}

export function StudentAssignToClassModal({
  isOpen,
  onClose,
  schoolId,
  targetClassId,
  targetClassArmId,
  targetClassName,
  targetLevelName,
  academicYear,
}: StudentAssignToClassModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentWithEnrollment | null>(null);
  const { isPrincipal } = useCurrentAdminPermissions();
  const [reassignStudent, { isLoading: isAssigning }] = useReassignStudentMutation();

  // Fetch students based on search
  const { data: studentsResponse, isLoading: isLoadingStudents } = useGetStudentsQuery(
    { 
      schoolId, 
      search: searchQuery,
      limit: 20 // Limit for selection list
    },
    { skip: !isOpen }
  );

  const students = useMemo(() => studentsResponse?.data?.items || [], [studentsResponse]);

  // Filter out students who are already in the target class arm
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.enrollment?.classArmId !== targetClassArmId);
  }, [students, targetClassArmId]);

  const isLevelChange = !!selectedStudent && selectedStudent.enrollment?.classLevel !== targetLevelName;
  const isRestricted = isLevelChange && !isPrincipal;

  const handleAssign = async () => {
    if (!selectedStudent) return;

    if (isRestricted) {
      toast.error('Cross-level reassignment requires principal approval.');
      return;
    }

    try {
      await reassignStudent({
        schoolId,
        studentId: selectedStudent.id,
        reassign: {
          targetClassLevel: targetLevelName,
          academicYear: academicYear,
          targetClassId,
          targetClassArmId,
          reason: `Assigned via Class Detail page for ${targetClassName}`,
        },
      }).unwrap();

      toast.success(`${selectedStudent.firstName} reassigned to ${targetClassName}`);
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign student');
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedStudent(null);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedStudent ? 'Confirm Assignment' : 'Select Student to Assign'}
      size="lg"
    >
      <div className="space-y-6">
        {!selectedStudent ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
              <input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-bg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Student List */}
            <div className="max-h-[400px] overflow-y-auto scrollbar-hide space-y-2">
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    {searchQuery ? 'No eligible students found matching your search' : 'Start typing to find students...'}
                  </p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="p-4 border border-light-border dark:border-dark-border rounded-lg cursor-pointer hover:bg-light-surface dark:hover:bg-dark-bg transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold overflow-hidden">
                          {student.profileImage ? (
                            <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{student.firstName[0]}{student.lastName[0]}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Current Class: <span className="font-medium">{student.enrollment?.classLevel || 'Unassigned'}</span> {student.enrollment?.classArmName && `(${student.enrollment.classArmName})`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-light-text-muted dark:text-dark-text-muted">{student.uid}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">Assigning Student</p>
                    <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="text-blue-600">
                    Change
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-light-surface dark:bg-dark-surface rounded-lg border border-light-border dark:border-dark-border text-center">
                  <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted uppercase mb-1">Current Level</p>
                  <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{selectedStudent.enrollment?.classLevel || 'None'}</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/30 text-center">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase mb-1">Target Level</p>
                  <p className="font-medium text-blue-800 dark:text-blue-300">{targetLevelName}</p>
                </div>
              </div>

              {/* Sensitivity Info */}
              {isLevelChange && (
                <div className={cn(
                  "p-4 rounded-xl border flex gap-3",
                  isRestricted 
                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30"
                    : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
                )}>
                  {isRestricted ? (
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className={cn(
                      "text-sm font-semibold",
                      isRestricted ? "text-red-900 dark:text-red-300" : "text-amber-900 dark:text-amber-300"
                    )}>
                      {isRestricted ? "Approval Required" : "Cross-Level Reassignment"}
                    </p>
                    <p className={cn(
                      "text-xs leading-relaxed",
                      isRestricted ? "text-red-800 dark:text-red-400/80" : "text-amber-800 dark:text-amber-400/80"
                    )}>
                      {isRestricted 
                        ? "Moving a student to a higher grade level requires Principal-level oversight."
                        : "You are assigning this student to a different grade level. This action will be audited."
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onClose} disabled={isAssigning}>Cancel</Button>
                <Button 
                  variant="primary" 
                  onClick={handleAssign}
                  disabled={isAssigning || isRestricted}
                  className="gap-2"
                >
                  {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {isRestricted ? 'Principal Approval Needed' : `Assign to ${targetClassName}`}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
