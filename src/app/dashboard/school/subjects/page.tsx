'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SearchInput } from '@/components/ui/SearchInput';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Users,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Save,
  Grid3x3,
  List,
  Check,
  CheckSquare,
  Square,
  MinusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AutoGenerateButton } from '@/components/ui/AutoGenerateButton';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { Combobox } from '@/components/ui/Combobox';
import { useDebounce } from '@/hooks/useDebounce';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Library, Info, HelpCircle } from 'lucide-react';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import {
  useGetMySchoolQuery,
  useGetSubjectsQuery,
  useGetClassLevelsQuery,
  useGetClassArmsQuery,
  useGetStaffListQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  useBulkDeleteSubjectsMutation,
  useAssignTeacherToSubjectMutation,
  useRemoveTeacherFromSubjectMutation,
  useBulkAssignTeachersToClassesMutation,
  useGetAgoraSubjectsQuery,
  useGetSubjectClassAssignmentsQuery,
  type Subject,
  type ClassArm,
  type CreateSubjectDto,
  type UpdateSubjectDto,
  type SubjectClassAssignments,
  type AgoraSubject,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useRuntimePolicies } from '@/hooks/useRuntimePolicies';
import { useAutoGenerateSubjects } from '@/hooks/useAutoGenerateSubjects';
import { getTerminology } from '@/lib/utils/terminology';
import toast from 'react-hot-toast';
import React from 'react';

export default function SubjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevelGroup, setSelectedLevelGroup] = useState<'all' | 'jss' | 'sss'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'standard' | 'custom'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showTeacherModal, setShowTeacherModal] = useState<Subject | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]); // Multi-select for SECONDARY
  const [showClassAssignmentModal, setShowClassAssignmentModal] = useState<Subject | null>(null);
  const [detailSubjectId, setDetailSubjectId] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean, type: 'single' | 'bulk', id?: string, name?: string }>({
    isOpen: false,
    type: 'single'
  });

  const { data: schoolResponse, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);
  const { policies } = useRuntimePolicies();
  const allowAgoraGenerate = policies.subjectRegistryMode !== 'CUSTOM_ONLY';

  // Deep-link from setup checklist: /subjects?action=add
  useEffect(() => {
    if (searchParams.get('action') !== 'add') return;
    setShowCreateModal(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('action');
    const qs = next.toString();
    router.replace(`/dashboard/school/subjects${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [searchParams, router]);

  // Auto-generate subjects hook
  const {
    isGenerating,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    handleAutoGenerate: _handleAutoGenerate,
    canAutoGenerate,
    schoolTypeLabel,
  } = useAutoGenerateSubjects();

  const { data: subjectsResponse, refetch: refetchSubjects, isLoading: isLoadingSubjects } = useGetSubjectsQuery(
    {
      schoolId: schoolId!,
      schoolType: currentType || undefined,
    },
    { skip: !schoolId }
  );

  // Wrap handleAutoGenerate so that the subject list refreshes after generation
  const handleAutoGenerate = useCallback(async () => {
    await _handleAutoGenerate();
    refetchSubjects();
  }, [_handleAutoGenerate, refetchSubjects]);

  const { data: classLevelsResponse } = useGetClassLevelsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || currentType !== 'SECONDARY' }
  );

  const { data: staffResponse } = useGetStaffListQuery(
    { role: 'Teacher', limit: 100 },
    { skip: !schoolId }
  );

  const [createSubject, { isLoading: isCreating }] = useCreateSubjectMutation();
  const [updateSubject, { isLoading: isUpdating }] = useUpdateSubjectMutation();
  const [deleteSubject, { isLoading: isDeleting }] = useDeleteSubjectMutation();
  const [assignTeacher, { isLoading: isAssigning }] = useAssignTeacherToSubjectMutation();
  const [removeTeacher, { isLoading: isRemoving }] = useRemoveTeacherFromSubjectMutation();
  const [bulkDeleteSubjects, { isLoading: isBulkDeleting }] = useBulkDeleteSubjectsMutation();

  const subjects = subjectsResponse?.data || [];
  const detailSubject = useMemo(
    () => (detailSubjectId ? subjects.find((s) => s.id === detailSubjectId) ?? null : null),
    [subjects, detailSubjectId],
  );
  const classLevels = classLevelsResponse?.data || [];
  // Filter to only get teachers (type === 'teacher') from staff list
  const teachers = useMemo(() => {
    const allStaff = staffResponse?.data?.items || [];
    return allStaff
      .filter((staff) => staff.type === 'teacher')
      .map((staff) => ({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        subject: staff.subject, // Include subject field for filtering
      }));
  }, [staffResponse]);

  // Filter subjects by search query
  const filteredSubjects = useMemo(() => {
    let filtered = subjects;

    // Filter by Level Stream Group
    if (selectedLevelGroup !== 'all') {
      const target = selectedLevelGroup.toUpperCase(); // 'JUNIOR' or 'SENIOR'
      filtered = filtered.filter((s) => {
        // Show if explicitly assigned to this stream OR marked as ALL (General)
        return s.levelStream === target || s.levelStream === 'ALL' || !s.levelStream;
      });
    }

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q))
      );
    }

    // Filter by Standard/Custom
    if (statusFilter !== 'all') {
      const isStandard = statusFilter === 'standard';
      filtered = filtered.filter((s) => s.isAgoraStandard === isStandard);
    }

    // Filter by Category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    return filtered;
  }, [subjects, searchQuery, selectedLevelGroup, statusFilter, categoryFilter]);

  // Group subjects by class level for secondary schools
  const groupedSubjects = useMemo(() => {
    if (currentType !== 'SECONDARY') {
      return { all: filteredSubjects };
    }

    const grouped: Record<string, Subject[]> = {
      all: [],
      jss: [],
      sss: [],
    };

    filteredSubjects.forEach((subject) => {
      if (!subject.classLevelId) {
        grouped.all.push(subject);
      } else {
        const classLevel = classLevels.find((cl) => cl.id === subject.classLevelId);
        if (classLevel?.code?.startsWith('JSS')) {
          grouped.jss.push(subject);
        } else if (classLevel?.code?.startsWith('SS')) {
          grouped.sss.push(subject);
        } else {
          grouped.all.push(subject);
        }
      }
    });

    return grouped;
  }, [filteredSubjects, classLevels, currentType]);

  const [bulkAssign] = useBulkAssignTeachersToClassesMutation();

  const handleCreateSubject = async (data: any) => {
    if (!schoolId) return;

    try {
      const { assignments, ...subjectData } = data;
      const result = await createSubject({
        schoolId,
        data: {
          ...subjectData,
          schoolType: currentType || undefined,
        },
      }).unwrap();

      const newSubjectId = result.data.id;

      // Handle class arm assignments if provided
      if (assignments && assignments.length > 0) {
        await bulkAssign({
          schoolId,
          subjectId: newSubjectId,
          data: { assignments },
        }).unwrap();
      }

      toast.success('Subject created successfully');
      setShowCreateModal(false);
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create subject');
    }
  };

  const handleUpdateSubject = async (subjectId: string, data: any) => {
    if (!schoolId) return;

    try {
      const { assignments, ...subjectData } = data;
      await updateSubject({
        schoolId,
        subjectId,
        data: subjectData,
      }).unwrap();

      // Handle class arm assignments if provided
      if (assignments) {
        await bulkAssign({
          schoolId,
          subjectId,
          data: { assignments },
        }).unwrap();
      }

      toast.success('Subject updated successfully');
      setEditingSubject(null);
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update subject');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id];

      if (next.length === 0) setIsSelectionMode(false);
      else setIsSelectionMode(true);
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    if (selectedIds.length === ids.length && ids.length > 0) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(ids);
      setIsSelectionMode(true);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm({
      isOpen: true,
      type: 'bulk'
    });
  };

  const handleDeleteSubject = (subjectId: string, subjectName: string) => {
    setShowDeleteConfirm({
      isOpen: true,
      type: 'single',
      id: subjectId,
      name: subjectName
    });
  };

  const handleConfirmDelete = async () => {
    if (!schoolId) return;

    try {
      if (showDeleteConfirm.type === 'bulk') {
        const result = await bulkDeleteSubjects({ schoolId, subjectIds: selectedIds }).unwrap();
        toast.success(result.data.message);
        setSelectedIds([]);
        setIsSelectionMode(false);
      } else if (showDeleteConfirm.id) {
        await deleteSubject({ schoolId, subjectId: showDeleteConfirm.id }).unwrap();
        toast.success('Subject deleted successfully');
        setSelectedIds(prev => prev.filter(id => id !== showDeleteConfirm.id));
        if (detailSubjectId === showDeleteConfirm.id) {
          setDetailSubjectId(null);
        }
      }
      setShowDeleteConfirm({ ...showDeleteConfirm, isOpen: false });
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete subject(s)');
    }
  };

  const handleAssignTeacher = async () => {
    if (!schoolId || !showTeacherModal || !selectedTeacherId) return;

    // For PRIMARY schools, check if a teacher is already assigned
    if (currentType === 'PRIMARY' && showTeacherModal.teachers && showTeacherModal.teachers.length > 0) {
      toast.error('Primary schools can only have one teacher per subject. Please remove the existing teacher first.');
      return;
    }

    try {
      await assignTeacher({
        schoolId,
        subjectId: showTeacherModal.id,
        teacherId: selectedTeacherId,
      }).unwrap();
      toast.success('Teacher assigned successfully');
      setShowTeacherModal(null);
      setSelectedTeacherId('');
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign teacher');
    }
  };

  // Bulk assign multiple teachers at once (for SECONDARY/TERTIARY)
  const handleBulkAssignTeachers = async () => {
    if (!schoolId || !showTeacherModal || selectedTeacherIds.length === 0) return;

    let successCount = 0;
    let errorCount = 0;

    for (const teacherId of selectedTeacherIds) {
      try {
        await assignTeacher({
          schoolId,
          subjectId: showTeacherModal.id,
          teacherId,
        }).unwrap();
        successCount++;
      } catch {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} teacher${successCount > 1 ? 's' : ''} assigned successfully`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to assign ${errorCount} teacher${errorCount > 1 ? 's' : ''}`);
    }

    setShowTeacherModal(null);
    setSelectedTeacherIds([]);
    refetchSubjects();
  };

  const handleRemoveTeacher = async (subjectId: string, teacherId: string) => {
    if (!schoolId) return;

    try {
      await removeTeacher({ schoolId, subjectId, teacherId }).unwrap();
      toast.success('Teacher removed successfully');
      refetchSubjects();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove teacher');
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                {currentType === 'TERTIARY' ? 'Courses' : 'Subjects'}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                Manage {currentType === 'TERTIARY' ? 'courses' : 'subjects'} for {currentType || 'your school'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canAutoGenerate && allowAgoraGenerate && (
                <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                  <AutoGenerateButton
                    onClick={openConfirmModal}
                    isLoading={isGenerating}
                    label="Auto-Generate"
                    loadingLabel="Generating..."
                    logoSrc="/assets/logos/agora_main.png"
                  />
                </PermissionGate>
              )}
              <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  className="shadow-lg shadow-blue-500/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {currentType === 'TERTIARY' ? 'Course' : 'Subject'}
                </Button>
              </PermissionGate>
            </div>
          </div>
        </FadeInUp>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <SearchInput
              placeholder={`Search ${currentType === 'TERTIARY' ? 'courses' : 'subjects'} by name or code...`}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedLevelGroup}
              onChange={(e) => setSelectedLevelGroup(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface text-xs font-semibold"
            >
              <option value="all">All Levels</option>
              <option value="jss">Junior Secondary (JSS)</option>
              <option value="sss">Senior Secondary (SSS)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface text-xs"
            >
              <option value="all">All Types</option>
              <option value="standard">Bud library</option>
              <option value="custom">Custom</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface text-xs"
            >
              <option value="all">All Categories</option>
              <option value="CORE">Core</option>
              <option value="ELECTIVE">Elective</option>
              <option value="VOCATIONAL">Vocational</option>
            </select>
          </div>
        </div>

        {/* Selection Sticky Toolbar */}
        <AnimatePresence>
          {isSelectionMode && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="sticky top-4 z-[40] mb-6 mx-auto w-full max-w-2xl bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border-2 border-primary/20 dark:border-primary/30 rounded-3xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
              layout
            >
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectAll(filteredSubjects.map(s => s.id))}
                  className="rounded-2xl hover:bg-primary/10 text-primary font-bold transition-all duration-200"
                >
                  {selectedIds.length === filteredSubjects.length && filteredSubjects.length > 0 ? (
                    <CheckSquare className="h-5 w-5 mr-2" />
                  ) : (
                    <Square className="h-5 w-5 mr-2" />
                  )}
                  {selectedIds.length === filteredSubjects.length && filteredSubjects.length > 0 ? 'Deselect All' : 'Select All'}
                </Button>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />
                <span className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs">
                    {selectedIds.length}
                  </span>
                  selected
                </span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="rounded-2xl flex-1 sm:flex-auto shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedIds([]);
                    setIsSelectionMode(false);
                  }}
                  className="rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subjects List */}
        {isLoadingSubjects || isLoadingSchool ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium animate-pulse">
              Loading {currentType === 'TERTIARY' ? 'courses' : 'subjects'}...
            </p>
          </div>
        ) : (
          <>
            {currentType === 'SECONDARY' ? (
              <div className="space-y-6">
                {(groupedSubjects.jss.length > 0 || groupedSubjects.sss.length > 0 || groupedSubjects.all.length > 0) ? (
                  <>
                    {groupedSubjects.jss.length > 0 && (
                      <div>
                        <p className="font-medium mb-4 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
                          JSS Subjects
                        </p>
                        <div className={cn(
                          'gap-4',
                          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                        )}>
                          {groupedSubjects.jss.map((subject) => (
                            <SubjectCard
                              key={subject.id}
                              subject={subject}
                              onEdit={() => setEditingSubject(subject)}
                              onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                              onAssignTeacher={() => setShowTeacherModal(subject)}
                              onOpenDetail={() => setDetailSubjectId(subject.id)}
                              isDeleting={isDeleting}
                              currentType={currentType}
                              isSelected={selectedIds.includes(subject.id)}
                              isSelectionMode={isSelectionMode}
                              onToggleSelection={() => toggleSelection(subject.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {groupedSubjects.sss.length > 0 && (
                      <div>
                        <p className="font-medium mb-4 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
                          SSS Subjects
                        </p>
                        <div className={cn(
                          'gap-4',
                          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                        )}>
                          {groupedSubjects.sss.map((subject) => (
                            <SubjectCard
                              key={subject.id}
                              subject={subject}
                              onEdit={() => setEditingSubject(subject)}
                              onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                              onAssignTeacher={() => setShowTeacherModal(subject)}
                              onOpenDetail={() => setDetailSubjectId(subject.id)}
                              isDeleting={isDeleting}
                              currentType={currentType}
                              isSelected={selectedIds.includes(subject.id)}
                              isSelectionMode={isSelectionMode}
                              onToggleSelection={() => toggleSelection(subject.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {groupedSubjects.all.length > 0 && (
                      <div>
                        <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
                          General Subjects
                        </p>
                        <div className={cn(
                          'gap-4',
                          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                        )}>
                          {groupedSubjects.all.map((subject) => (
                            <SubjectCard
                              key={subject.id}
                              subject={subject}
                              onEdit={() => setEditingSubject(subject)}
                              onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                              onAssignTeacher={() => setShowTeacherModal(subject)}
                              onOpenDetail={() => setDetailSubjectId(subject.id)}
                              isDeleting={isDeleting}
                              currentType={currentType}
                              isSelected={selectedIds.includes(subject.id)}
                              isSelectionMode={isSelectionMode}
                              onToggleSelection={() => toggleSelection(subject.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : (
              <div>
                {filteredSubjects.length > 0 && (
                  <>
                    <div className="mb-4">
                      <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
                        {currentType === 'TERTIARY' ? 'Courses' : 'Subjects'}
                      </p>
                    </div>
                    <div className={cn(
                      'gap-4',
                      viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'
                    )}>
                      {filteredSubjects.map((subject) => (
                        <SubjectCard
                          key={subject.id}
                          subject={subject}
                          onEdit={() => setEditingSubject(subject)}
                          onDelete={() => handleDeleteSubject(subject.id, subject.name)}
                          onAssignTeacher={() => setShowTeacherModal(subject)}
                          onOpenDetail={() => setDetailSubjectId(subject.id)}
                          isDeleting={isDeleting}
                          currentType={currentType}
                          isSelected={selectedIds.includes(subject.id)}
                          isSelectionMode={isSelectionMode}
                          onToggleSelection={() => toggleSelection(subject.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {filteredSubjects.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <EmptyStateIcon type="document" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    {searchQuery
                      ? `No ${currentType === 'TERTIARY' ? 'courses' : 'subjects'} found matching your search.`
                      : `No ${currentType === 'TERTIARY' ? 'courses' : 'subjects'} added yet.`}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingSubject) && schoolId && (
          <SubjectModal
            subject={editingSubject}
            schoolId={schoolId!}
            classLevels={classLevels}
            currentType={currentType}
            onClose={() => {
              setShowCreateModal(false);
              setEditingSubject(null);
            }}
            onSave={editingSubject
              ? (data) => handleUpdateSubject(editingSubject.id, data)
              : (data) => handleCreateSubject(data as CreateSubjectDto)}
            isLoading={isCreating || isUpdating}
          />
        )}

        {/* Subject Detail Modal */}
        {detailSubject && (
          <SubjectDetailModal
            subject={detailSubject}
            currentType={currentType}
            isRemoving={isRemoving}
            onClose={() => setDetailSubjectId(null)}
            onAssignTeacher={() => setShowTeacherModal(detailSubject)}
            onRemoveTeacher={handleRemoveTeacher}
            onClassAssignment={
              currentType === 'SECONDARY'
                ? () => setShowClassAssignmentModal(detailSubject)
                : undefined
            }
            onEdit={
              !detailSubject.isAgoraStandard
                ? () => {
                    setEditingSubject(detailSubject);
                    setDetailSubjectId(null);
                  }
                : undefined
            }
            onDelete={() => {
              handleDeleteSubject(detailSubject.id, detailSubject.name);
            }}
          />
        )}

        {/* Assign Teacher Modal */}
        {showTeacherModal && (
          <AssignTeacherModal
            subject={showTeacherModal}
            teachers={teachers}
            assignedTeachers={showTeacherModal.teachers || []}
            selectedTeacherId={selectedTeacherId}
            selectedTeacherIds={selectedTeacherIds}
            onSelectTeacher={setSelectedTeacherId}
            onSelectTeachers={setSelectedTeacherIds}
            onAssign={handleAssignTeacher}
            onBulkAssign={handleBulkAssignTeachers}
            onRemove={handleRemoveTeacher}
            onClose={() => {
              setShowTeacherModal(null);
              setSelectedTeacherId('');
              setSelectedTeacherIds([]);
            }}
            isLoading={isAssigning || isRemoving}
            currentType={currentType}
          />
        )}

        {/* Class Assignment Modal (SECONDARY only) */}
        {showClassAssignmentModal && schoolId && (
          <ClassAssignmentModal
            schoolId={schoolId}
            subject={showClassAssignmentModal}
            onClose={() => setShowClassAssignmentModal(null)}
            onSaved={() => refetchSubjects()}
          />
        )}

        {/* Auto-Generate Confirmation Modal */}
        {showConfirmModal && (
          <AutoGenerateModal
            schoolTypeLabel={schoolTypeLabel}
            isGenerating={isGenerating}
            onConfirm={handleAutoGenerate}
            onClose={closeConfirmModal}
          />
        )}

        {/* Global Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm.isOpen}
          onClose={() => setShowDeleteConfirm({ ...showDeleteConfirm, isOpen: false })}
          onConfirm={handleConfirmDelete}
          title={showDeleteConfirm.type === 'bulk' ? 'Bulk Delete Subjects' : 'Delete Subject'}
          message={
            showDeleteConfirm.type === 'bulk'
              ? `Are you sure you want to delete ${selectedIds.length} subjects? This action cannot be undone.`
              : `Are you sure you want to delete "${showDeleteConfirm.name}"? This action cannot be undone.`
          }
          confirmText="Delete"
          isLoading={isDeleting || isBulkDeleting}
          variant="danger"
        />
      </div>
    </ProtectedRoute>
  );
}

// Custom Hook for Long Press
function useLongPress(onLongPress: () => void, onClick: () => void, ms = 600) {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef<any>(null);
  const hasTriggeredLongPress = useRef(false);

  const start = useCallback((e: any) => {
    e.persist?.();
    setStartLongPress(true);
    hasTriggeredLongPress.current = false;
    timerRef.current = setTimeout(() => {
      onLongPress();
      hasTriggeredLongPress.current = true;
    }, ms);
  }, [onLongPress, ms]);

  const stop = useCallback(() => {
    setStartLongPress(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!hasTriggeredLongPress.current && startLongPress) {
      onClick();
    }
    stop();
  }, [onClick, startLongPress, stop]);

  return {
    onMouseDown: start,
    onMouseUp: handleMouseUp,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: handleMouseUp,
  };
}

// Subject Card Component
function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onAssignTeacher,
  onOpenDetail,
  isDeleting,
  currentType,
  isSelected,
  isSelectionMode,
  onToggleSelection,
}: {
  subject: Subject;
  onEdit: () => void;
  onDelete: () => void;
  onAssignTeacher: () => void;
  onOpenDetail: () => void;
  isDeleting: boolean;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: () => void;
}) {
  const teacherCount = subject.teachers?.length ?? 0;
  const teachersLabel =
    currentType === 'PRIMARY'
      ? teacherCount === 1
        ? '1 teacher'
        : `${teacherCount} teachers`
      : currentType === 'SECONDARY'
        ? teacherCount === 1
          ? '1 competent teacher'
          : `${teacherCount} competent teachers`
        : teacherCount === 1
          ? '1 teacher'
          : `${teacherCount} teachers`;

  const longPressProps = useLongPress(
    () => onToggleSelection(),
    () => {
      if (isSelectionMode) {
        onToggleSelection();
      } else {
        onOpenDetail();
      }
    }
  );

  return (
    <Card
      className={cn(
        "hover:bg-light-surface dark:hover:bg-dark-bg hover:shadow-lg transition-all duration-300 cursor-pointer relative overflow-hidden group h-full",
        isSelected && "ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10",
        isSelectionMode && "select-none"
      )}
      {...longPressProps}
    >
      {/* Selection Checkbox Overlay for Selection Mode */}
      <AnimatePresence>
        {(isSelectionMode || isSelected) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: -20 }}
            className="absolute top-4 right-4 z-20"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            {isSelected ? (
              <div className="bg-primary text-white rounded-xl p-1.5 shadow-xl shadow-primary/30 flex items-center justify-center">
                <Check className="h-4 w-4 stroke-[3px]" />
              </div>
            ) : (
              <div className="bg-white/90 dark:bg-dark-surface/90 border-2 border-primary/20 dark:border-primary/40 rounded-xl h-7 w-7 flex items-center justify-center hover:border-primary transition-all duration-200 backdrop-blur-md" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CardHeader className={cn("transition-opacity duration-200", isSelectionMode && "opacity-60")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle style={{ fontSize: 'var(--text-card-title)' }} className="font-black tracking-tight truncate">
              {subject.name}
            </CardTitle>
            {subject.code && (
              <p className="text-light-text-muted dark:text-[#9ca3af] mt-1.5 font-medium" style={{ fontSize: 'var(--text-small)' }}>
                {subject.code}
              </p>
            )}
            {subject.classLevelName && (
              <p className="text-light-text-muted dark:text-[#9ca3af] font-medium" style={{ fontSize: 'var(--text-small)' }}>
                {subject.classLevelName}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {subject.isAgoraStandard && (
                <p className="text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-500/20 font-bold px-2 py-0 h-5 text-[10px] rounded-lg">
                  Bud library
                </p>
              )}
              {!subject.isAgoraStandard && (
                <p className="text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20 font-bold px-2 py-0 h-5 text-[10px] rounded-lg">
                  Custom
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 min-w-[80px] shrink-0">
            {subject.category && (
              <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-2 py-0.5 h-6 text-[10px] rounded-md tracking-widest uppercase">
                {subject.category}
              </Badge>
            )}
            {!isSelectionMode && (
              <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {!subject.isAgoraStandard && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    disabled={isDeleting}
                    className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </PermissionGate>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("transition-opacity duration-200", isSelectionMode && "opacity-60")}>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 min-w-0 text-light-text-secondary dark:text-dark-text-secondary">
            <Users className="h-4 w-4 shrink-0 text-light-text-muted dark:text-dark-text-muted" />
            <span className="truncate" style={{ fontSize: 'var(--text-small)' }}>
              {teacherCount > 0 ? teachersLabel : currentType === 'PRIMARY' ? 'No teacher assigned' : 'No teachers assigned'}
            </span>
          </div>
          <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
            <Button
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAssignTeacher();
              }}
              className="shrink-0"
            >
              <Users className="h-4 w-4 mr-1" />
              {currentType === 'PRIMARY'
                ? teacherCount > 0
                  ? 'Change'
                  : 'Assign'
                : currentType === 'SECONDARY'
                  ? 'Add'
                  : 'Assign'}
            </Button>
          </PermissionGate>
        </div>
      </CardContent>
    </Card>
  );
}

// Subject Detail Modal — teachers & actions live here so cards stay even height
function SubjectDetailModal({
  subject,
  currentType,
  isRemoving,
  onClose,
  onAssignTeacher,
  onRemoveTeacher,
  onClassAssignment,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  isRemoving: boolean;
  onClose: () => void;
  onAssignTeacher: () => void;
  onRemoveTeacher: (subjectId: string, teacherId: string) => void;
  onClassAssignment?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}) {
  const teachers = subject.teachers || [];
  const teacherSectionTitle =
    currentType === 'SECONDARY'
      ? 'Competent Teachers'
      : currentType === 'PRIMARY'
        ? 'Assigned Teacher'
        : 'Teachers';
  const assignLabel =
    currentType === 'PRIMARY'
      ? teachers.length > 0
        ? 'Change Teacher'
        : 'Assign Teacher'
      : currentType === 'SECONDARY'
        ? 'Add Teachers'
        : 'Assign Teachers';
  const primaryNote =
    currentType === 'PRIMARY'
      ? 'Primary subjects can have one assigned teacher.'
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <FadeInUp
        from={{ opacity: 0, scale: 0.95 }}
        to={{ opacity: 1, scale: 1 }}
        duration={0.25}
        className="bg-white dark:bg-dark-surface rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <p
              className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate"
              style={{ fontSize: 'var(--text-section-title)' }}
            >
              {subject.name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {subject.code && (
                <span
                  className="text-light-text-muted dark:text-dark-text-muted font-medium"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {subject.code}
                </span>
              )}
              {subject.category && (
                <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-2 py-0.5 h-6 text-[10px] rounded-md tracking-widest uppercase">
                  {subject.category}
                </Badge>
              )}
              {subject.isAgoraStandard ? (
                <span className="text-green-600 dark:text-green-400 font-bold text-[10px]">Bud library</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px]">Custom</span>
              )}
              {subject.classLevelName && (
                <span
                  className="text-light-text-muted dark:text-dark-text-muted"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {subject.classLevelName}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {subject.description && (
            <p
              className="text-light-text-secondary dark:text-dark-text-secondary"
              style={{ fontSize: 'var(--text-body)' }}
            >
              {subject.description}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p
                  className="font-medium text-light-text-primary dark:text-dark-text-primary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  {teacherSectionTitle}{' '}
                  <span className="text-light-text-muted dark:text-dark-text-muted font-normal">
                    ({teachers.length})
                  </span>
                </p>
                {primaryNote && (
                  <p
                    className="text-light-text-muted dark:text-dark-text-muted mt-0.5"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    {primaryNote}
                  </p>
                )}
              </div>
              <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                <Button variant="ghost" size="sm" onClick={onAssignTeacher}>
                  <Users className="h-4 w-4 mr-1" />
                  {assignLabel}
                </Button>
              </PermissionGate>
            </div>

            {teachers.length > 0 ? (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/80 px-3 py-2.5 rounded-lg"
                    style={{ fontSize: 'var(--text-small)' }}
                  >
                    <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveTeacher(subject.id, teacher.id)}
                        disabled={isRemoving}
                        className="text-red-600 hover:text-red-700 h-7 px-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            ) : (
              <p
                className="text-light-text-muted dark:text-dark-text-muted py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700"
                style={{ fontSize: 'var(--text-small)' }}
              >
                {currentType === 'PRIMARY'
                  ? 'No teacher assigned yet'
                  : 'No teachers assigned yet'}
              </p>
            )}
          </div>

          {currentType === 'SECONDARY' && onClassAssignment && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClassAssignment}
                  disabled={teachers.length === 0}
                  className="w-full justify-center bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 disabled:opacity-50"
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Assign to Classes
                </Button>
              </PermissionGate>
              {teachers.length === 0 && (
                <p
                  className="text-center text-light-text-muted dark:text-dark-text-muted mt-2"
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  Add competent teachers before assigning to classes
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/30">
          <PermissionGate resource={PermissionResource.SUBJECTS} type={PermissionType.WRITE}>
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </PermissionGate>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </FadeInUp>
    </div>
  );
}

// Subject Create/Edit Modal
function SubjectModal({
  subject,
  schoolId,
  classLevels,
  currentType,
  onClose,
  onSave,
  isLoading,
}: {
  subject: Subject | null;
  schoolId: string;
  classLevels: Array<{ id: string; name: string; code?: string; type: string }>;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
  onClose: () => void;
  onSave: (data: CreateSubjectDto | UpdateSubjectDto) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [classLevelId, setClassLevelId] = useState(subject?.classLevelId || '');
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, string | undefined>>({});
  const [agoraSubjectId, setAgoraSubjectId] = useState(subject?.agoraSubjectId || '');
  const [isAgoraStandard, setIsAgoraStandard] = useState(subject?.isAgoraStandard || false);
  const [category, setCategory] = useState(subject?.category || '');
  const [showWarning, setShowWarning] = useState(false);
  const { policies } = useRuntimePolicies();
  const customOnly = policies.subjectRegistryMode === 'CUSTOM_ONLY';
  const agoraOnly = policies.subjectRegistryMode === 'AGORA_DEFAULT';
  const [pendingData, setPendingData] = useState<any>(null);
  const [isArmsExpanded, setIsArmsExpanded] = useState(false);

  const { data: armsResponse } = useGetClassArmsQuery(
    { schoolId, schoolType: 'SECONDARY' },
    { skip: !schoolId || currentType !== 'SECONDARY' }
  );

  const { data: assignmentsResponse } = useGetSubjectClassAssignmentsQuery(
    { schoolId, subjectId: subject?.id || '' },
    { skip: !schoolId || !subject || currentType !== 'SECONDARY' }
  );

  const classArms = armsResponse?.data || [];
  const initialAssignments = assignmentsResponse?.data?.assignments || {};

  // Initialize assignments map
  useEffect(() => {
    if (subject && initialAssignments && Object.keys(initialAssignments).length > 0) {
      const map: Record<string, string | undefined> = {};
      // Ensure we explicitly map teacherId even if null
      Object.entries(initialAssignments).forEach(([armId, teacherId]: [string, any]) => {
        map[armId] = (teacherId as string) || undefined;
      });
      setAssignmentsMap(map);
    } else if (!subject && classArms.length > 0 && Object.keys(assignmentsMap).length === 0) {
      // Default to "All Classes" for new subjects ONLY ONCE
      const map: Record<string, string | undefined> = {};
      classArms.forEach(arm => {
        map[arm.id] = undefined;
      });
      setAssignmentsMap(map);
    }
  }, [initialAssignments, classArms, subject]);

  const { data: agoraSubjectsResponse, isLoading: isLoadingAgora } = useGetAgoraSubjectsQuery(
    (schoolId && currentType) ? { schoolId, schoolType: currentType } : {} as any,
    { skip: !currentType || !schoolId }
  );

  const debouncedSearch = useDebounce(name, 300);

  // Prepopulate form when subject changes (Edit mode)
  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code || '');
      setDescription(subject.description || '');
      setClassLevelId(subject.classLevelId || '');
      setAgoraSubjectId(subject.agoraSubjectId || '');
      setIsAgoraStandard(subject.isAgoraStandard || false);
      setCategory(subject.category || '');
    } else {
      // Clear form when closing or opening for create
      setName('');
      setCode('');
      setDescription('');
      setClassLevelId('');
      setAgoraSubjectId('');
      setIsAgoraStandard(false);
      setCategory('');
    }
  }, [subject]);

  const agoraSubjects = agoraSubjectsResponse?.data || [];

  // Reset standard metadata if user starts typing a custom name
  useEffect(() => {
    if (agoraSubjectId && !subject) { // Only reset if NOT in edit mode
      const selected = agoraSubjects.find(s => s.id === agoraSubjectId);
      if (selected && name !== selected.name) {
        setAgoraSubjectId('');
        setIsAgoraStandard(false);
        setCategory('');
      }
    }
  }, [name, agoraSubjectId, agoraSubjects, subject]);

  const filteredAgoraSubjects = useMemo(() => {
    if (!name.trim() || agoraSubjectId) return agoraSubjects;
    const query = name.toLowerCase();
    return agoraSubjects.filter(sub =>
      sub.name.toLowerCase().includes(query) ||
      sub.code.toLowerCase().includes(query)
    );
  }, [agoraSubjects, name, agoraSubjectId]);

  const comboboxOptions = useMemo(() => {
    return filteredAgoraSubjects.map(sub => ({
      value: sub.id,
      label: sub.name,
      subLabel: sub.code,
      original: sub
    }));
  }, [filteredAgoraSubjects]);

  const handleSelectAgora = (option: any) => {
    if (option && option.original) {
      const sub = option.original as AgoraSubject;
      setName(sub.name);
      setCode(sub.code);
      setAgoraSubjectId(sub.id);
      setIsAgoraStandard(true);
      setCategory(sub.category || '');
      if (sub.description) setDescription(sub.description);
    } else {
      // Custom entry or search term
      setIsAgoraStandard(false);
      setAgoraSubjectId('');
      setCategory('');
      // Don't clear name, as user is typing a custom name
    }
  };

  const handleToggleArm = (armId: string) => {
    setAssignmentsMap(prev => {
      const next = { ...prev };
      if (armId in next) {
        delete next[armId];
      } else {
        // Find if we had a teacher before
        const prevTeacher = initialAssignments[armId]?.teacherId;
        next[armId] = prevTeacher || undefined;
      }
      return next;
    });
  };

  const handleSelectBulk = (type: 'all' | 'jss' | 'sss' | 'none') => {
    if (type === 'none') {
      setAssignmentsMap({});
      return;
    }

    const targetArms = classArms.filter(arm => {
      if (type === 'jss') return arm.classLevelName.startsWith('JSS');
      if (type === 'sss') return arm.classLevelName.startsWith('SS');
      return true;
    });

    setAssignmentsMap(prev => {
      const next = { ...prev };
      targetArms.forEach(arm => {
        if (!(arm.id in next)) {
          const prevTeacher = initialAssignments[arm.id]?.teacherId;
          next[arm.id] = prevTeacher || undefined;
        }
      });
      return next;
    });
  };

  const selectedArmIds = Object.keys(assignmentsMap);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Subject name is required');
      return;
    }

    // Deduce classLevelId for the subject record itself
    // If all selected arms belong to exactly one level, use that level.
    // Otherwise, use null (General).
    let deducedLevelId = classLevelId;
    if (currentType === 'SECONDARY' && selectedArmIds.length > 0) {
      const selectedArmsData = classArms.filter(a => selectedArmIds.includes(a.id));
      const distinctLeveIds = Array.from(new Set(selectedArmsData.map(a => a.classLevelId)));
      deducedLevelId = distinctLeveIds.length === 1 ? distinctLeveIds[0] : '';
    }

    // Build full assignments list for all arms to sync state
    const armAssignments = classArms.map(arm => ({
      classArmId: arm.id,
      teacherId: assignmentsMap[arm.id] || null,
    }));

    // Compute Level Stream classification
    let levelStream: 'JUNIOR' | 'SENIOR' | 'ALL' = 'ALL';
    if (selectedArmIds.length > 0) {
      const selectedArms = classArms.filter(a => selectedArmIds.includes(a.id));
      const hasJunior = selectedArms.some(a => a.classLevelName.toLowerCase().includes('junior') || a.classLevelName.toLowerCase().includes('jss'));
      const hasSenior = selectedArms.some(a => a.classLevelName.toLowerCase().includes('senior') || (a.classLevelName.toLowerCase().includes('ss') && !a.classLevelName.toLowerCase().includes('jss')));

      if (hasJunior && !hasSenior) levelStream = 'JUNIOR';
      else if (hasSenior && !hasJunior) levelStream = 'SENIOR';
      else if (hasJunior && hasSenior) levelStream = 'ALL';
    }

    const data = {
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      // If it's general/all levels, send null to clear existing levelId
      classLevelId: deducedLevelId || null, 
      levelStream,
      agoraSubjectId: agoraSubjectId || undefined,
      isAgoraStandard,
      category: category || undefined,
      // Pass the full assignments for post-save application
      assignments: currentType === 'SECONDARY' ? armAssignments : undefined,
    };

    // If it's a new subject and NOT standard, show warning
    if (!subject && !isAgoraStandard) {
      setPendingData(data);
      setShowWarning(true);
      return;
    }

    onSave(data);
    onClose();
  };

  const handleConfirmCustom = () => {
    if (pendingData) {
      onSave(pendingData);
      setShowWarning(false);
      onClose();
    }
  };

  // Filter class levels for better UX based on current school type
  const filteredClassLevels = useMemo(() => {
    if (!currentType) return [];
    return classLevels.filter((cl) => cl.type === currentType);
  }, [classLevels, currentType]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25}
          className="bg-white dark:bg-dark-surface rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-light-text-primary dark:text-dark-text-primary text-lg leading-tight">
                  {subject ? `Edit ${currentType === 'TERTIARY' ? 'Course' : 'Subject'}` : `Create ${currentType === 'TERTIARY' ? 'Course' : 'Subject'}`}
                </p>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  Configure academic resources and class assignments
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-light-text-muted hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {customOnly ? (
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    {currentType === 'TERTIARY' ? 'Course' : 'Subject'} Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsAgoraStandard(false);
                      setAgoraSubjectId('');
                    }}
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>
              ) : (
                <Combobox
                  label={`${currentType === 'TERTIARY' ? 'Course' : 'Subject'} Name *`}
                  placeholder="Search Bud library subjects..."
                  options={comboboxOptions}
                  value={agoraSubjectId}
                  onSelect={handleSelectAgora}
                  onSearchChange={setName}
                  isLoading={isLoadingAgora}
                  disabled={isLoadingAgora || isLoading}
                  required
                />
              )}
              {!customOnly && !isAgoraStandard && name && !agoraOnly && (
                <div className="mt-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium">Matching Bud library subject not found — will be created as Custom</span>
                </div>
              )}
              {agoraOnly && !isAgoraStandard && name && (
                <p className="mt-1 text-xs text-red-500">This school only allows national curriculum subjects. Pick a match from the list.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                {currentType === 'TERTIARY' ? 'Course' : 'Subject'} Code
              </label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={currentType === 'TERTIARY' ? "e.g., CS101" : "e.g., MATH"}
                disabled={isAgoraStandard}
              />
            </div>

            {/* SECONDARY: Multi-select Class Arms */}
            {currentType === 'SECONDARY' && classArms.length > 0 && (
              <div className="space-y-3 bg-gray-50/50 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 overflow-hidden">
                <div 
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => setIsArmsExpanded(!isArmsExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isArmsExpanded ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    )}>
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-light-text-primary dark:text-dark-text-primary cursor-pointer leading-none">
                        Class Distribution
                      </label>
                      <p className="text-[10px] text-light-text-muted dark:text-dark-text-muted mt-1">
                        Currently assigned to {selectedArmIds.length} classes
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "transition-all duration-300",
                    isArmsExpanded ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "bg-transparent"
                  )}>
                    {isArmsExpanded ? 'Hide Selection' : 'Configure Assignments'}
                    {isArmsExpanded ? <ChevronUp className="h-3 w-3 ml-1.5" /> : <ChevronDown className="h-3 w-3 ml-1.5" />}
                  </Badge>
                </div>

                {isArmsExpanded && (
                  <div className="pt-4 grid grid-cols-5 gap-4">
                    {/* Left: Prominent Bulk Actions */}
                    <div className="col-span-2 space-y-3">
                      <p className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest pl-1">
                        Mass Assignment
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectBulk('all'); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left group"
                        >
                          <span className="text-xs font-bold">Entire School</span>
                          <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                            <Plus className="h-3 w-3" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectBulk('jss'); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left"
                        >
                          <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">Junior Secondary (JSS)</span>
                          <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <Plus className="h-3 w-3" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectBulk('sss'); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-800 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all text-left"
                        >
                          <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">Senior Secondary (SSS)</span>
                          <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                            <Plus className="h-3 w-3" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleSelectBulk('none'); }}
                          className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-left"
                        >
                          <span className="text-xs font-bold text-red-600 dark:text-red-400">Remove All Assignments</span>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 flex gap-2">
                        <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-snug">
                          Assignments are synced to the active academic session.
                        </p>
                      </div>
                    </div>

                    {/* Right: Arm Picker */}
                    <div className="col-span-3 space-y-4 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                      {Array.from(new Set(classArms.map(a => a.classLevelName))).map(levelName => (
                        <div key={levelName} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                            <span className="text-[9px] font-black text-light-text-muted dark:text-dark-text-muted uppercase tracking-[0.2em]">
                              {levelName}
                            </span>
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {classArms.filter(a => a.classLevelName === levelName).map(arm => (
                              <button
                                type="button"
                                key={arm.id}
                                onClick={(e) => { e.stopPropagation(); handleToggleArm(arm.id); }}
                                className={cn(
                                  "flex items-center gap-2 p-2.5 rounded-xl border transition-all text-[11px] font-semibold text-left",
                                  selectedArmIds.includes(arm.id)
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]"
                                    : "bg-white dark:bg-dark-surface border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700"
                                )}
                              >
                                {selectedArmIds.includes(arm.id) ? (
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-200 dark:border-gray-700 shrink-0" />
                                )}
                                <span className="truncate">{arm.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PRIMARY: Keep single select Class Level */}
            {currentType === 'PRIMARY' && filteredClassLevels.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                  Class Level (Optional)
                </label>
                <select
                  value={classLevelId}
                  onChange={(e) => setClassLevelId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                >
                  <option value="">All Primary Levels</option>
                  {filteredClassLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the subject"
                rows={3}
                disabled={isAgoraStandard}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="flex-1"
                disabled={!name.trim() || isLoadingAgora}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {subject ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </FadeInUp>
      </div>

      <Modal
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        title="Custom Subject Warning"
        size="sm"
        showCloseButton={false}
      >
        <div className="p-1">
          <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-400">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <HelpCircle className="h-6 w-6" />
            </div>
            <p className="font-semibold text-lg">Unrecognised Subject</p>
          </div>

          <div className="space-y-4 text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
            <p>
              The subject <span className="font-bold text-light-text-primary dark:text-dark-text-primary">"{name}"</span> is not part of the <span className="font-semibold italic text-primary">Bud library</span>.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg space-y-2 border border-light-border dark:border-dark-border">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>You might not be able to auto-generate a curriculum for this subject.</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Platform-wide performance analytics will be limited for local subjects.</span>
              </p>
            </div>

            <p>
              Are you sure you want to create this as a <strong>custom local subject</strong>?
            </p>
          </div>

          <div className="flex flex-col gap-2 mt-8">
            <Button
              variant="primary"
              fullWidth
              onClick={handleConfirmCustom}
              className="bg-primary hover:bg-primary-hover"
            >
              Continue anyway
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setShowWarning(false)}>
              Back to search
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Assign Teacher Modal
function AssignTeacherModal({
  subject,
  teachers,
  assignedTeachers,
  selectedTeacherId,
  selectedTeacherIds,
  onSelectTeacher,
  onSelectTeachers,
  onAssign,
  onBulkAssign,
  onRemove,
  onClose,
  isLoading,
  currentType,
}: {
  subject: Subject;
  teachers: Array<{ id: string; firstName: string; lastName: string; subject?: string | null }>;
  assignedTeachers: Array<{ id: string; firstName: string; lastName: string }>;
  selectedTeacherId: string;
  selectedTeacherIds: string[];
  onSelectTeacher: (teacherId: string) => void;
  onSelectTeachers: (teacherIds: string[]) => void;
  onAssign: () => void;
  onBulkAssign: () => void;
  onRemove: (subjectId: string, teacherId: string) => void;
  onClose: () => void;
  isLoading: boolean;
  currentType: 'PRIMARY' | 'SECONDARY' | 'TERTIARY' | null;
}) {
  // UPDATED: Handle teacher filtering based on subject type
  // For AGORA SUBJECTS: Filter by subject competency and agora subject matching
  // For CUSTOM SUBJECTS: Show all teachers (since no auto-mapping is possible)
  const filteredTeachers = useMemo(() => {
    if (!teachers || teachers.length === 0) return [];

    // If this is a custom subject (no agoraSubjectId), show all teachers
    if (!subject.agoraSubjectId) {
      return teachers;
    }

    // For agora subjects, use smart filtering
    if (currentType === 'SECONDARY') {
      return teachers.filter((t) => {
        if (!t.subject) return false;
        const teacherSubject = t.subject.trim().toLowerCase();
        const subjectName = subject.name.trim().toLowerCase();
        // Match if teacher's subject contains subject name or subject name contains teacher's subject
        return teacherSubject === subjectName ||
          teacherSubject.includes(subjectName) ||
          subjectName.includes(teacherSubject);
      });
    }

    // For PRIMARY/TERTIARY with agora subjects, show all teachers (backend will validate)
    return teachers;
  }, [teachers, subject, currentType]);

  const availableTeachers = filteredTeachers.filter(
    (t) => !assignedTeachers.some((at) => at.id === t.id)
  );

  // Use multi-select for SECONDARY and TERTIARY schools
  const useMultiSelect = currentType === 'SECONDARY' || currentType === 'TERTIARY';

  const handleCheckboxChange = (teacherId: string, checked: boolean) => {
    if (checked) {
      onSelectTeachers([...selectedTeacherIds, teacherId]);
    } else {
      onSelectTeachers(selectedTeacherIds.filter(id => id !== teacherId));
    }
  };

  const handleSelectAll = () => {
    if (selectedTeacherIds.length === availableTeachers.length) {
      onSelectTeachers([]);
    } else {
      onSelectTeachers(availableTeachers.map(t => t.id));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
            {currentType === 'SECONDARY' ? 'Add Competent Teachers' : 'Assign Teachers'} - {subject.name}
            {currentType === 'PRIMARY' && (
              <span className="text-sm font-normal text-light-text-muted dark:text-dark-text-muted block mt-1">
                (Primary schools: One teacher per subject)
              </span>
            )}
            {useMultiSelect && (
              <span className="text-sm font-normal text-light-text-muted dark:text-dark-text-muted block mt-1">
                Select multiple teachers who can teach this subject
              </span>
            )}
          </p>
          <button
            onClick={onClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {assignedTeachers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                {currentType === 'SECONDARY' ? 'Competent Teachers' : 'Assigned Teachers'} ({assignedTeachers.length})
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {assignedTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded"
                  >
                    <span className="text-green-800 dark:text-green-300">
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(subject.id, teacher.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 h-6 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {availableTeachers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Available Teachers ({availableTeachers.length})
                  {currentType === 'PRIMARY' && assignedTeachers.length > 0 && (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400 block mt-1">
                      Remove the existing teacher first to assign a new one
                    </span>
                  )}
                </label>
                {useMultiSelect && availableTeachers.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {selectedTeacherIds.length === availableTeachers.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Multi-select checkbox list for SECONDARY/TERTIARY */}
              {useMultiSelect ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {availableTeachers.map((teacher) => (
                    <label
                      key={teacher.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedTeacherIds.includes(teacher.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(teacher.id)}
                        onChange={(e) => handleCheckboxChange(teacher.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
                      />
                      <span className="text-light-text-primary dark:text-dark-text-primary">
                        {teacher.firstName} {teacher.lastName}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                /* Single select dropdown for PRIMARY */
                <select
                  value={selectedTeacherId}
                  onChange={(e) => onSelectTeacher(e.target.value)}
                  disabled={currentType === 'PRIMARY' && assignedTeachers.length > 0}
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a teacher...</option>
                  {availableTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              )}

              {/* Action button */}
              <div className="mt-3">
                {useMultiSelect ? (
                  <Button
                    variant="primary"
                    onClick={onBulkAssign}
                    disabled={selectedTeacherIds.length === 0 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Add {selectedTeacherIds.length > 0 ? `${selectedTeacherIds.length} ` : ''}Teacher{selectedTeacherIds.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={onAssign}
                    disabled={!selectedTeacherId || isLoading || (currentType === 'PRIMARY' && assignedTeachers.length > 0)}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Assign Teacher
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {availableTeachers.length === 0 && (
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted text-center py-4">
              {currentType === 'SECONDARY' && filteredTeachers.length === 0 && subject.agoraSubjectId
                ? `No teachers registered with subject "${subject.name}" found. Please add teachers with this subject name first.`
                : subject.agoraSubjectId 
                  ? 'All qualified teachers are already assigned to this subject.'
                  : 'All teachers are already assigned to this custom subject.'
              }
            </p>
          )}
        </div>

        <div className="mt-6">
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </FadeInUp>
    </div>
  );
}

// Auto-Generate Confirmation Modal
function AutoGenerateModal({
  schoolTypeLabel,
  isGenerating,
  onConfirm,
  onClose,
}: {
  schoolTypeLabel: string;
  isGenerating: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
              Auto-Generate Subjects
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            This will add standard {schoolTypeLabel} subjects to your school.
            Existing subjects with the same name or code will be skipped.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You can delete any unwanted subjects after generation.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Subjects
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </FadeInUp>
    </div>
  );
}

// Class Assignment Modal (SECONDARY only)
// Allows assigning teachers to teach this subject in specific classes
function ClassAssignmentModal({
  schoolId,
  subject,
  onClose,
  onSaved,
}: {
  schoolId: string;
  subject: Subject;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [localAssignments, setLocalAssignments] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch class assignments for this subject
  const { data: assignmentsResponse, isLoading, refetch } = useGetSubjectClassAssignmentsQuery(
    { schoolId, subjectId: subject.id },
    { skip: !schoolId || !subject.id }
  );

  const [bulkAssign, { isLoading: isSaving }] = useBulkAssignTeachersToClassesMutation();

  const assignmentsData = assignmentsResponse?.data;

  // Initialize local assignments when data loads
  useMemo(() => {
    if (assignmentsData) {
      const initial: Record<string, string> = {};
      Object.entries(assignmentsData.assignments).forEach(([classArmId, assignment]) => {
        initial[classArmId] = assignment.teacherId;
      });
      setLocalAssignments(initial);
    }
  }, [assignmentsData]);

  const handleTeacherChange = (classArmId: string, teacherId: string) => {
    setLocalAssignments(prev => ({
      ...prev,
      [classArmId]: teacherId,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!assignmentsData) return;

    try {
      // Build assignments array from local state
      const assignments = assignmentsData.classArms.map(arm => ({
        classArmId: arm.id,
        teacherId: localAssignments[arm.id] || undefined,
      }));

      await bulkAssign({
        schoolId,
        subjectId: subject.id,
        data: { assignments },
      }).unwrap();

      toast.success('Class assignments saved successfully');
      setHasChanges(false);
      refetch();
      onSaved();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save assignments');
    }
  };

  // Group class arms by class level
  const groupedClassArms = useMemo(() => {
    if (!assignmentsData?.classArms) return {};

    const grouped: Record<string, typeof assignmentsData.classArms> = {};
    assignmentsData.classArms.forEach(arm => {
      if (!grouped[arm.classLevelName]) {
        grouped[arm.classLevelName] = [];
      }
      grouped[arm.classLevelName].push(arm);
    });
    return grouped;
  }, [assignmentsData]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25}
          className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-2xl mx-4"
        >
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-light-text-secondary dark:text-dark-text-secondary">
              Loading class assignments...
            </span>
          </div>
        </FadeInUp>
      </div>
    );
  }

  const hasCompetentTeachers = (assignmentsData?.competentTeachers?.length || 0) > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <FadeInUp from={{ opacity: 0, scale: 0.95 }} to={{ opacity: 1, scale: 1 }} duration={0.25}
        className="bg-white dark:bg-dark-surface rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-section-title)' }}>
              Assign {subject.name} to Classes
            </p>
            <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1">
              Select which teacher will teach this subject in each class
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!hasCompetentTeachers ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                  No competent teachers assigned
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Please add teachers who can teach {subject.name} first, then come back to assign them to classes.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Competent Teachers Summary */}
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Competent Teachers:</strong>{' '}
                {assignmentsData?.competentTeachers.map((t, i) => (
                  <span key={t.id}>
                    {t.firstName} {t.lastName}
                    {i < (assignmentsData.competentTeachers.length - 1) ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>

            {/* Class Assignment Table */}
            <div className="space-y-6">
              {Object.entries(groupedClassArms).map(([levelName, arms]) => (
                <div key={levelName}>
                  <h4 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-3">
                    {levelName}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {arms.map((arm) => {
                      const currentAssignment = assignmentsData?.assignments[arm.id];
                      return (
                        <div
                          key={arm.id}
                          className="flex items-center justify-between p-3 bg-light-surface dark:bg-dark-surface-hover border border-light-border dark:border-dark-border rounded-xl"
                        >
                          <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {arm.fullName}
                          </span>
                          <select
                            value={localAssignments[arm.id] || ''}
                            onChange={(e) => handleTeacherChange(arm.id, e.target.value)}
                            className="ml-3 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-[var(--light-input)] dark:bg-[var(--dark-input)] text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Not assigned</option>
                            {assignmentsData?.competentTeachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.firstName} {teacher.lastName}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            {hasChanges ? 'Discard' : 'Close'}
          </Button>
          {hasCompetentTeachers && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
          )}
        </div>
      </FadeInUp>
    </div>
  );
}

