'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui';
import { StatCard } from '@/components/dashboard/StatCard';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { Users, Plus, FileSpreadsheet, Search, Grid3x3, List, MoreVertical, BookOpen, CheckCircle, Clock, Ban, Mail, Loader2, Trash2, GraduationCap } from 'lucide-react';
import { useGetStaffListQuery, useGetMySchoolQuery, useResendPasswordResetForStaffMutation, useDeleteAdminMutation, useDeleteTeacherMutation } from '@/lib/store/api/schoolAdminApi';
import { LiveStatusBadge } from '@/components/ui/LiveStatusBadge';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { Modal } from '@/components/ui/Modal';
import { isPrincipalRole } from '@/hooks/useSchoolType'; // I'll check if it's exported there, if not I'll define it. Actually I didn't export it. I'll define it locally for now or modify useSchoolType.
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import { PermissionAssignmentModal } from '@/components/permissions/PermissionAssignmentModal';
import { PermissionGate } from '@/components/permissions/PermissionGate';
import { PermissionResource, PermissionType } from '@/hooks/usePermissions';
import { StaffImportModal } from '@/components/modals/StaffImportModal';
import { EmptyStateIcon } from '@/components/ui/EmptyStateIcon';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'active' | 'pending' | 'suspended';

export default function StaffPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const itemsPerPage = 6; // Show 6 items per page (2 rows of 3 columns)
  const [selectedAdminForPermissions, setSelectedAdminForPermissions] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; type: 'admin' | 'teacher'; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);

  // Use the adminRole from the school profile as the source of truth
  const { data: schoolResponse, isLoading: isLoadingSchool } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const currentProfileId = schoolResponse?.data?.currentAdmin?.id;
  const currentProfileRole = schoolResponse?.data?.currentAdmin?.role;

  const currentUserAdminRole = (currentProfileRole || user?.adminRole || '').toLowerCase().trim();

  const canDeleteStaff = (staffMember: any) => {
    if (!currentUserAdminRole) return false;

    const normalize = (r: string) => (r || '').toLowerCase().trim().replace(/[\s_-]+/g, '');
    const currentNorm = normalize(currentUserAdminRole);
    const targetNorm = normalize(staffMember.role || '');

    // 1. School owner cannot be deleted
    if (targetNorm === 'schoolowner') return false;

    // 2. Cannot delete yourself
    if (staffMember.userId === user?.id || staffMember.id === currentProfileId || staffMember.id === user?.profileId) return false;

    // 3. School owner can delete anyone else (teachers, admins, principals)
    if (currentNorm === 'schoolowner') return true;

    // 4. Principals can delete teachers and regular admins (non-principals)
    const principalRoles = ['principal', 'schoolprincipal', 'headteacher', 'headmaster', 'headmistress', 'schoolowner'];
    const targetIsPrincipal = principalRoles.includes(targetNorm);
    const currentUserIsPrincipal = principalRoles.includes(currentNorm);

    if (currentUserIsPrincipal && !targetIsPrincipal) return true;

    return false;
  };


  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  // Resend invitation mutation
  const [resendInvitation, { isLoading: isResending }] = useResendPasswordResetForStaffMutation();
  const [resendingStaffId, setResendingStaffId] = useState<string | null>(null);

  // Delete mutations
  const [deleteAdmin] = useDeleteAdminMutation();
  const [deleteTeacher] = useDeleteTeacherMutation();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch staff list from API
  const {
    data: staffResponse,
    isLoading,
    error,
    refetch,
  } = useGetStaffListQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch || undefined,
    role: roleFilter !== 'All' ? roleFilter : undefined,
    schoolType: currentType || undefined,
  });

  const staffList = staffResponse?.data;
  const staff = staffList?.items || [];
  const meta = staffList?.meta;
  const availableRoles = useMemo(() => {
    const seen = new Set<string>();

    return (staffList?.availableRoles || []).filter((role) => {
      const normalizedRole = role.trim().toLowerCase();

      if (!normalizedRole || normalizedRole === 'all' || seen.has(normalizedRole)) {
        return false;
      }

      seen.add(normalizedRole);
      return true;
    });
  }, [staffList?.availableRoles]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = meta?.total || 0;
    const active = staff.filter(s => s.accountStatus === 'ACTIVE').length;
    const pending = staff.filter(s => s.accountStatus === 'SHADOW').length;
    const suspended = staff.filter(s => s.accountStatus === 'SUSPENDED').length;

    return { total, active, pending, suspended };
  }, [staff, meta]);

  // Filter staff by status
  const filteredStaff = useMemo(() => {
    let result = staff;

    // Filter out School Owner role
    result = result.filter(s => {
      const role = (s.role || '').toLowerCase().trim().replace(/[\s_-]+/g, '');
      return role !== 'schoolowner';
    });

    if (filter === 'all') return result;
    return result.filter(s => {
      if (filter === 'active') return s.accountStatus === 'ACTIVE';
      if (filter === 'pending') return s.accountStatus === 'SHADOW';
      if (filter === 'suspended') return s.accountStatus === 'SUSPENDED';
      return true;
    });
  }, [staff, filter]);

  // Get initials from name
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || '';
    const last = lastName?.[0]?.toUpperCase() || '';
    return first + last || '?';
  };

  // Avatar component for staff
  const StaffAvatar = ({
    profileImage,
    firstName,
    lastName
  }: {
    profileImage?: string | null;
    firstName?: string;
    lastName?: string;
  }) => {
    const [imageError, setImageError] = useState(false);

    if (profileImage && !imageError) {
      return (
        <div className="relative w-12 h-12 flex-shrink-0">
          <img
            src={profileImage}
            alt={`${firstName} ${lastName}`}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#1a1f2e] dark:border-[#1a1f2e] shadow-sm"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-full bg-[var(--avatar-placeholder-bg)] flex items-center justify-center text-[var(--avatar-placeholder-text)] font-semibold border-2 border-[#1a1f2e] dark:border-[#1a1f2e] shadow-sm flex-shrink-0" style={{ fontSize: 'var(--text-body)' }}>
        {getInitials(firstName, lastName)}
      </div>
    );
  };

  // Handle resend invitation
  const handleResendInvitation = async (staffId: string, staffName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!schoolId) return;

    setResendingStaffId(staffId);
    try {
      await resendInvitation({ schoolId, staffId }).unwrap();
      toast.success(`Invitation email resent to ${staffName}`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to resend invitation');
    } finally {
      setResendingStaffId(null);
    }
  };

  // Handle delete staff
  const handleDeleteStaff = async () => {
    if (!staffToDelete || !schoolId) return;

    setIsDeleting(true);
    try {
      if (staffToDelete.type === 'admin') {
        await deleteAdmin({ schoolId, adminId: staffToDelete.id }).unwrap();
      } else {
        await deleteTeacher({ schoolId, teacherId: staffToDelete.id }).unwrap();
      }
      toast.success(`${staffToDelete.name} deleted successfully`);
      setStaffToDelete(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete staff member');
    } finally {
      setIsDeleting(false);
    }
  };
  const getStatusBadge = (accountStatus: string) => {
    switch (accountStatus) {
      case 'ACTIVE':
        return {
          icon: CheckCircle,
          label: 'Active',
          className: 'bg-green-500/20 text-green-400',
        };
      case 'SHADOW':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-amber-500/20 text-amber-400',
        };
      case 'SUSPENDED':
        return {
          icon: Ban,
          label: 'Suspended',
          className: 'bg-red-500/20 text-red-400',
        };
      case 'ARCHIVED':
        return {
          icon: Ban,
          label: 'Archived',
          className: 'bg-gray-500/20 text-gray-400',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          className: 'bg-gray-500/20 text-gray-400',
        };
    }
  };

  if ((isLoading || isLoadingSchool) && !staff.length) {
    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-light-text-secondary dark:text-dark-text-secondary font-medium animate-pulse">
            Loading staff...
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    const errorMessage = error && 'status' in error
      ? (error as any).data?.message || 'Failed to fetch staff'
      : 'Failed to load staff';

    return (
      <ProtectedRoute roles={['SCHOOL_ADMIN']}>
        <div className="w-full">
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full space-y-6">
        {/* Header Section */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-light-text-primary dark:text-white mb-2" style={{ fontSize: 'var(--text-page-title)' }}>
              Staff
            </h1>
            <p className="text-light-text-secondary dark:text-[#9ca3af]" style={{ fontSize: 'var(--text-page-subtitle)' }}>
              Manage all staff in your school
            </p>
          </div>
          <PermissionGate resource={PermissionResource.STAFF} type={PermissionType.WRITE}>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/school/staff/add">
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </PermissionGate>
        </FadeInUp>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <StatCard
            compact
            title="Total Staff"
            value={stats.total}
            icon={
              <Users className="text-blue-600 dark:text-blue-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
            }
          />
          <StatCard
            compact
            title="Active Staff"
            value={stats.active}
            change="+12%"
            changeType="positive"
            icon={
              <CheckCircle className="text-green-600 dark:text-green-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
            }
          />
          <StatCard
            compact
            title="Pending Staff"
            value={stats.pending}
            icon={
              <Clock className="text-amber-600 dark:text-amber-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
            }
          />
          <StatCard
            compact
            title="Suspended Staff"
            value={stats.suspended}
            icon={
              <Ban className="text-red-600 dark:text-red-400" style={{ width: 'var(--stat-icon-size)', height: 'var(--stat-icon-size)' }} />
            }
          />
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-secondary dark:text-[#9ca3af]" />
              <Input
                type="text"
                placeholder="Search staff by name, email, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-light-card dark:bg-[#151a23] border-light-border dark:border-[#1a1f2e] text-light-text-primary dark:text-white placeholder:text-light-text-muted dark:placeholder:text-[#6b7280]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Filter Pills - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              {(['all', 'active', 'pending', 'suspended'] as FilterType[]).map((filterType) => (
                <Button
                  key={filterType}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilter(filterType);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    'capitalize px-3 py-1 text-[var(--text-small)]',
                    filter === filterType
                      ? 'bg-[#2490FD] dark:bg-[#2490FD] text-white'
                      : 'bg-light-surface dark:bg-[#151a23] text-light-text-secondary dark:text-[#9ca3af] hover:bg-light-hover dark:hover:bg-[#1f2937]'
                  )}
                >
                  {filterType}
                </Button>
              ))}
            </div>

            {/* Filter Dropdown - Mobile */}
            <div className="md:hidden">
              <Select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as FilterType);
                  setCurrentPage(1);
                }}
                className="h-9 px-2.5 py-1 text-[var(--text-small)] w-28"
                wrapperClassName="w-auto"
                hideChevron={false}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>

            {/* Role Filter */}
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              wrapperClassName="w-32"
              className="h-9 px-2.5 py-1.5 text-[var(--text-small)]"
            >
              <option value="All">All Roles</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-light-surface dark:bg-[#151a23] border border-light-border dark:border-[#1a1f2e] rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'grid'
                    ? 'bg-[#2490FD] dark:bg-[#2490FD] text-white'
                    : 'text-light-text-secondary dark:text-[#9ca3af] hover:text-light-text-primary dark:hover:text-white'
                )}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-8 w-8 p-0',
                  viewMode === 'list'
                    ? 'bg-[#2490FD] dark:bg-[#2490FD] text-white'
                    : 'text-light-text-secondary dark:text-[#9ca3af] hover:text-light-text-primary dark:hover:text-white'
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Total Count */}
            <span className="text-light-text-secondary dark:text-[#9ca3af]" style={{ fontSize: 'var(--text-body)' }}>
              {meta?.total || 0}
            </span>
          </div>
        </div>

        {/* Staff Grid/List */}
        <div>
          <p className="font-medium text-light-text-secondary dark:text-dark-text-secondary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
            All Staff
          </p>

          {filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <EmptyStateIcon type="person_outline" />
                <p className="text-light-text-secondary dark:text-[#9ca3af]">
                  No staff found. Click &quot;Add Staff&quot; to add one.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((staffMember) => {

                const statusConfig = getStatusBadge(staffMember.accountStatus);
                const StatusIcon = statusConfig.icon;

                return (
                  <FadeInUp key={staffMember.id} from={{ opacity: 0, y: 20 }} to={{ opacity: 1, y: 0 }} duration={0.5}>
                    <Card
                      className="cursor-pointer hover:bg-light-surface dark:hover:bg-dark-bg hover:shadow-lg transition-all h-full flex flex-col"
                      onClick={() => router.push(`/dashboard/school/staff/${staffMember.id}`)}
                    >
                      <CardContent className="p-4 flex-1 flex flex-col" style={{ padding: 'var(--card-padding)' }}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <StaffAvatar
                              profileImage={staffMember.profileImage}
                              firstName={staffMember.firstName}
                              lastName={staffMember.lastName}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-light-text-primary dark:text-white" style={{ fontSize: 'var(--text-card-title)' }}>
                                  {staffMember.firstName} {staffMember.lastName}
                                </h3>
                                <span className={cn('px-2.5 py-0.5 rounded-full font-medium', statusConfig.className)} style={{ fontSize: 'var(--text-small)' }}>
                                  <StatusIcon className="h-3 w-3 inline mr-1" />
                                  {statusConfig.label}
                                </span>
                              </div>
                              <LiveStatusBadge activity={staffMember.currentActivity} size="sm" className="mb-1" />
                              <p className="text-light-text-secondary dark:text-[#9ca3af]" style={{ fontSize: 'var(--text-body)' }}>
                                {staffMember.email || 'No email'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <PermissionGate resource={PermissionResource.STAFF} type={PermissionType.WRITE}>
                              {staffMember.accountStatus === 'SHADOW' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleResendInvitation(staffMember.id, `${staffMember.firstName} ${staffMember.lastName}`, e);
                                  }}
                                  title="Resend Invitation"
                                  className="text-light-text-secondary dark:text-[#9ca3af] hover:text-blue-500 p-1"
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                              )}
                              {canDeleteStaff(staffMember) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStaffToDelete({
                                      id: staffMember.id,
                                      type: staffMember.type,
                                      name: `${staffMember.firstName} ${staffMember.lastName}`
                                    });
                                  }}
                                  title="Delete Staff"
                                  className="text-light-text-secondary dark:text-[#9ca3af] hover:text-red-500 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Additional menu options could go here
                                }}
                                className="text-light-text-secondary dark:text-[#9ca3af] hover:text-light-text-primary dark:hover:text-white p-1"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </PermissionGate>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-light-text-secondary dark:text-[#9ca3af] mt-auto" style={{ fontSize: 'var(--text-body)' }}>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              'px-2 py-0.5 rounded font-medium',
                              staffMember.role === 'Principal'
                                ? 'bg-purple-500/20 text-purple-400'
                                : staffMember.role === 'Teacher'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            )} style={{ fontSize: 'var(--text-small)' }}>
                              {staffMember.role || 'N/A'}
                            </span>
                          </div>
                          {/* PRIMARY teachers: show assigned class */}
                          {staffMember.type === 'teacher' && currentType === 'PRIMARY' && (
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-4 w-4 flex-shrink-0" />
                              {staffMember.assignedClass ? (
                                <span className="font-medium text-green-500 dark:text-green-400">{staffMember.assignedClass.name}</span>
                              ) : (
                                <span className="italic text-light-text-muted dark:text-dark-text-muted">No class assigned</span>
                              )}
                            </div>
                          )}
                          {/* SECONDARY/TERTIARY/admin: show subject */}
                          {(staffMember.type !== 'teacher' || currentType !== 'PRIMARY') && staffMember.subject && (
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>{staffMember.subject}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </FadeInUp>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStaff.map((staffMember) => {
                const statusConfig = getStatusBadge(staffMember.accountStatus);
                const StatusIcon = statusConfig.icon;

                return (
                  <FadeInUp from={{ opacity: 0, x: -20 }} to={{ opacity: 1, x: 0 }} duration={0.5}>
                    <Card
                      className="cursor-pointer hover:bg-light-surface dark:hover:bg-dark-bg transition-colors"
                      onClick={() => router.push(`/dashboard/school/staff/${staffMember.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <StaffAvatar
                              profileImage={staffMember.profileImage}
                              firstName={staffMember.firstName}
                              lastName={staffMember.lastName}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-light-text-primary dark:text-white">
                                  {staffMember.firstName} {staffMember.lastName}
                                </h3>
                                <span className={cn('px-2.5 py-0.5 rounded-full font-medium', statusConfig.className)} style={{ fontSize: 'var(--text-small)' }}>
                                  <StatusIcon className="h-3 w-3 inline mr-1" />
                                  {statusConfig.label}
                                </span>
                                <span className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  staffMember.role === 'Principal'
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : staffMember.role === 'Teacher'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-blue-500/20 text-blue-400'
                                )}>
                                  {staffMember.role || 'N/A'}
                                </span>
                                <LiveStatusBadge activity={staffMember.currentActivity} size="sm" />
                              </div>
                              <p className="text-light-text-secondary dark:text-[#9ca3af]" style={{ fontSize: 'var(--text-body)' }}>
                                {staffMember.email || 'No email'} • {staffMember.type === 'teacher' && currentType === 'PRIMARY'
                                  ? (staffMember.assignedClass ? staffMember.assignedClass.name : 'No class assigned')
                                  : (staffMember.subject || 'No subject')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <PermissionGate resource={PermissionResource.STAFF} type={PermissionType.WRITE}>
                              <div className="flex items-center gap-2">
                                {staffMember.accountStatus === 'SHADOW' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResendInvitation(staffMember.id, `${staffMember.firstName} ${staffMember.lastName}`, e);
                                    }}
                                    title="Resend Invitation"
                                    className="text-light-text-secondary dark:text-[#9ca3af] hover:text-blue-500 p-1"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </button>
                                )}
                                {canDeleteStaff(staffMember) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStaffToDelete({
                                        id: staffMember.id,
                                        type: staffMember.type,
                                        name: `${staffMember.firstName} ${staffMember.lastName}`
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-600 p-2"
                                    title="Delete Staff"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </PermissionGate>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/school/staff/${staffMember.id}`);
                              }}
                              className="text-blue-600 dark:text-blue-400 font-medium p-0 h-auto"
                            >
                              View →
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeInUp>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <Pagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(newLimit) => {
              setCurrentPage(1);
            }}
            totalItems={meta.total}
          />
        )}

        {/* Import Modal */}
        {schoolId && (
          <StaffImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            schoolId={schoolId}
          />
        )}

        {/* Permission Assignment Modal */}
        {selectedAdminForPermissions && (
          <PermissionAssignmentModal
            isOpen={!!selectedAdminForPermissions}
            onClose={() => setSelectedAdminForPermissions(null)}
            adminId={selectedAdminForPermissions.id}
            adminName={selectedAdminForPermissions.name}
            adminRole={selectedAdminForPermissions.role}
          />
        )}
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!staffToDelete}
          onClose={() => setStaffToDelete(null)}
          title="Delete Staff Member"
        >
          <div className="space-y-4">
            <p className="text-light-text-primary dark:text-white">
              Are you sure you want to delete <span className="font-bold">{staffToDelete?.name}</span>? This action cannot be undone and will remove all their access to the school data.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setStaffToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteStaff}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Staff'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
