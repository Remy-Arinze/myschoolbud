import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  // Note: refreshToken is now stored in httpOnly cookie for security
  // This field is kept for backwards compatibility but should not be used
  refreshToken: string | null;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    accountStatus: string;
    firstName?: string | null;
    lastName?: string | null;
    profileImage?: string | null; // Profile image URL for SUPER_ADMIN
    // Profile context from login
    profileId?: string | null;  // For SCHOOL_ADMIN: adminId, for TEACHER: teacherId
    publicId?: string | null;   // Public ID used for login
    schoolId?: string | null;   // Current school context
    // Admin-specific context (only for SCHOOL_ADMIN role)
    adminRole?: string | null;       // e.g., 'principal', 'school_owner', 'headmistress'
    adminSchoolType?: string | null; // e.g., 'PRIMARY', 'SECONDARY' — locks dashboard to this type
    lifecycleStatus?: string | null;
    deactivatesAt?: string | null;
    deactivationReason?: string | null;
    deactivatedAt?: string | null;
  } | null;
  tenantId: string | null;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  tenantId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken?: string; // Optional - now stored in httpOnly cookie
        user: AuthState['user'];
        tenantId?: string;
      }>
    ) => {
      state.token = action.payload.accessToken;
      // Don't store refresh token in state anymore - it's in httpOnly cookie
      // Keep for backwards compatibility during migration
      state.refreshToken = action.payload.refreshToken || null;
      state.user = action.payload.user;
      // Extract tenantId from either direct payload or user context
      const tenantId = action.payload.tenantId || action.payload.user?.schoolId;
      if (tenantId) {
        state.tenantId = tenantId;
        if (typeof window !== 'undefined') {
          localStorage.setItem('tenantId', tenantId);
        }
      }
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.user = null;
      state.tenantId = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tenantId');
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

