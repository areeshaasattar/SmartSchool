import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { setAccessToken, setActiveSchoolId } from '../services/api'

export interface UserProfile {
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
}

export interface User {
  id: string
  email: string
  roles: string[]
  profile: UserProfile
  status: string
  schoolIds?: string[]
  lastLogin?: string
  createdAt?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

const authInitialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
      state.isLoading = false
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      setAccessToken(null)
      setActiveSchoolId(null)
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('activeSchoolId')
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isLoading = false
      setAccessToken(action.payload.accessToken)
      localStorage.setItem('refreshToken', action.payload.refreshToken)

      // Auto-select first school if user has schools
      const schools = action.payload.user.schoolIds
      if (schools && schools.length > 0) {
        const firstSchoolId = schools[0]
        setActiveSchoolId(firstSchoolId)
      }
    },
  },
})

export const { setUser, clearUser, setLoading, loginSuccess } = authSlice.actions

// ── Tenant slice ─────────────────────────────────────────────────────

interface TenantState {
  activeSchoolId: string | null
}

const tenantInitialState: TenantState = {
  activeSchoolId: localStorage.getItem('activeSchoolId') || null,
}

const tenantSlice = createSlice({
  name: 'tenant',
  initialState: tenantInitialState,
  reducers: {
    switchSchool: (state, action: PayloadAction<string | null>) => {
      state.activeSchoolId = action.payload
      setActiveSchoolId(action.payload)
    },
  },
})

export const { switchSchool } = tenantSlice.actions

// ── Parent portal slice ─────────────────────────────────────────────

interface ParentPortalState {
  selectedChildId: string | null
}

const parentPortalInitialState: ParentPortalState = {
  selectedChildId: localStorage.getItem('selectedChildId') || null,
}

const parentPortalSlice = createSlice({
  name: 'parentPortal',
  initialState: parentPortalInitialState,
  reducers: {
    selectChild: (state, action: PayloadAction<string | null>) => {
      state.selectedChildId = action.payload
      if (action.payload) {
        localStorage.setItem('selectedChildId', action.payload)
      } else {
        localStorage.removeItem('selectedChildId')
      }
    },
  },
})

export const { selectChild } = parentPortalSlice.actions

// ── Store ────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    tenant: tenantSlice.reducer,
    parentPortal: parentPortalSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
