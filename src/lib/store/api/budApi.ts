import { apiSlice } from './apiSlice';

export const budApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBudMe: builder.query<any, void>({
      query: () => '/bud/me',
    }),
    getBudToday: builder.query<any, void>({
      query: () => '/bud/today',
    }),
    getBudPlans: builder.query<any, void>({
      query: () => '/bud/plans',
    }),
    confirmBudRename: builder.mutation<any, void>({
      query: () => ({ url: '/bud/rename/confirm', method: 'POST' }),
    }),
    hintBudRename: builder.mutation<any, { message: string }>({
      query: (body) => ({ url: '/bud/chat/rename-hint', method: 'POST', body }),
    }),
    chatWithBud: builder.mutation<any, { message: string }>({
      query: (body) => ({ url: '/bud/chat', method: 'POST', body }),
    }),
    rateBudCard: builder.mutation<any, { cardId: string; rating: number }>({
      query: ({ cardId, rating }) => ({
        url: `/bud/cards/${cardId}/rate`,
        method: 'POST',
        body: { rating },
      }),
    }),
    generateBudDeck: builder.mutation<any, { weekId: string }>({
      query: ({ weekId }) => ({ url: `/bud/weeks/${weekId}/deck`, method: 'POST' }),
    }),
    recordBudSession: builder.mutation<any, { type: string; stableKeys?: string[] }>({
      query: (body) => ({ url: '/bud/sessions', method: 'POST', body }),
    }),
    subscribeBud: builder.mutation<any, { planId: string; callbackUrl?: string }>({
      query: (body) => ({ url: '/bud/subscribe', method: 'POST', body }),
    }),
    verifyBudPayment: builder.query<any, string>({
      query: (reference) => `/bud/payments/verify/${reference}`,
    }),
  }),
});

export const {
  useGetBudMeQuery,
  useGetBudTodayQuery,
  useGetBudPlansQuery,
  useConfirmBudRenameMutation,
  useHintBudRenameMutation,
  useChatWithBudMutation,
  useRateBudCardMutation,
  useGenerateBudDeckMutation,
  useRecordBudSessionMutation,
  useSubscribeBudMutation,
  useVerifyBudPaymentQuery,
} = budApi;
