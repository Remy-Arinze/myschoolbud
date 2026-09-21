'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { ChevronDown, Loader2, UserCog, UserPlus, Users } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { useAddTeacher, useAddAdmin } from '@/hooks/useSchools';
import { addTeacherFormSchema } from '@/lib/validations/school-forms';
import { z } from 'zod';
import type { RootState } from '@/lib/store/store';
import { useApi } from '@/hooks/useApi';
import { useSchoolType } from '@/hooks/useSchoolType';
import { getTerminology } from '@/lib/utils/terminology';
import {
  useUploadTeacherImageMutation,
  useUploadAdminImageMutation,
  useGetRoleTemplatesQuery,
  useConvertTeacherToAdminMutation,
  AdminPermissionInput,
  RoleTemplate,
} from '@/lib/store/api/schoolsApi';
import { SubjectMultiSelect } from '@/components/teachers/SubjectMultiSelect';
import { AddStaffStepper } from '@/components/staff/AddStaffStepper';
import { AdminAccessStep } from '@/components/staff/AdminAccessStep';
import { AdminReviewStep } from '@/components/staff/AdminReviewStep';
import {
  useGetMySchoolQuery,
  useGetClassArmsQuery,
  useGetClassLevelsQuery,
  useGetSubjectsQuery,
  useGetAllPermissionsQuery,
  useAssignPermissionsMutation,
  useGenerateDefaultClassesMutation,
} from '@/lib/store/api/schoolAdminApi';
import { isSchoolOwnerRole, takenUniqueTitleMessage } from '@/lib/constants/roles';

type StaffType = 'teacher' | 'admin';

/** A person already on the school's books who matches the email being typed. */
type EmailMatch =
  | { kind: 'teacher'; id: string; name: string }
  | { kind: 'admin'; name: string };

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

const ADMIN_STEPS = ['Who', 'Access', 'Review'];
const ADMIN_STEP_KEYS = ['who', 'access', 'review'] as const;

function parseAdminStep(value: string | null): number {
  if (!value) return 1;
  const keyIndex = ADMIN_STEP_KEYS.indexOf(value as (typeof ADMIN_STEP_KEYS)[number]);
  if (keyIndex >= 0) return keyIndex + 1;
  const asNumber = Number(value);
  if (asNumber === 2 || asNumber === 3) return asNumber;
  return 1;
}

function hrefForAdminStep(step: number, currentSearch: string, basePath: string): string {
  const params = new URLSearchParams(currentSearch);
  if (step <= 1) params.delete('step');
  else params.set('step', ADMIN_STEP_KEYS[step - 1] ?? 'who');
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export default function AddStaffPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { apiCall } = useApi();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [staffType, setStaffType] = useState<StaffType>(
    parseAdminStep(searchParams.get('step')) > 1 ? 'admin' : 'teacher'
  );
  const step = staffType === 'admin' ? parseAdminStep(searchParams.get('step')) : 1;
  const stepNavDepth = useRef(0);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [adminRole, setAdminRole] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  // Access starts empty and has to be stated. The old default was view access
  // on every screen, which meant a new bursar could read grades and staff
  // records on day one because nobody thought to untick them.
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissionInput[]>([]);
  // The named role the access came from, if one was picked. Null means the
  // permissions were assembled by hand.
  const [roleTemplateId, setRoleTemplateId] = useState<string | null>(null);
  // Once the school has typed its own title, applying a role stops overwriting it.
  const [titleTouched, setTitleTouched] = useState(false);

  // Somebody with this email already works here.
  const [emailMatch, setEmailMatch] = useState<EmailMatch | null>(null);
  // Set when the match is a teacher and the school chose to give them an admin
  // account as well, rather than abandoning the form.
  const [convertTeacherId, setConvertTeacherId] = useState<string | null>(null);
  const [keepAsTeacher, setKeepAsTeacher] = useState(true);

  useEffect(() => {
    if (parseAdminStep(searchParams.get('step')) > 1) {
      setStaffType('admin');
    }
  }, [searchParams]);

  const { addTeacher, isLoading: isAddingTeacher } = useAddTeacher(schoolId);
  const { addAdmin, isLoading: isAddingAdmin } = useAddAdmin(schoolId);

  // Get school type and terminology
  const { currentType } = useSchoolType();
  const terminology = getTerminology(currentType);

  const { data: schoolResponse, refetch: refetchSchool } = useGetMySchoolQuery();
  const currentAdmin = schoolResponse?.data?.currentAdmin;
  const currentAdminRole = currentAdmin?.role;
  const existingAdmins = useMemo(
    () => schoolResponse?.data?.admins || [],
    [schoolResponse?.data?.admins]
  );
  const existingTeachers = useMemo(
    () => schoolResponse?.data?.teachers || [],
    [schoolResponse?.data?.teachers]
  );
  const existingAdminRoles = useMemo(
    () => existingAdmins.map((admin) => admin.role),
    [existingAdmins]
  );

  // Named access bundles. Choosing one fills in both the title and the access,
  // which is the difference between "what is a Bursar?" and eighteen rows of
  // checkboxes with no default.
  const { data: templatesResponse } = useGetRoleTemplatesQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || staffType !== 'admin' }
  );
  const roleTemplates = useMemo(() => templatesResponse?.data || [], [templatesResponse]);
  const selectedTemplate = useMemo(
    () => roleTemplates.find((t) => t.id === roleTemplateId) || null,
    [roleTemplates, roleTemplateId]
  );

  // Only needed to turn chosen resource/level pairs back into permission ids
  // when converting a teacher, which is the one path that assigns separately.
  const { data: allPermissionsResponse } = useGetAllPermissionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !convertTeacherId }
  );
  const [assignPermissions] = useAssignPermissionsMutation();
  const [convertTeacherToAdmin] = useConvertTeacherToAdminMutation();

  // Whether the ticks still match the role that was picked. If someone adjusts
  // the access afterwards, the admin is recorded as hand-built rather than as a
  // holder of a role they no longer match.
  const templateStillMatches = useMemo(() => {
    if (!selectedTemplate) return false;
    if (selectedTemplate.permissions.length !== adminPermissions.length) return false;
    const chosen = new Set(adminPermissions.map((p) => `${p.resource}:${p.type}`));
    return selectedTemplate.permissions.every((p) => chosen.has(`${p.resource}:${p.type}`));
  }, [selectedTemplate, adminPermissions]);

  /**
   * Applying a role copies its access; editing afterwards is allowed, and the
   * admin is then recorded as hand-edited rather than still "a Bursar".
   *
   * The title is only prefilled while the school has not written its own. It
   * used to be the same control as the role picker, so correcting the spelling
   * of a title silently detached the access from the role it came from.
   */
  const applyTemplate = (template: RoleTemplate) => {
    setRoleTemplateId(template.id);
    setAdminPermissions(
      template.permissions.map((p) => ({ resource: p.resource, type: p.type }))
    );
    if (!titleTouched || !adminRole.trim()) {
      setAdminRole(template.suggestedRole || template.name);
    }
    setErrors((prev) => ({ ...prev, adminRole: undefined }));
    setSubmitError(null);
  };

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
  const classArms = useMemo(() => classArmsResponse?.data || [], [classArmsResponse]);

  const {
    data: classLevelsResponse,
    isLoading: isLoadingClassLevels,
    isFetching: isFetchingClassLevels
  } = useGetClassLevelsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !isPrimary }
  );
  const classLevels = useMemo(() => classLevelsResponse?.data || [], [classLevelsResponse]);

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

  /**
   * Somebody with this email already works here.
   *
   * Checked as the field is left rather than at submit, where it surfaced as a
   * conflict only after the whole form had been filled in.
   */
  const checkEmail = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) {
      setEmailMatch(null);
      return;
    }

    const admin = existingAdmins.find((a) => a.email?.toLowerCase() === email);
    if (admin) {
      setEmailMatch({ kind: 'admin', name: `${admin.firstName} ${admin.lastName}` });
      setConvertTeacherId(null);
      return;
    }

    const teacher = existingTeachers.find((t) => t.email?.toLowerCase() === email);
    if (teacher) {
      setEmailMatch({
        kind: 'teacher',
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
      });
      // Retyping the email to reach a different colleague must not leave the
      // previous person queued for conversion.
      setConvertTeacherId((current) => (current === teacher.id ? current : null));
      return;
    }

    setEmailMatch(null);
    setConvertTeacherId(null);
  };

  /** Name, email, phone, and — for admins — date of birth. */
  const validateIdentity = (): boolean => {
    const next: FormErrors = {};
    if (!formData.firstName.trim()) next.firstName = 'First name is required';
    if (!formData.lastName.trim()) next.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) next.phone = 'Phone is required';
    if (staffType === 'admin' && !formData.dateOfBirth.trim()) {
      next.dateOfBirth = 'Date of birth is required';
    }

    if (emailMatch?.kind === 'admin') {
      next.email = `${emailMatch.name} is already an administrator here.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** Title and access, checked before the review step rather than at submit. */
  const validateAccess = (): boolean => {
    setSubmitError(null);

    if (!adminRole.trim()) {
      setErrors({ adminRole: 'A job title is required' });
      return false;
    }

    const takenTitle = takenUniqueTitleMessage(adminRole, existingAdminRoles);
    if (takenTitle) {
      setErrors({ adminRole: takenTitle });
      toast.error(takenTitle);
      return false;
    }

    // Access is never inferred, so refusing here is the whole point: an
    // administrator with nothing chosen would previously have been handed
    // view access to every screen in the school.
    if (adminPermissions.length === 0) {
      setErrors({ adminRole: undefined });
      setSubmitError(
        'Choose what this administrator can reach. Pick a role above, or tick the ' +
          'access they need.'
      );
      toast.error('No access chosen yet');
      return false;
    }

    setErrors({});
    return true;
  };

  const validateTeacherForm = (): boolean => {
    setErrors({});
    setSubmitError(null);

    try {
      addTeacherFormSchema.parse({
        ...formData,
        subject: currentType === 'PRIMARY'
          ? (classArms.find(a => a.id === formData.classArmId) ? `${classArms.find(a => a.id === formData.classArmId)?.classLevelName} ${classArms.find(a => a.id === formData.classArmId)?.name}` : undefined)
          : formData.subject || undefined,
        employeeId: formData.employeeId || undefined,
      });
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

  const goToStep = useCallback((next: number) => {
    setSubmitError(null);
    const clamped = Math.min(ADMIN_STEPS.length, Math.max(1, next));
    if (staffType !== 'admin' || clamped === step) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const href = hrefForAdminStep(clamped, searchParams.toString(), pathname);
    const delta = clamped - step;

    if (delta > 0) {
      stepNavDepth.current += delta;
      router.push(href, { scroll: false });
    } else {
      const backBy = -delta;
      if (stepNavDepth.current >= backBy) {
        stepNavDepth.current -= backBy;
        if (backBy === 1) {
          router.back();
        } else {
          window.history.go(-backBy);
        }
      } else {
        stepNavDepth.current = 0;
        router.replace(href, { scroll: false });
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, router, searchParams, staffType, step]);

  const handleContinue = () => {
    if (step === 1) {
      if (!validateIdentity()) return;
      goToStep(2);
      return;
    }
    if (step === 2) {
      if (!validateAccess()) return;
      goToStep(3);
    }
  };

  /**
   * Give an existing teacher an administrator account too.
   *
   * The conversion endpoint has no access step of its own and lands the new
   * admin on view-everything, so the access chosen here is written over it
   * immediately. Anything less would make this shortcut the one way to create
   * an administrator nobody chose the access for.
   */
  const convertExistingTeacher = async (): Promise<void> => {
    if (!schoolId || !convertTeacherId) return;

    await convertTeacherToAdmin({
      schoolId,
      teacherId: convertTeacherId,
      role: capitalizeWords(adminRole),
      keepAsTeacher,
    }).unwrap();

    const email = formData.email.trim().toLowerCase();
    const refreshed = await refetchSchool();
    const created = refreshed.data?.data?.admins?.find(
      (admin) => admin.email?.toLowerCase() === email
    );

    const catalog = allPermissionsResponse?.data || [];
    const idByKey = new Map(catalog.map((p) => [`${p.resource}:${p.type}`, p.id]));
    const permissionIds = adminPermissions
      .map((p) => idByKey.get(`${p.resource}:${p.type}`))
      .filter((id): id is string => !!id);

    if (!created || permissionIds.length !== adminPermissions.length) {
      toast.error(
        'Account created, but the access could not be applied. They currently have ' +
          'view access to everything — please set it from their profile.'
      );
      return;
    }

    await assignPermissions({
      schoolId,
      adminId: created.id,
      permissionIds,
    }).unwrap();
  };

  /**
   * The photo is uploaded once there is a record to attach it to. A failure
   * here is not a failed create, but it is not silent either — the old code
   * logged it to the console and let the user believe it had worked.
   */
  const uploadImageIfAny = async (kind: 'teacher' | 'admin', id?: string) => {
    if (!selectedImageFile || !id || !schoolId) return;
    try {
      if (kind === 'teacher') {
        await uploadTeacherImage({ schoolId, teacherId: id, file: selectedImageFile }).unwrap();
      } else {
        await uploadAdminImage({ schoolId, adminId: id, file: selectedImageFile }).unwrap();
      }
    } catch (error) {
      console.error('Failed to upload image after creation:', error);
      toast.error('Saved, but the profile photo did not upload. You can add it from their profile.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Enter in a text field submits the form. Part-way through the admin flow
    // that should move to the next step, not try to create anyone.
    if (staffType === 'admin' && step < 3) {
      handleContinue();
      return;
    }

    if (staffType === 'teacher') {
      if (!validateTeacherForm()) return;
    } else if (!validateIdentity() || !validateAccess()) {
      return;
    }

    if (!schoolId) {
      setSubmitError('Unable to determine school. Please try refreshing the page.');
      return;
    }

    setIsLoading(true);

    try {
      const profileImageUrl = formData.profileImage || undefined;

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
        await uploadImageIfAny('teacher', result?.data?.id);

        toast.success(`Invite sent to ${formData.email.trim().toLowerCase()}`);
        router.push('/dashboard/school/staff');
        return;
      }

      // An existing teacher keeps their login and gains an admin profile.
      if (convertTeacherId) {
        await convertExistingTeacher();
        toast.success(`${capitalizeWords(formData.firstName)} is now an administrator`);
        router.push('/dashboard/school/staff');
        return;
      }

      // The title is a label. Everyone created here lands on staff-level
      // access; principal-level authority is granted deliberately afterwards
      // from the staff list, never by what was typed in the title box.
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
        permissions: adminPermissions,
        // Recorded so later drift from the role is visible. Sent only when the
        // ticks still match it — the create endpoint takes one or the other,
        // and prefers the template, which would discard a hand-edit.
        roleTemplateId: templateStillMatches ? roleTemplateId || undefined : undefined,
      };

      const result = await addAdmin(adminData);
      await uploadImageIfAny('admin', result?.data?.id);

      toast.success(`Invite sent to ${adminData.email}`);
      router.push(
        result?.data?.id
          ? `/dashboard/school/staff/${result.data.id}`
          : '/dashboard/school/staff'
      );
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
  const steps = isTeacher ? [] : ADMIN_STEPS;
  const onIdentityStep = isTeacher || step === 1;

  const switchStaffType = (type: StaffType) => {
    setStaffType(type);
    setErrors({});
    setSubmitError(null);
    stepNavDepth.current = 0;
    if (searchParams.get('step')) {
      router.replace(pathname, { scroll: false });
    }
    if (type === 'teacher') {
      setConvertTeacherId(null);
    } else {
      // Back to nothing granted — the access step is deliberate.
      setAdminPermissions([]);
      setRoleTemplateId(null);
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className={`mx-auto w-full ${isTeacher || step === 1 ? 'max-w-4xl' : 'max-w-6xl'}`}>
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <BackButton
            fallbackUrl="/dashboard/school/staff"
            className="mb-4"
            onClick={() => {
              if (!isTeacher && step > 1) {
                goToStep(step - 1);
                return true;
              }
            }}
          />
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
              {isTeacher
                ? 'Staff Information'
                : step === 1
                  ? 'Who are you adding?'
                  : step === 2
                    ? 'What should they be able to reach?'
                    : 'Check this over'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddStaffStepper steps={steps} current={step} onStepClick={goToStep} />

            {submitError && (
              <Alert variant="error" className="mb-6">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {onIdentityStep && (
                <>
                  {/* Staff Type Selection */}
                  <div className="space-y-3">
                    <label className="block font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                      Staff Type *
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => switchStaffType('teacher')}
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
                        onClick={() => switchStaffType('admin')}
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
                        onBlur={(e) => checkEmail(e.target.value)}
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
                      {!isTeacher && (
                        <DatePicker
                          label="Date of Birth"
                          value={formData.dateOfBirth}
                          onChange={(value) => {
                            setFormData({ ...formData, dateOfBirth: value });
                            if (errors.dateOfBirth) {
                              setErrors({ ...errors, dateOfBirth: undefined });
                            }
                          }}
                          required
                          error={errors.dateOfBirth}
                          disabled={isLoadingState}
                          placeholder="Select date of birth"
                        />
                      )}
                    </div>

                    {/* Somebody with this email already works here. Said now, not
                        as a conflict after the whole form has been filled in. */}
                    {emailMatch?.kind === 'teacher' && (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                        <div className="flex items-start gap-2">
                          <UserCog className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                          <div className="space-y-2">
                            <p className="text-xs text-blue-800 dark:text-blue-300">
                              <strong>{emailMatch.name}</strong> already works here as a
                              teacher. You can give them an administrator account on the
                              same login instead of creating a second one.
                            </p>
                            {convertTeacherId === emailMatch.id ? (
                              <label className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                                <input
                                  type="checkbox"
                                  checked={keepAsTeacher}
                                  onChange={(e) => setKeepAsTeacher(e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-light-border dark:border-dark-border"
                                />
                                Keep them as a teacher as well
                              </label>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffType('admin');
                                  setConvertTeacherId(emailMatch.id);
                                  setFormData((prev) => ({
                                    ...prev,
                                    firstName: emailMatch.name.split(' ')[0] || prev.firstName,
                                    lastName:
                                      emailMatch.name.split(' ').slice(1).join(' ') ||
                                      prev.lastName,
                                  }));
                                }}
                                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                              >
                                Make them an administrator too
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {emailMatch?.kind === 'admin' && (
                      <Alert variant="error" className="mt-4">
                        {emailMatch.name} is already an administrator here. Open their
                        profile from the staff list to change what they can reach.
                      </Alert>
                    )}

                    {/* Optional detail. None of it affects access or the invite,
                        so it does not stand between the school and the decision
                        that matters. */}
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowMoreDetails((prev) => !prev)}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${showMoreDetails ? '' : '-rotate-90'}`}
                        />
                        {showMoreDetails ? 'Hide extra details' : 'Add more details (optional)'}
                      </button>

                      {showMoreDetails && (
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                          {isTeacher && (
                            <DatePicker
                              label="Date of Birth"
                              value={formData.dateOfBirth}
                              onChange={(value) => setFormData({ ...formData, dateOfBirth: value })}
                              disabled={isLoadingState}
                              placeholder="Select date of birth"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {staffType === 'admin' && currentType && (
                      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <p className="text-blue-700 dark:text-blue-300" style={{ fontSize: 'var(--text-small)' }}>
                          📍 This admin will be added to the <strong>{currentType.charAt(0) + currentType.slice(1).toLowerCase()}</strong> school section.
                          They will only appear in the staff list when the {currentType.charAt(0) + currentType.slice(1).toLowerCase()} tab is selected.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Teacher-Specific Fields */}
              {isTeacher && (
                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                  <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
                    Teaching Information
                  </h3>

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

              {/* Access for Admin, with the dashboard it produces beside it */}
              {!isTeacher && step === 2 && schoolId && (
                <AdminAccessStep
                  schoolId={schoolId}
                  templates={roleTemplates}
                  admins={existingAdmins}
                  currentAdminId={currentAdmin?.id}
                  currentAdminRole={currentAdminRole}
                  personName={formData.firstName.trim() || undefined}
                  roleTitle={adminRole}
                  onRoleTitleChange={(title) => {
                    setAdminRole(title);
                    setTitleTouched(true);
                    if (errors.adminRole) setErrors({ ...errors, adminRole: undefined });
                  }}
                  roleTitleError={errors.adminRole}
                  templateId={roleTemplateId}
                  templateCustomised={!!selectedTemplate && !templateStillMatches}
                  onApplyTemplate={applyTemplate}
                  onStartFromScratch={() => {
                    setRoleTemplateId(null);
                    setAdminPermissions([]);
                  }}
                  onReapplyTemplate={() => {
                    if (selectedTemplate) applyTemplate(selectedTemplate);
                  }}
                  permissions={adminPermissions}
                  onPermissionsChange={(next) => {
                    setAdminPermissions(next);
                    setSubmitError(null);
                  }}
                  onCopyFromAdmin={(permissions, sourceName) => {
                    setRoleTemplateId(null);
                    setAdminPermissions(permissions);
                    setSubmitError(null);
                    toast.success(`Copied ${sourceName}'s access`);
                  }}
                  disabled={isLoadingState}
                />
              )}

              {!isTeacher && step === 3 && (
                <AdminReviewStep
                  firstName={capitalizeWords(formData.firstName)}
                  lastName={capitalizeWords(formData.lastName)}
                  email={formData.email.trim().toLowerCase()}
                  phone={formData.phone}
                  dateOfBirth={formData.dateOfBirth}
                  roleTitle={capitalizeWords(adminRole)}
                  template={selectedTemplate}
                  templateCustomised={!!selectedTemplate && !templateStillMatches}
                  permissions={adminPermissions}
                  convertingTeacherName={
                    convertTeacherId && emailMatch?.kind === 'teacher' ? emailMatch.name : null
                  }
                  keepAsTeacher={keepAsTeacher}
                  onEditStep={goToStep}
                />
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                {!isTeacher && step > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goToStep(step - 1)}
                    disabled={isLoadingState}
                  >
                    Back
                  </Button>
                ) : (
                  <Link href="/dashboard/school/staff">
                    <Button type="button" variant="ghost" disabled={isLoadingState}>
                      Cancel
                    </Button>
                  </Link>
                )}

                {!isTeacher && step < 3 ? (
                  <Button type="button" onClick={handleContinue} disabled={isLoadingState}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" isLoading={isLoadingState}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isTeacher ? `Add ${terminology.staffSingular}` : 'Send invite'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
