'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  BookOpen,
  Users,
  Plus,
  Trash2,
  Calendar,
  GraduationCap,
  Loader2,
  AlertCircle,
  Crown,
  FileText,
  Clock,
  Upload,
  Download,
  File,
  ListOrdered,
  ArrowLeft,
  Edit,
  UserX,
  User,
  RefreshCw,
} from 'lucide-react';
import { 
  StudentReassignModal, 
  StudentAssignToClassModal,
  StudentAdmissionModal 
} from '@/components/modals';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import {
  useGetMySchoolQuery,
  useGetClassByIdQuery,
  useRemoveTeacherFromClassMutation,
  useGetClassResourcesQuery,
  useUploadClassResourceMutation,
  useDeleteClassResourceMutation,
  useGetActiveSessionQuery,
  useGetTimetableForClassQuery,
  useGetClassStudentsQuery,
  ClassTeacher,
  ClassResource,
  TimetablePeriod,
  StudentWithEnrollment,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import { AssignTeacherToClassModal } from '@/components/modals/AssignTeacherToClassModal';
import { FileUploadModal } from '@/components/modals/FileUploadModal';
import { ShareRegistrationLinkModal } from '@/components/modals/ShareRegistrationLinkModal';
import { ConfirmModal } from '@/components/ui/Modal';
import { BackButton } from '@/components/ui/BackButton';
import { SubjectCurriculumList } from '@/components/curriculum';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { ViewToggle } from '@/components/ui/ViewToggle';

type TabType = 'students' | 'teachers' | 'timetable' | 'resources' | 'curriculum';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [removeModal, setRemoveModal] = useState<{
    isOpen: boolean;
    teacher: ClassTeacher | null;
  }>({
    isOpen: false,
    teacher: null,
  });
  const [deleteResourceModal, setDeleteResourceModal] = useState<{
    isOpen: boolean;
    resource: ClassResource | null;
  }>({
    isOpen: false,
    resource: null,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reassignModalStudent, setReassignModalStudent] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    currentLevel: string;
    enrollmentId: string;
    academicYear: string;
  } | null>(null);
  const [studentsView, setStudentsView] = useState<'list' | 'grid'>('grid');
  const [studentsPage, setStudentsPage] = useState(1);
  const [teachersPage, setTeachersPage] = useState(1);

  // Get school ID and type
  const { data: schoolResponse, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const schoolName = schoolResponse?.data?.name;
  const { currentType: schoolType } = useSchoolType();
  const terminology = getTerminology(schoolType || 'SECONDARY');
  const registrationLink =
    schoolId && typeof window !== 'undefined'
      ? `${window.location.origin}/admission/${schoolId}`
      : '';

  // Get class data first (to know the school type for session query)
  const {
    data: classResponse,
    isLoading,
    error,
    refetch: refetchClass,
  } = useGetClassByIdQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId }
  );

  const classData = classResponse?.data;

  // Deep-link from setup checklist: ?tab=curriculum
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;
    const allowed: TabType[] = ['students', 'teachers', 'timetable', 'resources', 'curriculum'];
    if (allowed.includes(tab as TabType)) {
      setActiveTab(tab as TabType);
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete('tab');
    const qs = next.toString();
    router.replace(`/dashboard/school/courses/${classId}${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [searchParams, router, classId]);

  const [showStudentAssignModal, setShowStudentAssignModal] = useState(false);
  const [showStudentAdmissionModal, setShowStudentAdmissionModal] = useState(false);
  const [showRegistrationLinkModal, setShowRegistrationLinkModal] = useState(false);

  // Get active session for timetable - use class's school type
  const { data: sessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: classData?.type || schoolType || undefined },
    { skip: !schoolId || !classData?.type }
  );
  const activeSession = sessionResponse?.data;
  const activeTerm = activeSession?.term;

  // Build tabs array - include Teachers tab only for SECONDARY schools
  // Must be defined before early returns to follow React hooks rules
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = useMemo(() => {
    const baseTabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
      { id: 'students', label: 'Students', icon: <Users className="h-4 w-4" /> },
    ];

    // Add Teachers tab for PRIMARY and SECONDARY schools
    if (classData?.type === 'SECONDARY' || classData?.type === 'PRIMARY') {
      baseTabs.push({ id: 'teachers', label: 'Teachers', icon: <GraduationCap className="h-4 w-4" /> });
    }

    baseTabs.push(
      { id: 'timetable', label: 'Timetable', icon: <Calendar className="h-4 w-4" /> },
      { id: 'resources', label: 'Resources', icon: <FileText className="h-4 w-4" /> },
      { id: 'curriculum', label: 'Curriculum', icon: <ListOrdered className="h-4 w-4" /> }
    );

    return baseTabs;
  }, [classData?.type]);

  // Get class resources
  const { data: resourcesResponse, isLoading: isLoadingResources } = useGetClassResourcesQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId || activeTab !== 'resources' }
  );
  const resources = resourcesResponse?.data || [];

  // Get timetable (also needed for SECONDARY Teachers tab)
  const shouldFetchTimetable = activeTab === 'timetable' || (activeTab === 'teachers' && classData?.type === 'SECONDARY');
  const { data: timetableResponse, isLoading: isLoadingTimetable } = useGetTimetableForClassQuery(
    { schoolId: schoolId!, classId, termId: activeTerm?.id || '' },
    { skip: !schoolId || !classId || !activeTerm?.id || !shouldFetchTimetable }
  );
  const timetable = timetableResponse?.data || [];

  // Extract unique teacher-subject pairs from timetable (for SECONDARY)
  const timetableTeachers = useMemo(() => {
    if (!timetable || timetable.length === 0) return [];

    const teacherSubjectMap = new Map<string, {
      teacherId: string;
      teacherName: string;
      subjects: Map<string, { subjectId: string; subjectName: string; periodCount: number }>;
    }>();

    timetable.forEach((period) => {
      if (!period.teacherId || !period.teacherName) return;
      if (!period.subjectId || !period.subjectName) return;

      if (!teacherSubjectMap.has(period.teacherId)) {
        teacherSubjectMap.set(period.teacherId, {
          teacherId: period.teacherId,
          teacherName: period.teacherName,
          subjects: new Map(),
        });
      }

      const teacherData = teacherSubjectMap.get(period.teacherId)!;
      if (!teacherData.subjects.has(period.subjectId)) {
        teacherData.subjects.set(period.subjectId, {
          subjectId: period.subjectId,
          subjectName: period.subjectName,
          periodCount: 0,
        });
      }
      teacherData.subjects.get(period.subjectId)!.periodCount++;
    });

    // Convert to array
    return Array.from(teacherSubjectMap.values()).map((teacher) => ({
      teacherId: teacher.teacherId,
      firstName: teacher.teacherName.split(' ')[0],
      lastName: teacher.teacherName.split(' ').slice(1).join(' ') || 'Teacher',
      subjects: Array.from(teacher.subjects.values()),
      totalPeriods: Array.from(teacher.subjects.values()).reduce((sum, s) => sum + s.periodCount, 0),
    })).sort((a, b) => b.totalPeriods - a.totalPeriods);
  }, [timetable]);

  // Group teachers by role
  const teachersByRole = {
    formTeachers: classData?.teachers.filter((t) => t.isPrimary) || [],
    subjectTeachers: classData?.teachers.filter((t) => !t.isPrimary && t.subject) || [],
    otherTeachers: classData?.teachers.filter((t) => !t.isPrimary && !t.subject) || [],
  };

  // For PRIMARY schools, only allow one form teacher
  const hasFormTeacher = teachersByRole.formTeachers.length > 0;
  const canAssignTeacher = schoolType !== 'PRIMARY' || !hasFormTeacher;

  // Unified list of all unique teachers for the Teachers tab
  const unifiedTeachers = useMemo(() => {
    const teacherMap = new Map<string, any>();
    
    // 1. Add form teachers
    teachersByRole.formTeachers.forEach(t => {
      teacherMap.set(t.teacherId, { ...t, roleLabel: 'Form' });
    });
    
    // 2. Add timetable teachers
    timetableTeachers.forEach(t => {
      if (!teacherMap.has(t.teacherId)) {
        teacherMap.set(t.teacherId, {
          teacherId: t.teacherId,
          firstName: t.firstName,
          lastName: t.lastName,
          subjects: t.subjects.map(s => s.subjectName).join(', '),
          roleLabel: 'Subject'
        });
      } else {
        // Merge subjects if already exists (as form teacher)
        const existing = teacherMap.get(t.teacherId);
        if (!existing.subject) {
          existing.subject = t.subjects.map(s => s.subjectName).join(', ');
        }
      }
    });

    // 3. Add other subject teachers (legacy/manual)
    teachersByRole.subjectTeachers.forEach(t => {
      if (!teacherMap.has(t.teacherId)) {
        teacherMap.set(t.teacherId, { ...t, roleLabel: 'Subject' });
      }
    });

    // 4. Add other teachers
    teachersByRole.otherTeachers.forEach(t => {
      if (!teacherMap.has(t.teacherId)) {
        teacherMap.set(t.teacherId, { ...t, roleLabel: 'Staff' });
      }
    });

    return Array.from(teacherMap.values());
  }, [teachersByRole, timetableTeachers]);

  const paginatedTeachers = useMemo(() => {
    const start = (teachersPage - 1) * 9;
    return unifiedTeachers.slice(start, start + 9);
  }, [unifiedTeachers, teachersPage]);

  const teacherTotalPages = Math.ceil(unifiedTeachers.length / 9) || 1;

  // Get students in class
  const { data: studentsResponse, isLoading: isLoadingStudents } = useGetClassStudentsQuery(
    { schoolId: schoolId!, classId },
    { skip: !schoolId || !classId || activeTab !== 'students' }
  );
  // Dedupe by student id — API may historically return one row per term enrollment
  const students = useMemo(() => {
    const items = studentsResponse?.data || [];
    const seen = new Set<string>();
    return items.filter((s) => {
      if (!s?.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [studentsResponse?.data]);

  // Mutations
  const [removeTeacher, { isLoading: isRemoving }] = useRemoveTeacherFromClassMutation();
  const [uploadResource, { isLoading: isUploading }] = useUploadClassResourceMutation();
  const [deleteResource, { isLoading: isDeletingResource }] = useDeleteClassResourceMutation();

  const handleRemoveTeacher = async () => {
    if (!removeModal.teacher || !schoolId) return;

    try {
      await removeTeacher({
        schoolId,
        classId,
        teacherId: removeModal.teacher.teacherId,
        subject: removeModal.teacher.subject || undefined,
      }).unwrap();

      toast.success(
        `${removeModal.teacher.firstName} ${removeModal.teacher.lastName} removed from ${classData?.name}`
      );
      setRemoveModal({ isOpen: false, teacher: null });
      refetchClass();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove teacher');
    }
  };

  const handleFileUpload = async (file: File, description?: string) => {
    if (!schoolId) throw new Error('School not found');

    await uploadResource({
      schoolId,
      classId,
      file,
      description: description || file.name,
    }).unwrap();
    toast.success('Resource uploaded successfully');
  };

  const handleDeleteResource = async () => {
    if (!deleteResourceModal.resource || !schoolId) return;

    try {
      await deleteResource({
        schoolId,
        classId,
        resourceId: deleteResourceModal.resource.id,
      }).unwrap();
      toast.success('Resource deleted successfully');
      setDeleteResourceModal({ isOpen: false, resource: null });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete resource');
    }
  };

  // Group timetable by time slots
  const timetableByTimeSlot = timetable.reduce((acc: Record<string, TimetablePeriod[]>, period) => {
    const key = `${period.startTime}-${period.endTime}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(period);
    return acc;
  }, {});

  const timeSlots = Object.keys(timetableByTimeSlot).sort();

  // Loading state
  if (isLoading || isLoadingSchool) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium animate-pulse">
            Loading class details...
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  // Error state
  if (error || !classData) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="p-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
            <AlertCircle className="h-5 w-5" />
            <span>Class not found</span>
          </div>
          <BackButton fallbackUrl="/dashboard/school/courses" />
        </div>
      </ProtectedRoute>
    );
  }

  const pageSizeList = 12;
  const pageSizeGrid = 9; // 3 columns * 3 rows
  const pageSize = studentsView === 'grid' ? pageSizeGrid : pageSizeList;
  const totalPages = Math.max(1, Math.ceil((students?.length || 0) / pageSize));
  const paginatedStudents = students.slice((studentsPage - 1) * pageSize, studentsPage * pageSize);

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-6">
          {/* Back Button */}
          <Link
            href="/dashboard/school/courses"
            className="inline-flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors"
            style={{ fontSize: 'var(--text-body)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Link>

          {/* Class Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Class Icon */}
              <div className="w-12 h-12 rounded-lg bg-[var(--avatar-placeholder-bg)] flex items-center justify-center shadow-lg flex-shrink-0 text-[var(--avatar-placeholder-text)]">
                <BookOpen className="h-6 w-6" />
              </div>

              {/* Class Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
                    {classData.name}
                  </h1>
                  <span className={`px-2.5 py-1 rounded-full font-medium ${classData.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`} style={{ fontSize: 'var(--text-small)' }}>
                    {classData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Class Details */}
                <div className="flex flex-wrap items-center gap-6 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {classData.classLevel || 'N/A'} • {classData.academicYear || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 flex-shrink-0" />
                    {classData.type === 'PRIMARY' ? (
                      teachersByRole.formTeachers.length > 0 ? (
                        <>
                          <Link
                            href={`/dashboard/school/staff/${teachersByRole.formTeachers[0].teacherId}`}
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {teachersByRole.formTeachers[0].firstName} {teachersByRole.formTeachers[0].lastName}
                          </Link>
                          <PermissionGate resource={PermissionResource.CLASSES} type={PermissionType.WRITE}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRemoveModal({ isOpen: true, teacher: teachersByRole.formTeachers[0] });
                              }}
                              title="Unassign teacher from this class"
                              className="ml-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-light-text-muted dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5 text-red-500" />
                            </button>
                          </PermissionGate>
                        </>
                      ) : classData.teachers.length > 0 ? (
                        <>
                          <Link
                            href={`/dashboard/school/staff/${classData.teachers[0].teacherId}`}
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {classData.teachers[0].firstName} {classData.teachers[0].lastName}
                          </Link>
                          <PermissionGate resource={PermissionResource.CLASSES} type={PermissionType.WRITE}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRemoveModal({ isOpen: true, teacher: classData.teachers[0] });
                              }}
                              title="Unassign teacher from this class"
                              className="ml-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-light-text-muted dark:text-dark-text-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                              <UserX className="h-3.5 w-3.5" />
                            </button>
                          </PermissionGate>
                        </>
                      ) : (
                        <>
                          <span className="italic">No teacher assigned</span>
                        </>
                      )
                    ) : classData.type === 'SECONDARY' ? (
                      teachersByRole.formTeachers.length > 0 ? (
                        <>
                          <Link
                            href={`/dashboard/school/staff/${teachersByRole.formTeachers[0].teacherId}`}
                            className="font-medium hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                          >
                            {teachersByRole.formTeachers[0].firstName} {teachersByRole.formTeachers[0].lastName}
                          </Link>
                        </>
                      ) : (
                        <>
                          <span className="italic">No form teacher assigned</span>
                        </>
                      )
                    ) : (
                      <>
                        {classData.teachers.length > 0 ? (
                          <span>{classData.teachers.length} lecturer{classData.teachers.length !== 1 ? 's' : ''} assigned</span>
                        ) : (
                          <>
                            <span className="italic">No lecturer assigned</span>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>{classData.studentsCount || 0} student{(classData.studentsCount || 0) !== 1 ? 's' : ''} enrolled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <PermissionGate resource={PermissionResource.CLASSES} type={PermissionType.WRITE}>
              <div className="flex items-center gap-2">
                {classData.type === 'PRIMARY' && !hasFormTeacher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 h-8 text-xs"
                      onClick={() => setShowAssignModal(true)}
                    >
                      Assign Primary Teacher
                    </Button>
                  )}
                <Button variant="ghost" size="sm" className="flex items-center gap-2 h-8 text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit Class
                </Button>
              </div>
            </PermissionGate>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-light-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap text-xs ${activeTab === tab.id
                    ? 'border-b-2 border-[#2490FD] dark:border-[#2490FD] text-[#2490FD] dark:text-[#2490FD]'
                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                    }`}
                  style={{ fontSize: 'var(--text-small)' }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === 'students' && (
              <ViewToggle
                value={studentsView}
                onChange={(mode) => {
                  setStudentsView(mode);
                  setStudentsPage(1);
                }}
              />
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                    Students in Class
                  </p>
                </div>
                <PermissionGate resource={PermissionResource.STUDENTS} type={PermissionType.WRITE}>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs border border-light-border dark:border-dark-border"
                      onClick={() => setShowStudentAssignModal(true)}
                    >
                      Assign Existing
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setShowStudentAdmissionModal(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Admit New
                    </Button>
                  </div>
                </PermissionGate>
              </div>

              {/* Content */}
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                </div>
              ) : students.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <EmptyStateIcon type="person_outline" />
                    <p className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-card-title)' }}>
                      No students enrolled yet
                    </p>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 max-w-md mx-auto" style={{ fontSize: 'var(--text-body)' }}>
                      This class is currently empty. Start by adding new students directly to this class.
                    </p>
                  </CardContent>
                </Card>
              ) : studentsView === 'list' ? (
                <Card>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-light-border dark:border-dark-border">
                            <th className="text-left py-3 px-4 font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                              Student
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                              Student ID
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                              Class Level
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                              Status
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider" style={{ fontSize: 'var(--text-small)' }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStudents.map((student) => (
                            <tr
                              key={student.id}
                              className="border-b border-light-border dark:border-dark-border hover:bg-light-surface dark:hover:bg-dark-bg transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[var(--avatar-placeholder-bg)] flex items-center justify-center flex-shrink-0 text-[var(--avatar-placeholder-text)] font-medium" style={{ fontSize: 'var(--text-small)' }}>
                                    {student.profileImage ? (
                                      <img
                                        src={student.profileImage}
                                        alt=""
                                        className="w-9 h-9 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span>
                                        {student.firstName?.[0]}{student.lastName?.[0]}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <Link
                                      href={`/dashboard/school/students/${student.id}`}
                                      className="font-medium text-light-text-primary dark:text-dark-text-primary hover:text-blue-600 dark:hover:text-blue-400"
                                    >
                                      {student.firstName} {student.lastName}
                                    </Link>
                                    {student.user?.email && (
                                      <p className="text-light-text-muted dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                                        {student.user.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                                  {student.uid || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                                  {student.enrollment?.classLevel || '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${student.user?.accountStatus === 'ACTIVE' || !student.user?.accountStatus
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}
                                  style={{ fontSize: 'var(--text-small)' }}
                                >
                                  {student.user?.accountStatus || 'Active'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Link href={`/dashboard/school/students/${student.id}`}>
                                  <Button variant="ghost" size="sm" className="text-xs h-8">
                                    View
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pt-4 flex items-center justify-between">
                      <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                        Total: {students.length} student{students.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={studentsPage <= 1}
                          onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                          className="h-8 text-xs"
                        >
                          Prev
                        </Button>
                        <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                          Page {studentsPage} / {totalPages}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={studentsPage >= totalPages}
                          onClick={() => setStudentsPage((p) => Math.min(totalPages, p + 1))}
                          className="h-8 text-xs"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedStudents.map((student) => (
                      <Card
                        key={student.id}
                        className="cursor-pointer hover:bg-light-surface dark:hover:bg-dark-bg hover:shadow-lg transition-all"
                        onClick={() => router.push(`/dashboard/school/students/${student.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-full bg-[var(--avatar-placeholder-bg)] flex items-center justify-center flex-shrink-0 text-[var(--avatar-placeholder-text)] font-medium border-2 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                {student.profileImage ? (
                                  <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm">{student.firstName?.[0]}{student.lastName?.[0]}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-light-text-primary dark:text-white truncate text-base">
                                  {student.firstName} {student.lastName}
                                </p>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium text-[10px] ${student.user?.accountStatus === 'ACTIVE' || !student.user?.accountStatus
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                        }`}
                                    >
                                      {student.user?.accountStatus || 'Active'}
                                    </span>
                                    <span className="text-light-text-secondary dark:text-dark-text-secondary text-[10px] font-mono">
                                      {student.uid || 'No ID'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                                    {student.enrollment?.classLevel || '-'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Grid Pagination */}
                  <div className="flex items-center justify-between pt-6 mt-2">
                    <span className="text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-small)' }}>
                      Total: {students.length} student{students.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={studentsPage <= 1}
                        onClick={() => setStudentsPage((p) => Math.max(1, p - 1))}
                        className="h-8 text-xs"
                      >
                        Prev
                      </Button>
                      <span className="text-light-text-muted dark:text-dark-text-muted text-xs">
                        Page {studentsPage} / {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={studentsPage >= totalPages}
                        onClick={() => setStudentsPage((p) => Math.min(totalPages, p + 1))}
                        className="h-8 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Teachers Tab (PRIMARY and SECONDARY schools) */}
          {activeTab === 'teachers' && (classData.type === 'SECONDARY' || classData.type === 'PRIMARY') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h3 className="font-black text-light-text-primary dark:text-dark-text-primary uppercase tracking-tight font-heading" style={{ fontSize: 'var(--text-section-title)' }}>
                    Assigned Teachers
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  {(classData.type === 'PRIMARY' || (classData.type === 'SECONDARY' && !hasFormTeacher)) && (
                    <PermissionGate resource={PermissionResource.CLASSES} type={PermissionType.WRITE}>
                      <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)} className="h-8 text-xs">
                        <Plus className="h-3 w-3 mr-2" />
                        Assign {classData.type === 'PRIMARY' ? 'Primary' : 'Form'} Teacher
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
              {isLoadingTimetable ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : unifiedTeachers.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <EmptyStateIcon type="person_outline" />
                    <p className="font-black text-light-text-primary dark:text-dark-text-primary mb-2 uppercase" style={{ fontSize: 'var(--text-card-title)' }}>
                      No teachers assigned yet
                    </p>
                    <p className="text-light-text-muted dark:text-dark-text-muted font-bold font-heading max-w-md mx-auto" style={{ fontSize: 'var(--text-body)' }}>
                      {classData.type === 'SECONDARY' 
                        ? 'Teachers represent those assigned via the timetable or manually as form teachers.'
                        : 'Assign a primary teacher to lead this class.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-light-border dark:divide-dark-border">
                        {paginatedTeachers.map((teacher) => (
                          <TeacherCard
                            key={teacher.teacherId}
                            teacher={teacher}
                            isPrimary={teachersByRole.formTeachers.some(ft => ft.teacherId === teacher.teacherId)}
                            onRemove={() => setRemoveModal({ isOpen: true, teacher })}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pagination */}
                  {teacherTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-widest font-heading">
                        Showing {(teachersPage - 1) * 9 + 1} to {Math.min(teachersPage * 9, unifiedTeachers.length)} of {unifiedTeachers.length} Teachers
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={teachersPage === 1}
                          onClick={() => setTeachersPage(p => Math.max(1, p - 1))}
                          className="h-8 w-8 p-0"
                        >
                          &lt;
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: teacherTotalPages }, (_, i) => i + 1).map((p) => (
                            <Button
                              key={p}
                              variant={teachersPage === p ? 'primary' : 'ghost'}
                              size={null as any}
                              onClick={() => setTeachersPage(p)}
                              className={cn(
                                "h-8 w-8 p-0 text-xs font-black rounded-lg transition-all",
                                teachersPage === p 
                                  ? "bg-agora-blue text-white shadow-lg shadow-blue-500/20" 
                                  : "text-light-text-muted dark:text-dark-text-muted hover:bg-light-surface dark:hover:bg-dark-surface/50"
                              )}
                            >
                              {p}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={teachersPage === teacherTotalPages}
                          onClick={() => setTeachersPage(p => Math.min(teacherTotalPages, p + 1))}
                          className="h-8 w-8 p-0"
                        >
                          &gt;
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Timetable Tab */}
          {activeTab === 'timetable' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Class Timetable</CardTitle>
                  </div>
                  <PermissionGate resource={PermissionResource.TIMETABLES} type={PermissionType.WRITE}>
                    <Link href={`/dashboard/school/timetables?class=${classId}`}>
                      <Button variant="primary" size="sm" className="h-8 text-xs">
                        Edit Timetable
                      </Button>
                    </Link>
                  </PermissionGate>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTimetable ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : !activeTerm ? (
                  <div className="text-center py-12">
                    <EmptyStateIcon type="statistics" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                      No active term. Please set up an academic session first.
                    </p>
                  </div>
                ) : timetable.length === 0 ? (
                  <div className="text-center py-12">
                    <EmptyStateIcon type="statistics" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                      No timetable set up for this class yet.
                    </p>
                    <PermissionGate resource={PermissionResource.TIMETABLES} type={PermissionType.WRITE}>
                      <Link href={`/dashboard/school/timetables?class=${classId}`}>
                        <Button variant="primary" size="sm" className="text-xs">
                          <Plus className="h-3 w-3 mr-2" />
                          Create Timetable
                        </Button>
                      </Link>
                    </PermissionGate>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-xs font-semibold text-light-text-muted dark:text-dark-text-muted border-b border-light-border dark:border-dark-border">
                            Time
                          </th>
                          {DAY_SHORT.map((day, idx) => (
                            <th key={day} className="p-2 text-center text-xs font-semibold text-light-text-muted dark:text-dark-text-muted border-b border-light-border dark:border-dark-border">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map((slot) => {
                          const [start, end] = slot.split('-');
                          return (
                            <tr key={slot}>
                              <td className="p-2 text-xs text-light-text-secondary dark:text-dark-text-secondary border-b border-light-border dark:border-dark-border whitespace-nowrap">
                                {start} - {end}
                              </td>
                              {DAYS_OF_WEEK.map((day) => {
                                const period = timetableByTimeSlot[slot]?.find((p) => p.dayOfWeek === day);
                                return (
                                  <td key={day} className="p-1 border-b border-light-border dark:border-dark-border">
                                    {period ? (
                                      <div className={`p-2 rounded text-xs ${period.type === 'BREAK' || period.type === 'LUNCH'
                                        ? 'bg-gray-100 dark:bg-gray-800'
                                        : period.type === 'ASSEMBLY'
                                          ? 'bg-purple-50 dark:bg-purple-900/20'
                                          : period.subjectName || period.courseName
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'bg-green-50 dark:bg-green-900/20'
                                        }`}>
                                        {period.type === 'BREAK' ? (
                                          <span className="text-light-text-muted dark:text-dark-text-muted">Break</span>
                                        ) : period.type === 'LUNCH' ? (
                                          <span className="text-light-text-muted dark:text-dark-text-muted">Lunch</span>
                                        ) : period.type === 'ASSEMBLY' ? (
                                          <span className="text-purple-600 dark:text-purple-400 font-medium">Assembly</span>
                                        ) : (
                                          <>
                                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                                              {period.subjectName || period.courseName || 'Free Period'}
                                            </p>
                                            {period.teacherName && (
                                              <p className="text-light-text-muted dark:text-dark-text-muted truncate">
                                                {period.teacherName}
                                              </p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="h-12" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <CardTitle>Class Resources</CardTitle>
                  </div>
                  <PermissionGate resource={PermissionResource.RESOURCES} type={PermissionType.WRITE}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowUploadModal(true)}
                      className="h-8 text-xs"
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      Upload Resource
                    </Button>
                  </PermissionGate>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingResources ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : resources.length === 0 ? (
                  <div className="text-center py-12">
                    <EmptyStateIcon type="document_not_found" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                      No resources uploaded yet.
                    </p>
                    <PermissionGate resource={PermissionResource.RESOURCES} type={PermissionType.WRITE}>
                      <Button variant="primary" onClick={() => setShowUploadModal(true)} size="sm" className="text-xs">
                        <Upload className="h-3 w-3 mr-2" />
                        Upload First Resource
                      </Button>
                    </PermissionGate>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-center justify-between p-4 border border-light-border dark:border-dark-border rounded-lg hover:bg-light-surface dark:hover:bg-dark-bg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            <File className="h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                          </div>
                          <div>
                            <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                              {resource.name}
                            </p>
                            <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                              {resource.fileSize} • {new Date(resource.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {resource.downloadUrl && (
                            <a href={resource.downloadUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteResourceModal({ isOpen: true, resource })}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <ListOrdered className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  <CardTitle>Curriculum / Scheme of Work</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {schoolId && classData?.classLevelId && activeTerm?.id ? (
                  <SubjectCurriculumList
                    schoolId={schoolId}
                    classLevelId={classData.classLevelId}
                    classLevelName={classData.classLevel || undefined}
                    classId={classId}
                    termId={activeTerm.id}
                    schoolType={classData.type || schoolType || 'SECONDARY'}
                    canEdit={true}
                  />
                ) : (
                  <div className="text-center py-12">
                    <EmptyStateIcon type="document" />
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                      {!activeTerm?.id
                        ? 'No active term. Please set up an academic session first.'
                        : 'Unable to load curriculum data.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modals */}
        {showAssignModal && schoolId && classData?.type && (
          <AssignTeacherToClassModal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            schoolId={schoolId}
            classId={classId}
            className={classData.name}
            schoolType={classData.type as 'PRIMARY' | 'SECONDARY' | 'TERTIARY'}
            existingTeachers={classData.teachers.map((t) => ({
              teacherId: t.teacherId,
              subject: t.subject,
              isPrimary: t.isPrimary,
            }))}
            onSuccess={() => refetchClass()}
          />
        )}

        <ConfirmModal
          isOpen={removeModal.isOpen}
          onClose={() => setRemoveModal({ isOpen: false, teacher: null })}
          onConfirm={handleRemoveTeacher}
          title="Remove Teacher"
          message={
            removeModal.teacher
              ? `Are you sure you want to remove ${removeModal.teacher.firstName} ${removeModal.teacher.lastName}${removeModal.teacher.subject ? ` from teaching ${removeModal.teacher.subject}` : ''
              } from this class?`
              : ''
          }
          confirmText="Remove"
          variant="danger"
          isLoading={isRemoving}
        />

        <ConfirmModal
          isOpen={deleteResourceModal.isOpen}
          onClose={() => setDeleteResourceModal({ isOpen: false, resource: null })}
          onConfirm={handleDeleteResource}
          title="Delete Resource"
          message={
            deleteResourceModal.resource
              ? `Are you sure you want to delete "${deleteResourceModal.resource.name}"? This action cannot be undone.`
              : ''
          }
          confirmText="Delete"
          variant="danger"
          isLoading={isDeletingResource}
        />

        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleFileUpload}
          title="Upload Class Resource"
          isUploading={isUploading}
        />

        <StudentReassignModal
          isOpen={!!reassignModalStudent}
          onClose={() => setReassignModalStudent(null)}
          student={reassignModalStudent}
          schoolId={params.id as string}
          schoolType={classData.type || 'SECONDARY'}
        />

        <StudentAssignToClassModal
          isOpen={showStudentAssignModal}
          onClose={() => setShowStudentAssignModal(false)}
          schoolId={schoolId as string}
          targetClassId={classData.id}
          targetClassArmId={classData.classArmId ?? ''}
          targetClassName={classData.name}
          targetLevelName={classData.classLevel || ''}
          academicYear={classData.academicYear}
        />

        <StudentAdmissionModal
          isOpen={showStudentAdmissionModal}
          onClose={() => setShowStudentAdmissionModal(false)}
          onRequestShareRegistrationLink={() => setShowRegistrationLinkModal(true)}
          preSelectedClassLevel={classData.classLevelId}
          preSelectedClassArmId={classData.classArmId}
        />

        <ShareRegistrationLinkModal
          isOpen={showRegistrationLinkModal}
          onClose={() => setShowRegistrationLinkModal(false)}
          url={registrationLink}
          title="Share Registration Link"
          description="Send this registration link to parents and guardians so they can submit student applications online."
          shareMessage={
            schoolName
              ? `Hello, you can complete your child${"'"}s registration for ${schoolName} using the link below.`
              : 'Hello, you can complete your child\'s registration using the link below.'
          }
          shareMessageLabel="Message to share"
          emailSubject="Student registration link"
          copySuccessMessage="Registration link copied to clipboard"
        />
      </div>
    </ProtectedRoute>
  );
}

// Teacher Card Component
function TeacherCard({
  teacher,
  isPrimary = false,
  onRemove,
}: {
  teacher: any;
  isPrimary?: boolean;
  onRemove: () => void;
}) {
  return (
    <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="w-full">
      <div className="flex items-center justify-between p-4 hover:bg-light-surface dark:hover:bg-dark-surface/30 transition-colors group">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--avatar-placeholder-bg)] flex items-center justify-center text-[var(--avatar-placeholder-text)] font-black transition-transform group-hover:scale-105 shadow-inner">
            <span>
              {(teacher.firstName?.[0] || 'T')}{(teacher.lastName?.[0] || 'T')}
            </span>
          </div>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/school/staff/${teacher.teacherId}`}
                className="font-black text-light-text-primary dark:text-dark-text-primary hover:text-agora-blue transition-colors uppercase tracking-tight"
                style={{ fontSize: 'var(--text-small)' }}
              >
                {teacher.firstName} {teacher.lastName}
              </Link>
              {isPrimary && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-[0.1em] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
                  <Crown className="h-2.5 w-2.5" />
                  Form
                </span>
              )}
            </div>
            
            <p className="text-light-text-secondary dark:text-dark-text-secondary font-bold" style={{ fontSize: 'var(--text-tiny)' }}>
              {teacher.subjects || teacher.subject || 'Staff Member'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link 
             href={`/dashboard/school/staff/${teacher.teacherId}`}
             className="p-2 text-light-text-muted hover:text-agora-blue transition-colors rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg"
           >
             <User className="h-4 w-4" />
          </Link>
          <PermissionGate resource={PermissionResource.CLASSES} type={PermissionType.WRITE}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-9 w-9 p-0 rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
      </div>
    </FadeInUp>
  );
}
