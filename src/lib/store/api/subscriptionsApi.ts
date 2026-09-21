import { apiSlice } from './apiSlice';

// Enums
export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  PRO_PLUS = 'PRO_PLUS',
  CUSTOM = 'CUSTOM',
}

export enum ToolStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

// Types
export interface ToolDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  isCore: boolean;
  isActive: boolean;
  features: { name: string; description: string }[] | null;
  targetRoles: string[];
}

export interface SchoolToolAccessDto {
  id: string;
  toolId: string;
  tool: ToolDto;
  status: ToolStatus;
  trialEndsAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

export interface SubscriptionDto {
  id: string;
  schoolId: string;
  tier: SubscriptionTier;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  maxStudents: number;
  maxTeachers: number;
  maxAdmins: number;
  aiCredits: number;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  toolAccess: SchoolToolAccessDto[];
}

export type SubscriptionBillingPhase = 'OK' | 'GRACE_PERIOD' | 'ADMIN_ACTION_REQUIRED';

export interface SubscriptionBillingSummaryDto {
  phase: SubscriptionBillingPhase;
  graceEndsAt: string | null;
  paidPeriodEndDate: string | null;
  isRecurring?: boolean;
  paystackSubscriptionCode?: string | null;
}

export interface SubscriptionSummaryDto {
  tier: SubscriptionTier;
  isActive: boolean;
  aiCredits: number;        // -1 = unlimited
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
  /** When false, paid period has ended — AI is off even if credits remain (they roll over on renewal). */
  aiPeriodActive?: boolean;
  limits: {
    maxStudents: number;    // -1 = unlimited
    maxTeachers: number;    // -1 = unlimited
    maxAdmins: number;      // -1 = unlimited (Enterprise only)
  };
  usage?: {
    students: number;
    teachers: number;
    admins: number;
  };
  tools: {
    slug: string;
    name: string;
    status: ToolStatus;
    hasAccess: boolean;
  }[];
  billing?: SubscriptionBillingSummaryDto;
}

export interface BillingUiFlagsDto {
  showGraceBanner: boolean;
  blockAdminDashboard: boolean;
  /** @deprecated use teacherBillingLimited */
  teacherReadOnlyMode?: boolean;
  teacherBillingLimited?: boolean;
}

export interface AdminBillingStateDto {
  phase: SubscriptionBillingPhase;
  tier: SubscriptionTier;
  paidEndDate: string | null;
  graceEndsAt: string | null;
  operationalStudentCount: number;
  freeTierStudentCap: number;
  graceDaysTotal: number;
}

export interface DowngradePreviewEnrollmentDto {
  enrollmentId: string;
  studentId: string;
  name: string;
  publicId: string | null;
  enrollmentDate: string;
}

export interface DowngradePreviewDto {
  operationalStudentCount: number;
  freeMaxStudents: number;
  freeMaxTeachers: number;
  freeMaxAdmins: number;
  studentsToLockIfNoSelection: number;
  teachersToSuspendIfNoAction: number;
  adminsToSuspendIfNoAction: number;
  enrollments: DowngradePreviewEnrollmentDto[];
  requiresStudentPick: boolean;
  pickExactly: number;
}

export interface ToolAccessResultDto {
  hasAccess: boolean;
  status: ToolStatus | null;
  tool: ToolDto | null;
  reason?: string;
  trialDaysRemaining?: number;
}

export type AiUsagePeriod = 'day' | 'week' | 'month';

export interface AiUsageLogDto {
  id: string;
  action: string;
  creditsUsed: number;
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    profileImage?: string | null;
  };
}

export interface AiCreditsResultDto {
  success: boolean;
  creditsUsed: number;
  creditsRemaining: number;
  message?: string;
}

export interface UseAiCreditsRequest {
  credits: number;
  action?: string;
}

export interface TopUpAiCreditsRequest {
  credits: number;
}

// Response wrapper
export interface ResponseDto<T> {
  success: boolean;
  data: T;
}

export interface FeatureDto {
  text: string;
  included: boolean;
  isGlowing?: boolean;
}

export interface SubscriptionPlanDto {
  id: string;
  tierCode: SubscriptionTier;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  features: FeatureDto[];
  highlight: boolean;
  cta: string;
  accent: string;
  isPublic: boolean;
  customSchoolId: string | null;
  customSchool?: { name: string; } | null;
  maxStudents: number;
  maxTeachers: number;
  maxAdmins: number;
  aiCredits: number;
}

// API Slice
export const subscriptionsApi = apiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Get current school's subscription
    getMySubscription: builder.query<ResponseDto<SubscriptionDto>, void>({
      query: () => '/subscriptions/my-subscription',
      providesTags: ['Subscription'],
    }),

    // Get subscription summary (lightweight)
    getSubscriptionSummary: builder.query<ResponseDto<SubscriptionSummaryDto | null>, void>({
      query: () => '/subscriptions/summary',
      providesTags: ['Subscription'],
    }),

    // Get a specific school's subscription tier (Super Admin only)
    getSchoolSubscriptionTier: builder.query<
      { success: boolean; data: { tier: string; isActive: boolean } },
      string
    >({
      query: (schoolId) => `/schools/${schoolId}/subscription-tier`,
      providesTags: (_r, _e, schoolId) => [{ type: 'Subscription', id: `school-${schoolId}` }],
    }),

    getBillingUiFlags: builder.query<ResponseDto<BillingUiFlagsDto | null>, void>({
      query: () => '/subscriptions/billing/ui-flags',
      providesTags: ['Subscription'],
    }),

    getAdminBillingState: builder.query<ResponseDto<AdminBillingStateDto | null>, void>({
      query: () => '/subscriptions/billing/admin-state',
      providesTags: ['Subscription'],
    }),

    getDowngradePreview: builder.query<ResponseDto<DowngradePreviewDto | null>, void>({
      query: () => '/subscriptions/billing/downgrade-preview',
      providesTags: ['Subscription'],
    }),

    downgradeToFree: builder.mutation<ResponseDto<{ message: string }>, { keepEnrollmentIds: string[] }>({
      query: (body) => ({
        url: '/subscriptions/billing/downgrade-to-free',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),

    // Check tool access
    checkToolAccess: builder.query<ResponseDto<ToolAccessResultDto>, string>({
      query: (toolSlug) => `/subscriptions/tools/${toolSlug}/access`,
      providesTags: (_result, _error, toolSlug) => [{ type: 'Subscription', id: `tool-${toolSlug}` }],
    }),

    // Get all available tools
    getAllTools: builder.query<ResponseDto<ToolDto[]>, void>({
      query: () => '/subscriptions/tools',
      providesTags: ['Subscription'],
    }),

    // Get tools for current user's role
    getMyTools: builder.query<ResponseDto<ToolDto[]>, void>({
      query: () => '/subscriptions/tools/my-tools',
      providesTags: ['Subscription'],
    }),

    // Use AI credits
    useAiCredits: builder.mutation<ResponseDto<AiCreditsResultDto>, UseAiCreditsRequest>({
      query: (body) => ({
        url: '/subscriptions/ai-credits/use',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),

    topUpAiCredits: builder.mutation<ResponseDto<AiCreditsResultDto>, TopUpAiCreditsRequest>({
      query: (body) => ({
        url: '/subscriptions/ai-credits/top-up',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Subscription'],
    }),

    // AI Usage History
    getAiUsageHistory: builder.query<ResponseDto<AiUsageLogDto[]>, AiUsagePeriod | void>({
      query: (period = 'week') => ({
        url: '/subscriptions/ai-usage',
        params: { period },
      }),
      providesTags: ['Subscription'],
    }),

    // Plans
    getPublicPlans: builder.query<ResponseDto<SubscriptionPlanDto[]>, void>({
      query: () => '/subscription-plans/public',
      providesTags: ['SubscriptionPlan'],
    }),

    getPlansForSchool: builder.query<ResponseDto<SubscriptionPlanDto[]>, void>({
      query: () => '/subscription-plans/school',
      providesTags: ['SubscriptionPlan'],
    }),

    getAllPlansAdmin: builder.query<ResponseDto<SubscriptionPlanDto[]>, void>({
      query: () => '/subscription-plans/admin',
      providesTags: ['SubscriptionPlan'],
    }),

    createPlanAdmin: builder.mutation<ResponseDto<SubscriptionPlanDto>, Partial<SubscriptionPlanDto>>({
      query: (body) => ({
        url: '/subscription-plans/admin',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),

    updatePlanAdmin: builder.mutation<ResponseDto<SubscriptionPlanDto>, { id: string; data: Partial<SubscriptionPlanDto> }>({
      query: ({ id, data }) => ({
        url: `/subscription-plans/admin/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),

    deletePlanAdmin: builder.mutation<ResponseDto<void>, string>({
      query: (id) => ({
        url: `/subscription-plans/admin/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),
  }),
});

// Export hooks
export const {
  useGetMySubscriptionQuery,
  useGetSubscriptionSummaryQuery,
  useGetSchoolSubscriptionTierQuery,
  useGetBillingUiFlagsQuery,
  useGetAdminBillingStateQuery,
  useGetDowngradePreviewQuery,
  useDowngradeToFreeMutation,
  useCheckToolAccessQuery,
  useGetAllToolsQuery,
  useGetMyToolsQuery,
  useUseAiCreditsMutation,
  useTopUpAiCreditsMutation,
  useGetPublicPlansQuery,
  useGetPlansForSchoolQuery,
  useGetAllPlansAdminQuery,
  useCreatePlanAdminMutation,
  useUpdatePlanAdminMutation,
  useDeletePlanAdminMutation,
  useGetAiUsageHistoryQuery,
} = subscriptionsApi;

