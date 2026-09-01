import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { setAccessToken } from '../services/api'

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

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
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
      localStorage.removeItem('refreshToken')
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
    },
  },
})

export const { setUser, clearUser, setLoading, loginSuccess } = authSlice.actions

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
