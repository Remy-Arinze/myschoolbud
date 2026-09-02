import { apiSlice } from './apiSlice';

export type SettingsSection =
  | 'structure'
  | 'calendar'
  | 'grading'
  | 'permissions'
  | 'admissions'
  | 'timetable'
  | 'attendance'
  | 'communications'
  | 'finance'
  | 'curriculum'
  | 'security';

export interface SchoolStructureConfig {
  id: string;
  schoolId: string;
  terminologyOverrides?: Record<string, string> | null;
  defaultClassArmNames: string[];
  classLevelNamingMode: 'STANDARD' | 'CUSTOM';
  subjectRegistryMode: 'AGORA_DEFAULT' | 'AGORA_PLUS_CUSTOM' | 'CUSTOM_ONLY';
  defaultAgoraSubjectIds: string[];
  facultyStructureVisible: boolean;
  teacherScope: 'ASSIGNED_ONLY' | 'ALL_SCHOOL';
  customRoles: string[];
  admissionApproverRoles: string[];
  transferApproverRoles: string[];
}

export interface GradingPolicy {
  id: string;
  schoolId: string;
  gradeScaleType: 'PERCENTAGE' | 'A1_F9' | 'CUSTOM';
  gradeScaleBands?: Record<string, unknown> | null;
  passMark: number;
  defaultCaWeight: number;
  defaultExamWeight: number;
  defaultLateDuePenalty: number;
  defaultLateTimerPenalty: number;
  defaultIntegrityEnabled: boolean;
  defaultViolationThreshold: number;
  defaultPointsPerViolation: number;
  defaultAllowLateSubmissionAfterDue: boolean;
  defaultAllowLateSubmissionAfterTimer: boolean;
  templatesMode: 'SCHOOL_TEMPLATES' | 'TEACHER_DISCRETION';
  gradeLockDaysAfterTermEnd: number;
  reportCardReleaseMode: 'MANUAL' | 'AUTO_AFTER_LOCK' | 'AUTO_ON_TERM_END';
  gradeApprovalRequired: boolean;
  gradeApproverRoles: string[];
  minAttendancePercentForExam: number;
}

export interface AssessmentTemplate {
  id: string;
  schoolId: string;
  name: string;
  subjectId?: string | null;
  schoolType?: string | null;
  gradeType: 'CA' | 'ASSIGNMENT' | 'EXAM';
  maxScore: number;
  weight?: number | null;
  sequence?: number | null;
  description?: string | null;
  isActive: boolean;
}

export interface AdmissionPolicy {
  id: string;
  schoolId: string;
  applicationsOpen: boolean;
  applicationDeadline?: string | null;
  tacExpiryDays: number;
  transferPolicy: 'MANUAL_REVIEW' | 'AUTO_ACCEPT' | 'DISABLED';
  formFields?: Array<{ key: string; label: string; required: boolean; visible: boolean }> | null;
  documentRequirements?: Array<{ key: string; label: string; required: boolean; description?: string }> | null;
}

export interface SchoolSettingsAggregate {
  id: string;
  name: string;
  workingDays: string[];
  structureConfig?: SchoolStructureConfig | null;
  holidayPresets?: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    recurringRule?: string | null;
    schoolType?: string | null;
  }>;
  gradingPolicy?: GradingPolicy | null;
  roleTemplates?: Array<{ id: string; name: string; description?: string | null; permissionIds: string[]; isSystem: boolean }>;
  admissionPolicy?: AdmissionPolicy | null;
  bellScheduleTemplates?: Array<{ id: string; schoolType: string; periods: unknown; isDefault: boolean }>;
  timetablePolicy?: Record<string, unknown> | null;
  attendancePolicy?: Record<string, unknown> | null;
  notificationPolicy?: Record<string, unknown> | null;
  feeCategories?: Array<{ id: string; name: string }>;
  financePolicy?: Record<string, unknown> | null;
  curriculumPolicy?: Record<string, unknown> | null;
  loisConfig?: Record<string, unknown> | null;
  securityPolicy?: Record<string, unknown> | null;
  assessmentTemplates?: AssessmentTemplate[];
}

interface ResponseDto<T> {
  success: boolean;
  data: T;
  message: string;
}

export const schoolSettingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSchoolSettings: builder.query<ResponseDto<SchoolSettingsAggregate>, void>({
      query: () => '/school-admin/settings',
      providesTags: ['SchoolSettings'],
    }),
    getSettingsSection: builder.query<ResponseDto<unknown>, SettingsSection>({
      query: (section) => `/school-admin/settings/${section}`,
      providesTags: (_r, _e, section) => [{ type: 'SchoolSettings' as const, id: section }],
    }),
    updateSettingsSection: builder.mutation<
      ResponseDto<unknown>,
      { section: SettingsSection; body: Record<string, unknown> }
    >({
      query: ({ section, body }) => ({
        url: `/school-admin/settings/${section}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    createHolidayPreset: builder.mutation<ResponseDto<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/school-admin/settings/calendar/holidays', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    deleteHolidayPreset: builder.mutation<void, string>({
      query: (id) => ({ url: `/school-admin/settings/calendar/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    applyHolidayPreset: builder.mutation<ResponseDto<unknown>, string>({
      query: (id) => ({ url: `/school-admin/settings/calendar/holidays/${id}/apply`, method: 'POST' }),
      invalidatesTags: ['SchoolSettings', 'Event', 'School'],
    }),
    createRoleTemplate: builder.mutation<ResponseDto<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/school-admin/settings/permissions/role-templates', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    deleteRoleTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/school-admin/settings/permissions/role-templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    applyRoleTemplate: builder.mutation<ResponseDto<unknown>, { templateId: string; adminId: string }>({
      query: ({ templateId, adminId }) => ({
        url: `/school-admin/settings/permissions/role-templates/${templateId}/apply/${adminId}`,
        method: 'POST',
      }),
      invalidatesTags: ['SchoolSettings', 'Permission', 'School'],
    }),
    createAssessmentTemplate: builder.mutation<ResponseDto<AssessmentTemplate>, Record<string, unknown>>({
      query: (body) => ({ url: '/school-admin/settings/grading/templates', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    updateAssessmentTemplate: builder.mutation<ResponseDto<AssessmentTemplate>, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/school-admin/settings/grading/templates/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    deleteAssessmentTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/school-admin/settings/grading/templates/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    createFeeCategory: builder.mutation<ResponseDto<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/school-admin/settings/finance/categories', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    createFeeSchedule: builder.mutation<ResponseDto<unknown>, Record<string, unknown>>({
      query: (body) => ({ url: '/school-admin/settings/finance/schedules', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    generateFeesFromSchedule: builder.mutation<ResponseDto<{ count: number }>, string>({
      query: (id) => ({ url: `/school-admin/settings/finance/schedules/${id}/generate`, method: 'POST' }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    createKnowledgeDocument: builder.mutation<ResponseDto<unknown>, { title: string; content: string }>({
      query: (body) => ({ url: '/school-admin/settings/curriculum/knowledge', method: 'POST', body }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    deleteKnowledgeDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/school-admin/settings/curriculum/knowledge/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SchoolSettings', 'School'],
    }),
    getAuditLogs: builder.query<ResponseDto<{
      profileAudits: Array<{ id: string; action?: string; event?: string; createdAt: string }>;
      studentAudits: Array<{ id: string; action?: string; event?: string; createdAt: string }>;
    }>, void>({
      query: () => '/school-admin/settings/audit-logs',
      providesTags: ['SchoolSettings'],
    }),
  }),
});

export const {
  useGetSchoolSettingsQuery,
  useGetSettingsSectionQuery,
  useUpdateSettingsSectionMutation,
  useCreateHolidayPresetMutation,
  useDeleteHolidayPresetMutation,
  useApplyHolidayPresetMutation,
  useCreateRoleTemplateMutation,
  useDeleteRoleTemplateMutation,
  useApplyRoleTemplateMutation,
  useCreateAssessmentTemplateMutation,
  useUpdateAssessmentTemplateMutation,
  useDeleteAssessmentTemplateMutation,
  useCreateFeeCategoryMutation,
  useCreateFeeScheduleMutation,
  useGenerateFeesFromScheduleMutation,
  useCreateKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useGetAuditLogsQuery,
} = schoolSettingsApi;
