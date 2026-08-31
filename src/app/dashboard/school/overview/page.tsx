'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/dashboard/StatCard';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
import { SchoolSetupChecklist } from '@/components/dashboard/SchoolSetupChecklist';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { GraduationCap, Users, BookOpen, UserPlus, Loader2, AlertCircle, Calendar, XCircle, Upload, Settings } from 'lucide-react';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import { useRouter } from 'next/navigation';
import { useGetSchoolAdminDashboardQuery, useGetActiveSessionQuery, useGetMySchoolQuery, useEndTermMutation, useUploadSchoolLogoMutation } from '@/lib/store/api/schoolAdminApi';
import type { SchoolAdmin } from '@/lib/store/api/schoolsApi';
import { EndTermModal, EditTermDatesModal } from '@/components/modals';
import type { Term } from '@/lib/store/api/schoolAdminApi';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import { useAuth } from '@/hooks/useAuth';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { isPrincipalRole, isSchoolOwnerRole } from '@/lib/constants/roles';
import { safeGet, safeArrayFind, safeGetUserName, getErrorMessage } from '@/utils/common/safety-utils';
import { cn } from '@/lib/utils';

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

// Helper function to format change percentage
const formatChange = (change: number, isPercentage: boolean = true): string => {
  const sign = change >= 0 ? '+' : '';
  if (isPercentage) {
    return `${sign}${change}%`;
  }
  return `${sign}${change}`;
};

// Helper function to determine change type
const getChangeType = (change: number): 'positive' | 'negative' | 'neutral' => {
  if (change > 0) return 'positive';
  if (change < 0) return 'negative';
  return 'neutral';
};

function RecentStudentRow({ student }: { student: { id: string; name: string; profileImage?: string | null; classLevel: string; admissionNumber: string; status: string } }) {
  const [imageError, setImageError] = useState(false);
  const initials = (student.name || '')
    .trim()
    .split(/\s+/)
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
  const showImage = student.profileImage && student.profileImage.trim() !== '' && !imageError;

  return (
    <Link href={`/dashboard/school/students/${student.id}`}>
      <FadeInUp
        from={{ opacity: 0, y: 10 }}
        to={{ opacity: 1, y: 0 }}
        className="p-4 bg-transparent rounded-lg hover:bg-gray-100 dark:hover:bg-[var(--dark-hover)] transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-dark-border flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-[#1a1f2e] dark:border-[#1a1f2e] overflow-hidden bg-[var(--avatar-placeholder-bg)] flex items-center justify-center text-[var(--avatar-placeholder-text)] font-semibold" style={{ fontSize: 'var(--text-body)' }}>
          {showImage ? (
            <img
              src={student.profileImage!}
              alt={student.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
            {student.name}
          </h4>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1" style={{ fontSize: 'var(--text-body)' }}>
            {student.classLevel} • {student.admissionNumber}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full font-medium flex-shrink-0 ${student.status === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
            }`}
          style={{ fontSize: 'var(--text-small)' }}
        >
          {student.status}
        </span>
      </FadeInUp>
    </Link>
  );
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Get school type and terminology
  const { currentType } = useSchoolType();

  const { data, isLoading, error, refetch } = useGetSchoolAdminDashboardQuery(
    currentType || undefined
  );
  const terminology = getTerminology(currentType);

  // Get school and active session
  const { data: schoolResponse, refetch: refetchSchool, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const school = schoolResponse?.data;

  // Get user's name for welcome message
  // If school_owner, show school name; if other principal, use principal's name; otherwise user's first name
  const userName = useMemo(() => {
    const role = safeGet(school, 'currentAdmin.role', null);
    const schoolName = safeGet(school, 'name', null);
    
    if (isSchoolOwnerRole(role) && schoolName) {
      return schoolName;
    }
    
    if (isPrincipalRole(role)) {
      const currentAdminId = safeGet(school, 'currentAdmin.id', null);
      const admins = safeGet(school, 'admins', []);
      
      if (currentAdminId && admins.length > 0) {
        const principal = safeArrayFind(
          admins,
          (admin: SchoolAdmin) => admin && admin.id === currentAdminId,
          null
        );
        
        if (principal) {
          return safeGetUserName(principal, 'there');
        }
      }
    }
    
    return safeGetUserName(user, 'there');
  }, [school, user]);
  const schoolId = school?.id;
  const [uploadSchoolLogo, { isLoading: isUploadingLogo }] = useUploadSchoolLogoMutation();
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data: activeSessionResponse, refetch: refetchActiveSession, isLoading: isLoadingSession } = useGetActiveSessionQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId }
  );
  const activeSession = activeSessionResponse?.data;

  const [endTerm, { isLoading: isEndingTerm }] = useEndTermMutation();
  const [showEndTermModal, setShowEndTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);

  // Create preview URL when file is selected
  useEffect(() => {
    if (selectedLogoFile && logoPreview) {
      // Cleanup function to revoke the object URL
      return () => {
        URL.revokeObjectURL(logoPreview);
      };
    }
  }, [selectedLogoFile, logoPreview]);

  // Handle file selection - open crop modal
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size exceeds maximum limit of 5MB');
      return;
    }

    // Create preview URL for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageToCrop(result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Handle crop completion
  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to File
    const croppedFile = new File([croppedBlob], 'school-logo.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setLogoPreview(previewUrl);
    setSelectedLogoFile(croppedFile);

    // Close crop modal
    setImageToCrop(null);
    setShowCropModal(false);
  };

  // Determine button state
  const hasActiveSession = !!activeSession?.session;
  const hasActiveTerm = !!activeSession?.term;

  const getButtonConfig = () => {
    if (!hasActiveSession) {
      return {
        text: 'Start Session',
        icon: Calendar,
        onClick: () => router.push('/dashboard/school/settings/session'),
        variant: 'primary' as const,
      };
    } else if (!hasActiveTerm) {
      return {
        text: `Start ${terminology.periodSingular}`,
        icon: Calendar,
        onClick: () => router.push('/dashboard/school/settings/session'),
        variant: 'primary' as const,
      };
    } else {
      return {
        text: `End ${terminology.periodSingular}`,
        icon: XCircle,
        onClick: () => setShowEndTermModal(true),
        variant: 'danger' as const,
      };
    }
  };

  const handleEndTerm = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      await endTerm({ schoolId, schoolType: currentType || undefined }).unwrap();
      toast.success(`${terminology.periodSingular} ended successfully`);
      setShowEndTermModal(false);
      refetchActiveSession();
      refetch();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage || `Failed to end ${terminology.periodSingular.toLowerCase()}`);
    }
  };

  const buttonConfig = getButtonConfig();
  const isHeaderDestructive = buttonConfig.variant === 'danger';
  const HeaderActionIcon = buttonConfig.icon;

  // Extract dashboard data
  const dashboard = data?.data;
  const stats = dashboard?.stats;
  const growthTrends = dashboard?.growthTrends || [];
  const studentDistribution = dashboard?.studentDistribution || [];
  const weeklyActivity = dashboard?.weeklyActivity || [];
  const recentStudents = dashboard?.recentStudents || [];

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-4 w-full">
            <div className="order-1 flex-1 min-w-[200px]">
              <h1 className="font-medium lg:font-semibold text-xl lg:text-2xl text-light-text-primary dark:text-white leading-tight">
                Welcome back, {userName}
              </h1>

              {hasActiveTerm && activeSession?.term ? (
                <div className="mt-2 space-y-1">
                  {/* Session / term identity */}
                  <p
                    className="text-light-text-secondary dark:text-dark-text-secondary leading-snug"
                    style={{ fontSize: 'var(--text-body)' }}
                  >
                    {currentType && (
                      <span className="capitalize text-light-text-muted dark:text-dark-text-muted">
                        {currentType.toLowerCase()}
                        <span className="mx-1.5">·</span>
                      </span>
                    )}
                    {activeSession.session?.name && (
                      <>
                        <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {activeSession.session.name}
                        </span>
                        <span className="mx-1.5 text-light-text-muted dark:text-dark-text-muted">·</span>
                      </>
                    )}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {activeSession.term.name}
                    </span>
                    {typeof activeSession.term.currentWeek === 'number' &&
                      activeSession.term.currentWeek > 0 && (
                        <span className="ml-1.5 text-light-text-muted dark:text-dark-text-muted">
                          (Week {activeSession.term.currentWeek}
                          {activeSession.term.totalWeeks
                            ? ` of ${activeSession.term.totalWeeks}`
                            : ''}
                          )
                        </span>
                      )}
                  </p>

                  {/* Term schedule — directly under identity */}
                  {(() => {
                    const startDate = new Date(activeSession.term.startDate);
                    const endDate = new Date(activeSession.term.endDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isUpcoming = today < startDate;

                    if (isUpcoming) {
                      startDate.setHours(0, 0, 0, 0);
                      const daysUntilStart = Math.ceil(
                        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div
                          className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted"
                          style={{ fontSize: 'var(--text-small)' }}
                        >
                          <Calendar className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                          <span>
                            Starts{' '}
                            <span className="font-medium text-light-text-secondary dark:text-dark-text-secondary">
                              {startDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="ml-1.5 font-medium text-orange-600 dark:text-orange-400">
                              · in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
                            </span>
                          </span>
                          <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                            <button
                              onClick={() => setEditingTerm(activeSession.term!)}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                              title={`Adjust ${terminology.periodSingular} dates`}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          </PermissionGate>
                        </div>
                      );
                    }

                    endDate.setHours(0, 0, 0, 0);
                    const daysRemaining = Math.ceil(
                      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const isPastDue = daysRemaining < 0;
                    const isDueSoon = daysRemaining <= 7 && daysRemaining >= 0;

                    return (
                      <div
                        className="flex items-center gap-1.5 text-light-text-muted dark:text-dark-text-muted"
                        style={{ fontSize: 'var(--text-small)' }}
                      >
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Ends{' '}
                          <span className="font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            {endDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {isPastDue ? (
                            <span className="ml-1.5 font-medium text-red-600 dark:text-red-400">
                              · overdue by {Math.abs(daysRemaining)}{' '}
                              {Math.abs(daysRemaining) === 1 ? 'day' : 'days'}
                            </span>
                          ) : isDueSoon ? (
                            <span className="ml-1.5 font-medium text-orange-600 dark:text-orange-400">
                              · {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </span>
                          ) : (
                            <span className="ml-1.5 font-medium text-blue-600/80 dark:text-blue-400/80">
                              · {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </span>
                          )}
                        </span>
                        <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                          <button
                            onClick={() => setEditingTerm(activeSession.term!)}
                            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                            title={`Adjust ${terminology.periodSingular} dates`}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    );
                  })()}
                </div>
              ) : !hasActiveTerm && hasActiveSession && activeSession?.session ? (
                <p
                  className="mt-2 text-light-text-secondary dark:text-dark-text-secondary"
                  style={{ fontSize: 'var(--text-body)' }}
                >
                  Session{' '}
                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                    {activeSession.session.name}
                  </span>
                  <span className="mx-1.5">·</span>
                  No active {terminology.periodSingular.toLowerCase()}
                </p>
              ) : null}
            </div>

            <div className="order-3 lg:order-2 w-full lg:w-auto flex justify-start lg:justify-end">
              <PermissionGate resource={PermissionResource.SESSIONS} type={PermissionType.WRITE}>
                <Button
                  variant={isHeaderDestructive ? 'ghost' : buttonConfig.variant}
                  isFlat={isHeaderDestructive}
                  size="sm"
                  onClick={buttonConfig.onClick}
                  disabled={isEndingTerm || isLoadingSession || isLoadingSchool}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap flex-shrink-0 px-2 py-2 min-w-[120px] transition-all',
                    isHeaderDestructive &&
                      'border border-red-600/45 dark:border-red-500/50 text-red-600 dark:text-red-400 bg-[var(--light-bg)] dark:bg-[var(--dark-bg)] shadow-none hover:bg-red-500/10 dark:hover:bg-red-500/15'
                  )}
                >
                  {isEndingTerm || isLoadingSession || isLoadingSchool || !schoolId ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-current" />
                      {isEndingTerm ? `Ending...` : `Checking...`}
                    </>
                  ) : (
                    <>
                      {isHeaderDestructive ? (
                        <HeaderActionIcon className="h-4 w-4 shrink-0" aria-hidden />
                      ) : null}
                      {buttonConfig.text}
                    </>
                  )}
                </Button>
              </PermissionGate>
            </div>

            {/* School Logo Upload - Passport Size */}
            <div className="order-2 lg:order-3 flex flex-col items-center gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                />
                {/* Show preview if file is selected, otherwise show current logo or upload placeholder */}
                {logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="object-cover border-2 border-blue-500 dark:border-blue-400 rounded shadow-sm"
                      style={{ width: '60px', height: '60px' }}
                    />
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center" style={{ fontSize: 'var(--text-small)' }}>
                      !
                    </div>
                  </div>
                ) : school?.logo ? (
                  <div className="relative group">
                    <img
                      src={school.logo}
                      alt="School Logo"
                      className="object-cover border-2 border-light-border dark:border-dark-border rounded shadow-sm"
                      style={{ width: '60px', height: '60px' }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        className="text-white"
                        style={{ fontSize: 'var(--text-small)' }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-[var(--light-border)] dark:border-[var(--dark-border)] rounded cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex flex-col items-center justify-center bg-[var(--light-card)] dark:bg-[var(--dark-surface)] group relative"
                    style={{ width: '60px', height: '60px' }}
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    title="Click to upload school logo"
                  >
                    <Upload className="h-4 w-4 text-light-text-muted dark:text-dark-text-muted group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                    {/* Tooltip */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" style={{ fontSize: 'var(--text-small)' }}>
                      Click to upload logo
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
              {!school?.logo && !logoPreview && (
                <p className="text-light-text-muted dark:text-dark-text-muted text-center whitespace-nowrap" style={{ fontSize: 'var(--text-small)' }}>
                  Upload logo
                </p>
              )}
              {selectedLogoFile && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={async () => {
                      if (!selectedLogoFile) return;
                      try {
                        await uploadSchoolLogo({ file: selectedLogoFile }).unwrap();
                        toast.success('School logo uploaded successfully!');
                        setSelectedLogoFile(null);
                        setLogoPreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                        refetchSchool();
                      } catch (error: any) {
                        const errorMessage = getErrorMessage(error);
                        toast.error(errorMessage || 'Failed to upload logo');
                      }
                    }}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedLogoFile(null);
                      setLogoPreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploadingLogo}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </FadeInUp>

        {/* Error State */}
        {
          error && (
            <Alert variant="error" className="mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Failed to load dashboard data</p>
                  <p className="mt-1" style={{ fontSize: 'var(--text-body)' }}>
                    {getErrorMessage(error)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </Alert>
          )
        }

        {/* Setup guide — quiet, dismissible; does not replace existing dashboard */}
        {!isLoading && !isLoadingSchool && !error && <SchoolSetupChecklist />}

        {/* Loading State */}
        {
          (isLoading || isLoadingSchool) && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-light-text-secondary dark:text-dark-text-secondary font-medium animate-pulse">
                  Loading dashboard data...
                </span>
              </div>
            </div>
          )
        }

        {/* Dashboard Content */}
        {
          !isLoading && !isLoadingSchool && !error && stats && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
                <StatCard
                  title="Total Students"
                  value={formatNumber(stats.totalStudents)}
                  change={formatChange(stats.studentsChange)}
                  changeType={getChangeType(stats.studentsChange)}
                  icon={
                    <GraduationCap className="text-blue-600 dark:text-blue-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
                  }
                />
                <StatCard
                  title={`Total ${terminology.staff}`}
                  value={formatNumber(stats.totalTeachers)}
                  change={formatChange(stats.teachersChange)}
                  changeType={getChangeType(stats.teachersChange)}
                  icon={
                    <Users className="text-green-600 dark:text-green-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
                  }
                />
                <StatCard
                  title={`Active ${terminology.courses}`}
                  value={formatNumber(stats.activeCourses)}
                  change={formatChange(stats.coursesChange)}
                  changeType={getChangeType(stats.coursesChange)}
                  icon={
                    <BookOpen className="text-purple-600 dark:text-purple-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
                  }
                />
                <StatCard
                  title="Pending Admissions"
                  value={formatNumber(stats.pendingAdmissions)}
                  change={formatChange(stats.pendingAdmissionsChange, false)}
                  changeType={getChangeType(stats.pendingAdmissionsChange)}
                  icon={
                    <UserPlus className="text-orange-600 dark:text-orange-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
                  }
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <AnalyticsChart
                  title="Growth Trends"
                  description="Overall enhancement in student, teacher, and course growth over time."
                  data={growthTrends}
                  type="area"
                  dataKeys={['students', 'teachers', 'courses']}
                  colors={['#3b82f6', '#10b981', '#a855f7']}
                />
                <AnalyticsChart
                  title="Student Distribution"
                  description="Distribution of students across different categories or levels."
                  data={studentDistribution}
                  type="donut"
                  dataKeys={['students']}
                  colors={['#3b82f6', '#10b981', '#f59e0b', '#ef4444']}
                />
              </div>

              {/* Weekly Activity Trends */}
              <div className="mb-6">
                <AnalyticsChart
                  title="Weekly Activity Trends"
                  description="Tracking admissions and transfers to monitor school engagement and activity patterns."
                  data={weeklyActivity}
                  type="area"
                  dataKeys={['admissions', 'transfers']}
                  colors={['#3b82f6', '#10b981']}
                />
              </div>

              {/* Recent Students */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary">
                      Recently Added Students
                    </CardTitle>
                    <Link href="/dashboard/school/students">
                      <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                        View All →
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentStudents.length === 0 ? (
                    <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                      <EmptyStateIcon type="person_outline" />
                      <p>No recent students found</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentStudents.map((student: any) => (
                        <RecentStudentRow key={student.id} student={student} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )
        }

        {/* End Term Modal */}
        <EndTermModal
          isOpen={showEndTermModal}
          onClose={() => setShowEndTermModal(false)}
          onConfirm={handleEndTerm}
          isLoading={isEndingTerm}
          termName={activeSession?.term?.name}
          sessionName={activeSession?.session?.name}
          termLabel={terminology.periodSingular}
          termEndDate={activeSession?.term?.endDate}
        />

        {/* Edit Term Dates Modal */}
        {
          editingTerm && activeSession?.session && schoolId && (
            <EditTermDatesModal
              isOpen={!!editingTerm}
              onClose={() => setEditingTerm(null)}
              term={editingTerm}
              session={activeSession.session}
              schoolId={schoolId}
              termLabel={terminology.periodSingular}
            />
          )
        }

        {/* Image Crop Modal */}
        {
          imageToCrop && (
            <ImageCropModal
              isOpen={showCropModal}
              onClose={() => {
                setShowCropModal(false);
                setImageToCrop(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              imageSrc={imageToCrop}
              onCropComplete={handleCropComplete}
              aspectRatio={1}
              cropShape="rect"
              title="Crop School Logo"
              minZoom={1}
              maxZoom={3}
            />
          )
        }
      </div >
    </ProtectedRoute >
  );
}

