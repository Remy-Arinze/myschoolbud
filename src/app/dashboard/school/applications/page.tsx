'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { ShareRegistrationLinkModal } from '@/components/modals/ShareRegistrationLinkModal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  Copy,
  Key,
  ArrowDown,
  ArrowUp,
  Loader2,
  GraduationCap,
  Trash2,
  X,
  Award,
  AlertCircle,
  HeartPulse,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetStudentsQuery,
  useGenerateTacMutation,
  useGetOutgoingTransfersQuery,
  useGetTransferHistoricalGradesQuery,
  useRevokeTacMutation,
  useInitiateTransferMutation,
  useGetRecentlyAcceptedTransfersQuery,
  useCompleteTransferMutation,
  useRejectTransferMutation,
  useGetClassesQuery,
  useGetAdmissionApplicationsQuery,
  useApproveAdmissionApplicationMutation,
  useRejectAdmissionApplicationMutation,
} from '@/lib/store/api/schoolAdminApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import toast from 'react-hot-toast';

// Component to display historical grades modal
function HistoricalGradesModal({
  schoolId,
  transferId,
  onClose,
}: {
  schoolId: string;
  transferId: string;
  onClose: () => void;
}) {
  const { data: gradesResponse, isLoading, error, isError } = useGetTransferHistoricalGradesQuery(
    { schoolId, transferId },
    {
      skip: !schoolId || !transferId,
      // Refetch when modal opens
      refetchOnMountOrArgChange: true,
    }
  );

  const historicalData = gradesResponse?.data;

  // Debug logging
  useEffect(() => {
    console.log('HistoricalGradesModal - schoolId:', schoolId, 'transferId:', transferId);
    console.log('HistoricalGradesModal - isLoading:', isLoading, 'isError:', isError);
    if (error) {
      console.error('Error loading historical grades:', error);
      if ('data' in error) {
        console.error('Error data:', (error as any).data);
      }
      if ('status' in error) {
        console.error('Error status:', (error as any).status);
      }
    }
    if (gradesResponse) {
      console.log('Historical grades response:', gradesResponse);
      console.log('Historical data:', historicalData);
    }
  }, [error, gradesResponse, isLoading, isError, schoolId, transferId, historicalData]);

  return (
    <Modal isOpen={true} onClose={onClose} title="Historical Academic Records" size="xl">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="ml-3 text-light-text-secondary dark:text-dark-text-secondary">
              Loading historical records...
            </span>
          </div>
        ) : historicalData ? (
          <>
            <Alert variant="info">
              <div className="flex items-start gap-2">
                <Award className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Historical Academic Records</p>
                  <p className="text-sm">
                    These are the academic records from when this student was enrolled in your school. The student has since been transferred.
                  </p>
                </div>
              </div>
            </Alert>

            {/* Student Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Full Name</p>
                    <p className="font-medium text-base">
                      {historicalData.student?.firstName}{' '}
                      {historicalData.student?.middleName}{' '}
                      {historicalData.student?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Student ID (UID)</p>
                    <p className="font-medium text-base">{historicalData.student?.uid}</p>
                  </div>
                  <div>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Transfer Completed</p>
                    <p className="font-medium text-base text-blue-600 dark:text-blue-400">
                      {historicalData.transfer?.completedAt
                        ? new Date(historicalData.transfer.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Academic Records Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Academic Records
                  <span className="text-sm font-normal text-light-text-secondary dark:text-dark-text-secondary">
                    ({historicalData.enrollments?.reduce((sum: number, e: any) => sum + (e.grades?.length || 0), 0) || 0} total records)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransferEnrollmentsDisplay
                  enrollments={historicalData.enrollments}
                  grades={[]}
                />
              </CardContent>
            </Card>

            {/* Action Button */}
            <div className="flex justify-end pt-2 border-t border-light-border dark:border-dark-border">
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        ) : isError || error ? (
          <div className="text-center py-8">
            <Alert variant="error">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Error Loading Historical Records</p>
                  <p className="text-sm">
                    {error && 'data' in error
                      ? (error.data as any)?.message || 'Failed to load historical records'
                      : error && 'status' in error
                        ? `Error ${(error as any).status}: Failed to load historical records`
                        : 'Failed to load historical records. Please try again.'}
                  </p>
                  <p className="text-xs mt-2 text-light-text-muted dark:text-dark-text-muted">
                    Transfer ID: {transferId} | School ID: {schoolId}
                  </p>
                </div>
              </div>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-8">
            <EmptyStateIcon type="document_not_found" />
            <p className="text-light-text-secondary dark:text-dark-text-secondary">
              No historical records found for this transfer
            </p>
            <p className="text-xs mt-2 text-light-text-muted dark:text-dark-text-muted">
              This might occur if the student had no grades recorded during their enrollment.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Component to display enrollments with collapsible class levels
function TransferEnrollmentsDisplay({ enrollments, grades }: { enrollments?: any[]; grades?: any[] }) {
  const [expandedEnrollments, setExpandedEnrollments] = useState<Set<string>>(new Set());

  // Use enrollments if available, otherwise fall back to grouping grades by class level
  const enrollmentsData = useMemo(() => {
    if (enrollments && enrollments.length > 0) {
      return enrollments;
    }
    // Fallback: if no enrollments, try to group grades by academic year and class level
    if (grades && grades.length > 0) {
      const grouped: Record<string, any> = {};
      grades.forEach((grade: any) => {
        const key = `${grade.academicYear || 'Unknown'}_${grade.term || 'Unknown'}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            classLevel: grade.enrollment?.classLevel || 'Unknown Class',
            academicYear: grade.academicYear || 'Unknown',
            enrollmentDate: grade.createdAt,
            isActive: false,
            grades: [],
          };
        }
        grouped[key].grades.push(grade);
      });
      return Object.values(grouped);
    }
    return [];
  }, [enrollments, grades]);

  // Calculate cumulative score for an enrollment
  const calculateCumulativeScore = (enrollmentGrades: any[]) => {
    if (enrollmentGrades.length === 0) return { percentage: 0, totalScore: 0, totalMaxScore: 0 };

    const totalScore = enrollmentGrades.reduce((sum, g) => sum + (g.score || 0), 0);
    const totalMaxScore = enrollmentGrades.reduce((sum, g) => sum + (g.maxScore || 0), 0);
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

    return { percentage, totalScore, totalMaxScore };
  };

  const toggleEnrollment = (enrollmentId: string) => {
    const newExpanded = new Set(expandedEnrollments);
    if (newExpanded.has(enrollmentId)) {
      newExpanded.delete(enrollmentId);
    } else {
      newExpanded.add(enrollmentId);
    }
    setExpandedEnrollments(newExpanded);
  };

  const gradeTypeLabels: Record<string, string> = {
    CA: 'Continuous Assessment',
    ASSIGNMENT: 'Assignments',
    EXAM: 'Examinations',
  };

  if (enrollmentsData.length === 0) {
    return (
      <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
        <p>No academic records available for this student.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {enrollmentsData.map((enrollment: any) => {
        const isExpanded = expandedEnrollments.has(enrollment.id);
        const cumulative = calculateCumulativeScore(enrollment.grades || []);
        const gradeCount = enrollment.grades?.length || 0;

        // Group grades by type for display
        const groupedGrades: Record<string, any[]> = {};
        (enrollment.grades || []).forEach((grade: any) => {
          const type = grade.gradeType || 'CA';
          if (!groupedGrades[type]) {
            groupedGrades[type] = [];
          }
          groupedGrades[type].push(grade);
        });

        return (
          <div
            key={enrollment.id}
            className="border border-light-border dark:border-dark-border rounded-lg overflow-hidden"
          >
            {/* Collapsible Header */}
            <button
              onClick={() => toggleEnrollment(enrollment.id)}
              className="w-full bg-light-surface dark:bg-dark-surface px-4 py-4 hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 text-left">
                <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  <ArrowDown className="h-4 w-4 text-light-text-secondary dark:text-dark-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-base text-light-text-primary dark:text-dark-text-primary truncate">
                    {enrollment.classLevel || 'Unknown Class'}
                  </h4>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-0.5 truncate">
                    {enrollment.academicYear || 'Unknown Year'}
                    {enrollment.isActive && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                        Active
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                {/* Cumulative Score */}
                <div className="text-right hidden xs:block">
                  <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase">Cumulative</p>
                  <p className="text-base sm:text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                    {cumulative.percentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase">Records</p>
                  <p className="text-base sm:text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                    {gradeCount}
                  </p>
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-light-border dark:border-dark-border bg-white dark:bg-gray-900">
                <div className="p-4 space-y-6">
                  {Object.keys(groupedGrades).length === 0 ? (
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary text-center py-4">
                      No grades available for this class level.
                    </p>
                  ) : (
                    Object.entries(groupedGrades).map(([gradeType, typeGrades]) => (
                      <div key={gradeType} className="border border-light-border dark:border-dark-border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-light-border dark:border-dark-border">
                          <h5 className="font-medium text-sm flex items-center justify-between">
                            <span>{gradeTypeLabels[gradeType] || gradeType}</span>
                            <span className="text-xs font-normal text-light-text-secondary dark:text-dark-text-secondary">
                              {typeGrades.length} {typeGrades.length === 1 ? 'record' : 'records'}
                            </span>
                          </h5>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-light-surface dark:bg-dark-surface">
                              <tr>
                                <th className="text-left py-2 px-4 font-semibold text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  Subject
                                </th>
                                <th className="text-left py-2 px-4 font-semibold text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  Assessment
                                </th>
                                <th className="text-left py-2 px-4 font-semibold text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  Score
                                </th>
                                <th className="text-left py-2 px-4 font-semibold text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  Term
                                </th>
                                <th className="text-left py-2 px-4 font-semibold text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  Academic Year
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {typeGrades.map((grade: any, idx: number) => (
                                <tr
                                  key={grade.id || idx}
                                  className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <td className="py-2 px-4 font-medium text-sm">
                                    {grade.subject && grade.subject !== 'N/A' ? grade.subject : (
                                      <span className="text-light-text-muted dark:text-dark-text-muted italic">
                                        Not specified
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-sm">
                                    {grade.assessmentName || (grade.sequence ? `${gradeType} ${grade.sequence}` : gradeType)}
                                  </td>
                                  <td className="py-2 px-4">
                                    <span className="font-medium text-sm">
                                      {grade.score}/{grade.maxScore}
                                    </span>
                                    {grade.grade && (
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                        {grade.grade}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-4 text-sm">{grade.term || 'N/A'}</td>
                                  <td className="py-2 px-4 text-sm">{grade.academicYear || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAcceptTransferModal, setShowAcceptTransferModal] = useState(false);
  const [showGenerateTacModal, setShowGenerateTacModal] = useState(false);
  const [showTacDisplayModal, setShowTacDisplayModal] = useState<{
    tac: string;
    studentId: string;
    studentName: string;
    expiresAt: string;
  } | null>(null);
  const [showTransferPreview, setShowTransferPreview] = useState<any>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [showApproveApplicationModal, setShowApproveApplicationModal] = useState<any | null>(null);
  const [showHistoricalGradesModal, setShowHistoricalGradesModal] = useState<string | null>(null);
  const [showRegistrationLinkModal, setShowRegistrationLinkModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [tacFormData, setTacFormData] = useState({ tac: '', studentId: '' });
  const [completeFormData, setCompleteFormData] = useState({
    targetClassLevel: '',
    academicYear: '',
    classId: '',
    classArmId: '',
  });
  const [expandedAcceptedIds, setExpandedAcceptedIds] = useState<Set<string>>(new Set());

  // Get school ID
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const schoolName = schoolResponse?.data?.name;
  const registrationLink =
    schoolId && typeof window !== 'undefined'
      ? `${window.location.origin}/admission/${schoolId}`
      : '';

  // Get school type
  const { currentType } = useSchoolType();

  // Get students for TAC generation
  const { data: studentsResponse } = useGetStudentsQuery(
    { schoolId: schoolId!, page: 1, limit: 100, schoolType: currentType || undefined },
    { skip: !schoolId }
  );
  const students = studentsResponse?.data?.items || [];

  // Get classes for transfer/application approval
  const { data: classesResponse } = useGetClassesQuery(
    { schoolId: schoolId!, type: currentType || undefined },
    { skip: !schoolId }
  );
  const classes = classesResponse?.data || [];

  // Real class levels from this school's arms/classes (not hardcoded Basic/JSS1 labels)
  const availableClassLevels = useMemo(() => {
    const levels = new Set<string>();
    for (const c of classes) {
      if (c.classLevel) levels.add(c.classLevel);
    }
    return Array.from(levels).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classes]);

  // Outgoing transfers
  const { data: outgoingResponse, refetch: refetchOutgoing } = useGetOutgoingTransfersQuery(
    { schoolId: schoolId!, page: 1, limit: 50, schoolType: currentType || undefined },
    { skip: !schoolId }
  );
  const outgoingTransfers = outgoingResponse?.data?.transfers || [];

  // Recently accepted (completed) transfers to this school
  const { data: recentlyAcceptedResponse, refetch: refetchRecentlyAccepted, isLoading: isLoadingRecentlyAccepted } = useGetRecentlyAcceptedTransfersQuery(
    { schoolId: schoolId!, page: 1, limit: 50 },
    { skip: !schoolId || activeTab !== 'incoming' }
  );
  const recentlyAcceptedItems = recentlyAcceptedResponse?.data?.items ?? [];

  // Admission applications
  const { data: applicationsResponse, refetch: refetchApplications, isLoading: isLoadingApplications } = useGetAdmissionApplicationsQuery(
    { schoolId: schoolId!, status: 'PENDING' },
    { skip: !schoolId || activeTab !== 'incoming' }
  );
  const admissionApplications = applicationsResponse?.data || [];

  // Mutations
  const [generateTac, { isLoading: isGeneratingTac }] = useGenerateTacMutation();
  const [revokeTac, { isLoading: isRevoking }] = useRevokeTacMutation();
  const [initiateTransfer, { isLoading: isInitiating }] = useInitiateTransferMutation();
  const [completeTransfer, { isLoading: isCompleting }] = useCompleteTransferMutation();
  const [rejectTransfer, { isLoading: isRejecting }] = useRejectTransferMutation();
  const [approveApplication, { isLoading: isApprovingApp }] = useApproveAdmissionApplicationMutation();
  const [rejectApplication, { isLoading: isRejectingApp }] = useRejectAdmissionApplicationMutation();

  // Combined incoming list (transfers + applications)
  const combinedIncoming = useMemo(() => {
    const apps = (admissionApplications || []).map((app: any) => ({
      ...app,
      type: 'APPLICATION',
    }));
    const transfers = (recentlyAcceptedItems || []).map((item: any) => ({
      ...item,
      type: 'TRANSFER',
    }));
    return [...apps, ...transfers].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [admissionApplications, recentlyAcceptedItems]);

  // Filter combined incoming
  const filteredIncoming = useMemo(() => {
    if (!searchQuery) return combinedIncoming;
    const query = searchQuery.toLowerCase();
    return combinedIncoming.filter(
      (item: any) => {
        const name = item.type === 'APPLICATION' 
          ? `${item.firstName} ${item.lastName}` 
          : `${item.student?.firstName} ${item.student?.lastName}`;
        const uid = item.type === 'APPLICATION' ? item.email : item.student?.uid;
        return name.toLowerCase().includes(query) || (uid && uid.toLowerCase().includes(query));
      }
    );
  }, [combinedIncoming, searchQuery]);

  // Filter transfers
  const filteredOutgoing = useMemo(() => {
    if (!searchQuery) return outgoingTransfers;
    const query = searchQuery.toLowerCase();
    return outgoingTransfers.filter(
      (t: any) =>
        t.student?.firstName?.toLowerCase().includes(query) ||
        t.student?.lastName?.toLowerCase().includes(query) ||
        t.student?.uid?.toLowerCase().includes(query) ||
        t.tac?.toLowerCase().includes(query)
    );
  }, [outgoingTransfers, searchQuery]);

  const handleApproveApplication = async () => {
    if (!showApproveApplicationModal || !completeFormData.targetClassLevel || !completeFormData.academicYear) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await approveApplication({
        schoolId: schoolId!,
        applicationId: showApproveApplicationModal.id,
        classLevel: completeFormData.targetClassLevel,
        classArmId: completeFormData.classArmId || undefined,
        academicYear: completeFormData.academicYear,
      }).unwrap();

      setShowApproveApplicationModal(null);
      setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
      refetchApplications();
      toast.success('Application approved and student admitted');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to approve application');
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to decline this application?')) return;

    try {
      await rejectApplication({
        schoolId: schoolId!,
        applicationId,
        reason: 'Declined by school administration',
      }).unwrap();

      refetchApplications();
      toast.success('Application declined');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to decline application');
    }
  };

  // Filter students for TAC generation
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery) return students;
    const query = studentSearchQuery.toLowerCase();
    return students.filter(
      (s: any) =>
        s.firstName?.toLowerCase().includes(query) ||
        s.lastName?.toLowerCase().includes(query) ||
        s.uid?.toLowerCase().includes(query) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query)
    );
  }, [students, studentSearchQuery]);

  const handleGenerateTac = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    try {
      const result = await generateTac({
        schoolId: schoolId!,
        studentId: selectedStudentId,
      }).unwrap();

      if (result.data) {
        setShowTacDisplayModal({
          tac: result.data.tac,
          studentId: result.data.studentId,
          studentName: result.data.studentName,
          expiresAt: result.data.expiresAt,
        });
        setShowGenerateTacModal(false);
        setSelectedStudentId('');
        refetchOutgoing();
        toast.success('TAC generated successfully');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to generate TAC');
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacFormData.tac || !tacFormData.studentId) {
      toast.error('Please enter both TAC and Student ID');
      return;
    }

    try {
      const result = await initiateTransfer({
        schoolId: schoolId!,
        tac: tacFormData.tac,
        studentId: tacFormData.studentId,
      }).unwrap();

      if (result.data) {
        setShowTransferPreview(result.data);
        setShowAcceptTransferModal(false);
        setTacFormData({ tac: '', studentId: '' });
        refetchRecentlyAccepted();
        toast.success('Transfer initiated successfully');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to initiate transfer');
    }
  };

  const handleCompleteTransfer = async () => {
    if (!showCompleteModal || !completeFormData.targetClassLevel || !completeFormData.academicYear) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await completeTransfer({
        schoolId: schoolId!,
        transferId: showCompleteModal,
        ...completeFormData,
      }).unwrap();

      setShowCompleteModal(null);
      setShowTransferPreview(null);
      setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
      refetchRecentlyAccepted();
      toast.success('Transfer completed successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to complete transfer');
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to reject this transfer?')) return;

    try {
      await rejectTransfer({
        schoolId: schoolId!,
        transferId,
        reason: 'Rejected by admin',
      }).unwrap();

      refetchRecentlyAccepted();
      toast.success('Transfer rejected');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reject transfer');
    }
  };

  const handleRevokeTac = async (transferId: string) => {
    if (!confirm('Are you sure you want to revoke this TAC? It cannot be used after revocation.')) return;

    try {
      await revokeTac({ schoolId: schoolId!, transferId }).unwrap();
      refetchOutgoing();
      toast.success('TAC revoked successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to revoke TAC');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
                Student Applications
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1" style={{ fontSize: 'var(--text-page-subtitle)' }}>
                Manage student applications, incoming transfers and outgoing transfers
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegistrationLinkModal(true)}
                className="h-9"
                disabled={!schoolId}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Admission Link
              </Button>
            </div>
          </div>
        </FadeInUp>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'incoming'
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Incoming Applications
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'outgoing'
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
            >
              <ArrowUp className="h-4 w-4" />
              Outgoing Transfers
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <FadeInUp from={{ opacity: 0, y: 10 }} to={{ opacity: 1, y: 0 }} duration={0.2}>
          {activeTab === 'incoming' && (
            <div className="space-y-6">
              {/* Accept new transfer + Incoming list */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg sm:text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Incoming Applications
                    </CardTitle>
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 w-full sm:w-auto">
                      <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search students..."
                        containerClassName="flex-1 min-w-0"
                        size="md"
                      />
                      <PermissionGate resource={PermissionResource.TRANSFERS} type={PermissionType.WRITE}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowAcceptTransferModal(true)}
                          className="h-9 whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Accept transfer
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingRecentlyAccepted || isLoadingApplications ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="ml-3 text-light-text-secondary dark:text-dark-text-secondary">Loading...</span>
                    </div>
                  ) : filteredIncoming.length === 0 ? (
                    <div className="text-center py-12">
                      <EmptyStateIcon type="person_outline" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">
                        No recently accepted transfers or pending applications yet.
                      </p>
                      <p className="text-sm text-light-text-muted dark:text-dark-text-muted mt-1 max-w-md mx-auto">
                        Use &quot;Accept new transfer&quot; to complete an incoming transfer with a TAC from the student&apos;s previous school. New applications from your public admission link will also appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredIncoming.map((item: any) => {
                        const isExpanded = expandedAcceptedIds.has(item.id);
                        const isApplication = item.type === 'APPLICATION';
                        const toggle = () => {
                          setExpandedAcceptedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            return next;
                          });
                        };
                        const fullName = isApplication 
                          ? `${item.firstName} ${item.middleName ? item.middleName + ' ' : ''}${item.lastName}`
                          : [item.student?.firstName, item.student?.middleName, item.student?.lastName].filter(Boolean).join(' ');
                        const initials = isApplication 
                          ? (item.firstName?.[0] || '') + (item.lastName?.[0] || '')
                          : (item.student?.firstName?.[0] || '') + (item.student?.lastName?.[0] || '') || '?';
                        const targetLabel = item.targetEnrollment
                          ? [item.targetEnrollment.classLevel, item.targetEnrollment.classArmName].filter(Boolean).join(' • ')
                          : isApplication ? (item.classLevel || 'Not specified') : '—';
                        const sourceLabel = !isApplication && item.sourceEnrollment
                          ? `${item.sourceEnrollment.classLevel} (${item.sourceEnrollment.academicYear})`
                          : isApplication ? 'New Admission' : '—';
                        const completedDate = item.completedAt || item.createdAt 
                          ? new Date(item.completedAt || item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
                          : '—';

                        return (
                          <div
                            key={item.id}
                            className="border border-light-border dark:border-dark-border rounded-lg overflow-hidden bg-light-card dark:bg-dark-surface"
                          >
                            <button
                              type="button"
                              onClick={toggle}
                              className="w-full flex items-center gap-4 p-4 text-left hover:bg-light-surface dark:hover:bg-dark-bg transition-colors"
                            >
                              {/* Avatar */}
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center overflow-hidden">
                                {(isApplication ? item.profileImage : item.student?.profileImage) ? (
                                  <img
                                    src={isApplication ? item.profileImage : item.student.profileImage}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                    {initials}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                                    {fullName}
                                  </p>
                                  {isApplication ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-medium">
                                      Application
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                                      Transfer
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                                  {isApplication ? item.email : item.student?.uid}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                                {!isApplication && item.performanceSummary?.averagePercentage != null && (
                                  <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {item.performanceSummary.averagePercentage}% avg
                                  </p>
                                )}
                                <p className="text-[10px] sm:text-xs text-light-text-muted dark:text-dark-text-muted">
                                  {completedDate}
                                </p>
                              </div>
                              <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                <ArrowDown className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                              </div>
                            </button>
                            <div
                              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                }`}
                            >
                              <div className={`min-h-0 overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                                <div className="border-t border-light-border dark:border-dark-border px-4 py-4 bg-light-surface dark:bg-dark-bg space-y-4">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    {isApplication ? (
                                      <>
                                        <div>
                                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Parent/Guardian</p>
                                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{item.parentName}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Parent Phone</p>
                                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{item.parentPhone}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Nationality</p>
                                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{item.nationality}</p>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div>
                                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">From school</p>
                                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{item.fromSchool?.name || '—'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Previous class</p>
                                          <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{sourceLabel}</p>
                                        </div>
                                      </>
                                    )}
                                    <div>
                                      <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">{isApplication ? 'Requested Class' : 'Admitted to'}</p>
                                      <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{targetLabel}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-xs text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Address</p>
                                      <p className="font-medium text-light-text-primary dark:text-dark-text-primary">{isApplication ? item.address : item.student?.address || '—'}</p>
                                    </div>
                                  </div>
                                  <div className="pt-2 flex flex-wrap gap-2">
                                    {isApplication ? (
                                      <PermissionGate resource={PermissionResource.TRANSFERS} type={PermissionType.WRITE}>
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => {
                                            setShowApproveApplicationModal(item);
                                            setCompleteFormData({
                                              targetClassLevel: item.classLevel || '',
                                              academicYear: '',
                                              classId: '',
                                              classArmId: item.classArmId || '',
                                            });
                                          }}
                                        >
                                          <CheckCircle2 className="h-4 w-4 mr-2" />
                                          Approve Application
                                        </Button>
                                        <Button
                                          variant="danger"
                                          size="sm"
                                          onClick={() => handleRejectApplication(item.id)}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Decline
                                        </Button>
                                      </PermissionGate>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/dashboard/school/students/${item.student?.id}`);
                                        }}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View student profile
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'outgoing' && (
            <div className="space-y-6">
              {/* Outgoing Transfers List */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-lg sm:text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Outgoing Transfers ({filteredOutgoing.length})
                    </CardTitle>
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 w-full sm:w-auto">
                      <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search transfers..."
                        containerClassName="flex-1 min-w-0"
                        size="md"
                      />
                      <PermissionGate resource={PermissionResource.TRANSFERS} type={PermissionType.WRITE}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowGenerateTacModal(true)}
                          className="h-9 whitespace-nowrap"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Generate TAC
                        </Button>
                      </PermissionGate>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOutgoing.length === 0 ? (
                    <div className="text-center py-12">
                      <EmptyStateIcon type="statistics" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No outgoing transfers. Generate a TAC for a student to initiate a transfer.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-light-border dark:border-dark-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Student
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              TAC
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              To School
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Generated
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Expires
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOutgoing.map((transfer: any, index: number) => (
                            <tr
                              key={transfer.id}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {transfer.student?.firstName} {transfer.student?.lastName}
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {transfer.student?.uid}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                {transfer.tac ? (
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-gray-100 dark:bg-dark-surface px-2 py-1 rounded font-mono text-light-text-primary dark:text-dark-text-primary">
                                      {transfer.tac}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(transfer.tac)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-light-text-muted dark:text-dark-text-muted">
                                    No TAC
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.toSchool?.name || 'Not specified'}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.tacGeneratedAt
                                  ? new Date(transfer.tacGeneratedAt).toLocaleDateString()
                                  : 'N/A'}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.tacExpiresAt ? (
                                  <span
                                    className={
                                      new Date(transfer.tacExpiresAt) < new Date()
                                        ? 'text-red-600 dark:text-red-400'
                                        : ''
                                    }
                                  >
                                    {new Date(transfer.tacExpiresAt).toLocaleDateString()}
                                  </span>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    transfer.status
                                  )}`}
                                >
                                  {formatStatus(transfer.status)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {transfer.status === 'COMPLETED' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        console.log('Opening historical grades for transfer:', transfer.id);
                                        setShowHistoricalGradesModal(transfer.id);
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      View Grades
                                    </Button>
                                  )}
                                  {transfer.tac && !transfer.tacUsedAt && transfer.status !== 'COMPLETED' && (
                                    <PermissionGate resource={PermissionResource.TRANSFERS} type={PermissionType.WRITE}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRevokeTac(transfer.id)}
                                        disabled={isRevoking}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Revoke
                                      </Button>
                                    </PermissionGate>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </FadeInUp>

        {/* Accept new transfer modal (TAC + Student ID) */}
        {showAcceptTransferModal && (
          <Modal
            isOpen={showAcceptTransferModal}
            onClose={() => {
              setShowAcceptTransferModal(false);
              setTacFormData({ tac: '', studentId: '' });
            }}
            title="Accept new transfer"
            size="md"
          >
            <form onSubmit={handleInitiateTransfer} className="space-y-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Enter the Transfer Access Code (TAC) and Student ID provided by the student&apos;s previous school.
              </p>
              <div>
                <Input
                  label="Transfer Access Code (TAC)"
                  placeholder="e.g. TAC-ABC12345-XY12"
                  value={tacFormData.tac}
                  onChange={(e) =>
                    setTacFormData({ ...tacFormData, tac: e.target.value.toUpperCase().trim() })
                  }
                  required
                  helperText="Get this from the school the student is transferring from"
                />
              </div>
              <div>
                <Input
                  label="Student ID"
                  placeholder="Enter student ID"
                  value={tacFormData.studentId}
                  onChange={(e) =>
                    setTacFormData({ ...tacFormData, studentId: e.target.value.trim() })
                  }
                  required
                  helperText="Must match the student on the TAC"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isInitiating}
                  disabled={!tacFormData.tac || !tacFormData.studentId}
                >
                  {isInitiating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & continue'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAcceptTransferModal(false);
                    setTacFormData({ tac: '', studentId: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Approve Application Modal */}
        {showApproveApplicationModal && (
          <Modal
            isOpen={true}
            onClose={() => setShowApproveApplicationModal(null)}
            title="Approve Student Application"
          >
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  You are about to approve the application for <strong>{showApproveApplicationModal.firstName} {showApproveApplicationModal.lastName}</strong>. 
                  This will create a student account and enroll them in your school.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Academic Year *
                  </label>
                  <Input
                    placeholder="e.g. 2024/2025"
                    value={completeFormData.academicYear}
                    onChange={(e) => setCompleteFormData({ ...completeFormData, academicYear: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Class Level *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-bg text-sm"
                    value={completeFormData.targetClassLevel}
                    onChange={(e) =>
                      setCompleteFormData({
                        ...completeFormData,
                        targetClassLevel: e.target.value,
                        classArmId: '', // reset arm when level changes
                      })
                    }
                  >
                    <option value="">Select Level</option>
                    {availableClassLevels.length > 0 ? (
                      availableClassLevels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))
                    ) : (
                      // Fallback if classes have not loaded / school has no arms yet
                      (currentType === 'PRIMARY'
                        ? ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6']
                        : currentType === 'SECONDARY'
                          ? ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3']
                          : []
                      ).map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))
                    )}
                  </select>
                  {availableClassLevels.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No class arms found for {currentType || 'this school type'}. Create classes first, or approve without an arm.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Class Arm (recommended)
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-bg text-sm"
                    value={completeFormData.classArmId}
                    onChange={(e) => {
                      const armId = e.target.value;
                      const arm = classes.find((c: any) => c.id === armId);
                      setCompleteFormData({
                        ...completeFormData,
                        classArmId: armId,
                        // Keep level in sync with the chosen arm (source of truth for enrollment)
                        targetClassLevel: arm?.classLevel || completeFormData.targetClassLevel,
                      });
                    }}
                  >
                    <option value="">No specific arm</option>
                    {classes
                      .filter(
                        (c: any) =>
                          !completeFormData.targetClassLevel ||
                          c.classLevel === completeFormData.targetClassLevel,
                      )
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-light-text-muted dark:text-dark-text-muted">
                    Assigning an arm places the student in a real class for timetables and attendance.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Button variant="ghost" onClick={() => setShowApproveApplicationModal(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleApproveApplication}
                  isLoading={isApprovingApp}
                  disabled={!completeFormData.academicYear || !completeFormData.targetClassLevel}
                >
                  Approve & Admit
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Generate TAC Modal */}
        {showGenerateTacModal && (
          <Modal
            isOpen={showGenerateTacModal}
            onClose={() => {
              setShowGenerateTacModal(false);
              setSelectedStudentId('');
              setStudentSearchQuery('');
            }}
            title="Generate Transfer Access Code (TAC)"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Search and select a student to generate a TAC. Share this TAC with the receiving school along with the student&apos;s ID.
              </p>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Search Student
                </label>
                <SearchInput
                  value={studentSearchQuery}
                  onChange={(value) => {
                    setStudentSearchQuery(value);
                    setSelectedStudentId(''); // Clear selection when searching
                  }}
                  placeholder="Search by name or student ID..."
                  size="md"
                />
              </div>
              {studentSearchQuery && !selectedStudentId && (
                <div className="max-h-60 overflow-y-auto border border-light-border dark:border-dark-border rounded-lg">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      No students found matching &quot;{studentSearchQuery}&quot;
                    </div>
                  ) : (
                    <div className="divide-y divide-light-border dark:divide-dark-border">
                      {filteredStudents.map((student: any) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setStudentSearchQuery(''); // Clear search to hide results
                          }}
                          className="w-full text-left p-3 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {student.uid} • {student.enrollment?.classLevel || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedStudentId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Selected Student:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {students.find((s: any) => s.id === selectedStudentId)?.firstName}{' '}
                        {students.find((s: any) => s.id === selectedStudentId)?.lastName} (
                        {students.find((s: any) => s.id === selectedStudentId)?.uid})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStudentId('');
                        setStudentSearchQuery('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleGenerateTac}
                  isLoading={isGeneratingTac}
                  disabled={!selectedStudentId}
                >
                  Generate TAC
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowGenerateTacModal(false);
                    setSelectedStudentId('');
                    setStudentSearchQuery('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* TAC Display Modal */}
        {showTacDisplayModal && (
          <Modal
            isOpen={!!showTacDisplayModal}
            onClose={() => setShowTacDisplayModal(null)}
            title="TAC Generated Successfully"
            size="md"
          >
            <div className="space-y-4">
              <Alert variant="success">
                TAC has been generated successfully. Share this TAC and the Student ID with the receiving school.
              </Alert>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Transfer Access Code (TAC)
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-surface px-4 py-3 rounded font-mono text-sm text-light-text-primary dark:text-dark-text-primary">
                    {showTacDisplayModal.tac}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showTacDisplayModal.tac)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Student ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-surface px-4 py-3 rounded font-mono text-sm text-light-text-primary dark:text-dark-text-primary">
                    {showTacDisplayModal.studentId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showTacDisplayModal.studentId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <p>
                  <strong>Student:</strong> {showTacDisplayModal.studentName}
                </p>
                <p>
                  <strong>Expires:</strong> {new Date(showTacDisplayModal.expiresAt).toLocaleString()}
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setShowTacDisplayModal(null)}>
                Close
              </Button>
            </div>
          </Modal>
        )}

        {/* Transfer Preview Modal */}
        {showTransferPreview && (
          <Modal
            isOpen={!!showTransferPreview}
            onClose={() => setShowTransferPreview(null)}
            title="Transfer Preview"
            size="xl"
          >
            <div className="space-y-6">
              <Alert variant="info">
                <div className="flex items-start gap-2">
                  <Eye className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Review Student Transfer Data</p>
                    <p className="text-sm">
                      Please review all student information and academic records below before completing or rejecting this transfer.
                    </p>
                  </div>
                </div>
              </Alert>

              {/* Student Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Student Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Full Name</p>
                      <p className="font-medium text-base">
                        {showTransferPreview.studentData?.student?.firstName}{' '}
                        {showTransferPreview.studentData?.student?.middleName}{' '}
                        {showTransferPreview.studentData?.student?.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Student ID (UID)</p>
                      <p className="font-medium text-base">{showTransferPreview.studentData?.student?.uid}</p>
                    </div>
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">From School</p>
                      <p className="font-medium text-base text-blue-600 dark:text-blue-400">{showTransferPreview.studentData?.fromSchool?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">Current Class</p>
                      <p className="font-medium text-base">
                        {showTransferPreview.studentData?.enrollment?.classLevel} ({showTransferPreview.studentData?.enrollment?.academicYear})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Academic Records Section - Grouped by Class Level */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Academic Records
                    <span className="text-sm font-normal text-light-text-secondary dark:text-dark-text-secondary">
                      ({showTransferPreview.studentData?.enrollments?.reduce((sum: number, e: any) => sum + (e.grades?.length || 0), 0) || showTransferPreview.studentData?.grades?.length || 0} total records)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TransferEnrollmentsDisplay
                    enrollments={showTransferPreview.studentData?.enrollments}
                    grades={showTransferPreview.studentData?.grades}
                  />
                </CardContent>
              </Card>

              {/* Health records — transferred with the student package */}
              {(showTransferPreview.studentData?.student?.bloodGroup ||
                showTransferPreview.studentData?.student?.allergies?.length ||
                showTransferPreview.studentData?.student?.medications?.length ||
                showTransferPreview.studentData?.student?.emergencyContact ||
                showTransferPreview.studentData?.student?.medicalNotes) && (
                <Card data-testid="transfer-health-records">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HeartPulse className="h-5 w-5" />
                      Health Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {showTransferPreview.studentData?.student?.bloodGroup && (
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Blood Group
                          </p>
                          <p className="font-medium text-base">
                            {showTransferPreview.studentData.student.bloodGroup}
                          </p>
                        </div>
                      )}
                      {showTransferPreview.studentData?.student?.allergies?.length > 0 && (
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Allergies
                          </p>
                          <p className="font-medium text-base">
                            {Array.isArray(showTransferPreview.studentData.student.allergies)
                              ? showTransferPreview.studentData.student.allergies.join(', ')
                              : showTransferPreview.studentData.student.allergies}
                          </p>
                        </div>
                      )}
                      {showTransferPreview.studentData?.student?.medications?.length > 0 && (
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Medications
                          </p>
                          <p className="font-medium text-base">
                            {Array.isArray(showTransferPreview.studentData.student.medications)
                              ? showTransferPreview.studentData.student.medications.join(', ')
                              : showTransferPreview.studentData.student.medications}
                          </p>
                        </div>
                      )}
                      {showTransferPreview.studentData?.student?.emergencyContact && (
                        <div>
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Emergency Contact
                          </p>
                          <p className="font-medium text-base">
                            {showTransferPreview.studentData.student.emergencyContact}
                            {showTransferPreview.studentData.student.emergencyContactPhone
                              ? ` (${showTransferPreview.studentData.student.emergencyContactPhone})`
                              : ''}
                          </p>
                        </div>
                      )}
                      {showTransferPreview.studentData?.student?.medicalNotes && (
                        <div className="sm:col-span-2">
                          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                            Medical Notes
                          </p>
                          <p className="font-medium text-base">
                            {showTransferPreview.studentData.student.medicalNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t border-light-border dark:border-dark-border">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(showTransferPreview.transferId)}
                >
                  Complete Transfer
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleRejectTransfer(showTransferPreview.transferId)}
                  disabled={isRejecting}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Reject Transfer'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Historical Grades Modal for Completed Transfers */}
        {showHistoricalGradesModal && (
          <HistoricalGradesModal
            schoolId={schoolId!}
            transferId={showHistoricalGradesModal}
            onClose={() => setShowHistoricalGradesModal(null)}
          />
        )}

        {/* Complete Transfer Modal */}
        {showCompleteModal && (
          <Modal
            isOpen={!!showCompleteModal}
            onClose={() => {
              setShowCompleteModal(null);
              setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
            }}
            title="Complete Transfer"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Select the target class for the student in your school. Assigning a class arm places them on
                timetables and attendance like a locally admitted student.
              </p>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Academic Year *
                </label>
                <Input
                  placeholder="e.g., 2024/2025"
                  value={completeFormData.academicYear}
                  onChange={(e) =>
                    setCompleteFormData({ ...completeFormData, academicYear: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Class Level *
                </label>
                <select
                  value={completeFormData.targetClassLevel}
                  onChange={(e) =>
                    setCompleteFormData({
                      ...completeFormData,
                      targetClassLevel: e.target.value,
                      classArmId: '',
                      classId: '',
                    })
                  }
                  className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select level...</option>
                  {availableClassLevels.length > 0
                    ? availableClassLevels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))
                    : classes.map((cls: any) => (
                        <option key={cls.id} value={cls.classLevel || cls.name}>
                          {cls.classLevel || cls.name}
                        </option>
                      ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Class Arm (recommended)
                </label>
                <select
                  value={completeFormData.classArmId}
                  onChange={(e) => {
                    const armId = e.target.value;
                    const arm = classes.find((c: any) => c.id === armId);
                    setCompleteFormData({
                      ...completeFormData,
                      classArmId: armId,
                      classId: '', // ClassArm id must not be sent as Class.id (FK)
                      targetClassLevel: arm?.classLevel || completeFormData.targetClassLevel,
                    });
                  }}
                  className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No specific arm</option>
                  {classes
                    .filter(
                      (c: any) =>
                        !completeFormData.targetClassLevel ||
                        c.classLevel === completeFormData.targetClassLevel,
                    )
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                  Without an arm, the student may not appear on class rosters used for attendance.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCompleteTransfer}
                  isLoading={isCompleting}
                  disabled={!completeFormData.targetClassLevel || !completeFormData.academicYear}
                >
                  Complete Transfer
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCompleteModal(null);
                    setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <ShareRegistrationLinkModal
          isOpen={showRegistrationLinkModal}
          onClose={() => setShowRegistrationLinkModal(false)}
          url={registrationLink}
          title="Share Admission Link"
          urlLabel="Admission URL"
          description="Share this admission link so parents and guardians can apply directly to your school."
          shareMessage={
            schoolName
              ? `Hello, applications are open for ${schoolName}. You can apply using the link below.`
              : 'Hello, applications are open. You can apply using the link below.'
          }
          shareMessageLabel="Message to share"
          emailSubject="School admission link"
          copySuccessMessage="Admission link copied to clipboard"
        />
      </div>
    </ProtectedRoute>
  );
}
