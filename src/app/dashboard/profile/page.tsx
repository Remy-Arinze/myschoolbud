'use client';

import { useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeInUp } from '@/components/ui/FadeInUp';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  GraduationCap,
  Download,
  Award,
  School,
  FileText,
  TrendingUp,
  Users,
  Edit,
  Building2,
  Globe,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { RootState } from '@/lib/store/store';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import { useChangePasswordMutation, useUploadProfileImageMutation } from '@/lib/store/api/apiSlice';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { ProfileAvatarUpload } from '@/components/profile/ProfileAvatarUpload';
import { SessionLogsModal } from '@/components/profile/SessionLogsModal';

// Mock data - will be replaced with API calls later
const teachingHistory = [
  {
    schoolId: '1',
    schoolName: 'Greenfield Primary School',
    schoolType: 'Primary',
    startDate: '2018-09-01',
    endDate: '2021-07-31',
    subject: 'Mathematics',
    certificates: [
      {
        id: '1',
        name: 'Teacher of the Year 2020',
        issueDate: '2020-12-15',
        issuer: 'Greenfield Primary School',
        fileUrl: '#',
      },
    ],
    academicYears: [
      {
        year: '2020-2021',
        classLevels: ['Primary 5', 'Primary 6'],
        studentsTaught: 68,
        averagePerformance: 88.5,
        achievements: ['Best Mathematics Teacher', '100% Pass Rate'],
      },
      {
        year: '2019-2020',
        classLevels: ['Primary 4', 'Primary 5'],
        studentsTaught: 65,
        averagePerformance: 85.2,
        achievements: ['Excellence in Teaching'],
      },
      {
        year: '2018-2019',
        classLevels: ['Primary 3', 'Primary 4'],
        studentsTaught: 62,
        averagePerformance: 82.8,
        achievements: [],
      },
    ],
  },
  {
    schoolId: '2',
    schoolName: 'Riverside Junior Secondary School',
    schoolType: 'Junior Secondary',
    startDate: '2021-09-01',
    endDate: '2024-07-31',
    subject: 'Mathematics',
    certificates: [
      {
        id: '2',
        name: 'Outstanding Teacher Award',
        issueDate: '2023-12-10',
        issuer: 'Riverside Junior Secondary School',
        fileUrl: '#',
      },
    ],
    academicYears: [
      {
        year: '2023-2024',
        classLevels: ['JSS2', 'JSS3'],
        studentsTaught: 75,
        averagePerformance: 90.2,
        achievements: ['Teacher of the Year', 'Highest Pass Rate'],
      },
      {
        year: '2022-2023',
        classLevels: ['JSS1', 'JSS2'],
        studentsTaught: 72,
        averagePerformance: 87.5,
        achievements: ['Excellence Award'],
      },
      {
        year: '2021-2022',
        classLevels: ['JSS1'],
        studentsTaught: 38,
        averagePerformance: 84.3,
        achievements: [],
      },
    ],
  },
  {
    schoolId: '3',
    schoolName: 'Elite Senior Secondary School',
    schoolType: 'Senior Secondary',
    startDate: '2024-09-01',
    endDate: null, // Current school
    subject: 'Mathematics',
    certificates: [],
    academicYears: [
      {
        year: '2024-2025',
        classLevels: ['SS1', 'SS2'],
        studentsTaught: 60,
        averagePerformance: 89.8,
        achievements: [],
      },
    ],
  },
];

function ProfilePageContent() {
  const user = useSelector((state: RootState) => state.auth.user);
  const pathname = usePathname();
  const router = useRouter();
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'school'>('personal');
  const [showSessionLogs, setShowSessionLogs] = useState(false);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const hasPasswordErrors = 
    !!passwordErrors.currentPassword || 
    !!passwordErrors.newPassword || 
    !!passwordErrors.confirmPassword ||
    !passwordForm.currentPassword || 
    !passwordForm.newPassword || 
    !passwordForm.confirmPassword;

  // Fetch school data for school admins
  const { data: schoolResponse } = useGetMySchoolQuery(undefined, {
    skip: user?.role !== 'SCHOOL_ADMIN',
  });
  const school = schoolResponse?.data;

  // Mock teacher data - in real app, fetch based on user.id
  const teacherData = {
    firstName: 'Sarah',
    lastName: 'Williams',
    email: user?.email || 'sarah.w@school.com',
    phone: '+234 801 234 5678',
    address: '456 Teacher Street, Lagos',
    dateOfBirth: '1985-03-20',
    gender: 'Female',
    subject: 'Mathematics',
    classLevels: ['JSS1', 'JSS2', 'JSS3'],
    qualification: 'B.Ed Mathematics, M.Ed Curriculum Development',
    yearsOfExperience: 8,
    joinedDate: '2019-09-01',
    currentSchool: 'Elite Senior Secondary School',
  };

  const toggleSchool = (schoolId: string) => {
    setExpandedSchool(expandedSchool === schoolId ? null : schoolId);
    setExpandedYear(null);
  };

  const toggleYear = (yearKey: string) => {
    setExpandedYear(expandedYear === yearKey ? null : yearKey);
  };

  // Password validation
  const validatePassword = (password: string): string | undefined => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    // Sanitize: prevent injection attacks
    const dangerousChars = ['<', '>', '&', '"', "'", ';', '--', '/*', '*/'];
    for (const char of dangerousChars) {
      if (password.includes(char)) {
        return 'Password contains invalid characters';
      }
    }
    return undefined;
  };

  const handlePasswordChange = (field: string, value: string) => {
    // Don't trim password values - allow spaces (they'll be validated on submit)
    // Only sanitize to prevent injection attacks
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    setPasswordErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));

    // Validate new password in real-time
    if (field === 'newPassword' && value) {
      const error = validatePassword(value);
      if (error) {
        setPasswordErrors((prev) => ({
          ...prev,
          newPassword: error,
        }));
      }
    }

    // Validate confirm password
    if (field === 'confirmPassword' && value) {
      if (value !== passwordForm.newPassword) {
        setPasswordErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match',
        }));
      } else {
        setPasswordErrors((prev) => ({
          ...prev,
          confirmPassword: undefined,
        }));
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setPasswordErrors({});

    // Validate all fields
    let hasErrors = false;

    if (!passwordForm.currentPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: 'Current password is required',
      }));
      hasErrors = true;
    }

    if (!passwordForm.newPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: 'New password is required',
      }));
      hasErrors = true;
    } else {
      const newPasswordError = validatePassword(passwordForm.newPassword);
      if (newPasswordError) {
        setPasswordErrors((prev) => ({
          ...prev,
          newPassword: newPasswordError,
        }));
        hasErrors = true;
      }
    }

    if (!passwordForm.confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword: 'Please confirm your new password',
      }));
      hasErrors = true;
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }));
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    // Check if new password is same as current
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordErrors((prev) => ({
        ...prev,
        newPassword: 'New password must be different from current password',
      }));
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }).unwrap();

      toast.success('Password changed successfully!');

      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordChange(false);
      setPasswordErrors({});
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to change password';

      if (errorMessage.toLowerCase().includes('current password') || errorMessage.toLowerCase().includes('incorrect')) {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword: 'Current password is incorrect',
        }));
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Only show history for teachers
  const showHistory = user?.role === 'TEACHER';

  // Super Admin profile design
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Edit state for super admin
  const [editingFirstName, setEditingFirstName] = useState(false);
  const [editingLastName, setEditingLastName] = useState(false);
  const [firstNameValue, setFirstNameValue] = useState(user?.firstName || '');
  const [lastNameValue, setLastNameValue] = useState(user?.lastName || '');

  return (
    <ProtectedRoute>
      <div className="w-full">
        {/* Header */}
        <FadeInUp from={{ opacity: 0, y: -20 }} to={{ opacity: 1, y: 0 }} duration={0.5} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                {isSuperAdmin ? 'Profile' : 'My Profile'}
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {isSuperAdmin
                  ? "Here's your profile information"
                  : user?.role === 'TEACHER'
                    ? 'View your profile and complete teaching history'
                    : 'View and manage your profile information'}
              </p>
            </div>
            {user?.role === 'SCHOOL_ADMIN' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  router.push('/dashboard/school/settings/profile');
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit School Profile
              </Button>
            )}
          </div>
        </FadeInUp>

        {/* Profile Tabs Navigation */}
        <div className="mb-6 border-b border-light-border dark:border-[#1a1f2e]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={cn(
                'px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]',
                activeTab === 'personal'
                  ? 'border-[#2490FD] text-[#2490FD] dark:text-[#2490FD] bg-[#2490FD]/5'
                  : 'border-transparent text-light-text-secondary dark:text-[#9ca3af] hover:text-[#2490FD] hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Info
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                'px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]',
                activeTab === 'security'
                  ? 'border-[#2490FD] text-[#2490FD] dark:text-[#2490FD] bg-[#2490FD]/5'
                  : 'border-transparent text-light-text-secondary dark:text-[#9ca3af] hover:text-[#2490FD] hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </div>
            </button>

            {user?.role === 'SCHOOL_ADMIN' && (
              <button
                onClick={() => setActiveTab('school')}
                className={cn(
                  'px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px]',
                  activeTab === 'school'
                    ? 'border-[#2490FD] text-[#2490FD] dark:text-[#2490FD] bg-[#2490FD]/5'
                    : 'border-transparent text-light-text-secondary dark:text-[#9ca3af] hover:text-[#2490FD] hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  School Details
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Super Admin Profile - Personal Info Tab */}
        {isSuperAdmin && activeTab === 'personal' && (
          <FadeInUp duration={0.4}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column — identity card */}
              <div className="lg:col-span-4 space-y-4">
                {/* Avatar card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2490FD] to-[#1a6fcc] p-6 text-white shadow-xl shadow-blue-500/20">
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-white/5 blur-3xl" />
                  <div className="relative flex flex-col items-center text-center gap-4">
                    <ProfileAvatarUpload
                      currentImage={user?.profileImage || null}
                      firstName={user?.firstName || null}
                      lastName={user?.lastName || null}
                      size="lg"
                      onImageUpdate={(url) => {}}
                    />
                    <div>
                      <h2 className="text-xl font-bold leading-tight">
                        {user?.firstName && user?.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user?.email?.split('@')[0] || 'Super Admin'}
                      </h2>
                      <p className="text-sm text-blue-100 mt-0.5 opacity-80">{user?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider rounded-full">
                        Super Admin
                      </span>
                      <span className="px-3 py-1 bg-green-400/20 backdrop-blur-sm text-green-200 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info card */}
                <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-[#151a23] p-5 space-y-4">
                  <h4 className="text-xs font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">Account</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-[#2490FD]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">Email</p>
                        <p className="text-sm font-medium text-light-text-primary dark:text-white truncate">{user?.email || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-light-text-muted dark:text-dark-text-muted">Access Level</p>
                        <p className="text-sm font-medium text-light-text-primary dark:text-white">Global — All Schools</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column — editable details */}
              <div className="lg:col-span-8 space-y-4">
                <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-[#151a23] p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-light-text-primary dark:text-white">Personal Details</h3>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-0.5">Hover any field to edit</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-[#2490FD]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* First Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                        First Name
                      </label>
                      {editingFirstName ? (
                        <div className="flex items-center gap-2">
                          <Input value={firstNameValue} onChange={(e) => setFirstNameValue(e.target.value)} className="flex-1" autoFocus />
                          <Button size="sm" variant="primary" onClick={() => { setEditingFirstName(false); toast.success('First name updated'); }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setFirstNameValue(user?.firstName || ''); setEditingFirstName(false); }}>✕</Button>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer" onClick={() => setEditingFirstName(true)}>
                          <p className="flex-1 text-base font-semibold text-light-text-primary dark:text-white">{user?.firstName || <span className="text-light-text-muted italic font-normal">Not set</span>}</p>
                          <Edit className="h-3.5 w-3.5 text-light-text-muted opacity-0 group-hover:opacity-100 group-hover:text-[#2490FD] transition-all" />
                        </div>
                      )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                        Last Name
                      </label>
                      {editingLastName ? (
                        <div className="flex items-center gap-2">
                          <Input value={lastNameValue} onChange={(e) => setLastNameValue(e.target.value)} className="flex-1" autoFocus />
                          <Button size="sm" variant="primary" onClick={() => { setEditingLastName(false); toast.success('Last name updated'); }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setLastNameValue(user?.lastName || ''); setEditingLastName(false); }}>✕</Button>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer" onClick={() => setEditingLastName(true)}>
                          <p className="flex-1 text-base font-semibold text-light-text-primary dark:text-white">{user?.lastName || <span className="text-light-text-muted italic font-normal">Not set</span>}</p>
                          <Edit className="h-3.5 w-3.5 text-light-text-muted opacity-0 group-hover:opacity-100 group-hover:text-[#2490FD] transition-all" />
                        </div>
                      )}
                    </div>

                    {/* Email — read only */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                        Email Address
                      </label>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                        <p className="flex-1 text-base font-semibold text-light-text-primary dark:text-white">{user?.email || '—'}</p>
                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Verified</span>
                      </div>
                    </div>

                    {/* Phone — read only placeholder */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-light-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                        Phone Number
                      </label>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30">
                        <p className="flex-1 text-base text-light-text-muted dark:text-dark-text-muted italic">Not set</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notice banner */}
                <div className="flex gap-4 items-start p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-900/30">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Global Account</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                      Your account has elevated privileges across all Myschoolbud services. Security changes take effect immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>
        )}

        {/* Security / Password Tab */}
        {activeTab === 'security' && (
          <FadeInUp duration={0.4}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <div className="p-6 bg-white dark:bg-[#151a23] rounded-2xl shadow-sm border border-light-border dark:border-dark-border">
                  <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mb-4">
                    <Lock className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-light-text-primary dark:text-white">Security Settings</h3>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-2 leading-relaxed">
                    Update your password regularly to keep your account secure. Use a strong password with symbols and numbers.
                  </p>
                  <ul className="mt-6 space-y-3 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    <li className="flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                       At least 8 characters
                    </li>
                    <li className="flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                       Case-sensitive letters
                    </li>
                    <li className="flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                       Numbers and symbols
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-blue-600 rounded-2xl text-white">
                  <h4 className="text-base font-bold">Two-Factor Auth</h4>
                  <p className="text-sm text-blue-100 mt-2 opacity-80">
                    Your account is protected by mandatory OTP verification for logins.
                  </p>
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs"
                      onClick={() => setShowSessionLogs(true)}
                    >
                      View Session Log
                    </Button>
                  </div>
                </div>

                <div className="lg:col-span-8">
                <Card className="border-none shadow-premium bg-light-card dark:bg-dark-surface p-6 lg:p-10">
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-light-text-primary dark:text-white">Change Your Password</h3>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1">
                      Enter your current password to authorize this change.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="max-w-xl space-y-8">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Current Password */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-light-text-primary dark:text-white flex items-center gap-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            required
                            placeholder="••••••••"
                            className={cn(
                              "w-full px-4 py-4 bg-gray-50 dark:bg-gray-800/30 border-2 rounded-xl transition-all outline-none",
                              passwordErrors.currentPassword 
                                ? "border-red-500 focus:border-red-500" 
                                : "border-transparent focus:border-[#2490FD] focus:bg-white dark:focus:bg-[#151a23]"
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-light-text-muted hover:text-[#2490FD] transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {passwordErrors.currentPassword && (
                           <p className="text-xs font-medium text-red-500">{passwordErrors.currentPassword}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* New Password */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-light-text-primary dark:text-white">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordForm.newPassword}
                              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                              required
                              placeholder="New password"
                              className={cn(
                                "w-full px-4 py-4 bg-gray-50 dark:bg-gray-800/30 border-2 rounded-xl transition-all outline-none",
                                passwordErrors.newPassword 
                                  ? "border-red-500 focus:border-red-500" 
                                  : "border-transparent focus:border-[#2490FD] focus:bg-white dark:focus:bg-dark-surface"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-light-text-muted hover:text-[#2490FD] transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {passwordErrors.newPassword && (
                            <p className="text-xs font-medium text-red-500">{passwordErrors.newPassword}</p>
                          )}
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-light-text-primary dark:text-white">
                            Confirm Password
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={passwordForm.confirmPassword}
                              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                              required
                              placeholder="Confirm password"
                              className={cn(
                                "w-full px-4 py-4 bg-gray-50 dark:bg-gray-800/30 border-2 rounded-xl transition-all outline-none",
                                passwordErrors.confirmPassword 
                                  ? "border-red-500 focus:border-red-500" 
                                  : "border-transparent focus:border-[#2490FD] focus:bg-white dark:focus:bg-dark-surface"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-light-text-muted hover:text-[#2490FD] transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {passwordErrors.confirmPassword && (
                             <p className="text-xs font-medium text-red-500">{passwordErrors.confirmPassword}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-light-border dark:border-dark-border">
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          className="shadow-lg shadow-blue-500/20"
                          isLoading={isChangingPassword}
                          disabled={isChangingPassword || hasPasswordErrors}
                        >
                        {isChangingPassword ? 'Securely Updating...' : 'Update Password Now'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="border-2 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/10 transition-all font-bold"
                        onClick={() => {
                          setPasswordForm({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                          });
                          setPasswordErrors({});
                        }}
                        disabled={isChangingPassword}
                      >
                        Reset Form
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          </FadeInUp>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", isSuperAdmin && "hidden")}>
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Tab - Hide for Super Admin */}
            {!isSuperAdmin && activeTab === 'personal' && (
              <>
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          Personal Information
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col-reverse lg:flex-row gap-8">
                      {/* Left: Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            First Name
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {user?.firstName || teacherData.firstName}
                          </p>
                        </div>
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Last Name
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {user?.lastName || teacherData.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            Email
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {user?.email || teacherData.email}
                          </p>
                        </div>
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            Phone
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.phone}
                          </p>
                        </div>
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Date of Birth
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {new Date(teacherData.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Gender
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.gender}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[0.875rem] font-medium text-light-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            Address
                          </label>
                          <p className="text-[1rem] text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.address}
                          </p>
                        </div>
                      </div>

                      {/* Right: Avatar */}
                      <div className="flex flex-col items-center justify-start shrink-0 lg:w-48 lg:border-l lg:border-light-border lg:dark:border-dark-border lg:pl-8">
                        <ProfileAvatarUpload
                          currentImage={user?.profileImage || null}
                          firstName={user?.firstName || teacherData.firstName || null}
                          lastName={user?.lastName || teacherData.lastName || null}
                          size="lg"
                          onImageUpdate={(url) => {
                            // Setup logic if needed for updating via Redux
                          }}
                        />
                        <div className="mt-4 text-center">
                          <h2 className="text-[1.125rem] font-semibold text-light-text-primary dark:text-dark-text-primary">
                            {user?.firstName && user?.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : teacherData.firstName + ' ' + teacherData.lastName}
                          </h2>
                          <p className="text-[0.875rem] text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            {user?.email || teacherData.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Password Change Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          Security
                        </CardTitle>
                      </div>
                      {!showPasswordChange && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPasswordChange(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Change Password
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!showPasswordChange ? (
                      <div className="flex items-center justify-between p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div>
                          <p className="text-[0.875rem] font-medium text-light-text-primary dark:text-dark-text-primary">
                            Password
                          </p>
                          <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-1">
                            Last changed: Recently
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPasswordChange(true)}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                          <Input
                            label="Current Password"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            error={passwordErrors.currentPassword}
                            required
                            rightAddon={
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            }
                          />
                        </div>

                        <div>
                          <Input
                            label="New Password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            error={passwordErrors.newPassword}
                            required
                            helperText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
                            rightAddon={
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            }
                          />
                          {passwordForm.newPassword && !passwordErrors.newPassword && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Password meets requirements</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <Input
                            label="Confirm New Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            error={passwordErrors.confirmPassword}
                            required
                            rightAddon={
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-light-text-muted dark:text-dark-text-muted hover:text-light-text-primary dark:hover:text-dark-text-primary"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            }
                          />
                          {passwordForm.confirmPassword &&
                            passwordForm.newPassword === passwordForm.confirmPassword &&
                            !passwordErrors.confirmPassword && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Passwords match</span>
                              </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            type="submit"
                            variant="primary"
                            isLoading={isChangingPassword}
                            disabled={isChangingPassword || !!passwordErrors.currentPassword || !!passwordErrors.newPassword || !!passwordErrors.confirmPassword}
                          >
                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setShowPasswordChange(false);
                              setPasswordForm({
                                currentPassword: '',
                                newPassword: '',
                                confirmPassword: '',
                              });
                              setPasswordErrors({});
                            }}
                            disabled={isChangingPassword}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Information */}
                {user?.role === 'TEACHER' && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                          Professional Information
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Subject
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.subject}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Class Levels
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.classLevels.join(', ')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Qualification
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.qualification}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Years of Experience
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.yearsOfExperience} years
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Current School
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {teacherData.currentSchool}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                            Date Joined
                          </label>
                          <p className="text-base text-light-text-primary dark:text-dark-text-primary mt-1">
                            {new Date(teacherData.joinedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Teaching History - Only for Teachers */}
                {showHistory && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            Teaching History
                          </CardTitle>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download Full History
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {teachingHistory.map((school, schoolIndex) => {
                          const isCurrentSchool = school.endDate === null;
                          const isExpanded = expandedSchool === school.schoolId;

                          return (
                            <div
                              key={school.schoolId}
                              className={`pb-6 ${schoolIndex < teachingHistory.length - 1 ? 'border-b border-light-border dark:border-dark-border' : ''}`}
                            >
                              {/* School Header */}
                              <div
                                className="flex items-start justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface/50 p-3 rounded-lg transition-colors -m-3"
                                onClick={() => toggleSchool(school.schoolId)}
                              >
                                <div className="flex items-start gap-4 flex-1">
                                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                                    <School className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                        {school.schoolName}
                                      </h3>
                                      {isCurrentSchool && (
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(school.startDate).getFullYear()} -{' '}
                                        {school.endDate
                                          ? new Date(school.endDate).getFullYear()
                                          : 'Present'}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <BookOpen className="h-4 w-4" />
                                        {school.subject}
                                      </div>
                                      {school.certificates.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Award className="h-4 w-4" />
                                          {school.certificates.length} Award
                                          {school.certificates.length > 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  {isExpanded ? 'Collapse' : 'Expand'}
                                </Button>
                              </div>

                              {isExpanded && (
                                <div className="mt-4 space-y-4">
                                  {/* Certificates */}
                                  {school.certificates.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3 flex items-center gap-2">
                                        <Award className="h-5 w-5" />
                                        Awards & Certificates
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {school.certificates.map((certificate) => (
                                          <div
                                            key={certificate.id}
                                            className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                                          >
                                            <div className="flex items-start justify-between">
                                              <div>
                                                <h5 className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                                                  {certificate.name}
                                                </h5>
                                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                                  Issued by: {certificate.issuer}
                                                </p>
                                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                                  Date: {new Date(certificate.issueDate).toLocaleDateString()}
                                                </p>
                                              </div>
                                              <Button variant="ghost" size="sm">
                                                <Download className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Academic Years */}
                                  <div>
                                    <h4 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-3 flex items-center gap-2">
                                      <FileText className="h-5 w-5" />
                                      Teaching Performance
                                    </h4>
                                    <div className="space-y-3">
                                      {school.academicYears.map((academicYear) => {
                                        const yearKey = `${school.schoolId}-${academicYear.year}`;
                                        const isYearExpanded = expandedYear === yearKey;

                                        return (
                                          <div
                                            key={yearKey}
                                            className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border-l-4 border-l-blue-600 dark:border-l-blue-400"
                                          >
                                            <div
                                              className="cursor-pointer"
                                              onClick={() => toggleYear(yearKey)}
                                            >
                                              <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                  <h5 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                                                    {academicYear.year}
                                                  </h5>
                                                  <div className="flex flex-wrap items-center gap-4 text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                                                    <div className="flex items-center gap-1">
                                                      <BookOpen className="h-4 w-4" />
                                                      Classes: {academicYear.classLevels.join(', ')}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                      <Users className="h-4 w-4" />
                                                      Students: {academicYear.studentsTaught}
                                                    </div>
                                                    <div>
                                                      Avg Performance: <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{academicYear.averagePerformance}%</span>
                                                    </div>
                                                  </div>
                                                  {academicYear.achievements.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                      {academicYear.achievements.map((achievement, idx) => (
                                                        <span
                                                          key={idx}
                                                          className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded"
                                                        >
                                                          {achievement}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                                <Button variant="ghost" size="sm">
                                                  {isYearExpanded ? 'Hide Details' : 'Show Details'}
                                                </Button>
                                              </div>
                                            </div>
                                            {isYearExpanded && (
                                              <div className="mt-3 pt-3 border-t border-light-border dark:border-dark-border">
                                                <div className="space-y-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                                  <p>
                                                    <strong>Classes Taught:</strong> {academicYear.classLevels.join(', ')}
                                                  </p>
                                                  <p>
                                                    <strong>Total Students:</strong> {academicYear.studentsTaught}
                                                  </p>
                                                  <p>
                                                    <strong>Average Student Performance:</strong> {academicYear.averagePerformance}%
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* School Details Tab - Only for School Admin */}
            {user?.role === 'SCHOOL_ADMIN' && activeTab === 'school' && school && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-white">
                      School Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                        School Name
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        School ID
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.schoolId || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        State
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.state || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        City
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.city || 'N/A'}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Address
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.address || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Phone
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af] flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                        Country
                      </label>
                      <p className="text-base text-light-text-primary dark:text-white mt-1">
                        {school.country || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                        Status
                      </label>
                      <p className="text-base mt-1">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-medium',
                          school.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        )}>
                          {school.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* School Levels */}
                  <div className="mt-6 pt-6 border-t border-light-border dark:border-[#1a1f2e]">
                    <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      School Levels
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                            Primary
                          </span>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            school.hasPrimary
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          )}>
                            {school.hasPrimary ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                            Secondary
                          </span>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            school.hasSecondary
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          )}>
                            {school.hasSecondary ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                            Tertiary
                          </span>
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            school.hasTertiary
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          )}>
                            {school.hasTertiary ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* School Statistics */}
                  <div className="mt-6 pt-6 border-t border-light-border dark:border-[#1a1f2e]">
                    <h3 className="text-lg font-semibold text-light-text-primary dark:text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                            Teachers
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-white">
                          {school.teachersCount || 0}
                        </p>
                      </div>
                      <div className="p-4 bg-light-surface dark:bg-[#1f2937] rounded-lg border border-light-border dark:border-[#1a1f2e]">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-light-text-secondary dark:text-[#9ca3af]">
                            Students
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-white">
                          {school.studentsCount || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {showHistory && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                        Schools Taught At
                      </p>
                      <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        {teachingHistory.length}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                        Total Awards
                      </p>
                      <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        {teachingHistory.reduce((sum, school) => sum + school.certificates.length, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
                        Current Avg Performance
                      </p>
                      <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                        {teachingHistory
                          .find((s) => s.endDate === null)
                          ?.academicYears[0]?.averagePerformance.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div >
      <SessionLogsModal 
        isOpen={showSessionLogs} 
        onClose={() => setShowSessionLogs(false)} 
      />
    </ProtectedRoute >
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-light-text-secondary dark:text-dark-text-secondary">Loading...</div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  );
}

