'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { CountrySelector } from '@/components/ui/CountrySelector';
import { FadeInUp } from '@/components/ui/FadeInUp';
import { UserPlus, Users } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { useAddTeacher, useAddAdmin } from '@/hooks/useSchools';
import { addTeacherFormSchema, addAdminFormSchema } from '@/lib/validations/school-forms';
import { z } from 'zod';
import type { RootState } from '@/lib/store/store';
import { useApi } from '@/hooks/useApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import { useUploadTeacherImageMutation, useUploadAdminImageMutation, AdminPermissionInput } from '@/lib/store/api/schoolsApi';
import { SubjectMultiSelect } from '@/components/teachers/SubjectMultiSelect';
import { PermissionSelector, getDefaultReadPermissions } from '@/components/permissions';
import {
  useGetMySchoolQuery,
  useGetClassArmsQuery,
  useGetClassLevelsQuery,
  useGetSubjectsQuery,
  useGenerateDefaultClassesMutation
} from '@/lib/store/api/schoolAdminApi';
import { isPrincipalRole, isSchoolOwnerRole } from '@/lib/constants/roles';
import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';

type StaffType = 'teacher' | 'admin';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  subject?: string;
  adminRole?: string;
  employeeId?: string;
  [key: string]: string | undefined;
}

export default function AddStaffPage() {
  const router = useRouter();
  const { apiCall } = useApi();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [staffType, setStaffType] = useState<StaffType>('teacher');
  const [adminRole, setAdminRole] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  // Admin permissions - initialized with default READ permissions
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissionInput[]>(getDefaultReadPermissions());

  const { addTeacher, isLoading: isAddingTeacher } = useAddTeacher(schoolId);
  const { addAdmin, isLoading: isAddingAdmin } = useAddAdmin(schoolId);

  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  const { data: schoolResponse } = useGetMySchoolQuery();
  const currentAdminRole = schoolResponse?.data?.currentAdmin?.role;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    nationality: 'Nigeria',
    state: '',
    subject: '',
    subjectIds: [] as string[], // For SECONDARY schools - multiple subjects
    employeeId: '',
    isTemporary: false,
    profileImage: null as string | null,
    classArmId: '',
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [uploadTeacherImage] = useUploadTeacherImageMutation();
  const [uploadAdminImage] = useUploadAdminImageMutation();

  // Get subjects for all school types
  const {
    data: subjectsResponse,
    isLoading: isLoadingSubjects,
  } = useGetSubjectsQuery(
    { schoolId: schoolId!, schoolType: currentType || undefined },
    { skip: !schoolId || !currentType }
  );
  const subjects = subjectsResponse?.data || [];

  // Get ClassArms for PRIMARY schools
  const isPrimary = currentType === 'PRIMARY';
  const {
    data: classArmsResponse,
    isLoading: isLoadingClassArms,
    isFetching: isFetchingClassArms
  } = useGetClassArmsQuery(
    { schoolId: schoolId!, schoolType: 'PRIMARY' },
    { skip: !schoolId || !isPrimary }
  );
  const classArms = classArmsResponse?.data || [];

  const {
    data: classLevelsResponse,
    isLoading: isLoadingClassLevels,
    isFetching: isFetchingClassLevels
  } = useGetClassLevelsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !isPrimary }
  );
  const classLevels = classLevelsResponse?.data || [];

  // Group ClassArms by ClassLevel
  const classArmsByLevel = useMemo(() => {
    return classLevels.reduce((acc, level) => {
      acc[level.id] = classArms.filter(arm => arm.classLevelId === level.id);
      return acc;
    }, {} as Record<string, typeof classArms>);
  }, [classArms, classLevels]);

  const classArmsLoaded = !isLoadingClassArms && !isFetchingClassArms && !isLoadingClassLevels && !isFetchingClassLevels;

  // Generate default classes mutation
  const [generateDefaultClasses, { isLoading: isGeneratingClasses }] = useGenerateDefaultClassesMutation();

  const handleGenerateClasses = async () => {
    if (!schoolId || !currentType) return;
    try {
      await generateDefaultClasses({
        schoolId,
        schoolType: currentType,
      }).unwrap();
      toast.success('Default classes generated successfully! You can now assign a class to the teacher.');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to generate classes');
    }
  };

  // Get school ID from localStorage (stored during login) or fetch from API
  useEffect(() => {
    const getSchoolId = async () => {
      if (!user?.id || user.role !== 'SCHOOL_ADMIN') return;

      // First, try to get from localStorage (stored during login)
      const storedSchoolId = typeof window !== 'undefined'
        ? localStorage.getItem('currentSchoolId')
        : null;

      if (storedSchoolId) {
        setSchoolId(storedSchoolId);
        return;
      }

      // Fallback: Fetch from API (get first school admin is associated with)
      try {
        const response = await apiCall<Array<{ id: string }>>('/schools', {
          requireAuth: true,
        });

        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          // For now, use the first school (works for single-school admins)
          // In a multi-tenant setup, this would be determined by the JWT context
          setSchoolId(response.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch school ID:', error);
      }
    };

    getSchoolId();
  }, [user, apiCall]);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string): string => {
    if (!str) return str;
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to capitalize first letter only
  const capitalizeFirst = (str: string): string => {
    if (!str) return str;
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
  };

  const validateForm = (): boolean => {
    setErrors({});
    setSubmitError(null);

    try {
      if (staffType === 'teacher') {
        addTeacherFormSchema.parse({
          ...formData,
          subject: currentType === 'PRIMARY'
            ? (classArms.find(a => a.id === formData.classArmId) ? `${classArms.find(a => a.id === formData.classArmId)?.classLevelName} ${classArms.find(a => a.id === formData.classArmId)?.name}` : undefined)
            : formData.subject || undefined,
          employeeId: formData.employeeId || undefined,
        });
      } else {
        if (!adminRole.trim()) {
          setErrors({ adminRole: 'Role is required' });
          return false;
        }

        // Only school owners can add principal roles
        if (isPrincipalRole(adminRole) && !isSchoolOwnerRole(currentAdminRole)) {
          setErrors({
            adminRole: 'Only a School Owner can add staff with principal roles (Principal, Head Teacher, etc.)'
          });
          toast.error('Unauthorized role assignment');
          return false;
        }

        addAdminFormSchema.parse({
          ...formData,
          role: adminRole,
          employeeId: formData.employeeId || undefined,
        });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: FormErrors = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Validation error:', error);
        setSubmitError('Validation failed. Please check your inputs.');
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!schoolId) {
      setSubmitError('Unable to determine school. Please try refreshing the page.');
      return;
    }

    setIsLoading(true);

    try {
      let profileImageUrl: string | undefined = undefined;

      // Upload image first if selected
      if (selectedImageFile && schoolId) {
        try {
          // For now, we'll upload the image after creating the staff member
          // We'll need to get the staff ID from the response
          // For simplicity, we'll include the image URL in the creation payload if we have it
          // Otherwise, we'll upload it after creation
          profileImageUrl = formData.profileImage || undefined;
        } catch (error: any) {
          console.error('Image upload error:', error);
          toast.error('Failed to upload image. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      if (staffType === 'teacher') {
        const teacherData: {
          firstName: string;
          lastName: string;
          email: string;
          phone: string;
          subject?: string;
          subjectIds?: string[];
          isTemporary: boolean;
          employeeId?: string;
          profileImage?: string;
          schoolType?: string;
          classArmId?: string;
        } = {
          firstName: capitalizeWords(formData.firstName),
          lastName: capitalizeWords(formData.lastName),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          isTemporary: formData.isTemporary,
          employeeId: formData.employeeId.trim() || undefined,
          profileImage: profileImageUrl,
          schoolType: currentType || undefined,
        };

        // Use subjectIds for all school types that have subject selection
        if (formData.subjectIds.length > 0) {
          teacherData.subjectIds = formData.subjectIds;
        }
        
        // For PRIMARY schools, also send classArmId if selected
        if (currentType === 'PRIMARY' && formData.classArmId) {
          teacherData.classArmId = formData.classArmId;
          // Also set subject for display purposes (backward compatibility)
          const selectedArm = classArms.find(arm => arm.id === formData.classArmId);
          if (selectedArm) {
            teacherData.subject = `${selectedArm.classLevelName} ${selectedArm.name}`;
          }
        }

        const result = await addTeacher(teacherData);

        // Upload image after creation if we have a file but no URL
        if (selectedImageFile && result?.data?.id && schoolId) {
          try {
            await uploadTeacherImage({
              schoolId,
              teacherId: result.data.id,
              file: selectedImageFile,
            }).unwrap();
          } catch (error: any) {
            console.error('Failed to upload image after creation:', error);
            // Don't fail the whole operation, just log the error
          }
        }

        router.push('/dashboard/school/staff');
      } else {
        // Check if the role is a Principal role - they don't need custom permissions
        const isPrincipalRoleCheck = isPrincipalRole(adminRole);

        // Debug logging
        console.log('🔐 [AddStaff] Permission assignment debug:', {
          role: capitalizeWords(adminRole),
          isPrincipalRole: isPrincipalRoleCheck,
          adminPermissionsCount: adminPermissions.length,
          willSendPermissions: !isPrincipalRoleCheck,
        });

        const adminData = {
          firstName: capitalizeWords(formData.firstName),
          lastName: capitalizeWords(formData.lastName),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          role: capitalizeWords(adminRole),
          employeeId: formData.employeeId.trim() || undefined,
          profileImage: profileImageUrl,
          // Scope admin to current school type
          schoolType: currentType || undefined,
          // Only include permissions for non-principal roles
          permissions: isPrincipalRoleCheck ? undefined : adminPermissions,
        };

        console.log('🔐 [AddStaff] Sending admin data with permissions:', {
          permissionsIncluded: !!adminData.permissions,
          permissionsCount: adminData.permissions?.length || 0,
        });

        const result = await addAdmin(adminData);

        // Upload image after creation if we have a file but no URL
        if (selectedImageFile && result?.data?.id && schoolId) {
          try {
            await uploadAdminImage({
              schoolId,
              adminId: result.data.id,
              file: selectedImageFile,
            }).unwrap();
          } catch (error: any) {
            console.error('Failed to upload image after creation:', error);
            // Don't fail the whole operation, just log the error
          }
        }

        router.push('/dashboard/school/staff');
      }
    } catch (error: any) {
      // Error handling is done in the hooks (toast notifications)
      // Use data.message first (backend error), fall back to a generic message.
      // Never use error.message directly as it may expose internal URLs.
      const errorMessage =
        error?.data?.message ||
        'Failed to add staff member. Please try again.';
      setSubmitError(errorMessage);
      setIsLoading(false);
    }
  };

  const isTeacher = staffType === 'teacher';
  const isLoadingState = isLoading || isAddingTeacher || isAddingAdmin;

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full max-w-4xl mx-auto">
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <BackButton fallbackUrl="/dashboard/school/staff" className="mb-4" />
          <h1 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-page-title)' }}>
            Add New Staff
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-page-subtitle)' }}>
            Register a new {terminology.staffSingular.toLowerCase()} in your school
          </p>
        </FadeInUp>

        <Card>
          <CardHeader>
            <CardTitle className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-card-title)' }}>
              Staff Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submitError && (
              <Alert variant="error" className="mb-6">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Staff Type Selection */}
              <div className="space-y-3">
                <label className="block font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                  Staff Type *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStaffType('teacher');
                      setErrors({});
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${staffType === 'teacher'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-light-border dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users
                        className={`h-5 w-5 ${staffType === 'teacher'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-light-text-secondary dark:text-dark-text-secondary'
                          }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-semibold ${staffType === 'teacher'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-light-text-primary dark:text-dark-text-primary'
                            }`}
                        >
                          {terminology.staffSingular}
                        </p>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                          Teaching staff
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffType('admin');
                      setErrors({});
                      // Reset permissions to defaults when switching to admin
                      setAdminPermissions(getDefaultReadPermissions());
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${staffType === 'admin'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-light-border dark:border-dark-border hover:border-blue-300 dark:hover:border-blue-700'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus
                        className={`h-5 w-5 ${staffType === 'admin'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-light-text-secondary dark:text-dark-text-secondary'
                          }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-semibold ${staffType === 'admin'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-light-text-primary dark:text-dark-text-primary'
                            }`}
                        >
                          Administrator
                        </p>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>
                          Admin staff (VP, Bursar, etc.)
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Personal Information */}
              <div className="pt-4 border-t border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-section-title)' }}>
                    Personal Information
                  </h3>
                  <div className="flex-shrink-0">
                    <ImageUpload
                      value={formData.profileImage}
                      onChange={(url) => {
                        setFormData({ ...formData, profileImage: url });
                      }}
                      onUpload={async (file) => {
                        setSelectedImageFile(file);
                        return URL.createObjectURL(file);
                      }}
                      disabled={isLoadingState}
                      enableCrop={true}
                      aspectRatio={1}
                      cropShape="rect"
                      compact
                      maxSizeMB={5}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => {
                      setFormData({ ...formData, firstName: e.target.value });
                      if (errors.firstName) {
                        setErrors({ ...errors, firstName: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setFormData({ ...formData, firstName: capitalized });
                      }
                    }}
                    required
                    error={errors.firstName}
                  />
                  <Input
                    label="Last Name *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({ ...formData, lastName: e.target.value });
                      if (errors.lastName) {
                        setErrors({ ...errors, lastName: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setFormData({ ...formData, lastName: capitalized });
                      }
                    }}
                    required
                    error={errors.lastName}
                  />
                  <Input
                    label="Email *"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    required
                    error={errors.email}
                  />
                  <PhoneInput
                    label="Phone *"
                    value={formData.phone}
                    onChange={(e164) => {
                      setFormData({ ...formData, phone: e164 });
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    required
                    error={errors.phone}
                    disabled={isLoadingState}
                    defaultCountryCode="NG"
                  />
                  <CountrySelector
                    label="Nationality"
                    value={formData.nationality}
                    onChange={(value) => {
                      setFormData({ ...formData, nationality: value });
                    }}
                    scope="west-africa"
                    placeholder="Select nationality"
                    disabled={isLoadingState}
                  />
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={(e) => {
                      setFormData({ ...formData, state: e.target.value });
                    }}
                    placeholder="e.g. Lagos, Abuja"
                  />
                  <Input
                    label="Employee ID"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => {
                      setFormData({ ...formData, employeeId: e.target.value });
                      if (errors.employeeId) {
                        setErrors({ ...errors, employeeId: undefined });
                      }
                    }}
                    placeholder="Optional employee ID"
                    helperText="Optional internal identifier for this staff member"
                    error={errors.employeeId}
                  />
                  <DatePicker
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={(value) => setFormData({ ...formData, dateOfBirth: value })}
                    disabled={isLoadingState}
                    placeholder="Select date of birth"
                  />
                </div>
              </div>

              {/* Role Input for Admin */}
              {staffType === 'admin' && (
                <div className="space-y-3 pt-4 border-t border-light-border dark:border-dark-border">
                  <Input
                    label="Role *"
                    name="adminRole"
                    value={adminRole}
                    onChange={(e) => {
                      setAdminRole(e.target.value);
                      if (errors.adminRole) {
                        setErrors({ ...errors, adminRole: undefined });
                      }
                    }}
                    onBlur={(e) => {
                      const capitalized = capitalizeWords(e.target.value);
                      if (capitalized !== e.target.value) {
                        setAdminRole(capitalized);
                      }
                    }}
                    placeholder={
                      isSchoolOwnerRole(currentAdminRole)
                        ? "e.g., Principal, Vice Principal, Bursar"
                        : "e.g., Vice Principal, Bursar, Secretary"
                    }
                    required
                    helperText={
                      isSchoolOwnerRole(currentAdminRole)
                        ? "Define the administrative role for this staff member."
                        : "Note: You cannot add staff with principal-level privileges (Principal, Head Teacher, etc.)."
                    }
                    error={errors.adminRole}
                  />
                  {currentType && (
                    <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-blue-700 dark:text-blue-300" style={{ fontSize: 'var(--text-small)' }}>
                        📍 This admin will be added to the <strong>{currentType.charAt(0) + currentType.slice(1).toLowerCase()}</strong> school section.
                        They will only appear in the staff list when the {currentType.charAt(0) + currentType.slice(1).toLowerCase()} tab is selected.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher-Specific Fields */}
              {isTeacher && (
                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
                    Teaching Information
                  </h3>

                  {/* For PRIMARY schools - Subject selection */}
                  {/* For SECONDARY schools - Multi-subject selection */}
                  {currentType === 'SECONDARY' && schoolId && (
                    <div className="mb-4 relative">
                      <SubjectMultiSelect
                        schoolId={schoolId}
                        selectedSubjectIds={formData.subjectIds}
                        onChange={(ids) => setFormData({ ...formData, subjectIds: ids })}
                        schoolType="SECONDARY"
                        label="Subjects Teacher Can Teach"
                        helperText="Optional: Select subjects this teacher is qualified to teach. They can be assigned to different classes later."
                        error={errors.subject}
                        disabled={isLoadingState}
                      />
                    </div>
                  )}

                  {/* For TERTIARY schools - Subject selection */}
                  {currentType === 'TERTIARY' && schoolId && (
                    <div className="mb-4 relative">
                      <SubjectMultiSelect
                        schoolId={schoolId}
                        selectedSubjectIds={formData.subjectIds}
                        onChange={(ids) => setFormData({ ...formData, subjectIds: ids })}
                        schoolType="TERTIARY"
                        label="Subject Teacher Can Teach"
                        helperText="Optional: Select subject this teacher is qualified to teach."
                        error={errors.subject}
                        disabled={isLoadingState}
                        maxSelections={1} // Tertiary schools typically have one subject per teacher
                      />
                    </div>
                  )}

                  {/* Show message if no subjects are available */}
                  {currentType !== 'PRIMARY' && schoolId && subjects.length === 0 && (
                    <div className="mb-4">
                      <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 rounded-lg space-y-2">
                        <p className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                          ⚠️ No subjects found for your {currentType?.toLowerCase()} school section.
                        </p>
                        <p className="text-yellow-600 dark:text-yellow-500 text-xs">
                          You must generate subjects before you can assign them to teachers. You can generate standard subjects from the Subjects page.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/dashboard/school/subjects')}
                          className="mt-2"
                        >
                          Go to Subjects Page
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* For PRIMARY - Class Arm selection */}
                  {currentType === 'PRIMARY' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1" style={{ fontSize: 'var(--text-body)' }}>
                          Assigned {terminology.classSingular}
                        </label>
                        {!classArmsLoaded ? (
                          <div className="w-full px-4 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-card dark:bg-dark-surface">
                            <div className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Loading class arms...</span>
                            </div>
                          </div>
                        ) : classArms.length === 0 ? (
                          <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800 rounded-lg space-y-3">
                            <p className="text-yellow-700 dark:text-yellow-400 text-sm font-medium">
                              ⚠️ No {terminology.classPlural.toLowerCase()} found for your {currentType?.toLowerCase()} school section.
                            </p>
                            <p className="text-yellow-600 dark:text-yellow-500 text-xs">
                              You must have {terminology.classPlural.toLowerCase()} created before you can assign a {terminology.staffSingular.toLowerCase()} to one.
                              {isSchoolOwnerRole(currentAdminRole)
                                ? ` As a School Owner, you can generate default ${terminology.classPlural.toLowerCase()} now or create them manually in Settings.`
                                : ` Please contact the School Owner to set up the school ${terminology.classPlural.toLowerCase()}.`}
                            </p>
                            {isSchoolOwnerRole(currentAdminRole) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900/30"
                                onClick={handleGenerateClasses}
                                isLoading={isGeneratingClasses}
                              >
                                Generate Default {terminology.classPlural}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Select
                            name="classArmId"
                            value={formData.classArmId}
                            onChange={(e) => {
                              setFormData({ ...formData, classArmId: e.target.value });
                              if (errors.subject) setErrors({ ...errors, subject: undefined });
                            }}
                            error={errors.subject}
                            placeholder="Select Class (Optional)"
                          >
                            <option value="">Select Class (Optional)</option>
                            {classLevels.map((level) => {
                              const armsForLevel = classArmsByLevel[level.id] || [];
                              if (armsForLevel.length === 0) return null;
                              return (
                                <optgroup key={level.id} label={level.name}>
                                  {armsForLevel.map((arm) => (
                                    <option
                                      key={arm.id}
                                      value={arm.id}
                                      disabled={!!arm.assignedTeacher}
                                    >
                                      {level.name} {arm.name}{arm.assignedTeacher ? ` — ${arm.assignedTeacher.name} (assigned)` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </Select>
                        )}
                        <p className="text-light-text-muted dark:text-dark-text-muted text-xs mt-1">
                          Optional: You can assign the teacher to a class arm now, or do it later.
                        </p>
                      </div>
                    </div>
                  )}

                  
                  {/* Temporary staff checkbox - applies to all school types */}
                  <div className="flex items-center gap-3 mt-4">
                    <input
                      type="checkbox"
                      id="isTemporary"
                      checked={formData.isTemporary}
                      onChange={(e) =>
                        setFormData({ ...formData, isTemporary: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-light-border dark:border-dark-border rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="isTemporary"
                      className="text-light-text-primary dark:text-dark-text-primary cursor-pointer"
                      style={{ fontSize: 'var(--text-body)' }}
                    >
                      Temporary Staff
                    </label>
                  </div>
                </div>
              )}

              {/* Permissions Section for Admin - shown at the end of the form */}
              {staffType === 'admin' && (
                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                  <PermissionSelector
                    value={adminPermissions}
                    onChange={setAdminPermissions}
                    disabled={isLoadingState}
                  />
                  <p className="text-light-text-muted dark:text-dark-text-muted mt-2" style={{ fontSize: 'var(--text-small)' }}>
                    💡 Tip: Principals automatically have full access and their permissions cannot be modified.
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Link href="/dashboard/school/staff">
                  <Button type="button" variant="ghost" disabled={isLoadingState}>
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  isLoading={isLoadingState}
                  disabled={
                    !formData.firstName.trim() ||
                    !formData.lastName.trim() ||
                    !formData.email.trim() ||
                    !formData.phone.trim() ||
                    (staffType === 'admin' && !adminRole.trim())
                  }
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
